import { supabase } from '../lib/supabase';
import { User } from '../../types';

export const ProfileService = {
  // Buscar perfil do usuário
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Criar perfil inicial
  async createProfile(userId: string, email: string) {
    const name = email.split('@')[0];
    const handle = `@${name}`;
    
    const newProfile = {
      id: userId,
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
      handle,
      avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
      bio: 'Novo na comunidade Maratonei!',
      coins: 50,
      profile_theme: 'default'
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(newProfile)
      .select()
      .single();

    if (error) {
        console.error('Erro ao criar perfil:', error); // Log para debug
        // Se der erro de duplicidade (handle já existe), tentamos ajustar
        if (error.code === '23505') { // Postgres Unique Violation
             newProfile.handle = `${handle}_${Math.floor(Math.random() * 1000)}`;
             return await supabase.from('profiles').insert(newProfile).select().single().then(res => res.data);
        }
        throw error;
    }
    
    return data;
  },

  // Atualizar perfil
  async updateProfile(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
