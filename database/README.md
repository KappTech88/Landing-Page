# Roofing CRM - Database

## Overview

Customer-centric database schema for roofing contractors. Built for Supabase/PostgreSQL.

**Hierarchy:**
```
Customer (ROOT) → Job → Claim → Estimate → Production → Finances
```

---

## Structure

```
/database
├── /schemas              # SQL migration files (001-010)
│   ├── 001-init.sql              # Organizations, users, roles, custom fields
│   ├── 002-contacts.sql          # Customers/Contacts (ROOT entity)
│   ├── 003-jobs.sql              # Jobs linked to customers
│   ├── 004-claims.sql            # Insurance claims
│   ├── 005-estimates.sql         # Estimates and line items
│   ├── 006-production.sql        # Crews, labor, scheduling
│   ├── 007-materials.sql         # Suppliers, material orders
│   ├── 008-finances.sql          # Invoices, payments, financing
│   ├── 009-documents.sql         # Photos, files, albums
│   └── 010-communications.sql    # Notes, notifications, activity log
│
├── /docs                 # Documentation
├── /examples             # Example code and data
├── COMPLETE_SCHEMA.sql   # All schemas combined (single file)
├── DROP_ALL_TABLES.sql   # Wipe database clean
└── README.md             # This file
```

---

## Quick Start

### 1. Wipe Database (if needed)

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### 2. Apply Schemas

**Option A - Individual files (recommended):**
Run in Supabase SQL Editor in order:
1. `001-init.sql`
2. `002-contacts.sql`
3. `003-jobs.sql`
4. ... through `010-communications.sql`

**Option B - Single file:**
Run `COMPLETE_SCHEMA.sql` (all schemas combined)

### 3. Generate Types

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > types/database.ts
```

---

## Entity Relationships

```
Organizations
    ↓
Contacts (Customers) ←── ROOT ENTITY
    ↓
Jobs ──────────────────→ Job Team Members
    ↓                    ↓
    ├── Claims ────────→ Claim Supplements
    │                    ↓
    ├── Estimates ─────→ Estimate Line Items
    │                    ↓
    ├── Production ────→ Crews, Labor Tickets, Schedule
    │                    ↓
    ├── Materials ─────→ Material Orders, Suppliers
    │                    ↓
    ├── Invoices ──────→ Payments, Payment Plans
    │                    ↓
    ├── Documents ─────→ Photos, Albums, Templates
    │                    ↓
    └── Notes ─────────→ Activity Log, Notifications
