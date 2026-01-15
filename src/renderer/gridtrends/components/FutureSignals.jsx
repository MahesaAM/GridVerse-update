import React, { useState, useEffect } from 'react';
import { Telescope, Calendar, Sparkles, Loader2, X, Copy, Check, Lightbulb, Play } from 'lucide-react';

const FutureSignals = () => {
    // Data State
    const [predictions, setPredictions] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);

    // Prompt Generation Modal State
    const [promptModalOpen, setPromptModalOpen] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedContext, setSelectedContext] = useState(''); // Extra context like "Visual Cues"
    const [promptCount, setPromptCount] = useState(3);
    const [generatedPrompts, setGeneratedPrompts] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Default Fallback
    const defaultPredictions = [
        { title: "Nostalgic Y2K Futurism", desc: "Perpaduan visual tahun 2000an dengan teknologi masa kini.", confidence: 95 },
        { title: "Sustainable Luxury", desc: "Visual kemewahan tapi dengan elemen alam dan daur ulang.", confidence: 88 }
    ];

    const defaultEvents = [
        { date: "Coming Soon", event: "AI Analysis Required", niche: "Connect Groq API" }
    ];

    useEffect(() => {
        const savedData = localStorage.getItem('gridtrends_future_radar');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.predictions && parsed.predictions.length > 0) {
                    setPredictions(parsed.predictions);
                    setEvents(parsed.events || []);
                    return;
                }
            } catch (e) {
                console.error("Failed to load saved radar data", e);
            }
        }
        analyzePredictions();
    }, []);

    const analyzePredictions = async () => {
        setLoading(true);
        try {
            const globalConfig = JSON.parse(localStorage.getItem('global-ai-config') || '{}');
            const provider = globalConfig.provider || 'gemini';
            let apiKey = globalConfig.apiKey;

            if (provider === 'groq') {
                const storedKeys = localStorage.getItem('groq_api_keys');
                if (storedKeys) {
                    try {
                        const keys = JSON.parse(storedKeys);
                        if (keys.length > 0) apiKey = keys[Math.floor(Math.random() * keys.length)];
                    } catch (e) { }
                }
            }

            if (apiKey) {
                const stocks = await window.electron.ipcRenderer.invoke('gridtrends:get-stock-trends');
                const result = await window.electron.ipcRenderer.invoke('gridtrends:predict-trends', {
                    trends: stocks,
                    apiKey: apiKey
                });

                let newPredictions = result.predictions?.length > 0 ? result.predictions : defaultPredictions;
                let newEvents = result.upcoming_events?.length > 0 ? result.upcoming_events : defaultEvents;

                setPredictions(newPredictions);
                setEvents(newEvents);

                localStorage.setItem('gridtrends_future_radar', JSON.stringify({
                    predictions: newPredictions,
                    events: newEvents,
                    timestamp: Date.now()
                }));
            } else {
                setPredictions(defaultPredictions);
                setEvents(defaultEvents);
            }
        } catch (e) {
            console.error("Prediction failed:", e);
            setPredictions(defaultPredictions);
            setEvents(defaultEvents);
        } finally {
            setLoading(false);
        }
    };

    const openPromptModal = (title, context = '') => {
        setSelectedTopic(title);
        setSelectedContext(context);
        setGeneratedPrompts([]);
        setPromptCount(3);
        setPromptModalOpen(true);
    };

    const handleGeneratePrompts = async () => {
        if (!selectedTopic) return;
        setIsGenerating(true);
        setGeneratedPrompts([]);

        try {
            const globalConfig = JSON.parse(localStorage.getItem('global-ai-config') || '{}');
            let apiKey = globalConfig.apiKey;
            const provider = globalConfig.provider || 'gemini';

            if (provider === 'groq') {
                const storedKeys = localStorage.getItem('groq_api_keys');
                if (storedKeys) {
                    try {
                        const keys = JSON.parse(storedKeys);
                        if (keys.length > 0) apiKey = keys[Math.floor(Math.random() * keys.length)];
                    } catch (e) { }
                }
            }

            if (!apiKey) {
                alert("Please configure API Key first.");
                setIsGenerating(false);
                return;
            }

            // Combine topic with context for better results
            const fullTopic = selectedContext ? `${selectedTopic} (${selectedContext})` : selectedTopic;
            const style = "Commercial Stock Photography, High Conversion, Midjourney v6 Style";

            const prompts = await window.electron.ipcRenderer.invoke('gridtrends:generate-prompts', {
                topic: fullTopic,
                style,
                count: promptCount,
                apiKey
            });

            setGeneratedPrompts(prompts);
        } catch (error) {
            console.error("Gen failed:", error);
            alert("Failed to generate prompts.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleCopyAll = () => {
        if (generatedPrompts.length === 0) return;
        // Copy ONLY the prompts, separated by double newline
        const allText = generatedPrompts.map(p => p.prompt).join('\n\n');
        navigator.clipboard.writeText(allText);
        setCopiedIndex('all');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleSaveTxt = () => {
        if (generatedPrompts.length === 0) return;
        // Save ONLY the prompts
        const allText = generatedPrompts.map(p => p.prompt).join('\n\n');
        const blob = new Blob([allText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gridtrends-prompts-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-8 relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Future Radar</h2>
                    <p className="text-slate-400 text-sm">Intip masa depan: Prediksi Tren & Jadwal Event Global.</p>
                </div>
                <button
                    onClick={analyzePredictions}
                    disabled={loading}
                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-purple-500/30 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {loading ? 'Forecasting...' : 'Re-Forecast AI'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Predictions Column */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Telescope className="w-5 h-5 text-purple-400" />
                        Prediksi Tema (Next Big Thing)
                    </h3>
                    <div className="space-y-4">
                        {(predictions.length > 0 ? predictions : defaultPredictions).map((item, i) => (
                            <div key={i} className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 hover:border-purple-500/30 transition-colors group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-200 group-hover:text-purple-400 transition-colors">{item.title}</h4>
                                    <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg">
                                        {item.confidence || item.conviction}% Conviction
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed mb-3">{item.desc || item.description}</p>

                                <button
                                    onClick={() => openPromptModal(item.title, item.description)}
                                    className="text-xs flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold transition-colors bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 hover:bg-purple-500/20"
                                >
                                    <Sparkles className="w-3 h-3" /> Generate Prompts
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Events Schedule Column */}
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-cyan-400" />
                        Jadwal Event & Strategi Konten
                    </h3>
                    <div className="relative border-l border-slate-800 ml-3 space-y-10 py-2">
                        {(events.length > 0 ? events : defaultEvents).map((item, i) => (
                            <div key={i} className="relative pl-8 group">
                                <div className="absolute -left-[5px] top-6 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)] group-hover:scale-125 transition-transform" />

                                <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 hover:border-cyan-500/30 transition-all hover:bg-[#131d33] shadow-lg">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                                        <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-900/50 self-start">
                                            {item.date}
                                        </span>
                                        <h4 className="text-lg font-bold text-white">{item.event}</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                                            <p className="text-sm text-slate-300 leading-relaxed mb-2">{item.strategy || "Analisis strategi konten..."}</p>
                                            <button
                                                onClick={() => openPromptModal(`${item.event} - ${item.niche}`, `${item.visual_cues} ${item.keywords}`)}
                                                className="w-full mt-2 text-xs flex items-center justify-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold transition-colors bg-cyan-500/10 px-3 py-2 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/20"
                                            >
                                                <Sparkles className="w-3 h-3" /> Create Best-Selling Prompts
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Visual Cues</div>
                                                <p className="text-xs text-slate-400">{item.visual_cues || item.niche}</p>
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Keywords</div>
                                                <p className="text-xs text-cyan-400/80 font-mono">{item.keywords || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* GENERATE PROMPT MODAL */}
            {promptModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0F172A] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-cyan-400" /> Generate Prompts
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">{selectedTopic}</p>
                            </div>
                            <button
                                onClick={() => setPromptModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="flex items-center gap-4 mb-6">
                                <label className="text-sm font-semibold text-slate-400">Jumlah Prompt:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={promptCount}
                                        onChange={(e) => setPromptCount(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-center focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                                <button
                                    onClick={handleGeneratePrompts}
                                    disabled={isGenerating}
                                    className="ml-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all font-mono tracking-wide"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                    {isGenerating ? 'Generating...' : 'Generate Now'}
                                </button>
                            </div>

                            {/* Results */}
                            {generatedPrompts.length > 0 ? (
                                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex gap-3 justify-end mb-2">
                                        <button
                                            onClick={handleCopyAll}
                                            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                                        >
                                            {copiedIndex === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copiedIndex === 'all' ? 'Copied All' : 'Copy All'}
                                        </button>
                                        <button
                                            onClick={handleSaveTxt}
                                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/20 rounded-lg hover:bg-cyan-900/40 transition-colors border border-cyan-700/30"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Save .txt
                                        </button>
                                    </div>
                                    {generatedPrompts.map((item, idx) => (
                                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 group hover:border-cyan-500/30 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{item.type}</span>
                                                <button
                                                    onClick={() => handleCopy(item.prompt, idx)}
                                                    className="text-slate-400 hover:text-white transition-colors p-1"
                                                >
                                                    {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <p className="text-slate-300 text-sm font-mono leading-relaxed mb-3">{item.prompt}</p>
                                            {item.tips && (
                                                <div className="flex items-start gap-2 text-xs text-slate-500 italic bg-slate-950/50 p-2 rounded">
                                                    <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 shrink-0" />
                                                    <span>{item.tips}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                !isGenerating && (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                                        <Sparkles className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">Klik "Generate Now" untuk membuat prompt.</p>
                                    </div>
                                )
                            )}

                            {isGenerating && (
                                <div className="text-center py-12">
                                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-400 animate-pulse">Meracik prompt visual terbaik...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FutureSignals;
