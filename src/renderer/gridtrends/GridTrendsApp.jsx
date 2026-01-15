import React from 'react';
import FutureSignals from './components/FutureSignals';

const GridTrendsApp = ({ onBack }) => {
    return (
        <div className="h-full w-full bg-[#0f172a] text-white flex flex-col overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Main Content Area */}
            <main className="flex-1 relative overflow-y-auto">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none" />
                <FutureSignals />
            </main>
        </div>
    );
};

export default GridTrendsApp;
