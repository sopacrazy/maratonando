import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { ProfileService } from '../services/profileService';
import { supabase } from '../lib/supabase';
import StampsModal from './StampsModal';
import CongratsModal from './CongratsModal'; // Import new modal
import { Stamp } from '../types';

interface NavigationProps {
  page: 'feed' | 'profile' | 'market' | 'settings';
}

const Navigation: React.FC<NavigationProps> = ({ page }) => {
  const location = useLocation();
  const { coins, user } = useContext(AppContext);
  const navigate = useNavigate(); // Add hook
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLButtonElement>(null); // For click outside logic if needed

  // Badge Modals
  const [showStampsModal, setShowStampsModal] = useState(false);
  const [congratsBadge, setCongratsBadge] = useState<Stamp | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State

  // Mock Stamps Data
  const mockStamps = [
    { id: 1, name: 'Maratonista', description: 'Assistiu 5 séries seguidas', icon: 'directions_run', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 2, name: 'Crítico', description: 'Fez 10 reviews detalhados', icon: 'rate_review', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 3, name: 'Social', description: 'Ganhou 50 seguidores', icon: 'group', color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 4, name: 'Viciado', description: 'Passou 24h assistindo', icon: 'timer', color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 5, name: 'Colecionador', description: 'Desbloqueou 10 selos', icon: 'military_tech', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  // Fetch Notifications
  useEffect(() => {
    if (user?.id) {
      ProfileService.getNotifications(user.id).then(data => {
        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter((n: any) => !n.read).length);
        }
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
      try {
        const results = await ProfileService.searchUsers(query);
        setSearchResults(results as any);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const goToProfile = (userId: string) => {
    navigate(`/user/${userId}`);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleMarkAllRead = async () => {
    if (user?.id) {
      await ProfileService.markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };



  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      // Mark as read
      await ProfileService.markNotificationRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Badge Notification Logic (earned or purchased)
    if ((notification.type === 'badge_earned' || notification.type === 'system') && notification.link?.startsWith('badge:')) {
      const badgeId = notification.link.split(':')[1];
      // Fetch badge details
      // Since we don't have a direct "getStampById" in AdminService (only getAll), we can query here quickly
      // or just use supabase client directly
      supabase.from('stamps').select('*').eq('id', badgeId).single().then(({ data }) => {
        if (data) {
          setCongratsBadge(data as Stamp);
          setShowNotifications(false);
        }
      });
      return;
    }

    // Logic for other notification types
    setShowNotifications(false);
    
    if (notification.type === 'follow' && notification.actor_id) {
       navigate(`/user/${notification.actor_id}`);
    } else if (notification.link) {
       navigate(notification.link);
    } else if (['mention', 'like', 'comment'].includes(notification.type)) {
       // Fallback if no link is present (for old notifications)
       navigate('/feed');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Itens do menu para reutilização
  const navItems = [
    { id: 'feed', path: '/feed', icon: 'home', label: 'Início' },
    { id: 'clubes', path: '/clubes', icon: 'groups', label: 'Clubes' },
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-900 dark:text-white p-1"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>

            <Link to="/feed" className="flex items-center gap-2 sm:gap-3 text-slate-900 dark:text-white cursor-pointer group shrink-0">
              <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] group-hover:text-primary transition-colors">
                {page === 'market' ? 'maratonando' : 'maratonando'}
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
                  placeholder="Buscar usuários..."
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>

              {/* Dropdown de Resultados (USUÁRIOS) */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-50">
                  {searchResults.map((result: any) => (
                    <div
                      key={result.id}
                      onClick={() => goToProfile(result.id)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${result.avatar}')` }}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{result.name}</h4>
                        <span className="text-xs text-slate-500 dark:text-text-secondary">{result.handle}</span>
                      </div>
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
              <Link to="/clubes" className={`text-sm font-medium transition-colors ${isActive('/clubes') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'}`}>Clubes</Link>
              <Link to="/market" className={`text-sm font-medium transition-colors ${isActive('/market') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'}`}>Mercado</Link>
              <Link to="/profile" className={`text-sm font-medium transition-colors ${isActive('/profile') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'}`}>Perfil</Link>
              <Link to="/search" className={`text-sm font-medium transition-colors ${isActive('/search') ? 'text-primary' : 'text-slate-600 dark:text-white/70 hover:text-primary'} flex items-center gap-1`}>
                Buscar Série
              </Link>
            </nav>

            <div className="flex gap-2 sm:gap-3 items-center">
              {/* Coins Display */}
              <div className="flex items-center bg-gray-100 dark:bg-[#362348] rounded-lg px-2 py-1 h-10 border border-transparent dark:border-white/5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mr-1">{coins.toLocaleString()}</span>
                <span className="text-sm">🪙</span>
              </div>

              <Link
                to="/settings"
                className={`hidden md:flex size - 10 cursor - pointer items - center justify - center rounded - lg transition - colors relative ${isActive('/settings') ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] text-slate-700 dark:text-white'} `}
              >
                <span className="material-symbols-outlined text-xl">settings</span>
              </Link>

              {/* Admin Button */}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`hidden md:flex size - 10 cursor - pointer items - center justify - center rounded - lg transition - colors bg - red - 500 / 10 hover: bg - red - 500 / 20 text - red - 600 dark: text - red - 400`}
                  title="Painel Admin"
                >
                  <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                </Link>
              )}

              {/* Stamps Button */}
              <button
                onClick={() => setShowStampsModal(true)}
                className="hidden md:flex size-10 cursor-pointer items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-500/10 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 transition-colors border border-transparent dark:border-white/5"
                title="Meus Selos"
              >
                <span className="material-symbols-outlined text-xl">military_tech</span>
              </button>

              {/* Notifications Button */}
              <div className="relative">
                <button
                  ref={notifRef}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="size-10 cursor-pointer flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] text-slate-700 dark:text-white transition-colors relative"
                >
                  <span className="material-symbols-outlined text-xl">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-gray-100 dark:border-[#362348]"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#1a1122] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Notificações</h3>
                        {unreadCount > 0 && (
                           <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                      </div>
                      <div className="flex gap-3 items-center">
                        {notifications.length > 0 && (
                          <>
                            <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleMarkAllRead();
                                }}
                                className="text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
                            >
                                Lidas
                            </button>
                            <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (user?.id) {
                                      await ProfileService.deleteAllNotifications(user.id);
                                      setNotifications([]);
                                      setUnreadCount(0);
                                  }
                                }}
                                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                            >
                                Limpar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                      {notifications.length > 0 ? (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 flex gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0 relative group ${!notif.read ? 'bg-primary/5 dark:bg-primary/5' : ''}`}
                          >
                             {!notif.read && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                             )}
                            <div className="size-10 rounded-full bg-gray-200 dark:bg-white/10 shrink-0 overflow-hidden ring-2 ring-white dark:ring-[#1a1122] shadow-sm">
                                {notif.actor?.avatar ? (
                                    <img src={notif.actor.avatar} alt={notif.actor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        <span className="material-symbols-outlined text-sm">person</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-600 dark:text-gray-300 leading-snug">
                                <span className="font-bold text-slate-900 dark:text-white mr-1">{notif.actor?.name || 'Alguém'}</span>
                                {notif.content}
                              </p>
                              <span className="text-xs text-slate-400 dark:text-gray-500 mt-1.5 block font-medium">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 px-6 text-center">
                           <div className="size-16 mx-auto bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <span className="material-symbols-outlined text-3xl">notifications_off</span>
                           </div>
                           <p className="text-slate-900 dark:text-white font-bold mb-1">Nada por aqui</p>
                           <p className="text-sm text-slate-500 dark:text-text-secondary">Você não tem novas notificações no momento.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div >

              <div className="relative group/profile">
                <Link to="/profile" className="hidden md:flex size-10 cursor-pointer items-center justify-center rounded-lg bg-gray-100 dark:bg-[#362348] hover:bg-gray-200 dark:hover:bg-[#432b5a] text-white transition-colors overflow-hidden border border-gray-200 dark:border-white/10 relative z-10">
                  <div
                    className="size-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${user.avatar}')` }}
                  ></div>
                </Link>
                {/* Logout Dropdown */}
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 z-50">
                  <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden w-40">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5">
                      Meu Perfil
                    </Link>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        // window.location.reload(); // Removido
                        window.location.href = '/'; // Forçar redirect para login
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </div >
          </div >
        </div >
      </header >

      {/* Mobile Bottom Navigation Bar */}
      < nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1122] border-t border-gray-200 dark:border-white/10 pb-safe" >
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
      </nav >
      {/* Spacer para garantir que o conteúdo não fique escondido atrás da barra no mobile */}
      < div className="h-0 md:hidden pb-safe" ></div >

      {/* Mobile Sidebar (Drawer) */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 z-[70] w-[280px] bg-white dark:bg-[#1a1122] shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col gap-4 bg-gray-50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-cover bg-center ring-2 ring-primary/50" style={{ backgroundImage: `url('${user?.avatar}')` }}></div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{user?.name}</span>
              <span className="text-xs text-slate-500 dark:text-text-secondary">{user?.handle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-black/20 rounded-lg p-2 border border-gray-100 dark:border-white/5 w-fit">
            <span className="text-sm font-bold text-slate-900 dark:text-white">{coins.toLocaleString()}</span>
            <span className="text-sm">🪙</span>
          </div>
        </div>

        {/* Drawer Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {/* Navigation Links */}
          {navItems.map(item => (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(item.path) ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive(item.path) ? 'filled' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="my-2 border-t border-gray-100 dark:border-white/5 mx-2"></div>

          {/* Actions */}
          <button
            onClick={() => {
              setShowStampsModal(true);
              setIsSidebarOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">military_tech</span>
            <span className="font-bold">Meus Selos</span>
          </button>

          <Link
            to="/search"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">search</span>
            <span>Buscar Série</span>
          </Link>

          {/* Admin  Mobile */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              <span className="font-bold">Painel Admin</span>
            </Link>
          )}

          <div className="flex-1"></div>

          <div className="my-2 border-t border-gray-100 dark:border-white/5 mx-2"></div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/'; 
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">logout</span>
            <span className="font-bold">Sair da Conta</span>
          </button>
        </div>
      </div>

      {/* Stamps Modal */}
      <StampsModal
        isOpen={showStampsModal}
        onClose={() => setShowStampsModal(false)}
      />

      {/* Congrats Modal */}
      {congratsBadge && (
        <CongratsModal
          stamp={congratsBadge}
          onClose={() => setCongratsBadge(null)}
          onViewCollection={() => {
            setCongratsBadge(null);
            setShowStampsModal(true);
          }}
        />
      )}
    </>
  );
};

export default Navigation;