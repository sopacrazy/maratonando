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

  async addSeries(userId: string, series: TMDBSeries, status: UserSeries['status'] = 'watching') {
    const { data, error } = await supabase
      .from('user_series')
      .insert({
        user_id: userId,
        tmdb_id: series.id,
        title: series.name,
        poster_path: series.poster_path,
        status
      })
      .select()
      .single();

    if (error) {
        if (error.code === '23505') {
            throw new Error('Você já adicionou esta série.');
        }
        throw error;
    }
    return data;
  }
};
