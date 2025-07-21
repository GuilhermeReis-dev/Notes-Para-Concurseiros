// Folder Manager Module
export class FolderManager {
    constructor(supabaseClient, uiComponents) {
        this.supabaseClient = supabaseClient;
        this.ui = uiComponents;
        
        this.currentFolderId = 'root';
        this.breadcrumbPath = [{ id: 'root', name: 'Início' }];
        
        this.folderContentsEl = document.getElementById('folder-contents');
        this.breadcrumbsEl = document.getElementById('breadcrumbs');
        this.newFolderBtn = document.getElementById('new-folder-btn');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFolderContents(this.currentFolderId);
        this.renderBreadcrumbs();
    }

    setupEventListeners() {
        // New folder button
        this.newFolderBtn?.addEventListener('click', () => this.createNewFolder());
        
        // Folder contents click handler
        this.folderContentsEl?.addEventListener('click', (e) => this.handleItemClick(e));
        
        // Context menu handler
        this.folderContentsEl?.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        
        // Breadcrumbs navigation
        this.breadcrumbsEl?.addEventListener('click', (e) => this.handleBreadcrumbClick(e));
    }

    async loadFolderContents(folderId) {
        this.ui.showLoading('Carregando...');
        this.currentFolderId = folderId;
        
        try {
            const [foldersResult, notesResult] = await Promise.all([
                this.supabaseClient.getFolders(folderId),
                this.supabaseClient.getNotes(folderId)
            ]);

            if (foldersResult.error || notesResult.error) {
                throw new Error(foldersResult.error?.message || notesResult.error?.message);
            }

            const items = [
                ...foldersResult.data.map(f => ({ ...f, type: 'folder' })),
                ...notesResult.data.map(n => ({ ...n, type: 'note' }))
            ];
            
            this.renderFolderContents(items);
        } catch (error) {
            console.error("Error loading contents:", error);
            this.ui.showInfoModal("Erro ao Carregar", "Não foi possível carregar o conteúdo. Verifique a sua conexão.");
        } finally {
            this.ui.hideLoading();
        }
    }

