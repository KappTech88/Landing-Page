import React, { useState } from 'react';
import { Send, User, Mail, Phone, Building2, MapPin, TrendingUp, Loader2, CheckCircle, Briefcase } from 'lucide-react';

const PartnerRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    companyAddress: '',
    avgClaimsPerMonth: '',
    businessType: '',
    yearsInBusiness: '',
    additionalInfo: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.avgClaimsPerMonth) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto w-full p-6 animate-float">
        <div className="glass-panel p-12 rounded-2xl shadow-2xl border border-emerald-500/30 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-light text-emerald-200 mb-4">Registration Submitted!</h2>
          <p className="text-lg text-slate-300 mb-6 leading-relaxed">
            Thank you for your interest in becoming a partner with Estimate Reliance.
          </p>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6 mb-6">
            <p className="text-cyan-100 leading-relaxed">
              A member of our team will review your application and contact you within 1-2 business days to discuss partnership opportunities and next steps.
            </p>
          </div>
          <p className="text-sm text-slate-400">
            We look forward to working with you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full p-6 animate-float">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-cyan-500/30">
        <div className="text-center mb-8">
          <Briefcase className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-cyan-200">Partner Registration</h2>
          <p className="text-cyan-100/70 max-w-2xl mx-auto mt-2">
            Join our network of trusted restoration professionals. Fill out the form below and our team will be in touch.
          </p>
        </div>

        {/* Notice Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8 animate-fadeIn">
          <p className="text-sm text-blue-200 text-center">
            <strong>Notice:</strong> A team member will contact you within 1-2 business days after submission.
          </p>
        </div>

        <div className="space-y-6">
          {/* Company Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-cyan-400" />
              Company Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Company Name *</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="Your Company LLC"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Business Type</label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                >
                  <option value="">Select Type</option>
                  <option value="restoration">Restoration Company</option>
                  <option value="roofing">Roofing Company</option>
                  <option value="general-contractor">General Contractor</option>
                  <option value="public-adjuster">Public Adjuster</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Company Address</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    name="companyAddress"
                    value={formData.companyAddress}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="123 Business St, City, State ZIP"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Years in Business</label>
                <input
                  name="yearsInBusiness"
                  value={formData.yearsInBusiness}
                  onChange={handleInputChange}
                  type="number"
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-cyan-400" />
              Contact Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Contact Name *</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Email *</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Metrics */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-cyan-400" />
              Business Metrics
            </h3>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Average Claims Filed Per Month *</label>
              <div className="relative group">
                <TrendingUp className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                <input
                  name="avgClaimsPerMonth"
                  value={formData.avgClaimsPerMonth}
                  onChange={handleInputChange}
                  type="number"
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  placeholder="e.g., 15"
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Additional Information</label>
            <textarea
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
              placeholder="Tell us about your company, service area, specializations, or any other relevant information..."
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-cyan-600/30 hover:shadow-cyan-600/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Registration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerRegistration;
