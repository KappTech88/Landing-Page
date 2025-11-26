-- =====================================================
-- 005-estimates.sql
-- Estimates & Line Items
-- Linked to Jobs (not claims directly)
-- =====================================================

-- =====================================================
-- ESTIMATES TABLE
-- =====================================================
-- Estimates for jobs - supports multiple versions, supplements

CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- ESTIMATE IDENTIFICATION
    -- ===================
    estimate_number VARCHAR(50) UNIQUE NOT NULL, -- EST-2024-00001

    -- ===================
    -- JOB & CUSTOMER LINK
    -- ===================
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL, -- If insurance

    -- ===================
    -- ESTIMATE TYPE & VERSION
    -- ===================
    estimate_type VARCHAR(30) NOT NULL DEFAULT 'initial',
    -- initial, revision, supplement, change_order, final

    version INTEGER DEFAULT 1,
    parent_estimate_id UUID REFERENCES estimates(id), -- Previous version
    is_current_version BOOLEAN DEFAULT true,

    estimate_name VARCHAR(255), -- "Initial Roof Estimate", "Supplement #1"

    -- ===================
    -- STATUS
    -- ===================
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- draft, pending_review, sent, viewed, accepted, rejected, expired, superseded

    sent_date TIMESTAMP WITH TIME ZONE,
    viewed_date TIMESTAMP WITH TIME ZONE,
    accepted_date TIMESTAMP WITH TIME ZONE,
    rejected_date TIMESTAMP WITH TIME ZONE,
    expiration_date DATE,

    rejection_reason TEXT,

    -- ===================
    -- OWNERSHIP
    -- ===================
    created_by UUID NOT NULL REFERENCES users(id),
    estimator_id UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_date TIMESTAMP WITH TIME ZONE,

    -- ===================
    -- PRICING STRUCTURE
    -- ===================
    pricing_method VARCHAR(30) DEFAULT 'line_item', -- line_item, square_price, flat_rate

    -- Line Item Totals (calculated)
    subtotal_materials DECIMAL(12, 2) DEFAULT 0.00,
    subtotal_labor DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,

    -- Overhead & Profit
    overhead_percentage DECIMAL(5, 2) DEFAULT 10.00,
    overhead_amount DECIMAL(12, 2) DEFAULT 0.00,
    profit_percentage DECIMAL(5, 2) DEFAULT 10.00,
    profit_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- Tax
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    is_taxable BOOLEAN DEFAULT true,

    -- Discounts
    discount_type VARCHAR(20), -- percentage, flat
    discount_percentage DECIMAL(5, 2),
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_reason TEXT,

    -- Final Total
    total_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- ===================
    -- INSURANCE PRICING (if applicable)
    -- ===================
    rcv_total DECIMAL(12, 2), -- Replacement Cost Value
    acv_total DECIMAL(12, 2), -- Actual Cash Value
    depreciation_total DECIMAL(12, 2),

    -- ===================
    -- SCOPE & DESCRIPTION
    -- ===================
    scope_summary TEXT, -- Brief scope description
    scope_of_work TEXT, -- Detailed scope
    exclusions TEXT, -- What's NOT included
    assumptions TEXT, -- Assumptions made

    -- ===================
    -- TERMS
    -- ===================
    payment_terms TEXT,
    warranty_terms TEXT,
    terms_and_conditions TEXT,
    valid_days INTEGER DEFAULT 30, -- Estimate valid for X days

    -- ===================
    -- XACTIMATE INTEGRATION
    -- ===================
    is_xactimate BOOLEAN DEFAULT false,
    xactimate_file_id VARCHAR(100),
    xactimate_claim_number VARCHAR(100),
    xactimate_data JSONB,

    -- ===================
    -- NOTES
    -- ===================
    internal_notes TEXT,
    customer_notes TEXT, -- Visible to customer

    -- ===================
    -- METADATA
    -- ===================
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,

    metadata JSONB DEFAULT '{
        "line_item_count": 0,
        "revision_notes": []
    }'::jsonb,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_estimate_type CHECK (estimate_type IN (
        'initial', 'revision', 'supplement', 'change_order', 'final', 'budget'
    )),
    CONSTRAINT valid_estimate_status CHECK (status IN (
        'draft', 'pending_review', 'sent', 'viewed', 'accepted',
        'rejected', 'expired', 'superseded', 'cancelled'
    ))
);

-- Indexes
CREATE INDEX idx_estimates_organization ON estimates(organization_id);
CREATE INDEX idx_estimates_job ON estimates(job_id);
CREATE INDEX idx_estimates_contact ON estimates(contact_id);
CREATE INDEX idx_estimates_claim ON estimates(claim_id);
CREATE INDEX idx_estimates_number ON estimates(estimate_number);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_type ON estimates(estimate_type);
CREATE INDEX idx_estimates_current ON estimates(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX idx_estimates_deleted ON estimates(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER estimates_updated_at
    BEFORE UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ESTIMATE CATEGORIES TABLE
-- =====================================================
-- Categories/sections within an estimate

CREATE TABLE estimate_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Category Definition
    category_name VARCHAR(100) NOT NULL,
    category_code VARCHAR(30),
    description TEXT,

    -- Default for this org
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, category_code)
);

