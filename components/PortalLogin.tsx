import React, { useState } from 'react';
import { Lock, ArrowRight, User, Shield } from 'lucide-react';

const PortalLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-float">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl border border-blue-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600"></div>
        
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">Estimate Reliance</h2>
            <h3 className="text-sm font-bold tracking-widest text-blue-400 uppercase">Partner Portal</h3>
        </div>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Email Address</label>
                <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50" />
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-900/60 border border-blue-500/20 rounded-xl py-3 pl-10 pr-4 text-blue-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        placeholder="partner@estimate-reliance.com"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-900/60 border border-blue-500/20 rounded-xl py-3 pl-10 pr-4 text-blue-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        placeholder="••••••••••••"
                    />
                </div>
            </div>

            <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center transition-all mt-4 group">
                Login to Dashboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="text-center mt-6">
                <p className="text-xs text-blue-200/40">
                    Restricted access for authorized startup partners only.
                    <br />
                    <span className="underline cursor-pointer hover:text-blue-300">Forgot credentials?</span>
                </p>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PortalLogin;