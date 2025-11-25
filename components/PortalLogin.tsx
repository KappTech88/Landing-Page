import React, { useState } from 'react';
import { Lock, ArrowRight, User, Shield, Loader2, AlertCircle } from 'lucide-react';
import { signIn } from '../lib/supabase';
import { LoginFormData } from '../types';

const PortalLogin: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Uncomment when Supabase is configured
      /*
      const { session, user } = await signIn(formData.email, formData.password);

      if (session && user) {
        // Redirect to dashboard
        window.location.href = '/dashboard'; // or use router in Next.js
      }
      */

      // Temporary: Show error since Supabase isn't configured yet
      setError('Supabase authentication not configured yet. Please set up your .env.local file with Supabase credentials.');

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Email Address</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-slate-900/60 border border-blue-500/20 rounded-xl py-3 pl-10 pr-4 text-blue-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                placeholder="partner@estimate-reliance.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-slate-900/60 border border-blue-500/20 rounded-xl py-3 pl-10 pr-4 text-blue-100 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                placeholder="••••••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-blue-600/50 disabled:to-cyan-600/50 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center transition-all mt-4 group disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Login to Dashboard
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {/* Footer Links */}
          <div className="text-center mt-6">
            <p className="text-xs text-blue-200/40">
              Restricted access for authorized partners only.
              <br />
              <button
                type="button"
                className="underline cursor-pointer hover:text-blue-300 transition-colors mt-1"
                onClick={() => alert('Please contact admin@estimate-reliance.com for password reset')}
              >
                Forgot credentials?
              </button>
            </p>
          </div>

          {/* Setup Notice */}
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-400/80 text-xs text-center">
              <strong>Setup Required:</strong> Configure Supabase credentials in <code className="bg-slate-900/50 px-1 py-0.5 rounded">.env.local</code> to enable authentication.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortalLogin;
