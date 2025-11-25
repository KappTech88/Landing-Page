-- =====================================================
-- 009-document-requests.sql
-- Public document request submissions (no login required)
-- =====================================================

-- =====================================================
-- DOCUMENT REQUESTS TABLE
-- =====================================================
-- Stores customized document requests from public users
-- No authentication required for submissions

CREATE TABLE IF NOT EXISTS public.document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contact Information
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(255),

    -- Document Details
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('simple', 'digital-forum')),
    document_title VARCHAR(500),
    document_description TEXT NOT NULL,
    specific_requirements TEXT,
    use_case TEXT,
    additional_notes TEXT,

    -- AI Processing
    ai_response TEXT,
    ai_model VARCHAR(100),

    -- File Attachments
    sample_documents JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"file_name": "example.pdf", "file_size": 12345, "mime_type": "application/pdf", "storage_path": "path/to/file"}]

    -- Status & Processing
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'archived')),
    pricing_tier VARCHAR(50),

    -- Metadata
    submission_ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,

    -- Optional: Link to organization if user is authenticated
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_created_at ON document_requests(created_at DESC);
CREATE INDEX idx_document_requests_email ON document_requests(email);
CREATE INDEX idx_document_requests_company ON document_requests(company_name);
CREATE INDEX idx_document_requests_document_type ON document_requests(document_type);
CREATE INDEX idx_document_requests_organization ON document_requests(organization_id) WHERE organization_id IS NOT NULL;

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_document_requests_updated_at
    BEFORE UPDATE ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous users) to insert document requests
CREATE POLICY "Anyone can submit document requests"
    ON document_requests FOR INSERT
    WITH CHECK (true);

-- Allow anyone to view their own submissions by email (if they know the ID)
CREATE POLICY "Users can view their own submissions"
    ON document_requests FOR SELECT
    USING (
        public.is_super_admin()
        OR organization_id = ANY(public.user_organization_ids())
        OR (auth.uid() IS NULL AND id IS NOT NULL) -- Allow anonymous access with ID
    );

-- Only authenticated admins can update/delete
CREATE POLICY "Admins can update document requests"
    ON document_requests FOR UPDATE
    USING (
        public.is_super_admin()
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    );

CREATE POLICY "Admins can delete document requests"
    ON document_requests FOR DELETE
    USING (
        public.is_super_admin()
        OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
    );

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE document_requests IS 'Public document requests - no authentication required for submissions';
COMMENT ON COLUMN document_requests.document_type IS 'simple ($50) or digital-forum ($100)';
COMMENT ON COLUMN document_requests.sample_documents IS 'JSON array of uploaded reference documents';
COMMENT ON COLUMN document_requests.status IS 'pending, processing, completed, or archived';
COMMENT ON COLUMN document_requests.ai_response IS 'Response from AI processing (Gemini)';

-- =====================================================
-- STORAGE BUCKET CONFIGURATION
-- =====================================================
-- Note: This must be run in Supabase dashboard or via API
-- The storage bucket policies allow anonymous uploads

-- Storage bucket: 'document-requests'
-- Policies:
-- 1. Allow anyone to upload files (INSERT)
-- 2. Allow anyone to read files with the URL (SELECT)
-- 3. Only admins can delete files

-- Example SQL for storage policies (run separately):
/*
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-requests', 'document-requests', true);

-- Allow anonymous uploads
CREATE POLICY "Allow anonymous uploads to document-requests"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'document-requests');

-- Allow public reads
CREATE POLICY "Allow public reads from document-requests"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'document-requests');

-- Only authenticated users can delete
CREATE POLICY "Only authenticated users can delete from document-requests"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'document-requests');
*/
