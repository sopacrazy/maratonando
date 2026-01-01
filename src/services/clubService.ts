import { supabase } from '../lib/supabase';

// Helper para mostrar erros (será usado apenas em casos específicos)
const showError = (message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
  console.error(`[ClubService] ${type.toUpperCase()}:`, message);
};

export interface Club {
  id: string;
  name: string;
  description?: string;
  color: string;
  image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  user_role?: 'admin' | 'vice_leader' | 'moderator' | 'member';
  is_member?: boolean;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'admin' | 'vice_leader' | 'moderator' | 'member';
  joined_at: string;
  last_seen: string;
  user?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
  is_online?: boolean;
}

export interface ClubPost {
  id: string;
  club_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

export interface ClubMessage {
  id: string;
  club_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
}

export const ClubService = {
  // Criar clube
  async createClub(name: string, description: string, color: string = '#6366f1', imageFile?: File) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se já existe um clube com o mesmo nome
      const trimmedName = name.trim();
      const { data: existingClub, error: checkError } = await supabase
        .from('clubes')
        .select('id, name')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error('Erro ao verificar nome do clube');
      }

      if (existingClub) {
        throw new Error('Já existe um clube com este nome. Por favor, escolha outro nome.');
      }

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `clubes/${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('club-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('club-images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const { data, error } = await supabase
        .from('clubes')
        .insert({
          name: name.trim(),
          description: description.trim(),
          color,
          image_url: imageUrl,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // O trigger create_club_admin já cria o membro admin automaticamente
      // Vamos garantir usando a função RPC (que tem ON CONFLICT DO UPDATE)
      // Isso evita erros 409 (Conflict) se o trigger já criou
      try {
        // Aguardar um pouco para garantir que o trigger executou
        await new Promise(resolve => setTimeout(resolve, 300));

        // Usar função RPC para garantir que o admin foi criado
        // A função tem ON CONFLICT DO UPDATE, então não causará erro 409
        const { data: memberId, error: rpcError } = await supabase
          .rpc('insert_club_member', {
            p_club_id: data.id,
            p_user_id: userId,
            p_role: 'admin'
          });

        if (rpcError) {
          console.warn('Aviso ao garantir membro admin via RPC:', rpcError.message);
          // Não é crítico - o trigger pode ter criado, ou o usuário pode entrar manualmente
        }

        // Verificar se o membro foi criado (opcional, apenas para log)
        const { data: verifyMember } = await supabase
          .rpc('get_club_member', {
            p_club_id: data.id,
            p_user_id: userId
          });

        if (!verifyMember || verifyMember.length === 0) {
          console.warn('Aviso: Membro admin não foi encontrado após criação do clube. Você pode precisar entrar no clube manualmente.');
        }
      } catch (memberError: any) {
        // Não falha a criação do clube se houver erro ao criar membro
        // O trigger já deve ter criado, ou o usuário pode entrar manualmente
        console.warn('Aviso ao verificar/criar membro admin:', memberError.message);
      }

      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar clube');
    }
  },

  // Buscar clubes (todos ou por pesquisa)
  async getClubs(searchQuery?: string, userId?: string) {
    try {
      let query = supabase.from('clubes').select('*');

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (userId) {
        // Buscar clubes onde o usuário é membro
        // Tentar query direta primeiro (mais rápido)
        const { data: userClubs, error: membersError } = await supabase
          .from('club_members')
          .select('club_id, role')
          .eq('user_id', userId);

        if (membersError) {
          // Se falhar, tentar usar RPC para cada clube (mais lento, mas funciona)
          console.warn('[ClubService.getClubs] Erro ao buscar membros, tentando RPC...', membersError);
          // Por enquanto, retornar todos os clubes e filtrar depois
        } else {
          const clubIds = userClubs?.map(uc => uc.club_id) || [];
          
          if (clubIds.length === 0) {
            return [];
          }

          query = query.in('id', clubIds);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const clubIds = data.map(c => c.id);
      const countMap = new Map<string, number>();
      const membershipMap = new Map<string, string>();

      // Buscar contagem de membros e roles
      // Tentar query direta primeiro
      try {
        const { data: allMembers, error: membersError } = await supabase
          .from('club_members')
          .select('club_id, role, user_id')
          .in('club_id', clubIds);

        if (!membersError && allMembers) {
          // Contar membros por clube
          allMembers.forEach(m => {
            countMap.set(m.club_id, (countMap.get(m.club_id) || 0) + 1);
            
            // Verificar se usuário é membro
            if (userId && m.user_id === userId) {
              membershipMap.set(m.club_id, m.role);
            }
          });
        } else {
          // Fallback: usar query direta para cada clube
          for (const clubId of clubIds) {
            try {
              const { data: members } = await supabase
                .from('club_members')
                .select('club_id, role, user_id')
                .eq('club_id', clubId);

              if (members) {
                countMap.set(clubId, members.length);
                
                if (userId) {
                  const userMember = members.find(m => m.user_id === userId);
                  if (userMember) {
                    membershipMap.set(clubId, userMember.role);
                  }
                }
              }
            } catch (err) {
              countMap.set(clubId, 0);
            }
          }
        }
      } catch (err) {
        // Se tudo falhar, definir valores padrão
        console.error('[ClubService.getClubs] Erro ao buscar membros:', err);
        clubIds.forEach(id => {
          countMap.set(id, 0);
        });
      }

      // Se userId foi fornecido mas não encontramos membros na query direta, verificar usando RPC
      if (userId && membershipMap.size === 0) {
        for (const clubId of clubIds) {
          try {
            const { data: member } = await supabase
              .rpc('get_club_member', {
                p_club_id: clubId,
                p_user_id: userId
              });
            
            if (member && member.length > 0) {
              membershipMap.set(clubId, member[0].role);
            }
          } catch (err) {
            // Ignorar erros individuais
          }
        }
      }

      return data.map(club => ({
        ...club,
        user_role: membershipMap.get(club.id) as any,
        is_member: membershipMap.has(club.id),
        member_count: countMap.get(club.id) || 0
      }));
    } catch (error: any) {
      console.error('[ClubService.getClubs] Erro:', error);
      throw new Error(error.message || 'Erro ao buscar clubes');
    }
  },

  // Buscar clube por ID
  async getClubById(clubId: string, userId?: string) {
    try {
      const { data: club, error } = await supabase
        .from('clubes')
        .select('*')
        .eq('id', clubId)
        .single();

      if (error) throw error;

      // Buscar role do usuário e contagem de membros
      let userRole = undefined;
      let isMember = false;
      let memberCount = 0;

      if (userId) {
        const { data: membership } = await supabase
          .from('club_members')
          .select('role')
          .eq('club_id', clubId)
          .eq('user_id', userId)
          .single();

        userRole = membership?.role as any;
        isMember = !!membership;
      }

      // Contar membros
      const { count } = await supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', clubId);

      memberCount = count || 0;

      return {
        ...club,
        user_role: userRole,
        is_member: isMember,
        member_count: memberCount
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao buscar clube');
    }
  },

  // Entrar no clube
  async joinClub(clubId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Usar função RPC para inserir (bypassa RLS completamente)
      const { data: insertedId, error: rpcError } = await supabase
        .rpc('insert_club_member', {
          p_club_id: clubId,
          p_user_id: userId,
          p_role: 'member'
        });

      if (!rpcError && insertedId) {
        // Buscar dados usando RPC
        const { data: memberData, error: getError } = await supabase
          .rpc('get_club_member', {
            p_club_id: clubId,
            p_user_id: userId
          });

        if (!getError && memberData && memberData.length > 0) {
          return memberData[0];
        }

        // Fallback: buscar diretamente
        const { data: member } = await supabase
          .from('club_members')
          .select('id, role')
          .eq('id', insertedId)
          .maybeSingle();
        if (member) return member;
      }

      // Se RPC falhou, verificar se já é membro
      const { data: existing, error: checkError } = await supabase
        .rpc('get_club_member', {
          p_club_id: clubId,
          p_user_id: userId
        });

      if (!checkError && existing && existing.length > 0) {
        return existing[0];
      }

      // Último fallback: inserir diretamente
      const { data, error } = await supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: userId,
          role: 'member'
        })
        .select('id, role')
        .maybeSingle();

      if (error) {
        // Se for erro de duplicata, tentar buscar novamente
        if (error.code === '23505') {
          const { data: member } = await supabase
            .rpc('get_club_member', {
              p_club_id: clubId,
              p_user_id: userId
            });
          if (member && member.length > 0) return member[0];
        }
        throw error;
      }

      return data || { id: '', role: 'member' };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao entrar no clube');
    }
  },

  // Sair do clube
  async leaveClub(clubId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se é admin usando RPC (bypassa RLS)
      const { data: isAdmin } = await supabase
        .rpc('is_club_admin', {
          p_club_id: clubId,
          p_user_id: userId
        });

      if (isAdmin) {
        throw new Error('Admin não pode sair do clube. Passe a liderança ou exclua o clube.');
      }

      // Tentar usar função RPC primeiro
      const { data: deleted, error: rpcError } = await supabase
        .rpc('delete_club_member', {
          p_club_id: clubId,
          p_user_id: userId,
          p_member_user_id: userId
        });

      if (!rpcError && deleted) {
        return true;
      }

      // Fallback: deletar diretamente
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao sair do clube');
    }
  },

  // Buscar membros do clube
  async getClubMembers(clubId: string) {
    try {
      // Usar query direta (RLS está desabilitado em club_members, então funciona)
      // Não usar RPC para evitar erros 400 se a função não existir
      const { data: membersDirect, error } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;
      if (!membersDirect || membersDirect.length === 0) return [];
      
      const members = membersDirect;

      // Buscar dados dos usuários
      const userIds = members.map(m => m.user_id);
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, handle, avatar')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Determinar se está online (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      return members.map(member => ({
        ...member,
        user: userMap.get(member.user_id),
        is_online: member.last_seen ? new Date(member.last_seen) > new Date(fiveMinutesAgo) : false
      }));
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao buscar membros');
    }
  },

  // Atualizar role de membro (apenas admin)
  async updateMemberRole(clubId: string, memberId: string, newRole: 'vice_leader' | 'moderator' | 'member') {
    try {
      // Usar função RPC para evitar recursão infinita em RLS
      const { data: success, error: rpcError } = await supabase
        .rpc('update_club_member', {
          p_member_id: memberId,
          p_new_role: newRole
        });

      if (rpcError) {
        // Fallback: tentar update direto (pode falhar por RLS, mas tenta)
        const { error } = await supabase
          .from('club_members')
          .update({ role: newRole })
          .eq('club_id', clubId)
          .eq('id', memberId);

        if (error) throw error;
      }

      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao atualizar cargo');
    }
  },

  // Expulsar membro (apenas admin/moderator)
  async removeMember(clubId: string, memberId: string) {
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('id', memberId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao expulsar membro');
    }
  },

  // Passar liderança (admin passa para outro)
  async transferLeadership(clubId: string, newAdminId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se é admin atual usando RPC (evita recursão)
      const { data: isAdmin } = await supabase
        .rpc('is_club_admin', {
          p_club_id: clubId,
          p_user_id: userId
        });

      if (!isAdmin) {
        throw new Error('Apenas o admin pode passar a liderança');
      }

      // Buscar ID do membro que receberá a liderança usando RPC
      const { data: newAdminMember } = await supabase
        .rpc('get_club_member', {
          p_club_id: clubId,
          p_user_id: newAdminId
        });

      if (!newAdminMember || newAdminMember.length === 0) {
        throw new Error('Membro não encontrado');
      }

      // Buscar ID do membro atual (antigo admin) usando RPC
      const { data: currentMember } = await supabase
        .rpc('get_club_member', {
          p_club_id: clubId,
          p_user_id: userId
        });

      if (!currentMember || currentMember.length === 0) {
        throw new Error('Erro ao encontrar seu registro de membro');
      }

      // Atualizar usando RPC (evita recursão)
      // Primeiro, tornar o novo admin
      const { error: updateNewAdminError } = await supabase
        .rpc('update_club_member', {
          p_member_id: newAdminMember[0].id,
          p_new_role: 'admin'
        });

      if (updateNewAdminError) {
        throw updateNewAdminError;
      }

      // Depois, tornar o antigo admin como member
      const { error: updateOldAdminError } = await supabase
        .rpc('update_club_member', {
          p_member_id: currentMember[0].id,
          p_new_role: 'member'
        });

      if (updateOldAdminError) {
        throw updateOldAdminError;
      }

      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao passar liderança');
    }
  },

  // Atualizar clube (apenas admin)
  async updateClub(clubId: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    imageFile?: File;
  }) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se é admin (RLS está desabilitado, então podemos fazer query direta)
      const { data: memberData, error: memberError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError || !memberData || memberData.role !== 'admin') {
        throw new Error('Apenas o admin pode atualizar o clube');
      }

      const updateData: any = {};
      
      // Atualizar campos básicos
      if (updates.name) updateData.name = updates.name.trim();
      if (updates.description !== undefined) updateData.description = updates.description.trim();
      if (updates.color) updateData.color = updates.color;

      // Processar imagem se fornecida
      if (updates.imageFile) {
        const fileExt = updates.imageFile.name.split('.').pop();
        const fileName = `clubes/${clubId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('club-images')
          .upload(fileName, updates.imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('club-images').getPublicUrl(fileName);
        updateData.image_url = data.publicUrl;
      }

      const { data, error } = await supabase
        .from('clubes')
        .update(updateData)
        .eq('id', clubId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao atualizar clube');
    }
  },

