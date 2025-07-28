import { premiumAdsApi, logosApi } from './api.js';
import { showAlert } from '../components/alert.js';
import { uploadToFirebaseStorage, deleteFromFirebaseStorage, showMediaPreview } from './firebase-upload.js';
import './advertising-ai.js';


// ===== Função para Configurar Contadores de Caracteres =====
function setupCharacterCounters(parentElement = document) {
    // Usa o elemento pai fornecido ou o documento inteiro por padrão
    parentElement.querySelectorAll(".char-input").forEach((input) => {
        const max = parseInt(input.dataset.maxlength);
        // Também busca o contador dentro do elemento pai especificado
        const counter = parentElement.querySelector(`.char-count[data-for="${input.id}"]`);

        if (!counter || isNaN(max)) return; // Se não encontrar o contador ou o limite, pula

        const updateCounter = () => {
            const remaining = max - input.value.length;
            counter.textContent = `${remaining}`;
        };

        // Remove listener antigo para evitar duplicatas se for chamada várias vezes
        input.removeEventListener('input', updateCounter);
        input.addEventListener("input", updateCounter);
        updateCounter(); // Atualiza a contagem inicial
    });
}

// Elementos DOM
const adForm = document.getElementById("ad-form");
const adsGrid = document.getElementById("premium-ads-list");
//const searchInput = document.getElementById("search-input");
const adSearchInput = document.getElementById('ad-search-input');
const adFilterStatus = document.getElementById('ad-filter-status');
const adImageInput = document.getElementById("ad-image");
const adImageUrl = document.getElementById("ad-image-url");
const clientSelect = document.getElementById('ad-client');

//elementos da media
const mediaTypeSelect = document.getElementById("ad-type");
const mediaInput = document.getElementById("ad-upload");
const mediaUrlInput = document.getElementById("ad-media");
const previewContainer = document.getElementById("media-preview");
  
previewContainer.innerHTML = "";
let currentDeleteToken = null;
let editingIndex = null;
let ads = [];

