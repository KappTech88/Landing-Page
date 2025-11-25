-- =====================================================
-- SEED TEST DATA
-- Populates database with sample data for testing
-- =====================================================
-- Run this AFTER creating your first user via Supabase Auth
-- Replace the user_id variables below with your actual user ID
-- =====================================================

-- =====================================================
-- STEP 1: Create Test Organization
-- =====================================================

INSERT INTO organizations (
    name,
    slug,
    business_type,
    company_size,
    email,
    phone,
    city,
    state,
    zip_code,
    subscription_tier,
    subscription_status
) VALUES (
    'Acme Restoration Services',
    'acme-restoration',
    'restoration_contractor',
    '10-50',
    'info@acmerestoration.com',
    '(555) 123-4567',
    'Atlanta',
    'GA',
    '30301',
    'professional',
    'active'
) RETURNING id, name, slug;

-- Save the organization ID from above and use it below
-- For this example, let's assume it's: '00000000-0000-0000-0000-000000000001'

-- =====================================================
-- STEP 2: Link Your User to Organization
-- =====================================================
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual Supabase Auth user ID
-- You can find this in Supabase Dashboard > Authentication > Users

-- First, create the user record in our users table
INSERT INTO users (
    id,  -- This must match your Supabase Auth user ID
    email,
    first_name,
    last_name,
    is_active,
    is_email_verified
) VALUES (
    'YOUR_USER_ID_HERE'::uuid,  -- ⚠️ REPLACE THIS
    'admin@acmerestoration.com',
    'Admin',
    'User',
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Link user to organization as Admin
INSERT INTO user_organization_roles (
    user_id,
    organization_id,
    role_id,
    is_active
) VALUES (
    'YOUR_USER_ID_HERE'::uuid,  -- ⚠️ REPLACE THIS
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
    true
);

-- =====================================================
-- STEP 3: Create Sample Claims
-- =====================================================

-- Create a sample claim
INSERT INTO claims (
    organization_id,
    claim_number,
    internal_reference,
    created_by,
    claim_type,
    severity,
    priority,
    status,
    date_of_loss,
    date_reported,
    estimated_total,
    description,
    damage_description
) VALUES (
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    'CLM-2025-001',
    'ACM-001',
    'YOUR_USER_ID_HERE'::uuid,  -- ⚠️ REPLACE THIS
    'water',
    'moderate',
    'high',
    'open',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE - INTERVAL '2 days',
    15000.00,
    'Water damage from burst pipe in master bathroom',
    'Significant water damage to ceiling, walls, and flooring in master bathroom and bedroom. Affected drywall, carpet, and personal belongings.'
) RETURNING id, claim_number, status;

-- Create property for the claim
INSERT INTO properties (
    claim_id,
    organization_id,
    owner_first_name,
    owner_last_name,
    owner_email,
    owner_phone,
    address_line1,
    city,
    state,
    zip_code,
    property_type,
    property_subtype,
    year_built,
    square_footage,
    stories,
    bedrooms,
    bathrooms
) VALUES (
    (SELECT id FROM claims WHERE claim_number = 'CLM-2025-001'),
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    'John',
    'Smith',
    'john.smith@email.com',
    '(555) 234-5678',
    '123 Main Street',
    'Atlanta',
    'GA',
    '30301',
    'residential',
    'single_family',
    2015,
    2400,
    2,
    4,
    2.5
);

-- Create another claim (storm damage)
INSERT INTO claims (
    organization_id,
    claim_number,
    internal_reference,
    created_by,
    claim_type,
    severity,
    priority,
    status,
    date_of_loss,
    date_reported,
    estimated_total,
    description,
    damage_description
) VALUES (
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    'CLM-2025-002',
    'ACM-002',
    'YOUR_USER_ID_HERE'::uuid,  -- ⚠️ REPLACE THIS
    'windstorm',
    'severe',
    'urgent',
    'assigned',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE,
    45000.00,
    'Severe storm damage to roof and siding',
    'High winds caused extensive damage to shingles, gutters, and vinyl siding. Several broken windows on north side of house.'
) RETURNING id, claim_number, status;

INSERT INTO properties (
    claim_id,
    organization_id,
    owner_first_name,
    owner_last_name,
    owner_email,
    owner_phone,
    address_line1,
    city,
    state,
    zip_code,
    property_type,
    property_subtype,
    year_built,
    square_footage,
    stories,
    bedrooms,
    bathrooms
) VALUES (
    (SELECT id FROM claims WHERE claim_number = 'CLM-2025-002'),
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    'Sarah',
    'Johnson',
    'sarah.j@email.com',
    '(555) 345-6789',
    '456 Oak Avenue',
    'Marietta',
    'GA',
    '30060',
    'residential',
    'single_family',
    2008,
    3200,
    2,
    5,
    3.0
);

-- =====================================================
-- STEP 4: Create Sample Insurance Company
-- =====================================================

INSERT INTO insurance_companies (
    organization_id,
    company_name,
    company_code,
    main_phone,
    main_email,
    claims_phone,
    claims_email,
    city,
    state,
    zip_code,
    rating,
    is_active,
    is_preferred
) VALUES (
    NULL,  -- NULL = shared across all organizations
    'State Farm Insurance',
    'SF-12345',
    '(800) 782-8332',
    'claims@statefarm.com',
    '(800) 782-8332',
    'claims@statefarm.com',
    'Bloomington',
    'IL',
    '61710',
    'A++',
    true,
    true
);

-- Create sample adjuster
INSERT INTO insurance_adjusters (
    insurance_company_id,
    organization_id,
    first_name,
    last_name,
    email,
    phone,
    phone_mobile,
    adjuster_type,
    territory,
    is_active
) VALUES (
    (SELECT id FROM insurance_companies WHERE company_code = 'SF-12345'),
    NULL,  -- Shared adjuster
    'Michael',
    'Williams',
    'm.williams@statefarm.com',
    '(555) 111-2222',
    '(555) 111-3333',
    'field',
    'Atlanta Metro',
    true
);

-- Link adjuster to second claim
INSERT INTO claim_insurers (
    claim_id,
    insurance_company_id,
    adjuster_id,
    organization_id,
    policy_number,
    policy_type,
    coverage_type,
    is_primary,
    coverage_limit,
    deductible,
    deductible_type,
    insurer_claim_number,
    insurer_claim_status,
    date_filed_with_insurer,
    amount_claimed
) VALUES (
    (SELECT id FROM claims WHERE claim_number = 'CLM-2025-002'),
    (SELECT id FROM insurance_companies WHERE company_code = 'SF-12345'),
    (SELECT id FROM insurance_adjusters WHERE email = 'm.williams@statefarm.com'),
    (SELECT id FROM organizations WHERE slug = 'acme-restoration'),
    'SF-POL-789456',
    'homeowners',
    'dwelling',
    true,
    350000.00,
    1000.00,
    'flat',
    'SF-CLM-445566',
    'open',
    CURRENT_DATE,
    45000.00
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all organizations
SELECT id, name, slug, subscription_tier, created_at FROM organizations;

-- View all users and their roles
SELECT
    u.id,
    u.email,
    u.full_name,
    o.name as organization,
    r.display_name as role
FROM users u
JOIN user_organization_roles uor ON u.id = uor.user_id
JOIN organizations o ON uor.organization_id = o.id
JOIN roles r ON uor.role_id = r.id;

-- View all claims with properties
SELECT
    c.claim_number,
    c.claim_type,
    c.status,
    c.estimated_total,
    p.full_address,
    p.owner_full_name
FROM claims c
LEFT JOIN properties p ON c.id = p.claim_id
ORDER BY c.created_at DESC;

-- View insurance information
SELECT
    ic.company_name,
    ia.full_name as adjuster_name,
    c.claim_number,
    ci.policy_number,
    ci.insurer_claim_status
FROM claim_insurers ci
JOIN claims c ON ci.claim_id = c.id
JOIN insurance_companies ic ON ci.insurance_company_id = ic.id
LEFT JOIN insurance_adjusters ia ON ci.adjuster_id = ia.id;

SELECT '✅ Test data created successfully! Remember to replace YOUR_USER_ID_HERE with your actual user ID.' AS status;
