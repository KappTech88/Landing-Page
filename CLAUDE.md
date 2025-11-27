# CLAUDE.md - AI Assistant Guide for Estimate Reliance

## Project Overview

**Estimate Reliance** is a comprehensive web platform for the insurance restoration industry, providing professional estimate and supplement services with AI-powered business development tools and a full-featured CRM dashboard.

**Live Production**: Deployed on Vercel
**Repository**: Landing-Page
**Project Codename**: estimate-reliance

---

## CRITICAL RULES FOR AI CODERS

**These rules are MANDATORY and enforced by hooks. Violations will be blocked.**

### RULE 1: No Changing Data Variables
- **NEVER** modify data variables, database schemas, or configuration values without explicit user approval
- **ALWAYS ASK** before creating any new dataset, schema, migration, or data file
- Protected files include: `.env.*`, `types.ts`, `database/schemas/*`, `supabase.ts`, seed files, migrations
- When in doubt, **ASK FIRST**

### RULE 2: Never Merge to Main
- **NEVER** merge any branch into `main` or `master`
- **NEVER** push directly to `main` or `master`
- **ONLY** the repository owner (KappTech88) can merge branches to main
- Always work on feature branches and create Pull Requests
- Let the owner review and merge PRs

**Hooks Location**: `.claude/` directory
**Hook Scripts**: `pre-bash-hook.sh`, `pre-edit-hook.sh`, `pre-write-hook.sh`, `post-commit-hook.sh`, `stop-hook-git-check.sh`

---

## Tech Stack

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2
- **Styling**: Tailwind CSS (via CDN in index.html)
- **Icons**: Lucide React 0.554.0
- **Animations**: Framer Motion 12.x, GSAP 3.13
- **3D/Graphics**: Three.js, @react-three/fiber, @react-three/drei
- **Smooth Scroll**: Lenis 1.3.15
- **Particles**: @tsparticles
- **Tilt Effects**: react-parallax-tilt
- **Excel Parsing**: xlsx 0.18.5

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **ORM/Client**: @supabase/supabase-js 2.39.0, @supabase/ssr 0.0.10

### AI Services
- **Primary AI**: Google Gemini (@google/genai 1.30.0)
  - Models: gemini-2.5-flash, gemini-3-pro-preview, gemini-3-pro-image-preview
  - Used for: Claim analysis, marketing content, image generation
- **Secondary AI**: Grok (xAI) - API ready, integration pending

### Notifications & Automation
- **Workflow Engine**: n8n (self-hosted via Docker)
- **Email**: SMTP (Gmail recommended)
- **Queue System**: PostgreSQL-based notification_queue table

### Deployment
- **Platform**: Vercel
- **Domain**: estimatereliance.com (DNS via Squarespace)

---

## Project Structure

