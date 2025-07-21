// Supabase Client Module
import { SUPABASE_CONFIG } from '../config/supabase-config.js';

export class SupabaseClient {
    constructor() {
        this.client = null;
        this.currentUserId = null;
    }

    async initialize() {
        try {
            this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

            // Get or create user ID
            this.currentUserId = localStorage.getItem('geminiNotesUserId');
            if (!this.currentUserId) {
                this.currentUserId = crypto.randomUUID();
                localStorage.setItem('geminiNotesUserId', this.currentUserId);
            }

            return true;
        } catch (error) {
            console.error("Supabase initialization failed:", error);
            return false;
        }
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getClient() {
        return this.client;
    }

    // Folder operations
    async getFolders(parentId = 'root') {
        const { data, error } = await this.client
            .from('folders')
            .select()
            .eq('user_id', this.currentUserId)
            .eq('parentId', parentId);

        return { data, error };
    }

    async createFolder(name, parentId = 'root') {
        const { data, error } = await this.client
            .from('folders')
            .insert({
                name,
                parentId,
                user_id: this.currentUserId
            })
            .select()
            .single();

        return { data, error };
    }

    async updateFolder(id, updates) {
        const { data, error } = await this.client
            .from('folders')
            .update(updates)
            .eq('id', id)
            .eq('user_id', this.currentUserId);

        return { data, error };
    }

    async deleteFolder(id) {
        // Delete notes in folder first
        await this.client
            .from('notes')
            .delete()
            .eq('folderId', id)
            .eq('user_id', this.currentUserId);

        // Delete folder
        const { data, error } = await this.client
            .from('folders')
            .delete()
            .eq('id', id)
            .eq('user_id', this.currentUserId);

        return { data, error };
    }

    // Note operations
    async getNotes(folderId = 'root') {
        const { data, error } = await this.client
            .from('notes')
            .select()
            .eq('user_id', this.currentUserId)
            .eq('folderId', folderId);

        return { data, error };
    }

    async getNote(id) {
        const { data, error } = await this.client
            .from('notes')
            .select()
            .eq('id', id)
            .eq('user_id', this.currentUserId)
            .single();

        return { data, error };
    }

    async createNote(title = 'Nova Nota', body = '<p><br></p>', folderId = 'root') {
        const { data, error } = await this.client
            .from('notes')
            .insert({
                title,
                body,
                folderId,
                user_id: this.currentUserId
            })
            .select()
            .single();

        return { data, error };
    }

    async updateNote(id, updates) {
        const { data, error } = await this.client
            .from('notes')
            .update(updates)
            .eq('id', id)
            .eq('user_id', this.currentUserId);

        return { data, error };
    }

    async deleteNote(id) {
        // Get note to check for PDF
        const { data: note } = await this.getNote(id);

        // Delete PDF from storage if exists
        if (note && note.pdfUrl) {
            try {
                const filePath = new URL(note.pdfUrl).pathname.split('/public/pdfs/')[1];
                await this.client.storage.from('pdfs').remove([filePath]);
            } catch (error) {
                console.warn('Error deleting PDF file:', error);
            }
        }

        // Delete note
        const { data, error } = await this.client
            .from('notes')
            .delete()
            .eq('id', id)
            .eq('user_id', this.currentUserId);

        return { data, error };
    }

    // PDF storage operations
    async uploadPdf(file) {
        const filePath = `${this.currentUserId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await this.client.storage
            .from('pdfs')
            .upload(filePath, file);

        if (uploadError) {
            return { data: null, error: uploadError };
        }

        const { data: { publicUrl } } = this.client.storage
            .from('pdfs')
            .getPublicUrl(filePath);

        return { data: { publicUrl, filePath }, error: null };
    }
}

