# CLAUDE.md - AI Assistant Guide for Estimate Reliance

## Project Overview

**Estimate Reliance** is a comprehensive web platform for the insurance restoration industry, providing professional estimate and supplement services with AI-powered business development tools.

**Live Production**: Deployed on Vercel
**Repository**: Landing-Page
**Project Codename**: estimate-reliance

---

## ⚠️ CRITICAL RULES FOR AI CODERS ⚠️

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
**Hook Scripts**: `pre-bash-hook.sh`, `pre-edit-hook.sh`, `pre-write-hook.sh`

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

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **ORM/Client**: @supabase/supabase-js 2.39.0

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
│   ├── /Labs/              # Labs platform tools
│   │   ├── LabsMenu.tsx
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
│   └── documentRequestService.ts  # Document request handling
│
├── /lib/                   # Shared utilities
│   └── supabase.ts         # Supabase client & helpers
│
├── /database/              # Database schema & docs
│   ├── /schemas/           # SQL migration files (001-010)
│   ├── /docs/              # Database documentation
│   ├── /examples/          # Seed data & sample queries
│   ├── COMPLETE_SCHEMA.sql
│   └── README.md
│
├── /n8n-workflows/         # n8n automation workflows
│   └── document-request-notifications.json
│
└── docker-compose.n8n.yml  # n8n Docker configuration
```

---

## Application Views & Routing

The app uses a state-based routing system via `AppView` enum:

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

### Core Tables
1. **001-init.sql**: organizations, users, roles, user_organization_roles
2. **002-claims.sql**: claims, properties, claim_contractors
3. **003-estimates.sql**: estimates, estimate_line_items, materials, labor
4. **004-photos.sql**: photos, photo_albums, documents
5. **005-invoices.sql**: invoices, invoice_line_items, payments
6. **006-insurers.sql**: insurance_companies, insurance_adjusters
7. **007-status-history.sql**: status_history, activity_log, notes, notifications
8. **008-rls-policies.sql**: Row Level Security policies
9. **009-document-requests.sql**: Document request submissions
10. **010-notification-queue.sql**: Email notification queue

### Key Types (from types.ts)

```typescript
// Claim Status Workflow (14 stages)
type ClaimStatus = 'open' | 'assigned' | 'assessment_scheduled' |
  'assessment_complete' | 'estimate_in_progress' | 'estimate_submitted' |
  'approved' | 'work_in_progress' | 'work_complete' | 'final_inspection' |
  'closed' | 'cancelled' | 'denied';

// Subscription Tiers
type SubscriptionTier = 'free' | 'basic' | 'professional' | 'enterprise';

// Property Types
type PropertyType = 'residential' | 'commercial' | 'multi_family' | 'industrial';
```

---

## AI Service Integration

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

### Current Limitations (Frontend Only)
- Form submissions require backend integration
- AI generation in Labs needs API keys configured
- User authentication is UI-ready but needs Supabase Auth setup
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
| Styling | `index.html` (CSS), component-level Tailwind |
| Environment vars | `.env.local`, `.env.example` |
| Database schema | `/database/schemas/` |

---

*Last Updated: 2025-11-26*
*Database Version: 1.0.0*
*Application Version: 0.0.0 (Phase 1 Complete)*
