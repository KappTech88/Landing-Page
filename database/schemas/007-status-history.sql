-- =====================================================
-- 007-status-history.sql
-- Audit Trail and Status History Tracking
-- Comprehensive change tracking for all major entities
-- =====================================================

-- =====================================================
-- STATUS_HISTORY TABLE
-- =====================================================
-- Track all status changes for claims, estimates, invoices, etc.
-- Provides complete audit trail and timeline

CREATE TABLE status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- What Changed
    entity_type VARCHAR(50) NOT NULL, -- claims, estimates, invoices, etc.
    entity_id UUID NOT NULL, -- ID of the record that changed
    field_name VARCHAR(100), -- Field that changed (status, assigned_contractor_id, etc.)

    -- Status Change Details
    old_status VARCHAR(100), -- Previous value
    new_status VARCHAR(100), -- New value
    change_type VARCHAR(30) DEFAULT 'status_change', -- status_change, assignment, approval, etc.

    -- Context
    changed_by UUID REFERENCES users(id), -- User who made the change
    changed_by_role VARCHAR(50), -- Role at time of change
    change_reason TEXT, -- Why the change was made
    automated BOOLEAN DEFAULT false, -- Was this an automated change?

    -- Additional Details
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
    ip_address INET, -- IP address of user making change
    user_agent TEXT, -- Browser/client information

    -- Timestamp
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'claims', 'estimates', 'invoices', 'payments',
        'users', 'organizations', 'properties', 'line_items'
    )),
    CONSTRAINT valid_change_type CHECK (change_type IN (
        'status_change', 'assignment', 'approval', 'rejection',
        'creation', 'deletion', 'update', 'note_added'
    ))
);

-- Indexes for status_history
CREATE INDEX idx_status_history_organization_id ON status_history(organization_id);
CREATE INDEX idx_status_history_entity ON status_history(entity_type, entity_id);
CREATE INDEX idx_status_history_changed_by ON status_history(changed_by);
CREATE INDEX idx_status_history_changed_at ON status_history(changed_at DESC);
CREATE INDEX idx_status_history_entity_type ON status_history(entity_type);

-- GIN index for metadata search
CREATE INDEX idx_status_history_metadata ON status_history USING gin(metadata);

