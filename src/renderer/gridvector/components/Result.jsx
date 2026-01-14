import React, { useState, useEffect } from "react";

const Result = ({ results, format, onDownload }) => {
    if (!results || results.length === 0) return null;

    return (
        <div className="results-section">
            <h3>Batch Vectorization Complete!</h3>
            <p>
                {results.length} image(s) have been successfully converted to vector
                format.
            </p>

            <div className="results-grid">
                {results.map(({ file, result }, index) => (
                    <ResultItem
                        key={index}
                        file={file}
                        result={result}
                        format={format}
                        onDownload={onDownload}
                    />
                ))}
            </div>
        </div>
    );
};

const ResultItem = ({ file, result, format, onDownload }) => {
    const [vectorPreview, setVectorPreview] = useState(null);
    const [originalPreview, setOriginalPreview] = useState(null);

    useEffect(() => {
        // Create preview for original image
        if (file) {
            const originalUrl = URL.createObjectURL(file);
            setOriginalPreview(originalUrl);
            return () => URL.revokeObjectURL(originalUrl);
        }
    }, [file]);

    useEffect(() => {
        if (result && result.binaryBuffers.length > 0) {
            // Create blob URL for the vector data
            const blob = new Blob(result.binaryBuffers, { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            setVectorPreview(url);

            return () => URL.revokeObjectURL(url);
        }
    }, [result]);

    const downloadSVG = () => {
        onDownload(result, file);
    };

    const downloadEPS = () => {
        // For EPS, we would need to modify the download function to handle format
        // For now, just download SVG as EPS is not directly supported in preview
        onDownload(result, file);
    };

    return (
        <div className="result-item">
            <h4>{file.name}</h4>
            <div className="preview-container">
                <div className="preview-grid">
                    <div className="original-preview">
                        <h5>Original</h5>
                        {originalPreview ? (
                            <img
                                src={originalPreview}
                                alt="Original image"
                                className="original-image"
                            />
                        ) : (
                            <div className="preview-placeholder">No preview</div>
                        )}
                    </div>
                    <div className="vector-preview">
                        <h5>Vector</h5>
                        {vectorPreview ? (
                            <img
                                src={vectorPreview}
                                alt="Vector preview"
                                className="vector-image"
                                onError={() => {
                                    setVectorPreview(null);
                                }}
                            />
                        ) : (
                            <div className="preview-placeholder">
                                <div style={{ textAlign: "center" }}>
                                    <p>Vector file ready for download</p>
                                    <small style={{ color: "#999" }}>
                                        SVG format - Open with vector software
                                    </small>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="download-buttons">
                <button className="download-btn" onClick={downloadSVG}>
                    Download SVG
                </button>
                <button className="download-btn" onClick={downloadEPS}>
                    Download EPS
                </button>
            </div>
        </div>
    );
};

export default Result;
