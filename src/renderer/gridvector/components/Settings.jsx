import React from "react";

const Settings = ({
    locale,
    setLocale,
    chunkSize,
    setChunkSize,
    format,
    setFormat,
    csrfToken,
    setCsrfToken,
    savePath,
    setSavePath,
    downloadAdditional,
    setDownloadAdditional,
    additionalFormat,
    setAdditionalFormat,
    userQuota
}) => {
    const handleSelectFolder = async () => {
        try {
            const result = await window.api.selectFolder();
            if (result && result !== null) {
                // If result is string (filePath) or object {success, path} depending on API
                // Main.js says: return result.filePaths[0]; (so returns string or null)
                // But main.js has: ipcMain.handle('open-directory-dialog', ...) which returns path
                // Wait, main.js has `select-folder` (I didn't add it yet! I added `check-config`).
                // I need to add `select-folder` to main.js as well if I want it to work.
                // Or reuse `open-directory-dialog`.
                // I'll update main.js in next step or assume `selectFolder` calls `open-directory-dialog` in preload.
                setSavePath(result);
                localStorage.setItem("savePath", result);
            }
        } catch (error) {
            console.error("Error selecting folder:", error);
        }
    };

    return (
        <div className="mb-6">
            <div className="mb-4">
                <label
                    htmlFor="save-path"
                    className="block mb-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider"
                >
                    Save Path:
                </label>
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            id="save-path"
                            value={savePath}
                            onChange={(e) => setSavePath(e.target.value)}
                            placeholder="Select folder..."
                            className="w-full pl-3 pr-3 py-2.5 bg-slate-900 border border-white/5 rounded-lg text-slate-200 text-xs placeholder-slate-600 focus:border-indigo-500 focus:bg-slate-900 focus:outline-none transition-all truncate"
                            readOnly
                            title={savePath} // Show full path on hover
                        />
                    </div>
                    <button
                        onClick={handleSelectFolder}
                        className="flex-shrink-0 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition-all shadow-sm whitespace-nowrap active:scale-95"
                    >
                        Browse
                    </button>
                </div>
            </div>
            <div className="mb-4">
                <label
                    htmlFor="format"
                    className="block mb-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider"
                >
                    Download Format:
                </label>
                <select
                    id="format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-white/5 rounded-lg text-slate-200 text-xs focus:border-indigo-500 focus:bg-slate-900 focus:outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="svg">SVG</option>
                    <option value="eps">EPS</option>
                </select>
            </div>
            <div className="mb-4">
                <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <div className="relative mt-0.5">
                        <input
                            type="checkbox"
                            checked={downloadAdditional}
                            onChange={(e) => setDownloadAdditional(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-4 h-4 bg-slate-900 border border-slate-600 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all duration-200"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <span className="text-slate-300 font-medium text-xs leading-tight group-hover:text-white transition-colors">
                        Also Download Image
                    </span>
                </label>
                <p className="text-zinc-400 text-xs mt-1">
                    Download additional image format alongside the vector file with the
                    same filename.
                </p>
                {downloadAdditional && (
                    <div className="mt-3">
                        <label
                            htmlFor="additional-format"
                            className="block mb-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider"
                        >
                            Additional Format:
                        </label>
                        <select
                            id="additional-format"
                            value={additionalFormat}
                            onChange={(e) => setAdditionalFormat(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-900 border border-white/5 rounded-lg text-slate-200 text-xs focus:border-indigo-500 focus:bg-slate-900 focus:outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="png">PNG</option>
                            <option value="jpg">JPG</option>
                        </select>
                    </div>
                )}
            </div>
            {/* Hidden settings */}
            <input
                type="hidden"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
            />
            <input
                type="hidden"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value, 10))}
            />
            <input
                type="hidden"
                value={csrfToken}
                onChange={(e) => setCsrfToken(e.target.value)}
            />
        </div>
    );
};

export default Settings;
