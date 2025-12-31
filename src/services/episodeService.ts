import { supabase } from '../lib/supabase';

export const EpisodeService = {
  // Mark episode as watched
  async markWatched(userId: string, seriesId: number, season: number, episode: number) {
    const { error } = await supabase
      .from('user_episodes')
      .insert({
        user_id: userId,
        series_tmdb_id: seriesId,
        season_number: season,
        episode_number: episode
      });
    
    if (error) throw error;
  },

  // Unmark episode
  async unmarkWatched(userId: string, seriesId: number, season: number, episode: number) {
    const { error } = await supabase
      .from('user_episodes')
      .delete()
      .match({
        user_id: userId,
        series_tmdb_id: seriesId,
        season_number: season,
        episode_number: episode
      });

    if (error) throw error;
  },

  // Get all watched episodes for a series
  async getWatchedEpisodes(userId: string, seriesId: number) {
    const { data, error } = await supabase
      .from('user_episodes')
      .select('season_number, episode_number')
      .eq('user_id', userId)
      .eq('series_tmdb_id', seriesId);

    if (error) return [];
    return data;
  }
};