```

---

## Schema Files

### 001-init.sql
**Foundation: Organizations, Users, Roles**

Tables:
- `organizations` - Multi-tenant company accounts
- `roles` - System + custom roles with permissions
- `users` - User accounts linked to Supabase Auth
- `user_organization_roles` - User-org-role assignments
- `custom_field_definitions` - Custom data collection fields

Key Features:
- Role protection system (can't delete roles with assigned users)
- System roles: super_admin, owner, office_manager, sales_rep, production_manager, crew_lead
- Custom roles per organization
- JSONB permissions for granular access
- Custom fields system for any entity

### 002-contacts.sql
**ROOT Entity: Customers/Contacts**

Tables:
- `contacts` - Customer/lead/prospect records
- `contact_properties` - Multiple properties per contact
- `contact_interactions` - Calls, emails, visits

Key Features:
- Contact types: lead, prospect, customer, past_customer
- Full address with computed `full_address` column
- Roof information (type, age, last service)
- Lead source and scoring
- Communication preferences
- Lifetime value tracking

### 003-jobs.sql
**Central Work Entity**

Tables:
- `job_workflows` - Customizable workflow stages
- `job_workflow_stages` - Stage definitions
- `jobs` - Main job records
- `job_stage_history` - Stage change audit
- `job_team_members` - Team assignments

Key Features:
- Links customer → work
- Roofing fields: squares, pitch, shingle details
- Insurance job fields: claim number, RCV/ACV, deductible
- Production board workflow stages
- Auto-convert contact from lead→customer on job sold

### 004-claims.sql
**Insurance Claims**

Tables:
- `insurance_companies` - Insurance company directory
- `claims` - Insurance claim tracking
- `claim_supplements` - Additional claim amounts

Key Features:
- Full insurance tracking: RCV, ACV, depreciation
- Mortgage company handling
- Supplement management
- Claim status workflow

### 005-estimates.sql
**Estimates & Pricing**

Tables:
- `estimate_templates` - Reusable templates
- `estimate_categories` - Category organization
- `estimates` - Estimate versions
- `estimate_line_items` - Line item details

Key Features:
- Versioning with parent/child links
- Auto-recalculating totals via triggers
- Taxable/non-taxable items
- Margin and markup tracking
- Template system

### 006-production.sql
**Crews & Scheduling**

Tables:
- `crews` - Crew definitions
- `crew_members` - Individual crew members
- `job_crew_assignments` - Crew → Job assignments
- `labor_tickets` - Time tracking
- `production_schedule` - Calendar scheduling
- `job_tasks` - Task checklists
- `quality_inspections` - Inspection records

Key Features:
- Crew management with specialties
- Labor time tracking with approval workflow
- Production calendar/scheduling
- Task management with dependencies
- Quality inspection tracking

### 007-materials.sql
**Suppliers & Orders**

Tables:
- `suppliers` - Supplier/vendor directory
- `material_orders` - Purchase orders
- `material_order_items` - Order line items
- `product_catalog` - Product/material catalog

Key Features:
- Supplier management with ratings
- Material ordering with delivery tracking
- Product catalog with pricing
- Auto-update job material costs

### 008-finances.sql
**Invoices & Payments**

Tables:
- `invoices` - Customer invoices
- `invoice_line_items` - Invoice details
- `payments` - Payment records
- `payment_plans` - Payment arrangements
- `payment_plan_schedule` - Scheduled payments
- `credits` - Credits/adjustments
- `financing_options` - Third-party financing
- `financing_applications` - Financing apps

Key Features:
- Invoice from estimate function
- Payment tracking with processor support
- Payment plan management
- Financing integration (GreenSky, etc.)
- Accounts receivable aging view
- Auto-update contact lifetime value

### 009-documents.sql
**Photos & Files**

Tables:
- `document_folders` - Folder organization
- `documents` - All files/photos
- `photo_albums` - Photo grouping
- `photo_album_items` - Album contents
- `document_templates` - Contract/proposal templates
- `generated_documents` - Documents from templates
- `document_shares` - Sharing links
- `document_access_log` - Access tracking

Key Features:
- Photo types: before, during, after, damage
- Auto-create job folders on job creation
- Shareable albums with tokens
- Document template system with variables
- E-signature support
- Customer portal visibility controls

### 010-communications.sql
**Notes & Notifications**

Tables:
- `notes` - Internal notes on any entity
- `activity_log` - Full audit trail
- `notifications` - User notifications
- `notification_preferences` - User settings
- `email_log` - Email tracking
- `sms_log` - SMS tracking
- `reminders` - Scheduled reminders
- `announcements` - Company announcements
- `announcement_dismissals` - Dismissed tracking

Key Features:
- Notes with follow-up scheduling
- Complete activity audit trail
- Multi-channel notifications (push, email, SMS)
- Email/SMS delivery tracking
- Reminder system
- Company-wide announcements

---

## Key Patterns

### Multi-Tenancy
Every table has `organization_id` for data isolation.

### Soft Deletes
Use `deleted_at` timestamp instead of hard deletes.

### Computed Columns
- `contacts.full_name` - First + Last name
- `contacts.full_address` - Complete formatted address
- `invoices.balance_due` - Total - Paid
- `estimates.gross_profit` - Revenue - Costs

### Triggers
- Auto-update `updated_at` timestamps
- Recalculate totals on line item changes
- Update job costs from labor/materials
- Track role assignment counts

### Custom Fields
Any entity can have custom fields via `custom_field_definitions`.

---

## Roofing-Specific Fields

### Job Fields
- `total_squares` - Roof size
- `roof_pitch` - Slope
- `number_of_layers` - Existing layers
- `shingle_manufacturer`, `shingle_type`, `shingle_color`

### Insurance Fields
- `is_insurance_job` - Flag
- `insurance_claim_number`
- `rcv_amount`, `acv_amount`, `depreciation_amount`
- `deductible_amount`
- `adjuster_name`, `adjuster_email`, `adjuster_phone`

---

## Helper Functions

```sql
-- Contacts
SELECT create_contact(org_id, 'John', 'Doe', 'john@email.com', '555-1234');
SELECT search_contacts(org_id, 'search term');

-- Jobs
SELECT create_job(org_id, contact_id, 'Roof Replacement', 'standard');

-- Invoices
SELECT create_invoice_from_estimate(estimate_id);
SELECT record_payment(invoice_id, amount, 'credit_card');

-- Documents
SELECT create_shareable_album(job_id, 'Before & After Photos');

-- Notifications
SELECT create_notification(org_id, user_id, 'assignment', 'New Job', 'You were assigned...');

-- Activity
SELECT log_activity(org_id, 'job', job_id, 'status_changed', 'Job moved to production');
```

---

## Security

### Row Level Security (RLS)
- All tables should have RLS enabled
- Filter by `organization_id`
- Check role permissions via helper functions

### Best Practices
1. Never hard delete - use `deleted_at`
2. Always filter by `organization_id`
3. Use helper functions for common operations
4. Log all significant changes to `activity_log`

---

## Performance

### Indexes
- All foreign keys indexed
- Full-text search on contacts, jobs, notes
- GIN indexes on JSONB columns
- Partial indexes on `deleted_at IS NULL`
- Composite indexes for common queries

---

**Database Version**: 2.0.0
**Last Updated**: 2025-11-27
**PostgreSQL**: 15+
**Supabase**: Latest
