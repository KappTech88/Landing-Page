-- =====================================================
-- 010-notification-queue.sql
-- Email notification queue for n8n processing
-- Ensures no data loss if n8n is offline
-- =====================================================

-- =====================================================
-- NOTIFICATION QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Type of notification
    notification_type VARCHAR(50) NOT NULL DEFAULT 'document_request',

    -- Reference to the source record
    document_request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,

    -- Email details
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body_data JSONB NOT NULL, -- All the data needed for the email template

    -- Attachments (file URLs from storage)
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Queue status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    -- Priority (higher number = higher priority)
    priority INTEGER DEFAULT 5
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_created ON notification_queue(created_at);
CREATE INDEX idx_notification_queue_priority ON notification_queue(priority DESC, created_at ASC);
CREATE INDEX idx_notification_queue_pending ON notification_queue(status, priority DESC) WHERE status = 'pending';

-- =====================================================
-- TRIGGER FUNCTION: Auto-create notification on new document request
-- =====================================================

CREATE OR REPLACE FUNCTION create_document_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    file_urls JSONB;
BEGIN
    -- Build attachments array from sample_documents
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'filename', doc->>'original_file_name',
                'url', doc->>'public_url'
            )
        ),
        '[]'::jsonb
    )
    INTO file_urls
    FROM jsonb_array_elements(NEW.sample_documents) AS doc;

    -- Insert notification into queue
    INSERT INTO notification_queue (
        notification_type,
        document_request_id,
        recipient_email,
        subject,
        body_data,
        attachments,
        priority
    ) VALUES (
        'document_request',
        NEW.id,
        'your-email@example.com', -- ⚠️ CHANGE THIS to your actual email
        'New Document Request: ' || NEW.document_type,
        jsonb_build_object(
            'request_id', NEW.id,
            'contact_name', NEW.contact_name,
            'email', NEW.email,
            'phone', NEW.phone,
            'company_name', NEW.company_name,
            'document_type', NEW.document_type,
            'document_title', NEW.document_title,
            'document_description', NEW.document_description,
            'specific_requirements', NEW.specific_requirements,
            'use_case', NEW.use_case,
            'additional_notes', NEW.additional_notes,
            'pricing_tier', NEW.pricing_tier,
            'created_at', NEW.created_at
        ),
        file_urls,
        10 -- High priority for new requests
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Fire on new document request
-- =====================================================

DROP TRIGGER IF EXISTS trigger_document_request_notification ON document_requests;

CREATE TRIGGER trigger_document_request_notification
    AFTER INSERT ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_document_request_notification();

-- =====================================================
-- HELPER FUNCTION: Get pending notifications
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_notifications(batch_size INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    notification_type VARCHAR,
    document_request_id UUID,
    recipient_email VARCHAR,
    subject TEXT,
    body_data JSONB,
    attachments JSONB,
    attempts INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.notification_type,
        nq.document_request_id,
        nq.recipient_email,
        nq.subject,
        nq.body_data,
        nq.attachments,
        nq.attempts,
        nq.created_at
    FROM notification_queue nq
    WHERE nq.status = 'pending'
    AND nq.attempts < nq.max_attempts
    ORDER BY nq.priority DESC, nq.created_at ASC
    LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Mark notification as sent
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_sent(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notification_queue
    SET
        status = 'sent',
        sent_at = NOW(),
        processed_at = NOW()
    WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION: Mark notification as failed
-- =====================================================

CREATE OR REPLACE FUNCTION mark_notification_failed(
    notification_id UUID,
    error_message TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE notification_queue
    SET
        status = CASE
            WHEN attempts + 1 >= max_attempts THEN 'failed'
            ELSE 'pending'
        END,
        attempts = attempts + 1,
        last_error = error_message,
        processed_at = NOW()
    WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Only authenticated users (admins) can view the queue
CREATE POLICY "Authenticated users can view notification queue"
    ON notification_queue FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- System can insert (via trigger)
CREATE POLICY "System can insert notifications"
    ON notification_queue FOR INSERT
    WITH CHECK (true);

-- System/admins can update
CREATE POLICY "System can update notifications"
    ON notification_queue FOR UPDATE
    USING (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notification_queue IS 'Queue for email notifications - resilient to n8n downtime';
COMMENT ON COLUMN notification_queue.status IS 'pending, processing, sent, or failed';
COMMENT ON COLUMN notification_queue.attempts IS 'Number of send attempts (max 3)';
COMMENT ON COLUMN notification_queue.body_data IS 'JSON data for email template';
COMMENT ON COLUMN notification_queue.attachments IS 'Array of file URLs to attach';
