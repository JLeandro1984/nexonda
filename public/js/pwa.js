// PWA Service Worker Registration
class PWA {
  constructor() {
    this.swRegistration = null;
    this.updateAvailable = false;
    this.init();
  }

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        await this.registerServiceWorker();
        this.setupUpdateListener();
        this.checkForUpdates();
      } catch (error) {
        console.error('Erro ao registrar service worker:', error);
      }
    } else {
      console.log('Service Worker não suportado neste navegador');
    }
  }

  async registerServiceWorker() {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registrado com sucesso:', this.swRegistration);

      // Aguarda o service worker estar ativo
      if (this.swRegistration.installing) {
        console.log('Service Worker instalando...');
        this.swRegistration.installing.addEventListener('statechange', (e) => {
          if (e.target.state === 'installed') {
            console.log('Service Worker instalado');
          }
        });
      } else if (this.swRegistration.waiting) {
        console.log('Service Worker aguardando...');
      } else if (this.swRegistration.active) {
        console.log('Service Worker ativo');
      }

      // Listener para mudanças de estado
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('Nova versão do Service Worker encontrada');
        this.updateAvailable = true;
        this.showUpdateNotification();
      });

    } catch (error) {
      console.error('Falha ao registrar Service Worker:', error);
      throw error;
    }
  }

  setupUpdateListener() {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controlador mudou');
      // Recarrega a página para aplicar a nova versão
      window.location.reload();
    });
  }

  checkForUpdates() {
    // Verifica por atualizações a cada hora
    setInterval(() => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    }, 60 * 60 * 1000); // 1 hora
  }

  showUpdateNotification() {
    // Cria notificação de atualização disponível
    const updateNotification = document.createElement('div');
    updateNotification.id = 'pwa-update-notification';
    updateNotification.innerHTML = `
      <div class="pwa-update-banner">
        <div class="pwa-update-content">
          <i class="fas fa-download"></i>
          <span>Nova versão disponível!</span>
        </div>
        <div class="pwa-update-actions">
          <button class="btn btn-primary btn-sm" onclick="pwa.updateApp()">
            Atualizar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="pwa.dismissUpdate()">
            Depois
          </button>
        </div>
      </div>
    `;

    // Adiciona estilos
    const style = document.createElement('style');
    style.textContent = `
      .pwa-update-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideDown 0.3s ease-out;
      }
      
      .pwa-update-content {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
      }
      
      .pwa-update-actions {
        display: flex;
        gap: 10px;
      }
      
      .pwa-update-actions .btn {
        padding: 6px 12px;
        font-size: 14px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .pwa-update-actions .btn-primary {
        background: rgba(255,255,255,0.2);
        color: white;
      }
      
      .pwa-update-actions .btn-primary:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .pwa-update-actions .btn-secondary {
        background: rgba(255,255,255,0.1);
        color: white;
      }
      
      .pwa-update-actions .btn-secondary:hover {
        background: rgba(255,255,255,0.2);
      }
      
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }
      
      @media (max-width: 768px) {
        .pwa-update-banner {
          flex-direction: column;
          gap: 10px;
          padding: 15px 20px;
        }
        
        .pwa-update-actions {
          width: 100%;
          justify-content: center;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(updateNotification);
  }

  updateApp() {
    if (this.swRegistration && this.swRegistration.waiting) {
      // Envia mensagem para o service worker para pular a espera
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  dismissUpdate() {
    const notification = document.getElementById('pwa-update-notification');
    if (notification) {
      notification.remove();
    }
  }

  // Verifica se o app está instalado
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Mostra prompt de instalação
  showInstallPrompt() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('Usuário aceitou a instalação');
        } else {
          console.log('Usuário rejeitou a instalação');
        }
        this.deferredPrompt = null;
      });
    }
  }

  // Configura listener para prompt de instalação
  setupInstallListener() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Mostra botão de instalação se não estiver instalado
      if (!this.isInstalled()) {
        this.showInstallButton();
      }
    });

    // Listener para quando o app é instalado
    window.addEventListener('appinstalled', () => {
      console.log('App instalado com sucesso');
      this.hideInstallButton();
    });
  }

  showInstallButton() {
    // Cria botão de instalação se não existir
    if (!document.getElementById('pwa-install-btn')) {
      const installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-btn';
      installBtn.innerHTML = `
        <i class="fas fa-download"></i>
        <span>Instalar App</span>
      `;
      installBtn.onclick = () => this.showInstallPrompt();

      // Adiciona estilos
      const style = document.createElement('style');
      style.textContent = `
        .pwa-install-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
          border: none;
          border-radius: 50px;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,123,255,0.3);
          z-index: 1000;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        
        .pwa-install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,123,255,0.4);
        }
        
        .pwa-install-btn i {
          font-size: 16px;
        }
        
        @media (max-width: 768px) {
          .pwa-install-btn {
            bottom: 80px;
            right: 15px;
            padding: 10px 16px;
            font-size: 14px;
          }
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(installBtn);
    }
  }

  hideInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.remove();
    }
  }

  // Limpa cache antigo
  cleanOldCache() {
    if (this.swRegistration && this.swRegistration.active) {
      this.swRegistration.active.postMessage({ type: 'CLEAN_CACHE' });
    }
  }
}

// Inicializa PWA quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.pwa = new PWA();
  
  // Configura listener de instalação após um pequeno delay
  setTimeout(() => {
    window.pwa.setupInstallListener();
  }, 1000);
});

// Exporta para uso global
window.PWA = PWA; 