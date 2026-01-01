import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { BattleService } from '../services/battleService';
import { useError } from '../context/ErrorContext';

export interface OpinionBattle {
  id: string;
  creator: {
    id: string;
    name: string;
    avatar: string;
    handle: string;
  };
  topic: string;
  description: string;
  seriesTitle?: string;
  seriesImage?: string;
  endsAt: string; // ISO date string
  agreeComments: BattleComment[];
  disagreeComments: BattleComment[];
  winner?: 'agree' | 'disagree' | null;
  winnerComment?: BattleComment;
  status: 'active' | 'ended';
  isPublic?: boolean; // Se a batalha é pública ou somente para seguidores
}

export interface BattleComment {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    handle: string;
  };
  content: string;
  likes: number;
  createdAt: string;
  userHasLiked?: boolean; // Se o usuário atual curtiu este comentário
}

interface OpinionBattleCardProps {
  battle: OpinionBattle;
  onDefend?: (battleId: string) => void;
  onAttack?: (battleId: string) => void;
  onCommentAdded?: () => void; // Callback para recarregar batalhas após adicionar comentário
}

const OpinionBattleCard: React.FC<OpinionBattleCardProps> = ({ battle, onDefend, onAttack, onCommentAdded }) => {
  const { user } = useContext(AppContext);
  const { showError } = useError();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showDefendInput, setShowDefendInput] = useState(false);
  const [showAttackInput, setShowAttackInput] = useState(false);
  const [defendText, setDefendText] = useState('');
  const [attackText, setAttackText] = useState('');
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null); // Estado de loading para curtir
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null); // Estado de loading para deletar
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{commentId: string, commentContent: string} | null>(null);
  const [showDeleteBattleConfirm, setShowDeleteBattleConfirm] = useState<boolean>(false); // Modal de confirmação para deletar batalha
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null); // Menu de 3 pontos aberto
  const [activeBattleMenu, setActiveBattleMenu] = useState<boolean>(false); // Menu de 3 pontos da batalha

  useEffect(() => {
    const calculateTimeRemaining = async () => {
      if (battle.status === 'ended') {
        setTimeRemaining('Finalizada');
        return;
      }

      const now = new Date().getTime();
      const endsAt = new Date(battle.endsAt).getTime();
      const difference = endsAt - now;

      if (difference <= 0) {
        // Batalha expirou, finalizar automaticamente
        if (battle.status === 'active') {
          try {
            await BattleService.endBattleAutomatically(battle.id);
            // Aguardar um pouco antes de recarregar para garantir que o banco foi atualizado
            await new Promise(resolve => setTimeout(resolve, 500));
            onCommentAdded?.(); // Recarregar batalhas
          } catch (error: any) {
            console.error("Erro ao finalizar batalha automaticamente:", error);
            // Mesmo com erro, marcar como finalizada no frontend
            setTimeRemaining('Finalizada');
          }
        } else {
          setTimeRemaining('Finalizada');
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [battle.endsAt, battle.status, battle.id, onCommentAdded]);

  // Ordenar comentários por likes (mais curtidos primeiro)
  // Para os cards principais: apenas comentários com curtidas > 0
  // Para a lista expandida: todos os comentários ordenados por curtidas
  const allAgreeComments = [...battle.agreeComments].sort((a, b) => b.likes - a.likes);
  const allDisagreeComments = [...battle.disagreeComments].sort((a, b) => b.likes - a.likes);
  
  // Comentários com curtidas para os cards principais
  const sortedAgreeComments = allAgreeComments.filter(c => c.likes > 0);
  const sortedDisagreeComments = allDisagreeComments.filter(c => c.likes > 0);

  // Melhor comentário é o mais curtido (só aparece se tiver curtidas > 0)
  const bestAgreeComment = sortedAgreeComments.length > 0 ? sortedAgreeComments[0] : null;
  const bestDisagreeComment = sortedDisagreeComments.length > 0 ? sortedDisagreeComments[0] : null;

  const [showAllComments, setShowAllComments] = useState(false);

  const handleSubmitDefend = async () => {
    if (!defendText.trim()) return;
    if (!user?.id) {
      showError("Você precisa estar logado para comentar.", "error");
      return;
    }

    try {
      await BattleService.addComment(battle.id, user.id, 'agree', defendText);
      setDefendText('');
      setShowDefendInput(false);
      onCommentAdded?.(); // Recarregar batalhas
      showError("Argumento de defesa enviado com sucesso!", "success");
    } catch (error: any) {
      console.error("Erro ao enviar comentário:", error);
      showError(error?.message || "Erro ao enviar argumento. Tente novamente.", "error");
    }
  };

  const handleSubmitAttack = async () => {
    if (!attackText.trim()) return;
    if (!user?.id) {
      showError("Você precisa estar logado para comentar.", "error");
      return;
    }

    try {
      await BattleService.addComment(battle.id, user.id, 'disagree', attackText);
      setAttackText('');
      setShowAttackInput(false);
      onCommentAdded?.(); // Recarregar batalhas
      showError("Argumento de ataque enviado com sucesso!", "success");
    } catch (error: any) {
      console.error("Erro ao enviar comentário:", error);
      showError(error?.message || "Erro ao enviar argumento. Tente novamente.", "error");
    }
  };

  return (
    <article className="relative bg-white dark:bg-surface-dark rounded-xl overflow-hidden border-2 border-amber-400 dark:border-amber-500 shadow-xl hover:shadow-2xl transition-all duration-300 mb-6">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-amber-400/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      {/* Winner Badge */}
      {battle.status === 'ended' && (
        <div className="absolute top-4 right-4 z-10">
          {battle.winner ? (
            <div className={`bg-gradient-to-r text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse ${
              battle.winner === 'agree' 
                ? 'from-green-400 to-emerald-500' 
                : 'from-red-400 to-rose-500'
            }`}>
              <span className="material-symbols-outlined text-lg">emoji_events</span>
              <span className="text-xs font-black uppercase tracking-wider">
                {battle.winner === 'agree' ? 'Defesa Venceu!' : 'Ataque Venceu!'}
              </span>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-400 to-slate-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">balance</span>
              <span className="text-xs font-black uppercase tracking-wider">Empate</span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to={`/user/${battle.creator.id}`}>
              <div
                className="size-8 rounded-full bg-cover bg-center ring-1 ring-amber-400 dark:ring-amber-500"
                style={{ backgroundImage: `url('${battle.creator.avatar}')` }}
              ></div>
            </Link>
            <div>
              <Link to={`/user/${battle.creator.id}`} className="block">
                <span className="font-semibold text-sm text-slate-900 dark:text-white hover:text-primary transition-colors">
                  {battle.creator.name}
                </span>
              </Link>
              <span className="text-[10px] text-slate-500 dark:text-text-secondary">
                Criou uma Batalha
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Timer */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-surface-dark px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 shadow-sm">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xs">schedule</span>
              <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                {battle.status === 'ended' ? 'Finalizada' : timeRemaining}
              </span>
            </div>
            
            {/* Menu de 3 pontos para excluir batalha (apenas criador) */}
            {user?.id === battle.creator.id && (
              <div className="relative">
                <button
                  onClick={() => setActiveBattleMenu(!activeBattleMenu)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                >
                  <span className="material-symbols-outlined text-sm">more_vert</span>
                </button>
                {activeBattleMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setActiveBattleMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-6 bg-white dark:bg-surface-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 min-w-[120px]">
                      <button
                        onClick={async () => {
                          setActiveBattleMenu(false);
                          setShowDeleteBattleConfirm(true);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Excluir Batalha
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topic Section */}
      <div className="p-4 bg-white dark:bg-surface-dark">
        {battle.seriesTitle && (
          <div className="flex items-center gap-2 mb-3">
            {battle.seriesImage && (
              <img 
                src={battle.seriesImage} 
                alt={battle.seriesTitle}
                className="w-8 h-12 rounded object-cover"
              />
            )}
            <span className="text-sm text-slate-500 dark:text-text-secondary font-medium">
              {battle.seriesTitle}
            </span>
          </div>
        )}
        
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
          {battle.topic}
        </h3>
        {battle.description && (
          <p className="text-slate-600 dark:text-text-secondary text-xs leading-relaxed">
            {battle.description}
          </p>
        )}
      </div>

      {/* Battle Arena - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-surface-dark">
        {/* Left Column - Agree/Defend */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-base">thumb_up</span>
            </div>
            <h4 className="font-bold text-green-700 dark:text-green-400 text-base">Concordam</h4>
            <span className="text-xs text-slate-500 dark:text-text-secondary">
              ({battle.agreeComments.length})
            </span>
          </div>

          {bestAgreeComment ? (
            <div className={`relative bg-white dark:bg-surface-dark rounded-lg p-3 border transition-all ${
              battle.winner === 'agree' 
                ? 'border-green-500 ring-2 ring-green-500/30' 
                : 'border-green-200 dark:border-green-800'
            }`}>
              {battle.winner === 'agree' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-0.5 rounded-full shadow-md z-10">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">star</span>
                    Melhor
                  </span>
                </div>
              )}
              
              <div className="flex items-start gap-2 mb-2">
                <div
                  className="size-7 rounded-full bg-cover bg-center shrink-0 ring-1 ring-green-200 dark:ring-green-800"
                  style={{ backgroundImage: `url('${bestAgreeComment.user.avatar}')` }}
                ></div>
                <div className="flex-1 min-w-0">
                  <Link to={`/user/${bestAgreeComment.user.id}`}>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">
                      {bestAgreeComment.user.name}
                    </span>
                  </Link>
                  <p className="text-xs text-slate-700 dark:text-text-secondary mt-1 leading-relaxed line-clamp-3">
                    {bestAgreeComment.content}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-100 dark:border-green-900/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!user?.id || likingCommentId) return;
                      if (!user?.id) {
                        showError("Você precisa estar logado para curtir.", "error");
                        return;
                      }
                      setLikingCommentId(bestAgreeComment.id);
                      try {
                        await BattleService.toggleLikeComment(bestAgreeComment.id, user.id);
                        await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para garantir que o estado atualize
                        onCommentAdded?.(); // Recarregar para atualizar curtidas
                        // Aguardar um pouco mais para garantir que o estado foi atualizado
                        await new Promise(resolve => setTimeout(resolve, 200));
                      } catch (error: any) {
                        showError(error?.message || "Erro ao curtir comentário.", "error");
                      } finally {
                        setLikingCommentId(null);
                      }
                    }}
                    disabled={likingCommentId === bestAgreeComment.id}
                    className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {likingCommentId === bestAgreeComment.id ? (
                      <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                    ) : (
                      <span className={`material-symbols-outlined text-xs ${bestAgreeComment.userHasLiked ? 'fill' : ''}`}>
                        favorite
                      </span>
                    )}
                    <span className="text-[10px] font-bold">{bestAgreeComment.likes}</span>
                  </button>
                  {user?.id === bestAgreeComment.user.id && battle.status === 'active' && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === bestAgreeComment.id ? null : bestAgreeComment.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                      >
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                      {activeMenuId === bestAgreeComment.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          ></div>
                          <div className="absolute right-0 top-6 bg-white dark:bg-surface-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 min-w-[120px]">
                            <button
                              onClick={async () => {
                                setActiveMenuId(null);
                                setShowDeleteConfirm({ commentId: bestAgreeComment.id, commentContent: bestAgreeComment.content });
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-lg"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-text-secondary">
                  {new Date(bestAgreeComment.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-dark rounded-lg p-6 border-2 border-dashed border-green-200 dark:border-green-800 text-center">
              <span className="material-symbols-outlined text-green-300 dark:text-green-700 text-3xl mb-1 block">chat_bubble_outline</span>
              <p className="text-xs text-slate-400 dark:text-text-secondary">Nenhum argumento ainda</p>
            </div>
          )}
        </div>

        {/* Right Column - Disagree/Attack */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-base">thumb_down</span>
            </div>
            <h4 className="font-bold text-red-700 dark:text-red-400 text-base">Discordam</h4>
            <span className="text-xs text-slate-500 dark:text-text-secondary">
              ({battle.disagreeComments.length})
            </span>
          </div>

          {bestDisagreeComment ? (
            <div className={`relative bg-white dark:bg-surface-dark rounded-lg p-3 border transition-all ${
              battle.winner === 'disagree' 
                ? 'border-red-500 ring-2 ring-red-500/30' 
                : 'border-red-200 dark:border-red-800'
            }`}>
              {battle.winner === 'disagree' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-2 py-0.5 rounded-full shadow-md z-10">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">star</span>
                    Melhor
                  </span>
                </div>
              )}
              
              <div className="flex items-start gap-2 mb-2">
                <div
                  className="size-7 rounded-full bg-cover bg-center shrink-0 ring-1 ring-red-200 dark:ring-red-800"
                  style={{ backgroundImage: `url('${bestDisagreeComment.user.avatar}')` }}
                ></div>
                <div className="flex-1 min-w-0">
                  <Link to={`/user/${bestDisagreeComment.user.id}`}>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      {bestDisagreeComment.user.name}
                    </span>
                  </Link>
                  <p className="text-xs text-slate-700 dark:text-text-secondary mt-1 leading-relaxed line-clamp-3">
                    {bestDisagreeComment.content}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-red-100 dark:border-red-900/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (!user?.id || likingCommentId) return;
                      if (!user?.id) {
                        showError("Você precisa estar logado para curtir.", "error");
                        return;
                      }
                      setLikingCommentId(bestDisagreeComment.id);
                      try {
                        await BattleService.toggleLikeComment(bestDisagreeComment.id, user.id);
                        await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para garantir que o estado atualize
                        onCommentAdded?.(); // Recarregar para atualizar curtidas
                        // Aguardar um pouco mais para garantir que o estado foi atualizado
                        await new Promise(resolve => setTimeout(resolve, 200));
                      } catch (error: any) {
                        showError(error?.message || "Erro ao curtir comentário.", "error");
                      } finally {
                        setLikingCommentId(null);
                      }
                    }}
                    disabled={likingCommentId === bestDisagreeComment.id}
                    className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {likingCommentId === bestDisagreeComment.id ? (
                      <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                    ) : (
                      <span className={`material-symbols-outlined text-xs ${bestDisagreeComment.userHasLiked ? 'fill' : ''}`}>
                        favorite
                      </span>
                    )}
                    <span className="text-[10px] font-bold">{bestDisagreeComment.likes}</span>
                  </button>
                  {user?.id === bestDisagreeComment.user.id && battle.status === 'active' && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === bestDisagreeComment.id ? null : bestDisagreeComment.id)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                      >
                        <span className="material-symbols-outlined text-sm">more_vert</span>
                      </button>
                      {activeMenuId === bestDisagreeComment.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuId(null)}
                          ></div>
                          <div className="absolute right-0 top-6 bg-white dark:bg-surface-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 min-w-[120px]">
                            <button
                              onClick={async () => {
                                setActiveMenuId(null);
                                setShowDeleteConfirm({ commentId: bestDisagreeComment.id, commentContent: bestDisagreeComment.content });
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-lg"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-text-secondary">
                  {new Date(bestDisagreeComment.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-dark rounded-lg p-6 border-2 border-dashed border-red-200 dark:border-red-800 text-center">
              <span className="material-symbols-outlined text-red-300 dark:text-red-700 text-3xl mb-1 block">chat_bubble_outline</span>
              <p className="text-xs text-slate-400 dark:text-text-secondary">Nenhum argumento ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* All Comments Section */}
      <div className="border-t border-amber-200 dark:border-amber-800 bg-white dark:bg-surface-dark">
        <button
          onClick={() => setShowAllComments(!showAllComments)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          <span className="font-semibold text-sm text-slate-900 dark:text-white">
            Ver todos os argumentos ({battle.agreeComments.length + battle.disagreeComments.length})
          </span>
          <span className={`material-symbols-outlined text-slate-500 dark:text-text-secondary text-sm transition-transform ${showAllComments ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {showAllComments && (
          <div className="px-4 pb-4 space-y-3 max-h-[500px] overflow-y-auto">
            {/* Agree Comments List */}
            {allAgreeComments.length > 0 && (
              <div className="space-y-3">
                <h5 className="flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 mb-2">
                  <span className="material-symbols-outlined text-sm">thumb_up</span>
                  Argumentos de Defesa ({allAgreeComments.length})
                </h5>
                {allAgreeComments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`bg-white dark:bg-surface-dark rounded-lg p-3 border transition-all ${
                      index === 0 && comment.id === bestAgreeComment?.id
                        ? 'border-green-400 dark:border-green-600 bg-green-50/30 dark:bg-green-900/10'
                        : 'border-green-200 dark:border-green-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="size-8 rounded-full bg-cover bg-center shrink-0 ring-1 ring-green-200 dark:ring-green-800"
                        style={{ backgroundImage: `url('${comment.user.avatar}')` }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Link to={`/user/${comment.user.id}`}>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors">
                              {comment.user.name}
                            </span>
                          </Link>
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[9px] font-bold rounded-full">
                            CONCORDA
                          </span>
                          {index === 0 && comment.id === bestAgreeComment?.id && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">star</span>
                              Mais Curtido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-text-secondary leading-relaxed mb-1.5">
                          {comment.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!user?.id || likingCommentId) return;
                                setLikingCommentId(comment.id);
                                try {
                                  await BattleService.toggleLikeComment(comment.id, user.id);
                                  await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para garantir que o estado atualize
                                  onCommentAdded?.(); // Recarregar para atualizar curtidas
                                  // Aguardar um pouco mais para garantir que o estado foi atualizado
                                  await new Promise(resolve => setTimeout(resolve, 200));
                                } catch (error: any) {
                                  showError(error?.message || "Erro ao curtir comentário.", "error");
                                } finally {
                                  setLikingCommentId(null);
                                }
                              }}
                              disabled={likingCommentId === comment.id}
                              className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {likingCommentId === comment.id ? (
                                <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                              ) : (
                                <span className={`material-symbols-outlined text-xs ${comment.userHasLiked ? 'fill' : ''}`}>
                                  favorite
                                </span>
                              )}
                              <span className="text-[10px] font-bold">{comment.likes}</span>
                            </button>
                            {user?.id === comment.user.id && battle.status === 'active' && (
                              <div className="relative">
                                <button
                                  onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                                >
                                  <span className="material-symbols-outlined text-sm">more_vert</span>
                                </button>
                                {activeMenuId === comment.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setActiveMenuId(null)}
                                    ></div>
                                    <div className="absolute right-0 top-6 bg-white dark:bg-surface-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 min-w-[120px]">
                                      <button
                                        onClick={async () => {
                                          setActiveMenuId(null);
                                          setShowDeleteConfirm({ commentId: comment.id, commentContent: comment.content });
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-lg"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        Excluir
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-text-secondary">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Disagree Comments List */}
            {allDisagreeComments.length > 0 && (
              <div className="space-y-3 mt-6">
                <h5 className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 mb-2">
                  <span className="material-symbols-outlined text-sm">thumb_down</span>
                  Argumentos de Ataque ({allDisagreeComments.length})
                </h5>
                {allDisagreeComments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`bg-white dark:bg-surface-dark rounded-lg p-3 border transition-all ${
                      index === 0 && comment.id === bestDisagreeComment?.id
                        ? 'border-red-400 dark:border-red-600 bg-red-50/30 dark:bg-red-900/10'
                        : 'border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="size-8 rounded-full bg-cover bg-center shrink-0 ring-1 ring-red-200 dark:ring-red-800"
                        style={{ backgroundImage: `url('${comment.user.avatar}')` }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <Link to={`/user/${comment.user.id}`}>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">
                              {comment.user.name}
                            </span>
                          </Link>
                          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-[9px] font-bold rounded-full">
                            DISCORDA
                          </span>
                          {index === 0 && comment.id === bestDisagreeComment?.id && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded-full flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">star</span>
                              Mais Curtido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-text-secondary leading-relaxed mb-1.5">
                          {comment.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (!user?.id || likingCommentId) return;
                                setLikingCommentId(comment.id);
                                try {
                                  await BattleService.toggleLikeComment(comment.id, user.id);
                                  await new Promise(resolve => setTimeout(resolve, 300)); // Pequeno delay para garantir que o estado atualize
                                  onCommentAdded?.(); // Recarregar para atualizar curtidas
                                  // Aguardar um pouco mais para garantir que o estado foi atualizado
                                  await new Promise(resolve => setTimeout(resolve, 200));
                                } catch (error: any) {
                                  showError(error?.message || "Erro ao curtir comentário.", "error");
                                } finally {
                                  setLikingCommentId(null);
                                }
                              }}
                              disabled={likingCommentId === comment.id}
                              className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {likingCommentId === comment.id ? (
                                <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                              ) : (
                                <span className={`material-symbols-outlined text-xs ${comment.userHasLiked ? 'fill' : ''}`}>
                                  favorite
                                </span>
                              )}
                              <span className="text-[10px] font-bold">{comment.likes}</span>
                            </button>
                            {user?.id === comment.user.id && battle.status === 'active' && (
                              <div className="relative">
                                <button
                                  onClick={() => setActiveMenuId(activeMenuId === comment.id ? null : comment.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                                >
                                  <span className="material-symbols-outlined text-sm">more_vert</span>
                                </button>
                                {activeMenuId === comment.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-10" 
                                      onClick={() => setActiveMenuId(null)}
                                    ></div>
                                    <div className="absolute right-0 top-6 bg-white dark:bg-surface-dark rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 min-w-[120px]">
                                      <button
                                        onClick={async () => {
                                          setActiveMenuId(null);
                                          setShowDeleteConfirm({ commentId: comment.id, commentContent: comment.content });
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-lg"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        Excluir
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-text-secondary">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(allAgreeComments.length === 0 && allDisagreeComments.length === 0) && (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-text-secondary mb-2">chat_bubble_outline</span>
                <p className="text-sm text-slate-500 dark:text-text-secondary">Nenhum argumento ainda. Seja o primeiro a participar!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-gradient-to-b from-white to-slate-50 dark:from-surface-dark dark:to-slate-900/50 border-t border-amber-200 dark:border-amber-800">
        {!showDefendInput && !showAttackInput ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowDefendInput(true);
                onDefend?.(battle.id);
              }}
              disabled={battle.status === 'ended'}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined text-lg">thumb_up</span>
              <span>Defender</span>
            </button>
            
            <button
              onClick={() => {
                setShowAttackInput(true);
                onAttack?.(battle.id);
              }}
              disabled={battle.status === 'ended'}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined text-lg">thumb_down</span>
              <span>Atacar</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {showDefendInput && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">thumb_up</span>
                  <label className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Seu Argumento de Defesa
                  </label>
                </div>
                <textarea
                  value={defendText}
                  onChange={(e) => setDefendText(e.target.value)}
                  placeholder="Escreva seu argumento defendendo esta opinião..."
                  className="w-full px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none min-h-[80px] text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitDefend}
                    disabled={!defendText.trim()}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => {
                      setShowDefendInput(false);
                      setDefendText('');
                    }}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-semibold text-sm rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {showAttackInput && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">thumb_down</span>
                  <label className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Seu Argumento de Ataque
                  </label>
                </div>
                <textarea
                  value={attackText}
                  onChange={(e) => setAttackText(e.target.value)}
                  placeholder="Escreva seu argumento atacando esta opinião..."
                  className="w-full px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none min-h-[80px] text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitAttack}
                    disabled={!attackText.trim()}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Enviar
                  </button>
                  <button
                    onClick={() => {
                      setShowAttackInput(false);
                      setAttackText('');
                    }}
                    className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-semibold text-sm rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão de Batalha */}
      {showDeleteBattleConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1a1122] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">delete_forever</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Batalha?</h3>
              <p className="text-sm text-slate-600 dark:text-text-secondary mb-4">
                Esta ação não pode ser desfeita. A batalha e todos os seus argumentos serão permanentemente removidos.
              </p>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 w-full text-left">
                <p className="text-xs text-slate-500 dark:text-text-secondary mb-1">Batalha:</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-text-secondary">
                  {battle.topic}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteBattleConfirm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-text-secondary font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!user?.id || deletingCommentId) return;
                  setDeletingCommentId(battle.id);
                  try {
                    await BattleService.deleteBattle(battle.id, user.id);
                    setShowDeleteBattleConfirm(false);
                    onCommentAdded?.(); // Recarregar batalhas
                    showError("Batalha excluída com sucesso!", "success");
                  } catch (error: any) {
                    showError(error?.message || "Erro ao excluir batalha.", "error");
                  } finally {
                    setDeletingCommentId(null);
                  }
                }}
                disabled={deletingCommentId === battle.id}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingCommentId === battle.id ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Excluir Batalha
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Comentário */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1a1122] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="size-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">delete_forever</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Argumento?</h3>
              <p className="text-sm text-slate-600 dark:text-text-secondary mb-4">
                Esta ação não pode ser desfeita. O argumento será permanentemente removido.
              </p>
              <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-3 w-full text-left">
                <p className="text-xs text-slate-500 dark:text-text-secondary mb-1">Argumento:</p>
                <p className="text-sm text-slate-700 dark:text-text-secondary line-clamp-3">
                  {showDeleteConfirm.commentContent}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-text-secondary font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!user?.id || deletingCommentId) return;
                  setDeletingCommentId(showDeleteConfirm.commentId);
                  try {
                    await BattleService.deleteComment(showDeleteConfirm.commentId, user.id);
                    setShowDeleteConfirm(null);
                    onCommentAdded?.(); // Recarregar batalhas
                    showError("Argumento excluído com sucesso!", "success");
                  } catch (error: any) {
                    showError(error?.message || "Erro ao excluir argumento.", "error");
                  } finally {
                    setDeletingCommentId(null);
                  }
                }}
                disabled={deletingCommentId === showDeleteConfirm.commentId}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingCommentId === showDeleteConfirm.commentId ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default OpinionBattleCard;

