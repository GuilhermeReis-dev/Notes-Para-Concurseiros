// PDF Annotation Module
export class PDFAnnotation {
    constructor(supabaseClient, uiComponents) {
        this.supabaseClient = supabaseClient;
        this.ui = uiComponents;
        
        // Drawing state
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.currentLineWidth = 2;
        this.annotations = new Map(); // pageId -> annotation data
        
        // Canvas management
        this.canvases = new Map(); // pageId -> canvas element
        this.contexts = new Map(); // pageId -> 2d context
        
        // Tool settings
        this.colors = [
            { name: 'Branco', value: '#FFFFFF' },
            { name: 'Preto', value: '#000000' },
            { name: 'Azul', value: '#3B82F6' },
            { name: 'Verde', value: '#22C55E' },
            { name: 'Vermelho', value: '#EF4444' },
            { name: 'Amarelo', value: '#EAB308' }
        ];
        
        this.lineWidths = [
            { name: 'Fina', value: 1 },
            { name: 'Média', value: 2 },
            { name: 'Grossa', value: 4 }
        ];

        this.activeNoteId = null;
        this.init();
    }

    init() {
        this.createAnnotationToolbar();
        this.setupEventListeners();
    }

    createAnnotationToolbar() {
        // Create toolbar HTML
        const toolbarHTML = `
            <div id="annotation-toolbar" class="annotation-toolbar hidden">
                <div class="toolbar-section">
                    <h4 class="toolbar-title">Caneta</h4>
                    <div class="color-palette">
                        ${this.colors.map(color => `
                            <button class="color-btn ${color.value === this.currentColor ? 'active' : ''}" 
                                    data-color="${color.value}" 
                                    style="background-color: ${color.value}"
                                    title="${color.name}">
                            </button>
                        `).join('')}
                    </div>
                    <div class="line-width-controls">
                        ${this.lineWidths.map(width => `
                            <button class="width-btn ${width.value === this.currentLineWidth ? 'active' : ''}" 
                                    data-width="${width.value}"
                                    title="${width.name}">
                                <div class="width-preview" style="height: ${width.value + 1}px; background-color: ${this.currentColor};"></div>
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="toolbar-section">
                    <h4 class="toolbar-title">Ferramentas</h4>
                    <div class="tool-buttons">
                        <button class="tool-btn active" data-tool="pen" title="Caneta">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="tool-btn" data-tool="eraser" title="Borracha">
                            <i class="fas fa-eraser"></i>
                        </button>
                        <button class="tool-btn" data-tool="clear" title="Limpar Página">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add toolbar to the editor view
        const editorView = document.getElementById('note-editor-view');
        if (editorView) {
            editorView.insertAdjacentHTML('beforeend', toolbarHTML);
        }

        // Add CSS styles
        this.addAnnotationStyles();
    }

    addAnnotationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .annotation-toolbar {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                min-width: 200px;
                backdrop-filter: blur(8px);
            }

            .dark .annotation-toolbar {
                background: rgba(31, 41, 55, 0.95);
                border-color: #4b5563;
                color: #f3f4f6;
            }

            .toolbar-section {
                margin-bottom: 12px;
            }

            .toolbar-section:last-child {
                margin-bottom: 0;
            }

            .toolbar-title {
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 8px;
                color: #6b7280;
            }

            .dark .toolbar-title {
                color: #9ca3af;
            }

            .color-palette {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 4px;
                margin-bottom: 8px;
            }

            .color-btn {
                width: 24px;
                height: 24px;
                border: 2px solid #e5e7eb;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .color-btn:hover, .color-btn.active {
                border-color: #3b82f6;
                transform: scale(1.1);
            }

            .dark .color-btn {
                border-color: #4b5563;
            }

            .dark .color-btn:hover, .dark .color-btn.active {
                border-color: #3b82f6;
            }

            .line-width-controls {
                display: flex;
                gap: 4px;
                margin-bottom: 8px;
            }

