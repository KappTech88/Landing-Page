import React, { useState } from 'react';
import { ArrowLeft, Bot, CheckSquare, Square, Loader2 } from 'lucide-react';
import { generateGrokSlogans, SloganFormData } from '../../services/grokService';

interface SloganStudioProps {
  onBack: () => void;
}

const SloganStudio: React.FC<SloganStudioProps> = ({ onBack }) => {
  const [sloganCompany, setSloganCompany] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [audiences, setAudiences] = useState<string[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [sloganPreferences, setSloganPreferences] = useState('');
  const [sloganLoading, setSloganLoading] = useState(false);
  const [sloganResult, setSloganResult] = useState<string | null>(null);

  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleGenerateSlogans = async () => {
    if (!sloganCompany) return;
    setSloganLoading(true);
    setSloganResult(null);
    try {
        const formData: SloganFormData = { companyName: sloganCompany, industries, audiences, tones, themes, styles, preferences: sloganPreferences };
        const result = await generateGrokSlogans(formData);
        setSloganResult(result);
    } catch (e) { console.error(e); } finally { setSloganLoading(false); }
  };

  const renderCheckboxGroup = (title: string, options: string[], selected: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => (
      <div className="mb-6">
          <label className="block text-teal-200 text-sm font-medium mb-3">{title}</label>
          <div className="flex flex-wrap gap-2">
              {options.map(opt => (
                  <button key={opt} onClick={() => toggleSelection(selected, setter, opt)} className={`flex items-center px-3 py-2 rounded-lg text-xs transition-all border ${selected.includes(opt) ? 'bg-teal-600 border-teal-500 text-white shadow-md' : 'bg-slate-900/50 border-teal-500/20 text-teal-300/70'}`}>
                      {selected.includes(opt) ? <CheckSquare className="w-3 h-3 mr-2" /> : <Square className="w-3 h-3 mr-2 opacity-50" />}{opt}
                  </button>
              ))}
          </div>
      </div>
  );

  return (
    <div className="animate-fadeIn glass-panel rounded-2xl shadow-2xl border border-teal-500/30 overflow-hidden min-h-[700px]">
        <div className="bg-slate-900/40 border-b border-teal-500/20 p-6 flex items-center justify-between">
            <button onClick={onBack} className="flex items-center text-teal-400 hover:text-teal-300 transition-colors text-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Back</button>
            <h2 className="text-2xl font-light text-teal-200 tracking-wide">SLOGAN CREATION</h2>
            <div className="w-16"></div>
        </div>
        <div className="p-8 grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                <div><label className="block text-teal-200 text-sm font-medium mb-2">Company Name *</label><input value={sloganCompany} onChange={e => setSloganCompany(e.target.value)} className="w-full bg-slate-900/50 border border-teal-500/30 rounded-lg p-3 text-teal-100" placeholder="Estimate Reliance" /></div>
                {renderCheckboxGroup("Industry", ['Technology', 'Food & Beverage', 'Health', 'Fashion', 'Finance', 'Education'], industries, setIndustries)}
                {renderCheckboxGroup("Tone", ['Fun', 'Professional', 'Edgy', 'Bold', 'Friendly'], tones, setTones)}
                <textarea value={sloganPreferences} onChange={e => setSloganPreferences(e.target.value)} placeholder="Preferences..." className="w-full bg-slate-900/50 border border-teal-500/30 rounded-lg p-3 text-teal-100 h-24" />
                <button onClick={handleGenerateSlogans} disabled={!sloganCompany || sloganLoading} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-4 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50">{sloganLoading ? <Loader2 className="animate-spin" /> : "Generate with Grok"}</button>
            </div>
            <div className="h-full min-h-[500px] bg-slate-950/60 rounded-xl border border-teal-500/30 p-8 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Bot className="w-32 h-32 text-teal-500" /></div>
                <h3 className="text-teal-400 text-sm font-bold tracking-widest uppercase mb-6">Grok Output</h3>
                {sloganResult ? <div className="text-teal-100 whitespace-pre-wrap font-mono">{sloganResult}</div> : <div className="text-teal-500/30 flex-grow flex items-center justify-center"><Bot className="w-12 h-12 opacity-50" /></div>}
            </div>
        </div>
    </div>
  );
};
export default SloganStudio;