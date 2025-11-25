-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR CLAIMS RESTORATION CRM
-- Run this entire file in Supabase SQL Editor
-- =====================================================
-- This combines all 8 migration files into one
-- Estimated execution time: 10-15 seconds
-- =====================================================
--
-- ⚠️  IMPORTANT: Run this on a FRESH database only!
--
-- If tables already exist, you will get errors like:
--   "relation 'organizations' already exists"
--
-- To start fresh, run DROP_ALL_TABLES.sql first, then run this file.
--
-- =====================================================

-- ===== Starting Database Setup =====
-- ===== Step 1/8: Organizations, Users, Roles =====

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cube extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- =====================================================
-- ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    business_type VARCHAR(50) DEFAULT 'restoration_contractor',
    company_size VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(20) DEFAULT 'active',
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{
        "branding": {"logo_url": null, "primary_color": "#1e40af", "secondary_color": "#3b82f6"},
        "features": {"ai_tools_enabled": true, "multi_user_enabled": true, "api_access_enabled": false},
        "notifications": {"email_enabled": true, "sms_enabled": false}
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'basic', 'professional', 'enterprise')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial'))
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ROLES TABLE
-- =====================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    is_custom_role BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{
        "claims": {"create": false, "read": false, "update": false, "delete": false},
        "estimates": {"create": false, "read": false, "update": false, "delete": false},
        "invoices": {"create": false, "read": false, "update": false, "delete": false},
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "reports": {"read": false, "export": false},
        "settings": {"read": false, "update": false}
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, name),
    CONSTRAINT valid_role_type CHECK (
        (is_system_role = true AND organization_id IS NULL) OR
        (is_custom_role = true AND organization_id IS NOT NULL)
    )
);

CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_is_system_role ON roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX idx_roles_deleted_at ON roles(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255) GENERATED ALWAYS AS (
        CASE
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL
            THEN first_name || ' ' || last_name
            ELSE COALESCE(first_name, last_name, email)
        END
    ) STORED,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    title VARCHAR(100),
    bio TEXT,
    preferences JSONB DEFAULT '{
        "notifications": {"email": true, "sms": false, "push": true},
        "display": {"theme": "light", "language": "en"}
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    google_workspace_email VARCHAR(255),
    google_refresh_token TEXT,
    google_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

-- =====================================================
-- USER_ORGANIZATION_ROLES
-- =====================================================
CREATE TABLE user_organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id, role_id)
);

CREATE INDEX idx_uor_user_id ON user_organization_roles(user_id);
CREATE INDEX idx_uor_organization_id ON user_organization_roles(organization_id);
CREATE INDEX idx_uor_role_id ON user_organization_roles(role_id);
CREATE INDEX idx_uor_active ON user_organization_roles(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER user_organization_roles_updated_at BEFORE UPDATE ON user_organization_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed system roles
INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES
('super_admin', 'Super Administrator', 'Full system access - Estimate Reliance staff only', true,
    '{"claims": {"create": true, "read": true, "update": true, "delete": true}, "estimates": {"create": true, "read": true, "update": true, "delete": true}, "invoices": {"create": true, "read": true, "update": true, "delete": true}, "users": {"create": true, "read": true, "update": true, "delete": true}, "reports": {"read": true, "export": true}, "settings": {"read": true, "update": true}, "organizations": {"create": true, "read": true, "update": true, "delete": true}}'::jsonb),
('admin', 'Organization Administrator', 'Full access within their organization', true,
    '{"claims": {"create": true, "read": true, "update": true, "delete": true}, "estimates": {"create": true, "read": true, "update": true, "delete": true}, "invoices": {"create": true, "read": true, "update": true, "delete": true}, "users": {"create": true, "read": true, "update": true, "delete": false}, "reports": {"read": true, "export": true}, "settings": {"read": true, "update": true}}'::jsonb),
('contractor', 'Contractor', 'Manage claims and field operations', true,
    '{"claims": {"create": true, "read": true, "update": true, "delete": false}, "estimates": {"create": true, "read": true, "update": true, "delete": false}, "invoices": {"create": false, "read": true, "update": false, "delete": false}, "users": {"create": false, "read": true, "update": false, "delete": false}, "reports": {"read": true, "export": false}, "settings": {"read": true, "update": false}}'::jsonb),
('estimator', 'Estimator', 'Create and manage estimates only', true,
    '{"claims": {"create": false, "read": true, "update": false, "delete": false}, "estimates": {"create": true, "read": true, "update": true, "delete": false}, "invoices": {"create": false, "read": true, "update": false, "delete": false}, "users": {"create": false, "read": false, "update": false, "delete": false}, "reports": {"read": true, "export": true}, "settings": {"read": false, "update": false}}'::jsonb),
('client', 'Client', 'View their own claims only', true,
    '{"claims": {"create": false, "read": true, "update": false, "delete": false}, "estimates": {"create": false, "read": true, "update": false, "delete": false}, "invoices": {"create": false, "read": true, "update": false, "delete": false}, "users": {"create": false, "read": false, "update": false, "delete": false}, "reports": {"read": false, "export": false}, "settings": {"read": true, "update": true}}'::jsonb);

-- ===== Step 2/8: Claims and Properties =====

-- =====================================================
-- CLAIMS TABLE
-- =====================================================
-- Central table tracking restoration projects from initial assessment through completion
-- Multi-tenant: Each claim belongs to an organization

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Claim Identification
    claim_number VARCHAR(50) UNIQUE NOT NULL, -- Insurance company's claim ID
    internal_reference VARCHAR(50), -- Organization's internal tracking number

    -- Ownership & Assignment
    created_by UUID NOT NULL REFERENCES users(id), -- User who created claim (usually admin)
    assigned_contractor_id UUID REFERENCES users(id), -- Contractor assigned to this claim
    assigned_estimator_id UUID REFERENCES users(id), -- Estimator assigned
    client_user_id UUID REFERENCES users(id), -- Property owner (if they have a user account)

    -- Claim Details
    claim_type VARCHAR(50) NOT NULL, -- windstorm, hail, water, fire, mold, storm_damage, etc.
    severity VARCHAR(20) DEFAULT 'moderate', -- minor, moderate, severe, catastrophic
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Status & Workflow
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    -- Workflow: open → assigned → assessment_scheduled → assessment_complete →
    --           estimate_in_progress → estimate_submitted → approved → work_in_progress →
    --           work_complete → final_inspection → closed

    -- Important Dates
    date_of_loss DATE NOT NULL, -- When damage occurred (critical for insurance)
    date_reported DATE DEFAULT CURRENT_DATE, -- When claim was filed
    date_assigned TIMESTAMP WITH TIME ZONE, -- When contractor was assigned
    date_assessment_scheduled TIMESTAMP WITH TIME ZONE,
    date_assessment_completed TIMESTAMP WITH TIME ZONE,
    date_estimate_submitted TIMESTAMP WITH TIME ZONE,
    date_approved TIMESTAMP WITH TIME ZONE,
    date_work_started TIMESTAMP WITH TIME ZONE,
    date_work_completed TIMESTAMP WITH TIME ZONE,
    date_final_inspection TIMESTAMP WITH TIME ZONE,
    date_closed TIMESTAMP WITH TIME ZONE,

    -- Financial
    estimated_total DECIMAL(12, 2), -- Initial damage estimate
    approved_amount DECIMAL(12, 2), -- Insurance approved amount
    supplement_amount DECIMAL(12, 2) DEFAULT 0.00, -- Additional approved supplements
    final_amount DECIMAL(12, 2), -- Final billed amount
    deductible DECIMAL(10, 2), -- Homeowner's deductible

    -- Description & Notes
    description TEXT, -- Brief claim description
    damage_description TEXT, -- Detailed damage assessment
    scope_of_work TEXT, -- Work to be performed
    internal_notes TEXT, -- Private notes (not visible to client)
    client_notes TEXT, -- Notes visible to property owner

    -- Additional Information (Flexible JSONB)
    metadata JSONB DEFAULT '{
        "urgency_factors": [],
        "special_requirements": [],
        "access_restrictions": {},
        "weather_conditions": {}
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_claim_status CHECK (status IN (
        'open', 'assigned', 'assessment_scheduled', 'assessment_complete',
        'estimate_in_progress', 'estimate_submitted', 'approved',
        'work_in_progress', 'work_complete', 'final_inspection',
        'closed', 'cancelled', 'denied'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('minor', 'moderate', 'severe', 'catastrophic')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes for claims (optimized for common queries)
CREATE INDEX idx_claims_organization_id ON claims(organization_id);
CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_assigned_contractor ON claims(assigned_contractor_id);
CREATE INDEX idx_claims_assigned_estimator ON claims(assigned_estimator_id);
CREATE INDEX idx_claims_client_user ON claims(client_user_id);
CREATE INDEX idx_claims_date_of_loss ON claims(date_of_loss);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_deleted_at ON claims(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_claims_priority_status ON claims(priority, status) WHERE deleted_at IS NULL;

-- Full-text search index for claim descriptions
CREATE INDEX idx_claims_search ON claims USING gin(
    to_tsvector('english', coalesce(claim_number, '') || ' ' ||
                          coalesce(description, '') || ' ' ||
                          coalesce(damage_description, ''))
);

CREATE TRIGGER claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROPERTIES TABLE
-- =====================================================
-- Property details for each claim (one-to-one with claims)

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Property Owner Information
    owner_first_name VARCHAR(100),
    owner_last_name VARCHAR(100),
    owner_full_name VARCHAR(255) GENERATED ALWAYS AS (
        CASE
            WHEN owner_first_name IS NOT NULL AND owner_last_name IS NOT NULL
            THEN owner_first_name || ' ' || owner_last_name
            ELSE COALESCE(owner_first_name, owner_last_name, 'Unknown Owner')
        END
    ) STORED,
    owner_email VARCHAR(255),
    owner_phone VARCHAR(20),
    owner_phone_alt VARCHAR(20), -- Alternate contact number

    -- Property Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255), -- Apt, Unit, Suite
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL, -- GA, TN, etc.
    zip_code VARCHAR(10) NOT NULL,
    county VARCHAR(100),

    -- Full address for display/search
    full_address VARCHAR(500) GENERATED ALWAYS AS (
        address_line1 ||
        CASE WHEN address_line2 IS NOT NULL THEN ', ' || address_line2 ELSE '' END ||
        ', ' || city || ', ' || state || ' ' || zip_code
    ) STORED,

    -- GPS Coordinates (for mobile field work)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Property Details
    property_type VARCHAR(50) NOT NULL DEFAULT 'residential', -- residential, commercial, multi_family
    property_subtype VARCHAR(50), -- single_family, condo, townhouse, warehouse, office, etc.
    year_built INTEGER,
    square_footage INTEGER,
    stories INTEGER DEFAULT 1,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1), -- 2.5 bathrooms
    garage_spaces INTEGER,

    -- Construction Details
    roof_type VARCHAR(50), -- asphalt_shingle, metal, tile, flat, etc.
    roof_age INTEGER, -- Years since last replacement
    siding_type VARCHAR(50), -- vinyl, brick, wood, stucco, etc.
    foundation_type VARCHAR(50), -- slab, crawlspace, basement
    hvac_type VARCHAR(50), -- central_air, heat_pump, etc.

    -- Property Features (JSONB for flexibility)
    features JSONB DEFAULT '{
        "pool": false,
        "fence": false,
        "deck": false,
        "patio": false,
        "detached_structures": []
    }'::jsonb,

    -- Access Information
    access_notes TEXT, -- Gate codes, parking instructions, key location
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),

    -- Insurance Information (may be in insurers table too)
    insurance_company VARCHAR(255),
    policy_number VARCHAR(100),
    adjuster_name VARCHAR(100),
    adjuster_phone VARCHAR(20),
    adjuster_email VARCHAR(255),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_property_type CHECK (property_type IN ('residential', 'commercial', 'multi_family', 'industrial'))
);

