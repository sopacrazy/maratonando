import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { ProfileTheme } from '../types';
import { ProfileService } from '../services/profileService';

const SettingsPage: React.FC = () => {
  const { user, updateUser, theme, toggleTheme } = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Aqui poderia limpar o estado do usuário, mas como é mockado, apenas redirecionamos
    navigate('/');
  };

  // Estado local para o formulário
  const [formData, setFormData] = useState({
    name: user.name,
    handle: user.handle,
    bio: user.bio || '',
    avatar: user.avatar,
    profileTheme: user.profileTheme || 'default'
  });

  // Privacy Settings State
  const [privacySettings, setPrivacySettings] = useState({
    allowFollow: user.privacy_settings?.allow_follow ?? true,
    requireFollowApproval: user.privacy_settings?.require_follow_approval ?? false,
    profileVisibility: {
      watching: user.privacy_settings?.profile_visibility?.watching ?? 'public',
      recommendations: user.privacy_settings?.profile_visibility?.recommendations ?? 'public',
      stamps: user.privacy_settings?.profile_visibility?.stamps ?? 'public',
      posts: user.privacy_settings?.profile_visibility?.posts ?? 'public'
    },
    allowMessages: user.privacy_settings?.allow_messages ?? 'everyone'
  });

  // Sync privacy settings when user data changes
  React.useEffect(() => {
    if (user.privacy_settings) {
      setPrivacySettings({
        allowFollow: user.privacy_settings.allow_follow ?? true,
        requireFollowApproval: user.privacy_settings.require_follow_approval ?? false,
        profileVisibility: {
          watching: user.privacy_settings.profile_visibility?.watching ?? 'public',
          recommendations: user.privacy_settings.profile_visibility?.recommendations ?? 'public',
          stamps: user.privacy_settings.profile_visibility?.stamps ?? 'public',
          posts: user.privacy_settings.profile_visibility?.posts ?? 'public'
        },
        allowMessages: user.privacy_settings.allow_messages ?? 'everyone'
      });
    }
  }, [user.privacy_settings]);

  // Ensure we display loading or disable save if user.id is missing
  const isUserLoaded = !!user.id;

  // Atualizar form data quando o usuário carregar (ex: refresh da página)
  React.useEffect(() => {
    if (user.id) { // Só atualiza se tivermos um usuário carregado (id presente)
      setFormData(prev => ({
        ...prev,
        name: user.name,
        handle: user.handle,
        bio: user.bio || '',
        avatar: user.avatar,
        profileTheme: user.profileTheme || 'default'
      }));
    }
  }, [user]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleThemeSelect = (theme: ProfileTheme) => {
    setFormData(prev => ({ ...prev, profileTheme: theme }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let avatarUrl = formData.avatar;

      if (selectedFile && user.id) {
        try {
          avatarUrl = await ProfileService.uploadAvatar(user.id, selectedFile);
          // alert(`Debug: Avatar Uploadado: ${avatarUrl}`);
        } catch (uploadErr) {
          console.error('Erro upload avatar:', uploadErr);
          alert('Erro ao fazer upload da imagem. Verifique se é uma imagem válida.');
          setSaving(false);
          return;
        }
      }

      const updates = {
        name: formData.name,
        handle: formData.handle,
        bio: formData.bio,
        avatar: avatarUrl,
        profile_theme: formData.profileTheme // Db column is snake_case
      };



      // Persistir no Supabase
      if (user.id) {
        // cast updates to any to avoid TS conflict
        await ProfileService.updateProfile(user.id, updates as any);

        // VERIFICAÇÃO DUPLA: Buscar o perfil atualizado do banco para garantir que salvou
        const freshProfile = await ProfileService.getProfile(user.id);
        if (freshProfile) {

          // Atualizar contexto com o que REALMENTE está no banco
          updateUser({
            ...freshProfile,
            id: user.id,
            profileTheme: freshProfile.profile_theme
          });

          // Verificar se o avatar bate
          if (avatarUrl && freshProfile.avatar !== avatarUrl) {
            alert('Aviso: A imagem pode não ter sido salva corretamente. Tente novamente.');
          } else {
            alert('Perfil atualizado com sucesso!');
          }
        }
      } else {
        alert('Erro: ID de usuário não encontrado. Recarregue a página.');
        setSaving(false);
        return;
      }

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      alert('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col transition-colors duration-300 pb-20 md:pb-0">
      <Navigation page="settings" />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Configurações</h1>

        {/* Seção de Aparência do APP */}
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-border-dark mb-8 transition-colors duration-300">
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
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-border-dark mb-8 transition-colors duration-300">
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
              className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all ${formData.profileTheme === 'default'
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Padrão</span>
                {formData.profileTheme === 'default' && <span className="material-symbols-outlined text-primary">check_circle</span>}
              </div>
              <div className="h-16 bg-gray-200 dark:bg-background-dark rounded-lg w-full"></div>
            </div>

            {/* Opção Gelo */}
            <div
              onClick={() => handleThemeSelect('ice')}
              className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden transition-all ${formData.profileTheme === 'ice'
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
              <div className="h-16 bg-gradient-to-b from-blue-100 to-white dark:from-background-dark dark:to-surface-dark rounded-lg w-full relative overflow-hidden border border-blue-200 dark:border-blue-900">
                <div className="absolute top-0 left-0 right-0 h-4 bg-white/40 blur-sm"></div>
                <div className="absolute top-2 left-4 text-xs">❄️</div>
                <div className="absolute top-6 right-8 text-xs">❄️</div>
              </div>
            </div>
          </div>
        </section>

        {/* Seção de Privacidade */}
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-border-dark mb-8 transition-colors duration-300">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">lock</span>
            Privacidade
          </h2>

          <div className="space-y-6">
            {/* Controle de Seguidores */}
            <div className="pb-6 border-b border-gray-200 dark:border-border-dark">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-blue-500">group</span>
                Controle de Seguidores
              </h3>
              
              <div className="space-y-4">
                {/* Permitir ser seguido */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Permitir que me sigam</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Outros usuários podem seguir seu perfil</p>
                  </div>
                  <button
                    onClick={() => setPrivacySettings(prev => ({ ...prev, allowFollow: !prev.allowFollow }))}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-surface-dark ${privacySettings.allowFollow ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${privacySettings.allowFollow ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Aprovar seguidores */}
                <div className={`flex items-center justify-between ${!privacySettings.allowFollow ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Aprovar seguidores manualmente</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Você precisa aceitar cada solicitação de seguidor</p>
                  </div>
                  <button
                    onClick={() => setPrivacySettings(prev => ({ ...prev, requireFollowApproval: !prev.requireFollowApproval }))}
                    disabled={!privacySettings.allowFollow}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-surface-dark ${privacySettings.requireFollowApproval ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${privacySettings.requireFollowApproval ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Visibilidade do Perfil */}
            <div className="pb-6 border-b border-gray-200 dark:border-border-dark">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-purple-500">visibility</span>
                Visibilidade do Perfil
              </h3>
              <p className="text-sm text-gray-500 dark:text-text-secondary mb-4">
                Escolha quem pode ver cada seção do seu perfil
              </p>

              <div className="space-y-4">
                {/* Acompanhando */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Acompanhando</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Séries que você está assistindo</p>
                  </div>
                  <select
                    value={privacySettings.profileVisibility.watching}
                    onChange={(e) => setPrivacySettings(prev => ({
                      ...prev,
                      profileVisibility: { ...prev.profileVisibility, watching: e.target.value as any }
                    }))}
                    className="bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                  >
                    <option value="public">Todos</option>
                    <option value="followers">Apenas Seguidores</option>
                    <option value="private">Privado</option>
                  </select>
                </div>

                {/* Minhas Recomendações */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Minhas Recomendações</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Suas avaliações e reviews</p>
                  </div>
                  <select
                    value={privacySettings.profileVisibility.recommendations}
                    onChange={(e) => setPrivacySettings(prev => ({
                      ...prev,
                      profileVisibility: { ...prev.profileVisibility, recommendations: e.target.value as any }
                    }))}
                    className="bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                  >
                    <option value="public">Todos</option>
                    <option value="followers">Apenas Seguidores</option>
                    <option value="private">Privado</option>
                  </select>
                </div>

                {/* Selos */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Selos</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Suas conquistas e badges</p>
                  </div>
                  <select
                    value={privacySettings.profileVisibility.stamps}
                    onChange={(e) => setPrivacySettings(prev => ({
                      ...prev,
                      profileVisibility: { ...prev.profileVisibility, stamps: e.target.value as any }
                    }))}
                    className="bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                  >
                    <option value="public">Todos</option>
                    <option value="followers">Apenas Seguidores</option>
                    <option value="private">Privado</option>
                  </select>
                </div>

                {/* Publicações */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Publicações</p>
                    <p className="text-sm text-gray-500 dark:text-text-secondary">Seus posts no feed</p>
                  </div>
                  <select
                    value={privacySettings.profileVisibility.posts}
                    onChange={(e) => setPrivacySettings(prev => ({
                      ...prev,
                      profileVisibility: { ...prev.profileVisibility, posts: e.target.value as any }
                    }))}
                    className="bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                  >
                    <option value="public">Todos</option>
                    <option value="followers">Apenas Seguidores</option>
                    <option value="private">Privado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-green-500">mail</span>
                Mensagens
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">Quem pode me enviar mensagens</p>
                  <p className="text-sm text-gray-500 dark:text-text-secondary">Controle quem pode iniciar conversas com você</p>
                </div>
                <select
                  value={privacySettings.allowMessages}
                  onChange={(e) => setPrivacySettings(prev => ({ ...prev, allowMessages: e.target.value as any }))}
                  className="bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                >
                  <option value="everyone">Todos</option>
                  <option value="followers">Apenas Seguidores</option>
                  <option value="none">Ninguém (Bloqueado)</option>
                </select>
              </div>
            </div>

            {/* Botão Salvar Privacidade */}
            <div className="pt-4 border-t border-gray-200 dark:border-border-dark">
              <button
                onClick={async () => {
                  if (!user.id) {
                    alert('Erro: Usuário não identificado');
                    return;
                  }

                  try {
                    const privacyData = {
                      privacy_settings: {
                        allow_follow: privacySettings.allowFollow,
                        require_follow_approval: privacySettings.requireFollowApproval,
                        profile_visibility: {
                          watching: privacySettings.profileVisibility.watching,
                          recommendations: privacySettings.profileVisibility.recommendations,
                          stamps: privacySettings.profileVisibility.stamps,
                          posts: privacySettings.profileVisibility.posts
                        },
                        allow_messages: privacySettings.allowMessages
                      }
                    };

                    await ProfileService.updateProfile(user.id, privacyData as any);
                    
                    // Update context
                    updateUser({
                      ...user,
                      privacy_settings: privacyData.privacy_settings
                    });

                    alert('Configurações de privacidade salvas com sucesso!');
                  } catch (error) {
                    console.error('Erro ao salvar privacidade:', error);
                    alert('Erro ao salvar configurações de privacidade.');
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                Salvar Configurações de Privacidade
              </button>
            </div>
          </div>
        </section>

        {/* Seção de Perfil */}
        <section className="bg-white dark:bg-surface-dark rounded-xl p-6 shadow-sm border border-gray-200 dark:border-border-dark transition-colors duration-300">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            Editar Dados Pessoais
          </h2>

          <form onSubmit={handleSave} className="space-y-6">

            {/* Foto de Perfil */}
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center sm:flex-row gap-6">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                <div className="size-24 rounded-full bg-cover bg-center border-4 border-gray-100 dark:border-border-dark" style={{ backgroundImage: `url('${formData.avatar}')` }}></div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      // Preview local imediato
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sua Foto</h3>
                <p className="text-sm text-gray-500 dark:text-text-secondary mb-2">Clique na foto para alterar.</p>
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
                  className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Usuário (Handle)</label>
                <input
                  type="text"
                  name="handle"
                  value={formData.handle}
                  onChange={handleChange}
                  className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
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
                className="w-full bg-gray-50 dark:bg-background-dark border border-gray-300 dark:border-border-dark rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-primary focus:border-primary resize-none"
                placeholder="Conte um pouco sobre suas séries favoritas..."
              ></textarea>
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{formData.bio.length}/160</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-border-dark flex justify-between gap-4">
              <button
                type="button"
                onClick={handleLogout}
                className="px-6 py-2 border border-red-200 text-red-600 dark:text-red-400 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Sair da Conta
              </button>
              <div className="flex gap-4">
                <button type="button" className="px-6 py-2 text-slate-700 dark:text-white font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving || !isUserLoaded} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>

          </form>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;