-- =====================================================
-- 012-job-notes.sql
-- Job Notes & Communications System
-- Enables timestamped notes with @mentions and notifications
-- =====================================================

-- =====================================================
-- JOB NOTES TABLE
-- =====================================================
-- Notes/comments on jobs with threading support

CREATE TABLE job_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- CONTENT
    -- ===================
    content TEXT NOT NULL,
    note_type VARCHAR(30) NOT NULL DEFAULT 'general',
    -- Types: general, mention, reply, system, status_change

    -- ===================
    -- THREADING
    -- ===================
    parent_note_id UUID REFERENCES job_notes(id) ON DELETE CASCADE,
    thread_id UUID, -- Groups conversation threads (set to parent_note_id for replies)

    -- ===================
    -- AUTHOR
    -- ===================
    created_by UUID NOT NULL REFERENCES users(id),

    -- ===================
    -- FLAGS
    -- ===================
    is_pinned BOOLEAN DEFAULT false,
    is_internal BOOLEAN DEFAULT true, -- false = visible to customer portal

    -- ===================
    -- ATTACHMENTS
    -- ===================
    attachments JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"id": "uuid", "name": "file.pdf", "url": "...", "type": "pdf", "size": 12345}]

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE, -- Set if content was edited after creation
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_note_type CHECK (note_type IN (
        'general', 'mention', 'reply', 'system', 'status_change'
    ))
);

