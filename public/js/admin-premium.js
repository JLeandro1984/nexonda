// ===== ADMIN PREMIUM - Página Principal =====

import { showAlert } from '../components/alert.js';
import { requirePremiumAuth, getPremiumUser } from './auth-premium.js';

// Elementos DOM
const advertisingModal = document.getElementById('advertising-modal');
const advertisingModalContent = document.getElementById('advertising-modal-content');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminPremium();
});

async function loadMyAds() {
    try {
        document.getElementById('my-ads-loading').style.display = '';
        document.getElementById('my-ads-empty').style.display = 'none';
        const { premiumAdsApi } = await import('./api.js');
        const premiumUser = getPremiumUser();
        const cnpj = (premiumUser.cnpj || premiumUser.userCNPJ || premiumUser.clientCNPJ || '').replace(/\D/g, '');
        const allAds = await premiumAdsApi.getAll();
        // Filtrar propagandas do cliente logado
        window.myAds = allAds.filter(ad => ad.clientCNPJ && ad.clientCNPJ.replace(/\D/g, '') === cnpj);
        document.getElementById('my-ads-loading').style.display = 'none';
        renderMyAdsList();
    } catch (error) {
        document.getElementById('my-ads-loading').style.display = 'none';
        showAlert('Erro ao carregar propagandas: ' + error.message, 'error');
    }
}

// Chamar loadMyAds na inicialização do painel premium
function initializeAdminPremium() {
    if (!requirePremiumAuth()) {
        return;
    }
    console.log('Admin Premium inicializado');
    setupModalEventListeners();
    // Forçar renderização da seção Minhas Propagandas se o dashboard estiver visível
    const premiumDashboard = document.getElementById('premium-dashboard');
    if (premiumDashboard && !premiumDashboard.classList.contains('hidden')) {
        if (!document.getElementById('my-ads-section')) {
            renderMyAdsSection();
        }
    }
}

function setupModalEventListeners() {
    // Remover fechamento ao clicar fora da modal
    // if (advertisingModal) {
    //     advertisingModal.addEventListener('click', (e) => {
    //         if (e.target === advertisingModal) {
    //             closeAdvertisingModal();
    //         }
    //     });
    // }
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !advertisingModal.classList.contains('hidden')) {
            closeAdvertisingModal();
        }
    });
}

// ===== FUNÇÕES GLOBAIS (chamadas pelo HTML) =====

window.openAdvertisingModal = async function() {
    try {
        if (!requirePremiumAuth()) {
            return;
        }
        
        await loadAdvertisingForm();
        advertisingModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        
    } catch (error) {
        console.error('Erro ao abrir modal de propaganda:', error);
        showAlert('Erro ao carregar formulário de propaganda', 'error');
    }
};

window.closeAdvertisingModal = function() {
    advertisingModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restaurar scroll
    clearAdvertisingForm();
};

// ===== CARREGAMENTO DO FORMULÁRIO =====

async function loadAdvertisingForm() {
    try {
        // Carregar o formulário de propaganda
        const formHTML = await getAdvertisingFormHTML();
        advertisingModalContent.innerHTML = formHTML;
        
        // Inicializar funcionalidades do formulário
        await initializeAdvertisingForm();
        
    } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        advertisingModalContent.innerHTML = `
            <div class="error-state">
                <p>Erro ao carregar formulário de propaganda.</p>
                <button onclick="closeAdvertisingModal()" class="primary-btn">Fechar</button>
            </div>
        `;
    }
}

