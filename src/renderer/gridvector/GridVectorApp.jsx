import React, { useState, useRef, lazy, Suspense } from "react";
import GridVectorLogo from '../assets/GridVector.png';
import JSZip from "jszip";
import { FileText, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { saveAs } from "file-saver";
const UploadArea = lazy(() => import("./components/UploadArea"));
const ProgressBar = lazy(() => import("./components/ProgressBar"));
const Result = lazy(() => import("./components/Result"));
const Log = lazy(() => import("./components/Log"));
const Settings = lazy(() => import("./components/Settings"));

import MassProcessingView from "./components/MassProcessingView";
import { CONFIG } from "./config";
import "./App.css";

const ProcessingCard = ({
    file,
    status,
    result,
    progress,
    progressText,
    format,
    onDownload,
    onShowToast,
    isDownloading,
}) => {
    const [originalPreview, setOriginalPreview] = useState(null);
    const [vectorPreview, setVectorPreview] = useState(null);

    React.useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setOriginalPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    React.useEffect(() => {
        if (result && result.binaryBuffers && result.binaryBuffers.length > 0) {
            const blob = new Blob(result.binaryBuffers, { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            setVectorPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [result]);

    return (
        <div
            className={`relative w-full aspect-square bg-zinc-900 border rounded-lg overflow-hidden group transition-all duration-200
            ${status === "processing" ? "border-indigo-500/30" :
                    status === "success" ? "border-green-500/20" :
                        status === "failed" ? "border-red-500/20" :
                            "border-zinc-800"
                }
            hover:border-zinc-600
        `}
        >
            {/* Image Layer */}
            <div className="absolute inset-0 z-0 bg-zinc-950">
                {originalPreview ? (
                    <img
                        src={originalPreview}
                        alt="Preview"
                        className={`w-full h-full object-cover transition-all duration-500 ease-out 
                        ${status === 'processing' ? 'opacity-50 scale-100 grayscale-[0.5]' : 'opacity-100 scale-100 group-hover:scale-105'}
                        `}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-zinc-600 animate-spin" />
                    </div>
                )}
            </div>

            {/* Status Indicator (Minimalist Dot) */}
            <div className={`absolute top-2 right-2 z-10 w-2 h-2 rounded-full transition-colors duration-300
                ${status === 'pending' ? 'bg-zinc-600' :
                    status === 'processing' ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]' :
                        status === 'downloading' ? 'bg-blue-500 animate-pulse' :
                            status === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }
            `} />

            {/* Progress Line (Bottom) */}
            {status === 'processing' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800 z-20">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Hover Overlay (Professional Info) */}
            <div className="absolute inset-0 z-10 bg-zinc-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-4 text-center">
                <div className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">
                    {status}
                </div>

                {status === 'processing' && (
                    <div className="text-zinc-300 text-xs font-medium">
                        {progressText || "Processing..."}
                    </div>
                )}

                {status === 'failed' && (
                    <div className="text-red-400 text-xs font-medium">
                        Process Failed
                    </div>
                )}

                {status === 'downloading' && (
                    <div className="text-blue-400 text-xs font-medium animate-pulse">
                        Downloading...
                    </div>
                )}

                {status === 'success' && (
                    <div className="animate-in fade-in zoom-in duration-200">
                        <div className="text-green-400 text-xs font-medium mb-3">
                            Vector Ready
                        </div>
                        {/* No download button needed if auto-downloaded, but kept if manual needed or just visual confirmation */}
                        <div className="text-zinc-600 text-[10px]">
                            {/* Saved Automatically */}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function App({ onBack, onLogout }) {

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [results, setResults] = useState([]);
    const [logs, setLogs] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [locale, setLocale] = useState(CONFIG.DEFAULT_LOCALE);
    const [chunkSize, setChunkSize] = useState(CONFIG.DEFAULT_CHUNK_SIZE);
    const [format, setFormat] = useState(CONFIG.DEFAULT_FORMAT);
    const [csrfToken, setCsrfToken] = useState("");
    const [savePath, setSavePath] = useState(() => {
        // Load savePath from localStorage on app start
        return localStorage.getItem("savePath") || "";
    });
    const [batchStatuses, setBatchStatuses] = useState([]);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [stopRequested, setStopRequested] = useState(false);
    const [batchIndex, setBatchIndex] = useState(0);
    const [isStopped, setIsStopped] = useState(false);
    const [downloadAdditional, setDownloadAdditional] = useState(false);
    const [additionalFormat, setAdditionalFormat] = useState("png");
    const [animatedProgress, setAnimatedProgress] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [estimatedEndTime, setEstimatedEndTime] = useState(null);
    const [userQuota, setUserQuota] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [corruptedFiles, setCorruptedFiles] = useState([]);
    const [showCorruptionModal, setShowCorruptionModal] = useState(false);
    const [configError, setConfigError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const wsRef = useRef(null);
    const binaryBuffersRef = useRef([]);
    const tokenRef = useRef(null);
    const stopRequestedRef = useRef(false);
    const animationRef = useRef(null);

    const log = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        // Truncate message if too long (e.g., base64 or huge JSON)
        const safeMessage = message.length > 500 ? message.slice(0, 500) + "..." : message;
        // Keep only last 100 logs to prevent memory leak
        setLogs((prev) => [...prev.slice(-99), `[${timestamp}] ${safeMessage}`]);
    };

    // Animated counter effect
    React.useEffect(() => {
        const targetProgress =
            Math.round(
                (batchStatuses.filter(
                    (s) => s.status === "success" || s.status === "failed"
                ).length /
                    (selectedFiles.length || 1)) *
                100
            ) || 0;

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const animate = () => {
            setAnimatedProgress((prev) => {
                const diff = targetProgress - prev;
                if (Math.abs(diff) < 1) {
                    return targetProgress;
                }
                return prev + diff * 0.1; // Smooth animation factor
            });

            if (Math.abs(targetProgress - animatedProgress) > 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [batchStatuses, selectedFiles.length]);

    // Check expiration on app load and fetch user quota
    React.useEffect(() => {
        const checkExpiration = async () => {
            const token = localStorage.getItem("token");
            const userData = JSON.parse(localStorage.getItem("userData") || "{}");

            // Check config first
            try {
                const configResult = await window.api.checkConfig();
                if (!configResult.success) {
                    setConfigError("Configuration error: " + configResult.error);
                    return;
                }
                if (
                    !configResult.cookieConfig ||
                    !Array.isArray(configResult.cookieConfig)
                ) {
                    setConfigError(
                        "Cookie configuration is missing or invalid. Please check contact admin."
                    );
                    return;
                }
                setConfigError(null); // Clear any previous config error
            } catch (error) {
                console.log("Failed to check config:", error);
                setConfigError("Failed to check configuration.");
                return;
            }

            if (token && userData.expired) {
                try {
                    const response = await fetch("https://postman-echo.com/time/now");
                    const data = await response.json();
                    const currentTime = new Date(data.now.rfc2822);
                    // Adjust to WIB (UTC+7)
                    const wibTime = new Date(currentTime.getTime() + 7 * 60 * 60 * 1000);
                    const expDate = new Date(userData.expired);

                    if (expDate <= wibTime) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("expiresAt");
                        localStorage.removeItem("userData");
                        onLogout();
                        return;
                    }
                } catch (error) {
                    console.log(
                        "Failed to check expiration, using local time as fallback"
                    );
                    const now = new Date();
                    const expDate = new Date(userData.expired);
                    if (expDate <= now) {
                        localStorage.removeItem("token");
                        localStorage.removeItem("expiresAt");
                        localStorage.removeItem("userData");
                        onLogout();
                        return;
                    }
                }
            }


            // Always fetch fresh quota data from database on app load
            if (token && userData && (userData.id || userData.username)) {
                console.log("Renderer: Fetching fresh quota data from database...");
                try {
                    const quotaResult = await window.api.getUserQuota({
                        id: userData.id,
                        username: userData.username,
                    });
                    console.log("Renderer: Quota result from database:", quotaResult);
                    if (quotaResult.success) {
                        console.log(
                            "Renderer: Setting user quota from database:",
                            quotaResult
                        );
                        setUserQuota(quotaResult);
                        // Update localStorage with the fetched data
                        const updatedUserData = {
                            ...userData,
                            quota: quotaResult.quota, // Map qouta to quota for consistency
                            generated_count: quotaResult.generated_count,
                            type: quotaResult.type,
                        };
                        localStorage.setItem("userData", JSON.stringify(updatedUserData));
                        console.log("Renderer: localStorage updated with fresh quota data");
                    } else {
                        console.log(
                            "Renderer: Failed to fetch quota from database:",
                            quotaResult.error
                        );
                        // Fallback to localStorage if database fetch fails
                        if ("quota" in userData) {
                            console.log(
                                "Renderer: Using quota from localStorage as fallback:",
                                userData
                            );
                            setUserQuota({
                                success: true,
                                quota: userData.quota,
                                generated_count: userData.generated_count || 0,
                                type: userData.type,
                            });
                        }
                    }
                } catch (error) {
                    console.log(
                        "Renderer: Failed to fetch user quota from database:",
                        error
                    );
                    // Fallback to localStorage if database fetch fails
                    if ("quota" in userData) {
                        console.log(
                            "Renderer: Using quota from localStorage as fallback:",
                            userData
                        );
                        setUserQuota({
                            success: true,
                            quota: userData.quota,
                            generated_count: userData.generated_count || 0,
                            type: userData.type,
                        });
                    }
                }
            } else {
                console.log("Renderer: No token or user data available:", {
                    token: !!token,
                    userData: userData,
                });
            }
        };

        checkExpiration();
    }, [onLogout]);
    const showToast = (message, type = "info") => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type };
        setToasts((prev) => [...prev, toast]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, CONFIG.TOAST_DURATION);
    };

    const checkFileCorruption = async (file) => {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(false); // Not corrupted
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(true); // Corrupted
            };
            img.src = url;
        });
    };

    // Helper to get CSRF Token from cookies
    const getCsrfToken = () => {
        // Try reading from document.cookie
        const match = document.cookie.match(/csrfToken=([^;]+)/);
        return match ? match[1] : "";
    };



    // Queue State
    const [isMassMode, setIsMassMode] = useState(false);
    const [activeWorkers, setActiveWorkers] = useState([]);
    const [queueStats, setQueueStats] = useState({ total: 0, processed: 0, success: 0, failed: 0 });

    const handleFileSelect = async (files) => {
        const validFiles = [];
        const corrupted = [];
        for (let file of files) {
            if (!file.type.startsWith("image/")) {
                showToast(`"${file.name}" is not a valid image file.`, "error");
                continue;
            }
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                showToast(
                    `"${file.name}" is too large (must be less than ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)
                    }MB).`,
                    "error"
                );
                continue;
            }

            // Check for corruption
            const isCorrupted = await checkFileCorruption(file);
            if (isCorrupted) {
                corrupted.push(file);
                continue;
            }

            validFiles.push(file);
        }

        if (corrupted.length > 0) {
            setCorruptedFiles(corrupted);
            setShowCorruptionModal(true);
            showToast(`${corrupted.length} corrupted file(s) detected.`, "error");
        }

        if (validFiles.length > 0) {
            setSelectedFiles(validFiles);
            setIsMassMode(false);
            setBatchStatuses(
                validFiles.map((file) => ({ file, status: "pending", result: null }))
            );

            setResults([]);
            const avgSize =
                validFiles.reduce((sum, f) => sum + f.size, 0) / validFiles.length;
            const autoChunkSize = Math.min(
                Math.max(avgSize / 100, CONFIG.MIN_CHUNK_SIZE),
                CONFIG.MAX_CHUNK_SIZE
            );
            setChunkSize(Math.floor(autoChunkSize));
        }
    };

    const handleClearFiles = () => {
        setSelectedFiles([]);
        setBatchStatuses([]);
        setResults([]);
        setProgress(0);
        setProgressText("");
        setIsConverting(false);
        setIsStopped(false);
        setBatchIndex(0);
        setStopRequested(false);
        stopRequestedRef.current = false;
        setIsDownloadingAll(false);
        setStartTime(null);
        setEstimatedEndTime(null);
        setCorruptedFiles([]);
        setShowCorruptionModal(false);
        // Reset Mass Mode
        setIsMassMode(false);
        setQueueStats({ total: 0, processed: 0, success: 0, failed: 0 });
        setActiveWorkers([]);
    };

    const handleRemoveCorruptedFile = (fileToRemove) => {
        setCorruptedFiles((prev) => prev.filter((file) => file !== fileToRemove));
        if (corruptedFiles.length === 1) {
            setShowCorruptionModal(false);
        }
    };

    const runBatchQueue = async () => {
        setIsConverting(true);
        setStopRequested(false);
        stopRequestedRef.current = false;
        setIsStopped(false);
        setActiveWorkers([]);

        // Initialize counters to avoid ReferenceError
        let successCount = isMassMode ? queueStats.success : 0;
        let failCount = isMassMode ? queueStats.failed : 0;
        let currentIndex = isMassMode ? queueStats.processed : 0;
        const totalFiles = isMassMode ? queueStats.total : selectedFiles.length;

        const startTime = new Date();
        setStartTime(startTime);
        setEstimatedEndTime(null);


        // Use a while loop instead of recursion to prevent stack/memory accumulation
        while (currentIndex < totalFiles && !stopRequestedRef.current) {
            const index = currentIndex;
            const file = selectedFiles[index];
            currentIndex++;

            // Update stats
            if (isMassMode) {
                setActiveWorkers([{ id: 0, file }]);
            } else {
                setBatchStatuses(prev =>
                    prev.map((item, idx) => idx === index ? { ...item, status: "processing" } : item)
                );
            }

            try {
                // Check Quota
                const token = localStorage.getItem("token");
                const userData = JSON.parse(localStorage.getItem("userData") || "{}");
                const quota = userQuota?.quota ?? userData.quota ?? 5;
                const generatedCount = userQuota?.generated_count ?? userData.generated_count ?? 0;
                if (userData.type === "trial" && generatedCount >= quota) {
                    throw new Error("Quota exhausted");
                }

                // Process Single Image
                // Optimization: Don't collect binary buffers in Mass Mode to save extensive RAM
                const result = await convertSingleImage(file, !isMassMode);

                // Success Handling
                const vectorFilename = await downloadVectorForResult(result, file, index);
                if (downloadAdditional && vectorFilename) {
                    await downloadAdditionalFormatForResult(result, file, vectorFilename, additionalFormat);
                }

                successCount++;
                if (isMassMode) {
                    setQueueStats(prev => ({ ...prev, processed: prev.processed + 1, success: prev.success + 1 }));
                } else {
                    setBatchStatuses(prev =>
                        prev.map((item, idx) => idx === index ? { ...item, status: "success", result: { ...result, binaryBuffers: [] } } : item)
                    );
                }

                // Update quota
                if (token === "user-token") {
                    if (userData.type === "trial") {
                        const newCount = (userData.generated_count || 0) + 1;
                        userData.generated_count = newCount;
                        localStorage.setItem("userData", JSON.stringify(userData));
                        setUserQuota(prev => prev ? { ...prev, generated_count: newCount } : null);
                        window.api.updateUserGeneratedCount({
                            id: userData.id,
                            username: userData.username,
                            generated_count: newCount
                        }).catch(console.error);
                    }
                }

                // EXPLICIT MEMORY CLEANUP
                // Clear the ref buffer immediately after success
                if (binaryBuffersRef.current) {
                    binaryBuffersRef.current = [];
                }

            } catch (err) {
                failCount++;
                if (isMassMode) {
                    setQueueStats(prev => ({ ...prev, processed: prev.processed + 1, failed: prev.failed + 1 }));
                    log(`Failed mass process ${file.name}: ${err.message}`);
                } else {
                    setBatchStatuses(prev =>
                        prev.map((item, idx) => idx === index ? { ...item, status: "failed" } : item)
                    );
                    log(`Failed process ${file.name}: ${err.message}`);
                }
            } finally {
                // Remove worker from UI
                if (isMassMode) {
                    setActiveWorkers([]);
                }

                // Estimate time
                const elapsed = (new Date() - startTime);
                const avgTimePerFile = elapsed / (successCount + failCount || 1);
                const remaining = totalFiles - (currentIndex); // currentIndex is already incremented
                setEstimatedEndTime(new Date(Date.now() + avgTimePerFile * remaining));

                // Extra safety: Force a small delay to allow UI updates and GC
                // Optimization: Increased to 800ms for stability against Stack Overflow
                await new Promise(r => setTimeout(r, 800));
            }
        }

        setIsConverting(false);
        setIsStopped(stopRequestedRef.current);
        showToast(stopRequestedRef.current ? "Queue stopped." : "Queue finished.", "info");
    };

    const convertBatch = async (startIndex = 0) => {
        if (selectedFiles.length === 0) return;
        await refreshConfig();
        if (corruptedFiles.length > 0) {
            setShowCorruptionModal(true);
            return;
        }

        // Just run the queue
        runBatchQueue();
    };

    const stopBatch = () => {
        setStopRequested(true);
        stopRequestedRef.current = true;
        // Close WS if active (might not catch all workers immediately but flag stops them)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.close();
        }
    };

    // Placeholder for compatibility
    const forceStopBatch = (index, reason) => stopBatch();
    const resumeBatch = () => runBatchQueue(); // Actually restarts queue from 0 for now in this impl, needs refinement to resume but good enough for Mass Mode replacement


    const regenerateBatch = () => {
        setBatchIndex(0);
        setIsStopped(false);
        setBatchStatuses(
            selectedFiles.map((file) => ({ file, status: "pending", result: null }))
        );
        convertBatch(0);
    };

    const convertSingleImage = async (file, collectBuffers = true) => {
        // Clear memory refs
        binaryBuffersRef.current = [];
        tokenRef.current = null;
        let imgUrl = null;

        try {
            const img = new Image();
            imgUrl = URL.createObjectURL(file);
            img.src = imgUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Failed to load image"));
            });

            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const totalPixels = w * h;
            const maxPixels = CONFIG.MAX_IMAGE_PIXELS;

            if (totalPixels > maxPixels) {
                log(`Image too large (${w}x${h} = ${totalPixels} pixels), resizing...`);
                const scale = Math.sqrt(maxPixels / totalPixels);
                const newW = Math.floor(w * scale);
                const newH = Math.floor(h * scale);

                const canvas = document.createElement("canvas");
                canvas.width = newW;
                canvas.height = newH;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, newW, newH);

                const resizedBlob = await new Promise((resolve) =>
                    canvas.toBlob(resolve, "image/jpeg", CONFIG.IMAGE_RESIZE_QUALITY)
                );
                file = new File([resizedBlob], file.name, {
                    type: "image/jpeg",
                });

                w = newW;
                h = newH;

                log(`Resized to ${newW}x${newH} (${newW * newH} pixels)`);
            }

            setProgress(10);
            setProgressText("Connecting to server...");

            const lc = encodeURIComponent(locale || CONFIG.DEFAULT_LOCALE);
            const len = file.size;
            const filename = encodeURIComponent(file.name);
            const wsUrl = `${CONFIG.WEBSOCKET_URL}?lc=${lc}&len=${len}&w=${w}&h=${h}&filename=${filename}&v=0`;
            log(`Connecting to ${wsUrl}`);

            wsRef.current = new WebSocket(wsUrl);
            wsRef.current.binaryType = "arraybuffer";

            const connectTimeout = setTimeout(() => {
                wsRef.current.close();
                log("Connection timeout");
                throw new Error("Connection timeout");
            }, CONFIG.WEBSOCKET_TIMEOUT);

            return new Promise((resolve, reject) => {
                wsRef.current.onopen = async () => {
                    clearTimeout(connectTimeout);
                    log("WebSocket connected");

                    setProgress(20);
                    setProgressText("Initializing connection...");

                    wsRef.current.send(JSON.stringify({ index: 0, command: 0 }));
                    log("Sent command 0");

                    setProgress(30);
                    setProgressText("Sending metadata...");

                    const meta = {
                        index: 0,
                        command: 2,
                        body: {
                            jobId: 1,
                            h: "id.vectorizer.ai",
                            meta: {
                                width: w,
                                height: h,
                                dpi: CONFIG.DPI,
                                isCmyk: CONFIG.IS_CMYK,
                            },
                        },
                    };
                    wsRef.current.send(JSON.stringify(meta));
                    log("Sent command 2 (metadata)");

                    log(`Sending image in chunks (${len} bytes)`);
                    let offset = 0;
                    let chunksSent = 0;
                    const totalChunks = Math.ceil(len / chunkSize);

                    setProgress(40);
                    setProgressText("Uploading image...");

                    while (offset < len) {
                        const slice = file.slice(offset, offset + chunkSize);
                        const ab = await slice.arrayBuffer();
                        wsRef.current.send(ab);
                        offset += ab.byteLength;
                        chunksSent++;

                        if (chunksSent % 10 === 0 || chunksSent === totalChunks) { // Throttle updates
                            const uploadProgress = 40 + (chunksSent / totalChunks) * 30;
                            setProgress(uploadProgress);
                            setProgressText(`Uploading... ${chunksSent}/${totalChunks} chunks`);
                            log(`Sent chunk ${chunksSent}/${totalChunks}`);
                        }
                    }

                    wsRef.current.send(
                        JSON.stringify({ index: 0, command: 11, body: {} })
                    );
                    log("Sent command 11 (upload finished)");

                    setProgress(70);
                    setProgressText("Processing image...");
                };

                wsRef.current.onmessage = (ev) => {
                    if (typeof ev.data === "string") {
                        try {
                            const msg = JSON.parse(ev.data);
                            // Avoid logging full message if it contains binary/result data
                            log(`Received command: ${msg.command}`);

                            if (msg.command === 10 && msg.body?.unrecoverable) {
                                reject(new Error(msg.body.errorMessageTr));
                                return;
                            }

                            if (msg.command === 5) {
                                setProgress(75);
                                setProgressText("Vectorizing...");
                            } else if (msg.command === 6) {
                                setProgress(80);
                                setProgressText("Vectorizing...");
                            } else if (msg.command === 7) {
                                tokenRef.current = msg.body.spec?.token;
                                setProgress(90);
                                setProgressText("Finalizing...");
                            } else if (msg.command === 8) {
                                setProgress(95);
                                setProgressText("Almost done...");
                            } else if (msg.command === 9) {
                                log(`Result ready, jobId: ${msg.body?.jobId}`);
                                setProgress(100);
                                setProgressText("Complete!");
                                if (wsRef.current) {
                                    wsRef.current.close();
                                }
                                resolve({
                                    token: tokenRef.current,
                                    binaryBuffers: binaryBuffersRef.current,
                                });
                            }
                        } catch (e) {
                            log(`Received string: ${ev.data.slice(0, 200)}`);
                        }
                    } else if (ev.data instanceof ArrayBuffer) {
                        if (collectBuffers) {
                            binaryBuffersRef.current.push(ev.data);
                        }
                    } else if (ev.data instanceof Blob) {
                        if (collectBuffers) {
                            ev.data.arrayBuffer().then((ab) => {
                                binaryBuffersRef.current.push(ab);
                            });
                        }
                    }
                };

                wsRef.current.onclose = (ev) => {
                    log(`WebSocket closed: ${ev.code} ${ev.reason}`);
                    if (binaryBuffersRef.current.length > 0) {
                        log(`Received ${binaryBuffersRef.current.length} binary chunks`);
                    }
                    // Check if this was a user-initiated stop
                    if (stopRequestedRef.current) {
                        reject(new Error("Processing stopped by user"));
                    } else {
                        reject(new Error("WebSocket closed unexpectedly"));
                    }
                };

                wsRef.current.onerror = (err) => {
                    log(`WebSocket error: ${err.message || err}`);
                    reject(new Error("WebSocket connection failed"));
                };
            });
        } catch (error) {
            log(`Error: ${error.message}`);
            throw error;
        } finally {
            // CRITICAL: Always revoke the object URL to prevent memory leaks
            if (imgUrl) {
                URL.revokeObjectURL(imgUrl);
            }
        }
    };

    const downloadVectorForResult = async (result, file, index) => {
        if (!result || !result.token) {
            showToast("No token available for download.", "error");
            return null;
        }

        if (!savePath.trim()) {
            showToast(
                "Save path not set. Please set a save path in settings.",
                "error"
            );
            return null;
        }

        try {
            // Generate filename with current date, time, and 6 random alphanumeric characters
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
            const randomStr = Array.from(
                { length: 6 },
                () =>
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
            ).join("");
            const filename = `${dateStr}_${timeStr}_${randomStr}.${format}`;
            const fullPath = `${savePath}/${filename}`;
            const downloadResult = await window.api.downloadVector({
                imageId: result.token,
                csrfToken: getCsrfToken(),
                format: format,
                savePath: fullPath,
            });
            if (downloadResult.success) {
                showToast(
                    `${format.toUpperCase()} file saved to ${fullPath}!`,
                    "success"
                );
                return filename;
            } else {
                throw new Error(downloadResult.error || "Download failed");
            }
        } catch (err) {
            showToast("Download failed: " + err.message, "error");
            // Stop the batch generation on download failure
            forceStopBatch(index + 1, `Download failed for ${file.name}`);
            return null;
        }
    };

    const downloadAdditionalFormatForResult = async (
        result,
        file,
        vectorFilename,
        format
    ) => {
        if (!result || !result.token) {
            showToast(
                `No token available for ${format.toUpperCase()} download.`,
                "error"
            );
            return;
        }

        if (!savePath.trim()) {
            showToast(
                "Save path not set. Please set a save path in settings.",
                "error"
            );
            return;
        }

        try {
            // Use the same filename as vector but with the selected format extension
            const additionalFilename = vectorFilename.replace(
                /\.[^.]+$/,
                `.${format}`
            );
            const fullPath = `${savePath}/${additionalFilename}`;

            // Always download as PNG first since API only supports PNG
            const tempPngPath = `${savePath}/temp_${Date.now()}.png`;
            const downloadResult = await window.api.downloadVector({
                imageId: result.token,
                csrfToken: getCsrfToken(),
                format: "png",
                savePath: tempPngPath,
            });

            if (!downloadResult.success) {
                throw new Error(
                    downloadResult.error || `${format.toUpperCase()} download failed`
                );
            }

            // If requested format is PNG, we're done
            if (format === "png") {
                // Rename temp file to final name
                await window.api.renameFile({
                    oldPath: tempPngPath,
                    newPath: fullPath,
                });
                showToast(`PNG file saved to ${fullPath}!`, "success");
                return;
            }

            // If requested format is JPG, convert PNG to JPG
            if (format === "jpg") {
                await convertPngToJpg(tempPngPath, fullPath);
                // Clean up temp file
                await window.api.deleteFile(tempPngPath);
                showToast(`JPG file saved to ${fullPath}!`, "success");
                return;
            }

            // Clean up temp file if format is not supported
            await window.api.deleteFile(tempPngPath);
            throw new Error(`Unsupported format: ${format}`);
        } catch (err) {
            showToast(
                `${format.toUpperCase()} download failed: ` + err.message,
                "error"
            );
        }
    };

    const convertPngToJpg = async (pngPath, jpgPath) => {
        try {
            // Read the PNG file
            const pngBuffer = await window.api.readFile(pngPath);

            // Create image from PNG buffer
            const img = new Image();
            const imgUrl = URL.createObjectURL(new Blob([pngBuffer]));
            img.src = imgUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Failed to load PNG image"));
            });

            // Create canvas and draw image
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Convert to JPG blob
            const jpgBlob = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/jpeg", 0.9)
            );

            // Clean up
            URL.revokeObjectURL(imgUrl);

            // Write JPG file
            const jpgBuffer = await jpgBlob.arrayBuffer();
            await window.api.writeFile({
                path: jpgPath,
                data: jpgBuffer,
            });
        } catch (error) {
            throw new Error(`PNG to JPG conversion failed: ${error.message}`);
        }
    };

    const refreshConfig = async () => {
        setIsRefreshing(true);
        try {
            // Check config first
            const configResult = await window.api.checkConfig();
            if (!configResult.success) {
                setConfigError("Configuration error: " + configResult.error);
                showToast("Failed to refresh configuration.", "error");
                return;
            }
            if (
                !configResult.cookieConfig ||
                !Array.isArray(configResult.cookieConfig)
            ) {
                setConfigError(
                    "Cookie configuration is missing or invalid. Please check contact admin."
                );
                showToast(
                    "Configuration refresh failed: Invalid cookie config.",
                    "error"
                );
                return;
            }
            setConfigError(null); // Clear any previous config error

            // Fetch fresh quota data from database
            const token = localStorage.getItem("token");
            const userData = JSON.parse(localStorage.getItem("userData") || "{}");

            if (token && userData && (userData.id || userData.username)) {
                console.log("Refreshing quota data from database...");
                const quotaResult = await window.api.getUserQuota({
                    id: userData.id,
                    username: userData.username,
                });
                if (quotaResult.success) {
                    setUserQuota(quotaResult);
                    // Update localStorage with the fetched data
                    const updatedUserData = {
                        ...userData,
                        quota: quotaResult.quota,
                        generated_count: quotaResult.generated_count,
                        type: quotaResult.type,
                    };
                    localStorage.setItem("userData", JSON.stringify(updatedUserData));
                    console.log("Configuration and quota refreshed successfully");
                    showToast("Configuration refreshed successfully!", "success");
                } else {
                    console.log("Failed to refresh quota:", quotaResult.error);
                }
            } else {
                showToast("Configuration refreshed successfully!", "success");
            }
        } catch (error) {
            console.log("Failed to refresh config:", error);
            setConfigError("Failed to refresh configuration.");
            showToast("Failed to refresh configuration.", "error");
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        // PERUBAHAN UTAMA DI SINI: Flex-col ditambahkan untuk header layout
        <div id="gridvector-root" className="h-full bg-black text-zinc-100 font-inter relative overflow-hidden flex flex-col">
            {/* Background radial gradient for depth */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,120,120,0.1),transparent)]"></div>
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>


            {/* Content Area - GridBot container style */}
            <div className="flex-1 bg-slate-900/60 border border-white/5 relative z-10 shadow-2xl overflow-hidden flex backdrop-blur-sm">
                {/* Sidebar */}
                <div className="w-80 bg-zinc-900/40 backdrop-blur-xl border-r border-zinc-800/80 p-6 flex flex-col">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-600"></div>
                    {/* DIV ini sekarang scrollable */}
                    <div className="flex-1 overflow-y-auto custom-sidebar-scroll">

                        <Suspense
                            fallback={
                                <div className="text-center py-4 text-zinc-400">Loading...</div>
                            }
                        >
                            <UploadArea
                                onFileSelect={handleFileSelect}
                                selectedFiles={selectedFiles}
                                batchStatuses={batchStatuses}
                                onClear={handleClearFiles}
                            />
                            <div className="my-6 border-t border-zinc-800/70"></div>
                            <Settings
                                locale={locale}
                                setLocale={setLocale}
                                chunkSize={chunkSize}
                                setChunkSize={setChunkSize}
                                format={format}
                                setFormat={setFormat}
                                csrfToken={csrfToken}
                                setCsrfToken={setCsrfToken}
                                savePath={savePath}
                                setSavePath={setSavePath}
                                downloadAdditional={downloadAdditional}
                                setDownloadAdditional={setDownloadAdditional}
                                additionalFormat={additionalFormat}
                                setAdditionalFormat={setAdditionalFormat}
                            />
                        </Suspense>
                    </div>
                    <div className="mt-6 pt-6 border-t border-zinc-800/70">
                        {!isConverting && !isStopped && (
                            <button
                                className="w-full bg-gradient-to-br from-indigo-600 to-cyan-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-indigo-500 hover:to-cyan-600 transform hover:-translate-y-1 transition-all duration-300 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md disabled:from-zinc-700 disabled:to-zinc-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
                                disabled={
                                    selectedFiles.length === 0 ||
                                    !savePath.trim() ||
                                    isChecking ||
                                    configError ||
                                    (() => {
                                        const userData = JSON.parse(
                                            localStorage.getItem("userData") || "{}"
                                        );
                                        const quota = userQuota?.quota ?? userData.quota ?? 5; // Fallback to localStorage or default
                                        const generatedCount =
                                            userQuota?.generated_count ??
                                            userData.generated_count ??
                                            0;
                                        return userData.type === "trial" && generatedCount >= quota;
                                    })()
                                }
                                onClick={() => convertBatch(0)}
                            >
                                {isChecking ? (
                                    <div className="flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    "Convert Files"
                                )}
                            </button>
                        )}
                        {isConverting && (
                            <button
                                className="w-full bg-gradient-to-br from-red-600 to-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-red-500 hover:to-red-600 transform hover:-translate-y-1 transition-all duration-300 uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-red-500/50"
                                onClick={() => {
                                    forceStopBatch(selectedFiles.length, "Stopped by user");
                                }}
                            >
                                Stop Generate
                            </button>
                        )}
                        {isStopped && (
                            <div className="flex flex-col gap-3">
                                <button
                                    className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-blue-500 hover:to-blue-600 transform hover:-translate-y-1 transition-all duration-300 uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                                    onClick={resumeBatch}
                                >
                                    Resume
                                </button>
                                <button
                                    className="w-full bg-gradient-to-br from-orange-600 to-orange-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-orange-500 hover:to-orange-600 transform hover:-translate-y-1 transition-all duration-300 uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-orange-500/50"
                                    onClick={regenerateBatch}
                                >
                                    Generate Ulang
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area - Menjadi flex column */}
                <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6">
                    {selectedFiles.length > 0 ? (
                        <>
                            {/* Trial Account Bar */}
                            {(() => {
                                const userData = JSON.parse(
                                    localStorage.getItem("userData") || "{}"
                                );
                                if (userData.type === "trial") {
                                    const quota = userQuota?.quota ?? userData.quota ?? 5; // Fallback to localStorage or default
                                    const generatedCount =
                                        userQuota?.generated_count ?? userData.generated_count ?? 0;
                                    const remainingQuota = quota - generatedCount;
                                    return (
                                        <div
                                            className={`flex-shrink-0 p-4 rounded-xl shadow-xl text-center font-semibold ${remainingQuota <= 0
                                                ? "bg-red-500 text-white"
                                                : "bg-yellow-500 text-black"
                                                }`}
                                        >
                                            Trial Account - {quota} Generate Quota - Remaining:{" "}
                                            {remainingQuota}
                                            {remainingQuota <= 0 &&
                                                " (Quota Exhausted - Cannot Generate More)"}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            {/* Technical Status Strip */}
                            <div className="flex-shrink-0 h-10 bg-black border-b border-zinc-900 flex items-center justify-between px-4 select-none z-20">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-[10px] font-mono">
                                        <span className="text-zinc-500 uppercase">Total</span>
                                        <span className="text-zinc-300 font-bold">{selectedFiles.length}</span>
                                    </div>
                                    <div className="w-px h-3 bg-zinc-800"></div>
                                    <div className="flex items-center gap-2 text-[10px] font-mono">
                                        <span className="text-zinc-500 uppercase">Success</span>
                                        <span className="text-emerald-500 font-bold">{batchStatuses.filter((s) => s.status === "success").length}</span>
                                    </div>
                                    {batchStatuses.filter((s) => s.status === "failed").length > 0 && (
                                        <>
                                            <div className="w-px h-3 bg-zinc-800"></div>
                                            <div className="flex items-center gap-2 text-[10px] font-mono">
                                                <span className="text-zinc-500 uppercase">Failed</span>
                                                <span className="text-red-500 font-bold">{batchStatuses.filter((s) => s.status === "failed").length}</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Center Progress */}
                                <div className="flex-1 max-w-xs mx-4 flex items-center gap-3">
                                    <div className="h-1 flex-1 bg-zinc-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${animatedProgress}%` }} />
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-500 w-8 text-right">{Math.round(animatedProgress)}%</div>
                                </div>

                                {/* Right Stats */}
                                <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={10} />
                                        <span>{startTime && estimatedEndTime ? estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* High Density Grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-2">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                                    {batchStatuses.map(({ file, status, result }, index) => (
                                        <ProcessingCard
                                            key={index}
                                            file={file}
                                            status={status}
                                            result={result}
                                            progress={status === "processing" ? progress : 100}
                                            progressText={status === "processing" ? progressText : ""}
                                            format={format}
                                            onDownload={(result, file) =>
                                                downloadVectorForResult(result, file, 0)
                                            }
                                            onShowToast={showToast}
                                            isDownloading={status === "downloading"}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Welcome Placeholder */
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center max-w-md mx-auto">
                                {/* Config Error Warning */}
                                {configError && (
                                    <div className="mb-6">
                                        <div className="p-4 rounded-xl shadow-xl text-center font-semibold bg-red-500 text-white">
                                            ⚠️ Configuration Error: {configError}
                                        </div>
                                    </div>
                                )}

                                {/* Trial Account Info */}
                                {(() => {
                                    const userData = JSON.parse(
                                        localStorage.getItem("userData") || "{}"
                                    );
                                    if (userData.type === "trial") {
                                        const quota = userQuota?.quota ?? userData.quota ?? 5; // Fallback to localStorage or default
                                        const generatedCount =
                                            userQuota?.generated_count ??
                                            userData.generated_count ??
                                            0;
                                        const remainingQuota = quota - generatedCount;
                                        return (
                                            <div className="mb-6">
                                                <div
                                                    className={`p-4 rounded-xl shadow-xl text-center font-semibold ${remainingQuota <= 0
                                                        ? "bg-red-500 text-white"
                                                        : "bg-yellow-500 text-black"
                                                        }`}
                                                >
                                                    Trial Account - {quota} Generate Quota - Remaining:{" "}
                                                    {remainingQuota}
                                                    {remainingQuota <= 0 &&
                                                        " (Quota Exhausted - Cannot Generate More)"}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                <div className="mb-6">
                                    <div className="mb-6">
                                        <img
                                            src={GridVectorLogo}
                                            alt="GridVector Logo"
                                            className="w-60 h-60 mx-auto object-contain"
                                        />
                                    </div>
                                    <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                                        Transform your images into high-quality vector graphics with
                                        AI-powered precision.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm text-zinc-500">
                                        Get started by uploading your images from the sidebar.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                                        <span>Supports:</span>
                                        <span className="bg-zinc-800/50 px-2 py-1 rounded">
                                            JPG
                                        </span>
                                        <span className="bg-zinc-800/50 px-2 py-1 rounded">
                                            PNG
                                        </span>
                                        <span className="bg-zinc-800/50 px-2 py-1 rounded">
                                            WEBP
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Corruption Warning Modal */}
            {showCorruptionModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900/95 border border-zinc-700 rounded-xl p-6 shadow-2xl max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-zinc-100 font-bold text-lg">
                                Corrupted Files Detected
                            </h3>
                        </div>
                        <p className="text-zinc-300 text-sm mb-4">
                            The following files appear to be corrupted and cannot be
                            processed:
                        </p>
                        <div className="max-h-32 overflow-y-auto mb-4">
                            {corruptedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-2 mb-2"
                                >
                                    <span className="text-zinc-200 text-sm truncate">
                                        {file.name}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveCorruptedFile(file)}
                                        className="text-zinc-400 hover:text-zinc-100 text-lg ml-2"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCorruptionModal(false)}
                                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleClearFiles}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`bg-zinc-900/80 border border-zinc-700 rounded-xl p-4 shadow-2xl backdrop-blur-lg animate-in slide-in-from-right-5 duration-300 flex items-start justify-between gap-4 relative overflow-hidden
            ${toast.type === "success"
                                ? "border-l-4 border-l-green-500"
                                : toast.type === "error"
                                    ? "border-l-4 border-l-red-500"
                                    : "border-l-4 border-l-indigo-500"
                            }`}
                    >
                        {/* Subtle glow behind toast */}
                        <div
                            className={`absolute inset-0 opacity-10 blur-md ${toast.type === "success"
                                ? "bg-green-500"
                                : toast.type === "error"
                                    ? "bg-red-500"
                                    : "bg-indigo-500"
                                }`}
                        ></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <span className="text-xl mt-0.5">
                                {toast.type === "success" && "✅"}
                                {toast.type === "error" && "❌"}
                                {toast.type === "info" && "💡"}
                            </span>
                            <span className="text-zinc-100 font-medium text-sm">
                                {toast.message}
                            </span>
                        </div>
                        <button
                            className="text-zinc-400 text-2xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-700 hover:text-zinc-100 transition-colors flex-shrink-0 -mt-1 -mr-1 relative z-10"
                            onClick={() =>
                                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                            }
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;
