-- =====================================================
-- 011-production-pricing.sql
-- Production & Pricing: Xactimate Items, Macros,
-- Work Order Pricing, Vendor Pricing
-- =====================================================

-- =====================================================
-- XACTIMATE CATEGORIES TABLE
-- =====================================================
-- Categories for organizing Xactimate line items

CREATE TABLE xactimate_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Category Info
    category_code VARCHAR(20) NOT NULL, -- RFG, SID, INT, etc.
    category_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Parent for subcategories
    parent_category_id UUID REFERENCES xactimate_categories(id),

    -- Display
    sort_order INTEGER DEFAULT 0,
    icon VARCHAR(50),
    color_code VARCHAR(7),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System categories can't be deleted

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, category_code)
);

CREATE INDEX idx_xactimate_categories_org ON xactimate_categories(organization_id);
CREATE INDEX idx_xactimate_categories_parent ON xactimate_categories(parent_category_id);
CREATE INDEX idx_xactimate_categories_code ON xactimate_categories(category_code);
CREATE INDEX idx_xactimate_categories_active ON xactimate_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_xactimate_categories_deleted ON xactimate_categories(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER xactimate_categories_updated_at
    BEFORE UPDATE ON xactimate_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- XACTIMATE LINE ITEMS TABLE
-- =====================================================
-- Master list of Xactimate line items with pricing

CREATE TABLE xactimate_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- ITEM IDENTIFICATION
    -- ===================
    item_code VARCHAR(50) NOT NULL, -- Xactimate code: RFG LAMI<, RFG FELT15, etc.
    selector_code VARCHAR(20), -- Selector if applicable
    category_id UUID REFERENCES xactimate_categories(id),

    -- ===================
    -- DESCRIPTION
    -- ===================
    description VARCHAR(500) NOT NULL, -- Full Xactimate description
    short_description VARCHAR(100), -- Abbreviated version
    notes TEXT, -- Internal notes about this item

    -- ===================
    -- UNIT OF MEASURE
    -- ===================
    unit VARCHAR(20) NOT NULL DEFAULT 'SF',
    -- Common units: SF (sq ft), SQ (square=100sf), LF (linear ft),
    -- EA (each), HR (hour), SY (sq yard), CF (cubic ft),
    -- MO (month), DA (day), WK (week)

    unit_description VARCHAR(50), -- "Square Foot", "Each", etc.

    -- ===================
    -- PRICING BREAKDOWN
    -- ===================
    -- Base unit price (total)
    unit_price DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,

    -- Component breakdown
    material_price DECIMAL(12, 4) DEFAULT 0.0000,
    labor_price DECIMAL(12, 4) DEFAULT 0.0000,
    equipment_price DECIMAL(12, 4) DEFAULT 0.0000,

    -- Labor details
    labor_hours DECIMAL(8, 4) DEFAULT 0.0000, -- Hours per unit
    labor_rate DECIMAL(10, 2), -- Hourly rate used for calculation
    labor_minimum DECIMAL(8, 2), -- Minimum labor charge

    -- ===================
    -- COVERAGE & WASTE
    -- ===================
    coverage_per_unit DECIMAL(10, 4), -- How much area one unit covers
    waste_factor DECIMAL(5, 2) DEFAULT 0.00, -- Default waste percentage

    -- ===================
    -- DEPRECIATION (Insurance)
    -- ===================
    useful_life_years INTEGER, -- For depreciation calculation
    depreciation_type VARCHAR(30), -- straight_line, declining_balance
    default_depreciation_percent DECIMAL(5, 2),

    -- ===================
    -- PRICING SOURCE
    -- ===================
    price_source VARCHAR(30) DEFAULT 'manual',
    -- manual, xactimate_import, supplier, calculated

    price_list_region VARCHAR(50), -- TX, CA, National, etc.
    price_effective_date DATE,
    price_expiration_date DATE,

    -- ===================
    -- CLASSIFICATION
    -- ===================
    trade_type VARCHAR(50), -- roofing, siding, interior, exterior, etc.
    work_type VARCHAR(50), -- install, repair, remove, replace

    -- Tags for filtering
    tags TEXT[],

    -- ===================
    -- STATUS
    -- ===================
    is_active BOOLEAN DEFAULT true,
    is_taxable BOOLEAN DEFAULT true,
    is_o_and_p_eligible BOOLEAN DEFAULT true, -- Include in O&P calculations

    -- ===================
    -- VENDOR LINKAGE
    -- ===================
    preferred_supplier_id UUID REFERENCES suppliers(id),
    preferred_subcontractor_id UUID REFERENCES crews(id), -- Subcontractor crews

    -- ===================
    -- METADATA
    -- ===================
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Store original Xactimate data if imported
    xactimate_data JSONB,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, item_code)
);

