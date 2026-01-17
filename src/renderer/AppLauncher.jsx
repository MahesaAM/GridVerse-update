import React, { useState } from 'react';
import { LogOut, Video, Images, Text, PenTool, Tag, User, X, Sparkles } from 'lucide-react';
// import WindowControls from './components/WindowControls'; // Import WindowControls
import gridverseLogo from './assets/gridverse.png'; // Import custom logo
import SpotlightCard from './components/SpotlightCard';
import AccountManager from './components/AccountManager';
import GlobalAISettingsModal from './components/GlobalAISettingsModal';
import GridMentorChat from './components/global/GridMentorChat';

const APPS = [
    {
        id: 'gridvid',
        name: 'GridVid',
        description: 'Generate ribuan prompt dengan Veo3.',
        icon: Video,
        color: 'blue',
        gradient: 'from-blue-500 to-cyan-400',
        actionText: 'Launch Studio',
        spotlightColor: 'rgba(59, 130, 246, 0.25)' // Blue
    },
    {
        id: 'gridbot',
        name: 'GridBot',
        description: 'Generate image dengan ImageFX & Whisk.',
        icon: Images,
        color: 'purple',
        gradient: 'from-purple-500 to-pink-500',
        actionText: 'Launch Bot',
        spotlightColor: 'rgba(168, 85, 247, 0.25)' // Purple
    },
    {
        id: 'gridprompt',
        name: 'GridPrompt',
        description: 'Scraping microstock untuk dijadikan prompt.',
        icon: Text,
        color: 'green',
        gradient: 'from-green-500 to-emerald-400',
        actionText: 'Launch Prompt',
        spotlightColor: 'rgba(34, 197, 94, 0.25)' // Green
    },
    {
        id: 'gridmeta',
        name: 'GridMeta',
        description: 'Edit metadata foto & video secara batch.',
        icon: Tag,
        color: 'red',
        gradient: 'from-red-600 to-rose-500',
        actionText: 'Launch Meta',
        spotlightColor: 'rgba(225, 29, 72, 0.25)' // Red
    },
    {
        id: 'gridvector',
        name: 'GridVector',
        description: 'Generate Image ke Vector file EPS/SVG.',
        icon: PenTool,
        color: 'orange',
        gradient: 'from-orange-500 to-red-400',
        actionText: 'Launch Vector',
        spotlightColor: 'rgba(249, 115, 22, 0.25)' // Orange
    },
    {
        id: 'gridtrends',
        name: 'GridTrends',
        description: 'Market Intelligence Engine.',
        icon: Sparkles,
        color: 'cyan',
        gradient: 'from-cyan-500 to-blue-500',
        actionText: 'Launch Trends',
        spotlightColor: 'rgba(6, 182, 212, 0.25)' // Cyan
    }
];

export default function AppLauncher({ onSelectApp, onLogout, appVersion, expirationDate }) {
    const [showAccountManager, setShowAccountManager] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);

    return (
        <div className="h-full w-full flex flex-col bg-black text-white relative overflow-hidden font-sans selection:bg-purple-500/30">

            {/* Header - Compact */}
            <header className="relative z-20 w-full px-4 py-3 flex justify-between items-center border-b border-white/5 bg-black backdrop-blur-sm">
                <div className="flex items-center gap-3 no-drag">
                    <img src={gridverseLogo} alt="GridVerse" className="w-5 h-5 object-contain" />
                    <div>
                        <h1 className="text-xs font-bold tracking-wide text-white">GRIDVERSE</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Global AI Settings Button */}
                    <button
                        onClick={() => setShowGlobalSettings(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-400 transition-all duration-300 text-[10px] font-medium group no-drag"
                    >
                        <span>AI Config</span>
                        <Sparkles className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Manage Accounts Button */}
                    <button
                        onClick={() => setShowAccountManager(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all duration-300 text-[10px] font-medium group no-drag"
                    >
                        <span>Manage Accounts</span>
                        <User className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Version & Expiry Info */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 no-drag">
                        <span className="text-[10px] text-gray-400 font-mono">{appVersion}</span>
                        {expirationDate && (
                            <>
                                <div className="w-px h-3 bg-white/10" />
                                <span className={`text-[9px] font-mono tracking-wide ${expirationDate === 'Lifetime' ? "text-emerald-400" : "text-yellow-400"}`}>
                                    {expirationDate === 'Lifetime' ? 'LIFETIME' : `EXP: ${expirationDate}`}
                                </span>
                            </>
                        )}
                    </div>

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-300 text-[10px] font-medium group no-drag"
                    >
                        <span>Log Out</span>
                        <LogOut className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </header>

            {/* Main Content - Compact */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">

                {/* App Grid - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl">
                    {APPS.map((app) => (
                        <SpotlightCard
                            key={app.id}
                            onClick={() => onSelectApp(app.id)}
                            spotlightColor={app.spotlightColor}
                            className="flex flex-col items-center justify-center gap-4 text-center hover:shadow-2xl transition-all duration-300 p-6 min-h-[200px]"
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg group-hover:shadow-${app.color}-500/20 transition-all mb-2`}>
                                <app.icon className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors">{app.name}</span>
                                <p className="text-[10px] text-gray-500 font-medium leading-relaxed max-w-[140px] mx-auto group-hover:text-gray-400 transition-colors">
                                    {app.description}
                                </p>
                            </div>
                        </SpotlightCard>
                    ))}
                </div>
            </main>

            <footer className="relative z-20 py-3 text-center text-[9px] text-gray-600 font-mono tracking-widest uppercase opacity-50 border-t border-white/5 bg-black/20">
                System Status: Operational
            </footer>

            {/* Account Manager Modal */}
            {showAccountManager && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-[#0f172a] w-full max-w-5xl h-[85vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
                            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <User size={16} className="text-blue-500" />
                                Global Account Manager
                            </h3>
                            <button
                                onClick={() => setShowAccountManager(false)}
                                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all transform hover:scale-105"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden bg-slate-950/30">
                            <AccountManager />
                        </div>
                    </div>
                </div>
            )}

            {/* Global AI Settings Modal */}
            <GlobalAISettingsModal
                isOpen={showGlobalSettings}
                onClose={() => setShowGlobalSettings(false)}
                onSave={(config) => console.log('Global AI Config Saved', config)}
            />

            {/* GLOBAL ASSISTANT */}
            <GridMentorChat />
        </div>
    );
}