-- Indexes for properties
CREATE INDEX idx_properties_claim_id ON properties(claim_id);
CREATE INDEX idx_properties_organization_id ON properties(organization_id);
CREATE INDEX idx_properties_zip_code ON properties(zip_code);
CREATE INDEX idx_properties_city_state ON properties(city, state);
CREATE INDEX idx_properties_deleted_at ON properties(deleted_at) WHERE deleted_at IS NULL;

-- Geospatial index for location-based queries
CREATE INDEX idx_properties_location ON properties USING gist(
    ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search for property addresses and owner names
CREATE INDEX idx_properties_search ON properties USING gin(
    to_tsvector('english', coalesce(full_address, '') || ' ' ||
                          coalesce(owner_full_name, '') || ' ' ||
                          coalesce(owner_email, ''))
);

CREATE TRIGGER properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLAIM CONTRACTORS (Many-to-Many Junction)
-- =====================================================
-- Supports multiple contractors working on a single claim
-- (e.g., roofing contractor + HVAC contractor)

CREATE TABLE claim_contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    contractor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Assignment Details
    trade VARCHAR(50), -- roofing, plumbing, electrical, hvac, general, etc.
    role VARCHAR(50) DEFAULT 'contractor', -- lead_contractor, subcontractor, consultant
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_lead BOOLEAN DEFAULT false, -- Primary contractor for this claim

    -- Scope
    scope_description TEXT, -- What this contractor is responsible for

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(claim_id, contractor_user_id, trade)
);

-- Indexes for claim_contractors
CREATE INDEX idx_claim_contractors_claim_id ON claim_contractors(claim_id);
CREATE INDEX idx_claim_contractors_user_id ON claim_contractors(contractor_user_id);
CREATE INDEX idx_claim_contractors_organization ON claim_contractors(organization_id);
CREATE INDEX idx_claim_contractors_active ON claim_contractors(is_active) WHERE is_active = true;
CREATE INDEX idx_claim_contractors_lead ON claim_contractors(is_lead) WHERE is_lead = true;

CREATE TRIGGER claim_contractors_updated_at
    BEFORE UPDATE ON claim_contractors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all claims for a user in their organization
