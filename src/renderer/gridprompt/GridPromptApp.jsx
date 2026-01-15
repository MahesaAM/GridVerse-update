import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Globe, X, ChevronLeft, ChevronRight, History, Settings, Image, PanelRight, ArrowLeft } from 'lucide-react';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import HistoryPage from './components/HistoryPage';
import BatchGenerator from './components/BatchGenerator';

export default function GridPromptApp({ onBack, onLogout, onProcessingChange }) {
    const [url, setUrl] = useState('https://stock.adobe.com/search?k=cyberpunk'); // Default to a useful site for scraping
    const [inputUrl, setInputUrl] = useState('https://stock.adobe.com/search?k=cyberpunk');
    const [isLoading, setIsLoading] = useState(false);
    const [rawImages, setRawImages] = useState([]); // Store all found images

    const [images, setImages] = useState([]); // Store filtered images
    const [localImages, setLocalImages] = useState([]); // Store local images
    const [activeTab, setActiveTab] = useState('web'); // Track active sidebar tab
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);
    const processingRef = useRef(false); // Ref for immediate loop control
    const [processingStatus, setProcessingStatus] = useState('');
    const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }

    const webviewRef = useRef(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

    // Settings State
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('gridprompt-settings');
        return saved ? JSON.parse(saved) : {
            maxImages: 200, // Increased limit
            minImageWidth: 50,
            minImageHeight: 50,
            geminiApiKey: '',
            promptTemplate: 'Describe this image in detail for an AI art generator.',
            history: []
        };
    });

    // Toast Timer
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Filter images based on settings
    useEffect(() => {
        if (!rawImages.length) {
            setImages([]);
            return;
        }

        const filtered = rawImages.filter(img =>
            img.width >= settings.minImageWidth &&
            img.height >= settings.minImageHeight &&
            (!img.type || img.type === 'image') && // Exclude explicit non-image types
            !img.url.toLowerCase().endsWith('.gif') && // Exclude GIFs
            !img.url.toLowerCase().endsWith('.mp4') && // Exclude Videos
            !img.url.toLowerCase().endsWith('.webm') &&
            !img.url.includes('spacer') // Explicitly exclude known spacer names
        ).slice(0, settings.maxImages);

        setImages(prevImages => {
            return filtered.map(newImg => {
                const existing = prevImages.find(p => p.url === newImg.url);
                // Preserve generation status and result if URL matches
                if (existing && (existing.generatedPrompt || existing.status || existing.error)) {
                    return { ...newImg, ...existing };
                }
                return newImg;
            });
        });
    }, [rawImages, settings.maxImages, settings.minImageWidth, settings.minImageHeight]);

    // --- Processing Logic (Mock -> Real) ---
    const handleStartGeneration = async () => {
        const targetImages = activeTab === 'web' ? images : localImages;
        const setTargetList = activeTab === 'web' ? setImages : setLocalImages;

        if (targetImages.length === 0) {
            setToast({ type: 'error', message: 'No images to process.' });
            return;
        }

        // Read Global Config
        const globalSaved = localStorage.getItem('global-ai-config');
        if (!globalSaved) {
            setToast({ type: 'error', message: 'Please configure Global AI Settings in App Launcher.' });
            return;
        }
        const globalConfig = JSON.parse(globalSaved);
        const provider = globalConfig.provider || 'gemini';

        // Prepare keys if Groq
        let groqKeys = [];
        if (provider === 'groq') {
            const storedKeys = localStorage.getItem('groq_api_keys');
            if (storedKeys) {
                try {
                    groqKeys = JSON.parse(storedKeys);
                } catch (e) {
                    setToast({ type: 'error', message: 'Invalid Groq keys cache.' });
                    return;
                }
            }
            if (groqKeys.length === 0 && !globalConfig.apiKey) {
                setToast({ type: 'error', message: 'No Groq keys found.' });
                return;
            }
        } else {
            // For Gemini/GPT, check API Key
            if (!globalConfig.apiKey) {
                setToast({ type: 'error', message: `Missing API Key for ${provider} in Global Settings.` });
                return;
            }
        }

        setIsProcessing(true);
        if (onProcessingChange) onProcessingChange(true);
        processingRef.current = true;
        setProcessingStatus('Initializing...');

        // Helper to Generate Prompt based on Global Provider
        const generatePrompt = async (base64, mimeType) => {
            console.log(`Generating prompt with ${provider}...`, { mimeType });

            try {
                let result;
                if (provider === 'groq') {
                    // Random Key Logic for Groq
                    let apiKey = globalConfig.apiKey; // Manual override (unlikely now but safe to keep logic)
                    if (!apiKey && groqKeys.length > 0) {
                        apiKey = groqKeys[Math.floor(Math.random() * groqKeys.length)];
                    }

                    result = await window.api.invoke('generate-groq-prompt', {
                        apiKey,
                        base64,
                        mimeType,
                        prompt: settings.promptTemplate,
                        model: globalConfig.model // Explicitly pass global model
                    });
                } else if (provider === 'gemini') {
                    result = await window.api.generateGeminiPrompt({
                        apiKey: globalConfig.apiKey,
                        base64,
                        mimeType,
                        prompt: settings.promptTemplate
                    });
                } else {
                    throw new Error(`Provider ${provider} not fully supported in GridPrompt yet.`);
                }

                if (!result) {
                    throw new Error('No response from backend (IPC Result Undefined)');
                }

                if (!result.success) {
                    console.error(`${provider} IPC Error:`, result.error);
                    throw new Error(result.error);
                }

                return result.text;
            } catch (e) {
                console.error('Generation Exception:', e);
                throw e;
            }
        };

        const results = [];
        const total = targetImages.length;

        for (let i = 0; i < total; i++) {
            if (!processingRef.current && i > 0) break; // Check Ref for immediate stop

            const img = targetImages[i];
            console.log(`Processing image ${i + 1}/${total}:`, img.url);
            setProcessingStatus({ completed: i, total: total, text: `Processing image ${i + 1} of ${total}...` });

            try {
                // Skip already processed successfully
                if (img.status === 'success' && img.generatedPrompt) {
                    results.push(img);
                    continue;
                }

                let base64, mimeType;

                if (img.file) { // Local File
                    console.log('Processing local file...');
                    base64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const result = reader.result;
                            resolve(result.split(',')[1]);
                        };
                        reader.onerror = (err) => {
                            console.error('FileReader error:', err);
                            reject(err);
                        };
                        reader.readAsDataURL(img.file);
                    });
                    mimeType = img.file.type;
                } else { // Remote URL
                    console.log('Fetching remote image:', img.url);
                    const imgData = await window.api.fetchImageBase64(img.url);
                    console.log('Fetch result:', imgData);

                    if (!imgData.success) {
                        throw new Error(imgData.error || 'Failed to fetch image');
                    }

                    if (imgData.mimeType && (imgData.mimeType.includes('svg') || imgData.mimeType.includes('xml'))) {
                        throw new Error(`Unsupported image type: ${imgData.mimeType} (Gemini does not support SVG)`);
                    }

                    base64 = imgData.base64;
                    mimeType = imgData.mimeType;
                }

                // 2. Generate Prompt
                const prompt = await generatePrompt(base64, mimeType);
                console.log('Prompt generated:', prompt);

                const resultImg = { ...img, generatedPrompt: prompt, status: 'success' };
                results.push(resultImg);
                setTargetList(prev => prev.map((item, idx) => idx === i ? resultImg : item));

            } catch (e) {
                console.error('Processing error for image:', img.url, e);
                const errorImg = { ...img, status: 'error', error: e.message };
                results.push(errorImg);
                setTargetList(prev => prev.map((item, idx) => idx === i ? errorImg : item));
            }
        }

        setProcessingStatus(null);
        setIsProcessing(false);
        if (onProcessingChange) onProcessingChange(false);
        processingRef.current = false;

        // Save to history (Real)
        const summaryText = results.map(r => r.generatedPrompt).filter(p => p && !p.startsWith('Error')).join('\n\n');

        if (summaryText) {
            const newEntry = {
                date: new Date().toISOString(),
                summary: `Processed ${results.length} images from ${new URL(url).hostname}`,
                details: results
            };
            const newHistory = [newEntry, ...(settings.history || [])].slice(0, 20);
            const newSettings = { ...settings, history: newHistory };
            setSettings(newSettings);
            localStorage.setItem('gridprompt-settings', JSON.stringify(newSettings));

            setToast({ type: 'success', message: 'Generation Complete! Saved to History.' });
        } else {
            const firstError = results.find(r => r.status === 'error')?.error || 'Unknown error';
            setToast({ type: 'error', message: `Generation Failed. ${firstError}` });
        }
    };

    const handleStopGeneration = () => {
        setIsProcessing(false);
        if (onProcessingChange) onProcessingChange(false);
        processingRef.current = false;
        setProcessingStatus('Stopped.');
        setToast({ type: 'info', message: 'Generation Stopped.' });
    };

    // Preload path needs to be absolute. In development with Vite, this can be tricky.
    // We'll try to resolve it relative to the current file location in the OS.
    // --- Injected Script (Replaces file-based preload for reliability) ---
    const INJECT_SCRIPT = `
                    (() => {
                        try {
                            if (window.__GPROMPT_INJECTED) {
                                if (window.__triggerScan) window.__triggerScan();
                                return;
                            }
                            window.__GPROMPT_INJECTED = true;

                            console.log('[GridPrompt] Injected Script Loaded');

                            const getBestMediaSrc = (media) => {
                                if (media.tagName === 'IMG') {
                                    return media.currentSrc || media.src || media.dataset.src || media.getAttribute('data-src') || media.getAttribute('data-original');
                                }
                                if (media.tagName === 'VIDEO') {
                                    return media.poster || media.currentSrc || media.src;
                                }
                                return null;
                            };

                            const makeAbsoluteUrl = (url, base) => {
                                try { return new URL(url, base).href; } catch (e) { return null; }
                            };

                            const isVisible = (elem) => {
                                const style = window.getComputedStyle(elem);
                                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
                            };

                            const scanMedia = () => {
                                const images = [];
                                const seenUrls = new Set();
                                const minSize = 50;

                                // Expanded selectors
                                const selectors = [
                                    'img', 'video', '[style*="background-image"]',
                                    '.js-video-thumbnail-placeholder', 'source'
                                ];

                                document.querySelectorAll(selectors.join(',')).forEach(el => {
                                    if (!isVisible(el)) return;

                                    let type = 'image';
                                    let src = null;
                                    let width = el.offsetWidth || 0;
                                    let height = el.offsetHeight || 0;

                                    if (el.tagName === 'VIDEO') {
                                        type = 'video';
                                        src = getBestMediaSrc(el);
                                        width = el.videoWidth || width;
                                        height = el.videoHeight || height;
                                    } else if (el.tagName === 'SOURCE') {
                                        return;
                                    } else {
                                        const bg = window.getComputedStyle(el).backgroundImage;
                                        if (bg && bg !== 'none' && bg.startsWith('url(')) {
                                            src = bg.slice(4, -1).replace(/["']/g, '');
                                        } else {
                                            src = getBestMediaSrc(el);
                                        }
                                    }

                                    if (!src) return;
                                    if (src.startsWith('data:image/svg')) return;
                                    if (src.includes('.svg')) return;

                                    if (width < 20 || height < 20) {
                                        if (el.tagName === 'IMG' && el.naturalWidth > minSize) {
                                            width = el.naturalWidth;
                                            height = el.naturalHeight;
                                        } else {
                                            return;
                                        }
                                    }

                                    const absoluteUrl = makeAbsoluteUrl(src, window.location.href);
                                    if (!absoluteUrl) return;
                                    if (absoluteUrl.toLowerCase().includes('.svg')) return;

                                    if (seenUrls.has(absoluteUrl)) return;
                                    seenUrls.add(absoluteUrl);

                                    images.push({
                                        url: absoluteUrl,
                                        type: type,
                                        width: Math.round(width),
                                        height: Math.round(height),
                                        resolution: \`\${Math.round(width)}x\${Math.round(height)}\`,
                            alt: el.getAttribute('alt') || '',
                            title: el.getAttribute('title') || ''
                        });
                    });

                    // Iframe Scan
                    document.querySelectorAll('iframe').forEach(iframe => {
                        try {
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            if (doc) {
                                doc.querySelectorAll('img').forEach(img => {
                                    const src = getBestMediaSrc(img);
                                    if (src) {
                                        const abs = makeAbsoluteUrl(src, doc.location.href);
                                        if (abs && !seenUrls.has(abs)) {
                                            if (abs.toLowerCase().includes('.svg')) return;
                                            seenUrls.add(abs);
                                            images.push({
                                                url: abs, type: 'image',
                                                width: img.width, height: img.height,
                                                resolution: \`\${img.width}x\${img.height}\`
                                            });
                                        }
                                    }
                                });
                            }
                        } catch(e) {}
                    });

                    console.log(\`[GridPrompt] Found \${images.length} items\`);
                    
                    // Fallback: Console Log (Robust against IPC failure)
                    console.log('__GRIDPROMPT_MEDIA__:' + JSON.stringify(images));
                };

                window.__triggerScan = scanMedia;
                scanMedia();

                const observer = new MutationObserver((mutations) => {
                    let shouldScan = false;
                    for(const m of mutations) {
                        if (m.addedNodes.length) shouldScan = true;
                    }
                    if (shouldScan) {
                        clearTimeout(window._scanTimer);
                        window._scanTimer = setTimeout(scanMedia, 1000);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setInterval(scanMedia, 4000);
            } catch (err) {
                console.error('[GridPrompt] Injection error:', err);
            }
        })();
    `;



    const handleNavigate = (e) => {
        e.preventDefault();
        let targetUrl = inputUrl;
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }
        setUrl(targetUrl);
    };

    const handleReload = () => {
        if (webviewRef.current) {
            webviewRef.current.reload();
        }
    };

    const handleGoBack = () => {
        if (webviewRef.current && webviewRef.current.canGoBack()) {
            webviewRef.current.goBack();
        }
    };

    const handleGoForward = () => {
        if (webviewRef.current && webviewRef.current.canGoForward()) {
            webviewRef.current.goForward();
        }
    };

    // Webview Event Listeners
    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;

        const handleDidStartLoading = () => setIsLoading(true);
        const handleDidStopLoading = () => {
            setIsLoading(false);
            if (webview) {
                setInputUrl(webview.getURL());
                setCanGoBack(webview.canGoBack());
                setCanGoForward(webview.canGoForward());

                // Inject scraper script
                try {
                    // We execute it safely
                    webview.executeJavaScript(INJECT_SCRIPT)
                        .then(() => console.log('Script injected successfully'))
                        .catch(e => console.error('Script injection failed:', e));
                } catch (e) {
                    console.error('ExecuteJS error', e);
                }
            }
        };

        const handleDomReady = () => {
            // Also inject on DOM ready for faster results
            if (webview) {
                webview.executeJavaScript(INJECT_SCRIPT).catch(() => { });
            }
        };

        const handleIpcMessage = (event) => {
            console.log('IPC channel:', event.channel);
            if (event.channel === 'media-found') {
                console.log('Media found count:', event.args[0] ? event.args[0].length : 0);
                setRawImages(event.args[0]);
            }
        };

        // Console logging from webview
        const handleConsoleMessage = (e) => {
            // console.log('[WebView Console]:', e.message);
            if (e.message && e.message.startsWith('__GRIDPROMPT_MEDIA__:')) {
                try {
                    const jsonStr = e.message.substring('__GRIDPROMPT_MEDIA__:'.length);
                    const imgs = JSON.parse(jsonStr);
                    console.log('Media received via Console Fallback:', imgs.length);
                    setRawImages(imgs);
                } catch (err) {
                    console.error('Failed to parse media from console:', err);
                }
            } else {
                console.log('[WebView Console]:', e.message);
            }
        };

        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('ipc-message', handleIpcMessage);
        webview.addEventListener('console-message', handleConsoleMessage);

        // Inject preload manually if the attribute doesn't work as expected in all envs (optional fallback)
        // webview.setAttribute('preload', preloadPath);

        return () => {
            if (webview) {
                webview.removeEventListener('did-start-loading', handleDidStartLoading);
                webview.removeEventListener('did-stop-loading', handleDidStopLoading);
                webview.removeEventListener('dom-ready', handleDomReady);
                webview.removeEventListener('ipc-message', handleIpcMessage);
                webview.removeEventListener('console-message', handleConsoleMessage);
            }
            if (onProcessingChange) onProcessingChange(false);
        };
    }, []);

    // Toggle Sidebar
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleClearImages = () => {
        setRawImages([]);
        setImages([]);
        setToast({ type: 'success', message: 'List cleared.' });
    };

    return (
        <div className="h-full w-full bg-[#0a0a0f] text-slate-200 font-sans flex flex-col overflow-hidden relative selection:bg-blue-500/30">

            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none z-0" />

            {/* Premium Header / Toolbar */}
            <header className="flex gap-4 items-center px-4 py-3 z-50 relative min-h-[60px]">
                {/* Back Button Removed */}

                {/* Tabs Switcher */}
                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5 no-drag">
                    <button
                        onClick={() => setActiveTab('web')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'web'
                            ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/20'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <Globe size={13} />
                        <span>Web</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('local')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'local'
                            ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/20'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <Image size={13} />
                        <span>Local</span>
                    </button>
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-white/10 mx-1" />

                {/* STATUS DISPLAY (Moved from Sidebar) */}
                <div className="flex items-center gap-4 flex-1 no-drag">
                    {/* Item Count */}
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {activeTab === 'web' ? 'Found' : 'Loaded'}
                        </span>
                        <span className="text-sm font-bold text-white leading-none">
                            {(activeTab === 'web' ? images : localImages).length} Items
                        </span>
                    </div>

                    {/* Progress Bar (Only visible when processing) */}
                    {isProcessing && processingStatus && (
                        <div className="flex-1 max-w-xs flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-medium text-slate-400">
                                <span>Processing...</span>
                                <span className="text-blue-400">{Math.round((processingStatus.completed / processingStatus.total) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full border border-white/5">
                                <div
                                    className="h-full bg-blue-500 relative transition-all duration-300"
                                    style={{ width: `${(processingStatus.completed / processingStatus.total) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_1s_infinite]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>


                {/* Right Controls */}
                <div className="flex items-center gap-2 no-drag ml-auto">
                    {/* Utility Buttons */}
                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                        title="History"
                    >
                        <History size={16} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1" />

                    {/* Toggle Sidebar Button */}
                    <button
                        onClick={toggleSidebar}
                        className={`p-2 rounded-lg border transition-all flex items-center justify-center ${isSidebarOpen
                            ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                        title="Toggle Sidebar"
                    >
                        <PanelRight size={18} />
                    </button>
                </div>
            </header>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={setSettings}
            />

            {/* Main Content Area */}
            {activeTab === 'local' ? (
                <BatchGenerator
                    files={localImages}
                    onFilesChange={setLocalImages}
                    onStart={handleStartGeneration}
                    onStop={handleStopGeneration}
                    isProcessing={isProcessing}
                    processingStatus={processingStatus}
                />
            ) : (
                <div className="flex-1 flex overflow-hidden relative z-10 border border-white/5 bg-black/50 backdrop-blur-sm shadow-2xl">
                    {/* WebView Container */}
                    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#ffffff]">

                        {/* BROWSER TOOLBAR (New Location above Webview) */}
                        <div className="flex items-center gap-2 p-2 bg-[#f0f0f0] border-b border-gray-200">
                            {/* Nav Buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleGoBack}
                                    disabled={!canGoBack}
                                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={handleGoForward}
                                    disabled={!canGoForward}
                                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                                <button
                                    onClick={handleReload}
                                    className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors ${isLoading ? 'animate-spin' : ''}`}
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>

                            {/* URL Bar */}
                            <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-1.5 border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-sm">
                                <Globe size={14} className="text-gray-400" />
                                <input
                                    type="text"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 font-normal"
                                    placeholder="Enter URL..."
                                />
                            </form>
                        </div>

                        <div className="flex-1 relative">
                            <webview
                                ref={webviewRef}
                                src={url}
                                className="w-full h-full"
                                webpreferences="contextIsolation=false, nodeIntegration=true"
                                allowpopups="true"
                            />
                            {/* Loading Overlay */}
                            {isLoading && (
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-transparent z-20">
                                    <div className="h-full bg-blue-500 animate-[loading_1s_ease-in-out_infinite]" style={{ width: '30%' }}></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Overlay Mode */}
                    <div className={`absolute top-0 right-0 bottom-0 z-30 bg-[#0e0e14] border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out w-[400px] ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <Sidebar
                            images={images}
                            localImages={localImages}
                            onLocalImagesChange={setLocalImages}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            onStartGeneration={handleStartGeneration}
                            onStopGeneration={handleStopGeneration}
                            isProcessing={isProcessing}
                            processingStatus={processingStatus}
                            toast={toast}
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            settings={settings}
                            onClear={handleClearImages}
                        />
                    </div>
                </div>
            )}

            {/* Fab for opening sidebar if closed and processing */}
            {!isSidebarOpen && isProcessing && (
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-500 transition-transform hover:scale-105 animate-bounce"
                >
                    <RefreshCw size={24} className="animate-spin" />
                </button>
            )}

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={(newSettings) => setSettings(newSettings)}
            />

            <HistoryPage
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
        </div>
    );
}
