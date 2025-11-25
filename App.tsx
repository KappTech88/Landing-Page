import React, { useState } from 'react';
import StarField from './components/StarField';
import ClaimSubmission from './components/ClaimSubmission';
import Labs from './components/Labs';
import PortalLogin from './components/PortalLogin';
import DenialAppealForm from './components/DenialAppealForm';
import XactimateEstimateForm from './components/XactimateEstimateForm';
import SupplementClaimForm from './components/SupplementClaimForm';
import CommercialBidForm from './components/CommercialBidForm';
import CustomizedDocumentsForm from './components/CustomizedDocumentsForm';
import { AppView } from './types';
import { FileText, Microscope, ShieldCheck, ArrowLeft, UserPlus, LogIn, ClipboardList, FileCheck, Calculator, Building2, FileEdit, DollarSign } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);

  // Logo Component
  const Logo = () => (
    <div className="flex flex-col group cursor-pointer select-none" onClick={() => setView(AppView.LANDING)}>
      <span className="text-xl font-bold tracking-widest text-emerald-100 leading-tight group-hover:text-white transition-colors">
        ESTIMATE RELIANCE
      </span>
      <div className="h-0.5 w-full animate-swoosh-green mt-1 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] group-hover:shadow-[0_0_12px_rgba(16,185,129,0.6)] transition-all duration-300"></div>
    </div>
  );

  // Landing Nav (with Login)
  const renderLandingNav = () => (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-slate-950/80 border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Logo />
        <button 
          onClick={() => setView(AppView.PORTAL)}
          className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all"
        >
          Partner Portal
        </button>
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
                  <div className="flex items-baseline gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-semibold text-emerald-400">10% of Total RCV</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>• Property/Claim Information</p>
                    <p>• Inspection Report</p>
                    <p>• Denial Letter</p>
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
                  <div className="flex items-baseline gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-semibold text-emerald-400">$150</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>• Property/Claim Information</p>
                    <p>• Initial Insurance Estimate</p>
                    <p>• Inspection or Completion Photos</p>
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
                  <div className="flex items-baseline gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-semibold text-emerald-400">15% of Supplement</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>• Property/Claim Information</p>
                    <p>• Initial Insurance Estimate</p>
                    <p>• Inspection or Completion Photos</p>
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
                  <div className="flex items-baseline gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-semibold text-emerald-400">$250 + 3% if contracted</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>• Blueprints and Plans</p>
                    <p>• Property Information</p>
                    <p>• Measurements</p>
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
                  <div className="flex items-baseline gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-semibold text-emerald-400">$50 - $100</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>• Description of document needed</p>
                    <p>• Simple Docs: $50</p>
                    <p>• Digital Forums with calculator: $100</p>
                  </div>
                </div>
              </button>

            </div>
          </div>
        );
      case AppView.DENIAL_APPEAL:
        return <DenialAppealForm />;
      case AppView.XACTIMATE_ESTIMATE:
        return <XactimateEstimateForm />;
      case AppView.SUPPLEMENT_CLAIM:
        return <SupplementClaimForm />;
      case AppView.COMMERCIAL_BID:
        return <CommercialBidForm />;
      case AppView.CUSTOMIZED_DOCS:
        return <CustomizedDocumentsForm />;
      case AppView.CLAIMS:
        return <ClaimSubmission />;
      case AppView.LABS:
        return <Labs />;
      case AppView.PORTAL:
        return <PortalLogin />;
      default:
        return (
          <>
            {/* Hero Section */}
            <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 relative">
              <div className="text-center max-w-5xl mx-auto animate-float">
                <div className="flex flex-col items-center mb-8 relative">
                  {/* Enhanced Radiant Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-32 bg-emerald-500/10 blur-[60px] rounded-full -z-10 animate-pulse-glow"></div>

                  <h1 className="text-5xl md:text-7xl font-thin tracking-widest text-center radiant-text relative z-20 animate-fadeInScale">
                    ESTIMATE RELIANCE
                  </h1>
                  {/* Enhanced Swoosh Line */}
                  <div className="h-0.5 w-64 animate-swoosh-green mt-4 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] opacity-90 relative z-20"></div>
                </div>

                <p className="text-xl md:text-2xl text-slate-300 font-light tracking-wide mb-10 max-w-3xl mx-auto leading-relaxed animate-fadeIn stagger-2">
                  Professional insurance restoration estimates, supplements, and creative marketing solutions—powered by AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideUp stagger-3">
                  <button
                    onClick={() => setView(AppView.CLAIMS)}
                    className="group px-10 py-5 text-lg font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-2xl shadow-indigo-600/30 transition-all transform hover:scale-105 hover:shadow-indigo-600/50 relative overflow-hidden"
                  >
                    <span className="relative z-10">Inquire / Submit Task →</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-indigo-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                  <button
                    onClick={() => setView(AppView.LABS)}
                    className="group px-10 py-5 text-lg font-light border-2 border-teal-500/50 hover:border-teal-400 text-teal-100 hover:bg-teal-500/10 rounded-xl transition-all hover:shadow-lg hover:shadow-teal-500/20 relative overflow-hidden"
                  >
                    <span className="relative z-10">Explore Labs</span>
                    <div className="absolute inset-0 bg-teal-500/5 -translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Service Cards - 2 Cards */}
            <div className="px-4 py-16 max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">

                {/* Card 1: Select Service */}
                <button
                  onClick={() => setView(AppView.SERVICES)}
                  className="card-3d hover-lift group relative h-80 rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-indigo-400/60 glass-card animate-fadeIn stagger-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                    <div className="w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500" />
                  </div>
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/25 transition-all duration-300 border border-indigo-500/20 group-hover:border-indigo-500/40 group-hover:scale-110">
                      <ClipboardList className="w-8 h-8 text-indigo-300 group-hover:text-indigo-200 transition-colors" />
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 tracking-wide group-hover:text-indigo-100 transition-colors">SELECT SERVICE</h3>
                    <p className="text-sm text-indigo-200/70 max-w-sm group-hover:text-indigo-100/90 transition-colors">
                      Browse our professional services including denial appeals, estimates, and custom documents.
                    </p>
                  </div>
                </button>

                {/* Card 2: Explore Labs (Login Required) */}
                <button
                  onClick={() => setView(AppView.LABS)}
                  className="card-3d hover-lift group relative h-80 rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 hover:border-teal-400/60 glass-card animate-fadeIn stagger-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-125 transition-transform duration-700">
                    <div className="w-64 h-64 bg-teal-500/15 rounded-full blur-3xl group-hover:bg-teal-500/30 transition-all duration-500" />
                  </div>
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/25 transition-all duration-300 border border-teal-500/20 group-hover:border-teal-500/40 group-hover:scale-110">
                      <Microscope className="w-8 h-8 text-teal-300 group-hover:text-teal-200 transition-colors" />
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 tracking-wide group-hover:text-teal-100 transition-colors">EXPLORE LABS</h3>
                    <p className="text-xs text-teal-300/90 font-semibold mb-2 tracking-wide">(Login Required)</p>
                    <p className="text-sm text-teal-200/70 max-w-sm group-hover:text-teal-100/90 transition-colors">
                      Design professional logos, marketing assets, and slogans with our AI-powered studio.
                    </p>
                  </div>
                </button>

              </div>
            </div>

            {/* Optional: Why Estimate Reliance Section */}
            <div className="px-4 py-16 max-w-6xl mx-auto border-t border-white/5">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="p-6 group hover:bg-white/5 rounded-xl transition-all duration-300 animate-fadeIn stagger-1">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">⚡</div>
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-emerald-300 transition-colors">Fast Turnaround</h3>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">AI-powered analysis delivers results in minutes, not days.</p>
                </div>

                <div className="p-6 group hover:bg-white/5 rounded-xl transition-all duration-300 animate-fadeIn stagger-2">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-emerald-300 transition-colors">Expert Quality</h3>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Professional-grade estimates and supplements that adjusters respect.</p>
                </div>

                <div className="p-6 group hover:bg-white/5 rounded-xl transition-all duration-300 animate-fadeIn stagger-3">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">💰</div>
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-emerald-300 transition-colors">Transparent Pricing</h3>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Choose your service level—from automated to hands-on expert review.</p>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-slate-950 noise-overlay overflow-hidden">
      <StarField />

      {/* Animated Gradient Mesh Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none z-0"></div>

      {/* Ambient Music Indicator */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-4 opacity-30 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">Ambience</div>
        <div className="flex space-x-1 h-3 items-end">
            <div className="w-0.5 bg-emerald-500 h-1.5 animate-[pulse_1s_infinite]"></div>
            <div className="w-0.5 bg-emerald-500 h-3 animate-[pulse_1.5s_infinite]"></div>
            <div className="w-0.5 bg-emerald-500 h-2 animate-[pulse_1.2s_infinite]"></div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {view === AppView.LANDING ? renderLandingNav() : renderInternalNav()}
        <main className="flex-grow flex flex-col">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;