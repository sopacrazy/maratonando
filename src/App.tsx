import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { ProfileService } from './services/profileService';
import { User, SeriesReview } from './types';
import { ChatProvider } from './context/ChatContext';
import { ErrorProvider } from './context/ErrorContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ChatSystem } from './components/Chat/ChatSystem';
import OnboardingManager from './components/Onboarding/OnboardingManager';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy loading de páginas para melhor performance
const LoginPage = lazy(() => import('./pages/Login'));
const FeedPage = lazy(() => import('./pages/Feed'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const MarketplacePage = lazy(() => import('./pages/Marketplace'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const SeriesSearchPage = lazy(() => import('./pages/SeriesSearch'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfile'));
const HandleRedirect = lazy(() => import('./pages/HandleRedirect'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const SeriesDetailsPage = lazy(() => import('./pages/Series/SeriesDetails'));
const ClubesPage = lazy(() => import('./pages/Clubes'));
const ClubDetailsPage = lazy(() => import('./pages/Clubes/ClubDetails'));
const ArenaPage = lazy(() => import('./pages/Clubes/Arena'));

// Componente de loading para Suspense
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
    <div className="text-center">
      <span className="material-symbols-outlined text-6xl text-primary animate-spin" style={{ fontVariationSettings: '"FILL" 0' }}>progress_activity</span>
      <p className="mt-4 text-slate-600 dark:text-text-secondary font-medium">Carregando...</p>
    </div>
  </div>
);
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
  coins: 0,
  setCoins: () => { },
  theme: 'light',
  toggleTheme: () => { },
  user: { name: '', handle: '', avatar: '' },
  updateUser: () => { },
  addSeriesReview: () => { }
});

export default function App() {
  const [coins, setCoins] = useState(0);
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
              setUser(prev => ({
                ...prev,
                ...profile,
                id: session.user.id, // Ensure ID is set
                profileTheme: profile.profile_theme // Map database snake_case to camelCase
              }));
              setCoins(profile.coins || 0);
            }
          })
          .catch(err => {
            console.error('Erro ao carregar perfil:', err);
            // Fallback para dados da sessão se não tiver perfil
            setUser(prev => ({
              ...prev,
              id: session.user.id, // Ensure ID is set even in fallback
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
            setUser(prev => ({
              ...prev,
              ...profile,
              id: session.user.id, // Explicitly set ID
              profileTheme: profile.profile_theme // Map theme
            }));
            setCoins(profile.coins || 0);
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
    <ErrorBoundary>
      <ErrorProvider>
        <AppContext.Provider value={{ coins, setCoins, theme, toggleTheme, user, updateUser, addSeriesReview }}>
          <ChatProvider>
            <HashRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  {/* Rotas públicas - apenas perfil público */}
                  <Route path="/user/:userId" element={<PublicProfilePage />} />
                  {/* Rotas protegidas - requerem autenticação */}
                  <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/market" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/search" element={<ProtectedRoute><SeriesSearchPage /></ProtectedRoute>} />
                  <Route path="/@:handle" element={<ProtectedRoute><HandleRedirect /></ProtectedRoute>} />
                  <Route path="/series/:id" element={<ProtectedRoute><SeriesDetailsPage /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                  <Route path="/clubes" element={<ProtectedRoute><ClubesPage /></ProtectedRoute>} />
                  <Route path="/clubes/:id" element={<ProtectedRoute><ClubDetailsPage /></ProtectedRoute>} />
                  <Route path="/clubes/:id/arena" element={<ProtectedRoute><ArenaPage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <ChatSystem />
              <OnboardingManager />
            </HashRouter>
          </ChatProvider>
        </AppContext.Provider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}