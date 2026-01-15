import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, Lightbulb, Loader2 } from 'lucide-react';

const PromptGenerator = () => {
    const [topics, setTopics] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [customTopic, setCustomTopic] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('Cinematic Photorealistic');
    const [generatedPrompts, setGeneratedPrompts] = useState([]); // Array of prompts
    const [loading, setLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Load "Next Big Thing" topics from LocalStorage (saved by FutureSignals)
    useEffect(() => {
        const loadTopics = () => {
            const savedRadar = localStorage.getItem('gridtrends_future_radar');
            if (savedRadar) {
                try {
                    const data = JSON.parse(savedRadar);
                    // Extract predictions titles and upcoming events
                    const predictionTopics = data.predictions?.map(p => p.title) || [];
                    const eventTopics = data.upcoming_events?.map(e => `${e.event} (${e.niche})`) || [];

                    const allTopics = [...new Set([...predictionTopics, ...eventTopics])];
                    setTopics(allTopics);
                } catch (e) {
                    console.error("Failed to load topics", e);
                }
            }
        };
        loadTopics();
    }, []);

    const handleGenerate = async () => {
        const topic = customTopic || selectedTopic;
        if (!topic) return;

        setLoading(true);
        setGeneratedPrompts([]);

        try {
            // Get API Key Reuse Logic
            const globalConfig = JSON.parse(localStorage.getItem('global-ai-config') || '{}');
            let apiKey = globalConfig.apiKey;
            const provider = globalConfig.provider || 'gemini';

            if (provider === 'groq') {
                const storedKeys = localStorage.getItem('groq_api_keys');
                if (storedKeys) {
                    try {
                        const keys = JSON.parse(storedKeys);
                        if (keys.length > 0) apiKey = keys[Math.floor(Math.random() * keys.length)];
                    } catch (e) { console.error(e); }
                }
            }

            if (!apiKey) {
                alert("Please configure API Key in settings first.");
                setLoading(false);
                return;
            }

            const prompts = await window.electron.ipcRenderer.invoke('gridtrends:generate-prompts', {
                topic,
                style: selectedStyle,
                apiKey
            });

            setGeneratedPrompts(prompts);

        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate prompts. Check console.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 to-blue-700 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-slate-700">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Prompt Generator Intelligence</h2>
                <p className="text-slate-400">Transform Market Insights into High-Converting Midjourney V6 Prompts.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Topic Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Lightbulb className="w-3 h-3 text-yellow-400" /> Source Topic (Next Big Thing)
                        </label>
                        <select
                            className="w-full bg-[#0F172A] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors mb-3"
                            value={selectedTopic}
                            onChange={(e) => { setSelectedTopic(e.target.value); setCustomTopic(''); }}
                        >
                            <option value="">-- Select from Predicted Trends --</option>
                            {topics.map((t, i) => <option key={i} value={t}>{t}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder="Or type custom topic..."
                            className="w-full bg-[#0F172A] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                            value={customTopic}
                            onChange={(e) => { setCustomTopic(e.target.value); setSelectedTopic(''); }}
                        />
                    </div>

                    {/* Style Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Visual Style</label>
                        <select
                            className="w-full bg-[#0F172A] border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value)}
                        >
                            <option>Cinematic Photorealistic (High End)</option>
                            <option>Commercial Stock Photography (Clean)</option>
                            <option>Editorial Lifestyle (Authentic)</option>
                            <option>3D Isometric Render (Tech)</option>
                            <option>Abstract Data Visualization</option>
                            <option>Dark Mode Neon (Cyberpunk)</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={(!selectedTopic && !customTopic) || loading}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-900/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Generating AI Prompts...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" /> Generate 3 Variations
                        </>
                    )}
                </button>
            </div>

            {/* Results Area */}
            {generatedPrompts.length > 0 && (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {generatedPrompts.map((item, idx) => (
                        <div key={idx} className="bg-[#0F172A] border border-cyan-500/20 rounded-xl p-6 relative group hover:border-cyan-500/40 transition-colors">
                            <div className="absolute top-4 right-4">
                                <button
                                    onClick={() => handleCopy(item.prompt, idx)}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700 flex items-center gap-2"
                                >
                                    {copiedIndex === idx ? (
                                        <><Check className="w-4 h-4 text-emerald-400" /> <span className="text-xs text-emerald-400 font-bold">Copied</span></>
                                    ) : (
                                        <><Copy className="w-4 h-4" /> <span className="text-xs">Copy</span></>
                                    )}
                                </button>
                            </div>

                            <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                                {item.type}
                            </h3>

                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-3 font-mono text-sm text-slate-300 leading-relaxed selection:bg-cyan-900 selection:text-white">
                                {item.prompt}
                            </div>

                            {item.tips && (
                                <div className="flex items-start gap-2 text-xs text-slate-500 italic">
                                    <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500" />
                                    <span>Pro Tip: {item.tips}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PromptGenerator;
