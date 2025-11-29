import React, { useState } from 'react';
import { Upload, FileText, Loader2, Send, User, MapPin, Phone, Mail, Calculator, Home, ClipboardList, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { analyzeClaim, isGeminiConfigured, GeminiError } from '../services/geminiService';
import { submitFormData, isSupabaseConfigured } from '../services/formSubmissionService';

const XactimateEstimateForm: React.FC = () => {
  const [formData, setFormData] = useState({
    contactName: '',
    email: '',
    phone: '',
    propertyAddress: '',
    propertyType: '',
    squareFootage: '',
    projectDescription: '',
    scopeOfWork: '',
    buildingSpecs: '',
    additionalNotes: ''
  });

  const [insuranceEstimate, setInsuranceEstimate] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'warning' | null>(null);

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
    if (!formData.contactName || !formData.propertyAddress || !formData.projectDescription) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setResult(null);
    setSubmissionId(null);
    setErrorType(null);

    const fullPrompt = `
      XACTIMATE ESTIMATE REQUEST (Non-Claim Handling):

      Contact Information:
      - Name: ${formData.contactName}
      - Email: ${formData.email}
      - Phone: ${formData.phone}

      Property Details:
      - Address: ${formData.propertyAddress}
      - Property Type: ${formData.propertyType}
      - Square Footage: ${formData.squareFootage}

      Project Information:
      Project Description:
      ${formData.projectDescription}

      Scope of Work:
      ${formData.scopeOfWork}

      Building Specifications:
      ${formData.buildingSpecs}

      Additional Notes:
      ${formData.additionalNotes}

      Documents Attached:
      - Initial Insurance Estimate: ${insuranceEstimate ? 'Yes' : 'No'}
      - Photos: ${photos ? photos.length + ' files' : 'None'}

      Please provide a full Xactimate estimate with supplement line items highlighted, building code and manufacture specifications included, and reason notes within the estimate.
    `;

    let aiResponse: string | undefined;
    let aiError: string | undefined;

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

      // Try AI processing
      if (isGeminiConfigured()) {
        try {
          aiResponse = await analyzeClaim(fullPrompt, base64, fileType);
        } catch (error) {
          if (error instanceof GeminiError) {
            aiError = error.message;
            setErrorType('warning');
          } else {
            throw error;
          }
        }
      } else {
        aiError = 'AI service is not configured. Your submission will be processed manually by our team.';
        setErrorType('warning');
      }

      // Save to database regardless of AI status
      if (isSupabaseConfigured()) {
        try {
          const submission = await submitFormData({
            form_type: 'xactimate_estimate',
            contact_name: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            form_data: {
              ...formData,
              hasDocuments: {
                insuranceEstimate: !!insuranceEstimate,
                photosCount: photos?.length || 0
              }
            },
            ai_response: aiResponse,
            ai_error: aiError,
            status: aiResponse ? 'processing' : 'pending'
          });
          setSubmissionId(submission.id);
        } catch (dbError) {
          console.warn('Could not save to database:', dbError);
        }
      }

      // Show result
      if (aiResponse) {
        setResult(aiResponse);
      } else if (aiError) {
        setResult(`Thank you for your estimate request, ${formData.contactName}!\n\n${aiError}\n\nOur team has received your Xactimate estimate request for ${formData.propertyAddress} and will prepare your estimate within 2-3 business days. You will receive it at ${formData.email}.`);
      } else {
        setResult(`Thank you for your estimate request, ${formData.contactName}!\n\nYour Xactimate estimate request for ${formData.propertyAddress} has been received. Our team will prepare your estimate and contact you within 2-3 business days at ${formData.email}.`);
        setErrorType('warning');
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
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-blue-500/30">
        <div className="text-center mb-8">
          <Calculator className="w-12 h-12 text-blue-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-blue-200">Xactimate Estimate Request</h2>
          <p className="text-blue-100/70 max-w-2xl mx-auto mt-2">
            Request a full Xactimate estimate with supplement line items highlighted and building code specifications included.
          </p>
          <div className="mt-4 inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-300 font-semibold">Pricing: $150 (Flat Fee)</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Contact Information Section */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-400" />
              Contact Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Full Name *</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="Your Name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-blue-400" />
              Property Information
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Property Address *</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    name="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="123 Main St, City, State ZIP"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Square Footage</label>
                <input
                  name="squareFootage"
                  value={formData.squareFootage}
                  onChange={handleInputChange}
                  type="number"
                  className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="2500"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Property Type</label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="">Select Property Type</option>
                <option value="single-family">Single Family Home</option>
                <option value="multi-family">Multi-Family</option>
                <option value="condo">Condo/Townhouse</option>
                <option value="commercial">Commercial</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Document Uploads */}
          <div className="border-b border-white/10 pb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-blue-400" />
              Required Documents
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Initial Insurance Estimate</label>
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
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 cursor-pointer hover:border-blue-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-blue-400/50 group-hover:text-blue-400" />
                    <span className="text-sm">{insuranceEstimate ? insuranceEstimate.name : 'Upload Estimate'}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Inspection/Completion Photos</label>
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
                    className="flex items-center justify-center w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 cursor-pointer hover:border-blue-500/50 transition-all group"
                  >
                    <Upload className="w-4 h-4 mr-2 text-blue-400/50 group-hover:text-blue-400" />
                    <span className="text-sm">{photos ? `${photos.length} files` : 'Upload Photos'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Project Description *</label>
              <div className="relative group">
                <ClipboardList className="absolute left-4 top-3.5 w-4 h-4 text-blue-400/50 group-focus-within:text-blue-400 transition-colors" />
                <textarea
                  name="projectDescription"
                  value={formData.projectDescription}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                  placeholder="Describe the project and what needs to be estimated..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Scope of Work</label>
              <textarea
                name="scopeOfWork"
                value={formData.scopeOfWork}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                placeholder="List specific work items, materials, or areas to be included in the estimate..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Building Code & Specifications</label>
              <textarea
                name="buildingSpecs"
                value={formData.buildingSpecs}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                placeholder="Any specific building codes, material specifications, or manufacturer requirements..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-blue-200/60 ml-1">Additional Notes</label>
              <textarea
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full bg-slate-900/50 border border-blue-500/30 rounded-xl py-3 px-4 text-blue-100 placeholder-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                placeholder="Any other information that would be helpful..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-4 rounded-xl font-medium shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Estimate Request</span>
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
              {errorType === 'error' ? 'Error' : errorType === 'warning' ? 'Submission Received' : 'Estimate Analysis'}
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{result}</p>
            {submissionId && (
              <p className="mt-4 text-sm text-slate-400">
                Reference ID: <span className="font-mono text-blue-300">{submissionId}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default XactimateEstimateForm;
