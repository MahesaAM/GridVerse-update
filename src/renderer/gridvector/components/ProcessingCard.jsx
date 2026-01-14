import React, { useState, useEffect } from "react";

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

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setOriginalPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    useEffect(() => {
        if (result && result.binaryBuffers && result.binaryBuffers.length > 0) {
            const blob = new Blob(result.binaryBuffers, { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            setVectorPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [result]);

    const getCsrfToken = () => {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "csrfToken") {
                return value;
            }
        }
        return "";
    };

    return (
        <div
            className={`relative w-full aspect-square bg-zinc-900/40 backdrop-blur-lg border border-zinc-700/60 rounded-xl overflow-hidden shadow-xl hover:shadow-cyan-500/20 hover:-translate-y-1 transition-all duration-300 group`}
        >
            {/* Gambar Preview sebagai overlay, menutupi seluruh kartu */}
            {originalPreview ? (
                <img
                    src={originalPreview}
                    alt="Original preview"
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100 group-hover:scale-105"
                />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-zinc-800/60 flex items-center justify-center text-zinc-400 font-medium z-0">
                    Loading...
                </div>
            )}

            {/* Overlay gradien gelap di atas gambar untuk readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/40 to-transparent z-10"></div>

            {/* Status Badge - Selalu di atas */}
            <div className="absolute top-4 left-4 z-20">
                <div
                    className={`text-xs font-semibold backdrop-blur-sm truncate uppercase tracking-wider px-2.5 py-1 rounded-full border ${status === "pending"
                            ? "bg-zinc-700 text-zinc-300 border-zinc-600"
                            : status === "processing"
                                ? "bg-indigo-600/20 text-indigo-300 animate-pulse border-indigo-700"
                                : status === "downloading"
                                    ? "bg-blue-600/20 text-blue-300 animate-pulse border-blue-700"
                                    : status === "success"
                                        ? "bg-green-600/20 text-green-300 border-green-700"
                                        : "bg-red-600/20 text-red-300 border-red-700"
                        }`}
                >
                    {status === "pending" && "Pending"}
                    {status === "processing" && "Processing"}
                    {status === "downloading" && "Downloading"}
                    {status === "success" && "Complete"}
                    {status === "failed" && "Failed"}
                </div>
            </div>

            {/* Tombol Download & Progress Bar - Hanya muncul saat hover, atau selalu jika processing/failed/downloading */}
            <div
                className={`absolute inset-x-0 bottom-0 p-4 z-20 transition-all duration-300
        ${status === "success"
                        ? "opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0"
                        : ""
                    }
        ${status === "processing" ||
                        status === "failed" ||
                        status === "downloading"
                        ? "opacity-100 translate-y-0"
                        : ""
                    }
        `}
            >
                {status === "processing" && (
                    <div className="bg-zinc-800/70 backdrop-blur-sm rounded-lg p-3">
                        <div className="w-full h-2 bg-zinc-700/70 rounded-full overflow-hidden mb-1.5">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 animate-pulse-progress transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="text-center text-indigo-300 font-medium text-xs">
                            {progressText}
                        </div>
                    </div>
                )}

                {status === "downloading" && (
                    <div className="bg-zinc-800/70 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-blue-300 font-medium text-xs">
                                Downloading...
                            </span>
                        </div>
                    </div>
                )}

                {status === "failed" && (
                    <div className="bg-red-800/70 backdrop-blur-sm rounded-lg p-3 text-red-300 text-center text-sm font-medium">
                        Failed to process.
                    </div>
                )}

                {status === "success" && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownload(result, file);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Download {format.toUpperCase()}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProcessingCard;
