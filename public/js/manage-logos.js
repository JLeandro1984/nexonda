import { loginFirebaseCustomToken } from './auth.js';
import { logosApi } from './api.js';
import { categories } from './categories.js';
import { ufs } from './ufs.js';
import { showAlert } from '../components/alert.js';
import { uploadToFirebaseStorage, deleteFromFirebaseStorage, showMediaPreview, logout, onAuthChanged } from './firebase-upload.js';

// Elementos DOM
const logoForm = document.getElementById("logo-form");
const logosGrid = document.getElementById("logos-grid");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const logoCategorySelect = document.getElementById("logo-category");
const ufSelect = document.getElementById('client-uf');
const cnpjInput = document.getElementById("client-CNPJ");
const documentType =document.getElementById('document-type');
const cepInput = document.getElementById('client-cep');
const saveBtn = document.querySelector('.save-btn');
const cancelBtn = document.querySelector('.cancel-btn');
const startDateInput = document.getElementById('start-date');
const contractMonthsSelect = document.getElementById('contract-months');
const endDateInput = document.getElementById('end-date');
const logoImageInput = document.getElementById("logo-image");
const logoImageUrl = document.getElementById("logo-image-url");
let emailUser = "";

let editingIndex = null;
let editingDeleteToken = null;
let editingStoragePath = null;
let logos = [];
let isNavigating = false;

// Estado global de autenticação
let authState = {
    isChecking: false,
    isAuthenticated: false,
    user: null
};

console.log('manage-logos.html carregado');
console.log('window.location.origin:', window.location.origin);
console.log('window.location.href:', window.location.href);
console.log('Token no localStorage:', localStorage.getItem('authToken') ? 'Presente' : 'Ausente');

// Aviso se o domínio/porta não for igual ao esperado
const expectedOrigin = 'http://localhost:5000'; // ajuste conforme seu ambiente
if (window.location.origin !== expectedOrigin) {
    console.warn('ATENÇÃO: O domínio/porta atual não é o mesmo do login! localStorage pode não ser compartilhado.');
}

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


    function habilitarTodosOsHorarios() {
        document.querySelectorAll('.opening-day input[type="time"]').forEach(input => {
            input.disabled = false;
        });
    }

