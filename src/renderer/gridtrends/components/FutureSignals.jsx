import React, { useState, useEffect } from 'react';
import { Telescope, Calendar, Sparkles, Loader2, X, Copy, Check, Lightbulb, Play, MessageCircle, Send, Bot, User, ArrowLeft, ArrowRight } from 'lucide-react';

const FutureSignals = () => {
    // Data State
    const [predictions, setPredictions] = useState([]);
    const [events, setEvents] = useState([]);
    const [aiEvents, setAiEvents] = useState([]); // Major AI/Manual events for Timeline
    const [loading, setLoading] = useState(false);

    // Prompt Generation Modal State
    const [promptModalOpen, setPromptModalOpen] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedContext, setSelectedContext] = useState(''); // Extra context like "Visual Cues"
    const [promptCount, setPromptCount] = useState(3);
    const [generatedPrompts, setGeneratedPrompts] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Chat State
    const [chatOpen, setChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([
        { role: 'system', content: "Halo! Saya GridMentor. Ada yang bisa saya bantu tentang strategi microstock hari ini?" }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    // Calendar State
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
    const [calendarDate, setCalendarDate] = useState(new Date());

    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const changeMonth = (offset) => {
        setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1));
    };

    // Default Fallback
    const defaultPredictions = [
        { title: "Nostalgic Y2K Futurism", desc: "Perpaduan visual tahun 2000an dengan teknologi masa kini.", confidence: 95 },
        { title: "Sustainable Luxury", desc: "Visual kemewahan tapi dengan elemen alam dan daur ulang.", confidence: 88 }
    ];

    // Default Major Events (Fallback)
    const defaultMajorEvents = [
        {
            date: new Date().toISOString().split('T')[0],
            event: "AI Market Analysis",
            niche: "General",
            strategy: "Analyze current market trends.",
            visual_cues: "Data visualization",
            keywords: "analysis, ai, trends",
            isMajor: true
        },
        {
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            event: "Content Planning",
            niche: "Stock Photography",
            strategy: "Plan upcoming photoshoots.",
            visual_cues: "Calendar, planning",
            keywords: "planning, schedule",
            isMajor: true
        }
    ];

    // Generate Holiday Events Only (No Daily Fillers)
    const generateMonthEvents = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const generated = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = i.toString().padStart(2, '0');
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayStr}`;

            // Add Holidays (if any)
            const holidays = getHolidaysForDate(month + 1, i);
            holidays.forEach(h => {
                generated.push({
                    date: dateStr,
                    event: h.name,
                    niche: "Holiday / Observance",
                    strategy: `Create content relevant to ${h.name}.`,
                    visual_cues: "Festive, celebratory, thematic",
                    keywords: `${h.name.toLowerCase()}, holiday, celebration`,
                    isMajor: true, // Tag as Major so they show in List View too
                    isHoliday: true
                });
            });
        }
        return generated;
    };

    // Static Holiday Database (Month is 1-indexed)
    const getHolidaysForDate = (month, day) => {
        const holidays = [
            // January
            { m: 1, d: 1, name: "New Year's Day" },
            { m: 1, d: 25, name: "Hari Gizi Nasional" },
            // February
            { m: 2, d: 14, name: "Valentine's Day" },
            { m: 2, d: 21, name: "Hari Peduli Sampah Nasional" },
            // March
            { m: 3, d: 8, name: "International Women's Day" },
            { m: 3, d: 30, name: "Hari Film Nasional" },
            // April
            { m: 4, d: 21, name: "Hari Kartini" },
            { m: 4, d: 22, name: "Earth Day" },
            // May
            { m: 5, d: 1, name: "Labor Day" },
            { m: 5, d: 2, name: "Hari Pendidikan Nasional" },
            { m: 5, d: 20, name: "Hari Kebangkitan Nasional" },
            // June
            { m: 6, d: 1, name: "Hari Lahir Pancasila" },
            { m: 6, d: 21, name: "Father's Day (Global)" },
            // July
            { m: 7, d: 23, name: "Hari Anak Nasional" },
            // August
            { m: 8, d: 17, name: "Hari Kemerdekaan RI (Independence Day)" },
            // September
            { m: 9, d: 9, name: "Hari Olahraga Nasional" },
            // October
            { m: 10, d: 2, name: "Hari Batik Nasional" },
            { m: 10, d: 28, name: "Hari Sumpah Pemuda" },
            { m: 10, d: 31, name: "Halloween" },
            // November
            { m: 11, d: 10, name: "Hari Pahlawan" },
            { m: 11, d: 12, name: "Hari Ayah Nasional" },
            { m: 11, d: 25, name: "Hari Guru Nasional" },
            // December
            { m: 12, d: 22, name: "Hari Ibu" },
            { m: 12, d: 25, name: "Christmas Day" }
        ];
        return holidays.filter(h => h.m === month && h.d === day);
    };

    const defaultEvents = generateMonthEvents(new Date());

    // Generate Holiday Events
    useEffect(() => {
        // Generate holiday events
        const dailyEvents = generateMonthEvents(calendarDate);

        // Combine Holidays + Major AI Events
        const combined = [...dailyEvents, ...aiEvents];
        setEvents(combined);

    }, [calendarDate, aiEvents]);

    useEffect(() => {
        const savedData = localStorage.getItem('gridtrends_future_radar');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.predictions && parsed.predictions.length > 0) {
                    setPredictions(parsed.predictions);
                    // Check if saved events match current month? 
                    // If user wants specific daily events for the VIEWED month, we should probably generate them on the fly
                    // and maybe merge the "high impact" AI events.
                    // For now, let's load predictions but let the calendar effect handle the event population for full density.
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
                let newEventsRaw = result.upcoming_events?.length > 0 ? result.upcoming_events : defaultMajorEvents;

                // Ensure newEvents have isMajor flag
                const newAiEvents = newEventsRaw.map(e => ({ ...e, isMajor: true }));

                setPredictions(newPredictions);
                setAiEvents(newAiEvents); // Set Major Events

                localStorage.setItem('gridtrends_future_radar', JSON.stringify({
                    predictions: newPredictions,
                    events: newAiEvents,
                    timestamp: Date.now()
                }));
            } else {
                setPredictions(defaultPredictions);
                setAiEvents(defaultMajorEvents);
            }
        } catch (e) {
            console.error("Prediction failed:", e);
            setPredictions(defaultPredictions);
            setAiEvents(defaultMajorEvents);
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

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatting) return;

        const userMsg = { role: 'user', content: chatInput };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatting(true);

        try {
            const globalConfig = JSON.parse(localStorage.getItem('global-ai-config') || '{}');
            let apiKey = globalConfig.apiKey;

            // Try to use Groq key if available
            const storedKeys = localStorage.getItem('groq_api_keys');
            if (storedKeys) {
                try {
                    const keys = JSON.parse(storedKeys);
                    if (keys.length > 0) apiKey = keys[Math.floor(Math.random() * keys.length)];
                } catch (e) { }
            }

            if (!apiKey) {
                setChatHistory(prev => [...prev, { role: 'assistant', content: "Please configure API Key first." }]);
                setIsChatting(false);
                return;
            }

            const context = {
                predictions: predictions,
                events: events
            };

            // Only send last 10 messages to keep context light
            const historyToSend = chatHistory.slice(-10).filter(m => m.role !== 'system');
            historyToSend.push(userMsg);

            const result = await window.electron.ipcRenderer.invoke('gridtrends:chat-discussion', {
                history: historyToSend,
                context,
                apiKey
            });

            setChatHistory(prev => [...prev, { role: 'assistant', content: result.content }]);

        } catch (error) {
            console.error("Chat Error:", error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Maaf, terjadi kesalahan pada koneksi." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <div className="p-8 relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Future Radar</h2>
                    <p className="text-slate-400 text-sm">Intip masa depan: Prediksi Tren & Jadwal Event Global.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setChatOpen(true)}
                        className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-indigo-500/30 flex items-center gap-2"
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Discuss Trends
                    </button>
                    <button
                        onClick={analyzePredictions}
                        disabled={loading}
                        className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-purple-500/30 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {loading ? 'Forecasting...' : 'Re-Forecast AI'}
                    </button>
                </div>
            </div>

            {/* Toolbar & View Toggle */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        List View
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Calendar View
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Predictions Column (Always Visible) */}
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

                                {(item.commercial_advice || item.technical_tips) && (
                                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 mb-3 space-y-2">
                                        {item.commercial_advice && (
                                            <div className="flex gap-2 items-start">
                                                <div className="mt-0.5 min-w-[16px]"><Lightbulb className="w-3.5 h-3.5 text-yellow-500" /></div>
                                                <p className="text-xs text-slate-300"><span className="font-semibold text-yellow-500/80">Pro Tip:</span> {item.commercial_advice}</p>
                                            </div>
                                        )}
                                        {item.technical_tips && (
                                            <div className="flex gap-2 items-start">
                                                <div className="mt-0.5 min-w-[16px]"><div className="w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center text-[8px] text-slate-400">T</div></div>
                                                <p className="text-xs text-slate-400"><span className="font-semibold text-slate-500">Tech:</span> {item.technical_tips}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

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

                {/* Events Schedule Column (List or Calendar) */}
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-cyan-400" />
                        Jadwal & Strategi - {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>

                    {viewMode === 'list' ? (
                        <div className="relative border-l border-slate-800 ml-3 space-y-10 py-2">
                            {(events.filter(e => e.isMajor && e.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`)).length > 0
                                ? events.filter(e => e.isMajor && e.date.startsWith(`${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}`))
                                : defaultMajorEvents
                            ).map((item, i) => (
                                <div key={i} className="relative pl-8 group">
                                    <div className="absolute -left-[5px] top-6 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)] group-hover:scale-125 transition-transform" />

                                    <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 hover:border-cyan-500/30 transition-all hover:bg-[#131d33] shadow-lg">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                                            <span className="text-xs font-bold text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-900/50 self-start">
                                                {item.date}
                                            </span>
                                            <h4 className="text-lg font-bold text-white">{item.event}</h4>
                                        </div>

                                        {/* Strategy Box */}
                                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 mb-3 space-y-3">
                                            <div>
                                                <div className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">Content Strategy</div>
                                                <p className="text-xs text-slate-300 leading-relaxed">{item.strategy || "Analisis strategi konten..."}</p>
                                            </div>
                                            {item.buyer_needs && (
                                                <div className="pt-2 border-t border-slate-800/50">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Buyer Needs</div>
                                                    <p className="text-xs text-slate-400 italic">"{item.buyer_needs}"</p>
                                                </div>
                                            )}
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
                            ))}
                        </div>
                    ) : (
                        // CALENDAR VIEW
                        <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden p-4">
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h4 className="text-lg font-bold text-white">
                                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </h4>
                                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="text-xs font-bold text-slate-500 uppercase py-1">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: getFirstDayOfMonth(calendarDate) }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: getDaysInMonth(calendarDate) }).map((_, i) => {
                                    const day = i + 1;
                                    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    // Calendar ONLY shows Holidays (National/International)
                                    const dayEvents = events.filter(e => e.date && e.date.includes(dateStr) && e.isHoliday);

                                    return (
                                        <div key={day} className={`min-h-[80px] border border-slate-800 rounded-lg p-1.5 relative ${dayEvents.length > 0 ? 'bg-slate-900' : 'bg-slate-950/50'}`}>
                                            <span className={`text-xs font-bold block mb-1 ${dayEvents.length > 0 ? 'text-white' : 'text-slate-600'}`}>{day}</span>

                                            <div className="space-y-1">
                                                {dayEvents.map((ev, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="group relative cursor-pointer"
                                                        onClick={() => openPromptModal(`${ev.event}`, `${ev.visual_cues} ${ev.keywords}`)}
                                                    >
                                                        <div className={`text-[9px] leading-tight border rounded px-1 py-1 truncate hover:whitespace-normal hover:absolute hover:z-20 hover:w-32 hover:opacity-100 hover:shadow-xl transition-all mb-0.5 ${ev.isHoliday
                                                            ? 'bg-rose-900/40 text-rose-300 border-rose-800/40 hover:bg-slate-900'
                                                            : 'bg-cyan-900/30 text-cyan-300 border-cyan-800/30 hover:bg-slate-900'
                                                            }`}>
                                                            {ev.event}
                                                        </div>
                                                        {/* Sparkle Icon on Hover */}
                                                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-500 rounded-full p-0.5 shadow-lg z-30">
                                                            <Sparkles className="w-2 h-2 text-white" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CHAT DRAWER */}
            {chatOpen && (
                <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0F172A] border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">GridMentor AI</h3>
                                <p className="text-[10px] text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatHistory.filter(m => m.role !== 'system').map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isChatting && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 rounded-bl-none">
                                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-800 bg-slate-900">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Bahas strategi visual..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || isChatting}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