-- Indexes
CREATE INDEX idx_xactimate_line_items_org ON xactimate_line_items(organization_id);
CREATE INDEX idx_xactimate_line_items_code ON xactimate_line_items(item_code);
CREATE INDEX idx_xactimate_line_items_category ON xactimate_line_items(category_id);
CREATE INDEX idx_xactimate_line_items_trade ON xactimate_line_items(trade_type);
CREATE INDEX idx_xactimate_line_items_active ON xactimate_line_items(is_active) WHERE is_active = true;
CREATE INDEX idx_xactimate_line_items_tags ON xactimate_line_items USING GIN (tags);
CREATE INDEX idx_xactimate_line_items_deleted ON xactimate_line_items(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER xactimate_line_items_updated_at
    BEFORE UPDATE ON xactimate_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRICING MACROS TABLE
-- =====================================================
-- Macros are groups of line items that auto-calculate together

CREATE TABLE pricing_macros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- MACRO IDENTIFICATION
    -- ===================
    macro_code VARCHAR(50) NOT NULL,
    macro_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- ===================
    -- CATEGORIZATION
    -- ===================
    category VARCHAR(100), -- Roofing, Siding, Complete Roof System
    trade_type VARCHAR(50), -- roofing, siding, gutters, etc.

    -- ===================
    -- INPUT REQUIREMENTS
    -- ===================
    -- What measurements are needed to calculate this macro
    required_inputs JSONB DEFAULT '[
        {"name": "total_squares", "label": "Total Squares", "unit": "SQ", "type": "number"},
        {"name": "ridge_length", "label": "Ridge Length", "unit": "LF", "type": "number"},
        {"name": "valley_length", "label": "Valley Length", "unit": "LF", "type": "number"},
        {"name": "hip_length", "label": "Hip Length", "unit": "LF", "type": "number"},
        {"name": "eave_length", "label": "Eave/Starter Length", "unit": "LF", "type": "number"},
        {"name": "rake_length", "label": "Rake Length", "unit": "LF", "type": "number"},
        {"name": "step_flashing_length", "label": "Step Flashing Length", "unit": "LF", "type": "number"},
        {"name": "pipe_boots", "label": "Pipe Boots", "unit": "EA", "type": "number"},
        {"name": "chimney_count", "label": "Chimneys", "unit": "EA", "type": "number"},
        {"name": "skylight_count", "label": "Skylights", "unit": "EA", "type": "number"}
    ]'::jsonb,

    -- EagleView / Measurement Integration
    measurement_service_mapping JSONB, -- Maps measurement service fields to required_inputs

    -- ===================
    -- PRICING CALCULATION
    -- ===================
    -- Base pricing (before line item calculation)
    base_price DECIMAL(12, 2) DEFAULT 0.00,

    -- Calculated totals (updated when items change)
    calculated_material_total DECIMAL(12, 2) DEFAULT 0.00,
    calculated_labor_total DECIMAL(12, 2) DEFAULT 0.00,
    calculated_total DECIMAL(12, 2) DEFAULT 0.00,

    -- Markup / Adjustment
    markup_type VARCHAR(20) DEFAULT 'percentage', -- percentage, flat
    markup_value DECIMAL(8, 2) DEFAULT 0.00,

    -- ===================
    -- STATUS
    -- ===================
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false, -- Template macros can be cloned

    -- ===================
    -- METADATA
    -- ===================
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, macro_code)
);