CREATE OR REPLACE FUNCTION get_user_claims(p_user_id UUID, p_organization_id UUID)
RETURNS TABLE(
    claim_id UUID,
    claim_number VARCHAR,
    status VARCHAR,
    property_address VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.claim_number,
        c.status,
        p.full_address
    FROM claims c
    LEFT JOIN properties p ON p.claim_id = c.id
    WHERE c.organization_id = p_organization_id
    AND (
        c.assigned_contractor_id = p_user_id
        OR c.assigned_estimator_id = p_user_id
        OR c.client_user_id = p_user_id
        OR c.created_by = p_user_id
        OR EXISTS (
            SELECT 1 FROM claim_contractors cc
            WHERE cc.claim_id = c.id
            AND cc.contractor_user_id = p_user_id
            AND cc.is_active = true
        )
    )
    AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update claim status with automatic date tracking
CREATE OR REPLACE FUNCTION update_claim_status(
    p_claim_id UUID,
    p_new_status VARCHAR,
    p_updated_by UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE claims
    SET
        status = p_new_status,
        date_assigned = CASE WHEN p_new_status = 'assigned' THEN NOW() ELSE date_assigned END,
        date_assessment_scheduled = CASE WHEN p_new_status = 'assessment_scheduled' THEN NOW() ELSE date_assessment_scheduled END,
        date_assessment_completed = CASE WHEN p_new_status = 'assessment_complete' THEN NOW() ELSE date_assessment_completed END,
        date_estimate_submitted = CASE WHEN p_new_status = 'estimate_submitted' THEN NOW() ELSE date_estimate_submitted END,
        date_approved = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE date_approved END,
        date_work_started = CASE WHEN p_new_status = 'work_in_progress' THEN NOW() ELSE date_work_started END,
        date_work_completed = CASE WHEN p_new_status = 'work_complete' THEN NOW() ELSE date_work_completed END,
        date_final_inspection = CASE WHEN p_new_status = 'final_inspection' THEN NOW() ELSE date_final_inspection END,
        date_closed = CASE WHEN p_new_status = 'closed' THEN NOW() ELSE date_closed END
    WHERE id = p_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE claims IS 'Core table tracking restoration projects from start to finish';
COMMENT ON TABLE properties IS 'Property details for each claim (one-to-one relationship)';
COMMENT ON TABLE claim_contractors IS 'Junction table for multiple contractors per claim';

-- ===== Step 3/8: Estimates and Line Items =====
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

-- ===== Step 4/8: Photos and Documents =====
-- =====================================================
-- PHOTOS TABLE
-- =====================================================
-- References to photos stored in Supabase Storage
-- Supports claims documentation, damage assessment, progress tracking

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Photo Identification
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255), -- Original filename from upload
    file_extension VARCHAR(10), -- jpg, png, heic, pdf, etc.

    -- Storage Location (Supabase Storage)
    storage_bucket VARCHAR(100) DEFAULT 'claim-photos', -- Supabase bucket name
    storage_path TEXT NOT NULL, -- Full path in storage: org_id/claim_id/photo_id.jpg
    public_url TEXT, -- Public URL if photo is public
    thumbnail_url TEXT, -- Thumbnail URL for grid views

    -- File Metadata
    file_size INTEGER, -- Bytes
    mime_type VARCHAR(100), -- image/jpeg, image/png, application/pdf
    width INTEGER, -- Image width in pixels
    height INTEGER, -- Image height in pixels

    -- Photo Classification
    category VARCHAR(50) NOT NULL DEFAULT 'damage', -- damage, pre_existing, repair_progress, completion, other
    subcategory VARCHAR(50), -- roof_damage, interior_damage, exterior_damage, etc.
    photo_type VARCHAR(30) DEFAULT 'photo', -- photo, document, sketch, diagram, video

    -- Context & Location
    room_location VARCHAR(100), -- "Master Bedroom", "Living Room", "Exterior - North Side"
    description TEXT, -- Description of what photo shows
    damage_type VARCHAR(50), -- water, fire, wind, hail, mold, structural

    -- Tagging & Search
    tags TEXT[], -- Array of tags for searching: ['water_damage', 'ceiling', 'bedroom']
    is_featured BOOLEAN DEFAULT false, -- Featured photo for claim
    display_order INTEGER DEFAULT 0, -- Order for displaying photos

    -- Association
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL, -- Link to specific estimate
    line_item_id UUID REFERENCES estimate_line_items(id) ON DELETE SET NULL, -- Link to line item

    -- Capture Information
    captured_by UUID REFERENCES users(id), -- Who took the photo
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When photo was taken
    uploaded_by UUID NOT NULL REFERENCES users(id), -- Who uploaded it
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When uploaded

    -- GPS & EXIF Data (from phone cameras)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    exif_data JSONB, -- Full EXIF metadata

    -- Status & Visibility
    is_public BOOLEAN DEFAULT false, -- Visible to property owner/client
    is_approved BOOLEAN DEFAULT true, -- Approved for insurance submission
    requires_review BOOLEAN DEFAULT false, -- Needs manager review before submission

    -- Processing
    is_processed BOOLEAN DEFAULT false, -- Image optimization/thumbnail generation complete
    processing_status VARCHAR(30) DEFAULT 'pending', -- pending, processing, completed, failed

    -- Notes
    notes TEXT, -- Internal notes about photo

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_photo_category CHECK (category IN (
        'damage', 'pre_existing', 'repair_progress', 'completion',
        'before', 'after', 'insurance_doc', 'estimate_doc', 'invoice', 'other'
    )),
    CONSTRAINT valid_photo_type CHECK (photo_type IN ('photo', 'document', 'sketch', 'diagram', 'video', 'scan')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for photos
CREATE INDEX idx_photos_claim_id ON photos(claim_id);
CREATE INDEX idx_photos_organization_id ON photos(organization_id);
CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_estimate_id ON photos(estimate_id);
CREATE INDEX idx_photos_line_item_id ON photos(line_item_id);
CREATE INDEX idx_photos_captured_by ON photos(captured_by);
CREATE INDEX idx_photos_uploaded_by ON photos(uploaded_by);
CREATE INDEX idx_photos_captured_at ON photos(captured_at DESC);
CREATE INDEX idx_photos_is_featured ON photos(is_featured) WHERE is_featured = true;
CREATE INDEX idx_photos_display_order ON photos(claim_id, display_order);
CREATE INDEX idx_photos_deleted_at ON photos(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for tags array search
CREATE INDEX idx_photos_tags ON photos USING gin(tags);

-- Full-text search on photo descriptions
CREATE INDEX idx_photos_search ON photos USING gin(
    to_tsvector('english', coalesce(description, '') || ' ' || coalesce(room_location, ''))
);

CREATE TRIGGER photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUMS TABLE
-- =====================================================
-- Organize photos into albums for better organization

CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Album Details
    album_name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,

    -- Organization
    display_order INTEGER DEFAULT 0,

    -- Visibility
    is_public BOOLEAN DEFAULT false, -- Visible to clients
    is_shared BOOLEAN DEFAULT false, -- Shared with insurance/3rd parties

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for photo_albums
CREATE INDEX idx_albums_claim_id ON photo_albums(claim_id);
CREATE INDEX idx_albums_organization_id ON photo_albums(organization_id);
CREATE INDEX idx_albums_deleted_at ON photo_albums(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUM ITEMS (Junction Table)
-- =====================================================
-- Many-to-many relationship between photos and albums

CREATE TABLE photo_album_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

    -- Organization within album
    display_order INTEGER DEFAULT 0,
    caption TEXT,

    -- Audit
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),

    -- Constraints
    UNIQUE(album_id, photo_id) -- Photo can't be in same album twice
);

-- Indexes for photo_album_items
CREATE INDEX idx_album_items_album_id ON photo_album_items(album_id);
CREATE INDEX idx_album_items_photo_id ON photo_album_items(photo_id);
CREATE INDEX idx_album_items_display_order ON photo_album_items(album_id, display_order);

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- Non-photo documents (PDFs, Word docs, Excel, etc.)

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Document Identification
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    document_type VARCHAR(50) NOT NULL, -- contract, invoice, estimate, report, correspondence, legal

    -- Storage
    storage_bucket VARCHAR(100) DEFAULT 'claim-documents',
    storage_path TEXT NOT NULL,
    public_url TEXT,

    -- File Metadata
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_extension VARCHAR(10),

    -- Classification
    category VARCHAR(50), -- insurance, legal, financial, technical, administrative
    subcategory VARCHAR(50),
    description TEXT,
    tags TEXT[],

    -- Association
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    related_to_table VARCHAR(50), -- 'claims', 'estimates', 'invoices', etc.
    related_to_id UUID, -- Generic FK to related record

    -- Upload Information
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Visibility & Status
    is_public BOOLEAN DEFAULT false,
    is_signed BOOLEAN DEFAULT false, -- For contracts/legal docs
    requires_signature BOOLEAN DEFAULT false,
    signed_by UUID REFERENCES users(id),
    signed_at TIMESTAMP WITH TIME ZONE,

    -- Version Control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id), -- Previous version

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_document_type CHECK (document_type IN (
        'contract', 'invoice', 'estimate', 'report', 'correspondence',
        'legal', 'insurance_form', 'permit', 'certificate', 'other'
    ))
);

