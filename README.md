# ESTIMATE RELIANCE
## Professional Insurance Restoration Platform

<div align="center">

**Live Production Site:** [https://estimate-reliance-o85w7ds99-bryants-projects-ec7eade0.vercel.app](https://estimate-reliance-o85w7ds99-bryants-projects-ec7eade0.vercel.app)

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19.2.0-blue?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Current Status](#-current-status)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Premium UI Enhancements](#-premium-ui-enhancements)
- [Future Development](#-future-development)
- [PRD Reference](#-prd-reference)
- [Contributing](#-contributing)

---

## 🎯 Overview

Estimate Reliance is a comprehensive web platform serving as a one-stop solution for contractors and new business owners in the insurance restoration industry. The platform combines professional estimate and supplement services with AI-powered business development tools.

### Core Value Propositions

- **For Contractors**: Streamlined claim processing with real-time job tracking and professional supplement services
- **For New Business Owners**: Complete suite of AI-powered tools for marketing assets and legal document creation
- **For Estimate Reliance**: Scalable service delivery platform with recurring revenue model

---

## ✅ Current Status

### **Phase 1: COMPLETE - Premium UI/UX** ✨

**Frontend Implementation:**
- ✅ Modern, responsive landing page with premium animations
- ✅ Guest claim submission form (UI complete)
- ✅ Labs platform with 6 creative tools (UI complete)
- ✅ Portal login interface (UI complete)
- ✅ Advanced CSS animation library (30+ animations)
- ✅ Glass morphism effects
- ✅ 3D card tilt interactions
- ✅ Staggered entrance animations
- ✅ Gradient mesh backgrounds
- ✅ Deployed to Vercel (Production)

**What's Working:**
- ✅ Full responsive design (mobile/tablet/desktop)
- ✅ Premium visual effects and animations
- ✅ Navigation between all pages
- ✅ Form UI (no backend submission yet)
- ✅ HTTPS enabled
- ✅ Global CDN delivery

**What Needs Backend:**
- ⏳ Form submissions and data persistence
- ⏳ AI generation in Labs tools
- ⏳ User authentication
- ⏳ Job tracking system
- ⏳ Payment processing
- ⏳ Email notifications
- ⏳ File storage

---

## 🚀 Features

### **Landing Page**
- Premium animated hero section with gradient text
- 4 service cards with 3D tilt effects
- Animated star field background
- Glass morphism design elements
- Responsive mobile-first layout

### **Labs Platform** (6 Creative Tools)
1. **Logo Creation** - AI-powered logo generation
2. **Business Cards** - Dual-sided card designer
3. **Yard Signs** - High-visibility sign creator
4. **Banners** - Web and print banner studio
5. **Flyers** - Promotional flyer designer
6. **Slogan Creation** - AI-powered slogan generator

### **Claim Submission**
- Contact information capture
- Property details form
- File upload (images, PDFs)
- AI-powered analysis (Gemini integration ready)

### **Partner Portal**
- Login interface (UI ready for backend)
- Dashboard placeholder
- Job management interface planned

---

## 💻 Tech Stack

### **Frontend**
- **Framework**: React 19.2.0
- **Build Tool**: Vite 6.2.0
- **Language**: TypeScript 5.8.2
- **Styling**: Tailwind CSS (via CDN)
- **Icons**: Lucide React 0.554.0

### **AI Integration (Ready)**
- **Gemini AI**: @google/genai 1.30.0 (text & image generation)
- **Grok API**: xAI (API key ready, integration pending)

### **Deployment**
- **Platform**: Vercel
- **Domain**: estimatereliance.com (DNS pending)
- **CDN**: Global edge network
- **SSL**: Automatic HTTPS

### **Planned Backend Stack**
- **Backend**: Next.js 14+ with API routes (recommended)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk or Supabase Auth
- **File Storage**: Cloudflare R2 or Supabase Storage
- **Email**: Resend.com
- **Payments**: Stripe
- **Hosting**: Vercel (full-stack)

---

## 📁 Project Structure

```
estimate-reliance/
├── components/
│   ├── Labs/
│   │   ├── LabsMenu.tsx           # Labs tool selection menu
│   │   ├── LogoStudio.tsx         # Logo generation tool
│   │   ├── BusinessCardStudio.tsx # Business card designer
│   │   ├── YardSignStudio.tsx     # Yard sign creator
│   │   ├── BannerStudio.tsx       # Banner designer
│   │   ├── FlyerStudio.tsx        # Flyer creator
│   │   └── SloganStudio.tsx       # Slogan generator
│   ├── ClaimSubmission.tsx        # Guest claim form
│   ├── PortalLogin.tsx            # Partner portal login
│   ├── StarField.tsx              # Animated background
│   ├── ImageHealer.tsx            # Image processing utility
│   └── MemoryAnimator.tsx         # Animation utility
├── services/
│   └── geminiService.ts           # Gemini AI integration
├── App.tsx                        # Main app component
├── index.tsx                      # App entry point
├── index.html                     # HTML template with premium CSS
├── types.ts                       # TypeScript type definitions
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite configuration
├── .env.local                     # Environment variables
└── README.md                      # This file
```

---

## 🛠️ Getting Started

### **Prerequisites**
- Node.js 18+ installed
- npm or yarn package manager

### **Installation**

1. **Clone the repository**
   ```bash
   cd "/home/bquio/ESTIMATE RELIANCE DEV/estimate-reliance"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create/edit `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GROK_API_KEY=your_grok_api_key_here
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:5173
   ```

### **Build for Production**
```bash
npm run build
```

Output will be in the `dist/` directory.

---

## 🌐 Deployment

### **Current Production Deployment**

**Live URL**: https://estimate-reliance-o85w7ds99-bryants-projects-ec7eade0.vercel.app

**Vercel Dashboard**: https://vercel.com/bryants-projects-ec7eade0/estimate-reliance

### **Deploy Updates**

```bash
# With Vercel CLI
vercel --prod

# With token
vercel --token=YOUR_VERCEL_TOKEN --prod
```

### **Connect Custom Domain**

**Target Domain**: `estimatereliance.com` (owned via Squarespace)

**Steps:**
1. Go to Vercel Dashboard → Settings → Domains
2. Add `estimatereliance.com` and `www.estimatereliance.com`
3. Update DNS in Squarespace:
   - **A Record**: `@` → `76.76.21.21`
   - **CNAME**: `www` → `cname.vercel-dns.com`
4. Wait 24-48 hours for DNS propagation

---

## 🔐 Environment Variables

### **Required for Labs Tools**

```env
# Gemini AI (Google)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Grok API (xAI)
VITE_GROK_API_KEY=your_grok_api_key_here
```

**Note**: Add these in Vercel Dashboard → Settings → Environment Variables for production.

---

## ✨ Premium UI Enhancements

### **Advanced Animation Library**

**30+ Custom CSS Animations:**
- Float & slow float animations
- Gradient shift & rotation
- Glow & pulse effects
- 3D transform & tilt
- Fade, slide, scale entries
- Shimmer & shine effects
- Particle animations
- Border glow effects

### **Visual Effects**

1. **Glass Morphism**
   - 3 variants (standard, strong, card)
   - Backdrop blur & saturation
   - Layered depth effects

2. **3D Card Interactions**
   - Perspective transforms
   - Tilt on hover
   - Lift with enhanced shadows

3. **Animated Backgrounds**
   - Gradient mesh (4-color radial gradients)
   - Noise texture overlays
   - Star field animation

4. **Micro-interactions**
   - Button shimmer on hover
   - Icon scale & rotate
   - Border glow pulses
   - Text color transitions
   - Staggered entrance animations

### **Performance Optimizations**

- CSS-only animations (GPU accelerated)
- Cubic bezier easing functions
- Optimized transform properties
- Lazy loading for images
- Code splitting with Vite

---

## 📅 Future Development

### **Phase 2: Backend Infrastructure** (Priority)

#### **2.1 Database Setup** (Week 1-2)
- [ ] Set up Supabase project
- [ ] Design database schema:
  - [ ] `users` table (auth, profile)
  - [ ] `claims` table (job submissions)
  - [ ] `files` table (document storage)
  - [ ] `subscriptions` table (payment plans)
  - [ ] `credits` table (Labs usage)
  - [ ] `notifications` table (alerts)
- [ ] Set up Row Level Security (RLS)
- [ ] Create database migrations

#### **2.2 Authentication System** (Week 2-3)
- [ ] Implement Clerk or Supabase Auth
- [ ] Email/password registration
- [ ] Email verification flow
- [ ] Password reset functionality
- [ ] Social login (Google, Microsoft)
- [ ] Protected routes
- [ ] Session management
- [ ] User profile management

#### **2.3 API Development** (Week 3-5)
- [ ] Convert to Next.js 14+ (App Router)
- [ ] Create API routes:
  - [ ] `/api/claims` - Submit and track jobs
  - [ ] `/api/labs` - AI generation endpoints
  - [ ] `/api/auth` - Authentication endpoints
  - [ ] `/api/payments` - Stripe integration
  - [ ] `/api/files` - Upload/download
  - [ ] `/api/users` - Profile management
- [ ] Implement error handling
- [ ] Add request validation (Zod)
- [ ] Rate limiting
- [ ] API documentation

#### **2.4 File Storage** (Week 4)
- [ ] Set up Cloudflare R2 or Supabase Storage
- [ ] Implement file upload service
- [ ] Image optimization pipeline
- [ ] File type validation
- [ ] Virus scanning (ClamAV)
- [ ] Secure signed URLs
- [ ] Storage quotas per tier

#### **2.5 Email System** (Week 4)
- [ ] Integrate Resend.com
- [ ] Create email templates:
  - [ ] Welcome email
  - [ ] Email verification
  - [ ] Password reset
  - [ ] Claim submission confirmation
  - [ ] Status update notifications
  - [ ] Completed job delivery
- [ ] Email queue system
- [ ] Unsubscribe management

#### **2.6 Payment Integration** (Week 5-6)
- [ ] Stripe account setup
- [ ] Subscription plans:
  - [ ] Guest (free, limited)
  - [ ] Basic ($99/month)
  - [ ] Professional ($199/month)
- [ ] Payment flow implementation
- [ ] Stripe Customer Portal
- [ ] Webhook handling
- [ ] Invoice generation
- [ ] Payment failure handling
- [ ] Subscription upgrades/downgrades

### **Phase 3: Core Platform Features** (Week 7-10)

#### **3.1 Contractor Portal Dashboard**
- [ ] Job list view with filters
- [ ] Job detail pages
- [ ] Status tracking timeline
- [ ] Document downloads
- [ ] Messaging system
- [ ] Analytics dashboard
- [ ] Recent activity feed
- [ ] Quick actions menu

#### **3.2 Admin Panel**
- [ ] Admin authentication
- [ ] Claim management interface
- [ ] User management
- [ ] Status update tools
- [ ] File upload for completed work
- [ ] Internal notes system
- [ ] Analytics and reporting
- [ ] Support ticket system

#### **3.3 Guest Claim Tracking**
- [ ] Unique tracking ID generation
- [ ] Public tracking page (no auth)
- [ ] Real-time status updates
- [ ] Email notifications
- [ ] Document viewing
- [ ] Message contractor feature

#### **3.4 Labs AI Integration**
- [ ] Integrate Gemini Pro for image generation
- [ ] Integrate Grok API for text generation
- [ ] Credit system implementation
- [ ] Credit packages
- [ ] Usage tracking
- [ ] Generation history
- [ ] Asset library per user
- [ ] Download options (PNG, SVG, PDF)

### **Phase 4: Document Templates** (Week 11-12)

#### **4.1 Legal Documents**
- [ ] Contingency Agreement Generator
  - [ ] Georgia-specific template
  - [ ] Tennessee-specific template
- [ ] Build Contract Agreement
  - [ ] State variations
  - [ ] Conditional sections
- [ ] Certificate of Completion
- [ ] Work Authorization Form
- [ ] Change Order Form
- [ ] Lien Waiver templates

#### **4.2 PDF Generation**
- [ ] Implement react-pdf or pdfkit
- [ ] Professional formatting
- [ ] Fillable PDF fields
- [ ] Digital signature support (Phase 5)
- [ ] Template customization
- [ ] Company branding integration

### **Phase 5: Advanced Features** (Week 13-16)

#### **5.1 Communication**
- [ ] In-platform messaging
- [ ] File attachments in messages
- [ ] Read/unread indicators
- [ ] SMS notifications (Twilio)
- [ ] Push notifications
- [ ] Notification preferences

#### **5.2 Collaboration**
- [ ] Multi-user accounts
- [ ] Role-based permissions
- [ ] Team member invites
- [ ] Shared workspaces
- [ ] Internal comments

#### **5.3 Analytics & Reporting**
- [ ] Job completion analytics
- [ ] Revenue tracking
- [ ] Labs usage statistics
- [ ] User engagement metrics
- [ ] Custom report builder
- [ ] Export to CSV/PDF

#### **5.4 Integrations**
- [ ] Xactimate API integration
- [ ] QuickBooks integration
- [ ] Email service integration
- [ ] Calendar integration
- [ ] Zapier webhooks

### **Phase 6: Mobile & Polish** (Week 17-20)

#### **6.1 Mobile Optimization**
- [ ] Progressive Web App (PWA)
- [ ] Mobile document scanning
- [ ] Offline mode support
- [ ] Push notifications
- [ ] Native iOS app (future)
- [ ] Native Android app (future)

#### **6.2 Legal & Compliance**
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Cookie consent banner
- [ ] GDPR compliance
- [ ] CCPA compliance
- [ ] Data retention policies
- [ ] Legal disclaimers for AI content

#### **6.3 SEO & Marketing**
- [ ] Meta tags optimization
- [ ] Open Graph tags
- [ ] Sitemap generation
- [ ] Schema markup
- [ ] Blog setup (optional)
- [ ] FAQ page
- [ ] About page
- [ ] Services page

#### **6.4 Testing & QA**
- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Performance testing
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing
- [ ] Load testing

---

## 📊 PRD Reference

**Full Product Requirements Document**: See `/estimate_reliance_prd.md` for comprehensive feature specifications.

### **Key Metrics & Goals** (From PRD)

**Launch Success (First 3 Months):**
- 100 registered users
- 50 paying subscribers
- 10 guest-to-subscriber conversions
- 90% platform uptime

**Growth Phase (Months 4-12):**
- 500 registered users
- 200 paying subscribers
- 20% monthly growth rate
- Customer satisfaction: 4.5+/5

**Financial Targets (Year 1):**
- $50K MRR from subscriptions
- $100K from service revenue
- Customer Acquisition Cost < $200
- Lifetime Value > $1,500
- Gross margin: 70%+

---

## 🤝 Contributing

### **Development Workflow**

1. Create feature branch
2. Implement changes
3. Test locally
4. Build production bundle
5. Deploy to Vercel
6. Test live deployment

### **Code Style**

- TypeScript for type safety
- React functional components with hooks
- Tailwind CSS for styling
- ESLint for code quality
- Prettier for formatting (recommended)

### **Commit Guidelines**

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

## 📞 Support & Contact

**Project Owner**: Bryant
**Company**: Estimate Reliance LLC
**Domain**: www.estimatereliance.com (pending DNS)
**Email**: bryant@estimatereliance.com

---

## 📄 License

Proprietary - Estimate Reliance LLC © 2025

---

## 🎉 Acknowledgments

- **UI/UX Design**: Premium animation library and effects
- **AI Integration**: Gemini Pro (Google), Grok (xAI)
- **Deployment**: Vercel platform
- **Icons**: Lucide React

---

<div align="center">

**Built with ❤️ by Estimate Reliance**

[Live Site](https://estimate-reliance-o85w7ds99-bryants-projects-ec7eade0.vercel.app) • [Documentation](./README.md) • [PRD](./estimate_reliance_prd.md)

</div>
