-- =====================================================
-- 001-init.sql
-- Foundation Schema for Roofing Contractor CRM
-- Creates: Organizations, Users, Roles, Authentication
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- =====================================================
-- ORGANIZATIONS TABLE (Multi-tenancy Core)
-- =====================================================
-- Each organization represents a roofing company using the CRM

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
    legal_name VARCHAR(255), -- Official business name

    -- Business Details
    business_type VARCHAR(50) DEFAULT 'roofing_contractor',
    license_number VARCHAR(100),
    license_state VARCHAR(2),
    license_expiration DATE,

    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    fax VARCHAR(20),
    website VARCHAR(255),

    -- Primary Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'US',

    -- Service Area
    service_area_radius INTEGER, -- miles
    service_zip_codes TEXT[], -- Array of serviced zip codes

    -- Subscription & Billing
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, starter, professional, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled, trial
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    monthly_job_limit INTEGER,

    -- Branding & Settings
    settings JSONB DEFAULT '{
        "branding": {
            "logo_url": null,
            "primary_color": "#1e40af",
            "secondary_color": "#3b82f6"
        },
        "defaults": {
            "tax_rate": 0.00,
            "overhead_percentage": 10.00,
            "profit_percentage": 10.00,
            "payment_terms": "net_30",
            "warranty_years": 5
        },
        "features": {
            "insurance_claims": true,
            "material_ordering": true,
            "crew_app": true,
            "customer_portal": false
        },
        "notifications": {
            "email_enabled": true,
            "sms_enabled": false
        },
        "integrations": {
            "quickbooks": false,
            "google_workspace": false,
            "supplier_apis": []
        }
    }'::jsonb,

    -- Numbering Sequences (customizable prefixes)
    numbering_config JSONB DEFAULT '{
        "customer": {"prefix": "CUST", "next": 1},
        "job": {"prefix": "JOB", "next": 1},
        "estimate": {"prefix": "EST", "next": 1},
        "invoice": {"prefix": "INV", "next": 1},
        "work_order": {"prefix": "WO", "next": 1}
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial'))
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ROLES TABLE
-- =====================================================
-- System and custom roles with granular permissions

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role Definition
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Role Type
    is_system_role BOOLEAN DEFAULT false,
    is_custom_role BOOLEAN DEFAULT false,

    -- Granular Permissions
    permissions JSONB DEFAULT '{
        "customers": {"create": false, "read": false, "update": false, "delete": false, "export": false},
        "jobs": {"create": false, "read": false, "update": false, "delete": false, "assign": false},
        "claims": {"create": false, "read": false, "update": false, "delete": false},
        "estimates": {"create": false, "read": false, "update": false, "delete": false, "approve": false},
        "production": {"read": false, "schedule": false, "manage_crews": false, "labor_tickets": false},
        "materials": {"order": false, "receive": false, "manage_suppliers": false},
        "finances": {"invoices": false, "payments": false, "reports": false},
        "documents": {"upload": false, "read": false, "delete": false},
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "settings": {"read": false, "update": false}
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(organization_id, name)
);

CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_is_system_role ON roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX idx_roles_deleted_at ON roles(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- USERS TABLE
-- =====================================================
-- User profiles linked to Supabase Auth

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Personal Information
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

    -- Contact
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,

    -- Profile
    avatar_url TEXT,
    title VARCHAR(100), -- Job title

    -- User Type
    user_type VARCHAR(30) DEFAULT 'employee', -- employee, crew_member, subcontractor

    -- Preferences
    preferences JSONB DEFAULT '{
        "notifications": {"email": true, "sms": false, "push": true},
        "display": {"theme": "light", "language": "en", "timezone": "America/New_York"}
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Integrations
    google_workspace_email VARCHAR(255),
    google_refresh_token TEXT,
    google_token_expires_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- USER_ORGANIZATION_ROLES (Junction Table)
-- =====================================================
-- Users can belong to multiple organizations with different roles

CREATE TABLE user_organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Assignment Details
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_primary_org BOOLEAN DEFAULT false, -- User's primary organization

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, organization_id, role_id)
);

