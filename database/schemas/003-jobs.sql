-- =====================================================
-- 003-jobs.sql
-- Jobs - The Central Work Entity
-- Links Customer → Job → (optional) Claim → Estimate → Production
-- =====================================================

-- =====================================================
-- JOB WORKFLOWS TABLE
-- =====================================================
-- Define custom workflows for different job types
-- Each workflow has stages that jobs move through

CREATE TABLE job_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Workflow Definition
    workflow_name VARCHAR(100) NOT NULL,
    workflow_code VARCHAR(50) NOT NULL,
    description TEXT,

    -- Job Type Association
    job_type VARCHAR(50), -- roofing, siding, gutters, windows, painting
    job_category VARCHAR(50), -- residential_retail, residential_insurance, commercial

    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    color_code VARCHAR(7) DEFAULT '#3B82F6',

    -- Audit Fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, workflow_code)
);

CREATE INDEX idx_job_workflows_org ON job_workflows(organization_id);
CREATE INDEX idx_job_workflows_default ON job_workflows(is_default) WHERE is_default = true;
CREATE INDEX idx_job_workflows_active ON job_workflows(is_active) WHERE is_active = true;
CREATE INDEX idx_job_workflows_deleted ON job_workflows(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_workflows_updated_at
    BEFORE UPDATE ON job_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB WORKFLOW STAGES TABLE
-- =====================================================
-- Stages within a workflow (columns on production board)

CREATE TABLE job_workflow_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES job_workflows(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Stage Definition
    stage_name VARCHAR(100) NOT NULL,
    stage_code VARCHAR(50) NOT NULL,
    description TEXT,

    -- Ordering (position on board)
    stage_order INTEGER NOT NULL,

    -- Visual
    color_code VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),

    -- Stage Type
    stage_type VARCHAR(30) DEFAULT 'active', -- queue, active, review, completed, cancelled
    is_entry_stage BOOLEAN DEFAULT false, -- Jobs start here
    is_exit_stage BOOLEAN DEFAULT false, -- Jobs end here

    -- SLA Settings
    target_days INTEGER, -- Target days in this stage
    warning_days INTEGER, -- When to show warning
    escalation_days INTEGER, -- When to escalate

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(workflow_id, stage_code),
    UNIQUE(workflow_id, stage_order)
);

