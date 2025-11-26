-- =====================================================
-- 003.5-jobs.sql
-- Production Jobs & Work Order Management
-- Roofing Industry Production-Focused Schema
-- Inspired by AccuLynx & JobNimbus Best Practices
-- =====================================================

-- =====================================================
-- JOBS TABLE (Core Production Entity)
-- =====================================================
-- Central production tracking entity - created when estimate is approved
-- Links claims/estimates to actual production work

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

    -- Job Identification
    job_number VARCHAR(50) UNIQUE NOT NULL, -- JOB-2024-0001, ORG-JOB-001
    job_name VARCHAR(255) NOT NULL, -- "Smith Residence Roof Replacement"
    job_type VARCHAR(50) NOT NULL DEFAULT 'roofing', -- roofing, siding, gutters, windows, full_exterior

    -- Job Classification
    job_category VARCHAR(50) DEFAULT 'residential_retail', -- residential_retail, residential_insurance, commercial, multi_family
    trade_type VARCHAR(50) DEFAULT 'roofing', -- roofing, siding, gutters, windows, painting, general
    project_size VARCHAR(30) DEFAULT 'standard', -- small, standard, large, enterprise

    -- Property Reference (denormalized for quick access)
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    property_address TEXT, -- Cached for display

    -- Customer Information
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_phone_alt VARCHAR(20),

    -- Job Ownership & Assignment
    created_by UUID NOT NULL REFERENCES users(id),
    project_manager_id UUID REFERENCES users(id), -- Primary PM responsible
    sales_rep_id UUID REFERENCES users(id), -- Original salesperson
    production_manager_id UUID REFERENCES users(id), -- Production oversight

    -- Workflow & Status
    workflow_id UUID, -- References job_workflows.id (FK added after table creation)
    current_stage_id UUID, -- References job_workflow_stages.id
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- Status: pending, scheduled, in_progress, on_hold, completed, cancelled

    substatus VARCHAR(50), -- Custom substatus within main status
    board_position INTEGER DEFAULT 0, -- Position on production board

    -- Priority & Flags
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent, emergency
    is_rush BOOLEAN DEFAULT false,
    is_warranty_work BOOLEAN DEFAULT false,
    is_insurance_job BOOLEAN DEFAULT false,
    requires_permit BOOLEAN DEFAULT false,
    permit_status VARCHAR(30), -- not_required, pending, approved, issued, final_inspection, closed

    -- Financial Summary (from estimate, updated during production)
    contract_amount DECIMAL(12, 2), -- Agreed contract price
    estimated_cost DECIMAL(12, 2), -- Estimated job cost
    actual_cost DECIMAL(12, 2) DEFAULT 0.00, -- Running actual cost
    profit_margin DECIMAL(5, 2), -- Calculated profit margin %

    -- Material Costs
    material_budget DECIMAL(12, 2),
    material_actual DECIMAL(12, 2) DEFAULT 0.00,

    -- Labor Costs
    labor_budget DECIMAL(12, 2),
    labor_actual DECIMAL(12, 2) DEFAULT 0.00,
    labor_hours_estimated DECIMAL(8, 2),
    labor_hours_actual DECIMAL(8, 2) DEFAULT 0.00,

    -- Important Dates
    date_sold DATE, -- When contract was signed
    date_approved DATE, -- When job was approved to start
    date_scheduled DATE, -- Originally scheduled start
    date_started DATE, -- Actual start date
    date_target_completion DATE, -- Target completion
    date_completed DATE, -- Actual completion
    date_final_walkthrough DATE,
    date_warranty_expires DATE,

    -- Production Timing
    estimated_duration_days INTEGER, -- Estimated work days
    actual_duration_days INTEGER, -- Actual work days
    weather_delay_days INTEGER DEFAULT 0,

    -- Roofing Specific Fields
    roof_squares DECIMAL(8, 2), -- Total squares (100 sq ft each)
    roof_pitch VARCHAR(20), -- 4/12, 6/12, 8/12, steep, flat
    roof_layers INTEGER DEFAULT 1, -- Layers to remove
    roof_type VARCHAR(50), -- asphalt_shingle, metal, tile, flat_tpo, flat_epdm, slate, cedar
    shingle_brand VARCHAR(100),
    shingle_color VARCHAR(100),
    shingle_line VARCHAR(100), -- Duration, Landmark, etc.

    -- Insurance Job Fields
    insurance_claim_number VARCHAR(100),
    insurance_company VARCHAR(255),
    adjuster_name VARCHAR(100),
    adjuster_phone VARCHAR(20),
    adjuster_email VARCHAR(255),
    deductible_amount DECIMAL(10, 2),
    deductible_collected BOOLEAN DEFAULT false,
    supplement_filed BOOLEAN DEFAULT false,
    supplement_approved BOOLEAN DEFAULT false,

    -- Production Notes
    scope_of_work TEXT, -- Detailed scope
    production_notes TEXT, -- Internal production notes
    site_access_notes TEXT, -- Access instructions, gate codes
    special_instructions TEXT, -- Special requirements
    customer_notes TEXT, -- Notes visible to customer

    -- Quality & Warranty
    quality_score DECIMAL(3, 2), -- 0.00 to 5.00 rating
    warranty_type VARCHAR(50), -- standard, extended, lifetime
    warranty_years INTEGER,
    manufacturer_warranty_registered BOOLEAN DEFAULT false,

    -- Completion
    completion_percentage INTEGER DEFAULT 0, -- 0-100%
    final_inspection_passed BOOLEAN,
    customer_signed_off BOOLEAN DEFAULT false,

    -- Metadata & Tracking
    metadata JSONB DEFAULT '{
        "tags": [],
        "custom_fields": {},
        "milestones_completed": [],
        "checklist_progress": {},
        "weather_conditions": {},
        "equipment_used": []
    }'::jsonb,

    -- Source Tracking
    lead_source VARCHAR(100), -- referral, website, door_knock, storm_chaser, repeat_customer
    referral_source VARCHAR(255),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_job_status CHECK (status IN (
        'pending', 'approved', 'scheduled', 'materials_ordered',
        'in_progress', 'on_hold', 'punch_list', 'completed',
        'cancelled', 'warranty_service'
    )),
    CONSTRAINT valid_job_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),
    CONSTRAINT valid_permit_status CHECK (permit_status IS NULL OR permit_status IN (
        'not_required', 'pending', 'submitted', 'approved', 'issued',
        'inspection_scheduled', 'inspection_passed', 'inspection_failed', 'closed'
    ))
);

