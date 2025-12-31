import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import { AppContext } from "../App";
import { ClubService, Club } from "../services/clubService";
import { useError } from "../context/ErrorContext";
import LazyImage from "../components/LazyImage";

const ClubesPage: React.FC = () => {
  const { user } = useContext(AppContext);
  const { showError } = useError();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newClubName, setNewClubName] = useState("");
  const [newClubDescription, setNewClubDescription] = useState("");
  const [newClubColor, setNewClubColor] = useState("#6366f1");
  const [newClubImage, setNewClubImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    loadClubs();
  }, [user?.id, activeTab, searchQuery]);

  const loadClubs = async () => {
    try {
      setLoading(true);
      if (activeTab === "my" && user?.id) {
        const myClubsData = await ClubService.getClubs(undefined, user.id);
        setMyClubs(myClubsData);
      } else {
        const allClubs = await ClubService.getClubs(searchQuery || undefined);
        setClubs(allClubs);
      }
    } catch (error: any) {
      showError(error.message || "Erro ao carregar clubes", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) {
      showError("Digite um nome para o clube", "warning");
      return;
    }

    setCreating(true);
    try {
      const club = await ClubService.createClub(
        newClubName,
        newClubDescription,
        newClubColor,
        newClubImage || undefined
      );

      showError("Clube criado com sucesso!", "success", 3000);
      setShowCreateModal(false);
      setNewClubName("");
      setNewClubDescription("");
      setNewClubColor("#6366f1");
      setNewClubImage(null);
      setImagePreview(null);
      
      navigate(`/clubes/${club.id}`);
    } catch (error: any) {
      showError(error.message || "Erro ao criar clube", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewClubImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleJoinClub = async (clubId: string) => {
    try {
      await ClubService.joinClub(clubId);
      showError("Você entrou no clube!", "success", 3000);
      loadClubs();
    } catch (error: any) {
      showError(error.message || "Erro ao entrar no clube", "error");
    }
  };

  const displayClubs = activeTab === "my" ? myClubs : clubs;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20 md:pb-0">
      <Navigation page="feed" />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Clubes
            </h1>
            <p className="text-slate-600 dark:text-text-secondary">
              Encontre ou crie comunidades sobre suas séries favoritas
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Criar Clube
          </button>
        </div>

        {/* Tabs e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 border-b border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 font-bold transition-colors ${
                activeTab === "all"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Todos os Clubes
            </button>
            <button
              onClick={() => setActiveTab("my")}
              className={`px-4 py-2 font-bold transition-colors ${
                activeTab === "my"
                  ? "text-primary border-b-2 border-primary"
                  : "text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Meus Clubes
            </button>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar clubes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Grid de Clubes */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="material-symbols-outlined text-6xl text-primary animate-spin">
              progress_activity
            </span>
          </div>
        ) : displayClubs.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
              groups
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {activeTab === "my"
                ? "Você ainda não entrou em nenhum clube"
                : "Nenhum clube encontrado"}
            </h3>
            <p className="text-slate-600 dark:text-text-secondary">
              {activeTab === "my"
                ? "Explore os clubes disponíveis ou crie o seu próprio!"
                : "Tente buscar com outros termos"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayClubs.map((club) => (
              <div
                key={club.id}
                className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/clubes/${club.id}`)}
              >
                {/* Header com cor do clube */}
                <div
                  className="h-24 relative"
                  style={{ backgroundColor: club.color }}
                >
                  {club.image_url && (
                    <LazyImage
                      src={club.image_url}
                      alt={club.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-2 left-3 right-3">
                    <h3 className="text-white font-bold text-lg truncate">
                      {club.name}
                    </h3>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-slate-600 dark:text-text-secondary text-sm line-clamp-2 mb-4">
                    {club.description || "Sem descrição"}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-text-secondary">
                      <span className="material-symbols-outlined text-lg">
                        people
                      </span>
                      <span>{club.member_count || 0} membros</span>
                    </div>

                    {club.is_member ? (
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                        Membro
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinClub(club.id);
                        }}
                        className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Entrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de Criar Clube */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-surface-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Criar Novo Clube
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateClub} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Nome do Clube *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Fãs de Stranger Things"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={newClubDescription}
                    onChange={(e) => setNewClubDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Descreva o propósito do clube..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Cor do Clube
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newClubColor}
                      onChange={(e) => setNewClubColor(e.target.value)}
                      className="w-16 h-10 rounded border border-gray-300 dark:border-border-dark cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newClubColor}
                      onChange={(e) => setNewClubColor(e.target.value)}
                      className="flex-1 px-4 py-2 bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg text-slate-900 dark:text-white font-mono text-sm"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Imagem do Clube (opcional)
                  </label>
                  <div className="flex items-center gap-4">
                    {imagePreview && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-border-dark">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <label className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                      <span className="material-symbols-outlined align-middle mr-2">
                        image
                      </span>
                      Escolher Imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-border-dark text-slate-700 dark:text-white font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creating ? "Criando..." : "Criar Clube"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubesPage;

