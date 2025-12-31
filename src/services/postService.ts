import { supabase } from "../lib/supabase";

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
  };
}

export const PostService = {
  async createPost(
    userId: string,
    content: string,
    imageFile: File | null,
    tmdbId?: number,
    seriesTitle?: string,
    isSpoiler?: boolean,
    spoilerTopic?: string
  ) {
    try {
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      if (!content || content.trim().length === 0) {
        throw new Error("O conteúdo da publicação não pode estar vazio.");
      }

      let imageUrl = null;

      // 1. Upload da imagem se existir
      if (imageFile) {
        // Validar tamanho da imagem (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (imageFile.size > maxSize) {
          throw new Error("A imagem é muito grande. Tamanho máximo: 5MB.");
        }

        // Validar tipo de arquivo
        const validTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!validTypes.includes(imageFile.type)) {
          throw new Error(
            "Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WEBP."
          );
        }

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageFile);

        if (uploadError) {
          if (uploadError.message.includes("Bucket")) {
            throw new Error("Erro ao fazer upload da imagem. Tente novamente.");
          }
          throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
        }

        const { data } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      // 2. Criar registro no banco
      const postData: any = {
        user_id: userId,
        content: content.trim(),
        image_url: imageUrl,
        tmdb_id: tmdbId || null,
        series_title: seriesTitle || null,
      };

      if (isSpoiler !== undefined) {
        postData.is_spoiler = isSpoiler;
      }
      if (spoilerTopic) {
        postData.spoiler_topic = spoilerTopic.trim();
      }

      const { data, error } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Esta publicação já existe.");
        }
        if (error.code === "42501") {
          throw new Error("Você não tem permissão para criar publicações.");
        }
        throw new Error(`Erro ao criar publicação: ${error.message}`);
      }

      if (!data) {
        throw new Error(
          "Publicação criada mas não foi possível recuperar os dados."
        );
      }

      // Notificações e badges em background (não bloqueiam a criação)
      try {
        await this.notifyMentions(content, data.id, userId, "post");
      } catch (notifyError) {
        console.error("Erro ao notificar menções:", notifyError);
        // Não falha a criação do post se a notificação falhar
      }

      try {
        if (data.tmdb_id) {
          const { BadgeService } = await import("./badgeService");
          await BadgeService.checkPostBadges(userId, data.tmdb_id);
        }
      } catch (badgeError) {
        console.error("Erro ao verificar badges:", badgeError);
        // Não falha a criação do post se a verificação de badge falhar
      }

      return data;
    } catch (error: any) {
      // Re-throw com mensagem mais amigável
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erro inesperado ao criar publicação. Tente novamente.");
    }
  },

  async notifyMentions(
    content: string,
    postId: string,
    actorId: string,
    type: "post" | "comment"
  ) {
    const mentions = content.match(/@[\w.]+/g);
    if (!mentions) return;

    const uniqueHandles = [...new Set(mentions.map((m) => m.slice(1)))];

    for (const handle of uniqueHandles) {
      // Find user by handle (or name if exact match fallback)
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .or(`handle.eq.${handle},name.eq.${handle}`) // simple verification
        .limit(1);

      const mentionedUser = users?.[0];

      if (mentionedUser && mentionedUser.id !== actorId) {
        await supabase.from("notifications").insert({
          user_id: mentionedUser.id,
          actor_id: actorId,
          type: "mention",
          content: `mencionou você em ${
            type === "post" ? "uma publicação" : "um comentário"
          }.`,
          read: false,
          link: `/post/${postId}`,
        });
      }
    }
  },

  async likePost(postId: string, userId: string) {
    // 1. Add to post_likes
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: userId });

    if (error) throw error;

    // 2. Increment likes_count (optional optimization, or just count relationship)
    // We will stick to counting relationship for accuracy, but let's update count for display speed if needed
    // For now, let's just trigger a notification

    // Fetch post author to notify
    const { data: post } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();
    if (post && post.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        actor_id: userId,
        type: "like",
        content: "curtiu sua publicação.",
        read: false,
        link: `/post/${postId}`,
      });
    }
  },

  async unlikePost(postId: string, userId: string) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .match({ post_id: postId, user_id: userId });

    if (error) throw error;
  },

  async hasLiked(postId: string, userId: string) {
    const { data, error } = await supabase
      .from("post_likes")
      .select("*")
      .match({ post_id: postId, user_id: userId })
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return !!data;
  },

  async getComments(postId: string) {
    const { data, error } = await supabase
      .from("post_comments")
      .select("*, author:profiles(id, name, avatar)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  async addComment(postId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: userId, content })
      .select("*, author:profiles(id, name, avatar)")
      .single();

    if (!error && data) {
      await this.notifyMentions(content, postId, userId, "comment");
    }

    if (error) throw error;

    // Notify author
    const { data: post } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();
    if (post && post.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        actor_id: userId,
        type: "comment",
        content: "comentou na sua publicação.",
        read: false,
        link: `/post/${postId}`,
      });
    }

    return data;
  },

  // Type fix helper
  async getFeed(
    page = 1,
    limit = 5,
    type: "global" | "following" = "global",
    userId?: string
  ) {
    try {
      if (page < 1) {
        throw new Error("Página inválida.");
      }

      if (limit < 1 || limit > 50) {
        throw new Error("Limite de itens inválido.");
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("posts")
        .select(
          "*, user:profiles!user_id(id, name, handle, avatar), post_likes(user_id), post_comments(count)",
          { count: "exact" }
        );

      if (type === "following" && userId) {
        const { data: follows, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);

        if (followsError) {
          throw new Error("Erro ao buscar pessoas que você segue.");
        }

        const ids = follows?.map((f) => f.following_id) || [];
        if (ids.length > 0) {
          query = query.in("user_id", ids);
        } else {
          // Se não está seguindo ninguém, retorna vazio
          return { data: [], count: 0 };
        }
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, count, error } = await query.range(from, to);

      if (error) {
        if (error.code === "PGRST301") {
          throw new Error("Erro de permissão ao buscar publicações.");
        }
        throw new Error(`Erro ao carregar feed: ${error.message}`);
      }

      const posts = (data || []).map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        user: post.user || {
          id: "",
          name: "Usuário",
          handle: "@usuario",
          avatar: "",
        },
        content: post.content || "",
        image: post.image_url,
        timeAgo: post.created_at
          ? calculateTimeAgo(post.created_at)
          : "Agora mesmo",
        likes: post.post_likes ? post.post_likes.length : post.likes_count || 0,
        comments: post.post_comments ? post.post_comments[0]?.count || 0 : 0,
        shares: 0,
        isSpoiler: post.is_spoiler || false,
        spoilerTopic: post.spoiler_topic || null,
        post_likes: post.post_likes || [],
        tag: post.tmdb_id
          ? {
              type: "watching",
              text: post.series_title || "Série",
            }
          : undefined,
      }));

      return { data: posts, count: count || 0 };
    } catch (error: any) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erro inesperado ao carregar feed. Tente novamente.");
    }
  },

  async getUserPosts(userId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, user:profiles!user_id(id, name, handle, avatar), post_likes(user_id), post_comments(count)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((post: any) => ({
      id: post.id,
      user_id: post.user_id,
      user: post.user,
      content: post.content,
      image: post.image_url,
      timeAgo: calculateTimeAgo(post.created_at),
      likes: post.post_likes ? post.post_likes.length : post.likes_count || 0,
      comments: post.post_comments ? post.post_comments[0].count : 0,
      shares: 0,
      isSpoiler: post.is_spoiler || false,
      spoilerTopic: post.spoiler_topic || null,
      post_likes: post.post_likes || [],
      tag: post.tmdb_id
        ? {
            type: "watching",
            text: post.series_title || "Série",
          }
        : undefined,
    }));
  },

  async deletePost(postId: string) {
    const { error } = await supabase.from("posts").delete().eq("id", postId); // RLS protege para apagar apenas se for dono

    if (error) throw error;
  },
};

function calculateTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Agora mesmo";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}
