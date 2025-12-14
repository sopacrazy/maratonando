import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../App';

interface NavigationProps {
  page: 'feed' | 'profile' | 'market' | 'settings';
}

const Navigation: React.FC<NavigationProps> = ({ page }) => {
  const location = useLocation();
  const { coins, user } = useContext(AppContext);

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
            <div className="hidden sm:flex flex-col flex-1 max-w-96 min-w-[200px] !h-10">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] transition-colors group">
                <div className="text-gray-400 dark:text-[#ad92c9] flex border-none items-center justify-center pl-3 pr-2">
                  <span className="material-symbols-outlined text-xl">search</span>
                </div>
                <input 
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-transparent focus:border-none h-full placeholder:text-gray-400 dark:placeholder:text-[#ad92c9] px-0 text-sm font-normal leading-normal" 
                  placeholder="Buscar..." 
                />
              </div>
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