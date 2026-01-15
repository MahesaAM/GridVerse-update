import React from 'react';
import { Save, Database, Globe, Shield } from 'lucide-react';

const Settings = () => {
    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Konfigurasi Sistem</h2>

            <div className="space-y-6">
                {/* Data Sources */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-cyan-400" />
                        Sumber Data
                    </h3>
                    <div className="space-y-4">
                        {['Adobe Stock', 'Shutterstock', 'iStock', 'Envato Elements'].map((source) => (
                            <div key={source} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-slate-800">
                                <span className="text-slate-300 text-sm">{source}</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* API Keys */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-cyan-400" />
                        API Keys & External Signals
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">OpenAI API Key (untuk Analisis)</label>
                            <input type="password" placeholder="sk-..." className="w-full bg-[#0F172A] border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Google Trends Region</label>
                            <select className="w-full bg-[#0F172A] border border-slate-800 rounded-lg px-4 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none transition-colors">
                                <option>Worldwide</option>
                                <option>United States</option>
                                <option>Indonesia</option>
                                <option>Europe</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg">
                    <Save className="w-4 h-4" />
                    Simpan Konfigurasi
                </button>
            </div>
        </div>
    );
};

export default Settings;