-- Indexes for documents
CREATE INDEX idx_documents_claim_id ON documents(claim_id);
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_estimate_id ON documents(estimate_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON documents USING gin(tags);

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING gin(
    to_tsvector('english', coalesce(file_name, '') || ' ' || coalesce(description, ''))
);

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all photos for a claim organized by category
CREATE OR REPLACE FUNCTION get_claim_photos_by_category(p_claim_id UUID)
RETURNS TABLE(
    category VARCHAR,
    photo_count BIGINT,
    latest_photo_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.category,
        COUNT(*)::BIGINT,
        MAX(p.captured_at)
    FROM photos p
    WHERE p.claim_id = p_claim_id
    AND p.deleted_at IS NULL
    GROUP BY p.category
    ORDER BY p.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate storage path for new photos
CREATE OR REPLACE FUNCTION generate_photo_storage_path(
    p_organization_id UUID,
    p_claim_id UUID,
    p_photo_id UUID,
    p_file_extension VARCHAR
)
RETURNS TEXT AS $$
BEGIN
    RETURN format(
        '%s/%s/%s.%s',
        p_organization_id,
        p_claim_id,
        p_photo_id,
        LOWER(p_file_extension)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE photos IS 'Photo references for Supabase Storage - damage documentation and progress tracking';
COMMENT ON TABLE photo_albums IS 'Organize photos into albums for better organization';
COMMENT ON TABLE photo_album_items IS 'Junction table linking photos to albums';
COMMENT ON TABLE documents IS 'Non-photo document management (PDFs, contracts, reports)';

COMMENT ON COLUMN photos.storage_path IS 'Full path in Supabase Storage bucket';
COMMENT ON COLUMN photos.tags IS 'Array of searchable tags for finding photos';
COMMENT ON COLUMN photos.exif_data IS 'Full EXIF metadata from camera/phone';
COMMENT ON COLUMN documents.related_to_table IS 'Generic relation - table name of related record';
COMMENT ON COLUMN documents.related_to_id IS 'Generic relation - ID of related record';

-- ===== Step 5/8: Invoices and Payments =====
-- =====================================================
-- INVOICES TABLE
-- =====================================================
-- Track invoices for claims and payment processing

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Invoice Identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_type VARCHAR(30) DEFAULT 'standard', -- standard, progress, final, supplement, change_order

    -- Billing Information
    bill_to_name VARCHAR(255) NOT NULL,
    bill_to_company VARCHAR(255),
    bill_to_email VARCHAR(255),
    bill_to_phone VARCHAR(20),
    bill_to_address TEXT,

    -- Financial Details
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,

    -- Payment Tracking
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    amount_due DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - amount_paid
    ) STORED,

    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- Workflow: draft → pending → sent → viewed → partial_paid → paid → overdue → cancelled → void

    payment_status VARCHAR(30) DEFAULT 'unpaid',
    -- unpaid, partial, paid, refunded, cancelled

    -- Important Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    sent_date DATE,
    viewed_date DATE,
    paid_date DATE,

    -- Payment Terms
    payment_terms VARCHAR(50) DEFAULT 'net_30', -- net_15, net_30, net_60, due_on_receipt, etc.
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
    late_fee_amount DECIMAL(10, 2) DEFAULT 0.00,

    -- Description & Notes
    description TEXT,
    terms_and_conditions TEXT,
    notes TEXT, -- Internal notes
    customer_notes TEXT, -- Notes visible to customer

    -- Payment Method Preferences
    payment_methods_accepted TEXT[] DEFAULT ARRAY['check', 'ach', 'wire'], -- check, credit_card, ach, wire, cash

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    sent_by UUID REFERENCES users(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_invoice_type CHECK (invoice_type IN ('standard', 'progress', 'final', 'supplement', 'change_order', 'retainer')),
    CONSTRAINT valid_invoice_status CHECK (status IN (
        'draft', 'pending', 'sent', 'viewed', 'partial_paid', 'paid', 'overdue', 'cancelled', 'void'
    )),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'cancelled'))
);

-- Indexes for invoices
CREATE INDEX idx_invoices_claim_id ON invoices(claim_id);
CREATE INDEX idx_invoices_estimate_id ON invoices(estimate_id);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);
CREATE INDEX idx_invoices_overdue ON invoices(due_date) WHERE status = 'overdue' AND deleted_at IS NULL;
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INVOICE LINE ITEMS TABLE
-- =====================================================
-- Individual line items on invoices

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    estimate_line_item_id UUID REFERENCES estimate_line_items(id) ON DELETE SET NULL,

    -- Line Item Details
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    unit VARCHAR(20) DEFAULT 'EA',
    unit_price DECIMAL(12, 4) NOT NULL,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity * unit_price)::numeric, 2)
    ) STORED,

    -- Tax
    is_taxable BOOLEAN DEFAULT true,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(invoice_id, line_number)
);

-- Indexes for invoice_line_items
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_estimate_line_item ON invoice_line_items(estimate_line_item_id);
CREATE INDEX idx_invoice_line_items_deleted_at ON invoice_line_items(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
-- Track individual payments received for invoices

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Payment Identification
    payment_number VARCHAR(50) UNIQUE, -- Internal tracking number
    reference_number VARCHAR(100), -- Check number, transaction ID, etc.

    -- Payment Details
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- check, credit_card, ach, wire, cash, other
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Payment Processor Details (for future integration)
    processor VARCHAR(50), -- stripe, square, paypal, etc.
    processor_transaction_id VARCHAR(255),
    processor_fee DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
        amount - processor_fee
    ) STORED,

    -- Check Details (if applicable)
    check_number VARCHAR(50),
    check_date DATE,
    bank_name VARCHAR(255),

    -- Status
    status VARCHAR(30) DEFAULT 'completed', -- pending, completed, failed, refunded, cancelled
    cleared_date DATE, -- When payment cleared/settled

    -- Payer Information
    payer_name VARCHAR(255),
    payer_email VARCHAR(255),
    payer_phone VARCHAR(20),

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    -- Received/Processed By
    received_by UUID REFERENCES users(id),
    processed_by UUID REFERENCES users(id),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'check', 'credit_card', 'debit_card', 'ach', 'wire', 'cash', 'money_order', 'other'
    )),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled', 'disputed'))
);

-- Indexes for payments
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_claim_id ON payments(claim_id);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_payments_payment_number ON payments(payment_number);
CREATE INDEX idx_payments_reference_number ON payments(reference_number);
CREATE INDEX idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to recalculate invoice totals from line items
CREATE OR REPLACE FUNCTION recalculate_invoice_totals(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_tax_amount DECIMAL(12, 2);
    v_discount_amount DECIMAL(12, 2);
    v_total DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4);
