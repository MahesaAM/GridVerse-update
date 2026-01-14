import React from 'react';
import { Loader, CheckCircle, XCircle, Clock } from 'lucide-react';

const MassProcessingView = ({
    total,
    processed,
    success,
    failed,
    activeWorkers = [],
    progress,
    startTime,
    estimatedEndTime,
    onStop
}) => {
    const percentage = Math.round((processed / total) * 100) || 0;

    // Get the name of the file currently being processed
    const currentFile = activeWorkers.length > 0 ? activeWorkers[0].file.name : "Initializing...";

    const getTimeString = (date) => {
        if (!date) return '--:--';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/50 rounded-xl p-8 border border-white/5 shadow-inner backdrop-blur-sm relative overflow-hidden">
            {/* Simple Background Pulse */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-pulse" />

            <div className="max-w-3xl mx-auto w-full flex flex-col justify-center h-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-white mb-2">Mass Processing Active</h2>
                    <p className="text-zinc-400 text-sm">Please wait while we process your files.</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm mb-2 font-mono">
                        <span className="text-cyan-400">Progress</span>
                        <span className="text-white">{percentage}%</span>
                    </div>
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-cyan-600 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(8,145,178,0.5)]"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="text-center mt-2 text-xs text-zinc-500 font-mono">
                        {processed} of {total} processed
                    </div>
                </div>

                {/* Current Item */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/5 mb-8 flex items-center gap-3">
                    <Loader size={20} className="text-cyan-400 animate-spin flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Processing Now</div>
                        <div className="text-zinc-200 text-sm truncate font-medium">{currentFile}</div>
                    </div>
                </div>

                {/* Simple Stats */}
                <div className="flex justify-center gap-8 mb-10">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{success}</div>
                        <div className="text-xs text-zinc-500 uppercase">Success</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{failed}</div>
                        <div className="text-xs text-zinc-500 uppercase">Failed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold text-zinc-300">
                            {estimatedEndTime ? getTimeString(estimatedEndTime) : '--:--'}
                        </div>
                        <div className="text-xs text-zinc-500 uppercase">Est. Finish</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MassProcessingView;
