-- =====================================================
-- 009-documents.sql
-- Documents: Photos, Files, Attachments
-- =====================================================

-- =====================================================
-- DOCUMENT FOLDERS TABLE
-- =====================================================
-- Organize documents into folders

CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Folder Info
    folder_name VARCHAR(100) NOT NULL,
    folder_path VARCHAR(500), -- /jobs/photos/before
    parent_folder_id UUID REFERENCES document_folders(id),

    -- Entity Link (polymorphic)
    entity_type VARCHAR(30), -- job, contact, estimate, claim, invoice
    entity_id UUID,

    -- Settings
    is_system_folder BOOLEAN DEFAULT false, -- Pre-created folders
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_document_folders_org ON document_folders(organization_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_folder_id);
CREATE INDEX idx_document_folders_entity ON document_folders(entity_type, entity_id);
CREATE INDEX idx_document_folders_deleted ON document_folders(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- All files and photos

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,

    -- File Info
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(20),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,

    -- Storage
    storage_provider VARCHAR(30) DEFAULT 'supabase', -- supabase, s3, gcs, azure
    storage_bucket VARCHAR(100),
    storage_path VARCHAR(500) NOT NULL, -- Full path in storage
    storage_url TEXT, -- Public/signed URL

    -- Document Type
    document_type VARCHAR(50) NOT NULL, -- photo, contract, estimate, invoice, permit, insurance, warranty, other

    -- Photo Specific
    is_photo BOOLEAN DEFAULT false,
    photo_type VARCHAR(30), -- before, during, after, damage, inspection, aerial, other

    -- Image Metadata
    width INTEGER,
    height INTEGER,
    exif_data JSONB,
    thumbnail_url TEXT,

    -- Entity Links (polymorphic)
    entity_type VARCHAR(30), -- job, contact, estimate, claim, invoice, material_order
    entity_id UUID,

    -- Additional Links (a document can belong to multiple entities)
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Categorization
    category VARCHAR(50), -- roof, interior, exterior, documentation, legal
    tags TEXT[],

    -- Description
    title VARCHAR(255),
    description TEXT,
    notes TEXT,

    -- Visibility
    is_customer_visible BOOLEAN DEFAULT false, -- Show in customer portal
    is_internal_only BOOLEAN DEFAULT false,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- GPS Data (for photos)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    captured_at TIMESTAMP WITH TIME ZONE, -- When photo was taken

    -- Upload Info
    uploaded_by UUID REFERENCES users(id),
    upload_source VARCHAR(30), -- web, mobile, email, api

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_document_type CHECK (document_type IN (
        'photo', 'contract', 'estimate', 'invoice', 'permit', 'insurance',
        'warranty', 'inspection', 'measurement', 'proposal', 'change_order',
        'receipt', 'license', 'certificate', 'agreement', 'other'
    ))
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_job ON documents(job_id);
CREATE INDEX idx_documents_contact ON documents(contact_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_photo_type ON documents(photo_type) WHERE is_photo = true;
CREATE INDEX idx_documents_customer_visible ON documents(is_customer_visible) WHERE is_customer_visible = true;
CREATE INDEX idx_documents_tags ON documents USING gin(tags);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_documents_deleted ON documents(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUMS TABLE
-- =====================================================
-- Group photos into albums for presentation

CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

    -- Album Info
    album_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Cover
    cover_photo_id UUID REFERENCES documents(id),

    -- Settings
    is_customer_shareable BOOLEAN DEFAULT false,
    share_token VARCHAR(64), -- For public sharing links

    -- Display
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_photo_albums_org ON photo_albums(organization_id);
CREATE INDEX idx_photo_albums_job ON photo_albums(job_id);
CREATE INDEX idx_photo_albums_share ON photo_albums(share_token) WHERE share_token IS NOT NULL;

CREATE TRIGGER photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUM ITEMS TABLE
-- =====================================================
-- Photos in albums

CREATE TABLE photo_album_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Display
    sort_order INTEGER DEFAULT 0,
    caption TEXT,

    -- Audit
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),

    UNIQUE(album_id, document_id)
);

CREATE INDEX idx_photo_album_items_album ON photo_album_items(album_id);
CREATE INDEX idx_photo_album_items_document ON photo_album_items(document_id);

-- =====================================================
-- DOCUMENT TEMPLATES TABLE
-- =====================================================
-- Templates for contracts, proposals, etc.

CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template Info
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(30) NOT NULL, -- contract, proposal, warranty, welcome_packet, other

    -- Content
    content_type VARCHAR(20) DEFAULT 'html', -- html, markdown, pdf
    content TEXT,

    -- Variables (placeholders that can be filled)
    available_variables JSONB DEFAULT '[]'::jsonb,
    -- ["{{customer_name}}", "{{job_address}}", "{{contract_amount}}"]

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Versioning
    version INTEGER DEFAULT 1,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_template_type CHECK (template_type IN (
        'contract', 'proposal', 'warranty', 'welcome_packet', 'change_order',
        'completion_certificate', 'lien_waiver', 'other'
    ))
);

