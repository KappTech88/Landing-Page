// =====================================================
// Database-aligned TypeScript Types
// Auto-generated from Supabase schema
// =====================================================

// ============= ENUMS =============

export enum AppView {
  LANDING = 'LANDING',
  SERVICES = 'SERVICES',
  DENIAL_APPEAL = 'DENIAL_APPEAL',
  XACTIMATE_ESTIMATE = 'XACTIMATE_ESTIMATE',
  SUPPLEMENT_CLAIM = 'SUPPLEMENT_CLAIM',
  COMMERCIAL_BID = 'COMMERCIAL_BID',
  CUSTOMIZED_DOCS = 'CUSTOMIZED_DOCS',
  CLAIMS = 'CLAIMS',
  LABS = 'LABS',
  PORTAL = 'PORTAL',
  REGISTER = 'REGISTER',
  CRM = 'CRM',
}

// ============= CRM ENUMS =============

export type CRMView =
  | 'dashboard'
  | 'contacts'
  | 'jobs'
  | 'calendar'
  | 'inbox'
  | 'tasks'
  | 'workflows'
  | 'reports'
  | 'settings';

export type ContactType = 'lead' | 'customer' | 'vendor' | 'adjuster' | 'insurance_company';
export type ContactStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiating' | 'won' | 'lost';
export type TaskPriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type WorkflowTrigger = 'claim_created' | 'status_changed' | 'task_completed' | 'email_received' | 'appointment_scheduled' | 'payment_received';
export type WorkflowAction = 'send_email' | 'create_task' | 'update_status' | 'send_sms' | 'add_note' | 'assign_user' | 'create_calendar_event';

// ============= CRM INTERFACES =============

