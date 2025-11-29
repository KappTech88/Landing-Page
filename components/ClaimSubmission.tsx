import React, { useState } from 'react';
import { Upload, FileText, Loader2, Send, User, MapPin, Phone, Hammer, AlertCircle, ClipboardCheck, Building, Calendar, FileWarning, CheckCircle2, XCircle } from 'lucide-react';
import { analyzeClaim, isGeminiConfigured, GeminiError } from '../services/geminiService';
import { submitFormData, isSupabaseConfigured } from '../services/formSubmissionService';
import { ClaimSubmissionFormData, ClaimType, PropertyType } from '../types';

const ClaimSubmission: React.FC = () => {
  const [formData, setFormData] = useState<ClaimSubmissionFormData>({
    // Property Owner Info
    owner_first_name: '',
    owner_last_name: '',
    owner_email: '',
    owner_phone: '',
    owner_phone_alt: '',

    // Property Address
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',

    // Property Details
    property_type: 'residential' as PropertyType,
    square_footage: undefined,
    year_built: undefined,

    // Claim Information
    claim_type: 'water' as ClaimType,
    date_of_loss: '',
    damage_description: '',

    // Insurance Information (optional)
    insurance_company: '',
    policy_number: '',
    adjuster_name: '',
    adjuster_phone: '',
    adjuster_email: '',

    // Contractor/Submitter Info
    contractor_name: '',
    contractor_company: '',
    contractor_email: '',
    contractor_phone: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'error' | 'warning' | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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
    // Basic validation
    if (!formData.owner_first_name || !formData.owner_last_name || !formData.owner_phone ||
        !formData.address_line1 || !formData.city || !formData.state || !formData.zip_code ||
        !formData.date_of_loss || !formData.damage_description) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setResult(null);
    setSubmitSuccess(false);
    setSubmissionId(null);
    setErrorType(null);

    // Create AI analysis prompt
    const fullPrompt = `
      CLAIM SUBMISSION ANALYSIS

      Property Owner: ${formData.owner_first_name} ${formData.owner_last_name}
      Contact: ${formData.owner_phone} | ${formData.owner_email}

      Property Address:
      ${formData.address_line1}${formData.address_line2 ? `, ${formData.address_line2}` : ''}
      ${formData.city}, ${formData.state} ${formData.zip_code}

      Property Details:
      - Type: ${formData.property_type}
      - Square Footage: ${formData.square_footage || 'Not provided'}
      - Year Built: ${formData.year_built || 'Not provided'}

      Claim Information:
      - Claim Type: ${formData.claim_type}
      - Date of Loss: ${formData.date_of_loss}
      - Damage Description: ${formData.damage_description}

      Insurance Information:
      ${formData.insurance_company ? `- Company: ${formData.insurance_company}` : ''}
      ${formData.policy_number ? `- Policy #: ${formData.policy_number}` : ''}
      ${formData.adjuster_name ? `- Adjuster: ${formData.adjuster_name} (${formData.adjuster_phone})` : ''}

      Contractor/Submitter:
      ${formData.contractor_company || formData.contractor_name || 'Direct homeowner submission'}
      ${formData.contractor_email ? `Contact: ${formData.contractor_email}` : ''}

      Please analyze this claim submission and provide:
      1. Initial assessment of the damage scope
      2. Recommended next steps
      3. Estimated timeline for resolution
      4. Any additional information needed
    `;

    let aiResponse: string | undefined;
    let aiError: string | undefined;

    try {
      let base64 = undefined;
      if (file) {
        base64 = await fileToBase64(file);
      }

      // Try AI processing
      if (isGeminiConfigured()) {
        try {
          aiResponse = await analyzeClaim(fullPrompt, base64, file?.type);
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
            form_type: 'claim_submission',
            contact_name: `${formData.owner_first_name} ${formData.owner_last_name}`,
            email: formData.owner_email,
            phone: formData.owner_phone,
            form_data: {
              ...formData,
              hasFile: !!file
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
        setSubmitSuccess(true);
      } else if (aiError) {
        setResult(`Thank you for your claim submission, ${formData.owner_first_name}!\n\n${aiError}\n\nOur team has received your ${formData.claim_type} damage claim for ${formData.address_line1}, ${formData.city} and will review it within 24 hours. You will receive updates at ${formData.owner_email}.`);
        setSubmitSuccess(true);
      } else {
        setResult(`Thank you for your claim submission, ${formData.owner_first_name}!\n\nYour ${formData.claim_type} damage claim for ${formData.address_line1}, ${formData.city} has been received. Our team will review your submission and contact you within 24 hours at ${formData.owner_email}.`);
        setSubmitSuccess(true);
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
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-indigo-500/30">
        <div className="text-center mb-8">
          <ClipboardCheck className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
          <h2 className="text-3xl font-light text-indigo-200">Submit a Claim</h2>
          <p className="text-indigo-100/70 max-w-2xl mx-auto mt-2">
            Complete the form below to submit your insurance restoration claim. All fields marked with * are required.
          </p>
        </div>

        <div className="space-y-8">
          {/* PROPERTY OWNER INFORMATION */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Property Owner Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">First Name *</label>
                <input
                  name="owner_first_name"
                  value={formData.owner_first_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Last Name *</label>
                <input
                  name="owner_last_name"
                  value={formData.owner_last_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Phone Number *</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    name="owner_phone"
                    value={formData.owner_phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Email Address *</label>
                <input
                  name="owner_email"
                  type="email"
                  value={formData.owner_email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="john.smith@email.com"
                  required
                />
              </div>
            </div>
          </div>

          {/* PROPERTY ADDRESS */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Property Address
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Street Address *</label>
                <input
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="1234 Main Street"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Apt / Suite / Unit</label>
                <input
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Apt 201"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">City *</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="Atlanta"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">State *</label>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="GA"
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">ZIP Code *</label>
                  <input
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    placeholder="30308"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PROPERTY DETAILS */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Property Details
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Property Type *</label>
                <select
                  name="property_type"
                  value={formData.property_type}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  required
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="multi_family">Multi-Family</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Square Footage</label>
                <input
                  name="square_footage"
                  type="number"
                  value={formData.square_footage || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="2500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Year Built</label>
                <input
                  name="year_built"
                  type="number"
                  value={formData.year_built || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="2005"
                />
              </div>
            </div>
          </div>

          {/* CLAIM INFORMATION */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4 flex items-center">
              <FileWarning className="w-5 h-5 mr-2" />
              Claim Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Claim Type *</label>
                <select
                  name="claim_type"
                  value={formData.claim_type}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  required
                >
                  <option value="water">Water Damage</option>
                  <option value="fire">Fire Damage</option>
                  <option value="windstorm">Windstorm</option>
                  <option value="hail">Hail Damage</option>
                  <option value="mold">Mold</option>
                  <option value="storm_damage">Storm Damage</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Date of Loss *</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    name="date_of_loss"
                    type="date"
                    value={formData.date_of_loss}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Damage Description *</label>
              <div className="relative group">
                <AlertCircle className="absolute left-4 top-4 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                <textarea
                  name="damage_description"
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-32"
                  placeholder="Describe the damage in detail: location, extent, affected areas, visible issues..."
                  value={formData.damage_description}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* INSURANCE INFORMATION */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4">Insurance Information (Optional)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Insurance Company</label>
                <input
                  name="insurance_company"
                  value={formData.insurance_company}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="State Farm, Allstate, etc."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Policy Number</label>
                <input
                  name="policy_number"
                  value={formData.policy_number}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="POL-123456"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Adjuster Name</label>
                <input
                  name="adjuster_name"
                  value={formData.adjuster_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Jane Adjuster"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Adjuster Phone</label>
                <input
                  name="adjuster_phone"
                  value={formData.adjuster_phone}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>
          </div>

          {/* CONTRACTOR INFORMATION */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4 flex items-center">
              <Hammer className="w-5 h-5 mr-2" />
              Contractor Information (Optional)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Contractor Name</label>
                <input
                  name="contractor_name"
                  value={formData.contractor_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="John Contractor"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Company Name</label>
                <input
                  name="contractor_company"
                  value={formData.contractor_company}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 px-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="ABC Restoration"
                />
              </div>
            </div>
          </div>

          {/* FILE UPLOAD */}
          <div>
            <h3 className="text-lg font-medium text-indigo-300 mb-4">Upload Documentation (Optional)</h3>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              id="claim-upload"
            />
            <label
              htmlFor="claim-upload"
              className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-indigo-500/30 rounded-xl cursor-pointer hover:bg-indigo-500/10 transition-colors group"
            >
              {file ? (
                <div className="flex items-center text-indigo-200 bg-indigo-500/20 px-4 py-2 rounded-lg">
                  <FileText className="w-5 h-5 mr-2" />
                  {file.name}
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-indigo-400/50 group-hover:text-indigo-400 transition-colors" />
                  <p className="text-indigo-200 font-medium">Upload Photos or Documents</p>
                  <p className="text-indigo-300/50 text-sm mt-1">Images, PDFs, or other documentation</p>
                </div>
              )}
            </label>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Claim
              </>
            )}
          </button>
        </div>

        {/* RESULTS */}
        {result && (
          <div className={`mt-8 p-6 rounded-xl animate-fadeIn ${
            errorType === 'error'
              ? 'bg-red-900/30 border border-red-500/30'
              : errorType === 'warning'
              ? 'bg-amber-900/30 border border-amber-500/30'
              : 'bg-slate-900/60 border border-emerald-500/30'
          }`}>
            <h3 className={`text-lg font-medium mb-2 flex items-center ${
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
              {errorType === 'error' ? 'Error' : errorType === 'warning' ? 'Claim Received' : 'Initial Analysis & Next Steps'}
            </h3>
            <p className="text-slate-300 whitespace-pre-wrap leading-relaxed font-light">{result}</p>
            {submissionId && (
              <p className="mt-4 text-sm text-slate-400">
                Reference ID: <span className="font-mono text-indigo-300">{submissionId}</span>
              </p>
            )}
            {submitSuccess && !errorType && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">
                  Claim submitted successfully! We'll review your submission and contact you within 24 hours.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimSubmission;