// Função para verificar se o usuário está autenticado
async function checkAuth() {
    if (authState.isChecking) return authState.isAuthenticated;
    authState.isChecking = true;

    try {
        console.log('Verificando autenticação...');
        
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
        console.log('Token no localStorage:', token ? 'Presente' : 'Ausente');
        
        if (!token) {
            console.log('Token não encontrado no localStorage');
            authState.isAuthenticated = false;            
            return false;
        }

        console.log('Enviando requisição para verificar token...');
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authenticate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Resposta da verificação:', response.status);
        if (!response.ok) {
            console.log('Token inválido, removendo do localStorage');
            localStorage.removeItem('authToken');
            authState.isAuthenticated = false;
            return false;
        }

        const data = await response.json();
        console.log('Dados da verificação:', data);

        if (data.authorized) {
            // Decodifica o token e salva o nome do usuário
            const decodedToken = decodeJwt(token);
            if (decodedToken && decodedToken.name) {
                localStorage.setItem('userName', decodedToken.name);
                localStorage.setItem('userEmail', decodedToken.email);
                emailUser = decodedToken.email;
                console.log('Usuário autenticado:', decodedToken.name);
            }
            authState.isAuthenticated = true;
            return true;
        }
        
        console.log('Usuário não autorizado');
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
    console.log('Iniciando verificação de autenticação...');
    const isAuthenticated = await checkAuth();
    console.log('Está autenticado:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('Usuário não autenticado, redirecionando para login');
      showAlert('Erro de autenticação. Por favor, faça login novamente.', 'error');
      return;
    }

    // Aqui pegue o token externo (o mesmo que valida em checkAuth)
    const token = localStorage.getItem('authToken');
    console.log('Token obtido do localStorage, fazendo login Firebase...');
    
    // Faça o login Firebase com custom token
    await loginFirebaseCustomToken(token);
    console.log('Usuário autenticado no Firebase com sucesso');

    // Agora inicializa a página, com Firebase Auth ativo
    await init();

  } catch (error) {
    console.error('Erro no handleNavigation:', error);
    
    if (error.message && error.message.includes('autenticação')) {
      showAlert('Erro de autenticação. Faça login novamente.', 'error');
      window.location.href = 'login.html';
    } else {
      showAlert('Erro ao carregar a página: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  } finally {
    isNavigating = false;
  }
}

// Inicializa a aplicação
async function init() {
    try {
        console.log('Iniciando carregamento de logotipos...');
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('Token de autenticação não encontrado');
            showAlert('Você não está autenticado. Faça login novamente.', 'error');
            window.location.href = 'login.html';
            return;
        }

        // Tenta buscar os logos
        let logosResponse = [];
        try {
            logosResponse = await logosApi.getAll();
            if (!Array.isArray(logosResponse)) {
                logosResponse = [];
            }
        } catch (error) {
            // Se o erro for 404 ou similar, trata como lista vazia
            console.warn('Nenhum logotipo encontrado ou erro ao buscar:', error);
            logosResponse = [];
        }

        logos = logosResponse;
        console.log('Logotipos carregados:', logos.length);

        renderLogos(logos);
        populateCategories();
        populateFilterCategories();
        applyFilters();

        console.log('Inicialização concluída com sucesso');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showAlert('Erro ao carregar os logotipos: ' + (error.message || 'Erro desconhecido'), 'error');
    }
}

// Renderiza os logos em uma tabela
function renderLogos(list) {
    console.log('Renderizando logotipos:', list?.length || 0);
    
    if (!logosGrid) {
        console.error('Elemento logos-grid não encontrado');
        return;
    }

    logosGrid.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
        console.log('Nenhum logotipo encontrado para exibir');
        logosGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 20px; color: #ccc;"></i>
                <h3>Nenhum logotipo encontrado</h3>
                <p>Adicione seu primeiro logotipo usando o formulário acima.</p>
            </div>
        `;
        return;
    }

    console.log('Criando tabela com', list.length, 'logotipos');

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
    
    list.forEach((logo, index) => {
        if (!logo) {
            console.warn('Logo inválido encontrado no índice:', index);
            return; // Pula logos inválidos
        }
       
        const startDate = logo.startDate ? new Date(logo.startDate) : null;
        const endDate = logo.endDate ? new Date(logo.endDate) : null;
        const formattedStartDate = startDate ? startDate.toLocaleDateString('pt-BR') : 'N/A';
        const formattedEndDate = endDate ? endDate.toLocaleDateString('pt-BR') : 'N/A';
        const status = logo.contractActive ? 'Ativo' : 'Inativo';
        const statusClass = logo.contractActive ? 'active' : 'inactive';
        const dataContrato = logo.contractActive ? `${formattedStartDate} a ${formattedEndDate}` : "Sem contrato";
        const categoria = getCategoryLabelByValue(logo.logoCategory) || 'Não definida';
        const valorContrato = logo.contractValue ? logo.contractValue : '0,00';
            
        const imageSrc = logo.imageUrl || logo.imagem || '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${imageSrc || ''}" alt="Logo de ${logo.clientName}" class="logo-thumbnail" /></td>
            <td>${logo.clientName || 'N/A'}</td>
            <td>${logo.clientFantasyName || 'N/A'}</td>
            <td>${logo.clientCNPJ || 'N/A'}</td>
            <td>${logo.cellphone || 'N/A'}</td>
            <td>${logo.clientCity ? `${logo.clientCity}/${logo.clientUf}` : 'N/A'}</td>
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
    
    // Totalizador do valor de contrato
    const totalContrato = list.reduce((acc, logo) => {
      let valor = 0;
      if (logo.contractValue) {
        // Aceita tanto número quanto string (com vírgula ou ponto)
        valor = Number(String(logo.contractValue).replace(/\./g, '').replace(',', '.')) || 0;
      }
      return acc + valor;
    }, 0);
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: right; font-weight: 600; font-size: 1.08rem; color: var(--primary-color); background: #f6faff;">Total do Valor de Contrato:</td>
        <td style="font-weight: bold; color: #2563eb; background: #f6faff;">R$ ${totalContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="background: #f6faff;"></td>
      </tr>
    `;
    table.appendChild(tfoot);

    table.appendChild(tbody);
    
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'logos-table-responsive';
    tableWrapper.appendChild(table);
    logosGrid.appendChild(tableWrapper);
    
    console.log('Tabela de logotipos renderizada com sucesso');
}
   
function contratoAtivo(logo) {
        const endDate = new Date(logo.endDate);
        const today = new Date();
    
            // Zera o horário de hoje para comparação apenas por data (opcional)
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
    
        if (endDate < today) return false;
    
        if (!logo.contractActive) return false; 
        
    
        return true
}
    
// Event Listeners
logoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    //adicionarHttpsNosUrls();  
    
    const saveBtn = logoForm.querySelector('.save-btn');
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

    // Mostrar spinner e desabilitar botão
    saveBtn.disabled = true;
    btnText.textContent = 'Salvando...';
    spinner.classList.remove('hidden');

    try {
        const formData = new FormData(logoForm);
        const logoData = {};
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);

                if (key === 'contract-active' || key === 'show-address-active') {
                    logoData[toCamelCase(key)] = value === 'true';
                } else {
                    logoData[toCamelCase(key)] = value;
                }
            }
        // Campos que não vêm do formulário diretamente:
        logoData.openingHours = obterHorarioFuncionamento();
             
        if (!logoData.openingHours) return;

        /* 🔽 LIMPEZA DOS CAMPOS OPCIONAIS */
        //ex: if (!logoData.contractMonths) delete logoData.contractMonths;
        //ex:  if (!logoData.contractValue) delete logoData.contractValue;
        
        const file = logoImageInput.files[0];
        debugger;  
       if (file) {
            // Se estiver editando e houver uma imagem anterior, exclui do Firebase Storage
            if (editingIndex && editingStoragePath) {
                try {                                       
                    await deleteFromFirebaseStorage(editingStoragePath);
                } catch (error) {
                    console.error("Não foi possível excluir imagem anterior:", error);
                }
            }

            try {
                // Faz upload da nova imagem para Firebase Storage
                const { url: newUrl, fullPath } = await uploadToFirebaseStorage(file, "logos");
                
                logoData.imageUrl = newUrl;
                logoData.storagePath = fullPath;
            } catch (err) {
                showAlert("Erro ao fazer upload da nova imagem: " + err.message + " Por favor, tente novamente.", "error");
                return; 
            }
        }
                        
        if (editingIndex) {
            const logo = logos.find(l => l.id === editingIndex);
              logoData.id = editingIndex;

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
        logoForm.querySelector("#logo-preview_img").style.display = 'none';
        editingIndex = null;
        editingDeleteToken = null;
        editingStoragePath = null;
        saveBtn.classList.remove('update');

    } catch (error) {
        console.error("Erro ao salvar logo:", error);
        showAlert('Erro ao salvar logotipo. Por favor, tente novamente.', 'error');
    } finally {
        // Restaurar botão
        saveBtn.disabled = false;
        btnText.textContent = editingIndex ? 'Atualizar' : 'Salvar';
        spinner.classList.add('hidden');        
        habilitarTodosOsHorarios();
    }
});

