const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export interface TMDBSeries {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
}

export const TMDBService = {
  getImageUrl: (path: string | null) => {
    return path ? `${IMAGE_BASE_URL}${path}` : 'https://placeholder.pics/svg/300x450/DEDEDE/555555/Sem%20Imagem';
  },

  searchSeries: async (query: string): Promise<TMDBSeries[]> => {
    if (!query) return [];
    try {
      const response = await fetch(`${BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(query)}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
      return [];
    }
  },

  getTrendingSeries: async (): Promise<TMDBSeries[]> => {
    try {
      const response = await fetch(`${BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=pt-BR`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Erro ao buscar tendências:", error);
      return [];
    }
  },

  getSeriesDetails: async (id: number): Promise<TMDBSeries | null> => {
    try {
      const response = await fetch(`${BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`);
      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar detalhes da série:", error);
      return null;
    }
  }
};
