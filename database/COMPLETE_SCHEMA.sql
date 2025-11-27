-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR ROOFING CRM
-- Run this entire file in Supabase SQL Editor
-- =====================================================
-- 
-- This combines all 10 migration files into one.
-- 
-- HIERARCHY: Customer (ROOT) → Job → Claim → Estimate → Production → Finances
--
-- ⚠️  IMPORTANT: Run this on a FRESH database only!
--
-- To start fresh, run this first:
--   DROP SCHEMA public CASCADE;
--   CREATE SCHEMA public;
--   GRANT ALL ON SCHEMA public TO postgres;
--   GRANT ALL ON SCHEMA public TO public;
--
-- =====================================================


-- =====================================================
-- SCHEMA FILE: 001
-- =====================================================

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

-- =====================================================
-- SCHEMA FILE: 002
-- =====================================================

-- =====================================================
-- 002-contacts.sql
-- Contacts & Customers - THE ROOT ENTITY
-- All business flows from the customer relationship
-- =====================================================

-- =====================================================
-- CONTACTS TABLE (Root Entity)
-- =====================================================
-- Central customer/contact entity - everything starts here
-- A contact can be a homeowner, property manager, business owner, etc.

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Contact Number (Auto-generated)
    contact_number VARCHAR(50) UNIQUE NOT NULL, -- CUST-2024-00001

    -- Contact Type
    contact_type VARCHAR(30) NOT NULL DEFAULT 'customer', -- lead, prospect, customer, past_customer, vendor, other
    customer_status VARCHAR(30) DEFAULT 'active', -- active, inactive, do_not_contact, deceased

    -- Classification
    is_residential BOOLEAN DEFAULT true,
    is_commercial BOOLEAN DEFAULT false,
    account_type VARCHAR(30) DEFAULT 'homeowner', -- homeowner, property_manager, business, hoa, government, referral_partner

    -- ===================
    -- PRIMARY CONTACT INFO
    -- ===================
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255) GENERATED ALWAYS AS (
        CASE
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL
            THEN first_name || ' ' || last_name
            WHEN company_name IS NOT NULL THEN company_name
            ELSE COALESCE(first_name, last_name, 'Unknown')
        END
    ) STORED,

    -- For commercial/business contacts
    company_name VARCHAR(255),
    job_title VARCHAR(100),

    -- Primary Communication
    email VARCHAR(255),
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),
    phone_primary_type VARCHAR(20) DEFAULT 'mobile', -- mobile, home, work, other
    phone_secondary_type VARCHAR(20),

    -- Communication Preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'phone', -- phone, email, text, mail
    best_time_to_contact VARCHAR(50), -- "Mornings", "After 5pm", "Weekends"
    do_not_call BOOLEAN DEFAULT false,
    do_not_email BOOLEAN DEFAULT false,
    do_not_text BOOLEAN DEFAULT false,

    -- Language
    preferred_language VARCHAR(10) DEFAULT 'en', -- en, es, etc.

    -- ===================
    -- PRIMARY ADDRESS (Service Address)
    -- ===================
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    country VARCHAR(2) DEFAULT 'US',

    -- Full address for display
    full_address VARCHAR(500) GENERATED ALWAYS AS (
        CASE WHEN address_line1 IS NOT NULL THEN
            address_line1 ||
            CASE WHEN address_line2 IS NOT NULL THEN ', ' || address_line2 ELSE '' END ||
            CASE WHEN city IS NOT NULL THEN ', ' || city ELSE '' END ||
            CASE WHEN state IS NOT NULL THEN ', ' || state ELSE '' END ||
            CASE WHEN zip_code IS NOT NULL THEN ' ' || zip_code ELSE '' END
        ELSE NULL END
    ) STORED,

    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- ===================
    -- PROPERTY DETAILS (Primary Property)
    -- ===================
    property_type VARCHAR(50) DEFAULT 'single_family', -- single_family, townhouse, condo, multi_family, commercial, industrial
    year_built INTEGER,
    square_footage INTEGER,
    stories INTEGER DEFAULT 1,

    -- Roof Details
    roof_type VARCHAR(50), -- asphalt_shingle, metal, tile, flat, slate, cedar, other
    roof_age_years INTEGER,
    last_roof_date DATE,
    roof_squares DECIMAL(8, 2), -- 1 square = 100 sq ft

    -- HOA Information
    hoa_name VARCHAR(255),
    hoa_contact_name VARCHAR(100),
    hoa_contact_phone VARCHAR(20),
    hoa_contact_email VARCHAR(255),
    hoa_approval_required BOOLEAN DEFAULT false,

    -- ===================
    -- SALES & MARKETING
    -- ===================
    lead_source VARCHAR(100), -- website, referral, door_knock, home_show, google, facebook, yard_sign, repeat
    lead_source_detail VARCHAR(255), -- Specific detail: "Referred by John Smith", "Google Search - roof repair"
    referral_contact_id UUID REFERENCES contacts(id), -- Who referred this customer

    -- Sales Assignment
    assigned_sales_rep_id UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE,

    -- Lead Scoring
    lead_score INTEGER DEFAULT 0, -- 0-100
    lead_temperature VARCHAR(20), -- cold, warm, hot

    -- Marketing
    marketing_opt_in BOOLEAN DEFAULT true,
    email_campaigns_enabled BOOLEAN DEFAULT true,

    -- ===================
    -- RELATIONSHIP TRACKING
    -- ===================
    first_contact_date DATE DEFAULT CURRENT_DATE,
    first_job_date DATE,
    last_job_date DATE,
    last_contact_date TIMESTAMP WITH TIME ZONE,

    -- Lifetime Value
    total_jobs INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    lifetime_value DECIMAL(12, 2) DEFAULT 0.00,

    -- Satisfaction
    nps_score INTEGER, -- -100 to 100
    last_review_rating DECIMAL(2, 1), -- 1.0 to 5.0
    review_count INTEGER DEFAULT 0,

    -- ===================
    -- ADDITIONAL CONTACTS
    -- ===================
    -- For properties with multiple decision makers
    secondary_contact_name VARCHAR(100),
    secondary_contact_phone VARCHAR(20),
    secondary_contact_email VARCHAR(255),
    secondary_contact_relationship VARCHAR(50), -- spouse, co-owner, tenant, property_manager

    -- ===================
    -- BILLING (if different from service address)
    -- ===================
    billing_same_as_service BOOLEAN DEFAULT true,
    billing_name VARCHAR(255),
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(2),
    billing_zip_code VARCHAR(10),
    billing_email VARCHAR(255),

    -- ===================
    -- NOTES & METADATA
    -- ===================
    internal_notes TEXT, -- Private notes
    property_access_notes TEXT, -- Gate codes, parking, key location
    special_instructions TEXT,

    -- Tags for filtering/segmentation
    tags TEXT[], -- ['vip', 'insurance_specialist', 'repeat_customer', 'referral_source']

    -- Custom Fields (flexible)
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    metadata JSONB DEFAULT '{
        "interactions": [],
        "campaigns": [],
        "documents_count": 0
    }'::jsonb,

    -- ===================
    -- PORTAL ACCESS
    -- ===================
    has_portal_access BOOLEAN DEFAULT false,
    portal_user_id UUID REFERENCES users(id), -- If customer has login

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_contact_type CHECK (contact_type IN ('lead', 'prospect', 'customer', 'past_customer', 'vendor', 'other')),
    CONSTRAINT valid_customer_status CHECK (customer_status IN ('active', 'inactive', 'do_not_contact', 'deceased')),
    CONSTRAINT valid_account_type CHECK (account_type IN ('homeowner', 'property_manager', 'business', 'hoa', 'government', 'referral_partner', 'other'))
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookups
CREATE INDEX idx_contacts_organization ON contacts(organization_id);
CREATE INDEX idx_contacts_contact_number ON contacts(contact_number);
CREATE INDEX idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX idx_contacts_customer_status ON contacts(customer_status);

-- Name searches
CREATE INDEX idx_contacts_last_name ON contacts(last_name);
CREATE INDEX idx_contacts_company_name ON contacts(company_name);

-- Contact info
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone_primary ON contacts(phone_primary);

-- Location
CREATE INDEX idx_contacts_zip_code ON contacts(zip_code);
CREATE INDEX idx_contacts_city_state ON contacts(city, state);

-- Sales
CREATE INDEX idx_contacts_assigned_sales ON contacts(assigned_sales_rep_id);
CREATE INDEX idx_contacts_lead_source ON contacts(lead_source);
CREATE INDEX idx_contacts_lead_temperature ON contacts(lead_temperature);

-- Dates
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX idx_contacts_last_contact ON contacts(last_contact_date DESC);

-- Tags (GIN for array search)
CREATE INDEX idx_contacts_tags ON contacts USING gin(tags);

