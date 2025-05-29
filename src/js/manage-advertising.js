import { premiumAdsApi, logosApi } from './api.js';
import { showAlert } from '../components/alert.js';

// Elementos DOM
const adForm = document.getElementById("ad-form");
const adsGrid = document.getElementById("premium-ads-list");
const searchInput = document.getElementById("search-input");
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
            if (ads.length === 0) {
                showAlert('Nenhum anúncio encontrado.', 'info');
            } else {
                renderAds(ads);
                populateClientSelect();
            }
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
        .filter(logo => logo.planType === 'premium-plus')
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

    clientSelect.innerHTML = '<option value="">Selecione um cliente premium plus</option>';

    const activeClients = clients.filter(client => isContractActive(client));
    activeClients.sort((a, b) => a.clientName.localeCompare(b.clientName));

    activeClients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.clientCNPJ;
      option.textContent = `${client.clientName} (${client.clientFantasyName || ''})`;
      option.title = `CNPJ: ${formatCNPJ(client.clientCNPJ)} | Plano: ${client.planType}`;
      clientSelect.appendChild(option);
    });
  }

// Event Listeners
if (adForm) {
    adForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        try {
            const formData = new FormData(adForm);
            const adData = {
                title: formData.get('ad-title'),
                description: formData.get('ad-description'),
                mediaType: formData.get('ad-type'),
                mediaUrl: formData.get('ad-media'),
                targetUrl: formData.get('ad-link'),
                clientCNPJ: formData.get('ad-client'),
                startDate: formData.get('ad-start-date'),
                endDate: formData.get('ad-end-date')
            };

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
};

window.deleteAd = async function(adId) {
    if (confirm('Tem certeza que deseja excluir este anúncio?')) {
        try {
            await premiumAdsApi.delete(adId);
            ads = ads.filter(a => a.id !== adId);
            renderAds(ads);
            showAlert('Anúncio excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir anúncio:', error);
            showAlert('Erro ao excluir anúncio. Por favor, tente novamente.', 'error');
        }
    }
};

// Funções auxiliares
function renderAds(ads) {
    if (!adsGrid) return;
    
    adsGrid.innerHTML = '';
    ads.forEach(ad => {
        const adElement = createAdElement(ad);
        adsGrid.appendChild(adElement);
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
    debugger;
    const titleInput = document.getElementById('ad-title');
    const descriptionInput = document.getElementById('ad-description');
    const mediaTypeInput = document.getElementById('ad-type');
    const mediaUrlInput = document.getElementById('ad-media');
    const linkInput = document.getElementById('ad-link');
    const clientInput = document.getElementById('ad-client');
    const startDateInput = document.getElementById('ad-start');
    const endDateInput = document.getElementById('ad-end');
    const saveBtn = document.querySelector('.save-btn');

    if (titleInput) titleInput.value = ad.title;
    if (descriptionInput) descriptionInput.value = ad.description;
    if (mediaTypeInput) mediaTypeInput.value = ad.mediaType;
    if (mediaUrlInput) mediaUrlInput.value = ad.mediaUrl;
    if (linkInput) linkInput.value = ad.targetUrl;
    if (clientInput) clientInput.value = ad.clientCNPJ;
    if (startDateInput) startDateInput.value = ad.startDate;
    if (endDateInput) endDateInput.value = ad.endDate;
    
    if (saveBtn) {
        saveBtn.textContent = 'Atualizar';
        saveBtn.classList.add('update');
    }
}

// Garante que a função init seja chamada quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando gerenciamento de propagandas...');
    // Adiciona um pequeno delay para garantir que todos os elementos estejam carregados
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