async function getAdvertisingFormHTML() {
    // Retornar HTML do formulário de propaganda
    return `
        <form id="ad-form-modal" class="advertising-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="ad-title-modal">Título da Propaganda*</label>
                    <input
                        type="text"
                        id="ad-title-modal"
                        name="title"
                        required
                        placeholder="Ex: Oferta Especial de Verão"
                    />
                </div>
                <!-- Removido select de cliente -->
            </div>
            <div class="form-group">
                <label for="ad-description-modal">Descrição*</label>
                <textarea
                    id="ad-description-modal"
                    name="description"
                    required
                    placeholder="Descreva a promoção ou campanha"
                    rows="3"
                ></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="ad-type-modal">Tipo de Mídia*</label>
                    <select id="ad-type-modal" name="mediaType" required>
                        <option value="image">Imagem (Banner)</option>
                        <option value="video">Vídeo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="ad-upload-modal">Arquivo da Mídia*</label>
                    <input
                        type="file"
                        id="ad-upload-modal"
                        name="mediaFile"
                        accept="image/*,video/*"
                    />
                    <small class="hint">Suporta imagens ou vídeos .mp4</small>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="ad-start-date-modal">Data de Início*</label>
                    <input type="date" id="ad-start-date-modal" name="startDate" required />
                </div>
                <div class="form-group">
                    <label for="ad-end-date-modal">Data de Término*</label>
                    <input type="date" id="ad-end-date-modal" name="endDate" required />
                </div>
            </div>
            <div class="form-group">
                <label for="ad-target-url-modal">URL de Destino*</label>
                <input
                    type="url"
                    id="ad-target-url-modal"
                    name="targetUrl"
                    required
                    placeholder="https://www.seusite.com/promo"
                />
                <small class="hint">Link para onde o usuário será direcionado ao clicar na propaganda</small>
            </div>
            <div class="form-group media-preview-wrapper">
                <div id="media-preview-modal" style="margin-bottom: 12px">
                    <!-- Pré-visualização será inserida aqui -->
                </div>
                <div
                    id="upload-loading-modal"
                    style="display: none; text-align: center; margin: 10px 0"
                >
                    ⏳ Aguarde, carregando mídia...
                </div>
            </div>
            <div class="form-group" style="position: relative">
                <label for="ad-media-modal">URL da Mídia*</label>
                <textarea
                    id="ad-media-modal"
                    name="mediaUrl"
                    required
                    readonly
                    placeholder="https://res.cloudinary.com/..."
                    rows="2"
                    style="width: 100%; resize: none; padding-right: 70px"
                ></textarea>
                <button
                    type="button"
                    id="copy-button-modal"
                    class="copy-button"
                    title="Copiar URL"
                    aria-label="Copiar URL"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                        width="20"
                        height="20"
                        style="color: #007bff"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V7a2 2 0 012-2h3.5l1-1h3l1 1H17a2 2 0 012 2v11a2 2 0 01-2 2z"
                        />
                    </svg>
                </button>
                <small class="hint">URL gerada após upload</small>
            </div>
            <div class="form-group">
                <button type="submit" class="primary-btn">Salvar Propaganda</button>
                <button type="reset" class="secondary-btn">Limpar</button>
            </div>
        </form>
    `;
}

async function initializeAdvertisingForm() {
    try {
        // Removido: await populateClientSelect();
        // Configurar event listeners do formulário
        setupAdvertisingFormEvents();
        
        // Configurar upload de mídia
        setupMediaUpload();
        
        // Configurar validações
        setupFormValidations();
        
    } catch (error) {
        console.error('Erro ao inicializar formulário:', error);
        showAlert('Erro ao inicializar formulário de propaganda', 'error');
    }
}

async function populateClientSelect() {
    try {
        const { logosApi } = await import('./api.js');
        const allLogos = await logosApi.getAll();
        
        const clientSelect = document.getElementById('ad-client-modal');
        if (!clientSelect) return;

        clientSelect.innerHTML = '<option value="">Selecione um cliente</option>';

        // Filtrar clientes premium ativos
        const premiumClients = allLogos.filter(logo => 
            logo.contractActive === true && 
            ['premium', 'premium-plus'].includes(logo.planType)
        );

        premiumClients.sort((a, b) => a.clientName.localeCompare(b.clientName));

        premiumClients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.clientCNPJ;
            option.textContent = `${client.clientName} (${client.clientFantasyName || ''})`;
            option.title = `CNPJ: ${formatCNPJ(client.clientCNPJ)} | Plano: ${client.planType}`;
            clientSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

function setupAdvertisingFormEvents() {
    const form = document.getElementById('ad-form-modal');
    if (!form) return;
    // Remover event listeners antigos para evitar duplicidade
    form.onsubmit = null;
    form.removeEventListener('submit', handleAdvertisingSubmit);
    // Submit do formulário
    form.addEventListener('submit', handleAdvertisingSubmit);
    // Reset do formulário
    form.addEventListener('reset', () => {
        clearMediaPreview();
    });
    // Validação de datas
    const startDateInput = document.getElementById('ad-start-date-modal');
    const endDateInput = document.getElementById('ad-end-date-modal');
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', () => {
            endDateInput.min = startDateInput.value;
        });
        endDateInput.addEventListener('change', () => {
            startDateInput.max = endDateInput.value;
        });
    }
}

