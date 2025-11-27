-- =====================================================
-- 006-production.sql
-- Production: Work Orders, Crews, Labor, Scheduling
-- =====================================================

-- =====================================================
-- WORK ORDERS TABLE
-- =====================================================
-- Work orders are specific work items within a job
-- A job can have multiple work orders (tear-off, install, cleanup, etc.)

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Work Order Identification
    work_order_number VARCHAR(50) UNIQUE NOT NULL, -- WO-2024-00001

    -- Work Order Details
    title VARCHAR(255) NOT NULL, -- "Tear-off", "Shingle Installation", etc.
    description TEXT,
    work_order_type VARCHAR(50) DEFAULT 'standard',
    -- standard, change_order, warranty, punch_list, inspection

    -- Scope
    scope_of_work TEXT,
    special_instructions TEXT,

    -- Related Estimate/Change Order
    estimate_id UUID REFERENCES estimates(id),
    is_change_order BOOLEAN DEFAULT false,
    change_order_reason TEXT,
    original_work_order_id UUID REFERENCES work_orders(id), -- If this is a change order

    -- Scheduling
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2),

    -- Assignment
    assigned_crew_id UUID, -- FK added after crews table created
    assigned_to_user_id UUID REFERENCES users(id),

    -- Priority & Status
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, scheduled, in_progress, on_hold, completed, cancelled

    -- Costs
    estimated_labor_cost DECIMAL(12, 2) DEFAULT 0.00,
    estimated_material_cost DECIMAL(12, 2) DEFAULT 0.00,
    estimated_total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        estimated_labor_cost + estimated_material_cost
    ) STORED,
    actual_labor_cost DECIMAL(12, 2) DEFAULT 0.00,
    actual_material_cost DECIMAL(12, 2) DEFAULT 0.00,
    actual_total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        actual_labor_cost + actual_material_cost
    ) STORED,

    -- Billing
    is_billable BOOLEAN DEFAULT true,
    billing_amount DECIMAL(12, 2),
    invoiced BOOLEAN DEFAULT false,
    invoice_id UUID, -- FK added after invoices table reference available

    -- Approval
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Completion
    completed_by UUID REFERENCES users(id),
    completion_notes TEXT,
    customer_signature TEXT, -- Base64 signature

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_wo_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT valid_wo_status CHECK (status IN (
        'pending', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled', 'invoiced'
    ))
);