CREATE INDEX idx_uor_user_id ON user_organization_roles(user_id);
CREATE INDEX idx_uor_organization_id ON user_organization_roles(organization_id);
CREATE INDEX idx_uor_role_id ON user_organization_roles(role_id);
CREATE INDEX idx_uor_active ON user_organization_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_uor_primary ON user_organization_roles(is_primary_org) WHERE is_primary_org = true;

-- =====================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER user_organization_roles_updated_at BEFORE UPDATE ON user_organization_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEQUENCE GENERATOR FUNCTION
-- =====================================================
-- Generates sequential numbers for jobs, estimates, invoices, etc.

CREATE OR REPLACE FUNCTION generate_sequence_number(
    p_organization_id UUID,
    p_sequence_type VARCHAR(50)
)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_config JSONB;
    v_prefix VARCHAR(20);
    v_next INTEGER;
    v_result VARCHAR(50);
BEGIN
    -- Get current config
    SELECT numbering_config -> p_sequence_type
    INTO v_config
    FROM organizations
    WHERE id = p_organization_id;

    IF v_config IS NULL THEN
        RAISE EXCEPTION 'Unknown sequence type: %', p_sequence_type;
    END IF;

    v_prefix := v_config ->> 'prefix';
    v_next := (v_config ->> 'next')::INTEGER;

    -- Generate number
    v_result := v_prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_next::TEXT, 5, '0');

    -- Increment sequence
    UPDATE organizations
    SET numbering_config = jsonb_set(
        numbering_config,
        ARRAY[p_sequence_type, 'next'],
        to_jsonb(v_next + 1)
    )
    WHERE id = p_organization_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA: System Roles
-- =====================================================

INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES
(
    'super_admin',
    'Super Administrator',
    'Full system access across all organizations',
    true,
    '{
        "customers": {"create": true, "read": true, "update": true, "delete": true, "export": true},
        "jobs": {"create": true, "read": true, "update": true, "delete": true, "assign": true},
        "claims": {"create": true, "read": true, "update": true, "delete": true},
        "estimates": {"create": true, "read": true, "update": true, "delete": true, "approve": true},
        "production": {"read": true, "schedule": true, "manage_crews": true, "labor_tickets": true},
        "materials": {"order": true, "receive": true, "manage_suppliers": true},
        "finances": {"invoices": true, "payments": true, "reports": true},
        "documents": {"upload": true, "read": true, "delete": true},
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "settings": {"read": true, "update": true},
        "organizations": {"create": true, "read": true, "update": true, "delete": true}
    }'::jsonb
),
(
    'owner',
    'Company Owner',
    'Full access within their organization',
    true,
    '{
        "customers": {"create": true, "read": true, "update": true, "delete": true, "export": true},
        "jobs": {"create": true, "read": true, "update": true, "delete": true, "assign": true},
        "claims": {"create": true, "read": true, "update": true, "delete": true},
        "estimates": {"create": true, "read": true, "update": true, "delete": true, "approve": true},
        "production": {"read": true, "schedule": true, "manage_crews": true, "labor_tickets": true},
        "materials": {"order": true, "receive": true, "manage_suppliers": true},
        "finances": {"invoices": true, "payments": true, "reports": true},
        "documents": {"upload": true, "read": true, "delete": true},
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "settings": {"read": true, "update": true}
    }'::jsonb
),
(
    'office_manager',
    'Office Manager',
    'Manage office operations, customers, and scheduling',
    true,
    '{
        "customers": {"create": true, "read": true, "update": true, "delete": false, "export": true},
        "jobs": {"create": true, "read": true, "update": true, "delete": false, "assign": true},
        "claims": {"create": true, "read": true, "update": true, "delete": false},
        "estimates": {"create": true, "read": true, "update": true, "delete": false, "approve": false},
        "production": {"read": true, "schedule": true, "manage_crews": false, "labor_tickets": true},
        "materials": {"order": true, "receive": true, "manage_suppliers": false},
        "finances": {"invoices": true, "payments": true, "reports": true},
        "documents": {"upload": true, "read": true, "delete": false},
        "users": {"create": false, "read": true, "update": false, "delete": false},
        "settings": {"read": true, "update": false}
    }'::jsonb
),
(
    'sales_rep',
    'Sales Representative',
    'Manage leads, customers, and create estimates',
    true,
    '{
        "customers": {"create": true, "read": true, "update": true, "delete": false, "export": false},
        "jobs": {"create": true, "read": true, "update": true, "delete": false, "assign": false},
        "claims": {"create": true, "read": true, "update": true, "delete": false},
        "estimates": {"create": true, "read": true, "update": true, "delete": false, "approve": false},
        "production": {"read": true, "schedule": false, "manage_crews": false, "labor_tickets": false},
        "materials": {"order": false, "receive": false, "manage_suppliers": false},
        "finances": {"invoices": false, "payments": false, "reports": false},
        "documents": {"upload": true, "read": true, "delete": false},
        "users": {"create": false, "read": true, "update": false, "delete": false},
        "settings": {"read": false, "update": false}
    }'::jsonb
),
(
    'production_manager',
    'Production Manager',
    'Manage crews, scheduling, and job production',
    true,
    '{
        "customers": {"create": false, "read": true, "update": false, "delete": false, "export": false},
        "jobs": {"create": false, "read": true, "update": true, "delete": false, "assign": true},
        "claims": {"create": false, "read": true, "update": false, "delete": false},
        "estimates": {"create": false, "read": true, "update": false, "delete": false, "approve": false},
        "production": {"read": true, "schedule": true, "manage_crews": true, "labor_tickets": true},
        "materials": {"order": true, "receive": true, "manage_suppliers": false},
        "finances": {"invoices": false, "payments": false, "reports": true},
        "documents": {"upload": true, "read": true, "delete": false},
        "users": {"create": false, "read": true, "update": false, "delete": false},
        "settings": {"read": false, "update": false}
    }'::jsonb
),
(
    'crew_lead',
    'Crew Lead',
    'Lead crews in the field, submit labor tickets',
    true,
    '{
        "customers": {"create": false, "read": true, "update": false, "delete": false, "export": false},
        "jobs": {"create": false, "read": true, "update": false, "delete": false, "assign": false},
        "claims": {"create": false, "read": false, "update": false, "delete": false},
        "estimates": {"create": false, "read": true, "update": false, "delete": false, "approve": false},
        "production": {"read": true, "schedule": false, "manage_crews": false, "labor_tickets": true},
        "materials": {"order": false, "receive": true, "manage_suppliers": false},
        "finances": {"invoices": false, "payments": false, "reports": false},
        "documents": {"upload": true, "read": true, "delete": false},
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "settings": {"read": false, "update": false}
    }'::jsonb
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_organization_id UUID)
RETURNS TABLE(role_name VARCHAR, permissions JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name, r.permissions
    FROM user_organization_roles uor
    JOIN roles r ON r.id = uor.role_id
    WHERE uor.user_id = p_user_id
    AND uor.organization_id = p_organization_id
    AND uor.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check permission
CREATE OR REPLACE FUNCTION has_permission(
    p_user_id UUID,
    p_organization_id UUID,
    p_resource VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
BEGIN
    SELECT permissions INTO user_permissions
    FROM get_user_role(p_user_id, p_organization_id);

    IF user_permissions IS NULL THEN
        RETURN false;
    END IF;

    RETURN COALESCE(
        (user_permissions -> p_resource ->> p_action)::boolean,
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations - each roofing company is an org';
COMMENT ON TABLE roles IS 'System and custom roles with granular permissions';
COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE user_organization_roles IS 'Junction table for user-org-role relationships';
COMMENT ON FUNCTION generate_sequence_number IS 'Generates sequential numbers for jobs, estimates, etc.';
