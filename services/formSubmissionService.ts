// =====================================================
// Form Submission Service
// Handles saving form submissions to database (no auth required)
// =====================================================

import { supabase } from '../lib/supabase';

// Generic form submission data
export interface FormSubmissionData {
  form_type: 'denial_appeal' | 'xactimate_estimate' | 'supplement_claim' | 'commercial_bid' | 'claim_submission';
  contact_name: string;
  email: string;
  phone?: string;
  form_data: Record<string, any>;
  ai_response?: string;
  ai_error?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Submit a form to the database (no authentication required)
 * This saves the submission regardless of AI processing status
 */
export const submitFormData = async (
  data: FormSubmissionData
): Promise<{ id: string; success: boolean }> => {
  try {
    const submission = {
      ...data,
      user_agent: navigator.userAgent,
      status: data.status || 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('form_submissions')
      .insert(submission)
      .select('id')
      .single();

    if (error) {
      // Table might not exist yet - log but don't fail
      console.warn('Could not save to form_submissions:', error.message);
      // Try the notification queue as fallback
      return await queueFormSubmission(data);
    }

    return {
      id: result.id,
      success: true,
    };
  } catch (error) {
    console.error('Error submitting form:', error);
    // Try notification queue as ultimate fallback
    return await queueFormSubmission(data);
  }
};

/**
 * Queue a form submission in the notification queue
 * This is a fallback when form_submissions table doesn't exist
 */
const queueFormSubmission = async (
  data: FormSubmissionData
): Promise<{ id: string; success: boolean }> => {
  try {
    const notification = {
      notification_type: 'form_submission',
      recipient_email: 'admin@estimatereliance.com', // Or get from env
      subject: `New ${data.form_type.replace('_', ' ')} submission from ${data.contact_name}`,
      body_html: `
        <h2>New Form Submission</h2>
        <p><strong>Type:</strong> ${data.form_type}</p>
        <p><strong>Name:</strong> ${data.contact_name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Data:</strong></p>
        <pre>${JSON.stringify(data.form_data, null, 2)}</pre>
        ${data.ai_error ? `<p><strong>AI Error:</strong> ${data.ai_error}</p>` : ''}
      `,
      body_text: JSON.stringify(data),
      metadata: data,
      status: 'pending',
    };

    const { data: result, error } = await supabase
      .from('notification_queue')
      .insert(notification)
      .select('id')
      .single();

    if (error) {
      console.error('Notification queue error:', error);
      // Return a generated ID so the UI can still show success
      return {
        id: `local-${Date.now()}`,
        success: false,
      };
    }

    return {
      id: result.id,
      success: true,
    };
  } catch (error) {
    console.error('Queue submission failed:', error);
    return {
      id: `local-${Date.now()}`,
      success: false,
    };
  }
};

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(
    url &&
    key &&
    url !== 'https://your-project.supabase.co' &&
    key !== 'your-anon-key-here'
  );
};
