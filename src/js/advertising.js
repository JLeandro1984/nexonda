// advertising.js - Versão que mantém a estrutura HTML existente

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
  activeAds.forEach(ad => {
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
            <iframe 
              src="https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen
              data-video-id="${videoId}"
            ></iframe>
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
    
    adItem.innerHTML = `
      ${mediaContent}
      <div class="premium-ad-content">
        <h3>${ad.title}</h3>
        <p>${ad.description}</p>
        <a href="${ad.targetUrl}" class="premium-ad-link" target="_blank">Saiba mais</a>
      </div>
    `;
    
    carousel.appendChild(adItem);
  });

  // Adiciona controles de navegação
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.innerHTML = `
    <button class="carousel-control prev" onclick="scrollCarousel(-1)">❮</button>
    <button class="carousel-control next" onclick="scrollCarousel(1)">❯</button>
  `;

  adsContainer.appendChild(carousel);
  adsContainer.appendChild(controls);

  // Configura os iframes do YouTube
  setupYouTubeIframes();
}

// Configura os iframes do YouTube para usar a API
function setupYouTubeIframes() {
  // Esta função será chamada quando a API do YouTube estiver pronta
  window.onYouTubeIframeAPIReady = function() {
    document.querySelectorAll('.youtube-video-container iframe').forEach(iframe => {
      new YT.Player(iframe, {
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange
        }
      });
    });
  };

  function onPlayerReady(event) {
    // Pode adicionar lógica adicional quando o player estiver pronto
  }

  function onPlayerStateChange(event) {
    // Pode adicionar lógica para tratar mudanças de estado do vídeo
  }
}

// Função para obter ID do vídeo do YouTube (reutilizada da youtube-api.js)
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

// Função para rolar o carrossel
window.scrollCarousel = function(direction) {
  const carousel = document.querySelector('.premium-carousel');
  if (!carousel) return;
  
  const scrollAmount = 300;
  carousel.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
};

// Carrega as propagandas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  loadPremiumAds();
});