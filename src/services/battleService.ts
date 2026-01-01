import { supabase } from "../lib/supabase";
import { TMDBSeries } from "./tmdbService";

export interface BattleComment {
  id: string;
  battle_id: string;
  user_id: string;
  side: 'agree' | 'disagree';
  content: string;
  likes_count: number;
  created_at: string;
  user?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
  userHasLiked?: boolean;
}

export interface OpinionBattle {
  id: string;
  creator_id: string;
  topic: string;
  description: string;
  tmdb_id: number | null;
  series_title: string | null;
  series_image: string | null;
  duration_hours: number;
  is_public: boolean;
  status: 'active' | 'ended';
  winner_side: 'agree' | 'disagree' | null;
  winner_comment_id: string | null;
  ends_at: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
  agreeComments?: BattleComment[];
  disagreeComments?: BattleComment[];
}

export const BattleService = {
  // Criar uma nova batalha
  async createBattle(
    creatorId: string,
    topic: string,
    description: string,
    durationHours: number,
    isPublic: boolean,
    series?: TMDBSeries
  ): Promise<OpinionBattle> {
    try {
      if (!creatorId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      if (!topic || topic.trim().length === 0) {
        throw new Error("O título da batalha não pode estar vazio.");
      }

      if (!description || description.trim().length === 0) {
        throw new Error("A descrição da batalha não pode estar vazia.");
      }

      // Para testes: permitir 10 segundos (0.0028 horas) até 48 horas
      if (durationHours < 0.0028 || durationHours > 48) {
        throw new Error("A duração deve ser entre 10 segundos e 48 horas.");
      }

      if (!series) {
        throw new Error("Uma série relacionada é obrigatória.");
      }

      // Calcular data de término (suporta horas decimais para testes)
      const endsAt = new Date();
      endsAt.setTime(endsAt.getTime() + (durationHours * 60 * 60 * 1000)); // Converter horas para milissegundos

      const { data, error } = await supabase
        .from("opinion_battles")
        .insert({
          creator_id: creatorId,
          topic: topic.trim(),
          description: description.trim(),
          tmdb_id: series.id,
          series_title: series.name,
          series_image: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null,
          duration_hours: durationHours,
          is_public: isPublic,
          ends_at: endsAt.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Erro ao criar batalha.");
      }

      return data;
    } catch (error: any) {
      console.error("Erro ao criar batalha:", error);
      throw error;
    }
  },

  // Buscar batalhas (feed)
  async getBattles(
    userId?: string,
    feedType: 'global' | 'following' = 'global',
    limit: number = 10,
    offset: number = 0
  ): Promise<OpinionBattle[]> {
    try {
      let query = supabase
        .from("opinion_battles")
        .select(`
          *,
          creator:profiles!opinion_battles_creator_id_fkey (
            id,
            name,
            handle,
            avatar
          )
        `)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Filtrar por feed type
      if (feedType === 'following' && userId) {
        // Primeiro buscar IDs dos usuários seguidos
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);

        const followingIds = followingData?.map(f => f.following_id) || [];
        
        if (followingIds.length > 0) {
          query = query.in('creator_id', followingIds);
        } else {
          // Se não segue ninguém, retornar array vazio
          return [];
        }
      }

      // Filtrar apenas batalhas ativas ou que ainda não terminaram
      // Não filtrar por status aqui, vamos mostrar todas e filtrar no frontend se necessário

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message || "Erro ao buscar batalhas.");
      }

      // Carregar comentários para cada batalha
      if (data) {
        const battlesWithComments = await Promise.all(
          data.map(async (battle) => {
            const comments = await this.getBattleComments(battle.id, userId);
            return {
              ...battle,
              agreeComments: comments.filter(c => c.side === 'agree'),
              disagreeComments: comments.filter(c => c.side === 'disagree'),
            };
          })
        );
        return battlesWithComments;
      }

      return [];
    } catch (error: any) {
      console.error("Erro ao buscar batalhas:", error);
      throw error;
    }
  },

  // Buscar comentários de uma batalha
  async getBattleComments(battleId: string, userId?: string): Promise<BattleComment[]> {
    try {
      const { data, error } = await supabase
        .from("battle_comments")
        .select(`
          *,
          user:profiles!battle_comments_user_id_fkey (
            id,
            name,
            handle,
            avatar
          )
        `)
        .eq("battle_id", battleId)
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Erro ao buscar comentários.");
      }

      // Verificar se o usuário curtiu cada comentário
      if (userId && data) {
        const commentIds = data.map(c => c.id);
        const { data: likes } = await supabase
          .from("battle_comment_likes")
          .select("comment_id")
          .eq("user_id", userId)
          .in("comment_id", commentIds);

        const likedCommentIds = new Set(likes?.map(l => l.comment_id) || []);

        return data.map(comment => ({
          ...comment,
          userHasLiked: likedCommentIds.has(comment.id),
        }));
      }

      return data || [];
    } catch (error: any) {
      console.error("Erro ao buscar comentários:", error);
      throw error;
    }
  },

  // Adicionar comentário/argumento
  async addComment(
    battleId: string,
    userId: string,
    side: 'agree' | 'disagree',
    content: string
  ): Promise<BattleComment> {
    try {
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      if (!content || content.trim().length === 0) {
        throw new Error("O argumento não pode estar vazio.");
      }

      // Verificar se a batalha ainda está ativa
      const { data: battle } = await supabase
        .from("opinion_battles")
        .select("status, ends_at")
        .eq("id", battleId)
        .single();

      if (!battle) {
        throw new Error("Batalha não encontrada.");
      }

      if (battle.status === 'ended') {
        throw new Error("Esta batalha já foi finalizada.");
      }

      const endsAt = new Date(battle.ends_at);
      if (endsAt < new Date()) {
        throw new Error("Esta batalha já expirou.");
      }

      const { data, error } = await supabase
        .from("battle_comments")
        .insert({
          battle_id: battleId,
          user_id: userId,
          side,
          content: content.trim(),
        })
        .select(`
          *,
          user:profiles!battle_comments_user_id_fkey (
            id,
            name,
            handle,
            avatar
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message || "Erro ao adicionar argumento.");
      }

      return data;
    } catch (error: any) {
      console.error("Erro ao adicionar comentário:", error);
      throw error;
    }
  },

  // Curtir/descurtir comentário
  async toggleLikeComment(commentId: string, userId: string): Promise<boolean> {
    try {
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      // Verificar se já curtiu
      const { data: existingLike } = await supabase
        .from("battle_comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      if (existingLike) {
        // Descurtir
        const { error } = await supabase
          .from("battle_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);

        if (error) throw error;
        return false;
      } else {
        // Curtir
        const { error } = await supabase
          .from("battle_comment_likes")
          .insert({
            comment_id: commentId,
            user_id: userId,
          });

        if (error) throw error;
        return true;
      }
    } catch (error: any) {
      console.error("Erro ao curtir comentário:", error);
      throw error;
    }
  },

  // Deletar batalha (apenas criador)
  async deleteBattle(battleId: string, userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      // Verificar se é o criador
      const { data: battle } = await supabase
        .from("opinion_battles")
        .select("creator_id, status")
        .eq("id", battleId)
        .single();

      if (!battle) {
        throw new Error("Batalha não encontrada.");
      }

      if (battle.creator_id !== userId) {
        throw new Error("Apenas o criador pode excluir a batalha.");
      }

      // Deletar comentários primeiro (cascade)
      const { error: commentsError } = await supabase
        .from("battle_comments")
        .delete()
        .eq("battle_id", battleId);

      if (commentsError) {
        throw new Error(commentsError.message || "Erro ao excluir comentários da batalha.");
      }

      // Deletar a batalha
      const { error } = await supabase
        .from("opinion_battles")
        .delete()
        .eq("id", battleId);

      if (error) {
        throw new Error(error.message || "Erro ao excluir batalha.");
      }
    } catch (error: any) {
      console.error("Erro ao excluir batalha:", error);
      throw error;
    }
  },

  // Deletar comentário
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      // Verificar se é o dono do comentário
      const { data: comment } = await supabase
        .from("battle_comments")
        .select("user_id, battle_id")
        .eq("id", commentId)
        .single();

      if (!comment) {
        throw new Error("Comentário não encontrado.");
      }

      if (comment.user_id !== userId) {
        throw new Error("Você só pode excluir seus próprios comentários.");
      }

      // Verificar se a batalha ainda está ativa
      const { data: battle } = await supabase
        .from("opinion_battles")
        .select("status")
        .eq("id", comment.battle_id)
        .single();

      if (battle?.status === 'ended') {
        throw new Error("Não é possível excluir comentários de batalhas finalizadas.");
      }

      const { error } = await supabase
        .from("battle_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        throw new Error(error.message || "Erro ao excluir comentário.");
      }
    } catch (error: any) {
      console.error("Erro ao excluir comentário:", error);
      throw error;
    }
  },

  // Finalizar batalha automaticamente baseado em curtidas
  async endBattleAutomatically(battleId: string): Promise<void> {
    try {
      // Buscar todos os comentários da batalha ordenados por curtidas
      const { data: comments, error: commentsError } = await supabase
        .from("battle_comments")
        .select("id, side, likes_count")
        .eq("battle_id", battleId)
        .order("likes_count", { ascending: false });

      if (commentsError) {
        throw new Error(commentsError.message || "Erro ao buscar comentários.");
      }

      if (!comments || comments.length === 0) {
        // Sem comentários, finalizar sem vencedor
        const { error } = await supabase
          .from("opinion_battles")
          .update({
            status: 'ended',
            winner_comment_id: null,
            winner_side: null
          })
          .eq("id", battleId);
        
        if (error) throw error;
        return;
      }

      // Separar por lado e pegar o mais curtido de cada
      const agreeComments = comments.filter(c => c.side === 'agree');
      const disagreeComments = comments.filter(c => c.side === 'disagree');

      const bestAgree = agreeComments.length > 0 ? agreeComments[0] : null;
      const bestDisagree = disagreeComments.length > 0 ? disagreeComments[0] : null;

      let winnerCommentId: string | null = null;
      let winnerSide: 'agree' | 'disagree' | null = null;

      if (bestAgree && bestDisagree) {
        // Comparar curtidas
        if (bestAgree.likes_count > bestDisagree.likes_count) {
          winnerCommentId = bestAgree.id;
          winnerSide = 'agree';
        } else if (bestDisagree.likes_count > bestAgree.likes_count) {
          winnerCommentId = bestDisagree.id;
          winnerSide = 'disagree';
        }
        // Se empatar, winnerSide fica null (ninguém ganha pontos)
      } else if (bestAgree) {
        winnerCommentId = bestAgree.id;
        winnerSide = 'agree';
      } else if (bestDisagree) {
        winnerCommentId = bestDisagree.id;
        winnerSide = 'disagree';
      }

      // Atualizar batalha
      const { error } = await supabase
        .from("opinion_battles")
        .update({
          status: 'ended',
          winner_comment_id: winnerCommentId,
          winner_side: winnerSide
        })
        .eq("id", battleId);

      if (error) {
        throw new Error(error.message || "Erro ao finalizar batalha.");
      }
    } catch (error: any) {
      console.error("Erro ao finalizar batalha automaticamente:", error);
      throw error;
    }
  },

  // Finalizar batalha e escolher vencedor (apenas criador) - DEPRECATED
  async endBattle(
    battleId: string,
    creatorId: string,
    winnerCommentId: string
  ): Promise<OpinionBattle> {
    try {
      if (!creatorId) {
        throw new Error("Usuário não identificado. Faça login novamente.");
      }

      // Verificar se é o criador
      const { data: battle } = await supabase
        .from("opinion_battles")
        .select("creator_id, status")
        .eq("id", battleId)
        .single();

      if (!battle) {
        throw new Error("Batalha não encontrada.");
      }

      if (battle.creator_id !== creatorId) {
        throw new Error("Apenas o criador pode finalizar a batalha.");
      }

      if (battle.status === 'ended') {
        throw new Error("Esta batalha já foi finalizada.");
      }

      // Buscar o comentário vencedor para determinar o lado
      const { data: winnerComment } = await supabase
        .from("battle_comments")
        .select("side")
        .eq("id", winnerCommentId)
        .single();

      if (!winnerComment) {
        throw new Error("Comentário vencedor não encontrado.");
      }

      const { data, error } = await supabase
        .from("opinion_battles")
        .update({
          status: 'ended',
          winner_comment_id: winnerCommentId,
          winner_side: winnerComment.side,
        })
        .eq("id", battleId)
        .select(`
          *,
          creator:profiles!opinion_battles_creator_id_fkey (
            id,
            name,
            handle,
            avatar
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message || "Erro ao finalizar batalha.");
      }

      return data;
    } catch (error: any) {
      console.error("Erro ao finalizar batalha:", error);
      throw error;
    }
  },

  // Buscar ranking de críticos
  async getCriticRanking(limit: number = 50): Promise<Array<{
    id: string;
    name: string;
    handle: string;
    avatar: string;
    critic_score: number;
    rank: number;
  }>> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, handle, avatar, critic_score")
        .order("critic_score", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message || "Erro ao buscar ranking.");
      }

      return (data || []).map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    } catch (error: any) {
      console.error("Erro ao buscar ranking:", error);
      throw error;
    }
  },
};

