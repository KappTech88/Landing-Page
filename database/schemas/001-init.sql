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
-- System roles (preset, immutable) and Custom roles (org-specific)
--
-- ROLE TYPES:
--   1. System Roles: Preset roles available to all orgs, cannot be modified/deleted
--   2. Custom Roles: Organization-specific roles, can be created by admins
--
-- DELETION RULES:
--   - System roles: NEVER deletable (is_system_role = true)
--   - Custom roles: Can only be deleted if NO users are assigned (checked via trigger)
--   - Once a custom role has "branches" (user assignments), UI should prevent deletion

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role Definition
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#6B7280', -- For UI badge color

    -- ===================
    -- ROLE CLASSIFICATION
    -- ===================
    -- System Role: Preset roles (owner, office_manager, etc.) - org_id is NULL
    -- Custom Role: Created by organization - org_id is set
    is_system_role BOOLEAN DEFAULT false,
    is_custom_role BOOLEAN DEFAULT false,

    -- Template this custom role was based on (if cloned from system role)
    based_on_role_id UUID REFERENCES roles(id),

    -- ===================
    -- PROTECTION FLAGS
    -- ===================
    -- Tracks if role has active assignments (users using this role)
    -- Updated automatically by trigger when users are assigned/unassigned
    assignment_count INTEGER DEFAULT 0,

    -- Computed: Can this role be deleted from UI?
    -- TRUE only if: is_custom_role=true AND assignment_count=0
    is_deletable BOOLEAN GENERATED ALWAYS AS (
        CASE
            WHEN is_system_role = true THEN false
            WHEN assignment_count > 0 THEN false
            ELSE true
        END
    ) STORED,

    -- Prevent any modifications to this role (for system roles)
    is_locked BOOLEAN DEFAULT false,

    -- ===================
    -- GRANULAR PERMISSIONS
    -- ===================
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

    -- ===================
    -- METADATA
    -- ===================
    -- Created by (for custom roles)
    -- NOTE: FK constraint added via ALTER TABLE after users table exists
    created_by UUID,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- ===================
    -- CONSTRAINTS
    -- ===================
    UNIQUE(organization_id, name),

    -- System roles must have NULL org_id, custom roles must have org_id
    CONSTRAINT valid_role_type CHECK (
        (is_system_role = true AND organization_id IS NULL AND is_custom_role = false) OR
        (is_custom_role = true AND organization_id IS NOT NULL AND is_system_role = false) OR
        (is_system_role = false AND is_custom_role = false) -- Allows seeding before classification
    )
);

CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_is_system_role ON roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX idx_roles_is_custom_role ON roles(is_custom_role) WHERE is_custom_role = true;
CREATE INDEX idx_roles_is_deletable ON roles(is_deletable) WHERE is_deletable = true;
CREATE INDEX idx_roles_deleted_at ON roles(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ROLE PROTECTION TRIGGERS
-- =====================================================

-- Prevent deletion of system roles or roles with assignments
CREATE OR REPLACE FUNCTION prevent_role_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Block deletion of system roles
    IF OLD.is_system_role = true THEN
        RAISE EXCEPTION 'Cannot delete system role: %', OLD.display_name;
    END IF;

    -- Block deletion of roles with active assignments
    IF OLD.assignment_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete role "%" - it has % active user assignments. Remove all users from this role first.',
            OLD.display_name, OLD.assignment_count;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_prevent_deletion
    BEFORE DELETE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_deletion();

-- Prevent modification of locked/system roles
CREATE OR REPLACE FUNCTION prevent_role_modification()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updating assignment_count (done by system)
    IF OLD.assignment_count != NEW.assignment_count THEN
        RETURN NEW;
    END IF;

    -- Block modification of system roles (except by super_admin via direct SQL)
    IF OLD.is_system_role = true AND OLD.is_locked = true THEN
        RAISE EXCEPTION 'Cannot modify system role: %', OLD.display_name;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_prevent_modification
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_role_modification();

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
-- ROLE ASSIGNMENT COUNT TRIGGER
-- =====================================================
-- Automatically updates roles.assignment_count when users are assigned/unassigned
-- This enables the is_deletable computed column to work correctly

CREATE OR REPLACE FUNCTION update_role_assignment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New assignment: increment count
        UPDATE roles SET assignment_count = assignment_count + 1 WHERE id = NEW.role_id;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Removed assignment: decrement count
        UPDATE roles SET assignment_count = assignment_count - 1 WHERE id = OLD.role_id;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Role changed: decrement old, increment new
        IF OLD.role_id != NEW.role_id THEN
            UPDATE roles SET assignment_count = assignment_count - 1 WHERE id = OLD.role_id;
            UPDATE roles SET assignment_count = assignment_count + 1 WHERE id = NEW.role_id;
        END IF;
        -- Active status changed
        IF OLD.is_active != NEW.is_active THEN
            IF NEW.is_active = true THEN
                UPDATE roles SET assignment_count = assignment_count + 1 WHERE id = NEW.role_id;
            ELSE
                UPDATE roles SET assignment_count = assignment_count - 1 WHERE id = NEW.role_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_org_roles_update_count
    AFTER INSERT OR UPDATE OR DELETE ON user_organization_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_role_assignment_count();

-- =====================================================
-- DEFERRED FOREIGN KEY CONSTRAINTS
-- =====================================================
-- Add FK constraints that couldn't be created due to table order

ALTER TABLE roles ADD CONSTRAINT roles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

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
-- CUSTOM ROLE MANAGEMENT FUNCTIONS
-- =====================================================

-- Create a custom role for an organization
-- Can optionally clone from an existing system role
CREATE OR REPLACE FUNCTION create_custom_role(
    p_organization_id UUID,
    p_name VARCHAR(50),
    p_display_name VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_permissions JSONB DEFAULT NULL,
    p_based_on_role_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_role_id UUID;
    v_permissions JSONB;
BEGIN
    -- If based on existing role, clone its permissions
    IF p_based_on_role_id IS NOT NULL THEN
        SELECT permissions INTO v_permissions
        FROM roles WHERE id = p_based_on_role_id;
    ELSE
        v_permissions := COALESCE(p_permissions, '{
            "customers": {"create": false, "read": true, "update": false, "delete": false, "export": false},
            "jobs": {"create": false, "read": true, "update": false, "delete": false, "assign": false},
            "claims": {"create": false, "read": false, "update": false, "delete": false},
            "estimates": {"create": false, "read": true, "update": false, "delete": false, "approve": false},
            "production": {"read": false, "schedule": false, "manage_crews": false, "labor_tickets": false},
            "materials": {"order": false, "receive": false, "manage_suppliers": false},
            "finances": {"invoices": false, "payments": false, "reports": false},
            "documents": {"upload": false, "read": true, "delete": false},
            "users": {"create": false, "read": false, "update": false, "delete": false},
            "settings": {"read": false, "update": false}
        }'::jsonb);
    END IF;

    INSERT INTO roles (
        organization_id,
        name,
        display_name,
        description,
        is_system_role,
        is_custom_role,
        based_on_role_id,
        permissions,
        is_locked,
        created_by
    ) VALUES (
        p_organization_id,
        p_name,
        p_display_name,
        p_description,
        false,  -- Not a system role
        true,   -- Is a custom role
        p_based_on_role_id,
        v_permissions,
        false,  -- Custom roles are not locked
        p_created_by
    )
    RETURNING id INTO v_role_id;

    RETURN v_role_id;
END;
$$ LANGUAGE plpgsql;

-- Update custom role permissions (only works for custom, unlocked roles)
CREATE OR REPLACE FUNCTION update_custom_role_permissions(
    p_role_id UUID,
    p_permissions JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_system BOOLEAN;
    v_is_locked BOOLEAN;
BEGIN
    SELECT is_system_role, is_locked
    INTO v_is_system, v_is_locked
    FROM roles WHERE id = p_role_id;

    IF v_is_system THEN
        RAISE EXCEPTION 'Cannot modify system role permissions';
    END IF;

    IF v_is_locked THEN
        RAISE EXCEPTION 'This role is locked and cannot be modified';
    END IF;

    UPDATE roles
    SET permissions = p_permissions, updated_at = NOW()
    WHERE id = p_role_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Check if role can be safely deleted (for UI)
CREATE OR REPLACE FUNCTION can_delete_role(p_role_id UUID)
RETURNS TABLE(
    can_delete BOOLEAN,
    reason TEXT,
    assignment_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.is_deletable,
        CASE
            WHEN r.is_system_role THEN 'System roles cannot be deleted'
            WHEN r.assignment_count > 0 THEN 'Role has ' || r.assignment_count || ' active user assignments'
            ELSE 'Role can be deleted'
        END,
        r.assignment_count
    FROM roles r
    WHERE r.id = p_role_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA: System Roles (Preset, Immutable)
-- =====================================================
-- These roles are available to ALL organizations
-- They cannot be modified or deleted from the UI

INSERT INTO roles (name, display_name, description, is_system_role, is_locked, color_code, permissions) VALUES
(
    'super_admin',
    'Super Administrator',
    'Full system access across all organizations',
    true,
    true,
    '#DC2626',
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
    true,
    '#7C3AED',
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
    true,
    '#2563EB',
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
    true,
    '#10B981',
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
    true,
    '#F59E0B',
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
    true,
    '#6366F1',
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
-- CUSTOM FIELD DEFINITIONS
-- =====================================================
-- Allows organizations to define custom fields for ANY entity
-- These definitions describe what fields exist; actual values stored in each table's custom_fields JSONB

CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Field Identification
    field_key VARCHAR(100) NOT NULL, -- Internal key: "property_gate_code", "customer_referral_fee"
    field_label VARCHAR(255) NOT NULL, -- Display label: "Gate Code", "Referral Fee %"
    field_description TEXT,

    -- Which entity this field belongs to
    -- This determines which table's custom_fields JSONB this field populates
    entity_type VARCHAR(50) NOT NULL, -- contacts, jobs, estimates, invoices, crews, etc.

    -- Field Type & Validation
    field_type VARCHAR(30) NOT NULL DEFAULT 'text',
    -- text, textarea, number, currency, percentage, date, datetime, boolean,
    -- select, multi_select, email, phone, url, color, file, user_reference

    -- For select/multi_select types
    options JSONB DEFAULT '[]'::jsonb, -- [{"value": "opt1", "label": "Option 1"}, ...]

    -- Validation Rules
    validation JSONB DEFAULT '{
        "required": false,
        "min_length": null,
        "max_length": null,
        "min_value": null,
        "max_value": null,
        "pattern": null,
        "pattern_message": null
    }'::jsonb,

    -- Default Value
    default_value TEXT,

    -- Display Settings
    display_settings JSONB DEFAULT '{
        "show_in_list": false,
        "show_in_detail": true,
        "show_in_forms": true,
        "column_width": null,
        "group": null,
        "sort_order": 0
    }'::jsonb,

    -- Categorization
    field_group VARCHAR(100), -- Group fields: "Property Info", "Insurance Details"
    sort_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    is_searchable BOOLEAN DEFAULT false, -- Include in search indexes
    is_reportable BOOLEAN DEFAULT true, -- Include in reports/exports

    -- Data Collection / Analytics
    track_changes BOOLEAN DEFAULT false, -- Log changes to this field
    include_in_analytics BOOLEAN DEFAULT false, -- Include in analytics dashboard

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(organization_id, entity_type, field_key),
    CONSTRAINT valid_field_type CHECK (field_type IN (
        'text', 'textarea', 'number', 'currency', 'percentage',
        'date', 'datetime', 'boolean', 'select', 'multi_select',
        'email', 'phone', 'url', 'color', 'file', 'user_reference',
        'contact_reference', 'job_reference', 'rating', 'signature'
    )),
    CONSTRAINT valid_entity_type CHECK (entity_type IN (
        'contacts', 'jobs', 'claims', 'estimates', 'estimate_items',
        'invoices', 'payments', 'crews', 'crew_members', 'labor_tickets',
        'material_orders', 'suppliers', 'documents', 'photos'
    ))
);

CREATE INDEX idx_custom_fields_org ON custom_field_definitions(organization_id);
CREATE INDEX idx_custom_fields_entity ON custom_field_definitions(entity_type);
CREATE INDEX idx_custom_fields_active ON custom_field_definitions(is_active) WHERE is_active = true;
CREATE INDEX idx_custom_fields_searchable ON custom_field_definitions(is_searchable) WHERE is_searchable = true;
CREATE INDEX idx_custom_fields_deleted ON custom_field_definitions(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER custom_field_definitions_updated_at
    BEFORE UPDATE ON custom_field_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CUSTOM FIELD CHANGE LOG
-- =====================================================
-- Track changes to custom field values when track_changes = true

CREATE TABLE custom_field_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,

    -- What entity was changed
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL, -- ID of the contact, job, etc.

    -- Change Details
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Context
    change_reason TEXT,
    change_source VARCHAR(30) DEFAULT 'ui' -- ui, api, import, automation
);

CREATE INDEX idx_cf_change_log_org ON custom_field_change_log(organization_id);
CREATE INDEX idx_cf_change_log_field ON custom_field_change_log(field_definition_id);
CREATE INDEX idx_cf_change_log_entity ON custom_field_change_log(entity_type, entity_id);
CREATE INDEX idx_cf_change_log_date ON custom_field_change_log(changed_at DESC);

-- =====================================================
-- CUSTOM FIELD HELPER FUNCTIONS
-- =====================================================

-- Create a custom field definition
CREATE OR REPLACE FUNCTION create_custom_field(
    p_organization_id UUID,
    p_entity_type VARCHAR(50),
    p_field_key VARCHAR(100),
    p_field_label VARCHAR(255),
    p_field_type VARCHAR(30) DEFAULT 'text',
    p_options JSONB DEFAULT '[]'::jsonb,
    p_is_required BOOLEAN DEFAULT false,
    p_default_value TEXT DEFAULT NULL,
    p_field_group VARCHAR(100) DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_field_id UUID;
BEGIN
    INSERT INTO custom_field_definitions (
        organization_id, entity_type, field_key, field_label, field_type,
        options, is_required, default_value, field_group, created_by
    ) VALUES (
        p_organization_id, p_entity_type, p_field_key, p_field_label, p_field_type,
        p_options, p_is_required, p_default_value, p_field_group, p_created_by
    )
    RETURNING id INTO v_field_id;

    RETURN v_field_id;
END;
$$ LANGUAGE plpgsql;

-- Get all custom fields for an entity type
CREATE OR REPLACE FUNCTION get_custom_fields_for_entity(
    p_organization_id UUID,
    p_entity_type VARCHAR(50)
)
RETURNS TABLE(
    id UUID,
    field_key VARCHAR,
    field_label VARCHAR,
    field_type VARCHAR,
    options JSONB,
    validation JSONB,
    default_value TEXT,
    is_required BOOLEAN,
    field_group VARCHAR,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cfd.id,
        cfd.field_key,
        cfd.field_label,
        cfd.field_type,
        cfd.options,
        cfd.validation,
        cfd.default_value,
        cfd.is_required,
        cfd.field_group,
        cfd.sort_order
    FROM custom_field_definitions cfd
    WHERE cfd.organization_id = p_organization_id
    AND cfd.entity_type = p_entity_type
    AND cfd.is_active = true
    AND cfd.deleted_at IS NULL
    ORDER BY cfd.field_group NULLS LAST, cfd.sort_order, cfd.field_label;
END;
$$ LANGUAGE plpgsql;

-- Validate custom field values against definitions
CREATE OR REPLACE FUNCTION validate_custom_fields(
    p_organization_id UUID,
    p_entity_type VARCHAR(50),
    p_custom_fields JSONB
)
RETURNS TABLE(
    is_valid BOOLEAN,
    errors JSONB
) AS $$
DECLARE
    v_errors JSONB := '[]'::jsonb;
    v_field RECORD;
    v_value TEXT;
BEGIN
    -- Check each required field
    FOR v_field IN
        SELECT * FROM custom_field_definitions
        WHERE organization_id = p_organization_id
        AND entity_type = p_entity_type
        AND is_required = true
        AND is_active = true
        AND deleted_at IS NULL
    LOOP
        v_value := p_custom_fields ->> v_field.field_key;

        IF v_value IS NULL OR v_value = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'field', v_field.field_key,
                'error', v_field.field_label || ' is required'
            );
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        (jsonb_array_length(v_errors) = 0),
        v_errors;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations - each roofing company is an org';
COMMENT ON TABLE roles IS 'System roles (preset, immutable) and Custom roles (org-specific, can be deleted if no users assigned)';
COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE user_organization_roles IS 'Junction table for user-org-role relationships';
COMMENT ON TABLE custom_field_definitions IS 'Define custom fields for any entity - values stored in each table''s custom_fields JSONB';
COMMENT ON TABLE custom_field_change_log IS 'Track changes to custom field values for data collection/analytics';

COMMENT ON FUNCTION generate_sequence_number IS 'Generates sequential numbers for jobs, estimates, etc.';
COMMENT ON FUNCTION create_custom_role IS 'Create a custom role for an organization, optionally cloning from system role';
COMMENT ON FUNCTION can_delete_role IS 'Check if a role can be safely deleted (for UI validation)';
COMMENT ON FUNCTION create_custom_field IS 'Create a custom field definition for an entity type';
COMMENT ON FUNCTION get_custom_fields_for_entity IS 'Get all active custom field definitions for an entity type';
COMMENT ON FUNCTION validate_custom_fields IS 'Validate custom field values against their definitions';
