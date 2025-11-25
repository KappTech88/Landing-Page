import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type TestResult = {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResult>
) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Test 1: Check connection
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, subscription_tier')
      .limit(5);

    if (orgError) {
      throw new Error(`Database query failed: ${orgError.message}`);
    }

    // Test 2: Check roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('name, display_name')
      .eq('is_system_role', true);

    if (rolesError) {
      throw new Error(`Roles query failed: ${rolesError.message}`);
    }

    // Test 3: Check claims count
    const { count: claimsCount, error: claimsError } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true });

    if (claimsError) {
      throw new Error(`Claims count failed: ${claimsError.message}`);
    }

    // Return success with data
    res.status(200).json({
      success: true,
      message: '✅ Database connection successful!',
      data: {
        organizations: {
          count: organizations?.length || 0,
          items: organizations || []
        },
        roles: {
          count: roles?.length || 0,
          items: roles || []
        },
        claims: {
          count: claimsCount || 0
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      success: false,
      message: '❌ Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
