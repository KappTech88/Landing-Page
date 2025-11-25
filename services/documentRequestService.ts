// =====================================================
// Document Request Service
// Handles public document request submissions (no auth required)
// =====================================================

import { supabase } from '../lib/supabase';

export interface DocumentRequestData {
  contactName: string;
  email: string;
  phone: string;
  companyName: string;
  documentType: 'simple' | 'digital-forum';
  documentTitle: string;
  documentDescription: string;
  specificRequirements: string;
  useCase: string;
  additionalNotes: string;
}

export interface DocumentRequestSubmission {
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
  document_type: 'simple' | 'digital-forum';
  document_title: string;
  document_description: string;
  specific_requirements: string;
  use_case: string;
  additional_notes: string;
  ai_response?: string;
  ai_model?: string;
  pricing_tier?: string;
  sample_documents?: any[];
  submission_ip?: string;
  user_agent?: string;
}

/**
 * Upload a file to Supabase Storage (public bucket, no auth required)
 */
export const uploadDocumentFile = async (
  file: File,
  requestId?: string
): Promise<{ path: string; url: string }> => {
  try {
    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;

    // Use requestId if available, otherwise use 'pending'
    const folder = requestId || 'pending';
    const storagePath = `${folder}/${fileName}`;

    // Upload to 'document-requests' bucket (public bucket)
    const { data, error } = await supabase.storage
      .from('document-requests')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('File upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('document-requests')
      .getPublicUrl(storagePath);

    return {
      path: storagePath,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
};

/**
 * Submit a document request (no authentication required)
 */
export const submitDocumentRequest = async (
  requestData: DocumentRequestData,
  aiResponse?: string,
  uploadedFiles?: Array<{
    file_name: string;
    original_file_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
    public_url: string;
  }>
): Promise<{ id: string; success: boolean }> => {
  try {
    // Get pricing tier
    const pricingTier = requestData.documentType === 'simple' ? '$50' : '$100';

    // Get user agent and IP (best effort)
    const userAgent = navigator.userAgent;

    // Prepare submission data
    const submission: DocumentRequestSubmission = {
      contact_name: requestData.contactName,
      email: requestData.email,
      phone: requestData.phone,
      company_name: requestData.companyName,
      document_type: requestData.documentType,
      document_title: requestData.documentTitle,
      document_description: requestData.documentDescription,
      specific_requirements: requestData.specificRequirements,
      use_case: requestData.useCase,
      additional_notes: requestData.additionalNotes,
      pricing_tier: pricingTier,
      ai_response: aiResponse,
      ai_model: 'gemini-2.5-flash',
      user_agent: userAgent,
      sample_documents: uploadedFiles || [],
    };

    // Insert into database (no auth required due to RLS policy)
    const { data, error } = await supabase
      .from('document_requests')
      .insert(submission)
      .select('id')
      .single();

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    return {
      id: data.id,
      success: true,
    };
  } catch (error) {
    console.error('Error submitting document request:', error);
    throw new Error('Failed to submit document request');
  }
};

/**
 * Get a document request by ID (public access)
 */
export const getDocumentRequest = async (requestId: string) => {
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('Error fetching document request:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting document request:', error);
    throw new Error('Failed to fetch document request');
  }
};

/**
 * Get document requests by email (for users to view their submissions)
 */
export const getDocumentRequestsByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching document requests:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting document requests:', error);
    throw new Error('Failed to fetch document requests');
  }
};

/**
 * Update document request status (admin only)
 */
export const updateDocumentRequestStatus = async (
  requestId: string,
  status: 'pending' | 'processing' | 'completed' | 'archived'
) => {
  try {
    const { data, error } = await supabase
      .from('document_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'completed' && { processed_at: new Date().toISOString() }),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating document request:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating document request status:', error);
    throw new Error('Failed to update document request status');
  }
};
