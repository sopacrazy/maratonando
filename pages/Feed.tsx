import React, { useState, useContext } from 'react';
import Navigation from '../components/Navigation';
import { Post } from '../types';
import { AppContext } from '../App';

const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    user: {
      name: 'João Silva',
      handle: '@joaosilva',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_jq2lRHGE0_I2jH9PqzBxrgXZdiEgLMItotFfMYjNmDr9U8rygcgN4epvFJ02K-hBmclGdGV4XHNkmsKdlUd9wwtNmyEB0lzdaVCq38lRvB7ksfT7uiJvroWGrlvOb1OBo3fuTz9KbwsQOpGypblqtxgrYaDYd_Zon3tKn0j7DNM47w-88ujavayHjWPowFS9bFS40En5gsjRMaFG1LjrYta6myAIuFGOobucDJCiDymf6c-1fiuUl4KHtgwSyCJvBTa36Kgazz5l'
    },
    timeAgo: '2h atrás',
    content: 'Acabei de ver o final e estou sem palavras! A produção dessa temporada foi incrível. A trilha sonora, os efeitos visuais, tudo está em outro nível. Alguém mais achou o plot twist previsível, mas ainda assim satisfatório? 🎸🔥',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUtVx1c6Ux5b3bem4nSY2tCLxL70ieNVEWFWp7sU2lDdK0_5cxHSu_EFyYp_8khdGZ7J-uddiIlQ2cDWEU_zx0ky0UPTaXYJiP5d6KrHS7Vbkn6iUkCIPaYhkxE_R10i_MAVh-QGHBcVTl4U1nU1V9DTCp_T1nZ6CjC9XKgkhaDvFoBE_DyHqRpTL1wKiBQm-7Sd7r4q-AMw6wKfKzzll-JVThA1sfd1aMV5ft_7dboXYGTGAQhWB-kyR4A-lbKJEchsUi8kzSOqp_',
    tag: {
      type: 'review',
      text: 'Stranger Things - Temporada 4'
    },
    likes: 1200,
    comments: 340,
    shares: 56
  },
  {
    id: 2,
    user: {
      name: 'Marina Costa',
      handle: '',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTG-V85C3JtMovKTdKEx9_1NpNFEiMyatRAnzbaA9THzmDp6qDmIVjedlGauzd2hAWb0Pw21BHfW69l4gijroTQsNiUkKR6b4mIs-g2n3TM9RZ_vSCFJnOZGrHkijOUmA1486psdmiIN0eSTP8o0sV0S5hUWikyn_NZs4WR3tk5BPzunmCFE1zx6xC7mCRSP490xFiilCWBajWX1h5q7HlRuZM5iFTaxVQ_pKM3PaKrAHMA_Z_d9UiCAdEYN3cXzxUNKSM0NV6GhiW'
    },
    timeAgo: '5h atrás',
    content: 'O episódio 3 é simplesmente uma obra de arte. Chorei do início ao fim. Nunca pensei que uma adaptação de jogo pudesse ter tanta profundidade emocional. 😭❤️ #TheLastOfUs #HBO',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4vOofD_IlvQAUTrfFKH6kf2hJ_hfKIhTYTqBQ5RVqkxmKOHOMANHl-Fmh32E0RwLkmhj6CPZ-Af2PRIHam6oIBK6FpuUEuh4hV6HNGhwWcrXyR4_O5kOysHGZO24ucRKzDgSsTnjkV88hS3DKsZhimzG1x2TBYLnPlTOQePeq_SIQI1OhNZTCBJIvBmr3VMA6f8sIqMK0eFHgN4lsCsmasmSBvFtReB4vod-nyNBnx6I3DLFyY_M3MAnT-eeL9KQ8Nip1PXq1-UFP',
    tag: {
      type: 'watching',
      text: 'The Last of Us'
    },
    likes: 4500,
    comments: 892,
    shares: 210
  },
  {
    id: 3,
    user: {
      name: 'Pedro Santos',
      handle: '@pedro_s',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPSfk3wevAZBK4HJPiq3EnBDdXmdTvOnqArsdut-PzNk1u430a0iHUj3e08D6NjpjR_XLZKICGeQN1j8YN4ny9UUmgC2a4xO3AIKSssTDCzjE6zXAAffVOQN-t98Q8gYPtLo4OJhouW_wbztS-v9J71O79oLLfPa3KMV26zWEBtNHPYmCQszUoPq82RV6WEMYuORjrnoT2Zsl5Lm4IiOuFV3Ev5DneJ2O5LFHuTdkHsYdGADCPKgyTPT3KkhMd7YzscR91xdhQw1qq'
    },
    timeAgo: '30min atrás',
    content: '',
    isSpoiler: true,
    spoilerTopic: 'Succession (S04E03)',
    likes: 856,
    comments: 120,
    shares: 45
  }
];

