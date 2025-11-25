-- =====================================================
-- 003-estimates.sql
-- Estimates, Line Items, Materials, and Labor
-- Xactimate-compatible estimate management
-- =====================================================

-- =====================================================
-- ESTIMATES TABLE
-- =====================================================
-- Each claim can have multiple estimates (initial, supplements, revisions)

CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Estimate Identification
    estimate_number VARCHAR(50) UNIQUE NOT NULL, -- ORG-CLAIM-EST-001
    estimate_name VARCHAR(255), -- "Initial Estimate", "Supplement #1", etc.
    estimate_type VARCHAR(50) NOT NULL DEFAULT 'initial', -- initial, supplement, revision, final

    -- Version Control
    version INTEGER DEFAULT 1,
    parent_estimate_id UUID REFERENCES estimates(id), -- Links to previous version
    is_latest_version BOOLEAN DEFAULT true,

    -- Ownership
    created_by UUID NOT NULL REFERENCES users(id),
    estimator_id UUID REFERENCES users(id), -- Assigned estimator
    reviewed_by UUID REFERENCES users(id), -- Who reviewed/approved

    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- Workflow: draft → in_progress → completed → submitted → under_review → approved → rejected

    -- Financial Totals (calculated from line items)
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000, -- 7.5% = 0.0750
    overhead_percentage DECIMAL(5, 2) DEFAULT 10.00, -- 10% overhead
    overhead_amount DECIMAL(12, 2) DEFAULT 0.00,
    profit_percentage DECIMAL(5, 2) DEFAULT 10.00, -- 10% profit
    profit_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- Depreciation
    rcv_total DECIMAL(12, 2), -- Replacement Cost Value
    acv_total DECIMAL(12, 2), -- Actual Cash Value (RCV - Depreciation)
    depreciation_amount DECIMAL(12, 2),

    -- Important Dates
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_submitted TIMESTAMP WITH TIME ZONE,
    date_approved TIMESTAMP WITH TIME ZONE,
    date_rejected TIMESTAMP WITH TIME ZONE,

    -- Estimate Details
    scope_of_work TEXT,
    notes TEXT, -- Internal notes
    terms_and_conditions TEXT,

    -- Xactimate Integration
    xactimate_estimate_id VARCHAR(100), -- External Xactimate reference
    xactimate_exported BOOLEAN DEFAULT false,
    xactimate_export_date TIMESTAMP WITH TIME ZONE,
    xactimate_data JSONB, -- Raw Xactimate data for imports

    -- Additional Metadata
    metadata JSONB DEFAULT '{
        "payment_schedule": [],
        "special_conditions": [],
        "warranty_info": {}
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_estimate_type CHECK (estimate_type IN ('initial', 'supplement', 'revision', 'final', 'change_order')),
    CONSTRAINT valid_estimate_status CHECK (status IN (
        'draft', 'in_progress', 'completed', 'submitted',
        'under_review', 'approved', 'rejected', 'cancelled'
    ))
);

-- Indexes for estimates
CREATE INDEX idx_estimates_claim_id ON estimates(claim_id);
CREATE INDEX idx_estimates_organization_id ON estimates(organization_id);
CREATE INDEX idx_estimates_estimate_number ON estimates(estimate_number);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_estimator_id ON estimates(estimator_id);
CREATE INDEX idx_estimates_created_by ON estimates(created_by);
CREATE INDEX idx_estimates_latest_version ON estimates(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX idx_estimates_deleted_at ON estimates(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ESTIMATE LINE ITEMS TABLE
-- =====================================================
-- Individual line items within an estimate (rooms, tasks, repairs)

CREATE TABLE estimate_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Line Item Organization
    line_number INTEGER NOT NULL, -- Display order (10, 20, 30...)
    parent_line_id UUID REFERENCES estimate_line_items(id), -- For hierarchical line items
    level INTEGER DEFAULT 0, -- 0 = category, 1 = item, 2 = sub-item

    -- Line Item Details
    category VARCHAR(100), -- Roofing, Interior, Plumbing, etc.
    subcategory VARCHAR(100), -- Roof Deck, Drywall, Fixtures, etc.
    description TEXT NOT NULL, -- "Remove and replace damaged drywall"
    notes TEXT, -- Additional notes/specifications

    -- Type
    item_type VARCHAR(30) DEFAULT 'labor_and_materials', -- labor_only, materials_only, labor_and_materials, equipment

    -- Quantity & Units
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    unit VARCHAR(20) NOT NULL DEFAULT 'EA', -- EA (each), SF (square feet), LF (linear feet), SQ (square), HR (hours)

    -- Pricing
    unit_cost DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity * unit_cost)::numeric, 2)
    ) STORED,

    -- Labor Breakdown
    labor_hours DECIMAL(8, 2),
    labor_rate DECIMAL(10, 2),
    labor_cost DECIMAL(12, 2),

    -- Materials Breakdown
    material_cost DECIMAL(12, 2),

    -- Equipment/Other
    equipment_cost DECIMAL(12, 2) DEFAULT 0.00,
    other_cost DECIMAL(12, 2) DEFAULT 0.00,

    -- Depreciation
    rcv DECIMAL(12, 2), -- Replacement Cost Value for this line
    acv DECIMAL(12, 2), -- Actual Cash Value
    depreciation_percentage DECIMAL(5, 2) DEFAULT 0.00,

    -- Xactimate Integration
    xactimate_code VARCHAR(50), -- Xactimate item code (e.g., "DRY 1/2")
    xactimate_data JSONB,

    -- Status
    is_approved BOOLEAN DEFAULT false,
    is_contested BOOLEAN DEFAULT false, -- Insurance company disputed this line
    contest_notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_item_type CHECK (item_type IN ('labor_only', 'materials_only', 'labor_and_materials', 'equipment', 'other')),
    UNIQUE(estimate_id, line_number)
);

