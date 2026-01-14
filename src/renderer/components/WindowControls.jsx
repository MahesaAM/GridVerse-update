import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function WindowControls() {
    const handleMinimize = () => {
        if (window.api) window.api.send('minimize');
    };

    const handleMaximize = () => {
        if (window.api) window.api.send('maximize');
    };

    const handleClose = () => {
        if (window.api) window.api.send('close');
    };

    return (
        <div className="flex h-full items-center no-drag z-50">
            <button
                onClick={handleMinimize}
                className="w-12 h-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Minimize"
            >
                <Minus className="w-4 h-4" />
            </button>
            <button
                onClick={handleMaximize}
                className="w-12 h-full flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Maximize"
            >
                <Square className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={handleClose}
                className="w-12 h-full flex items-center justify-center hover:bg-red-500 hover:text-white text-gray-400 transition-colors"
                title="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
