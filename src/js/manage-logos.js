import { logosApi } from './api.js';
import { categories } from './categories.js';
import { ufs } from './ufs.js';

// Elementos DOM
const logoForm = document.getElementById("logo-form");
const logosGrid = document.getElementById("logos-grid");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const logoCategorySelect = document.getElementById("logo-category");
const ufSelect = document.getElementById('client-uf');
const cnpjInput = document.getElementById("client-cnpj");
const saveBtn = document.querySelector('.save-btn');
const cancelBtn = document.querySelector('.cancel-btn');
const startDateInput = document.getElementById('start-date');
const contractMonthsSelect = document.getElementById('contract-months');
const endDateInput = document.getElementById('end-date');
const logoImageInput = document.getElementById("logo-image");
const logoImageUrl = document.getElementById("logo-image-url");

let editingIndex = null;
let logos = [];
let isNavigating = false;

// Estado global de autenticação
let authState = {
    isChecking: false,
    isAuthenticated: false,
    user: null
};

 // Preenche o select de UFs
 ufs.forEach(uf => {
    const option = document.createElement('option');
    option.value = uf.sigla;
    option.textContent = uf.nome;
    ufSelect.appendChild(option);
 });

// Função para decodificar o token JWT
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erro ao decodificar token:', error);
        return null;
    }
}

// Função para verificar se o usuário está autenticado
async function checkAuth() {
    if (authState.isChecking) return authState.isAuthenticated;
    authState.isChecking = true;

    try {
        // Verifica se há um token na URL (caso venha do redirecionamento do Google)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        
        if (tokenFromUrl) {
            console.log('Token encontrado na URL, salvando no localStorage');
            localStorage.setItem('authToken', tokenFromUrl);
            // Remove o token da URL para não ficar exposto
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const token = localStorage.getItem('authToken');
        console.log('Verificando autenticação. Token:', token ? 'Presente' : 'Ausente');
        
        if (!token) {
            console.log('Token não encontrado no localStorage');
            authState.isAuthenticated = false;
            return false;
        }

        console.log('Enviando requisição para verificar token...');
        const response = await fetch('https://authenticate-lnpdkkqg5q-uc.a.run.app', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Resposta recebida:', response.status);
        if (!response.ok) {
            console.log('Token inválido, removendo do localStorage');
            localStorage.removeItem('authToken');
            authState.isAuthenticated = false;
            return false;
        }

        const data = await response.json();
        console.log('Resposta da verificação:', data);

        if (data.authorized) {
            // Decodifica o token e salva o nome do usuário
            const decodedToken = decodeJwt(token);
            if (decodedToken && decodedToken.name) {
                localStorage.setItem('userName', decodedToken.name);
            }
            authState.isAuthenticated = true;
            return true;
        }
        
        authState.isAuthenticated = false;
        return false;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('authToken');
        authState.isAuthenticated = false;
        return false;
    } finally {
        authState.isChecking = false;
    }
}

// Função para gerenciar a navegação
async function handleNavigation() {
    if (isNavigating) return;
    isNavigating = true;

    try {
        const isAuthenticated = await checkAuth();
        console.log('Está autenticado:', isAuthenticated);

        if (!isAuthenticated) {
            console.log('Usuário não autenticado');
            showAlert('Erro de autenticação. Por favor, faça login novamente.', 'error');
            return;
        }

        // Se estiver autenticado, inicializa a página
        console.log('Usuário autenticado, inicializando página');
        await init();
    } catch (error) {
        console.error('Erro no handleNavigation:', error);
        showAlert('Erro ao carregar a página. Por favor, tente novamente.', 'error');
    } finally {
        isNavigating = false;
    }
}

// Inicializa a aplicação
async function init() {
    try {
        showAlert('Carregando logotipos...', 'info');
        logos = await logosApi.getAll();
        renderLogos(logos);
        populateCategories();
        populateFilterCategories();
        applyFilters();
        showAlert('Logotipos carregados com sucesso!', 'success');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showAlert('Erro ao carregar os logotipos. Por favor, tente novamente.', 'error');
    }
}

// Renderiza os logos em uma tabela
function renderLogos(list) {
    if (!logosGrid) {
        console.error('Elemento logos-grid não encontrado');
        return;
    }

    logosGrid.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
        logosGrid.innerHTML = "<p>Nenhum logotipo encontrado.</p>";
        return;
    }

    // Cria a tabela
    const table = document.createElement('table');
    table.className = 'logos-table';
    
    // Cabeçalho da tabela
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th class="col-logo">Logo</th>
            <th class="col-razao">Razão Social</th>
            <th class="col-fantasia">Nome Fantasia</th>
            <th class="col-cnpj">CNPJ</th>
            <th class="col-celular">Celular</th>
            <th class="col-cidade">Cidade/UF</th>
            <th class="col-categoria">Categoria</th>
            <th class="col-contrato">Contrato</th>
            <th class="col-valor">Valor Contrato</th>
            <th class="col-acoes">Ações</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Corpo da tabela
    const tbody = document.createElement('tbody');
    
    list.forEach((logo) => {
        if (!logo) return; // Pula logos inválidos

        const startDate = logo.startDate ? new Date(logo.startDate) : null;
        const endDate = logo.endDate ? new Date(logo.endDate) : null;
        const formattedStartDate = startDate ? startDate.toLocaleDateString('pt-BR') : 'N/A';
        const formattedEndDate = endDate ? endDate.toLocaleDateString('pt-BR') : 'N/A';
        const status = logo.contractActive ? 'Ativo' : 'Inativo';
        const statusClass = logo.contractActive ? 'active' : 'inactive';
        const dataContrato = logo.contractActive ? `${formattedStartDate} a ${formattedEndDate}` : "Sem contrato";
        const categoria = getCategoryLabelByValue(logo.category) || 'Não definida';
        const valorContrato = logo.contractValue ? formatToMoney(logo.contractValue) : 'N/A';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${logo.imagem || 'placeholder.png'}" alt="Logo de ${logo.clientName}" class="logo-thumbnail" /></td>
            <td>${logo.clientName || 'N/A'}</td>
            <td>${logo.clientFantasyName || 'N/A'}</td>
            <td>${logo.clientCNPJ || 'N/A'}</td>
            <td>${logo.clientPhone || 'N/A'}</td>
            <td>${logo.clientCity ? `${logo.clientCity}/${logo.clientUF}` : 'N/A'}</td>
            <td>${categoria}</td>
            <td class="${statusClass}">${dataContrato}</td>
            <td>${valorContrato}</td>
            <td class="actions">
                <button onclick="editLogo('${logo.id}')" class="edit-btn" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteLogo('${logo.id}')" class="delete-btn" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    logosGrid.appendChild(table);

    // Adiciona mensagem se não houver logos
    if (tbody.children.length === 0) {
        logosGrid.innerHTML = "<p>Nenhum logotipo encontrado.</p>";
    }
}

// Event Listeners
logoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    try {
        const formData = new FormData(logoForm);
        const logoData = {
            clientName: formData.get('client-name'),
            clientFantasyName: formData.get('client-fantasy-name'),
            clientCNPJ: formData.get('client-cnpj'),
            clientPhone: formData.get('client-phone'),
            clientEmail: formData.get('client-email'),
            clientCity: formData.get('client-city'),
            clientUF: formData.get('client-uf'),
            category: formData.get('logo-category'),
            startDate: formData.get('start-date'),
            endDate: formData.get('end-date'),
            contractMonths: formData.get('contract-months'),
            contractValue: formData.get('contract-value'),
            contractActive: formData.get('contract-active') === 'true',
            imagem: formData.get('logo-image-url')
        };

        if (editingIndex) {
            await logosApi.update(editingIndex, logoData);
            showAlert('Logotipo atualizado com sucesso!', 'success');
        } else {
            await logosApi.add(logoData);
            showAlert('Logotipo adicionado com sucesso!', 'success');
        }

        // Recarrega a lista de logos
        logos = await logosApi.getAll();
        renderLogos(logos);
        
        // Limpa o formulário
        logoForm.reset();
        logoForm.querySelector("#logo-preview").style.display = 'none';
        editingIndex = null;
        logoForm.querySelector('.save-btn').textContent = 'Salvar';
        logoForm.querySelector('.save-btn').classList.remove('update');
        
    } catch (error) {
        console.error("Erro ao salvar logo:", error);
        showAlert('Erro ao salvar logotipo. Por favor, tente novamente.', 'error');
    }
});

// Upload de imagem
logoImageInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const result = await logosApi.uploadImage(file);
        logoImageUrl.value = result.imageUrl;
    } catch (error) {
        showAlert('Erro ao fazer upload da imagem: ' + error.message, 'error');
    }
});