CREATE INDEX idx_workflow_stages_workflow ON job_workflow_stages(workflow_id);
CREATE INDEX idx_workflow_stages_org ON job_workflow_stages(organization_id);
CREATE INDEX idx_workflow_stages_order ON job_workflow_stages(workflow_id, stage_order);
CREATE INDEX idx_workflow_stages_deleted ON job_workflow_stages(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_workflow_stages_updated_at
    BEFORE UPDATE ON job_workflow_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOBS TABLE (Central Work Entity)
-- =====================================================
-- A job represents work to be done for a customer
-- Jobs are created from sales process, linked to customer

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- JOB IDENTIFICATION
    -- ===================
    job_number VARCHAR(50) UNIQUE NOT NULL, -- JOB-2024-00001
    job_name VARCHAR(255) NOT NULL, -- "Smith Residence - Roof Replacement"

    -- ===================
    -- CUSTOMER LINK (Required - Root Entity)
    -- ===================
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    property_id UUID REFERENCES contact_properties(id) ON DELETE SET NULL, -- If different from primary

    -- Cached customer info for quick display
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    service_address TEXT, -- Cached full address

    -- ===================
    -- JOB CLASSIFICATION
    -- ===================
    job_type VARCHAR(50) NOT NULL DEFAULT 'roofing', -- roofing, siding, gutters, windows, painting, general
    job_category VARCHAR(50) DEFAULT 'residential_retail', -- residential_retail, residential_insurance, commercial
    project_size VARCHAR(30) DEFAULT 'standard', -- small, standard, large, complex

    -- Work Type
    work_type VARCHAR(50) DEFAULT 'replacement', -- replacement, repair, new_construction, maintenance, inspection

    -- ===================
    -- WORKFLOW & STATUS
    -- ===================
    workflow_id UUID REFERENCES job_workflows(id) ON DELETE SET NULL,
    current_stage_id UUID REFERENCES job_workflow_stages(id) ON DELETE SET NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'lead',
    -- lead, quoted, sold, scheduled, in_progress, on_hold, punch_list, complete, closed, cancelled, lost

    substatus VARCHAR(50), -- Custom substatus
    board_position INTEGER DEFAULT 0, -- Position for drag-drop on board

    -- ===================
    -- PRIORITY & FLAGS
    -- ===================
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent, emergency
    is_active BOOLEAN DEFAULT true,

    -- Job Flags
    is_insurance_job BOOLEAN DEFAULT false,
    is_warranty_job BOOLEAN DEFAULT false,
    is_repeat_customer BOOLEAN DEFAULT false,
    requires_permit BOOLEAN DEFAULT false,
    requires_hoa_approval BOOLEAN DEFAULT false,

    -- ===================
    -- TEAM ASSIGNMENT
    -- ===================
    sales_rep_id UUID REFERENCES users(id), -- Who sold the job
    project_manager_id UUID REFERENCES users(id), -- Who manages production
    estimator_id UUID REFERENCES users(id), -- Who created estimate

    -- ===================
    -- IMPORTANT DATES
    -- ===================
    date_created DATE DEFAULT CURRENT_DATE,
    date_lead_received DATE,
    date_appointment_set DATE,
    date_appointment DATE, -- Sales appointment
    date_quoted DATE,
    date_sold DATE, -- Contract signed
    date_permit_submitted DATE,
    date_permit_approved DATE,
    date_materials_ordered DATE,
    date_materials_delivered DATE,
    date_scheduled DATE, -- Production scheduled
    date_started DATE, -- Work began
    date_completed DATE, -- Work finished
    date_final_inspection DATE,
    date_closed DATE, -- Job fully closed

    -- Target Dates
    target_start_date DATE,
    target_completion_date DATE,

    -- ===================
    -- FINANCIAL SUMMARY
    -- ===================
    -- Contract
    contract_amount DECIMAL(12, 2), -- Agreed price
    contract_signed BOOLEAN DEFAULT false,
    contract_signed_date DATE,

    -- Costs
    estimated_cost DECIMAL(12, 2), -- Projected cost
    actual_cost DECIMAL(12, 2) DEFAULT 0.00, -- Running actual
    material_cost DECIMAL(12, 2) DEFAULT 0.00,
    labor_cost DECIMAL(12, 2) DEFAULT 0.00,

    -- Profit
    gross_profit DECIMAL(12, 2) GENERATED ALWAYS AS (
        COALESCE(contract_amount, 0) - COALESCE(actual_cost, 0)
    ) STORED,
    profit_margin DECIMAL(5, 2), -- Percentage

    -- Payments
    total_invoiced DECIMAL(12, 2) DEFAULT 0.00,
    total_paid DECIMAL(12, 2) DEFAULT 0.00,
    balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (
        COALESCE(total_invoiced, 0) - COALESCE(total_paid, 0)
    ) STORED,

    -- ===================
    -- ROOFING SPECIFICS
    -- ===================
    roof_squares DECIMAL(8, 2), -- Total squares
    roof_pitch VARCHAR(20), -- 4/12, 6/12, steep, flat
    roof_type VARCHAR(50), -- asphalt_shingle, metal, tile, flat, slate
    roof_layers INTEGER DEFAULT 1, -- Layers to remove

    -- Shingle Details
    shingle_manufacturer VARCHAR(100), -- GAF, Owens Corning, CertainTeed
    shingle_product_line VARCHAR(100), -- Timberline HDZ, Duration, Landmark
    shingle_color VARCHAR(100),

    -- Roof Components
    include_drip_edge BOOLEAN DEFAULT true,
    include_ice_water BOOLEAN DEFAULT true,
    include_ridge_vent BOOLEAN DEFAULT true,
    include_pipe_boots BOOLEAN DEFAULT true,
    include_starter_strip BOOLEAN DEFAULT true,
    include_valley_metal BOOLEAN DEFAULT false,
    include_chimney_flashing BOOLEAN DEFAULT false,
    include_skylight_flashing BOOLEAN DEFAULT false,

    -- Decking
    decking_replacement_needed BOOLEAN DEFAULT false,
    decking_sheets_estimated INTEGER DEFAULT 0,
    decking_sheets_actual INTEGER DEFAULT 0,

    -- ===================
    -- INSURANCE JOB FIELDS
    -- ===================
    -- Only populated if is_insurance_job = true
    insurance_company VARCHAR(255),
    insurance_claim_number VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    date_of_loss DATE,

    -- Adjuster
    adjuster_name VARCHAR(100),
    adjuster_phone VARCHAR(20),
    adjuster_email VARCHAR(255),

    -- Insurance Amounts
    insurance_rcv DECIMAL(12, 2), -- Replacement Cost Value
    insurance_acv DECIMAL(12, 2), -- Actual Cash Value
    insurance_deductible DECIMAL(10, 2),
    deductible_collected BOOLEAN DEFAULT false,
    deductible_collected_date DATE,
    depreciation_amount DECIMAL(12, 2),
    depreciation_recoverable BOOLEAN DEFAULT true,

    -- Supplements
    supplement_amount DECIMAL(12, 2) DEFAULT 0.00,
    supplement_approved BOOLEAN DEFAULT false,
    supplement_approved_date DATE,

    -- ===================
    -- PERMIT TRACKING
    -- ===================
    permit_number VARCHAR(100),
    permit_status VARCHAR(30), -- not_needed, pending, submitted, approved, issued, inspection_scheduled, passed, closed
    permit_jurisdiction VARCHAR(100),
    permit_fee DECIMAL(10, 2),
    permit_expiration_date DATE,

    -- ===================
    -- WARRANTY
    -- ===================
    warranty_type VARCHAR(50), -- standard, extended, lifetime, system_plus
    warranty_years INTEGER,
    warranty_registered BOOLEAN DEFAULT false,
    warranty_registration_date DATE,
    warranty_certificate_number VARCHAR(100),

    -- ===================
    -- COMPLETION
    -- ===================
    completion_percentage INTEGER DEFAULT 0, -- 0-100
    punch_list_items INTEGER DEFAULT 0,
    punch_list_completed INTEGER DEFAULT 0,

    final_inspection_passed BOOLEAN,
    final_walkthrough_completed BOOLEAN DEFAULT false,
    customer_signed_off BOOLEAN DEFAULT false,
    customer_signoff_date DATE,

    -- ===================
    -- NOTES
    -- ===================
    scope_of_work TEXT,
    production_notes TEXT,
    internal_notes TEXT,
    customer_notes TEXT, -- Visible to customer
    access_notes TEXT, -- Property access info

    -- ===================
    -- METADATA
    -- ===================
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,

    metadata JSONB DEFAULT '{
        "milestones": [],
        "weather_delays": 0,
        "change_orders": 0
    }'::jsonb,

    -- ===================
    -- SOURCE TRACKING
    -- ===================
    lead_source VARCHAR(100),
    lead_source_detail VARCHAR(255),
    marketing_campaign VARCHAR(100),

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- ===================
    -- CONSTRAINTS
    -- ===================
    CONSTRAINT valid_job_status CHECK (status IN (
        'lead', 'appointment_set', 'quoted', 'negotiating', 'sold',
        'pending_permit', 'permit_approved', 'materials_ordered', 'scheduled',
        'in_progress', 'on_hold', 'punch_list', 'complete',
        'closed', 'cancelled', 'lost'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),
    CONSTRAINT valid_job_type CHECK (job_type IN (
        'roofing', 'siding', 'gutters', 'windows', 'doors', 'painting',
        'decking', 'fencing', 'insulation', 'ventilation', 'general', 'other'
    )),
    CONSTRAINT valid_work_type CHECK (work_type IN (
        'replacement', 'repair', 'new_construction', 'maintenance',
        'inspection', 'emergency', 'warranty', 'other'
    ))
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookups
CREATE INDEX idx_jobs_organization ON jobs(organization_id);
CREATE INDEX idx_jobs_job_number ON jobs(job_number);
CREATE INDEX idx_jobs_contact ON jobs(contact_id);
CREATE INDEX idx_jobs_property ON jobs(property_id);

-- Status & Workflow
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_workflow ON jobs(workflow_id);
CREATE INDEX idx_jobs_stage ON jobs(current_stage_id);
CREATE INDEX idx_jobs_priority ON jobs(priority);

-- Team
CREATE INDEX idx_jobs_sales_rep ON jobs(sales_rep_id);
CREATE INDEX idx_jobs_project_manager ON jobs(project_manager_id);

-- Dates
CREATE INDEX idx_jobs_date_sold ON jobs(date_sold DESC);
CREATE INDEX idx_jobs_date_scheduled ON jobs(date_scheduled);
CREATE INDEX idx_jobs_date_started ON jobs(date_started);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Type & Category
CREATE INDEX idx_jobs_job_type ON jobs(job_type);
CREATE INDEX idx_jobs_job_category ON jobs(job_category);
CREATE INDEX idx_jobs_is_insurance ON jobs(is_insurance_job) WHERE is_insurance_job = true;

-- Financial
CREATE INDEX idx_jobs_balance_due ON jobs(balance_due) WHERE balance_due > 0;

-- Active jobs
CREATE INDEX idx_jobs_active ON jobs(is_active, status) WHERE is_active = true AND deleted_at IS NULL;

-- Tags
CREATE INDEX idx_jobs_tags ON jobs USING gin(tags);

-- Soft delete
CREATE INDEX idx_jobs_deleted ON jobs(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_jobs_search ON jobs USING gin(
    to_tsvector('english',
        coalesce(job_number, '') || ' ' ||
        coalesce(job_name, '') || ' ' ||
        coalesce(customer_name, '') || ' ' ||
        coalesce(service_address, '') || ' ' ||
        coalesce(insurance_claim_number, '')
    )
);

CREATE TRIGGER jobs_updated_at
    BEFORE UPDATE ON jobs
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

    -- Transition
    from_stage_id UUID REFERENCES job_workflow_stages(id),
    to_stage_id UUID NOT NULL REFERENCES job_workflow_stages(id),

    -- Timing
    transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    days_in_previous_stage INTEGER,

    -- Who/Why
    transitioned_by UUID REFERENCES users(id),
    transition_reason VARCHAR(100), -- manual, automation, api
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_stage_history_job ON job_stage_history(job_id);
CREATE INDEX idx_job_stage_history_org ON job_stage_history(organization_id);
CREATE INDEX idx_job_stage_history_date ON job_stage_history(transitioned_at DESC);

-- =====================================================
-- JOB TEAM MEMBERS TABLE
-- =====================================================
-- Additional team members assigned to job

CREATE TABLE job_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role on this job
    role VARCHAR(50) NOT NULL, -- project_manager, sales_rep, estimator, production_manager, coordinator

    -- Assignment
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(job_id, user_id, role)
);

CREATE INDEX idx_job_team_job ON job_team_members(job_id);
CREATE INDEX idx_job_team_user ON job_team_members(user_id);
CREATE INDEX idx_job_team_org ON job_team_members(organization_id);
CREATE INDEX idx_job_team_active ON job_team_members(is_active) WHERE is_active = true;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create new job with auto-generated number
CREATE OR REPLACE FUNCTION create_job(
    p_organization_id UUID,
    p_contact_id UUID,
    p_job_name VARCHAR(255),
    p_job_type VARCHAR(50) DEFAULT 'roofing',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
    v_job_number VARCHAR(50);
    v_contact RECORD;
BEGIN
    -- Get contact info
    SELECT full_name, phone_primary, email, full_address
    INTO v_contact
    FROM contacts
    WHERE id = p_contact_id;

    -- Generate job number
    v_job_number := generate_sequence_number(p_organization_id, 'job');

    INSERT INTO jobs (
        organization_id,
        job_number,
        job_name,
        contact_id,
        customer_name,
        customer_phone,
        customer_email,
        service_address,
        job_type,
        created_by
    ) VALUES (
        p_organization_id,
        v_job_number,
        p_job_name,
        p_contact_id,
        v_contact.full_name,
        v_contact.phone_primary,
        v_contact.email,
        v_contact.full_address,
        p_job_type,
        p_created_by
    )
    RETURNING id INTO v_job_id;

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Update job status with date tracking
CREATE OR REPLACE FUNCTION update_job_status(
    p_job_id UUID,
    p_new_status VARCHAR(30),
    p_updated_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE jobs
    SET
        status = p_new_status,
        -- Auto-set dates based on status
        date_sold = CASE WHEN p_new_status = 'sold' AND date_sold IS NULL THEN CURRENT_DATE ELSE date_sold END,
        date_scheduled = CASE WHEN p_new_status = 'scheduled' AND date_scheduled IS NULL THEN CURRENT_DATE ELSE date_scheduled END,
        date_started = CASE WHEN p_new_status = 'in_progress' AND date_started IS NULL THEN CURRENT_DATE ELSE date_started END,
        date_completed = CASE WHEN p_new_status = 'complete' AND date_completed IS NULL THEN CURRENT_DATE ELSE date_completed END,
        date_closed = CASE WHEN p_new_status = 'closed' AND date_closed IS NULL THEN CURRENT_DATE ELSE date_closed END,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate job profitability
CREATE OR REPLACE FUNCTION calculate_job_profit(p_job_id UUID)
RETURNS TABLE(
    contract_amount DECIMAL,
    actual_cost DECIMAL,
    gross_profit DECIMAL,
    profit_margin DECIMAL
) AS $$
DECLARE
    v_contract DECIMAL(12, 2);
    v_cost DECIMAL(12, 2);
    v_profit DECIMAL(12, 2);
    v_margin DECIMAL(5, 2);
BEGIN
    SELECT j.contract_amount, j.actual_cost
    INTO v_contract, v_cost
    FROM jobs j WHERE j.id = p_job_id;

    v_profit := COALESCE(v_contract, 0) - COALESCE(v_cost, 0);
    v_margin := CASE
        WHEN COALESCE(v_contract, 0) > 0
        THEN ROUND((v_profit / v_contract * 100)::numeric, 2)
        ELSE 0
    END;

    -- Update job with calculated margin
    UPDATE jobs
    SET profit_margin = v_margin
    WHERE id = p_job_id;

    RETURN QUERY SELECT v_contract, v_cost, v_profit, v_margin;
END;
$$ LANGUAGE plpgsql;

-- Update contact stats when job status changes
CREATE OR REPLACE FUNCTION update_contact_job_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update contact's job counts and revenue
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        UPDATE contacts
        SET
            total_jobs = (
                SELECT COUNT(*) FROM jobs
                WHERE contact_id = NEW.contact_id
                AND status IN ('complete', 'closed')
                AND deleted_at IS NULL
            ),
            total_revenue = (
                SELECT COALESCE(SUM(contract_amount), 0) FROM jobs
                WHERE contact_id = NEW.contact_id
                AND status IN ('complete', 'closed')
                AND deleted_at IS NULL
            ),
            first_job_date = (
                SELECT MIN(date_sold) FROM jobs
                WHERE contact_id = NEW.contact_id
                AND date_sold IS NOT NULL
                AND deleted_at IS NULL
            ),
            last_job_date = (
                SELECT MAX(date_sold) FROM jobs
                WHERE contact_id = NEW.contact_id
                AND date_sold IS NOT NULL
                AND deleted_at IS NULL
            ),
            -- Update contact type based on job status
            contact_type = CASE
                WHEN NEW.status = 'sold' AND (SELECT contact_type FROM contacts WHERE id = NEW.contact_id) IN ('lead', 'prospect')
                THEN 'customer'
                ELSE (SELECT contact_type FROM contacts WHERE id = NEW.contact_id)
            END,
            updated_at = NOW()
        WHERE id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_update_contact_stats
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_job_stats();

-- =====================================================
-- SEED: Default Workflow
-- =====================================================
-- Note: This would be created per-organization, shown as example

/*
-- Example: Create default roofing workflow for an org
INSERT INTO job_workflows (organization_id, workflow_name, workflow_code, job_type, is_default)
VALUES ('org-uuid', 'Residential Roofing', 'RES_ROOFING', 'roofing', true);

INSERT INTO job_workflow_stages (workflow_id, organization_id, stage_name, stage_code, stage_order, color_code, is_entry_stage) VALUES
('workflow-uuid', 'org-uuid', 'New Lead', 'LEAD', 1, '#9CA3AF', true),
('workflow-uuid', 'org-uuid', 'Appointment Set', 'APPT_SET', 2, '#60A5FA', false),
('workflow-uuid', 'org-uuid', 'Quoted', 'QUOTED', 3, '#FBBF24', false),
('workflow-uuid', 'org-uuid', 'Sold', 'SOLD', 4, '#34D399', false),
('workflow-uuid', 'org-uuid', 'Permit', 'PERMIT', 5, '#A78BFA', false),
('workflow-uuid', 'org-uuid', 'Materials Ordered', 'MATERIALS', 6, '#F97316', false),
('workflow-uuid', 'org-uuid', 'Scheduled', 'SCHEDULED', 7, '#EC4899', false),
('workflow-uuid', 'org-uuid', 'In Progress', 'IN_PROGRESS', 8, '#14B8A6', false),
('workflow-uuid', 'org-uuid', 'Punch List', 'PUNCH_LIST', 9, '#EF4444', false),
('workflow-uuid', 'org-uuid', 'Complete', 'COMPLETE', 10, '#10B981', true);
*/

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE job_workflows IS 'Custom workflows for different job types';
COMMENT ON TABLE job_workflow_stages IS 'Stages within workflows (production board columns)';
COMMENT ON TABLE jobs IS 'Central work entity - links customers to work being performed';
COMMENT ON TABLE job_stage_history IS 'Track workflow stage transitions for reporting';
COMMENT ON TABLE job_team_members IS 'Additional team members assigned to jobs';

COMMENT ON COLUMN jobs.job_number IS 'Auto-generated unique identifier (JOB-2024-00001)';
COMMENT ON COLUMN jobs.contact_id IS 'Required link to customer - jobs cannot exist without customer';
COMMENT ON COLUMN jobs.roof_squares IS 'Roof size in squares (1 square = 100 sq ft)';
COMMENT ON COLUMN jobs.gross_profit IS 'Computed: contract_amount - actual_cost';
COMMENT ON COLUMN jobs.balance_due IS 'Computed: total_invoiced - total_paid';
