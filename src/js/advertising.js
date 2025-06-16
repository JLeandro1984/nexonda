// Variáveis globais
let carouselInterval = null;
let updateTimeout = null;
const UPDATE_INTERVAL = 30000; // 30 segundos
let currentAds = []; // Armazena os anúncios atuais

// Função principal para carregar propagandas premium
async function loadPremiumAds() {
  const sectionAds = document.querySelector('#premium-ads');
  const adsContainer = document.querySelector('.premium-ads-container');
  if (!adsContainer) return;

  try {
    // 1. Obter novos dados em segundo plano
    const premiumAds = await getPremiumAdsFromFirebase();
    const activeAds = filterActiveAds(premiumAds);

    // 2. Se não houver mudanças, apenas agenda próxima atualização
    if (JSON.stringify(activeAds) === JSON.stringify(currentAds)) {
      scheduleNextUpdate();
      return;
    }

    // 3. Atualiza a referência dos anúncios atuais
    currentAds = activeAds;

    // 4. Seção vazia (primeira carga ou sem anúncios)
    if (activeAds.length === 0) {
      hideAdsSection(sectionAds, adsContainer);
      return;
    }

    // 5. Mostra a seção (se estiver oculta)
    showAdsSection(sectionAds, adsContainer);

    // 6. Pré-cria o novo carrossel antes de substituir
    const { newCarousel, newControls } = await createNewCarouselElements(activeAds);

    // 7. Substituição suave
    await smoothReplaceCarousel(adsContainer, newCarousel, newControls);

    // 8. Configura comportamentos
    setupCarouselBehavior();

    // 9. Agenda próxima atualização
    scheduleNextUpdate();
    
  } catch (error) {
    console.error('Erro ao carregar anúncios premium:', error);
    // Mantém o conteúdo atual em caso de erro
  }
}

// Função auxiliar para criação assíncrona dos elementos
async function createNewCarouselElements(ads) {
  return new Promise(resolve => {
    // Usa requestAnimationFrame para não bloquear a UI
    requestAnimationFrame(() => {
      const newCarousel = document.createElement('div');
      newCarousel.className = 'premium-carousel';
      
      ads.forEach(ad => {
        newCarousel.appendChild(createCarouselItem(ad));
      });

      const newControls = createCarouselControls();
      
      resolve({ newCarousel, newControls });
    });
  });
}

// Substituição suave do carrossel
async function smoothReplaceCarousel(container, newCarousel, newControls) {
  return new Promise(resolve => {
    const oldCarousel = container.querySelector('.premium-carousel');
    const oldControls = container.querySelector('.carousel-controls');
    const oldIndicators = container.querySelector('.carousel-indicators');
    
    // Configura opacidade inicial para animação
    newCarousel.style.opacity = '0';
    newControls.style.opacity = '0';
    
    // Adiciona os novos elementos de forma invisível
    container.appendChild(newCarousel);
    container.appendChild(newControls);
    
    // Animação de fade-in/fade-out
    requestAnimationFrame(() => {
      // Fade-in dos novos elementos
      newCarousel.style.transition = 'opacity 300ms ease-out';
      newControls.style.transition = 'opacity 300ms ease-out';
      newCarousel.style.opacity = '1';
      newControls.style.opacity = '1';
      
      // Remove os antigos após a transição
      setTimeout(() => {
        if (oldCarousel) oldCarousel.remove();
        if (oldControls) oldControls.remove();
        if (oldIndicators) oldIndicators.remove();
        
        // Adiciona indicadores após a transição
        addCarouselIndicators(newCarousel, container);
        resolve();
      }, 300);
    });
  });
}

// Funções de limpeza ajustadas
function cleanUpExistingCarousel() {
  stopAutoCarousel();
  clearTimeout(updateTimeout);
}

// Funções de filtro e processamento
function filterActiveAds(ads) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return ads.filter(ad => {
    if (!ad.isActive) return false;
    
    try {
      const startDate = ad.startDate ? new Date(ad.startDate) : null;
      const endDate = ad.endDate ? new Date(ad.endDate) : null;
      
      return startDate && endDate && startDate <= today && endDate >= today;
    } catch (e) {
      console.error('Data inválida no anúncio:', ad);
      return false;
    }
  });
}

// Funções de construção do carrossel
function createCarouselItem(ad) {
  const adItem = document.createElement('div');
  adItem.className = 'premium-ad-item';
  
  adItem.innerHTML = `
    ${createMediaContent(ad)}
    <div class="premium-ad-content">
      <h3>${ad.title}</h3>
      <p title="${ad.description}">${truncateDescription(ad.description)}</p>
      <a href="${ad.targetUrl}" class="premium-ad-link" target="_blank" 
         onclick="trackAdClick('${ad.id}'); return true;">
        Saiba mais
      </a>
    </div>
  `;
  
  return adItem;
}

