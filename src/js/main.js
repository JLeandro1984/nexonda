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


// Torna showAlert acessível em todo o escopo do script
window.showAlert = function(message) {
  const modal = document.getElementById("custom-alert");
  const messageBox = document.getElementById("alert-message");
  messageBox.textContent = message;
  modal.classList.remove("hidden");

  document.getElementById("close-alert-btn").onclick = () => {
    modal.classList.add("hidden");
  };
};