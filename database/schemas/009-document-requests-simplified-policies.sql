-- Simplified RLS policies for document_requests (standalone version)
-- Run this if you're getting database errors

-- First, drop existing policies
DROP POLICY IF EXISTS "Anyone can submit document requests" ON document_requests;
DROP POLICY IF EXISTS "Users can view their own submissions" ON document_requests;
DROP POLICY IF EXISTS "Admins can update document requests" ON document_requests;
DROP POLICY IF EXISTS "Admins can delete document requests" ON document_requests;

-- Recreate with simplified policies (no dependencies)

-- Allow ANYONE (anonymous included) to insert
CREATE POLICY "Anyone can submit document requests"
    ON document_requests FOR INSERT
    WITH CHECK (true);

-- Allow ANYONE to view records (you can restrict this later)
CREATE POLICY "Public can view document requests"
    ON document_requests FOR SELECT
    USING (true);

-- Only authenticated users can update
CREATE POLICY "Authenticated can update document requests"
    ON document_requests FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- Only authenticated users can delete
CREATE POLICY "Authenticated can delete document requests"
    ON document_requests FOR DELETE
    USING (auth.uid() IS NOT NULL);
