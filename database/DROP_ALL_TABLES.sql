-- =====================================================
-- DROP ALL TABLES - CLEANUP SCRIPT
-- ⚠️  WARNING: This will DELETE ALL DATA! ⚠️
-- Only run this if you want to start fresh
-- =====================================================

-- =====================================================
-- OPTION 1: RECOMMENDED - Drop and recreate schema
-- (Cleanest approach - removes everything)
-- =====================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Re-enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

SELECT 'Schema reset complete! Ready for fresh install.' AS status;

-- =====================================================
-- OPTION 2: Drop tables individually (alternative)
-- Uncomment below if you prefer granular control
-- =====================================================

/*
-- 010: Communications
DROP TABLE IF EXISTS announcement_dismissals CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS sms_log CASCADE;
DROP TABLE IF EXISTS email_log CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- 009: Documents
DROP TABLE IF EXISTS document_access_log CASCADE;
DROP TABLE IF EXISTS document_shares CASCADE;
DROP TABLE IF EXISTS generated_documents CASCADE;
DROP TABLE IF EXISTS document_templates CASCADE;
DROP TABLE IF EXISTS photo_album_items CASCADE;
DROP TABLE IF EXISTS photo_albums CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_folders CASCADE;

-- 008: Finances
DROP TABLE IF EXISTS financing_applications CASCADE;
DROP TABLE IF EXISTS financing_options CASCADE;
DROP TABLE IF EXISTS credits CASCADE;
DROP TABLE IF EXISTS payment_plan_schedule CASCADE;
DROP TABLE IF EXISTS payment_plans CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- 007: Materials
DROP TABLE IF EXISTS product_catalog CASCADE;
DROP TABLE IF EXISTS material_order_items CASCADE;
DROP TABLE IF EXISTS material_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- 006: Production
DROP TABLE IF EXISTS quality_inspections CASCADE;
DROP TABLE IF EXISTS job_tasks CASCADE;
DROP TABLE IF EXISTS production_schedule CASCADE;
DROP TABLE IF EXISTS labor_tickets CASCADE;
DROP TABLE IF EXISTS job_crew_assignments CASCADE;
DROP TABLE IF EXISTS crew_members CASCADE;
DROP TABLE IF EXISTS crews CASCADE;

-- 005: Estimates
DROP TABLE IF EXISTS estimate_line_items CASCADE;
DROP TABLE IF EXISTS estimates CASCADE;
DROP TABLE IF EXISTS estimate_categories CASCADE;
DROP TABLE IF EXISTS estimate_templates CASCADE;

-- 004: Claims
DROP TABLE IF EXISTS claim_supplements CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS insurance_companies CASCADE;

-- 003: Jobs
DROP TABLE IF EXISTS job_team_members CASCADE;
DROP TABLE IF EXISTS job_stage_history CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS job_workflow_stages CASCADE;
DROP TABLE IF EXISTS job_workflows CASCADE;

-- 002: Contacts
DROP TABLE IF EXISTS contact_interactions CASCADE;
DROP TABLE IF EXISTS contact_properties CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- 001: Core
DROP TABLE IF EXISTS custom_field_change_log CASCADE;
DROP TABLE IF EXISTS custom_field_definitions CASCADE;
DROP TABLE IF EXISTS user_organization_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_sequence_number(VARCHAR, UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS create_custom_role(UUID, VARCHAR, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS can_delete_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_role_assignment_count() CASCADE;
DROP FUNCTION IF EXISTS prevent_protected_role_deletion() CASCADE;
DROP FUNCTION IF EXISTS create_contact(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS search_contacts(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_contact_job_count() CASCADE;
DROP FUNCTION IF EXISTS create_job(UUID, UUID, VARCHAR, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_job_total_cost() CASCADE;
DROP FUNCTION IF EXISTS update_contact_on_job_sold() CASCADE;
DROP FUNCTION IF EXISTS recalculate_estimate_totals(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_job_from_estimate() CASCADE;
DROP FUNCTION IF EXISTS recalculate_order_total(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_job_material_cost() CASCADE;
DROP FUNCTION IF EXISTS update_job_labor_cost() CASCADE;
DROP FUNCTION IF EXISTS create_invoice_from_estimate(UUID, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS record_payment(UUID, DECIMAL, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_invoice_payment_status() CASCADE;
DROP FUNCTION IF EXISTS recalculate_invoice_totals(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_contact_lifetime_value(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_overdue_invoices() CASCADE;
DROP FUNCTION IF EXISTS create_job_document_folders(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_job_photo_counts(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_share_token() CASCADE;
DROP FUNCTION IF EXISTS create_shareable_album(UUID, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS log_activity(UUID, VARCHAR, UUID, VARCHAR, VARCHAR, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS create_notification(UUID, UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, UUID, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS notify_on_job_assignment() CASCADE;
DROP FUNCTION IF EXISTS mark_notifications_read(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS get_pending_reminders() CASCADE;
DROP FUNCTION IF EXISTS complete_reminder(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_announcements(UUID, UUID) CASCADE;

SELECT 'All tables and functions dropped!' AS status;
*/
