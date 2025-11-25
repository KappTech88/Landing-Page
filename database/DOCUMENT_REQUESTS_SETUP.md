# Document Requests Setup Guide

This guide explains how to set up the public document request submission system that allows users to submit requests without logging in.

## Overview

The document requests feature allows anonymous users to:
- Submit customized document requests
- Upload reference files
- Receive AI-processed responses
- Have their data saved for admin review

**No authentication required for submissions!**

## Database Setup

### Step 1: Run the Database Migration

Execute the SQL migration to create the `document_requests` table:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manually in Supabase Dashboard
# Go to: Supabase Dashboard → SQL Editor
# Paste contents of: database/schemas/009-document-requests.sql
# Click "Run"
```

This will create:
- ✅ `document_requests` table with all necessary columns
- ✅ Row Level Security (RLS) policies for public access
- ✅ Indexes for performance
- ✅ Triggers for automatic timestamp updates

### Step 2: Verify Table Creation

```sql
-- Check if table exists
SELECT * FROM document_requests LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'document_requests';
```

You should see 4 policies:
1. **Anyone can submit document requests** (INSERT)
2. **Users can view their own submissions** (SELECT)
3. **Admins can update document requests** (UPDATE)
4. **Admins can delete document requests** (DELETE)

## Storage Setup

### Step 1: Create Storage Bucket

In Supabase Dashboard → Storage:

1. Click **"New bucket"**
2. Name: `document-requests`
3. **✅ Check "Public bucket"** (important!)
4. Click **"Create bucket"**

### Step 2: Set Up Storage Policies

Go to Storage → `document-requests` → Policies:

**Policy 1: Allow Anonymous Uploads**
```sql
CREATE POLICY "Allow anonymous uploads to document-requests"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'document-requests');
```

**Policy 2: Allow Public Reads**
```sql
CREATE POLICY "Allow public reads from document-requests"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'document-requests');
```

**Policy 3: Only Authenticated Users Can Delete**
```sql
CREATE POLICY "Only authenticated users can delete from document-requests"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'document-requests');
```

### Step 3: Verify Storage Setup

Test file upload without authentication:
```javascript
// This should work without auth.signIn()
const { data, error } = await supabase.storage
  .from('document-requests')
  .upload('test/example.txt', new File(['test'], 'test.txt'));
```

## Application Configuration

### Environment Variables

Ensure your `.env.local` has:

```env
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Gemini AI (required for AI processing)
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

### Test the Integration

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the form:**
   - Open http://localhost:5173
   - Click "SELECT SERVICE"
   - Click "Customized Documents"

3. **Test submission:**
   - Fill out the form (name, document type, description)
   - Optionally upload a file
   - Click "Submit Document Request"
   - Verify you see success message with Reference ID

4. **Verify in Supabase:**
   ```sql
   SELECT * FROM document_requests ORDER BY created_at DESC LIMIT 5;
   ```

## Data Structure

### Document Request Fields

```typescript
{
  id: UUID                          // Auto-generated
  contact_name: string              // Required
  email: string                     // Optional but recommended
  phone: string                     // Optional
  company_name: string              // Optional
  document_type: 'simple' | 'digital-forum'  // Required
  document_title: string            // Optional
  document_description: string      // Required
  specific_requirements: string     // Optional
  use_case: string                  // Optional
  additional_notes: string          // Optional
  ai_response: string               // Auto-saved from Gemini
  ai_model: string                  // Auto: 'gemini-2.5-flash'
  sample_documents: JSONB[]         // Array of uploaded files
  status: string                    // Default: 'pending'
  pricing_tier: string              // '$50' or '$100'
  created_at: timestamp             // Auto
  updated_at: timestamp             // Auto
}
```

### Sample Documents Structure

```json
[
  {
    "file_name": "1234567890_abc123.pdf",
    "original_file_name": "sample.pdf",
    "file_size": 12345,
    "mime_type": "application/pdf",
    "storage_path": "pending/1234567890_abc123.pdf",
    "public_url": "https://...supabase.co/storage/v1/object/public/document-requests/..."
  }
]
```

## Admin Access

To view and manage submissions:

```sql
-- View all pending requests
SELECT
  id,
  contact_name,
  email,
  company_name,
  document_type,
  pricing_tier,
  status,
  created_at
FROM document_requests
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Update status
UPDATE document_requests
SET status = 'completed', processed_at = NOW()
WHERE id = 'request-uuid';

-- Get requests by email
SELECT * FROM document_requests
WHERE email = 'customer@example.com'
ORDER BY created_at DESC;
```

## Troubleshooting

### "Error submitting document request"

1. **Check RLS policies:**
   ```sql
   -- Verify INSERT policy allows anonymous access
   SELECT * FROM pg_policies
   WHERE tablename = 'document_requests'
   AND cmd = 'INSERT';
   ```

2. **Check Supabase credentials:**
   - Verify `VITE_SUPABASE_URL` is correct
   - Verify `VITE_SUPABASE_ANON_KEY` is valid

### "Failed to upload file"

1. **Check storage bucket exists:**
   - Dashboard → Storage → Verify `document-requests` bucket

2. **Check bucket is public:**
   - Bucket settings → Public access should be enabled

3. **Check storage policies:**
   - Verify anonymous INSERT policy exists
   - Verify public SELECT policy exists

### "AI processing failed"

1. **Check Gemini API key:**
   ```bash
   echo $VITE_GEMINI_API_KEY
   ```

2. **Test API key:**
   ```bash
   curl -X POST \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"test"}]}]}'
   ```

## Security Considerations

### Data Protection

- Email and phone numbers are stored but not validated
- No PII encryption at rest (consider adding for production)
- Rate limiting should be implemented to prevent spam
- Consider adding CAPTCHA for production

### Storage Security

- Files are public (anyone with URL can access)
- No virus scanning (consider adding for production)
- File size limits enforced by Supabase (default 50MB)
- Consider adding content-type validation

### Recommended Production Enhancements

1. **Add rate limiting:**
   ```sql
   -- Track submissions by IP
   CREATE INDEX idx_document_requests_ip
   ON document_requests(submission_ip, created_at);
   ```

2. **Add email validation:**
   ```typescript
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
     throw new Error('Invalid email');
   }
   ```

3. **Add CAPTCHA:**
   ```typescript
   import ReCAPTCHA from 'react-google-recaptcha';
   // Add to form before submission
   ```

4. **Add file type validation:**
   ```typescript
   const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'];
   if (!allowedTypes.includes(file.type)) {
     throw new Error('Invalid file type');
   }
   ```

## Next Steps

1. ✅ Run database migration
2. ✅ Create storage bucket
3. ✅ Set up storage policies
4. ✅ Test form submission
5. ⏳ Set up admin dashboard (optional)
6. ⏳ Add email notifications (optional)
7. ⏳ Implement rate limiting (recommended)
8. ⏳ Add CAPTCHA (recommended)

## Support

For issues or questions:
- Check Supabase logs: Dashboard → Logs
- Check browser console for errors
- Review network requests in DevTools
- Check database connection in Supabase Dashboard
