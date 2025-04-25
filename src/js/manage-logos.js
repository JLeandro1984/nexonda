import { categories } from './categories.js';

document.addEventListener("DOMContentLoaded", () => {
    const logoForm = document.getElementById("logo-form");
    const logosGrid = document.getElementById("logos-grid");
    const searchInput = document.getElementById("search-input");
    const filterCategory = document.getElementById("filter-category");
    const logoCategorySelect = document.getElementById("logo-category");
    const ufSelect = document.getElementById('client-uf');
    const cnpjInput = document.getElementById("client-cnpj");

    cnpjInput.addEventListener("blur", validarCNPJNoCampo);

    const STORAGE_KEY = 'logoGalleryData';

      // Lista das UFs brasileiras
  const ufs = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
  ];

    ufs.forEach(uf => {
        const option = document.createElement('option');
        option.value = uf.sigla;
        option.textContent = uf.sigla;
        ufSelect.appendChild(option);
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

    // Renderiza os logos na grid
    function renderLogos(list) {
        logosGrid.innerHTML = "";

        if (list.length === 0) {
            logosGrid.innerHTML = "<p>Nenhum logotipo encontrado.</p>";
            return;
        }

        list.forEach((logo, index) => {
            const item = document.createElement("div");
            item.className = "logo-item-admin";
            item.innerHTML = `
                <div class="logo-card"><img src="${logo.imagem}" alt="Logo de ${logo.clientName}" /></div>
                <div class="logo-info">
                    <h3>${logo.clientName}</h3>
                    <p>${logo.description || ""}</p>
                    <small>${logo.category}</small>
                    <button data-index="${index}" class="delete-btn">Excluir</button>
                <dv>
            `;
            logosGrid.appendChild(item);
        });
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
            const matchesCategory = category === "" || logo.category === category;
            return matchesName && matchesCategory;
        });

        renderLogos(filtered);
    }

    // Lida com exclusão
    logosGrid.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const index = e.target.dataset.index;
            logos.splice(index, 1);
            saveLogos();
            applyFilters();
        }
    });

    // Lida com envio de novo logotipo
    logoForm.addEventListener("submit", (e) => {
        e.preventDefault();
        debugger
                
        const clientCNPJ = document.getElementById("client-cnpj").value;        
        const clientName = document.getElementById("client-name").value;  
        const clientFantasyName = document.getElementById("client-fantasy-name").value; 
        const cellphone = document.getElementById("cellphone").value;
        const telephone = document.getElementById("telephone").value;
        const clientCity = document.getElementById("client-city").value;
        const clientUf = document.getElementById("client-uf").value;
        const websiteUrl = document.getElementById("client-website").value;
        const description = document.getElementById("logo-description").value;
        const imageInput = document.getElementById("logo-image");
        
        const selectElement = logoCategorySelect
        const category = selectElement.querySelector(`option[value="${selectElement.value}"]`).text
          
        const file = imageInput.files[0];
        if (!file) return alert("Selecione uma imagem!");

        const reader = new FileReader();
        reader.onload = () => {
            const newLogo = {
                clientName,
                clientCNPJ,
                clientFantasyName,
                cellphone,
                telephone,
                clientCity,
                clientUf,
                category,
                description,
                websiteUrl,
                imagem: reader.result,
            };
            logos.push(newLogo);
            saveLogos();
            applyFilters();
            logoForm.reset();
        };
        reader.readAsDataURL(file);
    });

    // Preenche o select de categorias dinamicamente
    function populateCategories() {
        debugger
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
    const telefoneInput = document.getElementById('telefone');
    const celularInput = document.getElementById('celular');

    aplicarMascaraTelefone(telefoneInput);
    aplicarMascaraTelefone(celularInput, true);
  });

