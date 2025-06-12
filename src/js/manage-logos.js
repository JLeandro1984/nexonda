import { logosApi } from './api.js';
import { categories } from './categories.js';
import { ufs } from './ufs.js';
import { showAlert } from '../components/alert.js';


// Elementos DOM
const logoForm = document.getElementById("logo-form");
const logosGrid = document.getElementById("logos-grid");
const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const logoCategorySelect = document.getElementById("logo-category");
const ufSelect = document.getElementById('client-uf');
const cnpjInput = document.getElementById("client-CNPJ");
const cepInput = document.getElementById('client-cep');
const saveBtn = document.querySelector('.save-btn');
const cancelBtn = document.querySelector('.cancel-btn');
const startDateInput = document.getElementById('start-date');
const contractMonthsSelect = document.getElementById('contract-months');
const endDateInput = document.getElementById('end-date');
const logoImageInput = document.getElementById("logo-image");
const logoImageUrl = document.getElementById("logo-image-url");
let emailUser = "";

document.addEventListener('DOMContentLoaded', function () {
 // INICIO - Função para inicializar o widget de upload do Cloudinary
        const YOUR_UPLOAD_PRESET = "brandConnectPresetName";
        const YOUR_CLOUD_NAME = "dmq4e5bm5";

        async function uploadImageToCloudinary(file) {
           
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", YOUR_UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${YOUR_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (data.secure_url) {
                return {
                    imageUrl: data.secure_url,
                    deleteToken: data.delete_token // útil se você ativou "Retornar token de exclusão"
                };
            } else {
                throw new Error("Erro ao fazer upload da imagem para o Cloudinary.");
            }

            
            if (data.delete_token) {
                console.log("Token de exclusão recebido:", data.delete_token);
            }
        }
        // Tornando a função visível globalmente (para onclick do HTML)
        window.uploadImageToCloudinary = uploadImageToCloudinary;
        
       async function deleteLogoFromCloudinary(deleteToken) {
            if (!deleteToken) {
                console.warn("Token de exclusão não fornecido. Ignorando.");
                return;
            }

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${YOUR_CLOUD_NAME}/delete_by_token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({ token: deleteToken })
                });

                const data = await response.json();

                if (data.result === "ok") {
                    console.log("Imagem excluída com sucesso.");

                } else if (data?.error?.message.includes('Stale request - reported time is')) {
                    console.warn("Token de exclusão vencido:", data);
                }                
                else {
                    console.warn("Não foi possível excluir a imagem do Cloudinary:", data);
                }
            } catch (error) {
                console.error("Erro na requisição ao Cloudinary:", error);
                // Também não propaga erro — só loga
            }
        }

    
    window.deleteLogoFromCloudinary = deleteLogoFromCloudinary;
    // FIM - Função para inicializar o widget de upload do Cloudinary
 });

