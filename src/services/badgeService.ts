import { supabase } from '../lib/supabase';
import { Post } from '../../types';

export const BadgeService = {
    // Check if a user qualifies for any badges after posting content
    async checkPostBadges(userId: string, tmdbId?: number) {
        if (!tmdbId) return null;

        try {
            // 1. Find all badges that require 'post_count' for this series
            const { data: potentialBadges } = await supabase
                .from('stamps')
                .select('*')
                .eq('req_type', 'post_count')
                .eq('tmdb_id', tmdbId);

            if (!potentialBadges || potentialBadges.length === 0) return null;

            // 2. Count how many posts the user has for this series
            const { count, error } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('tmdb_id', tmdbId);

            if (error || count === null) return null;

            const currentPostCount = count;

            // 3. For each badge, check if count >= req_value
            for (const badge of potentialBadges) {
                if (currentPostCount >= badge.req_value) {
                    const awarded = await this.awardBadge(userId, badge.id, badge.name);
                    if (awarded) {
                        return badge; // Return the first badge won for immediate display
                    }
                }
            }
        } catch (err) {
            console.error('Error checking post badges:', err);
        }
        return null;
    },

    async awardBadge(userId: string, stampId: string, badgeName: string) {
        // 1. Check if already owns
        const { data: existing } = await supabase
            .from('user_stamps')
            .select('id')
            .match({ user_id: userId, stamp_id: stampId })
            .single();

        if (existing) return false; // Already has it

        // 2. Award!
        const { error } = await supabase
            .from('user_stamps')
            .insert({ user_id: userId, stamp_id: stampId });

        if (!error) {
            // 3. Notify
            await supabase.from('notifications').insert({
                user_id: userId,
                actor_id: userId,
                type: 'badge_earned',
                content: `Você desbloqueou uma nova conquista: ${badgeName}!`,
                read: false,
                link: `badge:${stampId}`
            });
            return true;
        }
        return false;
    },

    async getUserBadges(userId: string) {
        const { data, error } = await supabase
            .from('user_stamps')
            .select(`
            id,
            obtained_at,
            stamp:stamps (*)
        `)
            .eq('user_id', userId);

        if (error) throw error;
        return data.map((item: any) => item.stamp);
    },

    async awardBadgeByName(userId: string, badgeNamePartial: string) {
        try {
            // 1. Find the stamp
            const { data: stamps } = await supabase
                .from('stamps')
                .select('*')
                .ilike('name', `%${badgeNamePartial}%`)
                .limit(1);

            if (!stamps || stamps.length === 0) return null;

            const stamp = stamps[0];

            // 2. Award it
            // We don't care if it returns false (already owned), we still want to return the stamp to display it
            await this.awardBadge(userId, stamp.id, stamp.name);

            return stamp;
        } catch (error) {
            console.error('Error awarding badge by name:', error);
            return null;
        }
    },

    async getMarketplaceBadges() {
        const { data, error } = await supabase
            .from('stamps')
            .select('*')
            .eq('purchasable', true)
            .order('name');
        
        if (error) throw error;
        return data || [];
    },

    async buyStamp(userId: string, stampId: string, price: number) {
        // 1. Check if user already owns the stamp
        const { data: existing } = await supabase
            .from('user_stamps')
            .select('id')
            .match({ user_id: userId, stamp_id: stampId })
            .single();

        if (existing) {
            throw new Error('Você já possui este selo!');
        }

        // 2. Perform transaction (Simulated for now, would be a Postgres function ideally)
        // Check balance would logic happen in UI or stricter backend check
        
        // 3. Award the stamp
        const { error } = await supabase
            .from('user_stamps')
            .insert({ user_id: userId, stamp_id: stampId });
        
        if (error) throw error;
        
        // 4. Notify purchase
        await supabase.from('notifications').insert({
            user_id: userId,
            actor_id: userId,
            type: 'system',
            content: `Você comprou um novo selo!`,
            read: false,
            link: `badge:${stampId}`
        });

        return true;
    }
};
