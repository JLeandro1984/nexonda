 import { categories } from './categories.js';

const STORAGE_KEY = 'logoGalleryData';
const categorySelect = document.getElementById("category-select");

// Carrega logos do localStorage
function loadLogosFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
}

function createLogoElement(logo) {
    
    // Cria o elemento principal
    var logoItem = document.createElement('div');
    logoItem.className = 'logo-item';

    // Obtém a URL da imagem e do vídeo
    const imageSrc = logo.imageUrl || logo.imagem || '';
    const videoUrl = logo.videoUrl || "";
    const instagramUrl = logo.instagramUrl || "";
    const facebookUrl = logo.facebookUrl || "";

    // Preenche o conteúdo do card
    logoItem.innerHTML = `
        <img src="${imageSrc}" alt="${logo.clientName}" loading="lazy">
        <div class="logo-content">
            <h3>${logo.clientName}</h3>
        </div>
    `;

    // Container do botão de vídeo
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'btn-container';
    
    var buttonContainerInstagram = document.createElement('div');
    buttonContainerInstagram.className = 'instagram-btn-container';

    var buttonContainerFacebook = document.createElement('div');
    buttonContainerFacebook.className = 'facebook-btn-container';

    if (logo.planType.toLowerCase() === "premium") {
        // Cria o botão de vídeo
        var videoButton = document.createElement('button');
        videoButton.className = 'video-btn';
        videoButton.innerHTML = '<i class="fab fa-youtube"></i>'; 

         // Evento de clique no botão de vídeo
        videoButton.onclick = function(e) {
            e.stopPropagation();
            e.preventDefault();
            openYouTubePlayer(videoUrl);
        };
    
        buttonContainer.appendChild(videoButton);

        var instagramButton = document.createElement('button');
        instagramButton.className = 'instagram-btn';
        instagramButton.innerHTML = '<i class="fab fa-instagram"></i>';
        instagramButton.onclick = function () {
            window.open(instagramUrl, '_blank');
        };
        
        buttonContainer.appendChild(instagramButton);

        // Botão do Facebook
        var facebookButton = document.createElement('button');
        facebookButton.className = 'facebook-btn';
        facebookButton.innerHTML = '<i class="fab fa-facebook"></i>';
        facebookButton.onclick = function () {
            window.open(facebookUrl, '_blank');
        };

        buttonContainer.appendChild(facebookButton);
    }
 

   
   
    
    // Wrapper principal
    var wrapper = document.createElement('div');
    wrapper.className = 'logo-item-wrapper';
    wrapper.appendChild(logoItem);
    wrapper.appendChild(buttonContainer);

    // Evento de clique no card (para abrir website)
    logoItem.addEventListener('click', function() {
        if (logo.websiteUrl) {
            window.open(logo.websiteUrl, '_blank');
        }
    });

    return wrapper;
}

// Renderiza todos os logos
function loadLogos() {
    const container = document.getElementById('logo-container');
    container.innerHTML = '';
    const logos = loadLogosFromStorage();

    //Dar preferencia na ordenação para os premio
    if (Array.isArray(logos)) {
        logos.sort((a, b) => {
          const aIsPremium = a.planType?.trim().toLowerCase() === "premium";
          const bIsPremium = b.planType?.trim().toLowerCase() === "premium";
      
          if (aIsPremium !== bIsPremium) {
            return aIsPremium ? -1 : 1; // Premium primeiro
          }
      
            // priorizar o Nível em ordem crescente
            const aLevel = parseInt(a.clientLevel) || 0;
            const bLevel = parseInt(b.clientLevel) || 0;
            
            if (aLevel !== bLevel) {
              return bLevel - aLevel; // Ordem decrescente
            }                  
      
          return a.clientName.localeCompare(b.clientName); // Nome alfabético
        });
      } else {
        console.error("logos não é um array:", logos);
      }
      
    
    logos.forEach(logo => {
        if (!contratoAtivo(logo)) return;
        
        const logoElement = createLogoElement(logo);
        container.appendChild(logoElement);
    });
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
// Popula categorias no select de filtro
function populateFilterCategories() {
    categories.forEach(group => {
        // Cria o optgroup e define o label diretamente
        const optgroup = document.createElement("optgroup");
        
         // Adiciona o atributo data-lang ao optgroup
         //optgroup.setAttribute('data-lang', group.value);
        optgroup.label = group.label; 
        
        group.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value; // O valor comparado com logo.category
            optionElement.textContent = option.label;

            // Adiciona um atributo "data-lang" ao option
            optionElement.setAttribute('data-lang', option.value);
            
            optgroup.appendChild(optionElement);
        });
        categorySelect.appendChild(optgroup);
    });
}

// Atualiza os logos com base no filtro
function updateLogoDisplay() {
    const searchTerm = document.getElementById('search-input').value;
    const selectedCategory = categorySelect.value;
    const logos = loadLogosFromStorage();

    const filteredLogos = logos.filter(logo => {
        if (!contratoAtivo(logo)) return;

        const matchesSearch = logo.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || logo.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const container = document.getElementById('logo-container');
    container.innerHTML = '';

    if (filteredLogos.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>Nenhum logo encontrado.</p>
                <p>Tente ajustar sua pesquisa ou selecione outra categoria.</p>
            </div>
        `;
    } else {
        filteredLogos.forEach(logo => {
            const logoElement = createLogoElement(logo);
            container.appendChild(logoElement);
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadLogos();
    populateFilterCategories();

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', updateLogoDisplay);
    categorySelect.addEventListener('change', updateLogoDisplay);
});


//document.addEventListener("DOMContentLoaded", () => {
//   const colorThief = new ColorThief();
//   const logoItems = document.querySelectorAll(".logo-item img");

//   logoItems.forEach((img) => {
//     // Aguarda a imagem carregar para extrair a cor
//     if (img.complete) {
//       applyColor(img);
//     } else {
//       img.addEventListener("load", () => applyColor(img));
//     }
 // });

  //function applyColor(img) {
    // try {
    //   const dominantColor = colorThief.getColor(img);
    //   const rgb = `rgb(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]})`;
    //   img.parentElement.style.backgroundColor = rgb;
    // } catch (e) {
    //   console.warn("Não foi possível obter a cor do logo:", e);
    // }
 // }
//});
