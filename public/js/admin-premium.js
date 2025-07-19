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
        console.log('[DEBUG] loadMyAds iniciada');
        
        // Verificar se os elementos DOM existem
        const loadingElement = document.getElementById('my-ads-loading');
        const emptyElement = document.getElementById('my-ads-empty');
        
        if (!loadingElement) {
            console.error('[DEBUG] Elemento my-ads-loading não encontrado');
            return;
        }
        
        if (!emptyElement) {
            console.error('[DEBUG] Elemento my-ads-empty não encontrado');
            return;
        }
        
        loadingElement.style.display = '';
        emptyElement.style.display = 'none';
        
        const { premiumAdsApi } = await import('./api.js');
        const premiumUser = getPremiumUser();
        
        console.log('[DEBUG] Premium user data:', premiumUser);
        
        const cnpj = (premiumUser.cnpj || premiumUser.userCNPJ || premiumUser.clientCNPJ || '').replace(/\D/g, '');
        console.log('[DEBUG] CNPJ extraído:', cnpj);
        
        const allAds = await premiumAdsApi.getAll();
        console.log('[DEBUG] Total de propagandas carregadas:', allAds.length);
        
        // Filtrar propagandas do cliente logado
        window.myAds = allAds.filter(ad => ad.clientCNPJ && ad.clientCNPJ.replace(/\D/g, '') === cnpj);
        console.log('[DEBUG] Propagandas filtradas para o cliente:', window.myAds.length);
        
        loadingElement.style.display = 'none';
        renderMyAdsList();
        
    } catch (error) {
        console.error('[DEBUG] Erro em loadMyAds:', error);
        const loadingElement = document.getElementById('my-ads-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
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
        console.log('[DEBUG] openAdvertisingModal iniciada');
        
        if (!requirePremiumAuth()) {
            console.log('[DEBUG] Usuário não autenticado premium, abortando');
            return;
        }
        
        console.log('[DEBUG] Usuário autenticado, carregando formulário...');
        await loadAdvertisingForm();
        
        console.log('[DEBUG] Formulário carregado, abrindo modal...');
        advertisingModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevenir scroll
        
        console.log('[DEBUG] Modal aberta com sucesso');
        
    } catch (error) {
        console.error('[DEBUG] Erro ao abrir modal de propaganda:', error);
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
            <!-- Seção de informações do plano -->
            <div class="plan-info-section" id="plan-info-section">
                <div class="plan-info-header">
                    <i class="fas fa-info-circle"></i>
                    <span>Informações do Plano</span>
                </div>
                <div class="plan-info-content" id="plan-info-content">
                    <div class="plan-details">
                        <span class="plan-name" id="plan-name">Carregando...</span>
                        <span class="plan-limit" id="plan-limit">Verificando limite...</span>
                    </div>
                    <div class="plan-status" id="plan-status">
                        <span class="status-indicator" id="status-indicator"></span>
                        <span class="status-text" id="status-text">Verificando...</span>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="ad-title-modal">Título da Propaganda*</label>
                    <div class="input-with-ai">
                        <input
                            type="text"
                            id="ad-title-modal"
                            name="title"
                            required
                            placeholder="Ex: Oferta Especial de Verão"
                        />
                        <button
                            type="button"
                            class="ai-suggest-btn"
                            id="ai-title-btn"
                            title="Sugerir melhorias com IA"
                            onclick="suggestTitleImprovements()"
                        >
                            <i class="fas fa-magic"></i>
                        </button>
                    </div>
                </div>
                <!-- Removido select de cliente -->
            </div>
            <div class="form-group">
                <label for="ad-description-modal">Descrição*</label>
                <div class="input-with-ai">
                    <textarea
                        id="ad-description-modal"
                        name="description"
                        required
                        placeholder="Descreva a promoção ou campanha"
                        rows="3"
                    ></textarea>
                    <button
                        type="button"
                        class="ai-suggest-btn"
                        id="ai-description-btn"
                        title="Sugerir melhorias com IA"
                        onclick="suggestDescriptionImprovements()"
                    >
                        <i class="fas fa-magic"></i>
                    </button>
                </div>
            </div>

            <!-- Container para sugestões da IA -->
            <div id="ai-suggestions-container" class="ai-suggestions" style="display: none;">
                <div class="ai-suggestions-header">
                    <i class="fas fa-robot"></i>
                    <span>Sugestões da IA</span>
                    <button type="button" class="close-suggestions" onclick="closeAISuggestions()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="ai-suggestions-content" class="ai-suggestions-content">
                    <!-- Sugestões serão inseridas aqui -->
                </div>
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
        
        // Carregar informações do plano
        await loadPlanInfo();
        
    } catch (error) {
        console.error('Erro ao inicializar formulário:', error);
        showAlert('Erro ao inicializar formulário de propaganda', 'error');
    }
}

// Função para carregar e exibir informações do plano
async function loadPlanInfo() {
    try {
        console.log('[DEBUG] loadPlanInfo iniciada');
        
        const premiumUser = getPremiumUser();
        console.log('[DEBUG] Premium user:', premiumUser);
        
        const clientCNPJ = premiumUser.cnpj || premiumUser.userCNPJ || premiumUser.clientCNPJ;
        
        if (!clientCNPJ) {
            console.log('[DEBUG] CNPJ não encontrado no usuário premium');
            updatePlanInfoDisplay('Cliente não identificado', 'N/A', 'error', 'Erro ao identificar cliente');
            return;
        }
        
        console.log('[DEBUG] CNPJ do cliente:', clientCNPJ);
        
        const validation = await validateAdLimit(clientCNPJ);
        console.log('[DEBUG] Validação retornada:', validation);
        
        updatePlanInfoDisplay(
            validation.planName, 
            validation, 
            validation.canCreate ? 'success' : 'warning', 
            validation.canCreate ? 'Pode criar propaganda' : 'Limite atingido'
        );
        
    } catch (error) {
        console.error('Erro ao carregar informações do plano:', error);
        // Em caso de erro, mostrar informações padrão para usuários premium
        updatePlanInfoDisplay(
            'Premium', 
            { currentCount: 0, limit: 10, remaining: 10 }, 
            'success', 
            'Pode criar propaganda'
        );
    }
}