function setupMediaUpload() {
    const mediaInput = document.getElementById('ad-upload-modal');
    const mediaTypeSelect = document.getElementById('ad-type-modal');
    const mediaUrlInput = document.getElementById('ad-media-modal');
    
    if (!mediaInput || !mediaTypeSelect || !mediaUrlInput) return;

    // Upload de arquivo
    mediaInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar tipo de arquivo conforme seleção
        const selectedType = mediaTypeSelect.value;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if ((selectedType === 'image' && !isImage) || (selectedType === 'video' && !isVideo)) {
            showAlert('O arquivo selecionado não corresponde ao tipo escolhido. Selecione uma imagem ou vídeo conforme o tipo.', 'error');
            mediaInput.value = '';
            mediaUrlInput.value = '';
            clearMediaPreview();
            return;
        }

        try {
            showUploadLoading(true);
            
            // Validar tipo de arquivo
            const validation = validateFileType(file, selectedType);
            if (!validation.isValid) {
                showAlert(validation.message, 'error');
                return;
            }
            
            // Upload para Firebase Storage
            const { uploadToFirebaseStorage } = await import('./firebase-upload.js');
            const result = await uploadToFirebaseStorage(file, 'advertising');
            
            // Atualizar URL
            mediaUrlInput.value = result.url;
            
            // Mostrar pré-visualização
            showMediaPreview(result.url, selectedType);
            
            showAlert('Upload realizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro no upload:', error);
            showAlert('Erro ao fazer upload: ' + error.message, 'error');
        } finally {
            showUploadLoading(false);
        }
    });
    
    // Mudança de tipo de mídia
    mediaTypeSelect.addEventListener('change', () => {
        clearMediaPreview();
        mediaInput.value = '';
        mediaUrlInput.value = '';
    });
}

function setupFormValidations() {
    const form = document.getElementById('ad-form-modal');
    if (!form) return;

    // Validação em tempo real
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

// ===== HANDLER UNIFICADO DE SUBMIT (CADASTRO E EDIÇÃO) =====
async function handleAdvertisingSubmit(event) {
    event.preventDefault();
    console.log('[DEBUG] handleAdvertisingSubmit chamado');
    try {
        const form = event.target;
        const formData = new FormData(form);
        if (!validateAdvertisingForm(formData)) {
            console.log('[DEBUG] Validação do formulário falhou');
            return;
        }
        const adData = {};
        for (let [key, value] of formData.entries()) {
            adData[key] = value;
        }
        const premiumUser = getPremiumUser();
        adData.createdBy = premiumUser.email;
        adData.createdAt = new Date().toISOString();
        adData.clientCNPJ = premiumUser.cnpj || premiumUser.userCNPJ || premiumUser.clientCNPJ;
        const { premiumAdsApi } = await import('./api.js');
        // Se for edição, atualizar
        const editId = form.getAttribute('data-edit-id');
        if (editId) {
            await premiumAdsApi.update(editId, adData);
            showAlert('Propaganda atualizada com sucesso!', 'success');
            form.removeAttribute('data-edit-id'); // Limpa o modo edição
        } else {
            await premiumAdsApi.add(adData);
            showAlert('Propaganda cadastrada com sucesso!', 'success');
        }
        console.log('[DEBUG] Propaganda enviada para API:', adData);
        closeAdvertisingModal();
        loadMyAds();
    } catch (error) {
        console.error('Erro ao salvar propaganda:', error);
        showAlert('Erro ao salvar propaganda: ' + error.message, 'error');
    }
}

// ===== FUNÇÕES AUXILIARES =====

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

function validateAdvertisingForm(formData) {
    const title = formData.get('title');
    const description = formData.get('description');
    const mediaUrl = formData.get('mediaUrl');
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    const mediaType = formData.get('mediaType');
    const targetUrl = formData.get('targetUrl');

    // Logs detalhados para depuração
    console.log('[VALIDATE] title:', title);
    console.log('[VALIDATE] description:', description);
    console.log('[VALIDATE] mediaUrl:', mediaUrl);
    console.log('[VALIDATE] startDate:', startDate);
    console.log('[VALIDATE] endDate:', endDate);
    console.log('[VALIDATE] mediaType:', mediaType);
    console.log('[VALIDATE] targetUrl:', targetUrl);

    if (!title) {
        showAlert('Título é obrigatório.', 'error');
        return false;
    }
    if (!description) {
        showAlert('Descrição é obrigatória.', 'error');
        return false;
    }
    if (!mediaType || (mediaType !== 'image' && mediaType !== 'video')) {
        showAlert('Selecione o tipo de mídia: Imagem ou Vídeo.', 'error');
        return false;
    }
    if (!mediaUrl) {
        showAlert('É obrigatório fazer upload de uma mídia.', 'error');
        return false;
    }
    if (!startDate) {
        showAlert('Data de início é obrigatória.', 'error');
        return false;
    }
    if (!endDate) {
        showAlert('Data de término é obrigatória.', 'error');
        return false;
    }
    if (!targetUrl) {
        showAlert('URL de destino é obrigatória.', 'error');
        return false;
    }
    if (!isValidUrl(targetUrl)) {
        showAlert('A URL de destino não é válida.', 'error');
        return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
        showAlert('A data de término deve ser igual ou posterior à data de início.', 'error');
        return false;
    }
    return true;
}

function validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'Este campo é obrigatório');
        return false;
    }
    
    if (field.type === 'url' && value && !isValidUrl(value)) {
        showFieldError(field, 'URL inválida');
        return false;
    }
    
    return true;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error-state');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.id = `${field.id}-error`;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(event) {
    const field = event.target;
    if (field && field.classList && typeof field.classList.remove === 'function') {
        field.classList.remove('error-state');
    }
    // Se houver elemento de feedback de erro, limpe também
    const feedback = field && field.parentNode ? field.parentNode.querySelector('.form-hint.error-message') : null;
    if (feedback) {
        feedback.textContent = '';
    }
}