CREATE INDEX idx_pricing_macros_org ON pricing_macros(organization_id);
CREATE INDEX idx_pricing_macros_code ON pricing_macros(macro_code);
CREATE INDEX idx_pricing_macros_category ON pricing_macros(category);
CREATE INDEX idx_pricing_macros_trade ON pricing_macros(trade_type);
CREATE INDEX idx_pricing_macros_active ON pricing_macros(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_macros_template ON pricing_macros(is_template) WHERE is_template = true;
CREATE INDEX idx_pricing_macros_deleted ON pricing_macros(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER pricing_macros_updated_at
    BEFORE UPDATE ON pricing_macros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRICING MACRO ITEMS TABLE
-- =====================================================
-- Line items that belong to a macro

CREATE TABLE pricing_macro_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    macro_id UUID NOT NULL REFERENCES pricing_macros(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- LINE ITEM REFERENCE
    -- ===================
    xactimate_item_id UUID REFERENCES xactimate_line_items(id) ON DELETE SET NULL,

    -- Denormalized item info (in case item is deleted)
    item_code VARCHAR(50) NOT NULL,
    description VARCHAR(500) NOT NULL,
    unit VARCHAR(20) NOT NULL,

    -- ===================
    -- QUANTITY CALCULATION
    -- ===================
    -- Fixed quantity or calculated from inputs
    quantity_type VARCHAR(20) DEFAULT 'fixed', -- fixed, calculated, per_square
    fixed_quantity DECIMAL(12, 4) DEFAULT 1.0000,

    -- Formula for calculated quantities
    -- Uses input field names: "total_squares * 1.1" or "ridge_length + hip_length"
    quantity_formula VARCHAR(255),

    -- Which input field this item maps to (simple mapping)
    input_field_name VARCHAR(100), -- Maps to required_inputs

    -- Multiplier applied to input value
    quantity_multiplier DECIMAL(8, 4) DEFAULT 1.0000,

    -- Waste factor override (if different from item default)
    waste_factor_override DECIMAL(5, 2),

    -- ===================
    -- PRICING OVERRIDE
    -- ===================
    -- Override the item's default pricing for this macro
    price_override DECIMAL(12, 4),
    material_override DECIMAL(12, 4),
    labor_override DECIMAL(12, 4),

    -- ===================
    -- DISPLAY
    -- ===================
    sort_order INTEGER DEFAULT 0,
    is_included BOOLEAN DEFAULT true, -- Include in calculations
    is_optional BOOLEAN DEFAULT false, -- User can toggle this on/off

    -- Group within macro
    group_name VARCHAR(100), -- "Shingles", "Accessories", "Labor"

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(macro_id, item_code)
);

CREATE INDEX idx_pricing_macro_items_macro ON pricing_macro_items(macro_id);
CREATE INDEX idx_pricing_macro_items_org ON pricing_macro_items(organization_id);
CREATE INDEX idx_pricing_macro_items_item ON pricing_macro_items(xactimate_item_id);
CREATE INDEX idx_pricing_macro_items_sort ON pricing_macro_items(macro_id, sort_order);

CREATE TRIGGER pricing_macro_items_updated_at
    BEFORE UPDATE ON pricing_macro_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- WORK ORDER PRICING TABLE
-- =====================================================
-- Pre-configured pricing for work orders (not Xactimate based)

CREATE TABLE work_order_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- ITEM IDENTIFICATION
    -- ===================
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- ===================
    -- CATEGORIZATION
    -- ===================
    category VARCHAR(100) NOT NULL, -- Roofing, Repairs, Maintenance
    subcategory VARCHAR(100),
    trade_type VARCHAR(50),

    -- ===================
    -- UNIT & PRICING
    -- ===================
    unit VARCHAR(20) NOT NULL DEFAULT 'EA',
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- Cost breakdown
    material_cost DECIMAL(12, 2) DEFAULT 0.00,
    labor_cost DECIMAL(12, 2) DEFAULT 0.00,
    labor_hours DECIMAL(8, 2),

    -- Pricing type
    pricing_type VARCHAR(30) DEFAULT 'flat', -- flat, per_unit, range
    min_price DECIMAL(12, 2), -- For range pricing
    max_price DECIMAL(12, 2),

    -- ===================
    -- VENDOR LINKAGE
    -- ===================
    preferred_supplier_id UUID REFERENCES suppliers(id),
    preferred_subcontractor_id UUID REFERENCES crews(id),

    -- ===================
    -- STATUS
    -- ===================
    is_active BOOLEAN DEFAULT true,
    is_taxable BOOLEAN DEFAULT true,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, item_code)
);