CREATE INDEX idx_work_orders_job ON work_orders(job_id);
CREATE INDEX idx_work_orders_org ON work_orders(organization_id);
CREATE INDEX idx_work_orders_number ON work_orders(work_order_number);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_start_date);
CREATE INDEX idx_work_orders_type ON work_orders(work_order_type);
CREATE INDEX idx_work_orders_change_order ON work_orders(is_change_order) WHERE is_change_order = true;
CREATE INDEX idx_work_orders_deleted ON work_orders(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- CREWS TABLE
-- =====================================================
-- Internal crews and subcontractors

CREATE TABLE crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Crew Identification
    crew_name VARCHAR(100) NOT NULL,
    crew_code VARCHAR(30),

    -- Crew Type
    crew_type VARCHAR(30) DEFAULT 'internal', -- internal, subcontractor
    trade VARCHAR(50) DEFAULT 'roofing', -- roofing, siding, gutters, general

    -- Crew Lead
    crew_lead_id UUID REFERENCES users(id),
    crew_lead_name VARCHAR(100),
    crew_lead_phone VARCHAR(20),
    crew_lead_email VARCHAR(255),

    -- Capacity
    crew_size INTEGER DEFAULT 3,
    daily_capacity_squares DECIMAL(6, 2), -- Squares per day

    -- Subcontractor Info
    is_subcontractor BOOLEAN DEFAULT false,
    company_name VARCHAR(255),
    tax_id VARCHAR(20),
    insurance_policy VARCHAR(100),
    insurance_expiration DATE,
    workers_comp_policy VARCHAR(100),
    workers_comp_expiration DATE,

    -- Pay Rates
    pay_type VARCHAR(30) DEFAULT 'per_square', -- hourly, per_square, per_job
    hourly_rate DECIMAL(8, 2),
    per_square_rate DECIMAL(8, 2),

    -- Performance
    quality_rating DECIMAL(3, 2) DEFAULT 0.00,
    reliability_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_jobs_completed INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    availability_status VARCHAR(30) DEFAULT 'available', -- available, busy, on_leave

    -- Visual
    color_code VARCHAR(7) DEFAULT '#10B981',

    -- Notes
    notes TEXT,
    certifications TEXT[],

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_crews_organization ON crews(organization_id);
CREATE INDEX idx_crews_lead ON crews(crew_lead_id);
CREATE INDEX idx_crews_trade ON crews(trade);
CREATE INDEX idx_crews_active ON crews(is_active) WHERE is_active = true;
CREATE INDEX idx_crews_subcontractor ON crews(is_subcontractor) WHERE is_subcontractor = true;
CREATE INDEX idx_crews_deleted ON crews(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER crews_updated_at
    BEFORE UPDATE ON crews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add FK constraint for work_orders.assigned_crew_id now that crews exists
ALTER TABLE work_orders ADD CONSTRAINT work_orders_assigned_crew_fkey
    FOREIGN KEY (assigned_crew_id) REFERENCES crews(id) ON DELETE SET NULL;

CREATE TRIGGER work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREW MEMBERS TABLE
-- =====================================================
-- Individual workers in crews

CREATE TABLE crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identity
    user_id UUID REFERENCES users(id),
    member_name VARCHAR(100) NOT NULL,
    member_phone VARCHAR(20),
    member_email VARCHAR(255),

    -- Role
    role VARCHAR(50) DEFAULT 'laborer', -- crew_lead, foreman, laborer, apprentice
    is_crew_lead BOOLEAN DEFAULT false,
    skill_level VARCHAR(30) DEFAULT 'journeyman',

    -- Pay
    hourly_rate DECIMAL(8, 2),
    employment_type VARCHAR(30) DEFAULT 'w2', -- w2, 1099

    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Certifications
    certifications TEXT[],

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX idx_crew_members_org ON crew_members(organization_id);
CREATE INDEX idx_crew_members_user ON crew_members(user_id);
CREATE INDEX idx_crew_members_active ON crew_members(is_active) WHERE is_active = true;
CREATE INDEX idx_crew_members_deleted ON crew_members(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER crew_members_updated_at
    BEFORE UPDATE ON crew_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB CREW ASSIGNMENTS TABLE
-- =====================================================
-- Schedule crews to jobs

CREATE TABLE job_crew_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_start_time TIME,
    scheduled_end_time TIME,

    -- Actual Times
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,

    -- Assignment Details
    assignment_type VARCHAR(30) DEFAULT 'production', -- production, repair, inspection
    work_description TEXT,
    areas_to_work TEXT[], -- ['Front slope', 'Back slope']

    -- Status
    status VARCHAR(30) DEFAULT 'scheduled',
    -- scheduled, confirmed, in_progress, completed, cancelled, no_show, weather_delay

    -- Completion
    work_completed TEXT,
    completion_percentage INTEGER DEFAULT 0,
    squares_completed DECIMAL(6, 2),

    -- Pay
    pay_type VARCHAR(30),
    agreed_rate DECIMAL(10, 2),
    total_pay DECIMAL(10, 2),

    -- Notes
    crew_notes TEXT,
    office_notes TEXT,

    -- Assignment
    assigned_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_assignment_status CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed',
        'cancelled', 'no_show', 'weather_delay', 'rescheduled'
    ))
);

