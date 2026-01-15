import React, { useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Sparkles, Zap, FileText, Trash2, Play, FolderOpen, Download } from 'lucide-react';

const BatchGenerator = ({
    files = [],
    onFilesChange,
    onStart,
    isProcessing,
    processingStatus,
    onStop
}) => {
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    };

    const processFiles = (newFiles) => {
        const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
        const newImages = validFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            url: URL.createObjectURL(file), // Preview URL
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            type: file.type,
            status: 'pending' // pending, success, error
        }));

        onFilesChange(prev => [...prev, ...newImages]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const removeFile = (id) => {
        onFilesChange(prev => prev.filter(f => f.id !== id));
    };

    const clearAll = () => {
        onFilesChange([]);
    };

    const handleDownload = () => {
        const texts = files
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
        a.download = `batch-prompts-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Sparkles className="text-blue-400 fill-blue-400/20" />
                                Batch Process Generation
                            </h2>
                            <p className="text-slate-400 mt-2">Generate AI prompts for your local local image collection in bulk.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => fileInputRef.current.click()}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all border border-slate-700 flex items-center gap-2"
                            >
                                <Upload size={18} /> Add Images
                            </button>
                            <button
                                onClick={() => folderInputRef.current.click()}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-all border border-slate-700 flex items-center gap-2"
                            >
                                <FolderOpen size={18} /> Add Folder
                            </button>
                            {files.some(f => f.generatedPrompt) && (
                                <button
                                    onClick={handleDownload}
                                    className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2"
                                >
                                    <Download size={18} /> Download Results
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                                accept="image/*"
                            />
                            <input
                                type="file"
                                ref={folderInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                webkitdirectory=""
                                directory=""
                                multiple
                            />
                            <input
                                type="file"
                                ref={folderInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                webkitdirectory=""
                                directory=""
                                multiple
                            />
                        </div>
                    </div>

                    {/* Drag & Drop Zone (if empty) */}
                    {files.length === 0 ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50 min-h-[400px] flex flex-col items-center justify-center text-center p-12 transition-colors hover:border-blue-500/50 hover:bg-slate-900/80 group cursor-pointer"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ImageIcon size={40} className="text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Drag & Drop Images Here</h3>
                            <p className="text-slate-400 max-w-sm">Support JPG, PNG, WEBP. You can also select a folder to import multiple images at once.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Action Bar */}
                            <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-xl sticky top-0 z-20 shadow-xl">
                                <div className="flex items-center gap-4">
                                    <span className="text-slate-400 font-medium">Total Images: <span className="text-white font-bold">{files.length}</span></span>
                                    <div className="h-4 w-px bg-slate-700" />
                                    <button onClick={clearAll} className="text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-1">
                                        <Trash2 size={14} /> Clear All
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    {isProcessing ? (
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-blue-400 font-bold animate-pulse">PROCESSING...</span>
                                                {processingStatus && (
                                                    <span className="text-xs text-slate-400">
                                                        {processingStatus.completed}/{processingStatus.total}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={onStop}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2 rounded-lg font-bold transition-all border border-red-500/20"
                                            >
                                                Stop
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={onStart}
                                            disabled={files.length === 0}
                                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all transform hover:scale-105"
                                        >
                                            <Play size={18} fill="currentColor" /> Start Batch Process
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Grid Layout */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {files.map((item, idx) => (
                                    <div key={item.id || idx} className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all flex flex-col">
                                        {/* Image Preview */}
                                        <div className="aspect-square relative bg-slate-900 overflow-hidden">
                                            <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <p className="text-xs text-white truncate">{item.name}</p>
                                                <p className="text-[10px] text-slate-400">{item.size}</p>
                                            </div>

                                            {/* Remove Button */}
                                            {!isProcessing && (
                                                <button
                                                    onClick={() => removeFile(item.id)}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}

                                            {/* Status Badge */}
                                            {item.status === 'success' && (
                                                <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/90 text-white text-[10px] font-bold rounded shadow-lg backdrop-blur flex items-center gap-1">
                                                    <Zap size={10} fill="currentColor" /> DONE
                                                </div>
                                            )}
                                            {item.status === 'error' && (
                                                <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/90 text-white text-[10px] font-bold rounded shadow-lg backdrop-blur">
                                                    ERROR
                                                </div>
                                            )}
                                        </div>

                                        {/* Prompt Result Area */}
                                        {item.generatedPrompt ? (
                                            <div className="p-3 bg-slate-800 border-t border-slate-700 flex-1 flex flex-col">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                    <FileText size={10} /> Generated Prompt
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                                                    {item.generatedPrompt}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="h-2 p-1">
                                                {isProcessing && processingStatus?.completed === idx && (
                                                    <div className="h-1 bg-blue-500 animate-[loading_1s_infinite] w-full rounded-full"></div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BatchGenerator;
