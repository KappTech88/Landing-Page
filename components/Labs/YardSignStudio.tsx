import React, { useState } from 'react';
import { ArrowLeft, Upload, Wand2, Loader2, Download, Megaphone, Phone, Globe, AlertTriangle } from 'lucide-react';
import { generateProGraphics } from '../../services/geminiService';

interface YardSignStudioProps {
  onBack: () => void;
}

const YardSignStudio: React.FC<YardSignStudioProps> = ({ onBack }) => {
  const hasKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [headline, setHeadline] = useState('');
  const [cta, setCta] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleGenerate = async () => {
    if (!companyName || !imagePreview) return;
    setLoading(true);
    try {
      const base64 = imagePreview.split(',')[1];
      const fullPrompt = `
      Asset Type: Yard Sign
      Company Name: "${companyName}"
      Headline: "${headline}"
      CTA: "${cta}"
      Phone: "${phone}"
      Website: "${website}"
      Design: High contrast, readable from distance.
      Additional: ${prompt}
      `;
      const result = await generateProGraphics(fullPrompt, 'Yard Sign', base64, '4:3');
      setGeneratedAsset(result);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="animate-fadeIn">
        <div className="glass-panel rounded-2xl shadow-2xl border border-orange-500/50 overflow-hidden min-h-[700px]">
            <div className="bg-slate-950/40 border-b border-orange-500/30 p-6 flex items-center justify-between">
                <button onClick={onBack} className="flex items-center text-orange-400 hover:text-orange-300 transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <h2 className="text-2xl font-light text-orange-100 tracking-wide">YARD SIGN STUDIO</h2>
                <div className="w-16"></div>
            </div>

            <div className="p-8">
                {!hasKey ? (
                    <div className="text-center py-20">
                        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-orange-100 mb-2">API Key Required</h3>
                        <p className="text-slate-400 text-sm max-w-md mx-auto">Please configure VITE_GEMINI_API_KEY in your environment variables to use this feature.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                            <div className="p-4 bg-orange-900/10 rounded-xl border border-orange-500/20">
                                <label className="text-orange-200 text-xs font-bold mb-2 block">Upload Logo (Required)</label>
                                <input type="file" onChange={handleFileChange} className="hidden" id="sign-logo" />
                                <label htmlFor="sign-logo" className={`flex items-center justify-between w-full p-3 border border-dashed rounded-lg cursor-pointer ${!file ? 'border-red-400/50' : 'border-orange-500/50'}`}><span>{file ? file.name : "Select Logo..."}</span><Upload className="w-4 h-4" /></label>
                            </div>

                            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Name" className="w-full bg-slate-900/50 border border-orange-500/30 rounded p-3 text-orange-100" />
                            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline (e.g. ROOFING)" className="w-full bg-slate-900/50 border border-orange-500/30 rounded p-3 text-orange-100 font-bold" />
                            <input value={cta} onChange={e => setCta(e.target.value)} placeholder="CTA (e.g. Call for Estimate)" className="w-full bg-slate-900/50 border border-orange-500/30 rounded p-3 text-orange-100" />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative"><Phone className="absolute left-3 top-3.5 w-4 h-4 text-orange-500/50" /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Big Phone #" className="w-full pl-9 bg-slate-900/50 border border-orange-500/30 rounded p-3 text-orange-100" /></div>
                                <div className="relative"><Globe className="absolute left-3 top-3.5 w-4 h-4 text-orange-500/50" /><input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website" className="w-full pl-9 bg-slate-900/50 border border-orange-500/30 rounded p-3 text-orange-100" /></div>
                            </div>
                            
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Colors, layout..." className="w-full bg-slate-900/50 border border-orange-500/30 rounded p-3 text-orange-100 h-24" />
                            
                            <button onClick={handleGenerate} disabled={!companyName || !file || loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin" /> : "Generate Sign"}
                            </button>
                        </div>

                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-950/30 rounded-xl border border-orange-500/10">
                            {generatedAsset ? (
                                <div className="w-full p-4 animate-fadeIn">
                                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-orange-500/30 shadow-2xl mb-4">
                                        <img src={generatedAsset} className="w-full h-full object-contain" alt="Sign" />
                                    </div>
                                    <a href={generatedAsset} download="yard-sign.png" className="block w-full text-center py-2 bg-slate-800 text-orange-200 rounded">Download</a>
                                </div>
                            ) : (
                                <div className="text-center text-orange-500/30">
                                    {loading ? <Loader2 className="w-12 h-12 animate-spin mx-auto" /> : <Megaphone className="w-16 h-16 mx-auto" />}
                                    <p className="mt-4">Generated sign appears here</p>
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

export default YardSignStudio;