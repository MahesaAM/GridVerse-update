import React, { useState, useEffect } from 'react';
import { Settings, History, Globe, Image, Play, X, Download, Upload, StopCircle, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function Sidebar({
    images,
    localImages = [],
    onLocalImagesChange,
    activeTab = 'web',
    onTabChange,
    onStartGeneration,
    onStopGeneration,
    isProcessing,
    processingStatus,
    toast,
    settings,
    onUpdateSettings,
    onOpenSettings
}) {
    const setLocalImages = onLocalImagesChange || (() => { });

    // Copied state for feedback
    const [copiedId, setCopiedId] = useState(null);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file), // Create object URL for preview
            file: file,
            type: file.type.startsWith('video') ? 'video' : 'image',
            name: file.name
        }));
        setLocalImages(prev => [...prev, ...newImages]);
    };

    const renderImageCard = (img, idx, isLocal = false) => {
        const isSuccess = img.status === 'success';
        const isError = img.status === 'error';
        // If processing this specific index
        const isCurrent = isProcessing && processingStatus && processingStatus.completed === idx;
        const isPending = !isSuccess && !isError && !isCurrent;

        return (
            <div key={idx} className={`bg-slate-800 rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all group ${isSuccess ? 'border-green-500/30' :
                isError ? 'border-red-500/30' :
                    'border-white/10'
                }`}>
                {/* Image Preview Header */}
                <div className="h-36 bg-slate-900 relative border-b border-white/5">
                    {img.type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Play size={32} />
                        </div>
                    ) : (
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                    )}

                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Status Indicator (Top Right) */}
                    <div className="absolute top-2 right-2">
                        {isCurrent && (
                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center animate-spin shadow-lg border-2 border-slate-800">
                                <Loader2 size={14} className="text-white" />
                            </div>
                        )}
                        {isSuccess && (
                            <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800 animate-in zoom-in">
                                <Check size={14} className="text-white" />
                            </div>
                        )}
                        {isError && (
                            <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800 animate-in zoom-in">
                                <X size={14} className="text-white" />
                            </div>
                        )}
                    </div>

                    {/* Resolution Tag (Bottom Left) */}
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-mono border border-white/10">
                        {img.resolution || 'N/A'}
                    </div>

                    {/* Remove Button (Local Only) */}
                    {isLocal && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLocalImages(prev => prev.filter((_, i) => i !== idx)); }}
                            className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all border border-white/10"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-3 bg-slate-800/50">
                    {img.generatedPrompt || (isSuccess && !img.error) ? (
                        <div className="relative group/text">
                            <textarea
                                readOnly
                                value={img.generatedPrompt || "No prompt generated."}
                                className="w-full h-24 bg-slate-950/50 border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 resize-none focus:outline-none focus:border-blue-500/50 custom-scrollbar leading-relaxed"
                            />
                            <button
                                onClick={() => handleCopy(img.generatedPrompt || "No prompt generated.", idx)}
                                className={`absolute bottom-2 right-2 p-1.5 rounded-md border text-xs flex items-center gap-1.5 transition-all shadow-sm ${copiedId === idx
                                    ? 'bg-green-500/20 border-green-500/50 text-green-400'
                                    : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                                title="Copy Prompt"
                            >
                                {copiedId === idx ? <Check size={12} /> : <Copy size={12} />}
                                {copiedId === idx && <span className="text-[10px] font-medium">Copied</span>}
                            </button>
                        </div>
                    ) : (
                        <div className="h-24 flex flex-col items-center justify-center text-slate-500 bg-slate-900/20 rounded-lg border border-white/5 border-dashed">
                            {isProcessing && isPending ? (
                                <span className="text-xs italic">Waiting in queue...</span>
                            ) : isError ? (
                                <div className="flex flex-col items-center gap-1 text-red-400/80 px-4 text-center">
                                    <AlertCircle size={16} />
                                    <span className="text-[10px] line-clamp-2">{img.error}</span>
                                </div>
                            ) : (
                                <span className="text-xs italic opacity-50">Ready to generate</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const targetList = activeTab === 'web' ? images : localImages;

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`absolute top-4 left-4 right-4 z-50 p-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                    toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                        'bg-blue-500/90 border-blue-400 text-white'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={20} /> :
                        toast.type === 'success' ? <Check size={20} /> :
                            <Settings size={20} />}
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Header - SIMPLIFIED / REMOVED (Controls now in Top Header) */}
            {/* We can keep a small title or remove entirely. Let's keep a minimal Title. */}
            <div className="px-5 py-4 flex-none z-10 bg-[#0e0e14] border-b border-white/5">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    {activeTab === 'web' ? 'Web Results' : 'Local Files'}
                    <span className="text-[10px] text-slate-500 font-normal ml-auto">
                        {targetList.length} Items
                    </span>
                </h3>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0e0e14]">
                <div className="px-5 pb-5 space-y-4">

                    {/* Controls (Start/Stop/Upload) - Kept in Sidebar */}
                    <div className="sticky top-0 z-20 bg-[#0e0e14] pt-4 pb-2 border-b border-white/5 mb-2">
                        <div className="flex gap-2">
                            {activeTab === 'local' && (
                                <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer">
                                    <Upload size={16} />
                                    <span>Upload</span>
                                    <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handleFileUpload} />
                                </label>
                            )}

                            {!isProcessing ? (
                                <button
                                    onClick={onStartGeneration}
                                    disabled={targetList.length === 0}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                                >
                                    <Play size={16} fill="currentColor" />
                                    Start Process
                                </button>
                            ) : (
                                <button
                                    onClick={onStopGeneration}
                                    className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 active:scale-[0.98] animate-pulse"
                                >
                                    <StopCircle size={16} />
                                    Stop Process
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="space-y-4 pb-20">
                        {targetList.length > 0 ? (
                            targetList.map((img, idx) => renderImageCard(img, idx, activeTab === 'local'))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-600 border border-dashed border-white/5 rounded-xl bg-white/[0.02]">
                                <Image size={32} className="opacity-20 mb-3" />
                                <p className="text-sm font-medium">No images found</p>
                                <p className="text-xs opacity-50 mt-1 max-w-[200px] text-center">
                                    {activeTab === 'web' ? 'Navigate to a page with media to see them here' : 'Upload local images or videos to start'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-white/5 bg-[#0e0e14] absolute bottom-0 w-full z-30 backdrop-blur-md">
                <button
                    onClick={() => {
                        const texts = targetList
                            .filter(i => i.generatedPrompt)
                            .map(i => i.generatedPrompt)
                            .join('\n\n');

                        if (!texts) {
                            alert('No generated prompts to download.');
                            return;
                        }

                        const blob = new Blob([texts], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `prompts-${new Date().toISOString().slice(0, 10)}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    disabled={targetList.filter(i => i.generatedPrompt).length === 0}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all text-sm font-bold"
                >
                    <Download size={16} />
                    Download Results
                </button>
            </div>
        </div>
    );
}
