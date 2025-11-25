### DATABASE SCHEMA REFERENCE FOR AI AGENTS

**Project**: Estimate Reliance Claims Restoration CRM
**Database**: PostgreSQL 15+ via Supabase
**Architecture**: Multi-tenant with Row Level Security (RLS)
**Last Updated**: 2025-11-25

---

## 🎯 QUICK REFERENCE

### Core Entity Flow
```
Organization → Users → Claims → Properties
                      ↓
                   Estimates → Line Items → Materials/Labor
                      ↓
                   Invoices → Payments
                      ↓
                   Photos/Documents
```

### Key Relationships
- **Multi-tenant**: Every record has `organization_id`
- **User-Org-Role**: Many-to-many via junction table
- **Claim-centric**: Most entities link to `claims`
- **Soft deletes**: Use `deleted_at` timestamp

---

## 📋 TABLE SUMMARIES

### **organizations**
**Purpose**: Multi-tenant isolation - each restoration company is an org

**Key Columns**:
- `id` (UUID) - Primary key
- `slug` (VARCHAR) - URL-friendly identifier
- `subscription_tier` (VARCHAR) - free, basic, professional, enterprise
- `settings` (JSONB) - Flexible org configuration

**Business Rules**:
- Estimate Reliance is org_id from seed data
- Other companies can sign up (SaaS model)
- Settings JSONB contains branding, features, notifications

**Common Queries**:
```sql
-- Get organization by slug
SELECT * FROM organizations WHERE slug = 'estimate-reliance' AND deleted_at IS NULL;

-- Get organization settings
SELECT settings->'features'->'ai_tools_enabled' FROM organizations WHERE id = $1;
```

---

### **users**
**Purpose**: User profiles (links to Supabase Auth via auth.users)

**Key Columns**:
- `id` (UUID) - FK to auth.users(id)
- `email` (VARCHAR) - Unique email
- `full_name` (VARCHAR) - Generated from first_name + last_name
- `google_workspace_email` (VARCHAR) - For Gmail API integration
- `google_refresh_token` (TEXT) - OAuth token for sending emails

**Business Rules**:
- ID must match Supabase Auth user ID
- Users belong to orgs via `user_organization_roles` junction
- Can have different roles in different organizations

**Common Queries**:
```sql
-- Get user with organizations and roles
SELECT u.*, uor.organization_id, r.name as role_name
FROM users u
JOIN user_organization_roles uor ON uor.user_id = u.id
JOIN roles r ON r.id = uor.role_id
WHERE u.id = auth.uid() AND uor.is_active = true;
```

---

### **roles**
**Purpose**: System and custom roles with granular permissions

**Key Columns**:
- `id` (UUID) - Primary key
- `name` (VARCHAR) - Role identifier (admin, contractor, estimator, client)
- `permissions` (JSONB) - Permission matrix
- `is_system_role` (BOOLEAN) - Built-in vs custom
- `organization_id` (UUID) - NULL for system roles

**System Roles**:
1. **super_admin** - Estimate Reliance staff (full access)
2. **admin** - Organization administrator
3. **contractor** - Field contractor (manage claims)
4. **estimator** - Create/edit estimates only
5. **client** - Property owner (read-only)

**Permissions Structure**:
```json
{
  "claims": {"create": true, "read": true, "update": true, "delete": false},
  "estimates": {"create": true, "read": true, "update": true, "delete": false},
  "invoices": {"create": false, "read": true, "update": false, "delete": false},
  "users": {"create": false, "read": true, "update": false, "delete": false}
}
```

**Common Queries**:
```sql
-- Check if user has permission
SELECT has_permission(auth.uid(), $org_id, 'claims', 'create');

-- Get user's role in organization
SELECT * FROM get_user_role(auth.uid(), $org_id);
```

---

### **user_organization_roles** (Junction Table)
**Purpose**: Many-to-many relationship between users, organizations, and roles

**Key Columns**:
- `user_id` (UUID) - FK to users
- `organization_id` (UUID) - FK to organizations
- `role_id` (UUID) - FK to roles
- `is_active` (BOOLEAN) - Role currently active?

**Business Rules**:
- User can have ONE active role per organization
- Can belong to multiple organizations with different roles
- Unique constraint on (user_id, organization_id, role_id)

---

### **claims**
**Purpose**: Central table for restoration projects (entire lifecycle)

**Key Columns**:
- `claim_number` (VARCHAR) - Insurance company's claim ID **REQUIRED UNIQUE**
- `status` (VARCHAR) - Current workflow stage
- `date_of_loss` (DATE) - **CRITICAL** - When damage occurred
- `assigned_contractor_id` (UUID) - FK to users
- `assigned_estimator_id` (UUID) - FK to users
- `client_user_id` (UUID) - Property owner FK to users

