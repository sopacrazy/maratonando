import React from 'react';
import { Stamp } from '../types';

interface StampDetailsModalProps {
    stamp: Stamp;
    onClose: () => void;
}

const StampDetailsModal: React.FC<StampDetailsModalProps> = ({ stamp, onClose }) => {
    
    // Helper colors for rarity
    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'Comum': return 'text-slate-600 bg-slate-200 dark:bg-slate-700 dark:text-slate-300';
            case 'Raro': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200';
            case 'Épico': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200';
            case 'Lendário': return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-200';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div 
                className="bg-white dark:bg-surface-dark rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Glow Effect based on Rarity? maybe later. For now generic subtle glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                    
                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                         <span className="material-symbols-outlined">close</span>
                    </button>

                    <div className="relative w-40 h-40 flex items-center justify-center mb-6 mt-4">
                        <img 
                            src={stamp.image_url} 
                            alt={stamp.name} 
                            className="w-full h-full object-contain drop-shadow-2xl hover:scale-110 transition-transform duration-300"
                        />
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{stamp.name}</h3>
                    
                    <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 shadow-sm ${getRarityColor(stamp.rarity)}`}>
                        RARIDADE: {stamp.rarity || 'COMUM'}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                        {stamp.description || "Sem descrição."}
                    </p>

                    {/* Meta info if available? e.g. date earned? Not in Stamp type currently, would need UserStamp logic */}
                </div>
            </div>
        </div>
    );
};

export default StampDetailsModal;