-- Soft delete
CREATE INDEX idx_contacts_deleted_at ON contacts(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_contacts_search ON contacts USING gin(
    to_tsvector('english',
        coalesce(first_name, '') || ' ' ||
        coalesce(last_name, '') || ' ' ||
        coalesce(company_name, '') || ' ' ||
        coalesce(email, '') || ' ' ||
        coalesce(full_address, '') || ' ' ||
        coalesce(phone_primary, '')
    )
);

-- Trigram index for fuzzy name matching
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin(
    (coalesce(first_name, '') || ' ' || coalesce(last_name, '')) gin_trgm_ops
);

-- Trigger
CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ADDITIONAL PROPERTIES TABLE
-- =====================================================
-- For customers with multiple properties (property managers, investors)

CREATE TABLE contact_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Property Identification
    property_name VARCHAR(255), -- "Rental Property 1", "Main Office"
    is_primary BOOLEAN DEFAULT false,

    -- Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    county VARCHAR(100),

    full_address VARCHAR(500) GENERATED ALWAYS AS (
        address_line1 ||
        CASE WHEN address_line2 IS NOT NULL THEN ', ' || address_line2 ELSE '' END ||
        ', ' || city || ', ' || state || ' ' || zip_code
    ) STORED,

    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Property Details
    property_type VARCHAR(50) DEFAULT 'single_family',
    year_built INTEGER,
    square_footage INTEGER,
    stories INTEGER DEFAULT 1,

    -- Roof Details
    roof_type VARCHAR(50),
    roof_age_years INTEGER,
    last_roof_date DATE,
    roof_squares DECIMAL(8, 2),

    -- Access
    access_notes TEXT,
    gate_code VARCHAR(50),

    -- Tenant (if rental)
    tenant_name VARCHAR(100),
    tenant_phone VARCHAR(20),
    tenant_email VARCHAR(255),

    -- Notes
    notes TEXT,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contact_properties_contact ON contact_properties(contact_id);
CREATE INDEX idx_contact_properties_organization ON contact_properties(organization_id);
CREATE INDEX idx_contact_properties_zip ON contact_properties(zip_code);
CREATE INDEX idx_contact_properties_primary ON contact_properties(is_primary) WHERE is_primary = true;
CREATE INDEX idx_contact_properties_deleted ON contact_properties(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER contact_properties_updated_at
    BEFORE UPDATE ON contact_properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONTACT INTERACTIONS TABLE
-- =====================================================
-- Track all interactions with contacts (calls, emails, visits)

CREATE TABLE contact_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Interaction Details
    interaction_type VARCHAR(30) NOT NULL, -- call, email, text, in_person, meeting, door_knock, voicemail
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    subject VARCHAR(255),
    description TEXT,

    -- Communication Details
    phone_number VARCHAR(20), -- Number called/texted
    email_address VARCHAR(255), -- Email used
    duration_minutes INTEGER, -- For calls

    -- Outcome
    outcome VARCHAR(50), -- connected, no_answer, left_voicemail, scheduled_appointment, not_interested
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,

    -- Related Entities
    job_id UUID, -- Will reference jobs table

    -- User
    user_id UUID NOT NULL REFERENCES users(id),

    -- Audit Fields
    interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
        'call', 'email', 'text', 'in_person', 'meeting', 'door_knock',
        'voicemail', 'mail', 'social_media', 'chat', 'other'
    )),
    CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound'))
);

CREATE INDEX idx_contact_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_contact_interactions_organization ON contact_interactions(organization_id);
CREATE INDEX idx_contact_interactions_type ON contact_interactions(interaction_type);
CREATE INDEX idx_contact_interactions_user ON contact_interactions(user_id);
CREATE INDEX idx_contact_interactions_date ON contact_interactions(interaction_at DESC);
CREATE INDEX idx_contact_interactions_follow_up ON contact_interactions(follow_up_date) WHERE follow_up_required = true;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create new contact with auto-generated number
CREATE OR REPLACE FUNCTION create_contact(
    p_organization_id UUID,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_email VARCHAR DEFAULT NULL,
    p_phone VARCHAR DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
    v_contact_number VARCHAR(50);
BEGIN
    -- Generate contact number
    v_contact_number := generate_sequence_number(p_organization_id, 'customer');

    INSERT INTO contacts (
        organization_id,
        contact_number,
        first_name,
        last_name,
        email,
        phone_primary,
        created_by
    ) VALUES (
        p_organization_id,
        v_contact_number,
        p_first_name,
        p_last_name,
        p_email,
        p_phone,
        p_created_by
    )
    RETURNING id INTO v_contact_id;

    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Update contact statistics
CREATE OR REPLACE FUNCTION update_contact_stats(p_contact_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE contacts
    SET
        last_contact_date = (
            SELECT MAX(interaction_at)
            FROM contact_interactions
            WHERE contact_id = p_contact_id
        ),
        updated_at = NOW()
    WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Search contacts
CREATE OR REPLACE FUNCTION search_contacts(
    p_organization_id UUID,
    p_search_term VARCHAR,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    id UUID,
    contact_number VARCHAR,
    full_name VARCHAR,
    company_name VARCHAR,
    email VARCHAR,
    phone_primary VARCHAR,
    full_address VARCHAR,
    contact_type VARCHAR,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.contact_number,
        c.full_name,
        c.company_name,
        c.email,
        c.phone_primary,
        c.full_address,
        c.contact_type,
        ts_rank(
            to_tsvector('english',
                coalesce(c.first_name, '') || ' ' ||
                coalesce(c.last_name, '') || ' ' ||
                coalesce(c.company_name, '') || ' ' ||
                coalesce(c.email, '') || ' ' ||
                coalesce(c.phone_primary, '')
            ),
            plainto_tsquery('english', p_search_term)
        ) AS rank
    FROM contacts c
    WHERE c.organization_id = p_organization_id
    AND c.deleted_at IS NULL
    AND (
        to_tsvector('english',
            coalesce(c.first_name, '') || ' ' ||
            coalesce(c.last_name, '') || ' ' ||
            coalesce(c.company_name, '') || ' ' ||
            coalesce(c.email, '') || ' ' ||
            coalesce(c.phone_primary, '')
        ) @@ plainto_tsquery('english', p_search_term)
        OR c.contact_number ILIKE '%' || p_search_term || '%'
        OR c.phone_primary ILIKE '%' || p_search_term || '%'
    )
    ORDER BY rank DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contacts IS 'Root entity - all customers/contacts. Everything flows from here.';
COMMENT ON TABLE contact_properties IS 'Additional properties for contacts with multiple locations';
COMMENT ON TABLE contact_interactions IS 'Track all interactions (calls, emails, meetings) with contacts';

COMMENT ON COLUMN contacts.contact_number IS 'Auto-generated unique identifier (CUST-2024-00001)';
COMMENT ON COLUMN contacts.lead_source IS 'How customer found us: website, referral, door_knock, etc.';
COMMENT ON COLUMN contacts.lifetime_value IS 'Total revenue from this customer over time';
COMMENT ON COLUMN contacts.roof_squares IS 'Roof size in squares (1 square = 100 sq ft)';

-- =====================================================
-- SCHEMA FILE: 003
-- =====================================================

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

-- =====================================================
-- SCHEMA FILE: 004
-- =====================================================

-- =====================================================
-- 004-claims.sql
-- Insurance Claims - OPTIONAL link for insurance jobs
-- Only used when job.is_insurance_job = true
-- =====================================================

-- =====================================================
-- CLAIMS TABLE
-- =====================================================
-- Detailed insurance claim tracking
-- Links to job (which links to customer)

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- ===================
    -- CLAIM IDENTIFICATION
    -- ===================
    claim_number VARCHAR(100) UNIQUE NOT NULL, -- Insurance company claim #
    internal_claim_number VARCHAR(50), -- Our internal reference

    -- ===================
    -- JOB & CUSTOMER LINK
    -- ===================
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,

    -- ===================
    -- INSURANCE COMPANY
    -- ===================
    insurance_company VARCHAR(255) NOT NULL,
    insurance_company_phone VARCHAR(20),
    insurance_company_fax VARCHAR(20),
    insurance_company_email VARCHAR(255),
    insurance_company_address TEXT,

    policy_number VARCHAR(100),
    policy_type VARCHAR(50), -- homeowners, commercial, landlord, condo

    -- ===================
    -- ADJUSTER INFO
    -- ===================
    adjuster_name VARCHAR(100),
    adjuster_phone VARCHAR(20),
    adjuster_email VARCHAR(255),
    adjuster_company VARCHAR(255), -- If third-party adjuster

    -- Field Adjuster (may be different)
    field_adjuster_name VARCHAR(100),
    field_adjuster_phone VARCHAR(20),
    field_adjuster_email VARCHAR(255),

    -- ===================
    -- LOSS DETAILS
    -- ===================
    date_of_loss DATE NOT NULL,
    loss_type VARCHAR(50) NOT NULL, -- hail, wind, fire, water, other
    loss_description TEXT,

    -- Storm/Event Details
    storm_name VARCHAR(100), -- Hurricane name, etc.
    storm_date DATE,

    -- ===================
    -- CLAIM STATUS
    -- ===================
    status VARCHAR(30) NOT NULL DEFAULT 'filed',
    -- filed, adjuster_assigned, inspection_scheduled, inspection_complete,
    -- estimate_received, approved, supplement_filed, supplement_approved,
    -- settled, closed, denied, reopened

    status_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    denial_reason TEXT,

    -- ===================
    -- INSPECTION
    -- ===================
    inspection_scheduled_date TIMESTAMP WITH TIME ZONE,
    inspection_completed_date TIMESTAMP WITH TIME ZONE,
    inspection_type VARCHAR(30), -- initial, reinspection, supplement
    we_met_adjuster BOOLEAN DEFAULT false,

    -- ===================
    -- FINANCIALS - Insurance Values
    -- ===================
    -- RCV = Replacement Cost Value (full cost)
    -- ACV = Actual Cash Value (RCV - Depreciation)

    rcv_roof DECIMAL(12, 2),
    rcv_gutters DECIMAL(12, 2),
    rcv_siding DECIMAL(12, 2),
    rcv_other DECIMAL(12, 2),
    rcv_total DECIMAL(12, 2),

    acv_roof DECIMAL(12, 2),
    acv_gutters DECIMAL(12, 2),
    acv_siding DECIMAL(12, 2),
    acv_other DECIMAL(12, 2),
    acv_total DECIMAL(12, 2),

    depreciation_roof DECIMAL(12, 2),
    depreciation_gutters DECIMAL(12, 2),
    depreciation_siding DECIMAL(12, 2),
    depreciation_other DECIMAL(12, 2),
    depreciation_total DECIMAL(12, 2),

    depreciation_recoverable BOOLEAN DEFAULT true,

    -- ===================
    -- DEDUCTIBLE
    -- ===================
    deductible_amount DECIMAL(10, 2),
    deductible_type VARCHAR(30) DEFAULT 'flat', -- flat, percentage
    deductible_percentage DECIMAL(5, 2), -- If percentage-based
    deductible_collected BOOLEAN DEFAULT false,
    deductible_collected_date DATE,
    deductible_collected_amount DECIMAL(10, 2),
    deductible_payment_method VARCHAR(30),

    -- ===================
    -- SUPPLEMENTS
    -- ===================
    supplement_filed BOOLEAN DEFAULT false,
    supplement_filed_date DATE,
    supplement_amount DECIMAL(12, 2),
    supplement_approved BOOLEAN DEFAULT false,
    supplement_approved_date DATE,
    supplement_approved_amount DECIMAL(12, 2),
    supplement_notes TEXT,

    -- Multiple supplements tracking
    supplement_count INTEGER DEFAULT 0,
    total_supplement_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- ===================
    -- PAYMENTS FROM INSURANCE
    -- ===================
    initial_check_amount DECIMAL(12, 2),
    initial_check_date DATE,
    initial_check_number VARCHAR(50),

    depreciation_check_amount DECIMAL(12, 2),
    depreciation_check_date DATE,
    depreciation_check_number VARCHAR(50),

    supplement_check_amount DECIMAL(12, 2),
    supplement_check_date DATE,
    supplement_check_number VARCHAR(50),

    total_insurance_paid DECIMAL(12, 2) DEFAULT 0.00,

    -- ===================
    -- MORTGAGE COMPANY
    -- ===================
    has_mortgage BOOLEAN DEFAULT false,
    mortgage_company VARCHAR(255),
    mortgage_company_phone VARCHAR(20),
    mortgage_company_address TEXT,
    mortgage_loan_number VARCHAR(100),

    -- Mortgage check handling
    check_made_to_mortgage BOOLEAN DEFAULT false,
    mortgage_check_sent_date DATE,
    mortgage_check_received_date DATE,
    mortgage_endorsement_received BOOLEAN DEFAULT false,

    -- ===================
    -- PUBLIC ADJUSTER
    -- ===================
    using_public_adjuster BOOLEAN DEFAULT false,
    public_adjuster_name VARCHAR(100),
    public_adjuster_company VARCHAR(255),
    public_adjuster_phone VARCHAR(20),
    public_adjuster_email VARCHAR(255),
    public_adjuster_fee_percentage DECIMAL(5, 2),

    -- ===================
    -- DOCUMENTATION
    -- ===================
    scope_sheet_received BOOLEAN DEFAULT false,
    scope_sheet_date DATE,
    estimate_received BOOLEAN DEFAULT false,
    estimate_received_date DATE,

    -- ===================
    -- NOTES
    -- ===================
    internal_notes TEXT,
    adjuster_notes TEXT,
    timeline_notes TEXT,

    -- ===================
    -- METADATA
    -- ===================
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,

    metadata JSONB DEFAULT '{
        "communications": [],
        "document_ids": []
    }'::jsonb,

    -- ===================
    -- AUDIT FIELDS
    -- ===================
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_claim_status CHECK (status IN (
        'filed', 'adjuster_assigned', 'inspection_scheduled', 'inspection_complete',
        'estimate_received', 'negotiating', 'approved', 'supplement_filed',
        'supplement_approved', 'settled', 'closed', 'denied', 'reopened', 'cancelled'
    )),
    CONSTRAINT valid_loss_type CHECK (loss_type IN (
        'hail', 'wind', 'hurricane', 'tornado', 'fire', 'water', 'flood',
        'lightning', 'fallen_tree', 'vandalism', 'other'
    ))
);

-- Indexes
CREATE INDEX idx_claims_organization ON claims(organization_id);
CREATE INDEX idx_claims_job ON claims(job_id);
CREATE INDEX idx_claims_contact ON claims(contact_id);
CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_insurance_company ON claims(insurance_company);
CREATE INDEX idx_claims_date_of_loss ON claims(date_of_loss);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_deleted ON claims(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_claims_search ON claims USING gin(
    to_tsvector('english',
        coalesce(claim_number, '') || ' ' ||
        coalesce(insurance_company, '') || ' ' ||
        coalesce(adjuster_name, '') || ' ' ||
        coalesce(policy_number, '')
    )
);

CREATE TRIGGER claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CLAIM SUPPLEMENTS TABLE
-- =====================================================
-- Track multiple supplements per claim

CREATE TABLE claim_supplements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Supplement Details
    supplement_number INTEGER NOT NULL, -- 1, 2, 3...
    description TEXT,
    reason TEXT, -- Why supplement was needed

    -- Amounts
    amount_requested DECIMAL(12, 2),
    amount_approved DECIMAL(12, 2),

    -- Status
    status VARCHAR(30) DEFAULT 'draft', -- draft, submitted, under_review, approved, denied, partial

    -- Dates
    date_submitted DATE,
    date_approved DATE,

    -- Notes
    notes TEXT,
    denial_reason TEXT,

    -- Documents
    document_ids UUID[],

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(claim_id, supplement_number)
);

CREATE INDEX idx_claim_supplements_claim ON claim_supplements(claim_id);
CREATE INDEX idx_claim_supplements_org ON claim_supplements(organization_id);
CREATE INDEX idx_claim_supplements_status ON claim_supplements(status);

CREATE TRIGGER claim_supplements_updated_at
    BEFORE UPDATE ON claim_supplements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSURANCE COMPANIES TABLE
-- =====================================================
-- Lookup table for insurance companies

CREATE TABLE insurance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Company Info
    company_name VARCHAR(255) NOT NULL,
    company_code VARCHAR(20), -- Short code

    -- Contact
    main_phone VARCHAR(20),
    claims_phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),

    -- Claims Handling
    average_response_days INTEGER,
    typical_deductible_type VARCHAR(30), -- flat, percentage

    -- Experience
    total_claims_filed INTEGER DEFAULT 0,
    total_claims_approved INTEGER DEFAULT 0,
    total_claims_denied INTEGER DEFAULT 0,
    average_approval_amount DECIMAL(12, 2),

    -- Rating
    difficulty_rating INTEGER, -- 1-5, 5 being most difficult

    -- Notes
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(organization_id, company_name)
);

