import React from 'react';

interface BattleTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartCreating: () => void;
}

const BattleTutorialModal: React.FC<BattleTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartCreating,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1122] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <span className="material-symbols-outlined text-2xl">
                swords
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Guia de Batalhas
              </h3>
              <p className="text-sm text-slate-500 dark:text-text-secondary">
                Entenda como funcionam as Batalhas de Opiniões
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
        <div className="p-6 h-[500px] overflow-y-auto">
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            {/* Introduction */}
            <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-100 dark:border-amber-500/20">
              <h4 className="font-bold text-lg text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">swords</span>
                O que são Batalhas de Opiniões?
              </h4>
              <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
                Batalhas de Opiniões são debates gamificados sobre séries onde você pode
                <strong> defender</strong> ou <strong>atacar</strong> uma opinião. Os melhores argumentos
                ganham curtidas e, ao final, o criador escolhe o vencedor!
              </p>
            </div>

            {/* How it works */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">info</span>
                Como Funciona?
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <div className="size-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">thumb_up</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      Defender (Concordar)
                    </p>
                    <p className="text-xs text-slate-600 dark:text-gray-300">
                      Escreva argumentos defendendo a opinião proposta. Quanto mais curtidas, melhor!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <div className="size-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">thumb_down</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      Atacar (Discordar)
                    </p>
                    <p className="text-xs text-slate-600 dark:text-gray-300">
                      Escreva argumentos contra a opinião. Mostre seu ponto de vista!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <div className="size-8 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-sm">star</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                      Melhor Argumento
                    </p>
                    <p className="text-xs text-slate-600 dark:text-gray-300">
                      O comentário mais curtido de cada lado aparece em destaque. Ao final, o criador escolhe o vencedor!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Points and Ranking */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg">
              <div className="size-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl text-white">
                  emoji_events
                </span>
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">Ganhe Pontos para o Ranking!</h4>
                <p className="text-xs text-amber-100 leading-relaxed">
                  Ao vencer uma batalha, você ganha pontos que contam para o <strong>Ranking de Crítico</strong>!
                  Quanto mais batalhas você vencer, maior será sua posição no ranking. Mostre que você tem os melhores argumentos!
                </p>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">lightbulb</span>
                Dicas para Vencer
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">check_circle</span>
                  <span>Seja claro e objetivo nos seus argumentos</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">check_circle</span>
                  <span>Use exemplos específicos da série para fortalecer seu ponto</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">check_circle</span>
                  <span>Respeite as opiniões dos outros participantes</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-base">check_circle</span>
                  <span>Curta os melhores argumentos para destacá-los</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onClose();
              onStartCreating();
            }}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg text-sm transition-colors shadow-md hover:shadow-lg"
          >
            Criar Minha Batalha
          </button>
        </div>
      </div>
    </div>
  );
};

export default BattleTutorialModal;