            .width-btn {
                flex: 1;
                height: 24px;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .width-btn:hover, .width-btn.active {
                border-color: #3b82f6;
                background: #eff6ff;
            }

            .dark .width-btn {
                background: #374151;
                border-color: #4b5563;
            }

            .dark .width-btn:hover, .dark .width-btn.active {
                border-color: #3b82f6;
                background: #1e3a8a;
            }

            .width-preview {
                width: 16px;
                border-radius: 2px;
                transition: background-color 0.2s ease;
            }

            .tool-buttons {
                display: flex;
                gap: 4px;
            }

            .tool-btn {
                width: 32px;
                height: 32px;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                color: #6b7280;
            }

            .tool-btn:hover, .tool-btn.active {
                border-color: #3b82f6;
                background: #eff6ff;
                color: #3b82f6;
            }

            .dark .tool-btn {
                background: #374151;
                border-color: #4b5563;
                color: #9ca3af;
            }

            .dark .tool-btn:hover, .dark .tool-btn.active {
                border-color: #3b82f6;
                background: #1e3a8a;
                color: #3b82f6;
            }

            .pdf-page-container {
                position: relative;
                margin-bottom: 20px;
            }

            .annotation-canvas {
                position: absolute;
                top: 0;
                left: 0;
                cursor: crosshair;
                z-index: 10;
                pointer-events: auto;
            }

            .annotation-canvas.eraser-mode {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="black" stroke-width="2"/></svg>') 10 10, auto;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            // Color selection
            if (e.target.classList.contains('color-btn')) {
                this.setColor(e.target.dataset.color);
            }
            
            // Line width selection
            if (e.target.closest('.width-btn')) {
                const btn = e.target.closest('.width-btn');
                this.setLineWidth(parseInt(btn.dataset.width));
            }
            
            // Tool selection
            if (e.target.closest('.tool-btn')) {
                const btn = e.target.closest('.tool-btn');
                const tool = btn.dataset.tool;
                if (tool === 'clear') {
                    this.clearCurrentPage();
                } else {
                    this.setTool(tool);
                }
            }
        });
    }

    setColor(color) {
        this.currentColor = color;
        this.updateColorButtons();
        this.updateWidthPreviews();
    }

    setLineWidth(width) {
        this.currentLineWidth = width;
        this.updateWidthButtons();
    }

    setTool(tool) {
        this.currentTool = tool;
        this.updateToolButtons();
        this.updateCanvasCursors();
    }

    updateColorButtons() {
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === this.currentColor);
        });
    }

    updateWidthButtons() {
        document.querySelectorAll('.width-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.width) === this.currentLineWidth);
        });
    }

    updateWidthPreviews() {
        document.querySelectorAll('.width-preview').forEach(preview => {
            preview.style.backgroundColor = this.currentColor;
        });
    }

    updateToolButtons() {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
    }

    updateCanvasCursors() {
        const canvases = document.querySelectorAll('.annotation-canvas');
        canvases.forEach(canvas => {
            canvas.classList.toggle('eraser-mode', this.currentTool === 'eraser');
        });
    }

    setupPdfPageAnnotation(pageImage, pageIndex) {
        // Create container for page and canvas
        const container = document.createElement('div');
        container.className = 'pdf-page-container';
        container.setAttribute('data-page', pageIndex);

        // Move the image into the container
        const parent = pageImage.parentNode;
        parent.insertBefore(container, pageImage);
        container.appendChild(pageImage);

        // Create canvas overlay
        const canvas = document.createElement('canvas');
        canvas.className = 'annotation-canvas';
        canvas.setAttribute('data-page', pageIndex);
        
        // Set canvas size to match image
        const updateCanvasSize = () => {
            const rect = pageImage.getBoundingClientRect();
            canvas.width = pageImage.naturalWidth || rect.width;
            canvas.height = pageImage.naturalHeight || rect.height;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
        };

        // Update size when image loads
        if (pageImage.complete) {
            updateCanvasSize();
        } else {
            pageImage.addEventListener('load', updateCanvasSize);
        }

        // Add canvas to container
        container.appendChild(canvas);

        // Setup canvas drawing
        this.setupCanvasDrawing(canvas, pageIndex);

        // Store canvas reference
        const pageId = `${this.activeNoteId}_${pageIndex}`;
        this.canvases.set(pageId, canvas);
        this.contexts.set(pageId, canvas.getContext('2d'));

        // Load existing annotations
        this.loadPageAnnotations(pageIndex);

        return container;
    }

    setupCanvasDrawing(canvas, pageIndex) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let currentPath = [];

        const getEventPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };

        const startDrawing = (e) => {
            if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
                isDrawing = true;
                const pos = getEventPos(e);
                currentPath = [pos];
                
                if (this.currentTool === 'pen') {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = this.currentColor;
                    ctx.lineWidth = this.currentLineWidth;
                } else {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.lineWidth = this.currentLineWidth * 3; // Larger eraser
                }
                
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            }
        };

        const draw = (e) => {
            if (!isDrawing || (this.currentTool !== 'pen' && this.currentTool !== 'eraser')) return;
            
            const pos = getEventPos(e);
            currentPath.push(pos);
            
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const stopDrawing = () => {
            if (isDrawing && currentPath.length > 1) {
                // Save the stroke to annotations
                this.saveStroke(pageIndex, {
                    tool: this.currentTool,
                    color: this.currentColor,
                    lineWidth: this.currentLineWidth,
                    path: currentPath
                });
            }
            isDrawing = false;
            currentPath = [];
        };

        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch events for mobile
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });
    }

    saveStroke(pageIndex, strokeData) {
        const pageId = `${this.activeNoteId}_${pageIndex}`;
        if (!this.annotations.has(pageId)) {
            this.annotations.set(pageId, []);
        }
        this.annotations.get(pageId).push(strokeData);
        
        // Auto-save with debounce
        this.scheduleAnnotationSave();
    }

    scheduleAnnotationSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveAnnotationsToSupabase();
        }, 1000);
    }

    async saveAnnotationsToSupabase() {
        if (!this.activeNoteId || this.annotations.size === 0) return;

        try {
            const annotationData = {};
            this.annotations.forEach((strokes, pageId) => {
                annotationData[pageId] = strokes;
            });

            // Get current note data
            const { data: note, error: fetchError } = await this.supabaseClient.getNote(this.activeNoteId);
            if (fetchError) throw fetchError;

            // Update note with annotation data
            const body = note.body || '';
            const updatedBody = this.embedAnnotationsInBody(body, annotationData);

            await this.supabaseClient.updateNote(this.activeNoteId, {
                body: updatedBody
            });

        } catch (error) {
            console.error('Error saving annotations:', error);
        }
    }

    embedAnnotationsInBody(htmlBody, annotationData) {
        // Create a marker to store annotation data
        const annotationMarker = `<!-- ANNOTATIONS_DATA:${JSON.stringify(annotationData)} -->`;
        
        // Remove existing annotation data
        const cleanBody = htmlBody.replace(/<!-- ANNOTATIONS_DATA:.*? -->/g, '');
        
        // Add new annotation data at the end
        return cleanBody + annotationMarker;
    }

    extractAnnotationsFromBody(htmlBody) {
        const match = htmlBody.match(/<!-- ANNOTATIONS_DATA:(.*?) -->/);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                console.error('Error parsing annotation data:', e);
            }
        }
        return {};
    }

    loadPageAnnotations(pageIndex) {
        const pageId = `${this.activeNoteId}_${pageIndex}`;
        const canvas = this.canvases.get(pageId);
        const ctx = this.contexts.get(pageId);
        
        if (!canvas || !ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get annotations for this page
        const strokes = this.annotations.get(pageId) || [];
        
        // Redraw all strokes
        strokes.forEach(stroke => {
            this.drawStroke(ctx, stroke);
        });
    }

    drawStroke(ctx, stroke) {
        if (!stroke.path || stroke.path.length < 2) return;

        ctx.save();
        
        if (stroke.tool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.lineWidth;
        } else if (stroke.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = stroke.lineWidth * 3;
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
        for (let i = 1; i < stroke.path.length; i++) {
            ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
        }
        
        ctx.stroke();
        ctx.restore();
    }

    clearCurrentPage() {
        // Find which page is currently visible/active
        const canvases = document.querySelectorAll('.annotation-canvas');
        canvases.forEach((canvas, index) => {
            const pageIndex = parseInt(canvas.getAttribute('data-page'));
            const pageId = `${this.activeNoteId}_${pageIndex}`;
            
            // Check if this canvas is in viewport
            const rect = canvas.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const isVisible = rect.top < viewportHeight && rect.bottom > 0;
            
            if (isVisible) {
                // Clear this page
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Clear annotations data
                this.annotations.set(pageId, []);
                
                // Save changes
                this.scheduleAnnotationSave();
            }
        });
    }

    initializeForNote(noteId, noteBody) {
        this.activeNoteId = noteId;
        this.annotations.clear();
        this.canvases.clear();
        this.contexts.clear();

        // Extract existing annotations from note body
        if (noteBody) {
            const existingAnnotations = this.extractAnnotationsFromBody(noteBody);
            Object.entries(existingAnnotations).forEach(([pageId, strokes]) => {
                this.annotations.set(pageId, strokes);
            });
        }

        // Show toolbar
        this.showToolbar();

        // Setup annotations for existing PDF pages
        setTimeout(() => {
            this.setupAnnotationsForExistingPages();
        }, 100);
    }

    setupAnnotationsForExistingPages() {
        const pdfImages = document.querySelectorAll('#note-body img[data-pdf-source]');
        pdfImages.forEach((img, index) => {
            if (!img.closest('.pdf-page-container')) {
                this.setupPdfPageAnnotation(img, index);
            }
        });
    }

    showToolbar() {
        const toolbar = document.getElementById('annotation-toolbar');
        if (toolbar) {
            toolbar.classList.remove('hidden');
        }
    }

    hideToolbar() {
        const toolbar = document.getElementById('annotation-toolbar');
        if (toolbar) {
            toolbar.classList.add('hidden');
        }
    }

    async closeAnnotations() {
        // Save any pending annotations
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            await this.saveAnnotationsToSupabase();
        }

        // Hide toolbar
        this.hideToolbar();

        // Clear state
        this.activeNoteId = null;
        this.annotations.clear();
        this.canvases.clear();
        this.contexts.clear();
    }

    // Check if note has PDF content
    hasPdfContent(noteBody) {
        return noteBody && noteBody.includes('data-pdf-source');
    }
}