  // Excluir clube (apenas admin)
  async deleteClub(clubId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se é admin (RLS está desabilitado, então podemos fazer query direta)
      const { data: memberData, error: memberError } = await supabase
        .from('club_members')
        .select('role')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError || !memberData || memberData.role !== 'admin') {
        throw new Error('Apenas o admin pode excluir o clube');
      }

      const { error } = await supabase
        .from('clubes')
        .delete()
        .eq('id', clubId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao excluir clube');
    }
  },

  // Posts do clube
  async getClubPosts(clubId: string, page: number = 1, limit: number = 10) {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: posts, error } = await supabase
        .from('club_posts')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const postIds = posts.map(p => p.id);

      // Buscar dados dos usuários
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, handle, avatar')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Buscar likes
      const { data: likes } = await supabase
        .from('club_post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      const likesMap = new Map<string, number>();
      const userLikesMap = new Map<string, boolean>();
      likes?.forEach(like => {
        likesMap.set(like.post_id, (likesMap.get(like.post_id) || 0) + 1);
        if (like.user_id === userId) {
          userLikesMap.set(like.post_id, true);
        }
      });

      // Buscar contagem de comentários
      const { data: comments } = await supabase
        .from('club_post_comments')
        .select('post_id')
        .in('post_id', postIds);

      const commentsMap = new Map<string, number>();
      comments?.forEach(comment => {
        commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
      });

      return posts.map(post => ({
        id: post.id,
        club_id: post.club_id,
        user_id: post.user_id,
        content: post.content,
        image_url: post.image_url,
        created_at: post.created_at,
        updated_at: post.updated_at,
        user: userMap.get(post.user_id),
        likes_count: likesMap.get(post.id) || 0,
        comments_count: commentsMap.get(post.id) || 0,
        user_has_liked: userLikesMap.get(post.id) || false
      }));
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao buscar posts');
    }
  },

  async createClubPost(clubId: string, content: string, imageFile?: File) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se é membro usando RPC (já que RLS está desabilitado)
      const { data: isMember } = await supabase
        .rpc('is_club_member', {
          p_club_id: clubId,
          p_user_id: userId
        });

      if (!isMember) {
        throw new Error('Você precisa ser membro do clube para criar posts');
      }

      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `club-posts/${clubId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('club-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('club-images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const { data: post, error } = await supabase
        .from('club_posts')
        .insert({
          club_id: clubId,
          user_id: userId,
          content: content.trim(),
          image_url: imageUrl
        })
        .select('*')
        .single();

      if (error) throw error;

      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('profiles')
        .select('id, name, handle, avatar')
        .eq('id', userId)
        .single();

      return {
        ...post,
        user: user || undefined,
        likes_count: 0,
        comments_count: 0,
        user_has_liked: false
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao criar post');
    }
  },

  async deleteClubPost(postId: string) {
    try {
      const { error } = await supabase
        .from('club_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao excluir post');
    }
  },

  async likeClubPost(postId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('club_post_likes')
        .insert({
          post_id: postId,
          user_id: userId
        });

      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao curtir post');
    }
  },

  async unlikeClubPost(postId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('club_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao descurtir post');
    }
  },

  // Mensagens do chat
  async getClubMessages(clubId: string, limit: number = 50) {
    try {
      const { data: messages, error } = await supabase
        .from('club_messages')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      // Buscar dados dos usuários
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, handle, avatar')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      return messages.map(msg => ({
        ...msg,
        user: userMap.get(msg.user_id)
      })).reverse(); // Mais antigas primeiro
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao buscar mensagens');
    }
  },

  async sendClubMessage(clubId: string, content: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      // Verificar se é membro usando RPC (já que RLS está desabilitado)
      const { data: isMember } = await supabase
        .rpc('is_club_member', {
          p_club_id: clubId,
          p_user_id: userId
        });

      if (!isMember) {
        throw new Error('Você precisa ser membro do clube para enviar mensagens');
      }

      const { data: message, error } = await supabase
        .from('club_messages')
        .insert({
          club_id: clubId,
          user_id: userId,
          content: content.trim()
        })
        .select('*')
        .single();

      if (error) throw error;

      // Buscar dados do usuário
      const { data: user } = await supabase
        .from('profiles')
        .select('id, name, handle, avatar')
        .eq('id', userId)
        .single();

      // Atualizar last_seen do membro
      await supabase
        .from('club_members')
        .update({ last_seen: new Date().toISOString() })
        .eq('club_id', clubId)
        .eq('user_id', userId);

      return {
        ...message,
        user: user || undefined
      };
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao enviar mensagem');
    }
  },

  // Atualizar last_seen (para mostrar online)
  async updateLastSeen(clubId: string) {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      // Usar função RPC para atualizar last_seen (já que RLS está desabilitado)
      const { error: rpcError } = await supabase
        .rpc('update_club_member_last_seen', {
          p_club_id: clubId,
          p_user_id: userId
        });

      // Se RPC falhar, tentar update direto (silenciosamente)
      if (rpcError) {
        await supabase
          .from('club_members')
          .update({ last_seen: new Date().toISOString() })
          .eq('club_id', clubId)
          .eq('user_id', userId);
      }
    } catch (error) {
      // Ignorar erros silenciosamente - não é crítico
      console.debug('Erro ao atualizar last_seen:', error);
    }
  }
};

