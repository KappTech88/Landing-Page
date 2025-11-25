import React, { useState, useEffect } from 'react';
import { Key, Save, Check, AlertCircle, X } from 'lucide-react';

export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'grok' | 'cohere' | 'mistral' | 'perplexity';

export interface ApiKeyConfig {
  provider: LLMProvider;
  apiKey: string;
}

interface ApiKeyManagerProps {
  onClose?: () => void;
  onSave?: (config: ApiKeyConfig) => void;
}

const LLM_PROVIDERS = [
  { id: 'gemini' as LLMProvider, name: 'Google Gemini', placeholder: 'AIzaSy...' },
  { id: 'openai' as LLMProvider, name: 'OpenAI (GPT-4, GPT-3.5)', placeholder: 'sk-...' },
  { id: 'anthropic' as LLMProvider, name: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'grok' as LLMProvider, name: 'xAI (Grok)', placeholder: 'xai-...' },
  { id: 'cohere' as LLMProvider, name: 'Cohere', placeholder: 'cohere-...' },
  { id: 'mistral' as LLMProvider, name: 'Mistral AI', placeholder: 'mistral-...' },
  { id: 'perplexity' as LLMProvider, name: 'Perplexity AI', placeholder: 'pplx-...' },
];

const STORAGE_KEY = 'estimate-reliance-api-config';

export const getStoredApiConfig = (): ApiKeyConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveApiConfig = (config: ApiKeyConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearApiConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onClose, onSave }) => {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const config = getStoredApiConfig();
    if (config) {
      setSelectedProvider(config.provider);
      setApiKey(config.apiKey);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    const config: ApiKeyConfig = {
      provider: selectedProvider,
      apiKey: apiKey.trim(),
    };

    saveApiConfig(config);
    setSaved(true);
    setError('');

    if (onSave) {
      onSave(config);
    }

    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearApiConfig();
    setApiKey('');
    setError('');
    setSaved(false);
  };

  const currentProvider = LLM_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-panel-strong rounded-2xl shadow-2xl border border-emerald-500/30 max-w-2xl w-full overflow-hidden animate-fadeInScale">
        {/* Header */}
        <div className="bg-slate-950/60 border-b border-emerald-500/20 p-6 flex items-center justify-between">
          <div className="flex items-center">
            <Key className="w-6 h-6 text-emerald-400 mr-3" />
            <h2 className="text-2xl font-light text-emerald-100 tracking-wide">Configure LLM API</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-emerald-200 text-sm font-medium mb-3">
              Select LLM Provider
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as LLMProvider)}
              className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4 text-emerald-100 appearance-none cursor-pointer hover:border-emerald-500/50 transition-colors"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2310b981'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                backgroundSize: '1.5rem',
              }}
            >
              {LLM_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-emerald-200 text-sm font-medium mb-3">
              API Key for {currentProvider?.name}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder={currentProvider?.placeholder}
              className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4 text-emerald-100 placeholder-slate-500 focus:border-emerald-500/60 focus:outline-none transition-colors"
            />
            <p className="text-xs text-slate-400 mt-2">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {saved && (
            <div className="flex items-center p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm animate-fadeIn">
              <Check className="w-4 h-4 mr-2 flex-shrink-0" />
              API configuration saved successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-6 rounded-lg transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg transition-all"
            >
              Clear
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-emerald-300 mb-2">Getting Started</h3>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Select your preferred LLM provider from the dropdown</li>
              <li>• Enter your API key (obtain from provider's dashboard)</li>
              <li>• Click "Save Configuration" to start using the service</li>
              <li>• Your key is stored securely in your browser's local storage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;
