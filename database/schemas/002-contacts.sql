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