-- Indexes for jobs
CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX idx_jobs_claim_id ON jobs(claim_id);
CREATE INDEX idx_jobs_estimate_id ON jobs(estimate_id);
CREATE INDEX idx_jobs_job_number ON jobs(job_number);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_workflow_id ON jobs(workflow_id);
CREATE INDEX idx_jobs_current_stage ON jobs(current_stage_id);
CREATE INDEX idx_jobs_project_manager ON jobs(project_manager_id);
CREATE INDEX idx_jobs_production_manager ON jobs(production_manager_id);
CREATE INDEX idx_jobs_date_scheduled ON jobs(date_scheduled);
CREATE INDEX idx_jobs_date_started ON jobs(date_started);
CREATE INDEX idx_jobs_priority_status ON jobs(priority, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_deleted_at ON jobs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_is_insurance ON jobs(is_insurance_job) WHERE is_insurance_job = true;

-- Full-text search for jobs
CREATE INDEX idx_jobs_search ON jobs USING gin(
    to_tsvector('english',
        coalesce(job_number, '') || ' ' ||
        coalesce(job_name, '') || ' ' ||
        coalesce(customer_name, '') || ' ' ||
        coalesce(property_address, '')
    )
);

CREATE TRIGGER jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB WORKFLOWS TABLE
-- =====================================================
-- Customizable workflow definitions for different job types
-- e.g., "Residential Insurance Roofing", "Commercial Flat Roof"

CREATE TABLE job_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Workflow Definition
    workflow_name VARCHAR(100) NOT NULL,
    workflow_code VARCHAR(50) NOT NULL, -- RESIDENTIAL_INSURANCE, COMMERCIAL_ROOFING
    description TEXT,

    -- Job Type Association
    job_type VARCHAR(50), -- roofing, siding, gutters, etc.
    job_category VARCHAR(50), -- residential_retail, residential_insurance, commercial

    -- Settings
    is_default BOOLEAN DEFAULT false, -- Default workflow for job type
    is_active BOOLEAN DEFAULT true,
    color_code VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI

    -- Automation Settings
    automation_settings JSONB DEFAULT '{
        "auto_advance": false,
        "notifications_enabled": true,
        "required_fields_per_stage": {}
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(organization_id, workflow_code)
);

CREATE INDEX idx_job_workflows_organization ON job_workflows(organization_id);
CREATE INDEX idx_job_workflows_job_type ON job_workflows(job_type);
CREATE INDEX idx_job_workflows_is_default ON job_workflows(is_default) WHERE is_default = true;
CREATE INDEX idx_job_workflows_deleted_at ON job_workflows(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_workflows_updated_at
    BEFORE UPDATE ON job_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB WORKFLOW STAGES TABLE
-- =====================================================
-- Individual stages within a workflow (Production Board columns)

CREATE TABLE job_workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES job_workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stage Definition
    stage_name VARCHAR(100) NOT NULL, -- "Materials Ordered", "Crew Scheduled", "In Progress"
    stage_code VARCHAR(50) NOT NULL, -- MATERIALS_ORDERED, CREW_SCHEDULED
    description TEXT,

    -- Ordering
    stage_order INTEGER NOT NULL, -- 1, 2, 3... for board column order

    -- Visual Settings
    color_code VARCHAR(7) DEFAULT '#6B7280', -- Hex color
    icon VARCHAR(50), -- Icon name for UI

    -- Stage Type
    stage_type VARCHAR(30) DEFAULT 'active', -- queue, active, review, completed, cancelled
    is_entry_stage BOOLEAN DEFAULT false, -- First stage (jobs start here)
    is_exit_stage BOOLEAN DEFAULT false, -- Final stage (jobs end here)
    is_hold_stage BOOLEAN DEFAULT false, -- On-hold stage

    -- Requirements
    required_before_advance JSONB DEFAULT '{
        "tasks": [],
        "documents": [],
        "approvals": [],
        "fields": []
    }'::jsonb,

    -- Automation
    auto_actions JSONB DEFAULT '{
        "on_enter": [],
        "on_exit": [],
        "notifications": []
    }'::jsonb,

    -- SLA Settings
    target_duration_hours INTEGER, -- Target time in this stage
    warning_threshold_hours INTEGER, -- When to show warning
    escalation_threshold_hours INTEGER, -- When to escalate

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(workflow_id, stage_code),
    UNIQUE(workflow_id, stage_order)
);

