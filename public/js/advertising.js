import { showAlert } from '../components/alert.js';
import { formatarNumeroAbreviado } from './utils.js';

// Variáveis globais
let carouselInterval = null;
let updateTimeout = null;
const UPDATE_INTERVAL = 1800000; // 30 min
let currentAds = []; // Armazena os anúncios atuais
window.currentAds = currentAds;

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
    window.currentAds = currentAds;
    window.dispatchEvent(new Event('premiumAdsUpdated'));

    // Rastreia as impressões dos anúncios carregados
    trackImpressions(currentAds);

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
  adItem.dataset.adDetails = encodeURIComponent(JSON.stringify(ad));

  // Adicione um fallback para imagens que não carregam
  const imgTag = ad.mediaType === 'image'
    ? `<img class="img-propaganda" src="${ad.mediaUrl}" alt="${ad.title}" loading="lazy" onerror="this.src='/images/placeholder.jpg';">`
    : createMediaContent(ad);

  adItem.innerHTML = `
    ${imgTag}
    <div class="premium-ad-content">
      <h3>${ad.title}</h3>
      <p title="${ad.description}">${truncateDescription(ad.description)}</p>
      <a href="${ad.targetUrl}" class="premium-ad-link" target="_blank">
        Saiba mais
      </a>
    </div>
  `;

  return adItem;
}

function createMediaContent(ad) {
  if (ad.mediaType === 'image') {
    return `<img class="img-propaganda" src="${ad.mediaUrl}" alt="${ad.title}" loading="lazy">`;
  } else if (ad.mediaType === 'video') {
    return createVideoContent(ad);
  }
  return '';
}

