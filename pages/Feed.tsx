import React, { useState, useContext, useEffect, useRef } from 'react';
import Navigation from '../components/Navigation';
import { Post, RatingCategory } from '../types';
import { AppContext } from '../App';
import { PostService } from '../src/services/postService';
import { TMDBService, TMDBSeries } from '../src/services/tmdbService';
import { UserSeriesService } from '../src/services/userSeriesService';

// Dados mockados removidos
const INITIAL_POSTS: Post[] = [];


const FeedPage: React.FC = () => {
  const { user } = useContext(AppContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<TMDBSeries[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState<Record<string, boolean>>({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFeed();
    loadTrending();
  }, []);

  const loadFeed = async () => {
    try {
        const feed = await PostService.getFeed();
        setPosts(feed as any); // Ajuste de tipagem pode ser necessário dependendo de como o Supabase retorna o join
    } catch (error) {
        console.error("Erro ao carregar feed:", error);
    } finally {
        setLoadingPosts(false);
    }
  };

  const loadTrending = async () => {
    const trending = await TMDBService.getTrendingSeries();
    setTrendingSeries(trending.slice(0, 5));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;
    setSubmitting(true);

    try {
        await PostService.createPost(user.id, newPostContent, newPostImage);
        setNewPostContent('');
        setNewPostImage(null);
        setImagePreview(null);
        loadFeed(); // Recarregar feed
    } catch (error) {
        alert('Erro ao criar post: ' + (error as any).message);
    } finally {
        setSubmitting(false);
    }
  };

  const toggleSpoiler = (id: number) => {
    setSpoilerRevealed(prev => ({...prev, [id]: !prev[id]}));
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return;
    try {
        await PostService.deletePost(postId);
        setPosts(posts.filter(p => p.id !== postId));
        setActiveMenuId(null);
    } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
    }
  };

  const toggleLike = (id: number) => {
    setPosts(posts.map(post => {
      if (post.id === id) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    }));
  };
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
                       <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageChange}
                       />
                       <button 
                          onClick={() => fileInputRef.current?.click()}
                          className={`p-2 rounded-full transition-colors ${newPostImage ? 'text-green-500 bg-green-50' : 'text-primary hover:bg-primary/10'}`} 
                          title="Adicionar Imagem"
                       >
                         <span className="material-symbols-outlined text-[22px]">{newPostImage ? 'check_circle' : 'image'}</span>
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
                   <div className="relative">
                     <button 
                        onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)}
                        className="text-slate-500 dark:text-text-secondary hover:text-slate-900 dark:hover:text-white"
                     >
                       <span className="material-symbols-outlined">more_horiz</span>
                     </button>
                     {activeMenuId === post.id && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-lg shadow-xl z-20 min-w-[140px] overflow-hidden">
                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">edit</span> Editar
                            </button>
                            <button 
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span> Excluir
                            </button>
                        </div>
                     )}
                   </div>
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
                       <div className="relative w-full rounded-lg overflow-hidden mb-4 group border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black">
                          <img 
                            src={post.image} 
                            alt="Post content" 
                            className="w-full h-auto max-h-[600px] object-contain mx-auto"
                          />
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
            {/* Trending */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Em Alta na Semana</h3>
                <a className="text-primary text-xs font-bold hover:underline" href="#">Ver tudo</a>
              </div>
              <div className="flex flex-col gap-4">
                {trendingSeries.map((series, index) => (
                    <div key={series.id} className="flex gap-3 items-center group cursor-pointer">
                    <div className="w-12 h-16 rounded bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.poster_path)}')` }}></div>
                    <div className="flex flex-col flex-1">
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">{series.name}</h4>
                        <span className="text-slate-500 dark:text-text-secondary text-xs truncate">{series.first_air_date?.split('-')[0] || 'N/A'}</span>
                        <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-yellow-500 text-[14px] filled">star</span>
                        <span className="text-slate-900 dark:text-white text-xs font-bold">{series.vote_average.toFixed(1)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => UserSeriesService.addSeries(user.id, series).then(() => alert('Série adicionada!')).catch(e => alert(e.message))}
                        className="text-slate-400 dark:text-slate-500 hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                    </button>
                    </div>
                ))}
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