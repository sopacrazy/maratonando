import React, { useContext } from 'react';
import Navigation from '../components/Navigation';
import { AppContext } from '../App';
import { Stamp } from '../types';

const STAMPS: Stamp[] = [
  { id: 1, name: 'Chapéu do Heisenberg', series: 'Breaking Bad', rarity: 'Lendário', price: 1200, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOlvDv-eVVWnD0BkYVw7Eok5g98nI4Bxq6vkgid_FwqNo3kbLK07BFSATLz0tIDcQ-qRMPqvDXOB02-Hwzllx2JPspQRPqQKbqzJajmFHCHoq0LrBPv6KVFYWO6-se3gQKWDsR3Hv_R8_xMRa235kQfgoqy7AxGGnIWLW9o_RuKV7Zjov6CA9SkQ1oW2q-n9QR2pP_2S6c_RVSVncr3GqQpvbY3rpZrY97M6cvCQAJtAlvS2-R6ER1sX-WLSOx-Xw1GczcLLJdSOtw' },
  { id: 2, name: 'Ovo de Syrax', series: 'House of the Dragon', rarity: 'Raro', price: 450, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoD5rITLBZDTRcc9u1Ge7Tz5OuxLYFTrhicXlP_CkZt3-FoJkJjjVkhpsWxlX-GMFAR8s5WBacNb1RbzXqhziKpMEYXLXhzUAHVD30AAc3b-EJJnjbXMYnxskx19ismpgLaR_Gwap4SW0vCaCLYBQSfhIlqdCR9lxB6MeaiMxY3SfN0seas4IRdGBoqp2iGd42px1Z8hvakc494iGX4TLu8uSZME-jZcUynpfnBc8hkDogWtOiKx3ftxc5MOH-l2KiuE-QWJGQmAVU' },
  { id: 3, name: 'Caneca do Michael', series: 'The Office', rarity: 'Comum', price: 50, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCA81qhY1Mc5nRbdD90bN5q2SofhBRBNSVQmP50z8FxTyponHBnTAdGCwMfmvCal-klFyW9C8Skf7zowJQj0zmYCg--FVlpodNbNbIHgMf9QMM7c56nPhZFiH_3AfJUOL_wFYdLfxDLElAs5aQ3AvOuMuTQp6Un5OAn5Hee-hqs6Z4LC7UjKquGbvFLnhbDuTSFR4T1e9J1kGeFX3jzD_1C1q-Eeky5uR3znXotCf2Jlu8hHv7_35lsbt3eLWNoXNZBu4gvABVb989G' },
  { id: 4, name: 'Mini Demogorgon', series: 'Stranger Things', rarity: 'Épico', price: 850, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpFZ7JQlqemN7NI7eOlBjopPhJ6BMb2MtHIXZKoIcPNuvAqQmd91r2f2_Is9AYTi1rmUQiufreOSqUQ-m_RrPrfuDt_ggAzrjx4plrElhuxoJ_9y-9RtpThpapHCUoOwWb6zyoslfFG0pd2-6lcB3NObjNfnrwDDAV_etz_WW8McTJk4ZkA0Nc5ZdLJC9YRuPN8y6t1wz0T1FcXVhGfY4fMAlS5K2hPNx534hrO2zIXaU8JSWidDWb8De-m8cgKoSf7wO85hQiWfIO' },
  { id: 5, name: 'Sabre Sith', series: 'Star Wars', rarity: 'Comum', price: 80, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsvJ0QMYynr88jNMFc6CkBXV80EDrmOxrrsTc2hFjoRNgRfK7sb5VBesdnqeHziJWvpEvDLYWsmuragrrCY5kRHYEg9SRwMTT49DyUBxgDWKt47JOxfCuATft-SVr06-895nnSdZF3P1MVFABQICdT58dUxOA6vAlcAcvLYKu0qrjdlprQPwgYQ9A9vhVBk-hyElzBSvlN0nzLuSfDf2_-0IbFF1EgpPWe4TiQEmx-LEbtISEWqc1lAnL5hljLgAt_3zNot4Z46YPD' },
  { id: 6, name: 'Mini Trono', series: 'Game of Thrones', rarity: 'Raro', price: 520, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3YBqQLbrKOn75cg40EQ1M6zUiVFS_rDOLzUGktcRNVy1rIkP_llXgM3QPOqloG--H7Thk-cBcgyT3xUDtCO6naWA7SwJaiZgeZKq4OyNEh7DyGbZQFzPEgSY-cRe1ESDb32KQ1dgwSHccWoFcbQiXPHx1zODeSdUNHuZDL0Wyxo4Zr4G8Rc6nZt3o8wEZhNl9Ln_I2RIRjN0znvuZyuSivo_d22RZLoieW5qRbaJIGtxELPE2WKhLWBnme5b6p3u5TA24yHxdIMZJ' },
  { id: 7, name: 'Capacete Mando', series: 'The Mandalorian', rarity: 'Comum', price: 110, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4zVJK4d8t2zMkhFPky8KQdn_RQK9MQDc4HzM_kg-QeZn7ThBhCVll2-Cx2A7bnhGnBe6LP_MrkN394wZlHZ0uIpSMySkssk190AJYgAnLtyrVrnTkg_wTXA52xjweA4on1xAq7Lhr5PsJ-3wHolZOqoHCXPCbVOKQYjjBeurnDCb_q9jQ_YwEPifZ92HZgC2js3HebvT_BIHhkWAkfsr0PCvQedFNPtDmiNQrP3CWhxikPZ-cRe8nNfmdi8X8PF133zDic-h0ACqo' },
  { id: 8, name: "Baby Impala '67", series: 'Supernatural', rarity: 'Lendário', price: 1800, image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWML3IhffhYksgLsdUpUT_Y2xW4EwvlFJ91jkSQiyw6E2FsXpGrwKTzSdJSTEV2a50-xYTuzhpC67iRgsS9XC4l_zgyNjI8NagnmjaXE32wPA7H8iMtnw1dGf6ipRVG5eYSJAsJr8iQcpd3DIlEDCqOGyHbBUmPEdUkIdAcyFoHRtSN9CGXy9-b3EGBJhZze1nMy7QNjTGvYeKlfsG-CIMwn6s8X0IWONRW1qh9i6V9wH7--vjI5nPEfl467vHueiNYDuuch0RTvZ3' },
];

const MarketplacePage: React.FC = () => {
  const { coins, setCoins } = useContext(AppContext);

  const handleBuy = (price: number, name: string) => {
    if (coins >= price) {
      setCoins(coins - price);
      alert(`Você comprou: ${name}!`);
    } else {
      alert("Saldo insuficiente!");
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
        
        {/* Hero Section (Banner colorido que mantém o estilo dark propositalmente para destaque) */}
        <div className="rounded-xl overflow-hidden relative mb-12 bg-gradient-to-r from-[#2e1d3e] to-[#1a1122] border border-transparent dark:border-white/5 shadow-xl">
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
            <div className="flex-1 w-full flex justify-center md:justify-end">
              <div className="relative w-full max-w-md aspect-video bg-cover bg-center rounded-lg shadow-2xl rotate-2 hover:rotate-0 transition-all duration-500 border-4 border-[#362348]" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuClhmtN1IpFaDGpNp6hxc9lqRioEjTlYHR8L8f8Cnhm_YuNeX1hbk-HXaK77MNNsGwaLhon2g0G0FHK5704qeHfllKb-FozbHAvsacTVWFCKZ9NFyE75jFO_Y3spqNLRp_798jNBeFqwy3-IdgWEINqcECqpyy4OBLvoPAqb-fEhFYf1A1V_0NBhHFwNuqHeeBj6b1--9CV9dg-6-sVZOVV3Z6IwuxZmQMyCwQ2PAg5jTilLYkagkK9DU1vV4D8GlfTm-SjvwuR5U-I')" }}>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
            <div className="bg-white dark:bg-[#1a1122] rounded-xl p-6 lg:p-6 border border-gray-200 dark:border-white/5 shadow-sm lg:sticky lg:top-24 transition-colors duration-300">
              
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
                  <div className="space-y-2">
                    {['Stranger Things', 'Game of Thrones', 'Breaking Bad', 'The Office'].map(series => (
                      <label key={series} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="form-checkbox rounded text-primary bg-gray-100 dark:bg-[#2a1f33] border-gray-300 dark:border-white/10 focus:ring-primary focus:ring-offset-background-light dark:focus:ring-offset-[#1a1122]" defaultChecked={series === 'Game of Thrones'} />
                        <span className="text-slate-600 dark:text-gray-300 group-hover:text-primary transition-colors text-sm">{series}</span>
                      </label>
                    ))}
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
                      { label: 'Comum', count: '12k', color: 'text-slate-600 dark:text-gray-300' },
                      { label: 'Raro', count: '450', color: 'text-blue-500 dark:text-[#3b82f6]' },
                      { label: 'Épico', count: '85', color: 'text-purple-500 dark:text-[#a855f7]' },
                      { label: 'Lendário', count: '12', color: 'text-yellow-600 dark:text-[#eab308]' },
                    ].map(item => (
                       <label key={item.label} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="form-checkbox rounded text-primary bg-gray-100 dark:bg-[#2a1f33] border-gray-300 dark:border-white/10 focus:ring-primary focus:ring-offset-background-light dark:focus:ring-offset-[#1a1122]" />
                        <span className={`${item.color} text-sm font-medium transition-colors`}>{item.label}</span>
                        <span className="ml-auto text-xs text-slate-400 dark:text-gray-600">{item.count}</span>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#2a1f33] p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-900 dark:text-white font-bold text-lg">Destaques da Comunidade</span>
                <span className="bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full border border-primary/20">42 itens</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-slate-500 dark:text-gray-400 text-sm whitespace-nowrap">Ordenar por:</label>
                <div className="relative w-full sm:w-48">
                  <select className="w-full bg-gray-50 dark:bg-[#1a1122] border-gray-200 dark:border-transparent text-slate-900 dark:text-white text-sm rounded-lg py-2 pl-3 pr-8 focus:ring-1 focus:ring-primary cursor-pointer appearance-none">
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
              {STAMPS.map(stamp => {
                const color = getRarityColor(stamp.rarity);
                // Classes dinâmicas para bordas e sombras baseadas na raridade
                const borderClass = `border-${color}-500/30 hover:border-${color}-500/60`;
                const shadowClass = `hover:shadow-${color}-500/20`;

                return (
                  <div key={stamp.id} className={`group relative bg-white dark:bg-[#2a1f33] rounded-xl p-3 border border-gray-200 dark:${borderClass} dark:border-transparent transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg dark:${shadowClass} flex flex-col gap-3`}>
                    
                    {/* Badge de Raridade */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className={`bg-${color}-500/10 dark:bg-${color}-500/20 backdrop-blur-sm border border-${color}-500/30 dark:border-${color}-500/50 text-${color}-600 dark:text-${color}-400 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded`}>
                        {stamp.rarity}
                      </div>
                    </div>
                    
                    {/* Imagem do Selo */}
                    <div className="aspect-square w-full rounded-lg bg-gray-100 dark:bg-[#1a1122] flex items-center justify-center relative overflow-hidden group-hover:bg-gray-200 dark:group-hover:bg-[#150d1c] transition-colors">
                      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-${color}-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                      <div 
                        className="w-3/4 h-3/4 bg-contain bg-center bg-no-repeat drop-shadow-lg dark:drop-shadow-2xl transition-transform duration-300 group-hover:scale-110" 
                        style={{ backgroundImage: `url('${stamp.image}')` }}
                      ></div>
                    </div>

                    {/* Informações */}
                    <div className="flex flex-col gap-1">
                      <p className="text-slate-500 dark:text-[#ad92c9] text-xs font-medium truncate">{stamp.series}</p>
                      <h3 className="text-slate-900 dark:text-white font-bold text-base leading-tight truncate">{stamp.name}</h3>
                    </div>

                    {/* Preço e Botão */}
                    <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                      <span className="text-slate-900 dark:text-white font-black text-lg">{stamp.price.toLocaleString()} 🪙</span>
                      <button 
                        onClick={() => handleBuy(stamp.price, stamp.name)}
                        className={`size-8 rounded-lg ${
                            stamp.rarity === 'Lendário' 
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                            : 'bg-slate-100 dark:bg-[#362348] text-slate-700 dark:text-white hover:bg-primary hover:text-white dark:hover:bg-primary border border-gray-200 dark:border-white/10 hover:border-transparent'
                        } flex items-center justify-center transition-colors shadow-sm`}
                        title="Comprar Agora"
                      >
                         {stamp.rarity === 'Lendário' ? (
                           <span className="material-symbols-outlined text-lg font-bold">shopping_cart</span>
                         ) : (
                           <span className="material-symbols-outlined text-lg">add</span>
                         )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2">
                <button className="size-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a1f33] text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#362348] transition-colors disabled:opacity-50 shadow-sm">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="size-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold shadow-md shadow-primary/20">1</button>
                <button className="size-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a1f33] text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#362348] transition-colors shadow-sm">2</button>
                <button className="size-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a1f33] text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#362348] transition-colors shadow-sm">3</button>
                <span className="text-slate-400 dark:text-gray-500 px-2">...</span>
                <button className="size-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a1f33] text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#362348] transition-colors shadow-sm">12</button>
                <button className="size-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a1f33] text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#362348] transition-colors shadow-sm">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketplacePage;