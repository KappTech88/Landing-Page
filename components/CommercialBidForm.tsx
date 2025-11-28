import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, Send, User, MapPin, Phone, Mail, Building2, Calendar, Briefcase, ClipboardList } from 'lucide-react';
import { analyzeClaim } from '../services/geminiService';
import { getCurrentUser } from '../lib/supabase';
import ServiceAuthChoice from './ServiceAuthChoice';
import { AppView } from '../types';

interface CommercialBidFormProps {
  onNavigate?: (view: AppView) => void;
}

const CommercialBidForm: React.FC<CommercialBidFormProps> = ({ onNavigate }) => {
  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    companyName: '',
    projectName: '',
    projectAddress: '',
    projectType: '',
    squareFootage: '',
    estimatedBudget: '',
    projectTimeline: '',
    projectDescription: '',
    specificRequirements: '',
    additionalNotes: ''
  });

  const [blueprints, setBlueprints] = useState<FileList | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          setShowAuthChoice(false);
          setFormData(prev => ({
            ...prev,
            contactName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
            companyName: user.user_metadata?.company_name || '',
          }));
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setUserLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginClick = () => {
    sessionStorage.setItem('returnToService', 'COMMERCIAL_BID');
    if (onNavigate) {
      onNavigate(AppView.PORTAL);
    }
  };

  const handleGuestClick = () => {
    setShowAuthChoice(false);
  };

  if (userLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && showAuthChoice) {
    return (
      <ServiceAuthChoice
        serviceName="Commercial Bid Request"
        serviceDescription="Professional commercial project estimates and bids. Pricing: $250 + 3% if contracted."
        onLoginClick={handleLoginClick}
        onGuestClick={handleGuestClick}
      />
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!formData.contactName || !formData.projectName || !formData.projectAddress || !formData.projectDescription) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setResult(null);

    const fullPrompt = `
      COMMERCIAL BID ESTIMATE REQUEST (New Development):

      Contact Information:
      - Name: ${formData.contactName}
      - Email: ${formData.email}
      - Phone: ${formData.phone}
      - Company: ${formData.companyName}

      Project Details:
      - Project Name: ${formData.projectName}
      - Location: ${formData.projectAddress}
      - Project Type: ${formData.projectType}
      - Square Footage: ${formData.squareFootage}
      - Estimated Budget: ${formData.estimatedBudget}
      - Timeline: ${formData.projectTimeline}

      Project Description:
      ${formData.projectDescription}

      Specific Requirements:
      ${formData.specificRequirements}

      Additional Notes:
      ${formData.additionalNotes}

      Documents Attached:
      - Blueprints/Plans: ${blueprints ? blueprints.length + ' files' : 'None'}
      - Additional Documentation: ${additionalDocs ? additionalDocs.length + ' files' : 'None'}

      Please provide a presentable and professional estimate with Take Offs included for reference. This bid is for new development/construction.
    `;

    try {
      let base64 = undefined;
      let fileType = undefined;

      if (blueprints && blueprints.length > 0) {
        base64 = await fileToBase64(blueprints[0]);
        fileType = blueprints[0].type;
      } else if (additionalDocs && additionalDocs.length > 0) {
        base64 = await fileToBase64(additionalDocs[0]);
        fileType = additionalDocs[0].type;
      }

      const response = await analyzeClaim(fullPrompt, base64, fileType);
      setResult(response);
    } catch (error) {
      console.error(error);
      setResult("An error occurred while processing your commercial bid request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 animate-float">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-amber-500/30">
        <div className="text-center mb-8">
          <Building2 className="w-12 h-12 text-amber-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-amber-200">Commercial Bid Estimate</h2>
          <p className="text-amber-100/70 max-w-2xl mx-auto mt-2">
            Request a professional estimate for new development projects. We'll provide a presentable bid with Take Offs included for reference.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-300 font-semibold">Pricing: $250 upfront + 3% if contracted</p>
            <p className="text-xs text-amber-300/70 mt-1">$250 deducted from final fee if job is awarded</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Contact Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-amber-400" />
              Contact Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Full Name *</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Company Name</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="Company Name"
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-amber-400" />
              Project Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Project Name *</label>
                <input
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  placeholder="Project Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Project Type</label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                >
                  <option value="">Select Project Type</option>
                  <option value="new-construction">New Construction</option>
                  <option value="commercial-building">Commercial Building</option>
                  <option value="residential-complex">Residential Complex</option>
                  <option value="renovation">Major Renovation</option>
                  <option value="industrial">Industrial</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Project Address *</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                <input
                  name="projectAddress"
                  value={formData.projectAddress}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  placeholder="Project Location Address"
                  required
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Square Footage</label>
                <input
                  name="squareFootage"
                  value={formData.squareFootage}
                  onChange={handleInputChange}
                  type="number"
                  className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Estimated Budget</label>
                <input
                  name="estimatedBudget"
                  value={formData.estimatedBudget}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  placeholder="$500,000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Timeline</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    name="projectTimeline"
                    value={formData.projectTimeline}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                    placeholder="6 months"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Uploads */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-amber-400" />
              Required Documents
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Blueprints & Plans *</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setBlueprints(e.target.files)}
                    accept=".pdf,.dwg,.dxf,image/*"
                    multiple
                    className="hidden"
                    id="blueprints"
                  />
                  <label
                    htmlFor="blueprints"
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 cursor-pointer hover:border-amber-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-amber-400/50 group-hover:text-amber-400" />
                    <span className="text-sm">{blueprints ? `${blueprints.length} files` : 'Upload Plans'}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Additional Documents</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setAdditionalDocs(e.target.files)}
                    accept=".pdf,.doc,.docx,image/*"
                    multiple
                    className="hidden"
                    id="additional-docs"
                  />
                  <label
                    htmlFor="additional-docs"
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 cursor-pointer hover:border-amber-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-amber-400/50 group-hover:text-amber-400" />
                    <span className="text-sm">{additionalDocs ? `${additionalDocs.length} files` : 'Upload Files'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Project Description *</label>
              <div className="relative group">
                <ClipboardList className="absolute left-4 top-3.5 w-4 h-4 text-amber-400/50 group-focus-within:text-amber-400 transition-colors" />
                <textarea
                  name="projectDescription"
                  value={formData.projectDescription}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 pl-10 pr-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none"
                  placeholder="Provide a detailed description of the project, scope of work, and overall vision..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Specific Requirements</label>
              <textarea
                name="specificRequirements"
                value={formData.specificRequirements}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none"
                placeholder="List any specific materials, building codes, sustainability requirements, or special considerations..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-amber-200/60 ml-1">Additional Notes</label>
              <textarea
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full bg-slate-900/50 border border-amber-500/30 rounded-xl py-3 px-4 text-amber-100 placeholder-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all resize-none"
                placeholder="Any other information that would be helpful..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-amber-600/30 hover:shadow-amber-600/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Bid Request</span>
              </>
            )}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="mt-8 p-6 bg-slate-900/70 border border-amber-500/30 rounded-xl animate-fadeIn">
            <h3 className="text-lg font-medium text-amber-300 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Response
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommercialBidForm;