BEGIN
    -- Get current tax rate and discount
    SELECT tax_rate, discount_amount
    INTO v_tax_rate, v_discount_amount
    FROM invoices
    WHERE id = p_invoice_id;

    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(total_price), 0.00)
    INTO v_subtotal
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id
    AND deleted_at IS NULL;

    -- Calculate tax
    v_tax_amount := ROUND(((v_subtotal - v_discount_amount) * v_tax_rate)::numeric, 2);
    v_total := v_subtotal - v_discount_amount + v_tax_amount;

    -- Update invoice
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-recalculate invoice totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_invoice_totals(OLD.invoice_id);
    ELSE
        PERFORM recalculate_invoice_totals(NEW.invoice_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_line_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice();

-- Function to update invoice payment status when payment is made
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_invoice_total DECIMAL(12, 2);
BEGIN
    -- Calculate total paid for this invoice
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND status = 'completed'
    AND deleted_at IS NULL;

    -- Get invoice total
    SELECT total_amount INTO v_invoice_total
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- Update invoice payment fields
    UPDATE invoices
    SET
        amount_paid = v_total_paid,
        payment_status = CASE
            WHEN v_total_paid = 0 THEN 'unpaid'
            WHEN v_total_paid >= v_invoice_total THEN 'paid'
            ELSE 'partial'
        END,
        status = CASE
            WHEN v_total_paid >= v_invoice_total THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial_paid'
            ELSE status
        END,
        paid_date = CASE
            WHEN v_total_paid >= v_invoice_total THEN CURRENT_DATE
            ELSE NULL
        END
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_update_invoice_status
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_invoice_payment_status();

-- Function to check for overdue invoices and update status
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE due_date < CURRENT_DATE
    AND payment_status != 'paid'
    AND status NOT IN ('cancelled', 'void', 'paid')
    AND deleted_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoices IS 'Invoice management for claims - tracks billing and payment';
COMMENT ON TABLE invoice_line_items IS 'Individual line items on invoices';
COMMENT ON TABLE payments IS 'Payment records received for invoices';

COMMENT ON COLUMN invoices.payment_terms IS 'Payment terms: net_15, net_30, net_60, due_on_receipt';
COMMENT ON COLUMN invoices.amount_due IS 'Computed column: total_amount - amount_paid';
COMMENT ON COLUMN payments.processor_fee IS 'Fee charged by payment processor (Stripe, Square, etc.)';
COMMENT ON COLUMN payments.net_amount IS 'Computed column: amount - processor_fee';

-- ===== Step 6/8: Insurance Companies and Adjusters =====
-- =====================================================
-- INSURANCE_COMPANIES TABLE
-- =====================================================
-- Master list of insurance companies

CREATE TABLE insurance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- NULL = shared across all orgs

    -- Company Information
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50), -- Internal code or NAIC number
    parent_company VARCHAR(255), -- If subsidiary

    -- Contact Information
    main_phone VARCHAR(20),
    main_email VARCHAR(255),
    main_fax VARCHAR(20),
    website VARCHAR(255),

    -- Claims Department Contact
    claims_phone VARCHAR(20),
    claims_email VARCHAR(255),
    claims_portal_url VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),

    -- Business Details
    rating VARCHAR(10), -- A++, A+, A, etc. (AM Best rating)
    market_share DECIMAL(5, 2), -- Percentage
    specialization TEXT[], -- Types: homeowners, commercial, flood, etc.

    -- Payment Terms
    typical_payment_terms VARCHAR(50) DEFAULT 'net_30',
    average_claim_processing_days INTEGER, -- Historical average

    -- Communication Preferences
    preferred_contact_method VARCHAR(30), -- email, phone, portal, fax
    preferred_document_format VARCHAR(20) DEFAULT 'pdf', -- pdf, xactimate, excel

    -- Notes
    notes TEXT, -- Internal notes about working with this company
    special_requirements TEXT, -- Special documentation or process requirements

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false, -- Companies we prefer to work with

    -- Metadata
    metadata JSONB DEFAULT '{
        "response_times": {},
        "approval_rates": {},
        "common_issues": []
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for insurance_companies
CREATE INDEX idx_insurance_companies_name ON insurance_companies(company_name);
CREATE INDEX idx_insurance_companies_organization ON insurance_companies(organization_id);
CREATE INDEX idx_insurance_companies_is_active ON insurance_companies(is_active) WHERE is_active = true;
CREATE INDEX idx_insurance_companies_is_preferred ON insurance_companies(is_preferred) WHERE is_preferred = true;
CREATE INDEX idx_insurance_companies_deleted_at ON insurance_companies(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_insurance_companies_search ON insurance_companies USING gin(
    to_tsvector('english', coalesce(company_name, '') || ' ' || coalesce(company_code, ''))
);

CREATE TRIGGER insurance_companies_updated_at
    BEFORE UPDATE ON insurance_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSURANCE_ADJUSTERS TABLE
-- =====================================================
-- Individual insurance adjusters

CREATE TABLE insurance_adjusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insurance_company_id UUID REFERENCES insurance_companies(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Adjuster Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) GENERATED ALWAYS AS (
        first_name || ' ' || last_name
    ) STORED,

    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    phone_mobile VARCHAR(20),
    fax VARCHAR(20),
    extension VARCHAR(10),

    -- Professional Details
    adjuster_type VARCHAR(30), -- staff, independent, desk, field, catastrophe
    license_number VARCHAR(100),
    license_state VARCHAR(2),
    license_expiry_date DATE,

    -- Territory
    territory VARCHAR(100), -- Geographic area they cover
    specializations TEXT[], -- water, fire, wind, commercial, etc.

    -- Working Relationship
    responsiveness_rating INTEGER, -- 1-5 scale
    approval_rating INTEGER, -- 1-5 scale (how often they approve estimates)
    preferred_contact_method VARCHAR(30), -- email, phone, text, portal
    best_contact_time VARCHAR(50), -- "Mornings", "After 2pm", etc.

    -- Notes
    notes TEXT, -- Internal notes about working with this adjuster
    communication_style TEXT, -- "Prefers detailed breakdowns", "Quick to respond", etc.

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_contact_date DATE,

    -- Metadata
    metadata JSONB DEFAULT '{
        "claim_history": [],
        "average_response_time_hours": null,
        "common_requests": []
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for insurance_adjusters
CREATE INDEX idx_adjusters_company_id ON insurance_adjusters(insurance_company_id);
CREATE INDEX idx_adjusters_organization_id ON insurance_adjusters(organization_id);
CREATE INDEX idx_adjusters_full_name ON insurance_adjusters(full_name);
CREATE INDEX idx_adjusters_email ON insurance_adjusters(email);
CREATE INDEX idx_adjusters_is_active ON insurance_adjusters(is_active) WHERE is_active = true;
CREATE INDEX idx_adjusters_deleted_at ON insurance_adjusters(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_adjusters_search ON insurance_adjusters USING gin(
    to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(license_number, ''))
);

CREATE TRIGGER insurance_adjusters_updated_at
    BEFORE UPDATE ON insurance_adjusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLAIM_INSURERS TABLE (Junction)
-- =====================================================
-- Links claims to insurance companies and adjusters
-- Supports multiple insurers per claim (primary, secondary, etc.)

CREATE TABLE claim_insurers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    insurance_company_id UUID REFERENCES insurance_companies(id) ON DELETE SET NULL,
    adjuster_id UUID REFERENCES insurance_adjusters(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Insurance Details
    policy_number VARCHAR(100) NOT NULL,
    policy_type VARCHAR(50), -- homeowners, commercial, flood, umbrella, etc.
    coverage_type VARCHAR(50), -- dwelling, contents, liability, business_interruption
    is_primary BOOLEAN DEFAULT true, -- Primary vs secondary insurance

    -- Coverage Limits
    coverage_limit DECIMAL(12, 2),
    deductible DECIMAL(10, 2),
    deductible_type VARCHAR(30), -- flat, percentage, wind_hail_separate

    -- Policy Dates
    policy_effective_date DATE,
    policy_expiration_date DATE,

    -- Claim Status with Insurer
    insurer_claim_number VARCHAR(100), -- Insurance company's internal claim #
    insurer_claim_status VARCHAR(50), -- open, under_review, approved, partially_approved, denied, closed
    date_filed_with_insurer DATE,
    date_acknowledged DATE,
    date_adjuster_assigned DATE,
    date_inspection_scheduled DATE,
    date_inspection_completed DATE,
    date_decision DATE,

    -- Financial Tracking
    amount_claimed DECIMAL(12, 2),
    amount_approved DECIMAL(12, 2),
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    depreciation_withheld DECIMAL(12, 2), -- RCV vs ACV difference held back

    -- Denial/Issues
    is_denied BOOLEAN DEFAULT false,
    denial_reason TEXT,
    is_disputed BOOLEAN DEFAULT false,
    dispute_notes TEXT,

    -- Communication
    last_contact_date DATE,
    next_followup_date DATE,
    contact_frequency_days INTEGER DEFAULT 7, -- How often to follow up

    -- Notes
    notes TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{
        "communication_log": [],
        "documents_submitted": [],
        "documents_requested": []
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for claim_insurers
CREATE INDEX idx_claim_insurers_claim_id ON claim_insurers(claim_id);
CREATE INDEX idx_claim_insurers_company_id ON claim_insurers(insurance_company_id);
CREATE INDEX idx_claim_insurers_adjuster_id ON claim_insurers(adjuster_id);
CREATE INDEX idx_claim_insurers_organization_id ON claim_insurers(organization_id);
CREATE INDEX idx_claim_insurers_policy_number ON claim_insurers(policy_number);
CREATE INDEX idx_claim_insurers_insurer_claim_number ON claim_insurers(insurer_claim_number);
CREATE INDEX idx_claim_insurers_status ON claim_insurers(insurer_claim_status);
CREATE INDEX idx_claim_insurers_next_followup ON claim_insurers(next_followup_date) WHERE next_followup_date IS NOT NULL;
CREATE INDEX idx_claim_insurers_deleted_at ON claim_insurers(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER claim_insurers_updated_at
    BEFORE UPDATE ON claim_insurers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CORRESPONDENCE TABLE
-- =====================================================
-- Track all communication with insurance companies/adjusters

CREATE TABLE correspondence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    claim_insurer_id UUID REFERENCES claim_insurers(id) ON DELETE SET NULL,
    adjuster_id UUID REFERENCES insurance_adjusters(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Correspondence Details
    correspondence_type VARCHAR(30) NOT NULL, -- email, phone_call, meeting, letter, fax, portal_message
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    subject VARCHAR(255),
    body TEXT,

    -- Communication Date/Time
    correspondence_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER, -- For phone calls/meetings

    -- Participants
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    to_name VARCHAR(255),
    to_email VARCHAR(255),
    cc_emails TEXT[], -- Array of CC'd emails

    -- Related Records
    related_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    -- Status & Follow-up
    requires_response BOOLEAN DEFAULT false,
    response_deadline DATE,
    is_responded BOOLEAN DEFAULT false,
    response_date TIMESTAMP WITH TIME ZONE,

    -- Sentiment & Tags
    sentiment VARCHAR(20), -- positive, neutral, negative, urgent
    tags TEXT[], -- Array of tags for categorization
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Notes
    notes TEXT, -- Internal notes about this correspondence

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_correspondence_type CHECK (correspondence_type IN (
        'email', 'phone_call', 'meeting', 'letter', 'fax', 'portal_message', 'text_message', 'video_call'
    )),
    CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
    CONSTRAINT valid_sentiment CHECK (sentiment IN ('positive', 'neutral', 'negative', 'urgent', 'critical'))
);

-- Indexes for correspondence
CREATE INDEX idx_correspondence_claim_id ON correspondence(claim_id);
CREATE INDEX idx_correspondence_claim_insurer_id ON correspondence(claim_insurer_id);
CREATE INDEX idx_correspondence_adjuster_id ON correspondence(adjuster_id);
CREATE INDEX idx_correspondence_organization_id ON correspondence(organization_id);
CREATE INDEX idx_correspondence_date ON correspondence(correspondence_date DESC);
CREATE INDEX idx_correspondence_type ON correspondence(correspondence_type);
CREATE INDEX idx_correspondence_requires_response ON correspondence(requires_response) WHERE requires_response = true;
CREATE INDEX idx_correspondence_deleted_at ON correspondence(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_correspondence_tags ON correspondence USING gin(tags);

-- Full-text search
CREATE INDEX idx_correspondence_search ON correspondence USING gin(
    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body, ''))
);

CREATE TRIGGER correspondence_updated_at
    BEFORE UPDATE ON correspondence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get next follow-up date for a claim
CREATE OR REPLACE FUNCTION get_next_followup_date(p_claim_id UUID)
RETURNS DATE AS $$
DECLARE
    v_next_date DATE;
BEGIN
    SELECT MIN(next_followup_date)
    INTO v_next_date
    FROM claim_insurers
    WHERE claim_id = p_claim_id
    AND next_followup_date IS NOT NULL
    AND deleted_at IS NULL;

    RETURN v_next_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE insurance_companies IS 'Master list of insurance companies';
COMMENT ON TABLE insurance_adjusters IS 'Individual insurance adjusters and their contact information';
COMMENT ON TABLE claim_insurers IS 'Junction table linking claims to insurers and tracking claim status';
COMMENT ON TABLE correspondence IS 'Communication log with insurance companies and adjusters';

COMMENT ON COLUMN claim_insurers.is_primary IS 'Primary vs secondary/excess insurance';
COMMENT ON COLUMN claim_insurers.depreciation_withheld IS 'RCV vs ACV difference - recoverable after work completion';
COMMENT ON COLUMN correspondence.requires_response IS 'Flag items requiring follow-up action';

-- ===== Step 7/8: Status History and Audit Logging =====
-- =====================================================
-- STATUS_HISTORY TABLE
-- =====================================================
-- Track all status changes for claims, estimates, invoices, etc.
-- Provides complete audit trail and timeline

CREATE TABLE status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- What Changed
    entity_type VARCHAR(50) NOT NULL, -- claims, estimates, invoices, etc.
    entity_id UUID NOT NULL, -- ID of the record that changed
    field_name VARCHAR(100), -- Field that changed (status, assigned_contractor_id, etc.)

    -- Status Change Details
    old_status VARCHAR(100), -- Previous value
    new_status VARCHAR(100), -- New value
    change_type VARCHAR(30) DEFAULT 'status_change', -- status_change, assignment, approval, etc.

    -- Context
    changed_by UUID REFERENCES users(id), -- User who made the change
    changed_by_role VARCHAR(50), -- Role at time of change
    change_reason TEXT, -- Why the change was made
    automated BOOLEAN DEFAULT false, -- Was this an automated change?

    -- Additional Details
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context
    ip_address INET, -- IP address of user making change
    user_agent TEXT, -- Browser/client information

    -- Timestamp
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'claims', 'estimates', 'invoices', 'payments',
        'users', 'organizations', 'properties', 'line_items'
    )),
    CONSTRAINT valid_change_type CHECK (change_type IN (
        'status_change', 'assignment', 'approval', 'rejection',
        'creation', 'deletion', 'update', 'note_added'
    ))
);