```
/
├── App.tsx                 # Main application component with routing
├── index.tsx               # Entry point
├── index.html              # HTML template with Tailwind & custom CSS
├── types.ts                # TypeScript type definitions (database-aligned)
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
│
├── /components/            # React components
│   │
│   ├── /Dashboard/         # CRM Dashboard System
│   │   ├── DashboardLayout.tsx     # Main dashboard shell & navigation
│   │   ├── DashboardHome.tsx       # Dashboard overview/home
│   │   ├── JobsList.tsx            # Jobs list view with filters
│   │   ├── JobDetail.tsx           # Individual job detail view
│   │   │
│   │   ├── /JobDetail/Communications/  # Job communications system
│   │   │   ├── CommunicationsPanel.tsx # Main panel container
│   │   │   ├── NotesList.tsx          # Notes list display
│   │   │   ├── NoteItem.tsx           # Individual note component
│   │   │   ├── NoteInput.tsx          # Note input with mentions
│   │   │   └── index.ts               # Barrel export
│   │   │
│   │   ├── /Settings/              # Dashboard settings
│   │   │   ├── DashboardSettings.tsx       # Main settings container
│   │   │   ├── MacroBuilder.tsx            # Pricing macro builder
│   │   │   ├── ProductionPricingSettings.tsx  # Production pricing config
│   │   │   ├── WorkOrderPricingList.tsx    # Work order pricing
│   │   │   ├── VendorManagement.tsx        # Vendor/subcontractor management
│   │   │   └── XactimatePricing.tsx        # Xactimate line item pricing
│   │   │
│   │   └── /shared/                # Shared dashboard components
│   │       ├── ProgressBar.tsx
│   │       ├── StatusBadge.tsx
│   │       └── UserAvatar.tsx
│   │
│   ├── /EstimateBuilder/   # Estimate creation tool
│   │   ├── EstimateBuilder.tsx     # Main estimate builder
│   │   └── EstimateImport.tsx      # Excel/Xactimate import
│   │
│   ├── /Labs/              # AI creative tools platform
│   │   ├── Labs.tsx                # Labs main component
│   │   ├── LabsMenu.tsx            # Labs navigation menu
│   │   ├── LogoStudio.tsx
│   │   ├── BusinessCardStudio.tsx
│   │   ├── YardSignStudio.tsx
│   │   ├── BannerStudio.tsx
│   │   ├── FlyerStudio.tsx
│   │   └── SloganStudio.tsx
│   │
│   ├── # Service Forms
│   ├── ClaimSubmission.tsx
│   ├── DenialAppealForm.tsx
│   ├── XactimateEstimateForm.tsx
│   ├── SupplementClaimForm.tsx
│   ├── CommercialBidForm.tsx
│   ├── CustomizedDocumentsForm.tsx
│   │
│   ├── # Auth Components
│   ├── PortalLogin.tsx
│   ├── PartnerRegistration.tsx
│   │
│   ├── # UI Components
│   ├── HolographicCard.tsx
│   ├── LoadingScreen.tsx
│   ├── PageTransition.tsx
│   ├── EnhancedNav.tsx
│   │
│   └── # Visual Effects
│       ├── ParticleField.tsx
│       ├── StarField.tsx
│       ├── StarTrails.tsx
│       ├── FloatingElements.tsx
│       ├── CursorTrail.tsx
│       ├── AmbientAudio.tsx
│       ├── SmoothScroll.tsx
│       ├── ImageHealer.tsx
│       └── MemoryAnimator.tsx
│
├── /services/              # Business logic services
│   ├── geminiService.ts    # Gemini AI integration
│   ├── grokService.ts      # Grok AI integration (planned)
│   ├── documentRequestService.ts  # Document request handling
│   ├── excelService.ts     # Xactimate Excel parsing
│   └── pricingService.ts   # Pricing database operations
│
├── /lib/                   # Shared utilities
│   └── supabase.ts         # Supabase client & helpers
│
├── /database/              # Database schema & docs
│   ├── /schemas/           # SQL migration files (001-012)
│   ├── /docs/              # Database documentation
│   ├── /examples/          # Seed data & sample queries
│   ├── COMPLETE_SCHEMA.sql
│   └── README.md
│
├── /n8n-workflows/         # n8n automation workflows
│   └── document-request-notifications.json
│
├── /.claude/               # Claude Code hooks & settings
│   ├── settings.json       # Hook configuration
│   ├── pre-bash-hook.sh
│   ├── pre-edit-hook.sh
│   ├── pre-write-hook.sh
│   ├── post-commit-hook.sh
│   └── stop-hook-git-check.sh
│
└── docker-compose.n8n.yml  # n8n Docker configuration
```

---

## Application Views & Routing

The app uses a state-based routing system via `AppView` enum:

### Public/Landing Views
| View | Component | Description |
|------|-----------|-------------|
| `LANDING` | App.tsx (default) | Homepage with hero and service cards |
| `SERVICES` | App.tsx | Service selection grid |
| `DENIAL_APPEAL` | DenialAppealForm | Denial appeal service form |
| `XACTIMATE_ESTIMATE` | XactimateEstimateForm | Xactimate estimate form |
| `SUPPLEMENT_CLAIM` | SupplementClaimForm | Supplement claim form |
| `COMMERCIAL_BID` | CommercialBidForm | Commercial bid estimate form |
| `CUSTOMIZED_DOCS` | CustomizedDocumentsForm | Custom document request form |
| `CLAIMS` | ClaimSubmission | Generic claim submission |
| `LABS` | Labs | AI creative tools platform |
| `PORTAL` | PortalLogin | Partner login |
| `REGISTER` | PartnerRegistration | Partner registration |
| `ESTIMATE_BUILDER` | EstimateBuilder | Standalone estimate builder |

