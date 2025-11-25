#!/usr/bin/env node

/**
 * Database Setup Script
 * Runs the document_requests migration and sets up storage policies
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = 'https://qxswelavrvfgtpyukijb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3dlbGF2cnZmZ3RweXVraWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTc4OTMsImV4cCI6MjA3OTU5Mzg5M30.YH0Kxil6gSKLak4oRqW7ihrpQEtnj-sKLlyx8Dac4HA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Read the SQL migration file
    const sqlPath = join(__dirname, 'database', 'schemas', '009-document-requests.sql');
    console.log('📖 Reading SQL migration file...');
    const sql = readFileSync(sqlPath, 'utf8');

    // Note: The anon key cannot execute DDL statements directly
    // We need to use the Supabase Dashboard SQL Editor or service role key
    console.log('\n⚠️  IMPORTANT: The anon key cannot execute DDL statements.');
    console.log('\nPlease run the SQL migration manually:');
    console.log('1. Go to: https://qxswelavrvfgtpyukijb.supabase.co/project/qxswelavrvfgtpyukijb/sql');
    console.log('2. Copy the contents of: database/schemas/009-document-requests.sql');
    console.log('3. Paste into the SQL Editor');
    console.log('4. Click "Run"');
    console.log('\n📝 SQL file location: database/schemas/009-document-requests.sql\n');

    // Check if table already exists
    console.log('🔍 Checking if document_requests table exists...');
    const { data, error } = await supabase
      .from('document_requests')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ Table does not exist yet. Please run the SQL migration first.');
        console.log('\nNext steps:');
        console.log('1. Run the SQL migration in Supabase Dashboard');
        console.log('2. Run this script again to verify\n');
        return;
      }
      throw error;
    }

    console.log('✅ Table exists and is accessible!\n');

    // Check storage bucket
    console.log('🔍 Checking storage bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const docBucket = buckets?.find(b => b.name === 'document-requests');

    if (!docBucket) {
      console.log('❌ Storage bucket "document-requests" not found.');
      console.log('\nPlease create it in Supabase Dashboard:');
      console.log('1. Go to: Storage → New bucket');
      console.log('2. Name: document-requests');
      console.log('3. Check "Public bucket"');
      console.log('4. Create bucket\n');
    } else {
      console.log('✅ Storage bucket "document-requests" exists!');
      console.log(`   Public: ${docBucket.public ? 'Yes ✓' : 'No ✗'}\n`);

      if (!docBucket.public) {
        console.log('⚠️  Bucket should be public. Update in Storage settings.');
      }
    }

    // Test anonymous insert
    console.log('🧪 Testing anonymous insert...');
    const testData = {
      contact_name: 'Test User',
      email: 'test@example.com',
      document_type: 'simple',
      document_description: 'Test submission',
      status: 'pending'
    };

    const { data: testInsert, error: insertError } = await supabase
      .from('document_requests')
      .insert(testData)
      .select('id')
      .single();

    if (insertError) {
      console.log('❌ Anonymous insert failed:', insertError.message);
      console.log('\nPlease check RLS policies in Supabase Dashboard.');
    } else {
      console.log('✅ Anonymous insert works!');
      console.log(`   Test record ID: ${testInsert.id}`);

      // Clean up test record
      await supabase
        .from('document_requests')
        .delete()
        .eq('id', testInsert.id);
      console.log('   (Test record cleaned up)\n');
    }

    console.log('🎉 Setup verification complete!\n');
    console.log('Next steps:');
    console.log('1. If table doesn\'t exist: Run SQL migration in Dashboard');
    console.log('2. If bucket doesn\'t exist: Create bucket in Dashboard');
    console.log('3. Start dev server: npm run dev');
    console.log('4. Test the Customized Documents form\n');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
}

setupDatabase();
