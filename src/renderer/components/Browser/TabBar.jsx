import React, { useRef, useEffect } from 'react';
import Tab from './Tab';
import { Plus, Home, ExternalLink } from 'lucide-react';
import WindowControls from '../WindowControls';

const TabBar = ({ tabs, activeTabId, onTabClick, onTabClose, onNewTab, onHome, processingStates = {} }) => {
    const scrollContainerRef = useRef(null);

    // Auto-scroll to active tab
    useEffect(() => {
        if (scrollContainerRef.current) {
            const activeTab = scrollContainerRef.current.querySelector('.active-tab'); // You'd need to add this class or logic
        }
    }, [activeTabId]);

    return (
        <div className="flex items-center w-full h-10 bg-[#0a0a0a] border-b border-white/5 select-none relative z-50">
            {/* Tabs Container */}
            <div
                ref={scrollContainerRef}
                className="flex flex-1 overflow-x-auto no-scrollbar items-end h-full draggable-region"
            >
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        {...tab}
                        isActive={tab.id === activeTabId}
                        onClick={() => onTabClick(tab.id)}
                        onClose={onTabClose}
                    />
                ))}

                {/* New Tab Button */}
                <button
                    onClick={onNewTab}
                    className="flex items-center justify-center p-2 h-full aspect-square text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    title="New Tab"
                    style={{ WebkitAppRegion: 'no-drag' }}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Home Button and Window Controls */}
            <div className="flex items-center h-full border-l border-white/5 z-50 bg-[#0a0a0a]">
                <button
                    onClick={onHome}
                    className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    title="Home"
                >
                    <Home className="w-4 h-4" />
                </button>
                {/* Detach Button - Only show if active tab is not launcher */}
                {(() => {
                    const activeTab = tabs.find(t => t.id === activeTabId);
                    if (activeTab && activeTab.component !== 'launcher') {
                        const isProcessing = processingStates[activeTabId];
                        return (
                            <button
                                disabled={isProcessing}
                                onClick={() => {
                                    if (window.api && window.api.openDetachedWindow && !isProcessing) {
                                        window.api.openDetachedWindow(activeTab.component);
                                        // Close tab after detaching as requested
                                        onTabClose(activeTabId);
                                    }
                                }}
                                className={`w-10 h-full flex items-center justify-center transition-colors ${isProcessing
                                    ? 'text-gray-700 cursor-not-allowed opacity-50'
                                    : 'text-gray-500 hover:text-blue-400 hover:bg-white/5'
                                    }`}
                                title={isProcessing ? "Cannot detach while processing" : "Detach Tab"}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        );
                    }
                    return null;
                })()}
                <div className="h-4 w-px bg-white/10 mx-1"></div>
                <WindowControls />
            </div>
        </div>
    );
};

export default TabBar;
