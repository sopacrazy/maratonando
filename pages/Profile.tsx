import React, { useState, useContext } from 'react';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { RatingCategory, SeriesReview } from '../types';

// Componente para o efeito de neve
const SnowEffect = () => {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl">
      <style>{`
        @keyframes snowfall {
          0% { transform: translateY(-10px) translateX(0px); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(100%) translateX(20px); opacity: 0; }
        }
        .snowflake {
          position: absolute;
          top: -10px;
          color: white;
          text-shadow: 0 0 2px rgba(0,0,0,0.3); /* Sombra para ver no fundo claro */
          opacity: 0;
          font-size: 10px;
          animation: snowfall linear infinite;
        }
      `}</style>
      {[...Array(25)].map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const animDuration = `${4 + Math.random() * 6}s`;
        const animDelay = `${Math.random() * 5}s`;
        const size = `${8 + Math.random() * 14}px`;
        
        return (
          <div 
            key={i} 
            className="snowflake"
            style={{ 
              left, 
              animationDuration: animDuration, 
              animationDelay: animDelay,
              fontSize: size
            }}
          >
            ❄
          </div>
        );
      })}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, addSeriesReview, theme } = useContext(AppContext);
  const [stampsExpanded, setStampsExpanded] = useState(false);
  const [postsExpanded, setPostsExpanded] = useState(false);
  
  const [activeTab, setActiveTab] = useState<RatingCategory>('Recomendadas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReview, setNewReview] = useState<{
    title: string;
    image: string;
    category: RatingCategory;
    comment: string;
  }>({
    title: '',
    image: '',
    category: 'Recomendadas',
    comment: ''
  });

  const filteredSeries = user.watchedSeries?.filter(s => s.category === activeTab) || [];

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.title || !newReview.comment) return;
    const review: SeriesReview = { id: Date.now(), ...newReview };
    addSeriesReview(review);
    setIsModalOpen(false);
    setNewReview({ title: '', image: '', category: 'Recomendadas', comment: '' });
  };

  const getCategoryColor = (cat: RatingCategory) => {
    switch(cat) {
      case 'Recomendadas': return 'text-green-500 border-green-500 bg-green-500/10';
      case 'Passa tempo': return 'text-blue-400 border-blue-400 bg-blue-400/10';
      case 'Perdi meu tempo': return 'text-red-500 border-red-500 bg-red-500/10';
      default: return '';
    }
  };

  // Lógica de estilos para o tema
  const isIceTheme = user.profileTheme === 'ice';
  
  // Ajuste do gradiente do tema Gelo para aparecer melhor no modo claro
  // Usei sky-100/sky-200 no light mode para contrastar com o fundo branco da pagina
  const headerClasses = isIceTheme 
    ? "relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 p-6 md:p-8 rounded-xl bg-gradient-to-b from-sky-200 to-sky-50 dark:from-[#1e293b] dark:to-[#0f172a] border-2 border-sky-300 dark:border-blue-900 shadow-lg shadow-sky-500/10 transition-colors duration-300"
    : "flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 p-6 md:p-8 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#362348] shadow-sm transition-colors duration-300";

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col overflow-x-hidden transition-colors duration-300 pb-24 md:pb-8">
      <Navigation page="profile" />
      
      <main className="flex h-full grow flex-col px-4 md:px-10 lg:px-40 py-6 md:py-8 relative">
        <div className="flex flex-1 justify-center">
          <div className="flex flex-col max-w-[960px] flex-1 gap-6 md:gap-8 w-full">
            
            {/* Profile Header */}
            <section className={headerClasses}>
              {isIceTheme && <SnowEffect />}
              
              <div className="flex flex-col items-center gap-4 shrink-0 relative z-10 w-full md:w-auto">
                <div className="relative group cursor-pointer">
                  <div className={`bg-center bg-no-repeat bg-cover rounded-full h-28 w-28 md:h-40 md:w-40 ring-4 ${isIceTheme ? 'ring-sky-300 dark:ring-blue-900' : 'ring-slate-100 dark:ring-[#362348]'}`} style={{ backgroundImage: `url('${user.avatar}')` }}></div>
                  <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-surface-dark" title="Online Agora"></div>
                </div>
                {/* Botões mobile: full width */}
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-none flex cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors shadow-sm">
                    Editar
                  </button>
                  <button className="flex cursor-pointer items-center justify-center rounded-lg h-9 w-9 bg-slate-100 dark:bg-[#362348] text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-[#4d3267] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center md:items-start flex-1 w-full text-center md:text-left gap-4 relative z-10">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <h1 className="text-2xl md:text-3xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2 flex-wrap justify-center md:justify-start">
                        {user.name}
                        {isIceTheme && <span className="text-sky-500 dark:text-blue-400 animate-pulse text-lg" title="Tema Gelo Ativo">❄️</span>}
                    </h1>
                    <span className="material-symbols-outlined text-primary text-[20px] shrink-0" title="Verificado">verified</span>
                  </div>
                  <p className="text-slate-500 dark:text-text-secondary text-sm font-medium">{user.handle}</p>
                </div>
                
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-lg leading-relaxed">
                   {user.bio || "Sem biografia."}
                </p>
                
                <div className="flex items-center gap-1 text-slate-500 dark:text-text-secondary text-sm mt-1">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                  <span>São Paulo, Brasil</span>
                </div>
                
                <div className="w-full h-px bg-slate-200 dark:bg-[#362348]/50 my-2"></div>
                
                {/* Stats Grid para Mobile */}
                <div className="grid grid-cols-3 gap-2 w-full md:flex md:gap-10">
                  <div className="flex flex-col items-center md:items-start p-2 md:p-0 bg-white/50 dark:bg-white/5 md:bg-transparent rounded-lg md:rounded-none">
                    <span className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">42</span>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider font-semibold">Séries</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start p-2 md:p-0 bg-white/50 dark:bg-white/5 md:bg-transparent rounded-lg md:rounded-none">
                    <span className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">1.2k</span>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider font-semibold">Seguidores</span>
                  </div>
                  <div className="flex flex-col items-center md:items-start p-2 md:p-0 bg-white/50 dark:bg-white/5 md:bg-transparent rounded-lg md:rounded-none">
                    <span className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">850</span>
                    <span className="text-[10px] md:text-xs text-slate-500 dark:text-text-secondary uppercase tracking-wider font-semibold">Seguindo</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Currently Watching - Melhoria de scroll mobile */}
            <section>
              <div className="flex items-center justify-between px-1 mb-4">
                <h2 className="text-lg md:text-xl font-bold leading-tight text-slate-900 dark:text-white">Acompanhando</h2>
                <a className="text-primary text-sm font-semibold hover:underline" href="#">Ver todas</a>
              </div>
              <div className="relative group/carousel -mx-4 md:mx-0 px-4 md:px-0">
                <div className="flex overflow-x-auto hide-scrollbar gap-3 md:gap-4 pb-4 snap-x pr-4">
                  {/* Card 1 */}
                  <div className="flex flex-col gap-2 min-w-[140px] md:min-w-[180px] snap-start cursor-pointer group/card">
                    <div className="w-full aspect-[2/3] bg-center bg-cover rounded-xl shadow-md relative overflow-hidden" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAYhC6tVjZuRWqI2vpM1j3pv_QxK_Eh1xcUZit-h4AvMbJwhzrmJ0HCn9ieSd7JxrBE1gi_jUJVSQW_y5J0CxKQXUk3bgV2Q4o-hxyNWOsOcYuJvfu8qzoUSMKYC6hr8vQWmJKDcWm5C3Mf_4O0GuddM1eEAT7lnAjdpDABOw6RgMHyUSyznMa4OllaqtgVGwNzF_uzCt6bo8ZIwhF7TOtyTh4EQF3q8GImGPo4uSMstyUDuoWyVHYUS19_ArHWFVg9Dh4Fb5lQGLrh')" }}>
                      <div className="absolute bottom-2 left-2">
                         <div className="bg-primary text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-sm">S04E09</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white text-sm md:text-base font-bold leading-tight truncate">Stranger Things</p>
                      <p className="text-slate-500 dark:text-text-secondary text-xs">Assistindo</p>
                    </div>
                  </div>
                  {/* Card 2 */}
                  <div className="flex flex-col gap-2 min-w-[140px] md:min-w-[180px] snap-start cursor-pointer group/card">
                    <div className="w-full aspect-[2/3] bg-center bg-cover rounded-xl shadow-md relative overflow-hidden" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAWukoGyJGlpbGTJ2k2lDU1pREC_tYxX0G4GRX59slbABz2fhOIMAeof9qdCjDco5LHkywwxyqfHkhxdHrLITW38iQZ4O0Gf112Zm6kswB0eBwcjUwkC2hiJAOvUU2kwM2el8xSvDFeAB2YMTDo66NuttuRJcFlIT3E8ZxjE3qeHNxYCRpDcRrYPkBfb6QL155qm9WWOqYF9VkOILffKpF1ysf9ONx9wyOsZcKCc692XqKqL3J0VMSQgS8aeLJO5Uy2PW6Sq86hy4Fx')" }}>
                       <div className="absolute bottom-2 left-2">
                        <div className="bg-primary text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-sm">S03E08</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white text-sm md:text-base font-bold leading-tight truncate">The Mandalorian</p>
                      <p className="text-slate-500 dark:text-text-secondary text-xs">Em dia</p>
                    </div>
                  </div>
                  {/* Card 3 */}
                   <div className="flex flex-col gap-2 min-w-[140px] md:min-w-[180px] snap-start cursor-pointer group/card">
                    <div className="w-full aspect-[2/3] bg-center bg-cover rounded-xl shadow-md relative overflow-hidden" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBKYPdGwM-Kb8hLggtR6jsn1VrRYRLm_jHbd1i5Kd2S_v8o1_umgO6t8LWn7T1RaJXDhdS-Cew4RpVJyoevDcSQaC2NWxXvLP3EyTJ4Pj4UeTSNJ1SSErKX4YqTR5ER_EpESudYzxgWSlwaPFl0lxCDJ6zRsY9Pig_Owvw9lWYrH8I44MAlKMm5d06etUS_7kHcBb1oKtMcBPMm1KyQXQxG_SpUgo7rLHEGAJyxdX2eaT-6La9CseQxY1oMspcuMQZfjHrw9C06wA4L')" }}>
                       <div className="absolute bottom-2 left-2">
                        <div className="bg-green-600 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-sm">Finalizada</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-900 dark:text-white text-sm md:text-base font-bold leading-tight truncate">Succession</p>
                      <p className="text-slate-500 dark:text-text-secondary text-xs">Completada</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Minha Curadoria */}
            <section className="bg-white dark:bg-surface-dark rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-[#362348] transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                 <div>
                    <h2 className="text-lg md:text-xl font-bold leading-tight text-slate-900 dark:text-white mb-1">Minha Curadoria</h2>
                    <p className="text-sm text-slate-500 dark:text-text-secondary">Séries que eu assisti e minha opinião.</p>
                 </div>
                 <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                 >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Adicionar
                 </button>
              </div>

              {/* Tabs Scrollable */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-gray-100 dark:border-white/5 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {(['Recomendadas', 'Passa tempo', 'Perdi meu tempo'] as RatingCategory[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border shrink-0 ${
                      activeTab === tab 
                        ? getCategoryColor(tab)
                        : 'bg-transparent text-slate-500 dark:text-text-secondary border-transparent hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Series Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {filteredSeries.length > 0 ? (
                    filteredSeries.map(series => (
                      <div key={series.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#1a1122] border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                         <div className="w-16 h-24 sm:w-20 sm:h-28 shrink-0 bg-cover bg-center rounded-md shadow-sm" style={{ backgroundImage: `url('${series.image || "https://placeholder.pics/svg/300" }')` }}></div>
                         <div className="flex flex-col min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg leading-tight mb-1 truncate">{series.title}</h3>
                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-2 py-0.5 rounded w-fit ${getCategoryColor(series.category)}`}>
                              {series.category}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic line-clamp-3">"{series.comment}"</p>
                         </div>
                      </div>
                    ))
                 ) : (
                   <div className="col-span-full py-10 text-center text-slate-400 dark:text-text-secondary">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-50">movie_off</span>
                      <p>Nenhuma série adicionada nesta categoria ainda.</p>
                   </div>
                 )}
              </div>
            </section>

            {/* Badges & Posts (Grid on Desktop, Stack on Mobile) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Badges */}
              <div className="flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#362348] rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
                <div className="p-4 md:p-6 pb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-yellow-500 text-3xl">military_tech</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Coleção de Selos</h3>
                  </div>
                  <p className="text-slate-500 dark:text-text-secondary text-sm mb-6">{user.name.split(' ')[0]} desbloqueou 12 selos.</p>
                  
                  <div className="flex flex-wrap gap-3 mb-4">
                     <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700">
                      <img alt="badge" className="w-8 h-8 opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDadY-bYXN2nRVwB3KzAt9JxNsBVsA8bC5tpHBLck3KXTAIz83hCrVfYwzaXjDueCm4zlLNzD4hP1mEIJ0qqBtB2al55edGB6CJQfhyYp-7B8kmdlEsvbe-PiwGH7zRaITQmTL2fkyaXlPumjS4udh6e3JqvReW8JWXzbEAAqgVJXGTq5KVYxS256vrwqdBuDrZnXzUtnB2u1zADbQIZtkrCDK78P1F46WbUt64jBQRBcCSrsua3soefwNsauqKAMYDLRfzEsCO051V"/>
                    </div>
                     <div className="w-12 h-12 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-300 dark:border-slate-700 border-dashed text-slate-500 text-xs font-bold">
                        +9
                    </div>
                  </div>
                </div>
              </div>

              {/* Posts */}
              <div className="flex flex-col bg-white dark:bg-surface-dark border border-slate-200 dark:border-[#362348] rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
                <div className="p-4 md:p-6 pb-2">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-blue-400 text-3xl">forum</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Publicações</h3>
                  </div>
                  <p className="text-slate-500 dark:text-text-secondary text-sm mb-4">Atividade recente.</p>
                  <div className="bg-slate-50 dark:bg-[#1a1122] rounded-lg p-4 border border-slate-100 dark:border-[#362348] mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-6 bg-cover rounded-full" style={{ backgroundImage: `url('${user.avatar}')` }}></div>
                      <span className="text-xs font-bold text-slate-500 dark:text-text-secondary line-clamp-1">{user.name.split(' ')[0]} em <span className="text-primary">House of the Dragon</span></span>
                    </div>
                    <p className="text-sm italic text-slate-600 dark:text-slate-300 line-clamp-2">"O final dessa temporada foi simplesmente chocante!..."</p>
                  </div>
                </div>
              </div>

            </section>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-[#362348] overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-5 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Adicionar Série</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <form onSubmit={handleAddReview} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Nome</label>
                    <input 
                      type="text" required
                      className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-300 dark:border-[#4d3267] rounded-lg px-4 py-3 text-slate-900 dark:text-white"
                      value={newReview.title}
                      onChange={e => setNewReview({...newReview, title: e.target.value})}
                      placeholder="Ex: Breaking Bad"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Categoria</label>
                    <div className="flex gap-2">
                       {(['Recomendadas', 'Passa tempo', 'Perdi meu tempo'] as RatingCategory[]).map(cat => (
                         <button type="button" key={cat} onClick={() => setNewReview({...newReview, category: cat})}
                            className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-lg border transition-colors ${
                              newReview.category === cat ? getCategoryColor(cat) : 'bg-transparent border-gray-300 dark:border-white/10 text-slate-500 dark:text-text-secondary'
                            }`}
                         >{cat}</button>
                       ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Crítica</label>
                    <textarea required rows={3}
                      className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-300 dark:border-[#4d3267] rounded-lg px-4 py-3 text-slate-900 dark:text-white resize-none"
                      value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} placeholder="Opinião..."
                    ></textarea>
                  </div>
                  <button type="submit" className="mt-2 w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg">Salvar</button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ProfilePage;