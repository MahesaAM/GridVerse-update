import React, { useRef, useEffect } from "react";

const Log = ({ logs }) => {
    const logRef = useRef(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    if (logs.length === 0) return null;

    return (
        <div className="log show" ref={logRef}>
            {logs.map((log, index) => (
                <div key={index}>{log}</div>
            ))}
        </div>
    );
};

export default Log;
