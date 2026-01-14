import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Zap, Settings, Save, Sparkles } from 'lucide-react';

export default function GlobalAISettingsModal({ isOpen, onClose, onSave }) {
    const [config, setConfig] = useState({
        provider: 'gemini', // 'gemini' | 'gpt' | 'ollama' | 'groq'
        apiKey: '',
        model: '',
        endpoint: 'http://localhost:11434'
    });

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('global-ai-config');
            if (saved) {
                setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
        }
    }, [isOpen]);

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        localStorage.setItem('global-ai-config', JSON.stringify(config));
        if (onSave) onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">

                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={20} />
                        Global AI Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Provider</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['gemini', 'gpt', 'ollama', 'groq'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleChange('provider', p)}
                                    className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all ${config.provider === p
                                        ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                                        : 'bg-[#18181b] border-white/5 text-slate-400 hover:border-white/20'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key (Gemini/GPT/Groq) */}
                    {(config.provider === 'gemini' || config.provider === 'gpt') && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Key size={12} /> API Key
                            </label>
                            <input
                                type="password"
                                value={config.apiKey}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                placeholder={`Enter ${config.provider} API Key`}
                                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                    )}

                    {/* Groq Info Message */}
                    {config.provider === 'groq' && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex flex-col gap-1">
                            <span className="font-bold flex items-center gap-1"><Sparkles size={12} /> Managed API Keys</span>
                            <span className="opacity-80">GridVerse automatically manages high-performance keys for Groq. No manual input required.</span>
                        </div>
                    )}

                    {/* Endpoint (Ollama) */}
                    {config.provider === 'ollama' && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Settings size={12} /> Endpoint URL
                            </label>
                            <input
                                type="text"
                                value={config.endpoint}
                                onChange={(e) => handleChange('endpoint', e.target.value)}
                                placeholder="http://localhost:11434"
                                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                    )}

                    {/* Model Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Cpu size={12} /> Model Name
                        </label>
                        <select
                            value={config.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 appearance-none"
                        >
                            <option value="">Default / Recommended</option>
                            {config.provider === 'gemini' && (
                                <>
                                    <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                                    <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Experimental)</option>
                                    <option value="gemini-2.0-pro-exp">gemini-2.0-pro-exp (High Quality)</option>
                                </>
                            )}
                            {config.provider === 'gpt' && (
                                <>
                                    <option value="gpt-4o">gpt-4o (Best for Vision)</option>
                                    <option value="gpt-4o-mini">gpt-4o-mini (Fast & Cheap)</option>
                                    <option value="gpt-4-turbo">gpt-4-turbo (Legacy High Quality)</option>
                                    <option value="gpt-4-vision-preview">gpt-4-vision-preview</option>
                                </>
                            )}
                            {config.provider === 'groq' && (
                                <>
                                    <option value="meta-llama/llama-4-scout-17b-16e-instruct">Llama 4 Scout 17b (Recommended)</option>
                                    <option value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick 17b</option>
                                </>
                            )}
                            {config.provider === 'ollama' && (
                                <>
                                    <option value="llama3.2-vision">llama3.2-vision (Best Open Source)</option>
                                    <option value="llava">llava (Standard)</option>
                                    <option value="moondream">moondream (Very Fast)</option>
                                    <option value="bakllava">bakllava</option>
                                    <option value="minicpm-v">minicpm-v (High Detail)</option>
                                    <option value="llava-phi3">llava-phi3 (Efficient)</option>
                                </>
                            )}
                        </select>
                        <p className="text-[10px] text-slate-600">Select the model best suited for your needs.</p>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        <Save size={16} fill="currentColor" />
                        Save Global Settings
                    </button>
                </div>

            </div>
        </div>
    );
}