### Dashboard Views (Authenticated)
| View | Component | Description |
|------|-----------|-------------|
| `DASHBOARD` | DashboardLayout | Main dashboard shell |
| `DASHBOARD_HOME` | DashboardHome | Dashboard overview |
| `DASHBOARD_CONTACTS` | (Planned) | Contact/customer management |
| `DASHBOARD_JOBS` | JobsList | Jobs list with filters |
| `DASHBOARD_JOB_DETAIL` | JobDetail | Individual job view |
| `DASHBOARD_ESTIMATES` | EstimateBuilder | Estimate builder in dashboard |
| `DASHBOARD_CALENDAR` | (Planned) | Calendar/scheduling |
| `DASHBOARD_INBOX` | (Planned) | Messages/notifications |
| `DASHBOARD_TASKS` | (Planned) | Task management |
| `DASHBOARD_WORKFLOWS` | (Planned) | Workflow automation |
| `DASHBOARD_REPORTS` | (Planned) | Reports & analytics |
| `DASHBOARD_SETTINGS` | DashboardSettings | Settings management |

---

## Key Services & Pricing

| Service | Price | Description |
|---------|-------|-------------|
| Denial Appeal | 10% of Total RCV | Claim investigation & appeal |
| Xactimate Estimate | $150 | Full estimate with specs |
| Supplement Claim | 15% of Supplement | Follow-up & negotiation |
| Commercial Bid | $250 + 3% if contracted | Commercial project estimates |
| Customized Documents | $50 - $100 | Custom contracts & digital forms |

---

## Database Architecture

### Multi-Tenancy Model
- All data is isolated by `organization_id`
- Row Level Security (RLS) enforces access control
- Users can belong to multiple organizations

### Core Tables (12 Schema Files)
1. **001-init.sql**: organizations, users, roles, user_organization_roles
2. **002-contacts.sql**: contacts (customers, leads, vendors)
3. **003-jobs.sql**: jobs (central work entity)
4. **004-claims.sql**: claims, properties, claim_contractors
5. **005-estimates.sql**: estimates, estimate_line_items
6. **006-production.sql**: crews, schedules, production tracking
7. **007-materials.sql**: suppliers, material_orders, inventory
8. **008-finances.sql**: invoices, payments, financial tracking
9. **009-documents.sql**: photos, documents, albums
10. **010-communications.sql**: activity_log, notes, notifications
11. **011-production-pricing.sql**: xactimate_categories, xactimate_line_items, pricing_macros, work_order_pricing, vendor_labor_rates, vendor_material_pricing
12. **012-job-notes.sql**: job_notes, job_note_mentions, job_access, job_team_members

### Key Types (from types.ts)

```typescript
// Job Status Workflow (16 stages)
type JobStatus =
  | 'lead' | 'appointment_set' | 'quoted' | 'negotiating'
  | 'sold' | 'pending_permit' | 'permit_approved' | 'materials_ordered'
  | 'scheduled' | 'in_progress' | 'on_hold' | 'punch_list'
  | 'complete' | 'closed' | 'cancelled' | 'lost';

// Claim Status Workflow (13 stages)
type ClaimStatus =
  | 'open' | 'assigned' | 'assessment_scheduled' | 'assessment_complete'
  | 'estimate_in_progress' | 'estimate_submitted' | 'approved'
  | 'work_in_progress' | 'work_complete' | 'final_inspection'
  | 'closed' | 'cancelled' | 'denied';

// Job Types
type JobType = 'roofing' | 'siding' | 'gutters' | 'windows' | 'doors' |
  'painting' | 'decking' | 'fencing' | 'insulation' | 'ventilation' |
  'general' | 'other';

// Job Categories
type JobCategory = 'residential_retail' | 'residential_insurance' | 'commercial';

// Contact Types
type ContactType = 'lead' | 'prospect' | 'customer' | 'past_customer' | 'vendor' | 'other';

// Note Types (for job communications)
type NoteType = 'general' | 'mention' | 'reply' | 'system' | 'status_change';

// Units of Measure (for pricing)
type UnitOfMeasure = 'SF' | 'SQ' | 'SY' | 'LF' | 'EA' | 'HR' | 'DA' | 'WK' |
  'MO' | 'BDL' | 'ROL' | 'PC' | 'GAL' | 'CF' | 'CY' | 'TON' | 'LS';

// Subscription Tiers
type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

// Property Types
type PropertyType = 'residential' | 'commercial' | 'multi_family' | 'industrial';
```

