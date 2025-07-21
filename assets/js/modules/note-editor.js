// Note Editor Module
export class NoteEditor {
    constructor(supabaseClient, uiComponents, pdfHandler, pdfAnnotation) {
        this.supabaseClient = supabaseClient;
        this.ui = uiComponents;
        this.pdfHandler = pdfHandler;
        this.pdfAnnotation = pdfAnnotation;

        this.activeNoteId = null;
        this.saveTimeout = null;

        this.noteTitleEl = document.getElementById('note-title');
        this.noteBodyEl = document.getElementById('note-body');
        this.saveStatusEl = document.getElementById('save-status');
        this.backToFoldersBtn = document.getElementById('back-to-folders-btn');
        this.exportPdfBtn = document.getElementById('export-pdf-btn');
        this.deleteNoteBtn = document.getElementById('delete-note-btn');
        this.newNoteBtn = document.getElementById('new-note-btn');

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auto-save on content change
        this.noteTitleEl?.addEventListener('input', () => this.scheduleAutoSave());
        this.noteBodyEl?.addEventListener('input', () => this.scheduleAutoSave());

        // Navigation and actions
        this.backToFoldersBtn?.addEventListener('click', () => this.closeEditor());
        this.exportPdfBtn?.addEventListener('click', () => this.exportCurrentNote());
        this.deleteNoteBtn?.addEventListener('click', () => this.deleteCurrentNote());
        this.newNoteBtn?.addEventListener('click', () => this.createNewNote());
    }

    async openNote(noteId) {
        if (!noteId) return;

        this.activeNoteId = noteId;

        try {
            const { data: note, error } = await this.supabaseClient.getNote(noteId);

            if (error || !note) {
                this.ui.showInfoModal("Erro", "Não foi possível encontrar a nota.");
                this.closeEditor();
                return;
            }

            // Set note content
            if (this.noteTitleEl) {
                this.noteTitleEl.value = note.title || '';
            }

            // Handle PDF notes
            if (note.pdfUrl && (!this.noteBodyEl?.innerHTML || this.noteBodyEl.innerHTML.includes('<p>Carregando PDF...</p>'))) {
                await this.pdfHandler.renderPdfInEditor(note.pdfUrl, this.noteBodyEl);
                // Initialize annotations for PDF content
                if (this.pdfAnnotation) {
                    this.pdfAnnotation.initializeForNote(noteId, note.body);
                }
            } else if (this.noteBodyEl) {
                this.noteBodyEl.innerHTML = note.body || '';
                // Check if existing note has PDF content and initialize annotations
                if (this.pdfAnnotation && this.pdfAnnotation.hasPdfContent(note.body)) {
                    this.pdfAnnotation.initializeForNote(noteId, note.body);
                }
            }

            // Update save status
            if (this.saveStatusEl) {
                this.saveStatusEl.textContent = `Última atualização: ${new Date(note.created_at).toLocaleString()}`;
            }

            // Switch to editor view
            this.ui.switchView('editor');

            // Apply zoom if zoom controller is available
            this.onNoteOpened?.(noteId);

        } catch (error) {
            console.error("Error opening note:", error);
            this.ui.showInfoModal("Erro", "Não foi possível abrir a nota.");
        }
    }

    async createNewNote() {
        try {
            const currentFolderId = this.getCurrentFolderId?.() || 'root';
            const { data: newNote, error } = await this.supabaseClient.createNote(
                'Nova Nota',
                '<p><br></p>',
                currentFolderId
            );

            if (error) {
                throw new Error(error.message);
            }

            this.openNote(newNote.id);
        } catch (error) {
            console.error("Error creating note:", error);
            this.ui.showInfoModal("Erro", "Não foi possível criar a nota.");
        }
    }

    scheduleAutoSave() {
        if (!this.activeNoteId) return;

        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Show saving status
        if (this.saveStatusEl) {
            this.saveStatusEl.textContent = 'Salvando...';
        }

        // Schedule save
        this.saveTimeout = setTimeout(() => {
            this.saveCurrentNote();
        }, 1000);
    }

    async saveCurrentNote() {
        if (!this.activeNoteId) return;

        try {
            const updates = {
                title: this.noteTitleEl?.value || '',
                body: this.noteBodyEl?.innerHTML || ''
            };

            const { error } = await this.supabaseClient.updateNote(this.activeNoteId, updates);

            if (error) {
                throw new Error(error.message);
            }

            if (this.saveStatusEl) {
                this.saveStatusEl.textContent = `Salvo às ${new Date().toLocaleTimeString()}`;
            }

        } catch (error) {
            console.error("Error saving note:", error);
            if (this.saveStatusEl) {
                this.saveStatusEl.textContent = 'Erro ao salvar.';
            }
            this.ui.showInfoModal("Erro ao Salvar", "Não foi possível salvar a nota.");
        }
    }

    async deleteCurrentNote() {
        if (!this.activeNoteId) return;

        try {
            const noteName = this.noteTitleEl?.value || 'Nota sem título';
            await this.ui.showDeleteConfirmModal(noteName, 'note');

            const { error } = await this.supabaseClient.deleteNote(this.activeNoteId);

            if (error) {
                throw new Error(error.message);
            }

            // Close editor and refresh folder view
            this.closeEditor();
            this.onNoteDeleted?.(this.activeNoteId);

        } catch (error) {
            if (error.message !== 'Delete cancelled') {
                console.error("Error deleting note:", error);
                this.ui.showInfoModal("Erro", "Não foi possível excluir a nota.");
            }
        }
    }

    async exportCurrentNote() {
        if (!this.activeNoteId || !this.noteBodyEl) return;

        const title = this.noteTitleEl?.value || "Nota sem título";
        await this.pdfHandler.exportToPdf(title, this.noteBodyEl, this.getThemeManager?.());
    }

    closeEditor() {
        // Close annotations if active
        if (this.pdfAnnotation && this.activeNoteId) {
            this.pdfAnnotation.closeAnnotations();
        }

        this.activeNoteId = null;

        // Clear any pending save
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }

        // Switch back to folder view
        this.ui.switchView('folders');

        // Notify that editor was closed
        this.onEditorClosed?.();
    }

    getActiveNoteId() {
        return this.activeNoteId;
    }

    isEditorOpen() {
        return this.activeNoteId !== null;
    }

    // Callbacks (to be set by main app)
    onNoteOpened = null;
    onNoteDeleted = null;
    onEditorClosed = null;
    getCurrentFolderId = null;
    getThemeManager = null;
}

