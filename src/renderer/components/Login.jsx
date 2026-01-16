import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff, Loader, Lock, User } from 'lucide-react';
import WindowControls from './WindowControls';
import logo from '../assets/gridverse.png';
import ColorBends from './ColorBends';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const supabaseUrl = 'https://wdvedlmnapxxfvpyfwqa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdmVkbG1uYXB4eGZ2cHlmd3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MjE5NzUsImV4cCI6MjA2MDM5Nzk3NX0.yLIbYKF1PfzEo3gMO0H8SgXN8AAPRYgDTJewg8nb7GA';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Login({ onLoginSuccess }) {
    const [sparkles, setSparkles] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    React.useEffect(() => {
        const newSparkles = [];
        for (let i = 0; i < 30; i++) {
            newSparkles.push({
                top: `${getRandomInt(0, 100)}%`,
                left: `${getRandomInt(0, 100)}%`,
                size: `${getRandomInt(2, 6)}px`,
                delay: `${Math.random() * 3}s`,
            });
        }
        setSparkles(newSparkles);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!username || !password) {
            setError('Please enter username and password.');
            setLoading(false);
            return;
        }

        const loginPromise = async () => {
            console.log('Login attempt starting:', { username });

            // 1. Get Device ID
            let deviceId = 'BROWSER_DEV_ID';
            try {
                if (window.electronAPI && window.electronAPI.getMacAddress) {
                    console.log('Fetching MAC address...');
                    deviceId = await window.electronAPI.getMacAddress();
                    console.log('MAC address fetched:', deviceId);
                } else if (window.api && window.api.getBiosSerial) {
                    console.log('Fetching Bios Serial...');
                    deviceId = await window.api.getBiosSerial();
                } else {
                    console.warn('No Electron API found for device ID, using fallback.');
                }
            } catch (err) {
                console.error('Error fetching device ID:', err);
                // Continue with fallback or rethrow? Let's continue but log it.
            }

            // 2. Query Supabase
            console.log('Querying Supabase...');
            const { data, error: dbError } = await supabase
                .from('users_gridverse')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (dbError) {
                console.error('Supabase error:', dbError);
                throw new Error('Database error: ' + dbError.message);
            }
            if (!data) {
                throw new Error('Invalid username or password.');
            }

            // 3. Check Device ID
            if (data.deviceId && data.deviceId !== deviceId) {
                throw new Error('This account is already registered to another device.');
            }

            // 4. Check Expiration
            if (data.expired) {
                const expiredDate = new Date(data.expired);
                const now = new Date();
                if (now > expiredDate) {
                    throw new Error('Your subscription has expired.');
                }
            }

            // 5. Register Device if new
            if (!data.deviceId) {
                console.log('Registering new device ID...');
                const { error: updateError } = await supabase
                    .from('users_gridverse')
                    .update({ deviceId: deviceId })
                    .eq('username', username);

                if (updateError) {
                    console.error('Update device ID error:', updateError);
                    throw new Error('Failed to register device.');
                }
            }

            // 6. Save Session
            const userSession = {
                username: data.username,
                expired: data.expired
            };

            try {
                localStorage.setItem('gridvidUser', JSON.stringify(userSession));
            } catch (storageErr) {
                console.error('LocalStorage error:', storageErr);
                // Likely the 'Database IO error' cause
                throw new Error('Local Storage failed. Please clear app data.');
            }

            return userSession;
        };

        try {
            // Race between login and timeout
            const userSession = await Promise.race([
                loginPromise(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Login timed out. Please check your connection or clear app data.')), 15000)
                )
            ]);

            onLoginSuccess(userSession);

        } catch (err) {
            console.error('Login final error:', err);
            setError(err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-black text-gray-200 px-4 overflow-hidden draggable-region">
            <ColorBends
                rotation={0}
                speed={0.25}
                colors={["#341aff", "#6f07c5", "#0dc52b", "#ff6600"]}
                transparent={false}
                autoRotate={0}
                scale={1.4}
                frequency={1}
                warpStrength={1}
                mouseInfluence={1.1}
                parallax={0.4}
                noise={0}
            />

            <div className="fixed top-4 right-4 z-50 h-10">
                <WindowControls />
            </div>

            <div className="relative z-10 bg-black/80 border border-white/10 rounded-3xl backdrop-blur-2xl p-10 max-w-md w-full shadow-2xl animate-fadeInUp no-drag">
                <div className="flex flex-col items-center mb-8 gap-3">
                    <div className="w-20 h-auto flex items-center justify-center p-2 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                        <img src={logo} alt="GridVerse Logo" className="w-full h-full object-contain drop-shadow-lg" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-wide mt-2">GRIDVERSE</h2>
                    <p className="text-gray-400 text-[11px] font-medium tracking-wider uppercase">Sign in to continue</p>
                </div>

                <form onSubmit={handleLogin} className="w-full space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-gray-400 ml-1">Username</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-sans"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[12px] font-medium text-gray-400">Password</label>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-sans"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg font-medium text-center shadow-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/40 transform hover:-translate-y-0.5 active:translate-y-0",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-4"
                        )}
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-spin" size={16} />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