function createVideoContent(ad) {
  if (ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) {
    const videoId = getYouTubeVideoId(ad.mediaUrl);

    //bloquer view "clicks" por enquanto, depois apresentar  >=100
    //const viewsOverlay = ad?.clicks >=100 ? `<div class="ad-views-overlay"><i class='far fa-eye'></i> ${formatarNumeroAbreviado(155555)}</div>` : '';
     const viewsOverlay=""
  
    return `
      <div class="youtube-video-container" data-video-url="${ad.mediaUrl}">
        <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${ad.title}">
        <div class="play-overlay">
          <i class="fas fa-play"></i>
        </div>
        ${viewsOverlay}
      </div>
    `;
  }
  // 🔁 Gera automaticamente um poster com base no vídeo do Cloudinary
  const posterUrl = ad.mediaUrl.replace('/upload/', '/upload/so_1/').replace('.mp4', '.jpg');
  
  //bloquer view "clicks" por enquanto, depois apresentar  >=100
  //const viewsOverlay = ad.clicks >= 100 ? `<div class="ad-views-overlay"><i class='far fa-eye'></i> ${formatarNumeroAbreviado(ad.clicks)}</div>` : '';
  const viewsOverlay = "";

  return `
    <div data-video-url="${ad.mediaUrl}">
      <video width="100%" height="180" muted autoplay playsinline poster="${posterUrl}">
        <source src="${ad.mediaUrl}" type="video/mp4">
        Seu navegador não suporta vídeos HTML5.
      </video>
      ${viewsOverlay}
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
    const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/publicPremiumAds');
    if (!response.ok) throw new Error('Erro ao carregar propagandas');
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar anúncios:', error);
    return [];
  }
}

// Funções do carrossel
function addCarouselIndicators(carousel, container) {
  const items = carousel.querySelectorAll('.premium-ad-item');
  if (items.length <= 1) return;
  
  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';
  
  for (let i = 0; i < items.length; i++) {
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator' + (i === 0 ? ' active' : '');
    indicator.setAttribute('aria-label', `Ir para item ${i + 1}`);
    indicator.onclick = () => {
      carousel.scrollTo({
        left: items[i].offsetLeft - 32,
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

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  loadPremiumAds();
});


document.addEventListener('click', function (e) {
  const videoContainer = e.target.closest('[data-video-url]');
  if (videoContainer) {
    e.preventDefault();
    e.stopPropagation();
    
    const videoUrl = videoContainer.dataset.videoUrl;

    // Detecta se é YouTube ou Firebase Storage MP4 ou outro vídeo suportado
    const isYouTube = (url) => {
      try {
        const hostname = new URL(url).hostname;
        return hostname.includes('youtube.com') || hostname.includes('youtu.be');
      } catch {
        return false;
      }
    };

    const isFirebaseStorageMp4 = (url) => {
      try {
        // URLs do Firebase Storage geralmente têm esse padrão e terminam com .mp4?alt=media
        return url.includes('firebasestorage.googleapis.com') && (url.endsWith('.mp4') || url.includes('.mp4?'));
      } catch {
        return false;
      }
    };

    const isCloudinaryMp4 = (url) => {
        try {
          return url.includes('res.cloudinary.com') && (url.endsWith('.mp4') || url.includes('.mp4?'));
        } catch {
          return false;
        }
     };
    
   
      if (isYouTube(videoUrl) || isFirebaseStorageMp4(videoUrl) || isCloudinaryMp4(videoUrl)) {
        window.openYouTubePlayer(videoUrl);
      } else {
        console.warn('URL de vídeo não suportada:', videoUrl);
        showAlert('Formato de vídeo não suportado.');
      }
   
  }
});

/*Proganda img premium plus*/
let intervalId = null;
let indexAtual = 0;
const adsSection = document.getElementById('ads-img-premium-plus');

function getPremiumImagensAds() {
  if (!window.currentAds || !Array.isArray(window.currentAds)) {
    console.warn('currentAds não está disponível ou não é um array');
    return [];
  }

  return window.currentAds
    .filter(ad => {
      if (!ad || !ad.mediaType) return false;
      const isImage = ad.mediaType === 'image';
      const isPremiumPlus = ad.planType === 'premium-plus';
      const hasValidUrl = ad.mediaUrl && (
        ad.mediaUrl.split('?')[0].endsWith('.jpg') ||
        ad.mediaUrl.split('?')[0].endsWith('.jpeg') ||
        ad.mediaUrl.split('?')[0].endsWith('.png') ||
        ad.mediaUrl.split('?')[0].endsWith('.webp') ||
        ad.mediaUrl.split('?')[0].endsWith('.gif')
      );
      return isImage && isPremiumPlus && hasValidUrl;
    })
    .map(ad => ({
      imagem: ad.mediaUrl,
      titulo: ad.title || 'Título não informado',
      descricao: ad.description || 'Descrição não disponível.'
    }));
}

function setupAdsImage() {
  adsSection.classList.add('hide');

  const adsImage = document.getElementById('ads-img-premium-plus');
  if (!adsImage) return;

  let propagandas = getPremiumImagensAds();
  debugger
  
  if (propagandas.length) {
      adsSection.classList.remove('hide');
  }    
  
  //if (!propagandas.length) {   
    // propagandas = [
    //   {
    //     imagem: "https://lh6.googleusercontent.com/proxy/xlpoCWFRtpZ8rbroj2Xnx4KF5Kih0mcANpDnV9_7RMDeaboLR4h-SnpMh815gP90kEEjzi61tmLA9q8XcnDeSO-YnBEWs2RII46G5amFSDh0RKjkzuOt4CkNpZZEhLbtPQ",
    //     titulo: "Tecnologia com Descontos Incríveis",
    //     descricao: "Smartphones, notebooks e acessórios com preços imperdíveis. Só nesta semana!"
    //   },
    //   {
    //     imagem: "https://lh5.googleusercontent.com/proxy/WiTIDMsS0CvI4dFSgVQ1VM9GoXTX9HAGO01bg2unfmb6oB2vvK87gbO5OhLNwcwEKgh1_xSxp6khU8onmtCVr39I0xG5eDa0fJcVDwCCXPbS6sYF109kTqhRxhfsBDsoqwc",
    //     titulo: "Combo Lanche + Refri por R$19,90!",
    //     descricao: "Seu lanche favorito com preço de dar água na boca. Válido só até as 22h!"
    //   }
    // ];
  //}

  // Propaganda fixa ao final
  // propagandas.push({
  //   imagem: "https://lh5.googleusercontent.com/proxy/5PqoHTX4sAxuw4QOqmhJEjjnQHSAl2IimO3aXqHi0PiOtUFVUwgSvV84gumfeQEwQs4S2Ll8kUoAiIf9N5kDXQW9G43SrbaSnEYZUb_B3l39wYmIAvytk7ensMYeS-gc6g",
  //   titulo: "Moda Inverno 2025 com até 60% OFF!",
  //   descricao: "Estilo e conforto para os dias frios. Aproveite as ofertas exclusivas da nova coleção!"
  // });

  function exibirPropaganda(index) {
    const propaganda = propagandas[index];
    if (!propaganda) return;

    const imgEl = document.getElementById("adImage-premium-plus");
    const titleEl = document.getElementById("adTitle-premium-plus");
    const descEl = document.getElementById("adDescription-premium-plus");

    if (imgEl && propaganda.imagem) {
      imgEl.src = propaganda.imagem;
    }

    if (titleEl && propaganda.titulo) {
      titleEl.textContent = propaganda.titulo;
    }

    if (descEl && propaganda.descricao) {
      descEl.textContent = propaganda.descricao;
    }
  }

  function iniciarRotacao() {
    if (intervalId) clearInterval(intervalId); // evita duplicação
    exibirPropaganda(indexAtual);
    intervalId = setInterval(() => {
      indexAtual = (indexAtual + 1) % propagandas.length;
      exibirPropaganda(indexAtual);
    }, 30000); // 30 segundos
  }

  iniciarRotacao();
}

document.addEventListener('DOMContentLoaded', () => {  
  setupAdsImage();
  window.addEventListener('premiumAdsUpdated', setupAdsImage);
  verificarEExibirAdsImagem();
});

function verificarEExibirAdsImagem() {
  const adsSection = document.getElementById('ads-img-premium-plus');
  const imgEl = document.getElementById('adImage-premium-plus');

  if (adsSection && imgEl && imgEl.src && imgEl.src.includes('https://')) {
    adsSection.classList.remove('hide');
  } else {
    adsSection.classList.add('hide');
  }
}


// Função para rastrear impressões
function trackImpressions(ads) {
  if (!ads || ads.length === 0) return;

  ads.forEach(ad => {
    fetch('https://us-central1-nexonda-281084.cloudfunctions.net/trackAdEvent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId: ad.id, eventType: 'impression' })
    }).catch(error => console.warn('Falha ao registrar impressão:', error));
  });
}