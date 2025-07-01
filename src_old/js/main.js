import i18n from './lang.js';
import { showAlert } from '../components/alert.js';
import { signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { ufs } from './ufs.js';
import { updateLogoDisplay } from './screen-brand.js';
import './youtube-api.js';

// Função para registrar visita única por sessão
function trackVisit(city = null) {
  if (sessionStorage.getItem('hasVisited')) {
    return;
  }

  const payload = { page: window.location.pathname };
  if (city) {
    payload.city = city;
  }

  fetch('https://us-central1-nexonda-281084.cloudfunctions.net/logInsight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'visit', payload: payload })
  })
  .then(response => {
    if(response.ok) {
      sessionStorage.setItem('hasVisited', 'true');
      console.log('Visita registrada com sucesso.');
    }
  })
  .catch(error => console.error('Erro ao registrar visita:', error));
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await i18n.init();
    
    // Configuração adicional do sistema
    i18n.addObserver((lang) => {
      console.log('Language changed to:', lang);
      // Aqui você pode adicionar outras ações necessárias
    });

    // Rastreia a visita, incluindo a cidade se estiver no cache
    const cachedLocation = localStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const city = JSON.parse(cachedLocation);
        trackVisit(city);
      } catch (e) {
        trackVisit();
      }
    } else {
      trackVisit();
    }

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
 
  // Lógica de geolocalização movida para cá
  const checkbox = document.getElementById('use-location');
  const citySpan = document.getElementById('detected-city');

  if (checkbox && citySpan) {
    // Sincroniza o checkbox com o cache ao carregar a página
    if (localStorage.getItem('userLocation')) {
      checkbox.checked = true;
      citySpan.textContent = JSON.parse(localStorage.getItem('userLocation'));
    }

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            position => {
              const { latitude, longitude } = position.coords;

              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
                headers: { 'User-Agent': 'Nexonda/1.0' }
              })
              .then(res => res.json())
              .then(data => {
                const addr = data.address;
                const cidade = addr.city || addr.town || addr.village || addr.county || '';
                const estadoCompleto = addr.state || '';
                const uf = ufs.find(uf => uf.nome.toLowerCase() === estadoCompleto.toLowerCase())?.sigla || '';
                const cidadeUF = `${cidade}${uf ? ' - ' + uf : ''}`;
                
                citySpan.textContent = cidadeUF;
                localStorage.setItem('userLocation', JSON.stringify(cidadeUF));
                updateLogoDisplay();
              })
              .catch(() => {
                citySpan.textContent = "Erro ao localizar";
                checkbox.checked = false;
              });
            },
            () => {
              citySpan.textContent = "Permissão negada";
              checkbox.checked = false;
            }
          );
        } else {
          showAlert("Geolocalização não suportada.", "info");
          checkbox.checked = false;
        }
      } else {
        citySpan.textContent = "Localização não informada";
        localStorage.removeItem('userLocation');
        updateLogoDisplay();
      }
    });
  }
});

document.addEventListener('DOMContentLoaded', function() {
  // CÓDIGO ANTI-SCROLL AQUI
  let lastUserScrollTime = Date.now();
  window.addEventListener('scroll', () => {
    lastUserScrollTime = Date.now();
  });

  const originalScrollTo = window.scrollTo;
  window.scrollTo = function(options) {
    if (Date.now() - lastUserScrollTime < 100 || 
        (typeof options === 'object' && options.behavior !== 'smooth')) {
      originalScrollTo.apply(window, arguments);
    }
  };
});


