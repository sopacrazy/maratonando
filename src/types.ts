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
  id?: string;
  name: string;
  handle: string;
  avatar: string;
  bio?: string;
  coins?: number;
  watchedSeries?: SeriesReview[];
  profileTheme?: ProfileTheme;
  role?: 'user' | 'admin';
  privacy_settings?: {
    allow_follow?: boolean;
    require_follow_approval?: boolean;
    profile_visibility?: {
      watching?: 'public' | 'followers' | 'private';
      recommendations?: 'public' | 'followers' | 'private';
      stamps?: 'public' | 'followers' | 'private';
      posts?: 'public' | 'followers' | 'private';
    };
    allow_messages?: 'everyone' | 'followers' | 'none';
  };
}

export interface Post {
  id: string | number;
  user_id: string;
  user: User;
  content: string;
  image?: string | null;
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
  userHasLiked?: boolean;
}

export interface Stamp {
  id: string;
  name: string;
  description: string;
  rarity: 'Comum' | 'Raro' | 'Épico' | 'Lendário';
  image_url: string;
  price?: number;
  purchasable?: boolean;
  tmdb_id?: number | null;
  series_title?: string | null;
  req_type?: 'post_count' | 'none';
  req_value?: number;
  max_supply?: number | null;
  current_supply?: number;
}

export interface TMDBSeries {
  id: number;
  name: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  first_air_date?: string;
  backdrop_path?: string | null;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
}