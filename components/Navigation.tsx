import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../App';
import { TMDBService, TMDBSeries } from '../src/services/tmdbService';
import { UserSeriesService } from '../src/services/userSeriesService';

interface NavigationProps {
  page: 'feed' | 'profile' | 'market' | 'settings';
}

const Navigation: React.FC<NavigationProps> = ({ page }) => {
  const location = useLocation();
  const { coins, user } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBSeries[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userSeriesIds, setUserSeriesIds] = useState<Set<number>>(new Set());
  const searchRef = useRef<HTMLDivElement>(null);

  // Carregar IDs das séries do usuário para verificação rápida
  useEffect(() => {
    if (user?.id) {
        UserSeriesService.getUserSeries(user.id).then(series => {
            setUserSeriesIds(new Set(series.map(s => s.tmdb_id)));
        });
    }
  }, [user?.id]);

  // Fechar busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 2) {
      setIsSearching(true);
      const results = await TMDBService.searchSeries(query);
      setSearchResults(results.slice(0, 5));
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddSeries = async (series: TMDBSeries) => {
    if (!user?.id) return alert('Faça login para adicionar séries');
    try {
        await UserSeriesService.addSeries(user.id, series);
        // Atualizar lista local de IDs
        setUserSeriesIds(prev => new Set(prev).add(series.id));
        alert(`${series.name} adicionada à sua lista!`);
        setSearchResults([]);
        setSearchQuery('');
    } catch (e: any) {
        alert(e.message);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Itens do menu para reutilização
  const navItems = [
    { id: 'feed', path: '/feed', icon: 'home', label: 'Início' },
    { id: 'market', path: '/market', icon: 'storefront', label: 'Mercado' },
    { id: 'profile', path: '/profile', icon: 'person', label: 'Perfil' },
    { id: 'settings', path: '/settings', icon: 'settings', label: 'Config' },
  ];

  return (
    <>
      {/* Top Header (Desktop & Tablet) */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#1a1122]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 px-4 sm:px-10 py-3 transition-colors duration-300">
        <div className="flex items-center justify-between gap-4 max-w-[1440px] mx-auto">
          
          {/* Logo e Busca */}
          <div className="flex items-center gap-4 lg:gap-8 flex-1">
            <Link to="/feed" className="flex items-center gap-2 sm:gap-3 text-slate-900 dark:text-white cursor-pointer group shrink-0">
              <div className={`size-8 ${page === 'market' ? 'bg-primary rounded-lg flex items-center justify-center text-white' : 'text-primary'}`}>
                 {page === 'market' ? (
                   <span className="material-symbols-outlined text-xl">grid_view</span>
                 ) : (
                  <span className="material-symbols-outlined text-[28px] sm:text-[32px]">movie_filter</span>
                 )}
              </div>
              <h2 className="hidden min-[380px]:block text-lg font-bold leading-tight tracking-[-0.015em] group-hover:text-primary transition-colors">
                {page === 'market' ? 'Loja Maratonei' : 'Maratonei'}
              </h2>
            </Link>
            
            {/* Search Bar - Oculto em telas muito pequenas */}
            <div className="hidden sm:flex flex-col flex-1 max-w-96 min-w-[200px] relative" ref={searchRef}>
              <div className="flex w-full flex-1 items-stretch rounded-lg h-10 bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] transition-colors group">
                <div className="text-gray-400 dark:text-[#ad92c9] flex border-none items-center justify-center pl-3 pr-2">
                  <span className="material-symbols-outlined text-xl">search</span>
                </div>
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-gray-400 dark:placeholder:text-[#ad92c9] px-0 text-sm font-normal leading-normal" 
                  placeholder="Buscar série..." 
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>

              {/* Dropdown de Resultados */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-50">
                  {searchResults.map(series => (
                    <div key={series.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0">
                      <div className="w-10 h-14 rounded bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.poster_path)}')` }}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{series.name}</h4>
                        <span className="text-xs text-slate-500 dark:text-text-secondary">{series.first_air_date?.split('-')[0] || 'N/A'}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (userSeriesIds.has(series.id)) return;
                            handleAddSeries(series);
                        }}
                        className={`p-2 rounded-full transition-colors ${userSeriesIds.has(series.id) ? 'text-green-500 bg-green-50 cursor-default' : 'text-primary hover:bg-primary/10'}`}
                        title={userSeriesIds.has(series.id) ? "Já adicionada" : "Adicionar à lista"}
                      >
                         <span className="material-symbols-outlined text-xl">{userSeriesIds.has(series.id) ? 'check' : 'add_circle'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Nav Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-4 lg:gap-8">
            <nav className="hidden lg:flex items-center gap-6">
              <Link to="/feed" className={`text-sm font-medium transition-colors ${isActive('/feed') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'}`}>Início</Link>
              <Link to="/market" className={`text-sm font-medium transition-colors ${isActive('/market') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'}`}>Mercado</Link>
              <Link to="/profile" className={`text-sm font-medium transition-colors ${isActive('/profile') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'}`}>Perfil</Link>
            </nav>
            
            <div className="flex gap-2 sm:gap-3 items-center">
               {/* Coins Display */}
               <div className="flex items-center bg-gray-100 dark:bg-[#362348] rounded-lg px-2 py-1 h-10 border border-transparent dark:border-white/5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mr-1">{coins.toLocaleString()}</span>
                  <span className="text-sm">🪙</span>
               </div>
              
              <Link 
                to="/settings"
                className={`hidden md:flex size-10 cursor-pointer items-center justify-center rounded-lg transition-colors relative ${isActive('/settings') ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] text-slate-700 dark:text-white'}`}
              >
                <span className="material-symbols-outlined text-xl">settings</span>
              </Link>

              <button className="size-10 cursor-pointer flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] text-slate-700 dark:text-white transition-colors relative">
                <span className="material-symbols-outlined text-xl">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-gray-100 dark:border-[#362348]"></span>
              </button>
              
              <Link to="/profile" className="hidden md:flex size-10 cursor-pointer items-center justify-center rounded-lg bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] text-white transition-colors overflow-hidden border border-gray-200 dark:border-white/10">
                <div 
                  className="size-full bg-cover bg-center" 
                  style={{ backgroundImage: `url('${user.avatar}')` }}
                ></div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1122] border-t border-gray-200 dark:border-white/10 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link 
                key={item.id} 
                to={item.path} 
                className={`flex flex-col items-center justify-center w-full h-full gap-1 ${active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <div className={`relative px-4 py-1 rounded-full transition-colors ${active ? 'bg-primary/10' : ''}`}>
                    <span className={`material-symbols-outlined text-2xl ${active ? 'filled' : ''}`}>
                      {item.icon}
                    </span>
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {/* Spacer para garantir que o conteúdo não fique escondido atrás da barra no mobile */}
      <div className="h-0 md:hidden pb-safe"></div> 
    </>
  );
};

export default Navigation;