function createMediaContent(ad) {
  if (ad.mediaType === 'image') {
    return `<img src="${ad.mediaUrl}" alt="${ad.title}" loading="lazy">`;
  } else if (ad.mediaType === 'video') {
    return createVideoContent(ad);
  }
  return '';
}

// function createVideoContent(ad) {
//   if (ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) {
//     const videoId = getYouTubeVideoId(ad.mediaUrl);
//     return `
//       <div class="youtube-video-container" onclick="openCinemaPlayer('${ad.mediaUrl}')">
//         <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${ad.title}">
//         <div class="play-overlay">
//           <i class="fas fa-play"></i>
//         </div>
//       </div>
//     `;
//   }
//   return `
//     <video width="100%" height="180" controls>
//       <source src="${ad.mediaUrl}" type="video/mp4">
//       Seu navegador não suporta vídeos HTML5.
//     </video>
//   `;
// }

function createVideoContent(ad) {
  if (ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) {
    const videoId = getYouTubeVideoId(ad.mediaUrl);
    return `
      <div class="youtube-video-container" data-video-url="${ad.mediaUrl}">
        <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${ad.title}">
        <div class="play-overlay">
          <i class="fas fa-play"></i>
        </div>
      </div>
    `;
  }
  return `
    <div data-video-url="${ad.mediaUrl}">
      <video width="100%" height="180" controls>
        <source src="${ad.mediaUrl}" type="video/mp4">
        Seu navegador não suporta vídeos HTML5.
      </video>
    </div>
  `;
}

function truncateDescription(description, maxLength = 150) {
  return description.length > maxLength 
    ? description.substring(0, maxLength) + '...' 
    : description;
}

function createCarouselControls() {
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
  return controls;
}

// Configuração do comportamento do carrossel
function setupCarouselBehavior() {
  const carousel = document.querySelector('.premium-carousel');
  if (!carousel) return;

  setupScrollObserver(carousel);
  startAutoCarousel();
  setupCarouselHover();
}

// Funções de atualização automática
function scheduleNextUpdate() {
  clearTimeout(updateTimeout);

  updateTimeout = setTimeout(() => {
    loadPremiumAds().catch(console.error);
  }, UPDATE_INTERVAL);
}

// Funções para interação com a API
async function getPremiumAdsFromFirebase() {
  try {
    const response = await fetch('https://publicpremiumads-lnpdkkqg5q-uc.a.run.app');
    if (!response.ok) throw new Error('Erro ao carregar propagandas');
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar anúncios:', error);
    return [];
  }
}

async function trackAdClick(adId) {
  try {
    await fetch('https://publicpremiumads-lnpdkkqg5q-uc.a.run.app/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId, type: 'click' })
    });
  } catch (error) {
    console.error('Erro ao rastrear clique:', error);
  }
}

// Funções do carrossel
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

function updateActiveIndicator(index) {
  const indicators = document.querySelectorAll('.carousel-indicator');
  indicators.forEach((indicator, i) => {
    indicator.classList.toggle('active', i === index);
  });
}

window.scrollCarousel = function(scrollAmount) {
  const carousel = document.querySelector('.premium-carousel');
  if (!carousel) return;
  
  carousel.scrollBy({
    left: scrollAmount,
    behavior: 'smooth'
  });
};

function startAutoCarousel() {
  if (carouselInterval) return;
  
  const carousel = document.querySelector('.premium-carousel');
  if (!carousel || carousel.children.length <= 1) return;

  carouselInterval = setInterval(() => {
    const scrollAmount = carousel.offsetWidth;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    
    if (carousel.scrollLeft >= maxScroll - 10) {
      carousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, 5000);
}

function stopAutoCarousel() {
  if (carouselInterval) {
    clearInterval(carouselInterval);
    carouselInterval = null;
  }
}

function setupCarouselHover() {
  const carousel = document.querySelector('.premium-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoCarousel);
    carousel.addEventListener('mouseleave', startAutoCarousel);
  }
}

// Funções auxiliares de UI
function hideAdsSection(section, container) {
  if (section) section.style.display = 'none';
  if (container && container.parentElement) container.parentElement.style.display = 'none';
}

function showAdsSection(section, container) {
  if (section) section.style.display = '';
  if (container && container.parentElement) container.parentElement.style.display = '';
}

function getYouTubeVideoId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtu.be")) return urlObj.pathname.slice(1);
    if (urlObj.hostname.includes("youtube.com")) return urlObj.searchParams.get("v");
    return null;
  } catch (e) {
    return null;
  }
}

// Função para recarregamento manual
window.reloadPremiumAds = async function() {
  await loadPremiumAds();
};

// Função para abrir player de YouTube
// window.openYouTubePlayer = function(url) {
//   window.open(url, '_blank');
// };

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  loadPremiumAds();
});


document.addEventListener('click', function(e) {
  const videoContainer = e.target.closest('[data-video-url]');
  if (videoContainer) {
    e.preventDefault();
    const videoUrl = videoContainer.dataset.videoUrl;
    openCinemaPlayer(videoUrl);
  }
});