import React from 'react';
import { X, Globe, Video, Images, Text, PenTool, Tag } from 'lucide-react';

const ICONS = {
    launcher: Globe,
    gridvid: Video,
    gridbot: Images,
    gridprompt: Text,
    gridmeta: Tag,
    gridvector: PenTool,
};

const COLORS = {
    launcher: 'text-gray-400',
    gridvid: 'text-blue-400',
    gridbot: 'text-purple-400',
    gridprompt: 'text-green-400',
    gridmeta: 'text-red-400',
    gridvector: 'text-orange-400',
};

const Tab = ({ id, title, type, isActive, onClick, onClose }) => {
    const Icon = ICONS[type] || Globe;
    const colorClass = COLORS[type] || 'text-gray-400';

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] 
                cursor-pointer select-none transition-all duration-200 border-r border-white/5
                ${isActive
                    ? 'bg-[#1a1a1a] text-white font-medium'
                    : 'bg-black/40 text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }
            `}
            style={{ WebkitAppRegion: 'no-drag' }}
        >
            {/* Active Indicator Line */}
            {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_2px_10px_rgba(168,85,247,0.5)]" />
            )}

            <Icon className={`w-3.5 h-3.5 ${isActive ? colorClass : 'text-gray-500 group-hover:text-gray-400'}`} />

            <span className="text-xs truncate flex-1">{title}</span>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(id);
                }}
                className={`
                    p-0.5 rounded-md opacity-0 group-hover:opacity-100 
                    hover:bg-white/10 hover:text-red-400 transition-all
                    ${isActive ? 'opacity-100' : ''}
                `}
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
};

export default Tab;
