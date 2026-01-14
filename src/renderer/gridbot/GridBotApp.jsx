import React, { useState } from 'react';
import { X, LogOut, Image, Cookie } from 'lucide-react'; // Cookie icon for Whisk?
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Import from the copied gridbot location
// We assume these exports exist based on file list.
// If imports fail, we might need to adjust paths or exports.
import ImageGenerator from './pages/ImageGenerator';
import WhiskGenerator from './pages/WhiskGenerator';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("GridBot Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="text-red-500 p-10 bg-black h-full w-full">
                    <h1>Something went wrong.</h1>
                    <pre>{this.state.error?.toString()}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function GridBotApp({ onBack, onLogout }) {
    const [activeTab, setActiveTab] = useState('imagefx'); // 'imagefx' | 'whisk'

    // Mock Window Controls for consistency if needed, or pass handleExit
    const handleExit = () => {
        if (window.api) window.api.send('close');
    };

    return (
        <ErrorBoundary>
            <div className="h-full w-full bg-black text-slate-200 font-sans flex flex-col overflow-hidden relative selection:bg-purple-500/30 selection:text-white">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-2 z-50 bg-black backdrop-blur-md select-none">

                    {/* Tabs */}
                    <div className="flex gap-2 items-center" style={{ WebkitAppRegion: 'no-drag' }}>
                        {/* Back Button Removed */}

                        <button
                            onClick={() => setActiveTab('imagefx')}
                            className={cn(
                                "px-4 py-1.5 rounded-full font-bold text-xs transition-all border flex items-center gap-2",
                                activeTab === 'imagefx'
                                    ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20"
                                    : "bg-slate-900/50 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10"
                            )}
                        >
                            <Image size={14} />
                            ImageFX
                        </button>
                        <button
                            onClick={() => setActiveTab('whisk')}
                            className={cn(
                                "px-4 py-1.5 rounded-full font-bold text-xs transition-all border flex items-center gap-2",
                                activeTab === 'whisk'
                                    ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20"
                                    : "bg-slate-900/50 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10"
                            )}
                        >
                            <Cookie size={14} />
                            Whisk
                        </button>
                    </div>

                    {/* Window Controls */}
                    <div className="flex items-center gap-2 ml-4" style={{ WebkitAppRegion: 'no-drag' }}>
                        {/* Logout Button Removed */}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-slate-900 border border-white/5 relative z-0 shadow-2xl overflow-hidden flex flex-col backdrop-blur-sm">
                    <div className="flex-1 overflow-hidden p-0">
                        <div style={{ display: activeTab === 'imagefx' ? 'block' : 'none', height: '100%', width: '100%' }}>
                            <ImageGenerator onBack={onBack} onLogout={onLogout} />
                        </div>
                        <div style={{ display: activeTab === 'whisk' ? 'block' : 'none', height: '100%', width: '100%' }}>
                            <WhiskGenerator onBack={onBack} onLogout={onLogout} />
                        </div>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}