CREATE INDEX idx_insurance_companies_org ON insurance_companies(organization_id);
CREATE INDEX idx_insurance_companies_name ON insurance_companies(company_name);
CREATE INDEX idx_insurance_companies_active ON insurance_companies(is_active) WHERE is_active = true;
CREATE INDEX idx_insurance_companies_deleted ON insurance_companies(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER insurance_companies_updated_at
    BEFORE UPDATE ON insurance_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create claim from job
CREATE OR REPLACE FUNCTION create_claim_from_job(
    p_job_id UUID,
    p_claim_number VARCHAR(100),
    p_date_of_loss DATE,
    p_loss_type VARCHAR(50),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_claim_id UUID;
    v_job RECORD;
BEGIN
    -- Get job info
    SELECT * INTO v_job FROM jobs WHERE id = p_job_id;

    IF NOT v_job.is_insurance_job THEN
        RAISE EXCEPTION 'Job is not marked as insurance job';
    END IF;

    INSERT INTO claims (
        organization_id,
        job_id,
        contact_id,
        claim_number,
        insurance_company,
        policy_number,
        adjuster_name,
        adjuster_phone,
        adjuster_email,
        date_of_loss,
        loss_type,
        deductible_amount,
        created_by
    ) VALUES (
        v_job.organization_id,
        p_job_id,
        v_job.contact_id,
        p_claim_number,
        v_job.insurance_company,
        v_job.insurance_policy_number,
        v_job.adjuster_name,
        v_job.adjuster_phone,
        v_job.adjuster_email,
        p_date_of_loss,
        p_loss_type,
        v_job.insurance_deductible,
        p_created_by
    )
    RETURNING id INTO v_claim_id;

    RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate claim totals
CREATE OR REPLACE FUNCTION calculate_claim_totals(p_claim_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE claims
    SET
        rcv_total = COALESCE(rcv_roof, 0) + COALESCE(rcv_gutters, 0) +
                    COALESCE(rcv_siding, 0) + COALESCE(rcv_other, 0),
        acv_total = COALESCE(acv_roof, 0) + COALESCE(acv_gutters, 0) +
                    COALESCE(acv_siding, 0) + COALESCE(acv_other, 0),
        depreciation_total = COALESCE(depreciation_roof, 0) + COALESCE(depreciation_gutters, 0) +
                             COALESCE(depreciation_siding, 0) + COALESCE(depreciation_other, 0),
        total_insurance_paid = COALESCE(initial_check_amount, 0) +
                               COALESCE(depreciation_check_amount, 0) +
                               COALESCE(supplement_check_amount, 0),
        updated_at = NOW()
    WHERE id = p_claim_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE claims IS 'Insurance claim details - linked to job for insurance work';
COMMENT ON TABLE claim_supplements IS 'Track multiple supplement requests per claim';
COMMENT ON TABLE insurance_companies IS 'Lookup table for insurance companies with experience data';

COMMENT ON COLUMN claims.rcv_total IS 'Replacement Cost Value - full replacement cost';
COMMENT ON COLUMN claims.acv_total IS 'Actual Cash Value - RCV minus depreciation';
COMMENT ON COLUMN claims.depreciation_recoverable IS 'True if depreciation can be recovered after work completion';

-- =====================================================
-- SCHEMA FILE: 005
-- =====================================================

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

-- =====================================================
-- SCHEMA FILE: 006
-- =====================================================

-- =====================================================
-- 006-production.sql
-- Production: Crews, Labor, Scheduling
-- =====================================================

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

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE crews IS 'Production crews - internal and subcontractor';
COMMENT ON TABLE crew_members IS 'Individual workers in crews';
COMMENT ON TABLE job_crew_assignments IS 'Schedule crews to jobs';
COMMENT ON TABLE labor_tickets IS 'Daily labor tracking for production';
COMMENT ON TABLE production_schedule IS 'Calendar events for production';
COMMENT ON TABLE job_tasks IS 'Tasks and checklists for jobs';
COMMENT ON TABLE quality_inspections IS 'Internal quality control inspections';

-- =====================================================
-- SCHEMA FILE: 007
-- =====================================================

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

-- =====================================================
-- SCHEMA FILE: 008
-- =====================================================

-- =====================================================
-- 008-finances.sql
-- Finances: Invoices, Payments, Payment Plans
-- =====================================================

-- =====================================================
-- INVOICES TABLE
-- =====================================================
-- Invoices generated from estimates/jobs

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

    -- Invoice Identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- INV-2024-00001

    -- Invoice Type
    invoice_type VARCHAR(30) DEFAULT 'standard', -- standard, deposit, progress, final, supplement

    -- Dates
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Billing Info (snapshot at time of invoice)
    bill_to_name VARCHAR(255),
    bill_to_address TEXT,
    bill_to_email VARCHAR(255),

    -- Amounts
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_reason VARCHAR(255),
    total_amount DECIMAL(12, 2) DEFAULT 0.00,

    -- Payment Tracking
    amount_paid DECIMAL(12, 2) DEFAULT 0.00,
    balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - amount_paid
    ) STORED,

    -- Status
    status VARCHAR(30) DEFAULT 'draft',
    -- draft, sent, viewed, partial, paid, overdue, void, disputed

    -- Sent Info
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_via VARCHAR(20), -- email, mail, portal, hand_delivered
    sent_to_email VARCHAR(255),
    viewed_at TIMESTAMP WITH TIME ZONE,

    -- For insurance jobs
    insurance_billed BOOLEAN DEFAULT false,
    insurance_claim_id UUID REFERENCES claims(id),
    insurance_portion DECIMAL(12, 2) DEFAULT 0.00,
    customer_portion DECIMAL(12, 2) DEFAULT 0.00,

    -- Notes
    public_notes TEXT, -- Shown on invoice
    internal_notes TEXT, -- Private
    terms_and_conditions TEXT,

    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by UUID REFERENCES users(id),
    void_reason TEXT,

    CONSTRAINT valid_invoice_status CHECK (status IN (
        'draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'disputed', 'write_off'
    ))
);

CREATE INDEX idx_invoices_job ON invoices(job_id);
CREATE INDEX idx_invoices_estimate ON invoices(estimate_id);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_overdue ON invoices(due_date, status) WHERE status NOT IN ('paid', 'void');
CREATE INDEX idx_invoices_deleted ON invoices(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INVOICE LINE ITEMS TABLE
-- =====================================================
-- Individual items on invoices

CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Line Number
    line_number INTEGER NOT NULL,

    -- Item Details
    description VARCHAR(500) NOT NULL,
    category VARCHAR(50), -- labor, materials, permits, disposal, other

    -- Quantity & Pricing
    quantity DECIMAL(10, 2) DEFAULT 1.00,
    unit VARCHAR(20) DEFAULT 'EA', -- EA, SQ, HR, LF, etc.
    unit_price DECIMAL(10, 4) NOT NULL,

    -- Calculated
    line_total DECIMAL(12, 2) GENERATED ALWAYS AS (
        ROUND((quantity * unit_price)::numeric, 2)
    ) STORED,

    -- Taxable
    is_taxable BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(invoice_id, line_number)
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_org ON invoice_line_items(organization_id);

CREATE TRIGGER invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
-- Payments received from customers

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Payment Identification
    payment_number VARCHAR(50) UNIQUE NOT NULL, -- PAY-2024-00001

    -- Payment Details
    payment_date DATE DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL,

    -- Payment Method
    payment_method VARCHAR(30) NOT NULL, -- cash, check, credit_card, debit_card, ach, financing, insurance, other

    -- Method-specific Details
    check_number VARCHAR(50),
    check_date DATE,
    check_bank VARCHAR(100),

    card_last_four VARCHAR(4),
    card_type VARCHAR(20), -- visa, mastercard, amex, discover
    card_auth_code VARCHAR(50),

    ach_confirmation VARCHAR(100),

    -- Processing
    processor VARCHAR(50), -- stripe, square, quickbooks, manual
    processor_transaction_id VARCHAR(255),
    processor_fee DECIMAL(8, 2) DEFAULT 0.00,
    net_amount DECIMAL(12, 2), -- amount - processor_fee

    -- Source
    payment_source VARCHAR(30) DEFAULT 'customer', -- customer, insurance, financing, adjustment

    -- For insurance payments
    insurance_check_number VARCHAR(50),
    insurance_company_name VARCHAR(255),

    -- For financing
    financing_company VARCHAR(100),
    financing_reference VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed, refunded, partial_refund

    -- Deposit to
    deposit_account VARCHAR(100),
    deposited_date DATE,

    -- Notes
    memo TEXT,
    internal_notes TEXT,

    -- Received By
    received_by UUID REFERENCES users(id),

    -- Refund Info
    refund_amount DECIMAL(12, 2) DEFAULT 0.00,
    refund_date DATE,
    refund_reason TEXT,

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'cash', 'check', 'credit_card', 'debit_card', 'ach', 'wire',
        'financing', 'insurance', 'adjustment', 'other'
    )),
    CONSTRAINT valid_payment_status CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund', 'void'
    ))
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_job ON payments(job_id);
CREATE INDEX idx_payments_contact ON payments(contact_id);
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_number ON payments(payment_number);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);
CREATE INDEX idx_payments_method ON payments(payment_method);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENT PLANS TABLE
-- =====================================================
-- Payment plan arrangements for customers

CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Plan Details
    plan_name VARCHAR(100), -- "3-Month Payment Plan"
    total_amount DECIMAL(12, 2) NOT NULL,
    down_payment DECIMAL(12, 2) DEFAULT 0.00,
    remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - down_payment
    ) STORED,

    -- Schedule
    number_of_payments INTEGER NOT NULL,
    payment_frequency VARCHAR(20) DEFAULT 'monthly', -- weekly, bi_weekly, monthly
    payment_amount DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,

    -- Interest (if applicable)
    interest_rate DECIMAL(5, 4) DEFAULT 0.0000,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- pending, active, completed, defaulted, cancelled

    -- Tracking
    payments_made INTEGER DEFAULT 0,
    amount_collected DECIMAL(12, 2) DEFAULT 0.00,
    next_payment_date DATE,

    -- Auto-charge
    auto_charge_enabled BOOLEAN DEFAULT false,
    payment_method_on_file VARCHAR(50),

    -- Notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_plan_status CHECK (status IN (
        'pending', 'active', 'completed', 'defaulted', 'cancelled'
    ))
);

CREATE INDEX idx_payment_plans_invoice ON payment_plans(invoice_id);
CREATE INDEX idx_payment_plans_contact ON payment_plans(contact_id);
CREATE INDEX idx_payment_plans_org ON payment_plans(organization_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);
CREATE INDEX idx_payment_plans_next_payment ON payment_plans(next_payment_date) WHERE status = 'active';

CREATE TRIGGER payment_plans_updated_at
    BEFORE UPDATE ON payment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENT PLAN SCHEDULE TABLE
-- =====================================================
-- Individual scheduled payments in a plan

CREATE TABLE payment_plan_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Schedule
    payment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(12, 2) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, pending, paid, late, missed, waived

    -- Payment Link
    payment_id UUID REFERENCES payments(id),
    paid_date DATE,
    amount_paid DECIMAL(12, 2),

    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(payment_plan_id, payment_number),

    CONSTRAINT valid_schedule_status CHECK (status IN (
        'scheduled', 'pending', 'paid', 'late', 'missed', 'waived'
    ))
);

CREATE INDEX idx_payment_plan_schedule_plan ON payment_plan_schedule(payment_plan_id);
CREATE INDEX idx_payment_plan_schedule_org ON payment_plan_schedule(organization_id);
CREATE INDEX idx_payment_plan_schedule_due ON payment_plan_schedule(due_date);
CREATE INDEX idx_payment_plan_schedule_status ON payment_plan_schedule(status);
CREATE INDEX idx_payment_plan_schedule_upcoming ON payment_plan_schedule(due_date)
    WHERE status IN ('scheduled', 'pending');

CREATE TRIGGER payment_plan_schedule_updated_at
    BEFORE UPDATE ON payment_plan_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREDITS / ADJUSTMENTS TABLE
-- =====================================================
-- Credits, adjustments, and write-offs

CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Credit Details
    credit_number VARCHAR(50) UNIQUE NOT NULL, -- CR-2024-00001
    credit_type VARCHAR(30) NOT NULL, -- credit, adjustment, write_off, refund

    -- Amount
    amount DECIMAL(12, 2) NOT NULL,

    -- Related
    related_invoice_id UUID REFERENCES invoices(id),
    related_payment_id UUID REFERENCES payments(id),
    related_job_id UUID REFERENCES jobs(id),

    -- Reason
    reason VARCHAR(255),
    description TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, applied, void

    -- Applied
    amount_applied DECIMAL(12, 2) DEFAULT 0.00,
    amount_remaining DECIMAL(12, 2) GENERATED ALWAYS AS (
        amount - amount_applied
    ) STORED,

    -- Audit
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_credit_type CHECK (credit_type IN (
        'credit', 'adjustment', 'write_off', 'refund', 'goodwill'
    )),
    CONSTRAINT valid_credit_status CHECK (status IN ('active', 'applied', 'void'))
);

