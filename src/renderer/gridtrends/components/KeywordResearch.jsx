import React, { useState } from 'react';
import { Search, Globe, BarChart2, DollarSign } from 'lucide-react';

const KeywordResearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        // Mock Results
        setResults([
            { keyword: 'minimalist home office', volume: '12K', competition: 'High', cpc: '$1.20', trend: '+5%' },
            { keyword: 'home office plants', volume: '5.4K', competition: 'Medium', cpc: '$0.80', trend: '+15%' },
            { keyword: 'ergonomic setup', volume: '3.1K', competition: 'Low', cpc: '$2.50', trend: '+22%' },
            { keyword: 'desk aesthetic', volume: '8.9K', competition: 'High', cpc: '$0.40', trend: '-2%' },
        ]);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Riset Keyword Mendalam</h2>
                <p className="text-slate-400">Temukan kata kunci dengan demand tinggi dan kompetisi rendah.</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative mb-10 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all shadow-sm"
                    placeholder="Masukkan seed keyword (contoh: 'Business Meeting', 'Abstract Background')..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="submit"
                    className="absolute inset-y-2 right-2 px-6 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
                >
                    Search
                </button>
            </form>

            {/* Results */}
            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Avg. Search Vol', value: '7.3K', icon: Globe, color: 'text-blue-400' },
                            { label: 'Keyword Difficulty', value: 'Medium', icon: BarChart2, color: 'text-orange-400' },
                            { label: 'Avg. CPC', value: '$1.42', icon: DollarSign, color: 'text-emerald-400' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                                <div className={`p-2 rounded-lg bg-slate-800 ${stat.color}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-lg font-bold text-white">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Keyword Variation</th>
                                    <th className="px-6 py-4 font-semibold">Volume</th>
                                    <th className="px-6 py-4 font-semibold">Trend</th>
                                    <th className="px-6 py-4 font-semibold">Competition</th>
                                    <th className="px-6 py-4 font-semibold text-right">CPC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {results.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{row.keyword}</td>
                                        <td className="px-6 py-4">{row.volume}</td>
                                        <td className={`px-6 py-4 ${row.trend.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {row.trend}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${row.competition === 'High' ? 'bg-rose-500/10 text-rose-400' :
                                                    row.competition === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                                        'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                {row.competition}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-400">{row.cpc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KeywordResearch;
