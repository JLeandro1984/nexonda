import { categories } from './categories.js';
import { ufs } from './ufs.js';
import { showAlert } from '../components/alert.js';

// Constants
const STORAGE_KEY = 'contactFormData';
const categorySelect = document.getElementById("category-select");

// Função para aplicar a cor predominante do logo como fundo do container
//css logo-card ... opacity ... foi comentado

//window.applyLogoBgColor = function(imgElement) {
  // if (!window.ColorThief) return;
  // const colorThief = new ColorThief();
  // const card = imgElement.closest('.logo-card');
  // const container = imgElement.closest('.logo-img-container');

  // function setBg() {
  //   try {
  //     const color = colorThief.getColor(imgElement);
  //     container.style.backgroundColor = `rgb(${color[0]},${color[1]},${color[2]})`;
  //   } catch (e) {
  //     container.style.backgroundColor = '#fff';
  //   }
  //   card.classList.add('visible');  // mostra o card só depois que a cor foi aplicada
  // }

  // if (imgElement.complete && imgElement.naturalHeight !== 0) {
  //   requestAnimationFrame(setBg);
  // } else {
  //   imgElement.addEventListener('load', () => requestAnimationFrame(setBg), { once: true });
  // }
//};


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

// Função para verificar se o estabelecimento está aberto no momento
function isOpenNow(openingHours) {
  if (!openingHours) return false;

  const now = new Date();
  // Mapeia os dias da semana para as chaves do objeto openingHours
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const dayHours = openingHours[currentDay];
  if (!dayHours || dayHours.closed) return false;

  // Converte horários para minutos desde meia-noite para facilitar comparação
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const currentMinutes = timeToMinutes(currentTime);
  const startMinutes = timeToMinutes(dayHours.start);
  const endMinutes = timeToMinutes(dayHours.end);
  const lunchStartMinutes = timeToMinutes(dayHours.lunch_start);
  const lunchEndMinutes = timeToMinutes(dayHours.lunch_end);

  // Verifica se está dentro do horário de funcionamento
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    // Se não tem horário de almoço, está aberto
    if (!lunchStartMinutes || !lunchEndMinutes) return true;
    
    // Se tem horário de almoço, verifica se não está no intervalo
    return !(currentMinutes >= lunchStartMinutes && currentMinutes <= lunchEndMinutes);
  }

  return false;
}

