import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, Send, User, MapPin, Phone, Mail, FileCheck, Building2, Hash, AlertCircle } from 'lucide-react';
import { analyzeClaim } from '../services/geminiService';
import { getCurrentUser, supabase } from '../lib/supabase';
import ServiceAuthChoice from './ServiceAuthChoice';
import { AppView } from '../types';

interface DenialAppealFormProps {
  onNavigate?: (view: AppView) => void;
}

const DenialAppealForm: React.FC<DenialAppealFormProps> = ({ onNavigate }) => {
  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    propertyAddress: '',
    claimNumber: '',
    insuranceCompany: '',
    adjusterName: '',
    denialReason: '',
    additionalNotes: ''
  });

  const [denialLetter, setDenialLetter] = useState<File | null>(null);
  const [inspectionReport, setInspectionReport] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Check if user is authenticated and pre-fill data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setIsAuthenticated(true);
          setShowAuthChoice(false);

          // Pre-fill user data
          setFormData(prev => ({
            ...prev,
            contactName: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            email: user.email || '',
            phone: user.user_metadata?.phone || '',
          }));
        }
      } catch (error) {
        // User not authenticated, show auth choice
        setIsAuthenticated(false);
      } finally {
        setUserLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginClick = () => {
    // Store intent to return to this service after login
    sessionStorage.setItem('returnToService', 'DENIAL_APPEAL');
    if (onNavigate) {
      onNavigate(AppView.PORTAL);
    }
  };

  const handleGuestClick = () => {
    setShowAuthChoice(false);
  };

  // Show loading while checking auth
  if (userLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // Show auth choice if not authenticated and user hasn't chosen guest
  if (!isAuthenticated && showAuthChoice) {
    return (
      <ServiceAuthChoice
        serviceName="Denial Appeal Request"
        serviceDescription="Let us help you fight your claim denial. We'll investigate, analyze, and acquire any missing information needed. Pricing: 10% of Total Approved RCV."
        onLoginClick={handleLoginClick}
        onGuestClick={handleGuestClick}
      />
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (!formData.contactName || !formData.propertyAddress || !formData.claimNumber) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setResult(null);

    const fullPrompt = `
      DENIAL APPEAL REQUEST:

      Contact Information:
      - Name: ${formData.contactName}
      - Email: ${formData.email}
      - Phone: ${formData.phone}

      Property & Claim Details:
      - Property Address: ${formData.propertyAddress}
      - Claim Number: ${formData.claimNumber}
      - Insurance Company: ${formData.insuranceCompany}
      - Adjuster Name: ${formData.adjusterName}

      Denial Information:
      ${formData.denialReason}

      Additional Notes:
      ${formData.additionalNotes}

      Documents Attached:
      - Denial Letter: ${denialLetter ? 'Yes' : 'No'}
      - Inspection Report: ${inspectionReport ? 'Yes' : 'No'}
      - Photos: ${photos ? photos.length + ' files' : 'None'}
    `;

    try {
      let base64 = undefined;
      let fileType = undefined;

      if (denialLetter) {
        base64 = await fileToBase64(denialLetter);
        fileType = denialLetter.type;
      } else if (inspectionReport) {
        base64 = await fileToBase64(inspectionReport);
        fileType = inspectionReport.type;
      }

      const response = await analyzeClaim(fullPrompt, base64, fileType);
      setResult(response);
    } catch (error) {
      console.error(error);
      setResult("An error occurred while processing your denial appeal request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 animate-float">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-rose-500/30">
        <div className="text-center mb-8">
          <FileCheck className="w-12 h-12 text-rose-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-rose-200">Denial Appeal Request</h2>
          <p className="text-rose-100/70 max-w-2xl mx-auto mt-2">
            Let us help you fight your claim denial. We'll investigate, analyze, and acquire any missing information needed.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            <p className="text-sm text-rose-300 font-semibold">Pricing: 10% of Total Approved RCV</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Contact Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-rose-400" />
              Contact Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Full Name *</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property & Claim Details */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-rose-400" />
              Property & Claim Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Property Address *</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="123 Main St, City, State ZIP"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Claim Number *</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    name="claimNumber"
                    value={formData.claimNumber}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="CLM-123456"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Insurance Company</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    name="insuranceCompany"
                    value={formData.insuranceCompany}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="Insurance Company Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Adjuster Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
                  <input
                    name="adjusterName"
                    value={formData.adjusterName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    placeholder="Adjuster Name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Uploads */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-rose-400" />
              Required Documents
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Denial Letter</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setDenialLetter(e.target.files[0])}
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    id="denial-letter"
                  />
                  <label
                    htmlFor="denial-letter"
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 px-4 text-rose-100 cursor-pointer hover:border-rose-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-rose-400/50 group-hover:text-rose-400" />
                    <span className="text-sm">{denialLetter ? denialLetter.name : 'Upload File'}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Inspection Report</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setInspectionReport(e.target.files[0])}
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    id="inspection-report"
                  />
                  <label
                    htmlFor="inspection-report"
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 px-4 text-rose-100 cursor-pointer hover:border-rose-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-rose-400/50 group-hover:text-rose-400" />
                    <span className="text-sm">{inspectionReport ? inspectionReport.name : 'Upload File'}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Photos (Multiple)</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setPhotos(e.target.files)}
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="photos"
                  />
                  <label
                    htmlFor="photos"
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 px-4 text-rose-100 cursor-pointer hover:border-rose-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-rose-400/50 group-hover:text-rose-400" />
                    <span className="text-sm">{photos ? `${photos.length} files` : 'Upload Photos'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Denial Details */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Reason for Denial & Details</label>
            <div className="relative group">
              <AlertCircle className="absolute left-4 top-3.5 w-4 h-4 text-rose-400/50 group-focus-within:text-rose-400 transition-colors" />
              <textarea
                name="denialReason"
                value={formData.denialReason}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 pl-10 pr-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all resize-none"
                placeholder="Describe why your claim was denied and any relevant details..."
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-rose-200/60 ml-1">Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleInputChange}
              rows={3}
              className="w-full bg-slate-900/50 border border-rose-500/30 rounded-xl py-3 px-4 text-rose-100 placeholder-rose-300/30 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all resize-none"
              placeholder="Any additional information that might help with your appeal..."
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Denial Appeal</span>
              </>
            )}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="mt-8 p-6 bg-slate-900/70 border border-rose-500/30 rounded-xl animate-fadeIn">
            <h3 className="text-lg font-medium text-rose-300 mb-3 flex items-center">
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

export default DenialAppealForm;