-- Indexes for estimate_line_items
CREATE INDEX idx_line_items_estimate_id ON estimate_line_items(estimate_id);
CREATE INDEX idx_line_items_organization_id ON estimate_line_items(organization_id);
CREATE INDEX idx_line_items_line_number ON estimate_line_items(estimate_id, line_number);
CREATE INDEX idx_line_items_category ON estimate_line_items(category);
CREATE INDEX idx_line_items_xactimate_code ON estimate_line_items(xactimate_code);
CREATE INDEX idx_line_items_approved ON estimate_line_items(is_approved);
CREATE INDEX idx_line_items_contested ON estimate_line_items(is_contested) WHERE is_contested = true;
CREATE INDEX idx_line_items_deleted_at ON estimate_line_items(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER estimate_line_items_updated_at
    BEFORE UPDATE ON estimate_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MATERIALS TABLE
-- =====================================================
-- Detailed materials tracking for estimates

CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    line_item_id UUID REFERENCES estimate_line_items(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Material Identification
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(100), -- lumber, drywall, roofing_shingle, paint, etc.
    manufacturer VARCHAR(255),
    model_number VARCHAR(100),
    sku VARCHAR(100),

    -- Specifications
    specifications TEXT, -- Detailed specs, color, grade, etc.
    unit VARCHAR(20) NOT NULL DEFAULT 'EA', -- EA, SF, LF, GAL, BOX, etc.

    -- Quantity & Pricing
    quantity_needed DECIMAL(12, 4) NOT NULL,
    quantity_ordered DECIMAL(12, 4) DEFAULT 0.0000,
    quantity_received DECIMAL(12, 4) DEFAULT 0.0000,
    unit_cost DECIMAL(12, 4) NOT NULL,
    total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity_needed * unit_cost)::numeric, 2)
    ) STORED,

    -- Supplier Information
    supplier_name VARCHAR(255),
    supplier_contact VARCHAR(255),
    supplier_phone VARCHAR(20),
    po_number VARCHAR(50), -- Purchase Order number
    tracking_number VARCHAR(100),

    -- Status
    status VARCHAR(30) DEFAULT 'pending', -- pending, ordered, in_transit, received, installed
    ordered_date DATE,
    expected_delivery_date DATE,
    received_date DATE,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_material_status CHECK (status IN ('pending', 'ordered', 'in_transit', 'received', 'installed', 'returned', 'cancelled'))
);

