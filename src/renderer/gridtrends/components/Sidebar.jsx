import React from 'react';
import { TrendingUp, Activity, Zap, Search, Settings, Calendar, PenTool, ArrowLeft } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange, onSettings, onBack }) => {
    const navItems = [
        { id: 'future', icon: Calendar, label: 'Prediksi & Jadwal' },
    ];

    return (
        <aside className="w-64 bg-[#0B1120] border-r border-slate-800 flex flex-col z-20 h-full">
            <div className="p-4 border-b border-slate-800 bg-transparent">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" /> Kembali ke Menu
                </button>
            </div>

            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight text-white">GridTrend</h1>
                    <p className="text-[10px] text-slate-400 font-medium">Market Intelligence</p>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${activeTab === item.id
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_-5px_rgba(34,211,238,0.3)]'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-cyan-400' : 'text-slate-500 group-hover:text-white'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                        {activeTab === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-white/5">
                <button
                    onClick={onSettings}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
                >
                    <Settings className="w-4 h-4" />
                    <span>Pengaturan</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
