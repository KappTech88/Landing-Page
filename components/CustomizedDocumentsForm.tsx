import React, { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, Send, User, Mail, Phone, FileEdit, Briefcase, ClipboardList, CheckCircle } from 'lucide-react';
import { analyzeClaim } from '../services/geminiService';
import { submitDocumentRequest, uploadDocumentFile } from '../services/documentRequestService';
import { getCurrentUser } from '../lib/supabase';
import ServiceAuthChoice from './ServiceAuthChoice';
import { AppView } from '../types';

interface CustomizedDocumentsFormProps {
  onNavigate?: (view: AppView) => void;
}

const CustomizedDocumentsForm: React.FC<CustomizedDocumentsFormProps> = ({ onNavigate }) => {
  const [showAuthChoice, setShowAuthChoice] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLoading, setUserLoading] = useState(true);

  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    companyName: '',
    documentType: '',
    documentTitle: '',
    documentDescription: '',
    specificRequirements: '',
    useCase: '',
    additionalNotes: ''
  });

  const [sampleDocs, setSampleDocs] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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
    sessionStorage.setItem('returnToService', 'CUSTOMIZED_DOCS');
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
        serviceName="Customized Documents Request"
        serviceDescription="Professional custom documents, contracts, and digital forms. Pricing: $50 - $100 depending on complexity."
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

  const getPricing = () => {
    if (formData.documentType === 'simple') return '$50';
    if (formData.documentType === 'digital-forum') return '$100';
    return 'Select document type';
  };

  const handleSubmit = async () => {
    if (!formData.contactName || !formData.documentType || !formData.documentDescription) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setResult(null);
    setSubmissionSuccess(false);

    const fullPrompt = `
      CUSTOMIZED DOCUMENT REQUEST:

      Contact Information:
      - Name: ${formData.contactName}
      - Email: ${formData.email}
      - Phone: ${formData.phone}
      - Company: ${formData.companyName}

      Document Details:
      - Type: ${formData.documentType === 'simple' ? 'Simple Document ($50)' : 'Digital Forum with Calculator ($100)'}
      - Title: ${formData.documentTitle}

      Document Description:
      ${formData.documentDescription}

      Specific Requirements:
      ${formData.specificRequirements}

      Use Case / Purpose:
      ${formData.useCase}

      Additional Notes:
      ${formData.additionalNotes}

      Reference Documents: ${sampleDocs ? sampleDocs.length + ' files attached' : 'None'}

      Please create a customized document/agreement tailored to this company's needs based on the specifications provided.
    `;

    try {
      let base64 = undefined;
      let fileType = undefined;
      const uploadedFiles: any[] = [];

      // Upload files to Supabase Storage (if any)
      if (sampleDocs && sampleDocs.length > 0) {
        for (let i = 0; i < sampleDocs.length; i++) {
          const file = sampleDocs[i];
          try {
            const { path, url } = await uploadDocumentFile(file);
            uploadedFiles.push({
              file_name: path.split('/').pop(),
              original_file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              storage_path: path,
              public_url: url,
            });
          } catch (uploadError) {
            console.error('Error uploading file:', file.name, uploadError);
            // Continue with other files even if one fails
          }
        }

        // Prepare first file for potential AI analysis (optional)
        base64 = await fileToBase64(sampleDocs[0]);
        fileType = sampleDocs[0].type;
      }

      // Try AI processing (optional - will skip if API key not configured)
      let response = '';
      const hasGeminiKey = import.meta.env.VITE_GEMINI_API_KEY &&
                          import.meta.env.VITE_GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY';

      if (hasGeminiKey) {
        try {
          response = await analyzeClaim(fullPrompt, base64, fileType);
        } catch (aiError) {
          console.log('AI processing skipped:', aiError);
          response = 'Thank you for your document request! We have received your information and will review it shortly. Our team will contact you to discuss your custom document needs.';
        }
      } else {
        response = 'Thank you for your document request! We have received your information and will review it shortly. Our team will contact you to discuss your custom document needs.';
      }

      setResult(response);

      // Save to database (no authentication required)
      try {
        const { id } = await submitDocumentRequest(
          {
            contactName: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            companyName: formData.companyName,
            documentType: formData.documentType as 'simple' | 'digital-forum',
            documentTitle: formData.documentTitle,
            documentDescription: formData.documentDescription,
            specificRequirements: formData.specificRequirements,
            useCase: formData.useCase,
            additionalNotes: formData.additionalNotes,
          },
          response,
          uploadedFiles
        );

        setSubmissionId(id);
        setSubmissionSuccess(true);
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Still show the AI response even if database save fails
        setResult(response + '\n\n⚠️ Note: Your request was processed but there was an issue saving it to our records. Please contact support if needed.');
      }
    } catch (error) {
      console.error(error);
      setResult("An error occurred while processing your document request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 animate-float">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-cyan-500/30">
        <div className="text-center mb-8">
          <FileEdit className="w-12 h-12 text-cyan-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-cyan-200">Customized Documents</h2>
          <p className="text-cyan-100/70 max-w-2xl mx-auto mt-2">
            Request custom agreements, contracts, or digital forms tailored to your company's specific needs.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-cyan-300 font-semibold">Pricing: {getPricing()}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Contact Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-cyan-400" />
              Contact Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Full Name *</label>
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
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Company Name</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="Company Name"
                  />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 pl-10 pr-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    placeholder="your@email.com"
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

          {/* Document Type Selection */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-cyan-400" />
              Document Type
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="relative cursor-pointer">
                <input
                  type="radio"
                  name="documentType"
                  value="simple"
                  checked={formData.documentType === 'simple'}
                  onChange={handleInputChange}
                  className="peer sr-only"
                  required
                />
                <div className="p-6 bg-slate-900/50 border-2 border-cyan-500/30 rounded-xl peer-checked:border-cyan-500 peer-checked:bg-cyan-500/10 transition-all hover:border-cyan-500/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-medium text-white">Simple Document</h4>
                    <span className="text-2xl font-bold text-cyan-400">$50</span>
                  </div>
                  <p className="text-sm text-slate-400">Custom agreements, contracts, or simple forms tailored to your needs.</p>
                </div>
              </label>
              <label className="relative cursor-pointer">
                <input
                  type="radio"
                  name="documentType"
                  value="digital-forum"
                  checked={formData.documentType === 'digital-forum'}
                  onChange={handleInputChange}
                  className="peer sr-only"
                />
                <div className="p-6 bg-slate-900/50 border-2 border-cyan-500/30 rounded-xl peer-checked:border-cyan-500 peer-checked:bg-cyan-500/10 transition-all hover:border-cyan-500/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-medium text-white">Digital Forum</h4>
                    <span className="text-2xl font-bold text-cyan-400">$100</span>
                  </div>
                  <p className="text-sm text-slate-400">Interactive digital forms with built-in calculators and auto-fill capabilities.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Document Details */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-cyan-400" />
              Document Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Document Title</label>
                <input
                  name="documentTitle"
                  value={formData.documentTitle}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  placeholder="e.g., Contractor Service Agreement, Work Authorization Form"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Document Description *</label>
                <textarea
                  name="documentDescription"
                  value={formData.documentDescription}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                  placeholder="Describe what type of document you need and what it should include..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Specific Requirements</label>
                <textarea
                  name="specificRequirements"
                  value={formData.specificRequirements}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                  placeholder="List specific fields, sections, calculations, or features needed..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Use Case / Purpose</label>
                <textarea
                  name="useCase"
                  value={formData.useCase}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                  placeholder="Explain how and when this document will be used..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Additional Notes</label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 placeholder-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none"
                  placeholder="Any other information that would be helpful..."
                />
              </div>
            </div>
          </div>

          {/* Optional Sample Documents */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-cyan-200/60 ml-1">Reference / Sample Documents (Optional)</label>
            <div className="relative">
              <input
                type="file"
                onChange={(e) => e.target.files && setSampleDocs(e.target.files)}
                accept=".pdf,.doc,.docx,image/*"
                multiple
                className="hidden"
                id="sample-docs"
              />
              <label
                htmlFor="sample-docs"
                className="flex items-center justify-center w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-3 px-4 text-cyan-100 cursor-pointer hover:border-cyan-500/50 transition-all group"
              >
                <Upload className="w-4 h-4 mr-2 text-cyan-400/50 group-hover:text-cyan-400" />
                <span className="text-sm">{sampleDocs ? `${sampleDocs.length} files` : 'Upload Sample Documents'}</span>
              </label>
            </div>
            <p className="text-xs text-cyan-300/50 ml-1">Upload any existing documents, templates, or examples to help us understand your needs</p>
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
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Document Request</span>
              </>
            )}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="mt-8 space-y-4">
            {/* Success Message */}
            {submissionSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fadeIn flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-emerald-300 font-medium mb-1">Request Submitted Successfully!</h4>
                  <p className="text-sm text-emerald-200/70">
                    Your document request has been saved. We'll process your request and contact you at{' '}
                    {formData.email || 'the provided contact information'}.
                  </p>
                  {submissionId && (
                    <p className="text-xs text-emerald-300/50 mt-2">
                      Reference ID: {submissionId}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Response */}
            <div className="p-6 bg-slate-900/70 border border-cyan-500/30 rounded-xl animate-fadeIn">
              <h3 className="text-lg font-medium text-cyan-300 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Response
              </h3>
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{result}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizedDocumentsForm;