let editingIndex = null;
let editingDeleteToken = null;
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
debugger
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
           // authState.isAuthenticated = false;            
            window.location.href = 'login.html';
            //return false;
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
                localStorage.setItem('userEmail', decodedToken.email);
                emailUser = decodedToken.email;
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
        logos = await logosApi.getAll();
        renderLogos(logos);
        populateCategories();
        populateFilterCategories();
        applyFilters();
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
        const valorContrato = logo.contractValue ? logo.contractValue : '0,00';
            
        const imageSrc = logo.imageUrl || logo.imagem || '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${imageSrc || 'placeholder.png'}" alt="Logo de ${logo.clientName}" class="logo-thumbnail" /></td>
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
   
       // Inicializa totalContractValue como 0
        let totalContractValue = 0;

        // Itera pela lista para somar os valores dos contratos
        list.forEach(logo => {
            const contractValue = !logo.contractValue || !contratoAtivo(logo) ? 0 : parseFloat(logo.contractValue?.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;            
            if (!isNaN(contractValue)) {
                totalContractValue += contractValue;
            }
        });
        
        // Adiciona uma linha com o total geral da coluna "Valor Contrato"
        const totalRow = document.createElement('tr');
        totalRow.innerHTML = `
            <td colspan="8" class="lbl-valor-contrato">Total Geral:</td>
            <td id="table-valor-contrato">${totalContractValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td></td>
        `;
    tbody.appendChild(totalRow);

    table.appendChild(tbody);
    logosGrid.appendChild(table);

    // Adiciona mensagem se não houver logos
    if (tbody.children.length === 0) {
        logosGrid.innerHTML = "<p>Nenhum logotipo encontrado.</p>";
    }
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
        
                  
          /* 🔽 LIMPEZA DOS CAMPOS OPCIONAIS */
           //ex: if (!logoData.contractMonths) delete logoData.contractMonths;
        //ex:  if (!logoData.contractValue) delete logoData.contractValue;
        
        const file = logoImageInput.files[0];
                
       if (file) {
            // Se estiver editando e houver uma imagem anterior com deleteToken, exclui do Cloudinary
            if (editingIndex && editingDeleteToken) {
                try {                                       
                    await deleteLogoFromCloudinary(editingDeleteToken);
                } catch (error) {
                    showAlert("Não foi possível excluir imagem anterior:" + error, "error");
                }
            }

            // Faz upload da nova imagem
            const { imageUrl: newUrl, deleteToken: newToken } = await uploadImageToCloudinary(file);
            logoData.imageUrl = newUrl;
            logoData.deleteToken = newToken;
        }
                        
        if (editingIndex) {
            const logo = logos.find(l => l.id === editingIndex);
              //logoData.deleteToken = logo.deleteToken
             // logoData.imageUrl = logo.imageUrl
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
        saveBtn.classList.remove('update');

    } catch (error) {
        console.error("Erro ao salvar logo:", error);
        showAlert('Erro ao salvar logotipo. Por favor, tente novamente.', 'error');
    } finally {
        // Restaurar botão
        saveBtn.disabled = false;
        btnText.textContent = editingIndex ? 'Atualizar' : 'Salvar';
        spinner.classList.add('hidden');
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
            logoPreview.src = 'placeholder.png';
            logoPreview.style.display = 'none';
        }
    });

});

// logoImageInput.addEventListener("change", async (event) => {
//   const file = event.target.files[0];
//   if (!file) return;
  
//   const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
//   const maxSize = 5 * 1024 * 1024;

//   if (!validTypes.includes(file.type)) {
//       showAlert('Tipo de arquivo inválido. Use JPG, PNG ou GIF.', 'error');
//       return;
//   }

//   if (file.size > maxSize) {
//       showAlert('Arquivo muito grande. Tamanho máximo: 5MB.', 'error');
//       return;
//   }

//   try {
//       const reader = new FileReader();
//       reader.onloadend = async () => {
//           const base64Image = reader.result; // já com "data:image/png;base64,..."

//           if (!emailUser) {
//               showAlert('Usuário não autenticado', 'error');
//               return;
//           }

//           // Usar publicId único para usuário e logo, pode ser por exemplo:
//           const publicId = `logos/${emailUser}/logo`;

//           // Chamar upload passando base64 e publicId
//           const result = await logosApi.uploadImageBase64(base64Image, publicId);

//           if (!result || !result.secureUrl || !result.publicId) {
//               throw new Error('Resposta inválida do servidor');
//           }

//           // Salva URL e publicId para uso futuro (deletar/atualizar)
//           document.getElementById("logo-image-url").value = result.secureUrl;
//           document.getElementById("logo-public-id").value = result.publicId; // elemento escondido para guardar publicId

//           showAlert('Imagem enviada com sucesso!', 'success');
//       };

//       reader.readAsDataURL(file);
//   } catch (error) {
//       console.error('Erro detalhado no upload:', error);