function createLogoCard(logo) {
  // status: true = aberto, false = fechado
  const isOpen = isOpenNow(logo.openingHours);
  const statusText = isOpen ? 'Aberto agora' : 'Fechado no momento';
  const statusColor = isOpen ? 'text-success' : 'text-danger';

  // URLs sociais
  const whatsappUrl = logo.clientWhatsapp || logo.whatsappUrl || logo.whatsapp;
  const instagramUrl = logo.instagramUrl || logo.clientInstagramUrl;
  const facebookUrl = logo.facebookUrl || logo.clientFacebookUrl;
  const youtubeUrl = logo.videoUrl || logo.clientVideoUrl;
  const websiteUrl = logo.clientWebsite || logo.websiteUrl || '';

  // Nome fantasia
  const companyName = logo.clientFantasyName || logo.clientName || '';
  const showTooltip = companyName.length > 22;

  // Monta botões sociais se houver URL
  let socialButtons = '';
  if (whatsappUrl || instagramUrl || facebookUrl || youtubeUrl) {
    socialButtons = `<div class=\"btn-container\" style=\"margin-top: 10px;\">
      ${whatsappUrl ? `<a class=\"whatsapp-btn\" href=\"${whatsappUrl.startsWith('http') ? whatsappUrl : 'https://wa.me/' + whatsappUrl}\" target=\"_blank\" title=\"WhatsApp\"><i class=\"fab fa-whatsapp\"></i></a>` : ''}
      ${instagramUrl ? `<a class=\"instagram-btn\" href=\"${instagramUrl}\" target=\"_blank\" title=\"Instagram\"><i class=\"fab fa-instagram\"></i></a>` : ''}
      ${facebookUrl ? `<a class=\"facebook-btn\" href=\"${facebookUrl}\" target=\"_blank\" title=\"Facebook\"><i class=\"fab fa-facebook-f\"></i></a>` : ''}
      ${youtubeUrl ? `<button class=\"video-btn\" title=\"YouTube/Video\" onclick=\"openYouTubePlayer('${youtubeUrl.replace(/'/g, "\\'")}')\"><i class=\"fab fa-youtube\"></i></button>` : ''}
    </div>`;
  }

  // Card HTML
  const cardId = `logo-card-${Math.random().toString(36).substr(2, 9)}`;
  const cardContent = `
    <div class=\"logo-card\">
      <div class=\"logo-img-container\">
        <img src=\"${logo.imageUrl || logo.imagem || ''}\" alt=\"Logo da ${companyName}\" class=\"logo-img\" crossorigin=\"anonymous\" />
      </div>
      <div class=\"logo-card-body\">
        <div class=\"logo-info-row\">
          <span class=\"icon info-icon small-info-icon\" title=\"Para mais informações clique aqui.\" data-logo=\"${encodeURIComponent(JSON.stringify(logo))}\">
            <i class=\"fas fa-info-circle\"></i>
          </span>
          <span class=\"status-label ${statusColor}\" style=\"margin-left: 6px; font-size: 0.95em;\">${statusText}</span>
        </div>
        <div class=\"company-name\"${showTooltip ? ` title=\"${companyName}\"` : ''}>${companyName}</div>
        ${socialButtons}
      </div>
    </div>
  `;

  setTimeout(() => {
    const el = document.getElementById(cardId);
    if (el && websiteUrl) {
      el.onclick = function(e) {
        if (
          e.target.closest('.btn-container') ||
          e.target.closest('.icon')
        ) return;
        window.open(websiteUrl, '_blank');
      };
    }
  }, 0);

  return `<div class=\"logo-card-wrapper\" id=\"${cardId}\">${cardContent}</div>`;
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
        
        const logoElement = createLogoCard(logo);
      container.innerHTML += logoElement;      
    });

    // Após renderizar, aplicar cor de fundo nos logos
    if (window.ColorThief) {
     // document.querySelectorAll('.logo-img').forEach(applyLogoBgColor);
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

      const termo = searchTerm?.toLowerCase();
      
      // Filtro por nome ou nome fantasia (obrigatório se preenchido)
      const matchesSearch = !termo || logo.clientName?.toLowerCase().includes(termo) || logo.clientFantasyName?.toLowerCase().includes(termo);
      
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
debugger
        // Filtro por categoria (obrigatório se selecionado)
        const matchesCategory = !selectedCategory || logo.logoCategory === selectedCategory;
        if (!matchesCategory) return false;
      
        return true;
    });

    // Atualiza a UI com os logos filtrados
    const container = document.getElementById('logo-container');
    container.innerHTML = '';
    filteredLogos.forEach(logo => {
        const logoElement = createLogoCard(logo);
        container.innerHTML += logoElement;
    });
  
   if (window.ColorThief) {
         // document.querySelectorAll('.logo-img').forEach(applyLogoBgColor);
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

// Função para criar HTML do horário de funcionamento
function renderOpeningHours(openingHours) {
  if (!openingHours) return '<p>Horário não informado.</p>';
  
  const dias = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const nomes = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
  
  // Obtém o dia atual e hora
  const now = new Date();
  const currentDayIndex = now.getDay();
  const adjustedIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
  
  // Verifica se está aberto usando a função isOpenNow
  const isOpen = isOpenNow(openingHours);
  const statusText = isOpen ? 'Aberto' : 'Fechado';
  const statusColor = isOpen ? '#27ae60' : '#e74c3c';
  
  // Formata a data e hora atual
  const currentDate = now.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    day: '2-digit', 
    month: '2-digit'
  }).replace(',', '');
  const currentTime = now.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
  
  let html = `
    <div style="text-align: right; margin-bottom: 8px;">
      <span style="font-size: 10px; color: #666;">${currentDate} - ${currentTime} • <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span></span>
    </div>
    <table class="opening-hours-table">
      <thead>
        <tr>
          <th>Dia</th>
          <th>Início</th>
          <th>Almoço</th>
          <th>Fim</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  dias.forEach((dia, i) => {
    const d = openingHours[dia];
    if (!d) return;
    
    // Adiciona classe 'current-day' se for o dia atual
    const isCurrentDay = i === adjustedIndex;
    const currentDayClass = isCurrentDay ? ' class="current-day"' : '';
    
    html += `<tr${currentDayClass}><td>${nomes[i]}</td>`;
    if (d.closed) {
      html += '<td colspan="3" class="closed">Fechado</td>';
    } else {
      html += `<td>${d.start || '-'}</td><td>${d.lunch_start && d.lunch_end ? d.lunch_start + ' - ' + d.lunch_end : '-'}</td><td>${d.end || '-'}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