function toCamelCase(str) {
    return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
}

document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('btn-upload-image');
    const inputFile = document.getElementById('logo-image');
    const imageUrl = document.getElementById("logo-image-url");

    btn.addEventListener("click", () => {
        inputFile.click();
    });

    inputFile.addEventListener("change", (event) => {    
        const file = event.target.files[0];
        const logoPreview = document.getElementById("logo-preview_img");

        if (file) {
            // Atualiza o campo de texto com o nome do arquivo
            imageUrl.value = file.name;

            // Pré-visualização
            const reader = new FileReader();
            reader.onload = function (e) {
            logoPreview.src = e.target.result;
            logoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            // Nenhum arquivo selecionado
            imageUrl.value = '';
            logoPreview.src = '';
            logoPreview.style.display = 'none';
        }
    });
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

// Funções globais para edição e exclusão
window.editLogo = function (logoId) {
    const logo = logos.find(l => l.id === logoId);
    if (logo) {
        editingIndex = logoId;
        loadLogoForEdit(logo);
    }

     // Scroll suave para a div do formulário
        const formSection = document.querySelector('#logo-form');
        if (formSection) {
            formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Se desejar, também pode dar foco no primeiro input do formulário:
        document.getElementById('client-name')?.focus();
};

window.deleteLogo = function (logoId, logoName = 'este logotipo') {
  showConfirm(
    `Deseja realmente excluir ${logoName}? Esta ação não poderá ser desfeita.`,
    'Confirmar exclusão',
    'warning',
    async () => {
      try {
        const logo = logos.find(l => l.id === logoId);
        const deleteToken = logo?.deleteToken || null;
        const storagePath = logo?.storagePath || null;

        // Remove do Firestore
        await logosApi.delete(logoId);

        // Tenta remover do Firebase Storage, se houver path válido
        if (storagePath) {
            try {
                await deleteFromFirebaseStorage(storagePath);
            } catch (error) {
                console.error("Erro ao deletar do Firebase Storage:", error);
            }
        }

        // Atualiza a lista e re-renderiza
        logos = logos.filter(l => l.id !== logoId);
        renderLogos(logos);

        showAlert('Logotipo excluído com sucesso!', 'Sucesso', 'success');
      } catch (error) {
        console.error('Erro ao excluir logotipo:', error);
        showAlert('Erro ao excluir logotipo. Por favor, tente novamente.', 'Erro', 'error');
      }
    },
    () => {
      console.log('Exclusão cancelada pelo usuário.');
    }
  );
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

// Funções de máscara e validação (mantidas iguais)
cnpjInput.addEventListener('input', function () {
    const type = documentType.value;
debugger
    let value = cnpjInput.value.replace(/\D/g, ''); // Remove tudo que não é dígito

      if (type === 'cnpj') {
      value = value.slice(0, 14);
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
        
    } else if (type === 'cpf') {
      value = value.slice(0, 11);
      value = value.replace(/^(\d{3})(\d)/, '$1.$2');
      value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1-$2');
    }

    cnpjInput.value = value;
});


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
  
document.addEventListener('DOMContentLoaded', function () {
    const telefoneInput = document.getElementById('telephone');
    const celularInput = document.getElementById('cellphone');
    const clientWhatsappInput = document.getElementById('client-whatsapp');

    aplicarMascaraTelefone(telefoneInput);
    aplicarMascaraTelefone(celularInput, true);
    aplicarMascaraTelefone(clientWhatsappInput, true);
});

// Validação de valor do contrato (mantida igual)
const inputValorContrato = document.getElementById('contract_value');

inputValorContrato.addEventListener('input', (e) => {
  let value = e.target.value;

  // Remove tudo que não for número
  value = value.replace(/\D/g, '');

  // Converte para centavos (divide por 100)
  const numericValue = parseFloat(value) / 100;

  // Aplica formatação brasileira (sem R$)
  e.target.value = formatToMoneyNoSymbol(numericValue);
});

inputValorContrato.addEventListener('blur', (e) => {
  if (!e.target.value || e.target.value === '0,00') {
    e.target.value = '0,00';
  }
});

inputValorContrato.addEventListener('focus', () => {
  if (inputValorContrato.value === '0,00') {
    inputValorContrato.value = '';
  }
});

function formatToMoneyNoSymbol(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatToMoney(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}


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

function detectDocumentType(documentoCliente) {
  let value = documentoCliente.replace(/\D/g, ''); // Remove tudo que não é número

  let type = '';
  if (value.length === 14) {
    type = 'cnpj';
  } else if (value.length === 11) {
    type = 'cpf';
  } else {
    type = 'outro';
  }

  return type;
}

// Carrega os dados de um logo no formulário para edição    
function loadLogoForEdit(logo) {
  console.log('Carregando logo para edição:', logo); // Debug

  const form = document.getElementById("logo-form");

  // Informações básicas
  form.querySelector("#client-name").value = logo.clientName || '';
  form.querySelector("#client-fantasy-name").value = logo.clientFantasyName || '';

  // Documento (tipo + número formatado)
  const docTypeEl = form.querySelector("#document-type");
  const docInputEl = form.querySelector("#client-CNPJ");
  //const docType = logo.documentType || 'outro';
  const docValue = logo.clientCNPJ || '';

  const docType = detectDocumentType(docValue);
  docTypeEl.value = docType;

  // Dispara evento de alteração para atualizar label, placeholder etc.
  const changeEvent = new Event("change");
  docTypeEl.dispatchEvent(changeEvent);

  // Aplica a formatação conforme o tipo
  if (docType === "cnpj") {
    docInputEl.value = formatCNPJ(docValue);
  } else if (docType === "cpf") {
    docInputEl.value = formatCPF(docValue);
  } else {
    docInputEl.value = docValue;
  }

  // Endereço
  form.querySelector("#client-cep").value = logo.clientCep || '';
  form.querySelector("#client-address").value = logo.clientAddress || '';
  form.querySelector("#client-number").value = logo.clientNumber || '';
  form.querySelector("#client-neighborhood").value = logo.clientNeighborhood || '';
  form.querySelector("#client-city").value = logo.clientCity || '';
  form.querySelector("#client-uf").value = logo.clientUf || '';
  form.querySelector("#client-lat").value = logo.clientLat || '';
  form.querySelector("#client-lng").value = logo.clientLng || '';

  // Contatos
  form.querySelector("#telephone").value = logo.telephone || '';
  form.querySelector("#cellphone").value = logo.cellphone || '';
  form.querySelector("#email").value = logo.email || '';

  // URLs
  form.querySelector("#client-website").value = logo.websiteUrl || logo.clientWebsite || '';
  form.querySelector("#client-videoUrl").value = logo.videoUrl || logo.clientVideoUrl || '';
  form.querySelector("#client-instagramUrl").value = logo.instagramUrl || logo.clientInstagramUrl || '';
  form.querySelector("#client-facebookUrl").value = logo.facebookUrl || logo.clientFacebookUrl || '';
  form.querySelector("#client-whatsapp").value = logo.clientWhatsapp || '';

  // Categoria e descrição
  form.querySelector("#logo-category").value = logo.logoCategory || '';
  form.querySelector("#logo-description").value = logo.description || logo.logoDescription || '';

  // Contrato
  if (logo.startDate) {
    const startDate = new Date(logo.startDate);
    form.querySelector("#start-date").value = startDate.toISOString().split('T')[0];
  }

  if (logo.endDate) {
    const endDate = new Date(logo.endDate);
    form.querySelector("#end-date").value = endDate.toISOString().split('T')[0];
  }

  form.querySelector("#contract-months").value = logo.contractMonths || '';
  form.querySelector("#plan_type").value = logo.planType || '';
  form.querySelector("#client_level").value = logo.clientLevel || '';
  form.querySelector("#contract_value").value = logo.contractValue || '';

  // Radio buttons
  if (logo.contractActive !== undefined) {
    const activeValue = logo.contractActive.toString();
    form.querySelector(`input[name="contract-active"][value="${activeValue}"]`).checked = true;
  }

  if (logo.showAddressActive !== undefined) {
    const showAddressValue = logo.showAddressActive.toString();
    form.querySelector(`input[name="show-address-active"][value="${showAddressValue}"]`).checked = true;
  }

  // Horário de funcionamento
  if (logo.openingHours) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
      const dayData = logo.openingHours[day];
      if (dayData) {
        const startEl = form.querySelector(`#${day}-start`);
        const lunchStartEl = form.querySelector(`#${day}-lunch-start`);
        const lunchEndEl = form.querySelector(`#${day}-lunch-end`);
        const endEl = form.querySelector(`#${day}-end`);
        const closedEl = form.querySelector(`#${day}-closed`);

        startEl.value = dayData.start || '';
        lunchStartEl.value = dayData.lunch_start || '';
        lunchEndEl.value = dayData.lunch_end || '';
        endEl.value = dayData.end || '';
        closedEl.checked = dayData.closed || false;

        // Aplica o 'disabled' aos time inputs se o dia estiver marcado como fechado
        const isClosed = closedEl.checked;
        [startEl, lunchStartEl, lunchEndEl, endEl].forEach(input => {
          input.disabled = isClosed;
        });
      }
    });
  }
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
        const matchesUF = (logo.clientUf || "").toLowerCase().includes(searchTerm);
        const matchesPlanType = (logo.planType || "").toLowerCase().includes(searchTerm);
        const matchesCategory = category === "" || logo.logoCategory === category;
        
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

// Função para calcular data de término baseada na data de início e meses do contrato
function calculateEndDate() {
    const startDate = startDateInput.value;
    const months = contractMonthsSelect.value;
    
    if (startDate && months) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(months));
        endDateInput.value = endDate.toISOString().split('T')[0];
    }
}

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

  document.querySelectorAll('.opening-day').forEach((dayDiv) => {
    const checkbox = dayDiv.querySelector('input[type="checkbox"]');
    const timeInputs = dayDiv.querySelectorAll('input[type="time"]');

    checkbox.addEventListener('change', () => {
      const isClosed = checkbox.checked;
      timeInputs.forEach(input => input.disabled = isClosed);
    });
  });


 function obterHorarioFuncionamento() {
  const diasDaSemana = [
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  ];

  const horarios = {};
  let valido = true;
  let diaInvalido = '';

  diasDaSemana.forEach((dia) => {
    const startEl = document.getElementById(`${dia}-start`);
    const lunchStartEl = document.getElementById(`${dia}-lunch-start`);
    const lunchEndEl = document.getElementById(`${dia}-lunch-end`);
    const endEl = document.getElementById(`${dia}-end`);
    const closed = document.getElementById(`${dia}-closed`).checked;

    const start = startEl.value.trim();
    const lunchStart = lunchStartEl.value.trim();
    const lunchEnd = lunchEndEl.value.trim();
    const end = endEl.value.trim();

    // Valida apenas o início e fim principais, almoço pode ser vazio
    if (!closed && (!start || !end)) {
      valido = false;
      diaInvalido = dia;

      // Marca erro apenas nos obrigatórios
      [startEl, endEl].forEach(el => {
        if (!el.value.trim()) el.classList.add('erro');
        else el.classList.remove('erro');
      });
    } else {
      // Remove erros
      [startEl, endEl, lunchStartEl, lunchEndEl].forEach(el => el.classList.remove('erro'));
    }

    horarios[dia] = {
      start: closed ? null : start,
      lunch_start: closed ? null : lunchStart || null,
      lunch_end: closed ? null : lunchEnd || null,
      end: closed ? null : end,
      closed: closed
    };
  });

  if (!valido) {
    showAlert(`Preencha os horários corretamente para: ${diaInvalido}`, 'warning');
    return null;
  }

  return horarios;
}
  
