import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  theme: 'dark',
  toggleTheme: () => {},
  user: { name: '', handle: '', avatar: '' },
  updateUser: () => {},
  addSeriesReview: () => {}
});

export default function App() {
  const [coins, setCoins] = useState(2450);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Estado do Usuário Logado com dados iniciais
  const [user, setUser] = useState<User>({
    name: 'Fernanda Silva',
    handle: '@fernanda_series',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrQGhtY4i1s8y7omlVlPPQjQAG0dYUQojKeH_nCuLKpDdng3C16Ut3-KLhNx1i7CGpd6TzJLz7SCMybx2-52S2hqQbBuToWGiI3_HjD3XCWJv4RGq6NW0BEUWeRtJt7ci2O8Nl27N76HwT-oTueUu512PJb_apGa_-NYh05dkfWoYDUwtaUXy92XHVqM6i_L8klNF4aItW-h36uv-exk3pa3uN-ZNwGmVNTo8ENHQ-jC3xOqZXTEQOkGPZdZ4un4_scgAAAx8XC5vp',
    bio: 'Cinéfila, maratonista de séries e crítica amadora nas horas vagas. Apaixonada por sci-fi, mistérios e dramas históricos. Atualmente reassistindo Lost pela 3ª vez! ✈️🏝️',
    profileTheme: 'default', // Tema inicial
    watchedSeries: [
      {
        id: 1,
        title: 'Breaking Bad',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOlvDv-eVVWnD0BkYVw7Eok5g98nI4Bxq6vkgid_FwqNo3kbLK07BFSATLz0tIDcQ-qRMPqvDXOB02-Hwzllx2JPspQRPqQKbqzJajmFHCHoq0LrBPv6KVFYWO6-se3gQKWDsR3Hv_R8_xMRa235kQfgoqy7AxGGnIWLW9o_RuKV7Zjov6CA9SkQ1oW2q-n9QR2pP_2S6c_RVSVncr3GqQpvbY3rpZrY97M6cvCQAJtAlvS2-R6ER1sX-WLSOx-Xw1GczcLLJdSOtw',
        category: 'Recomendadas',
        comment: 'Simplesmente a melhor série já feita. Roteiro impecável.'
      },
      {
        id: 2,
        title: 'Emily in Paris',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCA81qhY1Mc5nRbdD90bN5q2SofhBRBNSVQmP50z8FxTyponHBnTAdGCwMfmvCal-klFyW9C8Skf7zowJQj0zmYCg--FVlpodNbNbIHgMf9QMM7c56nPhZFiH_3AfJUOL_wFYdLfxDLElAs5aQ3AvOuMuTQp6Un5OAn5Hee-hqs6Z4LC7UjKquGbvFLnhbDuTSFR4T1e9J1kGeFX3jzD_1C1q-Eeky5uR3znXotCf2Jlu8hHv7_35lsbt3eLWNoXNZBu4gvABVb989G',
        category: 'Passa tempo',
        comment: 'Roteiro fraco, mas as roupas são bonitas e distrai a cabeça.'
      },
      {
        id: 3,
        title: 'Velma',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsvJ0QMYynr88jNMFc6CkBXV80EDrmOxrrsTc2hFjoRNgRfK7sb5VBesdnqeHziJWvpEvDLYWsmuragrrCY5kRHYEg9SRwMTT49DyUBxgDWKt47JOxfCuATft-SVr06-895nnSdZF3P1MVFABQICdT58dUxOA6vAlcAcvLYKu0qrjdlprQPwgYQ9A9vhVBk-hyElzBSvlN0nzLuSfDf2_-0IbFF1EgpPWe4TiQEmx-LEbtISEWqc1lAnL5hljLgAt_3zNot4Z46YPD',
        category: 'Perdi meu tempo',
        comment: 'Descaracterizaram tudo. Não consegui passar do segundo episódio.'
      }
    ]
  });

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