// Funções auxiliares
function getCategoryLabelByValue(value) {
    for (const category of categories) {
        if (category.value === value) {
            return category.label;
        }
        const subcategory = category.options.find(option => option.value === value);
        if (subcategory) {
            return subcategory.label;
        }
    }
    return null;
}

function formatToMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Funções globais para edição e exclusão
window.editLogo = function(logoId) {
    const logo = logos.find(l => l.id === logoId);
    if (logo) {
        editingIndex = logoId;
        loadLogoForEdit(logo);
    }
};

window.deleteLogo = async function(logoId) {
    if (confirm('Tem certeza que deseja excluir este logotipo?')) {
        try {
            await logosApi.delete(logoId);
            logos = logos.filter(l => l.id !== logoId);
            renderLogos(logos);
            showAlert('Logotipo excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir logo:', error);
            showAlert('Erro ao excluir logotipo. Por favor, tente novamente.', 'error');
        }
    }
};

// Função para salvar o token
function saveAuthToken(token) {
    console.log('Salvando token no localStorage');
    localStorage.setItem('authToken', token);
    // Dispara um evento personalizado para notificar sobre a mudança
    window.dispatchEvent(new CustomEvent('authTokenChanged', { detail: { token } }));
}

// Adiciona listener para mudanças de autenticação
window.addEventListener('storage', (event) => {
    if (event.key === 'authToken') {
        console.log('Token alterado no localStorage');
        handleNavigation();
    }
});

// Adiciona listener para o evento personalizado
window.addEventListener('authTokenChanged', (event) => {
    console.log('Token alterado via evento personalizado');
    handleNavigation();
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');
    handleNavigation();
});

document.getElementById("btn-upload-image").addEventListener("click", () => {
    document.getElementById("logo-image").click();
});

document.getElementById("logo-image").addEventListener("change", (event) => {    
    const file = event.target.files[0];
    if (file) {
        document.getElementById("logo-image-url").value = file.name;
    }
});

// Funções de máscara e validação (mantidas iguais)
cnpjInput.addEventListener('input', () => formatCNPJ(cnpjInput));

function aplicarMascaraTelefone(input, isCelular = false) {
    input.addEventListener('input', function (e) {
        let valor = input.value.replace(/\D/g, '');
        if (isCelular) {
            // Celular: (00) 00000-0000
            valor = valor.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
        } else {
            // Telefone fixo: (00) 0000-0000
            valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
        }
        input.value = valor;
    });
}

/*Anexar imagem*/
document.getElementById("logo-image").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const result = await logosApi.uploadImage(file);
      document.getElementById("logo-image-url").value = result.imageUrl;
    } catch (error) {
      alert("Erro ao enviar imagem: " + error.message);
    }
});
  
document.addEventListener('DOMContentLoaded', function () {
    const telefoneInput = document.getElementById('telephone');
    const celularInput = document.getElementById('cellphone');
    aplicarMascaraTelefone(telefoneInput);
    aplicarMascaraTelefone(celularInput, true);
});

// Validação de valor do contrato (mantida igual)
const inputValorContrato = document.getElementById('contract_value');
inputValorContrato.addEventListener('input', function (e) {
    e.target.value = formatToMoney(e.target.value);
});