**Status Workflow**:
```
open → assigned → assessment_scheduled → assessment_complete →
estimate_in_progress → estimate_submitted → approved → work_in_progress →
work_complete → final_inspection → closed
```

**Financial Columns**:
- `estimated_total` - Initial damage estimate
- `approved_amount` - Insurance approved
- `supplement_amount` - Additional supplements
- `final_amount` - Final billed amount

**IMPORTANT**: Update claim status using `update_claim_status()` function (auto-tracks dates)

**Common Queries**:
```sql
-- Get all claims for current user
SELECT * FROM get_user_claims(auth.uid(), $org_id);

-- Get claims by status
SELECT c.*, p.full_address
FROM claims c
JOIN properties p ON p.claim_id = c.id
WHERE c.organization_id = $org_id
AND c.status = 'work_in_progress'
AND c.deleted_at IS NULL;
```

---

### **properties**
**Purpose**: Property details for each claim (one-to-one relationship)

**Key Columns**:
- `claim_id` (UUID) - UNIQUE FK to claims
- `full_address` (VARCHAR) - Generated column for display
- `owner_full_name` (VARCHAR) - Generated column
- `property_type` (VARCHAR) - residential, commercial, multi_family
- `latitude/longitude` (DECIMAL) - GPS coordinates

**Address Columns**:
- `address_line1`, `address_line2`, `city`, `state`, `zip_code`
- Auto-generates `full_address` for easy display/search

**Property Details**:
- `square_footage`, `year_built`, `stories`
- `bedrooms`, `bathrooms`
- `roof_type`, `roof_age`, `siding_type`

**Common Queries**:
```sql
-- Get claim with property
SELECT c.*, p.full_address, p.owner_full_name
FROM claims c
JOIN properties p ON p.claim_id = c.id
WHERE c.id = $claim_id;
```

---

### **estimates**
**Purpose**: Estimate records (initial, supplements, revisions)

**Key Columns**:
- `estimate_number` (VARCHAR) - Unique identifier
- `estimate_type` (VARCHAR) - initial, supplement, revision, final
- `status` (VARCHAR) - draft → in_progress → completed → submitted → approved
- `total_amount` (DECIMAL) - **AUTO-CALCULATED** from line items
- `version` (INTEGER) - Version control
- `parent_estimate_id` (UUID) - Links to previous version

**Financial Breakdown**:
- `subtotal` - Sum of line items
- `overhead_percentage/amount` - Typically 10%
- `profit_percentage/amount` - Typically 10%
- `tax_rate/amount` - Sales tax
- `total_amount` - Final total

**Xactimate Integration**:
- `xactimate_estimate_id` - External reference
- `xactimate_data` (JSONB) - Raw import data

**IMPORTANT**: Totals auto-recalculate when line items change (via trigger)

---

### **estimate_line_items**
**Purpose**: Individual line items within estimates

**Key Columns**:
- `line_number` (INTEGER) - Display order (10, 20, 30...)
- `description` (TEXT) - What is being done
- `quantity` (DECIMAL) - How many units
- `unit` (VARCHAR) - EA, SF, LF, SQ, HR
- `unit_cost` (DECIMAL) - Price per unit
- `total_cost` (DECIMAL) - **COMPUTED**: quantity × unit_cost

**Organization**:
- `category` - Roofing, Interior, Plumbing, etc.
- `subcategory` - Specific area
- `parent_line_id` - For hierarchical items
- `level` - 0=category, 1=item, 2=sub-item

**Labor/Materials Breakdown**:
- `labor_hours`, `labor_rate`, `labor_cost`
- `material_cost`, `equipment_cost`

**Xactimate**:
- `xactimate_code` - Standard code (e.g., "DRY 1/2")

**Common Queries**:
```sql
-- Get line items with totals
SELECT
  category,
  COUNT(*) as item_count,
  SUM(total_cost) as category_total
FROM estimate_line_items
WHERE estimate_id = $estimate_id
GROUP BY category;
```

---

### **photos**
**Purpose**: Photo references for Supabase Storage

**Key Columns**:
- `storage_path` (TEXT) - Full path in Supabase bucket
- `storage_bucket` (VARCHAR) - Bucket name (default: 'claim-photos')
- `category` (VARCHAR) - damage, pre_existing, repair_progress, completion
- `tags` (TEXT[]) - Array of searchable tags

**Storage Pattern**:
```
{organization_id}/{claim_id}/{photo_id}.jpg
```

**Classification**:
- `category` - Type of photo
- `subcategory` - More specific
- `room_location` - Where in property
- `damage_type` - water, fire, wind, etc.

**Visibility**:
- `is_public` (BOOLEAN) - Visible to client?
- `is_approved` (BOOLEAN) - OK for insurance submission?
- `is_featured` (BOOLEAN) - Featured photo for claim

