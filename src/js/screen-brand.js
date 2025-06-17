import { categories } from './categories.js';
import { ufs } from './ufs.js';
import { showAlert } from '../components/alert.js';

// Constants
const STORAGE_KEY = 'contactFormData';
const categorySelect = document.getElementById("category-select");

// Carrega logos do Firebase Functions
async function loadLogosFromStorage() {
    try {
        const response = await fetch('https://publiclogos-lnpdkkqg5q-uc.a.run.app', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erro ao carregar logotipos');
        }

        const logos = await response.json();
        return Array.isArray(logos) ? logos : [];
    } catch (error) {
        console.error("Error loading logos:", error);
        return [];
    }
}

function createLogoElement(logo) {
    
    // Cria o elemento principal
    var logoItem = document.createElement('div');
    logoItem.className = 'logo-item';

    // Obtém a URL da imagem e do vídeo
    const imageSrc = logo.imageUrl || '';
    const videoUrl =   logo.clientVideoUrl || "";
    const instagramUrl = logo.clientInstagramUrl || "";
    const facebookUrl = logo.clientFacebookUrl || "";
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
         debugger;
        // Supondo que videoUrl está definido nesse escopo
        const isYouTube = (url) => {
            try {
            const hostname = new URL(url).hostname;
            return hostname.includes('youtube.com') || hostname.includes('youtu.be');
            } catch {
            return false;
            }
        };

        const isFirebaseMp4 = (url) => {
            try {
            return url.includes('firebasestorage.googleapis.com') && (url.endsWith('.mp4') || url.includes('.mp4?'));
            } catch {
            return false;
            }
        };

        if (isYouTube(videoUrl) || isFirebaseMp4(videoUrl)) {
            // Aqui você pode usar sua função que trata os dois casos
            openYouTubePlayer(videoUrl);
        } else {
            showAlert('Formato de vídeo não suportado.', 'warning');
        }
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
async function loadLogos() {
    const container = document.getElementById('logo-container');
    container.innerHTML = '';
    const logos = await loadLogosFromStorage();

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
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label; 
        
        group.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.value; 
            optionElement.textContent = option.label;
            optionElement.setAttribute('data-lang', option.value);
            
            optgroup.appendChild(optionElement);
        });
        categorySelect.appendChild(optgroup);
    });
}

// Atualiza os logos com base no filtro
async function updateLogoDisplay() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const locationTerm = document.getElementById('location-input')?.value.toLowerCase() || '';
    const isUselocation = document.getElementById('use-location').checked;
    let cityeUselocation = "";

    if (isUselocation) {
        cityeUselocation = document.getElementById('detected-city').textContent;
    }

    const selectedCategory = categorySelect.value;
    const logos = await loadLogosFromStorage();

    const normalizar = termo => (termo || "").trim().toLowerCase();
    const separarPartes = termo => normalizar(termo).split(/[-\s]{1,}/).filter(Boolean);

    const comparaComLogo = (partes, logo) => {
        if (!partes.length) return true;
        const city = normalizar(logo.clientCity);
        const uf = normalizar(logo.clientUf);

        if (partes.length === 2) {
            const [p1, p2] = partes;
            return (
                (city.includes(p1) && uf.includes(p2)) ||
                (city.includes(p2) && uf.includes(p1))
            );
        } else if (partes.length === 1) {
            const [p] = partes;
            return city.includes(p) || uf.includes(p);
        }

        return false;
    };

    const filteredLogos = logos.filter(logo => {
        if (!contratoAtivo(logo)) return false;

        // Filtro por nome (obrigatório se preenchido)
        const matchesSearch = !searchTerm || logo.clientName?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;

        // Filtro por localização (obrigatório se algum termo de localização estiver preenchido)
        const hasLocationFilter = locationTerm || cityeUselocation;
        if (hasLocationFilter) {
            const partesLocation = separarPartes(locationTerm);
            const partesGeo = separarPartes(cityeUselocation);

            const locationTermValid = partesLocation.length > 0 && comparaComLogo(partesLocation, logo);
            const geoLocationValid = partesGeo.length > 0 && comparaComLogo(partesGeo, logo);

            // Se ambos os filtros forem inválidos, retorna falso
            if (!locationTermValid && !geoLocationValid) {
                return false;
            }
        }

        // Filtro por categoria (obrigatório se selecionado)
        const matchesCategory = !selectedCategory || logo.category === selectedCategory;
        if (!matchesCategory) return false;

        return true;
    });

    // Atualiza a UI com os logos filtrados
    const container = document.getElementById('logo-container');
    container.innerHTML = '';
    filteredLogos.forEach(logo => {
        const logoElement = createLogoElement(logo);
        container.appendChild(logoElement);
    });
}


// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadLogos();
    populateFilterCategories();

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', updateLogoDisplay);
    categorySelect.addEventListener('change', updateLogoDisplay);
        
    //Visibilidade botão Admin    
    const now = new Date();
    const d = now.getDate();       
    const m = now.getMonth() + 1;       
    const parteUm = d + m;   
    const parteDois = String(now.getFullYear()).slice(-2); 
  
    const chave  = `mostrarAdmin${parteUm}${parteDois}`; 
  
    const params = new URLSearchParams(window.location.search);
    const mostrarAdmin = true //params.get(chave) === 'true';
  
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
    const cachedLocation = localStorage.getItem('userLocation');

    if (cachedLocation) {
      const cidadeUF = JSON.parse(cachedLocation);
      citySpan.textContent = `${cidadeUF}`;
      updateLogoDisplay();
      return;
    }

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
            const estadoCompleto = addr.state || '';
            const uf = ufs.find(uf => uf.nome.toLowerCase() === estadoCompleto.toLowerCase())?.sigla || '';

            const cidadeUF = `${cidade}${uf ? ' - ' + uf : ''}`;
            citySpan.textContent = `${cidadeUF}`;

            // Salva no localStorage
            localStorage.setItem('userLocation', JSON.stringify(cidadeUF));

            updateLogoDisplay();
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
    localStorage.removeItem('userLocation'); // Limpa o cache
    updateLogoDisplay();
  }
});


//Autocomplete - pesquisa por nome de cidade e/ou UF
document.getElementById('location-input').addEventListener('input', updateLogoDisplay);

async function getUniqueCitiesFromLogos() {
    const logos = await loadLogosFromStorage();
    const cityMap = new Map(); // Usamos Map para manter a ordem

    logos.forEach(logo => {
        if (logo.clientCity && logo.clientUf) {
            const key = `${logo.clientCity.trim().toLowerCase()}-${logo.clientUf.trim().toLowerCase()}`;
            const displayValue = `${logo.clientCity.trim()} - ${logo.clientUf.trim()}`;
            
            if (!cityMap.has(key)) {
                cityMap.set(key, displayValue);
            }
        }
    });

    return Array.from(cityMap.values()).sort((a, b) => a.localeCompare(b));
}
  
const inputElement = document.getElementById("location-input");
const suggestionsList = document.getElementById("suggestions-list");

inputElement.addEventListener("input", async function () {
    const searchTerm = this.value.toLowerCase().trim();
    suggestionsList.innerHTML = "";

    if (searchTerm.length < 2) {
        suggestionsList.style.display = "none";
        return;
    }

    const rawCities = await getUniqueCitiesFromLogos();
    const uniqueCityMap = new Map(); // chave: nome normalizado, valor: nome original

    rawCities.forEach(city => {
        const normalized = city.trim().toLowerCase();
        if (!uniqueCityMap.has(normalized)) {
            uniqueCityMap.set(normalized, city.trim());
        }
    });

    const filteredCities = Array.from(uniqueCityMap.values()).filter(city =>
        city.toLowerCase().includes(searchTerm)
    );

    // Evitar adicionar sugestões duplicadas visualmente
    const added = new Set();

    if (filteredCities.length > 0) {
        filteredCities.forEach(city => {
            if (!added.has(city)) {
                added.add(city);

                const suggestionItem = document.createElement("div");
                suggestionItem.classList.add("suggestion-item");
                suggestionItem.textContent = city;

                suggestionItem.addEventListener("click", function () {
                    inputElement.value = city;
                    suggestionsList.innerHTML = "";
                    suggestionsList.style.display = "none";
                    updateLogoDisplay();
                });

                suggestionsList.appendChild(suggestionItem);
            }
        });
        suggestionsList.style.display = "block";
    } else {
        suggestionsList.style.display = "none";
    }

    removeDuplicateSuggestions();
});
function removeDuplicateSuggestions() {
    const items = document.querySelectorAll(".suggestion-item");
    const seen = new Set();

    items.forEach(item => {
        const text = item.textContent.trim();

        if (seen.has(text)) {
            item.remove();
        } else {
            seen.add(text);
        }
    });
}