CREATE INDEX idx_document_templates_org ON document_templates(organization_id);
CREATE INDEX idx_document_templates_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

CREATE TRIGGER document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GENERATED DOCUMENTS TABLE
-- =====================================================
-- Documents generated from templates

CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id),

    -- Links
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

    -- Document Info
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(30) NOT NULL,

    -- Content
    rendered_content TEXT, -- Final HTML/content
    pdf_url TEXT, -- If converted to PDF

    -- Variable Values Used
    variable_values JSONB DEFAULT '{}'::jsonb,

    -- Signature
    requires_signature BOOLEAN DEFAULT false,
    signature_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, viewed, signed, declined
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by_name VARCHAR(100),
    signature_ip VARCHAR(45),
    signature_data TEXT, -- Base64 signature image

    -- Sent
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_to_email VARCHAR(255),
    viewed_at TIMESTAMP WITH TIME ZONE,

    -- Stored Document
    document_id UUID REFERENCES documents(id), -- Link to stored PDF

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_documents_org ON generated_documents(organization_id);
CREATE INDEX idx_generated_documents_template ON generated_documents(template_id);
CREATE INDEX idx_generated_documents_job ON generated_documents(job_id);
CREATE INDEX idx_generated_documents_contact ON generated_documents(contact_id);
CREATE INDEX idx_generated_documents_signature ON generated_documents(signature_status)
    WHERE requires_signature = true;

CREATE TRIGGER generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DOCUMENT SHARES TABLE
-- =====================================================
-- Track shared document access

CREATE TABLE document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,

    -- Share Token
    share_token VARCHAR(64) UNIQUE NOT NULL,

    -- Access Control
    requires_password BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    max_views INTEGER,
    view_count INTEGER DEFAULT 0,

    -- Permissions
    allow_download BOOLEAN DEFAULT true,

    -- Recipient
    shared_with_email VARCHAR(255),
    shared_with_name VARCHAR(100),

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT document_or_album CHECK (
        (document_id IS NOT NULL AND album_id IS NULL) OR
        (document_id IS NULL AND album_id IS NOT NULL)
    )
);

CREATE INDEX idx_document_shares_org ON document_shares(organization_id);
CREATE INDEX idx_document_shares_document ON document_shares(document_id);
CREATE INDEX idx_document_shares_album ON document_shares(album_id);
CREATE INDEX idx_document_shares_token ON document_shares(share_token);
CREATE INDEX idx_document_shares_expires ON document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- DOCUMENT ACCESS LOG TABLE
-- =====================================================
-- Track document views/downloads

CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    share_id UUID REFERENCES document_shares(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Access Info
    access_type VARCHAR(20) NOT NULL, -- view, download, print

    -- Who
    user_id UUID REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- When
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'download', 'print', 'share'))
);

