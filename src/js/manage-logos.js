import { categories } from './categories.js';
import { ufs } from './ufs.js';  

document.addEventListener("DOMContentLoaded", () => {
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


    cnpjInput.addEventListener("blur", validarCNPJNoCampo);

    const STORAGE_KEY = 'logoGalleryData';
    let editingIndex = null;

    // Lista das UFs brasileiras    
    ufs.forEach(uf => {
        const option = document.createElement('option');
        option.value = uf.sigla;
        option.textContent = uf.nome;  // Exibe o nome completo do estado
        ufSelect.appendChild(option);   // Adiciona a opção ao select
    });
    
    // Função para carregar logos do localStorage
    function loadLogosFromStorage() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        return storedData ? JSON.parse(storedData) : [];
    }

    let logos = loadLogosFromStorage();

    // Salva logos no localStorage
    function saveLogos() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logos));
    }

    // Renderiza os logos em uma tabela profissional
    function renderLogos(list) {
        logosGrid.innerHTML = "";

        if (list.length === 0) {
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
                <th class="col-contrato">Valor Contrato</th>
                <th class="col-acoes">Ações</th>
          </tr>
        `;
        table.appendChild(thead);
        
        // Corpo da tabela
        const tbody = document.createElement('tbody');
        
        list.forEach((logo) => {
            const startDate = new Date(logo.startDate);
            const endDate = new Date(logo.endDate);
            const formattedStartDate = startDate.toLocaleDateString('pt-BR');
            const formattedEndDate = endDate.toLocaleDateString('pt-BR');
            const status = logo.contractActive ? 'Ativo' : 'Inativo';
            const statusClass = logo.contractActive ? 'active' : 'inactive';
            const dataContrato = logo.contractActive ? `${formattedStartDate} a ${formattedEndDate}` : "";
            const categoria = getCategoryLabelByValue(logo.category);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${logo.imagem}" alt="Logo de ${logo.clientName}" class="logo-thumbnail" /></td>
                <td>${logo.clientName}</td>
                <td>${logo.clientFantasyName || '-'}</td>
                <td>${logo.clientCNPJ || '-'}</td>
                <td>${logo.cellphone || '-'}</td>
                <td>${logo.clientCity}/${logo.clientUf}</td>
                <td data-lang="${logo.category}">${categoria}</td>
                <td>
                    <span class="contract-status ${statusClass}">${status}</span><br>
                    <small>${dataContrato}</small>
                </td>
                <td>${logo.contractValue || '0,00'}</td>
                <td class="actions">
                    <button data-id="${logo.clientCNPJ}" class="edit-btn">Editar</button>
                    <button data-id="${logo.clientCNPJ}" class="delete-btn">Excluir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Inicializa totalContractValue como 0
        let totalContractValue = 0;

        // Itera pela lista para somar os valores dos contratos
        list.forEach(logo => {
            const contractValue = !logo.contractValue || !contratoAtivo(logo) ? 0 : parseFloat(logo.contractValue.replace(/[^\d,-]/g, '').replace(',', '.'));            
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
    }

    function getCategoryLabelByValue(value) {
        for (const category of categories) {
            // Verifica se é o valor do grupo principal
            if (category.value === value) {
                return category.label;
            }
    
            // Procura nas subcategorias (options)
            const subcategory = category.options.find(option => option.value === value);
            if (subcategory) {
                return subcategory.label;
            }
        }
    
        return null; // Não encontrado
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

    // Carrega os dados de um logo no formulário para edição
    function loadLogoForEdit(cnpj) {
        const logo = logos.find(l => l.clientCNPJ === cnpj);
        if (!logo) return;
    
        editingIndex = logos.findIndex(l => l.clientCNPJ === cnpj);
    
        document.getElementById("client-name").value = logo.clientName;
        document.getElementById("client-fantasy-name").value = logo.clientFantasyName || '';
        document.getElementById("client-cnpj").value = logo.clientCNPJ || '';
        document.getElementById("client-city").value = logo.clientCity || '';
        document.getElementById("client-uf").value = logo.clientUf || '';
        document.getElementById("telephone").value = logo.telephone || '';
        document.getElementById("cellphone").value = logo.cellphone || '';
        document.getElementById("client-website").value = logo.websiteUrl || '';
        document.getElementById("client-videoUrl").value = logo.videoUrl || '';
        document.getElementById("client-instagramUrl").value = logo.instagramUrl || '';
        document.getElementById("client-facebookUrl").value = logo.facebookUrl || '';
        document.getElementById("logo-description").value = logo.description || '';
        document.getElementById("logo-category").value = logo.category || '';
        document.getElementById("start-date").value = logo.startDate || '';
        document.getElementById("contract-months").value = logo.contractMonths || '';
        document.getElementById("end-date").value = logo.endDate || ''; 
        document.getElementById("email").value = logo.email || '';
        document.getElementById("plan_type").value = logo.planType || '';
        document.getElementById("contract_value").value = logo.contractValue || "0,00";
    
        // Define o radio button correto
        document.getElementById("ativo-true").checked = !!logo.contractActive;
        document.getElementById("ativo-false").checked = !logo.contractActive;
    
        // Mostra a imagem atual
        const imagePreview = document.createElement('div');
        imagePreview.innerHTML = `
            <p>Imagem Atual:</p>
            <img src="${logo.imagem}" alt="Logo atual" style="max-width: 100px; margin: 10px 0;" />
            <p>Se desejar alterar, selecione uma nova imagem abaixo:</p>
        `;
    
        const imageInputContainer = document.getElementById("logo-image").parentNode;
        const oldPreview = document.getElementById("current-image-preview");
        if (oldPreview) oldPreview.remove();
    
        imagePreview.id = "current-image-preview";
        imageInputContainer.insertBefore(imagePreview, document.getElementById("logo-image"));
    
        document.getElementById("logo-image").required = false;
        
        saveBtn.textContent = 'Atualizar';
        document.querySelector('.logo-form-container').classList.add('editing-mode');
    }
 
    // Filtra e atualiza a lista exibida
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectElement = filterCategory

        let category = "";
        if (!!selectElement.value) {
            category = selectElement.querySelector(`option[value="${selectElement.value}"]`).text
        }
        
        const filtered = logos.filter(logo => {
            const matchesName = logo.clientName.toLowerCase().includes(searchTerm);
            const matchesFantasyName = logo.clientFantasyName.toLowerCase().includes(searchTerm);
            const matchesCNPJ = logo.clientCNPJ.toLowerCase().includes(searchTerm);
            const matchesCity = logo.clientCity.toLowerCase().includes(searchTerm);
            const matchesUF = logo.clientUf.toLowerCase().includes(searchTerm);
            const matchesPlanType =  (logo.planType || "").toLowerCase().includes(searchTerm);
            const matchesCategory = category === "" || logo.category === category;
            return (matchesPlanType || matchesName || matchesFantasyName || matchesCNPJ || matchesCity || matchesUF) && matchesCategory;
        });

        renderLogos(filtered);
    }

    // Lida com exclusão e edição
    let cnpjDelete = null;

    logosGrid.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            cnpjDelete = e.target.dataset.id;
            document.getElementById("delete-modal").classList.remove("hidden");
        }

        if (e.target.classList.contains("edit-btn")) {
            const cnpjEditar = e.target.dataset.id;
            loadLogoForEdit(cnpjEditar);
            document.querySelector('.logo-form-container').scrollIntoView({ behavior: 'smooth' });
        }
    });

    document.getElementById("confirm-delete").addEventListener("click", () => {
        if (cnpjDelete !== null) {
            logos.splice(cnpjDelete, 1);
            saveLogos();
            applyFilters();
            cnpjDelete = null;
        }
        document.getElementById("delete-modal").classList.add("hidden");
    });

    document.getElementById("cancel-delete").addEventListener("click", () => {
        cnpjDelete = null;
        document.getElementById("delete-modal").classList.add("hidden");
    });

    
    // Lida com envio de novo logotipo ou atualização
    logoForm.addEventListener("submit", (e) => {
        e.preventDefault();
                  
        // Se não estiver editando, exige imagem
        if (editingIndex === null) {
            document.getElementById("logo-image").required = true;
        }
        
        const clientCNPJ = document.getElementById("client-cnpj").value;        
        const clientName = document.getElementById("client-name").value;  
        const clientFantasyName = document.getElementById("client-fantasy-name").value; 
        const cellphone = document.getElementById("cellphone").value;
        const telephone = document.getElementById("telephone").value;
        const clientCity = document.getElementById("client-city").value;
        const clientUf = document.getElementById("client-uf").value;
        const websiteUrl = document.getElementById("client-website").value;
        const videoUrl = document.getElementById("client-videoUrl").value;
        const instagramUrl = document.getElementById("client-instagramUrl").value;
        const facebookUrl = document.getElementById("client-facebookUrl").value;
        const description = document.getElementById("logo-description").value;
        const startDate = document.getElementById("start-date").value;
        const contractMonths = document.getElementById("contract-months").value;
        const endDate = document.getElementById("end-date").value;
        const contractActive = document.querySelector('input[name="contract-active"]:checked').value === 'true';
        const imageInput = document.getElementById("logo-image");
        const email = document.getElementById("email").value;
        const planType = document.getElementById('plan_type').value;
        const contractValue = document.getElementById("contract_value").value;   

        const category = logoCategorySelect.value;
        const file = imageInput.files[0];
        
        // Se estiver editando
        if (editingIndex !== null) {
            const updatedLogo = {
                ...logos[editingIndex], // Mantém todos os dados existentes
                clientName,
                clientCNPJ,
                clientFantasyName,
                cellphone,
                telephone,
                clientCity,
                clientUf,
                email,
                category,
                description,
                websiteUrl,
                videoUrl,
                instagramUrl,
                facebookUrl,
                startDate,
                contractMonths,
                endDate,
                contractActive,
                planType,
                contractValue
            };
            
            // Se uma nova imagem foi selecionada, processa ela
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    updatedLogo.imagem = reader.result;
                    completeLogoUpdate(updatedLogo);
                };
                reader.readAsDataURL(file);
            } else {
                // Mantém a imagem existente
                completeLogoUpdate(updatedLogo);
            }
            return;
        }
        
        // Código para adicionar novo item (permanece o mesmo)
        if (!file) return alert("Selecione uma imagem!");
    
        const reader = new FileReader();
        reader.onload = () => {
            const logoData = {
                clientName,
                clientCNPJ,
                clientFantasyName,
                cellphone,
                telephone,
                clientCity,
                clientUf,
                email,                
                websiteUrl,
                videoUrl,
                instagramUrl,
                facebookUrl,
                category,
                description,
                startDate,
                contractMonths,
                endDate,
                contractActive,
                planType,
                contractValue,
                imagem: reader.result,
            };

            // Verifica se o CNPJ já existe (evita duplicidade)
            const cnpjExists = logos.some((logo, index) =>
                logo.clientCNPJ === clientCNPJ && index !== editingIndex
            );
            if (cnpjExists) {
                showAlert("CNPJ já cadastrado!");
                return;
            }
            
            logos.push(logoData);
            saveLogos();
            applyFilters();
            logoForm.reset();
        };
        reader.readAsDataURL(file);
    });
    
    function completeLogoUpdate(updatedLogo) {
        logos[editingIndex] = updatedLogo;
        saveLogos();
        applyFilters();
        logoForm.reset();
        
        // Remove o preview da imagem
        const oldPreview = document.getElementById("current-image-preview");
        if (oldPreview) oldPreview.remove();
        
        editingIndex = null;
        saveBtn.textContent = 'Salvar';
        document.querySelector('.logo-form-container').classList.remove('editing-mode');
    }

    // Botão cancelar - limpa o formulário e estado de edição
    cancelBtn.addEventListener('click', () => {
        editingIndex = null;
        saveBtn.textContent = 'Salvar';

        const oldPreview = document.getElementById("current-image-preview");
        if (oldPreview) oldPreview.remove();
    });

    // Preenche o select de categorias dinamicamente
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

    // Inicializa as categorias e filtros
    populateCategories();
    populateFilterCategories();

    // Eventos de filtro
    searchInput.addEventListener("input", applyFilters);
    filterCategory.addEventListener("change", applyFilters);

    // Inicialização
    applyFilters();

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

    // Event listeners para calcular data final
    startDateInput.addEventListener('change', calculateEndDate);
    contractMonthsSelect.addEventListener('change', calculateEndDate);
    

});

const cnpjInput = document.getElementById('client-cnpj');

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

// Aplica a máscara nos inputs
document.addEventListener('DOMContentLoaded', function () {
    const telefoneInput = document.getElementById('telephone');
    const celularInput = document.getElementById('cellphone');

    aplicarMascaraTelefone(telefoneInput);
    aplicarMascaraTelefone(celularInput, true);
});

//Validar valor contrato
const inputValorContrato = document.getElementById('contract_value');
function formatToMoney(value) {
    value = value.replace(/\D/g, '');
    if (value === '') return '0,00';
    value = (parseInt(value, 10) / 100).toFixed(2);
    return value
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

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

//Validar email
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