---

## Service Functions

### Gemini Service (`services/geminiService.ts`)

```typescript
// Claim Analysis
analyzeClaim(text: string, imageBase64?: string): Promise<string>

// Marketing Content
generateMarketingContent(prompt: string, type: 'slogan' | 'mission'): Promise<string>

// Slogan Generation (Grok persona)
generateGrokSlogans(data: SloganFormData): Promise<string>

// Image Editing
editImage(imageBase64: string, prompt: string): Promise<string>

// Professional Graphics (Nano Banana Pro)
generateProGraphics(prompt: string, assetType: string, imageBase64?: string, aspectRatio?: string): Promise<string>

// Video Generation (Veo 3.1)
generateVeoVideo(imageBase64: string, prompt?: string): Promise<string>
```

### Excel Service (`services/excelService.ts`)

```typescript
// Parse Xactimate Excel export
parseXactimateExcel(file: File): Promise<ParsedEstimate>

// Extract line items from Excel
extractLineItems(workbook: XLSX.WorkBook): XactimateLineItem[]

// Validate parsed data
validateEstimateData(data: ParsedEstimate): ValidationResult
```

### Pricing Service (`services/pricingService.ts`)

```typescript
// Xactimate Categories
getXactimateCategories(organizationId: string): Promise<XactimateCategory[]>
createXactimateCategory(category: XactimateCategory): Promise<XactimateCategory>

// Xactimate Line Items
getXactimateLineItems(organizationId: string, categoryId?: string): Promise<XactimateLineItem[]>
upsertXactimateLineItem(item: XactimateLineItem): Promise<XactimateLineItem>

// Pricing Macros
getPricingMacros(organizationId: string): Promise<PricingMacro[]>
createPricingMacro(macro: PricingMacro): Promise<PricingMacro>

// Work Order Pricing
getWorkOrderPricing(organizationId: string): Promise<WorkOrderPricing[]>

// Vendor Rates
getVendorLaborRates(organizationId: string, crewId?: string): Promise<VendorLaborRate[]>
getVendorMaterialPricing(organizationId: string, supplierId?: string): Promise<VendorMaterialPricing[]>
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Environment Variables

Create `.env.local` from `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Google Workspace (optional)
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_CLIENT_SECRET=your-client-secret

