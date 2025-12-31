import { supabase } from '../lib/supabase';
import { TMDBSeries } from './tmdbService';

export interface UserSeries {
  id: string;
  user_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  status: 'watching' | 'completed' | 'plan_to_watch' | 'dropped';
  rating?: number;
  review?: string;
}

export const UserSeriesService = {
  async getUserSeries(userId: string) {
    const { data, error } = await supabase
      .from('user_series')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserSeries[];
  },

  async addSeries(userId: string, series: TMDBSeries, status: UserSeries['status'] = 'watching', review?: string, rating?: number) {
    const { data, error } = await supabase
      .from('user_series')
      .upsert({
        user_id: userId,
        tmdb_id: series.id,
        title: series.name,
        poster_path: series.poster_path,
        status,
        review,
        rating // Usaremos rating para mapear a categoria (3=Recomendada, 2=Passatempo, 1=Perda de tempo)
      }, { onConflict: 'user_id, tmdb_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async removeSeries(seriesId: string) {
    const { error } = await supabase
      .from('user_series')
      .delete()
      .eq('id', seriesId);

    if (error) throw error;
  }
};