CREATE INDEX idx_job_crew_assignments_job ON job_crew_assignments(job_id);
CREATE INDEX idx_job_crew_assignments_crew ON job_crew_assignments(crew_id);
CREATE INDEX idx_job_crew_assignments_org ON job_crew_assignments(organization_id);
CREATE INDEX idx_job_crew_assignments_date ON job_crew_assignments(scheduled_date);
CREATE INDEX idx_job_crew_assignments_status ON job_crew_assignments(status);
CREATE INDEX idx_job_crew_assignments_deleted ON job_crew_assignments(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_crew_assignments_updated_at
    BEFORE UPDATE ON job_crew_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LABOR TICKETS TABLE
-- =====================================================
-- Daily labor tracking

CREATE TABLE labor_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    crew_id UUID REFERENCES crews(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Ticket Identification
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    ticket_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Time
    time_in TIMESTAMP WITH TIME ZONE,
    time_out TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(5, 2),

    -- Workers
    workers_count INTEGER DEFAULT 1,
    worker_names TEXT[],

    -- Work Done
    work_description TEXT NOT NULL,
    areas_worked TEXT[],

    -- Production
    squares_completed DECIMAL(6, 2),
    linear_feet_completed DECIMAL(8, 2),

    -- Weather
    weather_conditions VARCHAR(50),
    weather_notes TEXT,

    -- Quality
    quality_check_passed BOOLEAN,
    quality_notes TEXT,

    -- Cost
    labor_cost DECIMAL(10, 2),

    -- Status
    status VARCHAR(30) DEFAULT 'draft', -- draft, submitted, approved, rejected

    -- Approval
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Notes
    foreman_notes TEXT,
    office_notes TEXT,

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_labor_tickets_job ON labor_tickets(job_id);
CREATE INDEX idx_labor_tickets_crew ON labor_tickets(crew_id);
CREATE INDEX idx_labor_tickets_org ON labor_tickets(organization_id);
CREATE INDEX idx_labor_tickets_date ON labor_tickets(ticket_date DESC);
CREATE INDEX idx_labor_tickets_status ON labor_tickets(status);
CREATE INDEX idx_labor_tickets_deleted ON labor_tickets(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER labor_tickets_updated_at
    BEFORE UPDATE ON labor_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRODUCTION SCHEDULE TABLE
-- =====================================================
-- Calendar events for production

CREATE TABLE production_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    -- labor, material_delivery, inspection, permit_inspection, meeting, walkthrough

    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,

    -- Schedule
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    all_day BOOLEAN DEFAULT false,

    -- Assignment
    crew_id UUID REFERENCES crews(id),
    assigned_to_user_id UUID REFERENCES users(id),

    -- Status
    status VARCHAR(30) DEFAULT 'scheduled',
    -- scheduled, confirmed, completed, cancelled, rescheduled

    -- Notifications
    send_reminder BOOLEAN DEFAULT true,
    reminder_sent BOOLEAN DEFAULT false,

    -- Color
    color_code VARCHAR(7),

    -- Notes
    notes TEXT,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_production_schedule_job ON production_schedule(job_id);
CREATE INDEX idx_production_schedule_org ON production_schedule(organization_id);
CREATE INDEX idx_production_schedule_date ON production_schedule(scheduled_date);
CREATE INDEX idx_production_schedule_type ON production_schedule(event_type);
CREATE INDEX idx_production_schedule_crew ON production_schedule(crew_id);
CREATE INDEX idx_production_schedule_deleted ON production_schedule(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER production_schedule_updated_at
    BEFORE UPDATE ON production_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- JOB TASKS TABLE
-- =====================================================
-- Tasks and checklists for jobs

CREATE TABLE job_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Task Definition
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    category VARCHAR(100), -- pre_production, production, quality, closeout

    -- Order
    sort_order INTEGER DEFAULT 0,

    -- Assignment
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_to_crew_id UUID REFERENCES crews(id),

    -- Due Date
    due_date DATE,

    -- Status
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, skipped
    is_required BOOLEAN DEFAULT true,

    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    completion_notes TEXT,

    -- Verification
    requires_verification BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Photo Required
    requires_photo BOOLEAN DEFAULT false,
    photo_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_job_tasks_job ON job_tasks(job_id);
CREATE INDEX idx_job_tasks_org ON job_tasks(organization_id);
CREATE INDEX idx_job_tasks_assigned_user ON job_tasks(assigned_to_user_id);
CREATE INDEX idx_job_tasks_status ON job_tasks(status);
CREATE INDEX idx_job_tasks_due_date ON job_tasks(due_date);
CREATE INDEX idx_job_tasks_deleted ON job_tasks(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER job_tasks_updated_at
    BEFORE UPDATE ON job_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- QUALITY INSPECTIONS TABLE
-- =====================================================

CREATE TABLE quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Inspection Type
    inspection_type VARCHAR(50) NOT NULL, -- progress, final, warranty, punch_list

    -- Scheduling
    scheduled_date DATE,
    completed_date DATE,

    -- Inspector
    inspector_id UUID REFERENCES users(id),
    inspector_name VARCHAR(100),

    -- Results
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, passed, failed, needs_work
    overall_score DECIMAL(3, 2),

    -- Checklist
    checklist_items JSONB DEFAULT '[]'::jsonb,

    -- Issues
    issues_found INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    punch_list_items JSONB DEFAULT '[]'::jsonb,

    -- Sign-off
    customer_present BOOLEAN DEFAULT false,
    customer_signed_off BOOLEAN DEFAULT false,
    customer_signature_url TEXT,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_quality_inspections_job ON quality_inspections(job_id);
CREATE INDEX idx_quality_inspections_org ON quality_inspections(organization_id);
CREATE INDEX idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX idx_quality_inspections_deleted ON quality_inspections(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER quality_inspections_updated_at
    BEFORE UPDATE ON quality_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Update job labor costs from tickets
CREATE OR REPLACE FUNCTION update_job_labor_costs(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE jobs
    SET
        labor_cost = (
            SELECT COALESCE(SUM(labor_cost), 0)
            FROM labor_tickets
            WHERE job_id = p_job_id
            AND status = 'approved'
            AND deleted_at IS NULL
        ),
        labor_hours_actual = (
            SELECT COALESCE(SUM(total_hours), 0)
            FROM labor_tickets
            WHERE job_id = p_job_id
            AND status = 'approved'
            AND deleted_at IS NULL
        ),
        actual_cost = material_cost + COALESCE((
            SELECT SUM(labor_cost) FROM labor_tickets
            WHERE job_id = p_job_id AND status = 'approved' AND deleted_at IS NULL
        ), 0),
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job costs when labor ticket approved
CREATE OR REPLACE FUNCTION trigger_update_job_labor()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        PERFORM update_job_labor_costs(NEW.job_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER labor_tickets_update_job
    AFTER UPDATE ON labor_tickets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_job_labor();

-- Create work order with auto-generated number
CREATE OR REPLACE FUNCTION create_work_order(
    p_job_id UUID,
    p_title VARCHAR,
    p_work_order_type VARCHAR DEFAULT 'standard',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_work_order_id UUID;
    v_work_order_number VARCHAR(50);
    v_org_id UUID;
BEGIN
    -- Get organization from job
    SELECT organization_id INTO v_org_id FROM jobs WHERE id = p_job_id;

    -- Generate work order number
    v_work_order_number := generate_sequence_number(v_org_id, 'work_order');

    INSERT INTO work_orders (
        organization_id,
        job_id,
        work_order_number,
        title,
        work_order_type,
        created_by
    ) VALUES (
        v_org_id,
        p_job_id,
        v_work_order_number,
        p_title,
        p_work_order_type,
        p_created_by
    )
    RETURNING id INTO v_work_order_id;

    RETURN v_work_order_id;
END;
$$ LANGUAGE plpgsql;

-- Create change order (special type of work order)
CREATE OR REPLACE FUNCTION create_change_order(
    p_original_work_order_id UUID,
    p_title VARCHAR,
    p_reason TEXT,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_work_order_id UUID;
    v_work_order_number VARCHAR(50);
    v_job_id UUID;
    v_org_id UUID;
BEGIN
    -- Get job and org from original work order
    SELECT job_id, organization_id INTO v_job_id, v_org_id
    FROM work_orders WHERE id = p_original_work_order_id;

    -- Generate work order number
    v_work_order_number := generate_sequence_number(v_org_id, 'work_order');

    INSERT INTO work_orders (
        organization_id,
        job_id,
        work_order_number,
        title,
        work_order_type,
        is_change_order,
        change_order_reason,
        original_work_order_id,
        created_by
    ) VALUES (
        v_org_id,
        v_job_id,
        v_work_order_number,
        p_title,
        'change_order',
        true,
        p_reason,
        p_original_work_order_id,
        p_created_by
    )
    RETURNING id INTO v_work_order_id;

    RETURN v_work_order_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE work_orders IS 'Work orders - individual work items within a job';
COMMENT ON TABLE crews IS 'Production crews - internal and subcontractor';
COMMENT ON TABLE crew_members IS 'Individual workers in crews';
COMMENT ON TABLE job_crew_assignments IS 'Schedule crews to jobs';
COMMENT ON TABLE labor_tickets IS 'Daily labor tracking for production';
COMMENT ON TABLE production_schedule IS 'Calendar events for production';
COMMENT ON TABLE job_tasks IS 'Tasks and checklists for jobs';
COMMENT ON TABLE quality_inspections IS 'Internal quality control inspections';
