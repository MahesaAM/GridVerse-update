import React from 'react';
import { Activity, ArrowRight, Zap, TrendingUp, TrendingDown, Sparkles, Brain } from 'lucide-react';

const Dashboard = ({ onScan }) => {
    const [bestSellers, setBestSellers] = React.useState([]);
    const [trendingThemes, setTrendingThemes] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [aiAnalysis, setAiAnalysis] = React.useState(null);
    const [analyzing, setAnalyzing] = React.useState(false);

    React.useEffect(() => {
        loadSavedAnalysis();
        loadData();
    }, []);

    const loadSavedAnalysis = () => {
        const saved = localStorage.getItem('gridtrends_dashboard_analysis');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setAiAnalysis(parsed);
            } catch (e) {
                console.error("Failed to parse saved dashboard analysis", e);
            }
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch real data from main process
            // gridtrends:get-stock-trends now aggregates Adobe/Shutterstock/Envato
            const [sellers, trends] = await Promise.all([
                window.electron.ipcRenderer.invoke('gridtrends:get-stock-trends'),
                window.electron.ipcRenderer.invoke('gridtrends:get-trends', 'US')
            ]);

            // Format Best Sellers
            const formattedSellers = sellers.map(s => ({
                title: s.title,
                imageUrl: s.image,
                type: s.source,
                trend: 'High Demand',
                sales: 'Trending',
                url: s.url
            })).slice(0, 8);

            setBestSellers(formattedSellers);

            // Transform Google Trends data
            const themes = trends.map(t => ({
                topic: t.title,
                platform: t.source || 'Google Trends',
                volume: t.traffic,
                url: t.articles[0]?.url
            })).slice(0, 10);
            setTrendingThemes(themes);

        } catch (error) {
            console.error("Failed to load real data:", error);
        } finally {
            setLoading(false);
        }
    };

    const runAiAnalysis = async () => {
        setAnalyzing(true);
        try {
            // Get Global AI Config (same as GridPrompt/GridMeta)
            const globalConfig = JSON.parse(localStorage.getItem('global-ai-config') || '{}');
            const provider = globalConfig.provider || 'gemini';
            const model = globalConfig.model || 'meta-llama/llama-3.3-70b-versatile';
            let apiKey = globalConfig.apiKey;

            // If Groq provider, use random key rotation like GridMeta
            if (provider === 'groq') {
                const storedKeys = localStorage.getItem('groq_api_keys');
                if (storedKeys) {
                    try {
                        const keys = JSON.parse(storedKeys);
                        if (keys.length > 0) {
                            apiKey = keys[Math.floor(Math.random() * keys.length)];
                            console.log(`[GridTrends Dashboard] Using Random Groq Key (one of ${keys.length})`);
                        }
                    } catch (e) {
                        console.error('[GridTrends Dashboard] Error parsing Groq keys', e);
                    }
                }
            }

            if (!apiKey && provider !== 'groq') {
                alert("Please configure Global AI Settings first!");
                setAnalyzing(false);
                return;
            }

            // We use the trending themes for analysis
            const analysis = await window.electron.ipcRenderer.invoke('gridtrends:analyze-trends', {
                trends: trendingThemes,
                apiKey: apiKey,
                model: model
            });

            if (analysis.error) {
                console.error("AI Error:", analysis.error);
                alert("AI Analysis Failed: " + analysis.error);
            } else {
                setAiAnalysis(analysis);
                // Save to LocalStorage
                localStorage.setItem('gridtrends_dashboard_analysis', JSON.stringify(analysis));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Deep Market Intelligence</h2>
                    <p className="text-slate-400 text-sm">Strategic Analysis: Buyer Sentiment, Commercial Viability & Technical Specs.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={runAiAnalysis}
                        disabled={loading || analyzing || trendingThemes.length === 0}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-purple-500/30"
                    >
                        {analyzing ? <Brain className="w-3 h-3 animate-pulse" /> : <Sparkles className="w-3 h-3" />}
                        {analyzing ? 'Generating Deep Analysis...' : 'Start Market Scan'}
                    </button>
                    <button
                        onClick={loadData}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Zap className="w-3 h-3" />
                        Refresh Data
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
                </div>
            ) : (
                <>
                    {/* DEEP AI INSIGHTS SECTION */}
                    {aiAnalysis && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">

                            {/* 1. Executive Summary & Sentiment */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 p-6 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px]" />
                                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-purple-400" />
                                        Market Executive Summary
                                    </h3>
                                    <p className="text-slate-300 leading-relaxed mb-4">{aiAnalysis.market_summary}</p>

                                    <div className="flex gap-4">
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex-1">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Market Phase</div>
                                            <div className="text-cyan-400 font-bold">{aiAnalysis.market_sentiment || 'Emerging'}</div>
                                        </div>
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex-1">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pricing Potential</div>
                                            <div className="text-emerald-400 font-bold">{aiAnalysis.commercial_viability?.avg_pricing_potential || 'High'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sentiment Gauge */}
                                <div className="bg-[#0F172A] border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center relative">
                                    <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Demand Score</h3>
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                            <path
                                                className="text-slate-800"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                            <path
                                                className="text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                                strokeDasharray={`${aiAnalysis.sentiment_score || 75}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-3xl font-bold text-white">{aiAnalysis.sentiment_score || 75}</span>
                                            <span className="text-[10px] text-slate-500">/ 100</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Buyer Intelligence & Technical Specs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Buyer Persona */}
                                <div className="bg-[#0F172A] border border-slate-800 p-6 rounded-xl">
                                    <h3 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                        <Brain className="w-4 h-4" />
                                        Target Buyer Persona
                                    </h3>
                                    <div className="space-y-4">
                                        {aiAnalysis.buyer_intelligence?.map((buyer, i) => (
                                            <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                                                <div className="font-bold text-white mb-2">{buyer.persona}</div>
                                                <div className="grid grid-cols-2 gap-4 text-xs">
                                                    <div>
                                                        <span className="text-emerald-500 font-bold block mb-1">Needs</span>
                                                        <span className="text-slate-400">{buyer.needs}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-rose-500 font-bold block mb-1">Pain Points</span>
                                                        <span className="text-slate-400">{buyer.pain_points}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Technical Recommendations */}
                                <div className="bg-[#0F172A] border border-slate-800 p-6 rounded-xl">
                                    <h3 className="text-sm font-bold text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                        <Zap className="w-4 h-4" />
                                        Technical Requirements
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-3 bg-slate-900/30 rounded-lg">
                                            <span className="text-slate-500 text-xs font-bold w-24">Lighting</span>
                                            <span className="text-slate-300 text-sm">{aiAnalysis.technical_recommendations?.lighting || 'Natural, Soft'}</span>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-slate-900/30 rounded-lg">
                                            <span className="text-slate-500 text-xs font-bold w-24">Composition</span>
                                            <span className="text-slate-300 text-sm">{aiAnalysis.technical_recommendations?.composition || 'Minimalist'}</span>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-slate-900/30 rounded-lg">
                                            <span className="text-slate-500 text-xs font-bold w-24">Color Palette</span>
                                            <span className="text-slate-300 text-sm">{aiAnalysis.technical_recommendations?.color_palette || 'Neutral'}</span>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-800">
                                            <h4 className="text-xs font-bold text-rose-400 mb-2 uppercase">⚠ Content Gaps (High Opportunity)</h4>
                                            <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                                                {aiAnalysis.content_gaps?.map((gap, i) => (
                                                    <li key={i}>{gap}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Actionable Niches */}
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Recommended Niches</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {aiAnalysis.top_niches?.map((niche, i) => (
                                        <div key={i} className="bg-purple-900/10 border border-purple-500/20 p-5 rounded-xl hover:bg-purple-900/20 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-purple-300 font-bold">{niche.title}</h4>
                                                <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded font-bold">{niche.commercial_score}% Score</span>
                                            </div>
                                            <p className="text-slate-300 text-xs mb-3">{niche.reason}</p>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Keywords</div>
                                            <p className="text-slate-400 text-xs italic mb-4 line-clamp-2">{niche.keywords}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Stock Market Trends (Raw Data) */}
                    <section className="mb-10 mt-12 pt-8 border-t border-slate-800/50">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 opacity-50">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            Raw Market Data (Source)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 opacity-60 hover:opacity-100 transition-opacity">
                            {bestSellers.map((item, i) => (
                                <div key={i} onClick={() => window.open(item.url, '_blank')} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-cyan-500 transition-all cursor-pointer">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110 grayscale group-hover:grayscale-0"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=No+Preview'; }}
                                    />
                                    <div className="absolute inset-0 p-2 flex flex-col justify-end bg-gradient-to-t from-black/90 to-transparent">
                                        <span className="text-[8px] uppercase font-bold text-cyan-400 mb-0.5">{item.type}</span>
                                        <h4 className="text-white font-medium text-[10px] leading-tight line-clamp-2">{item.title}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Dashboard;