CREATE INDEX idx_work_order_pricing_org ON work_order_pricing(organization_id);
CREATE INDEX idx_work_order_pricing_code ON work_order_pricing(item_code);
CREATE INDEX idx_work_order_pricing_category ON work_order_pricing(category);
CREATE INDEX idx_work_order_pricing_active ON work_order_pricing(is_active) WHERE is_active = true;
CREATE INDEX idx_work_order_pricing_deleted ON work_order_pricing(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER work_order_pricing_updated_at
    BEFORE UPDATE ON work_order_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VENDOR LABOR RATES TABLE
-- =====================================================
-- Labor pricing for subcontractors (crews with is_subcontractor=true)

CREATE TABLE vendor_labor_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,

    -- ===================
    -- RATE IDENTIFICATION
    -- ===================
    rate_name VARCHAR(100) NOT NULL,
    trade_type VARCHAR(50) NOT NULL, -- roofing, siding, gutters
    work_type VARCHAR(50), -- install, repair, tear_off

    -- ===================
    -- PRICING
    -- ===================
    rate_type VARCHAR(30) NOT NULL DEFAULT 'per_square',
    -- per_square, per_linear_foot, hourly, per_job, per_unit

    rate_amount DECIMAL(10, 2) NOT NULL,
    minimum_charge DECIMAL(10, 2),

    -- Additional rates
    overtime_rate DECIMAL(10, 2),
    weekend_rate DECIMAL(10, 2),

    -- ===================
    -- SCOPE
    -- ===================
    includes_materials BOOLEAN DEFAULT false,
    includes_dump_fees BOOLEAN DEFAULT false,
    includes_permits BOOLEAN DEFAULT false,

    scope_notes TEXT, -- What's included/excluded

    -- ===================
    -- STATUS
    -- ===================
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, crew_id, rate_name)
);

CREATE INDEX idx_vendor_labor_rates_org ON vendor_labor_rates(organization_id);
CREATE INDEX idx_vendor_labor_rates_crew ON vendor_labor_rates(crew_id);
CREATE INDEX idx_vendor_labor_rates_trade ON vendor_labor_rates(trade_type);
CREATE INDEX idx_vendor_labor_rates_active ON vendor_labor_rates(is_active) WHERE is_active = true;
CREATE INDEX idx_vendor_labor_rates_deleted ON vendor_labor_rates(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER vendor_labor_rates_updated_at
    BEFORE UPDATE ON vendor_labor_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VENDOR MATERIAL PRICING TABLE
-- =====================================================
-- Material pricing from specific suppliers

CREATE TABLE vendor_material_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,

    -- ===================
    -- PRODUCT IDENTIFICATION
    -- ===================
    product_code VARCHAR(100) NOT NULL, -- Supplier's SKU
    product_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(100),
    product_line VARCHAR(100), -- GAF Timberline, OC Duration
    color VARCHAR(100),

    -- ===================
    -- CATEGORIZATION
    -- ===================
    category VARCHAR(100) NOT NULL, -- Shingles, Underlayment, Flashing
    subcategory VARCHAR(100),

    -- ===================
    -- UNIT & PRICING
    -- ===================
    unit VARCHAR(20) NOT NULL, -- SQ, BDL, EA, ROL
    unit_price DECIMAL(10, 4) NOT NULL,

    -- Volume discounts
    tier1_quantity DECIMAL(10, 2),
    tier1_price DECIMAL(10, 4),
    tier2_quantity DECIMAL(10, 2),
    tier2_price DECIMAL(10, 4),
    tier3_quantity DECIMAL(10, 2),
    tier3_price DECIMAL(10, 4),

    -- ===================
    -- MAPPING
    -- ===================
    -- Link to our Xactimate items
    xactimate_item_id UUID REFERENCES xactimate_line_items(id),

    -- ===================
    -- STATUS
    -- ===================
    is_active BOOLEAN DEFAULT true,
    in_stock BOOLEAN DEFAULT true,
    lead_time_days INTEGER,

    price_effective_date DATE DEFAULT CURRENT_DATE,
    price_expiration_date DATE,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, supplier_id, product_code)
);

