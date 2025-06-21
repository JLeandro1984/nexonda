(function () {
  const STORAGE_KEY = 'click_events';
  const ENDPOINT = '/api/logInsight';
  const MAX_EVENTS = 10;
  const TTL_MS = 2 * 60 * 1000; // 2 minutos

  // Elementos que queremos rastrear
  const SELECTORS_TO_TRACK = 'button, a, .logo-card-wrapper, .logo-item, .logo-item-wrapper, .language-option, .info-icon, video, img';
  
  // Elementos que NÃO devem ser rastreados
  const EXCLUDE_SELECTOR = [
      '#language-button', 
      '#dark-mode-btn', 
      '.whatsapp-float',
      '#clear-location',
      '.close-btn',
      '.carousel-control' // Ignorar controles de carrossel
  ].join(',');

  // Função principal
  function trackClick(event) {
      const target = event.target.closest(SELECTORS_TO_TRACK);
      if (!target || target.matches(EXCLUDE_SELECTOR)) return;

      let details = {};
      const logoData = target.closest('[data-logo]')?.dataset.logo;
      const adData = target.closest('[data-ad-details]')?.dataset.adDetails;
      const logoWrapper = target.closest('.logo-card-wrapper');
      const cnpj = logoWrapper?.dataset.cnpj;

      try {
        if (logoData) {
          details = JSON.parse(decodeURIComponent(logoData));
        } else if (adData) {
          details = JSON.parse(decodeURIComponent(adData));
          // Se for um anúncio, também dispara o evento de clique para o contador
          if (details.id) {
            fetch('/track-ad-event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ adId: details.id, eventType: 'click' })
            }).catch(error => console.error('Falha ao registrar clique do anúncio:', error));
          }
        }
      } catch (e) {
        console.warn('Erro ao decodificar data attribute', e);
      }
      
      const clientName = target.closest('.logo-card-wrapper, .premium-ad-item')?.querySelector('.company-name, h3')?.textContent;
      
      let city = null;
      try {
        const storedLocation = localStorage.getItem('userLocation');
        if (storedLocation) {
          city = JSON.parse(storedLocation);
        }
      } catch (e) {
        console.error('Erro ao processar a localização do localStorage:', e);
        // Opcional: limpar dado inválido
        // localStorage.removeItem('userLocation');
      }

      const clickEvent = {
          elementId: target.id || null,
          elementClasses: target.className || null,
          elementType: target.tagName.toLowerCase(),
          clientName: clientName || details.clientFantasyName || details.clientName || details.title,
          clientCNPJ: cnpj || details.clientCNPJ || null,
          city: city,
          timestamp: new Date().toISOString(),
          details: details // Envia o objeto completo para contexto
      };
      
      saveEvent(clickEvent);
      maybeFlushEvents();
  }

  function saveEvent(event) {
      let events = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      events.push(event);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function getStoredEvents() {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }

  function clearStoredEvents() {
      localStorage.removeItem(STORAGE_KEY);
  }

  // Função modificada para ser acessível globalmente
  window.flushClicks = function() {
      const events = getStoredEvents();
      if (events.length === 0) {
          return;
      }

      console.log("Enviando eventos de clique:", events);
      
      // Envia cada evento como uma requisição separada
      events.forEach(eventData => {
        // Remove o objeto de detalhes aninhado antes de enviar, se for muito grande
        const payloadToSend = { ...eventData };
        if (payloadToSend.details) {
          delete payloadToSend.details;
        }

        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'click', payload: payloadToSend })
        }).then(res => {
            if (res.ok) {
                console.log("Evento de clique enviado com sucesso!");
            } else {
              console.warn("Falha ao enviar evento de clique, resposta do servidor não foi OK.");
            }
        }).catch(error => {
            console.warn("Falha ao enviar logs de clique:", error);
        });
      });
      
      // Limpa os eventos após a tentativa de envio
      clearStoredEvents();
  };

  function maybeFlushEvents() {
      const events = getStoredEvents();
      if (events.length >= MAX_EVENTS) {
          window.flushClicks();
      } else {
          checkTTL();
      }
  }

  function checkTTL() {
      const events = getStoredEvents();
      if (events.length === 0) return;

      const firstTimestamp = new Date(events[0].timestamp).getTime();
      const now = Date.now();

      if (now - firstTimestamp > TTL_MS) {
          window.flushClicks();
      }
  }

  function setupPeriodicFlush() {
      setInterval(window.flushClicks, TTL_MS); // Garantia adicional
  }

  function init() {
      document.addEventListener('click', trackClick, true);
      window.addEventListener('beforeunload', window.flushClicks);
      setupPeriodicFlush();
  }

  init();
})();