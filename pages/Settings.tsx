import React, { useContext, useState } from 'react';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { ProfileTheme } from '../types';

const SettingsPage: React.FC = () => {
  const { user, updateUser, theme, toggleTheme } = useContext(AppContext);
  
  // Estado local para o formulário
  const [formData, setFormData] = useState({
    name: user.name,
    handle: user.handle,
    bio: user.bio || '',
    avatar: user.avatar,
    profileTheme: user.profileTheme || 'default'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleThemeSelect = (theme: ProfileTheme) => {
    setFormData(prev => ({ ...prev, profileTheme: theme }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(formData);
    alert('Perfil atualizado com sucesso!');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col transition-colors duration-300 pb-20 md:pb-0">
      <Navigation page="settings" />
      
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Configurações</h1>

        {/* Seção de Aparência do APP */}
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-[#362348] mb-8 transition-colors duration-300">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">palette</span>
                Aparência do App
            </h2>
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">Modo Escuro / Claro</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Altera as cores de toda a aplicação para você.</p>
                </div>
                
                <button 
                    onClick={toggleTheme}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-surface-dark ${theme === 'dark' ? 'bg-primary' : 'bg-gray-300'}`}
                >
                    <span 
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`}
                    >
                         {theme === 'dark' ? (
                            <span className="material-symbols-outlined text-primary text-[16px] absolute top-1 left-1">dark_mode</span>
                         ) : (
                            <span className="material-symbols-outlined text-yellow-500 text-[16px] absolute top-1 left-1">light_mode</span>
                         )}
                    </span>
                </button>
            </div>
        </section>

        {/* Seção de Decoração do Perfil */}
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-[#362348] mb-8 transition-colors duration-300">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">brush</span>
                Tema do Perfil Público
            </h2>
            <p className="text-sm text-gray-500 dark:text-text-secondary mb-4">
              Escolha como os outros usuários verão seu perfil.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {/* Opção Padrão */}
               <div 
                  onClick={() => handleThemeSelect('default')}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all ${
                    formData.profileTheme === 'default' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
               >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Padrão</span>
                    {formData.profileTheme === 'default' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                  </div>
                  <div className="h-16 bg-gray-200 dark:bg-[#1a1122] rounded-lg w-full"></div>
               </div>

               {/* Opção Gelo */}
               <div 
                  onClick={() => handleThemeSelect('ice')}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all ${
                    formData.profileTheme === 'ice' 
                      ? 'border-blue-400 bg-blue-500/10' 
                      : 'border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
               >
                  <div className="flex items-center justify-between relative z-10">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-blue-400 text-lg">ac_unit</span>
                      Gelo
                    </span>
                    {formData.profileTheme === 'ice' && <span className="material-symbols-outlined text-blue-400">check_circle</span>}
                  </div>
                  {/* Preview Visual do Gelo */}
                  <div className="h-16 bg-gradient-to-b from-blue-100 to-white dark:from-[#1a1122] dark:to-[#251633] rounded-lg w-full relative overflow-hidden border border-blue-200 dark:border-blue-900">
                      <div className="absolute top-0 left-0 right-0 h-4 bg-white/40 blur-sm"></div>
                      <div className="absolute top-2 left-4 text-xs">❄️</div>
                      <div className="absolute top-6 right-8 text-xs">❄️</div>
                  </div>
               </div>
            </div>
        </section>

        {/* Seção de Perfil */}
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-[#362348] transition-colors duration-300">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            Editar Dados Pessoais
          </h2>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center sm:flex-row gap-6">
                <div className="relative group cursor-pointer">
                    <div className="size-24 rounded-full bg-cover bg-center border-4 border-gray-100 dark:border-[#362348]" style={{ backgroundImage: `url('${formData.avatar}')` }}></div>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white">photo_camera</span>
                    </div>
                </div>
                <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">URL da Foto</label>
                    <input 
                        type="text" 
                        name="avatar"
                        value={formData.avatar}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-300 dark:border-[#4d3267] rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cole um link de imagem (ex: Google Photos, Imgur)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Nome de Exibição</label>
                    <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-300 dark:border-[#4d3267] rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Usuário (Handle)</label>
                    <input 
                        type="text" 
                        name="handle"
                        value={formData.handle}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-300 dark:border-[#4d3267] rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Bio</label>
                <textarea 
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-300 dark:border-[#4d3267] rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary resize-none"
                    placeholder="Conte um pouco sobre suas séries favoritas..."
                ></textarea>
                <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-500">{formData.bio.length}/160</span>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-[#362348] flex justify-end gap-4">
                <button type="button" className="px-6 py-2 text-slate-700 dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform active:scale-95">Salvar Alterações</button>
            </div>

          </form>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;