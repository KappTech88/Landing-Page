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
  // Estimate Builder
  ESTIMATE_BUILDER = 'ESTIMATE_BUILDER',
  // CRM Dashboard Views
  DASHBOARD = 'DASHBOARD',
  DASHBOARD_HOME = 'DASHBOARD_HOME',
  DASHBOARD_CONTACTS = 'DASHBOARD_CONTACTS',
  DASHBOARD_JOBS = 'DASHBOARD_JOBS',
  DASHBOARD_JOB_DETAIL = 'DASHBOARD_JOB_DETAIL',
  DASHBOARD_ESTIMATES = 'DASHBOARD_ESTIMATES',
  DASHBOARD_CALENDAR = 'DASHBOARD_CALENDAR',
  DASHBOARD_INBOX = 'DASHBOARD_INBOX',
  DASHBOARD_TASKS = 'DASHBOARD_TASKS',
  DASHBOARD_WORKFLOWS = 'DASHBOARD_WORKFLOWS',
  DASHBOARD_REPORTS = 'DASHBOARD_REPORTS',
  DASHBOARD_SETTINGS = 'DASHBOARD_SETTINGS',
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

// ============= PRODUCTION & PRICING TYPES =============

export type UnitOfMeasure = 'SF' | 'SQ' | 'SY' | 'LF' | 'EA' | 'HR' | 'DA' | 'WK' | 'MO' | 'BDL' | 'ROL' | 'PC' | 'GAL' | 'CF' | 'CY' | 'TON' | 'LS';
export type PriceSource = 'manual' | 'xactimate_import' | 'supplier' | 'calculated';
export type QuantityType = 'fixed' | 'calculated' | 'per_square';
export type MeasurementService = 'eagleview' | 'hover' | 'gaf_quickmeasure';

