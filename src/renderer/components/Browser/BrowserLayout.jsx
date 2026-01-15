import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import TabBar from './TabBar';
import AppLauncher from '../../AppLauncher';
// Import App Components
import GridVidApp from '../../GridVidApp';
import GridBotApp from '../../gridbot/GridBotApp';
import GridPromptApp from '../../gridprompt/GridPromptApp';
import GridMetaApp from '../../gridmeta/GridMetaApp';
import GridVectorApp from '../../gridvector/GridVectorApp';

import { HashRouter } from 'react-router-dom';

const BrowserLayout = ({ onLogout, appVersion, expirationDate }) => {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [processingStates, setProcessingStates] = useState({}); // { tabId: boolean }

    const handleProcessingChange = (tabId, isProcessing) => {
        setProcessingStates(prev => ({
            ...prev,
            [tabId]: isProcessing
        }));
    };

    // Initialize with one empty tab
    useEffect(() => {
        if (tabs.length === 0) {
            createNewTab();
        }
    }, []);

    const createNewTab = () => {
        const newTab = {
            id: uuidv4(),
            title: 'New Tab',
            type: 'launcher',
            component: 'launcher',
            timestamp: Date.now()
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    };

    const closeTab = (id) => {
        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== id);

            // Handle Active Tab Logic
            if (activeTabId === id) {
                // If closing active tab, switch to the last one, or create new if empty
                if (newTabs.length > 0) {
                    setActiveTabId(newTabs[newTabs.length - 1].id);
                } else {
                    // Don't execute here, let the effect handle empty state or handle immediately
                    // But strictly speaking react state updates are async.
                    // Better logic handled below or just let it close and check length
                }
            }
            return newTabs;
        });
    };

    // Effect to ensure there's always at least one tab?? 
    // Or maybe we allow closing all and it just shows a "Start Page" or auto-opens new tab.
    // Chrome closes window if last tab closed. Here we might just open a new launcher.
    useEffect(() => {
        if (tabs.length === 0) {
            // Option: timeout to prevent fast re-render issues or just set it
            const newTab = {
                id: uuidv4(),
                title: 'New Tab',
                type: 'launcher',
                component: 'launcher',
                timestamp: Date.now()
            };
            setTabs([newTab]);
            setActiveTabId(newTab.id);
        }
    }, [tabs]);


    const updateTabContent = (tabId, appId) => {
        const appMap = {
            'gridvid': { title: 'GridVid', type: 'gridvid' },
            'gridbot': { title: 'GridBot', type: 'gridbot' },
            'gridprompt': { title: 'GridPrompt', type: 'gridprompt' },
            'gridmeta': { title: 'GridMeta', type: 'gridmeta' },
            'gridvector': { title: 'GridVector', type: 'gridvector' },
            'launcher': { title: 'New Tab', type: 'launcher' }
        };

        const appInfo = appMap[appId];
        if (!appInfo) return;

        setTabs(prev => prev.map(tab => {
            if (tab.id === tabId) {
                return {
                    ...tab,
                    title: appInfo.title,
                    type: appInfo.type,
                    component: appId
                };
            }
            return tab;
        }));
    };

    const renderTabContent = (tab) => {
        const isHidden = tab.id !== activeTabId;
        const style = { display: isHidden ? 'none' : 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' };

        // Common Props
        const commonProps = {
            onBack: () => updateTabContent(tab.id, 'launcher'),
            // Note: onLogout passed from top level might need to log out the WHOLE app, not just tab.
            // AppLauncher has logout. Other apps usually just have "Back". 
            // If they have logout, it should probably logout the session.
            onLogout: onLogout,
            onProcessingChange: (isProcessing) => handleProcessingChange(tab.id, isProcessing)
        };

        let content = null;

        switch (tab.component) {
            case 'launcher':
                content = (
                    <AppLauncher
                        onSelectApp={(appId) => updateTabContent(tab.id, appId)}
                        onLogout={onLogout}
                        appVersion={appVersion}
                        expirationDate={expirationDate}
                    />
                );
                break;
            case 'gridvid':
                content = (
                    <GridVidApp
                        {...commonProps}
                        appVersion={appVersion}
                        expirationDate={expirationDate}
                    />
                );
                break;
            case 'gridbot':
                content = <GridBotApp {...commonProps} />;
                break;
            case 'gridprompt':
                content = <GridPromptApp {...commonProps} />;
                break;
            case 'gridmeta':
                content = <GridMetaApp {...commonProps} />;
                break;
            case 'gridvector':
                // GridVector might use HashRouter internally. 
                // Nesting HashRouter inside HashRouter is bad.
                // App.jsx likely doesn't use Router for the main switch, so maybe it's fine.
                // But wait, App.jsx uses standard conditional rendering.
                // GridVectorApp USES HashRouter wrapped in line 207 of App.jsx (original).
                // We should WRAP it here if the component itself doesn't have it, OR the component has it.
                // Let's check GridVectorApp.jsx again. It doesn't seem to export a Router, 
                // but App.jsx wrapped it.
                content = (
                    <div style={{ height: '100%', width: '100%' }}>
                        <HashRouter>
                            <GridVectorApp {...commonProps} />
                        </HashRouter>
                    </div>
                );
                break;
            default:
                content = <div>Unknown App</div>;
        }

        return (
            <div key={tab.id} style={style} className="bg-black">
                {content}
            </div>
        );
    };

    const handleHome = () => {
        if (activeTabId) {
            updateTabContent(activeTabId, 'launcher');
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-black overflow-hidden">
            <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                processingStates={processingStates}
                onTabClick={setActiveTabId}
                onTabClose={closeTab}
                onNewTab={createNewTab}
                onHome={handleHome}
            />
            <div className="flex-1 relative w-full h-full overflow-hidden">
                {tabs.map(tab => renderTabContent(tab))}
            </div>
        </div>
    );
};

export default BrowserLayout;
