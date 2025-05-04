// admin-ads.js - Sistema completo de gerenciamento de propagandas premium

document.addEventListener('DOMContentLoaded', () => {
  // Constantes
  const STORAGE_KEY = 'logoGalleryData';
  const ADS_STORAGE_KEY = 'premiumAdsData';
  
  // Elementos do DOM
  const adForm = document.getElementById('ad-form');
  const adSearchInput = document.getElementById('ad-search-input');
  const adFilterStatus = document.getElementById('ad-filter-status');
  const clientSelect = document.getElementById('ad-client');

  // Inicialização
  initStorage();
  loadPremiumClients();
  setupDateInputs();
  renderAdsList();

  // Event Listeners
  if (adForm) adForm.addEventListener('submit', handleAdSubmit);
  if (adSearchInput) adSearchInput.addEventListener('input', renderAdsList);
  if (adFilterStatus) adFilterStatus.addEventListener('change', renderAdsList);

  // Função para inicializar o storage se necessário
  function initStorage() {
      if (!localStorage.getItem(ADS_STORAGE_KEY)) {
          localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify([]));
      }
  }

  // Função para carregar clientes 'premium-plus'
  function loadPremiumClients() {
      if (!clientSelect) {
          console.error('Elemento ad-client não encontrado');
          return;
      }
      debugger
      clientSelect.innerHTML = '<option value="">Selecione um cliente premium plus</option>';
      
      const logos = loadLogosFromStorage();
      if (!logos || !Array.isArray(logos)) {
          console.error('Dados de logos inválidos');
          return;
      }
      
      const premiumClients = logos.filter(logo => {
          const isPremium = logo.planType && String(logo.planType).toLowerCase() === 'premium-plus';
          const isActive = isContractActive(logo);
          return isPremium && isActive;
      });
      
      if (premiumClients.length === 0) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'Nenhum cliente premium disponível';
          clientSelect.appendChild(option);
          return;
      }
      
      premiumClients.sort((a, b) => a.clientName.localeCompare(b.clientName));
      
      premiumClients.forEach(client => {
          const option = document.createElement('option');
          option.value = client.clientCNPJ;
          
          let displayText = client.clientName;
          if (client.clientFantasyName) {
              displayText = `${client.clientFantasyName} (${client.clientName})`;
          }
          
          if (client.clientCity && client.clientUf) {
              displayText += ` - ${client.clientCity}/${client.clientUf}`;
          }
          
          option.textContent = displayText;
          option.title = `CNPJ: ${formatCNPJ(client.clientCNPJ)} | Plano: ${client.planType}`;
          clientSelect.appendChild(option);
      });
  }

  // Função para carregar logos do localStorage
  function loadLogosFromStorage() {
      const storedData = localStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
  }

  // Função para verificar contrato ativo
  function isContractActive(logo) {
      if (logo.contractActive === false) return false;
      if (!logo.endDate) return true;
      
      try {
          const endDate = new Date(logo.endDate);
          const today = new Date();
          endDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          return endDate >= today;
      } catch (e) {
          console.error('Erro ao verificar data do contrato:', e);
          return true;
      }
  }

  // Função para formatar CNPJ
  function formatCNPJ(cnpj) {
      if (!cnpj) return 'Não informado';
      const cleaned = cnpj.toString().replace(/\D/g, '');
      if (cleaned.length !== 14) return cnpj;
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // Função para configurar inputs de data
  function setupDateInputs() {
      const today = new Date().toISOString().split('T')[0];
      const startDateInput = document.getElementById('ad-start');
      const endDateInput = document.getElementById('ad-end');
      
      if (!startDateInput || !endDateInput) return;
      
      startDateInput.min = today;
      endDateInput.min = today;
      
      startDateInput.addEventListener('change', function() {
          endDateInput.min = this.value;
          if (endDateInput.value && endDateInput.value < this.value) {
              endDateInput.value = this.value;
          }
      });
  }

  // Função principal para enviar formulário
  function handleAdSubmit(e) {
      e.preventDefault();
      
      const formData = getFormData();
      if (!validateFormData(formData)) return;
      
      const client = getClientData(formData.clientCNPJ);
      if (!client) return;
      
      const newAd = createAdObject(formData, client);
      savePremiumAd(newAd);
      
      showAlert('Propaganda cadastrada com sucesso!');
      if (adForm) adForm.reset();
      renderAdsList();
  }

  // Função para obter dados do formulário
  function getFormData() {
      return {
          title: document.getElementById('ad-title')?.value.trim() || '',
          description: document.getElementById('ad-description')?.value.trim() || '',
          mediaType: document.getElementById('ad-type')?.value || '',
          mediaUrl: document.getElementById('ad-media')?.value.trim() || '',
          targetUrl: document.getElementById('ad-link')?.value.trim() || '',
          clientCNPJ: document.getElementById('ad-client')?.value || '',
          startDate: document.getElementById('ad-start')?.value || '',
          endDate: document.getElementById('ad-end')?.value || ''
      };
  }

  // Função para validar dados do formulário
  function validateFormData(formData) {
      // Verifica campos obrigatórios
      const requiredFields = ['title', 'description', 'mediaType', 'mediaUrl', 'targetUrl', 'clientCNPJ', 'startDate', 'endDate'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
          showAlert('Preencha todos os campos obrigatórios', 'Atenção');
          return false;
      }
      
      // Valida mídia
      const mediaError = validateMedia(formData.mediaType, formData.mediaUrl);
      if (mediaError) {
          showAlert(mediaError, 'Mídia inválida');
          return false;
      }
      
      // Valida datas
      if (!validateAdDates(formData.startDate, formData.endDate)) {
          return false;
      }
      
      // Valida URL de destino
      if (!isValidUrl(formData.targetUrl)) {
          showAlert('O link de destino deve ser uma URL válida (começando com http:// ou https://)', 'URL inválida');
          return false;
      }
      
      return true;
  }

  // Função para validar mídia
  function validateMedia(mediaType, mediaUrl) {
      if (!isValidUrl(mediaUrl)) {
          return "URL inválida. Deve começar com http:// ou https://";
      }
      
      if (mediaType === 'image') {
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
          const extension = mediaUrl.substring(mediaUrl.lastIndexOf('.')).toLowerCase();
          if (!imageExtensions.includes(extension)) {
              return "A URL deve ser de uma imagem (JPG, PNG, GIF, WebP ou SVG)";
          }
      } else if (mediaType === 'video') {
          if (!mediaUrl.includes('youtube.com') && !mediaUrl.includes('youtu.be') && !mediaUrl.endsWith('.mp4')) {
              return "Para vídeos, use um link do YouTube ou um arquivo MP4";
          }
      }
      
      return null;
  }

  // Função para validar datas
  function validateAdDates(startDate, endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
          showAlert("A data de início não pode ser posterior à data de término", "Datas inválidas");
          return false;
      }
      
      if (end < today) {
          showAlert("A data de término não pode ser anterior à data atual", "Data expirada");
          return false;
      }
      
      return true;
  }

  // Função para obter dados do cliente
  function getClientData(clientCNPJ) {
      const logos = loadLogosFromStorage();
      const client = logos.find(logo => logo.clientCNPJ === clientCNPJ);
      
      if (!client) {
          showAlert('Cliente não encontrado', 'Erro');
          return null;
      }
      
      return client;
  }

  // Função para criar objeto de propaganda
  function createAdObject(formData, client) {
      return {
          id: Date.now().toString(),
          title: formData.title,
          description: formData.description,
          mediaType: formData.mediaType,
          mediaUrl: formData.mediaUrl,
          targetUrl: formData.targetUrl,
          clientId: formData.clientCNPJ,
          clientName: client.clientName,
          clientLogo: client.imagem,
          startDate: formData.startDate,
          endDate: formData.endDate,
          adType: 'premium',
          isActive: true,
          createdAt: new Date().toISOString(),
          clicks: 0,
          impressions: 0
      };
  }

  // Função para salvar propaganda
  function savePremiumAd(adData) {
     const existingAds = JSON.parse(localStorage.getItem(ADS_STORAGE_KEY) || '[]');
      existingAds.push(adData);
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(existingAds));
  }

  // Função para renderizar lista de propagandas
  // Função para carregar e exibir propagandas cadastradas