export interface XactimateCategory {
  id: string;
  organization_id: string;
  category_code: string;
  category_name: string;
  description?: string;
  parent_category_id?: string;
  sort_order: number;
  icon?: string;
  color_code?: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface XactimateLineItem {
  id: string;
  organization_id: string;
  item_code: string;
  selector_code?: string;
  category_id?: string;
  description: string;
  short_description?: string;
  notes?: string;
  unit: UnitOfMeasure;
  unit_description?: string;
  unit_price: number;
  material_price: number;
  labor_price: number;
  equipment_price: number;
  labor_hours: number;
  labor_rate?: number;
  labor_minimum?: number;
  coverage_per_unit?: number;
  waste_factor: number;
  useful_life_years?: number;
  depreciation_type?: string;
  default_depreciation_percent?: number;
  price_source: PriceSource;
  price_list_region?: string;
  price_effective_date?: string;
  price_expiration_date?: string;
  trade_type?: string;
  work_type?: string;
  tags?: string[];
  is_active: boolean;
  is_taxable: boolean;
  is_o_and_p_eligible: boolean;
  preferred_supplier_id?: string;
  preferred_subcontractor_id?: string;
  custom_fields?: Record<string, any>;
  xactimate_data?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Relations
  category?: XactimateCategory;
}

export interface MacroRequiredInput {
  name: string;
  label: string;
  unit: UnitOfMeasure;
  type: 'number' | 'text' | 'select';
  options?: string[];
  default_value?: number;
}

export interface PricingMacro {
  id: string;
  organization_id: string;
  macro_code: string;
  macro_name: string;
  description?: string;
  category?: string;
  trade_type?: string;
  required_inputs: MacroRequiredInput[];
  measurement_service_mapping?: Record<string, string>;
  base_price: number;
  calculated_material_total: number;
  calculated_labor_total: number;
  calculated_total: number;
  markup_type: 'percentage' | 'flat';
  markup_value: number;
  is_active: boolean;
  is_template: boolean;
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  // Relations
  items?: PricingMacroItem[];
}

export interface PricingMacroItem {
  id: string;
  macro_id: string;
  organization_id: string;
  xactimate_item_id?: string;
  item_code: string;
  description: string;
  unit: UnitOfMeasure;
  quantity_type: QuantityType;
  fixed_quantity: number;
  quantity_formula?: string;
  input_field_name?: string;
  quantity_multiplier: number;
  waste_factor_override?: number;
  price_override?: number;
  material_override?: number;
  labor_override?: number;
  sort_order: number;
  is_included: boolean;
  is_optional: boolean;
  group_name?: string;
  created_at: string;
  updated_at: string;
  // Relations
  xactimate_item?: XactimateLineItem;
}

export interface WorkOrderPricing {
  id: string;
  organization_id: string;
  item_code: string;
  item_name: string;
  description?: string;
  category: string;
  subcategory?: string;
  trade_type?: string;
  unit: UnitOfMeasure;
  unit_price: number;
  material_cost: number;
  labor_cost: number;
  labor_hours?: number;
  pricing_type: 'flat' | 'per_unit' | 'range';
  min_price?: number;
  max_price?: number;
  preferred_supplier_id?: string;
  preferred_subcontractor_id?: string;
  is_active: boolean;
  is_taxable: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface VendorLaborRate {
  id: string;
  organization_id: string;
  crew_id: string;
  rate_name: string;
  trade_type: string;
  work_type?: string;
  rate_type: 'per_square' | 'per_linear_foot' | 'hourly' | 'per_job' | 'per_unit';
  rate_amount: number;
  minimum_charge?: number;
  overtime_rate?: number;
  weekend_rate?: number;
  includes_materials: boolean;
  includes_dump_fees: boolean;
  includes_permits: boolean;
  scope_notes?: string;
  is_active: boolean;
  effective_date: string;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface VendorMaterialPricing {
  id: string;
  organization_id: string;
  supplier_id: string;
  product_code: string;
  product_name: string;
  manufacturer?: string;
  product_line?: string;
  color?: string;
  category: string;
  subcategory?: string;
  unit: UnitOfMeasure;
  unit_price: number;
  tier1_quantity?: number;
  tier1_price?: number;
  tier2_quantity?: number;
  tier2_price?: number;
  tier3_quantity?: number;
  tier3_price?: number;
  xactimate_item_id?: string;
  is_active: boolean;
  in_stock: boolean;
  lead_time_days?: number;
  price_effective_date: string;
  price_expiration_date?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface MeasurementImport {
  id: string;
  organization_id: string;
  job_id?: string;
  service_name: MeasurementService;
  report_id?: string;
  report_date?: string;
  property_address?: string;
  total_squares?: number;
  total_area_sf?: number;
  predominant_pitch?: string;
  ridge_length_lf?: number;
  hip_length_lf?: number;
  valley_length_lf?: number;
  eave_length_lf?: number;
  rake_length_lf?: number;
  step_flashing_lf?: number;
  headwall_flashing_lf?: number;
  pipe_boot_count: number;
  chimney_count: number;
  skylight_count: number;
  vent_count: number;
  suggested_waste_percent?: number;
  facets_data?: any[];
  raw_import_data?: Record<string, any>;
  import_status: 'pending' | 'processing' | 'complete' | 'failed';
  processed_at?: string;
  error_message?: string;
  imported_by?: string;
  created_at: string;
  updated_at: string;
}

// Supplier type (from 007-materials.sql - for reference)
export interface Supplier {
  id: string;
  organization_id: string;
  supplier_name: string;
  supplier_code?: string;
  supplier_type: 'distributor' | 'manufacturer' | 'retailer';
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  main_phone?: string;
  fax?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  account_number?: string;
  credit_limit?: number;
  payment_terms?: string;
  tax_exempt: boolean;
  tax_exempt_number?: string;
  product_categories?: string[];
  brands_carried?: string[];
  offers_delivery: boolean;
  delivery_fee?: number;
  free_delivery_minimum?: number;
  typical_lead_time_days: number;
  price_rating?: number;
  service_rating?: number;
  delivery_rating?: number;
  is_preferred: boolean;
  is_active: boolean;
  notes?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Crew type (from 006-production.sql - for subcontractors)
export interface Crew {
  id: string;
  organization_id: string;
  crew_name: string;
  crew_code?: string;
  crew_type: 'internal' | 'subcontractor';
  trade: string;
  crew_lead_id?: string;
  crew_lead_name?: string;
  crew_lead_phone?: string;
  crew_lead_email?: string;
  crew_size: number;
  daily_capacity_squares?: number;
  is_subcontractor: boolean;
  company_name?: string;
  tax_id?: string;
  insurance_policy?: string;
  insurance_expiration?: string;
  workers_comp_policy?: string;
  workers_comp_expiration?: string;
  pay_type: 'hourly' | 'per_square' | 'per_job';
  hourly_rate?: number;
  per_square_rate?: number;
  quality_rating: number;
  reliability_rating: number;
  total_jobs_completed: number;
  is_active: boolean;
  availability_status: 'available' | 'busy' | 'on_leave';
  color_code: string;
  notes?: string;
  certifications?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Settings view types
export type SettingsSection =
  | 'general'
  | 'production-pricing'
  | 'users'
  | 'roles'
  | 'notifications'
  | 'integrations';

export type ProductionPricingCategory =
  | 'vendors'
  | 'work-order-pricing'
  | 'xactimate-pricing'
  | 'macros';

export type VendorSubCategory =
  | 'subcontractors'
  | 'suppliers';

// Augment window for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
