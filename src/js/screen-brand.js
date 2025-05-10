 import { categories } from './categories.js';
import { ufs } from './ufs.js';  
 
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
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const locationTerm = document.getElementById('location-input')?.value.toLowerCase() || '';
    const selectedCategory = categorySelect.value;
    const logos = loadLogosFromStorage();

    const filteredLogos = logos.filter(logo => {
        if (!contratoAtivo(logo)) return false;

        const matchesSearch = logo.clientName.toLowerCase().includes(searchTerm);

            // Separar cidade e UF (suporta "cidade - uf", "cidade-uf", "cidade uf" ou apenas "cidade")
            let [parteUm, parteDois] = locationTerm
            .split(/[-\s]{1,}/) // separa por hífen ou espaço(s)
            .map(s => s.trim().toLowerCase());
       
            // Se ambos cidade e UF forem fornecidos, deve fazer a verificação exata
            const matchesLocation = !locationTerm || (
                (parteUm && parteDois) 
                ? (logo.clientCity?.toLowerCase().includes(parteUm) && logo.clientUf?.toLowerCase() === parteDois) 
                : (parteUm && logo.clientCity?.toLowerCase().includes(parteUm)) || 
                    (parteUm && logo.clientUf?.toLowerCase() === parteUm)
            );


        const matchesCategory = !selectedCategory || logo.category === selectedCategory;

        return matchesSearch && matchesLocation && matchesCategory;
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

 
// WhatsApp flutuante da BrandConnect
const whatsappNumber = '5515996257159'; // Exemplo: 55 11 99999-9999
const whatsappLink = document.querySelector('#whatsapp-float a');
whatsappLink.href = `https://wa.me/${whatsappNumber}`;


//Pesquisa ao selecionar minha localização
const checkbox = document.getElementById('use-location');
const citySpan = document.getElementById('detected-city');
const locationInput = document.getElementById('location-input');

checkbox.addEventListener('change', () => {
  if (checkbox.checked) {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;

          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: {
              'User-Agent': 'BrandConnect/1.0 (contato@seudominio.com.br)',
              'Referer': location.origin
            }
          })
          .then(res => res.json())
          .then(data => {
            const addr = data.address;
            const cidade = addr.city || addr.town || addr.village || addr.county || '';
            //const uf = addr.state_code || addr.state || '';
            
            const estadoCompleto = addr.state || '';
            const uf = ufs.find(uf => uf.nome.toLowerCase() === estadoCompleto.toLowerCase())?.sigla || '';
              
            const cidadeUF = `${cidade}${uf ? ' - ' + uf : ''}`;
            locationInput.value = cidadeUF; // preenche o input
            citySpan.textContent = `Cidade: ${cidadeUF}`;

            updateLogoDisplay(); // chama o filtro existente
          })
          .catch(() => {
            citySpan.textContent = "Cidade: Erro ao localizar";
            checkbox.checked = false;
          });
        },
        () => {
          citySpan.textContent = "Cidade: Permissão negada";
          checkbox.checked = false;
        }
      );
    } else {
      alert("Geolocalização não suportada.");
      checkbox.checked = false;
    }
  } else {
    citySpan.textContent = "Localização não informada";
    locationInput.value = '';
    updateLogoDisplay(); // limpa o filtro
  }
});

//Autocomplete - pesquisa por nome de cidade e/ou UF
document.getElementById('location-input').addEventListener('input', updateLogoDisplay);

function getUniqueCitiesFromLogos() {
    const logos = loadLogosFromStorage();
    const citySet = new Set();
  
    logos.forEach(logo => {
      if (logo.clientCity) {
        citySet.add(logo.clientCity.trim());
      }
    });
  
    return Array.from(citySet).sort();
}
  
const inputElement = document.getElementById("location-input");
const suggestionsList = document.getElementById("suggestions-list");

inputElement.addEventListener("input", function () {
  const searchTerm = this.value.toLowerCase();
  suggestionsList.innerHTML = "";

  const cidades = getUniqueCitiesFromLogos();
  if (searchTerm.length > 0) {
    const filteredCities = cidades.filter(city =>
      city.toLowerCase().includes(searchTerm)
    );

    filteredCities.forEach(city => {
      const suggestionItem = document.createElement("div");
      suggestionItem.classList.add("suggestion-item");
      suggestionItem.textContent = city;

      suggestionItem.addEventListener("click", function () {
        inputElement.value = city;
        suggestionsList.innerHTML = "";
        updateLogoDisplay(); // Filtrar com base na cidade escolhida
      });

      suggestionsList.appendChild(suggestionItem);
    });
  }
});

document.addEventListener("click", function (event) {
    if (!inputElement.contains(event.target) && !suggestionsList.contains(event.target)) {
      suggestionsList.innerHTML = "";
    }
});
  
//Limpar input Cidade e/ou UF
const clearIcon = document.getElementById('clear-location');
locationInput.addEventListener('input', () => {
  clearIcon.style.display = locationInput.value ? 'block' : 'none';
});

clearIcon.addEventListener('click', () => {
  locationInput.value = '';
  clearIcon.style.display = 'none';
  document.getElementById('suggestions-list').innerHTML = '';
  updateLogoDisplay();
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