-- Indexes for status_history
CREATE INDEX idx_status_history_organization_id ON status_history(organization_id);
CREATE INDEX idx_status_history_entity ON status_history(entity_type, entity_id);
CREATE INDEX idx_status_history_changed_by ON status_history(changed_by);
CREATE INDEX idx_status_history_changed_at ON status_history(changed_at DESC);
CREATE INDEX idx_status_history_entity_type ON status_history(entity_type);

-- GIN index for metadata search
CREATE INDEX idx_status_history_metadata ON status_history USING gin(metadata);

-- =====================================================
-- ACTIVITY_LOG TABLE
-- =====================================================
-- General activity log for all user actions
-- More granular than status_history

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Activity Details
    action VARCHAR(50) NOT NULL, -- login, logout, view, create, update, delete, export, etc.
    resource_type VARCHAR(50), -- claims, estimates, photos, documents, etc.
    resource_id UUID, -- ID of the resource acted upon
    resource_name VARCHAR(255), -- Human-readable name (claim number, file name, etc.)

    -- Context
    description TEXT, -- Human-readable description
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical

    -- Request Details
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_path TEXT, -- API endpoint or page URL
    request_duration_ms INTEGER, -- How long the request took

    -- Response Details
    status_code INTEGER, -- HTTP status code
    success BOOLEAN DEFAULT true,
    error_message TEXT, -- If action failed

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_action CHECK (action IN (
        'login', 'logout', 'view', 'create', 'update', 'delete',
        'export', 'import', 'download', 'upload', 'share', 'archive'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'))
);

-- Indexes for activity_log
CREATE INDEX idx_activity_log_organization_id ON activity_log(organization_id);
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_severity ON activity_log(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_activity_log_success ON activity_log(success) WHERE success = false;

-- Partition activity_log by month for better performance
-- CREATE TABLE activity_log_y2025m01 PARTITION OF activity_log
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =====================================================
-- NOTES TABLE
-- =====================================================
-- User-created notes for claims, estimates, etc.
-- Supports rich text, attachments, mentions

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Note Association (flexible - can be attached to any entity)
    entity_type VARCHAR(50) NOT NULL, -- claims, estimates, properties, etc.
    entity_id UUID NOT NULL, -- ID of the entity this note is attached to

    -- Note Content
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_format VARCHAR(20) DEFAULT 'plain_text', -- plain_text, markdown, html

    -- Visibility
    is_private BOOLEAN DEFAULT false, -- Private to creator only
    is_pinned BOOLEAN DEFAULT false, -- Pinned to top of notes list
    visibility VARCHAR(30) DEFAULT 'team', -- private, team, client, public

    -- Category/Type
    note_type VARCHAR(30) DEFAULT 'general', -- general, important, warning, follow_up, meeting_notes
    category VARCHAR(50), -- Custom categorization

    -- Created By
    created_by UUID NOT NULL REFERENCES users(id),
    created_by_role VARCHAR(50), -- Role at time of creation

    -- Mentions (@user references)
    mentioned_users UUID[], -- Array of user IDs mentioned in note
    mentions_metadata JSONB, -- Additional mention context

    -- Attachments
    attachment_ids UUID[], -- IDs of documents/photos attached to note

    -- Tags
    tags TEXT[], -- Array of tags for organization

    -- Follow-up
    requires_followup BOOLEAN DEFAULT false,
    followup_date DATE,
    followup_assigned_to UUID REFERENCES users(id),
    followup_completed BOOLEAN DEFAULT false,
    followup_completed_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_note_entity_type CHECK (entity_type IN (
        'claims', 'estimates', 'invoices', 'properties', 'users', 'organizations'
    )),
    CONSTRAINT valid_content_format CHECK (content_format IN ('plain_text', 'markdown', 'html')),
    CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'team', 'client', 'public')),
    CONSTRAINT valid_note_type CHECK (note_type IN ('general', 'important', 'warning', 'follow_up', 'meeting_notes', 'phone_call'))
);

