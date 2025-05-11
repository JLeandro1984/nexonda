import i18n from './lang.js';
import { showAlert } from '../components/alert.js';
import { signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

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

//Inicio código - Modo Dark
  const darkModeBtn = document.getElementById('dark-mode-btn');

  if (darkModeBtn) {
    const darkModeIcon = darkModeBtn.querySelector('i');
  
    // Verifica preferência salva
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Aplica o modo dark se necessário
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      darkModeIcon.classList.replace('fa-moon', 'fa-sun');
    }
    
    // Evento de clique no botão
    darkModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isNowDark = document.body.classList.contains('dark-mode');
      
      // Atualiza ícone
      if (isNowDark) {
        darkModeIcon.classList.replace('fa-moon', 'fa-sun');
      } else {
        darkModeIcon.classList.replace('fa-sun', 'fa-moon');
      }
      
      // Salva preferência
      localStorage.setItem('darkMode', isNowDark);
    });
    //Fim código - Modo Dark
  }
 

});


// // Torna showAlert acessível em todo o escopo do script
// window.showAlert = function(message) {
//   const modal = document.getElementById("custom-alert");
//   const messageBox = document.getElementById("alert-message");
//   messageBox.textContent = message;
//   modal.classList.remove("hidden");

//   document.getElementById("close-alert-btn").onclick = () => {
//     modal.classList.add("hidden");
//   };
// };