    renderFolderContents(items) {
        if (!this.folderContentsEl) return;

        // Sort items: folders first, then alphabetically
        items.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return (a.name || a.title).localeCompare(b.name || b.title);
        });

        if (items.length > 0) {
            this.folderContentsEl.innerHTML = items.map(item => this.renderItem(item)).join('');
        } else {
            this.folderContentsEl.innerHTML = this.renderEmptyState();
        }
    }

    renderItem(item) {
        const itemName = item.name || item.title || (item.type === 'note' ? 'Nota sem título' : 'Pasta sem nome');
        const cardBaseClasses = "item-grid-card flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg shadow cursor-pointer aspect-square";
        
        if (item.type === 'folder') {
            return `
                <div class="${cardBaseClasses} justify-between" 
                     data-item-id="${item.id}" 
                     data-item-type="folder" 
                     data-item-name="${itemName}">
                    <div>
                        <i class="fas fa-folder text-5xl text-blue-400"></i>
                    </div>
                    <span class="font-medium truncate w-full pt-2 text-gray-800 dark:text-gray-200">
                        ${itemName}
                    </span>
                </div>
            `;
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.body || '';
            const previewText = item.pdfUrl 
                ? `[PDF] ${itemName}` 
                : (tempDiv.textContent.trim().substring(0, 100) || 'Nenhum conteúdo');
            
            return `
                <div class="${cardBaseClasses}" 
                     data-item-id="${item.id}" 
                     data-item-type="note" 
                     data-item-name="${itemName}">
                    <h3 class="font-bold text-lg mb-1 truncate text-gray-900 dark:text-gray-100">
                        ${itemName}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 flex-grow clamp-3">
                        ${previewText}
                    </p>
                </div>
            `;
        }
    }

    renderEmptyState() {
        return `
            <div class="col-span-full text-center text-gray-500 dark:text-gray-400 mt-16">
                <i class="fas fa-box-open text-6xl text-gray-300 dark:text-gray-600"></i>
                <p class="mt-4 text-2xl font-semibold">VAZIO AINDA :(</p>
                <p class="mt-1 text-gray-400 dark:text-gray-500">Crie uma nova nota ou pasta para começar.</p>
            </div>
        `;
    }

    renderBreadcrumbs() {
        if (!this.breadcrumbsEl) return;

        this.breadcrumbsEl.innerHTML = this.breadcrumbPath.map((crumb, index) => {
            const linkClass = "hover:underline dark:text-gray-300 dark:hover:text-white";
            
            if (index === this.breadcrumbPath.length - 1) {
                return `<span class="font-semibold text-gray-800 dark:text-gray-100">${crumb.name}</span>`;
            }
            
            return `
                <a href="#" data-crumb-id="${crumb.id}" class="${linkClass}">
                    ${crumb.name}
                </a> 
                <i class="fas fa-chevron-right text-gray-400 dark:text-gray-500"></i>
            `;
        }).join('');
    }

    handleItemClick(e) {
        const card = e.target.closest('.item-grid-card');
        if (!card) return;

        const { itemId, itemType, itemName } = card.dataset;
        
        if (itemType === 'folder') {
            this.navigateToFolder(itemId, itemName);
        } else if (itemType === 'note') {
            this.onNoteClick?.(itemId);
        }
    }

    handleContextMenu(e) {
        const card = e.target.closest('.item-grid-card');
        if (!card) return;

        e.preventDefault();
        const { itemId, itemType, itemName } = card.dataset;
        
        this.ui.showContextMenu(e.clientX, e.clientY, {
            id: itemId,
            type: itemType,
            name: itemName
        });
    }

    handleBreadcrumbClick(e) {
        e.preventDefault();
        const crumbLink = e.target.closest('a');
        if (!crumbLink) return;

        const { crumbId } = crumbLink.dataset;
        const crumbIndex = this.breadcrumbPath.findIndex(c => c.id === crumbId);
        
        if (crumbIndex !== -1) {
            this.breadcrumbPath = this.breadcrumbPath.slice(0, crumbIndex + 1);
            this.renderBreadcrumbs();
            this.loadFolderContents(crumbId);
        }
    }

    navigateToFolder(folderId, folderName) {
        this.breadcrumbPath.push({ id: folderId, name: folderName });
        this.renderBreadcrumbs();
        this.loadFolderContents(folderId);
    }

    async createNewFolder() {
        try {
            const name = await this.ui.showInputModal("Nova Pasta", "Nome da pasta");
            if (!name.trim()) return;

            const { data, error } = await this.supabaseClient.createFolder(name.trim(), this.currentFolderId);
            
            if (error) {
                throw new Error(error.message);
            }

            this.loadFolderContents(this.currentFolderId);
        } catch (error) {
            if (error.message !== 'Modal cancelled') {
                console.error("Error creating folder:", error);
                this.ui.showInfoModal("Erro", "Não foi possível criar a pasta.");
            }
        }
    }

    async renameItem(id, type, currentName) {
        try {
            const newName = await this.ui.showInputModal(
                `Renomear ${type === 'folder' ? 'Pasta' : 'Nota'}`, 
                "Novo nome", 
                currentName
            );
            
            if (!newName.trim() || newName === currentName) return;

            if (type === 'folder') {
                const { error } = await this.supabaseClient.updateFolder(id, { name: newName.trim() });
                if (error) throw new Error(error.message);
            } else {
                const { error } = await this.supabaseClient.updateNote(id, { title: newName.trim() });
                if (error) throw new Error(error.message);
            }

            this.loadFolderContents(this.currentFolderId);
        } catch (error) {
            if (error.message !== 'Modal cancelled') {
                console.error("Error renaming item:", error);
                this.ui.showInfoModal("Erro", "Não foi possível renomear o item.");
            }
        }
    }

    async deleteItem(id, type, name) {
        try {
            await this.ui.showDeleteConfirmModal(name, type);
            
            if (type === 'folder') {
                const { error } = await this.supabaseClient.deleteFolder(id);
                if (error) throw new Error(error.message);
            } else {
                const { error } = await this.supabaseClient.deleteNote(id);
                if (error) throw new Error(error.message);
            }

            this.loadFolderContents(this.currentFolderId);
            this.onItemDeleted?.(id, type);
        } catch (error) {
            if (error.message !== 'Delete cancelled') {
                console.error("Error deleting item:", error);
                this.ui.showInfoModal("Erro", "Não foi possível excluir o item.");
            }
        }
    }

    getCurrentFolderId() {
        return this.currentFolderId;
    }

    getBreadcrumbPath() {
        return [...this.breadcrumbPath];
    }

    // Event callbacks (to be set by main app)
    onNoteClick = null;
    onItemDeleted = null;
}

