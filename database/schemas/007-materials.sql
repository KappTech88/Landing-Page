-- =====================================================
-- 007-materials.sql
-- Materials: Suppliers, Orders, Inventory
-- =====================================================

-- =====================================================
-- SUPPLIERS TABLE
-- =====================================================
-- Material suppliers (ABC Supply, SRS, Beacon, etc.)

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Supplier Info
    supplier_name VARCHAR(255) NOT NULL,
    supplier_code VARCHAR(30),
    supplier_type VARCHAR(50) DEFAULT 'distributor', -- distributor, manufacturer, retailer

    -- Contact
    primary_contact_name VARCHAR(100),
    primary_contact_phone VARCHAR(20),
    primary_contact_email VARCHAR(255),
    main_phone VARCHAR(20),
    fax VARCHAR(20),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),

    -- Account
    account_number VARCHAR(50),
    credit_limit DECIMAL(12, 2),
    payment_terms VARCHAR(50), -- net_30, net_60, cod
    tax_exempt BOOLEAN DEFAULT false,
    tax_exempt_number VARCHAR(50),

    -- Products
    product_categories TEXT[], -- ['shingles', 'underlayment', 'gutters']
    brands_carried TEXT[], -- ['GAF', 'Owens Corning']

    -- Delivery
    offers_delivery BOOLEAN DEFAULT true,
    delivery_fee DECIMAL(8, 2),
    free_delivery_minimum DECIMAL(10, 2),
    typical_lead_time_days INTEGER DEFAULT 1,

    -- Ratings
    price_rating INTEGER, -- 1-5
    service_rating INTEGER,
    delivery_rating INTEGER,
    is_preferred BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, supplier_code)
);

CREATE INDEX idx_suppliers_organization ON suppliers(organization_id);
CREATE INDEX idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX idx_suppliers_preferred ON suppliers(is_preferred) WHERE is_preferred = true;
CREATE INDEX idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;
CREATE INDEX idx_suppliers_deleted ON suppliers(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MATERIAL ORDERS TABLE
-- =====================================================
-- Orders placed with suppliers

CREATE TABLE material_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Order Identification
    order_number VARCHAR(50) UNIQUE NOT NULL, -- MO-2024-00001
    po_number VARCHAR(50), -- Our PO
    supplier_order_number VARCHAR(100), -- Supplier's reference

    -- Order Type
    order_type VARCHAR(30) DEFAULT 'standard', -- standard, rush, will_call, special

    -- Dates
    order_date DATE DEFAULT CURRENT_DATE,
    requested_delivery_date DATE,
    confirmed_delivery_date DATE,
    delivery_time_window VARCHAR(50), -- "7AM-9AM", "Morning"

    -- Delivery Location
    delivery_type VARCHAR(30) DEFAULT 'job_site', -- job_site, warehouse, will_call
    delivery_address TEXT,
    delivery_instructions TEXT,
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
    -- draft, submitted, confirmed, shipped, delivered, partial, cancelled

    -- Delivery
    shipped_date DATE,
    delivered_date DATE,
    received_by VARCHAR(100),
    tracking_number VARCHAR(100),

    -- Verification
    delivery_verified BOOLEAN DEFAULT false,
    delivery_verified_by UUID REFERENCES users(id),
    items_match_order BOOLEAN,
    damage_reported BOOLEAN DEFAULT false,
    damage_notes TEXT,

    -- Payment
    payment_status VARCHAR(30) DEFAULT 'unpaid', -- unpaid, partial, paid
    payment_date DATE,

    -- Notes
    order_notes TEXT,
    internal_notes TEXT,

    -- Created By
    created_by UUID REFERENCES users(id),
    ordered_by UUID REFERENCES users(id),

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_order_status CHECK (status IN (
        'draft', 'submitted', 'confirmed', 'processing', 'shipped',
        'delivered', 'partial', 'cancelled', 'back_ordered'
    ))
);

CREATE INDEX idx_material_orders_job ON material_orders(job_id);
CREATE INDEX idx_material_orders_supplier ON material_orders(supplier_id);
CREATE INDEX idx_material_orders_org ON material_orders(organization_id);
CREATE INDEX idx_material_orders_number ON material_orders(order_number);
CREATE INDEX idx_material_orders_status ON material_orders(status);
CREATE INDEX idx_material_orders_delivery_date ON material_orders(confirmed_delivery_date);
CREATE INDEX idx_material_orders_deleted ON material_orders(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER material_orders_updated_at
    BEFORE UPDATE ON material_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MATERIAL ORDER ITEMS TABLE
-- =====================================================
-- Items in material orders

CREATE TABLE material_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_order_id UUID NOT NULL REFERENCES material_orders(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Line Number
    line_number INTEGER NOT NULL,

    -- Product Info
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    manufacturer VARCHAR(100),
    color VARCHAR(100),

    -- Category
    category VARCHAR(50), -- shingles, underlayment, flashing, ventilation

    -- Quantity
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_received DECIMAL(10, 2) DEFAULT 0.00,
    quantity_backordered DECIMAL(10, 2) DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL, -- SQ, BDL, PC, ROL, EA

    -- Pricing
    unit_price DECIMAL(10, 4) NOT NULL,
    extended_price DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity_ordered * unit_price)::numeric, 2)
    ) STORED,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(material_order_id, line_number)
);

