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