CREATE INDEX idx_credits_contact ON credits(contact_id);
CREATE INDEX idx_credits_org ON credits(organization_id);
CREATE INDEX idx_credits_invoice ON credits(related_invoice_id);
CREATE INDEX idx_credits_status ON credits(status);

CREATE TRIGGER credits_updated_at
    BEFORE UPDATE ON credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINANCING OPTIONS TABLE
-- =====================================================
-- Third-party financing options (GreenSky, Synchrony, etc.)

CREATE TABLE financing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Provider Info
    provider_name VARCHAR(100) NOT NULL, -- GreenSky, Synchrony, Service Finance
    provider_code VARCHAR(30),

    -- Plan Details
    plan_name VARCHAR(100) NOT NULL, -- "12 Month Same as Cash"
    plan_code VARCHAR(50),

    -- Terms
    term_months INTEGER,
    promo_period_months INTEGER,
    apr DECIMAL(5, 2), -- Annual percentage rate
    promo_apr DECIMAL(5, 2) DEFAULT 0.00, -- During promo period

    -- Fees
    dealer_fee_percent DECIMAL(5, 2) DEFAULT 0.00, -- What contractor pays
    minimum_amount DECIMAL(10, 2),
    maximum_amount DECIMAL(12, 2),

    -- Statu
    is_active BOOLEAN DEFAULT true,

    -- Display
    display_order INTEGER DEFAULT 0,
    description TEXT,

    -- Contact
    rep_name VARCHAR(100),
    rep_phone VARCHAR(20),
    rep_email VARCHAR(255),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financing_options_org ON financing_options(organization_id);
CREATE INDEX idx_financing_options_provider ON financing_options(provider_name);
CREATE INDEX idx_financing_options_active ON financing_options(is_active) WHERE is_active = true;

CREATE TRIGGER financing_options_updated_at
    BEFORE UPDATE ON financing_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINANCING APPLICATIONS TABLE
-- =====================================================
-- Customer financing applications

CREATE TABLE financing_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    financing_option_id UUID REFERENCES financing_options(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Application Details
    application_number VARCHAR(100),
    amount_requested DECIMAL(12, 2) NOT NULL,

    -- Status
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, submitted, approved, declined, expired, funded

    -- Approval Details
    amount_approved DECIMAL(12, 2),
    approval_date DATE,
    expiration_date DATE,

    -- Funding
    amount_funded DECIMAL(12, 2),
    funded_date DATE,

    -- Notes
    notes TEXT,
    decline_reason TEXT,

    -- Audit
    submitted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_financing_status CHECK (status IN (
        'pending', 'submitted', 'approved', 'declined', 'expired', 'funded', 'cancelled'
    ))
);

CREATE INDEX idx_financing_applications_contact ON financing_applications(contact_id);
CREATE INDEX idx_financing_applications_job ON financing_applications(job_id);
CREATE INDEX idx_financing_applications_org ON financing_applications(organization_id);
CREATE INDEX idx_financing_applications_status ON financing_applications(status);

CREATE TRIGGER financing_applications_updated_at
    BEFORE UPDATE ON financing_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create invoice from estimate
