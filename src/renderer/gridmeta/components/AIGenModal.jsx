import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Zap, Settings, Play } from 'lucide-react';

export default function AIGenModal({ isOpen, onClose, onStart }) {
    const [config, setConfig] = useState({
        provider: 'gemini', // 'gemini' | 'gpt' | 'ollama'
        apiKey: '',
        model: '',
        endpoint: 'http://localhost:11434'
    });

    useEffect(() => {
        const saved = localStorage.getItem('gridmeta-ai-config');
        if (saved) {
            setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
        }
    }, []);

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveAndStart = () => {
        localStorage.setItem('gridmeta-ai-config', JSON.stringify(config));
        onStart(config);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-6">

                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-yellow-400" size={20} />
                        Auto Generate Metadata
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
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                        : 'bg-[#18181b] border-white/5 text-slate-400 hover:border-white/20'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key (Gemini/GPT/Groq) */}
                    {(config.provider === 'gemini' || config.provider === 'gpt' || config.provider === 'groq') && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Key size={12} /> API Key
                            </label>
                            <input
                                type="password"
                                value={config.apiKey}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                placeholder={`Enter ${config.provider} API Key`}
                                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                            />
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
                                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                    )}

                    {/* Model Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Cpu size={12} /> Model Name
                        </label>
                        <input
                            type="text"
                            value={config.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder={
                                config.provider === 'gemini' ? 'gemini-2.5-flash' :
                                    config.provider === 'gpt' ? 'gpt-4o' :
                                        config.provider === 'groq' ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llava'
                            }
                            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                        />
                        <p className="text-[10px] text-slate-600">Leave empty for default.</p>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSaveAndStart}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        <Play size={16} fill="currentColor" />
                        Start Batch Generation
                    </button>
                    <p className="text-[10px] text-center text-slate-600 mt-3">
                        Metadata will be generated for all loaded files.
                    </p>
                </div>

            </div>
        </div>
    );
}
