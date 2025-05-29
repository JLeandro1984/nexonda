import { categories } from './categories.js';
import { ufs } from './ufs.js';

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
async function updateLogoDisplay() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const locationTerm = document.getElementById('location-input')?.value.toLowerCase() || '';
    const selectedCategory = categorySelect.value;
    const logos = await loadLogosFromStorage();

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
    const cachedLocation = localStorage.getItem('userLocation');

    if (cachedLocation) {
      const cidadeUF = JSON.parse(cachedLocation);
      locationInput.value = cidadeUF;
      citySpan.textContent = `Cidade: ${cidadeUF}`;
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
            locationInput.value = cidadeUF;
            citySpan.textContent = `Cidade: ${cidadeUF}`;

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
    locationInput.value = '';
    localStorage.removeItem('userLocation'); // Limpa o cache
    updateLogoDisplay();
  }
});


//Autocomplete - pesquisa por nome de cidade e/ou UF
document.getElementById('location-input').addEventListener('input', updateLogoDisplay);

async function getUniqueCitiesFromLogos() {
    const logos = await loadLogosFromStorage();
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

inputElement.addEventListener("input", async function () {
  const searchTerm = this.value.toLowerCase();
  suggestionsList.innerHTML = "";

  const cidades = await getUniqueCitiesFromLogos();
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

  // Mostra uma mensagem de alerta
  function showAlert(message, title = "Mensagem", type = "info") {
      alertBox.textContent = message;
      alertBox.className = `alert-box ${type}`;
      document.body.appendChild(alertBox);
      setTimeout(() => {
          if (alertBox.parentNode) {  // Verifica se o elemento ainda está no DOM
              alertBox.classList.add('fade-out');
              setTimeout(() => {
                  if (alertBox.parentNode) {  // Verifica novamente antes de remover
                      document.body.removeChild(alertBox);
                  }
              }, 500);
          }
      }, 3000);
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