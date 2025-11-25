-- =====================================================
-- 006-insurers.sql
-- Insurance Company and Adjuster Management
-- Track insurance companies, adjusters, and claim relationships
-- =====================================================

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