CREATE INDEX idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_share ON document_access_log(share_id);
CREATE INDEX idx_document_access_log_org ON document_access_log(organization_id);
CREATE INDEX idx_document_access_log_accessed ON document_access_log(accessed_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create job photo folders
CREATE OR REPLACE FUNCTION create_job_document_folders(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_org_id UUID;
    v_parent_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM jobs WHERE id = p_job_id;

    -- Create main job folder
    INSERT INTO document_folders (
        organization_id, folder_name, entity_type, entity_id, is_system_folder
    ) VALUES (
        v_org_id, 'Job Documents', 'job', p_job_id, true
    )
    RETURNING id INTO v_parent_id;

    -- Create sub-folders
    INSERT INTO document_folders (organization_id, folder_name, parent_folder_id, entity_type, entity_id, is_system_folder, sort_order)
    VALUES
        (v_org_id, 'Before Photos', v_parent_id, 'job', p_job_id, true, 1),
        (v_org_id, 'During Photos', v_parent_id, 'job', p_job_id, true, 2),
        (v_org_id, 'After Photos', v_parent_id, 'job', p_job_id, true, 3),
        (v_org_id, 'Damage Photos', v_parent_id, 'job', p_job_id, true, 4),
        (v_org_id, 'Aerial/Measurements', v_parent_id, 'job', p_job_id, true, 5),
        (v_org_id, 'Contracts', v_parent_id, 'job', p_job_id, true, 6),
        (v_org_id, 'Permits', v_parent_id, 'job', p_job_id, true, 7),
        (v_org_id, 'Insurance', v_parent_id, 'job', p_job_id, true, 8),
        (v_org_id, 'Other', v_parent_id, 'job', p_job_id, true, 9);
END;
$$ LANGUAGE plpgsql;

-- Auto-create folders for new jobs
CREATE OR REPLACE FUNCTION trigger_create_job_folders()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_job_document_folders(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_create_document_folders
    AFTER INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_job_folders();

-- Get job photo count by type
CREATE OR REPLACE FUNCTION get_job_photo_counts(p_job_id UUID)
RETURNS TABLE(
    photo_type VARCHAR,
    photo_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.photo_type,
        COUNT(*)
    FROM documents d
    WHERE d.job_id = p_job_id
    AND d.is_photo = true
    AND d.deleted_at IS NULL
    GROUP BY d.photo_type;
END;
$$ LANGUAGE plpgsql;

-- Generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create shareable album
CREATE OR REPLACE FUNCTION create_shareable_album(
    p_job_id UUID,
    p_album_name VARCHAR,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_album_id UUID;
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM jobs WHERE id = p_job_id;

    INSERT INTO photo_albums (
        organization_id,
        job_id,
        album_name,
        is_customer_shareable,
        share_token,
        created_by
    ) VALUES (
        v_org_id,
        p_job_id,
        p_album_name,
        true,
        generate_share_token(),
        p_created_by
    )
    RETURNING id INTO v_album_id;

    RETURN v_album_id;
END;
$$ LANGUAGE plpgsql;

-- Update job document count
CREATE OR REPLACE FUNCTION update_job_document_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update metadata on contacts table to track document counts
    IF NEW.job_id IS NOT NULL THEN
        UPDATE jobs
        SET updated_at = NOW()
        WHERE id = NEW.job_id;
    END IF;

    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{documents_count}',
                (
                    SELECT COUNT(*)::text::jsonb
                    FROM documents
                    WHERE contact_id = NEW.contact_id
                    AND deleted_at IS NULL
                )
            ),
            updated_at = NOW()
        WHERE id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_update_counts
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_job_document_count();

-- =====================================================
-- VIEWS
-- =====================================================

-- Job documents summary
CREATE OR REPLACE VIEW job_documents_summary AS
SELECT
    j.id AS job_id,
    j.job_number,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'before') AS before_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'during') AS during_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'after') AS after_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'damage') AS damage_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true) AS total_photos,
    COUNT(d.id) FILTER (WHERE d.document_type = 'contract') AS contracts,
    COUNT(d.id) FILTER (WHERE d.document_type = 'permit') AS permits,
    COUNT(d.id) AS total_documents
FROM jobs j
LEFT JOIN documents d ON j.id = d.job_id AND d.deleted_at IS NULL
GROUP BY j.id, j.job_number;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE document_folders IS 'Folder organization for documents';
COMMENT ON TABLE documents IS 'All files, photos, and attachments';
COMMENT ON TABLE photo_albums IS 'Photo albums for grouping and sharing';
COMMENT ON TABLE photo_album_items IS 'Photos contained in albums';
COMMENT ON TABLE document_templates IS 'Templates for contracts, proposals, etc.';
COMMENT ON TABLE generated_documents IS 'Documents generated from templates';
COMMENT ON TABLE document_shares IS 'Shared document/album access links';
COMMENT ON TABLE document_access_log IS 'Track document views and downloads';

COMMENT ON COLUMN documents.photo_type IS 'Type of photo: before, during, after, damage, inspection, aerial';
COMMENT ON COLUMN documents.is_customer_visible IS 'Whether document is visible in customer portal';
COMMENT ON COLUMN document_shares.share_token IS 'Unique token for accessing shared documents';
