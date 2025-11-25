-- =====================================================
-- DROP ALL TABLES - CLEANUP SCRIPT
-- ⚠️  WARNING: This will DELETE ALL DATA! ⚠️
-- Only run this if you want to start fresh
-- =====================================================

-- Drop tables in reverse order (respecting foreign key dependencies)

-- Step 8: RLS-enabled tables (drop policies first isn't needed, CASCADE handles it)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS status_history CASCADE;

-- Step 7: Audit tables
-- (already dropped above)

-- Step 6: Insurance tables
DROP TABLE IF EXISTS correspondence CASCADE;
DROP TABLE IF EXISTS claim_insurers CASCADE;
DROP TABLE IF EXISTS insurance_adjusters CASCADE;
DROP TABLE IF EXISTS insurance_companies CASCADE;

-- Step 5: Invoice tables
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Step 4: Photo/Document tables
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS photo_album_items CASCADE;
DROP TABLE IF EXISTS photo_albums CASCADE;
DROP TABLE IF EXISTS photos CASCADE;

-- Step 3: Estimate tables
DROP TABLE IF EXISTS labor CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS estimate_line_items CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;

-- Step 2: Claim tables
DROP TABLE IF EXISTS claim_contractors CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS claims CASCADE;

-- Step 1: Core tables
DROP TABLE IF EXISTS user_organization_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_user_claims(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_claim_status(UUID, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS recalculate_estimate_totals(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_recalculate_estimate() CASCADE;
DROP FUNCTION IF EXISTS recalculate_invoice_totals(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_recalculate_invoice() CASCADE;
DROP FUNCTION IF EXISTS update_invoice_payment_status() CASCADE;
DROP FUNCTION IF EXISTS update_overdue_invoices() CASCADE;
DROP FUNCTION IF EXISTS get_claim_photos_by_category(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_photo_storage_path(UUID, UUID, UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_next_followup_date(UUID) CASCADE;
DROP FUNCTION IF EXISTS log_status_change(VARCHAR, UUID, VARCHAR, VARCHAR, VARCHAR, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_notification(UUID, UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_log_status_change() CASCADE;

-- Drop auth helper functions
DROP FUNCTION IF EXISTS auth.user_organization_ids() CASCADE;
DROP FUNCTION IF EXISTS auth.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.is_org_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS auth.user_has_permission(UUID, VARCHAR, VARCHAR) CASCADE;

-- Note: Extensions are kept (uuid-ossp, cube, earthdistance)
-- They don't interfere with the schema

SELECT 'All tables and functions dropped successfully!' AS status;