function renderAdsList() {
  const adsList = document.getElementById('premium-ads-list');
  if (!adsList) return;
  
  const searchTerm = document.getElementById('ad-search-input')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('ad-filter-status')?.value || 'all';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const ads = JSON.parse(localStorage.getItem('premiumAdsData') || '[]');
  
  const filteredAds = ads.filter(ad => {
    // Filtro por termo de busca
    const matchesSearch = 
      ad.title.toLowerCase().includes(searchTerm) ||
      ad.description.toLowerCase().includes(searchTerm) ||
      ad.clientName.toLowerCase().includes(searchTerm);
    
    // Filtro por status
    const startDate = new Date(ad.startDate);
    const endDate = new Date(ad.endDate);
    
    let matchesStatus = true;
    switch(statusFilter) {
      case 'active':
        matchesStatus = startDate <= today && endDate >= today && ad.isActive;
        break;
      case 'inactive':
        matchesStatus = !ad.isActive;
        break;
      case 'upcoming':
        matchesStatus = startDate > today;
        break;
      case 'expired':
        matchesStatus = endDate < today;
        break;
      case 'all':
      default:
        matchesStatus = true;
    }
    
    return matchesSearch && matchesStatus;
  });
  
  // Ordena por data de início (mais recentes primeiro)
  filteredAds.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  
  adsList.innerHTML = '';
  
  if (filteredAds.length === 0) {
    adsList.innerHTML = '<div class="no-ads">Nenhuma propaganda encontrada</div>';
    return;
  }
  
  filteredAds.forEach(ad => {
    const adCard = createAdCard(ad, today);
    adsList.appendChild(adCard);
  });
  
  setupAdButtons();
}

  // Função para criar card de propaganda
  function createAdCard(ad, today) {
    const adCard = document.createElement('div');
    adCard.className = 'premium-ad-card';
    adCard.dataset.id = ad.id;
    
    const statusInfo = getAdStatusInfo(ad, today);
    const formattedStartDate = formatDate(ad.startDate);
    const formattedEndDate = formatDate(ad.endDate);
    
    adCard.innerHTML = `
      <div class="ad-media">
        ${createMediaContent(ad)}
        <div class="ad-status ${statusInfo.class}">${statusInfo.text}</div>
      </div>
      <div class="ad-info">
        <h3>${ad.title}</h3>
        <p class="ad-description">${ad.description}</p>
        
        <div class="ad-meta">
          <div class="client-info">
            <img src="${ad.clientLogo || '../images/default-logo.png'}" alt="${ad.clientName}" class="client-logo">
            <span>${ad.clientName}</span>
          </div>
          
          <div class="ad-dates">
            <span><i class="fas fa-calendar-alt"></i> ${formattedStartDate} - ${formattedEndDate}</span>
          </div>
        </div>
        
        <div class="ad-actions">
          <button class="edit-btn" data-id="${ad.id}">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="toggle-btn" data-id="${ad.id}" data-active="${ad.isActive}">
            ${ad.isActive ? '<i class="fas fa-pause"></i> Pausar' : '<i class="fas fa-play"></i> Ativar'}
          </button>
          <button class="delete-btn" data-id="${ad.id}">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </div>
      </div>
    `;
    
    return adCard;
  }

 // Funções auxiliares
