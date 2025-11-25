-- =====================================================
-- 002-claims.sql
-- Claims and Properties schema
-- Core business entities for restoration projects
-- =====================================================

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

    -- Log status change in status_history (will be created in 007-status-history.sql)
    -- This will be implemented after status_history table exists
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE claims IS 'Core table tracking restoration projects from start to finish';
COMMENT ON TABLE properties IS 'Property details for each claim (one-to-one relationship)';
COMMENT ON TABLE claim_contractors IS 'Junction table for multiple contractors per claim';

COMMENT ON COLUMN claims.claim_number IS 'Insurance company claim identifier (required unique)';
COMMENT ON COLUMN claims.internal_reference IS 'Organization internal tracking number';
COMMENT ON COLUMN claims.date_of_loss IS 'Critical date - when damage actually occurred';
COMMENT ON COLUMN claims.metadata IS 'Flexible JSONB for claim-specific data';
COMMENT ON COLUMN properties.full_address IS 'Generated column for easy display and search';
COMMENT ON COLUMN properties.features IS 'JSONB for flexible property feature tracking';
