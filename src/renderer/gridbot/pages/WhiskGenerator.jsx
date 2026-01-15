import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  memo
} from "react";
import { Clock, Loader2, RefreshCw, Smartphone, Monitor } from "lucide-react";

const ASPECT_OPTIONS = [
  { label: "Landscape 4:3", value: "IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE" },
  { label: "Landscape 16:9", value: "IMAGE_ASPECT_RATIO_LANDSCAPE" },
  { label: "Portrait 3:4", value: "IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR" },
  { label: "Portrait 9:16", value: "IMAGE_ASPECT_RATIO_PORTRAIT" },
  { label: "Square", value: "IMAGE_ASPECT_RATIO_SQUARE" },
];

const ShinyText = ({ children }) => (
  <span
    className="shiny-text-yellow font-semibold"
  >
    {children}
  </span>
);

const LogRow = memo(({ index, log, downloadImage, retryPrompt }) => {
  return (
    <div className="px-3 py-2">
      <div className="bg-[#1C1E2B]/50 border border-white/10 rounded-lg p-3 hover:border-yellow-500/20 transition-colors">
        {log.prompt ? (
          <>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="text-xs font-mono text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded mt-0.5">
                  #{index + 1}
                </span>
                {log.status === "pending" ? (
                  <ShinyText>
                    <span className="text-sm block break-words whitespace-pre-wrap">{log.prompt}</span>
                  </ShinyText>
                ) : (
                  <span className="text-sm text-gray-300 font-medium block break-words whitespace-pre-wrap">
                    {log.prompt}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {log.status === "pending" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                )}
                {log.status === "success" && log.images && (
                  <span className="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded-full">
                    {log.images.length} Whisks
                  </span>
                )}
                {log.status === "error" && (
                  <>
                    <span className="text-xs text-red-400 font-medium bg-red-400/10 px-2 py-0.5 rounded-full">
                      Error
                    </span>
                    <button
                      onClick={() => retryPrompt(log.prompt)}
                      className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-gray-900 rounded transition-colors font-medium"
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            </div>

            {log.status === "error" && (
              <div className="text-xs text-red-400 mt-1 pl-1 border-l-2 border-red-500/30">
                {log.message}
              </div>
            )}

            {log.images && (
              <div className="grid grid-cols-4 gap-2">
                {log.images.map((img, idx) => (
                  <div key={idx} className="group relative aspect-square bg-gray-900 rounded-md overflow-hidden ring-1 ring-white/5">
                    <img
                      src={img.url}
                      alt={`Gen ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={() => downloadImage(img.url, img.filename)}
                        className="p-1.5 bg-yellow-500 text-black rounded hover:bg-yellow-400 transition-colors"
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-400 italic">{log.message}</div>
        )}
      </div>
    </div>
  );
});

export default function WhiskGenerator({ onBack, onLogout, onProcessingChange }) {
  // Sidebar states
  const [prompts, setPrompts] = useState("");
  const [originalPrompts, setOriginalPrompts] = useState([]);
  const [aspect, setAspect] = useState(ASPECT_OPTIONS[0].value);
  const [candidatesCount, setCandidatesCount] = useState(2);
  const [autoDownload, setAutoDownload] = useState(true);
  const [bearerToken, setBearerToken] = useState(() =>
    localStorage.getItem("whiskBearerToken") || ""
  );
  const [downloadPath, setDownloadPath] = useState("");
  const [expiresAtDisplay, setExpiresAtDisplay] = useState("");

  // Generation & logs
  const [logs, setLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const cancelRef = useRef(false);
  // Ref to track latest download path
  const downloadPathRef = useRef(downloadPath);

  useEffect(() => {
    downloadPathRef.current = downloadPath;
  }, [downloadPath]);

  // Auto-scroll ref
  const listEndRef = useRef(null);

  // — Auth & expiration check —
  useEffect(() => {
    const token = localStorage.getItem("token");
    const expiresAt = localStorage.getItem("expiresAt");
    // Auth checks...
    if (expiresAt && new Date(expiresAt) < new Date()) {
      localStorage.removeItem("token");
      if (onLogout) onLogout();
    }
  }, [onLogout]);

  // — Init download path from Storage —
  useEffect(() => {
    const saved = localStorage.getItem('downloadPath');
    if (saved) {
      setDownloadPath(saved);
      window.electronAPI?.setDownloadPath?.(saved);
    }

    if (window.electronAPI?.onDownloadPathChanged) {
      window.electronAPI.onDownloadPathChanged(path => {
        setDownloadPath(path);
        localStorage.setItem('downloadPath', path);
      });
    }
  }, []);

  // — Download helper —
  const downloadImage = useCallback((url, filename) => {
    const currentPath = downloadPathRef.current;
    if (!currentPath) {
      alert("Mohon pilih folder download terlebih dahulu!");
      return;
    }

    let uniqueFilename = filename;
    if (!filename.includes(Date.now().toString())) {
      const dotIndex = filename.lastIndexOf(".");
      if (dotIndex === -1) {
        uniqueFilename = `${filename}_${Date.now()}`;
      } else {
        uniqueFilename = `${filename.substring(0, dotIndex)}_${Date.now()}${filename.substring(dotIndex)}`;
      }
    }

    if (window.electronAPI?.download) {
      window.electronAPI.download(url, uniqueFilename);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = uniqueFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [downloadPath]);

  // — Core generation logic (Whisk) —
  const generateForPrompts = useCallback(
    async lines => {
      if (!lines.length) {
        setLogs(l => [
          ...l,
          {
            id: Date.now(),
            prompt: "",
            status: "error",
            message: "⚠️ Prompt belum diisi.",
          },
        ]);
        return;
      }

      setIsGenerating(true);
      if (onProcessingChange) onProcessingChange(true);
      cancelRef.current = false;

      for (let i = 0; i < lines.length; i++) {
        if (cancelRef.current) break;

        const prompt = lines[i];
        const logId = Date.now() + i;
        setLogs(l => [...l, { id: logId, prompt, status: "pending" }]);

        try {
          const controller = new AbortController();
          setAbortController(controller);

          const requests = Array.from({ length: candidatesCount }).map((_, idx) => {
            const body = {
              clientContext: {
                workflowId: "1cf90a80-9b76-4b7b-8014-085af6e9b3a5",
                tool: "BACKBONE",
                sessionId: `;${Date.now()}`
              },
              imageModelSettings: {
                imageModel: "IMAGEN_3_5",
                aspectRatio: aspect
              },
              seed: 375979 + (i * 100) + idx, // Ensure unique variation
              prompt: prompt,
              mediaCategory: "MEDIA_CATEGORY_BOARD"
            };

            return window.electronAPI.fetchWithCookie({
              url: "https://aisandbox-pa.googleapis.com/v1/whisk:generateImage",
              method: "POST",
              headers: {
                accept: "*/*",
                "content-type": "text/plain;charset=UTF-8",
                "origin": "https://labs.google",
                "referer": "https://labs.google/",
                Authorization: `Bearer ${bearerToken}`,
              },
              body: JSON.stringify(body),
            });
          });

          const responses = await Promise.all(requests);

          if (cancelRef.current) return;
          setAbortController(null);

          const allImages = [];
          let lastError = null;

          for (const res of responses) {
            const data = res.data;
            if (typeof data === 'string' && data.trim().startsWith('<')) {
              lastError = new Error(`Server returned HTML error (Status ${res.status}). Likely invalid token or 404.`);
              continue;
            }
            if (res.status === 200) {
              const panel = data.imagePanels?.[0];
              const rawImages = panel?.generatedImages || [];
              if (rawImages.length) {
                const processed = rawImages.map((img, idx) => {
                  const b64 = img.encodedImage || img.base64 || img.image || "";
                  const url = `data:image/jpeg;base64,${b64}`;
                  const name = prompt.replace(/[^a-z0-9]/gi, "_").substring(0, 20);
                  return {
                    filename: `${name}_${Date.now()}_${allImages.length + idx + 1}.jpg`,
                    url,
                  };
                });
                allImages.push(...processed);
              }
            } else {
              if (res.status === 401) lastError = new Error("Unauthorized access (401).");
              else if (res.status === 429) lastError = new Error("API limit reached (429).");
              else lastError = new Error(data.error || data.message || `Status ${res.status}`);
            }
          }

          if (allImages.length === 0) {
            throw lastError || new Error("No whisks were generated.");
          }

          setLogs(l =>
            l.map(x =>
              x.id === logId ? { ...x, status: "success", images: allImages } : x
            )
          );
          if (autoDownload) {
            allImages.forEach((img, idx) =>
              setTimeout(() => downloadImage(img.url, img.filename), idx * 1200)
            );
          }
        } catch (err) {
          const message =
            err.name === "AbortError"
              ? "Dibatalkan oleh pengguna."
              : err.message || "Unknown error";

          setLogs(l =>
            l.map(x =>
              x.id === logId ? { ...x, status: "error", message } : x
            )
          );
          setAbortController(null);

          if (
            message === "Unauthorized access (401)." ||
            message === "API limit reached (429)."
          ) {
            alert(message);
            setIsGenerating(false);
            if (onProcessingChange) onProcessingChange(false);
            return;
          }
        }
      }

      setIsGenerating(false);
      if (onProcessingChange) onProcessingChange(false);
      setAbortController(null);
      setLogs(l => [
        ...l,
        {
          id: Date.now() + 9999,
          prompt: "",
          status: "success",
          message: "✅ Semua prompt selesai diproses.",
        },
      ]);
    },
    [aspect, autoDownload, bearerToken, candidatesCount, downloadImage]
  );

  const handleGenerate = async () => {
    let currentPath = downloadPath;
    if (!currentPath) {
      // Alert and ask to choose
      alert("Please select a download folder first.");
      const handleChangeDownloadPath = async () => {
        if (window.electronAPI?.openFolderDialog) {
          const path = await window.electronAPI.openFolderDialog();
          if (path) {
            setDownloadPath(path);
            localStorage.setItem('downloadPath', path);
            window.electronAPI?.setDownloadPath?.(path);
            return path;
          }
        }
        return null;
      };
      const newPath = await handleChangeDownloadPath();
      if (!newPath) return; // User cancelled or failed
      currentPath = newPath;
    }

    if (isGenerating) {
      cancelRef.current = true;
      abortController?.abort();
      setIsGenerating(false);
      if (onProcessingChange) onProcessingChange(false);
      return;
    }
    const lines = prompts
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
    setOriginalPrompts(lines);
    setLogs([]);
    await generateForPrompts(lines);
  };

  const retryPrompt = useCallback(
    async prompt => {
      setLogs(l => l.filter(x => !(x.prompt === prompt && x.status === "error")));
      await generateForPrompts([prompt]);
    },
    [generateForPrompts]
  );

  const handleResume = async () => {
    if (isGenerating) return;
    const toResume = originalPrompts.filter(
      p => !logs.some(x => x.prompt === p && x.status === "success")
    );
    if (!toResume.length) return;
    setLogs(l => l.filter(x => x.status === "success"));
    await generateForPrompts(toResume);
  };

  const retryAllFailed = async () => {
    const failed = logs
      .filter(x => x.status === "error")
      .map(x => x.prompt);
    if (!failed.length) return;
    setLogs(l => l.filter(x => x.status !== "error"));
    await generateForPrompts(failed);
  };

  const handleChangeDownloadPath = async () => {
    if (window.electronAPI?.openFolderDialog) {
      const path = await window.electronAPI.openFolderDialog();
      if (path) {
        setDownloadPath(path);
        localStorage.setItem('downloadPath', path);
        window.electronAPI?.setDownloadPath?.(path);
        return path;
      }
    }
    return null;
  };

  // — Auto-scroll on new log entry —
  useLayoutEffect(() => {
    if (listEndRef.current && logs.length > 0) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="relative flex h-full bg-[#09090b] text-white overflow-hidden font-sans">
      <aside className="w-72 bg-[#121214] border-r border-[#27272a] flex-shrink-0 flex flex-col z-10">

        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

          {/* Section: Prompts */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prompts</label>
              <span className="text-[10px] text-gray-500">{prompts.split("\n").filter(l => l.trim()).length} lines</span>
            </div>
            <textarea
              rows={6}
              value={prompts}
              onChange={e => setPrompts(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter prompts..."
              className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-md p-2.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 resize-y"
            />
          </div>

          {/* Section: Settings */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setAspect(value)}
                    disabled={isGenerating}
                    className={`px-2 py-1.5 text-[11px] rounded border transition-all ${aspect === value
                      ? "bg-yellow-600/10 border-yellow-500 text-yellow-500"
                      : "bg-[#1c1c1f] border-[#27272a] text-gray-400 hover:border-gray-500"
                      }`}
                  >
                    {label.replace('Landscape ', '').replace('Portrait ', '').replace('IMAGE_ASPECT_RATIO_', '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Count</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#1c1c1f] border border-[#27272a] rounded-md">
                {[1, 2].map(n => (
                  <button
                    key={n}
                    onClick={() => setCandidatesCount(n)}
                    disabled={isGenerating}
                    className={`h-6 text-xs font-medium rounded transition-all ${candidatesCount === n
                      ? "bg-yellow-600 text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Output</label>
              <div className="flex gap-1.5">
                <div
                  className="flex-1 bg-[#1c1c1f] border border-[#27272a] rounded-md px-2 py-1.5 text-xs text-gray-400 truncate cursor-not-allowed select-none"
                  title={downloadPath}
                >
                  {downloadPath ? downloadPath.split('\\').pop() : "No folder select..."}
                </div>
                <button
                  onClick={handleChangeDownloadPath}
                  className="px-2 py-1 text-xs bg-[#27272a] hover:bg-[#3f3f46] text-white rounded border border-[#3f3f46] transition-colors"
                >
                  Folder
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="auto-dl"
                  type="checkbox"
                  checked={autoDownload}
                  onChange={() => setAutoDownload(!autoDownload)}
                  className="rounded border-[#27272a] bg-[#1c1c1f] text-yellow-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <label htmlFor="auto-dl" className="text-xs text-gray-400 select-none">Auto-save images</label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Auth</label>
              <input
                type="password"
                value={bearerToken}
                onChange={e => {
                  setBearerToken(e.target.value);
                  localStorage.setItem("whiskBearerToken", e.target.value);
                }}
                placeholder="Bearer Token"
                className="w-full bg-[#1c1c1f] border border-[#27272a] rounded-md px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#27272a] bg-[#0e0e11] space-y-2">
          <button
            onClick={handleGenerate}
            disabled={!prompts.trim() || !bearerToken.trim()}
            className={`w-full h-9 text-xs font-semibold uppercase tracking-wide rounded transition-all shadow-lg flex items-center justify-center gap-2 ${isGenerating || !prompts.trim() || !bearerToken.trim()
              ? "bg-[#27272a] text-gray-500 cursor-not-allowed"
              : "bg-yellow-600 hover:bg-yellow-500 text-gray-900 shadow-yellow-900/20"
              }`}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Whisks"}
          </button>

          {isGenerating && (
            <button
              onClick={() => {
                cancelRef.current = true;
                abortController?.abort();
                setIsGenerating(false);
                if (onProcessingChange) onProcessingChange(false);
              }}
              className="w-full h-8 text-xs font-semibold uppercase tracking-wide rounded bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 transition-colors"
            >
              Stop Generation
            </button>
          )}

          {!isGenerating && logs.some(x => x.status === "error") && (
            <button
              onClick={retryAllFailed}
              className="w-full h-8 text-xs font-semibold uppercase tracking-wide rounded bg-[#27272a] text-gray-300 hover:bg-[#3f3f46] transition-colors border border-white/5"
            >
              Retry Failed
            </button>
          )}
          {!isGenerating && originalPrompts.length > 0 && logs.some(x => x.status !== "success") && (
            <button
              onClick={handleResume}
              className="w-full h-8 text-xs font-semibold uppercase tracking-wide rounded bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 hover:bg-yellow-900/40 transition-colors"
            >
              Resume Remaining
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 bg-[#09090b] flex flex-col min-h-0 relative">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center
                          border-2 border-dashed border-[#27272a]
                          rounded-lg">
            <div className="flex flex-col items-center justify-center">
              <Monitor className="w-16 h-16 text-[#27272a] mb-4" />
              <p className="text-gray-500">
                Generated whisks will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto pr-2">
            {logs.map((log, index) => (
              <LogRow
                key={log.id}
                index={index}
                log={log}
                downloadImage={downloadImage}
                retryPrompt={retryPrompt}
              />
            ))}
            <div ref={listEndRef} />
          </div>
        )}
      </main>
    </div>
  );
}