CREATE INDEX idx_estimate_categories_org ON estimate_categories(organization_id);
CREATE INDEX idx_estimate_categories_default ON estimate_categories(is_default) WHERE is_default = true;
CREATE INDEX idx_estimate_categories_deleted ON estimate_categories(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ESTIMATE LINE ITEMS TABLE
-- =====================================================
-- Individual line items within an estimate

CREATE TABLE estimate_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- LINE ITEM ORGANIZATION
    -- ===================
    line_number INTEGER NOT NULL, -- Display order
    category_id UUID REFERENCES estimate_categories(id),
    category_name VARCHAR(100), -- Denormalized for display
    subcategory VARCHAR(100),

    -- Parent for hierarchical items
    parent_line_id UUID REFERENCES estimate_line_items(id),
    indent_level INTEGER DEFAULT 0,

    -- ===================
    -- ITEM DETAILS
    -- ===================
    item_code VARCHAR(50), -- SKU or Xactimate code
    description TEXT NOT NULL,
    detailed_description TEXT,

    -- Item Type
    item_type VARCHAR(30) DEFAULT 'material_labor',
    -- material, labor, material_labor, equipment, subcontractor, other

    -- ===================
    -- QUANTITY & UNITS
    -- ===================
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    unit VARCHAR(20) NOT NULL DEFAULT 'EA',
    -- EA (each), SF (sq ft), LF (linear ft), SQ (square), HR (hour), etc.

    -- ===================
    -- PRICING
    -- ===================
    unit_price DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    extended_price DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity * unit_price)::numeric, 2)
    ) STORED,

    -- Cost breakdown
    material_cost DECIMAL(12, 2) DEFAULT 0.00,
    labor_cost DECIMAL(12, 2) DEFAULT 0.00,
    labor_hours DECIMAL(8, 2),
    labor_rate DECIMAL(10, 2),

    -- ===================
    -- DEPRECIATION (Insurance)
    -- ===================
    rcv DECIMAL(12, 2), -- Replacement Cost Value
    depreciation_percent DECIMAL(5, 2),
    depreciation_amount DECIMAL(12, 2),
    acv DECIMAL(12, 2), -- Actual Cash Value

    -- ===================
    -- TAXES & ADJUSTMENTS
    -- ===================
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5, 4),
    tax_amount DECIMAL(12, 2),

    -- Markup
    markup_percent DECIMAL(5, 2),
    markup_amount DECIMAL(12, 2),

    -- ===================
    -- STATUS
    -- ===================
    is_optional BOOLEAN DEFAULT false, -- Optional add-on
    is_included BOOLEAN DEFAULT true, -- Included in totals
    is_approved BOOLEAN DEFAULT false, -- Customer approved

    -- Insurance status
    is_contested BOOLEAN DEFAULT false, -- Insurance disputes this
    contest_notes TEXT,

    -- ===================
    -- NOTES
    -- ===================
    notes TEXT,
    internal_notes TEXT,

    -- ===================
    -- METADATA
    -- ===================
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(estimate_id, line_number),
    CONSTRAINT valid_item_type CHECK (item_type IN (
        'material', 'labor', 'material_labor', 'equipment',
        'subcontractor', 'permit', 'disposal', 'other'
    ))
);

-- Indexes
CREATE INDEX idx_estimate_line_items_estimate ON estimate_line_items(estimate_id);
CREATE INDEX idx_estimate_line_items_org ON estimate_line_items(organization_id);
CREATE INDEX idx_estimate_line_items_category ON estimate_line_items(category_id);
CREATE INDEX idx_estimate_line_items_line_number ON estimate_line_items(estimate_id, line_number);
CREATE INDEX idx_estimate_line_items_item_code ON estimate_line_items(item_code);
CREATE INDEX idx_estimate_line_items_deleted ON estimate_line_items(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER estimate_line_items_updated_at
    BEFORE UPDATE ON estimate_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ESTIMATE TEMPLATES TABLE
-- =====================================================
-- Reusable estimate templates

CREATE TABLE estimate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template Info
    template_name VARCHAR(100) NOT NULL,
    template_code VARCHAR(30),
    description TEXT,

    -- Job Type Association
    job_type VARCHAR(50), -- roofing, siding, gutters

    -- Template Content
    scope_template TEXT,
    terms_template TEXT,
    default_items JSONB DEFAULT '[]'::jsonb, -- Pre-populated line items

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_estimate_templates_org ON estimate_templates(organization_id);
CREATE INDEX idx_estimate_templates_job_type ON estimate_templates(job_type);
CREATE INDEX idx_estimate_templates_active ON estimate_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_estimate_templates_deleted ON estimate_templates(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER estimate_templates_updated_at
    BEFORE UPDATE ON estimate_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create estimate for job
CREATE OR REPLACE FUNCTION create_estimate(
    p_job_id UUID,
    p_estimate_type VARCHAR(30) DEFAULT 'initial',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_estimate_id UUID;
    v_estimate_number VARCHAR(50);
    v_job RECORD;
BEGIN
    -- Get job info
    SELECT * INTO v_job FROM jobs WHERE id = p_job_id;

    -- Generate estimate number
    v_estimate_number := generate_sequence_number(v_job.organization_id, 'estimate');

    INSERT INTO estimates (
        organization_id,
        estimate_number,
        job_id,
        contact_id,
        estimate_type,
        estimate_name,
        created_by,
        estimator_id
    ) VALUES (
        v_job.organization_id,
        v_estimate_number,
        p_job_id,
        v_job.contact_id,
        p_estimate_type,
        v_job.job_name || ' - ' || INITCAP(REPLACE(p_estimate_type, '_', ' ')),
        p_created_by,
        p_created_by
    )
    RETURNING id INTO v_estimate_id;

    RETURN v_estimate_id;
END;
$$ LANGUAGE plpgsql;

-- Recalculate estimate totals from line items
CREATE OR REPLACE FUNCTION recalculate_estimate_totals(p_estimate_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal_materials DECIMAL(12, 2);
    v_subtotal_labor DECIMAL(12, 2);
    v_subtotal DECIMAL(12, 2);
    v_overhead_pct DECIMAL(5, 2);
    v_profit_pct DECIMAL(5, 2);
    v_tax_rate DECIMAL(5, 4);
    v_discount_amt DECIMAL(12, 2);
    v_overhead_amt DECIMAL(12, 2);
    v_profit_amt DECIMAL(12, 2);
    v_tax_amt DECIMAL(12, 2);
    v_total DECIMAL(12, 2);
BEGIN
    -- Get current settings
    SELECT overhead_percentage, profit_percentage, tax_rate, COALESCE(discount_amount, 0)
    INTO v_overhead_pct, v_profit_pct, v_tax_rate, v_discount_amt
    FROM estimates WHERE id = p_estimate_id;

    -- Calculate subtotals from line items
    SELECT
        COALESCE(SUM(CASE WHEN is_included THEN material_cost ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN is_included THEN labor_cost ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN is_included THEN extended_price ELSE 0 END), 0)
    INTO v_subtotal_materials, v_subtotal_labor, v_subtotal
    FROM estimate_line_items
    WHERE estimate_id = p_estimate_id
    AND deleted_at IS NULL;

    -- Calculate O&P
    v_overhead_amt := ROUND((v_subtotal * v_overhead_pct / 100)::numeric, 2);
    v_profit_amt := ROUND((v_subtotal * v_profit_pct / 100)::numeric, 2);

    -- Calculate tax
    v_tax_amt := ROUND(((v_subtotal + v_overhead_amt + v_profit_amt - v_discount_amt) * v_tax_rate)::numeric, 2);

    -- Calculate total
    v_total := v_subtotal + v_overhead_amt + v_profit_amt - v_discount_amt + v_tax_amt;

    -- Update estimate
    UPDATE estimates
    SET
        subtotal_materials = v_subtotal_materials,
        subtotal_labor = v_subtotal_labor,
        subtotal = v_subtotal,
        overhead_amount = v_overhead_amt,
        profit_amount = v_profit_amt,
        tax_amount = v_tax_amt,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_estimate_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-recalculate estimate totals
CREATE OR REPLACE FUNCTION trigger_recalculate_estimate()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_estimate_totals(OLD.estimate_id);
    ELSE
        PERFORM recalculate_estimate_totals(NEW.estimate_id);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER estimate_line_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON estimate_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_estimate();

-- Update job contract amount when estimate accepted
CREATE OR REPLACE FUNCTION update_job_on_estimate_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
        UPDATE jobs
        SET
            contract_amount = NEW.total_amount,
            contract_signed = true,
            contract_signed_date = CURRENT_DATE,
            status = CASE WHEN status IN ('lead', 'quoted', 'negotiating') THEN 'sold' ELSE status END,
            date_sold = CASE WHEN date_sold IS NULL THEN CURRENT_DATE ELSE date_sold END,
            updated_at = NOW()
        WHERE id = NEW.job_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER estimates_update_job_on_accept
    AFTER UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_job_on_estimate_accepted();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE estimates IS 'Estimates for jobs - supports versions, supplements, change orders';
COMMENT ON TABLE estimate_categories IS 'Categories/sections for organizing line items';
COMMENT ON TABLE estimate_line_items IS 'Individual line items within estimates';
COMMENT ON TABLE estimate_templates IS 'Reusable estimate templates';

COMMENT ON COLUMN estimates.rcv_total IS 'Insurance RCV - Replacement Cost Value';
COMMENT ON COLUMN estimates.acv_total IS 'Insurance ACV - Actual Cash Value';
COMMENT ON COLUMN estimate_line_items.extended_price IS 'Computed: quantity * unit_price';
