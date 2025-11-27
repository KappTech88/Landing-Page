// =====================================================
// Supabase Client for Vite/React
// This will be replaced when migrating to Next.js
// =====================================================

import { createClient } from '@supabase/supabase-js';
import type {
  Job,
  JobWithDetails,
  JobStatus,
  JobType,
  JobNote,
  JobNoteMention,
  JobAccess,
  JobAccessLevel,
  NoteAttachment,
  User
} from '../types';

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

// =====================================================
// JOB FUNCTIONS
// =====================================================

/**
 * Get job with all related data
 */
export const getJobWithDetails = async (jobId: string): Promise<JobWithDetails | null> => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      contact:contacts(*),
      claim:claims(*),
      sales_rep:users!jobs_sales_rep_id_fkey(id, full_name, avatar_url, title),
      project_manager:users!jobs_project_manager_id_fkey(id, full_name, avatar_url, title),
      estimator:users!jobs_estimator_id_fkey(id, full_name, avatar_url, title)
    `)
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return null;
  }
  return data;
};

/**
 * Get jobs for organization with optional filtering
 */
export const getJobs = async (
  organizationId: string,
  filters?: {
    status?: JobStatus[];
    job_type?: JobType;
    sales_rep_id?: string;
    search?: string;
    limit?: number;
  }
): Promise<Job[]> => {
  let query = supabase
    .from('jobs')
    .select(`
      *,
      contact:contacts(id, full_name, phone_primary, email)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (filters?.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters?.job_type) {
    query = query.eq('job_type', filters.job_type);
  }
  if (filters?.sales_rep_id) {
    query = query.eq('sales_rep_id', filters.sales_rep_id);
  }
  if (filters?.search) {
    query = query.or(
      `job_name.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
    );
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Update job status with automatic date tracking
 */
export const updateJobStatus = async (
  jobId: string,
  newStatus: JobStatus
): Promise<Job> => {
  const updates: Partial<Job> & { status: JobStatus } = { status: newStatus };

  // Auto-set dates based on status
  const now = new Date().toISOString().split('T')[0];
  switch (newStatus) {
    case 'sold':
      updates.date_sold = now;
      break;
    case 'scheduled':
      updates.date_scheduled = now;
      break;
    case 'in_progress':
      updates.date_started = now;
      break;
    case 'complete':
      updates.date_completed = now;
      break;
    case 'closed':
      updates.date_closed = now;
      break;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update job fields
 */
export const updateJob = async (
  jobId: string,
  updates: Partial<Job>
): Promise<Job> => {
  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =====================================================
// JOB NOTES FUNCTIONS
// =====================================================

/**
 * Get notes for a job with author and mentions
 */
export const getJobNotes = async (
  jobId: string,
  options?: {
    filter?: 'all' | 'mentions' | 'pinned';
    userId?: string;
  }
): Promise<JobNote[]> => {
  let query = supabase
    .from('job_notes')
    .select(`
      *,
      author:users!job_notes_created_by_fkey(id, full_name, avatar_url, title),
      mentions:job_note_mentions(
        *,
        mentioned_user:users(id, full_name, avatar_url)
      )
    `)
    .eq('job_id', jobId)
    .is('parent_note_id', null) // Only top-level notes
    .is('deleted_at', null);

  // Apply filters
  if (options?.filter === 'pinned') {
    query = query.eq('is_pinned', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  let notes = data || [];

  // Filter mentions if needed
  if (options?.filter === 'mentions' && options.userId) {
    notes = notes.filter((note: JobNote) =>
      note.mentions?.some((m: JobNoteMention) => m.mentioned_user_id === options.userId)
    );
  }

  // Fetch replies for each note
  const notesWithReplies = await Promise.all(
    notes.map(async (note: JobNote) => {
      const { data: replies } = await supabase
        .from('job_notes')
        .select(`
          *,
          author:users!job_notes_created_by_fkey(id, full_name, avatar_url, title)
        `)
        .eq('parent_note_id', note.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      return {
        ...note,
        replies: replies || [],
        reply_count: replies?.length || 0
      };
    })
  );

  return notesWithReplies;
};

/**
 * Create a new job note with optional mentions
 */
export const createJobNote = async (
  jobId: string,
  organizationId: string,
  content: string,
  options?: {
    parentNoteId?: string;
    mentionedUserIds?: string[];
    attachments?: NoteAttachment[];
  }
): Promise<JobNote> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  // Determine note type
  let noteType: 'general' | 'mention' | 'reply' = 'general';
  if (options?.parentNoteId) noteType = 'reply';
  else if (options?.mentionedUserIds?.length) noteType = 'mention';

  // Create note
  const { data: note, error: noteError } = await supabase
    .from('job_notes')
    .insert({
      job_id: jobId,
      organization_id: organizationId,
      content,
      note_type: noteType,
      parent_note_id: options?.parentNoteId || null,
      thread_id: options?.parentNoteId || null,
      created_by: user.id,
      attachments: options?.attachments || []
    })
    .select(`
      *,
      author:users!job_notes_created_by_fkey(id, full_name, avatar_url, title)
    `)
    .single();

  if (noteError) throw noteError;

  // Create mentions
  if (options?.mentionedUserIds?.length) {
    const mentionInserts = options.mentionedUserIds.map(userId => ({
      note_id: note.id,
      mentioned_user_id: userId,
      organization_id: organizationId
    }));

    const { error: mentionError } = await supabase
      .from('job_note_mentions')
      .insert(mentionInserts);

    if (mentionError) {
      console.error('Error creating mentions:', mentionError);
    }
  }

  return note;
};

/**
 * Toggle pin status on a note
 */
export const toggleNotePin = async (noteId: string): Promise<boolean> => {
  const { data: note } = await supabase
    .from('job_notes')
    .select('is_pinned')
    .eq('id', noteId)
    .single();

  const newPinState = !note?.is_pinned;

  const { error } = await supabase
    .from('job_notes')
    .update({ is_pinned: newPinState })
    .eq('id', noteId);

  if (error) throw error;
  return newPinState;
};

/**
 * Delete a note (soft delete)
 */
export const deleteJobNote = async (noteId: string): Promise<void> => {
  const { error } = await supabase
    .from('job_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', noteId);

  if (error) throw error;
};

/**
 * Edit a note's content
 */
export const editJobNote = async (noteId: string, content: string): Promise<JobNote> => {
  const { data, error } = await supabase
    .from('job_notes')
    .update({
      content,
      edited_at: new Date().toISOString()
    })
    .eq('id', noteId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =====================================================
// JOB NOTE MENTIONS FUNCTIONS
// =====================================================

/**
 * Mark a mention as read
 */
export const markMentionRead = async (mentionId: string): Promise<void> => {
  const { error } = await supabase
    .from('job_note_mentions')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', mentionId);

  if (error) throw error;
};

/**
 * Mark all mentions for a user on a job as read
 */
export const markJobMentionsRead = async (jobId: string, userId: string): Promise<void> => {
  // Get note IDs for this job
  const { data: notes } = await supabase
    .from('job_notes')
    .select('id')
    .eq('job_id', jobId);

  if (!notes?.length) return;

  const noteIds = notes.map(n => n.id);

  const { error } = await supabase
    .from('job_note_mentions')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('mentioned_user_id', userId)
    .eq('is_read', false)
    .in('note_id', noteIds);

  if (error) throw error;
};

/**
 * Get unread mention count for a user
 */
export const getUnreadMentionCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('job_note_mentions')
    .select('*', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

/**
 * Get unread mentions for a user (for notifications)
 */
export const getUnreadMentions = async (userId: string): Promise<JobNoteMention[]> => {
  const { data, error } = await supabase
    .from('job_note_mentions')
    .select(`
      *,
      note:job_notes(
        id,
        job_id,
        content,
        created_at,
        author:users!job_notes_created_by_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('mentioned_user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// =====================================================
// JOB ACCESS FUNCTIONS
// =====================================================

/**
 * Get users with access to a job (for @mention dropdown)
 */
export const getJobAccessUsers = async (jobId: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('job_access')
    .select(`
      user:users(id, full_name, avatar_url, title, email)
    `)
    .eq('job_id', jobId)
    .eq('is_active', true);

  if (error) throw error;

  // Extract users from the join
  return (data || []).map((d: { user: User }) => d.user).filter(Boolean);
};

/**
 * Add user access to a job
 */
export const addJobAccess = async (
  jobId: string,
  userId: string,
  organizationId: string,
  accessLevel: JobAccessLevel = 'view',
  reason?: string
): Promise<JobAccess> => {
  const currentUser = await getCurrentUser();

  const { data, error } = await supabase
    .from('job_access')
    .upsert({
      job_id: jobId,
      user_id: userId,
      organization_id: organizationId,
      access_level: accessLevel,
      assigned_by: currentUser?.id,
      assigned_reason: reason,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Remove user access from a job
 */
export const removeJobAccess = async (jobId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('job_access')
    .update({ is_active: false })
    .eq('job_id', jobId)
    .eq('user_id', userId);

  if (error) throw error;
};

/**
 * Check if user has access to a job
 */
export const checkJobAccess = async (
  jobId: string,
  userId: string,
  requiredLevel?: JobAccessLevel
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('job_access')
    .select('access_level')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) return false;

  if (!requiredLevel) return true;

  // Access level hierarchy
  const levelHierarchy: JobAccessLevel[] = ['view', 'comment', 'edit', 'manage', 'owner'];
  const userLevelIndex = levelHierarchy.indexOf(data.access_level as JobAccessLevel);
  const requiredLevelIndex = levelHierarchy.indexOf(requiredLevel);

  return userLevelIndex >= requiredLevelIndex;
};

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

/**
 * Subscribe to job notes changes
 */
export const subscribeToJobNotes = (
  jobId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`job-notes-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'job_notes',
        filter: `job_id=eq.${jobId}`
      },
      callback
    )
    .subscribe();
};

/**
 * Subscribe to user's mentions
 */
export const subscribeToMentions = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`user-mentions-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'job_note_mentions',
        filter: `mentioned_user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export default supabase;
