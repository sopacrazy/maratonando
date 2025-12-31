import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../App';
import { ProfileService } from '../../services/profileService';
import { UserSeriesService } from '../../services/userSeriesService';
import { TMDBService } from '../../services/tmdbService';
import { BadgeService } from '../../services/badgeService';
import { TMDBSeries, User } from '../../types';

interface OnboardingWizardProps {
    onComplete: () => void;
}

const steps = [
    {
        id: 'welcome',
        title: 'Bem-vindo ao maratonando!',
        description: 'Sua jornada no mundo das séries começa agora.'
    },
    {
        id: 'profile',
        title: 'Personalize seu Perfil',
        description: 'Diga ao mundo quem você é.'
    },
    {
        id: 'series',
        title: 'Suas Séries Favoritas',
        description: 'Adicione pelo menos 3 séries que você está acompanhando.'
    },
    {
        id: 'follow',
        title: 'Siga outros Cinéfilos',
        description: 'Descubra novas recomendações.'
    }
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
    const { user, updateUser } = useContext(AppContext);
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio === 'Novo na comunidade maratonando!' ? '' : user?.bio || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');

    // Series State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TMDBSeries[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<TMDBSeries[]>([]);

    // Follow State
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (currentStep === 3 && user?.id) {
            loadSuggestions();
        }
    }, [currentStep, user?.id]);

    const loadSuggestions = async () => {
        if (!user?.id) return;
        try {
            const users = await ProfileService.getSuggestions(user.id);
            setSuggestions(users as any);
        } catch (error) {
            console.error(error);
        }
    };


    // ... (states remain generic)

    const handleNext = async () => {
        if (!user?.id) return;
        
        // Validation per step (No API calls here anymore)
        if (currentStep === 1) { // Profile Step
             const finalBio = bio.trim();
             if (!name.trim()) {
                 alert('Por favor, escolha um nome de exibição.');
                 return;
             }
             if (!finalBio) {
                 alert('Por favor, escreva uma breve bio.');
                 return;
             }
        }
        else if (currentStep === 2) { // Series Step
            if (selectedSeries.length < 3) {
                alert('Por favor, adicione pelo menos 3 séries para continuar.');
                return;
            }
        }
        else if (currentStep === 3) { // Follow Step (Final)
             await saveData(); // Save everything now
             return;
        }

        setCurrentStep(prev => prev + 1);
        // Scroll to top
        window.scrollTo(0, 0);
    };

    const saveData = async () => {
        if (!user?.id) return;
        setLoading(true);

        try {
            // 1. Upload Avatar if changed
            let avatarUrl = user.avatar;
            if (avatarFile) {
                avatarUrl = await ProfileService.uploadAvatar(user.id, avatarFile);
            }
            
            // 2. Update Profile
            // Ensure bio is not the "trigger" default one if user left it blank previously (though we validate above)
            const finalBio = bio.trim() || 'Apaixonado por séries.';
            
            await ProfileService.updateProfile(user.id, {
                name,
                bio: finalBio,
                avatar: avatarUrl
            });
            
            // Update local context immediately to reflect changes
            updateUser({ name, bio: finalBio, avatar: avatarUrl });

            // 3. Add Series
            const seriesPromises = selectedSeries.map(series => 
                UserSeriesService.addSeries(user.id!, series, 'watching')
            );
            await Promise.all(seriesPromises);

            // 4. Follow Users
            // 4. Follow Users
            const followPromises = Array.from(followingIds).map(targetId => 
                ProfileService.followUser(user.id!, targetId)
            );
            await Promise.all(followPromises);

            // 5. Award Welcome Badge
            try {
                // Tenta pelo nome novo da marca
                let welcomeStamp = await BadgeService.awardBadgeByName(user.id, 'maratonando');
                
                // Se não achar, tenta pelo nome antigo (que está no print)
                if (!welcomeStamp) {
                     console.log('Badge "maratonando" não encontrado, tentando "Maratonei"...');
                     welcomeStamp = await BadgeService.awardBadgeByName(user.id, 'Maratonei');
                }

                if (!welcomeStamp) {
                    console.warn('⚠️ Nenhum selo de boas-vindas ("maratonando" ou "Maratonei") foi encontrado no banco.');
                }

                // Finish and Redirect with state
                onComplete();
                navigate('/feed', { state: { welcomeStamp } });
            } catch (error) {
                console.error('❌ Error awarding welcome badge:', error);
                // Continue onboarding even if badge fails
                onComplete();
                navigate('/feed');
            }

        } catch (error: any) {
            console.error('Error saving onboarding data:', error);
            alert('Houve um erro ao salvar seus dados. Por favor, verifique sua conexão e tente novamente no passo final.');
        } finally {
            setLoading(false);
        }
    };

    // ... (search logic remains)

    // Modified handleFollow to only update local Set, not API
    const handleFollowToggle = (targetId: string) => {
        setFollowingIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(targetId)) {
                newSet.delete(targetId);
            } else {
                newSet.add(targetId);
            }
            return newSet;
        });
    };

    const handleSearchSeries = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 2) {
            const results = await TMDBService.searchSeries(query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const toggleSeries = (series: TMDBSeries) => {
        if (selectedSeries.some(s => s.id === series.id)) {
            setSelectedSeries(prev => prev.filter(s => s.id !== series.id));
        } else {
            setSelectedSeries(prev => [...prev, series]);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Welcome
                return (
                    <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="size-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <span className="material-symbols-outlined text-5xl text-primary">celebration</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Bem-vindo à Aventura!</h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg">
                            O maratonando não é apenas um lugar para marcar o que você assistiu. É um RPG social para amantes de séries!
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-left mt-8">
                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-yellow-500">military_tech</span>
                                    <h4 className="font-bold text-gray-900 dark:text-white">Conquiste Selos</h4>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Desbloqueie selos de raridade <span className="text-gray-400 font-bold">Comum</span>, <span className="text-blue-400 font-bold">Raro</span>, <span className="text-purple-400 font-bold">Épico</span> e <span className="text-yellow-400 font-bold">Lendário</span>!
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-primary">stars</span>
                                    <h4 className="font-bold text-gray-900 dark:text-white">Seja Influente</h4>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Suas reviews importam. Ganhe moedas, suba de nível e torne-se um crítico renomado.
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 1: // Profile
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer">
                                <div className="size-32 rounded-full bg-cover bg-center border-4 border-white dark:border-[#1a1122] shadow-xl" style={{ backgroundImage: `url('${avatarPreview}')` }}></div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                                </div>
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setAvatarFile(e.target.files[0]);
                                            setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                                        }
                                    }}
                                />
                            </div>
                            <p className="text-sm text-gray-500">Toque para alterar a foto</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nome de Exibição</label>
                                <input 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-all dark:text-white"
                                    placeholder="Como quer ser chamado?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                                <textarea 
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-all min-h-[100px] resize-none dark:text-white"
                                    placeholder="Uma frase sobre seu gosto por séries..."
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2: // Series
                return (
                    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-right-8 duration-300">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Buscar Séries</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
                                <input 
                                    value={searchQuery}
                                    onChange={(e) => handleSearchSeries(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent focus:border-primary rounded-xl pl-10 pr-4 py-3 outline-none transition-all dark:text-white"
                                    placeholder="Digite o nome da série..."
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-[200px] pr-2">
                             {/* Selected Series Chips */}
                            {selectedSeries.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {selectedSeries.map(s => (
                                        <div key={s.id} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                                            {s.name}
                                            <button onClick={() => toggleSeries(s)} className="hover:text-red-500">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Search Results */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {searchResults.map(series => {
                                    const isSelected = selectedSeries.some(s => s.id === series.id);
                                    return (
                                        <div 
                                            key={series.id} 
                                            onClick={() => toggleSeries(series)}
                                            className={`relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer group transition-transform hover:scale-105 ${isSelected ? 'ring-4 ring-primary' : ''}`}
                                        >
                                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.poster_path)}')` }}></div>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-3xl">
                                                    {isSelected ? 'check_circle' : 'add_circle'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <p className="text-center text-sm text-gray-500">
                            Selecionadas: {selectedSeries.length} / 3 (Mínimo)
                        </p>
                    </div>
                );
            case 3: // Follow
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                            Siga alguns perfis para ver o que eles estão assistindo. (Opcional)
                        </p>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {suggestions.map(sUser => (
                                <div key={sUser.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${sUser.avatar}')` }}></div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{sUser.name}</p>
                                            <p className="text-xs text-gray-500">{sUser.handle}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleFollowToggle(sUser.id!)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${followingIds.has(sUser.id!) ? 'bg-green-500/10 text-green-500' : 'bg-primary text-white hover:bg-primary/90'}`}
                                    >
                                        {followingIds.has(sUser.id!) ? 'Seguindo' : 'Seguir'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-[#1a1122] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl flex flex-col h-full md:h-auto max-h-[90vh]">
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full mb-8 overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">{steps[currentStep].title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{steps[currentStep].description}</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-visible mb-8 md:min-h-[400px]">
                    {renderStepContent()}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100 dark:border-white/5">
                    <button 
                        onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                        className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold px-4 py-2 ${currentStep === 0 ? 'invisible' : ''}`}
                    >
                        Voltar
                    </button>
                    
                    <button 
                        onClick={handleNext}
                        disabled={loading || (currentStep === 2 && selectedSeries.length < 3)}
                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                        {currentStep === steps.length - 1 ? 'Concluir' : 'Continuar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
