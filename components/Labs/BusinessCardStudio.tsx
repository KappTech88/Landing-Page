import React, { useState } from 'react';
import { ArrowLeft, Upload, Wand2, Loader2, Download, User, Phone, Mail, Globe, MapPin, Briefcase, AlertTriangle } from 'lucide-react';
import { generateProGraphics } from '../../services/geminiService';

interface BusinessCardStudioProps {
  onBack: () => void;
}

const BusinessCardStudio: React.FC<BusinessCardStudioProps> = ({ onBack }) => {
  const hasKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [sloganText, setSloganText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState('16:9'); // Default landscape

  // Contact Info
  const [info, setInfo] = useState({ firstName: '', lastName: '', jobTitle: '', office: '', cell: '', email: '', website: '', address: '' });
  const [prompt, setPrompt] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerate = async () => {
    if (!companyName || !imagePreview) {
        alert("Company Name and Logo Upload are required.");
        return;
    }
    setLoading(true);
    setGeneratedAssets([]);

    try {
      const base64 = imagePreview.split(',')[1];

      // 1. Back (Info Side)
      const backPrompt = `
      Asset Type: Business Card (Back / Info Side)
      Company Name: "${companyName}"
      STRICT REQUIREMENT: Use the provided [IMAGE] as the logo source.
      Design Instructions: Clean, professional layout.
      Name: ${info.firstName} ${info.lastName}
      Title: ${info.jobTitle}
      Phones: Office: ${info.office}, Cell: ${info.cell}
      Email: ${info.email}
      Website: ${info.website}
      Address: ${info.address}
      Additional: ${prompt}
      `;

      // 2. Front (Brand Side)
      const frontPrompt = `
      Asset Type: Business Card (Front / Brand Side)
      Company Name: "${companyName}"
      Slogan: "${sloganText}"
      STRICT REQUIREMENT: Use the provided [IMAGE] as the CENTRAL visual element. The provided image IS the logo. Center it.
      Design Instructions: Minimalist branding side. No contact text.
      Additional: ${prompt}
      `;

      const [backResult, frontResult] = await Promise.all([
          generateProGraphics(backPrompt, 'Business Card', base64, aspectRatio),
          generateProGraphics(frontPrompt, 'Business Card', base64, aspectRatio)
      ]);

      setGeneratedAssets([backResult, frontResult]);
    } catch (error) {
      console.error(error);
      alert("Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
        <div className="glass-panel rounded-2xl shadow-2xl border border-blue-500/50 overflow-hidden min-h-[800px]">
            <div className="bg-slate-950/40 border-b border-blue-500/30 p-6 flex items-center justify-between">
                <button onClick={onBack} className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <h2 className="text-2xl font-light text-blue-100 tracking-wide">BUSINESS CARD STUDIO</h2>
                <div className="w-16"></div>
            </div>

            <div className="p-8">
                {!hasKey ? (
                    <div className="text-center py-20">
                         <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                         <h3 className="text-xl font-bold text-blue-100 mb-2">API Key Required</h3>
                         <p className="text-slate-400 text-sm max-w-md mx-auto">Please configure VITE_GEMINI_API_KEY in your environment variables to use this feature.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                             {/* Logo Upload */}
                             <div className="p-4 bg-blue-900/10 rounded-xl border border-blue-500/20">
                                <label className="text-blue-200 text-xs font-bold mb-2 block uppercase">Step 1: Upload Logo (Required)</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="card-logo" />
                                <label htmlFor="card-logo" className={`flex items-center justify-between w-full p-3 border border-dashed rounded-lg cursor-pointer ${!file ? 'border-red-400/50 text-red-300' : 'border-blue-500/50 text-blue-300'}`}>
                                    <span>{file ? file.name : "Select Logo..."}</span>
                                    <Upload className="w-4 h-4" />
                                </label>
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                                <input name="firstName" placeholder="First Name" value={info.firstName} onChange={handleInfoChange} className="bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                                <input name="lastName" placeholder="Last Name" value={info.lastName} onChange={handleInfoChange} className="bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                             </div>
                             <input name="jobTitle" placeholder="Job Title" value={info.jobTitle} onChange={handleInfoChange} className="w-full bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                             
                             <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <Phone className="absolute left-2 top-2.5 w-3 h-3 text-blue-500/50" />
                                    <input name="office" placeholder="Office #" value={info.office} onChange={handleInfoChange} className="w-full pl-7 bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-2 top-2.5 w-3 h-3 text-blue-500/50" />
                                    <input name="cell" placeholder="Cell #" value={info.cell} onChange={handleInfoChange} className="w-full pl-7 bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                                </div>
                             </div>

                             <div className="relative">
                                <Mail className="absolute left-2 top-2.5 w-3 h-3 text-blue-500/50" />
                                <input name="email" placeholder="Email" value={info.email} onChange={handleInfoChange} className="w-full pl-7 bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                             </div>
                             <div className="relative">
                                <Globe className="absolute left-2 top-2.5 w-3 h-3 text-blue-500/50" />
                                <input name="website" placeholder="Website" value={info.website} onChange={handleInfoChange} className="w-full pl-7 bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                             </div>
                             <div className="relative">
                                <MapPin className="absolute left-2 top-2.5 w-3 h-3 text-blue-500/50" />
                                <input name="address" placeholder="Address" value={info.address} onChange={handleInfoChange} className="w-full pl-7 bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                             </div>

                             <div className="border-t border-blue-500/20 pt-4 mt-2">
                                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Name" className="w-full bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm mb-2" />
                                <input value={sloganText} onChange={e => setSloganText(e.target.value)} placeholder="Slogan" className="w-full bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm" />
                             </div>

                             <div className="mt-2">
                                <label className="text-blue-200 text-xs mb-1 block">Format</label>
                                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-900/50 border border-blue-500/30 rounded p-2 text-blue-100 text-sm">
                                    <option value="16:9">Standard Landscape</option>
                                    <option value="9:16">Vertical</option>
                                    <option value="1:1">Square</option>
                                </select>
                             </div>

                             <button onClick={handleGenerate} disabled={!companyName || !file || loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg mt-4 flex items-center justify-center disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin" /> : "Generate Business Cards"}
                             </button>
                        </div>

                        {/* Output */}
                        <div className="flex flex-col gap-6 items-center min-h-[400px]">
                            {generatedAssets.length > 0 ? generatedAssets.map((asset, idx) => (
                                <div key={idx} className="w-full max-w-sm animate-fadeIn">
                                    <div className="text-center mb-2">
                                        <span className="text-xs font-bold text-blue-300 uppercase bg-blue-900/30 px-3 py-1 rounded-full">{idx === 0 ? "Back (Info)" : "Front (Brand)"}</span>
                                    </div>
                                    <div className={`w-full rounded-xl overflow-hidden border border-blue-500/30 shadow-xl ${aspectRatio === '1:1' ? 'aspect-square' : aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
                                        <img src={asset} className="w-full h-full object-contain bg-white" alt="card" />
                                    </div>
                                    <a href={asset} download={`card-${idx}.png`} className="block w-full text-center py-2 bg-slate-800 text-blue-200 text-xs mt-2 rounded">Download</a>
                                </div>
                            )) : (
                                <div className="text-center text-blue-500/30 mt-20">
                                    {loading ? <Loader2 className="w-12 h-12 animate-spin mx-auto" /> : <Briefcase className="w-16 h-16 mx-auto" />}
                                    <p className="mt-4">Generated cards appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default BusinessCardStudio;