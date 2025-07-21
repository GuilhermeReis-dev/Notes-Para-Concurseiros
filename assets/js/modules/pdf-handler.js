// PDF Handler Module
import { PDFJS_CONFIG } from '../config/supabase-config.js';

export class PDFHandler {
    constructor(supabaseClient, uiComponents, pdfAnnotation) {
        this.supabaseClient = supabaseClient;
        this.ui = uiComponents;
        this.pdfAnnotation = pdfAnnotation;
        
        this.importPdfBtn = document.getElementById('import-pdf-btn');
        this.importPdfInput = document.getElementById('import-pdf-input');
        
        this.init();
    }

    init() {
        // Configure PDF.js worker
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CONFIG.workerSrc;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.importPdfBtn?.addEventListener('click', () => this.triggerPdfImport());
        this.importPdfInput?.addEventListener('change', (e) => this.handlePdfImport(e));
    }

    triggerPdfImport() {
        if (!this.supabaseClient.getClient()) {
            this.ui.showInfoModal("Erro de Configuração", "O Supabase não está configurado.");
            return;
        }
        
        this.importPdfInput?.click();
    }

    async handlePdfImport(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            this.ui.showInfoModal("Erro", "Por favor, selecione um arquivo PDF válido.");
            return;
        }

        this.ui.showLoading('Fazendo upload do PDF...');
        
        try {
            // Upload PDF to Supabase storage
            const { data: uploadData, error: uploadError } = await this.supabaseClient.uploadPdf(file);
            
            if (uploadError) {
                throw new Error(uploadError.message);
            }

            // Create note with PDF
            const title = file.name.replace(/\.pdf$/i, '');
            const { data: newNote, error: noteError } = await this.supabaseClient.createNote(
                title,
                '<p>Carregando PDF...</p>',
                this.getCurrentFolderId?.() || 'root'
            );

            if (noteError) {
                throw new Error(noteError.message);
            }

            // Update note with PDF URL
            await this.supabaseClient.updateNote(newNote.id, {
                pdfUrl: uploadData.publicUrl
            });

            // Trigger note opening
            this.onPdfImported?.(newNote.id);

        } catch (error) {
            console.error('Error importing PDF:', error);
            this.ui.showInfoModal("Erro de Importação", "Não foi possível importar o arquivo. Verifique as configurações do Supabase.");
        } finally {
            this.ui.hideLoading();
            // Clear input
            if (this.importPdfInput) {
                this.importPdfInput.value = '';
            }
        }
    }

    async renderPdfInEditor(pdfUrl, targetElement) {
        if (!targetElement) return;

        this.ui.showLoading('Carregando PDF...');
        
        try {
            const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
            let htmlContent = '<p>Início do documento PDF. As suas anotações podem ser adicionadas aqui.</p><br/>';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                this.ui.showLoading(`Renderizando página ${i} de ${pdf.numPages}...`);
                
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ 
                    canvasContext: context, 
                    viewport: viewport 
                }).promise;
                
                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                htmlContent += `<img src="${imgDataUrl}" alt="Página ${i} do PDF" data-pdf-source="${pdfUrl}" data-page-index="${i-1}"/><br/>`;
            }
            
            htmlContent += '<p>Fim do documento.</p>';
            targetElement.innerHTML = htmlContent;
            
            // Setup annotations for PDF pages after content is set
            if (this.pdfAnnotation) {
                setTimeout(() => {
                    this.setupAnnotationsForRenderedPdf(targetElement);
                }, 100);
            }
            
        } catch (error) {
            console.error("Error rendering PDF:", error);
            targetElement.innerHTML = '<p class="text-red-500">Erro ao carregar o PDF.</p>';
            this.ui.showInfoModal("Erro", "Não foi possível carregar o PDF.");
        } finally {
            this.ui.hideLoading();
        }
    }

    async exportToPdf(title, contentElement, themeManager) {
        if (!contentElement) return;

        this.ui.showLoading('Exportando para PDF...');
        
        try {
            const backgroundColor = themeManager?.isDarkMode() ? '#1f2937' : '#ffffff';
            
            const canvas = await window.html2canvas(contentElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: backgroundColor
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgHeight = pdfWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            const fileName = (title || 'nota').replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
            pdf.save(fileName);
            
        } catch (error) {
            console.error("Error exporting PDF:", error);
            this.ui.showInfoModal("Erro", "Não foi possível exportar o PDF.");
        } finally {
            this.ui.hideLoading();
        }
    }

    setupAnnotationsForRenderedPdf(targetElement) {
        const pdfImages = targetElement.querySelectorAll('img[data-pdf-source]');
        pdfImages.forEach((img, index) => {
            const pageIndex = parseInt(img.getAttribute('data-page-index')) || index;
            this.pdfAnnotation.setupPdfPageAnnotation(img, pageIndex);
        });
    }

    // Callbacks (to be set by main app)
    onPdfImported = null;
    getCurrentFolderId = null;
}