//       if (error.message.includes('PERMISSION_DENIED')) {
//           showAlert('Erro: arquivo acima do limite de 5MB ou não autorizado.', 'error');
//       } else {
//           showAlert('Erro ao enviar imagem: ' + (error.message || 'Erro desconhecido'), 'error');
//       }
//   }
// });

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

        // Remove do Firestore
        await logosApi.delete(logoId);

        // Tenta remover do Cloudinary, se houver token válido
        if (deleteToken) {
              //só exclui se o token for válido, ou seja, se estiver dentro do prazo de 1 hora
            await deleteLogoFromCloudinary(deleteToken);          
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
    let value = cnpjInput.value.replace(/\D/g, ''); // Remove tudo que não é dígito

    if (value.length > 14) value = value.slice(0, 14); // Limita a 14 dígitos

    // Aplica a máscara: 00.000.000/0000-00
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');

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

/*Anexar imagem*/
// document.getElementById("logo-image").addEventListener("change", async (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     // Validações do arquivo
//     const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
//     const maxSize = 5 * 1024 * 1024; // 5MB

//     if (!validTypes.includes(file.type)) {
//         showAlert('Tipo de arquivo inválido. Use apenas imagens (JPG, PNG ou GIF).', 'error');
//         return;
//     }

//     if (file.size > maxSize) {
//         showAlert('Arquivo muito grande. O tamanho máximo permitido é 5MB.', 'error');
//         return;
//     }

//     try {
//         console.log('Iniciando upload do arquivo:', {
//             nome: file.name,
//             tipo: file.type,
//             tamanho: file.size
//         });

//         const result = await logosApi.uploadImage(file);
        
//         if (!result || !result.imageUrl) {
//             throw new Error('URL da imagem não recebida do servidor');
//         }

//         logoImageUrl.value = result.imageUrl;
//         showAlert('Imagem enviada com sucesso!', 'success');
//     } catch (error) {        
//         console.error('Erro detalhado no upload:', error);
//         showAlert('Erro ao enviar imagem: ' + (error.message || 'Erro desconhecido'), 'error');
//     }
// });
  
document.addEventListener('DOMContentLoaded', function () {
    const telefoneInput = document.getElementById('telephone');
    const celularInput = document.getElementById('cellphone');
    const clientWhatsappInput = document.getElementById('client_whatsapp');

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

// Carrega os dados de um logo no formulário para edição  
// Carrega os dados de um logo no formulário para edição    
function loadLogoForEdit(logo) {
    console.log('Carregando logo para edição:', logo); // Debug
    
    // Preenche os campos do formulário
    const form = document.getElementById("logo-form");
    
    // Informações básicas
    form.querySelector("#client-name").value = logo.clientName || '';
    form.querySelector("#client-fantasy-name").value = logo.clientFantasyName || '';
    form.querySelector("#client-CNPJ").value = logo.clientCNPJ || '';
    
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
    form.querySelector("#logo-category").value = logo.category || logo.logoCategory || '';
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
                form.querySelector(`#${day}-start`).value = dayData.start || '';
                form.querySelector(`#${day}-end`).value = dayData.end || '';
                form.querySelector(`#${day}-closed`).checked = dayData.closed || false;
            }
        });
    } else {
        // Verifica os campos closed individuais (para compatibilidade com versões antigas)
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            const closedField = `${day}Closed`;
            if (logo[closedField] !== undefined) {
                form.querySelector(`#${day}-closed`).checked = logo[closedField] === 'on';
            }
        });
    }
    
    // Imagem do logo
    editingDeleteToken = logo.deleteToken;
    const logoPreview = form.querySelector("#logo-preview_img");
    const logoImageUrl = logo.imageUrl;
    if (logoImageUrl) {
        logoPreview.src = logoImageUrl;
        logoPreview.style.display = 'block';
        form.querySelector("#logo-image-url").value = logoImageUrl;
    } else {
        logoPreview.src = 'placeholder.png';
        logoPreview.style.display = 'none';
        form.querySelector("#logo-image-url").value = '';
    }

    // Atualiza o botão de salvar
    const saveBtn = form.querySelector('.save-btn .btn-text');
    if (saveBtn) {
        saveBtn.textContent = 'Atualizar';
    } else {
        form.querySelector('.save-btn').textContent = 'Atualizar';
    }
    form.querySelector('.save-btn').classList.add('update');
    
    // Mostra o botão de cancelar edição se estiver oculto
   // document.getElementById('cancel-button').style.display = 'inline-block';
    
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
        const matchesUF = (logo.clientUf || "").toLowerCase().includes(searchTerm);
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

