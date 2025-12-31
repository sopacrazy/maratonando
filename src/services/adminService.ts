import { supabase } from '../lib/supabase';
import { Stamp } from '../../types';

export const AdminService = {
    // Check if current user is admin
    async isAdmin(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error checking admin status:', error);
            return false;
        }

        return data?.role === 'admin';
    },

    // Create a new stamp
    async createStamp(
        name: string,
        description: string,
        rarity: string,
        imageFile: File,
        isPurchasable: boolean = false,
        price: number = 0,
        tmdbId?: number | null,
        seriesTitle?: string | null,
        reqType?: string,
        reqValue?: number,
        maxSupply?: number | null
    ): Promise<Stamp | null> {
        try {
            // 1. Upload Image
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `badges/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('badges')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('badges').getPublicUrl(fileName);
            const imageUrl = publicUrlData.publicUrl;

            // 2. Insert into DB
            const { data, error } = await supabase
                .from('stamps')
                .insert({
                    name,
                    description,
                    rarity,
                    image_url: imageUrl,
                    purchasable: isPurchasable,
                    price: isPurchasable ? price : 0,
                    tmdb_id: tmdbId,
                    series_title: seriesTitle,
                    req_type: reqType || 'none',
                    req_value: reqValue || 0,
                    max_supply: maxSupply
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating stamp:', error);
            throw error;
        }
    },

    async deleteStamp(stampId: string) {
        // 1. Delete associated user stamps first (Cascade manually)
        const { error: relError } = await supabase
            .from('user_stamps')
            .delete()
            .eq('stamp_id', stampId);

        if (relError) throw relError;

        // 2. Delete the stamp
        const { error } = await supabase
            .from('stamps')
            .delete()
            .eq('id', stampId);

        if (error) throw error;
    },

    async getAllStamps() {
        const { data, error } = await supabase
            .from('stamps')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },
    // Update an existing stamp
    async updateStamp(
        id: string,
        updates: {
            name: string;
            description: string;
            rarity: string;
            isPurchasable: boolean;
            price: number;
            tmdbId?: number | null;
            seriesTitle?: string | null;
            reqType?: string;
            reqValue?: number;
            maxSupply?: number | null;
        },
        newImageFile?: File | null
    ): Promise<Stamp | null> {
        try {
            let imageUrl = undefined;

            // 1. Upload New Image if provided
            if (newImageFile) {
                const fileExt = newImageFile.name.split('.').pop();
                const fileName = `badges/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('badges')
                    .upload(fileName, newImageFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('badges').getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }

            // 2. Prepare Update Object
            const updatePayload: any = {
                name: updates.name,
                description: updates.description,
                rarity: updates.rarity,
                purchasable: updates.isPurchasable,
                price: updates.isPurchasable ? updates.price : 0,
                tmdb_id: updates.tmdbId,
                series_title: updates.seriesTitle,
                req_type: updates.reqType || 'none',
                req_value: updates.reqValue || 0,
                max_supply: updates.maxSupply
            };

            if (imageUrl) {
                updatePayload.image_url = imageUrl;
            }

            // 3. Update in DB
            const { data, error } = await supabase
                .from('stamps')
                .update(updatePayload)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating stamp:', error);
            throw error;
        }
    }
};
