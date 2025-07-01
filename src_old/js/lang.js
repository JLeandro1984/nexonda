class I18n {
  constructor(config) {
    this.languages = {
      'pt-BR': { path: '../lang/pt-BR.json', flag: 'br', label: 'Português (BR)' },
      'en-US': { path: '../lang/en-US.json', flag: 'us', label: 'English (US)' },
      'es-MX': { path: '../lang/es-MX.json', flag: 'mx', label: 'Español (MX)' }
    };
    this.translations = {}; // Começa vazio
    this.currentLanguage = 'pt-BR';
    this.observers = [];
  }

  async init() {
    try {
      await this.loadLanguage(this.getSavedLanguage());
      this.setupEventListeners();
    } catch (error) {
      console.error('I18n initialization failed:', error);
      this.loadLanguage(Object.keys(this.languages)[0]); // Fallback para o primeiro idioma disponível
    }
  }

  // Função para carregar a tradução do idioma
  async loadLanguage(langCode) {
    if (!this.languages[langCode] || this.currentLanguage === langCode) return;

    try {
      if (!this.translations[langCode]) {
        const response = await fetch(this.languages[langCode].path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        this.translations[langCode] = await response.json();
      }

      this.currentLanguage = langCode;
      this.applyTranslations();
      this.updateDocumentLanguage();
      this.notifyObservers();
      this.savePreference();

      const flagPath = `../images/flags/${this.languages[this.currentLanguage].flag}.png`;
      const flagImg = document.getElementById('current-flag');
      if (flagImg) {
        flagImg.src = flagPath;
      }

    } catch (error) {
      console.error(`Failed to load ${langCode}:`, error);
      throw error;
    }
  }

  // Função para pegar as traduções atuais, retornando um objeto vazio caso não esteja carregado
  getCurrentTranslations() {
    if (!this.translations[this.currentLanguage]) {
      return {};  // Retorna um objeto vazio enquanto as traduções não são carregadas
    }
    return this.translations[this.currentLanguage];
  }

  // Função que aplica as traduções na página
  applyTranslations() {
    const langData = this.getCurrentTranslations();

    // Tradução para os elementos com data-lang
    document.querySelectorAll('[data-lang]').forEach(el => {
      const key = el.getAttribute('data-lang');
      if (langData[key]) el.textContent = langData[key];
    });

    // Tradução para os elementos com data-lang-placeholder
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
      const key = el.getAttribute('data-lang-placeholder');
      if (langData[key]) el.placeholder = langData[key];
    });

    // Tradução para os atributos específicos
    document.querySelectorAll('[data-lang-attr]').forEach(el => {
      const [attr, key] = el.getAttribute('data-lang-attr').split(':');
      if (langData[key]) el.setAttribute(attr, langData[key]);
    });
  }

  // Atualiza o idioma no documento
  updateDocumentLanguage() {
    document.documentElement.lang = this.currentLanguage;
    document.title = this.translations[this.currentLanguage]['brand-name'] || document.title;
  }

  // Salva a preferência do idioma no localStorage
  savePreference() {
    localStorage.setItem('preferredLanguage', this.currentLanguage);
  }

  // Configuração de event listeners para troca de idioma
  setupEventListeners() {
    // Remove listeners antigos para evitar duplicação
    document.querySelectorAll('.language-option').forEach(opt => {
      opt.replaceWith(opt.cloneNode(true));
    });

    // Novo listener para opções de idioma
    document.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const langCode = option.getAttribute('data-lang-code');
        this.loadLanguage(langCode);
        this.closeDropdown();
      });
    });

    // Listener para o botão principal
    const langButton = document.getElementById('language-button');
    if (langButton) {
      langButton.onclick = (e) => {
        e.stopPropagation();
        document.getElementById('language-selector-container').classList.toggle('open');
      };
    }

    // Fechar ao clicar fora
    document.addEventListener('click', () => this.closeDropdown());
  }

  // Fechar o dropdown de seleção de idiomas
  closeDropdown() {
    const container = document.getElementById('language-selector-container');
    if (container) container.classList.remove('open');
  }

  // Adicionar observadores para mudança de idioma
  addObserver(callback) {
    this.observers.push(callback);
  }

  // Notificar todos os observadores sobre a mudança de idioma
  notifyObservers() {
    this.observers.forEach(cb => cb(this.currentLanguage));
  }

  // Função que obtém o idioma salvo ou o idioma do navegador
  getSavedLanguage() {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved && this.languages[saved]) return saved;

    const browserLang = navigator.language || navigator.userLanguage; // navigator.userLanguage para compatibilidade IE
    
    if (this.languages[browserLang]) {
      return browserLang;
    }

    // Tentativa de correspondência parcial (ex: "pt" => "pt-BR")
    const baseLang = browserLang.split('-')[0];
    const matchedLang = Object.keys(this.languages).find(lang => lang.startsWith(baseLang));
    if (matchedLang) {
      return matchedLang;
    }

    return 'pt-BR'; // Fallback final
  }
}

// Singleton - Garante uma única instância
const i18n = new I18n();
export default i18n;