function getAdStatusInfo(ad, today) {
  const startDate = new Date(ad.startDate);
  const endDate = new Date(ad.endDate);
  
  if (!ad.isActive) return { text: 'Inativa', class: 'inactive' };
  if (startDate > today) return { text: 'Futura', class: 'upcoming' };
  if (endDate < today) return { text: 'Expirada', class: 'expired' };
  return { text: 'Ativa', class: 'active' };
}

  // Função para formatar data
  function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  }

  // Função para criar conteúdo de mídia
  function createMediaContent(ad) {
    if (ad.mediaType === 'image') {
      return `<img src="${ad.mediaUrl}" alt="${ad.title}" loading="lazy">`;
    } else if (ad.mediaType === 'video') {
      if (ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) {
        const videoId = getYouTubeVideoId(ad.mediaUrl);
        return `<img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${ad.title}">`;
      } else if (ad.mediaUrl.endsWith('.mp4')) {
        return `<video src="${ad.mediaUrl}" alt="${ad.title}" muted autoplay loop playsinline preload="metadata" style="max-width: 100%; border-radius: 8px;"></video>`;
      }
      return '<div class="video-icon"><i class="fas fa-video"></i></div>';
    }
    return '';
  }
     
  // Função para configurar botões das propagandas
  function setupAdButtons() {
      document.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', () => editAd(btn.dataset.id));
      });
      
      document.querySelectorAll('.toggle-btn').forEach(btn => {
          btn.addEventListener('click', () => toggleAdStatus(btn.dataset.id));
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', () => confirmDeleteAd(btn.dataset.id));
      });
  }

  // Função para editar propaganda
  function editAd(adId) {
      const ads = JSON.parse(localStorage.getItem(ADS_STORAGE_KEY) || '[]');
      const adIndex = ads.findIndex(ad => ad.id === adId);
      
      if (adIndex === -1) {
          showAlert('Propaganda não encontrada', 'Erro');
          return;
      }
      
      const ad = ads[adIndex];
      fillAdForm(ad);
      
      ads.splice(adIndex, 1);
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
      renderAdsList();
  }

  // Função para preencher formulário
  function fillAdForm(ad) {
      document.getElementById('ad-title').value = ad.title;
      document.getElementById('ad-description').value = ad.description;
      document.getElementById('ad-type').value = ad.mediaType;
      document.getElementById('ad-media').value = ad.mediaUrl;
      document.getElementById('ad-link').value = ad.targetUrl;
      document.getElementById('ad-client').value = ad.clientId;
      document.getElementById('ad-start').value = ad.startDate;
      document.getElementById('ad-end').value = ad.endDate;
      
      document.querySelector('#ad-form').scrollIntoView({ behavior: 'smooth' });
  }

  // Função para alternar status
  function toggleAdStatus(adId) {
      const ads = JSON.parse(localStorage.getItem(ADS_STORAGE_KEY) || []);
      const adIndex = ads.findIndex(ad => ad.id === adId);
      
      if (adIndex === -1) {
          showAlert('Propaganda não encontrada', 'Erro');
          return;
      }
      
      ads[adIndex].isActive = !ads[adIndex].isActive;
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
      
      showAlert(
          `Propaganda ${ads[adIndex].isActive ? 'ativada' : 'pausada'} com sucesso`,
          'Status alterado'
      );
      
      renderAdsList();
  }

  // Função para confirmar exclusão
  function confirmDeleteAd(adId) {
      const ads = JSON.parse(localStorage.getItem(ADS_STORAGE_KEY) || []);
      const adIndex = ads.findIndex(ad => ad.id === adId);
      
      if (adIndex === -1) {
          showAlert('Propaganda não encontrada', 'Erro');
          return;
      }
      
      const ad = ads[adIndex];
      const modal = document.getElementById('delete-modal');
      const message = modal.querySelector('p');
      
      message.innerHTML = `
          Tem certeza que deseja excluir a propaganda <strong>"${ad.title}"</strong>?
          <br><br>
          Cliente: ${ad.clientName}<br>
          Período: ${formatDate(ad.startDate)} a ${formatDate(ad.endDate)}
      `;
      
      modal.classList.remove('hidden');
      
      document.getElementById('confirm-delete').onclick = function() {
          ads.splice(adIndex, 1);
          localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
          showAlert('Propaganda excluída com sucesso', 'Sucesso');
          modal.classList.add('hidden');
          renderAdsList();
      };
      
      document.getElementById('cancel-delete').onclick = function() {
          modal.classList.add('hidden');
      };
  }

  // Função para mostrar alertas
  function showAlert(message, title = 'Atenção') {
      const alertBox = document.getElementById('custom-alert');
      const alertTitle = document.getElementById('alert-title');
      const alertMessage = document.getElementById('alert-message');
      
      if (!alertBox || !alertTitle || !alertMessage) return;
      
      alertTitle.textContent = title;
      alertMessage.innerHTML = message;
      alertBox.classList.remove('hidden');
      
      document.getElementById('close-alert-btn').onclick = function() {
          alertBox.classList.add('hidden');
      };
  }

  // Função para validar URL
  function isValidUrl(url) {
      try {
          new URL(url);
          return true;
      } catch (e) {
          return false;
      }
  }

  function getYouTubeVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : '';
  }

  
  // Função para obter o ID do vídeo a partir da URL
// function getYouTubeVideoId(url) {
//   try {
//     const urlObj = new URL(url);
//     const hostname = urlObj.hostname;

//     if (hostname.includes("youtu.be")) {
//       // Formato: youtu.be/VIDEO_ID
//       return urlObj.pathname.slice(1);
//     }

//     if (hostname.includes("youtube.com")) {
//       // Formato: youtube.com/watch?v=VIDEO_ID
//       return urlObj.searchParams.get("v");
//     }

//     return null;
//   } catch (e) {
//     return null; // URL inválida
//   }
// }
});