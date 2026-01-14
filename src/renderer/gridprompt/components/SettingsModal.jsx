import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Database, History, Key } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        maxImages: 50,
        minImageWidth: 50,
        minImageHeight: 50,
        geminiApiKey: '',
        promptTemplate: 'Describe this image in detail for an AI art generator.',
        history: []
    });
    const [expandedHistoryIndex, setExpandedHistoryIndex] = useState(null);

    useEffect(() => {
        // Load settings from localStorage
        const saved = localStorage.getItem('gridprompt-settings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('gridprompt-settings', JSON.stringify(settings));
        if (onSave) onSave(settings);
        onClose();
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-950/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="text-blue-500" /> Settings
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-950 p-2 gap-2 border-b border-white/5">
                    <TabButton
                        active={activeTab === 'general'}
                        icon={<Database size={16} />}
                        label="General"
                        onClick={() => setActiveTab('general')}
                    />
                    <TabButton
                        active={activeTab === 'ai'}
                        icon={<Key size={16} />}
                        label="AI & Access"
                        onClick={() => setActiveTab('ai')}
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        icon={<History size={16} />}
                        label="History"
                        onClick={() => setActiveTab('history')}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900">

                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Max Images to Scrape</label>
                                <input
                                    type="number"
                                    value={settings.maxImages}
                                    onChange={(e) => handleChange('maxImages', parseInt(e.target.value))}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                />
                                <p className="text-xs text-slate-500">Limits the number of images shown in the sidebar to prevent lag.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Min Image Width (px)</label>
                                    <input
                                        type="number"
                                        value={settings.minImageWidth}
                                        onChange={(e) => handleChange('minImageWidth', parseInt(e.target.value))}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Min Image Height (px)</label>
                                    <input
                                        type="number"
                                        value={settings.minImageHeight}
                                        onChange={(e) => handleChange('minImageHeight', parseInt(e.target.value))}
                                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Tab */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Gemini API Key</label>
                                <input
                                    type="password"
                                    value={settings.geminiApiKey}
                                    onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                                    placeholder="Enter your Google Gemini API Key"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none font-mono"
                                />
                                <p className="text-xs text-slate-500">Required for "Start Generate" image-to-text processing.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Default Prompt Template</label>
                                <textarea
                                    rows={4}
                                    value={settings.promptTemplate}
                                    onChange={(e) => handleChange('promptTemplate', e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none resize-none"
                                    placeholder="e.g., Describe this image..."
                                />
                            </div>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {settings.history && settings.history.length > 0 ? (
                                settings.history.map((item, idx) => (
                                    <div key={idx} className="bg-black/20 p-3 rounded-lg border border-white/5 transition-all hover:border-white/10">
                                        <div
                                            className="flex justify-between items-center cursor-pointer select-none"
                                            onClick={() => setExpandedHistoryIndex(expandedHistoryIndex === idx ? null : idx)}
                                        >
                                            <div className="flex-1 min-w-0 mr-4">
                                                <div className="text-xs text-slate-500 mb-1">{new Date(item.date).toLocaleString()}</div>
                                                <div className="text-sm text-slate-300 font-medium truncate">{item.summary}</div>
                                            </div>
                                            <div className="text-slate-500 text-xs shrink-0 bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-colors">
                                                {expandedHistoryIndex === idx ? 'Collapse' : 'Details'}
                                            </div>
                                        </div>

                                        {expandedHistoryIndex === idx && item.details && (
                                            <div className="mt-3 pt-3 border-t border-white/10 space-y-4 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {item.details.map((detail, dIdx) => (
                                                    <div key={dIdx} className="text-xs space-y-1.5">
                                                        <div className="flex items-center gap-2 text-slate-400">
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${detail.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                            <span className="truncate opacity-70" title={detail.url}>{detail.url}</span>
                                                        </div>
                                                        {detail.generatedPrompt && (
                                                            <div className="text-slate-300 bg-black/40 p-2.5 rounded border border-white/5 whitespace-pre-wrap select-text font-mono text-[11px] leading-relaxed">
                                                                {detail.generatedPrompt}
                                                            </div>
                                                        )}
                                                        {detail.error && (
                                                            <div className="text-red-400 bg-red-900/10 p-2 rounded border border-red-500/10 select-text">
                                                                Error: {detail.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 py-10">
                                    <History size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No generation history yet.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-slate-950/50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