-- Indexes for notes
CREATE INDEX idx_notes_organization_id ON notes(organization_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_requires_followup ON notes(requires_followup) WHERE requires_followup = true;
CREATE INDEX idx_notes_followup_date ON notes(followup_date) WHERE followup_date IS NOT NULL;
CREATE INDEX idx_notes_deleted_at ON notes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_tags ON notes USING gin(tags);
CREATE INDEX idx_notes_mentioned_users ON notes USING gin(mentioned_users);

-- Full-text search
CREATE INDEX idx_notes_search ON notes USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
);

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- User notifications for system events

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Details
    notification_type VARCHAR(50) NOT NULL, -- claim_assigned, estimate_approved, payment_received, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- Where to go when notification clicked

    -- Related Entity
    entity_type VARCHAR(50), -- claims, estimates, invoices, etc.
    entity_id UUID,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    category VARCHAR(30) DEFAULT 'general', -- general, claim, estimate, payment, system

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Delivery Channels
    sent_via_email BOOLEAN DEFAULT false,
    sent_via_sms BOOLEAN DEFAULT false,
    sent_via_push BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent_at TIMESTAMP WITH TIME ZONE,
    push_sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Auto-delete after this date

    -- Constraints
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT valid_category CHECK (category IN ('general', 'claim', 'estimate', 'payment', 'system', 'mention', 'assignment'))
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_priority ON notifications(priority) WHERE priority IN ('high', 'urgent');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to log status change
CREATE OR REPLACE FUNCTION log_status_change(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_field_name VARCHAR,
    p_old_status VARCHAR,
    p_new_status VARCHAR,
    p_changed_by UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
    v_organization_id UUID;
BEGIN
    -- Get organization_id based on entity type
    EXECUTE format('SELECT organization_id FROM %I WHERE id = $1', p_entity_type)
    INTO v_organization_id
    USING p_entity_id;

    -- Insert status history record
    INSERT INTO status_history (
        organization_id, entity_type, entity_id, field_name,
        old_status, new_status, changed_by, change_reason
    ) VALUES (
        v_organization_id, p_entity_type, p_entity_id, p_field_name,
        p_old_status, p_new_status, p_changed_by, p_change_reason
    ) RETURNING id INTO v_history_id;

    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_organization_id UUID,
    p_notification_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, organization_id, notification_type, title, message,
        entity_type, entity_id, priority
    ) VALUES (
        p_user_id, p_organization_id, p_notification_type, p_title, p_message,
        p_entity_type, p_entity_id, p_priority
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications
    SET is_read = true,
        read_at = NOW()
    WHERE id = p_notification_id
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC STATUS HISTORY LOGGING
-- =====================================================

-- Generic trigger function to log status changes
CREATE OR REPLACE FUNCTION trigger_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM log_status_change(
            TG_TABLE_NAME::VARCHAR,
            NEW.id,
            'status',
            OLD.status,
            NEW.status,
            auth.uid(), -- Current user from Supabase Auth
            NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to key tables
CREATE TRIGGER claims_log_status_change
    AFTER UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_change();

CREATE TRIGGER estimates_log_status_change
    AFTER UPDATE ON estimates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_change();

CREATE TRIGGER invoices_log_status_change
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_status_change();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE status_history IS 'Audit trail for all status changes across the system';
COMMENT ON TABLE activity_log IS 'General activity log for user actions and system events';
COMMENT ON TABLE notes IS 'User-created notes attachable to any entity';
COMMENT ON TABLE notifications IS 'In-app notifications for users';

COMMENT ON COLUMN status_history.automated IS 'Was this change triggered automatically vs by user action';
COMMENT ON COLUMN notes.mentioned_users IS 'Array of user IDs mentioned with @ in the note';
COMMENT ON COLUMN notifications.expires_at IS 'Auto-delete notification after this date';

-- ===== Step 8/8: Row Level Security (RLS) Policies =====
-- =====================================================
-- IMPORTANT: RLS OVERVIEW
-- =====================================================
-- Row Level Security ensures users can only access data within their organization
-- and according to their role permissions.
--
-- Key Concepts:
-- 1. Organization Isolation: Users only see data from their org
-- 2. Role-Based Access: Permissions based on user's role
-- 3. Super Admin Bypass: Estimate Reliance staff see all data
-- 4. Service Role Bypass: Backend operations bypass RLS
--
-- Test RLS with: SET ROLE authenticated; SET request.jwt.claim.sub = '<user_id>';
-- =====================================================

-- =====================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- =====================================================

-- Get current user's organization IDs (user can belong to multiple orgs)
CREATE OR REPLACE FUNCTION auth.user_organization_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY_AGG(DISTINCT organization_id)
    FROM user_organization_roles
    WHERE user_id = auth.uid()
    AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND r.name = 'super_admin'
        AND uor.is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin in specific organization
CREATE OR REPLACE FUNCTION auth.is_org_admin(p_organization_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND uor.organization_id = p_organization_id
        AND r.name IN ('super_admin', 'admin')
        AND uor.is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION auth.user_has_permission(
    p_organization_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        WHERE uor.user_id = auth.uid()
        AND uor.organization_id = p_organization_id
        AND uor.is_active = true
        AND (r.permissions -> p_resource ->> p_action)::boolean = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organization_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_contractors ENABLE ROW LEVEL SECURITY;

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor ENABLE ROW LEVEL SECURITY;

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_album_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_adjusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_insurers ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondence ENABLE ROW LEVEL SECURITY;

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        auth.is_super_admin()
        OR id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Super admins can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.is_super_admin());

CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.is_org_admin(id)
    );

-- =====================================================
-- USERS & ROLES POLICIES
-- =====================================================

CREATE POLICY "Users can view themselves"
    ON users FOR SELECT
    USING (
        auth.is_super_admin()
        OR id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM user_organization_roles uor1
            WHERE uor1.user_id = auth.uid()
            AND uor1.organization_id IN (
                SELECT organization_id
                FROM user_organization_roles uor2
                WHERE uor2.user_id = users.id
            )
        )
    );

CREATE POLICY "Users can view roles in their organizations"
    ON roles FOR SELECT
    USING (
        is_system_role = true
        OR auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Admins can create custom roles"
    ON roles FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR (
            is_custom_role = true
            AND auth.is_org_admin(organization_id)
        )
    );

CREATE POLICY "Users can view organization roles"
    ON user_organization_roles FOR SELECT
    USING (
        auth.is_super_admin()
        OR user_id = auth.uid()
        OR organization_id = ANY(auth.user_organization_ids())
    );

-- =====================================================
-- CLAIMS POLICIES
-- =====================================================

CREATE POLICY "Users can view claims in their organization"
    ON claims FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users with permission can create claims"
    ON claims FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'create')
    );

