import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Upload, Wand2, Loader2, Flag } from 'lucide-react';
import { generateProGraphics } from '../../services/geminiService';

interface BannerStudioProps {
  onBack: () => void;
}

const BannerStudio: React.FC<BannerStudioProps> = ({ onBack }) => {
  const [hasKey, setHasKey] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [cta, setCta] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<string | null>(null);

  useEffect(() => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) window.aistudio.hasSelectedApiKey().then(setHasKey);
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setHasKey(await window.aistudio.hasSelectedApiKey());
    }
  };

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
      Asset Type: Marketing Banner
      Company Name: "${companyName}"
      Headline: "${headline}"
      Subheadline: "${subheadline}"
      CTA: "${cta}"
      Website: "${website}"
      Design: Eye-catching, horizontal layout.
      `;
      const result = await generateProGraphics(fullPrompt, 'Banner', base64, '16:9');
      setGeneratedAsset(result);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="animate-fadeIn">
        <div className="glass-panel rounded-2xl shadow-2xl border border-violet-500/50 overflow-hidden min-h-[700px]">
            <div className="bg-slate-950/40 border-b border-violet-500/30 p-6 flex items-center justify-between">
                <button onClick={onBack} className="flex items-center text-violet-400 hover:text-violet-300 transition-colors text-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
                <h2 className="text-2xl font-light text-violet-100 tracking-wide">BANNER STUDIO</h2>
                <div className="w-16"></div>
            </div>
            <div className="p-8">
                {!hasKey ? <div className="text-center py-20"><Key className="w-12 h-12 text-violet-400 mx-auto" /><button onClick={handleSelectKey} className="bg-violet-600 text-white font-bold py-3 px-8 rounded-xl mt-4">Connect Key</button></div> : (
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                             <div className="p-4 bg-violet-900/10 rounded-xl border border-violet-500/20">
                                <label className="text-violet-200 text-xs font-bold mb-2 block">Upload Logo (Required)</label>
                                <input type="file" onChange={handleFileChange} className="hidden" id="banner-logo" />
                                <label htmlFor="banner-logo" className={`flex items-center justify-between w-full p-3 border border-dashed rounded-lg cursor-pointer ${!file ? 'border-red-400/50' : 'border-violet-500/50'}`}><span>{file ? file.name : "Select Logo..."}</span><Upload className="w-4 h-4" /></label>
                             </div>
                             <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Name" className="w-full bg-slate-900/50 border border-violet-500/30 rounded p-3 text-violet-100" />
                             <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Main Headline" className="w-full bg-slate-900/50 border border-violet-500/30 rounded p-3 text-violet-100 font-bold" />
                             <input value={subheadline} onChange={e => setSubheadline(e.target.value)} placeholder="Subheadline" className="w-full bg-slate-900/50 border border-violet-500/30 rounded p-3 text-violet-100" />
                             <input value={cta} onChange={e => setCta(e.target.value)} placeholder="Call to Action" className="w-full bg-slate-900/50 border border-violet-500/30 rounded p-3 text-violet-100" />
                             <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="Website URL" className="w-full bg-slate-900/50 border border-violet-500/30 rounded p-3 text-violet-100" />
                             <button onClick={handleGenerate} disabled={!companyName || !file || loading} className="w-full bg-violet-600 text-white font-medium py-3 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : "Generate Banner"}</button>
                        </div>
                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-950/30 rounded-xl border border-violet-500/10">
                            {generatedAsset ? (
                                <div className="w-full p-4 animate-fadeIn">
                                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-violet-500/30 shadow-2xl mb-4"><img src={generatedAsset} className="w-full h-full object-contain" alt="Banner" /></div>
                                    <a href={generatedAsset} download="banner.png" className="block w-full text-center py-2 bg-slate-800 text-violet-200 rounded">Download</a>
                                </div>
                            ) : <div className="text-center text-violet-500/30">{loading ? <Loader2 className="w-12 h-12 animate-spin mx-auto" /> : <Flag className="w-16 h-16 mx-auto" />}<p className="mt-4">Banner appears here</p></div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
export default BannerStudio;