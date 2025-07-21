// Main Application Module
import { SupabaseClient } from './modules/supabase-client.js';
import { ThemeManager } from './modules/theme-manager.js';
import { ZoomController } from './modules/zoom-controller.js';
import { UIComponents } from './modules/ui-components.js';
import { FolderManager } from './modules/folder-manager.js';
import { PDFHandler } from './modules/pdf-handler.js';
import { NoteEditor } from './modules/note-editor.js';

class GeminiNotesApp {
    constructor() {
        this.supabaseClient = null;
        this.themeManager = null;
        this.zoomController = null;
        this.ui = null;
        this.folderManager = null;
        this.pdfHandler = null;
        this.noteEditor = null;

        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            // Show loading
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }

            // Initialize core modules
            this.supabaseClient = new SupabaseClient();
            this.themeManager = new ThemeManager();
            this.zoomController = new ZoomController();
            this.ui = new UIComponents();

            // Initialize Supabase connection
            const supabaseInitialized = await this.supabaseClient.initialize();
            if (!supabaseInitialized) {
                throw new Error('Failed to initialize Supabase');
            }

            // Initialize feature modules
            this.pdfHandler = new PDFHandler(this.supabaseClient, this.ui);
            this.folderManager = new FolderManager(this.supabaseClient, this.ui);
            this.noteEditor = new NoteEditor(this.supabaseClient, this.ui, this.pdfHandler);

            // Setup inter-module communication
            this.setupModuleCallbacks();

            // Setup context menu handling
            this.setupContextMenuHandling();

            // Show folder view
            this.ui.switchView('folders');

            this.isInitialized = true;

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.ui?.showInfoModal(
                "Erro de Inicialização",
                "Não foi possível inicializar o aplicativo. Verifique a configuração do Supabase."
            );
        } finally {
            // Hide loading
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }

    setupModuleCallbacks() {
        // Folder Manager callbacks
        this.folderManager.onNoteClick = (noteId) => {
            this.noteEditor.openNote(noteId);
        };

        this.folderManager.onItemDeleted = (itemId, itemType) => {
            // If the deleted item is the currently open note, close editor
            if (itemType === 'note' && this.noteEditor.getActiveNoteId() === itemId) {
                this.noteEditor.closeEditor();
            }
        };

        // Note Editor callbacks
        this.noteEditor.onNoteOpened = (noteId) => {
            // Apply current zoom level when note is opened
            this.zoomController.applyZoom();
        };

        this.noteEditor.onNoteDeleted = (noteId) => {
            // Refresh folder contents when note is deleted
            this.folderManager.loadFolderContents(this.folderManager.getCurrentFolderId());
        };

        this.noteEditor.onEditorClosed = () => {
            // Refresh folder contents when editor is closed
            this.folderManager.loadFolderContents(this.folderManager.getCurrentFolderId());
        };

        this.noteEditor.getCurrentFolderId = () => {
            return this.folderManager.getCurrentFolderId();
        };

        this.noteEditor.getThemeManager = () => {
            return this.themeManager;
        };

        // PDF Handler callbacks
        this.pdfHandler.onPdfImported = (noteId) => {
            this.noteEditor.openNote(noteId);
        };

        this.pdfHandler.getCurrentFolderId = () => {
            return this.folderManager.getCurrentFolderId();
        };
    }

    setupContextMenuHandling() {
        const contextMenu = document.getElementById('context-menu');

        contextMenu?.addEventListener('click', async (e) => {
            const action = e.target.closest('button')?.dataset.action;
            if (!action) return;

            const target = this.ui.getContextTarget();
            if (!target) return;

            const { id, type, name } = target;

            if (action === 'rename') {
                await this.folderManager.renameItem(id, type, name);
            } else if (action === 'delete') {
                await this.folderManager.deleteItem(id, type, name);
            }

            this.ui.hideContextMenu();
        });
    }

    // Public API methods
    getCurrentTheme() {
        return this.themeManager?.getCurrentTheme();
    }

    getCurrentZoom() {
        return this.zoomController?.getCurrentZoom();
    }

    isNoteEditorOpen() {
        return this.noteEditor?.isEditorOpen() || false;
    }

    getCurrentFolderId() {
        return this.folderManager?.getCurrentFolderId();
    }

    async createNote() {
        await this.noteEditor?.createNewNote();
    }

    async createFolder() {
        await this.folderManager?.createNewFolder();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.geminiNotesApp = new GeminiNotesApp();
    await window.geminiNotesApp.init();
});

// Export for potential external use
export default GeminiNotesApp;