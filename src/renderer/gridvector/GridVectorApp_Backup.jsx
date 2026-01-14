import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Globe, Play, Square, Pause, RotateCcw, Upload, File as FileIcon, CheckCircle, XCircle, Loader2, ArrowRight, Lock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { VECTORIZER_INJECTED_CODE, LOGIN_INJECTED_CODE } from './vectorizerInjectedCode';

// Initialize Supabase
const supabaseUrl = 'https://wdvedlmnapxxfvpyfwqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdmVkbG1uYXB4eGZ2cHlmd3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjE5NzUsImV4cCI6MjA2MDM5Nzk3NX0.yLIbYKF1PfzEo3gMO0H8SgXN8AAPRYgDTJewg8nb7GA';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function GridVectorApp({ onBack, onLogout }) {
    // --- STATE ---
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, processed: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentStatus, setCurrentStatus] = useState('Idle');

    // Config
    const [format, setFormat] = useState('SVG');
    const [includeImage, setIncludeImage] = useState(false);
    const [imageFormat, setImageFormat] = useState('PNG');

    // Credentials
    const [creds, setCreds] = useState({ email: '', password: '' });
    const [credsLoaded, setCredsLoaded] = useState(false);

    // WebView
    const webviewRef = useRef(null);
    const [webviewReady, setWebviewReady] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('https://vectorizer.ai');
    const [loggedIn, setLoggedIn] = useState(false);

    // --- EFFECTS ---

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        try {
            const { data, error } = await supabase
                .from('app_config')
                .select('*')
                .eq('id', 'default_config')
                .single();

            if (data && data.email && data.password) {
                setCreds({ email: data.email, password: data.password });
                setCredsLoaded(true);
            }
        } catch (e) {
            console.error("Failed to load credentials", e);
        }
    };

    useEffect(() => {
        if (isProcessing && queue.length > 0) {
            if (currentIndex < queue.length) {
                processItem(currentIndex);
            } else {
                setIsProcessing(false);
                setCurrentStatus('Batch Completed');
            }
        }
    }, [isProcessing, currentIndex]);

    // WebView Event Listeners
    useEffect(() => {
        const wv = webviewRef.current;
        if (!wv) return;

        const onDomReady = () => {
            setWebviewReady(true);
            try {
                // If we are on vectorizer, inject vectorizer code
                if (wv.getURL().includes("vectorizer.ai")) {
                    wv.executeJavaScript(VECTORIZER_INJECTED_CODE);
                }
                // If we are on login page, inject login code
                else if (wv.getURL().includes("cedarlakeventures.com")) {
                    wv.executeJavaScript(LOGIN_INJECTED_CODE);
                }
                setCurrentUrl(wv.getURL());
            } catch (e) { }
        };

        const onDidNavigate = (e) => {
            setCurrentUrl(e.url);
            // Re-evaluate injection on nav
            const wv = webviewRef.current;
            if (wv) {
                if (e.url.includes("vectorizer.ai")) {
                    wv.executeJavaScript(VECTORIZER_INJECTED_CODE);
                } else if (e.url.includes("cedarlakeventures.com")) {
                    wv.executeJavaScript(LOGIN_INJECTED_CODE);
                }
            }
        };

        wv.addEventListener('dom-ready', onDomReady);
        wv.addEventListener('did-navigate', onDidNavigate);

        return () => {
            wv.removeEventListener('dom-ready', onDomReady);
            wv.removeEventListener('did-navigate', onDidNavigate);
        };
    }, []);

    // --- HELPERS ---

    const addToQueue = (files) => {
        if (!files) return;
        const newItems = Array.from(files).map(file => ({
            file,
            id: Math.random().toString(36),
            status: 'pending',
            error: null
        }));
        setQueue(prev => [...prev, ...newItems]);
        setStats(prev => ({ ...prev, total: prev.total + newItems.length }));
    };

    const performAutoLogin = async (wv) => {
        if (!creds.email || !creds.password) {
            throw new Error("Credentials not loaded from Supabase");
        }

        setCurrentStatus("Logging in...");
        const loginUrl = `https://cedarlakeventures.com/signon/v0/we54b154ba3adfa5e/single?lc=en-US&loginPath=%2Flogin_callback%3Fredir%3D%252F&email=${encodeURIComponent(creds.email)}`;

        wv.loadURL(loginUrl);
        await waitForWebViewLoad(wv);

        // Inject Login Code
        await wv.executeJavaScript(LOGIN_INJECTED_CODE);

        // Execute Login
        await wv.executeJavaScript(`window.performLogin("${creds.email}", "${creds.password}")`);

        // Wait for redirect to vectorizer.ai
        const success = await waitForRedirect(wv, "vectorizer.ai");
        if (!success) throw new Error("Login redirect timed out");

        setLoggedIn(true);
    };

    const waitForRedirect = (wv, targetStr) => {
        return new Promise(resolve => {
            const check = setInterval(() => {
                if (wv.getURL().includes(targetStr)) {
                    clearInterval(check);
                    resolve(true);
                }
            }, 500);
            setTimeout(() => {
                clearInterval(check);
                resolve(false);
            }, 30000);
        });
    };

    const processItem = async (index) => {
        const item = queue[index];
        if (!item || item.status === 'success') {
            setCurrentIndex(prev => prev + 1);
            return;
        }

        updateItemStatus(index, 'processing');
        setCurrentStatus(`Processing ${item.file.name}...`);

        try {
            const wv = webviewRef.current;
            if (!wv) throw new Error("WebView not ready");

            await ensureHomepage(wv);
            if (!isProcessing) throw new Error("Stopped");

            // IPC Renaming
            const basename = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
            if (window.api && window.api.send) {
                window.api.send('set-next-download-name', basename);
            }

            // Read & Upload
            const base64Coords = await readFileAsBase64(item.file);
            let uploadSuccess = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                if (!isProcessing) throw new Error("Stopped");
                await ensureHomepage(wv);
                await wv.executeJavaScript(VECTORIZER_INJECTED_CODE);

                try {
                    const res = await wv.executeJavaScript(`
                        window.handleUpload("${base64Coords}", "${item.file.name}", "${item.file.type}")
                    `);
                    if (res === "Ready") {
                        uploadSuccess = true;
                        break;
                    }
                } catch (e) {
                    console.warn(`Upload attempt ${attempt + 1} failed:`, e);
                }
                await new Promise(r => setTimeout(r, 2000));
            }

            if (!uploadSuccess) throw new Error("Upload failed or timed out");

            // Download Trigger
            let downloadSuccess = false;
            for (let i = 0; i < 5; i++) {
                try {
                    await wv.executeJavaScript(`window.handleDownload("${format}")`);
                    downloadSuccess = true;
                    break;
                } catch (e) {
                    await new Promise(r => setTimeout(r, 1500));
                }
            }
            if (!downloadSuccess) throw new Error("Download Trigger Failed");

            await new Promise(r => setTimeout(r, 4000));

            if (includeImage) {
                for (let i = 0; i < 3; i++) {
                    try {
                        await wv.executeJavaScript(`window.handleDownload("${imageFormat}")`);
                        break;
                    } catch (e) {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
                await new Promise(r => setTimeout(r, 4000));
            }

            updateItemStatus(index, 'success');
            setStats(prev => ({ ...prev, success: prev.success + 1, processed: prev.processed + 1 }));

        } catch (err) {
            console.error("Processing Error:", err);
            updateItemStatus(index, 'error', err.message);
            setStats(prev => ({ ...prev, failed: prev.failed + 1, processed: prev.processed + 1 }));
        }

        await new Promise(r => setTimeout(r, 1000));
        setCurrentIndex(prev => prev + 1);
    };

    const ensureHomepage = async (wv) => {
        let attempts = 0;
        while (attempts < 10) {
            if (!isProcessing) throw new Error("Stopped");
            const url = wv.getURL();
            if (url.includes("/pricing") || !url.includes("vectorizer.ai") || url.includes("/images/")) {
                wv.loadURL("https://vectorizer.ai");
                await waitForWebViewLoad(wv);
                await new Promise(r => setTimeout(r, 1500));
            } else {
                return;
            }
            attempts++;
        }
    };

    const updateItemStatus = (index, status, error = null) => {
        setQueue(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], status, error };
            return copy;
        });
    };

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const waitForWebViewLoad = (wv) => {
        return new Promise(resolve => {
            if (!wv.isLoading()) return resolve();
            const handler = () => {
                wv.removeEventListener('did-stop-loading', handler);
                resolve();
            };
            wv.addEventListener('did-stop-loading', handler);
        });
    };

    const handleStart = async () => {
        if (queue.length === 0) return;

        setIsProcessing(true);
        setCurrentStatus("Initializing...");

        // 1. Check Login
        if (!loggedIn && credsLoaded) {
            try {
                const wv = webviewRef.current;
                await performAutoLogin(wv);
            } catch (e) {
                console.error("Login Failed:", e);
                setCurrentStatus("Login Failed: " + e.message);
                setIsProcessing(false);
                return;
            }
        }

        if (currentIndex >= queue.length) {
            setCurrentIndex(0);
            setStats({ total: queue.length, success: 0, failed: 0, processed: 0 });
            setQueue(prev => prev.map(i => ({ ...i, status: 'pending', error: null })));
        }
    };

    const handleStop = () => {
        setIsProcessing(false);
        setCurrentStatus("Stopped");
    };

    const handleClear = () => {
        if (isProcessing) return;
        setQueue([]);
        setStats({ total: 0, success: 0, failed: 0, processed: 0 });
        setCurrentIndex(0);
    };

    return (
        <div className="h-screen w-screen bg-black text-slate-200 font-sans flex flex-col overflow-hidden relative selection:bg-orange-500/30 selection:text-white">

            {/* Header */}
            <header className="flex justify-between items-center px-4 py-3 bg-black border-b border-white/5 draggable-region z-50">
                <div className="flex gap-3 items-center no-drag">
                    <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-900/20">
                            <RefreshCw size={14} className="text-white animate-spin-slow" style={{ animationDuration: '10s' }} />
                        </div>
                        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400 tracking-wide">GridVector</span>
                    </div>
                </div>

                {/* Processing Status / Controls */}
                <div className="flex items-center gap-4 no-drag">
                    {credsLoaded ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <Lock size={8} /> Creds Loaded
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            <Lock size={8} /> No Creds
                        </div>
                    )}
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">{currentStatus}</span>
                    <div className="flex gap-2">
                        {!isProcessing ? (
                            <button
                                onClick={handleStart}
                                disabled={queue.length === 0}
                                className="flex items-center gap-2 px-4 py-1.5 bg-orange-600 hover:bg-orange-500 ml-2 rounded-md text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/20"
                            >
                                <Play size={12} fill="currentColor" /> Start Batch
                            </button>
                        ) : (
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-2 px-4 py-1.5 bg-red-900/50 border border-red-500/50 hover:bg-red-900/80 ml-2 rounded-md text-red-200 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/10"
                            >
                                <Square size={12} fill="currentColor" /> Stop
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: Config & Queue */}
                <div className="w-80 flex flex-col border-r border-white/5 bg-[#0a0a0c]">

                    {/* Stats */}
                    <div className="p-4 border-b border-white/5 grid grid-cols-3 gap-2">
                        <div className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Queue</div>
                            <div className="text-lg font-mono font-bold text-white">{stats.total}</div>
                        </div>
                        <div className="bg-emerald-500/5 rounded-lg p-2 text-center border border-emerald-500/10">
                            <div className="text-xs text-emerald-500/70 mb-1 uppercase tracking-wider">Success</div>
                            <div className="text-lg font-mono font-bold text-emerald-400">{stats.success}</div>
                        </div>
                        <div className="bg-red-500/5 rounded-lg p-2 text-center border border-red-500/10">
                            <div className="text-xs text-red-500/70 mb-1 uppercase tracking-wider">Failed</div>
                            <div className="text-lg font-mono font-bold text-red-400">{stats.failed}</div>
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="p-4 border-b border-white/5 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Output Format</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['SVG', 'EPS', 'PDF', 'DXF'].map(fmt => (
                                    <button
                                        key={fmt}
                                        onClick={() => setFormat(fmt)}
                                        className={`px-3 py-2 rounded-md text-xs font-medium border transition-all ${format === fmt ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-900/20' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                                    >
                                        {fmt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Include Raster</label>
                                <button
                                    onClick={() => setIncludeImage(!includeImage)}
                                    className={`w-8 h-4 rounded-full transition-colors relative ${includeImage ? 'bg-orange-500' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${includeImage ? 'left-4.5' : 'left-0.5'}`} style={{ left: includeImage ? 'calc(100% - 14px)' : '2px' }} />
                                </button>
                            </div>
                            {includeImage && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {['PNG', 'JPG'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setImageFormat(fmt)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-medium border transition-all ${imageFormat === fmt ? 'bg-white/20 text-white border-white/20' : 'bg-white/5 text-slate-500 border-white/5'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Drop Zone */}
                    <div className="p-4">
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer group mb-2">
                            <Upload className="w-6 h-6 text-slate-500 group-hover:text-orange-400 mb-2 transition-colors" />
                            <span className="text-xs text-slate-500 font-medium group-hover:text-slate-300">Drop images or click</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => addToQueue(e.target.files)}
                            />
                        </label>
                        {queue.length > 0 && (
                            <button onClick={handleClear} className="w-full py-1.5 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors">
                                Clear Queue
                            </button>
                        )}
                    </div>

                    {/* Queue List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {queue.map((item, idx) => (
                            <div key={item.id + idx} className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${idx === currentIndex && isProcessing ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/5'}`}>
                                <div className="w-10 h-10 rounded bg-black/50 overflow-hidden flex-shrink-0 relative">
                                    <div className="absolute inset-0 flex items-center justify-center text-[8px] text-slate-600 font-mono">IMG</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-slate-200 truncate">{item.file.name}</div>
                                    <div className="text-[10px] text-slate-500">
                                        {(item.file.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                                <div>
                                    {item.status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-600" />}
                                    {item.status === 'processing' && <Loader2 size={14} className="text-orange-400 animate-spin" />}
                                    {item.status === 'success' && <CheckCircle size={14} className="text-emerald-400" />}
                                    {item.status === 'error' && <XCircle size={14} className="text-red-400" title={item.error} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: WebView */}
                <div className="flex-1 relative bg-[#1a1a1c] flex flex-col">
                    {/* WebView Toolbar */}
                    <div className="h-10 bg-black/50 border-b border-white/5 flex items-center px-4 gap-2">
                        <Globe size={12} className="text-slate-500" />
                        <input
                            value={currentUrl}
                            readOnly
                            className="flex-1 bg-transparent text-xs text-slate-500 font-mono outline-none"
                        />
                        <button
                            className="text-slate-500 hover:text-white"
                            onClick={() => webviewRef.current?.reload()}
                        >
                            <RefreshCw size={12} />
                        </button>
                    </div>

                    <div className="flex-1 relative">
                        <webview
                            ref={webviewRef}
                            src="https://vectorizer.ai"
                            className="w-full h-full"
                            style={{ display: 'flex' }}
                            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        />

                        {!webviewReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1c] z-10">
                                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const style = document.createElement('style');
style.textContent = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
  .animate-spin-slow { animation: spin 3s linear infinite; }
`;
document.head.appendChild(style);
