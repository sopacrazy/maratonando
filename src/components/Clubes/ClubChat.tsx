import React, { useState, useEffect, useRef, useContext } from "react";
import { ClubService, ClubMessage, ClubMember } from "../../services/clubService";
import { AppContext } from "../../App";
import { useError } from "../../context/ErrorContext";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

interface ClubChatProps {
  clubId: string;
  members: ClubMember[];
}

const ClubChat: React.FC<ClubChatProps> = ({ clubId, members }) => {
  const { user } = useContext(AppContext);
  const { showError } = useError();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true); // Status online/offline manual
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    setupRealtime();

    // Atualizar last_seen ao entrar no chat
    ClubService.updateLastSeen(clubId);

    return () => {
      const channel = supabase.channel(`club:${clubId}`);
      channel.unsubscribe();
    };
  }, [clubId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const messagesData = await ClubService.getClubMessages(clubId, 100);
      setMessages(messagesData);
    } catch (error: any) {
      showError(error.message || "Erro ao carregar mensagens", "error");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel(`club:${clubId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "club_messages",
          filter: `club_id=eq.${clubId}`,
        },
        async (payload) => {
          // Buscar dados completos da mensagem
          const { data: message } = await supabase
            .from("club_messages")
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (message) {
            // Buscar dados do usuário
            const { data: user } = await supabase
              .from("profiles")
              .select("id, name, handle, avatar")
              .eq("id", message.user_id)
              .single();

            const fullMessage = {
              ...message,
              user: user || undefined
            };

            setMessages((prev) => [...prev, fullMessage]);
            ClubService.updateLastSeen(clubId);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const message = await ClubService.sendClubMessage(clubId, newMessage);
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    } catch (error: any) {
      showError(error.message || "Erro ao enviar mensagem", "error");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}min atrás`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h atrás`;
    return date.toLocaleDateString();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Chat */}
      <div className="lg:col-span-3 flex flex-col bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Chat do Clube
          </h3>
          {/* Toggle Status Online/Offline */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              isOnline
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            <div
              className={`size-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-gray-400"
              }`}
            ></div>
            <span>{isOnline ? "Online" : "Offline"}</span>
          </button>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]"
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-primary animate-spin">
                  progress_activity
                </span>
                <p className="mt-4 text-slate-600 dark:text-text-secondary font-medium">
                  Carregando mensagens...
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50">
                chat_bubble_outline
              </span>
              <p>Nenhuma mensagem ainda. Seja o primeiro a falar!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.user_id === user?.id;
              // Buscar o membro que enviou a mensagem para obter o cargo
              const messageMember = members.find(m => m.user_id === message.user_id);
              const memberRole = messageMember?.role || 'member';
              
              // Função para obter o texto do cargo
              const getRoleText = (role: string) => {
                switch (role) {
                  case 'admin': return 'Líder';
                  case 'vice_leader': return 'Vice-Líder';
                  case 'moderator': return 'Moderador';
                  default: return 'Membro';
                }
              };

              // Função para obter a cor do cargo
              const getRoleColor = (role: string) => {
                switch (role) {
                  case 'admin': return 'bg-purple-500';
                  case 'vice_leader': return 'bg-blue-500';
                  case 'moderator': return 'bg-orange-500';
                  default: return 'bg-green-500';
                }
              };

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="size-10 rounded-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${message.user?.avatar}')`,
                      }}
                    ></div>
                    {/* Chip com cargo abaixo da foto */}
                    {!isOwn && (
                      <span
                        className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${getRoleColor(memberRole)}`}
                      >
                        {getRoleText(memberRole)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`flex flex-col max-w-[70%] ${
                      isOwn ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isOwn
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-gray-100 dark:bg-white/10 text-slate-900 dark:text-white rounded-bl-none"
                      }`}
                    >
                      {!isOwn && (
                        <span className="text-xs font-bold block mb-1 opacity-70">
                          {message.user?.name}
                        </span>
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-text-secondary mt-1">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-[#1a1122] border border-gray-200 dark:border-surface-border rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">send</span>
            </button>
          </div>
        </form>
      </div>

      {/* Membros Online/Offline */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-white/10">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Membros ({members.length})
            </h3>
          </div>
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {/* Online */}
            {members.filter((m) => {
              // Se for o usuário atual, usar o status manual
              if (m.user_id === user?.id) {
                return isOnline;
              }
              return m.is_online;
            }).length > 0 && (
              <>
                <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">
                  Online ({members.filter((m) => {
                    if (m.user_id === user?.id) {
                      return isOnline;
                    }
                    return m.is_online;
                  }).length})
                </p>
                {members
                  .filter((m) => {
                    if (m.user_id === user?.id) {
                      return isOnline;
                    }
                    return m.is_online;
                  })
                  .map((member) => {
                    const getRoleColor = (role: string) => {
                      switch (role) {
                        case 'admin': return 'bg-purple-500';
                        case 'vice_leader': return 'bg-blue-500';
                        case 'moderator': return 'bg-orange-500';
                        default: return 'bg-green-500';
                      }
                    };

                    const getRoleText = (role: string) => {
                      switch (role) {
                        case 'admin': return 'Líder';
                        case 'vice_leader': return 'Vice-Líder';
                        case 'moderator': return 'Moderador';
                        default: return 'Membro';
                      }
                    };

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                        onClick={() => navigate(`/user/${member.user_id}`)}
                      >
                        <div className="relative">
                          <div
                            className="size-10 rounded-full bg-cover bg-center"
                            style={{
                              backgroundImage: `url('${member.user?.avatar}')`,
                            }}
                          ></div>
                          <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-dark"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {member.user?.name}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${getRoleColor(member.role)}`}>
                            {getRoleText(member.role)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

            {/* Offline */}
            {members.filter((m) => {
              // Se for o usuário atual, usar o status manual
              if (m.user_id === user?.id) {
                return !isOnline;
              }
              return !m.is_online;
            }).length > 0 && (
              <>
                <p className="text-xs font-bold text-slate-500 dark:text-text-secondary mb-2 uppercase tracking-wider mt-4">
                  Offline ({members.filter((m) => {
                    if (m.user_id === user?.id) {
                      return !isOnline;
                    }
                    return !m.is_online;
                  }).length})
                </p>
                {members
                  .filter((m) => {
                    if (m.user_id === user?.id) {
                      return !isOnline;
                    }
                    return !m.is_online;
                  })
                  .map((member) => {
                    const getRoleColor = (role: string) => {
                      switch (role) {
                        case 'admin': return 'bg-purple-500';
                        case 'vice_leader': return 'bg-blue-500';
                        case 'moderator': return 'bg-orange-500';
                        default: return 'bg-green-500';
                      }
                    };

                    const getRoleText = (role: string) => {
                      switch (role) {
                        case 'admin': return 'Líder';
                        case 'vice_leader': return 'Vice-Líder';
                        case 'moderator': return 'Moderador';
                        default: return 'Membro';
                      }
                    };

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer opacity-60"
                        onClick={() => navigate(`/user/${member.user_id}`)}
                      >
                        <div
                          className="size-10 rounded-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url('${member.user?.avatar}')`,
                          }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {member.user?.name}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${getRoleColor(member.role)}`}>
                            {getRoleText(member.role)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubChat;