-- Indexes for job_notes
CREATE INDEX idx_job_notes_job ON job_notes(job_id);
CREATE INDEX idx_job_notes_org ON job_notes(organization_id);
CREATE INDEX idx_job_notes_author ON job_notes(created_by);
CREATE INDEX idx_job_notes_parent ON job_notes(parent_note_id) WHERE parent_note_id IS NOT NULL;
CREATE INDEX idx_job_notes_thread ON job_notes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_job_notes_pinned ON job_notes(job_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_job_notes_type ON job_notes(note_type);
CREATE INDEX idx_job_notes_created ON job_notes(created_at DESC);
CREATE INDEX idx_job_notes_deleted ON job_notes(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search on note content
CREATE INDEX idx_job_notes_search ON job_notes USING gin(
    to_tsvector('english', coalesce(content, ''))
);

-- Trigger for updated_at
CREATE TRIGGER job_notes_updated_at
    BEFORE UPDATE ON job_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB NOTE MENTIONS TABLE
-- =====================================================
-- Tracks @mentions in notes with notification status

CREATE TABLE job_note_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES job_notes(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- NOTIFICATION
    -- ===================
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_channel VARCHAR(20) DEFAULT 'in_app', -- in_app, email, sms

    -- ===================
    -- READ STATUS
    -- ===================
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- ===================
    -- RESPONSE TRACKING
    -- ===================
    has_responded BOOLEAN DEFAULT false,
    response_note_id UUID REFERENCES job_notes(id),

    -- ===================
    -- AUDIT
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint - one mention per user per note
    UNIQUE(note_id, mentioned_user_id)
);

-- Indexes for job_note_mentions
CREATE INDEX idx_mentions_note ON job_note_mentions(note_id);
CREATE INDEX idx_mentions_user ON job_note_mentions(mentioned_user_id);
CREATE INDEX idx_mentions_org ON job_note_mentions(organization_id);
CREATE INDEX idx_mentions_unread ON job_note_mentions(mentioned_user_id, is_read)
    WHERE is_read = false;
CREATE INDEX idx_mentions_pending_notification ON job_note_mentions(notification_sent)
    WHERE notification_sent = false;

-- =====================================================
-- JOB ACCESS TABLE
-- =====================================================
-- Tracks which users have access to which jobs
-- Used for @mention dropdown and permission checks

CREATE TABLE job_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- ACCESS LEVEL
    -- ===================
    access_level VARCHAR(20) NOT NULL DEFAULT 'view',
    -- Levels: view, comment, edit, manage, owner

    -- ===================
    -- ASSIGNMENT
    -- ===================
    assigned_by UUID REFERENCES users(id),
    assigned_reason VARCHAR(50), -- sales_rep, project_manager, estimator, crew_member, manual

    -- ===================
    -- STATUS
    -- ===================
    is_active BOOLEAN DEFAULT true,

    -- ===================
    -- AUDIT
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint - one access record per user per job
    UNIQUE(job_id, user_id),

    -- Constraint for valid access levels
    CONSTRAINT valid_access_level CHECK (access_level IN (
        'view', 'comment', 'edit', 'manage', 'owner'
    ))
);

-- Indexes for job_access
CREATE INDEX idx_job_access_job ON job_access(job_id);
CREATE INDEX idx_job_access_user ON job_access(user_id);
CREATE INDEX idx_job_access_org ON job_access(organization_id);
CREATE INDEX idx_job_access_active ON job_access(job_id, is_active) WHERE is_active = true;
CREATE INDEX idx_job_access_level ON job_access(access_level);

-- Trigger for updated_at
CREATE TRIGGER job_access_updated_at
    BEFORE UPDATE ON job_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-ASSIGN JOB ACCESS TRIGGER
-- =====================================================
-- Automatically grants access to assigned team members when job is created/updated

CREATE OR REPLACE FUNCTION auto_assign_job_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Grant access to sales rep
    IF NEW.sales_rep_id IS NOT NULL THEN
        INSERT INTO job_access (job_id, user_id, organization_id, access_level, assigned_reason)
        VALUES (NEW.id, NEW.sales_rep_id, NEW.organization_id, 'edit', 'sales_rep')
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            access_level = GREATEST(job_access.access_level, 'edit'),
            is_active = true,
            updated_at = NOW();
    END IF;

    -- Grant access to project manager
    IF NEW.project_manager_id IS NOT NULL THEN
        INSERT INTO job_access (job_id, user_id, organization_id, access_level, assigned_reason)
        VALUES (NEW.id, NEW.project_manager_id, NEW.organization_id, 'manage', 'project_manager')
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            access_level = GREATEST(job_access.access_level, 'manage'),
            is_active = true,
            updated_at = NOW();
    END IF;

    -- Grant access to estimator
    IF NEW.estimator_id IS NOT NULL THEN
        INSERT INTO job_access (job_id, user_id, organization_id, access_level, assigned_reason)
        VALUES (NEW.id, NEW.estimator_id, NEW.organization_id, 'edit', 'estimator')
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            access_level = GREATEST(job_access.access_level, 'edit'),
            is_active = true,
            updated_at = NOW();
    END IF;

    -- Grant access to creator
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO job_access (job_id, user_id, organization_id, access_level, assigned_reason)
        VALUES (NEW.id, NEW.created_by, NEW.organization_id, 'owner', 'creator')
        ON CONFLICT (job_id, user_id) DO UPDATE SET
            access_level = 'owner',
            is_active = true,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_auto_assign_access
    AFTER INSERT OR UPDATE OF sales_rep_id, project_manager_id, estimator_id ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_job_access();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create a note with optional mentions
CREATE OR REPLACE FUNCTION create_job_note(
    p_job_id UUID,
    p_organization_id UUID,
    p_content TEXT,
    p_created_by UUID,
    p_note_type VARCHAR(30) DEFAULT 'general',
    p_parent_note_id UUID DEFAULT NULL,
    p_mentioned_user_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_note_id UUID;
    v_user_id UUID;
BEGIN
    -- Determine note type based on context
    IF p_parent_note_id IS NOT NULL THEN
        p_note_type := 'reply';
    ELSIF p_mentioned_user_ids IS NOT NULL AND array_length(p_mentioned_user_ids, 1) > 0 THEN
        p_note_type := 'mention';
    END IF;

    -- Insert the note
    INSERT INTO job_notes (
        job_id,
        organization_id,
        content,
        note_type,
        parent_note_id,
        thread_id,
        created_by
    ) VALUES (
        p_job_id,
        p_organization_id,
        p_content,
        p_note_type,
        p_parent_note_id,
        COALESCE(p_parent_note_id, NULL), -- Thread ID is parent for replies
        p_created_by
    )
    RETURNING id INTO v_note_id;

    -- Create mentions if provided
    IF p_mentioned_user_ids IS NOT NULL THEN
        FOREACH v_user_id IN ARRAY p_mentioned_user_ids LOOP
            INSERT INTO job_note_mentions (
                note_id,
                mentioned_user_id,
                organization_id
            ) VALUES (
                v_note_id,
                v_user_id,
                p_organization_id
            )
            ON CONFLICT (note_id, mentioned_user_id) DO NOTHING;
        END LOOP;
    END IF;

    RETURN v_note_id;
END;
$$ LANGUAGE plpgsql;

-- Get unread mention count for a user
CREATE OR REPLACE FUNCTION get_unread_mention_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM job_note_mentions
        WHERE mentioned_user_id = p_user_id
        AND is_read = false
    );
END;
$$ LANGUAGE plpgsql;

-- Mark all mentions as read for a user on a specific job
CREATE OR REPLACE FUNCTION mark_job_mentions_read(p_job_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE job_note_mentions
    SET is_read = true, read_at = NOW()
    WHERE mentioned_user_id = p_user_id
    AND is_read = false
    AND note_id IN (
        SELECT id FROM job_notes WHERE job_id = p_job_id
    );
END;
$$ LANGUAGE plpgsql;

-- Get users with access to a job (for @mention dropdown)
CREATE OR REPLACE FUNCTION get_job_access_users(p_job_id UUID)
RETURNS TABLE(
    user_id UUID,
    full_name VARCHAR,
    avatar_url TEXT,
    title VARCHAR,
    access_level VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.full_name,
        u.avatar_url,
        u.title,
        ja.access_level
    FROM job_access ja
    JOIN users u ON u.id = ja.user_id
    WHERE ja.job_id = p_job_id
    AND ja.is_active = true
    AND u.is_active = true
    ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTIFICATION QUEUE INTEGRATION
-- =====================================================
-- Automatically queue notifications when mentions are created

CREATE OR REPLACE FUNCTION queue_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_note RECORD;
    v_author RECORD;
    v_job RECORD;
BEGIN
    -- Get note details
    SELECT * INTO v_note FROM job_notes WHERE id = NEW.note_id;

    -- Get author details
    SELECT * INTO v_author FROM users WHERE id = v_note.created_by;

    -- Get job details
    SELECT * INTO v_job FROM jobs WHERE id = v_note.job_id;

    -- Insert into notification queue (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue') THEN
        INSERT INTO notification_queue (
            organization_id,
            notification_type,
            recipient_email,
            subject,
            body,
            metadata,
            priority
        )
        SELECT
            NEW.organization_id,
            'mention',
            u.email,
            'You were mentioned in a note on ' || v_job.job_name,
            v_author.full_name || ' mentioned you: "' || LEFT(v_note.content, 200) || '"',
            jsonb_build_object(
                'job_id', v_note.job_id,
                'note_id', NEW.note_id,
                'mention_id', NEW.id,
                'author_id', v_note.created_by,
                'mentioned_user_id', NEW.mentioned_user_id
            ),
            'normal'
        FROM users u
        WHERE u.id = NEW.mentioned_user_id
        AND u.is_active = true;
    END IF;

    -- Mark notification as sent
    UPDATE job_note_mentions
    SET notification_sent = true, notification_sent_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mention_notification_trigger
    AFTER INSERT ON job_note_mentions
    FOR EACH ROW
    EXECUTE FUNCTION queue_mention_notification();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE job_notes IS 'Notes and comments on jobs with threading and @mention support';
COMMENT ON TABLE job_note_mentions IS 'Tracks @mentions in notes with read/response status';
COMMENT ON TABLE job_access IS 'Controls which users have access to which jobs';

COMMENT ON COLUMN job_notes.note_type IS 'Type of note: general, mention, reply, system, status_change';
COMMENT ON COLUMN job_notes.thread_id IS 'Groups replies together - set to parent_note_id for threading';
COMMENT ON COLUMN job_notes.is_internal IS 'If false, note is visible in customer portal';

COMMENT ON COLUMN job_note_mentions.notification_channel IS 'How notification was sent: in_app, email, sms';
COMMENT ON COLUMN job_note_mentions.has_responded IS 'True if mentioned user replied to this note';

COMMENT ON COLUMN job_access.access_level IS 'Permission level: view, comment, edit, manage, owner';
COMMENT ON COLUMN job_access.assigned_reason IS 'Why access was granted: sales_rep, project_manager, etc.';
