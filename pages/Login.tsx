import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { ProfileService } from '../src/services/profileService';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Novo estado

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let result;
    if (isSignUp) {
        result = await supabase.auth.signUp({
            email,
            password,
        });
    } else {
        result = await supabase.auth.signInWithPassword({
            email,
            password,
        });
    }

    const { data, error } = result;
    setLoading(false);

    if (error) {
      alert('Erro: ' + error.message);
    } else {
      if (isSignUp) {
          // Criar perfil com dados básicos
          if (data?.user) {
              try {
                  await ProfileService.createProfile(data.user.id, email);
                  alert('Cadastro realizado! Faça login para entrar.');
                  setIsSignUp(false);
              } catch (profileError) {
                  console.error(profileError);
                  alert('Conta criada, mas houve um erro ao criar o perfil. Entre em contato com o suporte.');
              }
          }
      } else {
          navigate('/feed');
      }
    }
  };

  return (
    <div className="min-h-screen flex w-full font-display bg-background-light dark:bg-background-dark text-gray-900 dark:text-white antialiased overflow-x-hidden transition-colors duration-300">
      {/* Left Side: Visuals (Desktop only) */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-dark items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Dark moody cinema theater interior" 
            className="w-full h-full object-cover opacity-50 mix-blend-overlay" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy4OyNEb6YfOf0sLtChNsILizC3JkhsE1E_bt26QsFNby718zTI1A2xfqF1-N3kt8rMuzEstojRvZc0fKcloa_8xK7cvF4qPrEEwtTKS2q4D2HasVmT4XETaGMW8ejw5FKQUYCjDImOpvJZUj8cF5xBrzYnq2LLXjSuRR37x-34A-Lc3iEmfyAjJZoDOS3JQGRkStYfvJUtd7p2_7tEboPinFI2ETnBOuwC4wViAW300LasUm_YmkehNdnCcfMWQC1HB24ZwUlAFWg"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/80 to-primary/20 mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center p-12 max-w-lg">
          <div className="size-24 mb-6 text-primary bg-background-dark/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl ring-1 ring-white/5">
            <svg className="size-14" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"></path>
            </svg>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 mb-2 tracking-tighter drop-shadow-sm">Maratonei</h1>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 tracking-tight leading-tight drop-shadow-md">Onde você é o crítico.</h2>
          <p className="text-lg text-gray-200/90 font-medium leading-relaxed max-w-md">Esqueça os agregadores comuns. Aqui, sua opinião define o hype. Avalie, debata e transforme sua maratona em influência.</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12 lg:px-20 bg-background-light dark:bg-background-dark relative">
        <div className="lg:hidden flex items-center gap-3 mb-10 text-primary">
          <div className="size-10">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"></path>
            </svg>
          </div>
          <span className="font-bold text-2xl text-gray-900 dark:text-white tracking-tight">Maratonei</span>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                {isSignUp ? 'Crie sua conta' : 'Bem-vindo de volta!'}
            </h1>
            <p className="text-gray-600 dark:text-text-muted text-base">
                {isSignUp ? 'Junte-se a comunidade de críticos.' : 'Conecte-se com outros fãs de séries.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white ml-1">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 dark:text-text-muted group-focus-within:text-primary transition-colors">mail</span>
                </div>
                <input 
                  className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                  placeholder="ex: usuario@email.com" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="block text-sm font-medium text-gray-900 dark:text-white">Senha</label>
               {!isSignUp && (
                 <a className="text-sm font-medium text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline" href="#">Esqueci minha senha</a>
               )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 dark:text-text-muted group-focus-within:text-primary transition-colors">lock</span>
                </div>
                <input 
                  className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                  placeholder="Digite sua senha" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-text-muted hover:text-gray-600 dark:hover:text-white focus:outline-none transition-colors" type="button">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>visibility_off</span>
                </button>
              </div>
            </div>

            <button 
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/25 text-base font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background-dark transition-all duration-200 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-border-dark"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background-light dark:bg-background-dark text-gray-500 dark:text-text-muted font-medium">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center px-4 py-3 border border-gray-200 dark:border-border-dark rounded-xl bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-[#342445] transition-colors duration-200 group" type="button">
                <img 
                  alt="Google" 
                  className="h-5 w-5 mr-2 opacity-90 group-hover:opacity-100 transition-opacity" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBI9sLVtA_S65sdbvWTEyNdYZHXA_bpukuXHesebomQeiETPtwM_Xk79o5r_nZsvxc6wSFhg3-DPl49-RwaftiNTbINraetOKDVcHTtb0WCWGzTQTTDL3bQz4S5GyP9WpzoqoF-QwGlXHkxlBoi-C9raCR4j8OFNTXCUwTtLfUAQ2DsjENBtZzjrbn4WkDFqdsHLMRcRhyBXE9ijIWosdmkUdohqE5jgN1BnUdsS4zB8iCzrGrBW13a7-gQ39RuoWNMgrczEsTvMUI0"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Google</span>
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-200 dark:border-border-dark rounded-xl bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-[#342445] transition-colors duration-200 group" type="button">
                <span className="material-symbols-outlined text-gray-900 dark:text-white mr-2 opacity-90 group-hover:opacity-100" style={{ fontSize: '22px' }}>ios</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Apple</span>
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-gray-600 dark:text-text-muted">
            {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
            <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-bold text-primary hover:text-primary/80 transition-colors ml-1 focus:outline-none"
            >
                {isSignUp ? 'Fazer Login' : 'Criar conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

// export default LoginPage; removido duplicado