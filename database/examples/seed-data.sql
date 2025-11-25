-- =====================================================
-- SEED DATA for Development/Testing
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS
-- =====================================================

INSERT INTO organizations (id, name, slug, email, business_type, address_line1, city, state, zip_code, subscription_tier)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Estimate Reliance LLC', 'estimate-reliance', 'admin@estimatereliance.com', 'restoration_contractor', '123 Business St', 'Atlanta', 'GA', '30301', 'enterprise'),
  ('00000000-0000-0000-0000-000000000002', 'Demo Restoration Co', 'demo-restoration', 'admin@demo.com', 'restoration_contractor', '456 Main St', 'Nashville', 'TN', '37201', 'professional');

-- =====================================================
-- 2. INSURANCE COMPANIES
-- =====================================================

INSERT INTO insurance_companies (id, company_name, company_code, main_phone, claims_phone, organization_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'State Farm Insurance', 'SF', '800-STATE-FARM', '800-CLAIMS-01', NULL),
  ('10000000-0000-0000-0000-000000000002', 'Allstate Insurance', 'ALL', '800-ALLSTATE', '800-CLAIMS-02', NULL),
  ('10000000-0000-0000-0000-000000000003', 'GEICO Insurance', 'GEI', '800-GEICO', '800-CLAIMS-03', NULL);

-- =====================================================
-- 3. INSURANCE ADJUSTERS
-- =====================================================

INSERT INTO insurance_adjusters (id, insurance_company_id, first_name, last_name, email, phone, adjuster_type)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'John', 'Smith', 'jsmith@statefarm.com', '404-555-0101', 'field'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Sarah', 'Johnson', 'sjohnson@allstate.com', '615-555-0102', 'staff');

-- Note: Users must be created via Supabase Auth first, then linked here
-- This is a placeholder showing the structure

-- =====================================================
-- Example usage (after users are created via Supabase Auth):
-- =====================================================

-- INSERT INTO users (id, email, first_name, last_name, phone)
-- VALUES
--   ('auth-user-uuid-1', 'admin@estimatereliance.com', 'Admin', 'User', '404-555-1000'),
--   ('auth-user-uuid-2', 'contractor@estimatereliance.com', 'Contractor', 'User', '404-555-1001'),
--   ('auth-user-uuid-3', 'estimator@estimatereliance.com', 'Estimator', 'User', '404-555-1002');

-- INSERT INTO user_organization_roles (user_id, organization_id, role_id)
-- SELECT
--   'auth-user-uuid-1',
--   '00000000-0000-0000-0000-000000000001',
--   id
-- FROM roles WHERE name = 'super_admin';

-- =====================================================
-- Example Claims (requires users to be set up first)
-- =====================================================

-- INSERT INTO claims (organization_id, claim_number, date_of_loss, claim_type, status, created_by)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'CLM-2025-001', '2025-01-15', 'windstorm', 'open', 'auth-user-uuid-1');

-- INSERT INTO properties (claim_id, organization_id, address_line1, city, state, zip_code, property_type)
-- VALUES
--   ('claim-uuid-1', '00000000-0000-0000-0000-000000000001', '789 Oak Street', 'Atlanta', 'GA', '30308', 'residential');

COMMENT ON TABLE organizations IS 'Seed data loaded successfully';
