-- =====================================================
-- 010-communications.sql
-- Communications: Notes, Activity Log, Notifications, Messages
-- =====================================================

-- =====================================================
-- NOTES TABLE
-- =====================================================
-- Internal notes on any entity

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Entity Link (polymorphic)
    entity_type VARCHAR(30) NOT NULL, -- contact, job, estimate, claim, invoice
    entity_id UUID NOT NULL,

    -- Additional Links for easy querying
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Note Content
    note_type VARCHAR(30) DEFAULT 'general', -- general, follow_up, important, warning, system
    subject VARCHAR(255),
    content TEXT NOT NULL,

    -- Importance
    is_pinned BOOLEAN DEFAULT false,
    is_important BOOLEAN DEFAULT false,

    -- Follow-up
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_assigned_to UUID REFERENCES users(id),
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_completed_at TIMESTAMP WITH TIME ZONE,

    -- Visibility
    is_private BOOLEAN DEFAULT false, -- Only creator can see
    visible_to_roles TEXT[], -- Restrict to specific roles

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_note_entity CHECK (entity_type IN (
        'contact', 'job', 'estimate', 'claim', 'invoice',
        'material_order', 'payment', 'crew', 'supplier'
    ))
);

CREATE INDEX idx_notes_org ON notes(organization_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_contact ON notes(contact_id);
CREATE INDEX idx_notes_job ON notes(job_id);
CREATE INDEX idx_notes_pinned ON notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_follow_up ON notes(follow_up_date) WHERE requires_follow_up = true AND follow_up_completed = false;
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
CREATE INDEX idx_notes_deleted ON notes(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
-- Track all activities/changes

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Entity Link (polymorphic)
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,

    -- Activity Info
    activity_type VARCHAR(50) NOT NULL,
    -- created, updated, deleted, status_changed, assigned, unassigned,
    -- email_sent, sms_sent, call_logged, payment_received, etc.

    -- Description
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Changes (for updates)
    changes JSONB, -- {"field": {"old": "value1", "new": "value2"}}

    -- Related
    related_entity_type VARCHAR(30),
    related_entity_id UUID,

    -- Who
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100), -- Denormalized for history

    -- System vs User
    is_system_activity BOOLEAN DEFAULT false,

    -- IP/Device Info
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Partition by month for performance (optional)
-- CREATE INDEX idx_activity_log_month ON activity_log(DATE_TRUNC('month', created_at));

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- User notifications

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Content
    notification_type VARCHAR(50) NOT NULL,
    -- assignment, mention, reminder, approval_needed, task_due,
    -- payment_received, job_status, message, system

    title VARCHAR(255) NOT NULL,
    message TEXT,
    icon VARCHAR(50), -- Icon name/class

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Link
    action_url VARCHAR(500),
    entity_type VARCHAR(30),
    entity_id UUID,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Delivery
    send_push BOOLEAN DEFAULT true,
    send_email BOOLEAN DEFAULT false,
    send_sms BOOLEAN DEFAULT false,

    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMP WITH TIME ZONE,

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_notification_type CHECK (notification_type IN (
        'assignment', 'mention', 'reminder', 'approval_needed', 'task_due',
        'payment_received', 'job_status', 'message', 'document', 'system',
        'schedule_change', 'material_delivery', 'inspection', 'alert'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================
-- User notification preferences

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Notification Type
    notification_type VARCHAR(50) NOT NULL,

    -- Channels
    enable_push BOOLEAN DEFAULT true,
    enable_email BOOLEAN DEFAULT true,
    enable_sms BOOLEAN DEFAULT false,
    enable_in_app BOOLEAN DEFAULT true,

    -- Schedule
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME, -- e.g., 22:00
    quiet_hours_end TIME, -- e.g., 07:00

    -- Frequency
    digest_mode BOOLEAN DEFAULT false, -- Batch into daily digest
    digest_frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, organization_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_org ON notification_preferences(organization_id);

CREATE TRIGGER notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL LOG TABLE
-- =====================================================
-- Track all emails sent

CREATE TABLE email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Recipients
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(100),
    cc_emails TEXT[],
    bcc_emails TEXT[],

    -- Sender
    from_email VARCHAR(255),
    from_name VARCHAR(100),
    reply_to VARCHAR(255),

    -- Content
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,

    -- Template
    template_name VARCHAR(100),
    template_variables JSONB,

    -- Entity Link
    entity_type VARCHAR(30),
    entity_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, opened, clicked, bounced, failed

    -- Delivery Info
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,
    clicked_at TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0,

    -- Bounce/Error
    bounced_at TIMESTAMP WITH TIME ZONE,
    bounce_type VARCHAR(30), -- hard, soft
    bounce_reason TEXT,
    error_message TEXT,

    -- Provider
    email_provider VARCHAR(30), -- sendgrid, mailgun, ses, smtp
    provider_message_id VARCHAR(255),

    -- Tracking
    tracking_id VARCHAR(64),

    -- Sent By
    sent_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_email_status CHECK (status IN (
        'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked',
        'bounced', 'failed', 'unsubscribed', 'spam'
    ))
);

CREATE INDEX idx_email_log_org ON email_log(organization_id);
CREATE INDEX idx_email_log_to ON email_log(to_email);
CREATE INDEX idx_email_log_entity ON email_log(entity_type, entity_id);
CREATE INDEX idx_email_log_contact ON email_log(contact_id);
CREATE INDEX idx_email_log_job ON email_log(job_id);
CREATE INDEX idx_email_log_status ON email_log(status);
CREATE INDEX idx_email_log_created ON email_log(created_at DESC);
CREATE INDEX idx_email_log_tracking ON email_log(tracking_id);

-- =====================================================
-- SMS LOG TABLE
-- =====================================================
-- Track all SMS messages sent

CREATE TABLE sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Phone Numbers
    to_phone VARCHAR(20) NOT NULL,
    from_phone VARCHAR(20),

    -- Content
    message TEXT NOT NULL,
    message_segments INTEGER DEFAULT 1,

    -- Entity Link
    entity_type VARCHAR(30),
    entity_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Direction
    direction VARCHAR(10) NOT NULL, -- outbound, inbound

    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, failed, received

    -- Delivery Info
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,

    -- Error
    error_code VARCHAR(20),
    error_message TEXT,

    -- Provider
    sms_provider VARCHAR(30), -- twilio, telnyx, bandwidth
    provider_message_id VARCHAR(255),

    -- Cost
    cost DECIMAL(8, 4),

    -- Sent By
    sent_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_sms_status CHECK (status IN (
        'queued', 'sending', 'sent', 'delivered', 'failed', 'received', 'undelivered'
    )),
    CONSTRAINT valid_direction CHECK (direction IN ('outbound', 'inbound'))
);

CREATE INDEX idx_sms_log_org ON sms_log(organization_id);
CREATE INDEX idx_sms_log_to ON sms_log(to_phone);
CREATE INDEX idx_sms_log_entity ON sms_log(entity_type, entity_id);
CREATE INDEX idx_sms_log_contact ON sms_log(contact_id);
CREATE INDEX idx_sms_log_job ON sms_log(job_id);
CREATE INDEX idx_sms_log_status ON sms_log(status);
CREATE INDEX idx_sms_log_direction ON sms_log(direction);
CREATE INDEX idx_sms_log_created ON sms_log(created_at DESC);

-- =====================================================
-- REMINDERS TABLE
-- =====================================================
-- Scheduled reminders

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Reminder For
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Entity Link
    entity_type VARCHAR(30),
    entity_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Reminder Content
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Schedule
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(30) DEFAULT 'one_time', -- one_time, recurring

    -- Recurring Settings
    recurrence_pattern VARCHAR(20), -- daily, weekly, monthly
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, completed, snoozed, cancelled

    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Snooze
    snoozed_until TIMESTAMP WITH TIME ZONE,
    snooze_count INTEGER DEFAULT 0,

    -- Delivery
    send_notification BOOLEAN DEFAULT true,
    send_email BOOLEAN DEFAULT false,
    send_sms BOOLEAN DEFAULT false,

    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_reminder_status CHECK (status IN (
        'active', 'completed', 'snoozed', 'cancelled'
    ))
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_org ON reminders(organization_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE status = 'active';
CREATE INDEX idx_reminders_entity ON reminders(entity_type, entity_id);
CREATE INDEX idx_reminders_contact ON reminders(contact_id);
CREATE INDEX idx_reminders_job ON reminders(job_id);
CREATE INDEX idx_reminders_status ON reminders(status);

CREATE TRIGGER reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
-- Company-wide announcements

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(30) DEFAULT 'info', -- info, warning, urgent, celebration

    -- Display
    display_priority INTEGER DEFAULT 0,
    background_color VARCHAR(20),

    -- Targeting
    target_roles TEXT[], -- Empty = all roles
    target_users UUID[], -- Specific users

    -- Schedule
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,

    -- Dismissible
    can_dismiss BOOLEAN DEFAULT true,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_announcement_type CHECK (announcement_type IN (
        'info', 'warning', 'urgent', 'celebration', 'maintenance', 'update'
    ))
);

CREATE INDEX idx_announcements_org ON announcements(organization_id);
CREATE INDEX idx_announcements_active ON announcements(is_active, starts_at, ends_at)
    WHERE is_active = true;
CREATE INDEX idx_announcements_roles ON announcements USING gin(target_roles);

CREATE TRIGGER announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ANNOUNCEMENT DISMISSALS TABLE
-- =====================================================
-- Track dismissed announcements per user

CREATE TABLE announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_dismissals_announcement ON announcement_dismissals(announcement_id);
CREATE INDEX idx_announcement_dismissals_user ON announcement_dismissals(user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_organization_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_activity_type VARCHAR,
    p_title VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_user_name VARCHAR;
BEGIN
    IF p_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM users WHERE id = p_user_id;
    END IF;

    INSERT INTO activity_log (
        organization_id, entity_type, entity_id, activity_type,
        title, description, user_id, user_name, changes
    ) VALUES (
        p_organization_id, p_entity_type, p_entity_id, p_activity_type,
        p_title, p_description, p_user_id, v_user_name, p_changes
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_organization_id UUID,
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT DEFAULT NULL,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_action_url VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        organization_id, user_id, notification_type,
        title, message, entity_type, entity_id, action_url, priority
    ) VALUES (
        p_organization_id, p_user_id, p_type,
        p_title, p_message, p_entity_type, p_entity_id, p_action_url, p_priority
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Notify assigned user on job assignment
CREATE OR REPLACE FUNCTION notify_on_job_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_sales_rep_id IS NOT NULL AND
       (OLD.assigned_sales_rep_id IS NULL OR NEW.assigned_sales_rep_id != OLD.assigned_sales_rep_id) THEN
        PERFORM create_notification(
            NEW.organization_id,
            NEW.assigned_sales_rep_id,
            'assignment',
            'New Job Assignment',
            'You have been assigned to job ' || NEW.job_number,
            'job',
            NEW.id,
            '/jobs/' || NEW.id,
            'normal'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_notify_assignment
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_job_assignment();

-- Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = p_user_id AND is_read = false;
    ELSE
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = false;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Get pending reminders (run via cron)
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE(
    reminder_id UUID,
    user_id UUID,
    user_email VARCHAR,
    title VARCHAR,
    description TEXT,
    entity_type VARCHAR,
    entity_id UUID,
    send_notification BOOLEAN,
    send_email BOOLEAN,
    send_sms BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS reminder_id,
        r.user_id,
        u.email AS user_email,
        r.title,
        r.description,
        r.entity_type,
        r.entity_id,
        r.send_notification,
        r.send_email,
        r.send_sms
    FROM reminders r
    JOIN users u ON r.user_id = u.id
    WHERE r.status = 'active'
    AND r.remind_at <= NOW()
    AND r.notification_sent = false;
END;
$$ LANGUAGE plpgsql;

-- Complete reminder
CREATE OR REPLACE FUNCTION complete_reminder(p_reminder_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE reminders
    SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Get active announcements for user
CREATE OR REPLACE FUNCTION get_user_announcements(
    p_user_id UUID,
    p_organization_id UUID
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    content TEXT,
    announcement_type VARCHAR,
    starts_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN,
    can_dismiss BOOLEAN
) AS $$
DECLARE
    v_user_roles TEXT[];
BEGIN
    -- Get user's roles
    SELECT ARRAY_AGG(r.role_name)
    INTO v_user_roles
    FROM user_organization_roles uor
    JOIN roles r ON uor.role_id = r.id
    WHERE uor.user_id = p_user_id
    AND uor.organization_id = p_organization_id;

    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.content,
        a.announcement_type,
        a.starts_at,
        a.is_pinned,
        a.can_dismiss
    FROM announcements a
    LEFT JOIN announcement_dismissals ad ON a.id = ad.announcement_id AND ad.user_id = p_user_id
    WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.starts_at <= NOW()
    AND (a.ends_at IS NULL OR a.ends_at > NOW())
    AND ad.id IS NULL -- Not dismissed
    AND (
        a.target_roles IS NULL OR
        a.target_roles = '{}' OR
        a.target_roles && v_user_roles
    )
    AND (
        a.target_users IS NULL OR
        a.target_users = '{}' OR
        p_user_id = ANY(a.target_users)
    )
    ORDER BY a.is_pinned DESC, a.display_priority DESC, a.starts_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Unread notification count by user
CREATE OR REPLACE VIEW user_notification_counts AS
SELECT
    user_id,
    organization_id,
    COUNT(*) FILTER (WHERE NOT is_read) AS unread_count,
    COUNT(*) FILTER (WHERE NOT is_read AND priority = 'urgent') AS urgent_unread,
    MAX(created_at) FILTER (WHERE NOT is_read) AS latest_unread_at
FROM notifications
GROUP BY user_id, organization_id;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notes IS 'Internal notes on any entity';
COMMENT ON TABLE activity_log IS 'Audit trail of all activities and changes';
COMMENT ON TABLE notifications IS 'User notifications (in-app, push, email, SMS)';
COMMENT ON TABLE notification_preferences IS 'User notification settings per type';
COMMENT ON TABLE email_log IS 'Track all emails sent with delivery status';
COMMENT ON TABLE sms_log IS 'Track all SMS messages with delivery status';
COMMENT ON TABLE reminders IS 'Scheduled reminders for users';
COMMENT ON TABLE announcements IS 'Company-wide announcements';
COMMENT ON TABLE announcement_dismissals IS 'Track which users dismissed which announcements';

COMMENT ON COLUMN activity_log.changes IS 'JSON object tracking field changes: {"field": {"old": "x", "new": "y"}}';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate when notification is clicked';
COMMENT ON COLUMN email_log.tracking_id IS 'Unique ID for tracking email opens/clicks';