CREATE INDEX idx_workflow_stages_workflow ON job_workflow_stages(workflow_id);
CREATE INDEX idx_workflow_stages_organization ON job_workflow_stages(organization_id);
CREATE INDEX idx_workflow_stages_order ON job_workflow_stages(workflow_id, stage_order);
CREATE INDEX idx_workflow_stages_deleted_at ON job_workflow_stages(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_workflow_stages_updated_at
    BEFORE UPDATE ON job_workflow_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add FK constraints to jobs table now that workflow tables exist
ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_workflow
    FOREIGN KEY (workflow_id) REFERENCES job_workflows(id) ON DELETE SET NULL;

ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_current_stage
    FOREIGN KEY (current_stage_id) REFERENCES job_workflow_stages(id) ON DELETE SET NULL;

-- =====================================================
-- CREWS TABLE
-- =====================================================
-- Production crews/teams that perform work

CREATE TABLE crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Crew Identification
    crew_name VARCHAR(100) NOT NULL, -- "Alpha Crew", "Team Rodriguez"
    crew_code VARCHAR(30), -- ALPHA, TEAM_R

    -- Crew Type & Specialization
    crew_type VARCHAR(50) DEFAULT 'internal', -- internal, subcontractor, mixed
    trade_specialty VARCHAR(50) DEFAULT 'roofing', -- roofing, siding, gutters, general

    -- Crew Lead
    crew_lead_id UUID REFERENCES users(id), -- Primary crew leader
    crew_lead_name VARCHAR(100), -- For subcontractors without user accounts
    crew_lead_phone VARCHAR(20),
    crew_lead_email VARCHAR(255),

    -- Capacity & Capabilities
    crew_size INTEGER DEFAULT 3, -- Number of workers
    max_concurrent_jobs INTEGER DEFAULT 1,
    daily_capacity_squares DECIMAL(6, 2), -- Squares per day capacity

    -- Skills & Certifications
    certifications TEXT[], -- ['OSHA_30', 'GAF_MASTER_ELITE', 'HAAG_CERTIFIED']
    specializations TEXT[], -- ['steep_slope', 'flat_roof', 'metal', 'tile']
    equipment_owned TEXT[], -- ['boom_lift', 'dump_trailer', 'nail_guns']

    -- Subcontractor Details
    is_subcontractor BOOLEAN DEFAULT false,
    company_name VARCHAR(255), -- Subcontractor company
    tax_id VARCHAR(20), -- EIN/Tax ID
    insurance_policy_number VARCHAR(100),
    insurance_expiration_date DATE,
    workers_comp_policy_number VARCHAR(100),
    workers_comp_expiration_date DATE,

    -- Rating & Performance
    quality_rating DECIMAL(3, 2) DEFAULT 0.00, -- 0.00 to 5.00
    reliability_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_jobs_completed INTEGER DEFAULT 0,

    -- Pay Rates
    pay_type VARCHAR(30) DEFAULT 'per_square', -- hourly, per_square, per_job, salary
    hourly_rate DECIMAL(8, 2),
    per_square_rate DECIMAL(8, 2),

    -- Availability
    is_active BOOLEAN DEFAULT true,
    availability_status VARCHAR(30) DEFAULT 'available', -- available, busy, on_leave, inactive

    -- Color Coding (for calendar/board)
    color_code VARCHAR(7) DEFAULT '#10B981',

    -- Contact & Notes
    notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{
        "preferred_regions": [],
        "blackout_dates": [],
        "performance_history": []
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_crew_type CHECK (crew_type IN ('internal', 'subcontractor', 'mixed')),
    CONSTRAINT valid_pay_type CHECK (pay_type IN ('hourly', 'per_square', 'per_job', 'salary', 'hybrid'))
);

CREATE INDEX idx_crews_organization ON crews(organization_id);
CREATE INDEX idx_crews_crew_lead ON crews(crew_lead_id);
CREATE INDEX idx_crews_trade ON crews(trade_specialty);
CREATE INDEX idx_crews_is_active ON crews(is_active) WHERE is_active = true;
CREATE INDEX idx_crews_availability ON crews(availability_status);
CREATE INDEX idx_crews_is_subcontractor ON crews(is_subcontractor);
CREATE INDEX idx_crews_deleted_at ON crews(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER crews_updated_at
    BEFORE UPDATE ON crews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREW MEMBERS TABLE
-- =====================================================
-- Individual workers assigned to crews

CREATE TABLE crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Member Identity
    user_id UUID REFERENCES users(id), -- If has system account
    member_name VARCHAR(100) NOT NULL,
    member_phone VARCHAR(20),
    member_email VARCHAR(255),

    -- Role in Crew
    role VARCHAR(50) DEFAULT 'laborer', -- crew_lead, foreman, laborer, apprentice, helper
    is_crew_lead BOOLEAN DEFAULT false,

    -- Skills
    skill_level VARCHAR(30) DEFAULT 'journeyman', -- apprentice, journeyman, master
    certifications TEXT[],
    specializations TEXT[],

    -- Pay
    hourly_rate DECIMAL(8, 2),

    -- Status
    is_active BOOLEAN DEFAULT true,
    employment_type VARCHAR(30) DEFAULT 'w2', -- w2, 1099, temp

    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_member_role CHECK (role IN ('crew_lead', 'foreman', 'laborer', 'apprentice', 'helper', 'specialist'))
);

CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX idx_crew_members_organization ON crew_members(organization_id);
CREATE INDEX idx_crew_members_user ON crew_members(user_id);
CREATE INDEX idx_crew_members_active ON crew_members(is_active) WHERE is_active = true;
CREATE INDEX idx_crew_members_deleted_at ON crew_members(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER crew_members_updated_at
    BEFORE UPDATE ON crew_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB CREW ASSIGNMENTS TABLE
-- =====================================================
-- Assign crews to jobs with scheduling

CREATE TABLE job_crew_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Assignment Details
    assignment_type VARCHAR(50) DEFAULT 'primary', -- primary, secondary, support, specialty
    trade_assigned VARCHAR(50), -- roofing, gutters, siding

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME,
    scheduled_end_time TIME,
    estimated_duration_hours DECIMAL(5, 2),

    -- Actual Times
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    actual_duration_hours DECIMAL(5, 2),

    -- Status
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled, no_show

    -- Work Details
    work_description TEXT,
    areas_to_work TEXT[], -- ['Front slope', 'Back slope', 'Garage']

    -- Completion
    work_completed TEXT,
    completion_percentage INTEGER DEFAULT 0,
    squares_completed DECIMAL(6, 2),

    -- Pay Calculation
    pay_type VARCHAR(30), -- hourly, per_square, flat_rate
    agreed_rate DECIMAL(10, 2),
    total_pay DECIMAL(10, 2),

    -- Notes
    crew_notes TEXT, -- Notes for crew
    completion_notes TEXT, -- Notes on completed work

    -- Assigned By
    assigned_by UUID REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_assignment_status CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed',
        'cancelled', 'no_show', 'rescheduled', 'weather_delay'
    ))
);

CREATE INDEX idx_job_crew_assignments_job ON job_crew_assignments(job_id);
CREATE INDEX idx_job_crew_assignments_crew ON job_crew_assignments(crew_id);
CREATE INDEX idx_job_crew_assignments_organization ON job_crew_assignments(organization_id);
CREATE INDEX idx_job_crew_assignments_date ON job_crew_assignments(scheduled_date);
CREATE INDEX idx_job_crew_assignments_status ON job_crew_assignments(status);
CREATE INDEX idx_job_crew_assignments_deleted_at ON job_crew_assignments(deleted_at) WHERE deleted_at IS NULL;

-- Compound index for calendar queries
CREATE INDEX idx_job_crew_assignments_schedule ON job_crew_assignments(organization_id, scheduled_date, crew_id)
    WHERE deleted_at IS NULL;

CREATE TRIGGER job_crew_assignments_updated_at
    BEFORE UPDATE ON job_crew_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LABOR TICKETS TABLE
-- =====================================================
-- Daily labor tracking for production (AccuLynx inspired)

CREATE TABLE labor_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
    crew_assignment_id UUID REFERENCES job_crew_assignments(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Ticket Identification
    ticket_number VARCHAR(50) UNIQUE NOT NULL, -- LT-2024-001234
    ticket_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Work Period
    time_in TIMESTAMP WITH TIME ZONE,
    time_out TIMESTAMP WITH TIME ZONE,
    break_duration_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(5, 2),

    -- Workers Present
    workers_count INTEGER NOT NULL DEFAULT 1,
    worker_names TEXT[], -- List of workers on this ticket

    -- Work Performed
    work_description TEXT NOT NULL,
    areas_worked TEXT[], -- ['Front slope', 'Chimney flashing']

    -- Production Metrics (Roofing)
    squares_completed DECIMAL(6, 2),
    linear_feet_completed DECIMAL(8, 2), -- For gutters, fascia, etc.

    -- Materials Used (quick reference)
    materials_used JSONB DEFAULT '[]'::jsonb,

    -- Weather Conditions
    weather_conditions VARCHAR(50), -- sunny, cloudy, rain_delay, wind_delay
    temperature_high INTEGER,
    temperature_low INTEGER,
    weather_notes TEXT,

    -- Quality
    quality_check_passed BOOLEAN,
    quality_notes TEXT,
    photos_taken INTEGER DEFAULT 0,

    -- Labor Cost
    labor_cost DECIMAL(10, 2),

    -- Status & Approval
    status VARCHAR(30) DEFAULT 'draft', -- draft, submitted, approved, rejected, billed
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Notes
    foreman_notes TEXT,
    office_notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_ticket_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'billed', 'void'))
);

