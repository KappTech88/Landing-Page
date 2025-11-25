#!/usr/bin/env node
/**
 * Test script to verify document_requests table and RLS policies
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qxswelavrvfgtpyukijb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3dlbGF2cnZmZ3RweXVraWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTc4OTMsImV4cCI6MjA3OTU5Mzg5M30.YH0Kxil6gSKLak4oRqW7ihrpQEtnj-sKLlyx8Dac4HA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabase() {
  console.log('🧪 Testing Database Connection and RLS Policies\n');
  console.log('=' .repeat(60));

  // Test 1: Check if table exists
  console.log('\n📋 Test 1: Check if document_requests table exists');
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .select('id')
      .limit(1);

    if (error) {
      console.log('❌ FAILED:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   → Table does not exist. Run 009-document-requests.sql first!');
      }
      return;
    }
    console.log('✅ PASSED: Table exists and is accessible');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    return;
  }

  // Test 2: Test anonymous insert
  console.log('\n📝 Test 2: Test anonymous insert (RLS policies)');
  try {
    const testData = {
      contact_name: 'Test User',
      email: 'test@example.com',
      document_type: 'simple',
      document_description: 'Test submission from test script',
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('document_requests')
      .insert(testData)
      .select('id')
      .single();

    if (error) {
      console.log('❌ FAILED:', error.message);
      console.log('   Details:', JSON.stringify(error, null, 2));

      if (error.message.includes('policy')) {
        console.log('\n   → RLS policy blocking insert!');
        console.log('   → Run the simplified policies SQL:');
        console.log('   → database/schemas/009-document-requests-simplified-policies.sql');
      }
      return;
    }

    console.log('✅ PASSED: Anonymous insert works!');
    console.log('   Record ID:', data.id);

    // Clean up test record
    await supabase
      .from('document_requests')
      .delete()
      .eq('id', data.id);
    console.log('   (Test record cleaned up)');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    return;
  }

  // Test 3: Test file upload to storage
  console.log('\n📁 Test 3: Test storage bucket access');
  try {
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.log('❌ FAILED:', bucketError.message);
      return;
    }

    const docBucket = buckets?.find(b => b.name === 'document-requests');
    if (!docBucket) {
      console.log('❌ FAILED: Bucket "document-requests" not found');
      console.log('   → Create bucket in Supabase Dashboard');
      return;
    }

    console.log('✅ PASSED: Bucket exists');
    console.log('   Public:', docBucket.public ? 'Yes ✓' : 'No ✗');

    if (!docBucket.public) {
      console.log('   ⚠️  Warning: Bucket should be public!');
    }
  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed! The system is ready.\n');
}

testDatabase().catch(console.error);