//Apis para Obter "CNPJ" e "CPF"
async function fetchCNPJData(cnpj) {
  try {
    // Usando outro serviço de proxy
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`)}`);
    const data = await response.json();
    const parsedData = JSON.parse(data.contents);
    if (parsedData.status === 'ERROR') throw new Error(parsedData.message || 'CNPJ inválido ou não encontrado');
    return parsedData;
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    return null;
  }
}

async function fetchCEPData(cep) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) throw new Error('CEP inválido');
    return data;
  } catch (error) {
    return null;
  }
}

// Função para formatar CNPJ
function formatCNPJ(value) {
    value = value.replace(/\D/g, '');
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
    
    return value;
}

function formatCPF(value) {
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);

  if (value.length > 9) {
    value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
  } else if (value.length > 6) {
    value = value.replace(/^(\d{3})(\d{3})(\d{3}).*/, '$1.$2.$3');
  } else if (value.length > 3) {
    value = value.replace(/^(\d{3})(\d{3}).*/, '$1.$2');
  }

  return value;
}

function limparCamposEndereco() {
  document.getElementById('client-address').value = '';
  document.getElementById('client-neighborhood').value = '';
  document.getElementById('client-city').value = '';
  document.getElementById('client-uf').value = '';
}

document.getElementById('client-CNPJ').addEventListener('blur', async function () {
  const cnpjInput = this;
  let cnpj = cnpjInput.value.replace(/\D/g, '');

  const feedback = document.getElementById('cnpj-feedback');
  feedback.textContent = '';

  const type = documentType.value;

   if (type = "cpf") {    
    if (cnpj.length !== 11) {
      feedback.textContent = 'CPF deve conter 11 dígitos.';
     // limparCamposEndereco();
      return;
    }

     // Formata visualmente
     cnpjInput.value = formatCPF(cnpj);
  }
  else if (type = "cnpj") {
      if (cnpj.length !== 14) {
        feedback.textContent = 'CNPJ deve conter 14 dígitos.';
        limparCamposEndereco();
        return;
      }
  
    // Formata visualmente
    cnpjInput.value = formatCNPJ(cnpj);
    
    // Busca dados pelo CNPJ
    const cnpjData = await fetchCNPJData(cnpj);
    if (cnpjData) {
      // Preenche campos
      document.getElementById('client-name').value = cnpjData.nome || '';
      document.getElementById('client-fantasy-name').value = cnpjData.fantasia || '';
      document.getElementById('client-cep').value = cnpjData.cep ? cnpjData.cep.replace(/\D/g, '') : '';
      document.getElementById('client-address').value = cnpjData.logradouro || '';
      document.getElementById('client-number').value = cnpjData.numero || '';
      document.getElementById('client-neighborhood').value = cnpjData.bairro || '';
      document.getElementById('client-city').value = cnpjData.municipio || '';
      document.getElementById('client-uf').value = cnpjData.uf || '';
      
      // Se o CEP foi preenchido, tenta completar qualquer informação faltante
      const cep = document.getElementById('client-cep').value.replace(/\D/g, '');
      if (cep.length === 8 && (!cnpjData.logradouro || !cnpjData.bairro)) {
        const cepData = await fetchCEPData(cep);
        if (cepData) {
          if (!cnpjData.logradouro) document.getElementById('client-address').value = cepData.logradouro || '';
          if (!cnpjData.bairro) document.getElementById('client-neighborhood').value = cepData.bairro || '';
          if (!cnpjData.municipio) document.getElementById('client-city').value = cepData.localidade || '';
          if (!cnpjData.uf) document.getElementById('client-uf').value = cepData.uf || '';
        }
      }
              
      obterCoordenadasGoogle();
    } else {
      feedback.textContent = 'CNPJ não encontrado. Verifique os dados.';
      limparCamposEndereco();
    }
  }
});

