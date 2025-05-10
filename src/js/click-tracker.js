(function () {
  const STORAGE_KEY = 'click_events';
  const ENDPOINT = '/api/log-click';
  const MAX_EVENTS = 20;
  const TTL_MS = 5 * 60 * 1000; // 5 minutos

  // Elementos que queremos rastrear
  const SELECTORS_TO_TRACK = 'button, a, .logo-item, .logo-item-wrapper, .language-option, video, img';
  
  // Elementos que NÃO devem ser rastreados
  const EXCLUDE_SELECTOR = [
      '#language-button', 
      '#dark-mode-btn', 
      '.whatsapp-float',
      '#clear-location',
      '.close-btn'
  ].join(',');

  // Função principal
  function trackClick(event) {
      const target = event.target.closest(SELECTORS_TO_TRACK);
      if (!target || target.matches(EXCLUDE_SELECTOR)) return;

      const dataAttrs = {};
      Array.from(target.attributes).forEach(attr => {
          if (attr.name.startsWith('data-')) {
              dataAttrs[attr.name] = attr.value;
          }
      });

      const clickEvent = {
          elementId: target.id || null,
          elementType: target.tagName.toLowerCase(),
          timestamp: new Date().toISOString(),
          ...dataAttrs
      };

      saveEvent(clickEvent);
    maybeFlushEvents();
    
    console.log("Foi clicado:", clickEvent);
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
          console.log("Nenhum evento para enviar.");
          return;
      }

      console.log("Eventos capturados (até 20 ou 5 minutos):", events);

      // Descomente para enviar realmente para o endpoint
      /*
      fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
      }).then(res => {
          if (res.ok) {
              clearStoredEvents();
              console.log("Eventos enviados com sucesso!");
          }
      }).catch(error => {
          console.warn("Falha ao enviar logs:", error);
      });
      */
      
      // Para teste, limpa os eventos após mostrar no console
      // clearStoredEvents();
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