function showMediaPreview(url, type) {
    const previewContainer = document.getElementById('media-preview-modal');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Pré-visualização da imagem';
        img.style.maxWidth = '300px';
        img.style.borderRadius = '8px';
        previewContainer.appendChild(img);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.maxWidth = '300px';
        video.style.borderRadius = '8px';
        previewContainer.appendChild(video);
    }
}

function clearMediaPreview() {
    const previewContainer = document.getElementById('media-preview-modal');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
}

function showUploadLoading(show) {
    const loadingElement = document.getElementById('upload-loading-modal');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

function clearAdvertisingForm() {
    const form = document.getElementById('ad-form-modal');
    if (form) {
        form.reset();
        clearMediaPreview();
        
        // Limpar erros
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());
        
        const errorFields = form.querySelectorAll('.error-state');
        errorFields.forEach(field => field.classList.remove('error-state'));
    }
}

function formatCNPJ(cnpj) {
    if (!cnpj) return '';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Função para extrair data no formato yyyy-MM-dd
function formatDateToInput(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        return date.substring(0, 10);
    }
    if (date instanceof Date) {
        return date.toISOString().substring(0, 10);
    }
    if (typeof date.toDate === 'function') {
        return date.toDate().toISOString().substring(0, 10);
    }
    return '';
}

// Função global para abrir modal de edição corretamente
window.openEditAdModal = function(adId, adData) {
    window.openAdvertisingModal().then(() => {
        const form = document.getElementById('ad-form-modal');
        if (!form || !adData) return;
        if (form.querySelector('[name="title"]')) {
            form.querySelector('[name="title"]').value = adData.title || '';
        }
        if (form.querySelector('[name="description"]')) {
            form.querySelector('[name="description"]').value = adData.description || '';
        }
        if (form.querySelector('[name="mediaType"]')) {
            form.querySelector('[name="mediaType"]').value = adData.mediaType || '';
        }
        if (form.querySelector('[name="mediaUrl"]')) {
            form.querySelector('[name="mediaUrl"]').value = adData.mediaUrl || '';
        }
        if (form.querySelector('[name="targetUrl"]')) {
            form.querySelector('[name="targetUrl"]').value = adData.targetUrl || '';
        }
        if (form.querySelector('[name="startDate"]')) {
            form.querySelector('[name="startDate"]').value = formatDateToInput(adData.startDate);
        }
        if (form.querySelector('[name="endDate"]')) {
            form.querySelector('[name="endDate"]').value = formatDateToInput(adData.endDate);
        }
        if (adData.mediaUrl && adData.mediaType) {
            showMediaPreview(adData.mediaUrl, adData.mediaType);
        }
        form.setAttribute('data-edit-id', adId);
        form.onsubmit = null;
        form.removeEventListener('submit', handleAdvertisingSubmit);
        form.addEventListener('submit', handleAdvertisingSubmit);
    });
};