// Função para atualizar a exibição das informações do plano
function updatePlanInfoDisplay(planName, validation, status, statusText) {
    const planNameEl = document.getElementById('plan-name');
    const planLimitEl = document.getElementById('plan-limit');
    const statusIndicatorEl = document.getElementById('status-indicator');
    const statusTextEl = document.getElementById('status-text');
    
    if (planNameEl) planNameEl.textContent = planName;
    
    if (planLimitEl && validation) {
        if (validation.limit === Infinity) {
            planLimitEl.textContent = 'Limite: Ilimitado';
        } else {
            planLimitEl.textContent = `Limite: ${validation.currentCount}/${validation.limit} propagandas`;
        }
    }
    
    if (statusIndicatorEl) {
        statusIndicatorEl.className = `status-indicator ${status}`;
        statusIndicatorEl.innerHTML = status === 'success' ? '<i class="fas fa-check-circle"></i>' : 
                                    status === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' : 
                                    '<i class="fas fa-times-circle"></i>';
    }
    
    if (statusTextEl) statusTextEl.textContent = statusText;
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
    try {
        const form = event.target;
        const formData = new FormData(form);
        if (!validateAdvertisingForm(formData)) {
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
        
        // Validação de limite de propagandas (apenas para novos cadastros)
        const editId = form.getAttribute('data-edit-id');
        if (!editId) {
            const limitValidation = await validateAdLimit(adData.clientCNPJ);
            if (!showLimitAlert(limitValidation)) {
                return; // Para o envio se o limite foi atingido
            }
        }
        
        const { premiumAdsApi } = await import('./api.js');
        // Se for edição, atualizar
        if (editId) {
            await premiumAdsApi.update(editId, adData);
            showAlert('Propaganda atualizada com sucesso!', 'success');
            form.removeAttribute('data-edit-id'); // Limpa o modo edição
        } else {
            await premiumAdsApi.add(adData);
            showAlert('Propaganda cadastrada com sucesso!', 'success');
        }
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

// Função para validar limite de propagandas baseado no plano
async function validateAdLimit(clientCNPJ) {
  try {
    console.log('[DEBUG] validateAdLimit iniciada para CNPJ:', clientCNPJ);
    
    // Buscar todas as propagandas do cliente
    const { premiumAdsApi } = await import('./api.js');
    const allAds = await premiumAdsApi.getAll();
    const clientAds = allAds.filter(ad => ad.clientCNPJ === clientCNPJ);
    
    console.log('[DEBUG] Propagandas do cliente encontradas:', clientAds.length);
    
    // Contar propagandas ativas (não expiradas e ativas)
    const now = new Date();
    const activeAds = clientAds.filter(ad => {
      const endDate = new Date(ad.endDate);
      return endDate > now && ad.isActive !== false;
    });
    
    console.log('[DEBUG] Propagandas ativas:', activeAds.length);
    
    // Para usuários premium, assumir plano premium com limite de 10 propagandas
    // Em uma implementação real, isso viria da base de dados
    const planType = 'premium'; // Assumir plano premium para usuários autenticados
    const currentCount = activeAds.length;
    
    // Definir limites baseados no plano
    let limit, planName;
    if (planType === 'premium-plus') {
      limit = Infinity; // Ilimitado
      planName = 'Premium Plus';
    } else if (planType === 'premium') {
      limit = 10; // Máximo 10 propagandas
      planName = 'Premium';
    } else {
      limit = 0; // Plano básico não pode ter propagandas
      planName = 'Básico';
    }
    
    const validation = {
      canCreate: currentCount < limit,
      currentCount,
      limit,
      planType,
      planName,
      remaining: limit === Infinity ? 'Ilimitado' : limit - currentCount
    };
    
    console.log('[DEBUG] Validação do plano:', validation);
    
    return validation;
    
  } catch (error) {
    console.error('Erro ao validar limite de propagandas:', error);
    // Em caso de erro, retornar configuração padrão para usuários premium
    return {
      canCreate: true,
      currentCount: 0,
      limit: 10,
      planType: 'premium',
      planName: 'Premium',
      remaining: 10
    };
  }
}

// Função para mostrar alerta de limite
function showLimitAlert(validation) {
  const { canCreate, currentCount, limit, planName, remaining } = validation;
  
  if (!canCreate) {
    if (limit === 0) {
      showAlert(`Plano ${planName} não permite cadastro de propagandas. Faça upgrade para Premium ou Premium Plus.`, 'warning');
    } else {
      showAlert(`Limite de propagandas atingido! Você tem ${currentCount}/${limit} propagandas ativas no plano ${planName}. Faça upgrade para Premium Plus para ter propagandas ilimitadas.`, 'warning');
    }
    return false;
  }
  
  // Mostrar informação sobre limite restante
  if (limit !== Infinity && remaining <= 3) {
    showAlert(`Atenção: Você tem apenas ${remaining} propaganda(s) restante(s) no plano ${planName}. Considere fazer upgrade para Premium Plus.`, 'info');
  }
  
  return true;
}

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

// Importa o script da IA para sugestões de propaganda
import './advertising-ai.js';