import React, { useState } from 'react';
import { ArrowLeft, Upload, Wand2, Loader2, FileText } from 'lucide-react';
import { generateProGraphics } from '../../services/geminiService';

interface FlyerStudioProps {
  onBack: () => void;
}

const FlyerStudio: React.FC<FlyerStudioProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bullets, setBullets] = useState('');
  const [contact, setContact] = useState('');
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
      Asset Type: Promotional Flyer
      Company Name: "${companyName}"
      Headline: "${headline}"
      Body Text: "${bodyText}"
      Key Points: ${bullets}
      Contact: ${contact}
      Design: Professional layout with clear hierarchy.
      `;
      const result = await generateProGraphics(fullPrompt, 'Flyer', base64, '3:4');
      setGeneratedAsset(result);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="animate-fadeIn">
        <div className="glass-panel rounded-2xl shadow-2xl border border-pink-500/50 overflow-hidden min-h-[700px]">
            <div className="bg-slate-950/40 border-b border-pink-500/30 p-6 flex items-center justify-between">
                <button onClick={onBack} className="flex items-center text-pink-400 hover:text-pink-300 transition-colors text-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
                <h2 className="text-2xl font-light text-pink-100 tracking-wide">FLYER STUDIO</h2>
                <div className="w-16"></div>
            </div>
            <div className="p-8">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                             <div className="p-4 bg-pink-900/10 rounded-xl border border-pink-500/20">
                                <label className="text-pink-200 text-xs font-bold mb-2 block">Upload Logo (Required)</label>
                                <input type="file" onChange={handleFileChange} className="hidden" id="flyer-logo" />
                                <label htmlFor="flyer-logo" className={`flex items-center justify-between w-full p-3 border border-dashed rounded-lg cursor-pointer ${!file ? 'border-red-400/50' : 'border-pink-500/50'}`}><span>{file ? file.name : "Select Logo..."}</span><Upload className="w-4 h-4" /></label>
                             </div>
                             <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Name" className="w-full bg-slate-900/50 border border-pink-500/30 rounded p-3 text-pink-100" />
                             <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline" className="w-full bg-slate-900/50 border border-pink-500/30 rounded p-3 text-pink-100 font-bold" />
                             <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Body Text..." className="w-full bg-slate-900/50 border border-pink-500/30 rounded p-3 text-pink-100 h-24" />
                             <input value={bullets} onChange={e => setBullets(e.target.value)} placeholder="Bullet Points (comma separated)" className="w-full bg-slate-900/50 border border-pink-500/30 rounded p-3 text-pink-100" />
                             <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Contact Info" className="w-full bg-slate-900/50 border border-pink-500/30 rounded p-3 text-pink-100" />
                             <button onClick={handleGenerate} disabled={!companyName || !file || loading} className="w-full bg-pink-600 text-white font-medium py-3 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50">{loading ? <Loader2 className="animate-spin" /> : "Generate Flyer"}</button>
                        </div>
                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-950/30 rounded-xl border border-pink-500/10">
                            {generatedAsset ? (
                                <div className="w-full p-4 animate-fadeIn">
                                    <div className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-pink-500/30 shadow-2xl mb-4"><img src={generatedAsset} className="w-full h-full object-contain" alt="Flyer" /></div>
                                    <a href={generatedAsset} download="flyer.png" className="block w-full text-center py-2 bg-slate-800 text-pink-200 rounded">Download</a>
                                </div>
                            ) : <div className="text-center text-pink-500/30">{loading ? <Loader2 className="w-12 h-12 animate-spin mx-auto" /> : <FileText className="w-16 h-16 mx-auto" />}<p className="mt-4">Flyer appears here</p></div>}
                        </div>
                    </div>
            </div>
        </div>
    </div>
  );
};
export default FlyerStudio;