CREATE INDEX idx_vendor_material_pricing_org ON vendor_material_pricing(organization_id);
CREATE INDEX idx_vendor_material_pricing_supplier ON vendor_material_pricing(supplier_id);
CREATE INDEX idx_vendor_material_pricing_product ON vendor_material_pricing(product_code);
CREATE INDEX idx_vendor_material_pricing_category ON vendor_material_pricing(category);
CREATE INDEX idx_vendor_material_pricing_xactimate ON vendor_material_pricing(xactimate_item_id);
CREATE INDEX idx_vendor_material_pricing_active ON vendor_material_pricing(is_active) WHERE is_active = true;
CREATE INDEX idx_vendor_material_pricing_deleted ON vendor_material_pricing(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER vendor_material_pricing_updated_at
    BEFORE UPDATE ON vendor_material_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MEASUREMENT SERVICE IMPORTS TABLE
-- =====================================================
-- Store imported measurements from EagleView, etc.

CREATE TABLE measurement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- ===================
    -- IMPORT SOURCE
    -- ===================
    service_name VARCHAR(50) NOT NULL, -- eagleview, hover, gaf_quickmeasure
    report_id VARCHAR(100), -- Service's report ID
    report_date DATE,

    -- ===================
    -- PROPERTY INFO
    -- ===================
    property_address TEXT,

    -- ===================
    -- ROOF MEASUREMENTS
    -- ===================
    total_squares DECIMAL(10, 2),
    total_area_sf DECIMAL(12, 2),
    predominant_pitch VARCHAR(20), -- "6/12", "8/12"

    -- Ridge, Hip, Valley, Eave, Rake lengths
    ridge_length_lf DECIMAL(10, 2),
    hip_length_lf DECIMAL(10, 2),
    valley_length_lf DECIMAL(10, 2),
    eave_length_lf DECIMAL(10, 2),
    rake_length_lf DECIMAL(10, 2),

    -- Flashings
    step_flashing_lf DECIMAL(10, 2),
    headwall_flashing_lf DECIMAL(10, 2),

    -- Penetrations
    pipe_boot_count INTEGER DEFAULT 0,
    chimney_count INTEGER DEFAULT 0,
    skylight_count INTEGER DEFAULT 0,
    vent_count INTEGER DEFAULT 0,

    -- Waste factors
    suggested_waste_percent DECIMAL(5, 2),

    -- ===================
    -- FACET DETAILS
    -- ===================
    -- Detailed breakdown by roof facet
    facets_data JSONB DEFAULT '[]'::jsonb,

    -- ===================
    -- RAW DATA
    -- ===================
    raw_import_data JSONB, -- Store full service response

    -- ===================
    -- STATUS
    -- ===================
    import_status VARCHAR(30) DEFAULT 'pending',
    -- pending, processing, complete, failed

    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    imported_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_measurement_imports_org ON measurement_imports(organization_id);
CREATE INDEX idx_measurement_imports_job ON measurement_imports(job_id);
CREATE INDEX idx_measurement_imports_service ON measurement_imports(service_name);
CREATE INDEX idx_measurement_imports_status ON measurement_imports(import_status);
CREATE INDEX idx_measurement_imports_date ON measurement_imports(created_at DESC);

CREATE TRIGGER measurement_imports_updated_at
    BEFORE UPDATE ON measurement_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate macro totals from items
CREATE OR REPLACE FUNCTION recalculate_macro_totals(p_macro_id UUID)
RETURNS VOID AS $$
DECLARE
    v_material_total DECIMAL(12, 2) := 0;
    v_labor_total DECIMAL(12, 2) := 0;
    v_total DECIMAL(12, 2) := 0;
BEGIN
    -- Calculate from items using default quantity of 1
    -- Actual calculation happens when estimate is created with real quantities
    SELECT
        COALESCE(SUM(
            CASE WHEN pmi.is_included THEN
                COALESCE(pmi.material_override, xli.material_price) * COALESCE(pmi.fixed_quantity, 1)
            ELSE 0 END
        ), 0),
        COALESCE(SUM(
            CASE WHEN pmi.is_included THEN
                COALESCE(pmi.labor_override, xli.labor_price) * COALESCE(pmi.fixed_quantity, 1)
            ELSE 0 END
        ), 0),
        COALESCE(SUM(
            CASE WHEN pmi.is_included THEN
                COALESCE(pmi.price_override, xli.unit_price) * COALESCE(pmi.fixed_quantity, 1)
            ELSE 0 END
        ), 0)
    INTO v_material_total, v_labor_total, v_total
    FROM pricing_macro_items pmi
    LEFT JOIN xactimate_line_items xli ON xli.id = pmi.xactimate_item_id
    WHERE pmi.macro_id = p_macro_id;

    UPDATE pricing_macros
    SET
        calculated_material_total = v_material_total,
        calculated_labor_total = v_labor_total,
        calculated_total = v_total,
        updated_at = NOW()
    WHERE id = p_macro_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate macro when items change
CREATE OR REPLACE FUNCTION trigger_recalculate_macro()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_macro_totals(COALESCE(NEW.macro_id, OLD.macro_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_macro_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON pricing_macro_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_macro();

-- Calculate estimate from macro and measurements
CREATE OR REPLACE FUNCTION calculate_macro_estimate(
    p_macro_id UUID,
    p_measurements JSONB -- {"total_squares": 25, "ridge_length": 60, ...}
)
RETURNS TABLE (
    item_code VARCHAR(50),
    description VARCHAR(500),
    unit VARCHAR(20),
    quantity DECIMAL(12, 4),
    unit_price DECIMAL(12, 4),
    material_price DECIMAL(12, 4),
    labor_price DECIMAL(12, 4),
    extended_price DECIMAL(12, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pmi.item_code,
        pmi.description,
        pmi.unit,
        -- Calculate quantity based on type
        CASE pmi.quantity_type
            WHEN 'fixed' THEN pmi.fixed_quantity
            WHEN 'calculated' THEN
                CASE
                    WHEN pmi.input_field_name IS NOT NULL THEN
                        (p_measurements->>pmi.input_field_name)::DECIMAL * pmi.quantity_multiplier
                    ELSE pmi.fixed_quantity
                END
            WHEN 'per_square' THEN
                (p_measurements->>'total_squares')::DECIMAL * pmi.quantity_multiplier
            ELSE pmi.fixed_quantity
        END * (1 + COALESCE(pmi.waste_factor_override, xli.waste_factor, 0) / 100) as quantity,
        COALESCE(pmi.price_override, xli.unit_price) as unit_price,
        COALESCE(pmi.material_override, xli.material_price) as material_price,
        COALESCE(pmi.labor_override, xli.labor_price) as labor_price,
        ROUND((
            CASE pmi.quantity_type
                WHEN 'fixed' THEN pmi.fixed_quantity
                WHEN 'calculated' THEN
                    CASE
                        WHEN pmi.input_field_name IS NOT NULL THEN
                            (p_measurements->>pmi.input_field_name)::DECIMAL * pmi.quantity_multiplier
                        ELSE pmi.fixed_quantity
                    END
                WHEN 'per_square' THEN
                    (p_measurements->>'total_squares')::DECIMAL * pmi.quantity_multiplier
                ELSE pmi.fixed_quantity
            END * (1 + COALESCE(pmi.waste_factor_override, xli.waste_factor, 0) / 100)
            * COALESCE(pmi.price_override, xli.unit_price)
        )::NUMERIC, 2) as extended_price
    FROM pricing_macro_items pmi
    LEFT JOIN xactimate_line_items xli ON xli.id = pmi.xactimate_item_id
    WHERE pmi.macro_id = p_macro_id
    AND pmi.is_included = true
    ORDER BY pmi.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Populate estimate line items from macro
CREATE OR REPLACE FUNCTION populate_estimate_from_macro(
    p_estimate_id UUID,
    p_macro_id UUID,
    p_measurements JSONB
)
RETURNS INTEGER AS $$
DECLARE
    v_estimate RECORD;
    v_macro_item RECORD;
    v_line_number INTEGER := 1;
    v_items_created INTEGER := 0;
    v_quantity DECIMAL(12, 4);
    v_unit_price DECIMAL(12, 4);
    v_material_cost DECIMAL(12, 2);
    v_labor_cost DECIMAL(12, 2);
BEGIN
    SELECT * INTO v_estimate FROM estimates WHERE id = p_estimate_id;

    -- Get current max line number
    SELECT COALESCE(MAX(line_number), 0) INTO v_line_number
    FROM estimate_line_items WHERE estimate_id = p_estimate_id AND deleted_at IS NULL;

    FOR v_macro_item IN
        SELECT * FROM calculate_macro_estimate(p_macro_id, p_measurements)
    LOOP
        v_line_number := v_line_number + 1;

        INSERT INTO estimate_line_items (
            estimate_id,
            organization_id,
            line_number,
            item_code,
            description,
            item_type,
            quantity,
            unit,
            unit_price,
            material_cost,
            labor_cost
        ) VALUES (
            p_estimate_id,
            v_estimate.organization_id,
            v_line_number,
            v_macro_item.item_code,
            v_macro_item.description,
            'material_labor',
            v_macro_item.quantity,
            v_macro_item.unit,
            v_macro_item.unit_price,
            ROUND((v_macro_item.material_price * v_macro_item.quantity)::NUMERIC, 2),
            ROUND((v_macro_item.labor_price * v_macro_item.quantity)::NUMERIC, 2)
        );

        v_items_created := v_items_created + 1;
    END LOOP;

    -- Recalculate estimate totals
    PERFORM recalculate_estimate_totals(p_estimate_id);

    RETURN v_items_created;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DEFAULT XACTIMATE CATEGORIES
-- =====================================================

-- Insert default categories (will be org-specific when created)
-- This is a template - actual insertion happens per organization

CREATE OR REPLACE FUNCTION create_default_xactimate_categories(p_organization_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO xactimate_categories (organization_id, category_code, category_name, is_system, sort_order) VALUES
        (p_organization_id, 'RFG', 'Roofing', true, 1),
        (p_organization_id, 'SID', 'Siding', true, 2),
        (p_organization_id, 'GTR', 'Gutters', true, 3),
        (p_organization_id, 'INT', 'Interior', true, 4),
        (p_organization_id, 'EXT', 'Exterior', true, 5),
        (p_organization_id, 'PLM', 'Plumbing', true, 6),
        (p_organization_id, 'ELC', 'Electrical', true, 7),
        (p_organization_id, 'HVC', 'HVAC', true, 8),
        (p_organization_id, 'DRY', 'Drywall', true, 9),
        (p_organization_id, 'PNT', 'Paint', true, 10),
        (p_organization_id, 'FLR', 'Flooring', true, 11),
        (p_organization_id, 'WND', 'Windows', true, 12),
        (p_organization_id, 'DOR', 'Doors', true, 13),
        (p_organization_id, 'FNC', 'Fencing', true, 14),
        (p_organization_id, 'LND', 'Landscaping', true, 15),
        (p_organization_id, 'DMO', 'Demo/Tear Off', true, 16),
        (p_organization_id, 'GEN', 'General/Misc', true, 99)
    ON CONFLICT (organization_id, category_code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UNIT OF MEASURE REFERENCE
-- =====================================================
-- Reference table for standard units

CREATE TABLE IF NOT EXISTS unit_of_measure_reference (
    unit_code VARCHAR(10) PRIMARY KEY,
    unit_name VARCHAR(50) NOT NULL,
    unit_type VARCHAR(30), -- area, length, volume, quantity, time
    description TEXT,
    conversion_factor DECIMAL(12, 6), -- To base unit (SF, LF, EA)
    base_unit VARCHAR(10)
);

INSERT INTO unit_of_measure_reference (unit_code, unit_name, unit_type, description, conversion_factor, base_unit) VALUES
    ('SF', 'Square Foot', 'area', 'Standard area unit', 1.0, 'SF'),
    ('SQ', 'Square', 'area', '100 square feet (roofing)', 100.0, 'SF'),
    ('SY', 'Square Yard', 'area', '9 square feet', 9.0, 'SF'),
    ('LF', 'Linear Foot', 'length', 'Standard length unit', 1.0, 'LF'),
    ('EA', 'Each', 'quantity', 'Individual unit', 1.0, 'EA'),
    ('HR', 'Hour', 'time', 'Labor hour', 1.0, 'HR'),
    ('DA', 'Day', 'time', 'Labor day (8 hours)', 8.0, 'HR'),
    ('WK', 'Week', 'time', 'Labor week (40 hours)', 40.0, 'HR'),
    ('MO', 'Month', 'time', 'Monthly rate', 1.0, 'MO'),
    ('BDL', 'Bundle', 'quantity', 'Bundle (shingles)', 1.0, 'BDL'),
    ('ROL', 'Roll', 'quantity', 'Roll (felt, membrane)', 1.0, 'ROL'),
    ('PC', 'Piece', 'quantity', 'Single piece', 1.0, 'EA'),
    ('GAL', 'Gallon', 'volume', 'Liquid gallon', 1.0, 'GAL'),
    ('CF', 'Cubic Foot', 'volume', 'Cubic foot', 1.0, 'CF'),
    ('CY', 'Cubic Yard', 'volume', '27 cubic feet', 27.0, 'CF'),
    ('TON', 'Ton', 'weight', '2000 pounds', 1.0, 'TON'),
    ('LS', 'Lump Sum', 'quantity', 'Fixed price item', 1.0, 'LS')
ON CONFLICT (unit_code) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE xactimate_categories IS 'Categories for organizing Xactimate line items';
COMMENT ON TABLE xactimate_line_items IS 'Master list of Xactimate line items with pricing';
COMMENT ON TABLE pricing_macros IS 'Grouped line items that calculate together for estimates';
COMMENT ON TABLE pricing_macro_items IS 'Individual line items within a macro';
COMMENT ON TABLE work_order_pricing IS 'Non-Xactimate pricing for work orders';
COMMENT ON TABLE vendor_labor_rates IS 'Labor rates for subcontractors';
COMMENT ON TABLE vendor_material_pricing IS 'Material pricing from suppliers';
COMMENT ON TABLE measurement_imports IS 'Imported measurements from EagleView, etc.';
COMMENT ON TABLE unit_of_measure_reference IS 'Standard units of measure reference';

COMMENT ON FUNCTION calculate_macro_estimate IS 'Calculates line items from macro using measurements';
COMMENT ON FUNCTION populate_estimate_from_macro IS 'Creates estimate line items from macro calculation';
