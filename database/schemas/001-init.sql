-- =====================================================
-- 001-init.sql
-- Initial schema for multi-tenant Claims Restoration CRM
-- Creates: Organizations, Users, Roles, and Auth integration
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ORGANIZATIONS TABLE (Multi-tenancy core)
-- =====================================================
-- Each organization represents a company using the CRM
-- Estimate Reliance is org_id = seed value
-- Other restoration companies can sign up as separate orgs

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier

    -- Business Details
    business_type VARCHAR(50) DEFAULT 'restoration_contractor', -- restoration_contractor, insurance_company, etc.
    company_size VARCHAR(20), -- small, medium, large, enterprise

    -- Contact Information
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2), -- GA, TN, etc.
    zip_code VARCHAR(10),

    -- Subscription & Status
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, basic, professional, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled, trial
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Settings & Preferences (JSONB for flexibility)
    settings JSONB DEFAULT '{
        "branding": {
            "logo_url": null,
            "primary_color": "#1e40af",
            "secondary_color": "#3b82f6"
        },
        "features": {
            "ai_tools_enabled": true,
            "multi_user_enabled": true,
            "api_access_enabled": false
        },
        "notifications": {
            "email_enabled": true,
            "sms_enabled": false
        }
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID, -- References users.id (nullable for first org)

    -- Constraints
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'basic', 'professional', 'enterprise')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trial'))
);

-- Indexes for organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROLES TABLE (Custom role support)
-- =====================================================
-- Base system roles + organization-specific custom roles

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Role Definition
    name VARCHAR(50) NOT NULL, -- admin, contractor, estimator, client, custom_inspector, etc.
    display_name VARCHAR(100) NOT NULL, -- "Project Manager", "Field Inspector", etc.
    description TEXT,

    -- Role Type
    is_system_role BOOLEAN DEFAULT false, -- true for built-in roles (admin, contractor, etc.)
    is_custom_role BOOLEAN DEFAULT false, -- true for organization-specific roles

    -- Permissions (JSONB for flexibility)
    permissions JSONB DEFAULT '{
        "claims": {
            "create": false,
            "read": false,
            "update": false,
            "delete": false
        },
        "estimates": {
            "create": false,
            "read": false,
            "update": false,
            "delete": false
        },
        "invoices": {
            "create": false,
            "read": false,
            "update": false,
            "delete": false
        },
        "users": {
            "create": false,
            "read": false,
            "update": false,
            "delete": false
        },
        "reports": {
            "read": false,
            "export": false
        },
        "settings": {
            "read": false,
            "update": false
        }
    }'::jsonb,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(organization_id, name), -- Role names unique per organization
    CONSTRAINT valid_role_type CHECK (
        (is_system_role = true AND organization_id IS NULL) OR
        (is_custom_role = true AND organization_id IS NOT NULL)
    )
);

-- Indexes for roles
CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_roles_is_system_role ON roles(is_system_role) WHERE is_system_role = true;
CREATE INDEX idx_roles_deleted_at ON roles(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- USERS TABLE (Integrates with Supabase Auth)
-- =====================================================
-- Links to auth.users via id (Supabase Auth UUID)

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

    -- Contact Information
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,

    -- Profile
    avatar_url TEXT, -- Supabase Storage URL
    title VARCHAR(100), -- Job title: "Senior Estimator", "Project Manager"
    bio TEXT,

    -- User Preferences
    preferences JSONB DEFAULT '{
        "notifications": {
            "email": true,
            "sms": false,
            "push": true
        },
        "display": {
            "theme": "light",
            "language": "en"
        }
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Google Workspace Integration
    google_workspace_email VARCHAR(255), -- For sending emails as user
    google_refresh_token TEXT, -- Encrypted OAuth token for Gmail API
    google_token_expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- USER_ORGANIZATION_ROLES (Junction Table)
-- =====================================================
-- Manages many-to-many relationship between users, organizations, and roles
-- A user can belong to multiple organizations with different roles

CREATE TABLE user_organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

    -- Role Assignment Details
    assigned_by UUID REFERENCES users(id), -- Who assigned this role
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivated_by UUID REFERENCES users(id),

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, organization_id, role_id) -- Prevent duplicate role assignments
);

