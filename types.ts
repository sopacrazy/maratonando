export type RatingCategory = 'Recomendadas' | 'Passa tempo' | 'Perdi meu tempo';

export type ProfileTheme = 'default' | 'ice'; // Novo tipo de tema

export interface SeriesReview {
  id: number;
  title: string;
  image: string;
  category: RatingCategory;
  comment: string;
}

export interface User {
  name: string;
  handle: string;
  avatar: string;
  bio?: string;
  coins?: number;
  watchedSeries?: SeriesReview[];
  profileTheme?: ProfileTheme; // Novo campo
}

export interface Post {
  id: string | number;
  user: User;
  content: string;
  image?: string | null; // Compatível com image_url (nullable)
  timeAgo: string;
  likes: number;
  comments: number;
  shares: number;
  isSpoiler?: boolean;
  spoilerTopic?: string;
  tag?: {
    type: 'watching' | 'review';
    text: string;
    rating?: number;
  };
}

export interface Stamp {
  id: number;
  name: string;
  series: string;
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário';
  price: number;
  image: string;
}