// Função global para editar propaganda (botão Editar)
window.editAd = function(adId) {
    if (!window.myAds) return;
    const ad = window.myAds.find(a => a.id === adId);
    if (ad) {
        window.openEditAdModal(adId, ad);
    }
};

// ===== EXPORTS =====

export function getAdvertisingModal() {
    return advertisingModal;
}

export function isModalOpen() {
    return !advertisingModal.classList.contains('hidden');
} 

// ===== NOVA SEÇÃO: MINHAS PROPAGANDAS =====

// Elementos para painel de propagandas
let myAdsSection, myAdsList;

// Após mostrar o dashboard premium, renderizar painel de propagandas
if (typeof showPremiumDashboard === 'function') {
  const _originalShowPremiumDashboard = showPremiumDashboard;
  showPremiumDashboard = function() {
    _originalShowPremiumDashboard();
    renderMyAdsSection();
  };
}

function renderMyAdsSection() {
    // Evitar duplicidade
    if (document.getElementById('my-ads-section')) return;
    
    // Criar seção
    const myAdsSection = document.createElement('section');
    myAdsSection.id = 'my-ads-section';
    myAdsSection.className = 'my-ads-section card';
    myAdsSection.innerHTML = `
        <h2 class="section-title">Minhas Propagandas</h2>
        <div class="premium-ads-list" id="my-ads-list"></div>
        <div id="my-ads-loading" class="my-ads-loading">Carregando propagandas...</div>
        <div id="my-ads-empty" class="my-ads-empty" style="display:none">Nenhuma propaganda encontrada.</div>
    `;
    
    // Adiciona ao DOM
    const premiumDashboard = document.getElementById('premium-dashboard');
    if (premiumDashboard) {
        premiumDashboard.appendChild(myAdsSection);
    }

    // Renderiza os cards usando o mesmo layout da manage-logos
    renderMyAdsList();
    // Agora sim, carregar propagandas do cliente logado
    loadMyAds();
}

function renderMyAdsList() {
    const adsList = document.getElementById('my-ads-list');
    if (!adsList) return;
    adsList.innerHTML = '';
    if (!window.myAds || window.myAds.length === 0) {
        document.getElementById('my-ads-empty').style.display = '';
        return;
    }
    document.getElementById('my-ads-empty').style.display = 'none';
    window.myAds.forEach(ad => {
        const card = createPremiumAdCard(ad);
        adsList.appendChild(card);
    });
}

function createPremiumAdCard(ad) {
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
            const posterUrl = ad.mediaUrl.replace('/upload/', '/upload/so_1/').replace('.mp4', '.jpg');
            mediaContent = `
                <video width="100%" height="180" controls poster="${posterUrl}">
                    <source src="${ad.mediaUrl}" type="video/mp4">
                    Seu navegador não suporta vídeos HTML5.
                </video>
            `;
        }
    }
    const shortDescription = ad.description && ad.description.length > 150 ? ad.description.substring(0, 150) + '...' : ad.description;
    div.innerHTML = `
        <div class="ad-media">
            ${mediaContent}
            <span class="ad-status ${status}">${statusText}</span>
        </div>
        <div class="ad-info">
            <h3>${ad.title}</h3>
            <p title="${ad.description}">${shortDescription || ''}</p>
            <div class="ad-dates">
                <small>Início: ${formatDate(ad.startDate)}</small>
                <small>Fim: ${formatDate(ad.endDate)}</small>
            </div>
            <div class="ad-actions">
                <button onclick="editAd('${ad.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i> Editar
                </button>
            </div>
        </div>
    `;
    return div;
}