CREATE INDEX idx_material_order_items_order ON material_order_items(material_order_id);
CREATE INDEX idx_material_order_items_org ON material_order_items(organization_id);
CREATE INDEX idx_material_order_items_product ON material_order_items(product_code);

CREATE TRIGGER material_order_items_updated_at
    BEFORE UPDATE ON material_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PRODUCT CATALOG TABLE
-- =====================================================
-- Frequently used products

CREATE TABLE product_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Product Info
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    manufacturer VARCHAR(100),
    brand VARCHAR(100),

    -- Category
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),

    -- Pricing
    default_unit VARCHAR(20) NOT NULL,
    default_unit_price DECIMAL(10, 4),
    cost_price DECIMAL(10, 4),

    -- Description
    description TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,

    -- Supplier
    preferred_supplier_id UUID REFERENCES suppliers(id),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, product_code)
);

CREATE INDEX idx_product_catalog_org ON product_catalog(organization_id);
CREATE INDEX idx_product_catalog_category ON product_catalog(category);
CREATE INDEX idx_product_catalog_manufacturer ON product_catalog(manufacturer);
CREATE INDEX idx_product_catalog_active ON product_catalog(is_active) WHERE is_active = true;
CREATE INDEX idx_product_catalog_deleted ON product_catalog(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER product_catalog_updated_at
    BEFORE UPDATE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create material order for job
CREATE OR REPLACE FUNCTION create_material_order(
    p_job_id UUID,
    p_supplier_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR(50);
    v_job RECORD;
BEGIN
    SELECT * INTO v_job FROM jobs WHERE id = p_job_id;

    -- Generate order number
    v_order_number := 'MO-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
        LPAD((SELECT COUNT(*) + 1 FROM material_orders WHERE organization_id = v_job.organization_id)::TEXT, 5, '0');

    INSERT INTO material_orders (
        organization_id,
        job_id,
        supplier_id,
        order_number,
        delivery_address,
        delivery_contact_name,
        delivery_contact_phone,
        created_by
    ) VALUES (
        v_job.organization_id,
        p_job_id,
        p_supplier_id,
        v_order_number,
        v_job.service_address,
        v_job.customer_name,
        v_job.customer_phone,
        p_created_by
    )
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Recalculate order totals
CREATE OR REPLACE FUNCTION recalculate_order_totals(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4) := 0.0000; -- Could get from org settings
    v_delivery DECIMAL(8, 2);
    v_discount DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(extended_price), 0)
    INTO v_subtotal
    FROM material_order_items
    WHERE material_order_id = p_order_id;

    SELECT COALESCE(delivery_fee, 0), COALESCE(discount_amount, 0)
    INTO v_delivery, v_discount
    FROM material_orders WHERE id = p_order_id;

    UPDATE material_orders
    SET
        subtotal = v_subtotal,
        tax_amount = ROUND((v_subtotal * v_tax_rate)::numeric, 2),
        total_amount = v_subtotal + ROUND((v_subtotal * v_tax_rate)::numeric, 2) + v_delivery - v_discount,
        updated_at = NOW()
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order totals
CREATE OR REPLACE FUNCTION trigger_recalculate_order()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_order_totals(COALESCE(NEW.material_order_id, OLD.material_order_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_order_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON material_order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_order();

-- Update job material costs
CREATE OR REPLACE FUNCTION update_job_material_costs(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE jobs
    SET
        material_cost = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM material_orders
            WHERE job_id = p_job_id
            AND status NOT IN ('cancelled', 'draft')
            AND deleted_at IS NULL
        ),
        actual_cost = COALESCE((
            SELECT SUM(total_amount) FROM material_orders
            WHERE job_id = p_job_id AND status NOT IN ('cancelled', 'draft') AND deleted_at IS NULL
        ), 0) + labor_cost,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job costs on order status change
CREATE OR REPLACE FUNCTION trigger_update_job_materials()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('confirmed', 'delivered') OR OLD.status IN ('confirmed', 'delivered') THEN
        PERFORM update_job_material_costs(NEW.job_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_orders_update_job
    AFTER UPDATE ON material_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_job_materials();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE suppliers IS 'Material suppliers (ABC Supply, SRS, Beacon, etc.)';
COMMENT ON TABLE material_orders IS 'Material orders for jobs';
COMMENT ON TABLE material_order_items IS 'Line items in material orders';
COMMENT ON TABLE product_catalog IS 'Frequently used products catalog';