-- =====================================================
-- ACTIVITY_LOG TABLE
-- =====================================================
-- General activity log for all user actions
-- More granular than status_history

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Activity Details
    action VARCHAR(50) NOT NULL, -- login, logout, view, create, update, delete, export, etc.
    resource_type VARCHAR(50), -- claims, estimates, photos, documents, etc.
    resource_id UUID, -- ID of the resource acted upon
    resource_name VARCHAR(255), -- Human-readable name (claim number, file name, etc.)

    -- Context
    description TEXT, -- Human-readable description
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical

    -- Request Details
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_path TEXT, -- API endpoint or page URL
    request_duration_ms INTEGER, -- How long the request took

    -- Response Details
    status_code INTEGER, -- HTTP status code
    success BOOLEAN DEFAULT true,
    error_message TEXT, -- If action failed

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_action CHECK (action IN (
        'login', 'logout', 'view', 'create', 'update', 'delete',
        'export', 'import', 'download', 'upload', 'share', 'archive'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- Indexes for activity_log
CREATE INDEX idx_activity_log_organization_id ON activity_log(organization_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_severity ON activity_log(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_activity_log_success ON activity_log(success) WHERE success = false;

-- Partition activity_log by month for better performance
-- CREATE TABLE activity_log_y2025m01 PARTITION OF activity_log
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =====================================================
-- NOTES TABLE
-- =====================================================
-- User-created notes for claims, estimates, etc.
-- Supports rich text, attachments, mentions

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Note Association (flexible - can be attached to any entity)
    entity_type VARCHAR(50) NOT NULL, -- claims, estimates, properties, etc.
    entity_id UUID NOT NULL, -- ID of the entity this note is attached to

    -- Note Content
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_format VARCHAR(20) DEFAULT 'plain_text', -- plain_text, markdown, html

    -- Visibility
    is_private BOOLEAN DEFAULT false, -- Private to creator only
    is_pinned BOOLEAN DEFAULT false, -- Pinned to top of notes list
    visibility VARCHAR(30) DEFAULT 'team', -- private, team, client, public

    -- Category/Type
    note_type VARCHAR(30) DEFAULT 'general', -- general, important, warning, follow_up, meeting_notes
    category VARCHAR(50), -- Custom categorization

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),
    created_by_role VARCHAR(50), -- Role at time of creation

    -- Mentions (@user references)
    mentioned_users UUID[], -- Array of user IDs mentioned in note
    mentions_metadata JSONB, -- Additional mention context

    -- Attachments
    attachment_ids UUID[], -- IDs of documents/photos attached to note

    -- Tags
    tags TEXT[], -- Array of tags for organization

    -- Follow-up
    requires_followup BOOLEAN DEFAULT false,
    followup_date DATE,
    followup_assigned_to UUID REFERENCES users(id),
    followup_completed BOOLEAN DEFAULT false,
    followup_completed_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_note_entity_type CHECK (entity_type IN (
        'claims', 'estimates', 'invoices', 'properties', 'users', 'organizations'
    )),
    CONSTRAINT valid_content_format CHECK (content_format IN ('plain_text', 'markdown', 'html')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'client', 'public')),
    CONSTRAINT valid_note_type CHECK (note_type IN ('general', 'important', 'warning', 'follow_up', 'meeting_notes', 'phone_call'))
);

-- Indexes for notes
CREATE INDEX idx_notes_organization_id ON notes(organization_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_requires_followup ON notes(requires_followup) WHERE requires_followup = true;
CREATE INDEX idx_notes_followup_date ON notes(followup_date) WHERE followup_date IS NOT NULL;
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_tags ON notes USING gin(tags);
CREATE INDEX idx_notes_mentioned_users ON notes USING gin(mentioned_users);

-- Full-text search
CREATE INDEX idx_notes_search ON notes USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
);

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- User notifications for system events

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- claim_assigned, estimate_approved, payment_received, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- Where to go when notification clicked

    -- Related Entity
    entity_type VARCHAR(50), -- claims, estimates, invoices, etc.
    entity_id UUID,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    category VARCHAR(30) DEFAULT 'general', -- general, claim, estimate, payment, system

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Delivery Channels
    sent_via_email BOOLEAN DEFAULT false,
    sent_via_sms BOOLEAN DEFAULT false,
    sent_via_push BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Auto-delete after this date

    -- Constraints
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT valid_category CHECK (category IN ('general', 'claim', 'estimate', 'payment', 'system', 'mention', 'assignment'))
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_priority ON notifications(priority) WHERE priority IN ('high', 'urgent');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to log status change
CREATE OR REPLACE FUNCTION log_status_change(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_field_name VARCHAR,
    p_old_status VARCHAR,
    p_new_status VARCHAR,
    p_changed_by UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
    v_organization_id UUID;
BEGIN
    -- Get organization_id based on entity type
    EXECUTE format('SELECT organization_id FROM %I WHERE id = $1', p_entity_type)
    INTO v_organization_id
    USING p_entity_id;

    -- Insert status history record
    INSERT INTO status_history (
        organization_id, entity_type, entity_id, field_name,
        old_status, new_status, changed_by, change_reason
    ) VALUES (
        v_organization_id, p_entity_type, p_entity_id, p_field_name,
        p_old_status, p_new_status, p_changed_by, p_change_reason
    ) RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_organization_id UUID,
    p_notification_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, organization_id, notification_type, title, message,
        entity_type, entity_id, priority
    ) VALUES (
        p_user_id, p_organization_id, p_notification_type, p_title, p_message,
        p_entity_type, p_entity_id, p_priority
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE id = p_notification_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC STATUS HISTORY LOGGING
-- =====================================================

-- Generic trigger function to log status changes
CREATE OR REPLACE FUNCTION trigger_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM log_status_change(
            TG_TABLE_NAME::VARCHAR,
            NEW.id,
            'status',
            OLD.status,
            NEW.status,
            auth.uid(), -- Current user from Supabase Auth
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to key tables
CREATE TRIGGER claims_log_status_change
    AFTER UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_change();

CREATE TRIGGER estimates_log_status_change
    AFTER UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_change();

CREATE TRIGGER invoices_log_status_change
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_change();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE status_history IS 'Audit trail for all status changes across the system';
COMMENT ON TABLE activity_log IS 'General activity log for user actions and system events';
COMMENT ON TABLE notes IS 'User-created notes attachable to any entity';
COMMENT ON TABLE notifications IS 'In-app notifications for users';

COMMENT ON COLUMN status_history.automated IS 'Was this change triggered automatically vs by user action';
COMMENT ON COLUMN notes.mentioned_users IS 'Array of user IDs mentioned with @ in the note';
COMMENT ON COLUMN notifications.expires_at IS 'Auto-delete notification after this date';