inputValorContrato.addEventListener('focus', function () {
    if (inputValorContrato.value === '0,00') {
        inputValorContrato.value = '';
    }
});

inputValorContrato.addEventListener('blur', function () {
    if (inputValorContrato.value === '') {
        inputValorContrato.value = '0,00';
    }
});

// Validação de email 
const emailInput = document.getElementById('email');
const emailError = document.getElementById('email-error');

function isValidEmail(email) {
  // Expressão regular simples para validação de e-mail
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

emailInput.addEventListener('input', function () {
  if (emailInput.value === '' || isValidEmail(emailInput.value)) {
    emailError.style.display = 'none';
    emailInput.setCustomValidity('');
  } else {
    emailError.style.display = 'block';
    emailInput.setCustomValidity('E-mail inválido');
  }
});

// Carrega os dados de um logo no formulário para edição    
function loadLogoForEdit(logo) {
    console.log('Carregando logo para edição:', logo); // Debug
    
    // Preenche os campos do formulário
    const form = document.getElementById("logo-form");
    form.querySelector("#client-name").value = logo.clientName || '';
    form.querySelector("#client-fantasy-name").value = logo.clientFantasyName || '';
    form.querySelector("#client-cnpj").value = logo.clientCNPJ || '';
    form.querySelector("#client-phone").value = logo.clientPhone || '';
    form.querySelector("#client-email").value = logo.clientEmail || '';
    form.querySelector("#client-city").value = logo.clientCity || '';
    form.querySelector("#client-uf").value = logo.clientUF || '';
    form.querySelector("#logo-category").value = logo.category || '';
    
    // Formata as datas
    if (logo.startDate) {
        const startDate = new Date(logo.startDate);
        form.querySelector("#start-date").value = startDate.toISOString().split('T')[0];
    }
    
    if (logo.endDate) {
        const endDate = new Date(logo.endDate);
        form.querySelector("#end-date").value = endDate.toISOString().split('T')[0];
    }
    
    form.querySelector("#contract-months").value = logo.contractMonths || '';
    form.querySelector("#contract-value").value = logo.contractValue || '';
    
    // Atualiza a imagem do logo
    const logoPreview = form.querySelector("#logo-preview");
    if (logo.imagem) {
        logoPreview.src = logo.imagem;
        logoPreview.style.display = 'block';
    } else {
        logoPreview.src = 'placeholder.png';
        logoPreview.style.display = 'none';
    }

    // Atualiza o botão de salvar
    const saveBtn = form.querySelector('.save-btn');
    saveBtn.textContent = 'Atualizar';
    saveBtn.classList.add('update');

    // Mostra o formulário
    form.style.display = 'block';
    
    // Scroll para o formulário
    form.scrollIntoView({ behavior: 'smooth' });
}

// Filtra e atualiza a lista exibida
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectElement = filterCategory;

    let category = "";
    if (!!selectElement.value) {
        category = selectElement.value;
    }
    
    const filtered = logos.filter(logo => {
        if (!logo) return false;

        const matchesName = (logo.clientName || "").toLowerCase().includes(searchTerm);
        const matchesFantasyName = (logo.clientFantasyName || "").toLowerCase().includes(searchTerm);
        const matchesCNPJ = (logo.clientCNPJ || "").toLowerCase().includes(searchTerm);
        const matchesCity = (logo.clientCity || "").toLowerCase().includes(searchTerm);
        const matchesUF = (logo.clientUF || "").toLowerCase().includes(searchTerm);
        const matchesPlanType = (logo.planType || "").toLowerCase().includes(searchTerm);
        const matchesCategory = category === "" || logo.category === category;
        
        return (matchesPlanType || matchesName || matchesFantasyName || matchesCNPJ || matchesCity || matchesUF) && matchesCategory;
    });

    renderLogos(filtered);
}

function populateCategories() {
    categories.forEach(group => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optgroup.appendChild(optionElement);
        });
        logoCategorySelect.appendChild(optgroup);
    });
}