export interface CRMContact {
  id: string;
  organization_id: string;
  contact_type: ContactType;
  status: ContactStatus;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  phone_alt?: string;
  company?: string;
  job_title?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  source?: string;
  assigned_to?: string;
  tags?: string[];
  notes?: string;
  last_contacted?: string;
  total_value?: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMJob {
  id: string;
  organization_id: string;
  contact_id: string;
  claim_id?: string;
  job_number: string;
  title: string;
  description?: string;
  status: ClaimStatus;
  priority: ClaimPriority;
  job_type: ClaimType;
  estimated_value?: number;
  actual_value?: number;
  start_date?: string;
  end_date?: string;
  assigned_to?: string;
  property_address: string;
  city: string;
  state: string;
  zip_code: string;
  insurance_company?: string;
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;
  policy_number?: string;
  date_of_loss?: string;
  tags?: string[];
  photos_count?: number;
  notes_count?: number;
  tasks_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CRMTask {
  id: string;
  organization_id: string;
  job_id?: string;
  contact_id?: string;
  assigned_to?: string;
  created_by: string;
  title: string;
  description?: string;
  priority: TaskPriorityLevel;
  status: TaskStatus;
  due_date?: string;
  due_time?: string;
  completed_at?: string;
  reminder_at?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface CRMCalendarEvent {
  id: string;
  organization_id: string;
  job_id?: string;
  contact_id?: string;
  google_event_id?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color?: string;
  event_type: 'appointment' | 'inspection' | 'follow_up' | 'meeting' | 'deadline' | 'other';
  attendees?: { email: string; name?: string; status?: string }[];
  reminder_minutes?: number;
  is_synced: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CRMEmail {
  id: string;
  organization_id: string;
  gmail_message_id?: string;
  gmail_thread_id?: string;
  contact_id?: string;
  job_id?: string;
  from_email: string;
  from_name?: string;
  to_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  snippet?: string;
  is_read: boolean;
  is_starred: boolean;
  is_sent: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  attachments?: { name: string; size: number; mime_type: string; url?: string }[];
  labels?: string[];
  received_at: string;
  sent_at?: string;
  created_at: string;
}

export interface CRMWorkflow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  trigger: WorkflowTrigger;
  trigger_conditions?: Record<string, any>;
  actions: CRMWorkflowAction[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CRMWorkflowAction {
  id: string;
  action_type: WorkflowAction;
  action_config: Record<string, any>;
  delay_minutes?: number;
  order: number;
}

export interface CRMNote {
  id: string;
  organization_id: string;
  job_id?: string;
  contact_id?: string;
  created_by: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMDashboardMetrics {
  total_leads: number;
  new_leads_this_week: number;
  total_jobs: number;
  active_jobs: number;
  jobs_by_status: Record<string, number>;
  total_revenue: number;
  revenue_this_month: number;
  pending_tasks: number;
  overdue_tasks: number;
  upcoming_appointments: number;
  unread_emails: number;
  conversion_rate: number;
  avg_job_value: number;
}

export interface GoogleWorkspaceCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope: string;
  email: string;
}

export type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled' | 'trial';

export type ClaimStatus =
  | 'open'
  | 'assigned'
  | 'assessment_scheduled'
  | 'assessment_complete'
  | 'estimate_in_progress'
  | 'estimate_submitted'
  | 'approved'
  | 'work_in_progress'
  | 'work_complete'
  | 'final_inspection'
  | 'closed'
  | 'cancelled'
  | 'denied';

export type ClaimType = 'windstorm' | 'hail' | 'water' | 'fire' | 'mold' | 'storm_damage';
export type ClaimSeverity = 'minor' | 'moderate' | 'severe' | 'catastrophic';
export type ClaimPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PropertyType = 'residential' | 'commercial' | 'multi_family' | 'industrial';

export type EstimateType = 'initial' | 'supplement' | 'revision' | 'final' | 'change_order';
export type EstimateStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type PhotoCategory =
  | 'damage'
  | 'pre_existing'
  | 'repair_progress'
  | 'completion'
  | 'before'
  | 'after'
  | 'insurance_doc'
  | 'estimate_doc'
  | 'invoice'
  | 'other';

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'partial_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'void';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';
export type PaymentMethod = 'check' | 'credit_card' | 'debit_card' | 'ach' | 'wire' | 'cash' | 'money_order' | 'other';

// ============= DATABASE TABLES =============

export interface Organization {
  id: string;
  name: string;
  slug: string;
  business_type: string;
  company_size?: string;
  email: string;
  phone?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;
  subscription_starts_at: string;
  settings?: {
    branding?: {
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
    };
    features?: {
      ai_tools_enabled?: boolean;
      multi_user_enabled?: boolean;
      api_access_enabled?: boolean;
    };
    notifications?: {
      email_enabled?: boolean;
      sms_enabled?: boolean;
    };
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  phone_verified: boolean;
  avatar_url?: string;
  title?: string;
  bio?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    display?: {
      theme?: 'light' | 'dark';
      language?: string;
    };
  };
  is_active: boolean;
  is_email_verified: boolean;
  last_login_at?: string;
  google_workspace_email?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Role {
  id: string;
  organization_id?: string;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  is_custom_role: boolean;
  permissions: {
    claims?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    estimates?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    invoices?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    users?: { create?: boolean; read?: boolean; update?: boolean; delete?: boolean };
    reports?: { read?: boolean; export?: boolean };
    settings?: { read?: boolean; update?: boolean };
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Claim {
  id: string;
  organization_id: string;
  claim_number: string;
  internal_reference?: string;
  created_by: string;
  assigned_contractor_id?: string;
  assigned_estimator_id?: string;
  client_user_id?: string;
  claim_type: ClaimType;
  severity: ClaimSeverity;
  priority: ClaimPriority;
  status: ClaimStatus;
  date_of_loss: string;
  date_reported: string;
  date_assigned?: string;
  estimated_total?: number;
  approved_amount?: number;
  supplement_amount?: number;
  final_amount?: number;
  deductible?: number;
  description?: string;
  damage_description?: string;
  scope_of_work?: string;
  internal_notes?: string;
  client_notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Property {
  id: string;
  claim_id: string;
  organization_id: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_full_name?: string;
  owner_email?: string;
  owner_phone?: string;
  owner_phone_alt?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  property_type: PropertyType;
  property_subtype?: string;
  year_built?: number;
  square_footage?: number;
  stories?: number;
  bedrooms?: number;
  bathrooms?: number;
  garage_spaces?: number;
  roof_type?: string;
  roof_age?: number;
  siding_type?: string;
  foundation_type?: string;
  hvac_type?: string;
  features?: {
    pool?: boolean;
    fence?: boolean;
    deck?: boolean;
    patio?: boolean;
    detached_structures?: string[];
  };
  access_notes?: string;
  insurance_company?: string;
  policy_number?: string;
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Estimate {
  id: string;
  claim_id: string;
  organization_id: string;
  estimate_number: string;
  estimate_name?: string;
  estimate_type: EstimateType;
  version: number;
  parent_estimate_id?: string;
  is_latest_version: boolean;
  created_by: string;
  estimator_id?: string;
  reviewed_by?: string;
  status: EstimateStatus;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  overhead_percentage: number;
  overhead_amount: number;
  profit_percentage: number;
  profit_amount: number;
  total_amount: number;
  rcv_total?: number;
  acv_total?: number;
  depreciation_amount?: number;
  scope_of_work?: string;
  notes?: string;
  terms_and_conditions?: string;
  xactimate_estimate_id?: string;
  xactimate_exported: boolean;
  xactimate_data?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Photo {
  id: string;
  claim_id: string;
  organization_id: string;
  file_name: string;
  original_file_name?: string;
  file_extension?: string;
  storage_bucket: string;
  storage_path: string;
  public_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  category: PhotoCategory;
  subcategory?: string;
  photo_type: string;
  room_location?: string;
  description?: string;
  damage_type?: string;
  tags?: string[];
  is_featured: boolean;
  display_order: number;
  estimate_id?: string;
  captured_by?: string;
  captured_at: string;
  uploaded_by: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
  exif_data?: Record<string, any>;
  is_public: boolean;
  is_approved: boolean;
  requires_review: boolean;
  is_processed: boolean;
  processing_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============= FORM DATA INTERFACES =============

export interface ClaimSubmissionFormData {
  // Property Owner Info
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  owner_phone: string;
  owner_phone_alt?: string;

  // Property Address
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;

  // Property Details
  property_type: PropertyType;
  square_footage?: number;
  year_built?: number;

  // Claim Information
  claim_type: ClaimType;
  date_of_loss: string;
  damage_description: string;

  // Insurance Information (optional)
  insurance_company?: string;
  policy_number?: string;
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;

  // Contractor/Submitter Info
  contractor_name?: string;
  contractor_company?: string;
  contractor_email?: string;
  contractor_phone?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  organization_name?: string;
}

// ============= API RESPONSE TYPES =============

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ClaimWithProperty extends Claim {
  property?: Property;
}

export interface ClaimWithDetails extends Claim {
  property?: Property;
  estimates?: Estimate[];
  photos?: Photo[];
  organization?: Organization;
  assigned_contractor?: User;
  assigned_estimator?: User;
}

// ============= SUPABASE SPECIFIC =============

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    app_metadata: Record<string, any>;
    user_metadata: Record<string, any>;
  };
}

export interface SupabaseError {
  message: string;
  status: number;
}

// ============= UI COMPONENT PROPS =============

export interface NavItem {
  id: AppView;
  label: string;
  icon: React.ReactNode;
}

// Augment window for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
