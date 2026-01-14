import React, { useRef, useState } from "react";
import Stack from "./Stack";

const UploadArea = ({
    onFileSelect,
    selectedFiles,
    batchStatuses,
    onClear,
}) => {
    const fileInputRef = useRef(null);

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add("dragover");
    };

    const handleDragLeave = () => {
        fileInputRef.current.classList.remove("dragover");
    };

    const handleDrop = (e) => {
        e.preventDefault();
        fileInputRef.current.classList.remove("dragover");
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFileSelect(files);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            onFileSelect(Array.from(e.target.files));
        }
    };

    const handleClear = () => {
        // Clear the file input
        fileInputRef.current.value = "";
        // Clear selected files
        onFileSelect([]);
        // Call parent clear handler if provided
        if (onClear) {
            onClear();
        }
    };

    return (
        <div className="mb-6">
            <div
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 transition-all duration-300 cursor-pointer bg-slate-900/50 hover:bg-slate-900 min-h-[160px] flex flex-col items-center justify-center relative overflow-hidden group"
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                {selectedFiles.length > 0 ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 animate-pulse">
                            <span className="text-3xl">🖼️</span>
                        </div>
                        <div className="text-center">
                            <div className="text-slate-100 font-semibold text-lg mb-1">
                                {selectedFiles.length} Images Selected
                            </div>
                            <div className="text-slate-400 text-xs mb-3">
                                Ready to process
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 text-xs rounded-lg transition-all duration-200 font-medium"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 mb-3 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5 group-hover:bg-slate-700 transition-all duration-300">
                            <span className="text-xl opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                📁
                            </span>
                        </div>
                        <div className="text-slate-300 font-medium text-xs mb-1 text-center px-4">
                            Click or drag files here
                        </div>
                        <div className="text-slate-600 text-[10px] text-center uppercase tracking-wider font-bold">
                            JPG • PNG • WEBP MAX 10MB
                        </div>
                    </>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default UploadArea;