CREATE INDEX idx_labor_tickets_job ON labor_tickets(job_id);
CREATE INDEX idx_labor_tickets_crew ON labor_tickets(crew_id);
CREATE INDEX idx_labor_tickets_organization ON labor_tickets(organization_id);
CREATE INDEX idx_labor_tickets_ticket_date ON labor_tickets(ticket_date DESC);
CREATE INDEX idx_labor_tickets_status ON labor_tickets(status);
CREATE INDEX idx_labor_tickets_ticket_number ON labor_tickets(ticket_number);
CREATE INDEX idx_labor_tickets_deleted_at ON labor_tickets(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER labor_tickets_updated_at
    BEFORE UPDATE ON labor_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRODUCTION SCHEDULE TABLE
-- =====================================================
-- Calendar events for production (labor, deliveries, inspections)

CREATE TABLE production_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Identification
    event_type VARCHAR(50) NOT NULL, -- labor, material_delivery, inspection, meeting, other
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,

    -- Scheduling
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    all_day BOOLEAN DEFAULT false,

    -- Duration
    estimated_duration_hours DECIMAL(5, 2),

    -- Recurrence (for repeating events)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(30), -- daily, weekly, biweekly, monthly
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES production_schedule(id), -- For recurring instances

    -- Assignments
    crew_id UUID REFERENCES crews(id),
    assigned_to_user_id UUID REFERENCES users(id),

    -- Location
    location_type VARCHAR(30) DEFAULT 'job_site', -- job_site, office, supplier, other
    location_address TEXT,

    -- Status
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled, rescheduled

    -- Confirmation
    requires_confirmation BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES users(id),

    -- Notifications
    send_reminder BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 24,
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,

    -- Color Coding
    color_code VARCHAR(7),

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'labor', 'material_delivery', 'inspection', 'permit_inspection',
        'meeting', 'walkthrough', 'measurement', 'follow_up', 'warranty', 'other'
    )),
    CONSTRAINT valid_schedule_status CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed',
        'cancelled', 'rescheduled', 'weather_delay', 'no_show'
    ))
);

CREATE INDEX idx_production_schedule_job ON production_schedule(job_id);
CREATE INDEX idx_production_schedule_organization ON production_schedule(organization_id);
CREATE INDEX idx_production_schedule_date ON production_schedule(scheduled_date);
CREATE INDEX idx_production_schedule_event_type ON production_schedule(event_type);
CREATE INDEX idx_production_schedule_crew ON production_schedule(crew_id);
CREATE INDEX idx_production_schedule_assigned ON production_schedule(assigned_to_user_id);
CREATE INDEX idx_production_schedule_status ON production_schedule(status);
CREATE INDEX idx_production_schedule_deleted_at ON production_schedule(deleted_at) WHERE deleted_at IS NULL;

-- Calendar query index
CREATE INDEX idx_production_schedule_calendar ON production_schedule(organization_id, scheduled_date, event_type)
    WHERE deleted_at IS NULL;

CREATE TRIGGER production_schedule_updated_at
    BEFORE UPDATE ON production_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
-- Material suppliers (ABC Supply, SRS, Beacon, etc.)

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Supplier Identification
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(30), -- ABC, SRS, BEACON
    supplier_type VARCHAR(50) DEFAULT 'distributor', -- distributor, manufacturer, local_supplier

    -- Primary Contact
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),

    -- Branch/Location
    branch_name VARCHAR(100),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),

    -- Account Details
    account_number VARCHAR(50),
    credit_limit DECIMAL(12, 2),
    payment_terms VARCHAR(50), -- net_30, net_60, cod

    -- Specializations
    product_categories TEXT[], -- ['shingles', 'underlayment', 'ventilation', 'gutters']
    brands_carried TEXT[], -- ['GAF', 'Owens Corning', 'CertainTeed']

    -- Delivery
    offers_delivery BOOLEAN DEFAULT true,
    delivery_fee DECIMAL(8, 2),
    minimum_order_for_free_delivery DECIMAL(10, 2),
    typical_lead_time_days INTEGER DEFAULT 1,

    -- Integration
    has_api_integration BOOLEAN DEFAULT false,
    api_credentials JSONB, -- Encrypted credentials for direct ordering

    -- Rating
    rating DECIMAL(3, 2) DEFAULT 0.00,

    -- Status
    is_preferred BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_suppliers_organization ON suppliers(organization_id);
CREATE INDEX idx_suppliers_is_preferred ON suppliers(is_preferred) WHERE is_preferred = true;
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active) WHERE is_active = true;
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MATERIAL ORDERS TABLE
-- =====================================================
-- Material orders for jobs (linked to suppliers)

CREATE TABLE material_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Order Identification
    order_number VARCHAR(50) UNIQUE NOT NULL, -- MO-2024-001234
    po_number VARCHAR(50), -- Purchase order number
    supplier_order_number VARCHAR(100), -- Supplier's reference number

    -- Order Details
    order_type VARCHAR(30) DEFAULT 'standard', -- standard, rush, will_call, special_order
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Delivery Scheduling
    requested_delivery_date DATE,
    confirmed_delivery_date DATE,
    delivery_time_window VARCHAR(50), -- "7AM-9AM", "Morning", "Afternoon"

    -- Delivery Location
    delivery_address TEXT,
    delivery_instructions TEXT, -- "Place in driveway", "Rooftop delivery"
    delivery_contact_name VARCHAR(100),
    delivery_contact_phone VARCHAR(20),

    -- Pricing
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    delivery_fee DECIMAL(8, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- Status
    status VARCHAR(30) DEFAULT 'draft',
    -- draft, submitted, confirmed, processing, shipped, delivered, cancelled, returned

    -- Tracking
    tracking_number VARCHAR(100),
    shipped_date DATE,
    delivered_date DATE,
    received_by VARCHAR(100),

    -- Verification
    delivery_verified BOOLEAN DEFAULT false,
    delivery_verified_by UUID REFERENCES users(id),
    delivery_verified_at TIMESTAMP WITH TIME ZONE,
    items_match_order BOOLEAN,
    damage_reported BOOLEAN DEFAULT false,
    damage_notes TEXT,

    -- Payment
    payment_status VARCHAR(30) DEFAULT 'unpaid', -- unpaid, partial, paid
    payment_method VARCHAR(30), -- account, credit_card, check, cod

    -- Notes
    order_notes TEXT,
    internal_notes TEXT,

    -- Created/Ordered By
    created_by UUID NOT NULL REFERENCES users(id),
    ordered_by UUID REFERENCES users(id),
    ordered_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_order_status CHECK (status IN (
        'draft', 'submitted', 'confirmed', 'processing',
        'shipped', 'out_for_delivery', 'delivered',
        'partial_delivery', 'cancelled', 'returned', 'back_ordered'
    ))
);

