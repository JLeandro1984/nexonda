import { showAlert } from "../components/alert.js";

let ytPlayer;
let lastVideoUrl = ''; // Para armazenar o último vídeo

// Função chamada pela API do YouTube quando a biblioteca é carregada
function onYouTubeIframeAPIReady() {
    console.log('YouTube API carregada com sucesso!');
    // A API está pronta para uso
}

// Função para abrir o player
function openYouTubePlayer(videoUrl) {  
  const modal = document.getElementById('youtube-modal');
  const overlay = document.getElementById('youtube-overlay');
  const ytContainer = document.getElementById('youtube-player');
  const videoTag = document.getElementById('custom-video-player');

  if (!modal || !overlay || !ytContainer || !videoTag) {
    console.error('Elementos do modal do YouTube não encontrados');
    // Fallback: abre em nova aba
    window.open(videoUrl, '_blank');
    return;
  }

  const videoId = getYouTubeVideoId(videoUrl);
  const isMp4 = videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4?');

  overlay.classList.remove('d-none');
  modal.classList.remove('d-none');
  document.querySelector('.close-btn').style.display = 'block';

  if (videoId) {
    ytContainer.style.display = 'block';
    videoTag.style.display = 'none';

    // Verifica se a API do YouTube está carregada
    if (typeof YT === 'undefined' || !YT.Player) {
      console.warn('API do YouTube não está carregada. Abrindo em nova aba...');
      window.open(videoUrl, '_blank');
      closeYouTubePlayer();
      return;
    }

    if (!ytPlayer) {
      try {
        ytPlayer = new YT.Player(ytContainer, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            mute: 1,
          },
          events: {
            onReady: () => {
              console.log('Player do YouTube pronto!');
              ytPlayer.playVideo();
            },
            onError: (event) => {
              console.warn('Erro no player do YouTube:', event);
              window.open(videoUrl, '_blank');
              closeYouTubePlayer();
            },
          },
        });
      } catch (error) {
        console.error('Erro ao criar player do YouTube:', error);
        window.open(videoUrl, '_blank');
        closeYouTubePlayer();
      }
    } else {
      try {
        ytPlayer.loadVideoById(videoId);
        ytPlayer.playVideo();
      } catch (error) {
        console.error('Erro ao carregar vídeo:', error);
        window.open(videoUrl, '_blank');
        closeYouTubePlayer();
      }
    }
  } else if (isMp4) {
    ytContainer.style.display = 'none';
    videoTag.style.display = 'block';

    try {
      videoTag.src = videoUrl;
      videoTag.load();
      videoTag.play().catch(error => {
        console.warn('Erro ao reproduzir vídeo MP4:', error);
        window.open(videoUrl, '_blank');
        closeYouTubePlayer();
      });
    } catch (error) {
      console.error('Erro ao carregar vídeo MP4:', error);
      window.open(videoUrl, '_blank');
      closeYouTubePlayer();
    }
  } else {
    console.warn('Formato de vídeo não suportado:', videoUrl);
    window.open(videoUrl, '_blank');
    closeYouTubePlayer();
  }
}

  
// Função para fechar o player
function closeYouTubePlayer() {
  const modal = document.getElementById('youtube-modal');
  const overlay = document.getElementById('youtube-overlay');
  const modalPlayer = document.getElementById('youtube-player');
  const videoTag = document.getElementById('custom-video-player');

  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    try {
      ytPlayer.stopVideo();
      ytPlayer.destroy();
    } catch (error) {
      console.warn('Erro ao destruir player do YouTube:', error);
    }
    ytPlayer = null;
  }

  if (videoTag) {
    try {
      videoTag.pause();
      videoTag.src = '';
      videoTag.style.display = 'none';
    } catch (error) {
      console.warn('Erro ao pausar vídeo:', error);
    }
  }

  if (modalPlayer) {
    modalPlayer.style.display = 'none';
  }
  
  if (overlay) {
    overlay.classList.add('d-none');
  }
  
  if (modal) {
    modal.classList.add('d-none');
  }
  
  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.style.display = 'none';
  }
}


// Função para obter o ID do vídeo a partir da URL
function getYouTubeVideoId(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
  
      if (hostname.includes("youtu.be")) {
        // Formato: youtu.be/VIDEO_ID
        return urlObj.pathname.slice(1);
      }
  
      if (hostname.includes("youtube.com")) {
        // Formato: youtube.com/watch?v=VIDEO_ID
        return urlObj.searchParams.get("v");
      }
  
      return null;
    } catch (e) {
      console.warn('Erro ao extrair ID do YouTube:', e);
      return null; // URL inválida
    }
}
  
// Função para abrir player de YouTube com tratamento de erros melhorado
window.openYouTubePlayer = function(url) {
  try {
    // Verifica se a URL é válida
    if (!url || typeof url !== 'string') {
      console.warn('URL do YouTube inválida:', url);
      return;
    }

    // Chama a função original que abre o modal
    openYouTubePlayer(url);
  } catch (error) {
    console.error('Erro ao abrir player do YouTube:', error);
    // Fallback: abre a URL diretamente
    window.open(url, '_blank');
  }
};

// Exporta as funções para o escopo global
window.closeYouTubePlayer = closeYouTubePlayer;
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  
// Log para debug
console.log('YouTube API module carregado');
  