// Preenche as categorias no filtro também
function populateFilterCategories() {
    categories.forEach(group => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optgroup.appendChild(optionElement);
        });
        filterCategory.appendChild(optgroup);
    });
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
  
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
  
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
  
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
  
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(0)) return false;
  
    tamanho += 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
  
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
  
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(1)) return false;
  
    return true;
}
  
function validarCNPJNoCampo() {
    const input = document.getElementById('client-cnpj');
    const feedback = document.getElementById('cnpj-feedback');
    const cnpj = input.value;
  
    if (cnpj === '') {
      feedback.textContent = '';
      input.style.borderColor = '';
      return;
    }
  
    if (validarCNPJ(cnpj)) {
      feedback.textContent = '';
      input.style.borderColor = 'green';
    } else {
      feedback.textContent = 'CNPJ inválido';
      input.style.borderColor = 'red';
    }
}

// Função para calcular data final baseada na data inicial e meses
function calculateEndDate() {
    if (!startDateInput.value || !contractMonthsSelect.value) return;
    
    const startDate = new Date(startDateInput.value);
    const monthsToAdd = parseInt(contractMonthsSelect.value);
    
    let endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + monthsToAdd);
    
    // Ajuste para o último dia do mês se o dia original não existir no novo mês
    if (startDate.getDate() !== endDate.getDate()) {
        endDate.setDate(0);
    }
    
    const year = endDate.getFullYear();
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const day = String(endDate.getDate()).padStart(2, '0');
    
    endDateInput.value = `${year}-${month}-${day}`;
}

let cnpjDelete = null;
document.getElementById("confirm-delete").addEventListener("click", async () => {
    if (cnpjDelete !== null) {
        try {
            const logoToDelete = logos.find(l => l.clientCNPJ === cnpjDelete);
            if (logoToDelete) {
                // Exclui a imagem do Cloudinary
                await deleteImage(logoToDelete.imagem);

                // Exclui o logo do Firestore
                await deleteLogoFromFirestore(logoToDelete.id);

                // Remove o logo da lista local
                logos = logos.filter(l => l.clientCNPJ !== cnpjDelete);
                
                // Renderiza novamente a lista de logos
                renderLogos(logos);

                showAlert("Excluído com sucesso", "Atenção!", "success");
            }
        } catch (error) {
            console.error("Erro ao excluir logo:", error);
           showAlert("Ocorreu um erro ao excluir. Por favor, tente novamente.","Erro","error");
        }
        cnpjDelete = null;
        document.getElementById("delete-modal").classList.add("hidden");
    }
});

// Outros event listeners
logosGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-btn")) {
        cnpjDelete = e.target.dataset.id;
        document.getElementById("delete-modal").classList.remove("hidden");
    }

    if (e.target.classList.contains("edit-btn")) {
        const cnpjEditar = e.target.dataset.id;
        loadLogoForEdit(logos.find(l => l.id === cnpjEditar));
        document.querySelector('.logo-form-container').scrollIntoView({ behavior: 'smooth' });
    }
});

document.getElementById("cancel-delete").addEventListener("click", () => {
    cnpjDelete = null;
    document.getElementById("delete-modal").classList.add("hidden");
});
  
cancelBtn.addEventListener('click', () => {
    editingIndex = null;
    saveBtn.textContent = 'Salvar';

    const oldPreview = document.getElementById("current-image-preview");
    if (oldPreview) oldPreview.remove();
});

searchInput.addEventListener("input", applyFilters);
filterCategory.addEventListener("change", applyFilters);
startDateInput.addEventListener('change', calculateEndDate);
contractMonthsSelect.addEventListener('change', calculateEndDate);

// Função para formatar CNPJ
function formatCNPJ(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    if (value.length > 12) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4}).*/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
        value = value.replace(/^(\d{2})(\d{3})(\d{3}).*/, '$1.$2.$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{3}).*/, '$1.$2');
    }
    
    input.value = value;
}