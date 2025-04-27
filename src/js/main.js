import i18n from './lang.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await i18n.init();
    
    // Configuração adicional do sistema
    i18n.addObserver((lang) => {
      console.log('Language changed to:', lang);
      // Aqui você pode adicionar outras ações necessárias
    });
  } catch (error) {
    console.error('Initialization error:', error);
    // Fallback visual ou tratamento de erro
  }
});