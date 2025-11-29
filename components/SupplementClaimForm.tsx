import React, { useState } from 'react';
import { Upload, FileText, Loader2, Send, User, MapPin, Phone, Mail, Hash, Building2, Hammer, TrendingUp, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { analyzeClaim, isGeminiConfigured, GeminiError } from '../services/geminiService';
import { submitFormData, isSupabaseConfigured } from '../services/formSubmissionService';

const SupplementClaimForm: React.FC = () => {
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    propertyAddress: '',
    claimNumber: '',
    insuranceCompany: '',
    adjusterName: '',
    contractorName: '',
    contractorCompany: '',
    contractorLicense: '',
    supplementReason: '',
    additionalItems: '',
    additionalNotes: ''
  });

  const [insuranceEstimate, setInsuranceEstimate] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'warning' | null>(null);

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
    if (!formData.contactName || !formData.propertyAddress || !formData.claimNumber || !formData.supplementReason) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setResult(null);
    setSubmissionId(null);
    setErrorType(null);

    const fullPrompt = `
      SUPPLEMENT CLAIM REQUEST:

      Contact Information:
      - Name: ${formData.contactName}
      - Email: ${formData.email}
      - Phone: ${formData.phone}

      Property & Claim Details:
      - Property Address: ${formData.propertyAddress}
      - Claim Number: ${formData.claimNumber}
      - Insurance Company: ${formData.insuranceCompany}
      - Adjuster Name: ${formData.adjusterName}

      Contractor Information:
      - Contractor Name: ${formData.contractorName}
      - Company: ${formData.contractorCompany}
      - License Number: ${formData.contractorLicense}

      Supplement Details:
      Reason for Supplement:
      ${formData.supplementReason}

      Additional Items Needed:
      ${formData.additionalItems}

      Additional Notes:
      ${formData.additionalNotes}

      Documents Attached:
      - Initial Insurance Estimate: ${insuranceEstimate ? 'Yes' : 'No'}
      - Photos: ${photos ? photos.length + ' files' : 'None'}
      - Additional Documentation: ${additionalDocs ? additionalDocs.length + ' files' : 'None'}

      Please review this supplement claim and provide analysis. We will follow up on the claim, negotiate with the insurance company on the contractor's behalf, and provide COC and invoice support throughout the process.
    `;

    let aiResponse: string | undefined;

    try {
      let base64 = undefined;
      let fileType = undefined;

      if (insuranceEstimate) {
        base64 = await fileToBase64(insuranceEstimate);
        fileType = insuranceEstimate.type;
      } else if (photos && photos.length > 0) {
        base64 = await fileToBase64(photos[0]);
        fileType = photos[0].type;
      }

      // Try AI processing (optional - form works without it)
      if (isGeminiConfigured()) {
        try {
          aiResponse = await analyzeClaim(fullPrompt, base64, fileType);
        } catch (error) {
          // AI failed but that's okay - submission will still be saved
          console.warn('AI processing skipped:', error);
        }
      }

      // Save to database regardless of AI status
      if (isSupabaseConfigured()) {
        try {
          const submission = await submitFormData({
            form_type: 'supplement_claim',
            contact_name: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            form_data: {
              ...formData,
              hasDocuments: {
                insuranceEstimate: !!insuranceEstimate,
                photosCount: photos?.length || 0,
                additionalDocsCount: additionalDocs?.length || 0
              }
            },
            ai_response: aiResponse,
            status: aiResponse ? 'processing' : 'pending'
          });
          setSubmissionId(submission.id);
        } catch (dbError) {
          console.warn('Could not save to database:', dbError);
        }
      }

      // Show result - submission is successful regardless of AI
      const successMessage = `Thank you for your supplement request, ${formData.contactName}!\n\nYour supplement claim for ${formData.claimNumber} has been received. Our team will review your case and contact you within 1-2 business days at ${formData.email}.`;

      if (aiResponse) {
        setResult(aiResponse);
      } else {
        setResult(successMessage);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrorType('error');

      if (error instanceof GeminiError) {
        setResult(`We encountered an issue: ${error.message}\n\nPlease try again or contact us directly at support@estimatereliance.com.`);
      } else {
        setResult("We're experiencing technical difficulties. Please try again in a few minutes or contact us directly at support@estimatereliance.com.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 animate-float">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-purple-500/30">
        <div className="text-center mb-8">
          <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-purple-200">Supplement Claim Request</h2>
          <p className="text-purple-100/70 max-w-2xl mx-auto mt-2">
            We'll supplement your claim throughout the process, follow up with insurance, and negotiate on your behalf with COC and invoice support.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-sm text-purple-300 font-semibold">Pricing: 15% of Supplement Difference</p>
            <p className="text-xs text-purple-300/70 mt-1">Invoice generated upon final payment release from carrier</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Contact Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-purple-400" />
              Contact Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Full Name *</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property & Claim Details */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-purple-400" />
              Property & Claim Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Property Address *</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="123 Main St, City, State ZIP"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Claim Number *</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    name="claimNumber"
                    value={formData.claimNumber}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="CLM-123456"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Insurance Company</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    name="insuranceCompany"
                    value={formData.insuranceCompany}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="Insurance Company Name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Adjuster Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-purple-400/50 group-focus-within:text-purple-400 transition-colors" />
                  <input
                    name="adjusterName"
                    value={formData.adjusterName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 pl-10 pr-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="Adjuster Name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contractor Information */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Hammer className="w-5 h-5 mr-2 text-purple-400" />
              Contractor Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Contractor Name</label>
                <input
                  name="contractorName"
                  value={formData.contractorName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Contractor Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Company Name</label>
                <input
                  name="contractorCompany"
                  value={formData.contractorCompany}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Company Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">License Number</label>
                <input
                  name="contractorLicense"
                  value={formData.contractorLicense}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="License #"
                />
              </div>
            </div>
          </div>

          {/* Document Uploads */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-purple-400" />
              Required Documents
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Initial Insurance Estimate</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={(e) => e.target.files && setInsuranceEstimate(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    className="hidden"
                    id="insurance-estimate"
                  />
                  <label
                    htmlFor="insurance-estimate"
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 cursor-pointer hover:border-purple-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-purple-400/50 group-hover:text-purple-400" />
                    <span className="text-sm">{insuranceEstimate ? insuranceEstimate.name : 'Upload Estimate'}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Inspection/Completion Photos</label>
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
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 cursor-pointer hover:border-purple-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-purple-400/50 group-hover:text-purple-400" />
                    <span className="text-sm">{photos ? `${photos.length} files` : 'Upload Photos'}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Additional Documents</label>
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
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 cursor-pointer hover:border-purple-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-purple-400/50 group-hover:text-purple-400" />
                    <span className="text-sm">{additionalDocs ? `${additionalDocs.length} files` : 'Upload Files'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Supplement Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Reason for Supplement *</label>
              <textarea
                name="supplementReason"
                value={formData.supplementReason}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                placeholder="Describe why a supplement is needed, what was missed in the original estimate, additional damage found, etc..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Additional Items Needed</label>
              <textarea
                name="additionalItems"
                value={formData.additionalItems}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                placeholder="List specific items, materials, or work that should be added to the supplement..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-purple-200/60 ml-1">Additional Notes</label>
              <textarea
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl py-3 px-4 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                placeholder="Any other information that would be helpful..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Supplement Request</span>
              </>
            )}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`mt-8 p-6 rounded-xl animate-fadeIn ${
            errorType === 'error'
              ? 'bg-red-900/30 border border-red-500/30'
              : errorType === 'warning'
              ? 'bg-amber-900/30 border border-amber-500/30'
              : 'bg-slate-900/70 border border-emerald-500/30'
          }`}>
            <h3 className={`text-lg font-medium mb-3 flex items-center ${
              errorType === 'error'
                ? 'text-red-300'
                : errorType === 'warning'
                ? 'text-amber-300'
                : 'text-emerald-300'
            }`}>
              {errorType === 'error' ? (
                <XCircle className="w-5 h-5 mr-2" />
              ) : errorType === 'warning' ? (
                <AlertCircle className="w-5 h-5 mr-2" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              {errorType === 'error' ? 'Error' : errorType === 'warning' ? 'Submission Received' : 'Supplement Analysis'}
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{result}</p>
            {submissionId && (
              <p className="mt-4 text-sm text-slate-400">
                Reference ID: <span className="font-mono text-purple-300">{submissionId}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplementClaimForm;
