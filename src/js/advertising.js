// advertising.js - Versão melhorada

// Função para carregar propagandas premium
function loadPremiumAds() {
  const adsContainer = document.querySelector('.premium-ads-container');
  if (!adsContainer) return;

  // Carrega os dados do localStorage
  const storedAds = localStorage.getItem('premiumAdsData');
  const premiumAds = storedAds ? JSON.parse(storedAds) : [];
  
  // Filtra apenas propagandas ativas e premium
  const activeAds = premiumAds.filter(ad => {
    const endDate = new Date(ad.endDate);
    const today = new Date();
    return ad.isActive && endDate >= today && ad.adType === 'premium';
  });

  if (activeAds.length === 0) {
    adsContainer.parentElement.style.display = 'none';
    return;
  }

  // Cria o carrossel
  const carousel = document.createElement('div');
  carousel.className = 'premium-carousel';
  
  // Cria os itens do carrossel
  activeAds.forEach((ad, index) => {
    const adItem = document.createElement('div');
    adItem.className = 'premium-ad-item';
    
    let mediaContent = '';
    if (ad.mediaType === 'image') {
      mediaContent = `<img src="${ad.mediaUrl}" alt="${ad.title}" loading="lazy">`;
    } else if (ad.mediaType === 'video') {
      if (ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) {
        const videoId = getYouTubeVideoId(ad.mediaUrl);
        mediaContent = `
          <div class="youtube-video-container" onclick="openYouTubePlayer('${ad.mediaUrl}')">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${ad.title}">
            <div class="play-overlay">
              <i class="fas fa-play"></i>
            </div>
          </div>
        `;
      } else {
        mediaContent = `
          <video width="100%" height="180" controls>
            <source src="${ad.mediaUrl}" type="video/mp4">
            Seu navegador não suporta vídeos HTML5.
          </video>
        `;
      }
    }
    
    // Limita a descrição para evitar overflow
    const shortDescription = ad.description.length > 150 ? 
      ad.description.substring(0, 150) + '...' : ad.description;
    
    adItem.innerHTML = `
      ${mediaContent}
      <div class="premium-ad-content">
        <h3>${ad.title}</h3>
        <p title="${ad.description}">${shortDescription}</p>
        <a href="${ad.targetUrl}" class="premium-ad-link" target="_blank">Saiba mais</a>
      </div>
    `;
    
    carousel.appendChild(adItem);
  });

  // Adiciona controles de navegação
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.innerHTML = `
    <button class="carousel-control prev" aria-label="Anterior" onclick="scrollCarousel(-300)">
      <span aria-hidden="true">❮</span>
    </button>
    <button class="carousel-control next" aria-label="Próximo" onclick="scrollCarousel(300)">
      <span aria-hidden="true">❯</span>
    </button>
  `;

  adsContainer.appendChild(carousel);
  adsContainer.appendChild(controls);

  // Adiciona indicadores de scroll
  addCarouselIndicators(carousel, adsContainer);
  
  // Configura observador de scroll para atualizar indicadores
  setupScrollObserver(carousel);

  startAutoCarousel();
  setupCarouselHover();
}

// Adiciona indicadores de scroll
function addCarouselIndicators(carousel, container) {
  const itemCount = carousel.children.length;
  if (itemCount <= 1) return;
  
  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';
  
  for (let i = 0; i < itemCount; i++) {
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator' + (i === 0 ? ' active' : '');
    indicator.setAttribute('aria-label', `Ir para item ${i + 1}`);
    indicator.onclick = () => {
      carousel.scrollTo({
        left: carousel.children[i].offsetLeft - 32,
        behavior: 'smooth'
      });
    };
    indicators.appendChild(indicator);
  }
  
  container.appendChild(indicators);
}

// Configura observador de scroll
function setupScrollObserver(carousel) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(carousel.children).indexOf(entry.target);
        updateActiveIndicator(index);
      }
    });
  }, {
    root: carousel,
    threshold: 0.7
  });

  Array.from(carousel.children).forEach(item => {
    observer.observe(item);
  });
}

// Atualiza indicador ativo
function updateActiveIndicator(index) {
  const indicators = document.querySelectorAll('.carousel-indicator');
  indicators.forEach((indicator, i) => {
    indicator.classList.toggle('active', i === index);
  });
}

// Função para rolar o carrossel
window.scrollCarousel = function(scrollAmount) {
  const carousel = document.querySelector('.premium-carousel');
  if (!carousel) return;
  
  carousel.scrollBy({
    left: scrollAmount,
    behavior: 'smooth'
  });
};

// Carrega as propagandas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  loadPremiumAds();
});

// Funções auxiliares permanecem as mesmas
function getYouTubeVideoId(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1);
    }

    if (hostname.includes("youtube.com")) {
      return urlObj.searchParams.get("v");
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Variável para controlar o intervalo
let carouselInterval;

function startAutoCarousel() {
  const carousel = document.querySelector('.premium-carousel');
  if (!carousel || carousel.children.length <= 1) return;

  // Para qualquer intervalo existente antes de iniciar um novo
  stopAutoCarousel();

  // Configura o intervalo para passar os cards
  carouselInterval = setInterval(() => {
    const scrollAmount = carousel.offsetWidth;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    
    if (carousel.scrollLeft >= maxScroll - 10) {
      // Volta para o início se chegou ao final
      carousel.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    } else {
      // Avança para o próximo card
      carousel.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  }, 5000); // Muda a cada 5 segundos (ajuste conforme necessário)
}

function stopAutoCarousel() {
  if (carouselInterval) {
    clearInterval(carouselInterval);
  }
}

// Pausa o carrossel quando o mouse está sobre ele
function setupCarouselHover() {
  const carousel = document.querySelector('.premium-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoCarousel);
    carousel.addEventListener('mouseleave', startAutoCarousel);
  }
}