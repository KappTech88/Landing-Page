import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Plus, RefreshCw, Upload, Scaling, Wand2, Loader2, Palette, Download } from 'lucide-react';
import { generateProGraphics } from '../../services/geminiService';

interface LogoStudioProps {
  onBack: () => void;
}

const LogoStudio: React.FC<LogoStudioProps> = ({ onBack }) => {
  const [hasKey, setHasKey] = useState(false);
  const [creationMode, setCreationMode] = useState<'SCRATCH' | 'EDIT'>('SCRATCH');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [sloganText, setSloganText] = useState('');
  const [graphicsPrompt, setGraphicsPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<string[]>([]);

  useEffect(() => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
      window.aistudio.hasSelectedApiKey().then(setHasKey);
    }
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
    if (!companyName) return;
    setLoading(true);
    setGeneratedAssets([]);

    try {
      let base64 = undefined;
      if (creationMode === 'EDIT' && imagePreview) {
        base64 = imagePreview.split(',')[1];
      }

      const fullPrompt = `
      Asset Type: Company Logo
      Company Name: "${companyName}"
      Slogan: "${sloganText}"
      Additional Design Instructions: ${graphicsPrompt}
      `;

      const result = await generateProGraphics(fullPrompt, 'Logo', base64, aspectRatio);
      setGeneratedAssets([result]);
    } catch (error) {
      console.error(error);
      alert("Generation failed. Ensure paid API key is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fadeIn">
        <div className="glass-panel rounded-2xl shadow-2xl border border-emerald-500/50 overflow-hidden min-h-[700px]">
            <div className="bg-slate-950/40 border-b border-emerald-500/30 p-6 flex items-center justify-between">
                <button onClick={onBack} className="flex items-center text-emerald-400 hover:text-emerald-300 transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <h2 className="text-2xl font-light text-emerald-100 tracking-wide">LOGO STUDIO</h2>
                <div className="w-16"></div>
            </div>

            <div className="p-8">
                {!hasKey ? (
                    <div className="text-center py-20">
                        <Key className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-emerald-100 mb-2">Pro Features Locked</h3>
                        <button onClick={handleSelectKey} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all mt-4">Connect API Key</button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-emerald-500/20 w-fit">
                                <button onClick={() => setCreationMode('SCRATCH')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${creationMode === 'SCRATCH' ? 'bg-emerald-600 text-white' : 'text-emerald-400'}`}>
                                    <Plus className="w-3 h-3 mr-2" /> Create New
                                </button>
                                <button onClick={() => setCreationMode('EDIT')} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${creationMode === 'EDIT' ? 'bg-emerald-600 text-white' : 'text-emerald-400'}`}>
                                    <RefreshCw className="w-3 h-3 mr-2" /> Edit Existing
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-3 text-emerald-100 w-full" />
                                <input type="text" placeholder="Slogan (Optional)" value={sloganText} onChange={(e) => setSloganText(e.target.value)} className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-3 text-emerald-100 w-full" />
                            </div>

                             <div>
                                <label className="block text-emerald-200 text-xs mb-2">Aspect Ratio</label>
                                <div className="relative">
                                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-lg p-3 pl-9 text-emerald-100 appearance-none">
                                        <option value="1:1">Square (1:1)</option>
                                        <option value="16:9">Landscape (16:9)</option>
                                        <option value="3:4">Icon / Portrait (3:4)</option>
                                    </select>
                                    <Scaling className="absolute left-3 top-3.5 w-4 h-4 text-emerald-400/50" />
                                </div>
                            </div>

                            {creationMode === 'EDIT' && (
                                <div className="relative">
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="logo-upload" />
                                    <label htmlFor="logo-upload" className="flex items-center justify-between w-full p-4 border border-dashed border-emerald-500/30 rounded-lg cursor-pointer hover:bg-emerald-500/10 transition-colors text-emerald-300 text-sm">
                                        <span>{file ? file.name : "Upload Logo to Edit..."}</span>
                                        <Upload className="w-4 h-4" />
                                    </label>
                                </div>
                            )}

                            <textarea value={graphicsPrompt} onChange={(e) => setGraphicsPrompt(e.target.value)} placeholder="Describe style, colors, elements..." className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-xl p-4 text-emerald-100 h-24 resize-none" />

                            <button onClick={handleGenerate} disabled={!companyName || loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-50">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5 mr-2" /> Generate Logo</>}
                            </button>
                        </div>

                        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-950/30 rounded-xl border border-emerald-500/10">
                            {generatedAssets.length > 0 ? generatedAssets.map((asset, idx) => (
                                <div key={idx} className="w-full p-6 animate-fadeIn">
                                    <div className="rounded-xl overflow-hidden border border-emerald-500/30 shadow-2xl mb-4">
                                        <img src={asset} alt="Result" className="w-full h-full object-contain" />
                                    </div>
                                    <a href={asset} download={`logo-${idx}.png`} className="flex items-center justify-center w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-emerald-200"><Download className="w-4 h-4 mr-2" /> Download</a>
                                </div>
                            )) : (
                                <div className="text-center text-emerald-500/30">
                                    {loading ? <Loader2 className="w-12 h-12 animate-spin mx-auto" /> : <Palette className="w-16 h-16 mx-auto mb-4" />}
                                    <p>{loading ? "Generating..." : "Your logo will appear here"}</p>
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

export default LogoStudio;