// Função para buscar o label da categoria a partir do valor usando o objeto categories
function getCategoryLabelByValue(value) {
  for (const group of categories) {
    if (group.value === value) return group.label;
    const found = group.options && group.options.find(opt => opt.value === value);
    if (found) return found.label;
  }
  return value;
}

// Função para abrir modal de info
window.openLogoInfoModal = function(logo) {
  // Monta dados principais
  const nome = logo.clientFantasyName || logo.clientName || '';
  const categoria = getCategoryLabelByValue(logo.category || logo.logoCategory);
  const telefone = logo.telephone || logo.cellphone || '';
  let endereco = '';
  if (logo.clientAddress) {
    endereco = `${logo.clientAddress || ''}, ${logo.clientNumber || ''} - ${logo.clientNeighborhood || ''}, ${logo.clientCity || ''} - ${logo.clientUf || ''}, CEP: ${logo.clientCep || ''}`;
  }
  const site = logo.clientWebsite || logo.websiteUrl || '';
  let siteHtml = '';
  if (site) {
    siteHtml = `<div class='modal-info-row'><span class='modal-info-label'>Site:</span> <span class='modal-info-value'><a href='${site}' target='_blank' rel='noopener noreferrer'>${site.replace(/^https?:\/\//, '')}</a></span></div>`;
  }

  let mapHtml = '';
  if (logo.clientLat && logo.clientLng) {
    mapHtml = `<div class='modal-map'><iframe width='100%' height='220' style='border:0' loading='lazy' allowfullscreen referrerpolicy='no-referrer-when-downgrade' src='https://www.google.com/maps?q=${logo.clientLat},${logo.clientLng}&hl=pt&z=16&output=embed'></iframe></div>`;
  }
  let hoursHtml = renderOpeningHours(logo.openingHours);
  const modalHtml = `
    <div class='logo-info-modal-overlay' onclick='closeLogoInfoModal(event)'></div>
    <div class='logo-info-modal'>
      <button class='close-btn' onclick='closeLogoInfoModal(event)'>&times;</button>
      <div class='modal-main-info'>
        <h2 class='modal-company-name'>${nome}</h2>
        <div class='modal-info-row'><span class='modal-info-label'>Categoria:</span> <span class='modal-info-value'>${categoria || '-'}</span></div>
        <div class='modal-info-row'><span class='modal-info-label'>Telefone:</span> <span class='modal-info-value'>${telefone || '-'}</span></div>
        <div class='modal-info-row'><span class='modal-info-label'>Endereço:</span> <span class='modal-info-value'>${endereco || '-'}</span></div>
        ${siteHtml}
      </div>
      ${mapHtml}
      <h3>Horário de Funcionamento</h3>
      ${hoursHtml}
    </div>
  `;
  let modalDiv = document.getElementById('logo-info-modal-root');
  if (!modalDiv) {
    modalDiv = document.createElement('div');
    modalDiv.id = 'logo-info-modal-root';
    document.body.appendChild(modalDiv);
  }
  modalDiv.innerHTML = modalHtml;
  modalDiv.style.display = 'block';
}

window.closeLogoInfoModal = function(event) {
  if (event && event.target && event.target.classList.contains('logo-info-modal-overlay')) {
    document.getElementById('logo-info-modal-root').style.display = 'none';
  } else if (event && event.target && event.target.classList.contains('close-btn')) {
    document.getElementById('logo-info-modal-root').style.display = 'none';
  }
}

function extractYouTubeId(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtu.be')) return urlObj.pathname.slice(1);
    if (urlObj.hostname.includes('youtube.com')) return urlObj.searchParams.get('v');
    return '';
  } catch {
    return '';
  }
}

document.addEventListener('click', function(e) {
  const infoIcon = e.target.closest('.info-icon');
  if (infoIcon && infoIcon.dataset.logo) {
    e.stopPropagation();
    const logo = JSON.parse(decodeURIComponent(infoIcon.dataset.logo));
    openLogoInfoModal(logo);
  }
});

