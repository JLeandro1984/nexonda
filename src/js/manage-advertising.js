import { premiumAdsApi, logosApi } from './api.js';
import { showAlert } from '../components/alert.js';

// Elementos DOM
const adForm = document.getElementById("ad-form");
const adsGrid = document.getElementById("premium-ads-list");
//const searchInput = document.getElementById("search-input");
const adSearchInput = document.getElementById('ad-search-input');
const adFilterStatus = document.getElementById('ad-filter-status');
const adImageInput = document.getElementById("ad-image");
const adImageUrl = document.getElementById("ad-image-url");
const clientSelect = document.getElementById('ad-client');

let editingIndex = null;
let ads = [];

// Inicializa a aplicação
async function init() {
    try {

        // Verifica se os elementos necessários existem
        if (!adForm || !adsGrid) {
            console.error('Elementos necessários não encontrados:', {
                adForm: !!adForm,
                adsGrid: !!adsGrid
            });
            return;
        }
        
        try {

            const response = await premiumAdsApi.getAll();
            console.log('Resposta recebida da API:', response);
            
            // Garante que ads seja um array
            ads = Array.isArray(response) ? response : [];            
            // if (ads.length > 0) {
            //     renderAds(ads);
          // }
          
            renderAds();
            populateClientSelect();
            
        } catch (error) {
            console.error('Erro ao carregar propagandas:', error);
            showAlert('Erro ao carregar anúncios. Por favor, tente novamente.', 'error');
        }      
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showAlert('Erro ao inicializar a aplicação. Por favor, recarregue a página.', 'error');
    }
}
  
async function loadClientsFromFirestore() {
    try {
      const allLogos = await logosApi.getAll(); // Supondo que retorna um array de objetos
  
      // Filtra apenas os com plano "premium-plus" e contrato ativo
      const clients = allLogos
        /*.filter(logo => logo.planType === 'premium-plus')   - permitir cadastrar outros planos*/
        .filter(logo => isContractActive(logo))
        .map(logo => ({
          id: logo.id, // supondo que logo.id exista no objeto
          ...logo
        }));
  
      return clients;
    } catch (error) {
      console.error("Erro ao carregar clientes do Firestore:", error);
      return [];
    }
  }
  
  function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  function isContractActive(client) {
    const endDate = new Date(client.endDate);
    const now = new Date();
    return endDate >= now && client.contractActive;
  }

  async function populateClientSelect() {
    const clients = await loadClientsFromFirestore();

    if (!clientSelect) return;

    clientSelect.innerHTML = '<option value="">Selecione um cliente</option>';

    const activeClients = clients.filter(client => isContractActive(client));
    activeClients.sort((a, b) => a.clientName.localeCompare(b.clientName));

    activeClients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.clientCNPJ;
      option.textContent = `${client.clientName} (${client.clientFantasyName || ''})`;
      option.title = `CNPJ: ${formatCNPJ(client.clientCNPJ)} | Plano: ${client.planType}`;
      clientSelect.appendChild(option);
    });
      
      // Ative o Select2 no select
        $('#ad-client').select2({
        placeholder: "Selecione um cliente",
        allowClear: true,
        width: '100%'
        });
  }

// Event Listeners
if (adForm) {
    adForm.addEventListener("submit", async (e) => {
        e.preventDefault();
      
        try {
            const formData = new FormData(adForm);

            const adData = {};
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
                 adData[key] = value;             
            }

            if (editingIndex) {
                await premiumAdsApi.update(editingIndex, adData);
                showAlert('Anúncio atualizado com sucesso!', 'success');
            } else {
                await premiumAdsApi.add(adData);
                showAlert('Anúncio adicionado com sucesso!', 'success');
            }

            // Recarrega a lista de anúncios
            ads = await premiumAdsApi.getAll();
            renderAds(ads);
            
            // Limpa o formulário
            adForm.reset();
            const preview = adForm.querySelector("#ad-preview");
            if (preview) preview.style.display = 'none';
            editingIndex = null;
            const saveBtn = adForm.querySelector('.save-btn');
            if (saveBtn) {
                saveBtn.textContent = 'Salvar';
                saveBtn.classList.remove('update');
            }
            
        } catch (error) {
            console.error("Erro ao salvar anúncio:", error);
            showAlert('Erro ao salvar anúncio. Por favor, tente novamente.', 'error');
        }
    });
}