// let cnpjDelete = null;
// document.getElementById("confirm-delete").addEventListener("click", async () => {
//     debugger;
//     if (cnpjDelete !== null) {
//         try {
//             const logoToDelete = logos.find(l => l.clientCNPJ === cnpjDelete);
//             if (logoToDelete) {
               
//                // const imagePath = extractFirebasePathFromUrl(logoToDelete.imagem);
//                 await logosApi.deleteImage(imagePath);
              
//                 // Exclui a imagem do Cloudinary - só exclui caso o token esteja com válidade dentro de 1 hora
//                 //await deleteLogoFromCloudinary(logoToDelete.deleteToken);

//                 // Exclui o logo do Firestore
//                 await logosApi.delete(logoToDelete.id);

//                 // Remove o logo da lista local
//                 logos = logos.filter(l => l.clientCNPJ !== cnpjDelete);
                
//                 // Renderiza novamente a lista de logos
//                 renderLogos(logos);

//                 showAlert("Excluído com sucesso", "Atenção!", "success");
//             }
//         } catch (error) {
//             console.error("Erro ao excluir logo:", error);
//            showAlert("Ocorreu um erro ao excluir. Por favor, tente novamente.","Erro","error");
//         }
//         cnpjDelete = null;
//         document.getElementById("delete-modal").classList.add("hidden");
//     }
// });

function extractFirebasePathFromUrl(url) {
  const decodedUrl = decodeURIComponent(url);
  const matches = decodedUrl.match(/\/o\/(.*?)\?alt/);
  return matches ? matches[1] : null;
}

// Outros event listeners
//logosGrid.addEventListener("click", (e) => {
    // if (e.target.classList.contains("delete-btn")) {
    //     cnpjDelete = e.target.dataset.id;
    //     document.getElementById("delete-modal").classList.remove("hidden");
    // }

    // if (e.target.classList.contains("edit-btn")) {
    //     debugger
    //     const cnpjEditar = e.target.dataset.id;
    //     loadLogoForEdit(logos.find(l => l.id === cnpjEditar));
    //     document.querySelector('.logo-form-container').scrollIntoView({ behavior: 'smooth' });
    // }
//});

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
    const endEl = document.getElementById(`${dia}-end`);
    const closed = document.getElementById(`${dia}-closed`).checked;

    const start = startEl.value.trim();
    const end = endEl.value.trim();

    if (!closed && (!start || !end)) {
      valido = false;
      diaInvalido = dia;
      startEl.classList.add('erro');
      endEl.classList.add('erro');
    } else {
      startEl.classList.remove('erro');
      endEl.classList.remove('erro');
    }

    horarios[dia] = {
      start: closed ? null : start,
      end: closed ? null : end,
      closed: closed
    };
  });

  if (!valido) {
    showAlert(`Preencha os horários corretamente para: ${diaInvalido}`,'warning');
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
const API_KEY = 'AIzaSyAcMM-7YQf8Rs4CEZ5-Z5cnm2JQpPaqzLQ'; 
async function obterCoordenadasGoogle() {
    if (!validarCamposEndereco()) return;
    
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
        alert('Endereço não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      alert('Erro ao buscar coordenadas.');
    }
  }

  // Sugestão: rodar ao sair do campo UF ou ao clicar em botão
    document.getElementById('client-uf').addEventListener('blur', obterCoordenadasGoogle);
    document.getElementById('client-number').addEventListener('blur', obterCoordenadasGoogle);
    document.getElementById('client-city').addEventListener('blur', obterCoordenadasGoogle);
    