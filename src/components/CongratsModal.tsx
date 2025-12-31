import React, { useEffect } from 'react';
import { Stamp, TMDBSeries } from '../types';
import Confetti from 'react-confetti';
import { useNavigate } from 'react-router-dom';

interface CongratsModalProps {
    stamp: Stamp;
    onClose: () => void;
    onViewCollection: () => void;
}

const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
        case 'comum': return 'bg-gray-500 text-white';
        case 'raro': return 'bg-blue-500 text-white';
        case 'épico': return 'bg-purple-500 text-white';
        case 'lendário': return 'bg-yellow-500 text-black';
        default: return 'bg-gray-500 text-white';
    }
};

const CongratsModal: React.FC<CongratsModalProps> = ({ stamp, onClose, onViewCollection }) => {
    const navigate = useNavigate();
    // State for confetti size (screen size)
    const [windowSize, setWindowSize] = React.useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />

            <div className="bg-white dark:bg-[#1a1122] rounded-3xl p-8 max-w-md w-full text-center relative border border-purple-500/30 shadow-2xl shadow-purple-500/20 transform animate-in zoom-in-95 duration-300">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="mb-6 relative inline-block group">
                    <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-2xl animate-pulse group-hover:bg-purple-500/50 transition-all duration-500"></div>
                    <img
                        src={stamp.image_url}
                        alt={stamp.name}
                        className="w-48 h-48 object-contain relative z-10 drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Rarity Chip */}
                    {stamp.rarity && (
                        <div className={`
                            absolute -bottom-3 left-1/2 -translate-x-1/2 z-20
                            px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                            shadow-lg border border-white/10 backdrop-blur-md
                            ${getRarityColor(stamp.rarity)}
                        `}>
                            {stamp.rarity}
                        </div>
                    )}
                </div>

                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
                    Parabéns!
                </h2>

                <p className="text-slate-600 dark:text-gray-300 mb-6">
                    Você desbloqueou uma nova conquista!
                </p>

                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 mb-8">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-1">{stamp.name}</h3>
                    {stamp.series_title && (
                        <p className="text-sm text-purple-400 font-medium mb-2">
                            Série: {stamp.series_title}
                        </p>
                    )}
                    <p className="text-sm text-slate-500 dark:text-gray-400 italic">
                        "{stamp.description}"
                    </p>
                </div>

                <button
                    onClick={onViewCollection}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold text-lg hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-purple-500/25"
                >
                    Ver na Minha Coleção
                </button>

            </div>
        </div>
    );
};

export default CongratsModal;