// function toCamelCase(str) {
//   return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
// }

// Upload de imagem
if (adImageInput) {
    adImageInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const result = await premiumAdsApi.uploadImage(file);
            if (adImageUrl) adImageUrl.value = result.imageUrl;
        } catch (error) {
            showAlert('Erro ao fazer upload da imagem: ' + error.message, 'error');
        }
    });
}

// Funções globais para edição e exclusão
window.editAd = function(adId) {
    const ad = ads.find(a => a.id === adId);
    if (ad) {
        editingIndex = adId;
        loadAdForEdit(ad);
    }

      // Scroll suave para a div do formulário
        const formSection = document.querySelector('.admin-section');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
            // Se desejar, também pode dar foco no primeiro input do formulário:
    document.getElementById('ad-title')?.focus();
};
window.deleteAd = async function (adId) {
  const ad = ads.find(a => a.id === adId);
  const adTitle = ad ? ad.title : 'este anúncio';

  showConfirm(
    `Deseja realmente excluir "${adTitle}"? Esta ação não poderá ser desfeita.`,
    'Confirmar exclusão',
    'warning',
    async () => {
      try {
        await premiumAdsApi.delete(adId);
        ads = ads.filter(a => a.id !== adId);
        renderAds(ads);
        showAlert('Anúncio excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir anúncio:', error);
        showAlert('Erro ao excluir anúncio. Por favor, tente novamente.', 'error');
      }
    },
    () => {
      console.log('Exclusão cancelada pelo usuário.');
    }
  );
};

function renderAds() {
    const adsGrid = document.getElementById('premium-ads-list');
    if (!adsGrid) return;

    const searchTerm = (adSearchInput.value || '').toLowerCase();
    const statusFilter = adFilterStatus.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filtro - usando a variável 'ads' em vez de 'adsList'
    const filtered = ads.filter(ad => {
        const matchesSearch =
            ad.title.toLowerCase().includes(searchTerm) ||
            (ad.description && ad.description.toLowerCase().includes(searchTerm)) ||
            (ad.clientName && ad.clientName.toLowerCase().includes(searchTerm));

        const startDate = ad.startDate ? new Date(ad.startDate) : null;
        const endDate = ad.endDate ? new Date(ad.endDate) : null;

        if (!startDate || !endDate) return false;

        switch (statusFilter) {
            case 'active':
                return startDate <= today && endDate >= today && ad.isActive;
            case 'inactive':
                return !ad.isActive;
            case 'upcoming':
                return startDate > today;
            case 'expired':
                return endDate < today;
            default:
                return matchesSearch;
        }
    });

    // Renderização
    adsGrid.innerHTML = '';
    if (filtered.length === 0) {
        adsGrid.innerHTML = '<div class="no-ads">Nenhuma propaganda encontrada.</div>';
        return;
    }

    filtered.forEach(ad => {
        const card = createAdElement(ad); // Usando createAdElement em vez de createAdCard
        adsGrid.appendChild(card);
    });
}

