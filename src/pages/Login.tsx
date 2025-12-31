import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ProfileService } from '../services/profileService';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  // Credenciais de teste pré-preenchidas
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (isSignUp) {
        if (password !== confirmPassword) {
            setError('As senhas não coincidem!');
            setLoading(false);
            return;
        }

        const hasNumber = /\d/.test(password);
        if (password.length < 6 || !hasNumber) {
            setError('A senha deve ter no mínimo 6 caracteres e conter pelo menos um número.');
            setLoading(false);
            return;
        }
    }
    
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

    const { data, error: authError } = result;
    setLoading(false);

    if (authError) {
      if (authError.message === 'User already registered') {
         setError('Este e-mail já está cadastrado. Tente fazer login.');
      } else if (authError.message === 'Invalid login credentials') {
         setError('E-mail ou senha incorretos.');
      } else {
         setError('Erro: ' + authError.message);
      }
    } else {
      if (isSignUp) {
          if (data?.user) {
              try {
                  await ProfileService.createProfile(data.user.id, email);
                  // Forçar logout para que o usuário faça login manualmente
                  await supabase.auth.signOut();
                  setSuccess('Cadastro realizado com sucesso! Faça login para entrar.');
                  setIsSignUp(false);
              } catch (profileError) {
                  console.error(profileError);
                  setError('Conta criada, mas houve um erro ao criar o perfil. Entre em contato com o suporte.');
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

          <h1 className="text-5xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 mb-2 tracking-tighter drop-shadow-sm">maratonando</h1>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6 tracking-tight leading-tight drop-shadow-md">Onde você é o crítico.</h2>
          <p className="text-lg text-gray-200/90 font-medium leading-relaxed max-w-md">Esqueça os agregadores comuns. Aqui, sua opinião define o hype. Avalie, debata e transforme sua maratona em influência.</p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12 lg:px-20 bg-background-light dark:bg-background-dark relative">
        <div className="lg:hidden flex items-center gap-3 mb-10 text-primary">

          <span className="font-bold text-2xl text-gray-900 dark:text-white tracking-tight">maratonando</span>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                {isSignUp ? 'Crie sua conta' : 'Acesse sua conta'}
            </h1>
            <p className="text-gray-600 dark:text-text-muted text-base">
                {isSignUp ? 'Junte-se a comunidade de críticos.' : 'Conecte-se com outros fãs de séries.'}
            </p>
          </div>
        
          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 shrink-0">error</span>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 shrink-0">check_circle</span>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

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
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 dark:text-text-muted group-focus-within:text-primary transition-colors">lock</span>
                </div>
                <input 
                  className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                  placeholder="Digite sua senha" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button 
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-text-muted hover:text-gray-600 dark:hover:text-white focus:outline-none transition-colors" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                <label className="block text-sm font-medium text-gray-900 dark:text-white ml-1">Confirmar Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 dark:text-text-muted group-focus-within:text-primary transition-colors">lock_reset</span>
                  </div>
                  <input 
                    className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-surface-dark border border-gray-200 dark:border-border-dark rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200" 
                    placeholder="Confirme sua senha" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={isSignUp}
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button 
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/25 text-base font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background-dark transition-all duration-200 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
            </button>

            {!isSignUp && (
              <div className="flex justify-center mt-2">
                 <a className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Esqueci minha senha</a>
              </div>
            )}
          </form>

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