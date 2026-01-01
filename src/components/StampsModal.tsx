import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../App";
import { BadgeService } from "../services/badgeService";
import { Stamp } from "../types";

interface StampsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StampsModal: React.FC<StampsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useContext(AppContext);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      BadgeService.getUserBadges(user.id)
        .then((data) => {
          // data is Stamp[]
          setStamps(data || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1122] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <span className="material-symbols-outlined text-2xl">
                military_tech
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {showHelp ? "Guia de Selos" : "Meus Selos"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-text-secondary">
                {showHelp
                  ? "Entenda como colecionar"
                  : "Sua coleção de conquistas"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 h-[400px] overflow-y-auto">
          {showHelp ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
              {/* Introduction */}
              <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl border border-primary/10">
                <h4 className="font-bold text-lg text-primary mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined">verified</span>O
                  que são Selos?
                </h4>
                <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
                  Selos são conquistas digitais que marcam sua jornada. Alguns
                  são <strong>ilimitados</strong> (para todos que cumprirem a
                  meta), enquanto outros são{" "}
                  <strong>limitados e numerados</strong>, tornando-se raridades
                  na comunidade!
                </p>
              </div>

              {/* Rarities */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">
                  Níveis de Raridade
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Comum
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Fáceis de obter, início da jornada.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                    <span className="text-xs font-bold text-blue-500 uppercase">
                      Raro
                    </span>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400 mt-1">
                      Conquistas específicas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                    <span className="text-xs font-bold text-purple-500 uppercase">
                      Épico
                    </span>
                    <p className="text-xs text-purple-600/80 dark:text-purple-400 mt-1">
                      Desafios difíceis.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-100 dark:border-yellow-500/20">
                    <span className="text-xs font-bold text-yellow-600 uppercase">
                      Lendário
                    </span>
                    <p className="text-xs text-yellow-700/80 dark:text-yellow-400 mt-1">
                      Apenas para os melhores.
                    </p>
                  </div>
                </div>
              </div>

              {/* Marketplace Info */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-900 to-slate-800 text-white shadow-lg">
                <div className="size-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl text-yellow-400">
                    storefront
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-white">Mercado de Selos</h4>
                  <p className="text-xs text-gray-300 mt-1 mb-3">
                    Alguns selos são limitados! Se perder algum, em breve você
                    pode tentar comprar de outros usuários no Mercado.
                  </p>
                  <a
                    href="#/market"
                    onClick={onClose}
                    className="inline-block text-xs font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Ir para o Mercado
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 dark:text-text-secondary">
                  <span className="material-symbols-outlined animate-spin text-3xl">
                    progress_activity
                  </span>
                  <p>Carregando coleção...</p>
                </div>
              ) : stamps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-left-4 fade-in duration-300">
                  {stamps.map((stamp) => (
                    <div
                      key={stamp.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-primary/30 transition-colors group"
                    >
                      {/* Image or Icon */}
                      <div className="size-16 rounded-lg flex items-center justify-center shrink-0 bg-gray-200 dark:bg-white/10 overflow-hidden relative">
                        {stamp.image_url ? (
                          <img
                            src={stamp.image_url}
                            alt={stamp.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-gray-400">
                            military_tech
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 group-hover:text-primary transition-colors">
                          {stamp.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-text-secondary leading-relaxed line-clamp-2">
                          {stamp.description}
                        </p>
                        {stamp.series_title && (
                          <span className="inline-block mt-2 text-[10px] uppercase font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {stamp.series_title}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center animate-in zoom-in-95 duration-300">
                  <div className="size-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400">
                      sentiment_dissatisfied
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                      Nenhum selo ainda
                    </h4>
                    <p className="text-slate-500 dark:text-text-secondary max-w-xs mx-auto mt-1">
                      Complete ações na plataforma ou participe de desafios para
                      ganhar selos exclusivos!
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            {showHelp ? "Voltar para meus selos" : "Como funcionam os selos?"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default StampsModal;