**Common Queries**:
```sql
-- Get photos by category
SELECT * FROM get_claim_photos_by_category($claim_id);

-- Generate storage path
SELECT generate_photo_storage_path($org_id, $claim_id, $photo_id, 'jpg');
```

---

### **invoices**
**Purpose**: Invoice management and payment tracking

**Key Columns**:
- `invoice_number` (VARCHAR) - Unique identifier
- `total_amount` (DECIMAL) - **AUTO-CALCULATED** from line items
- `amount_paid` (DECIMAL) - Updated automatically when payments received
- `amount_due` (DECIMAL) - **COMPUTED**: total_amount - amount_paid
- `status` (VARCHAR) - draft → sent → viewed → partial_paid → paid
- `payment_status` (VARCHAR) - unpaid, partial, paid

**Important Dates**:
- `issue_date`, `due_date`, `sent_date`, `paid_date`

**Auto-calculations**:
- Totals recalculate when line items change
- Payment status updates when payments received
- Status changes to 'overdue' after due_date

**Common Queries**:
```sql
-- Get overdue invoices
SELECT * FROM invoices
WHERE due_date < CURRENT_DATE
AND payment_status != 'paid'
AND deleted_at IS NULL;

-- Update overdue statuses (run nightly)
SELECT update_overdue_invoices();
```

---

### **payments**
**Purpose**: Track individual payments received

**Key Columns**:
- `invoice_id` (UUID) - FK to invoices
- `amount` (DECIMAL) - Payment amount
- `payment_method` (VARCHAR) - check, credit_card, ach, wire
- `status` (VARCHAR) - pending, completed, failed
- `processor_fee` (DECIMAL) - Stripe/Square fees
- `net_amount` (DECIMAL) - **COMPUTED**: amount - processor_fee

**Check Details** (if applicable):
- `check_number`, `check_date`, `bank_name`

**Processor Integration** (future):
- `processor` - stripe, square, paypal
- `processor_transaction_id`

**IMPORTANT**: When payment status = 'completed', invoice payment_status auto-updates

---

### **insurance_companies**
**Purpose**: Master list of insurance companies

**Key Columns**:
- `company_name` (VARCHAR) - Insurance company name
- `company_code` (VARCHAR) - NAIC number or internal code
- `claims_phone/email` - Direct claims department contact
- `organization_id` (UUID) - NULL = shared across all orgs

**Performance Tracking**:
- `average_claim_processing_days`
- `preferred_contact_method`
- `metadata` (JSONB) - Response times, approval rates

---

### **insurance_adjusters**
**Purpose**: Individual insurance adjusters

**Key Columns**:
- `insurance_company_id` (UUID) - FK to insurance_companies
- `full_name` (VARCHAR) - Generated from first/last name
- `adjuster_type` (VARCHAR) - staff, independent, field
- `responsiveness_rating` (INTEGER) - 1-5 scale
- `approval_rating` (INTEGER) - 1-5 scale

**Working Relationship Tracking**:
- `best_contact_time`, `communication_style`
- `last_contact_date`
- `metadata` (JSONB) - Claim history, average response time

---

### **claim_insurers** (Junction)
**Purpose**: Links claims to insurance companies/adjusters

**Key Columns**:
- `policy_number` (VARCHAR) - **REQUIRED**
- `is_primary` (BOOLEAN) - Primary vs secondary insurance
- `insurer_claim_number` (VARCHAR) - Insurance company's internal #
- `amount_claimed`, `amount_approved`, `amount_paid`

**Status Tracking**:
- `insurer_claim_status` - open, under_review, approved, denied
- `date_filed_with_insurer`, `date_decision`
- `next_followup_date` - When to follow up next

**Denial Tracking**:
- `is_denied`, `denial_reason`
- `is_disputed`, `dispute_notes`

---

### **correspondence**
**Purpose**: Communication log with insurance companies

**Key Columns**:
- `correspondence_type` (VARCHAR) - email, phone_call, meeting
- `direction` (VARCHAR) - inbound, outbound
- `subject`, `body` (TEXT) - Content
- `requires_response` (BOOLEAN) - Needs follow-up?

**Follow-up Tracking**:
- `response_deadline`, `is_responded`, `response_date`
- `sentiment` - positive, neutral, negative, urgent

---

### **status_history**
**Purpose**: Audit trail for ALL status changes

**Key Columns**:
- `entity_type` (VARCHAR) - claims, estimates, invoices
- `entity_id` (UUID) - ID of record that changed
- `field_name` (VARCHAR) - Which field changed
- `old_status`, `new_status` (VARCHAR) - Before/after values
- `changed_by` (UUID) - Who made the change

**Auto-logging**: Triggers on claims, estimates, invoices auto-log status changes

---

### **notes**
**Purpose**: User-created notes attached to any entity

