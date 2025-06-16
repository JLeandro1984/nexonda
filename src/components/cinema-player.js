let cinemaPlayerInstance = {
  currentUrl: '',
  player: null,
  playerType: null // 'youtube', 'html5', ou null
};

window.openCinemaPlayer = function (url) {
  const modal = document.getElementById('cinemaModal');
  const screenContent = document.getElementById('screenContent');

  // Limpa player anterior
  resetPlayer();

  if (/youtu\.?be/.test(url)) {
    // Configura player do YouTube
    let videoId = extractYouTubeId(url);
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.className = 'youtube-iframe';
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
      iframe.allow = 'autoplay; encrypted-media';
      iframe.allowFullscreen = true;
      iframe.id = 'youtube-iframe';
      screenContent.insertBefore(iframe, screenContent.firstChild);
      
      cinemaPlayerInstance = {
        player: iframe,
        currentUrl: url,
        playerType: 'youtube'
      };
    }
  } else {
    // Configura player HTML5 para MP4 e outros formatos
    const video = document.createElement('video');
    video.id = 'html5-player';
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true; // Importante para iOS
    video.muted = false;
    
    // Adiciona tracks de fallback para melhor compatibilidade
    const source = document.createElement('source');
    source.src = url;
    source.type = getVideoType(url);
    video.appendChild(source);
    
    screenContent.insertBefore(video, screenContent.firstChild);
    
    cinemaPlayerInstance = {
      player: video,
      currentUrl: url,
      playerType: 'html5'
    };
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
};

window.closeCinemaPlayer = function () {
  const modal = document.getElementById('cinemaModal');
  modal.hidden = true;
  document.body.style.overflow = '';
  
  resetPlayer();
};

function resetPlayer() {
  if (cinemaPlayerInstance.player) {
    switch (cinemaPlayerInstance.playerType) {
      case 'youtube':
        const iframe = document.getElementById('youtube-iframe');
        if (iframe) {
          // Método mais eficiente para parar o YouTube
          iframe.src = '';
        }
        break;
      
      case 'html5':
        if (cinemaPlayerInstance.player.pause) {
          cinemaPlayerInstance.player.pause();
          cinemaPlayerInstance.player.currentTime = 0;
          cinemaPlayerInstance.player.removeAttribute('src');
          cinemaPlayerInstance.player.load();
        }
        break;
    }
  }
  
  const screenContent = document.getElementById('screenContent');
  if (screenContent) {
    screenContent.innerHTML = '<div class="film-texture"></div>';
  }
  
  cinemaPlayerInstance = {
    player: null,
    currentUrl: '',
    playerType: null
  };
}

function extractYouTubeId(url) {
  const regex = /(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}

function getVideoType(url) {
  const extension = url.split('.').pop().toLowerCase();
  switch (extension) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
    case 'ogv':
      return 'video/ogg';
    default:
      return 'video/mp4'; // Assume MP4 como padrão
  }
}