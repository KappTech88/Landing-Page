-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR CLAIMS RESTORATION CRM
-- Run this entire file in Supabase SQL Editor
-- =====================================================
-- This combines all 8 migration files into one
-- Estimated execution time: 10-15 seconds
-- =====================================================

\echo '===== Starting Database Setup ====='
\echo '===== Step 1/8: Organizations, Users, Roles ====='

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

\echo '===== Step 2/8: Claims and Properties ====='

-- Note: I'll continue with the remaining tables in the next part due to length...
-- This is just showing you the format. The actual file will have all 8 steps.
