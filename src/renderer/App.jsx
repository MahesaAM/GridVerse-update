import React, { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { supabase } from './services/supabase';
import Login from './components/Login';
import AppLauncher from './AppLauncher';
import GridVidApp from './GridVidApp';
import GridBotApp from './gridbot/GridBotApp';

import GridPromptApp from './gridprompt/GridPromptApp';
import GridMetaApp from './gridmeta/GridMetaApp';
import GridVectorApp from './gridvector/GridVectorApp';
import GridTrendsApp from './gridtrends/GridTrendsApp';
import BrowserLayout from './components/Browser/BrowserLayout';
import WindowControls from './components/WindowControls';


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("App Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen w-screen bg-black text-red-500 p-10 flex flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                    <pre className="bg-slate-900 p-4 rounded border border-red-900/50 text-xs overflow-auto max-w-full">
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [appVersion, setAppVersion] = useState('v1.0.0');
    const [expirationDate, setExpirationDate] = useState(null);
    const [currentApp, setCurrentApp] = useState('launcher'); // 'launcher' | 'gridvid' | 'gridbot'

    useEffect(() => {
        const fetchApiKeys = async () => {
            try {
                const { data, error } = await supabase
                    .from('apikey')
                    .select('apikey');

                if (error) {
                    console.error('Error fetching API keys:', error);
                } else if (data) {
                    const keys = data.map(item => item.apikey).filter(Boolean);
                    localStorage.setItem('groq_api_keys', JSON.stringify(keys));
                    console.log('Updated Groq API keys cache:', keys.length, 'keys');
                }
            } catch (err) {
                console.error('Exception fetching API keys:', err);
            }
        };

        fetchApiKeys();

        const validateSession = async () => {
            const storedUser = localStorage.getItem('gridvidUser');
            if (storedUser) {
                try {
                    const session = JSON.parse(storedUser);
                    // Check against database
                    const { data, error } = await supabase
                        .from('users_veo')
                        .select('*')
                        .eq('username', session.username)
                        .single();

                    if (error || !data) {
                        console.warn('Session invalid: User not found or DB error', error);
                        localStorage.removeItem('gridvidUser');
                        setIsAuthenticated(false);
                    } else {
                        if (data.expired) {
                            const expiredDate = new Date(data.expired);
                            const now = new Date();
                            if (now > expiredDate) {
                                console.warn('Session expired');
                                alert('Your subscription has expired.');
                                localStorage.removeItem('gridvidUser');
                                setIsAuthenticated(false);
                            } else {
                                setIsAuthenticated(true);
                                setExpirationDate(expiredDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
                            }
                        } else {
                            setIsAuthenticated(true);
                            setExpirationDate('Lifetime');
                        }
                    }
                } catch (e) {
                    console.error('Session validation error:', e);
                    localStorage.removeItem('gridvidUser');
                    setIsAuthenticated(false);
                }
            }
            setIsAuthChecking(false);
        };

        validateSession();

        if (window.api) {
            window.api.invoke('get-app-version').then(ver => {
                if (ver) setAppVersion(`v${ver}`);
            });
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('gridvidUser');
        setIsAuthenticated(false);
        setCurrentApp('launcher');
    };

    if (isAuthChecking) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center">
                <div
                    className="w-20 h-20"
                    style={{
                        backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle fill="%23FFFFFF" stroke="%23FFFFFF" stroke-width="15" r="15" cx="40" cy="65"><animate attributeName="cy" calcMode="spline" dur="2" values="65;135;65;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate></circle><circle fill="%23FFFFFF" stroke="%23FFFFFF" stroke-width="15" r="15" cx="100" cy="65"><animate attributeName="cy" calcMode="spline" dur="2" values="65;135;65;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate></circle><circle fill="%23FFFFFF" stroke="%23FFFFFF" stroke-width="15" r="15" cx="160" cy="65"><animate attributeName="cy" calcMode="spline" dur="2" values="65;135;65;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate></circle></svg>')`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                    }}
                ></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Login onLoginSuccess={(session) => {
                setIsAuthenticated(true);
                if (session && session.expired) {
                    const d = new Date(session.expired);
                    setExpirationDate(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
                } else {
                    setExpirationDate('Lifetime');
                }
            }} />
        );
    }


    // Authenticated State Router
    // BrowserLayout handles internal routing/tabs

    // Check for detached app param
    const urlParams = new URLSearchParams(window.location.search);
    const detachedApp = urlParams.get('app');

    if (detachedApp) {
        // Render specific app directly
        const commonProps = {
            onLogout: handleLogout,
            appVersion,
            expirationDate,
            // In standalone mode, maybe a back button or not needed.
            // But we should pass onBack=null or handle it? Most apps don't use it if not top level.
            onBack: null
        };

        const renderDetached = () => {
            switch (detachedApp) {
                case 'gridvid': return <GridVidApp {...commonProps} />;
                case 'gridbot': return <GridBotApp {...commonProps} />;
                case 'gridprompt': return <GridPromptApp {...commonProps} />;
                case 'gridmeta': return <GridMetaApp {...commonProps} />;
                case 'gridtrends': return <GridTrendsApp {...commonProps} />;
                case 'gridvector':
                    return (
                        <div style={{ height: '100vh', width: '100vw' }}>
                            <HashRouter>
                                <GridVectorApp {...commonProps} />
                            </HashRouter>
                        </div>
                    );
                default:
                    return <div className="text-white p-10">Unknown App: {detachedApp}</div>;
            }
        };

        const appTitleMap = {
            'gridvid': 'GridVid',
            'gridbot': 'GridBot',
            'gridprompt': 'GridPrompt',
            'gridmeta': 'GridMeta',
            'gridtrends': 'GridTrends',
            'gridvector': 'GridVector'
        };

        const title = appTitleMap[detachedApp] || 'GridVerse App';

        return (
            <ErrorBoundary>
                <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
                    {/* Detached Window Header */}
                    <div className="h-10 shrink-0 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-4 draggable-region select-none z-50">
                        <div className="flex items-center gap-2">
                            {/* Small Logo or Icon could go here */}
                            <span className="text-xs font-bold text-gray-400 tracking-wide uppercase">{title}</span>
                        </div>
                        <WindowControls />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 relative overflow-hidden">
                        {renderDetached()}
                    </div>
                </div>
            </ErrorBoundary>
        );
    }


    return (
        <ErrorBoundary>
            <BrowserLayout
                onLogout={handleLogout}
                appVersion={appVersion}
                expirationDate={expirationDate}
            />
        </ErrorBoundary>
    );

    return null;
}
