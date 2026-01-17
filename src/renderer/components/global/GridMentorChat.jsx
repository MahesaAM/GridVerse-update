import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, X, Paperclip, XCircle, Trash2, Plus, MessageSquare, Menu, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const GridMentorChat = () => {
    // Chat State
    const [chatOpen, setChatOpen] = useState(false);
    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('gridmentor_sessions');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse sessions", e);
            }
        }
        // Migration for legacy single history
        const legacy = localStorage.getItem('gridmentor_history');
        if (legacy) {
            try {
                const legacyHistory = JSON.parse(legacy);
                return [{
                    id: Date.now().toString(),
                    title: "Previous Chat",
                    messages: legacyHistory,
                    updatedAt: Date.now()
                }];
            } catch (e) { }
        }

        return [{
            id: Date.now().toString(),
            title: "New Chat",
            messages: [{ role: 'system', content: "Halo! Saya GridMentor. Ada yang bisa saya bantu tentang GridVerse hari ini?" }],
            updatedAt: Date.now()
        }];
    });

    const [activeSessionId, setActiveSessionId] = useState(() => {
        // Default to first session id
        return sessions?.[0]?.id || null;
    });

    const [showSidebar, setShowSidebar] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null); // { file, preview, base64, mimeType }
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Derived state for current history
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const chatHistory = activeSession?.messages || [];

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, chatOpen, activeSessionId]);

    // Save sessions to localStorage
    useEffect(() => {
        localStorage.setItem('gridmentor_sessions', JSON.stringify(sessions));

        // Ensure we always have an active session
        if (!activeSessionId && sessions.length > 0) {
            setActiveSessionId(sessions[0].id);
        }
    }, [sessions, activeSessionId]);

    const handleNewChat = () => {
        const newSession = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: [{ role: 'system', content: "Halo! Saya GridMentor. Ada yang bisa saya bantu tentang GridVerse hari ini?" }],
            updatedAt: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setShowSidebar(false); // Close sidebar on mobile/compact views if needed
    };

    const handleDeleteSession = (e, sessionId) => {
        e.stopPropagation();
        if (sessions.length <= 1) {
            if (window.confirm("Hapus chat ini? Ini akan mereset ke chat baru.")) {
                const newSession = {
                    id: Date.now().toString(),
                    title: "New Chat",
                    messages: [{ role: 'system', content: "Halo! Saya GridMentor. Ada yang bisa saya bantu tentang GridVerse hari ini?" }],
                    updatedAt: Date.now()
                };
                setSessions([newSession]);
                setActiveSessionId(newSession.id);
            }
            return;
        }

        if (window.confirm("Hapus percakapan ini?")) {
            const newSessions = sessions.filter(s => s.id !== sessionId);
            setSessions(newSessions);
            if (activeSessionId === sessionId) {
                setActiveSessionId(newSessions[0].id);
            }
        }
    };

    const handleSelectSession = (sessionId) => {
        setActiveSessionId(sessionId);
        setShowSidebar(false);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Only images are supported.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setSelectedImage({
                file,
                preview: URL.createObjectURL(file), // For UI
                base64: ev.target.result.split(',')[1], // Strip prefix for API
                mimeType: file.type
            });
        };
        reader.readAsDataURL(file);
        // Clear input value to allow re-selecting same file
        e.target.value = null;
    };

    const handleRemoveFile = () => {
        if (selectedImage?.preview) URL.revokeObjectURL(selectedImage.preview);
        setSelectedImage(null);
    };

    const updateSessionMessages = (sessionId, newMessages) => {
        setSessions(prev => prev.map(s => {
            if (s.id === sessionId) {
                // Auto update title based on first user message if it's currently "New Chat"
                let title = s.title;
                if (s.title === "New Chat") {
                    const firstUserMsg = newMessages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "");
                    }
                }
                return { ...s, messages: newMessages, title, updatedAt: Date.now() };
            }
            return s;
        }));
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if ((!chatInput.trim() && !selectedImage) || isChatting) return;

        const currentSessionId = activeSessionId; // Capture ID at start
        const userMsg = {
            role: 'user',
            content: chatInput,
            image: selectedImage ? `data:${selectedImage.mimeType};base64,${selectedImage.base64}` : null
        };

        const imagePayload = selectedImage ? {
            base64: selectedImage.base64,
            mimeType: selectedImage.mimeType
        } : null;

        // Optimistic Update
        const updatedHistory = [...chatHistory, userMsg];
        updateSessionMessages(currentSessionId, updatedHistory);

        setChatInput('');
        handleRemoveFile(); // Clear file selection
        setIsChatting(true);

        try {
            const globalConfig = JSON.parse(localStorage.getItem('global-ai-config') || '{}');
            let apiKey = globalConfig.apiKey;

            const storedKeys = localStorage.getItem('groq_api_keys');
            if (storedKeys) {
                try {
                    const keys = JSON.parse(storedKeys);
                    if (keys.length > 0) apiKey = keys[Math.floor(Math.random() * keys.length)];
                } catch (e) { }
            }

            if (!apiKey) {
                updateSessionMessages(currentSessionId, [...updatedHistory, { role: 'assistant', content: "Please configure API Key in Settings first." }]);
                setIsChatting(false);
                return;
            }

            const context = {};
            const historyToSend = updatedHistory.slice(-10)
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            // We push text content in historyToSend, pass image separately

            const result = await window.electron.ipcRenderer.invoke('gridtrends:chat-discussion', {
                history: historyToSend,
                context,
                apiKey,
                image: imagePayload
            });

            updateSessionMessages(currentSessionId, [...updatedHistory, { role: 'assistant', content: result.content }]);

        } catch (error) {
            console.error("Chat Error:", error);
            updateSessionMessages(currentSessionId, [...updatedHistory, { role: 'assistant', content: "Maaf, terjadi kesalahan pada koneksi." }]);
        } finally {
            setIsChatting(false);
        }
    };

    return (
        <>
            {/* FLOATING BUTTON (Visible when chat closed) */}
            {!chatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 z-[100] group flex items-center justify-center p-4 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-xl border border-indigo-400/30 transition-all hover:scale-110 active:scale-95"
                    title="Open GridMentor AI"
                >
                    <Bot className="w-6 h-6 text-white" />
                    <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        GridMentor AI
                    </span>
                </button>
            )}

            {/* CHAT DRAWER */}
            <div className={cn(
                "fixed inset-y-0 right-0 z-[100] w-full sm:w-96 bg-[#0F172A] border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col font-sans",
                chatOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* HEADER */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                    <div className="flex items-center gap-3">
                        {showSidebar ? (
                            <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        ) : (
                            <button onClick={() => setShowSidebar(true)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <Menu className="w-5 h-5" />
                            </button>
                        )}

                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white max-w-[150px] truncate">{activeSession?.title || "GridMentor"}</h3>
                                <div className="text-[10px] text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Online
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden relative">

                    {/* SIDEBAR (Session List) */}
                    <div className={cn(
                        "absolute inset-0 bg-slate-900 z-10 transition-transform duration-300 flex flex-col border-r border-slate-800",
                        showSidebar ? "translate-x-0" : "-translate-x-full"
                    )}>
                        <div className="p-4">
                            <button
                                onClick={handleNewChat}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-bold transition-colors mb-4"
                            >
                                <Plus className="w-4 h-4" />
                                New Chat
                            </button>
                            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)]">
                                {sessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => handleSelectSession(session.id)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg cursor-pointer group transition-colors",
                                            activeSessionId === session.id ? "bg-slate-800 border border-slate-700" : "hover:bg-slate-800/50 border border-transparent"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <MessageSquare className={cn("w-4 h-4 shrink-0", activeSessionId === session.id ? "text-indigo-400" : "text-slate-500")} />
                                            <span className={cn("text-sm truncate", activeSessionId === session.id ? "text-white" : "text-slate-400")}>
                                                {session.title}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteSession(e, session.id)}
                                            className="p-1.5 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* MESSAGES AREA */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0F172A] w-full">
                        {chatHistory.filter(msg => msg.role !== 'system').length === 0 && (
                            <div className="flex flex-col items-center justify-center p-8 text-center h-full opacity-50">
                                <Bot className="w-12 h-12 text-slate-600 mb-4" />
                                <p className="text-slate-400 text-sm">Mulai percakapan baru dengan GridMentor.</p>
                            </div>
                        )}

                        {chatHistory.filter(msg => msg.role !== 'system').map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                    ? 'bg-indigo-600/20'
                                    : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
                                    }`}>
                                    {msg.role === 'user' ? <Bot className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                                    }`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="User upload" className="max-w-full rounded-lg mb-2 border border-white/10" />
                                    )}
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />

                        {/* Loading Indicator */}
                        {isChatting && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 rounded-bl-none">
                                    <span className="animate-pulse text-xs text-slate-400">Sedang mengetik...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* INPUT AREA */}
                <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 relative z-20">
                    {selectedImage && (
                        <div className="mb-2 relative inline-block group">
                            <img src={selectedImage.preview} alt="Upload" className="h-16 w-auto rounded-lg border border-slate-700 object-cover" />
                            <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="absolute -top-1.5 -right-1.5 bg-slate-900 text-slate-400 hover:text-white rounded-full p-0.5 border border-slate-600 shadow-lg"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2 items-end">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-700 shrink-0"
                            title="Attach Image"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>

                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder={selectedImage ? "Tambahkan pesan..." : "Tanya GridMentor..."}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={(!chatInput.trim() && !selectedImage) || isChatting}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

export default GridMentorChat;
