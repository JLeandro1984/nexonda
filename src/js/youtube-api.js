let ytPlayer;
let lastVideoUrl = ''; // Para armazenar o último vídeo

// Função chamada pela API do YouTube quando a biblioteca é carregada
function onYouTubeIframeAPIReady() {
    console.log('YouTube API carregada!');
}

// Função para abrir o player
function openYouTubePlayer(videoUrl) {
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) return alert('ID de vídeo inválido.');

  lastVideoUrl = videoUrl; // Guarda a URL do vídeo para fallback

  const modal = document.getElementById('youtube-modal');
  const modalPlayer = document.getElementById('youtube-player');

    // Exibe o modal ao remover a classe d-none   
    document.getElementById('youtube-overlay').classList.remove('d-none');
    document.getElementById('audio-warning').classList.remove('d-none');
    modal.classList.remove('d-none');

  // Vamos forçar a exibição do botão de fechar enquanto o player carrega
  document.querySelector('.close-btn').style.display = 'block';

  // Se o ytPlayer foi destruído ou não existe, cria novamente
  if (!ytPlayer) {
      ytPlayer = new YT.Player(modalPlayer, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
              autoplay: 1,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              mute: 1
          },
          events: {
              onReady: () => {
                  console.log('Player do YouTube pronto!');
                  ytPlayer.playVideo();
              },
              onError: (error) => {
                  console.error('Erro ao carregar o vídeo', error);
                  // Em caso de erro, podemos redirecionar o usuário
                  window.open(lastVideoUrl, '_blank');
                  closeYouTubePlayer();
              }
          }
      });
  } else {
      ytPlayer.loadVideoById(videoId); // Carrega o vídeo se o player já estiver ativo
      ytPlayer.playVideo();
  }
}

function enableAudio() {
    if (player) {
      player.unMute();
      audioEnabled = true;
    }
    document.getElementById('audio-warning').classList.add('d-none');
  }
  
  function dismissAudioWarning() {
    document.getElementById('audio-warning').classList.add('d-none');
 }
  
// Função para fechar o player
function closeYouTubePlayer() {
      if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
        ytPlayer.stopVideo(); // Para o vídeo
        ytPlayer.clearVideo(); // Limpa o vídeo do player
    }

    // Esconde o modal novamente adicionando a classe d-none
    document.getElementById('youtube-overlay').classList.add('d-none');
    document.getElementById('youtube-modal').classList.add('d-none');
    document.querySelector('.close-btn').style.display = 'none'; // Esconde o botão de fechar

    // Limpa o conteúdo do player (se necessário)
    if (ytPlayer) {
        ytPlayer.destroy();  // Destrói o player se necessário para reiniciar a próxima vez
        ytPlayer = null; // Redefine o ytPlayer
    }
}

// Função para obter o ID do vídeo a partir da URL
function getYouTubeVideoId(url) {
    const match = url.match(/[?&]v=([^&#]+)/);
    return match ? match[1] : null;
}