CREATE INDEX idx_material_orders_job ON material_orders(job_id);
CREATE INDEX idx_material_orders_supplier ON material_orders(supplier_id);
CREATE INDEX idx_material_orders_organization ON material_orders(organization_id);
CREATE INDEX idx_material_orders_order_number ON material_orders(order_number);
CREATE INDEX idx_material_orders_status ON material_orders(status);
CREATE INDEX idx_material_orders_delivery_date ON material_orders(confirmed_delivery_date);
CREATE INDEX idx_material_orders_deleted_at ON material_orders(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER material_orders_updated_at
    BEFORE UPDATE ON material_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MATERIAL ORDER ITEMS TABLE
-- =====================================================
-- Individual items within a material order

CREATE TABLE material_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_order_id UUID NOT NULL REFERENCES material_orders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Line Item Details
    line_number INTEGER NOT NULL,

    -- Product Information
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100), -- SKU, item number
    manufacturer VARCHAR(100),
    brand VARCHAR(100),
    color VARCHAR(100),

    -- Product Category (Roofing specific)
    category VARCHAR(50), -- shingles, underlayment, flashing, ventilation, accessories

    -- Quantity & Units
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_received DECIMAL(10, 2) DEFAULT 0.00,
    quantity_backordered DECIMAL(10, 2) DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL, -- SQ (square), BDL (bundle), PC (piece), ROL (roll), EA

    -- Pricing
    unit_price DECIMAL(10, 4) NOT NULL,
    extended_price DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity_ordered * unit_price)::numeric, 2)
    ) STORED,

    -- Specifications
    specifications JSONB DEFAULT '{}'::jsonb,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(material_order_id, line_number)
);

CREATE INDEX idx_material_order_items_order ON material_order_items(material_order_id);
CREATE INDEX idx_material_order_items_organization ON material_order_items(organization_id);
CREATE INDEX idx_material_order_items_product_code ON material_order_items(product_code);
CREATE INDEX idx_material_order_items_category ON material_order_items(category);

CREATE TRIGGER material_order_items_updated_at
    BEFORE UPDATE ON material_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB TASKS TABLE
-- =====================================================
-- Tasks/checklists for job production

CREATE TABLE job_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Task Definition
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_type VARCHAR(50) DEFAULT 'task', -- task, checklist_item, milestone, approval

    -- Category & Grouping
    category VARCHAR(100), -- pre_production, production, quality, closeout
    task_group VARCHAR(100), -- "Pre-Job Checklist", "Tear-Off", "Installation"

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_to_crew_id UUID REFERENCES crews(id),

    -- Scheduling
    due_date DATE,
    due_time TIME,
    reminder_date TIMESTAMP WITH TIME ZONE,

    -- Status
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, skipped, blocked
    is_required BOOLEAN DEFAULT true,
    is_blocking BOOLEAN DEFAULT false, -- Blocks stage advancement if not complete

    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    completion_notes TEXT,

    -- Verification
    requires_verification BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),

    -- Attachments Flag
    requires_photo BOOLEAN DEFAULT false,
    photo_count INTEGER DEFAULT 0,

    -- Template Reference
    template_task_id UUID, -- If created from template

    -- Notes
    notes TEXT,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_task_status CHECK (status IN (
        'pending', 'in_progress', 'completed', 'skipped', 'blocked', 'cancelled'
    ))
);

CREATE INDEX idx_job_tasks_job ON job_tasks(job_id);
CREATE INDEX idx_job_tasks_organization ON job_tasks(organization_id);
CREATE INDEX idx_job_tasks_assigned_user ON job_tasks(assigned_to_user_id);
CREATE INDEX idx_job_tasks_assigned_crew ON job_tasks(assigned_to_crew_id);
CREATE INDEX idx_job_tasks_status ON job_tasks(status);
CREATE INDEX idx_job_tasks_due_date ON job_tasks(due_date);
CREATE INDEX idx_job_tasks_category ON job_tasks(category);
CREATE INDEX idx_job_tasks_deleted_at ON job_tasks(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_tasks_updated_at
    BEFORE UPDATE ON job_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB NOTES TABLE
-- =====================================================
-- Activity log and notes for jobs

CREATE TABLE job_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Note Type
    note_type VARCHAR(30) DEFAULT 'note', -- note, activity, system, communication, alert

    -- Content
    subject VARCHAR(255),
    content TEXT NOT NULL,

    -- Visibility
    is_internal BOOLEAN DEFAULT true, -- Internal only or visible to customer
    is_pinned BOOLEAN DEFAULT false, -- Pinned to top

    -- Communication Details (if type = communication)
    communication_type VARCHAR(30), -- call, email, text, in_person
    communication_direction VARCHAR(10), -- inbound, outbound
    contact_name VARCHAR(100),
    contact_method VARCHAR(255), -- Phone number, email address

    -- Related Entities
    related_task_id UUID REFERENCES job_tasks(id),
    related_order_id UUID REFERENCES material_orders(id),

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),

    -- Mentions
    mentioned_user_ids UUID[], -- Users @mentioned in note

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_note_type CHECK (note_type IN (
        'note', 'activity', 'system', 'communication', 'alert', 'update', 'issue'
    ))
);

CREATE INDEX idx_job_notes_job ON job_notes(job_id);
CREATE INDEX idx_job_notes_organization ON job_notes(organization_id);
CREATE INDEX idx_job_notes_created_by ON job_notes(created_by);
CREATE INDEX idx_job_notes_note_type ON job_notes(note_type);
CREATE INDEX idx_job_notes_is_pinned ON job_notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_job_notes_created_at ON job_notes(created_at DESC);
CREATE INDEX idx_job_notes_deleted_at ON job_notes(deleted_at) WHERE deleted_at IS NULL;

-- Full text search on notes
CREATE INDEX idx_job_notes_search ON job_notes USING gin(
    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(content, ''))
);

CREATE TRIGGER job_notes_updated_at
    BEFORE UPDATE ON job_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB PERMITS TABLE
-- =====================================================
-- Building permit tracking for jobs

CREATE TABLE job_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Permit Identification
    permit_number VARCHAR(100),
    permit_type VARCHAR(50) NOT NULL, -- building, roofing, electrical, plumbing, mechanical

    -- Jurisdiction
    jurisdiction VARCHAR(100), -- City/County name
    jurisdiction_address VARCHAR(255),
    jurisdiction_phone VARCHAR(20),
    jurisdiction_website VARCHAR(255),

    -- Application
    application_date DATE,
    application_fee DECIMAL(10, 2),

    -- Status
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, submitted, in_review, approved, issued, inspection_required, passed, failed, closed, expired

    -- Important Dates
    submitted_date DATE,
    approved_date DATE,
    issued_date DATE,
    expiration_date DATE,

    -- Inspections Required
    inspections_required TEXT[], -- ['rough_in', 'final']

    -- Fees
    permit_fee DECIMAL(10, 2),
    total_fees_paid DECIMAL(10, 2) DEFAULT 0.00,

    -- Documents
    application_document_url TEXT,
    permit_document_url TEXT,

    -- Notes
    notes TEXT,
    requirements TEXT, -- Specific requirements from jurisdiction

    -- Handled By
    applied_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_permit_status CHECK (status IN (
        'not_required', 'pending', 'submitted', 'in_review',
        'approved', 'issued', 'inspection_required',
        'inspection_scheduled', 'inspection_passed', 'inspection_failed',
        'closed', 'expired', 'cancelled'
    ))
);

