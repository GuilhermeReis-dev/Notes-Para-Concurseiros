// UI Components Module
export class UIComponents {
    constructor() {
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');
        this.infoModal = document.getElementById('info-modal');
        this.inputModal = document.getElementById('input-modal');
        this.deleteConfirmModal = document.getElementById('delete-confirm-modal');
        this.contextMenu = document.getElementById('context-menu');
        
        this.init();
    }

    init() {
        this.setupModalEventListeners();
        this.setupContextMenuEventListeners();
    }

    setupModalEventListeners() {
        // Info modal
        const infoModalClose = document.getElementById('info-modal-close');
        infoModalClose?.addEventListener('click', () => this.hideInfoModal());

        // Input modal
        const inputModalCancel = document.getElementById('input-modal-cancel');
        const inputModalConfirm = document.getElementById('input-modal-confirm');
        
        inputModalCancel?.addEventListener('click', () => this.hideInputModal());
        inputModalConfirm?.addEventListener('click', () => this.confirmInputModal());

        // Delete confirm modal
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        
        cancelDeleteBtn?.addEventListener('click', () => this.hideDeleteConfirmModal());
        confirmDeleteBtn?.addEventListener('click', () => this.confirmDelete());
    }

    setupContextMenuEventListeners() {
        // Hide context menu on click outside
        document.addEventListener('click', (e) => {
            if (!this.contextMenu?.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Prevent context menu on right click outside items
        document.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.item-grid-card');
            if (!card) {
                this.hideContextMenu();
            }
        });
    }

    // Loading overlay methods
    showLoading(text = 'Carregando...') {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    // Info modal methods
    showInfoModal(title, message, isError = true) {
        const infoModalTitle = document.getElementById('info-modal-title');
        const infoModalText = document.getElementById('info-modal-text');
        const infoModalIcon = document.getElementById('info-modal-icon');

        if (infoModalTitle) infoModalTitle.textContent = title;
        if (infoModalText) infoModalText.textContent = message;
        
        if (infoModalIcon) {
            infoModalIcon.className = isError 
                ? 'fas fa-exclamation-triangle text-4xl mb-4 text-red-500' 
                : 'fas fa-info-circle text-4xl mb-4 text-blue-500';
        }

        if (this.infoModal) {
            this.infoModal.classList.remove('hidden');
        }
    }

    hideInfoModal() {
        if (this.infoModal) {
            this.infoModal.classList.add('hidden');
        }
    }

    // Input modal methods
    showInputModal(title, placeholder = '', defaultValue = '') {
        return new Promise((resolve, reject) => {
            const inputModalTitle = document.getElementById('input-modal-title');
            const inputModalField = document.getElementById('input-modal-field');

            if (inputModalTitle) inputModalTitle.textContent = title;
            if (inputModalField) {
                inputModalField.placeholder = placeholder;
                inputModalField.value = defaultValue;
            }

            this.inputModalResolve = resolve;
            this.inputModalReject = reject;

            if (this.inputModal) {
                this.inputModal.classList.remove('hidden');
                inputModalField?.focus();
            }
        });
    }

    hideInputModal() {
        if (this.inputModal) {
            this.inputModal.classList.add('hidden');
        }
        if (this.inputModalReject) {
            this.inputModalReject(new Error('Modal cancelled'));
        }
    }

    confirmInputModal() {
        const inputModalField = document.getElementById('input-modal-field');
        const value = inputModalField?.value || '';
        
        if (this.inputModalResolve) {
            this.inputModalResolve(value);
        }
        
        this.hideInputModal();
    }

    // Delete confirm modal methods
    showDeleteConfirmModal(itemName, itemType = 'item') {
        return new Promise((resolve, reject) => {
            const deleteModalText = document.getElementById('delete-modal-text');
            
            if (deleteModalText) {
                deleteModalText.textContent = `Tem certeza que deseja excluir "${itemName}"?`;
            }

            this.deleteConfirmResolve = resolve;
            this.deleteConfirmReject = reject;

            if (this.deleteConfirmModal) {
                this.deleteConfirmModal.classList.remove('hidden');
            }
        });
    }

    hideDeleteConfirmModal() {
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.classList.add('hidden');
        }
        if (this.deleteConfirmReject) {
            this.deleteConfirmReject(new Error('Delete cancelled'));
        }
    }

    confirmDelete() {
        if (this.deleteConfirmResolve) {
            this.deleteConfirmResolve(true);
        }
        this.hideDeleteConfirmModal();
    }

    // Context menu methods
    showContextMenu(x, y, target) {
        this.contextTarget = target;
        
        if (this.contextMenu) {
            this.contextMenu.style.top = `${y}px`;
            this.contextMenu.style.left = `${x}px`;
            this.contextMenu.classList.remove('hidden');
        }
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.add('hidden');
        }
    }

    getContextTarget() {
        return this.contextTarget;
    }

    // View switching
    switchView(viewName) {
        const folderView = document.getElementById('folder-view');
        const noteEditorView = document.getElementById('note-editor-view');

        if (folderView && noteEditorView) {
            folderView.style.display = viewName === 'folders' ? 'flex' : 'none';
            noteEditorView.style.display = viewName === 'editor' ? 'flex' : 'none';
        }
    }
}

