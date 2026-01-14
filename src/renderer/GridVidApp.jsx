import React, { useState, useEffect } from 'react';
import { X, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AccountManager from './components/AccountManager';
import Generator from './components/Generator';
import UpdateNotification from './components/UpdateNotification';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Props:
// - onLogout: function to handle logout
// - appVersion: string
// - expirationDate: string or null
export default function GridVidApp({ onLogout, onBack, appVersion, expirationDate }) {
    const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'accounts'
    const [generatorMode, setGeneratorMode] = useState('text'); // 'text' | 'image'
    const [status, setStatus] = useState('stopped');
    const [isHeadless, setIsHeadless] = useState(true);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [showHeadlessControl, setShowHeadlessControl] = useState(false);

    useEffect(() => {
        const pressedKeys = new Set();

        const handleKeyDown = (e) => {
            const active = document.activeElement;
            if (active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                active.isContentEditable
            )) {
                return;
            }

            pressedKeys.add(e.code);

            const isM = pressedKeys.has('KeyM');
            const isH = pressedKeys.has('KeyH');
            const isS = pressedKeys.has('KeyS');

            if (e.ctrlKey && e.shiftKey && isM && isH && isS) {
                if (!e.repeat) {
                    console.log('Shortcut triggered: Ctrl+Shift+M+H+S');
                    setShowHeadlessControl(prev => !prev);
                }
                e.preventDefault();
            }
        };

        const handleKeyUp = (e) => {
            pressedKeys.delete(e.code);
        };

        const handleBlur = () => pressedKeys.clear();

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    useEffect(() => {
        if (window.api) {
            window.api.receive('automation-status', (s) => setStatus(s));
        }
    }, []);

    const handleExit = () => {
        if (window.api) window.api.send('close');
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden relative selection:bg-blue-500/30 selection:text-white bg-black text-slate-200">
            {/* Background Gradients are in App.jsx wrapper usually, but adding here to be safe or assuming parent has them */}

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2 z-50 bg-black backdrop-blur-md select-none">
                <div className="flex gap-2 items-center" style={{ WebkitAppRegion: 'no-drag' }}>
                    {/* Back Button Removed */}

                    <button
                        onClick={() => { setActiveTab('generator'); setGeneratorMode('text'); }}
                        className={cn(
                            "px-4 py-1.5 rounded-full font-bold text-xs transition-all border",
                            activeTab === 'generator' && generatorMode === 'text'
                                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                                : "bg-slate-900/50 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10"
                        )}
                    >
                        Text to Video
                    </button>
                    <button
                        onClick={() => { setActiveTab('generator'); setGeneratorMode('image'); }}
                        className={cn(
                            "px-4 py-1.5 rounded-full font-bold text-xs transition-all border",
                            activeTab === 'generator' && generatorMode === 'image'
                                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20"
                                : "bg-slate-900/50 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10"
                        )}
                    >
                        Image to Video
                    </button>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={cn(
                            "px-4 py-1.5 rounded-full font-bold text-xs transition-all border",
                            activeTab === 'accounts'
                                ? "bg-slate-800 text-white border-slate-700 shadow-md"
                                : "bg-transparent text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-900/50"
                        )}
                    >
                        Manage Account
                    </button>
                </div>

                {/* Right Info & Window Controls */}
                <div className="flex items-center gap-4" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="flex items-center gap-4">
                        <label className={cn("flex items-center gap-2 cursor-pointer group transition-opacity duration-300", showHeadlessControl ? "opacity-100" : "opacity-0 pointer-events-none hidden")}>
                            <span className={cn("text-[10px] font-medium transition-colors", isHeadless ? "text-blue-400" : "text-slate-500")}>
                                Headless
                            </span>
                            <div className="relative w-8 h-4 bg-slate-900 rounded-full border border-slate-700 group-hover:border-slate-600 transition-colors">
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isHeadless}
                                    onChange={(e) => setIsHeadless(e.target.checked)}
                                />
                                <div className={cn(
                                    "absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform shadow-sm",
                                    isHeadless ? "translate-x-4 bg-blue-500" : "bg-slate-500"
                                )} />
                            </div>
                        </label>
                        <div className="h-4 w-px bg-white/10 mx-2 hidden" />


                        {/* Window Controls */}
                        <div className="flex items-center gap-2 ml-4">

                            {/* Logout Button Removed */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Box */}
            <div className="flex-1 bg-slate-900 border-t border-white/5 relative z-0 shadow-2xl overflow-hidden flex flex-col backdrop-blur-sm">
                <div className="flex-1 overflow-auto p-2">
                    <div style={{ display: activeTab === 'generator' ? 'block' : 'none', height: '100%' }}>
                        <Generator mode={generatorMode} isHeadless={isHeadless} />
                    </div>
                    <div style={{ display: activeTab === 'accounts' ? 'block' : 'none', height: '100%' }}>
                        <AccountManager />
                    </div>
                </div>
            </div>

            <UpdateNotification
                isManualCheck={checkingUpdate}
                onCheckComplete={() => setCheckingUpdate(false)}
            />
        </div>
    );
}