function createAdElement(ad) {
    const div = document.createElement('div');
    div.className = 'premium-ad-card';
    
    // Determina o status do anúncio
    const now = new Date();
    const startDate = new Date(ad.startDate);
    const endDate = new Date(ad.endDate);
    let status = 'inactive';
    let statusText = 'Inativo';
    
    if (ad.isActive) {
        if (startDate > now) {
            status = 'upcoming';
            statusText = 'Futuro';
        } else if (endDate < now) {
            status = 'expired';
            statusText = 'Expirado';
        } else {
            status = 'active';
            statusText = 'Ativo';
        }
    }
    
    // Formata as datas
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    };
    
    let mediaContent = '';
    if (ad.mediaType === 'image') {
    mediaContent = `<img src="${ad.mediaUrl}" alt="${ad.title}" loading="lazy">`;
    } else if (ad.mediaType === 'video') {
    if (ad.mediaUrl.includes('youtube.com') || ad.mediaUrl.includes('youtu.be')) {
        const videoId = getYouTubeVideoId(ad.mediaUrl);
        mediaContent = `
        <div class="youtube-video-container" onclick="openYouTubePlayer('${ad.mediaUrl}')">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${ad.title}">
            <div class="play-overlay">
            <i class="fas fa-play"></i>
            </div>
        </div>
        `;
    } else {
        mediaContent = `
        <video width="100%" height="180" controls>
            <source src="${ad.mediaUrl}" type="video/mp4">
            Seu navegador não suporta vídeos HTML5.
        </video>
        `;
    }
    }

     // Limita a descrição para evitar overflow
     const shortDescription = ad.description.length > 150 ? 
     ad.description.substring(0, 150) + '...' : ad.description;
    
    div.innerHTML = `
       <div class="ad-media">
            ${mediaContent}
            <span class="ad-status ${status}">${statusText}</span>
        </div>
        <div class="ad-info">
             <h3>${ad.title}</h3>
             <p title="${ad.description}">${shortDescription}</p>
            <div class="ad-dates">
                <small>Início: ${formatDate(ad.startDate)}</small>
                <small>Fim: ${formatDate(ad.endDate)}</small>
            </div>
            <div class="ad-stats d-none">
                <span><i class="fas fa-eye d-none"></i> ${ad.impressions || 0}</span>
                <span><i class="fas fa-mouse-pointer"></i> ${ad.clicks || 0}</span>
            </div>
            <div class="ad-actions">
                <button onclick="editAd('${ad.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="deleteAd('${ad.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
    return div;
}

function loadAdForEdit(ad) {
  
    const titleInput = document.getElementById('ad-title');
    const descriptionInput = document.getElementById('ad-description');
    const mediaTypeInput = document.getElementById('ad-type');
    const mediaUrlInput = document.getElementById('ad-media');
    const linkInput = document.getElementById('ad-link');
    const clientInput = document.getElementById('ad-client');
    const startDateInput = document.getElementById('ad-start-date');
    const endDateInput = document.getElementById('ad-end-date');
    const saveBtn = document.querySelector('.save-btn');

    if (titleInput) titleInput.value = ad.title;
    if (descriptionInput) descriptionInput.value = ad.description;
    if (mediaTypeInput) mediaTypeInput.value = ad.mediaType;
    if (mediaUrlInput) mediaUrlInput.value = ad.mediaUrl;
    if (linkInput) linkInput.value = ad.targetUrl;
    //if (clientInput) clientInput.value = ad.clientCNPJ;

    if (clientInput) {
        // Atualiza o valor real
        clientInput.value = ad.clientCNPJ;

        // Atualiza a interface do Select2
        $(clientInput).trigger('change');
    }
    
   if (startDateInput) startDateInput.value = formatDateToInput(ad.startDate);
    if (endDateInput) endDateInput.value = formatDateToInput(ad.endDate);
    
    if (saveBtn) {
        saveBtn.textContent = 'Atualizar';
        saveBtn.classList.add('update');
    }
}

function formatDateToInput(date) {
  if (!date) return '';
  
  // Se for string, tenta extrair a data
  if (typeof date === 'string') {
    // Pega só os primeiros 10 caracteres: "YYYY-MM-DD"
    return date.substring(0, 10);
  }
  
  // Se for objeto Date
  if (date instanceof Date) {
    return date.toISOString().substring(0, 10);
  }
  
  // Se for Firebase Timestamp
  if (typeof date.toDate === 'function') {
    return date.toDate().toISOString().substring(0, 10);
  }

  return '';
}


// Garante que a função init seja chamada quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando gerenciamento de propagandas...');
  
  if (adSearchInput) adSearchInput.addEventListener('input', renderAds);
  if (adFilterStatus) adFilterStatus.addEventListener('change', renderAds);


    setTimeout(() => {
        console.log('Iniciando após delay...');
        init();
    }, 1000);
});

function getYouTubeVideoId(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
  
      if (hostname.includes("youtu.be")) {
        return urlObj.pathname.slice(1);
      }
  
      if (hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v");
      }
  
      return null;
    } catch (e) {
      return null;
    }
}