// Adicionando evento para o CEP também
document.getElementById('client-cep').addEventListener('blur', async function() {
  const cepInput = this;
  const cep = cepInput.value.replace(/\D/g, '');
  
  if (cep.length === 8) {
    const cepData = await fetchCEPData(cep);
    if (cepData) {
      document.getElementById('client-address').value = cepData.logradouro || '';
      document.getElementById('client-neighborhood').value = cepData.bairro || '';
      document.getElementById('client-city').value = cepData.localidade || '';
      document.getElementById('client-uf').value = cepData.uf || '';
    }      
      obterCoordenadasGoogle();
  }
});

function validarCamposEndereco() {
  const endereco = document.getElementById('client-address').value.trim();
  const numero = document.getElementById('client-number').value.trim();
  const cidade = document.getElementById('client-city').value.trim();
  const uf = document.getElementById('client-uf').value.trim();

  if (!endereco || !numero || !cidade || !uf) {
    return false;
  }

  return true;
}

//Geolocalização
const API_KEY = 'AIzaSyATHcGkTrYUT5JwthjyPlRzXotvRfK8zCk'; 
async function obterCoordenadasGoogle() {
    if (!validarCamposEndereco()) return;
    debugger
    const endereco = [
      document.getElementById('client-address').value,
      document.getElementById('client-number').value,
      document.getElementById('client-city').value,
      document.getElementById('client-uf').value,
      'Brasil',
    ]
      .filter(Boolean)
      .join(', ');

    if (!endereco) return;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      endereco
    )}&key=${API_KEY}`;
     
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const { lat, lng } = data.results[0].geometry.location;
        document.getElementById('client-lat').value = lat;
        document.getElementById('client-lng').value = lng;
      } else {
        console.error('Erro:', data.status);
        showAlert('Endereço não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      showAlert('Erro ao buscar coordenadas.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
  const cancelButton = document.getElementById('btn-cancelar');

    if (cancelButton) {
        cancelButton.addEventListener('click', (e) => {
        e.preventDefault(); // Opcional: impede o reset automático do formulário
        console.log('Botão Cancelar clicado');

            const previewImg = document.getElementById('logo-preview_img');

            if (previewImg) {
            previewImg.src = '';
            previewImg.style.display = 'none';
            }
            
         habilitarTodosOsHorarios();
        const form = cancelButton.closest('form');
        if (form) form.reset();
        });
    }
  });

  // Sugestão: rodar ao sair do campo UF ou ao clicar em botão
    document.getElementById('client-uf').addEventListener('blur', obterCoordenadasGoogle);
    document.getElementById('client-number').addEventListener('blur', obterCoordenadasGoogle);
    document.getElementById('client-city').addEventListener('blur', obterCoordenadasGoogle);
 
// Inicialização da página quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    
    // Verifica se estamos na página correta
    if (window.location.pathname.includes('manage-logos.html')) {
        console.log('Página manage-logos detectada, iniciando navegação...');
        handleNavigation();
    }
});

document.addEventListener('DOMContentLoaded', () => {
  const documentType = document.getElementById('document-type');
  const label = document.getElementById('document-label');
  const input = document.getElementById('client-CNPJ');

  documentType.addEventListener('change', () => {
    const type = documentType.value;
    if (type === 'cnpj') {
      label.textContent = 'CNPJ:';
      input.placeholder = '00.000.000/0000-00';
      input.maxLength = 18;
    } else if (type === 'cpf') {
      label.textContent = 'CPF:';
      input.placeholder = '000.000.000-00';
      input.maxLength = 14;
    } else {
      label.textContent = 'Documento do Cliente:';
      input.placeholder = 'Digite o documento';
      input.removeAttribute('maxLength');
    }

    input.value = '';
  });
});


// Função para extrair o path do Firebase Storage da URL
function extractFirebasePathFromUrl(url) {
  const decodedUrl = decodeURIComponent(url);
  const matches = decodedUrl.match(/\/o\/(.*?)\?alt/);
  return matches ? matches[1] : null;
}
 