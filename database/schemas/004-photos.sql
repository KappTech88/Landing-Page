-- =====================================================
-- 004-photos.sql
-- Photo and Document Management
-- Supabase Storage integration for restoration documentation
-- =====================================================

-- =====================================================
-- PHOTOS TABLE
-- =====================================================
-- References to photos stored in Supabase Storage
-- Supports claims documentation, damage assessment, progress tracking

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Photo Identification
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255), -- Original filename from upload
    file_extension VARCHAR(10), -- jpg, png, heic, pdf, etc.

    -- Storage Location (Supabase Storage)
    storage_bucket VARCHAR(100) DEFAULT 'claim-photos', -- Supabase bucket name
    storage_path TEXT NOT NULL, -- Full path in storage: org_id/claim_id/photo_id.jpg
    public_url TEXT, -- Public URL if photo is public
    thumbnail_url TEXT, -- Thumbnail URL for grid views

    -- File Metadata
    file_size INTEGER, -- Bytes
    mime_type VARCHAR(100), -- image/jpeg, image/png, application/pdf
    width INTEGER, -- Image width in pixels
    height INTEGER, -- Image height in pixels

    -- Photo Classification
    category VARCHAR(50) NOT NULL DEFAULT 'damage', -- damage, pre_existing, repair_progress, completion, other
    subcategory VARCHAR(50), -- roof_damage, interior_damage, exterior_damage, etc.
    photo_type VARCHAR(30) DEFAULT 'photo', -- photo, document, sketch, diagram, video

    -- Context & Location
    room_location VARCHAR(100), -- "Master Bedroom", "Living Room", "Exterior - North Side"
    description TEXT, -- Description of what photo shows
    damage_type VARCHAR(50), -- water, fire, wind, hail, mold, structural

    -- Tagging & Search
    tags TEXT[], -- Array of tags for searching: ['water_damage', 'ceiling', 'bedroom']
    is_featured BOOLEAN DEFAULT false, -- Featured photo for claim
    display_order INTEGER DEFAULT 0, -- Order for displaying photos

    -- Association
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL, -- Link to specific estimate
    line_item_id UUID REFERENCES estimate_line_items(id) ON DELETE SET NULL, -- Link to line item

    -- Capture Information
    captured_by UUID REFERENCES users(id), -- Who took the photo
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When photo was taken
    uploaded_by UUID NOT NULL REFERENCES users(id), -- Who uploaded it
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When uploaded

    -- GPS & EXIF Data (from phone cameras)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    exif_data JSONB, -- Full EXIF metadata

    -- Status & Visibility
    is_public BOOLEAN DEFAULT false, -- Visible to property owner/client
    is_approved BOOLEAN DEFAULT true, -- Approved for insurance submission
    requires_review BOOLEAN DEFAULT false, -- Needs manager review before submission

    -- Processing
    is_processed BOOLEAN DEFAULT false, -- Image optimization/thumbnail generation complete
    processing_status VARCHAR(30) DEFAULT 'pending', -- pending, processing, completed, failed

    -- Notes
    notes TEXT, -- Internal notes about photo

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_photo_category CHECK (category IN (
        'damage', 'pre_existing', 'repair_progress', 'completion',
        'before', 'after', 'insurance_doc', 'estimate_doc', 'invoice', 'other'
    )),
    CONSTRAINT valid_photo_type CHECK (photo_type IN ('photo', 'document', 'sketch', 'diagram', 'video', 'scan')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for photos
CREATE INDEX idx_photos_claim_id ON photos(claim_id);
CREATE INDEX idx_photos_organization_id ON photos(organization_id);
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_estimate_id ON photos(estimate_id);
CREATE INDEX idx_photos_line_item_id ON photos(line_item_id);
CREATE INDEX idx_photos_captured_by ON photos(captured_by);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_captured_at ON photos(captured_at DESC);
CREATE INDEX idx_photos_is_featured ON photos(is_featured) WHERE is_featured = true;
CREATE INDEX idx_photos_display_order ON photos(claim_id, display_order);
CREATE INDEX idx_photos_deleted_at ON photos(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for tags array search
CREATE INDEX idx_photos_tags ON photos USING gin(tags);

-- Full-text search on photo descriptions
CREATE INDEX idx_photos_search ON photos USING gin(
    to_tsvector('english', coalesce(description, '') || ' ' || coalesce(room_location, ''))
);

CREATE TRIGGER photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUMS TABLE
-- =====================================================
-- Organize photos into albums for better organization

CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Album Details
    album_name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,

    -- Organization
    display_order INTEGER DEFAULT 0,

    -- Visibility
    is_public BOOLEAN DEFAULT false, -- Visible to clients
    is_shared BOOLEAN DEFAULT false, -- Shared with insurance/3rd parties

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for photo_albums
CREATE INDEX idx_albums_claim_id ON photo_albums(claim_id);
CREATE INDEX idx_albums_organization_id ON photo_albums(organization_id);
CREATE INDEX idx_albums_deleted_at ON photo_albums(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUM ITEMS (Junction Table)
-- =====================================================
-- Many-to-many relationship between photos and albums

CREATE TABLE photo_album_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

    -- Organization within album
    display_order INTEGER DEFAULT 0,
    caption TEXT,

    -- Audit
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),

    -- Constraints
    UNIQUE(album_id, photo_id) -- Photo can't be in same album twice
);

-- Indexes for photo_album_items
CREATE INDEX idx_album_items_album_id ON photo_album_items(album_id);
CREATE INDEX idx_album_items_photo_id ON photo_album_items(photo_id);
CREATE INDEX idx_album_items_display_order ON photo_album_items(album_id, display_order);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- Non-photo documents (PDFs, Word docs, Excel, etc.)

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Document Identification
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    document_type VARCHAR(50) NOT NULL, -- contract, invoice, estimate, report, correspondence, legal

    -- Storage
    storage_bucket VARCHAR(100) DEFAULT 'claim-documents',
    storage_path TEXT NOT NULL,
    public_url TEXT,

    -- File Metadata
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_extension VARCHAR(10),

    -- Classification
    category VARCHAR(50), -- insurance, legal, financial, technical, administrative
    subcategory VARCHAR(50),
    description TEXT,
    tags TEXT[],

    -- Association
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    related_to_table VARCHAR(50), -- 'claims', 'estimates', 'invoices', etc.
    related_to_id UUID, -- Generic FK to related record

    -- Upload Information
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Visibility & Status
    is_public BOOLEAN DEFAULT false,
    is_signed BOOLEAN DEFAULT false, -- For contracts/legal docs
    requires_signature BOOLEAN DEFAULT false,
    signed_by UUID REFERENCES users(id),
    signed_at TIMESTAMP WITH TIME ZONE,

    -- Version Control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id), -- Previous version

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_document_type CHECK (document_type IN (
        'contract', 'invoice', 'estimate', 'report', 'correspondence',
        'legal', 'insurance_form', 'permit', 'certificate', 'other'
    ))
);

