#!/bin/bash

# Supabase Setup Script for Document Requests
# This script helps you set up the database and storage

set -e

SUPABASE_URL="https://qxswelavrvfgtpyukijb.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3dlbGF2cnZmZ3RweXVraWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTc4OTMsImV4cCI6MjA3OTU5Mzg5M30.YH0Kxil6gSKLak4oRqW7ihrpQEtnj-sKLlyx8Dac4HA"

echo "🚀 Supabase Setup for Document Requests"
echo "========================================"
echo ""

# Test connection
echo "📡 Testing Supabase connection..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_KEY")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Connection successful!"
else
  echo "❌ Connection failed (HTTP $HTTP_CODE)"
  exit 1
fi

echo ""
echo "📋 MANUAL SETUP REQUIRED"
echo "========================"
echo ""
echo "The database migration requires admin privileges."
echo "Please follow these steps:"
echo ""
echo "1️⃣  RUN SQL MIGRATION"
echo "   • Open: $SUPABASE_URL/project/qxswelavrvfgtpyukijb/sql"
echo "   • Copy file: database/schemas/009-document-requests.sql"
echo "   • Paste into SQL Editor"
echo "   • Click 'Run'"
echo ""
echo "2️⃣  VERIFY STORAGE BUCKET (should already exist)"
echo "   • Open: $SUPABASE_URL/project/qxswelavrvfgtpyukijb/storage/buckets"
echo "   • Check for bucket: 'document-requests'"
echo "   • Make sure it's PUBLIC"
echo ""
echo "3️⃣  SET STORAGE POLICIES"
echo "   • Go to Storage → document-requests → Policies"
echo "   • Add these 3 policies (if not already present):"
echo ""
echo "   Policy 1 - Allow anonymous uploads:"
echo "   -----------------------------------"
echo "   CREATE POLICY \"Allow anonymous uploads to document-requests\""
echo "   ON storage.objects FOR INSERT"
echo "   TO public"
echo "   WITH CHECK (bucket_id = 'document-requests');"
echo ""
echo "   Policy 2 - Allow public reads:"
echo "   ------------------------------"
echo "   CREATE POLICY \"Allow public reads from document-requests\""
echo "   ON storage.objects FOR SELECT"
echo "   TO public"
echo "   USING (bucket_id = 'document-requests');"
echo ""
echo "   Policy 3 - Authenticated delete only:"
echo "   -------------------------------------"
echo "   CREATE POLICY \"Only authenticated users can delete from document-requests\""
echo "   ON storage.objects FOR DELETE"
echo "   TO authenticated"
echo "   USING (bucket_id = 'document-requests');"
echo ""
echo "4️⃣  TEST THE SETUP"
echo "   • Run: npm run dev"
echo "   • Navigate to Customized Documents form"
echo "   • Submit a test request"
echo ""
echo "📚 For detailed instructions, see:"
echo "   database/DOCUMENT_REQUESTS_SETUP.md"
echo ""
