import React, { useState, useContext, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { RatingCategory, SeriesReview, Post, Stamp } from '../types';
import { UserSeriesService, UserSeries } from '../services/userSeriesService';
import { PostService } from '../services/postService';
import { TMDBService, TMDBSeries } from '../services/tmdbService';
import { ProfileService } from '../services/profileService';
import StampDetailsModal from '../components/StampDetailsModal';
import { useNavigate } from 'react-router-dom';

// Componente para o efeito de neve
const SnowEffect = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl">
      <style>{`
        @keyframes snowfall {
          0% { transform: translateY(-10px) translateX(0px); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(100%) translateX(20px); opacity: 0; }
        }
        .snowflake {
          position: absolute;
          top: -10px;
          color: white;
          text-shadow: 0 0 2px rgba(0,0,0,0.3); /* Sombra para ver no fundo claro */
          opacity: 0;
          font-size: 10px;
          animation: snowfall linear infinite;
        }
      `}</style>
      {[...Array(25)].map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const animDuration = `${4 + Math.random() * 6}s`;
        const animDelay = `${Math.random() * 5}s`;
        const size = `${8 + Math.random() * 14}px`;

        return (
          <div
            key={i}
            className="snowflake"
            style={{
              left,
              animationDuration: animDuration,
              animationDelay: animDelay,
              fontSize: size
            }}
          >
            ❄
          </div>
        );
      })}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, theme } = useContext(AppContext);
  const navigate = useNavigate();
  const [userStamps, setUserStamps] = useState<Stamp[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<Stamp | null>(null);
  const [stampsExpanded, setStampsExpanded] = useState(false);
  const [postsExpanded, setPostsExpanded] = useState(false);
  const [userSeries, setUserSeries] = useState<UserSeries[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<TMDBSeries[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados para modal de seguidores/seguindo
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      
      // Carregar tudo em paralelo
      Promise.all([
        UserSeriesService.getUserSeries(user.id),
        PostService.getUserPosts(user.id),
        import('../services/profileService').then(({ ProfileService }) =>
          Promise.all([
            ProfileService.getFollowersCount(user.id),
            ProfileService.getFollowingCount(user.id)
          ])
        ),
        import('../services/badgeService').then(({ BadgeService }) =>
          BadgeService.getUserBadges(user.id)
        )
      ]).then(([series, posts, [followers, following], stamps]) => {
        setUserSeries(series);
        setUserPosts(posts);
        setFollowersCount(followers);
        setFollowingCount(following);
        setUserStamps(stamps);
        setLoading(false);
      }).catch((error) => {
        console.error('Erro ao carregar perfil:', error);
        setLoading(false);
      });
    }
  }, [user?.id]);

  const [activeTab, setActiveTab] = useState<RatingCategory>('Recomendadas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReview, setNewReview] = useState<{
    title: string;
    image: string;
    category: RatingCategory;
    comment: string;
  }>({
    title: '',
    image: '',
    category: 'Recomendadas',
    comment: ''
  });



  // Mapeamento de categorias para rating (1-3)
  const getRatingFromCategory = (cat: RatingCategory): number => {
    switch (cat) {
      case 'Recomendadas': return 3;
      case 'Passa tempo': return 2;
      case 'Perdi meu tempo': return 1;
      default: return 3;
    }
  };

  // Filtrar userSeries por categoria baseada no rating
  // Filtrar userSeries por categoria baseada no rating
  const filteredSeries = userSeries.filter(series => {
    const targetRating = getRatingFromCategory(activeTab);
    return series.rating === targetRating;
  });

  const watchingSeries = userSeries.filter(s => s.status === 'watching');

  // Função de busca
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setNewReview({ ...newReview, title: query });

    if (query.length > 2) {
      const results = await TMDBService.searchSeries(query);
      setSearchResults(results.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  const selectSeries = (series: TMDBSeries) => {
    setNewReview({ ...newReview, title: series.name, image: series.poster_path || '' });
    setShowSuggestions(false);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.title) return;

    // Buscar série no TMDB pelo título para pegar ID e imagem corretos
    const series = searchResults.find(s => s.name === newReview.title) || searchResults[0];
    // fallback se o usuario nao selecionou mas digitou nome exato ou se nao clicou. 
    // Melhor seria obrigar seleção, mas vamos deixar flexivel por enquanto, tentando buscar de novo se precisar.

    let seriesToSave = series;
    if (!seriesToSave) {
      const results = await TMDBService.searchSeries(newReview.title);
      if (results.length > 0) seriesToSave = results[0];
    }

    if (seriesToSave) {
      // Usar a categoria que está no estado newReview.category. 
      // Se o usuário clicou nos botões de categoria, ela já foi atualizada.
      const rating = getRatingFromCategory(newReview.category);

      try {
        await UserSeriesService.addSeries(user.id, seriesToSave, 'watching', newReview.comment, rating);
        UserSeriesService.getUserSeries(user.id).then(setUserSeries);
      } catch (error: any) {
        alert(error.message || 'Erro ao adicionar série.');
        return;
      }
    } else {
      alert('Série não encontrada. Por favor selecione da lista.');
      return;
    }


    setIsModalOpen(false);
    setNewReview({ title: '', image: '', category: 'Recomendadas', comment: '' });
  };

  const handleRemoveSeries = async (seriesId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar navegação se o card fosse clicável para detalhes
    if (confirm('Tem certeza que deseja remover esta série?')) {
      try {
        await UserSeriesService.removeSeries(seriesId);
        setUserSeries(prev => prev.filter(s => s.id !== seriesId));
      } catch (error) {
        console.error(error);
        alert('Erro ao remover série.');
      }
    }
  };

  const handleOpenFollowers = async () => {
    if (!user?.id) return;
    setShowFollowersModal(true);
    setLoadingFollowers(true);
    try {
      const followers = await ProfileService.getFollowersList(user.id);
      setFollowersList(followers);
    } catch (error: any) {
      console.error('Erro ao carregar seguidores:', error);
      alert('Erro ao carregar seguidores: ' + (error?.message || 'Erro desconhecido'));
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleOpenFollowing = async () => {
    if (!user?.id) return;
    setShowFollowingModal(true);
    setLoadingFollowing(true);
    try {
      const following = await ProfileService.getFollowingList(user.id);
      setFollowingList(following);
    } catch (error: any) {
      console.error('Erro ao carregar seguindo:', error);
      alert('Erro ao carregar seguindo: ' + (error?.message || 'Erro desconhecido'));
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user?.id) return;
    try {
      await ProfileService.unfollowUser(user.id, targetUserId);
      // Remover da lista
      setFollowingList(prev => prev.filter(u => u.id !== targetUserId));
      // Atualizar contador
      setFollowingCount(prev => (prev !== null ? prev - 1 : 0));
    } catch (error: any) {
      console.error('Erro ao deixar de seguir:', error);
      alert('Erro ao deixar de seguir: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const getCategoryColor = (cat: RatingCategory) => {
    switch (cat) {
      case 'Recomendadas': return 'text-green-500 border-green-500 bg-green-500/10';
      case 'Passa tempo': return 'text-blue-400 border-blue-400 bg-blue-400/10';
      case 'Perdi meu tempo': return 'text-red-500 border-red-500 bg-red-500/10';
      default: return '';
    }
  };

  // Mostrar loading até que todos os dados principais estejam carregados
  if (loading || followersCount === null || followingCount === null) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen">
        <Navigation page="profile" />
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <span className="material-symbols-outlined animate-spin text-6xl text-primary mb-4">progress_activity</span>
          <p className="text-slate-600 dark:text-text-secondary font-medium">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Lógica de estilos para o tema
  const isIceTheme = user.profileTheme === 'ice';

  // Ajuste do gradiente do tema Gelo para aparecer melhor no modo claro
  // Usei sky-100/sky-200 no light mode para contrastar com o fundo branco da pagina
  const headerClasses = isIceTheme
    ? "relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 p-6 md:p-8 rounded-xl bg-gradient-to-b from-sky-200 to-sky-50 dark:from-[#1e293b] dark:to-[#0f172a] border-2 border-sky-300 dark:border-blue-900 shadow-lg shadow-sky-500/10 transition-colors duration-300"
    : "flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 p-6 md:p-8 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark shadow-sm transition-colors duration-300";

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300 pb-24 md:pb-8">
      <Navigation page="profile" />

      <main className="flex h-full grow flex-col px-4 md:px-10 lg:px-40 py-6 md:py-8 relative">
        <div className="flex flex-1 justify-center">
          <div className="flex flex-col max-w-[960px] flex-1 gap-6 md:gap-8 w-full">

            {/* Profile Header */}
            <section className={headerClasses}>
              {isIceTheme && <SnowEffect />}

              <div className="flex flex-col items-center gap-4 shrink-0 relative z-10 w-full md:w-auto">
                <div className="relative group cursor-pointer">
                  <div className={`bg-center bg-no-repeat bg-cover rounded-full h-28 w-28 md:h-40 md:w-40 ring-4 ${isIceTheme ? 'ring-sky-300 dark:ring-blue-900' : 'ring-slate-100 dark:ring-border-dark'}`} style={{ backgroundImage: `url('${user.avatar}')` }}></div>
                  <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-surface-dark" title="Online Agora"></div>
                </div>
                {/* Botões mobile: full width */}
                <div className="flex gap-2 w-full md:w-auto">

                  <button 
                    onClick={() => {
                      const profileUrl = `${window.location.origin}/#/@${user.handle}`;
                      navigator.clipboard.writeText(profileUrl).then(() => {
                        alert('Link do perfil copiado!');
                      }).catch(() => {
                        alert('Erro ao copiar link');
                      });
                    }}
                    className="flex cursor-pointer items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-surface-border transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-start flex-1 w-full text-center md:text-left gap-4 relative z-10">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h1 className="text-2xl md:text-3xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2 flex-wrap justify-center md:justify-start">
                      {user.name}
                      {isIceTheme && <span className="text-sky-500 dark:text-blue-400 animate-pulse text-lg" title="Tema Gelo Ativo">❄️</span>}
                    </h1>
                    {user.role === 'admin' && <span className="material-symbols-outlined text-primary text-[20px] shrink-0" title="Verificado">verified</span>}
                  </div>
                  <p className="text-slate-500 dark:text-text-secondary text-sm font-medium">{user.handle}</p>
                </div>

                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-lg leading-relaxed">
                  {user.bio || "Sem biografia."}
                </p>

                <div className="w-full h-px bg-slate-200 dark:bg-surface-dark/50 my-2"></div>

                {/* Stats Grid para Mobile */}
                <div className="grid grid-cols-3 gap-2 w-full md:flex md:gap-10">
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">{userSeries.length}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider font-semibold">Séries</span>
                  </div>
                  <div
                    className="flex flex-col items-center md:items-start cursor-pointer hover:opacity-80 transition-opacity group"
                    style={{ position: 'relative', zIndex: 100 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFollowers();
                    }}
                    title="Clique para ver seguidores"
                  >
                    <span className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{followersCount !== null ? followersCount : '...'}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider font-semibold">Seguidores</span>
                  </div>
                  <div
                    className="flex flex-col items-center md:items-start cursor-pointer hover:opacity-80 transition-opacity group"
                    style={{ position: 'relative', zIndex: 100 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFollowing();
                    }}
                    title="Clique para ver seguindo"
                  >
                    <span className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{followingCount !== null ? followingCount : '...'}</span>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider font-semibold">Seguindo</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Currently Watching */}
            {(user.privacy_settings?.profile_visibility?.watching === 'public' || 
              user.privacy_settings?.profile_visibility?.watching === undefined) && (
            <section>
              <div className="flex items-center justify-between px-1 mb-4">
                <h2 className="text-lg md:text-xl font-bold leading-tight text-slate-900 dark:text-white">Acompanhando</h2>
                {watchingSeries.length > 0 && <a className="text-primary text-sm font-semibold hover:underline" href="#">Ver todas</a>}
              </div>
              <div className="relative group/carousel -mx-4 md:mx-0 px-4 md:px-0">
                <div className="flex overflow-x-auto hide-scrollbar gap-3 md:gap-4 pb-4 snap-x pr-4">
                  {watchingSeries.length > 0 ? (
                    watchingSeries.map((series) => (
                      <div 
                        key={series.id}
                        onClick={() => window.location.hash = `#/series/${series.tmdb_id}`} 
                        className="flex flex-col gap-2 w-[110px] md:w-[150px] shrink-0 snap-start cursor-pointer group/card"
                      >
                        <div className="w-full aspect-[2/3] bg-center bg-cover rounded-xl shadow-md relative overflow-hidden"
                          style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.poster_path)}')` }}>
                          <div className="absolute bottom-2 left-2">
                            <div className="bg-primary text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-sm">
                              Assistindo
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white text-sm md:text-base font-bold leading-tight truncate px-0.5">{series.title}</p>
                          <p className="text-slate-500 dark:text-text-secondary text-xs px-0.5">Em dia</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 dark:text-text-secondary text-sm italic py-4">
                      Você não está acompanhando nenhuma série no momento. Adicione uma abaixo!
                    </div>
                  )}
                </div>
              </div>
            </section>
            )}

            {/* Minhas Recomendações */}
            {(user.privacy_settings?.profile_visibility?.recommendations === 'public' || 
              user.privacy_settings?.profile_visibility?.recommendations === undefined) && (
            <section className="bg-white dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-border-dark transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg md:text-xl font-bold leading-tight text-slate-900 dark:text-white mb-1">Minhas Recomendações</h2>
                  <p className="text-sm text-slate-500 dark:text-text-secondary">Séries que eu assisti e minha opinião.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Adicionar
                </button>
              </div>

              {/* Tabs Scrollable */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-gray-100 dark:border-white/5 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {(['Recomendadas', 'Passa tempo', 'Perdi meu tempo'] as RatingCategory[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border shrink-0 ${activeTab === tab
                      ? getCategoryColor(tab)
                      : 'bg-transparent text-slate-500 dark:text-text-secondary border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Series Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSeries.length > 0 ? (
                  filteredSeries.map(series => (
                    <div key={series.id} className="relative group/item flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-background-dark border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors h-full">
                      <div className="w-16 h-24 sm:w-20 sm:h-28 shrink-0 bg-cover bg-center rounded-md shadow-sm" style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.poster_path)}')` }}></div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-tight mb-1 truncate pr-8">{series.title}</h3>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-2 py-0.5 rounded w-fit ${getCategoryColor(activeTab)}`}>
                          {series.status === 'watching' ? 'Assistindo' : series.status}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic line-clamp-3">"{series.review || 'Sem crítica'}"</p>
                      </div>
                      <button
                        onClick={(e) => handleRemoveSeries(series.id, e)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Remover série"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center text-slate-400 dark:text-text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">movie_off</span>
                    <p>Nenhuma série adicionada nesta categoria ainda.</p>
                  </div>
                )}
              </div>
            </section>
            )}

            {/* Badges & Posts (Grid on Desktop, Stack on Mobile) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Badges */}
              {(user.privacy_settings?.profile_visibility?.stamps === 'public' || 
                user.privacy_settings?.profile_visibility?.stamps === undefined) && (
              <div className="flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden hover:border-primary/50 transition-colors group h-full">
                <div className="p-4 md:p-6 pb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-yellow-500 text-3xl">military_tech</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Coleção de Selos</h3>
                  </div>
                  <p className="text-slate-500 dark:text-text-secondary text-sm mb-6">
                    {user.name.split(' ')[0]} desbloqueou {userStamps.length} {userStamps.length === 1 ? 'selo' : 'selos'}.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-4">
                    {userStamps.slice(0, 5).map((stamp) => (
                      <div 
                        key={stamp.id} 
                        onClick={() => setSelectedStamp(stamp)}
                        className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 relative group/stamp cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                      >
                        {stamp.image_url ? (
                          <img alt={stamp.name || "Selo"} className="w-9 h-9 object-contain drop-shadow-md" src={stamp.image_url} />
                        ) : (
                          <span className="material-symbols-outlined text-gray-400">military_tech</span>
                        )}
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover/stamp:block bg-black/80 text-white text-xs p-1.5 rounded whitespace-nowrap z-50">
                            {stamp.name}
                        </div>
                      </div>
                    ))}
                    
                    {userStamps.length > 5 && (
                      <div className="w-12 h-12 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-300 dark:border-slate-700 border-dashed text-slate-500 text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        +{userStamps.length - 5}
                      </div>
                    )}
                    
                    {userStamps.length === 0 && (
                       <div className="text-xs text-gray-400 italic py-2">
                          Nenhum selo conquistado ainda.
                       </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Posts */}
              {(user.privacy_settings?.profile_visibility?.posts === 'public' || 
                user.privacy_settings?.profile_visibility?.posts === undefined) && (
              <div className="flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden hover:border-primary/50 transition-colors group h-full">
                <div className="p-4 md:p-6 pb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-blue-400 text-3xl">forum</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Publicações</h3>
                  </div>
                  <p className="text-slate-500 dark:text-text-secondary text-sm mb-4">Atividade recente.</p>
                  <div className="bg-slate-50 dark:bg-background-dark rounded-lg p-4 border border-slate-100 dark:border-border-dark mb-2">
                    {userPosts.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-6 bg-cover rounded-full" style={{ backgroundImage: `url('${user.avatar}')` }}></div>
                          <span className="text-xs font-bold text-slate-500 dark:text-text-secondary line-clamp-1">{user.name.split(' ')[0]} <span className="font-normal">publicou:</span></span>
                        </div>
                        <p className="text-sm italic text-slate-600 dark:text-slate-300 line-clamp-3">"{userPosts[0].content}"</p>
                        <span className="text-[10px] text-slate-400 mt-2 block">{userPosts[0].timeAgo}</span>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-text-secondary text-center py-2">Nenhuma atividade recente encontrada.</p>
                    )}
                  </div>
                </div>
              </div>
              )}

            </section>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-border-dark overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-5 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Adicionar Série</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleAddReview} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Nome</label>
                    <div className="relative">
                      <input
                        type="text" required
                        className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-4 py-3 text-slate-900 dark:text-white"
                        value={newReview.title}
                        onChange={handleSearchChange}
                        placeholder="Ex: Breaking Bad"
                        autoComplete="off"
                      />
                      {showSuggestions && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-background-dark border border-gray-200 dark:border-border-dark rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                          {searchResults.map(series => (
                            <div
                              key={series.id}
                              onClick={() => selectSeries(series)}
                              className="p-3 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer flex gap-3 items-center border-b border-gray-100 dark:border-white/5 last:border-0"
                            >
                              {series.poster_path ? (
                                <div className="w-8 h-12 bg-cover rounded flex-shrink-0" style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.poster_path)}')` }}></div>
                              ) : (
                                <div className="w-8 h-12 bg-gray-200 dark:bg-white/10 rounded flex-shrink-0"></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{series.name}</p>
                                <p className="text-[10px] text-slate-500 dark:text-text-secondary">{series.first_air_date?.split('-')[0] || 'N/A'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Categoria</label>
                    <div className="flex gap-2">
                      {(['Recomendadas', 'Passa tempo', 'Perdi meu tempo'] as RatingCategory[]).map(cat => (
                        <button type="button" key={cat} onClick={() => setNewReview({ ...newReview, category: cat })}
                          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-lg border transition-colors ${newReview.category === cat ? getCategoryColor(cat) : 'bg-transparent border-gray-300 dark:border-white/10 text-slate-500 dark:text-text-secondary'
                            }`}
                        >{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Crítica</label>
                    <textarea required rows={3}
                      className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-4 py-3 text-slate-900 dark:text-white resize-none"
                      value={newReview.comment} onChange={e => setNewReview({ ...newReview, comment: e.target.value })} placeholder="Opinião..."
                    ></textarea>
                  </div>
                  <button type="submit" className="mt-2 w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg">Salvar</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Selected Stamp Modal */}
        {selectedStamp && (
          <StampDetailsModal 
            stamp={selectedStamp} 
            onClose={() => setSelectedStamp(null)} 
          />
        )}

        {/* Modal de Seguidores */}
        {showFollowersModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowFollowersModal(false)}>
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-border-dark overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Seguidores</h3>
                  <button onClick={() => setShowFollowersModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {loadingFollowers ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
                    </div>
                  ) : followersList.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-text-secondary py-8">Nenhum seguidor ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {followersList.map((follower) => (
                        <div
                          key={follower.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => {
                            setShowFollowersModal(false);
                            navigate(`/user/${follower.id}`);
                          }}
                        >
                          <div className="w-12 h-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${follower.avatar}')` }}></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{follower.name}</p>
                            <p className="text-sm text-slate-500 dark:text-text-secondary truncate">{follower.handle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Seguindo */}
        {showFollowingModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowFollowingModal(false)}>
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-border-dark overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Seguindo</h3>
                  <button onClick={() => setShowFollowingModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {loadingFollowing ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
                    </div>
                  ) : followingList.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-text-secondary py-8">Você não está seguindo ninguém ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {followingList.map((following) => (
                        <div
                          key={following.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <div
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setShowFollowingModal(false);
                              navigate(`/user/${following.id}`);
                            }}
                          >
                            <div className="w-12 h-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${following.avatar}')` }}></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{following.name}</p>
                              <p className="text-sm text-slate-500 dark:text-text-secondary truncate">{following.handle}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnfollow(following.id)}
                            className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Deixar de seguir
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ProfilePage;