CREATE OR REPLACE FUNCTION create_invoice_from_estimate(
    p_estimate_id UUID,
    p_invoice_type VARCHAR DEFAULT 'standard',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number VARCHAR(50);
    v_estimate RECORD;
BEGIN
    SELECT * INTO v_estimate FROM estimates WHERE id = p_estimate_id;

    -- Generate invoice number
    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
        LPAD((SELECT COUNT(*) + 1 FROM invoices WHERE organization_id = v_estimate.organization_id)::TEXT, 5, '0');

    INSERT INTO invoices (
        organization_id,
        job_id,
        estimate_id,
        contact_id,
        invoice_number,
        invoice_type,
        bill_to_name,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        created_by
    )
    SELECT
        v_estimate.organization_id,
        v_estimate.job_id,
        p_estimate_id,
        v_estimate.contact_id,
        v_invoice_number,
        p_invoice_type,
        c.full_name,
        v_estimate.subtotal,
        v_estimate.tax_rate,
        v_estimate.tax_amount,
        v_estimate.total_amount,
        p_created_by
    FROM contacts c WHERE c.id = v_estimate.contact_id
    RETURNING id INTO v_invoice_id;

    -- Copy line items from estimate
    INSERT INTO invoice_line_items (
        invoice_id, organization_id, line_number, description,
        category, quantity, unit, unit_price, is_taxable
    )
    SELECT
        v_invoice_id,
        organization_id,
        ROW_NUMBER() OVER (ORDER BY id),
        item_name,
        category,
        quantity,
        unit,
        unit_price,
        is_taxable
    FROM estimate_line_items
    WHERE estimate_id = p_estimate_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Record payment and update invoice
CREATE OR REPLACE FUNCTION record_payment(
    p_invoice_id UUID,
    p_amount DECIMAL,
    p_payment_method VARCHAR,
    p_received_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_payment_number VARCHAR(50);
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;

    -- Generate payment number
    v_payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
        LPAD((SELECT COUNT(*) + 1 FROM payments WHERE organization_id = v_invoice.organization_id)::TEXT, 5, '0');

    INSERT INTO payments (
        organization_id,
        invoice_id,
        job_id,
        contact_id,
        payment_number,
        amount,
        payment_method,
        received_by
    ) VALUES (
        v_invoice.organization_id,
        p_invoice_id,
        v_invoice.job_id,
        v_invoice.contact_id,
        v_payment_number,
        p_amount,
        p_payment_method,
        p_received_by
    )
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Update invoice amounts when payments change
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid DECIMAL(12, 2);
    v_invoice RECORD;
BEGIN
    IF NEW.invoice_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_invoice FROM invoices WHERE id = NEW.invoice_id;

    SELECT COALESCE(SUM(amount - refund_amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE invoice_id = NEW.invoice_id
    AND status IN ('completed', 'partial_refund')
    AND deleted_at IS NULL;

    UPDATE invoices
    SET
        amount_paid = v_total_paid,
        status = CASE
            WHEN v_total_paid >= total_amount THEN 'paid'
            WHEN v_total_paid > 0 THEN 'partial'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_update_invoice
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- Recalculate invoice totals
CREATE OR REPLACE FUNCTION recalculate_invoice_totals(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12, 2);
    v_taxable_subtotal DECIMAL(12, 2);
    v_tax_rate DECIMAL(5, 4);
    v_discount DECIMAL(10, 2);
BEGIN
    SELECT
        COALESCE(SUM(line_total), 0),
        COALESCE(SUM(CASE WHEN is_taxable THEN line_total ELSE 0 END), 0)
    INTO v_subtotal, v_taxable_subtotal
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id;

    SELECT COALESCE(tax_rate, 0), COALESCE(discount_amount, 0)
    INTO v_tax_rate, v_discount
    FROM invoices WHERE id = p_invoice_id;

    UPDATE invoices
    SET
        subtotal = v_subtotal,
        tax_amount = ROUND((v_taxable_subtotal * v_tax_rate)::numeric, 2),
        total_amount = v_subtotal + ROUND((v_taxable_subtotal * v_tax_rate)::numeric, 2) - v_discount,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice totals
CREATE OR REPLACE FUNCTION trigger_recalculate_invoice()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_line_items_recalculate
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice();

-- Update contact lifetime value
CREATE OR REPLACE FUNCTION update_contact_lifetime_value(p_contact_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE contacts
    SET
        total_revenue = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE contact_id = p_contact_id
            AND status = 'completed'
            AND deleted_at IS NULL
        ),
        lifetime_value = (
            SELECT COALESCE(SUM(amount - COALESCE(refund_amount, 0)), 0)
            FROM payments
            WHERE contact_id = p_contact_id
            AND status IN ('completed', 'partial_refund')
            AND deleted_at IS NULL
        ),
        updated_at = NOW()
    WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update contact value on payment
CREATE OR REPLACE FUNCTION trigger_update_contact_value()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_contact_lifetime_value(COALESCE(NEW.contact_id, OLD.contact_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_update_contact_value
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_contact_value();

-- Check for overdue invoices (run daily via cron)
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE status IN ('sent', 'viewed', 'partial')
    AND due_date < CURRENT_DATE
    AND deleted_at IS NULL
    AND voided_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Accounts receivable aging
CREATE OR REPLACE VIEW accounts_receivable_aging AS
SELECT
    i.organization_id,
    i.contact_id,
    c.full_name AS customer_name,
    i.id AS invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
    CASE
        WHEN i.balance_due <= 0 THEN 'paid'
        WHEN i.due_date >= CURRENT_DATE THEN 'current'
        WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30'
        WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60'
        WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90'
        ELSE '90+'
    END AS aging_bucket,
    CURRENT_DATE - i.due_date AS days_overdue
FROM invoices i
JOIN contacts c ON i.contact_id = c.id
WHERE i.deleted_at IS NULL
AND i.voided_at IS NULL
AND i.balance_due > 0;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE invoices IS 'Invoices generated for jobs/estimates';
COMMENT ON TABLE invoice_line_items IS 'Individual line items on invoices';
COMMENT ON TABLE payments IS 'Customer payments received';
COMMENT ON TABLE payment_plans IS 'Payment plan arrangements';
COMMENT ON TABLE payment_plan_schedule IS 'Scheduled payments within payment plans';
COMMENT ON TABLE credits IS 'Credits, adjustments, and write-offs';
COMMENT ON TABLE financing_options IS 'Third-party financing options available';
COMMENT ON TABLE financing_applications IS 'Customer financing applications';

-- =====================================================
-- SCHEMA FILE: 009
-- =====================================================

-- =====================================================
-- 009-documents.sql
-- Documents: Photos, Files, Attachments
-- =====================================================

-- =====================================================
-- DOCUMENT FOLDERS TABLE
-- =====================================================
-- Organize documents into folders

CREATE TABLE document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Folder Info
    folder_name VARCHAR(100) NOT NULL,
    folder_path VARCHAR(500), -- /jobs/photos/before
    parent_folder_id UUID REFERENCES document_folders(id),

    -- Entity Link (polymorphic)
    entity_type VARCHAR(30), -- job, contact, estimate, claim, invoice
    entity_id UUID,

    -- Settings
    is_system_folder BOOLEAN DEFAULT false, -- Pre-created folders
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_document_folders_org ON document_folders(organization_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_folder_id);
CREATE INDEX idx_document_folders_entity ON document_folders(entity_type, entity_id);
CREATE INDEX idx_document_folders_deleted ON document_folders(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- All files and photos

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,

    -- File Info
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(20),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,

    -- Storage
    storage_provider VARCHAR(30) DEFAULT 'supabase', -- supabase, s3, gcs, azure
    storage_bucket VARCHAR(100),
    storage_path VARCHAR(500) NOT NULL, -- Full path in storage
    storage_url TEXT, -- Public/signed URL

    -- Document Type
    document_type VARCHAR(50) NOT NULL, -- photo, contract, estimate, invoice, permit, insurance, warranty, other

    -- Photo Specific
    is_photo BOOLEAN DEFAULT false,
    photo_type VARCHAR(30), -- before, during, after, damage, inspection, aerial, other

    -- Image Metadata
    width INTEGER,
    height INTEGER,
    exif_data JSONB,
    thumbnail_url TEXT,

    -- Entity Links (polymorphic)
    entity_type VARCHAR(30), -- job, contact, estimate, claim, invoice, material_order
    entity_id UUID,

    -- Additional Links (a document can belong to multiple entities)
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

    -- Categorization
    category VARCHAR(50), -- roof, interior, exterior, documentation, legal
    tags TEXT[],

    -- Description
    title VARCHAR(255),
    description TEXT,
    notes TEXT,

    -- Visibility
    is_customer_visible BOOLEAN DEFAULT false, -- Show in customer portal
    is_internal_only BOOLEAN DEFAULT false,

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- GPS Data (for photos)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    captured_at TIMESTAMP WITH TIME ZONE, -- When photo was taken

    -- Upload Info
    uploaded_by UUID REFERENCES users(id),
    upload_source VARCHAR(30), -- web, mobile, email, api

    -- Metadata
    custom_fields JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_document_type CHECK (document_type IN (
        'photo', 'contract', 'estimate', 'invoice', 'permit', 'insurance',
        'warranty', 'inspection', 'measurement', 'proposal', 'change_order',
        'receipt', 'license', 'certificate', 'agreement', 'other'
    ))
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_job ON documents(job_id);
CREATE INDEX idx_documents_contact ON documents(contact_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_photo_type ON documents(photo_type) WHERE is_photo = true;
CREATE INDEX idx_documents_customer_visible ON documents(is_customer_visible) WHERE is_customer_visible = true;
CREATE INDEX idx_documents_tags ON documents USING gin(tags);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_documents_deleted ON documents(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUMS TABLE
-- =====================================================
-- Group photos into albums for presentation

CREATE TABLE photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

    -- Album Info
    album_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Cover
    cover_photo_id UUID REFERENCES documents(id),

    -- Settings
    is_customer_shareable BOOLEAN DEFAULT false,
    share_token VARCHAR(64), -- For public sharing links

    -- Display
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_photo_albums_org ON photo_albums(organization_id);
CREATE INDEX idx_photo_albums_job ON photo_albums(job_id);
CREATE INDEX idx_photo_albums_share ON photo_albums(share_token) WHERE share_token IS NOT NULL;

CREATE TRIGGER photo_albums_updated_at
    BEFORE UPDATE ON photo_albums
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PHOTO ALBUM ITEMS TABLE
-- =====================================================
-- Photos in albums

CREATE TABLE photo_album_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Display
    sort_order INTEGER DEFAULT 0,
    caption TEXT,

    -- Audit
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_by UUID REFERENCES users(id),

    UNIQUE(album_id, document_id)
);

CREATE INDEX idx_photo_album_items_album ON photo_album_items(album_id);
CREATE INDEX idx_photo_album_items_document ON photo_album_items(document_id);

-- =====================================================
-- DOCUMENT TEMPLATES TABLE
-- =====================================================
-- Templates for contracts, proposals, etc.

CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template Info
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(30) NOT NULL, -- contract, proposal, warranty, welcome_packet, other

    -- Content
    content_type VARCHAR(20) DEFAULT 'html', -- html, markdown, pdf
    content TEXT,

    -- Variables (placeholders that can be filled)
    available_variables JSONB DEFAULT '[]'::jsonb,
    -- ["{{customer_name}}", "{{job_address}}", "{{contract_amount}}"]

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,

    -- Versioning
    version INTEGER DEFAULT 1,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_template_type CHECK (template_type IN (
        'contract', 'proposal', 'warranty', 'welcome_packet', 'change_order',
        'completion_certificate', 'lien_waiver', 'other'
    ))
);

CREATE INDEX idx_document_templates_org ON document_templates(organization_id);
CREATE INDEX idx_document_templates_type ON document_templates(template_type);
CREATE INDEX idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

CREATE TRIGGER document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- GENERATED DOCUMENTS TABLE
-- =====================================================
-- Documents generated from templates

CREATE TABLE generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id),

    -- Links
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,

    -- Document Info
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(30) NOT NULL,

    -- Content
    rendered_content TEXT, -- Final HTML/content
    pdf_url TEXT, -- If converted to PDF

    -- Variable Values Used
    variable_values JSONB DEFAULT '{}'::jsonb,

    -- Signature
    requires_signature BOOLEAN DEFAULT false,
    signature_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, viewed, signed, declined
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by_name VARCHAR(100),
    signature_ip VARCHAR(45),
    signature_data TEXT, -- Base64 signature image

    -- Sent
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_to_email VARCHAR(255),
    viewed_at TIMESTAMP WITH TIME ZONE,

    -- Stored Document
    document_id UUID REFERENCES documents(id), -- Link to stored PDF

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_documents_org ON generated_documents(organization_id);
CREATE INDEX idx_generated_documents_template ON generated_documents(template_id);
CREATE INDEX idx_generated_documents_job ON generated_documents(job_id);
CREATE INDEX idx_generated_documents_contact ON generated_documents(contact_id);
CREATE INDEX idx_generated_documents_signature ON generated_documents(signature_status)
    WHERE requires_signature = true;

CREATE TRIGGER generated_documents_updated_at
    BEFORE UPDATE ON generated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DOCUMENT SHARES TABLE
-- =====================================================
-- Track shared document access

CREATE TABLE document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,

    -- Share Token
    share_token VARCHAR(64) UNIQUE NOT NULL,

    -- Access Control
    requires_password BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    max_views INTEGER,
    view_count INTEGER DEFAULT 0,

    -- Permissions
    allow_download BOOLEAN DEFAULT true,

    -- Recipient
    shared_with_email VARCHAR(255),
    shared_with_name VARCHAR(100),

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT document_or_album CHECK (
        (document_id IS NOT NULL AND album_id IS NULL) OR
        (document_id IS NULL AND album_id IS NOT NULL)
    )
);

CREATE INDEX idx_document_shares_org ON document_shares(organization_id);
CREATE INDEX idx_document_shares_document ON document_shares(document_id);
CREATE INDEX idx_document_shares_album ON document_shares(album_id);
CREATE INDEX idx_document_shares_token ON document_shares(share_token);
CREATE INDEX idx_document_shares_expires ON document_shares(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- DOCUMENT ACCESS LOG TABLE
-- =====================================================
-- Track document views/downloads

CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    share_id UUID REFERENCES document_shares(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Access Info
    access_type VARCHAR(20) NOT NULL, -- view, download, print

    -- Who
    user_id UUID REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- When
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'download', 'print', 'share'))
);

CREATE INDEX idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_share ON document_access_log(share_id);
CREATE INDEX idx_document_access_log_org ON document_access_log(organization_id);
CREATE INDEX idx_document_access_log_accessed ON document_access_log(accessed_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create job photo folders
CREATE OR REPLACE FUNCTION create_job_document_folders(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
    v_org_id UUID;
    v_parent_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM jobs WHERE id = p_job_id;

    -- Create main job folder
    INSERT INTO document_folders (
        organization_id, folder_name, entity_type, entity_id, is_system_folder
    ) VALUES (
        v_org_id, 'Job Documents', 'job', p_job_id, true
    )
    RETURNING id INTO v_parent_id;

    -- Create sub-folders
    INSERT INTO document_folders (organization_id, folder_name, parent_folder_id, entity_type, entity_id, is_system_folder, sort_order)
    VALUES
        (v_org_id, 'Before Photos', v_parent_id, 'job', p_job_id, true, 1),
        (v_org_id, 'During Photos', v_parent_id, 'job', p_job_id, true, 2),
        (v_org_id, 'After Photos', v_parent_id, 'job', p_job_id, true, 3),
        (v_org_id, 'Damage Photos', v_parent_id, 'job', p_job_id, true, 4),
        (v_org_id, 'Aerial/Measurements', v_parent_id, 'job', p_job_id, true, 5),
        (v_org_id, 'Contracts', v_parent_id, 'job', p_job_id, true, 6),
        (v_org_id, 'Permits', v_parent_id, 'job', p_job_id, true, 7),
        (v_org_id, 'Insurance', v_parent_id, 'job', p_job_id, true, 8),
        (v_org_id, 'Other', v_parent_id, 'job', p_job_id, true, 9);
END;
$$ LANGUAGE plpgsql;

-- Auto-create folders for new jobs
CREATE OR REPLACE FUNCTION trigger_create_job_folders()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_job_document_folders(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_create_document_folders
    AFTER INSERT ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_job_folders();

-- Get job photo count by type
CREATE OR REPLACE FUNCTION get_job_photo_counts(p_job_id UUID)
RETURNS TABLE(
    photo_type VARCHAR,
    photo_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.photo_type,
        COUNT(*)
    FROM documents d
    WHERE d.job_id = p_job_id
    AND d.is_photo = true
    AND d.deleted_at IS NULL
    GROUP BY d.photo_type;
END;
$$ LANGUAGE plpgsql;

-- Generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create shareable album
CREATE OR REPLACE FUNCTION create_shareable_album(
    p_job_id UUID,
    p_album_name VARCHAR,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_album_id UUID;
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM jobs WHERE id = p_job_id;

    INSERT INTO photo_albums (
        organization_id,
        job_id,
        album_name,
        is_customer_shareable,
        share_token,
        created_by
    ) VALUES (
        v_org_id,
        p_job_id,
        p_album_name,
        true,
        generate_share_token(),
        p_created_by
    )
    RETURNING id INTO v_album_id;

    RETURN v_album_id;
END;
$$ LANGUAGE plpgsql;

-- Update job document count
CREATE OR REPLACE FUNCTION update_job_document_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update metadata on contacts table to track document counts
    IF NEW.job_id IS NOT NULL THEN
        UPDATE jobs
        SET updated_at = NOW()
        WHERE id = NEW.job_id;
    END IF;

    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET
            metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{documents_count}',
                (
                    SELECT COUNT(*)::text::jsonb
                    FROM documents
                    WHERE contact_id = NEW.contact_id
                    AND deleted_at IS NULL
                )
            ),
            updated_at = NOW()
        WHERE id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_update_counts
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_job_document_count();

-- =====================================================
-- VIEWS
-- =====================================================

-- Job documents summary
CREATE OR REPLACE VIEW job_documents_summary AS
SELECT
    j.id AS job_id,
    j.job_number,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'before') AS before_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'during') AS during_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'after') AS after_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true AND d.photo_type = 'damage') AS damage_photos,
    COUNT(d.id) FILTER (WHERE d.is_photo = true) AS total_photos,
    COUNT(d.id) FILTER (WHERE d.document_type = 'contract') AS contracts,
    COUNT(d.id) FILTER (WHERE d.document_type = 'permit') AS permits,
    COUNT(d.id) AS total_documents
FROM jobs j
LEFT JOIN documents d ON j.id = d.job_id AND d.deleted_at IS NULL
GROUP BY j.id, j.job_number;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE document_folders IS 'Folder organization for documents';
COMMENT ON TABLE documents IS 'All files, photos, and attachments';
COMMENT ON TABLE photo_albums IS 'Photo albums for grouping and sharing';
COMMENT ON TABLE photo_album_items IS 'Photos contained in albums';
COMMENT ON TABLE document_templates IS 'Templates for contracts, proposals, etc.';
COMMENT ON TABLE generated_documents IS 'Documents generated from templates';
COMMENT ON TABLE document_shares IS 'Shared document/album access links';
COMMENT ON TABLE document_access_log IS 'Track document views and downloads';

COMMENT ON COLUMN documents.photo_type IS 'Type of photo: before, during, after, damage, inspection, aerial';
COMMENT ON COLUMN documents.is_customer_visible IS 'Whether document is visible in customer portal';
COMMENT ON COLUMN document_shares.share_token IS 'Unique token for accessing shared documents';

-- =====================================================
-- SCHEMA FILE: 010
-- =====================================================

-- =====================================================
-- 010-communications.sql
-- Communications: Notes, Activity Log, Notifications, Messages
-- =====================================================

-- =====================================================
-- NOTES TABLE
-- =====================================================
-- Internal notes on any entity

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Entity Link (polymorphic)
    entity_type VARCHAR(30) NOT NULL, -- contact, job, estimate, claim, invoice
    entity_id UUID NOT NULL,

    -- Additional Links for easy querying
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Note Content
    note_type VARCHAR(30) DEFAULT 'general', -- general, follow_up, important, warning, system
    subject VARCHAR(255),
    content TEXT NOT NULL,

    -- Importance
    is_pinned BOOLEAN DEFAULT false,
    is_important BOOLEAN DEFAULT false,

    -- Follow-up
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_assigned_to UUID REFERENCES users(id),
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_completed_at TIMESTAMP WITH TIME ZONE,

    -- Visibility
    is_private BOOLEAN DEFAULT false, -- Only creator can see
    visible_to_roles TEXT[], -- Restrict to specific roles

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT valid_note_entity CHECK (entity_type IN (
        'contact', 'job', 'estimate', 'claim', 'invoice',
        'material_order', 'payment', 'crew', 'supplier'
    ))
);

CREATE INDEX idx_notes_org ON notes(organization_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_notes_contact ON notes(contact_id);
CREATE INDEX idx_notes_job ON notes(job_id);
CREATE INDEX idx_notes_pinned ON notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_follow_up ON notes(follow_up_date) WHERE requires_follow_up = true AND follow_up_completed = false;
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
CREATE INDEX idx_notes_deleted ON notes(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
-- Track all activities/changes

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Entity Link (polymorphic)
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,

    -- Activity Info
    activity_type VARCHAR(50) NOT NULL,
    -- created, updated, deleted, status_changed, assigned, unassigned,
    -- email_sent, sms_sent, call_logged, payment_received, etc.

    -- Description
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Changes (for updates)
    changes JSONB, -- {"field": {"old": "value1", "new": "value2"}}

    -- Related
    related_entity_type VARCHAR(30),
    related_entity_id UUID,

    -- Who
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100), -- Denormalized for history

    -- System vs User
    is_system_activity BOOLEAN DEFAULT false,

    -- IP/Device Info
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Partition by month for performance (optional)
-- CREATE INDEX idx_activity_log_month ON activity_log(DATE_TRUNC('month', created_at));

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- User notifications

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification Content
    notification_type VARCHAR(50) NOT NULL,
    -- assignment, mention, reminder, approval_needed, task_due,
    -- payment_received, job_status, message, system

    title VARCHAR(255) NOT NULL,
    message TEXT,
    icon VARCHAR(50), -- Icon name/class

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent

    -- Link
    action_url VARCHAR(500),
    entity_type VARCHAR(30),
    entity_id UUID,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Delivery
    send_push BOOLEAN DEFAULT true,
    send_email BOOLEAN DEFAULT false,
    send_sms BOOLEAN DEFAULT false,

    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMP WITH TIME ZONE,

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_notification_type CHECK (notification_type IN (
        'assignment', 'mention', 'reminder', 'approval_needed', 'task_due',
        'payment_received', 'job_status', 'message', 'document', 'system',
        'schedule_change', 'material_delivery', 'inspection', 'alert'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================
-- User notification preferences

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Notification Type
    notification_type VARCHAR(50) NOT NULL,

    -- Channels
    enable_push BOOLEAN DEFAULT true,
    enable_email BOOLEAN DEFAULT true,
    enable_sms BOOLEAN DEFAULT false,
    enable_in_app BOOLEAN DEFAULT true,

    -- Schedule
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME, -- e.g., 22:00
    quiet_hours_end TIME, -- e.g., 07:00

    -- Frequency
    digest_mode BOOLEAN DEFAULT false, -- Batch into daily digest
    digest_frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, organization_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_org ON notification_preferences(organization_id);

CREATE TRIGGER notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- EMAIL LOG TABLE
-- =====================================================
-- Track all emails sent

CREATE TABLE email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Recipients
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(100),
    cc_emails TEXT[],
    bcc_emails TEXT[],

    -- Sender
    from_email VARCHAR(255),
    from_name VARCHAR(100),
    reply_to VARCHAR(255),

    -- Content
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,

    -- Template
    template_name VARCHAR(100),
    template_variables JSONB,

    -- Entity Link
    entity_type VARCHAR(30),
    entity_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, opened, clicked, bounced, failed

    -- Delivery Info
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,
    clicked_at TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0,

    -- Bounce/Error
    bounced_at TIMESTAMP WITH TIME ZONE,
    bounce_type VARCHAR(30), -- hard, soft
    bounce_reason TEXT,
    error_message TEXT,

    -- Provider
    email_provider VARCHAR(30), -- sendgrid, mailgun, ses, smtp
    provider_message_id VARCHAR(255),

    -- Tracking
    tracking_id VARCHAR(64),

    -- Sent By
    sent_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_email_status CHECK (status IN (
        'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked',
        'bounced', 'failed', 'unsubscribed', 'spam'
    ))
);

CREATE INDEX idx_email_log_org ON email_log(organization_id);
CREATE INDEX idx_email_log_to ON email_log(to_email);
CREATE INDEX idx_email_log_entity ON email_log(entity_type, entity_id);
CREATE INDEX idx_email_log_contact ON email_log(contact_id);
CREATE INDEX idx_email_log_job ON email_log(job_id);
CREATE INDEX idx_email_log_status ON email_log(status);
CREATE INDEX idx_email_log_created ON email_log(created_at DESC);
CREATE INDEX idx_email_log_tracking ON email_log(tracking_id);

-- =====================================================
-- SMS LOG TABLE
-- =====================================================
-- Track all SMS messages sent

CREATE TABLE sms_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Phone Numbers
    to_phone VARCHAR(20) NOT NULL,
    from_phone VARCHAR(20),

    -- Content
    message TEXT NOT NULL,
    message_segments INTEGER DEFAULT 1,

    -- Entity Link
    entity_type VARCHAR(30),
    entity_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Direction
    direction VARCHAR(10) NOT NULL, -- outbound, inbound

    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, failed, received

    -- Delivery Info
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,

    -- Error
    error_code VARCHAR(20),
    error_message TEXT,

    -- Provider
    sms_provider VARCHAR(30), -- twilio, telnyx, bandwidth
    provider_message_id VARCHAR(255),

    -- Cost
    cost DECIMAL(8, 4),

    -- Sent By
    sent_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_sms_status CHECK (status IN (
        'queued', 'sending', 'sent', 'delivered', 'failed', 'received', 'undelivered'
    )),
    CONSTRAINT valid_direction CHECK (direction IN ('outbound', 'inbound'))
);

CREATE INDEX idx_sms_log_org ON sms_log(organization_id);
CREATE INDEX idx_sms_log_to ON sms_log(to_phone);
CREATE INDEX idx_sms_log_entity ON sms_log(entity_type, entity_id);
CREATE INDEX idx_sms_log_contact ON sms_log(contact_id);
CREATE INDEX idx_sms_log_job ON sms_log(job_id);
CREATE INDEX idx_sms_log_status ON sms_log(status);
CREATE INDEX idx_sms_log_direction ON sms_log(direction);
CREATE INDEX idx_sms_log_created ON sms_log(created_at DESC);

-- =====================================================
-- REMINDERS TABLE
-- =====================================================
-- Scheduled reminders

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Reminder For
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Entity Link
    entity_type VARCHAR(30),
    entity_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Reminder Content
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Schedule
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(30) DEFAULT 'one_time', -- one_time, recurring

    -- Recurring Settings
    recurrence_pattern VARCHAR(20), -- daily, weekly, monthly
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end_date DATE,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, completed, snoozed, cancelled

    -- Completion
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Snooze
    snoozed_until TIMESTAMP WITH TIME ZONE,
    snooze_count INTEGER DEFAULT 0,

    -- Delivery
    send_notification BOOLEAN DEFAULT true,
    send_email BOOLEAN DEFAULT false,
    send_sms BOOLEAN DEFAULT false,

    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_reminder_status CHECK (status IN (
        'active', 'completed', 'snoozed', 'cancelled'
    ))
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_org ON reminders(organization_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE status = 'active';
CREATE INDEX idx_reminders_entity ON reminders(entity_type, entity_id);
CREATE INDEX idx_reminders_contact ON reminders(contact_id);
CREATE INDEX idx_reminders_job ON reminders(job_id);
CREATE INDEX idx_reminders_status ON reminders(status);

CREATE TRIGGER reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
-- Company-wide announcements

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(30) DEFAULT 'info', -- info, warning, urgent, celebration

    -- Display
    display_priority INTEGER DEFAULT 0,
    background_color VARCHAR(20),

    -- Targeting
    target_roles TEXT[], -- Empty = all roles
    target_users UUID[], -- Specific users

    -- Schedule
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,

    -- Dismissible
    can_dismiss BOOLEAN DEFAULT true,

    -- Created By
    created_by UUID REFERENCES users(id),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_announcement_type CHECK (announcement_type IN (
        'info', 'warning', 'urgent', 'celebration', 'maintenance', 'update'
    ))
);

CREATE INDEX idx_announcements_org ON announcements(organization_id);
CREATE INDEX idx_announcements_active ON announcements(is_active, starts_at, ends_at)
    WHERE is_active = true;
CREATE INDEX idx_announcements_roles ON announcements USING gin(target_roles);

CREATE TRIGGER announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ANNOUNCEMENT DISMISSALS TABLE
-- =====================================================
-- Track dismissed announcements per user

CREATE TABLE announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_dismissals_announcement ON announcement_dismissals(announcement_id);
CREATE INDEX idx_announcement_dismissals_user ON announcement_dismissals(user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_organization_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_activity_type VARCHAR,
    p_title VARCHAR,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_user_name VARCHAR;
BEGIN
    IF p_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM users WHERE id = p_user_id;
    END IF;

    INSERT INTO activity_log (
        organization_id, entity_type, entity_id, activity_type,
        title, description, user_id, user_name, changes
    ) VALUES (
        p_organization_id, p_entity_type, p_entity_id, p_activity_type,
        p_title, p_description, p_user_id, v_user_name, p_changes
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_organization_id UUID,
    p_user_id UUID,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT DEFAULT NULL,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_action_url VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        organization_id, user_id, notification_type,
        title, message, entity_type, entity_id, action_url, priority
    ) VALUES (
        p_organization_id, p_user_id, p_type,
        p_title, p_message, p_entity_type, p_entity_id, p_action_url, p_priority
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Notify assigned user on job assignment
CREATE OR REPLACE FUNCTION notify_on_job_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.assigned_sales_rep_id IS NOT NULL AND
       (OLD.assigned_sales_rep_id IS NULL OR NEW.assigned_sales_rep_id != OLD.assigned_sales_rep_id) THEN
        PERFORM create_notification(
            NEW.organization_id,
            NEW.assigned_sales_rep_id,
            'assignment',
            'New Job Assignment',
            'You have been assigned to job ' || NEW.job_number,
            'job',
            NEW.id,
            '/jobs/' || NEW.id,
            'normal'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_notify_assignment
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION notify_on_job_assignment();

-- Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = p_user_id AND is_read = false;
    ELSE
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = false;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Get pending reminders (run via cron)
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE(
    reminder_id UUID,
    user_id UUID,
    user_email VARCHAR,
    title VARCHAR,
    description TEXT,
    entity_type VARCHAR,
    entity_id UUID,
    send_notification BOOLEAN,
    send_email BOOLEAN,
    send_sms BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS reminder_id,
        r.user_id,
        u.email AS user_email,
        r.title,
        r.description,
        r.entity_type,
        r.entity_id,
        r.send_notification,
        r.send_email,
        r.send_sms
    FROM reminders r
    JOIN users u ON r.user_id = u.id
    WHERE r.status = 'active'
    AND r.remind_at <= NOW()
    AND r.notification_sent = false;
END;
$$ LANGUAGE plpgsql;

-- Complete reminder
CREATE OR REPLACE FUNCTION complete_reminder(p_reminder_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE reminders
    SET
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Get active announcements for user
CREATE OR REPLACE FUNCTION get_user_announcements(
    p_user_id UUID,
    p_organization_id UUID
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    content TEXT,
    announcement_type VARCHAR,
    starts_at TIMESTAMP WITH TIME ZONE,
    is_pinned BOOLEAN,
    can_dismiss BOOLEAN
) AS $$
DECLARE
    v_user_roles TEXT[];
BEGIN
    -- Get user's roles
    SELECT ARRAY_AGG(r.role_name)
    INTO v_user_roles
    FROM user_organization_roles uor
    JOIN roles r ON uor.role_id = r.id
    WHERE uor.user_id = p_user_id
    AND uor.organization_id = p_organization_id;

    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.content,
        a.announcement_type,
        a.starts_at,
        a.is_pinned,
        a.can_dismiss
    FROM announcements a
    LEFT JOIN announcement_dismissals ad ON a.id = ad.announcement_id AND ad.user_id = p_user_id
    WHERE a.organization_id = p_organization_id
    AND a.is_active = true
    AND a.starts_at <= NOW()
    AND (a.ends_at IS NULL OR a.ends_at > NOW())
    AND ad.id IS NULL -- Not dismissed
    AND (
        a.target_roles IS NULL OR
        a.target_roles = '{}' OR
        a.target_roles && v_user_roles
    )
    AND (
        a.target_users IS NULL OR
        a.target_users = '{}' OR
        p_user_id = ANY(a.target_users)
    )
    ORDER BY a.is_pinned DESC, a.display_priority DESC, a.starts_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS
-- =====================================================

-- Unread notification count by user
CREATE OR REPLACE VIEW user_notification_counts AS
SELECT
    user_id,
    organization_id,
    COUNT(*) FILTER (WHERE NOT is_read) AS unread_count,
    COUNT(*) FILTER (WHERE NOT is_read AND priority = 'urgent') AS urgent_unread,
    MAX(created_at) FILTER (WHERE NOT is_read) AS latest_unread_at
FROM notifications
GROUP BY user_id, organization_id;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notes IS 'Internal notes on any entity';
COMMENT ON TABLE activity_log IS 'Audit trail of all activities and changes';
COMMENT ON TABLE notifications IS 'User notifications (in-app, push, email, SMS)';
COMMENT ON TABLE notification_preferences IS 'User notification settings per type';
COMMENT ON TABLE email_log IS 'Track all emails sent with delivery status';
COMMENT ON TABLE sms_log IS 'Track all SMS messages with delivery status';
COMMENT ON TABLE reminders IS 'Scheduled reminders for users';
COMMENT ON TABLE announcements IS 'Company-wide announcements';
COMMENT ON TABLE announcement_dismissals IS 'Track which users dismissed which announcements';

COMMENT ON COLUMN activity_log.changes IS 'JSON object tracking field changes: {"field": {"old": "x", "new": "y"}}';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate when notification is clicked';
COMMENT ON COLUMN email_log.tracking_id IS 'Unique ID for tracking email opens/clicks';