# Application
VITE_SITE_URL=https://your-domain.vercel.app
VITE_ENV=development
```

**Important**: Never commit `.env.local` to git.

---

## n8n Email Notifications

### Setup
1. Start n8n: `docker-compose -f docker-compose.n8n.yml up -d`
2. Access at: http://localhost:5678
3. Configure Supabase PostgreSQL credentials
4. Configure SMTP (Gmail with App Password recommended)
5. Import workflow from `n8n-workflows/document-request-notifications.json`

### Queue System
- Notifications queue in `notification_queue` table
- n8n polls every 2 minutes
- Offline resilient - queues accumulate when n8n is down

---

## Code Conventions

### TypeScript
- Use strict typing with interfaces from `types.ts`
- Prefer `const` over `let`
- Use async/await over Promises
- Export types explicitly from types.ts

### React Components
- Functional components with hooks
- Props interfaces defined above component
- Use Tailwind CSS for styling
- Follow glass-morphism design pattern

### Styling Patterns
```css
/* Glass morphism */
.glass-card {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Gradient text */
.gradient-text {
  background: linear-gradient(to right, #06b6d4, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Animation Classes (defined in index.html)
- `animate-fadeIn`, `animate-fadeInScale`
- `animate-float`, `animate-float-slow`
- `animate-gradient-shift`
- `animate-glow`, `animate-pulse-glow`
- `stagger-1` through `stagger-6` for staggered animations
- `hover-lift`, `card-3d`

---

## Git Workflow

### Branch Naming
- Feature branches: `claude/feature-name-sessionId`
- Bug fixes: `fix/bug-description`
- Releases: Main branch for production

### Commit Messages
```
feat: Add new feature
fix: Bug fix
docs: Documentation update
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

---

## Deployment

### Vercel Deployment
```bash
# Deploy to production
vercel --prod

# With token
vercel --token=YOUR_TOKEN --prod
```

### Environment Variables in Vercel
Add all `VITE_*` variables in Vercel Dashboard > Settings > Environment Variables

### Custom Domain Setup
1. Add domain in Vercel Dashboard
2. Configure DNS:
   - A Record: `@` -> `76.76.21.21`
   - CNAME: `www` -> `cname.vercel-dns.com`

---

## Important Notes for AI Assistants

1. **State Management**: Uses React's built-in `useState` - no external state library
2. **Routing**: Custom state-based routing via `AppView` enum, not React Router
3. **Forms**: Direct state management, no form libraries
4. **API Calls**: Use functions from `/lib/supabase.ts` and `/services/`
5. **File Uploads**: Use Supabase Storage via helper functions
6. **Animations**: CSS animations preferred, Framer Motion for complex sequences
7. **Responsive Design**: Mobile-first with Tailwind breakpoints (sm, md, lg, xl)
8. **Backend**: Currently Vite SPA - planned migration to Next.js 14+

### When Making Changes
- Always check `types.ts` for existing type definitions
- Use existing UI patterns from `HolographicCard.tsx` and service forms
- Follow glass-morphism design language
- Test responsive behavior at mobile (375px) and desktop (1920px)
- Preserve existing animation classes
- Dashboard views use a different layout (no background effects)

### Dashboard vs Landing Page
- **Landing pages**: Full visual effects (particles, cursor trail, floating elements)
- **Dashboard views**: Clean, functional UI without effects for performance
- Dashboard detection: `view.toString().startsWith('DASHBOARD')`

### Current Limitations (Frontend Only)
- Some dashboard views are planned but not implemented (Calendar, Tasks, etc.)
- AI generation in Labs needs API keys configured
- User authentication is UI-ready but needs full Supabase Auth setup
- Payment processing planned but not implemented

---

## File Quick Reference

| Task | File(s) |
|------|---------|
| Add new view | `App.tsx`, `types.ts` (AppView enum) |
| Add service form | `/components/`, add to App.tsx switch |
| Database types | `types.ts` |
| Supabase queries | `/lib/supabase.ts` |
| AI features | `/services/geminiService.ts` |
| Excel/Xactimate parsing | `/services/excelService.ts` |
| Pricing operations | `/services/pricingService.ts` |
| Styling | `index.html` (CSS), component-level Tailwind |
| Environment vars | `.env.local`, `.env.example` |
| Database schema | `/database/schemas/` |
| Dashboard components | `/components/Dashboard/` |
| Settings/Pricing UI | `/components/Dashboard/Settings/` |

---

## Recent Changes (as of 2025-11-27)

### New Features
- **Dashboard System**: Full CRM dashboard with jobs, settings, and team features
- **Job Notes & Communications**: Threaded notes with @mentions and replies
- **Estimate Builder**: Import Xactimate Excel exports, build estimates visually
- **Production Pricing**: Xactimate line items, pricing macros, vendor management
- **Excel Service**: Parse and import Xactimate spreadsheet exports

### New Schema Files
- `011-production-pricing.sql`: Xactimate categories, line items, macros, work orders
- `012-job-notes.sql`: Job notes, mentions, access control, team members

### New Dependencies
- `xlsx`: Excel file parsing for Xactimate imports

---

*Last Updated: 2025-11-27*
*Database Version: 1.1.0*
*Application Version: 0.1.0 (Phase 2 - Dashboard & CRM)*
