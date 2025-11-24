import React, { useState } from 'react';
import StarField from './components/StarField';
import ClaimSubmission from './components/ClaimSubmission';
import Labs from './components/Labs';
import PortalLogin from './components/PortalLogin';
import { AppView } from './types';
import { FileText, Microscope, ShieldCheck, ArrowLeft, UserPlus, LogIn, ClipboardList } from 'lucide-react';

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
            <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
              <div className="text-center max-w-5xl mx-auto animate-float">
                <div className="flex flex-col items-center mb-8 relative">
                  {/* Radiant Mask Layer - Toned Down */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-24 bg-emerald-500/5 blur-[40px] rounded-full -z-10 animate-pulse"></div>
                  
                  <h1 className="text-5xl md:text-7xl font-thin tracking-widest text-center radiant-text relative z-20">
                    ESTIMATE RELIANCE
                  </h1>
                  {/* Swoosh Line - Shortened and Toned Down Shadow */}
                  <div className="h-0.5 w-64 animate-swoosh-green mt-4 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)] opacity-80 relative z-20"></div>
                </div>
                
                <p className="text-xl md:text-2xl text-slate-300 font-light tracking-wide mb-10 max-w-3xl mx-auto leading-relaxed">
                  Professional insurance restoration estimates, supplements, and creative marketing solutions—powered by AI.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button 
                    onClick={() => setView(AppView.CLAIMS)}
                    className="px-10 py-5 text-lg font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-2xl shadow-indigo-600/30 transition-all transform hover:scale-105"
                  >
                    Inquire / Submit Task →
                  </button>
                  <button 
                    onClick={() => setView(AppView.LABS)}
                    className="px-10 py-5 text-lg font-light border border-teal-500/50 hover:border-teal-400 text-teal-100 hover:bg-teal-500/10 rounded-xl transition-all"
                  >
                    Explore Labs
                  </button>
                </div>
              </div>
            </div>

            {/* Service Cards Grid - 4 Cards */}
            <div className="px-4 py-16 max-w-7xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
                
                {/* Card 1: Task Inquiry */}
                <button
                  onClick={() => setView(AppView.CLAIMS)}
                  className="group relative h-80 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/10 hover:border-indigo-400/50 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700">
                    <div className="w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors" />
                  </div>
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors border border-indigo-500/20">
                      <ClipboardList className="w-8 h-8 text-indigo-300" />
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 tracking-wide">TASK INQUIRY</h3>
                    <p className="text-sm text-indigo-200/70 max-w-sm">
                      Submit measurements, insurance scopes, or estimate requests. We handle the heavy lifting.
                    </p>
                  </div>
                </button>

                {/* Card 2: Creative Labs */}
                <button
                  onClick={() => setView(AppView.LABS)}
                  className="group relative h-80 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/10 hover:border-teal-400/50 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700">
                    <div className="w-64 h-64 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-colors" />
                  </div>
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors border border-teal-500/20">
                      <Microscope className="w-8 h-8 text-teal-300" />
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 tracking-wide">CREATIVE LABS</h3>
                    <p className="text-sm text-teal-200/70 max-w-sm">
                      Design professional logos, marketing assets, and slogans with our AI-powered studio.
                    </p>
                  </div>
                </button>

                 {/* Card 3: Partner Login */}
                 <button
                  onClick={() => setView(AppView.PORTAL)}
                  className="group relative h-80 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/10 hover:border-blue-400/50 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700">
                    <div className="w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
                  </div>
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                      <LogIn className="w-8 h-8 text-blue-300" />
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 tracking-wide">PARTNER LOGIN</h3>
                    <p className="text-sm text-blue-200/70 max-w-sm">
                      Access your dashboard, manage ongoing estimates, and view your business analytics.
                    </p>
                  </div>
                </button>

                 {/* Card 4: Sign Up / Become a Partner */}
                 <button
                  onClick={() => alert("Registration is currently by invitation only. Please inquire via the Task form.")}
                  className="group relative h-80 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] border border-white/10 hover:border-emerald-400/50 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700">
                    <div className="w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
                  </div>
                  <div className="relative z-20 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">
                      <UserPlus className="w-8 h-8 text-emerald-300" />
                    </div>
                    <h3 className="text-2xl font-medium text-white mb-2 tracking-wide">BECOME A PARTNER</h3>
                    <p className="text-sm text-emerald-200/70 max-w-sm">
                      Join our network of trusted restoration professionals. Scale your business today.
                    </p>
                  </div>
                </button>

              </div>
            </div>

            {/* Optional: Why Estimate Reliance Section */}
            <div className="px-4 py-16 max-w-6xl mx-auto border-t border-white/5">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="p-6">
                  <div className="text-3xl mb-4">⚡</div>
                  <h3 className="text-lg font-medium text-white mb-2">Fast Turnaround</h3>
                  <p className="text-sm text-slate-400">AI-powered analysis delivers results in minutes, not days.</p>
                </div>
                
                <div className="p-6">
                  <div className="text-3xl mb-4">🎯</div>
                  <h3 className="text-lg font-medium text-white mb-2">Expert Quality</h3>
                  <p className="text-sm text-slate-400">Professional-grade estimates and supplements that adjusters respect.</p>
                </div>
                
                <div className="p-6">
                  <div className="text-3xl mb-4">💰</div>
                  <h3 className="text-lg font-medium text-white mb-2">Transparent Pricing</h3>
                  <p className="text-sm text-slate-400">Choose your service level—from automated to hands-on expert review.</p>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-slate-950">
      <StarField />
      
      {/* Ambient Music Indicator */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-4 opacity-30 hover:opacity-100 transition-opacity pointer-events-none">
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