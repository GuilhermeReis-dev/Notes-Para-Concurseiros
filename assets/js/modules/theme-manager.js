// Theme Manager Module
export class ThemeManager {
    constructor() {
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');
        this.themeIcon = document.getElementById('theme-icon');
        this.currentTheme = 'light';
        
        this.init();
    }

    init() {
        // Load saved theme
        const savedTheme = localStorage.getItem('geminiNotesTheme') || 'light';
        this.applyTheme(savedTheme);
        
        // Add event listener
        this.themeToggleBtn?.addEventListener('click', () => this.toggleTheme());
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            this.themeIcon?.classList.remove('fa-moon');
            this.themeIcon?.classList.add('fa-sun');
        } else {
            document.documentElement.classList.remove('dark');
            this.themeIcon?.classList.remove('fa-sun');
            this.themeIcon?.classList.add('fa-moon');
        }
        
        localStorage.setItem('geminiNotesTheme', theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === 'dark';
    }
}

