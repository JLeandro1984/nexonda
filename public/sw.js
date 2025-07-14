const CACHE_NAME = 'nexonda-v1.0.0';
const STATIC_CACHE = 'nexonda-static-v1.0.0';
const DYNAMIC_CACHE = 'nexonda-dynamic-v1.0.0';

// Arquivos essenciais para cache estático
const STATIC_FILES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/video-modal.css',
  '/css/advertising.css',
  '/css/chatbot.css',
  '/css/footer.css',
  '/js/main.js',
  '/js/screen-brand.js',
  '/js/click-tracker.js',
  '/js/youtube-api.js',
  '/js/advertising.js',
  '/js/chatbot.js',
  '/js/load-footer.js',
  '/js/i18nHelper.js',
  '/js/lang.js',
  '/js/utils.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/admin.js',
  '/js/manage-advertising.js',
  '/js/manage-logos.js',
  '/js/categories.js',
  '/js/authorized-users.js',
  '/js/firebase-upload.js',
  '/js/ufs.js',
  '/components/user-menu.js',
  '/components/user-menu.css',
  '/components/alert.css',
  '/components/alert.js',
  '/images/nexonda/logo_nexonda.svg',
  '/images/nexonda/favicon.ico',
  '/images/nexonda/favicon-32x32.png',
  '/images/nexonda/favicon-16x16.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/lang/pt-BR.json',
  '/lang/en-US.json',
  '/lang/es-MX.json',
  '/pages/login.html',
  '/pages/admin.html',
  '/pages/admin/admin.html',
  '/pages/admin/users.html',
  '/pages/admin/initialize.html',
  '/pages/manage-logos.html',
  '/pages/contact-form.html',
  '/pages/privacy-policy.html',
  '/pages/authorized-users.html',
  '/pages/auth-callback.html'
];

// Recursos externos para cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.2/color-thief.umd.js',
  'https://www.youtube.com/iframe_api'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Cacheando arquivos estáticos');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Cache estático criado com sucesso');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erro ao cachear arquivos estáticos:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker ativado');
        return self.clients.claim();
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Estratégia para arquivos estáticos: Cache First
  if (STATIC_FILES.includes(url.pathname) || 
      STATIC_FILES.includes(url.pathname + url.search)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return fetchResponse;
            });
        })
    );
    return;
  }
  
  // Estratégia para recursos externos: Network First com fallback
  if (EXTERNAL_RESOURCES.some(resource => request.url.includes(resource))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Estratégia para imagens: Cache First com fallback
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((fetchResponse) => {
              if (fetchResponse.status === 200) {
                const responseClone = fetchResponse.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return fetchResponse;
            })
            .catch(() => {
              // Retorna uma imagem placeholder se não conseguir carregar
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#999" font-family="Arial" font-size="14">Imagem não disponível</text></svg>',
                {
                  headers: { 'Content-Type': 'image/svg+xml' }
                }
              );
            });
        })
    );
    return;
  }
  
  // Estratégia padrão: Network First com fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then((response) => {
            if (response) {
              return response;
            }
            
            // Fallback para páginas HTML
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            return new Response('Recurso não disponível offline', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});

// Limpeza periódica do cache dinâmico
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.keys()
            .then((requests) => {
              const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
              const oldRequests = requests.filter((request) => {
                return request.headers.get('date') && 
                       new Date(request.headers.get('date')).getTime() < oneWeekAgo;
              });
              
              return Promise.all(
                oldRequests.map((request) => cache.delete(request))
              );
            });
        })
    );
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui você pode adicionar lógica de sincronização
      console.log('[SW] Sincronização em background executada')
    );
  }
});

// Notificações push (preparado para futuras implementações)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver mais',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}); 