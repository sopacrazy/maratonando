import { supabase } from '../lib/supabase';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  user?: {
      name: string;
      handle: string;
      avatar: string;
  }
}

export const PostService = {
  async createPost(userId: string, content: string, imageFile: File | null) {
    let imageUrl = null;

    // 1. Upload da imagem se existir
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('post-images').getPublicUrl(fileName);
      imageUrl = data.publicUrl;
    }

    // 2. Criar registro no banco
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getFeed() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:profiles(name, handle, avatar)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map((post: any) => ({
        id: post.id,
        user: post.user, 
        content: post.content,
        image: post.image_url,
        timeAgo: calculateTimeAgo(post.created_at),
        likes: post.likes_count || 0,
        comments: 0,
        shares: 0,
        isSpoiler: false, // Default
    }));
  },

  async deletePost(postId: string) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId); // RLS protege para apagar apenas se for dono
      
    if (error) throw error;
  }
};

function calculateTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
}