// Inicializa a aplicação
async function init() {
    try {
        console.log('Iniciando carregamento de propagandas...');

        // Verifica se os elementos necessários existem
        if (!adForm || !adsGrid) {
            console.error('Elementos necessários não encontrados:', {
                adForm: !!adForm,
                adsGrid: !!adsGrid
            });
            return;
        }
        
        // Verifica se há token de autenticação
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('Token de autenticação não encontrado');
            showAlert('Você não está autenticado. Faça login novamente.', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Token encontrado, fazendo requisição para API de propagandas...');
        
        try {
            let response = [];
            try {
                response = await premiumAdsApi.getAll();
                if (!Array.isArray(response)) {
                    response = [];
                }
            } catch (error) {
                // Se o erro for 404 ou similar, trata como lista vazia
                console.warn('Nenhuma propaganda encontrada ou erro ao buscar:', error);
                response = [];
            }
            // Garante que ads seja um array
            ads = response;
            console.log('Propagandas carregadas:', ads.length);
            renderAds();
            populateClientSelect();
            console.log('Inicialização de propagandas concluída com sucesso');

            setupCharacterCounters();
        } catch (error) {
            console.error('Erro ao carregar propagandas:', error);
            if (error.message && error.message.includes('autenticação')) {
                showAlert('Erro de autenticação. Faça login novamente.', 'error');
                window.location.href = 'login.html';
            } else {
                showAlert('Erro ao carregar anúncios: ' + (error.message || 'Erro desconhecido'), 'error');
            }
        }      
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showAlert('Erro ao inicializar a aplicação: ' + (error.message || 'Erro desconhecido'), 'error');
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
        if (adForm.getAttribute('data-ai-applying') === 'true') {
            console.log('Submit bloqueado: IA está aplicando sugestão');
            e.preventDefault();
            return;
        }
        if (adForm.getAttribute('data-manual-submit') !== 'true') {
            console.log('Submit bloqueado: não é manual');
            e.preventDefault();
            return;
        }
        adForm.removeAttribute('data-manual-submit');
        
        // Validação adicional antes do envio
        const selectedType = mediaTypeSelect.value;
        const file = mediaInput.files[0];
        
        if (file) {
            const validation = validateFileType(file, selectedType);
            if (!validation.isValid) {
                showAlert(validation.message, 'error');
                return;
            }
        }
        
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
            mediaUrlInput.value = "";
            mediaInput.value = ""; 
            previewContainer.innerHTML = "";
            
            // const preview = adForm.querySelector("#ad-preview");
            // if (preview) preview.style.display = 'none';
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

const saveBtn = document.querySelector('#ad-form .save-btn');
if (saveBtn) {
  saveBtn.addEventListener('click', function() {
    adForm.setAttribute('data-manual-submit', 'true');
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

// Função para validar tipo de arquivo
function validateFileType(file, selectedType) {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/mkv', 'video/webm'];
    
    if (selectedType === 'image') {
        if (!imageTypes.includes(file.type)) {
            return {
                isValid: false,
                message: 'O arquivo selecionado não é uma imagem válida. Por favor, selecione um arquivo de imagem (JPG, PNG, GIF, WEBP).'
            };
        }
    } else if (selectedType === 'video') {
        if (!videoTypes.includes(file.type)) {
            return {
                isValid: false,
                message: 'O arquivo selecionado não é um vídeo válido. Por favor, selecione um arquivo de vídeo (MP4, AVI, MOV, WMV, MKV, WEBM).'
            };
        }
    }
    
    return { isValid: true };
}

// Validação quando o tipo de mídia é alterado
if (mediaTypeSelect) {
    mediaTypeSelect.addEventListener("change", (event) => {
        const selectedType = event.target.value;
        const file = mediaInput.files[0];
        
        if (file) {
            const validation = validateFileType(file, selectedType);
            if (!validation.isValid) {
                showAlert(validation.message, 'error');
                // Limpa o input de arquivo
                mediaInput.value = '';
                // Limpa o preview
                if (previewContainer) previewContainer.innerHTML = '';
                // Limpa a URL
                if (mediaUrlInput) mediaUrlInput.value = '';
            }
        }
    });
}

// Upload de imagem/vídeo para Firebase Storage
if (mediaInput) {
    mediaInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const selectedType = mediaTypeSelect.value;
        
        // Valida o tipo de arquivo
        const validation = validateFileType(file, selectedType);
        if (!validation.isValid) {
            showAlert(validation.message, 'error');
            // Limpa o input de arquivo
            event.target.value = '';
            // Limpa o preview
            if (previewContainer) previewContainer.innerHTML = '';
            return;
        }
        
        try {
            // Faz upload para Firebase Storage
            const { url, fullPath } = await uploadToFirebaseStorage(file, "ads");
            if (mediaUrlInput) mediaUrlInput.value = url;
            // Salva o caminho completo para possível exclusão futura
            mediaInput.dataset.storagePath = fullPath;
            showMediaPreview(previewContainer, url, selectedType);
            showAlert('Arquivo enviado com sucesso!', 'success');
        } catch (error) {
            showAlert('Erro ao fazer upload da mídia: ' + error.message, 'error');
            // Limpa o input em caso de erro
            event.target.value = '';
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
    console.log('Renderizando propagandas...');
    
    const adsGrid = document.getElementById('premium-ads-list');
    if (!adsGrid) {
        console.error('Elemento premium-ads-list não encontrado');
        return;
    }

    const searchTerm = (adSearchInput.value || '').toLowerCase();
    const statusFilter = adFilterStatus.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Filtros aplicados:', { searchTerm, statusFilter, totalAds: ads.length });

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

    console.log('Propagandas filtradas:', filtered.length);

    // Renderização
    adsGrid.innerHTML = '';
    if (filtered.length === 0) {
        console.log('Nenhuma propaganda encontrada para exibir');
        adsGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-ad" style="font-size: 48px; margin-bottom: 20px; color: #ccc;"></i>
                <h3>Nenhuma propaganda encontrada</h3>
                <p>Adicione sua primeira propaganda usando o formulário acima.</p>
            </div>
        `;
        return;
    }

    console.log('Criando cards para', filtered.length, 'propagandas');

    filtered.forEach(ad => {
        const card = createAdElement(ad); // Usando createAdElement em vez de createAdCard
        adsGrid.appendChild(card);
    });
    
    console.log('Propagandas renderizadas com sucesso');
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
      // Extrai poster do vídeo (substitui .mp4 por .jpg e adiciona `so_1` para pegar o frame do segundo 1)
      const posterUrl = ad.mediaUrl.replace('/upload/', '/upload/so_1/').replace('.mp4', '.jpg');

      mediaContent = `
        <video width="100%" height="180" controls poster="${posterUrl}">
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

document.addEventListener("DOMContentLoaded", function () {
  currentDeleteToken = null;
  const loadingEl = document.getElementById("upload-loading");
  
  mediaInput.addEventListener("change", async function () {

    debugger;
    const file = mediaInput.files[0];
    if (!file) return;

    const type = mediaTypeSelect.value;

    if (!file.type.includes(type)) {
      showAlert(`Tipo de mídia incompatível. Esperado: ${type.toUpperCase()}.`, "warning");
      mediaUrlInput.value = "";
      mediaInput.value = "";
      return;
    }

     // 👉 Exibe carregando
    loadingEl.style.display = "block";

    if (currentDeleteToken) {
      await deleteFromFirebaseStorage(currentDeleteToken);
      currentDeleteToken = null;
      mediaUrlInput.value = "";
      previewContainer.innerHTML = "";
    }

    try {
      const { url, fullPath } = await uploadToFirebaseStorage(file, "ads");
      mediaUrlInput.value = url;
      currentDeleteToken = fullPath;

      if (url) showMediaPreview(previewContainer, url, type);
    } catch (err) {
      showAlert("Erro no upload: " + err.message, "error");
    } finally {
      // ✅ Esconde carregando
      loadingEl.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("copy-button").addEventListener("click", () => {
    const textarea = document.getElementById("ad-media");
    textarea.select();
    textarea.setSelectionRange(0, 99999);
    document.execCommand("copy");

    showAlert("URL copiada com sucesso!", "success");
  });
});

document.addEventListener('DOMContentLoaded', () => {
   
    const cancelButton = document.getElementById('ad-btn-cancelar');

    if (cancelButton) {
        cancelButton.addEventListener('click', (e) => {
        e.preventDefault(); // Opcional: impede o reset automático do formulário
        console.log('Botão Cancelar clicado');
         previewContainer.innerHTML = "";
            
        const form = cancelButton.closest('form');
        if (form) form.reset();
        });
    }
  });
