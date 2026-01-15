import React, { useState, useEffect, useMemo } from 'react';
import { Filter, ArrowUp, ArrowDown, Minus, ExternalLink, Download, Loader2 } from 'lucide-react';

const TrendRadar = () => {
    const [filter, setFilter] = useState('All Signals');
    const [trends, setTrends] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        calculateTrends();
    }, []);

    const calculateTrends = async () => {
        setLoading(true);
        try {
            // Get Real Data
            const stocks = await window.electron.ipcRenderer.invoke('gridtrends:get-stock-trends');

            // 1. Text Analysis (Simple Bag of Words)
            const wordCounts = {};
            const categoryCounts = {};

            stocks.forEach(item => {
                // Clean title
                const cleanTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '');
                const words = cleanTitle.split(/\s+/);

                words.forEach(word => {
                    if (word.length > 3 && !['with', 'background', 'view', 'from', 'this', 'that', 'image', 'photo'].includes(word)) {
                        wordCounts[word] = (wordCounts[word] || 0) + 1;
                    }
                });

                // Track Categories
                const cat = item.category || 'General';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });

            // 2. Convert to Array and Sort
            const sortedWords = Object.entries(wordCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15); // Top 15 keywords

            // 3. Map to Trend Objects
            const dynamicTrends = sortedWords.map(([keyword, count], index) => {
                const maxCount = sortedWords[0][1];
                const score = Math.round((count / maxCount) * 90) + 10; // Normalize 10-100

                // Determine Category mostly associated (naive)
                // For now, assign random logical category from dataset or "General"
                const category = 'General';

                // Determine Status based on Score
                let status = 'Stable';
                if (score > 85) status = 'Hot';
                else if (score > 60) status = 'Emerging';
                else if (score < 30) status = 'Saturated';

                // Determine Supply (Inverse of Score roughly for demo, or based on availability)
                const supply = score > 80 ? 'High' : 'Low';

                return {
                    id: index,
                    keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                    score: score,
                    status: status,
                    velocity: (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 20) + '%', // Simulation of change
                    supply: supply,
                    category: category
                };
            });

            setTrends(dynamicTrends);

        } catch (e) {
            console.error("Trend Calculation Error", e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Emerging': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            case 'Hot': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'Seasonal': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'Saturated': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    const filteredTrends = useMemo(() => {
        if (filter === 'All Signals') return trends;
        if (filter === 'High Demand') return trends.filter(t => t.score > 70);
        if (filter === 'Low Supply') return trends.filter(t => t.supply === 'Low');
        return trends;
    }, [filter, trends]);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Radar Tren ({trends.length})</h2>
                    <p className="text-sm text-slate-400">Analisis keyword real-time dari data visual market.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={calculateTrends} className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white hover:bg-slate-700 transition-colors">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        Refresh Scan
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-800 pb-1">
                {['All Signals', 'High Demand', 'Low Supply'].map((f) => (
                    <button
                        key={f}
                        className={`pb-3 text-sm font-medium transition-colors relative ${filter === f ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setFilter(f)}
                    >
                        {f}
                        {filter === f && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400" />}
                    </button>
                ))}
            </div>

            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-900 border-y border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider rounded-t-lg">
                <div className="col-span-4">Keyword Insight</div>
                <div className="col-span-2">Trend Score</div>
                <div className="col-span-2">Demand Level</div>
                <div className="col-span-2">Growth (Est)</div>
                <div className="col-span-2 text-right">Status</div>
            </div>

            {/* List */}
            <div className="space-y-1 mt-2">
                {loading ? (
                    <div className="text-center py-10 text-slate-500 animate-pulse">Scanning keywords...</div>
                ) : filteredTrends.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 px-4 py-4 bg-[#0F172A] hover:bg-slate-900 border-b border-slate-800/50 items-center transition-all group cursor-pointer">
                        <div className="col-span-4 flex flex-col">
                            <span className="font-medium text-slate-200 text-sm group-hover:text-white transition-colors flex items-center gap-2">
                                {item.keyword}
                            </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${item.score}%` }} />
                            </div>
                            <span className="text-xs font-mono text-cyan-400">{item.score}</span>
                        </div>
                        <div className="col-span-2">
                            <span className={`text-xs ${item.score > 70 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {item.score > 70 ? 'High Demand' : 'Normal'}
                            </span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1 text-sm">
                            {item.velocity.includes('+') ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-rose-400" />}
                            <span className={item.velocity.includes('+') ? 'text-emerald-400' : 'text-rose-400'}>{item.velocity}</span>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(item.status)}`}>
                                {item.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TrendRadar;