**Key Columns**:
- `entity_type` (VARCHAR) - What this note is attached to
- `entity_id` (UUID) - ID of that entity
- `content` (TEXT) - Note content
- `visibility` (VARCHAR) - private, team, client, public
- `mentioned_users` (UUID[]) - Array of @mentioned users

**Follow-up Support**:
- `requires_followup`, `followup_date`, `followup_assigned_to`

---

### **notifications**
**Purpose**: In-app notifications for users

**Key Columns**:
- `user_id` (UUID) - Who receives this
- `notification_type` (VARCHAR) - claim_assigned, estimate_approved, etc.
- `is_read` (BOOLEAN) - Read status
- `priority` (VARCHAR) - low, normal, high, urgent

**Multi-channel Delivery**:
- `sent_via_email`, `sent_via_sms`, `sent_via_push`

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Key Concepts

1. **Organization Isolation**: Users only see data from their org(s)
2. **Role-Based Access**: Permissions checked via `auth.user_has_permission()`
3. **Super Admin Bypass**: `auth.is_super_admin()` sees everything
4. **Service Role**: Backend bypasses ALL RLS

### Helper Functions

```sql
-- Get user's organizations
SELECT auth.user_organization_ids();

-- Check super admin
SELECT auth.is_super_admin();

-- Check org admin
SELECT auth.is_org_admin($org_id);

-- Check permission
SELECT auth.user_has_permission($org_id, 'claims', 'create');
```

### Policy Pattern

```sql
CREATE POLICY "policy_name"
    ON table_name FOR SELECT
    USING (
        auth.is_super_admin()
        OR organization_id = ANY(auth.user_organization_ids())
    );
```

---

## 🔄 COMMON PATTERNS

### Creating a New Claim

```sql
-- 1. Insert claim
INSERT INTO claims (organization_id, claim_number, date_of_loss, created_by, ...)
VALUES ($org_id, $claim_num, $date, auth.uid(), ...);

-- 2. Insert property
INSERT INTO properties (claim_id, organization_id, address_line1, ...)
VALUES ($claim_id, $org_id, $address, ...);

-- 3. Log status change (automatic via trigger)
```

### Creating an Estimate

```sql
-- 1. Insert estimate
INSERT INTO estimates (claim_id, organization_id, estimate_number, ...)
VALUES ($claim_id, $org_id, $est_num, ...);

-- 2. Insert line items
INSERT INTO estimate_line_items (estimate_id, line_number, description, quantity, unit_cost, ...)
VALUES ($est_id, 10, $desc, $qty, $cost, ...);

-- 3. Totals auto-calculate via trigger
```

### Uploading a Photo

```sql
-- 1. Upload to Supabase Storage (via SDK)
const path = `${org_id}/${claim_id}/${photo_id}.jpg`;
await supabase.storage.from('claim-photos').upload(path, file);

-- 2. Insert photo record
INSERT INTO photos (claim_id, organization_id, storage_path, file_name, ...)
VALUES ($claim_id, $org_id, $path, $filename, ...);
```

---

## ⚡ PERFORMANCE TIPS

1. **Always filter by `organization_id`** - Uses indexes efficiently
2. **Include `deleted_at IS NULL`** - Exclude soft-deleted records
3. **Use generated columns** - `full_address`, `full_name` are pre-computed
4. **Leverage full-text search** - GIN indexes on claims, properties, photos
5. **Batch operations** - Use transactions for multi-step operations

---

## 🚨 CRITICAL RULES

1. **NEVER hard delete** - Always use soft delete (`deleted_at`)
2. **NEVER bypass RLS** - Use service role only for legitimate admin operations
3. **ALWAYS validate organization_id** - Prevent cross-org data leaks
4. **ALWAYS log status changes** - Use `log_status_change()` function
5. **NEVER store PII in logs** - Sanitize activity_log entries

---

## 📞 GOOGLE WORKSPACE EMAIL INTEGRATION

**Purpose**: Send emails as the user's email address via Gmail API

**Setup**:
1. User authenticates with Google OAuth
2. Store `google_workspace_email` and `google_refresh_token` in users table
3. Use Gmail API with refresh token to send emails

**Security**:
- Encrypt refresh tokens at rest
- Refresh tokens should be rotated periodically
- Check `google_token_expires_at` before using

---

## 🎓 AI AGENT TIPS

When working with this schema:

1. **Always join claims → properties** for addresses
2. **Check RLS helpers** before querying across organizations
3. **Use helper functions** - They're optimized and secure
4. **Read JSONB carefully** - permissions, settings, metadata have structure
5. **Respect workflow states** - Don't skip status transitions
6. **Use transactions** - For multi-table operations (claim + property)
7. **Test with different roles** - Verify RLS policies work correctly

---

**END OF AI REFERENCE GUIDE**
