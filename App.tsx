import React, { useState } from 'react';
import ParticleField from './components/ParticleField';
import SmoothScroll from './components/SmoothScroll';
import PageTransition from './components/PageTransition';
import CursorTrail from './components/CursorTrail';
import AmbientAudio from './components/AmbientAudio';
import FloatingElements from './components/FloatingElements';
import LoadingScreen from './components/LoadingScreen';
import HolographicCard from './components/HolographicCard';
import ClaimSubmission from './components/ClaimSubmission';
import Labs from './components/Labs';
import PortalLogin from './components/PortalLogin';
import PartnerRegistration from './components/PartnerRegistration';
import DenialAppealForm from './components/DenialAppealForm';
import XactimateEstimateForm from './components/XactimateEstimateForm';
import SupplementClaimForm from './components/SupplementClaimForm';
import CommercialBidForm from './components/CommercialBidForm';
import CustomizedDocumentsForm from './components/CustomizedDocumentsForm';
// Dashboard Components
import DashboardLayout from './components/Dashboard/DashboardLayout';
import DashboardHome from './components/Dashboard/DashboardHome';
import JobsList from './components/Dashboard/JobsList';
import JobDetail from './components/Dashboard/JobDetail';
import DashboardSettings from './components/Dashboard/Settings/DashboardSettings';
// Estimate Builder
import EstimateBuilder from './components/EstimateBuilder';
import { AppView } from './types';
import { FileText, Microscope, ShieldCheck, ArrowLeft, UserPlus, LogIn, ClipboardList, FileCheck, Calculator, Building2, FileEdit, DollarSign } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeJobTab, setActiveJobTab] = useState<string>('overview');

  // Check if current view is a dashboard view
  const isDashboardView = view.toString().startsWith('DASHBOARD');

  // Handle job selection from jobs list
  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveJobTab('overview'); // Reset to overview when opening a new job
    setView(AppView.DASHBOARD_JOB_DETAIL);
  };

  // Handle navigation within dashboard
  const handleDashboardNavigate = (newView: AppView) => {
    if (newView !== AppView.DASHBOARD_JOB_DETAIL) {
      setSelectedJobId(null);
    }
    setView(newView);
  };

  // Logo Component (removed text, just click area to return home)
  const Logo = () => (
    <div className="flex items-center cursor-pointer select-none" onClick={() => setView(AppView.LANDING)}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
        <span className="text-white font-bold text-sm">ER</span>
      </div>
    </div>
  );

  // Landing Nav (with Login & Register)
  const renderLandingNav = () => (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Logo />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView(AppView.REGISTER)}
            className="px-4 py-2 text-sm text-cyan-300 hover:text-cyan-200 border border-cyan-700 hover:border-cyan-500 rounded-lg transition-all"
          >
            Register
          </button>
          <button
            onClick={() => setView(AppView.PORTAL)}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all"
          >
            Partner Login
          </button>
        </div>
      </div>
    </nav>
  );

  // Internal Nav (with Back button)
  const renderInternalNav = () => (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/50 border-b border-white/10 px-6 py-4 flex justify-between items-center">
      <Logo />
      <button 
        onClick={() => setView(AppView.LANDING)}
        className="flex items-center px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm text-slate-300"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </button>
    </nav>
  );

  const renderContent = () => {
    switch (view) {
      case AppView.SERVICES:
        return (
          <div className="min-h-screen px-4 py-16">
            {/* Header */}
            <div className="max-w-7xl mx-auto text-center mb-12 animate-fadeIn">
              <h2 className="text-4xl md:text-5xl font-thin tracking-widest text-white mb-4">
                SELECT A SERVICE
              </h2>
              <div className="h-0.5 w-48 mx-auto bg-gradient-to-r from-transparent via-indigo-500 to-transparent mb-6"></div>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Choose from our professional services. Click a service to view details and submit your inquiry.
              </p>
            </div>

            {/* Service Cards Grid */}
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* Service 1: Denial Appeal */}
              <button
                onClick={() => setView(AppView.DENIAL_APPEAL)}
                className="card-3d hover-lift group relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-rose-400/60 glass-card p-6 text-left animate-fadeIn stagger-1"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                  <div className="w-48 h-48 bg-rose-500/15 rounded-full blur-3xl group-hover:bg-rose-500/25 transition-all duration-500" />
                </div>
                <div className="relative z-20">
                  <div className="w-12 h-12 mb-4 rounded-full bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-all duration-300 border border-rose-500/20 group-hover:border-rose-500/40">
                    <FileCheck className="w-6 h-6 text-rose-300 group-hover:text-rose-200 transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide group-hover:text-rose-100 transition-colors">
                    Denial Appeal
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 group-hover:text-slate-300 transition-colors leading-relaxed">
                    Investigate claims, fight denials, and acquire missing information.
                  </p>
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <span className="text-2xl font-bold text-emerald-400">10% of Total RCV</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1.5">
                    <p className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>Comprehensive claim investigation & analysis</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>Professional appeal documentation</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>Insurance company negotiation support</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>7-10 business day turnaround</span>
                    </p>
                  </div>
                </div>
              </button>

              {/* Service 2: Xactimate Estimate (Non-claim) */}
              <button
                onClick={() => setView(AppView.XACTIMATE_ESTIMATE)}
                className="card-3d hover-lift group relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-blue-400/60 glass-card p-6 text-left animate-fadeIn stagger-2"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                  <div className="w-48 h-48 bg-blue-500/15 rounded-full blur-3xl group-hover:bg-blue-500/25 transition-all duration-500" />
                </div>
                <div className="relative z-20">
                  <div className="w-12 h-12 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all duration-300 border border-blue-500/20 group-hover:border-blue-500/40">
                    <Calculator className="w-6 h-6 text-blue-300 group-hover:text-blue-200 transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide group-hover:text-blue-100 transition-colors">
                    Xactimate Estimate
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 group-hover:text-slate-300 transition-colors leading-relaxed">
                    Full estimate with supplement line items and building specifications.
                  </p>
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <span className="text-2xl font-bold text-emerald-400">$150</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1.5">
                    <p className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Complete Xactimate estimate with line items</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Building code & manufacturer specifications</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Supplement items highlighted with notes</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>3-5 business day delivery</span>
                    </p>
                  </div>
                </div>
              </button>

              {/* Service 3: Xactimate Estimating (Supplement) */}
              <button
                onClick={() => setView(AppView.SUPPLEMENT_CLAIM)}
                className="card-3d hover-lift group relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-purple-400/60 glass-card p-6 text-left animate-fadeIn stagger-3"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                  <div className="w-48 h-48 bg-purple-500/15 rounded-full blur-3xl group-hover:bg-purple-500/25 transition-all duration-500" />
                </div>
                <div className="relative z-20">
                  <div className="w-12 h-12 mb-4 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all duration-300 border border-purple-500/20 group-hover:border-purple-500/40">
                    <FileText className="w-6 h-6 text-purple-300 group-hover:text-purple-200 transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide group-hover:text-purple-100 transition-colors">
                    Supplement Claim
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 group-hover:text-slate-300 transition-colors leading-relaxed">
                    Follow-up and negotiation with COC and invoice support.
                  </p>
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <span className="text-2xl font-bold text-emerald-400">15% of Supplement</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1.5">
                    <p className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Full supplement claim preparation & review</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Ongoing insurance negotiation support</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>COC (Certificate of Completion) assistance</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Invoice generated upon carrier payment</span>
                    </p>
                  </div>
                </div>
              </button>

              {/* Service 4: Commercial Bid Estimate */}
              <button
                onClick={() => setView(AppView.COMMERCIAL_BID)}
                className="card-3d hover-lift group relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-amber-400/60 glass-card p-6 text-left animate-fadeIn stagger-4"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                  <div className="w-48 h-48 bg-amber-500/15 rounded-full blur-3xl group-hover:bg-amber-500/25 transition-all duration-500" />
                </div>
                <div className="relative z-20">
                  <div className="w-12 h-12 mb-4 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all duration-300 border border-amber-500/20 group-hover:border-amber-500/40">
                    <Building2 className="w-6 h-6 text-amber-300 group-hover:text-amber-200 transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide group-hover:text-amber-100 transition-colors">
                    Commercial Bid
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 group-hover:text-slate-300 transition-colors leading-relaxed">
                    Professional estimates for new development projects.
                  </p>
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <span className="text-2xl font-bold text-emerald-400">$250</span>
                    <span className="text-sm text-emerald-300/70 ml-2">+ 3% if contracted</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1.5">
                    <p className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Professional bid with detailed Take Offs</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Material & labor cost breakdowns</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>$250 credit applied if job awarded</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>5-7 business day delivery</span>
                    </p>
                  </div>
                </div>
              </button>

              {/* Service 5: Customized Documents */}
              <button
                onClick={() => setView(AppView.CUSTOMIZED_DOCS)}
                className="card-3d hover-lift group relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-cyan-400/60 glass-card p-6 text-left animate-fadeIn stagger-5"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                  <div className="w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl group-hover:bg-cyan-500/25 transition-all duration-500" />
                </div>
                <div className="relative z-20">
                  <div className="w-12 h-12 mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all duration-300 border border-cyan-500/20 group-hover:border-cyan-500/40">
                    <FileEdit className="w-6 h-6 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide group-hover:text-cyan-100 transition-colors">
                    Customized Documents
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 group-hover:text-slate-300 transition-colors leading-relaxed">
                    Custom agreements and documents tailored to your company.
                  </p>
                  <div className="mb-3 pb-3 border-b border-white/10">
                    <span className="text-2xl font-bold text-emerald-400">$50 - $100</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1.5">
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Custom contracts & agreements ($50)</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Digital forms with calculators ($100)</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>Company branding & customization included</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>2-3 business day delivery, 1 free revision</span>
                    </p>
                  </div>
                </div>
              </button>

            </div>
          </div>
        );
      case AppView.DENIAL_APPEAL:
        return <DenialAppealForm onNavigate={setView} />;
      case AppView.XACTIMATE_ESTIMATE:
        return <XactimateEstimateForm onNavigate={setView} />;
      case AppView.SUPPLEMENT_CLAIM:
        return <SupplementClaimForm onNavigate={setView} />;
      case AppView.COMMERCIAL_BID:
        return <CommercialBidForm onNavigate={setView} />;
      case AppView.CUSTOMIZED_DOCS:
        return <CustomizedDocumentsForm onNavigate={setView} />;
      case AppView.CLAIMS:
        return <ClaimSubmission onNavigate={setView} />;
      case AppView.LABS:
        return <Labs />;
      case AppView.PORTAL:
        return <PortalLogin onNavigate={setView} />;
      case AppView.REGISTER:
        return <PartnerRegistration />;
      case AppView.ESTIMATE_BUILDER:
        return <EstimateBuilder onBack={() => setView(AppView.LANDING)} />;
      // Dashboard Views - No popups, full page views
      case AppView.DASHBOARD:
      case AppView.DASHBOARD_HOME:
      case AppView.DASHBOARD_CONTACTS:
      case AppView.DASHBOARD_JOBS:
      case AppView.DASHBOARD_JOB_DETAIL:
      case AppView.DASHBOARD_ESTIMATES:
      case AppView.DASHBOARD_CALENDAR:
      case AppView.DASHBOARD_INBOX:
      case AppView.DASHBOARD_TASKS:
      case AppView.DASHBOARD_WORKFLOWS:
      case AppView.DASHBOARD_REPORTS:
      case AppView.DASHBOARD_SETTINGS:
        return null; // Handled separately with DashboardLayout
      default:
        return (
          <>
            {/* Hero Section - Future Earth Space Theme - Compact on Mobile */}
            <div className="min-h-[40vh] md:min-h-[50vh] flex flex-col items-center justify-center px-4 py-8 md:py-16 relative overflow-hidden">
              {/* Cosmic Background Elements */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Earth Glow - smaller on mobile */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-gradient-radial from-blue-500/20 via-cyan-500/10 to-transparent rounded-full blur-2xl md:blur-3xl"></div>

                {/* Nebula Clouds - smaller on mobile */}
                <div className="absolute top-10 md:top-20 right-5 md:right-10 w-48 md:w-96 h-48 md:h-96 bg-gradient-radial from-purple-500/10 via-pink-500/5 to-transparent rounded-full blur-2xl md:blur-3xl animate-pulse"></div>
                <div className="absolute top-20 md:top-40 left-5 md:left-20 w-40 md:w-80 h-40 md:h-80 bg-gradient-radial from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-2xl md:blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

                {/* Orbital Rings - smaller on mobile */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] border border-cyan-500/10 rounded-full animate-spin" style={{animationDuration: '60s'}}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] md:w-[700px] h-[350px] md:h-[700px] border border-blue-500/5 rounded-full animate-spin" style={{animationDuration: '90s', animationDirection: 'reverse'}}></div>
              </div>

              <div className="text-center max-w-6xl mx-auto relative z-10">
                {/* Main Title with Holographic Effect */}
                <div className="flex flex-col items-center mb-6 md:mb-12 relative">
                  {/* Enhanced Cosmic Glow - smaller on mobile */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-20 md:h-40 bg-gradient-radial from-cyan-500/20 via-blue-500/10 to-transparent blur-2xl md:blur-3xl -z-10"></div>

                  {/* Geometric Accents - hidden on mobile */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-1 h-16 bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent hidden md:block"></div>

                  <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-thin tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-center bg-gradient-to-r from-cyan-200 via-blue-100 to-purple-200 bg-clip-text text-transparent relative z-20 animate-fadeInScale mb-3 md:mb-4">
                    ESTIMATE RELIANCE
                  </h1>

                  {/* Futuristic Swoosh Line with Glow */}
                  <div className="relative">
                    <div className="h-0.5 w-48 sm:w-64 md:w-96 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_20px_rgba(34,211,238,0.6)] opacity-90 relative z-20"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse"></div>
                  </div>
                </div>

                {/* Tagline with Futuristic Styling - More compact on mobile */}
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-cyan-100/80 font-light tracking-wide md:tracking-wider mb-4 md:mb-6 max-w-4xl mx-auto leading-relaxed animate-fadeIn stagger-2 px-2">
                  Professional insurance restoration estimates, supplements, and creative marketing solutions
                </p>
                <p className="text-xs sm:text-sm md:text-base text-blue-300/60 font-light tracking-widest uppercase animate-fadeIn stagger-3 flex items-center justify-center gap-2">
                  <span className="w-6 md:w-8 h-px bg-gradient-to-r from-transparent to-blue-400/50"></span>
                  Powered by AI
                  <span className="w-6 md:w-8 h-px bg-gradient-to-l from-transparent to-blue-400/50"></span>
                </p>
              </div>
            </div>

            {/* Main Service Cards - 2 Cards with Enhanced Futuristic Theme */}
            <div className="px-4 py-8 md:py-16 max-w-7xl mx-auto relative">

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-8 max-w-5xl mx-auto">

                {/* Card 1: Select Service */}
                <HolographicCard
                  onClick={() => setView(AppView.SERVICES)}
                  glowColor="cyan"
                  delay={0.1}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                    <div className="w-32 md:w-64 h-32 md:h-64 bg-cyan-500/15 rounded-full blur-2xl md:blur-3xl group-hover:bg-cyan-500/30 transition-all duration-500" />
                  </div>
                  <div className="relative z-20 h-48 sm:h-56 md:h-72 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mb-2 md:mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/25 transition-all duration-300 border border-cyan-500/20 group-hover:border-cyan-500/40 group-hover:scale-110">
                      <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-cyan-300 group-hover:text-cyan-200 transition-colors" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-xl lg:text-2xl font-medium text-white mb-1 md:mb-2 tracking-wide group-hover:text-cyan-100 transition-colors">SELECT SERVICE</h3>
                    <p className="text-[10px] sm:text-xs md:text-sm text-cyan-200/70 max-w-sm group-hover:text-cyan-100/90 transition-colors leading-tight md:leading-relaxed">
                      Browse our professional services including denial appeals, estimates, and custom documents.
                    </p>
                  </div>
                </HolographicCard>

                {/* Card 2: Explore Labs (Login Required) */}
                <HolographicCard
                  onClick={() => setView(AppView.LABS)}
                  glowColor="purple"
                  delay={0.2}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                    <div className="w-32 md:w-64 h-32 md:h-64 bg-purple-500/15 rounded-full blur-2xl md:blur-3xl group-hover:bg-purple-500/30 transition-all duration-500" />
                  </div>
                  <div className="relative z-20 h-48 sm:h-56 md:h-72 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mb-2 md:mb-4 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/25 transition-all duration-300 border border-purple-500/20 group-hover:border-purple-500/40 group-hover:scale-110">
                      <Microscope className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-purple-300 group-hover:text-purple-200 transition-colors" />
                    </div>
                    <h3 className="text-sm sm:text-base md:text-xl lg:text-2xl font-medium text-white mb-1 md:mb-2 tracking-wide group-hover:text-purple-100 transition-colors">EXPLORE LABS</h3>
                    <p className="text-[10px] sm:text-xs text-purple-300/90 font-semibold mb-1 md:mb-2 tracking-wide">(Login Required)</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-purple-200/70 max-w-sm group-hover:text-purple-100/90 transition-colors leading-tight md:leading-relaxed">
                      Design professional logos, marketing assets, and slogans with our AI-powered studio.
                    </p>
                  </div>
                </HolographicCard>

              </div>
            </div>
          </>
        );
    }
  };

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  // Render Dashboard Layout for dashboard views (no popups, full page)
  if (isDashboardView) {
    const renderDashboardContent = () => {
      switch (view) {
        case AppView.DASHBOARD_JOBS:
          return <JobsList onSelectJob={handleSelectJob} />;
        case AppView.DASHBOARD_JOB_DETAIL:
          return <JobDetail onBack={() => setView(AppView.DASHBOARD_JOBS)} activeTab={activeJobTab} />;
        case AppView.DASHBOARD_ESTIMATES:
          return <EstimateBuilder onBack={() => setView(AppView.DASHBOARD_HOME)} />;
        case AppView.DASHBOARD_SETTINGS:
          return <DashboardSettings />;
        case AppView.DASHBOARD:
        case AppView.DASHBOARD_HOME:
        default:
          return <DashboardHome />;
      }
    };

    return (
      <DashboardLayout
        currentView={view}
        onNavigate={handleDashboardNavigate}
        activeJobTab={activeJobTab}
        onJobTabChange={setActiveJobTab}
      >
        {renderDashboardContent()}
      </DashboardLayout>
    );
  }

  return (
    <SmoothScroll>
      <div className="min-h-screen w-full relative bg-slate-950 noise-overlay overflow-hidden">
        <ParticleField count={3000} />
        <FloatingElements />
        <CursorTrail />
        <AmbientAudio />

        {/* Animated Gradient Mesh Background */}
        <div className="fixed inset-0 gradient-mesh pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {view === AppView.LANDING ? renderLandingNav() : renderInternalNav()}
          <main className="flex-grow flex flex-col">
            <PageTransition pageKey={view}>
              {renderContent()}
            </PageTransition>
          </main>
        </div>
      </div>
    </SmoothScroll>
  );
};

export default App;