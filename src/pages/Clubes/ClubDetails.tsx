import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "../../components/Navigation";
import { AppContext } from "../../App";
import {
  ClubService,
  Club,
  ClubPost,
  ClubMember,
  ClubMessage,
} from "../../services/clubService";
import { useError } from "../../context/ErrorContext";
import LazyImage from "../../components/LazyImage";
import ClubChat from "../../components/Clubes/ClubChat";
import ClubMembers from "../../components/Clubes/ClubMembers";
import ClubSettings from "../../components/Clubes/ClubSettings";

const ClubDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AppContext);
  const { showError } = useError();
  const navigate = useNavigate();

  const [club, setClub] = useState<Club | null>(null);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "chat" | "members">(
    "feed"
  );
  const [showSettings, setShowSettings] = useState(false);

  // Post state
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadClub();
      loadPosts();
      loadMembers();
    }
  }, [id]);

  useEffect(() => {
    // Atualizar last_seen periodicamente quando for membro
    if (id && club?.is_member) {
      ClubService.updateLastSeen(id);
      const interval = setInterval(() => {
        ClubService.updateLastSeen(id);
      }, 30000); // A cada 30 segundos

      return () => clearInterval(interval);
    }
  }, [id, club?.is_member]);

  const loadClub = async () => {
    if (!id || !user?.id) return;
    try {
      const clubData = await ClubService.getClubById(id, user.id);
      console.log("[ClubDetails] Clube carregado:", clubData);
      console.log("[ClubDetails] É membro?", clubData.is_member);
      setClub(clubData);
      setLoading(false); // Desativa loading principal assim que o clube carrega
    } catch (error: any) {
      showError(error.message || "Erro ao carregar clube", "error");
      navigate("/clubes");
    }
  };

  const loadPosts = async () => {
    if (!id) return;
    setLoadingPosts(true);
    try {
      const postsData = await ClubService.getClubPosts(id);
      setPosts(postsData);
    } catch (error: any) {
      showError(error.message || "Erro ao carregar posts", "error");
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    setLoadingMembers(true);
    try {
      const membersData = await ClubService.getClubMembers(id);
      setMembers(membersData);
    } catch (error: any) {
      showError(error.message || "Erro ao carregar membros", "error");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleJoinClub = async () => {
    if (!id) return;
    try {
      await ClubService.joinClub(id);
      showError("Você entrou no clube!", "success", 3000);
      loadClub();
      loadMembers();
    } catch (error: any) {
      showError(error.message || "Erro ao entrar no clube", "error");
    }
  };

  const handleLeaveClub = async () => {
    if (!id) return;
    if (!confirm("Tem certeza que deseja sair do clube?")) return;

    try {
      await ClubService.leaveClub(id);
      showError("Você saiu do clube", "info", 3000);
      navigate("/clubes");
    } catch (error: any) {
      showError(error.message || "Erro ao sair do clube", "error");
    }
  };

  const handleCreatePost = async () => {
    if (!id || !newPostContent.trim()) {
      showError("Escreva algo antes de publicar", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const post = await ClubService.createClubPost(
        id,
        newPostContent,
        newPostImage || undefined
      );
      setPosts([post, ...posts]);
      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);
      showError("Post criado com sucesso!", "success", 2000);
    } catch (error: any) {
      showError(error.message || "Erro ao criar post", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async (post: ClubPost) => {
    try {
      if (post.user_has_liked) {
        await ClubService.unlikeClubPost(post.id);
        setPosts(
          posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  likes_count: (p.likes_count || 0) - 1,
                  user_has_liked: false,
                }
              : p
          )
        );
      } else {
        await ClubService.likeClubPost(post.id);
        setPosts(
          posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  likes_count: (p.likes_count || 0) + 1,
                  user_has_liked: true,
                }
              : p
          )
        );
      }
    } catch (error: any) {
      showError(error.message || "Erro ao curtir post", "error");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;
    try {
      await ClubService.deleteClubPost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      showError("Post excluído", "success", 2000);
    } catch (error: any) {
      showError(error.message || "Erro ao excluir post", "error");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Mostrar loading apenas se não tiver clube ainda
  if (loading && !club) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="mt-4 text-slate-600 dark:text-text-secondary font-medium">
            Carregando clube...
          </p>
        </div>
      </div>
    );
  }

  if (!club) {
    return null;
  }

  const isAdmin = club.user_role === "admin";
  const isModerator = ["admin", "moderator", "vice_leader"].includes(
    club.user_role || ""
  );

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 md:pb-0">
      <Navigation page="feed" />

      {/* Header do Clube */}
      <div
        className="relative h-64 md:h-80 overflow-hidden"
        style={{ backgroundColor: club.color }}
      >
        {club.image_url && (
          <LazyImage
            src={club.image_url}
            alt={club.name}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 h-full flex flex-col justify-end">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {club.name}
              </h1>
              <p className="text-white/90 text-sm md:text-base max-w-2xl">
                {club.description || "Sem descrição"}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {!club.is_member ? (
                <button
                  onClick={handleJoinClub}
                  className="px-6 py-3 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Entrar no Clube
                </button>
              ) : (
                <>
                  {/* Botão Arena - sempre visível para membros */}
                  <button
                    onClick={() => navigate(`/clubes/${club.id}/arena`)}
                    className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors shadow-lg flex items-center gap-2 animate-pulse transform hover:scale-105"
                    style={{ zIndex: 10 }}
                  >
                    <span className="material-symbols-outlined text-lg">
                      sports_martial_arts
                    </span>
                    Arena
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-4 py-2 bg-white/20 text-white font-bold rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        settings
                      </span>
                      Configurações
                    </button>
                  )}
                  <button
                    onClick={handleLeaveClub}
                    className="px-4 py-2 bg-red-500/20 text-white font-bold rounded-lg hover:bg-red-500/30 transition-colors"
                    disabled={isAdmin}
                    title={
                      isAdmin
                        ? "Admin não pode sair. Passe a liderança ou exclua o clube."
                        : "Sair do clube"
                    }
                  >
                    Sair
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        {club.is_member && (
          <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 mb-6">
            <button
              onClick={() => setActiveTab("feed")}
              className={`px-4 py-2 font-bold transition-colors ${
                activeTab === "feed"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 font-bold transition-colors ${
                activeTab === "chat"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 font-bold transition-colors ${
                activeTab === "members"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Membros
            </button>
          </div>
        )}

        {/* Conteúdo baseado na tab */}
        {!club.is_member && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
              lock
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Você precisa ser membro para ver o conteúdo
            </h3>
            <p className="text-slate-600 dark:text-text-secondary mb-6">
              Entre no clube para ver posts, chat e membros
            </p>
            <button
              onClick={handleJoinClub}
              className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Entrar no Clube
            </button>
          </div>
        )}

        {club.is_member && activeTab === "feed" && (
          <div className="max-w-3xl mx-auto">
            {/* Loading do Feed */}
            {loadingPosts && posts.length === 0 && (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-primary animate-spin">
                    progress_activity
                  </span>
                  <p className="mt-4 text-slate-600 dark:text-text-secondary font-medium">
                    Carregando feed...
                  </p>
                </div>
              </div>
            )}

            {/* Criar Post - só mostra quando não está carregando ou já tem posts */}
            {(!loadingPosts || posts.length > 0) && (
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-4 mb-6">
                <div className="flex gap-3">
                  <div
                    className="size-10 rounded-full bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url('${user.avatar}')` }}
                  ></div>
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-200 dark:border-surface-border rounded-lg p-3 text-sm text-slate-900 dark:text-white placeholder:text-gray-500 resize-none min-h-[100px]"
                      placeholder="Compartilhe algo com o clube..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    ></textarea>

                    {imagePreview && (
                      <div className="relative mt-2 rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-h-64 object-cover"
                        />
                        <button
                          onClick={() => {
                            setImagePreview(null);
                            setNewPostImage(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                        >
                          <span className="material-symbols-outlined text-lg">
                            close
                          </span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">
                            image
                          </span>
                        </button>
                      </div>
                      <button
                        onClick={handleCreatePost}
                        disabled={submitting || !newPostContent.trim()}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Publicando..." : "Publicar"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts */}
            {loadingPosts && posts.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl text-primary animate-spin">
                  progress_activity
                </span>
                <p className="mt-4 text-slate-600 dark:text-text-secondary">
                  Carregando posts...
                </p>
              </div>
            )}

            {!loadingPosts && posts.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border">
                <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">
                  feed
                </span>
                <p className="text-slate-600 dark:text-text-secondary">
                  Nenhum post ainda. Seja o primeiro a compartilhar!
                </p>
              </div>
            )}

            {!loadingPosts && posts.length > 0 && (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="size-10 rounded-full bg-cover bg-center shrink-0"
                        style={{
                          backgroundImage: `url('${post.user?.avatar}')`,
                        }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">
                              {post.user?.name}
                            </h4>
                            <span className="text-xs text-slate-500 dark:text-text-secondary">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {(post.user_id === user?.id || isModerator) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-red-500 hover:text-red-600 p-1"
                            >
                              <span className="material-symbols-outlined text-lg">
                                delete
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {post.image_url && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <LazyImage
                          src={post.image_url}
                          alt="Post"
                          className="w-full max-h-96 object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-white/5">
                      <button
                        onClick={() => handleLikePost(post)}
                        className={`flex items-center gap-1 ${
                          post.user_has_liked
                            ? "text-red-500"
                            : "text-slate-500 dark:text-text-secondary"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined ${
                            post.user_has_liked ? "filled" : ""
                          }`}
                        >
                          favorite
                        </span>
                        <span className="text-sm font-bold">
                          {post.likes_count || 0}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {club.is_member && activeTab === "chat" && (
          <ClubChat clubId={id!} members={members} />
        )}

        {club.is_member && activeTab === "members" && (
          <ClubMembers
            clubId={id!}
            members={members}
            userRole={club.user_role}
            onMembersUpdate={loadMembers}
          />
        )}
      </main>

      {/* Modal de Configurações */}
      {showSettings && club && (
        <ClubSettings
          club={club}
          onClose={() => setShowSettings(false)}
          onUpdate={loadClub}
        />
      )}
    </div>
  );
};

export default ClubDetailsPage;
