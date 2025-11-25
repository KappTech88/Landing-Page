import React, { useState, useEffect } from 'react';
import { Upload, Film, Loader2, Key } from 'lucide-react';
import { generateVeoVideo } from '../services/geminiService';
import ApiKeyManager, { getStoredApiConfig } from './ApiKeyManager';

const MemoryAnimator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Cinematic, slow motion animation');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = () => {
    const config = getStoredApiConfig();
    setHasKey(!!config && !!config.apiKey);
  };

  const handleSelectKey = () => {
    setShowApiKeyManager(true);
  };

  const handleApiKeySaved = () => {
    checkKey();
    setShowApiKeyManager(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleGenerate = async () => {
    if (!file || !imagePreview) return;
    setLoading(true);

    try {
      const base64 = imagePreview.split(',')[1];
      const url = await generateVeoVideo(base64, prompt);
      setVideoUrl(url);
    } catch (error) {
      console.error(error);
      // If error is 404/Not Found, it might be key related. 
      // We will assume generic error for now, but in prod we would check message.
      alert("Generation failed. Ensure you have selected a valid paid API key.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
        <div className="glass-panel p-12 rounded-2xl max-w-md w-full">
            <Key className="w-12 h-12 text-pink-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-pink-100 mb-2">Access Required</h3>
            <p className="text-pink-200/60 mb-6">
                To generate high-quality video memories with Veo, you must connect your own API Key from a paid project.
            </p>
            <button
                onClick={handleSelectKey}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
                Connect API Key
            </button>
            <p className="mt-4 text-xs text-slate-400">
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Learn more about billing
                </a>
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-6">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-pink-500/30">
        <h2 className="text-3xl font-light mb-2 text-center text-pink-200">Memory Animator</h2>
        <p className="text-center text-pink-100/60 mb-8">
          Bring a still memory to life with Veo technology.
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
                 <div className={`relative aspect-video rounded-xl border-2 border-dashed ${imagePreview ? 'border-pink-500/50' : 'border-slate-700'} flex items-center justify-center bg-slate-900/40 overflow-hidden`}>
                    {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-4">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                        <p className="text-slate-400 text-sm">Upload Photo</p>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
                 <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the motion (e.g., 'The water flows gently', 'Clouds moving')"
                    className="w-full bg-slate-900/50 border border-pink-500/30 rounded-xl p-4 text-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none h-20"
                />
                 <button
                    onClick={handleGenerate}
                    disabled={!file || loading}
                    className="w-full bg-pink-600 hover:bg-pink-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-pink-600/20 flex items-center justify-center disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Film className="w-5 h-5 mr-2" /> Animate Memory</>}
                </button>
            </div>

            <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                {videoUrl ? (
                    <div className="w-full animate-float">
                        <div className="rounded-xl overflow-hidden border border-pink-400/30 shadow-2xl shadow-pink-900/50">
                            <video src={videoUrl} controls autoPlay loop className="w-full" />
                        </div>
                        <a 
                        href={videoUrl} 
                        download="memory.mp4"
                        className="block w-full text-center py-2 mt-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-pink-200 transition-colors"
                        >
                        Download Video
                        </a>
                    </div>
                ) : (
                    <div className="text-center text-slate-500/50 flex flex-col items-center">
                         {loading ? (
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Film className="w-6 h-6 text-pink-500/50" />
                                </div>
                                <p className="mt-4 text-sm text-pink-200/50">Generating video... this may take a moment.</p>
                            </div>
                         ) : (
                            <>
                                <Film className="w-12 h-12 mb-4 opacity-20" />
                                <p>Your animated memory will play here</p>
                            </>
                         )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryAnimator;