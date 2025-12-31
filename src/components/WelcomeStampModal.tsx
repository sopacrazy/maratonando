import React, { useEffect } from 'react';
import Confetti from 'react-confetti';

interface WelcomeStampModalProps {
    stamp: {
        name: string;
        image_url: string;
        description: string;
    };
    onClose: () => void;
}

const WelcomeStampModal: React.FC<WelcomeStampModalProps> = ({ stamp, onClose }) => {
    
    // Auto-close sound or something? No, let user click.

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-500">
             <Confetti 
                width={window.innerWidth} 
                height={window.innerHeight} 
                numberOfPieces={500}
                recycle={false}
                gravity={0.15}
            />
            
            <div className="bg-white dark:bg-[#1a1122] rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl animate-in zoom-in-50 duration-500 border border-white/10">
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointing-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400 mb-2 font-display">
                        PARABÉNS!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
                        Sua aventura acaba de começar.
                    </p>

                    <div className="relative mb-8 group">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <img 
                                src={stamp.image_url} 
                                alt={stamp.name} 
                                className="w-full h-full object-contain drop-shadow-2xl hover:scale-110 transition-transform duration-300"
                            />
                        </div>
                   
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">{stamp.name}</h3>
                    <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
                        Você desbloqueou seu primeiro selo de boas-vindas! Continue maratonando para colecionar mais.
                    </p>

                    <button 
                        onClick={onClose}
                        className="bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-10 rounded-2xl transition-all shadow-lg shadow-primary/30 active:scale-95 text-lg"
                    >
                        Coletar Recompensa
                    </button>
                    
                    <p className="mt-4 text-xs text-gray-500 uppercase tracking-widest font-bold">
                        Raridade: Comum
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomeStampModal;
