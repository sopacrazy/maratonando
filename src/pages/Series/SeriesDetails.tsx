import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import { TMDBService, TMDBSeries } from '../../services/tmdbService';
import { EpisodeService } from '../../services/episodeService';
import { AppContext } from '../../App';

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
}

interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
}

interface TVDetail extends TMDBSeries {
  seasons: Season[];
  number_of_seasons: number;
  number_of_episodes: number;
}

const SeriesDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useContext(AppContext);
  const navigate = useNavigate();
  const [series, setSeries] = useState<TVDetail | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDetails();
      loadWatched();
    }
  }, [id]);

  useEffect(() => {
    if (id && selectedSeason) {
      loadSeasonEpisodes(parseInt(id), selectedSeason);
    }
  }, [id, selectedSeason]);

  const loadDetails = async () => {
    if (!id) return;
    try {
      const data = await TMDBService.getSeriesDetails(parseInt(id));
      if (data) setSeries(data as TVDetail);
    } catch (error) {
      console.error(error);
    }
  };

  const loadSeasonEpisodes = async (seriesId: number, seasonNum: number) => {
    try {
      const data = await TMDBService.getSeriesSeason(seriesId, seasonNum);
      if (data && data.episodes) {
        setEpisodes(data.episodes);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatched = async () => {
    if (!user?.id || !id) return;
    try {
      const watched = await EpisodeService.getWatchedEpisodes(user.id, parseInt(id));
      const watchedSet = new Set(watched.map((w: any) => `S${w.season_number}E${w.episode_number}`));
      setWatchedEpisodes(watchedSet);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleEpisode = async (season: number, episode: number) => {
    if (!user?.id || !id) return;
    const key = `S${season}E${episode}`;
    const isWatched = watchedEpisodes.has(key);

    // Optimistic
    setWatchedEpisodes(prev => {
      const next = new Set(prev);
      if (isWatched) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      if (isWatched) {
        await EpisodeService.unmarkWatched(user.id, parseInt(id), season, episode);
      } else {
        await EpisodeService.markWatched(user.id, parseInt(id), season, episode);
      }
    } catch (error) {
      console.error(error);
      // Rollback
      setWatchedEpisodes(prev => {
        const next = new Set(prev);
        if (isWatched) next.add(key);
        else next.delete(key);
        return next;
      });
    }
  };

  // Calculate progress
  const totalWatched = watchedEpisodes.size;
  const totalEpisodes = series?.number_of_episodes || 1;
  const progress = Math.min(100, (totalWatched / totalEpisodes) * 100);

  if (!series) return <div className="p-8 text-center">Carregando série...</div>;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      <Navigation page="feed" />

      {/* Header Backdrop */}
      <div 
        className="w-full h-[40vh] bg-cover bg-center relative"
        style={{ backgroundImage: `url('${TMDBService.getImageUrl(series.backdrop_path || series.poster_path)}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent"></div>
        <div className="absolute bottom-4 left-4 sm:left-10 text-white z-10">
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 text-slate-900 dark:text-white">{series.name}</h1>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-700 dark:text-gray-300">
            <span className="bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">{series.vote_average.toFixed(1)}</span>
            <span>{series.first_air_date?.split('-')[0]}</span>
            <span>{series.number_of_seasons} Temporadas</span>
            <span>{series.number_of_episodes} Episódios</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-10 -mt-10 relative z-20">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 bg-white dark:bg-surface-dark p-6 rounded-xl shadow-lg border border-gray-200 dark:border-white/5">
            <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Seu Progresso</h3>
            <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-4 mb-2">
              <div 
                className="bg-primary h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-right text-xs text-slate-500 dark:text-gray-400">
              {totalWatched} de {totalEpisodes} episódios vistos ({progress.toFixed(0)}%)
            </p>
          </div>
        </div>

        {/* Seasons & Episodes */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Season Selector */}
          <div className="md:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
              <h3 className="p-4 font-bold border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-slate-900 dark:text-white">Temporadas</h3>
              <div className="max-h-[500px] overflow-y-auto">
                {series.seasons.map(season => season.season_number > 0 && (
                  <button
                    key={season.id}
                    onClick={() => setSelectedSeason(season.season_number)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0 flex justify-between items-center transition-colors ${
                      selectedSeason === season.season_number 
                        ? 'bg-primary/10 text-primary font-bold' 
                        : 'text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>Temporada {season.season_number}</span>
                    <span className="text-xs opacity-70">{season.episode_count} eps</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Episode List */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Episódios</h2>
            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <p>Carregando episódios...</p>
              ) : episodes.map(ep => {
                const isWatched = watchedEpisodes.has(`S${ep.season_number}E${ep.episode_number}`);
                return (
                  <div 
                    key={ep.id} 
                    className={`relative bg-white dark:bg-surface-dark rounded-xl border p-4 flex flex-col sm:flex-row gap-4 transition-all ${
                      isWatched 
                        ? 'border-green-500/30 bg-green-50/10' 
                        : 'border-gray-200 dark:border-white/5 hover:border-primary/50'
                    }`}
                  >
                    <div className="w-full sm:w-40 h-24 rounded-lg bg-cover bg-center shrink-0 relative overflow-hidden" style={{ backgroundImage: `url('${TMDBService.getImageUrl(ep.still_path)}')` }}>
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded">
                          {ep.episode_number > 9 ? ep.episode_number : `0${ep.episode_number}`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-start">
                         <div>
                            <h4 className={`font-bold text-lg mb-1 leading-tight ${isWatched ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                              {ep.name || `Episódio ${ep.episode_number}`}
                            </h4>
                            <p className="text-xs text-slate-500 mb-2">
                              {new Date(ep.air_date).toLocaleDateString()} • {ep.season_number}x{ep.episode_number}
                            </p>
                         </div>
                         <button
                           onClick={() => toggleEpisode(ep.season_number, ep.episode_number)}
                           className={`p-2 rounded-full transition-all active:scale-95 ${
                             isWatched
                               ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                               : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:text-primary hover:bg-primary/10'
                           }`}
                           title={isWatched ? "Marcar como não visto" : "Marcar como visto"}
                         >
                           <span className="material-symbols-outlined text-2xl">
                             {isWatched ? 'check' : 'visibility'}
                           </span>
                         </button>
                       </div>
                       <p className="text-sm text-slate-600 dark:text-gray-400 line-clamp-2">
                         {ep.overview || "Sem descrição disponível."}
                       </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SeriesDetailsPage;