-- Indexes for documents
CREATE INDEX idx_documents_claim_id ON documents(claim_id);
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_estimate_id ON documents(estimate_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON documents USING gin(tags);

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING gin(
    to_tsvector('english', coalesce(file_name, '') || ' ' || coalesce(description, ''))
);

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all photos for a claim organized by category
CREATE OR REPLACE FUNCTION get_claim_photos_by_category(p_claim_id UUID)
RETURNS TABLE(
    category VARCHAR,
    photo_count BIGINT,
    latest_photo_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.category,
        COUNT(*)::BIGINT,
        MAX(p.captured_at)
    FROM photos p
    WHERE p.claim_id = p_claim_id
    AND p.deleted_at IS NULL
    GROUP BY p.category
    ORDER BY p.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate storage path for new photos
CREATE OR REPLACE FUNCTION generate_photo_storage_path(
    p_organization_id UUID,
    p_claim_id UUID,
    p_photo_id UUID,
    p_file_extension VARCHAR
)
RETURNS TEXT AS $$
BEGIN
    RETURN format(
        '%s/%s/%s.%s',
        p_organization_id,
        p_claim_id,
        p_photo_id,
        LOWER(p_file_extension)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE photos IS 'Photo references for Supabase Storage - damage documentation and progress tracking';
COMMENT ON TABLE photo_albums IS 'Organize photos into albums for better organization';
COMMENT ON TABLE photo_album_items IS 'Junction table linking photos to albums';
COMMENT ON TABLE documents IS 'Non-photo document management (PDFs, contracts, reports)';

COMMENT ON COLUMN photos.storage_path IS 'Full path in Supabase Storage bucket';
COMMENT ON COLUMN photos.tags IS 'Array of searchable tags for finding photos';
COMMENT ON COLUMN photos.exif_data IS 'Full EXIF metadata from camera/phone';
COMMENT ON COLUMN documents.related_to_table IS 'Generic relation - table name of related record';
COMMENT ON COLUMN documents.related_to_id IS 'Generic relation - ID of related record';
