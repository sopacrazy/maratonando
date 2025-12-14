import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './src/lib/supabase';
import { ProfileService } from './src/services/profileService';
import LoginPage from './pages/Login';
import FeedPage from './pages/Feed';
import ProfilePage from './pages/Profile';
import MarketplacePage from './pages/Marketplace';
import SettingsPage from './pages/Settings';
import { User, SeriesReview } from './types';

// Contexto global expandido
export const AppContext = React.createContext<{
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: User;
  updateUser: (updates: Partial<User>) => void;
  addSeriesReview: (review: SeriesReview) => void;
}>({ 
  coins: 2450, 
  setCoins: () => {},
  theme: 'light',
  toggleTheme: () => {},
  user: { name: '', handle: '', avatar: '' },
  updateUser: () => {},
  addSeriesReview: () => {}
});

export default function App() {
  const [coins, setCoins] = useState(2450);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Estado do Usuário Logado com dados iniciais
  // Inicialmente null até verificar sessão
  const [user, setUser] = useState<User>({
     name: 'Visitante',
     handle: '',
     avatar: 'https://placeholder.pics/svg/150',
     bio: '',
     watchedSeries: []
  });

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
         // Carregar dados reais do perfil
         ProfileService.getProfile(session.user.id)
            .then(profile => {
                if (profile) {
                    setUser(prev => ({ ...prev, ...profile }));
                    setCoins(profile.coins || 2450);
                    if (profile.profile_theme) {
                        // Poderíamos aplicar o tema do perfil aqui se desejado
                    }
                }
            })
            .catch(err => {
                console.error('Erro ao carregar perfil:', err);
                // Fallback para dados da sessão se não tiver perfil
                setUser(prev => ({ 
                    ...prev, 
                    name: session.user.email?.split('@')[0] || 'User', 
                    handle: session.user.email || '' 
                }));
            });
      }
    });

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
         ProfileService.getProfile(session.user.id).then(profile => {
             if (profile) {
                 setUser(prev => ({ ...prev, ...profile }));
                 setCoins(profile.coins || 2450);
             }
         });
      } else {
         // Reset ou redirect poderia acontecer aqui
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const addSeriesReview = (review: SeriesReview) => {
    setUser(prev => ({
      ...prev,
      watchedSeries: [review, ...(prev.watchedSeries || [])]
    }));
  };

  return (
    <AppContext.Provider value={{ coins, setCoins, theme, toggleTheme, user, updateUser, addSeriesReview }}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/market" element={<MarketplacePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}