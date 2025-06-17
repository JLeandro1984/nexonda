import { showAlert } from "../components/alert.js";

let ytPlayer;
let lastVideoUrl = ''; // Para armazenar o último vídeo

// Função chamada pela API do YouTube quando a biblioteca é carregada
function onYouTubeIframeAPIReady() {
    //console.log('YouTube API carregada!');
}

// Função para abrir o player
function openYouTubePlayer(videoUrl) {
  const modal = document.getElementById('youtube-modal');
  const overlay = document.getElementById('youtube-overlay');
  const ytContainer = document.getElementById('youtube-player');
  const videoTag = document.getElementById('custom-video-player');

  const videoId = getYouTubeVideoId(videoUrl);
  const isMp4 = videoUrl.endsWith('.mp4') || videoUrl.includes('.mp4?');

  overlay.classList.remove('d-none');
  modal.classList.remove('d-none');
  document.querySelector('.close-btn').style.display = 'block';

  if (videoId) {
    ytContainer.style.display = 'block';
    videoTag.style.display = 'none';

    if (!ytPlayer) {
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
          onReady: () => ytPlayer.playVideo(),
          onError: () => {
            window.open(videoUrl, '_blank');
            closeYouTubePlayer();
          },
        },
      });
    } else {
      ytPlayer.loadVideoById(videoId);
      ytPlayer.playVideo();
    }
  } else if (isMp4) {
    ytContainer.style.display = 'none';
    videoTag.style.display = 'block';

    videoTag.src = videoUrl;
    videoTag.load();
    videoTag.play();
  } else {
    alert('Formato de vídeo não suportado.');
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
    ytPlayer.stopVideo();
    ytPlayer.destroy();
    ytPlayer = null;
  }

  if (videoTag) {
    videoTag.pause();
    videoTag.src = '';
    videoTag.style.display = 'none';
  }

  modalPlayer.style.display = 'none';
  overlay.classList.add('d-none');
  modal.classList.add('d-none');
  document.querySelector('.close-btn').style.display = 'none';
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
      return null; // URL inválida
    }
}
  
window.openYouTubePlayer = openYouTubePlayer;
window.closeYouTubePlayer = closeYouTubePlayer;
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  