const FeedPage: React.FC = () => {
  const { user } = useContext(AppContext);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPostContent, setNewPostContent] = useState('');
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<number, boolean>>({});

  const handlePostSubmit = () => {
    if (!newPostContent.trim()) return;

    const newPost: Post = {
      id: Date.now(),
      user: user, // Usando o usuário do contexto
      timeAgo: 'Agora mesmo',
      content: newPostContent,
      likes: 0,
      comments: 0,
      shares: 0
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
  };

  const toggleSpoiler = (id: number) => {
    setSpoilerRevealed(prev => ({...prev, [id]: !prev[id]}));
  };

  const toggleLike = (id: number) => {
    setPosts(posts.map(post => {
      if (post.id === id) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 pb-20 md:pb-0">
      <Navigation page="feed" />
      
      <main className="flex-1 w-full max-w-[1280px] mx-auto p-4 lg:px-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            <div className="flex items-center justify-between pb-2">
              <h1 className="text-slate-900 dark:text-white text-2xl lg:text-3xl font-bold tracking-tight">Feed de Séries</h1>
              <button className="md:hidden text-primary">
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>

            {/* Composer */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border overflow-hidden shadow-sm dark:shadow-lg transition-colors duration-300">
              <div className="p-4 flex gap-4">
                <div className="shrink-0">
                  <div className="size-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${user.avatar}')` }}></div>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <textarea 
                    className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-200 dark:border-surface-border rounded-lg p-3 text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary resize-none text-base min-h-[80px] transition-colors" 
                    placeholder="O que você está assistindo? Compartilhe sua opinião..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  ></textarea>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Adicionar Imagem">
                        <span className="material-symbols-outlined text-[22px]">image</span>
                      </button>
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Marcar Série">
                        <span className="material-symbols-outlined text-[22px]">movie</span>
                      </button>
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Alerta de Spoiler">
                        <span className="material-symbols-outlined text-[22px]">visibility_off</span>
                      </button>
                    </div>
                    <button 
                      onClick={handlePostSubmit}
                      className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors shadow-md"
                    >
                      Publicar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              <button className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-full text-sm font-medium whitespace-nowrap hover:bg-slate-300 dark:hover:bg-white/20 transition-colors">Em alta</button>
              <button className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white rounded-full text-sm font-medium whitespace-nowrap transition-colors">Seguindo</button>
              <button className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white rounded-full text-sm font-medium whitespace-nowrap transition-colors">Reviews</button>
              <button className="px-4 py-2 text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white rounded-full text-sm font-medium whitespace-nowrap transition-colors">Notícias</button>
            </div>

            {/* Posts */}
            {posts.map(post => (
              <article key={post.id} className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-gray-200 dark:border-surface-border/50 hover:border-primary/30 dark:hover:border-surface-border transition-colors p-5">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${post.user.avatar}')` }}></div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                         <span className="text-slate-900 dark:text-white font-bold text-sm hover:underline cursor-pointer">{post.user.name}</span>
                         {post.tag?.type === 'watching' && (
                            <>
                              <span className="text-slate-500 dark:text-text-secondary text-sm hidden sm:inline">está assistindo</span>
                              <span className="text-primary font-bold text-sm">{post.tag.text}</span>
                            </>
                         )}
                      </div>
                      <span className="text-slate-500 dark:text-text-secondary text-xs">{post.user.handle} • {post.timeAgo}</span>
                    </div>
                  </div>
                  {post.isSpoiler && (
                    <span className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span> Spoiler
                    </span>
                  )}
                  <button className="text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white">
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                </div>

                {/* Content */}
                {post.isSpoiler && !spoilerRevealed[post.id] ? (
                   <div 
                    onClick={() => toggleSpoiler(post.id)}
                    className="relative bg-gray-100 dark:bg-black/40 rounded-lg p-8 text-center border border-dashed border-gray-300 dark:border-surface-border cursor-pointer hover:bg-gray-200 dark:hover:bg-black/60 transition-colors group mb-4"
                   >
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-slate-500 dark:text-text-secondary text-[32px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">visibility_off</span>
                      <p className="text-slate-600 dark:text-text-secondary font-medium group-hover:text-slate-900 dark:group-hover:text-white">
                        Este post contém spoilers de <strong className="text-slate-900 dark:text-white">{post.spoilerTopic}</strong>
                      </p>
                      <button className="mt-2 text-primary text-sm font-bold hover:underline">Clique para revelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                     {post.tag?.type === 'review' && (
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">{post.tag.text}</h3>
                     )}
                     {post.content && <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed mb-4">{post.content}</p>}
                     
                     {post.image && (
                       <div className="relative w-full aspect-video md:aspect-[21/9] rounded-lg overflow-hidden mb-4 group cursor-pointer">
                          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url('${post.image}')` }}></div>
                          {post.tag?.type === 'review' && (
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-primary">star</span> Review
                            </div>
                          )}
                       </div>
                     )}
                  </>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 mt-2">
                  <div className="flex gap-4">
                    <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 text-slate-500 dark:text-text-secondary hover:text-primary transition-colors group">
                      <span className={`material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform`}>favorite</span>
                      <span className="text-xs font-bold">{post.likes > 1000 ? (post.likes/1000).toFixed(1) + 'k' : post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors group">
                      <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">chat_bubble</span>
                      <span className="text-xs font-bold">{post.comments}</span>
                    </button>
                    <button className="flex items-center gap-1.5 text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white transition-colors group">
                      <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">share</span>
                      <span className="text-xs font-bold">{post.shares}</span>
                    </button>
                  </div>
                  {post.tag?.type === 'review' && (
                    <button className="text-primary text-sm font-bold hover:underline">Ver Discussão</button>
                  )}
                </div>

              </article>
            ))}

          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:flex flex-col col-span-4 gap-6">
            
            {/* Trending */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Em Alta na Semana</h3>
                <a className="text-primary text-xs font-bold hover:underline" href="#">Ver tudo</a>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 items-center group cursor-pointer">
                  <div className="w-12 h-16 rounded bg-cover bg-center shrink-0" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCJc_a_Epe_YhAABaBvAeCt36eQZIOPj-I9DMuuKJIcuhbg8gL4q9cL52gKY7u71e0qIlEwEyCL2uZyAi1NZb619QXTNEZGJ2rrEWzhKNHheME_PbHNVlQgFUB81v4zu0HOZZ6yq0_X1CZYOzSAB8F0aqyyAXRgeXAL7u4jIl596P8v3rlqn8D3mFrhIDXQqShVA4AgI2UACjFy6xSD84RlwWUwygGC8a1oR8LXABVfg541YrDgUmlnn9mKokvm4fa_ebiIEjesadXm')" }}></div>
                  <div className="flex flex-col flex-1">
                    <h4 className="text-slate-900 dark:text-white font-bold text-sm group-hover:text-primary transition-colors">House of the Dragon</h4>
                    <span className="text-slate-500 dark:text-text-secondary text-xs">Fantasia • HBO</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-yellow-500 text-[14px] filled">star</span>
                      <span className="text-slate-900 dark:text-white text-xs font-bold">9.2</span>
                    </div>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 text-lg font-bold">01</span>
                </div>
                 <div className="flex gap-3 items-center group cursor-pointer">
                  <div className="w-12 h-16 rounded bg-cover bg-center shrink-0" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCOsTOaFY08jzkThO2P9rffgdwWNvqYHYYXondU0db6R_xULIut6DUDgn8ltlsm7FCSOKKrQd9iE2XSlVEQciV65RsHGLknK9A62j_9UulkAx8Rm0eFw2j9TUpQzNEuSv3Khmn3aFgNp5Tu8Q1FZEoz2Xrj-4sv4UseiI2F2Go28rpRYUYhgWhZf5auWHP9TFTxaLXhVhdoDyCUnP-Rd2cRmtiyf_TjNoIgyCDxUUnJZS9IYL3q_iQbMw8Wc-ZV8tUxq-Jz-oNWgX3R')" }}></div>
                  <div className="flex flex-col flex-1">
                    <h4 className="text-slate-900 dark:text-white font-bold text-sm group-hover:text-primary transition-colors">Severance</h4>
                    <span className="text-slate-500 dark:text-text-secondary text-xs">Sci-Fi • Apple TV+</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-yellow-500 text-[14px] filled">star</span>
                      <span className="text-slate-900 dark:text-white text-xs font-bold">8.9</span>
                    </div>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 text-lg font-bold">02</span>
                </div>
              </div>
            </div>

            {/* Suggested Users */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-4">Quem Seguir</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDy8w3I1Ke7fsx8OLarppjjM8chhQAimrp35lStCrcx1fg0Igd4AXzRhoU_q4h79JLoV89mWqS6GMKUwHt5j7kN9lS0Mfsw9xLPEykYbAfALo2Ncfheh6mrfb6FP4vf8tfc3K2LCe0Vch07UC1rwDef2rRag-riM27WQHrAx7hGkSJxjvzW0OXp1TCmvTCwsvENsweIfic3KF7ADZPXhfqGzS5vVFWmt-02hwkCM36RUyoiki-OfZkbDacGdK-nJBJCmi3J7gx-9efs')" }}></div>
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white text-sm font-bold">Carol Cine</span>
                      <span className="text-slate-500 dark:text-text-secondary text-[10px]">Crítica de TV</span>
                    </div>
                  </div>
                  <button className="text-primary text-xs font-bold border border-primary/30 hover:bg-primary hover:text-white px-3 py-1 rounded-full transition-all">Seguir</button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDONS0psR0GKrBFnyPN5QLHf0OkVDuFI5HEI-D-bb-Ru7qCSk-KW4meRtJkdKHJSm2DWgR1O9jaxrfUBXsV01SWKngiRcCbWZUDm6Nxikgxuenc1_rz0tOhm715wVgu_WM7Bo5RDGipguUx0mYBwMsB2MssLZYA5OD1I-VG6GRZdJNKrr83S_CEZ1umRvmwnaRje2eCpNdHC52695OtqyMsYgp_I_vnzZlhjh0rkjt8pOPZ73EezTJYJ2-I_ZHCu2UKA3UhPsb1Masg')" }}></div>
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white text-sm font-bold">Geek Zone</span>
                      <span className="text-slate-500 dark:text-text-secondary text-[10px]">Notícias</span>
                    </div>
                  </div>
                  <button className="text-primary text-xs font-bold border border-primary/30 hover:bg-primary hover:text-white px-3 py-1 rounded-full transition-all">Seguir</button>
                </div>
              </div>
               <button className="w-full mt-4 py-2 text-slate-500 dark:text-text-secondary text-sm font-medium hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                  Ver mais sugestões
               </button>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

export default FeedPage;