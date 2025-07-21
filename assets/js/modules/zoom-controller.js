// Zoom Controller Module
export class ZoomController {
    constructor() {
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.zoomLevelDisplay = document.getElementById('zoom-level-display');
        this.noteBodyEl = document.getElementById('note-body');
        
        this.currentZoom = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.zoomStep = 0.1;
        
        this.init();
    }

    init() {
        // Load saved zoom level
        const savedZoom = parseFloat(localStorage.getItem('geminiNotesZoom')) || 1.0;
        this.setZoom(savedZoom);
        
        // Add event listeners
        this.zoomInBtn?.addEventListener('click', () => this.zoomIn());
        this.zoomOutBtn?.addEventListener('click', () => this.zoomOut());
    }

    setZoom(zoomLevel) {
        this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
        this.applyZoom();
    }

    zoomIn() {
        this.setZoom(this.currentZoom + this.zoomStep);
    }

    zoomOut() {
        this.setZoom(this.currentZoom - this.zoomStep);
    }

    resetZoom() {
        this.setZoom(1.0);
    }

    applyZoom() {
        if (this.noteBodyEl) {
            this.noteBodyEl.style.transform = `scale(${this.currentZoom})`;
        }
        
        if (this.zoomLevelDisplay) {
            this.zoomLevelDisplay.textContent = `${Math.round(this.currentZoom * 100)}%`;
        }
        
        // Save zoom level
        localStorage.setItem('geminiNotesZoom', this.currentZoom.toString());
    }

    getCurrentZoom() {
        return this.currentZoom;
    }

    getZoomPercentage() {
        return Math.round(this.currentZoom * 100);
    }
}

