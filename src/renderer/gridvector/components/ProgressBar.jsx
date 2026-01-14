import React from "react";

const ProgressBar = ({ progress, progressText, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="progress-container show">
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-text">{progressText}</div>
        </div>
    );
};

export default ProgressBar;