CREATE INDEX idx_job_permits_job ON job_permits(job_id);
CREATE INDEX idx_job_permits_organization ON job_permits(organization_id);
CREATE INDEX idx_job_permits_permit_number ON job_permits(permit_number);
CREATE INDEX idx_job_permits_status ON job_permits(status);
CREATE INDEX idx_job_permits_deleted_at ON job_permits(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_permits_updated_at
    BEFORE UPDATE ON job_permits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PERMIT INSPECTIONS TABLE
-- =====================================================
-- Individual permit inspections

CREATE TABLE permit_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id UUID NOT NULL REFERENCES job_permits(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Inspection Details
    inspection_type VARCHAR(50) NOT NULL, -- rough_in, framing, final, re_inspection
    inspection_name VARCHAR(100),

    -- Scheduling
    scheduled_date DATE,
    scheduled_time_window VARCHAR(50), -- "8AM-12PM", "Morning"

    -- Status
    status VARCHAR(30) DEFAULT 'pending', -- pending, scheduled, passed, failed, cancelled, no_show

    -- Results
    inspection_date DATE,
    inspector_name VARCHAR(100),
    result VARCHAR(30), -- passed, failed, partial

    -- Corrections Required (if failed)
    corrections_required TEXT,
    correction_deadline DATE,

    -- Notes
    notes TEXT,

    -- Documents
    inspection_report_url TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_inspection_status CHECK (status IN (
        'pending', 'scheduled', 'in_progress', 'passed',
        'failed', 'partial', 'cancelled', 'no_show', 'rescheduled'
    ))
);

CREATE INDEX idx_permit_inspections_permit ON permit_inspections(permit_id);
CREATE INDEX idx_permit_inspections_job ON permit_inspections(job_id);
CREATE INDEX idx_permit_inspections_organization ON permit_inspections(organization_id);
CREATE INDEX idx_permit_inspections_scheduled ON permit_inspections(scheduled_date);
CREATE INDEX idx_permit_inspections_status ON permit_inspections(status);
CREATE INDEX idx_permit_inspections_deleted_at ON permit_inspections(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER permit_inspections_updated_at
    BEFORE UPDATE ON permit_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QUALITY INSPECTIONS TABLE
-- =====================================================
-- Internal quality control inspections

CREATE TABLE quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Inspection Details
    inspection_type VARCHAR(50) NOT NULL, -- progress, final, warranty, punch_list
    inspection_name VARCHAR(100),

    -- Scheduling
    scheduled_date DATE,
    completed_date DATE,

    -- Inspector
    inspector_id UUID REFERENCES users(id),
    inspector_name VARCHAR(100),

    -- Results
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, in_progress, passed, failed, needs_work
    overall_score DECIMAL(3, 2), -- 0.00 to 5.00

    -- Checklist Items (JSONB for flexibility)
    checklist_items JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"item": "Shingle alignment", "passed": true, "notes": ""}]

    -- Issues Found
    issues_found INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,

    -- Punch List Items
    punch_list_items JSONB DEFAULT '[]'::jsonb,

    -- Photos
    photo_count INTEGER DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Sign-off
    signed_off_by UUID REFERENCES users(id),
    signed_off_at TIMESTAMP WITH TIME ZONE,
    customer_present BOOLEAN DEFAULT false,
    customer_signature_url TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_qc_status CHECK (status IN (
        'scheduled', 'in_progress', 'passed', 'failed',
        'needs_work', 'cancelled', 'rescheduled'
    ))
);

CREATE INDEX idx_quality_inspections_job ON quality_inspections(job_id);
CREATE INDEX idx_quality_inspections_organization ON quality_inspections(organization_id);
CREATE INDEX idx_quality_inspections_inspector ON quality_inspections(inspector_id);
CREATE INDEX idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX idx_quality_inspections_scheduled ON quality_inspections(scheduled_date);
CREATE INDEX idx_quality_inspections_deleted_at ON quality_inspections(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER quality_inspections_updated_at
    BEFORE UPDATE ON quality_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- WEATHER DELAYS TABLE
-- =====================================================
-- Track weather-related delays for jobs

CREATE TABLE weather_delays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Delay Details
    delay_date DATE NOT NULL,
    delay_type VARCHAR(50) NOT NULL, -- rain, wind, snow, ice, extreme_heat, extreme_cold, lightning

    -- Duration
    full_day_delay BOOLEAN DEFAULT true,
    delay_hours DECIMAL(4, 2), -- If partial day

    -- Conditions
    weather_description TEXT,
    temperature_high INTEGER,
    temperature_low INTEGER,
    precipitation_amount DECIMAL(4, 2), -- inches
    wind_speed INTEGER, -- mph

    -- Impact
    crew_sent_home BOOLEAN DEFAULT false,
    materials_affected BOOLEAN DEFAULT false,
    work_in_progress_damaged BOOLEAN DEFAULT false,

    -- Rescheduling
    original_scheduled_date DATE,
    rescheduled_to_date DATE,

    -- Notes
    notes TEXT,

    -- Reported By
    reported_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_delay_type CHECK (delay_type IN (
        'rain', 'wind', 'snow', 'ice', 'hail', 'lightning',
        'extreme_heat', 'extreme_cold', 'fog', 'flooding', 'other'
    ))
);

CREATE INDEX idx_weather_delays_job ON weather_delays(job_id);
CREATE INDEX idx_weather_delays_organization ON weather_delays(organization_id);
CREATE INDEX idx_weather_delays_date ON weather_delays(delay_date);
CREATE INDEX idx_weather_delays_type ON weather_delays(delay_type);
CREATE INDEX idx_weather_delays_deleted_at ON weather_delays(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER weather_delays_updated_at
    BEFORE UPDATE ON weather_delays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB STAGE HISTORY TABLE
-- =====================================================
-- Track workflow stage transitions

CREATE TABLE job_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stage Transition
    from_stage_id UUID REFERENCES job_workflow_stages(id),
    to_stage_id UUID NOT NULL REFERENCES job_workflow_stages(id),

    -- Timing
    transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_in_previous_stage_hours DECIMAL(10, 2),

    -- Who Made Change
    transitioned_by UUID REFERENCES users(id),

    -- Reason/Notes
    transition_reason VARCHAR(100), -- manual, automation, api, scheduled
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_stage_history_job ON job_stage_history(job_id);
CREATE INDEX idx_job_stage_history_organization ON job_stage_history(organization_id);
CREATE INDEX idx_job_stage_history_from_stage ON job_stage_history(from_stage_id);
CREATE INDEX idx_job_stage_history_to_stage ON job_stage_history(to_stage_id);
CREATE INDEX idx_job_stage_history_transitioned ON job_stage_history(transitioned_at DESC);

-- =====================================================
-- JOB PHOTOS LINK TABLE
-- =====================================================
-- Link existing photos table to jobs (extends 004-photos.sql)

CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Photo Context for Job
    photo_stage VARCHAR(50), -- pre_production, during_production, completion, quality_check
    work_area VARCHAR(100), -- "Front slope", "Valley", "Ridge cap"

    -- Display
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(job_id, photo_id)
);

