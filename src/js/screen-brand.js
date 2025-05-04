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
    const clientWhatsapp = logo.clientWhatsapp || "";

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
    
    if (logo.planType.toLowerCase() !== "basico") {
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

        if (!!instagramUrl) {
            var instagramButton = document.createElement('button');
            instagramButton.className = 'instagram-btn';
            instagramButton.innerHTML = '<i class="fab fa-instagram"></i>';
            instagramButton.onclick = function () {
                window.open(instagramUrl, '_blank');
            };
            
            buttonContainer.appendChild(instagramButton);
        }
  
       // Botão do Facebook
        if (!!facebookUrl) {             
            var facebookButton = document.createElement('button');
            facebookButton.className = 'facebook-btn';
            facebookButton.innerHTML = '<i class="fab fa-facebook"></i>';
            facebookButton.onclick = function () {
                window.open(facebookUrl, '_blank');
            };

            buttonContainer.appendChild(facebookButton);
        }
       

        // Botão do WhatsApp
        if (!!clientWhatsapp) {
            var whatsappButton = document.createElement('button');
            whatsappButton.className = 'whatsapp-btn';
            whatsappButton.innerHTML = '<i class="fab fa-whatsapp"></i>';
            whatsappButton.onclick = function () {
                const phone = clientWhatsapp.replace(/\D/g, ''); // Remove não numéricos
                const message = encodeURIComponent("Olá, gostaria de entrar em contato!");
                const url = `https://wa.me/55${phone}?text=${message}`;
                window.open(url, '_blank');
            };
    
            buttonContainer.appendChild(whatsappButton);
        } 

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

    //Dar preferencia na ordenação para premio-plus, premium e basico
    if (Array.isArray(logos)) {
        logos.sort((a, b) => {
          const normalize = str => str?.trim().toLowerCase() || "";
      
          const planPriority = {
            "premium-plus": 0,
            "premium": 1,
            "basico": 2
          };
      
          const aPlan = normalize(a.planType);
          const bPlan = normalize(b.planType);
      
          const aPriority = planPriority[aPlan] ?? 3; // qualquer outro tipo vem depois
          const bPriority = planPriority[bPlan] ?? 3;
      
          if (aPriority !== bPriority) {
            return aPriority - bPriority; // menor valor = maior prioridade
          }
      
          // priorizar o Nível em ordem decrescente
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
    debugger
    
    //Visibilidade botão Admin
    
    const now = new Date();
    const d = now.getDate();       
    const m = now.getMonth() + 1;       
    const parteUm = d + m;   
    const parteDois = String(now.getFullYear()).slice(-2); 
  
    const chave  = `mostrarAdmin${parteUm}${parteDois}`; 
  
    const params = new URLSearchParams(window.location.search);
    const mostrarAdmin = params.get(chave) === 'true';
  
    const adminBtn = document.getElementById('admin-btn');
    adminBtn.style.display = 'none';

    if (adminBtn) {
        if (mostrarAdmin) {
          adminBtn.style.display = 'inline-block'; 
        }
    }
});

function redirectToWhatsApp(clientWhatsapp) {
    const rawNumber = clientWhatsapp
    
    // Remove caracteres não numéricos
    const phoneNumber = rawNumber.replace(/\D/g, '');
    
    // Mensagem opcional
    const message = encodeURIComponent("Olá, gostaria de entrar em contato!");
    
    // Monta a URL do WhatsApp
    const url = `https://wa.me/55${phoneNumber}?text=${message}`;
    
    // Abre o link em nova aba
    window.open(url, '_blank');
}
  
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
