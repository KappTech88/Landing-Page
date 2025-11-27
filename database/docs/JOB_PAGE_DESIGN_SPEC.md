# Job Page Design Specification

**Version:** 1.0
**Date:** November 27, 2025
**Status:** Draft - Pending Approval

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Architecture](#2-database-architecture)
3. [TypeScript Interfaces](#3-typescript-interfaces)
4. [Component Architecture](#4-component-architecture)
5. [UI Layout Specification](#5-ui-layout-specification)
6. [Communications Panel](#6-communications-panel)
7. [Data Flow](#7-data-flow)
8. [API Functions](#8-api-functions)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Overview

### 1.1 Purpose

Redesign the Job Detail page to properly align with the database schema where **Jobs** are the central work entity, linked to **Contacts** (customers) with optional **Claims** for insurance work.

### 1.2 Current Problems

| Issue | Impact |
|-------|--------|
| Component uses `ClaimWithDetails` type | Wrong data structure |
| Property data pulled from `property` relation | Should come from `contacts` |
| Status values don't match database | 13 claim statuses vs 16 job statuses |
| Missing job-specific fields | `contract_amount`, `gross_profit`, etc. |
| No real database integration | Using mock data |
| Communications in sidebar tab | Should be main panel feature |

### 1.3 Goals

- Align UI with actual database schema
- Create reusable, type-safe components
- Implement real-time Communications/Notes panel
- Support both insurance and retail job types
- Clean, professional roofing contractor CRM interface

---

## 2. Database Architecture

### 2.1 Entity Relationship

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  contacts   │◄──────│    jobs     │──────►│   claims    │
│  (customer) │  1:N  │  (central)  │  1:1  │ (optional)  │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐
                      │  job_notes  │
                      └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────────┐
                      │job_note_mentions│
                      └─────────────────┘
```

### 2.2 Key Tables for Job Page

#### jobs (Primary - from 003-jobs.sql)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Multi-tenancy |
| `job_number` | VARCHAR(50) | Auto-generated (JOB-2024-00001) |
| `job_name` | VARCHAR(255) | Display name |
| `contact_id` | UUID | FK to contacts (REQUIRED) |
| `status` | VARCHAR(30) | Current job status |
| `job_type` | VARCHAR(50) | roofing, siding, gutters, etc. |
| `job_category` | VARCHAR(50) | residential_retail, residential_insurance, commercial |
| `is_insurance_job` | BOOLEAN | Toggle insurance fields |
| `contract_amount` | DECIMAL(12,2) | Agreed price |
| `actual_cost` | DECIMAL(12,2) | Running actual cost |
| `gross_profit` | DECIMAL(12,2) | Computed: contract - actual |
| `total_invoiced` | DECIMAL(12,2) | Sum of invoices |
| `total_paid` | DECIMAL(12,2) | Sum of payments |
| `balance_due` | DECIMAL(12,2) | Computed: invoiced - paid |
| `customer_name` | VARCHAR(255) | Cached from contact |
| `customer_phone` | VARCHAR(20) | Cached from contact |
| `customer_email` | VARCHAR(255) | Cached from contact |
| `service_address` | TEXT | Cached full address |

#### contacts (Customer - from 002-contacts.sql)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `contact_number` | VARCHAR(50) | Auto-generated |
| `first_name` | VARCHAR(100) | |
| `last_name` | VARCHAR(100) | |
| `full_name` | VARCHAR(255) | Computed |
| `email` | VARCHAR(255) | |
| `phone_primary` | VARCHAR(20) | |
| `full_address` | VARCHAR(500) | Computed |
| `property_type` | VARCHAR(50) | single_family, commercial, etc. |
| `year_built` | INTEGER | |
| `square_footage` | INTEGER | |

#### Job Status Values (16 states)

```
lead → appointment_set → quoted → negotiating → sold →
pending_permit → permit_approved → materials_ordered → scheduled →
in_progress → on_hold → punch_list → complete → closed

Terminal: cancelled, lost
```

### 2.3 New Tables Required

#### job_notes

```sql
CREATE TABLE job_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,
    note_type VARCHAR(30) NOT NULL DEFAULT 'general',
    -- Types: general, mention, reply, system, status_change

    -- Threading
    parent_note_id UUID REFERENCES job_notes(id) ON DELETE CASCADE,
    thread_id UUID, -- Groups conversation threads

    -- Author
    created_by UUID NOT NULL REFERENCES users(id),

    -- Flags
    is_pinned BOOLEAN DEFAULT false,
    is_internal BOOLEAN DEFAULT true, -- false = visible to customer portal

    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    -- Format: [{"id": "uuid", "name": "file.pdf", "url": "...", "type": "pdf"}]

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE, -- If content was edited
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_job_notes_job ON job_notes(job_id);
CREATE INDEX idx_job_notes_org ON job_notes(organization_id);
CREATE INDEX idx_job_notes_author ON job_notes(created_by);
CREATE INDEX idx_job_notes_parent ON job_notes(parent_note_id) WHERE parent_note_id IS NOT NULL;
CREATE INDEX idx_job_notes_thread ON job_notes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_job_notes_pinned ON job_notes(job_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_job_notes_created ON job_notes(created_at DESC);
CREATE INDEX idx_job_notes_deleted ON job_notes(deleted_at) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER job_notes_updated_at
    BEFORE UPDATE ON job_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### job_note_mentions

```sql
CREATE TABLE job_note_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES job_notes(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Notification
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_channel VARCHAR(20), -- in_app, email, sms

    -- Read Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Response
    has_responded BOOLEAN DEFAULT false,
    response_note_id UUID REFERENCES job_notes(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(note_id, mentioned_user_id)
);

-- Indexes
CREATE INDEX idx_mentions_note ON job_note_mentions(note_id);
CREATE INDEX idx_mentions_user ON job_note_mentions(mentioned_user_id);
CREATE INDEX idx_mentions_unread ON job_note_mentions(mentioned_user_id, is_read)
    WHERE is_read = false;
CREATE INDEX idx_mentions_pending_notification ON job_note_mentions(notification_sent)
    WHERE notification_sent = false;
```

#### job_access (For user permissions on jobs)

```sql
CREATE TABLE job_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Access Level
    access_level VARCHAR(20) NOT NULL DEFAULT 'view',
    -- Levels: view, comment, edit, manage, owner

    -- How assigned
    assigned_by UUID REFERENCES users(id),
    assigned_reason VARCHAR(50), -- sales_rep, project_manager, estimator, crew_member, manual

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(job_id, user_id)
);

CREATE INDEX idx_job_access_job ON job_access(job_id);
CREATE INDEX idx_job_access_user ON job_access(user_id);
CREATE INDEX idx_job_access_active ON job_access(job_id, is_active) WHERE is_active = true;
```

---

## 3. TypeScript Interfaces

### 3.1 Core Types (Add to types.ts)

```typescript
// ============= JOB STATUS =============

export type JobStatus =
  | 'lead'
  | 'appointment_set'
  | 'quoted'
  | 'negotiating'
  | 'sold'
  | 'pending_permit'
  | 'permit_approved'
  | 'materials_ordered'
  | 'scheduled'
  | 'in_progress'
  | 'on_hold'
  | 'punch_list'
  | 'complete'
  | 'closed'
  | 'cancelled'
  | 'lost';

export type JobType =
  | 'roofing'
  | 'siding'
  | 'gutters'
  | 'windows'
  | 'doors'
  | 'painting'
  | 'decking'
  | 'fencing'
  | 'insulation'
  | 'ventilation'
  | 'general'
  | 'other';

export type JobCategory =
  | 'residential_retail'
  | 'residential_insurance'
  | 'commercial';

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

// ============= JOB INTERFACE =============

export interface Job {
  id: string;
  organization_id: string;

  // Identification
  job_number: string;
  job_name: string;

  // Customer Link
  contact_id: string;
  property_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  service_address?: string;

  // Classification
  job_type: JobType;
  job_category: JobCategory;
  work_type: 'replacement' | 'repair' | 'new_construction' | 'maintenance' | 'inspection' | 'emergency' | 'warranty' | 'other';

  // Status
  status: JobStatus;
  priority: JobPriority;
  is_active: boolean;
  completion_percentage: number;

  // Flags
  is_insurance_job: boolean;
  is_warranty_job: boolean;
  requires_permit: boolean;

  // Team
  sales_rep_id?: string;
  project_manager_id?: string;
  estimator_id?: string;

  // Dates
  date_created?: string;
  date_sold?: string;
  date_scheduled?: string;
  date_started?: string;
  date_completed?: string;
  target_start_date?: string;
  target_completion_date?: string;

  // Financials
  contract_amount?: number;
  estimated_cost?: number;
  actual_cost?: number;
  gross_profit?: number;
  profit_margin?: number;
  total_invoiced?: number;
  total_paid?: number;
  balance_due?: number;

  // Roofing Specifics
  roof_squares?: number;
  roof_pitch?: string;
  roof_type?: string;
  shingle_manufacturer?: string;
  shingle_product_line?: string;
  shingle_color?: string;

  // Insurance (only if is_insurance_job)
  insurance_company?: string;
  insurance_claim_number?: string;
  insurance_policy_number?: string;
  date_of_loss?: string;
  adjuster_name?: string;
  adjuster_phone?: string;
  adjuster_email?: string;
  insurance_rcv?: number;
  insurance_acv?: number;
  insurance_deductible?: number;
  deductible_collected?: boolean;
  depreciation_amount?: number;

  // Notes
  scope_of_work?: string;
  production_notes?: string;
  internal_notes?: string;

  // Metadata
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Audit
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============= CONTACT INTERFACE =============

export interface Contact {
  id: string;
  organization_id: string;
  contact_number: string;

  // Type
  contact_type: 'lead' | 'prospect' | 'customer' | 'past_customer' | 'vendor' | 'other';
  customer_status: 'active' | 'inactive' | 'do_not_contact' | 'deceased';
  account_type: 'homeowner' | 'property_manager' | 'business' | 'hoa' | 'government' | 'referral_partner' | 'other';

  // Name
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company_name?: string;

  // Contact
  email?: string;
  phone_primary?: string;
  phone_secondary?: string;
  preferred_contact_method: 'phone' | 'email' | 'text' | 'mail';

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  full_address?: string;

  // Property
  property_type?: string;
  year_built?: number;
  square_footage?: number;
  stories?: number;
  roof_type?: string;
  roof_squares?: number;

  // Relationship
  total_jobs?: number;
  total_revenue?: number;
  first_job_date?: string;
  last_job_date?: string;

  // Audit
  created_at: string;
  updated_at: string;
}

// ============= JOB WITH RELATIONS =============

export interface JobWithDetails extends Job {
  contact?: Contact;
  claim?: Claim;
  estimates?: Estimate[];
  photos?: Photo[];
  notes?: JobNote[];
  team_members?: JobTeamMember[];
  sales_rep?: User;
  project_manager?: User;
  estimator?: User;
}

// ============= JOB NOTES =============

export type NoteType = 'general' | 'mention' | 'reply' | 'system' | 'status_change';

export interface JobNote {
  id: string;
  job_id: string;
  organization_id: string;

  // Content
  content: string;
  note_type: NoteType;

  // Threading
  parent_note_id?: string;
  thread_id?: string;

  // Author
  created_by: string;

  // Flags
  is_pinned: boolean;
  is_internal: boolean;

  // Attachments
  attachments?: NoteAttachment[];

  // Audit
  created_at: string;
  updated_at: string;
  edited_at?: string;
  deleted_at?: string;

  // Relations (populated by query)
  author?: User;
  mentions?: JobNoteMention[];
  replies?: JobNote[];
  reply_count?: number;
}

export interface NoteAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface JobNoteMention {
  id: string;
  note_id: string;
  mentioned_user_id: string;
  organization_id: string;

  // Notification
  notification_sent: boolean;
  notification_sent_at?: string;
  notification_channel?: 'in_app' | 'email' | 'sms';

  // Status
  is_read: boolean;
  read_at?: string;
  has_responded: boolean;
  response_note_id?: string;

  created_at: string;

  // Relations
  mentioned_user?: User;
}

// ============= JOB ACCESS =============

export type JobAccessLevel = 'view' | 'comment' | 'edit' | 'manage' | 'owner';

export interface JobAccess {
  id: string;
  job_id: string;
  user_id: string;
  organization_id: string;
  access_level: JobAccessLevel;
  assigned_by?: string;
  assigned_reason?: string;
  is_active: boolean;
  created_at: string;

  // Relations
  user?: User;
}

// ============= JOB TEAM MEMBER =============

export interface JobTeamMember {
  id: string;
  job_id: string;
  user_id: string;
  organization_id: string;
  role: 'project_manager' | 'sales_rep' | 'estimator' | 'production_manager' | 'coordinator';
  is_active: boolean;
  assigned_at: string;

  // Relations
  user?: User;
}
```

---

## 4. Component Architecture

### 4.1 Component Tree

```
App.tsx
└── DashboardLayout.tsx
    ├── TopNav (horizontal navigation)
    ├── ContextSidebar (job navigation tabs)
    └── JobDetail.tsx (main content)
        │
        ├── JobBanner.tsx
        │   ├── BannerImage
        │   ├── JobTitle
        │   ├── StatusBadge
        │   └── ProgressBar
        │
        ├── MainPanel (left 2/3)
        │   ├── PropertyInfoCard.tsx
        │   │   ├── PropertyDetails
        │   │   ├── HomeownerContact
        │   │   └── ClaimInfo (conditional)
        │   │
        │   └── CommunicationsPanel.tsx ◀── NEW
        │       ├── NotesHeader
        │       │   ├── TabBar (All | Mentions | Pinned)
        │       │   └── SearchInput
        │       ├── NotesList
        │       │   └── NoteItem.tsx (recursive for replies)
        │       │       ├── NoteHeader
        │       │       ├── NoteContent
        │       │       ├── NoteMentions
        │       │       └── NoteReplies
        │       └── NoteInput.tsx
        │           ├── TextArea
        │           ├── MentionDropdown
        │           ├── AttachButton
        │           └── SendButton
        │
        └── SidePanel (right 1/3)
            ├── JobFinancesCard.tsx
            │   ├── FinanceStats
            │   ├── MiniChart
            │   └── InvoicePaymentSummary
            │
            └── QuickAccessCard.tsx
                └── FilesTabs (Files | Photos)
```

### 4.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `JobDetail.tsx` | Container, data fetching, tab routing |
| `JobBanner.tsx` | Hero section with image, title, status |
| `PropertyInfoCard.tsx` | Customer & property information display |
| `CommunicationsPanel.tsx` | Notes system with mentions |
| `NoteItem.tsx` | Single note with replies (recursive) |
| `NoteInput.tsx` | Composing new notes with @mentions |
| `JobFinancesCard.tsx` | Financial summary and mini chart |
| `QuickAccessCard.tsx` | Quick file/photo access |

### 4.3 File Structure

```
components/
└── Dashboard/
    ├── DashboardLayout.tsx (existing)
    ├── JobDetail/
    │   ├── index.tsx (main container)
    │   ├── JobBanner.tsx
    │   ├── PropertyInfoCard.tsx
    │   ├── JobFinancesCard.tsx
    │   ├── QuickAccessCard.tsx
    │   └── Communications/
    │       ├── CommunicationsPanel.tsx
    │       ├── NotesList.tsx
    │       ├── NoteItem.tsx
    │       ├── NoteInput.tsx
    │       ├── MentionDropdown.tsx
    │       └── types.ts (component-specific types)
    └── shared/
        ├── StatusBadge.tsx
        ├── ProgressBar.tsx
        └── UserAvatar.tsx
```

---

## 5. UI Layout Specification

### 5.1 Overall Layout (Overview Tab)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [ER Logo]  Dashboard | Contacts | Jobs | Calendar | Inbox | ...    [+ Add] │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌────────────────────────────────────────────────────────────┐│
│ │ Overview │ │                                                            ││
│ │ Measure  │ │  ┌──────────────────────────────────────────────────────┐  ││
│ │ Estimate │ │  │  [Property Image Banner]                   [Upload]  │  ││
│ │ Work Ord │ │  │  Job: 456 Maple St. Roof Replacement                 │  ││
│ │ Material │ │  │  Work In Progress - 80%  ████████████░░░             │  ││
│ │ Financia │ │  └──────────────────────────────────────────────────────┘  ││
│ │ Photos   │ │                                                            ││
│ │ Document │ │  ┌────────────────────────────┐ ┌────────────────────────┐ ││
│ │ Communic │ │  │ Property & Homeowner Info  │ │ Job Finances           │ ││
│ │ History  │ │  │                            │ │                        │ ││
│ └──────────┘ │  │ [Property Details]         │ │ Estimate    $25,000    │ ││
│              │  │ Address: 456 Maple St...   │ │ Approved    $8,000     │ ││
│              │  │ Year Built: 2007           │ │                        │ ││
│              │  │ Sq Ft: 2,350               │ │ [Mini Chart]           │ ││
│              │  │                            │ │                        │ ││
│              │  │ [Homeowner Contact]        │ │ Invoiced    $1,000     │ ││
│              │  │ Name: John Smith           │ │ Paid        $0         │ ││
│              │  │ Phone: (555) 123-4567      │ │ Balance     $1,000     │ ││
│              │  │ Email: john@email.com      │ │                        │ ││
│              │  │                            │ └────────────────────────┘ ││
│              │  │ [Claim Info] (if insur.)   │                            ││
│              │  │ Carrier: State Farm        │ ┌────────────────────────┐ ││
│              │  │ Claim #: 2122419433        │ │ Quick Access           │ ││
│              │  │ Policy: POL-123456         │ │ [Files] [Photos]       │ ││
│              │  └────────────────────────────┘ │                        │ ││
│              │                                 │ [Upload button]        │ ││
│              │  ┌────────────────────────────┐ └────────────────────────┘ ││
│              │  │ Communications             │                            ││
│              │  │ [All] [Mentions] [Pinned]  │                            ││
│              │  │                            │                            ││
│              │  │ ┌────────────────────────┐ │                            ││
│              │  │ │ JD  John Doe  2:30 PM  │ │                            ││
│              │  │ │ Homeowner confirmed... │ │                            ││
│              │  │ └────────────────────────┘ │                            ││
│              │  │                            │                            ││
│              │  │ ┌────────────────────────┐ │                            ││
│              │  │ │ JS  Jane tagged @Mike  │ │                            ││
│              │  │ │ Can you confirm crew?  │ │                            ││
│              │  │ │  └─ MJ replied: Yes... │ │                            ││
│              │  │ └────────────────────────┘ │                            ││
│              │  │                            │                            ││
│              │  │ [Write a note...] [@] [>] │                            ││
│              │  └────────────────────────────┘                            ││
│              └────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Grid Specifications

| Element | Width | Notes |
|---------|-------|-------|
| Context Sidebar | 208px (w-52) | Fixed |
| Main Content | Remaining | Flex |
| Left Column | 66% (2/3) | Property + Communications |
| Right Column | 34% (1/3) | Finances + Quick Access |

### 5.3 Card Specifications

| Card | Height | Content |
|------|--------|---------|
| Banner | 224px (h-56) | Image + overlay |
| Property Info | Auto | 3 sections |
| Communications | 400px min | Scrollable notes |
| Job Finances | Auto | Stats + chart |
| Quick Access | 200px | Tab content |

### 5.4 Color Scheme (Glass Morphism)

```css
/* Card Background */
background: rgba(30, 41, 59, 0.5);  /* slate-800/50 */
backdrop-filter: blur(16px);
border: 1px solid rgba(71, 85, 105, 0.5);  /* slate-600/50 */

/* Status Colors */
--status-lead: #9CA3AF;        /* gray */
--status-quoted: #FBBF24;      /* yellow */
--status-sold: #34D399;        /* green */
--status-in-progress: #14B8A6; /* teal */
--status-complete: #10B981;    /* emerald */
--status-cancelled: #EF4444;   /* red */

/* Accent */
--accent-primary: #06B6D4;     /* cyan-500 */
--accent-secondary: #3B82F6;   /* blue-500 */
```

---

## 6. Communications Panel

### 6.1 Feature Requirements

| Feature | Description | Priority |
|---------|-------------|----------|
| View Notes | Display all job notes in chronological order | P0 |
| Add Note | Text input to create new note | P0 |
| Timestamp | Auto-timestamp on note creation | P0 |
| User Tag | Select user from dropdown to mention | P0 |
| @Mention Syntax | Parse @username in note content | P0 |
| Notification | Notify mentioned user in-app | P0 |
| Reply | Respond to specific note (threaded) | P1 |
| Reply from Notification | Reply directly from inbox | P1 |
| Tabs Filter | All / My Mentions / Pinned | P1 |
| Pin Note | Pin important notes to top | P2 |
| Attachments | Attach files to notes | P2 |
| Search | Search notes by content | P3 |
| Edit Note | Edit own notes (with edit indicator) | P3 |
| Delete Note | Soft delete own notes | P3 |

### 6.2 Note Item Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌────┐                                                      │
│ │ JD │  John Doe                         Nov 27, 2:30 PM   │
│ └────┘  Sales Rep                                    [···]  │
│                                                             │
│  Homeowner confirmed materials delivery for Monday.         │
│  @Mike Johnson please coordinate with the crew.             │
│                                                             │
│  [Reply]  [Pin]                                    2 replies│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌────┐                                              │   │
│  │ │ MJ │  Mike Johnson              Nov 27, 2:45 PM   │   │
│  │ └────┘                                              │   │
│  │  Confirmed. Crew will be there 8am Monday.          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Note Input Component

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Write a note...                                            │
│  @Mike Johnson will you be available Monday?                │
│                                                             │
│  ┌─────────────────────────────────┐                       │
│  │ 👤 Mike Johnson - Project Mgr   │  ◀── Mention Dropdown │
│  │ 👤 Mike Smith - Estimator       │                       │
│  └─────────────────────────────────┘                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [📎 Attach]                              [Cancel] [Send ➤] │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 Mention Dropdown Logic

1. Trigger: User types `@` character
2. Query: Fetch users with access to this job (`job_access` table)
3. Filter: As user types, filter by name match
4. Select: Click or Enter to insert mention
5. Display: Show as highlighted `@username` in note
6. Store: Save mention to `job_note_mentions` table

### 6.5 Notification Flow

```
User A writes note           System processes
with @UserB                  note creation
       │                           │
       ▼                           ▼
┌─────────────┐            ┌─────────────────┐
│ POST /notes │───────────►│ Insert job_note │
└─────────────┘            └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ Parse @mentions │
                           └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ Insert mentions │
                           │ to job_note_    │
                           │ mentions table  │
                           └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ Queue in-app    │
                           │ notification    │
                           └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ User B sees     │
                           │ notification    │
                           │ badge in Inbox  │
                           └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ User B can      │
                           │ reply from      │
                           │ notification    │
                           └─────────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ Reply appears   │
                           │ in job notes    │
                           │ thread          │
                           └─────────────────┘
```

---

## 7. Data Flow

### 7.1 Loading Job Detail

```typescript
// 1. User navigates to job detail
onNavigate(AppView.DASHBOARD_JOB_DETAIL, { jobId: 'uuid' })

// 2. JobDetail component mounts
useEffect(() => {
  loadJobWithDetails(jobId);
}, [jobId]);

// 3. Supabase query
const { data } = await supabase
  .from('jobs')
  .select(`
    *,
    contact:contacts(*),
    claim:claims(*),
    notes:job_notes(
      *,
      author:users(*),
      mentions:job_note_mentions(
        *,
        mentioned_user:users(*)
      ),
      replies:job_notes(
        *,
        author:users(*)
      )
    ),
    team:job_team_members(
      *,
      user:users(*)
    ),
    sales_rep:users!jobs_sales_rep_id_fkey(*),
    project_manager:users!jobs_project_manager_id_fkey(*),
    access:job_access(
      *,
      user:users(*)
    )
  `)
  .eq('id', jobId)
  .single();

// 4. Set state
setJob(data);
setContact(data.contact);
setNotes(data.notes);
setAccessibleUsers(data.access.map(a => a.user));
```

### 7.2 Creating a Note with Mentions

```typescript
// 1. User submits note
const handleSubmitNote = async (content: string, mentions: string[]) => {
  // 2. Create note
  const { data: note } = await supabase
    .from('job_notes')
    .insert({
      job_id: job.id,
      organization_id: job.organization_id,
      content,
      note_type: mentions.length > 0 ? 'mention' : 'general',
      created_by: currentUser.id
    })
    .select()
    .single();

  // 3. Create mentions
  if (mentions.length > 0) {
    await supabase
      .from('job_note_mentions')
      .insert(
        mentions.map(userId => ({
          note_id: note.id,
          mentioned_user_id: userId,
          organization_id: job.organization_id
        }))
      );
  }

  // 4. Refresh notes list
  await loadNotes(job.id);
};
```

### 7.3 Real-time Updates (Optional Enhancement)

```typescript
// Subscribe to note changes
useEffect(() => {
  const subscription = supabase
    .channel(`job-notes-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'job_notes',
        filter: `job_id=eq.${jobId}`
      },
      (payload) => {
        // Handle insert/update/delete
        handleNoteChange(payload);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [jobId]);
```

---

## 8. API Functions

### 8.1 Add to lib/supabase.ts

```typescript
// =====================================================
// JOB FUNCTIONS
// =====================================================

/**
 * Get job with all related data
 */
export const getJobWithDetails = async (jobId: string): Promise<JobWithDetails> => {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      contact:contacts(*),
      claim:claims(*),
      sales_rep:users!jobs_sales_rep_id_fkey(id, full_name, avatar_url),
      project_manager:users!jobs_project_manager_id_fkey(id, full_name, avatar_url),
      estimator:users!jobs_estimator_id_fkey(id, full_name, avatar_url)
    `)
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get jobs for organization with filtering
 */
export const getJobs = async (
  organizationId: string,
  filters?: {
    status?: JobStatus[];
    job_type?: JobType;
    sales_rep_id?: string;
    search?: string;
  }
): Promise<Job[]> => {
  let query = supabase
    .from('jobs')
    .select(`
      *,
      contact:contacts(id, full_name, phone_primary, email)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (filters?.status?.length) {
    query = query.in('status', filters.status);
  }
  if (filters?.job_type) {
    query = query.eq('job_type', filters.job_type);
  }
  if (filters?.sales_rep_id) {
    query = query.eq('sales_rep_id', filters.sales_rep_id);
  }
  if (filters?.search) {
    query = query.or(`job_name.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Update job status with date tracking
 */
export const updateJobStatus = async (
  jobId: string,
  newStatus: JobStatus
): Promise<Job> => {
  const updates: Partial<Job> = { status: newStatus };

  // Auto-set dates based on status
  const now = new Date().toISOString().split('T')[0];
  switch (newStatus) {
    case 'sold':
      updates.date_sold = now;
      break;
    case 'scheduled':
      updates.date_scheduled = now;
      break;
    case 'in_progress':
      updates.date_started = now;
      break;
    case 'complete':
      updates.date_completed = now;
      break;
    case 'closed':
      updates.date_closed = now;
      break;
  }

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// =====================================================
// JOB NOTES FUNCTIONS
// =====================================================

/**
 * Get notes for a job
 */
export const getJobNotes = async (
  jobId: string,
  options?: {
    filter?: 'all' | 'mentions' | 'pinned';
    userId?: string;
  }
): Promise<JobNote[]> => {
  let query = supabase
    .from('job_notes')
    .select(`
      *,
      author:users!job_notes_created_by_fkey(id, full_name, avatar_url, title),
      mentions:job_note_mentions(
        *,
        mentioned_user:users(id, full_name, avatar_url)
      ),
      replies:job_notes!job_notes_parent_note_id_fkey(
        *,
        author:users!job_notes_created_by_fkey(id, full_name, avatar_url)
      )
    `)
    .eq('job_id', jobId)
    .is('parent_note_id', null) // Only top-level notes
    .is('deleted_at', null);

  // Apply filters
  if (options?.filter === 'pinned') {
    query = query.eq('is_pinned', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  // Filter mentions if needed
  if (options?.filter === 'mentions' && options.userId) {
    return data.filter(note =>
      note.mentions?.some(m => m.mentioned_user_id === options.userId)
    );
  }

  return data;
};

/**
 * Create a new job note
 */
export const createJobNote = async (
  jobId: string,
  organizationId: string,
  content: string,
  options?: {
    parentNoteId?: string;
    mentionedUserIds?: string[];
    attachments?: NoteAttachment[];
  }
): Promise<JobNote> => {
  const user = await getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  // Determine note type
  let noteType: NoteType = 'general';
  if (options?.parentNoteId) noteType = 'reply';
  else if (options?.mentionedUserIds?.length) noteType = 'mention';

  // Create note
  const { data: note, error: noteError } = await supabase
    .from('job_notes')
    .insert({
      job_id: jobId,
      organization_id: organizationId,
      content,
      note_type: noteType,
      parent_note_id: options?.parentNoteId,
      thread_id: options?.parentNoteId, // Use parent as thread ID
      created_by: user.id,
      attachments: options?.attachments || []
    })
    .select(`
      *,
      author:users!job_notes_created_by_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (noteError) throw noteError;

  // Create mentions
  if (options?.mentionedUserIds?.length) {
    const { error: mentionError } = await supabase
      .from('job_note_mentions')
      .insert(
        options.mentionedUserIds.map(userId => ({
          note_id: note.id,
          mentioned_user_id: userId,
          organization_id: organizationId
        }))
      );

    if (mentionError) throw mentionError;
  }

  return note;
};

/**
 * Toggle pin status on a note
 */
export const toggleNotePin = async (noteId: string): Promise<void> => {
  const { data: note } = await supabase
    .from('job_notes')
    .select('is_pinned')
    .eq('id', noteId)
    .single();

  await supabase
    .from('job_notes')
    .update({ is_pinned: !note?.is_pinned })
    .eq('id', noteId);
};

/**
 * Mark mention as read
 */
export const markMentionRead = async (mentionId: string): Promise<void> => {
  await supabase
    .from('job_note_mentions')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', mentionId);
};

// =====================================================
// JOB ACCESS FUNCTIONS
// =====================================================

/**
 * Get users with access to a job
 */
export const getJobAccessUsers = async (jobId: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from('job_access')
    .select(`
      user:users(id, full_name, avatar_url, title, email)
    `)
    .eq('job_id', jobId)
    .eq('is_active', true);

  if (error) throw error;
  return data.map(d => d.user);
};

/**
 * Add user access to job
 */
export const addJobAccess = async (
  jobId: string,
  userId: string,
  organizationId: string,
  accessLevel: JobAccessLevel = 'view',
  reason?: string
): Promise<void> => {
  const currentUser = await getCurrentUser();

  await supabase
    .from('job_access')
    .upsert({
      job_id: jobId,
      user_id: userId,
      organization_id: organizationId,
      access_level: accessLevel,
      assigned_by: currentUser?.id,
      assigned_reason: reason
    });
};
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)

| Task | Priority | Effort |
|------|----------|--------|
| Add TypeScript interfaces to types.ts | P0 | 2h |
| Create database migration for job_notes, job_note_mentions, job_access | P0 | 2h |
| Run migration on Supabase | P0 | 0.5h |
| Add Supabase functions to lib/supabase.ts | P0 | 3h |
| Create component folder structure | P0 | 0.5h |

### Phase 2: Core Components (Week 2)

| Task | Priority | Effort |
|------|----------|--------|
| Refactor JobDetail.tsx to use new types | P0 | 4h |
| Create JobBanner.tsx | P0 | 2h |
| Create PropertyInfoCard.tsx | P0 | 3h |
| Create JobFinancesCard.tsx | P0 | 3h |
| Update status progress bar for job statuses | P0 | 1h |
| Test with real data from Supabase | P0 | 2h |

### Phase 3: Communications Panel (Week 3)

| Task | Priority | Effort |
|------|----------|--------|
| Create CommunicationsPanel.tsx container | P0 | 2h |
| Create NotesList.tsx | P0 | 2h |
| Create NoteItem.tsx with threading | P0 | 3h |
| Create NoteInput.tsx | P0 | 2h |
| Implement @mention parsing | P0 | 2h |
| Create MentionDropdown.tsx | P0 | 2h |
| Connect to Supabase note functions | P0 | 2h |

### Phase 4: Notifications & Polish (Week 4)

| Task | Priority | Effort |
|------|----------|--------|
| Implement mention notifications | P1 | 3h |
| Add reply-from-notification flow | P1 | 3h |
| Add tab filtering (All/Mentions/Pinned) | P1 | 2h |
| Add note pinning | P2 | 1h |
| Add file attachments | P2 | 3h |
| Real-time updates subscription | P2 | 2h |
| Polish UI/UX | P1 | 3h |
| Testing & bug fixes | P0 | 4h |

### Total Estimated Effort: ~60 hours

---

## Appendix A: Status Progress Mapping

```typescript
export const JOB_STATUS_CONFIG: Record<JobStatus, {
  label: string;
  progress: number;
  color: string;
  icon: string;
}> = {
  lead: { label: 'Lead', progress: 5, color: '#9CA3AF', icon: 'UserPlus' },
  appointment_set: { label: 'Appointment Set', progress: 10, color: '#60A5FA', icon: 'Calendar' },
  quoted: { label: 'Quoted', progress: 20, color: '#FBBF24', icon: 'FileText' },
  negotiating: { label: 'Negotiating', progress: 25, color: '#F97316', icon: 'MessageSquare' },
  sold: { label: 'Sold', progress: 30, color: '#34D399', icon: 'CheckCircle' },
  pending_permit: { label: 'Pending Permit', progress: 40, color: '#A78BFA', icon: 'FileCheck' },
  permit_approved: { label: 'Permit Approved', progress: 45, color: '#8B5CF6', icon: 'BadgeCheck' },
  materials_ordered: { label: 'Materials Ordered', progress: 50, color: '#EC4899', icon: 'Package' },
  scheduled: { label: 'Scheduled', progress: 55, color: '#14B8A6', icon: 'CalendarCheck' },
  in_progress: { label: 'In Progress', progress: 70, color: '#06B6D4', icon: 'Hammer' },
  on_hold: { label: 'On Hold', progress: 70, color: '#EF4444', icon: 'PauseCircle' },
  punch_list: { label: 'Punch List', progress: 85, color: '#F59E0B', icon: 'ClipboardList' },
  complete: { label: 'Complete', progress: 95, color: '#10B981', icon: 'CheckCircle2' },
  closed: { label: 'Closed', progress: 100, color: '#059669', icon: 'Lock' },
  cancelled: { label: 'Cancelled', progress: 0, color: '#6B7280', icon: 'XCircle' },
  lost: { label: 'Lost', progress: 0, color: '#6B7280', icon: 'XCircle' },
};
```

---

## Appendix B: Approval Checklist

Before implementation, please confirm:

- [ ] Database schema (job_notes, job_note_mentions, job_access) approved
- [ ] TypeScript interfaces approved
- [ ] Component architecture approved
- [ ] UI layout approved
- [ ] Communications panel features prioritized
- [ ] Implementation phases timeline acceptable

---

**Document Status:** Ready for Review
**Next Step:** Owner approval before implementation begins
