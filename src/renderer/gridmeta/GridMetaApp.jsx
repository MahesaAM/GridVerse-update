import React, { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Upload, X, Check, Sparkles, Play, Settings, Info, Type, MoreVertical, Tag, FileVideo, FileImage, Loader2, Square } from 'lucide-react';
// import WindowControls from '../components/WindowControls'; // Import WindowControls
import gridverseLogo from '../assets/gridverse.png'; // Import Logo
import SettingsModal from './components/SettingsModal';
import { MetadataAI } from './services/MetadataAI';

export default function GridMetaApp({ onBack }) {
    const [files, setFiles] = useState([]);
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [stats, setStats] = useState({ generated: 0, success: 0, failed: 0 });

    const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }

    // Toast Timer
    React.useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const selectedFile = files.find(f => f.id === selectedFileId);

    const updateFileMetadata = (id, newMeta) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, metadata: { ...f.metadata, ...newMeta } } : f));
    };

    const stopBatchRef = useRef(false);

    const handleAutoGenerateClick = () => {
        const saved = localStorage.getItem('gridmeta-ai-config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                // Basic validation
                if ((config.provider === 'gemini' || config.provider === 'gpt' || config.provider === 'groq') && !config.apiKey) {
                    setToast({ type: 'error', message: 'API Key is missing. Check Settings.' });
                    setIsSettingsOpen(true);
                    return;
                }
                stopBatchRef.current = false;
                handleBatchGeneration(config);
            } catch (e) {
                setToast({ type: 'error', message: 'Invalid settings. Please configure again.' });
                setIsSettingsOpen(true);
            }
        } else {
            setToast({ type: 'error', message: 'Please configure AI settings first.' });
            setIsSettingsOpen(true);
        }
    };

    const handleBatchGeneration = async (config) => {
        const queue = files;

        for (const file of queue) {
            if (stopBatchRef.current) {
                setToast({ type: 'info', message: 'Stopped' });
                break;
            }

            setProcessingId(file.id);
            let attempts = 0;
            const maxAttempts = 3;
            let success = false;

            while (attempts < maxAttempts && !success && !stopBatchRef.current) {
                try {
                    attempts++;
                    const res = await fetch(file.preview);
                    const blob = await res.blob();

                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    const base64 = await new Promise(resolve => {
                        reader.onloadend = () => resolve(reader.result);
                    });

                    const meta = await MetadataAI.generate(file, base64, config);
                    updateFileMetadata(file.id, meta);

                    try {
                        if (file.path && !file.path.startsWith('blob:')) {
                            await window.api.invoke('write-metadata', {
                                filePath: file.path,
                                metadata: meta
                            });
                        }
                    } catch (saveErr) {
                        console.error(`Auto-embed failed:`, saveErr);
                    }
                    success = true;
                    setStats(prev => ({ ...prev, generated: prev.generated + 1, success: prev.success + 1 }));

                } catch (err) {
                    const isLimit = err.message.toLowerCase().includes('limit');
                    console.error(`Attempt ${attempts} failed for ${file.name}:`, err);

                    if (isLimit && attempts < maxAttempts) {
                        setToast({ type: 'error', message: `Rate limit reached. Retrying (${attempts}/${maxAttempts})...` });
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
                        continue;
                    }

                    setStats(prev => ({ ...prev, generated: prev.generated + 1, failed: prev.failed + 1 }));
                    setToast({ type: 'error', message: isLimit ? 'Rate limit exceeded.' : `Failed: ${err.message}` });
                    break; // stop retrying for non-limit errors
                }
            }

            // Add delay between files to avoid rate limits
            const delayMs = (config.delay ?? 3) * 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        setProcessingId(null);
        if (!stopBatchRef.current) {
            setToast({ type: 'success', message: 'Batch Complete!' });
        }
    };

    // Drag Handling
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const newFiles = Array.from(e.dataTransfer.files).map(file => {
                // Use the exposed API to get physical path if possible
                const physicalPath = window.api.getFilePath ? window.api.getFilePath(file) : file.path;
                return {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    type: file.type.startsWith('video') ? 'video' : 'image',
                    mimeType: file.type,
                    path: physicalPath || URL.createObjectURL(file), // Fallback to blob if no path
                    preview: URL.createObjectURL(file),
                    metadata: { title: '', description: '', keywords: '' }
                };
            });
            setFiles(prev => [...prev, ...newFiles]);
        }
    }, []);

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            const newFiles = Array.from(e.target.files).map(file => {
                const physicalPath = window.api.getFilePath ? window.api.getFilePath(file) : file.path;
                return {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    type: file.type.startsWith('video') ? 'video' : 'image',
                    mimeType: file.type,
                    path: physicalPath || URL.createObjectURL(file),
                    preview: URL.createObjectURL(file),
                    metadata: { title: '', description: '', keywords: '' }
                };
            });
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    return (
        <div className="h-full w-full bg-[#09090b] text-slate-200 font-sans flex flex-col overflow-hidden relative" onDragEnter={handleDrag}>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border animate-in fade-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error'
                    ? 'bg-[#18181b] border-red-500/50 text-red-200 shadow-red-500/10'
                    : 'bg-[#18181b] border-emerald-500/50 text-emerald-200 shadow-emerald-500/10'
                    }`}>
                    {toast.type === 'error' ? (
                        <div className="p-1 bg-red-500/20 rounded-full">
                            <X size={16} className="text-red-400" />
                        </div>
                    ) : (
                        <div className="p-1 bg-emerald-500/20 rounded-full">
                            <Check size={16} className="text-emerald-400" />
                        </div>
                    )}
                    <span className="text-sm font-medium pr-1">{toast.message}</span>
                </div>
            )}

            {/* Header - Standard GridVid Style */}
            <header className="flex justify-between items-center px-4 py-3 z-50 relative border-b border-white/5 bg-[#0e0e14]">
                <div className="flex items-center gap-3 no-drag">
                    {/* Back Button Removed */}
                    {/* Stats Dashboard */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generated</span>
                            <span className="text-sm font-bold text-white leading-none">{stats.generated}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider">Success</span>
                            <span className="text-sm font-bold text-emerald-400 leading-none">{stats.success}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-red-500/70 font-bold uppercase tracking-wider">Failed</span>
                            <span className="text-sm font-bold text-red-400 leading-none">{stats.failed}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 no-drag">
                    {processingId ? (
                        <button
                            onClick={() => {
                                stopBatchRef.current = true;
                                setToast({ type: 'info', message: 'Stopping after current file...' });
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 border bg-red-600 hover:bg-red-500 text-white border-white/10 animate-pulse"
                        >
                            <Square size={14} fill="currentColor" />
                            <span>Stop Generate</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleAutoGenerateClick}
                            disabled={files.length === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 border ${files.length === 0
                                ? 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-white/10'
                                }`}
                        >
                            <Sparkles size={14} />
                            <span>Auto Generate</span>
                        </button>
                    )}

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1"></div>
                    {/* <WindowControls /> */}
                </div>
            </header>

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={(cfg) => setToast({ type: 'success', message: 'Settings saved!' })}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* File Grid / Drop Zone */}
                <div className="flex-1 overflow-y-auto p-4 relative" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
                    {files.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 m-8 rounded-3xl bg-white/[0.02]">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <Upload size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300 mb-2">Drag & Drop Files Here</h3>
                            <p className="text-sm opacity-60 max-w-xs text-center mb-6">Support for JPG, PNG, MP4, MOV. Edit metadata in batch or individually.</p>
                            <label className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium cursor-pointer transition-all border border-white/10 hover:border-white/20">
                                Browse Files
                                <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                            </label>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {files.map(file => (
                                <div
                                    key={file.id}
                                    onClick={() => setSelectedFileId(file.id)}
                                    className={`group relative aspect-square bg-[#18181b] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedFileId === file.id
                                        ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                        : 'border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-10" />
                                    {file.type === 'video' ? (
                                        <video src={file.preview} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                                    )}

                                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 bg-black/50 text-white rounded-lg hover:bg-red-500/80 transition-colors backdrop-blur-md">
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="absolute bottom-0 inset-x-0 p-3 z-20">
                                        <div className="flex items-center gap-2 mb-1">
                                            {file.type === 'video' ? <FileVideo size={12} className="text-blue-400" /> : <FileImage size={12} className="text-purple-400" />}
                                            <span className="text-[10px] bg-white/10 px-1.5 rounded text-slate-300 backdrop-blur-md">{file.size}</span>
                                        </div>
                                        <p className="text-xs font-medium text-white truncate">{file.name}</p>
                                    </div>

                                    {/* Processing Overlay */}
                                    {processingId === file.id && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center flex-col gap-2">
                                            <Loader2 size={24} className="text-purple-400 animate-spin" />
                                            <span className="text-[10px] font-medium text-purple-200">Generating...</span>
                                        </div>
                                    )}

                                    {/* Has Metadata Indicator */}
                                    {file.metadata?.title && (
                                        <div className="absolute top-2 left-2 z-20">
                                            <div className="p-1 bg-green-500/80 rounded-md shadow-lg backdrop-blur-md">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {dragActive && (
                        <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-3xl flex items-center justify-center">
                            <div className="text-2xl font-bold text-white drop-shadow-md">Drop Files to Load</div>
                        </div>
                    )}
                </div>

                {/* Inspector Sidebar */}
                <div className="w-80 bg-[#0e0e14] border-l border-white/5 flex flex-col z-20">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Info size={16} className="text-blue-500" /> Inspector
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {selectedFile ? (
                            <>
                                <div className="space-y-4">
                                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-white/5 relative group">
                                        {selectedFile.type === 'video' ? (
                                            <video src={selectedFile.preview} className="w-full h-full object-contain" controls />
                                        ) : (
                                            <img src={selectedFile.preview} alt={selectedFile.name} className="w-full h-full object-contain" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white break-all line-clamp-2">{selectedFile.name}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{selectedFile.size} • {selectedFile.type.toUpperCase()}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                            <Type size={12} /> TITLE
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Enter title..."
                                            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            value={selectedFile.metadata.title || ''}
                                            onChange={(e) => updateFileMetadata(selectedFile.id, { title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                            <MoreVertical size={12} /> DESCRIPTION
                                        </label>
                                        <textarea
                                            rows={4}
                                            placeholder="Enter description..."
                                            className="w-full bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-y"
                                            value={selectedFile.metadata.description || ''}
                                            onChange={(e) => updateFileMetadata(selectedFile.id, { description: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                                                <Tag size={12} /> KEYWORDS
                                            </label>
                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${selectedFile.metadata.keywords && selectedFile.metadata.keywords.split(',').filter(k => k.trim()).length >= 50
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-white/10 text-slate-400'
                                                }`}>
                                                {selectedFile.metadata.keywords ? selectedFile.metadata.keywords.split(',').filter(k => k.trim()).length : 0} / 49
                                            </span>
                                        </div>

                                        <div className="w-full bg-[#18181b] border border-white/10 rounded-lg p-2 text-sm text-white focus-within:border-blue-500/50 flex flex-wrap gap-2 min-h-[100px] content-start">
                                            {selectedFile.metadata.keywords && selectedFile.metadata.keywords.split(',').filter(k => k.trim()).map((keyword, index) => (
                                                <span key={index} className="flex items-center gap-1 bg-blue-600/20 text-blue-300 px-2 py-1 rounded-md text-xs border border-blue-500/30">
                                                    {keyword.trim()}
                                                    <button
                                                        onClick={() => {
                                                            const current = selectedFile.metadata.keywords.split(',').map(k => k.trim()).filter(Boolean);
                                                            const newKeywords = current.filter((_, i) => i !== index);
                                                            updateFileMetadata(selectedFile.id, { keywords: newKeywords.join(', ') });
                                                        }}
                                                        className="hover:text-white transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                placeholder="Add tag..."
                                                className="bg-transparent outline-none flex-1 min-w-[60px] text-xs py-1"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val) {
                                                            const current = selectedFile.metadata.keywords ? selectedFile.metadata.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
                                                            if (!current.includes(val)) {
                                                                updateFileMetadata(selectedFile.id, { keywords: [...current, val].join(', ') });
                                                            }
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-3 opacity-50">
                                <Info size={40} strokeWidth={1.5} />
                                <p className="text-sm font-medium">Select a file to edit metadata</p>
                            </div>
                        )}
                    </div>

                    {selectedFile && (
                        <div className="p-4 border-t border-white/5 bg-[#0e0e14]">
                            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-all">
                                Apply Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