CREATE INDEX idx_job_photos_job ON job_photos(job_id);
CREATE INDEX idx_job_photos_photo ON job_photos(photo_id);
CREATE INDEX idx_job_photos_organization ON job_photos(organization_id);
CREATE INDEX idx_job_photos_stage ON job_photos(photo_stage);

-- =====================================================
-- WORK ORDER TEMPLATES TABLE
-- =====================================================
-- Templates for creating standardized work orders

CREATE TABLE work_order_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template Definition
    template_name VARCHAR(100) NOT NULL,
    template_code VARCHAR(50),
    description TEXT,

    -- Job Type Association
    job_type VARCHAR(50), -- roofing, siding, gutters
    job_category VARCHAR(50), -- residential, commercial

    -- Template Content
    default_tasks JSONB DEFAULT '[]'::jsonb,
    default_checklist JSONB DEFAULT '[]'::jsonb,
    default_materials JSONB DEFAULT '[]'::jsonb,

    -- Duration Estimates
    estimated_duration_days INTEGER,
    estimated_labor_hours DECIMAL(8, 2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_work_order_templates_organization ON work_order_templates(organization_id);
CREATE INDEX idx_work_order_templates_job_type ON work_order_templates(job_type);
CREATE INDEX idx_work_order_templates_active ON work_order_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_work_order_templates_deleted_at ON work_order_templates(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER work_order_templates_updated_at
    BEFORE UPDATE ON work_order_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create a job from an approved estimate
CREATE OR REPLACE FUNCTION create_job_from_estimate(
    p_estimate_id UUID,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
    v_estimate RECORD;
    v_claim RECORD;
    v_property RECORD;
    v_job_number VARCHAR(50);
BEGIN
    -- Get estimate details
    SELECT * INTO v_estimate FROM estimates WHERE id = p_estimate_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estimate not found';
    END IF;

    -- Get claim details
    SELECT * INTO v_claim FROM claims WHERE id = v_estimate.claim_id;

    -- Get property details
    SELECT * INTO v_property FROM properties WHERE claim_id = v_estimate.claim_id;

    -- Generate job number
    SELECT 'JOB-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
           LPAD((COUNT(*) + 1)::TEXT, 5, '0')
    INTO v_job_number
    FROM jobs WHERE organization_id = v_estimate.organization_id;

    -- Create job
    INSERT INTO jobs (
        organization_id,
        claim_id,
        estimate_id,
        job_number,
        job_name,
        job_type,
        property_id,
        property_address,
        customer_name,
        customer_email,
        customer_phone,
        created_by,
        contract_amount,
        is_insurance_job,
        insurance_claim_number,
        scope_of_work,
        status
    ) VALUES (
        v_estimate.organization_id,
        v_estimate.claim_id,
        p_estimate_id,
        v_job_number,
        COALESCE(v_property.owner_full_name, 'New Job') || ' - Roof Replacement',
        'roofing',
        v_property.id,
        v_property.full_address,
        COALESCE(v_property.owner_full_name, 'Unknown'),
        v_property.owner_email,
        v_property.owner_phone,
        p_created_by,
        v_estimate.total_amount,
        CASE WHEN v_claim.claim_number IS NOT NULL THEN true ELSE false END,
        v_claim.claim_number,
        v_estimate.scope_of_work,
        'pending'
    )
    RETURNING id INTO v_job_id;

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate job costs
CREATE OR REPLACE FUNCTION calculate_job_costs(p_job_id UUID)
RETURNS TABLE(
    material_cost DECIMAL,
    labor_cost DECIMAL,
    total_cost DECIMAL,
    profit_margin DECIMAL
) AS $$
DECLARE
    v_material_cost DECIMAL(12, 2);
    v_labor_cost DECIMAL(12, 2);
    v_total_cost DECIMAL(12, 2);
    v_contract_amount DECIMAL(12, 2);
BEGIN
    -- Calculate material costs
    SELECT COALESCE(SUM(total_amount), 0.00)
    INTO v_material_cost
    FROM material_orders
    WHERE job_id = p_job_id
    AND status NOT IN ('cancelled', 'returned')
    AND deleted_at IS NULL;

    -- Calculate labor costs from tickets
    SELECT COALESCE(SUM(labor_cost), 0.00)
    INTO v_labor_cost
    FROM labor_tickets
    WHERE job_id = p_job_id
    AND status IN ('approved', 'billed')
    AND deleted_at IS NULL;

    v_total_cost := v_material_cost + v_labor_cost;

    -- Get contract amount
    SELECT contract_amount INTO v_contract_amount
    FROM jobs WHERE id = p_job_id;

    -- Update job with actual costs
    UPDATE jobs
    SET
        material_actual = v_material_cost,
        labor_actual = v_labor_cost,
        actual_cost = v_total_cost,
        profit_margin = CASE
            WHEN v_contract_amount > 0
            THEN ROUND(((v_contract_amount - v_total_cost) / v_contract_amount * 100)::numeric, 2)
            ELSE 0.00
        END
    WHERE id = p_job_id;

    RETURN QUERY
    SELECT
        v_material_cost,
        v_labor_cost,
        v_total_cost,
        CASE
            WHEN v_contract_amount > 0
            THEN ROUND(((v_contract_amount - v_total_cost) / v_contract_amount * 100)::numeric, 2)
            ELSE 0.00
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance job to next workflow stage
CREATE OR REPLACE FUNCTION advance_job_stage(
    p_job_id UUID,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_current_stage_id UUID;
    v_workflow_id UUID;
    v_current_order INTEGER;
    v_next_stage_id UUID;
    v_time_in_stage DECIMAL(10, 2);
BEGIN
    -- Get current job info
    SELECT workflow_id, current_stage_id
    INTO v_workflow_id, v_current_stage_id
    FROM jobs WHERE id = p_job_id;

    IF v_workflow_id IS NULL THEN
        RAISE EXCEPTION 'Job has no workflow assigned';
    END IF;

    -- Get current stage order
    SELECT stage_order INTO v_current_order
    FROM job_workflow_stages
    WHERE id = v_current_stage_id;

    -- Get next stage
    SELECT id INTO v_next_stage_id
    FROM job_workflow_stages
    WHERE workflow_id = v_workflow_id
    AND stage_order > COALESCE(v_current_order, 0)
    AND deleted_at IS NULL
    ORDER BY stage_order
    LIMIT 1;

    IF v_next_stage_id IS NULL THEN
        RAISE EXCEPTION 'No next stage available';
    END IF;

    -- Calculate time in current stage
    SELECT EXTRACT(EPOCH FROM (NOW() -
        COALESCE(
            (SELECT transitioned_at FROM job_stage_history
             WHERE job_id = p_job_id ORDER BY transitioned_at DESC LIMIT 1),
            (SELECT created_at FROM jobs WHERE id = p_job_id)
        )
    )) / 3600.0
    INTO v_time_in_stage;

    -- Record stage transition
    INSERT INTO job_stage_history (
        job_id, organization_id, from_stage_id, to_stage_id,
        time_in_previous_stage_hours, transitioned_by, notes
    )
    SELECT
        p_job_id, organization_id, v_current_stage_id, v_next_stage_id,
        v_time_in_stage, p_user_id, p_notes
    FROM jobs WHERE id = p_job_id;

    -- Update job
    UPDATE jobs
    SET current_stage_id = v_next_stage_id
    WHERE id = p_job_id;

    RETURN v_next_stage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get production board data
CREATE OR REPLACE FUNCTION get_production_board(
    p_organization_id UUID,
    p_workflow_id UUID DEFAULT NULL
)
RETURNS TABLE(
    stage_id UUID,
    stage_name VARCHAR,
    stage_order INTEGER,
    color_code VARCHAR,
    jobs JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stage_jobs AS (
        SELECT
            j.current_stage_id,
            jsonb_agg(
                jsonb_build_object(
                    'job_id', j.id,
                    'job_number', j.job_number,
                    'job_name', j.job_name,
                    'customer_name', j.customer_name,
                    'property_address', j.property_address,
                    'priority', j.priority,
                    'date_scheduled', j.date_scheduled,
                    'completion_percentage', j.completion_percentage,
                    'board_position', j.board_position
                ) ORDER BY j.board_position, j.priority DESC, j.date_scheduled
            ) AS job_list
        FROM jobs j
        WHERE j.organization_id = p_organization_id
        AND j.deleted_at IS NULL
        AND j.status NOT IN ('completed', 'cancelled')
        GROUP BY j.current_stage_id
    )
    SELECT
        s.id,
        s.stage_name,
        s.stage_order,
        s.color_code,
        COALESCE(sj.job_list, '[]'::jsonb)
    FROM job_workflow_stages s
    LEFT JOIN stage_jobs sj ON sj.current_stage_id = s.id
    WHERE s.organization_id = p_organization_id
    AND (p_workflow_id IS NULL OR s.workflow_id = p_workflow_id)
    AND s.deleted_at IS NULL
    ORDER BY s.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DATA: Default Workflows
-- =====================================================

-- Insert default roofing workflow (will need org_id at runtime)
-- This is a template - actual seeding would be done per-organization

/*
-- Example workflow creation for an organization:
INSERT INTO job_workflows (organization_id, workflow_name, workflow_code, job_type, job_category, is_default)
VALUES
    ('org-uuid-here', 'Residential Insurance Roofing', 'RES_INSURANCE_ROOF', 'roofing', 'residential_insurance', true);

INSERT INTO job_workflow_stages (workflow_id, organization_id, stage_name, stage_code, stage_order, color_code, is_entry_stage)
VALUES
    ('workflow-uuid', 'org-uuid', 'Pending Approval', 'PENDING', 1, '#9CA3AF', true),
    ('workflow-uuid', 'org-uuid', 'Approved - To Schedule', 'APPROVED', 2, '#60A5FA', false),
    ('workflow-uuid', 'org-uuid', 'Materials Ordered', 'MATERIALS', 3, '#FBBF24', false),
    ('workflow-uuid', 'org-uuid', 'Crew Scheduled', 'SCHEDULED', 4, '#A78BFA', false),
    ('workflow-uuid', 'org-uuid', 'In Progress', 'IN_PROGRESS', 5, '#34D399', false),
    ('workflow-uuid', 'org-uuid', 'Punch List', 'PUNCH_LIST', 6, '#F97316', false),
    ('workflow-uuid', 'org-uuid', 'Final Inspection', 'INSPECTION', 7, '#EC4899', false),
    ('workflow-uuid', 'org-uuid', 'Completed', 'COMPLETED', 8, '#10B981', true);
*/

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE jobs IS 'Core production entity - tracks jobs from approval through completion';
COMMENT ON TABLE job_workflows IS 'Custom workflow definitions for different job types';
COMMENT ON TABLE job_workflow_stages IS 'Individual stages within workflows (production board columns)';
COMMENT ON TABLE crews IS 'Production crews/teams - internal and subcontractor';
COMMENT ON TABLE crew_members IS 'Individual workers assigned to crews';
COMMENT ON TABLE job_crew_assignments IS 'Crew scheduling for jobs';
COMMENT ON TABLE labor_tickets IS 'Daily labor tracking for production';
COMMENT ON TABLE production_schedule IS 'Calendar events for production scheduling';
COMMENT ON TABLE suppliers IS 'Material suppliers (ABC, SRS, Beacon, etc.)';
COMMENT ON TABLE material_orders IS 'Material orders for jobs';
COMMENT ON TABLE material_order_items IS 'Individual items in material orders';
COMMENT ON TABLE job_tasks IS 'Tasks and checklists for jobs';
COMMENT ON TABLE job_notes IS 'Activity log and notes for jobs';
COMMENT ON TABLE job_permits IS 'Building permit tracking';
COMMENT ON TABLE permit_inspections IS 'Permit inspection scheduling and results';
COMMENT ON TABLE quality_inspections IS 'Internal quality control inspections';
COMMENT ON TABLE weather_delays IS 'Weather-related delay tracking';
COMMENT ON TABLE job_stage_history IS 'Workflow stage transition history';
COMMENT ON TABLE job_photos IS 'Links photos to jobs with production context';
COMMENT ON TABLE work_order_templates IS 'Templates for standardized work orders';

COMMENT ON COLUMN jobs.job_number IS 'Unique job identifier (JOB-2024-00001)';
COMMENT ON COLUMN jobs.roof_squares IS 'Total roof squares (100 sq ft = 1 square)';
COMMENT ON COLUMN jobs.board_position IS 'Position on production board for drag-and-drop ordering';
COMMENT ON COLUMN job_workflow_stages.is_blocking IS 'If true, incomplete required items prevent stage advancement';
COMMENT ON COLUMN crews.daily_capacity_squares IS 'Crew capacity in squares per day for scheduling';
COMMENT ON COLUMN labor_tickets.squares_completed IS 'Production tracking - squares completed this ticket';