document.addEventListener("click", function (event) {
    if (event.target !== inputElement && 
        !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = "none";
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

// Formulário preenchido pelo cliente
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contact-form');
  if (!form) return; // Exit if form doesn't exist

  const inputs = form.querySelectorAll('input, textarea');
  const alertBox = createAlertBox();

  // Carrega o rascunho salvo localmente
  function loadFormData() {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
          try {
              const formData = JSON.parse(savedData);
              inputs.forEach(input => {
                  const fieldName = input.getAttribute('placeholder') || input.name;
                  if (formData[fieldName]) {
                      input.value = formData[fieldName];
                  }
              });
          } catch (error) {
              console.error('Error loading form data:', error);
              localStorage.removeItem(STORAGE_KEY); // Clear invalid data
          }
      }
  }

  // Salva o rascunho localmente enquanto digita
  function saveFormData() {
      const formData = {};
      inputs.forEach(input => {
          const fieldName = input.getAttribute('placeholder') || input.name;
          formData[fieldName] = input.value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }

  // Cria o elemento de alerta
  function createAlertBox() {
      const div = document.createElement('div');
      div.id = 'form-alert';
      div.classList.add('alert-box');
      return div;
  }

  // Limpa o formulário e rascunho local
  function clearFormData() {
      localStorage.removeItem(STORAGE_KEY);
      inputs.forEach(input => {
          input.value = '';
      });
  }

  // Salva os dados no Firebase Functions
  async function saveToFirebase(formData) {
      try {
          const headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          };

          // Garantir que os dados estejam no formato correto
          const contactData = {
              name: formData.Nome?.trim(),
              email: formData.Email?.trim(),
              message: formData.Mensagem?.trim(),
              createdAt: new Date().toISOString()
          };

          // Validação básica
          if (!contactData.name || !contactData.email || !contactData.message) {
              throw new Error('Por favor, preencha todos os campos obrigatórios.');
          }

          const response = await fetch('https://publiccontacts-lnpdkkqg5q-uc.a.run.app', {
              method: 'POST',
              headers,
              body: JSON.stringify(contactData)
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Erro ao salvar contato');
          }

          const result = await response.json();
          return result;
      } catch (error) {
          console.error("Error saving contact:", error);
          throw error;
      }
  }

  // Envio do formulário
  form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const formData = {};
      inputs.forEach(input => {
          const fieldName = input.getAttribute('placeholder') || input.name;
          formData[fieldName] = input.value.trim();
      });

      // Verificação simples dos campos obrigatórios
      if (!formData.Nome || !formData.Email || !formData.Mensagem) {
          showAlert("Por favor, preencha todos os campos.", "Erro", "error");
          return;
      }

      try {
          // Desabilita o botão de envio
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
              submitButton.disabled = true;
              submitButton.textContent = 'Enviando...';
          }

          // Salva no Firebase Functions
          const saved = await saveToFirebase(formData);
          
          if (saved) {
              // Alerta de sucesso
              showAlert("Mensagem enviada com sucesso!", "Sucesso", "success");
              
              // Limpa o formulário
              clearFormData();
          } else {
              showAlert("Ocorreu um erro ao enviar. Tente novamente.", "Erro", "error");
          }
      } catch (error) {
          console.error("Erro no envio:", error);
          showAlert(error.message || "Ocorreu um erro inesperado. Tente novamente.", "Erro", "error");
      } finally {
          // Reabilita o botão de envio
          const submitButton = form.querySelector('button[type="submit"]');
          if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = 'Enviar';
          }
      }
  });

  // Salva rascunho em tempo real
  inputs.forEach(input => {
      input.addEventListener('input', saveFormData);
      input.addEventListener('change', saveFormData);
  });

  // Carrega o rascunho ao iniciar
  loadFormData();
});