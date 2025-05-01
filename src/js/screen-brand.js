 import { categories } from './categories.js';

const STORAGE_KEY = 'logoGalleryData';
const categorySelect = document.getElementById("category-select");

// Carrega logos do localStorage
function loadLogosFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
}

// Cria elemento HTML para um logo
// function createLogoElement(logo) {
//     const logoItem = document.createElement('div');
//     logoItem.className = 'logo-item';

//     const imageSrc = logo.imageUrl || logo.imagem || '';
// const videoUrl = "https://www.youtube.com/watch?v=-ew_bfFvros&list=RD-ew_bfFvros&start_radio=1&ab_channel=HomeFree"
   
//     logoItem.innerHTML = `
//         <img src="${imageSrc}" alt="${logo.clientName}" loading="lazy">
//         <h3>${logo.clientName}</h3>
//         <p>${logo.category}</p>
//           <button class="video-btn" onclick="abrirModalComVideo('${videoUrl || ''}')">
//             📹 Ver Vídeo
//         </button>
//     `;

//     logoItem.addEventListener('click', () => {
//         if (logo.websiteUrl) {
//             window.open(logo.websiteUrl, '_blank');
//         }
//     });

//     return logoItem;
// }

function createLogoElement(logo) {
    // Cria o elemento principal
    var logoItem = document.createElement('div');
    logoItem.className = 'logo-item';

    // Obtém a URL da imagem e do vídeo
    var imageSrc = logo.imageUrl || logo.imagem || '';
    var videoUrl = logo.videoUrl || "https://www.youtube.com/watch?v=0Drk4MNAFac&ab_channel=EliasMagar"; // URL padrão se não houver
    
    // Preenche o conteúdo do card
    logoItem.innerHTML = `
        <img src="${imageSrc}" alt="${logo.clientName}" loading="lazy">
        <div class="logo-content">
            <h3>${logo.clientName}</h3>
            <p>${logo.category}</p>
        </div>
    `;

    // Container do botão de vídeo
    var buttonContainer = document.createElement('div');
    buttonContainer.className = 'video-btn-container';
    
    // Cria o botão de vídeo
    var videoButton = document.createElement('button');
    videoButton.className = 'video-btn';
    videoButton.innerHTML = '<i class="fab fa-youtube"></i>'; 
    videoButton.title = 'Descubra o que torna nossa empresa única! Clique no ícone.'; 

    // Atribui os atributos necessários para o tooltip funcionar (data-toggle e data-placement)
    videoButton.setAttribute('data-toggle', 'tooltip');
    videoButton.setAttribute('data-placement', 'top');  // Definindo a posição do tooltip (topo)
    

    // Evento de clique no botão de vídeo
    videoButton.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        openYouTubePlayer(videoUrl);
    };
    
    buttonContainer.appendChild(videoButton);
    
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


$(document).ready(function() {
    // Ativa o tooltip para todos os elementos com o data-toggle="tooltip"
    $('[data-toggle="tooltip"]').tooltip();
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
