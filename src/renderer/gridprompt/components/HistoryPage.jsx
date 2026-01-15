import React, { useState, useEffect } from 'react';
import { X, History, ChevronDown, ChevronRight, Clock, Copy, Check, Clipboard } from 'lucide-react';

export default function HistoryPage({ isOpen, onClose }) {
    const [history, setHistory] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [copiedId, setCopiedId] = useState(null); // Track which item was copied for visual feedback

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('gridprompt-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                setHistory(parsed.history || []);
            }
        }
    }, [isOpen]);



    const handleCopy = async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleCopyBatch = async (item, batchId) => {
        try {
            const allPrompts = item.details
                .filter(d => d.generatedPrompt && d.status === 'success')
                .map(d => d.generatedPrompt)
                .join('\n\n'); // Separate prompts with newlines

            if (allPrompts) {
                await navigator.clipboard.writeText(allPrompts);
                setCopiedId(`batch-${batchId}`);
                setTimeout(() => setCopiedId(null), 2000);
            }
        } catch (err) {
            console.error('Failed to copy batch', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                        <History size={24} />
                    </div>
                    Generation History
                </h2>
                <div className="flex items-center gap-2">

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-4">
                    {history.length > 0 ? (
                        history.map((item, idx) => (
                            <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-all shadow-sm group">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="flex-1 flex justify-between items-start cursor-pointer select-none"
                                        onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                    Batch {history.length - idx}
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(item.date).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-lg text-slate-200 font-medium">{item.summary}</div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                {item.details ? item.details.length : 0} items processed
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Batch Copy Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyBatch(item, idx);
                                            }}
                                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-medium border border-white/5"
                                            title="Copy all prompts in this batch"
                                        >
                                            {copiedId === `batch-${idx}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                            <span className="hidden sm:inline">Copy All</span>
                                        </button>

                                        <button
                                            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                            className={`p-2 rounded-full bg-white/5 text-slate-400 transition-transform duration-200 ${expandedIndex === idx ? 'rotate-180 bg-white/10 text-white' : 'hover:bg-white/10'}`}
                                        >
                                            <ChevronDown size={20} />
                                        </button>
                                    </div>
                                </div>

                                {expandedIndex === idx && item.details && (
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        {item.details.map((detail, dIdx) => (
                                            <div key={dIdx} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${detail.status === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                                                    <span className="text-xs font-mono text-slate-400 truncate opacity-70 flex-1" title={detail.url}>
                                                        {detail.url}
                                                    </span>
                                                </div>

                                                {detail.generatedPrompt && (
                                                    <div className="relative group/code">
                                                        <div className="text-slate-300 bg-black/40 p-3 rounded border border-white/5 whitespace-pre-wrap select-text font-mono text-xs leading-relaxed pr-10">
                                                            {detail.generatedPrompt}
                                                        </div>
                                                        {/* Individual Copy Button */}
                                                        <button
                                                            onClick={() => handleCopy(detail.generatedPrompt, `${idx}-${dIdx}`)}
                                                            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover/code:opacity-100 backdrop-blur-sm"
                                                            title="Copy Prompt"
                                                        >
                                                            {copiedId === `${idx}-${dIdx}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                )}

                                                {detail.error && (
                                                    <div className="text-red-400 bg-red-950/20 p-2 rounded border border-red-500/20 text-xs font-medium">
                                                        Error: {detail.error}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                            <div className="p-6 bg-white/5 rounded-full mb-4">
                                <History size={64} className="opacity-50" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400 mb-2">No History Yet</h3>
                            <p className="text-sm max-w-xs text-center">Generated prompts will appear here automatically.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
