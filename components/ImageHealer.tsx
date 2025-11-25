import React, { useState } from 'react';
import { Upload, Wand2, Loader2, ArrowRight } from 'lucide-react';
import { editImage } from '../services/geminiService';

const ImageHealer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);

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

  const handleHeal = async () => {
    if (!file || !prompt || !imagePreview) return;
    setLoading(true);

    try {
      const base64 = imagePreview.split(',')[1];
      const result = await editImage(base64, prompt, file.type);
      setEditedImage(result);
    } catch (error) {
      console.error(error);
      alert("Healing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-6">
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-purple-500/30">
        <h2 className="text-3xl font-light mb-2 text-center text-purple-200">Cosmic Image Healer</h2>
        <p className="text-center text-purple-100/60 mb-8">
          Upload an image and describe how you want to transform it. <br/>
          <span className="text-xs italic">"Remove the person in the background", "Add a retro filter", "Make it look like Mars"</span>
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Input Section */}
          <div className="space-y-6">
            <div className={`relative aspect-square rounded-xl border-2 border-dashed ${imagePreview ? 'border-purple-500/50' : 'border-slate-700'} flex items-center justify-center bg-slate-900/40 overflow-hidden group`}>
              {imagePreview ? (
                <img src={imagePreview} alt="Original" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-slate-400 text-sm">Upload Image</p>
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
              placeholder="How should we heal this image?"
              className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl p-4 text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-24"
            />

            <button
              onClick={handleHeal}
              disabled={!file || !prompt || loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5 mr-2" /> Heal Image</>}
            </button>
          </div>

          {/* Output Section */}
          <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
             {editedImage ? (
               <div className="space-y-4 w-full animate-twinkle">
                 <div className="aspect-square rounded-xl overflow-hidden border border-purple-400/30 shadow-2xl shadow-purple-900/50">
                   <img src={editedImage} alt="Healed" className="w-full h-full object-cover" />
                 </div>
                 <a 
                   href={editedImage} 
                   download="healed-memory.png"
                   className="block w-full text-center py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-purple-200 transition-colors"
                 >
                   Download
                 </a>
               </div>
             ) : (
               <div className="text-center text-slate-500/50 flex flex-col items-center">
                 {loading ? (
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Wand2 className="w-6 h-6 text-purple-500/50" />
                        </div>
                    </div>
                 ) : (
                    <>
                        <ArrowRight className="w-12 h-12 mb-4 opacity-20" />
                        <p>Your healed image will appear here</p>
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

export default ImageHealer;