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

// Dark mode initialization (legacy compatibility)
  const darkModeBtn = document.getElementById('dark-mode-btn');

  if (darkModeBtn) {
    const darkModeIcon = darkModeBtn.querySelector('i');
  
    // Verifica preferência salva (compatibilidade com código existente)
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || localStorage.getItem('theme') === 'dark';
    
    // Aplica o modo dark se necessário
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.setAttribute('data-theme', 'dark');
      darkModeIcon.classList.replace('fa-moon', 'fa-sun');
      
      // Ajusta header para dark mode na inicialização
      const header = document.querySelector('.modern-header');
      if (header) {
        header.style.background = 'rgba(17, 24, 39, 0.95)';
      }
    }
    
    // Evento de clique no botão (legacy)
    darkModeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isNowDark = document.body.classList.contains('dark-mode');
      
      // Atualiza ícone
      if (isNowDark) {
        darkModeIcon.classList.replace('fa-moon', 'fa-sun');
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        
        // Ajusta header para dark mode
        const header = document.querySelector('.modern-header');
        if (header) {
          header.style.background = 'rgba(17, 24, 39, 0.95)';
        }
      } else {
        darkModeIcon.classList.replace('fa-sun', 'fa-moon');
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        
        // Ajusta header para light mode
        const header = document.querySelector('.modern-header');
        if (header) {
          header.style.background = 'rgba(37, 99, 235, 0.95)';
        }
      }
      
      // Salva preferência (compatibilidade)
      localStorage.setItem('darkMode', isNowDark);
    });
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

// Removido código anti-scroll que estava bloqueando navegação suave

// ===== FUNCIONALIDADES MODERNAS NEXONDA =====

// Menu Mobile Toggle
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.querySelector('.nav-menu');
  
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
      
      // Animar as barras do menu
      const spans = mobileMenuToggle.querySelectorAll('span');
      spans.forEach((span, index) => {
        span.style.transition = 'all 0.3s ease';
        if (mobileMenuToggle.classList.contains('active')) {
          if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
          if (index === 1) span.style.opacity = '0';
          if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
          span.style.transform = 'none';
          span.style.opacity = '1';
        }
      });
    });
    
    // Fechar menu ao clicar em um link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        const spans = mobileMenuToggle.querySelectorAll('span');
        spans.forEach(span => {
          span.style.transform = 'none';
          span.style.opacity = '1';
        });
      });
    });
  }
  
  // Smooth scroll para links internos (incluindo botões)
  const internalLinks = document.querySelectorAll('a[href^="#"]');
  internalLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        const headerHeight = document.querySelector('.modern-header')?.offsetHeight || 80;
        const targetPosition = targetElement.offsetTop - headerHeight - 20;
        
        // Usar scrollTo com fallback para navegadores antigos
        if ('scrollBehavior' in document.documentElement.style) {
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        } else {
          // Fallback para navegadores que não suportam smooth scroll
          window.scrollTo(0, targetPosition);
        }
      }
    });
  });
  
  // Header scroll effect
  const header = document.querySelector('.modern-header');
  let lastScrollTop = 0;
  
  window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 100) {
      header.style.background = 'rgba(37, 99, 235, 0.98)';
      header.style.backdropFilter = 'blur(20px)';
    } else {
      header.style.background = 'rgba(37, 99, 235, 0.95)';
      header.style.backdropFilter = 'blur(10px)';
    }
    
    // Hide/show header on scroll
    if (scrollTop > lastScrollTop && scrollTop > 200) {
      header.style.transform = 'translateY(-100%)';
    } else {
      header.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = scrollTop;
  });
  
  // Dark mode toggle enhancement (removido duplicação)
  
  // Intersection Observer para animações
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observar elementos para animação
  const animatedElements = document.querySelectorAll('.feature-item, .stat-item, .contact-item');
  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
  });
  
  // Form enhancement
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Adicionar loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
      submitBtn.disabled = true;
      
      // Simular envio (substitua pela lógica real)
      setTimeout(() => {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Enviado!';
        submitBtn.style.background = 'var(--success-600)';
        
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = '';
          this.reset();
        }, 2000);
      }, 1500);
    });
  }
  
  // Search input enhancement
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('focus', function() {
      this.parentElement.style.boxShadow = '0 0 0 3px var(--primary-100)';
    });
    
    searchInput.addEventListener('blur', function() {
      this.parentElement.style.boxShadow = '';
    });
  }
  
  // Lazy loading para imagens
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
});

// ===== FUNCIONALIDADES EXISTENTES (MANTIDAS) =====

// ===== ADS VIDEO RANDOM PLAYER INTEGRADO COM CARROSSEL =====
function getPremiumVideoUrls() {
  if (!window.currentAds || !Array.isArray(window.currentAds)) return [];
  return window.currentAds
    .filter(ad => ad.mediaType === 'video' && ad.mediaUrl &&
      (ad.mediaUrl.endsWith('.mp4') || ad.mediaUrl.includes('.mp4?') || ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) &&
      ad.planType === 'premium-plus')
    .map(ad => ad.mediaUrl);
}

function setupAdsVideoPlayer() {
  const videoPlayer = document.getElementById('adsRandomVideo');
  if (!videoPlayer) return;

  let videoList = getPremiumVideoUrls();
  if (!videoList.length) {
    // fallback se não houver propagandas premium
    videoList = [
      "https://lf3-static.bytednsdoc.com/obj/eden-cn/bdeh7uhpsuht/Seedance1.0.mp4",
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"
    ];
  }

  function playRandomVideo() {
    videoList = getPremiumVideoUrls();
    if (!videoList.length) {
      videoList = [
        "https://lf3-static.bytednsdoc.com/obj/eden-cn/bdeh7uhpsuht/Seedance1.0.mp4",
        "https://www.w3schools.com/html/mov_bbb.mp4",
        "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"
      ];
    }
    const randomIndex = Math.floor(Math.random() * videoList.length);
    const selectedVideo = videoList[randomIndex];

    // Busca o objeto do anúncio correspondente
    const ad = (window.currentAds || []).find(ad => ad.mediaUrl === selectedVideo);

    // Atualiza os elementos da UI premium
    if (ad) {
      const titleEl = document.querySelector('.ad-title');
      const sloganEl = document.querySelector('.ad-slogan');
      const ctaBtn = document.querySelector('.ad-cta-btn');
      if (titleEl) titleEl.textContent = ad.title || '';
      if (sloganEl) sloganEl.textContent = ad.description || '';
      if (ctaBtn) {
        ctaBtn.href = ad.targetUrl || '#';
        ctaBtn.textContent = ad.ctaText || 'Saiba mais';
        ctaBtn.style.display = ad.targetUrl ? '' : 'none';
      }
    }

    // Suporte apenas para mp4 direto (não YouTube embed)
    if (selectedVideo.includes('youtube.com') || selectedVideo.includes('youtu.be')) {
      playRandomVideo();
      return;
    }
    videoPlayer.src = selectedVideo;
    videoPlayer.muted = true;
    videoPlayer.load();
    videoPlayer.play().catch(() => {});
  }

  // Força o mute permanentemente
  Object.defineProperty(videoPlayer, 'muted', {
    get: () => true,
    set: () => {},
    configurable: false
  });

  // Reproduz ao carregar
  playRandomVideo();
  // Troca ao terminar
  videoPlayer.addEventListener('ended', playRandomVideo);

  // Atualiza o vídeo quando as propagandas mudarem
  window.addEventListener('premiumAdsUpdated', playRandomVideo);
}

document.addEventListener('DOMContentLoaded', setupAdsVideoPlayer);