-- Indexes for materials
CREATE INDEX idx_materials_estimate_id ON materials(estimate_id);
CREATE INDEX idx_materials_line_item_id ON materials(line_item_id);
CREATE INDEX idx_materials_organization_id ON materials(organization_id);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_materials_supplier ON materials(supplier_name);
CREATE INDEX idx_materials_deleted_at ON materials(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LABOR TABLE
-- =====================================================
-- Labor tracking for estimates and time tracking

CREATE TABLE labor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    line_item_id UUID REFERENCES estimate_line_items(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Worker Information
    worker_user_id UUID REFERENCES users(id), -- If worker has user account
    worker_name VARCHAR(255), -- If external contractor/laborer

    -- Labor Classification
    trade VARCHAR(50) NOT NULL, -- roofing, plumbing, electrical, carpentry, general, etc.
    skill_level VARCHAR(30) DEFAULT 'journeyman', -- apprentice, journeyman, master, foreman

    -- Time Tracking
    date_worked DATE NOT NULL DEFAULT CURRENT_DATE,
    time_start TIME,
    time_end TIME,
    hours_worked DECIMAL(6, 2) NOT NULL,
    break_time DECIMAL(4, 2) DEFAULT 0.00, -- Hours deducted for breaks

    -- Pricing
    hourly_rate DECIMAL(10, 2) NOT NULL,
    overtime_rate DECIMAL(10, 2), -- If overtime applies
    overtime_hours DECIMAL(6, 2) DEFAULT 0.00,
    total_labor_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND(((hours_worked - overtime_hours) * hourly_rate + overtime_hours * COALESCE(overtime_rate, hourly_rate))::numeric, 2)
    ) STORED,

    -- Work Details
    work_performed TEXT, -- Description of work completed
    location_on_property VARCHAR(255), -- "North side roof", "Master bathroom", etc.

    -- Status
    status VARCHAR(30) DEFAULT 'scheduled', -- scheduled, in_progress, completed, verified, billed
    verified_by UUID REFERENCES users(id), -- Supervisor who verified time
    verified_at TIMESTAMP WITH TIME ZONE,

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_labor_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'verified', 'billed', 'cancelled')),
    CONSTRAINT valid_skill_level CHECK (skill_level IN ('apprentice', 'journeyman', 'master', 'foreman', 'helper'))
);

-- Indexes for labor
CREATE INDEX idx_labor_estimate_id ON labor(estimate_id);
CREATE INDEX idx_labor_line_item_id ON labor(line_item_id);
CREATE INDEX idx_labor_organization_id ON labor(organization_id);
CREATE INDEX idx_labor_worker_user_id ON labor(worker_user_id);
CREATE INDEX idx_labor_date_worked ON labor(date_worked DESC);
CREATE INDEX idx_labor_status ON labor(status);
CREATE INDEX idx_labor_trade ON labor(trade);
CREATE INDEX idx_labor_deleted_at ON labor(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER labor_updated_at
    BEFORE UPDATE ON labor
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to recalculate estimate totals from line items
CREATE OR REPLACE FUNCTION recalculate_estimate_totals(p_estimate_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_amount DECIMAL(12, 2);
    v_overhead_amount DECIMAL(12, 2);
    v_profit_amount DECIMAL(12, 2);
    v_total DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4);
    v_overhead_pct DECIMAL(5, 2);
    v_profit_pct DECIMAL(5, 2);
BEGIN
    -- Get current percentages
    SELECT tax_rate, overhead_percentage, profit_percentage
    INTO v_tax_rate, v_overhead_pct, v_profit_pct
    FROM estimates
    WHERE id = p_estimate_id;

    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(total_cost), 0.00)
    INTO v_subtotal
    FROM estimate_line_items
    WHERE estimate_id = p_estimate_id
    AND deleted_at IS NULL;

    -- Calculate derived amounts
    v_overhead_amount := ROUND((v_subtotal * v_overhead_pct / 100)::numeric, 2);
    v_profit_amount := ROUND((v_subtotal * v_profit_pct / 100)::numeric, 2);
    v_tax_amount := ROUND(((v_subtotal + v_overhead_amount + v_profit_amount) * v_tax_rate)::numeric, 2);
    v_total := v_subtotal + v_overhead_amount + v_profit_amount + v_tax_amount;

    -- Update estimate
    UPDATE estimates
    SET
        subtotal = v_subtotal,
        overhead_amount = v_overhead_amount,
        profit_amount = v_profit_amount,
        tax_amount = v_tax_amount,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_estimate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-recalculate estimate totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_estimate()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate for the affected estimate
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_estimate_totals(OLD.estimate_id);
    ELSE
        PERFORM recalculate_estimate_totals(NEW.estimate_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER line_items_recalculate_estimate
    AFTER INSERT OR UPDATE OR DELETE ON estimate_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_estimate();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE estimates IS 'Estimate records for claims - supports initial, supplements, and revisions';
COMMENT ON TABLE estimate_line_items IS 'Individual line items within estimates - hierarchical structure supported';
COMMENT ON TABLE materials IS 'Materials tracking for procurement and installation';
COMMENT ON TABLE labor IS 'Labor time tracking and cost calculation';

COMMENT ON COLUMN estimates.estimate_type IS 'Type: initial, supplement, revision, final, change_order';
COMMENT ON COLUMN estimates.rcv_total IS 'Replacement Cost Value - full replacement cost';
COMMENT ON COLUMN estimates.acv_total IS 'Actual Cash Value - RCV minus depreciation';
COMMENT ON COLUMN estimate_line_items.xactimate_code IS 'Xactimate standard item code for compatibility';
COMMENT ON COLUMN estimate_line_items.is_contested IS 'Insurance company disputed this line item';
