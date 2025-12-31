import React, { useContext, useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { BadgeService } from '../services/badgeService';
import { Stamp } from '../types';
import { AddCreditsModal } from '../components/AddCreditsModal';

const MarketplacePage: React.FC = () => {
  const { coins, setCoins } = useContext(AppContext);
  const [isAddCreditsOpen, setIsAddCreditsOpen] = useState(false);
  const [seriesSearch, setSeriesSearch] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [loading, setLoading] = useState(true);
  
  /* New State for User stamps to check ownership */
  const { user } = useContext(AppContext);
  const [ownedStampIds, setOwnedStampIds] = useState<string[]>([]);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [confirmingStamp, setConfirmingStamp] = useState<Stamp | null>(null);
  const [purchasedStamp, setPurchasedStamp] = useState<Stamp | null>(null);
  const [activeTab, setActiveTab] = useState<'stamps' | 'themes'>('stamps');

  // Mock Themes Data
  const THEMES = [
     {
         id: 'theme_snow',
         name: 'Inverno Hawkins',
         description: 'Flocos de neve do Mundo Invertido caindo suavemente.',
         price: 500,
         rarity: 'Épico',
         image_url: 'https://images.unsplash.com/photo-1542601098-8fc114e148e2?q=80&w=2070&auto=format&fit=crop',
     },
     {
         id: 'theme_matrix',
         name: 'Chuva Digital',
         description: 'O código da Matrix escorrendo pela sua tela.',
         price: 1200,
         rarity: 'Lendário',
         image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2070&auto=format&fit=crop',
     }
  ];

  useEffect(() => {
    loadStamps();
    if (user?.id) loadUserOwnership();
  }, [user]);

  const loadUserOwnership = async () => {
      if (!user?.id) return;
      try {
          const myBadges = await BadgeService.getUserBadges(user.id);
          setOwnedStampIds(myBadges.map((b: any) => b.id));
      } catch (error) {
          console.error(error);
      }
  };

  const loadStamps = async () => {
    try {
        setLoading(true);
        const data = await BadgeService.getMarketplaceBadges();
        setStamps(data as Stamp[]);
    } catch (error) {
        console.error('Error loading market stamps:', error);
    } finally {
        setLoading(false);
    }
  };

  // ... Filter Logic ...
  // Get unique series from dynamic stamps
  const allUniqueSeries = Array.from(new Set(stamps.filter(s => s.series_title).map(s => s.series_title!))).sort();
  
  const filteredStamps = stamps.filter(stamp => {
      if (seriesSearch && stamp.series_title && !stamp.series_title.toLowerCase().includes(seriesSearch.toLowerCase())) return false;
      if (selectedSeries.length > 0 && stamp.series_title && !selectedSeries.includes(stamp.series_title)) return false;
      return true;
  });

  const handleBuy = (stamp: Stamp) => {
    if (!user) return alert("Faça login para comprar!");
    if (coins < (stamp.price || 0)) return alert("Saldo insuficiente! Adicione mais moedas.");
    setConfirmingStamp(stamp);
  };

  const executePurchase = async () => {
    if (!confirmingStamp || !user) return;
    
    // Armazena o selo atual antes de limpar o confirmingStamp
    const stampToPurchase = confirmingStamp;
    
    setPurchasingId(stampToPurchase.id);
    setConfirmingStamp(null);

    // Mock Theme Purchase
    if (stampToPurchase.id.startsWith('theme_')) {
        setTimeout(() => {
             setCoins(coins - (stampToPurchase.price || 0));
             const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); 
             successAudio.volume = 0.5;
            //  successAudio.play().catch(() => {});
             setPurchasedStamp(stampToPurchase);
             setPurchasingId(null);
        }, 1000);
        return;
    }

    try {
        await BadgeService.buyStamp(user.id, stampToPurchase.id, stampToPurchase.price || 0);
        setCoins(coins - (stampToPurchase.price || 0));
        setOwnedStampIds([...ownedStampIds, stampToPurchase.id]);
        
        // Success Feedback
        const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); 
        successAudio.volume = 0.5;
        // successAudio.play().catch(() => {});
        
        setPurchasedStamp(stampToPurchase);

    } catch (error: any) {
        alert(error.message || "Erro ao processar compra.");
    } finally {
        setPurchasingId(null);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Lendário': return 'yellow';
      case 'Épico': return 'purple';
      case 'Raro': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-x-hidden min-h-screen flex flex-col pb-20 md:pb-0 transition-colors duration-300">
      <Navigation page="market" />

      <main className="layout-container flex h-full grow flex-col max-w-[1440px] mx-auto w-full px-4 sm:px-10 py-8">
        
        {/* Hero Section */}
        {/* ... existing hero code ... */}
        <div className="rounded-xl overflow-hidden relative mb-8 bg-gradient-to-r from-zinc-900 to-black border border-transparent dark:border-white/5 shadow-xl">
           {/* ... hero content ... */}
           {/* Copy existing hero content here in full if replacing, but tool uses replacement blocks. 
               I will assume the Hero Block above this replacement is unchanged and start replacement AFTER Hero or strictly around the Tabs area. 
               Actually, I need to insert the Tabs BEFORE the div with "flex flex-col lg:flex-row gap-8"
           */}
           <div className="absolute inset-0 bg-[url('https://placeholder.pics/svg/800/2e1d3e/4A2F63/pattern')] opacity-10 bg-repeat"></div>
           <div className="flex flex-col md:flex-row gap-8 items-center p-8 md:p-12 relative z-10">
            <div className="flex flex-col gap-4 text-left md:max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 w-fit">
                <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-primary text-xs font-bold uppercase tracking-wider">Nova Coleção</span>
              </div>
              <h1 className="text-white text-4xl md:text-5xl font-black leading-[1.1] tracking-tight">
                Colecione os clássicos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-300">Pixel Art</span>
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed max-w-md">
                Novos selos exclusivos da temporada final de Stranger Things já disponíveis. Complete sua coleção antes que acabem!
              </p>
              <div className="flex gap-4 pt-4">
                <button className="flex h-12 px-6 items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-white text-base font-bold transition-transform active:scale-95 shadow-lg shadow-primary/25">
                  Explorar Coleção
                </button>
                <button className="flex h-12 px-6 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white text-base font-bold border border-white/10 transition-colors">
                  Ver Detalhes
                </button>
              </div>
            </div>
            <div className="flex-1 w-full flex justify-center md:justify-end relative min-h-[250px] md:min-h-auto">
              {stamps.length > 0 ? (
                  <div className="relative w-full max-w-[400px] h-[250px] flex items-center justify-center">
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-primary/30 blur-[50px] rounded-full scale-75 animate-pulse"></div>
                    
                    {/* Mock 3 Stamps Stack */}
                    {stamps.slice(0, 3).map((stamp, index) => {
                        const offsets = [
                            { x: '-translate-x-10 md:-translate-x-16', r: '-rotate-6', z: 'z-10' }, // Left
                            { x: 'translate-x-0', r: 'rotate-0', z: 'z-30 scale-105' },             // Center
                            { x: 'translate-x-10 md:translate-x-16', r: 'rotate-6', z: 'z-20' }   // Right
                        ];
                        const style = offsets[index] || offsets[1];

                        return (
                            <div 
                                key={stamp.id}
                                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-44 md:h-44 bg-white dark:bg-card-dark rounded-xl shadow-xl border-2 border-white dark:border-white/10 flex items-center justify-center transition-all duration-500 hover:scale-110 hover:z-50 hover:rotate-0 ${style.x} ${style.r} ${style.z}`}
                            >
                                <div className="absolute inset-1.5 rounded-lg overflow-hidden bg-gray-100 dark:bg-background-dark flex items-center justify-center">
                                    {stamp.image_url && (
                                        <img src={stamp.image_url} alt={stamp.name} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                {/* Label */}
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[9px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap border border-white/20">
                                    {stamp.name}
                                </div>
                            </div>
                        );
                    })}
                  </div>
              ) : (
                 // Fallback Skeleton/Placeholder
                 <div className="relative w-full max-w-md aspect-video bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                     <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-white/20 mb-2">style</span>
                        <p className="text-white/30 text-sm font-medium">Carregando coleção...</p>
                     </div>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-white/10 px-2">
            <button 
                onClick={() => setActiveTab('stamps')}
                className={`pb-4 text-base font-bold transition-all relative ${
                    activeTab === 'stamps' 
                    ? 'text-primary' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
                }`}
            >
                Selos e Badges
                {activeTab === 'stamps' && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('themes')}
                className={`pb-4 text-base font-bold transition-all relative ${
                    activeTab === 'themes' 
                    ? 'text-primary' 
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
                }`}
            >
               Temas Visuais
               {activeTab === 'themes' && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
                )}
            </button>
        </div>

        {activeTab === 'stamps' ? (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
            <div className="bg-white dark:bg-card-dark rounded-xl p-6 lg:p-6 border border-gray-200 dark:border-white/5 shadow-sm lg:sticky lg:top-24 transition-colors duration-300">
              
              <div className="flex items-center justify-between lg:hidden mb-4">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Filtros</h3>
                <button className="text-primary text-sm font-bold">Limpar</button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">category</span>
                    Séries
                  </h3>
                  
                  {/* Search Input */}
                  <div className="relative mb-3">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-sm">search</span>
                    <input 
                      type="text" 
                      placeholder="Buscar série..." 
                      className="w-full bg-gray-50 dark:bg-card-dark border border-gray-200 dark:border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-gray-400"
                      value={seriesSearch}
                      onChange={(e) => setSeriesSearch(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {allUniqueSeries.map(series => (
                      <label key={series} className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="form-checkbox rounded text-primary bg-gray-100 dark:bg-card-dark border-gray-300 dark:border-white/10 focus:ring-primary focus:ring-offset-background-light dark:focus:ring-offset-background-dark"
                          checked={selectedSeries.includes(series)}
                          onChange={(e) => {
                             if(e.target.checked) setSelectedSeries([...selectedSeries, series]);
                             else setSelectedSeries(selectedSeries.filter(s => s !== series));
                          }}
                        />
                        <span className="text-slate-600 dark:text-gray-300 group-hover:text-primary transition-colors text-sm truncate">{series}</span>
                      </label>
                    ))}
                    {allUniqueSeries.length === 0 && (
                      <p className="text-xs text-slate-400 dark:text-gray-500 italic text-center py-2">Nao há séries disponiveis.</p>
                    )}
                  </div>
                </div>
                <div className="h-px w-full bg-gray-100 dark:bg-white/5"></div>
                <div>
                  <h3 className="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">diamond</span>
                    Raridade
                  </h3>
                   <div className="space-y-2">
                    {[
                      { label: 'Comum', count: '-', color: 'text-slate-600 dark:text-gray-300' },
                      { label: 'Raro', count: '-', color: 'text-blue-500 dark:text-[#3b82f6]' },
                      { label: 'Épico', count: '-', color: 'text-purple-500 dark:text-[#a855f7]' },
                      { label: 'Lendário', count: '-', color: 'text-yellow-600 dark:text-[#eab308]' },
                    ].map(item => (
                       <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="form-checkbox rounded text-primary bg-gray-100 dark:bg-card-dark border-gray-300 dark:border-white/10 focus:ring-primary focus:ring-offset-background-light dark:focus:ring-offset-background-dark" />
                        <span className={`${item.color} text-sm font-medium transition-colors`}>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Grid Section */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-card-dark p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-900 dark:text-white font-bold text-lg">Destaques da Comunidade</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-slate-500 dark:text-gray-400 text-sm whitespace-nowrap">Ordenar por:</label>
                <div className="relative w-full sm:w-48">
                  <select className="w-full bg-gray-50 dark:bg-background-dark border-gray-200 dark:border-transparent text-slate-900 dark:text-white text-sm rounded-lg py-2 pl-3 pr-8 focus:ring-1 focus:ring-primary cursor-pointer appearance-none">
                    <option>Mais Populares</option>
                    <option>Menor Preço</option>
                    <option>Maior Preço</option>
                    <option>Mais Recentes</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-white">
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stamps Grid */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                  <div className="col-span-full py-20 text-center">
                      <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                      <p className="text-slate-500 mt-2">Carregando loja...</p>
                  </div>
              ) : filteredStamps.length > 0 ? (
                filteredStamps.map(stamp => {
                    const color = getRarityColor(stamp.rarity);
                    const borderClass = `border-${color}-500/30 hover:border-${color}-500/60`;
                    const shadowClass = `hover:shadow-${color}-500/20`;

                    return (
                    <div key={stamp.id} className={`group relative bg-white dark:bg-card-dark rounded-xl p-3 border border-gray-200 dark:${borderClass} dark:border-transparent transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg dark:${shadowClass} flex flex-col gap-3`}>
                        
                        {/* Badge de Raridade */}
                        <div className="absolute top-3 right-3 z-10">
                        <div className={`bg-${color}-500/10 dark:bg-${color}-500/20 backdrop-blur-sm border border-${color}-500/30 dark:border-${color}-500/50 text-${color}-600 dark:text-${color}-400 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded`}>
                            {stamp.rarity}
                        </div>
                        </div>
                        
                        {/* Imagem do Selo */}
                        <div className="aspect-square w-full rounded-lg bg-gray-100 dark:bg-background-dark flex items-center justify-center relative overflow-hidden group-hover:bg-gray-200 dark:group-hover:bg-black transition-colors">
                        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-${color}-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                            {stamp.image_url ? (
                                <img src={stamp.image_url} alt={stamp.name} className="w-3/4 h-3/4 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
                            ) : (
                                <span className="material-symbols-outlined text-4xl text-gray-400">military_tech</span>
                            )}
                        </div>

                        {/* Informações */}
                        <div className="flex flex-col gap-1">
                        <p className="text-slate-500 dark:text-text-secondary text-xs font-medium truncate">{stamp.series_title || 'Coleção Diversa'}</p>
                        <h3 className="text-slate-900 dark:text-white font-bold text-base leading-tight truncate">{stamp.name}</h3>
                        </div>

                        {/* Preço e Botão */}
                        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-slate-900 dark:text-white font-black text-lg">{stamp.price?.toLocaleString()} 🪙</span>
                        <button 
                            onClick={() => handleBuy(stamp)}
                            disabled={ownedStampIds.includes(stamp.id) || purchasingId === stamp.id}
                            className={`size-8 rounded-lg ${
                                ownedStampIds.includes(stamp.id)
                                ? 'bg-green-500 text-white cursor-default'
                                : stamp.rarity === 'Lendário' 
                                ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                                : 'bg-slate-100 dark:bg-card-dark text-slate-700 dark:text-white hover:bg-primary hover:text-white dark:hover:bg-primary border border-gray-200 dark:border-white/10 hover:border-transparent'
                            } flex items-center justify-center transition-colors shadow-sm`}
                            title={ownedStampIds.includes(stamp.id) ? "Adquirido" : "Comprar Agora"}
                        >
                             {purchasingId === stamp.id ? (
                                <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                             ) : ownedStampIds.includes(stamp.id) ? (
                                <span className="material-symbols-outlined text-lg">check</span>
                             ) : stamp.rarity === 'Lendário' ? (
                                <span className="material-symbols-outlined text-lg font-bold">shopping_cart</span>
                             ) : (
                                <span className="material-symbols-outlined text-lg">add</span>
                             )}
                        </button>
                        </div>
                    </div>
                    );
                })
              ) : (
                 <div className="col-span-full py-16 flex flex-col items-center justify-center text-center opacity-60">
                     <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">store_off</span>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">Loja Vazia</h3>
                     <p className="text-slate-500 max-w-sm mx-auto mt-2">Nenhum selo disponível para compra no momento. Volte mais tarde!</p>
                 </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-8">
               {/* ... pagination content ... */}
               <div className="flex items-center gap-2">
                <button className="size-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-card-dark text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="size-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold shadow-md shadow-primary/20">1</button>
                {/* Simplified pagination for now to fit clean replacement */}
               </div>
            </div>

          </div>
        </div>
        ) : (
            /* Themes Tab Content */
            <div className="flex-1 flex flex-col gap-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Temas da Temporada</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {THEMES.map(theme => (
                        <div key={theme.id} className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-lg group hover:border-primary/50 transition-colors">
                            <div className="h-48 overflow-hidden relative">
                                <img src={theme.image_url} alt={theme.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                <div className="absolute bottom-4 left-4">
                                     <h3 className="text-xl font-bold text-white">{theme.name}</h3>
                                     <p className="text-gray-300 text-sm">{theme.rarity}</p>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-slate-600 dark:text-gray-400 text-sm mb-4 leading-relaxed">{theme.description}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-lg font-black text-slate-900 dark:text-white">{theme.price} 🪙</span>
                                    <button 
                                        disabled
                                        className="bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-bold py-2 px-4 rounded-lg cursor-not-allowed text-sm"
                                    >
                                        Em Breve
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {confirmingStamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all scale-100 p-6 flex flex-col items-center text-center gap-4 relative">
             
             {/* Close Button */}
             <button 
                onClick={() => setConfirmingStamp(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
             >
                 <span className="material-symbols-outlined">close</span>
             </button>

             {/* Image */}
             <div className="size-24 rounded-xl bg-gray-100 dark:bg-background-dark flex items-center justify-center p-2 mb-2 border border-gray-100 dark:border-white/5 shadow-inner">
                {confirmingStamp.image_url ? (
                    <img src={confirmingStamp.image_url} alt={confirmingStamp.name} className="max-w-full max-h-full object-contain" />
                ) : (
                    <span className="material-symbols-outlined text-4xl text-gray-400">military_tech</span>
                )}
             </div>

             <div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Confirmar Compra</h3>
                 <p className="text-slate-500 dark:text-gray-400 text-sm">
                     Você está prestes a adquirir o {confirmingStamp.id.startsWith('theme_') ? 'tema' : 'selo'} <strong className="text-primary">{confirmingStamp.name}</strong>.
                 </p>
             </div>

             <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-4 py-2 rounded-lg font-bold border border-yellow-500/20">
                 <span>{confirmingStamp.price?.toLocaleString()}</span>
                 <span className="text-sm">🪙</span>
             </div>

             <div className="flex gap-3 w-full mt-2">
                 <button 
                    onClick={() => setConfirmingStamp(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-slate-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                 >
                     Cancelar
                 </button>
                 <button 
                    onClick={executePurchase}
                    className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                 > 
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Confirmar
                 </button>
             </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {purchasedStamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-white/10 overflow-hidden transform transition-all scale-100 p-8 flex flex-col items-center text-center gap-6 relative">
            
             <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-x"></div>

             {/* Animated Success Icon */}
             <div className="size-20 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mb-2 animate-bounce">
                <span className="material-symbols-outlined text-5xl text-green-500">celebration</span>
             </div>

             <div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Parabéns!</h3>
                 <p className="text-slate-500 dark:text-gray-400">
                     O {purchasedStamp.id.startsWith('theme_') ? 'tema' : 'selo'} <strong className="text-primary">{purchasedStamp.name}</strong> foi adicionado à sua coleção.
                 </p>
             </div>

             {/* Stamp Showcase */}
             <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5 w-full">
                 <div className="aspect-square w-24 mx-auto mb-3 relative">
                    {purchasedStamp.image_url ? (
                        <img src={purchasedStamp.image_url} alt={purchasedStamp.name} className="w-full h-full object-contain drop-shadow-md" />
                    ) : (
                        <span className="material-symbols-outlined text-4xl text-gray-400">military_tech</span>
                    )}
                 </div>
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{purchasedStamp.rarity}</div>
             </div>

             <button 
                onClick={() => setPurchasedStamp(null)}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
             >
                 Incrível!
             </button>
          </div>
        </div>
      )}

      <AddCreditsModal isOpen={isAddCreditsOpen} onClose={() => setIsAddCreditsOpen(false)} />
    </div>
  );
};

export default MarketplacePage;