-- Indexes for user_organization_roles
CREATE INDEX idx_uor_user_id ON user_organization_roles(user_id);
CREATE INDEX idx_uor_organization_id ON user_organization_roles(organization_id);
CREATE INDEX idx_uor_role_id ON user_organization_roles(role_id);
CREATE INDEX idx_uor_active ON user_organization_roles(is_active) WHERE is_active = true;

CREATE TRIGGER user_organization_roles_updated_at
    BEFORE UPDATE ON user_organization_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA: System Roles
-- =====================================================
-- Create base system roles that apply across all organizations

INSERT INTO roles (name, display_name, description, is_system_role, permissions) VALUES
(
    'super_admin',
    'Super Administrator',
    'Full system access - Estimate Reliance staff only',
    true,
    '{
        "claims": {"create": true, "read": true, "update": true, "delete": true},
        "estimates": {"create": true, "read": true, "update": true, "delete": true},
        "invoices": {"create": true, "read": true, "update": true, "delete": true},
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "reports": {"read": true, "export": true},
        "settings": {"read": true, "update": true},
        "organizations": {"create": true, "read": true, "update": true, "delete": true}
    }'::jsonb
),
(
    'admin',
    'Organization Administrator',
    'Full access within their organization',
    true,
    '{
        "claims": {"create": true, "read": true, "update": true, "delete": true},
        "estimates": {"create": true, "read": true, "update": true, "delete": true},
        "invoices": {"create": true, "read": true, "update": true, "delete": true},
        "users": {"create": true, "read": true, "update": true, "delete": false},
        "reports": {"read": true, "export": true},
        "settings": {"read": true, "update": true}
    }'::jsonb
),
(
    'contractor',
    'Contractor',
    'Manage claims and field operations',
    true,
    '{
        "claims": {"create": true, "read": true, "update": true, "delete": false},
        "estimates": {"create": true, "read": true, "update": true, "delete": false},
        "invoices": {"create": false, "read": true, "update": false, "delete": false},
        "users": {"create": false, "read": true, "update": false, "delete": false},
        "reports": {"read": true, "export": false},
        "settings": {"read": true, "update": false}
    }'::jsonb
),
(
    'estimator',
    'Estimator',
    'Create and manage estimates only',
    true,
    '{
        "claims": {"create": false, "read": true, "update": false, "delete": false},
        "estimates": {"create": true, "read": true, "update": true, "delete": false},
        "invoices": {"create": false, "read": true, "update": false, "delete": false},
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "reports": {"read": true, "export": true},
        "settings": {"read": false, "update": false}
    }'::jsonb
),
(
    'client',
    'Client',
    'View their own claims only (property owners)',
    true,
    '{
        "claims": {"create": false, "read": true, "update": false, "delete": false},
        "estimates": {"create": false, "read": true, "update": false, "delete": false},
        "invoices": {"create": false, "read": true, "update": false, "delete": false},
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "reports": {"read": false, "export": false},
        "settings": {"read": true, "update": true}
    }'::jsonb
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's role in a specific organization
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

-- Function to check if user has permission
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
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations - each restoration company is an org';
COMMENT ON TABLE roles IS 'System and custom roles with granular permissions';
COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth';
COMMENT ON TABLE user_organization_roles IS 'Junction table managing user-org-role relationships';

COMMENT ON COLUMN organizations.slug IS 'URL-friendly org identifier for routing';
COMMENT ON COLUMN organizations.settings IS 'JSONB for flexible org-specific configuration';
COMMENT ON COLUMN roles.permissions IS 'Granular permission matrix for role-based access control';
COMMENT ON COLUMN users.google_workspace_email IS 'Email address for Google Workspace OAuth integration';
COMMENT ON COLUMN users.google_refresh_token IS 'Encrypted OAuth refresh token for Gmail API access';