CREATE POLICY "Users with permission can update claims"
    ON claims FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'update')
    );

CREATE POLICY "Users with permission can delete claims"
    ON claims FOR DELETE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'delete')
    );

-- =====================================================
-- PROPERTIES POLICIES
-- =====================================================

CREATE POLICY "Properties inherit claim access"
    ON properties FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Properties inherit claim create"
    ON properties FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'create')
    );

CREATE POLICY "Properties inherit claim update"
    ON properties FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'claims', 'update')
    );

-- =====================================================
-- ESTIMATES POLICIES
-- =====================================================

CREATE POLICY "Users can view estimates in their organization"
    ON estimates FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users with permission can create estimates"
    ON estimates FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

CREATE POLICY "Users with permission can update estimates"
    ON estimates FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'update')
    );

CREATE POLICY "Users with permission can delete estimates"
    ON estimates FOR DELETE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'delete')
    );

-- Apply same pattern to estimate_line_items, materials, labor
CREATE POLICY "Line items inherit estimate access - select"
    ON estimate_line_items FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Line items inherit estimate access - insert"
    ON estimate_line_items FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

CREATE POLICY "Line items inherit estimate access - update"
    ON estimate_line_items FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'update')
    );

CREATE POLICY "Materials inherit estimate access - select"
    ON materials FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Materials inherit estimate access - insert"
    ON materials FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

CREATE POLICY "Labor inherit estimate access - select"
    ON labor FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Labor inherit estimate access - insert"
    ON labor FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'estimates', 'create')
    );

-- =====================================================
-- PHOTOS & DOCUMENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view photos in their organization"
    ON photos FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
        OR (is_public = true AND claim_id IN (
            SELECT id FROM claims WHERE organization_id = ANY(auth.user_organization_ids())
        ))
    );

CREATE POLICY "Users can upload photos to their claims"
    ON photos FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR (
            organization_id = ANY(auth.user_organization_ids())
            AND claim_id IN (
                SELECT id FROM claims
                WHERE organization_id = organization_id
            )
        )
    );

CREATE POLICY "Users can view documents in their organization"
    ON documents FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can upload documents"
    ON documents FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

-- =====================================================
-- INVOICES & PAYMENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view invoices in their organization"
    ON invoices FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users with permission can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'invoices', 'create')
    );

CREATE POLICY "Users with permission can update invoices"
    ON invoices FOR UPDATE
    USING (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'invoices', 'update')
    );

CREATE POLICY "Invoice line items inherit invoice access - select"
    ON invoice_line_items FOR SELECT
    USING (
        auth.is_super_admin()
        OR invoice_id IN (
            SELECT id FROM invoices
            WHERE organization_id = ANY(auth.user_organization_ids())
        )
    );

CREATE POLICY "Payments inherit invoice access - select"
    ON payments FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Payments inherit invoice access - insert"
    ON payments FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR auth.user_has_permission(organization_id, 'invoices', 'create')
    );

-- =====================================================
-- INSURANCE POLICIES
-- =====================================================

CREATE POLICY "Users can view insurance companies in their org"
    ON insurance_companies FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id IS NULL -- Global companies
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can view adjusters"
    ON insurance_adjusters FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id IS NULL
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can view claim insurance relationships"
    ON claim_insurers FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can view correspondence in their org"
    ON correspondence FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

-- =====================================================
-- AUDIT & NOTIFICATIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view status history in their org"
    ON status_history FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "System can insert status history"
    ON status_history FOR INSERT
    WITH CHECK (true); -- Any authenticated user can log changes

CREATE POLICY "Users can view activity in their org"
    ON activity_log FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "System can insert activity logs"
    ON activity_log FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view notes in their org"
    ON notes FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
        OR (visibility = 'public')
    );

CREATE POLICY "Users can create notes"
    ON notes FOR INSERT
    WITH CHECK (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (
        auth.is_super_admin()
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (
        auth.is_super_admin()
        OR user_id = auth.uid()
    );

CREATE POLICY "System can create notifications for users"
    ON notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- =====================================================
-- SERVICE ROLE BYPASS
-- =====================================================
-- The service role (server-side operations) bypasses ALL RLS policies
-- This is configured in Supabase Auth automatically

-- =====================================================
-- REALTIME SUBSCRIPTIONS (Optional)
-- =====================================================
-- Enable realtime for specific tables if needed

-- ALTER PUBLICATION supabase_realtime ADD TABLE claims;
-- ALTER PUBLICATION supabase_realtime ADD TABLE estimates;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION auth.user_organization_ids() IS 'Returns array of organization IDs the current user belongs to';
COMMENT ON FUNCTION auth.is_super_admin() IS 'Checks if current user has super_admin role';
COMMENT ON FUNCTION auth.is_org_admin(UUID) IS 'Checks if current user is admin of specified organization';
COMMENT ON FUNCTION auth.user_has_permission(UUID, VARCHAR, VARCHAR) IS 'Checks if user has specific permission in organization';

-- =====================================================
-- TESTING RLS POLICIES
-- =====================================================
-- To test policies, use these commands:
--
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<user_uuid>';
-- SELECT * FROM claims; -- Should only see claims in user's org
--
-- Reset:
-- RESET ROLE;
-- RESET request.jwt.claim.sub;
-- =====================================================

-- 
-- ===== Database Setup Complete! =====
-- All tables, indexes, triggers, and RLS policies have been created.
-- Next steps:
--   1. Create storage buckets for photos and documents
--   2. Set up Vercel environment variables
--   3. Test database connection
-- 
