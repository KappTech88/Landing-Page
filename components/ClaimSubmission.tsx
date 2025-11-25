import React, { useState } from 'react';
import { Upload, FileText, Loader2, Send, User, MapPin, Phone, Hammer, AlertCircle, ClipboardCheck } from 'lucide-react';
import { analyzeClaim } from '../services/geminiService';

const ClaimSubmission: React.FC = () => {
  const [formData, setFormData] = useState({
    homeownerName: '',
    propertyAddress: '',
    phoneNumber: '',
    contractorInfo: '',
    claimsInfo: ''
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        // Remove data URL prefix for API
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!formData.claimsInfo && !file) return;
    setLoading(true);
    setResult(null);

    const fullPrompt = `
      Task / Estimate Inquiry:
      
      Client/Homeowner Name: ${formData.homeownerName}
      Property Address: ${formData.propertyAddress}
      Phone Number: ${formData.phoneNumber}
      Contractor/Partner Info: ${formData.contractorInfo}
      
      Task Details / Measurements / Scope:
      ${formData.claimsInfo}
    `;

    try {
      let base64 = undefined;
      if (file) {
        base64 = await fileToBase64(file);
      }
      const response = await analyzeClaim(fullPrompt, base64, file?.type);
      setResult(response);
    } catch (error) {
      console.error(error);
      setResult("An error occurred while processing your inquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-6 animate-float">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-indigo-500/30">
        <div className="text-center mb-8">
            <ClipboardCheck className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
            <h2 className="text-3xl font-light text-indigo-200">Task & Estimate Inquiry</h2>
            <p className="text-indigo-100/70 max-w-2xl mx-auto mt-2">
              Submit measurements, insurance scopes, photos, or general tasks. We will analyze the data and prepare your estimate or report.
            </p>
        </div>

        <div className="space-y-6">
          {/* Row 1: Client & Phone */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Client / Homeowner Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  name="homeownerName"
                  value={formData.homeownerName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="Client Name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Address */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Property Address</label>
            <div className="relative group">
              <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
              <input
                name="propertyAddress"
                value={formData.propertyAddress}
                onChange={handleInputChange}
                className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="1234 Reliance Way, City, State, ZIP"
              />
            </div>
          </div>

          {/* Row 3: Contractor Info */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Your Info / Contractor Info</label>
            <div className="relative group">
              <Hammer className="absolute left-4 top-3.5 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
              <input
                name="contractorInfo"
                value={formData.contractorInfo}
                onChange={handleInputChange}
                className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="Your Company Name"
              />
            </div>
          </div>

          {/* Row 4: Task Info */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-indigo-200/60 ml-1">Task Details / Measurements</label>
            <div className="relative group">
                <AlertCircle className="absolute left-4 top-4 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                <textarea
                  name="claimsInfo"
                  className="w-full bg-slate-900/50 border border-indigo-500/30 rounded-xl py-3 pl-10 pr-4 text-indigo-100 placeholder-indigo-300/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none h-32"
                  placeholder="Paste measurements here, describe damages, or list line items needed..."
                  value={formData.claimsInfo}
                  onChange={handleInputChange}
                />
            </div>
          </div>

          {/* File Upload */}
          <div className="relative">
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
                  <p className="text-indigo-200 font-medium">Upload Documents / Photos</p>
                  <p className="text-indigo-300/50 text-sm mt-1">PDF Scopes, Sketch Measurements, or Denial Letters</p>
                </div>
              )}
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || (!formData.claimsInfo && !file)}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            Submit Inquiry
          </button>
        </div>

        {result && (
          <div className="mt-8 p-6 bg-slate-900/60 rounded-xl border border-indigo-500/20 animate-fadeIn">
            <h3 className="text-lg font-medium text-indigo-200 mb-2 flex items-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse" />
                Initial Analysis
            </h3>
            <p className="text-indigo-100/80 whitespace-pre-wrap leading-relaxed font-light">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimSubmission;