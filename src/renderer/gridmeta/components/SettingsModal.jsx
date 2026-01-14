import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, Zap, Settings, Play, Save } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSave }) {
    const [config, setConfig] = useState({
        provider: 'gemini', // 'gemini' | 'gpt' | 'ollama'
        apiKey: '',
        model: '',
        endpoint: 'http://localhost:11434',
        // Default Metadata Constraints
        titleLength: 10,
        descriptionLength: 30,
        keywordCount: 49,
        delay: 3
    });

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('gridmeta-ai-config');
            if (saved) {
                setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
        }
    }, [isOpen]);

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        localStorage.setItem('gridmeta-ai-config', JSON.stringify(config));
        onSave(config); // Optional callback if needed immediately
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">

                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-blue-500" size={20} />
                        Metadata Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <div className="space-y-4">

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                        AI Model & API Key settings have moved to the <b>App Launcher</b> (Global AI Config).
                    </div>

                    {/* Metadata Constraints */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            Metadata Constraints
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">Title Words (Max)</label>
                                <input
                                    type="number"
                                    min="5"
                                    max="50"
                                    value={config.titleLength || 10}
                                    onChange={(e) => handleChange('titleLength', parseInt(e.target.value))}
                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 text-center"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">Desc Words (Max)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="100"
                                    value={config.descriptionLength || 30}
                                    onChange={(e) => handleChange('descriptionLength', parseInt(e.target.value))}
                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 text-center"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">Keywords (Count)</label>
                                <input
                                    type="number"
                                    min="5"
                                    max="50"
                                    value={config.keywordCount || 49}
                                    onChange={(e) => handleChange('keywordCount', parseInt(e.target.value))}
                                    className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 text-center"
                                />
                            </div>
                        </div>

                        {/* Generation Delay */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Play size={12} /> Generation Delay (Seconds)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={config.delay ?? 3}
                                onChange={(e) => handleChange('delay', parseInt(e.target.value))}
                                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                            />
                            <p className="text-[10px] text-slate-600">Wait time between processing each file.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        <Save size={16} fill="currentColor" />
                        Save Settings
                    </button>
                </div>

            </div>
        </div>
    );
}
