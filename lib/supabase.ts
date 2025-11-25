// =====================================================
// Supabase Client for Vite/React
// This will be replaced when migrating to Next.js
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Development warning
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Please add to .env.local:\n' +
    'VITE_SUPABASE_URL=your-project-url\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * Get current session
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Sign up with email and password
 */
export const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Sign out
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Upload file to Supabase Storage
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Delete file from storage
 */
export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};

// =====================================================
// Auth State Listener
// =====================================================

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// =====================================================
// Database Helpers
// =====================================================

/**
 * Get user's organizations
 */
export const getUserOrganizations = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_organization_roles')
    .select(`
      organization_id,
      role_id,
      is_active,
      organizations (
        id,
        name,
        slug,
        subscription_tier
      ),
      roles (
        name,
        display_name,
        permissions
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
  return data;
};

/**
 * Create a new claim with property
 */
export const createClaim = async (claimData: any, propertyData: any) => {
  // Start a transaction by creating claim first
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .insert(claimData)
    .select()
    .single();

  if (claimError) throw claimError;

  // Create property linked to claim
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      ...propertyData,
      claim_id: claim.id,
    })
    .select()
    .single();

  if (propertyError) {
    // Rollback: delete the claim if property creation fails
    await supabase.from('claims').delete().eq('id', claim.id);
    throw propertyError;
  }

  return { claim, property };
};

/**
 * Get claims with properties for current user
 */
export const getUserClaims = async (userId: string, organizationId: string) => {
  const { data, error } = await supabase
    .from('claims')
    .select(`
      *,
      properties (*),
      estimates (count)
    `)
    .eq('organization_id', organizationId)
    .or(`created_by.eq.${userId},assigned_contractor_id.eq.${userId},assigned_estimator_id.eq.${userId}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Upload photo and create photo record
 */
export const uploadClaimPhoto = async (
  claimId: string,
  organizationId: string,
  file: File,
  metadata: {
    category?: string;
    description?: string;
    room_location?: string;
    damage_type?: string;
  }
) => {
  const userId = (await getCurrentUser())?.id;
  if (!userId) throw new Error('User not authenticated');

  // Generate unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const storagePath = `${organizationId}/${claimId}/${fileName}`;

  // Upload to storage
  await uploadFile('claim-photos', storagePath, file);

  // Get public URL
  const publicUrl = getPublicUrl('claim-photos', storagePath);

  // Create photo record
  const { data, error } = await supabase
    .from('photos')
    .insert({
      claim_id: claimId,
      organization_id: organizationId,
      file_name: fileName,
      original_file_name: file.name,
      file_extension: fileExt,
      storage_bucket: 'claim-photos',
      storage_path: storagePath,
      public_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      category: metadata.category || 'damage',
      description: metadata.description,
      room_location: metadata.room_location,
      damage_type: metadata.damage_type,
      uploaded_by: userId,
      captured_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export default supabase;
