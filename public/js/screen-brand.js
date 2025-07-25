import { categories } from './categories.js';
import { ufs } from './ufs.js';
import { formatarNumeroAbreviado } from './utils.js';
import { showAlert } from '../components/alert.js';

// Constants
const STORAGE_KEY = 'contactFormData';
const categorySelect = document.getElementById("category-select");

// Carrega logos do Firebase Functions
async function loadLogosFromStorage() {
    try {
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/publicLogos', {
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

// Carrega estatísticas da galeria
async function loadGalleryStats() {
  try {
    const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/getGalleryStats');
    if (!response.ok) {
      throw new Error('Erro ao carregar estatísticas');
    }
    const stats = await response.json();
    
    const visitorsElement = document.getElementById('total-visitors');
    if (visitorsElement) {
      // count visita - Se não há visitantes, mostra um valor padrão
      const visitorCount = stats.totalVisitors || 0;
      if (visitorCount > 1000) {
        visitorsElement.textContent = formatarNumeroAbreviado(visitorCount);
        document.getElementById('id-visitors-summary').classList.remove('d-none');
      }
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas da galeria:', error);
  }
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

  // Nome fantasia e CNPJ
  const companyName = logo.clientFantasyName || '';
 /* const companyCNPJ = logo.clientCNPJ || '';*/
  const showTooltip = companyName.length > 22;

  // Informações de insights (cliques/interações)
  // obs: NÃO APRESENTAR CLIQUES NO LOGO POR ENQUANTO - Analisar situação
  //const elementClicks = `${logo.clicks > 100 ? `<div class="logo-views-overlay d-none"><i class="far fa-eye"></i> ${formatarNumeroAbreviado(logo.clicks)}</div>` : ''}` 
  const elementClicks = ""; 

  // Monta botões sociais se houver URL e não for plano básico
  let socialButtons = '';
  const isBasicPlan = (logo.planType || '').toLowerCase() === 'basico';
  
  if (!isBasicPlan && (whatsappUrl || instagramUrl || facebookUrl || youtubeUrl)) {
    socialButtons = `<div class="btn-container" style="margin-top: 10px;">
   
    ${whatsappUrl
      ? `<a class="whatsapp-btn" href="${
          whatsappUrl.startsWith('http')
            ? whatsappUrl
            : 'https://wa.me/' + whatsappUrl.replace(/\D/g, '') + '?text=' + encodeURIComponent('Olá! Estou entrando em contato através do Nexonda.')
        }" target="_blank" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`
      : ''}

      ${instagramUrl ? `<a class="instagram-btn" href="${instagramUrl}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>` : ''}
      ${facebookUrl ? `<a class="facebook-btn" href="${facebookUrl}" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a>` : ''}
      ${youtubeUrl ? `<a class="youtube-btn" title="Assistir vídeo no YouTube" href="#" onclick="window.openYouTubePlayer('${youtubeUrl.replace(/'/g, "\\'")}');return false;"><i class="fab fa-youtube"></i></a>` : ''}
    </div>`;
  }

  // Card HTML
  const cardId = `logo-card-${Math.random().toString(36).substr(2, 9)}`;
  // Exibe o ícone de info apenas se o plano não for 'basico'
  const showInfoIcon = (logo.planType || '').toLowerCase() !== 'basico';
  const infoIconHtml = showInfoIcon ? `<span class="icon info-icon small-info-icon" title="Para mais informações clique aqui." data-logo="${encodeURIComponent(JSON.stringify(logo))}"><i class="fas fa-info-circle"></i></span>` : '';
  const cardContent = `
    <div class="logo-card">
      <div class="logo-img-container">
        <img src="${logo.imageUrl || ''}" alt="Logo da ${companyName}" class="logo-img" />
        ${elementClicks}
      </div>
      <div class="logo-card-body">
        <div class="logo-info-row">
          ${infoIconHtml}
          <span class="status-label ${statusColor}" style="margin-left: 6px; font-size: 0.95em;">${statusText}</span>
        </div>
        <div class="company-name"${showTooltip ? ` title="${companyName}"` : ''}>${companyName}</div>
        ${socialButtons}
      </div>
    </div>
  `;

  setTimeout(() => {
    const el = document.getElementById(cardId);
    if (el && websiteUrl) {
      el.onclick = function(e) {
        // Evita conflitos com outros eventos de clique
        if (
          e.target.closest('.btn-container') ||
          e.target.closest('.icon') ||
          e.target.closest('.search-box') ||
          e.target.closest('.category-filter') ||
          e.target.closest('.suggestions-list')
        ) return;
        
        // Previne propagação do evento
        e.stopPropagation();
        window.open(websiteUrl, '_blank');
      };
    }
  }, 0);

  return `<div class="logo-card-wrapper" id="${cardId}" data-fantasia="${companyName}">${cardContent}</div>`;
}



// Renderiza todos os logos
export async function loadLogos() {
    const container = document.getElementById('logo-container');
    if (!container) return; // Se o container não existe, não faz nada

    container.innerHTML = '';
    const logos = await loadLogosFromStorage();
    
    // Carrega estatísticas da galeria
    await loadGalleryStats();

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
      
          return a.clientFantasyName.localeCompare(b.clientFantasyName); // Nome alfabético
        });
      } else {
        console.error("logos não é um array:", logos);
      }
     
    logos.forEach(logo => {
       // if (!contratoAtivo(logo)) return;
        
        const logoElement = createLogoCard(logo);
      container.innerHTML += logoElement;      
    });
  
  document.getElementById('use-location').checked = false;
  document.getElementById('detected-city').textContent = '';
  
    // Após renderizar, aplicar cor de fundo nos logos
   // if (window.ColorThief) {
     // document.querySelectorAll('.logo-img').forEach(applyLogoBgColor);
    //}
    
}

/*function contratoAtivo(logo) {
    const endDate = new Date(logo.endDate);
    const today = new Date();

        // Zera o horário de hoje para comparação apenas por data (opcional)
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

    if (endDate < today) return false;

    if (!logo.contractActive) return false; 
    

    return true
}*/

// Popula categorias no select de filtro
export function populateFilterCategories() {
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

// Custom Category Select (dropdown com busca embutida)
const customCategoryContainer = document.getElementById('custom-category-select');
let customCategoryValue = '';

function renderCustomCategorySelect() {
  if (!customCategoryContainer) return;
  // Remove qualquer dropdown anterior
  customCategoryContainer.innerHTML = '';

  // Estrutura base
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  wrapper.style.position = 'relative';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'custom-select-input';
  input.placeholder = 'Pesquisar categoria...';
  input.autocomplete = 'off';
  input.readOnly = true;
  input.style.cursor = 'pointer';

  const dropdown = document.createElement('div');
  dropdown.className = 'custom-select-dropdown';
  dropdown.style.display = 'none';
  dropdown.style.position = 'absolute';
  dropdown.style.top = '100%';
  dropdown.style.left = '0';
  dropdown.style.width = '100%';
  dropdown.style.background = '#fff';
  dropdown.style.border = '1px solid #ccc';
  dropdown.style.zIndex = '1000';
  dropdown.style.maxHeight = '220px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';

  // Campo de busca dentro do dropdown
  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'custom-select-search';
  search.placeholder = 'Digite para filtrar...';
  search.style.width = '96%';
  search.style.margin = '8px 2% 8px 2%';
  search.style.padding = '4px';
  search.style.fontSize = '1em';
  search.style.border = '1px solid #eee';
  search.style.borderRadius = '4px';

  // Opção "Todas as Categorias"
  const allOption = document.createElement('div');
  allOption.className = 'custom-select-option';
  allOption.textContent = 'Todas as Categorias';
  allOption.dataset.value = '';
  allOption.tabIndex = 0;
  allOption.style.padding = '8px 12px';
  allOption.style.cursor = 'pointer';
  allOption.style.fontWeight = 'bold';
  allOption.addEventListener('click', () => {
    customCategoryValue = '';
    input.value = 'Todas as Categorias';
    dropdown.style.display = 'none';
    updateLogoDisplay();
  });

  // Monta as opções agrupadas
  const optionsFragment = document.createDocumentFragment();
  optionsFragment.appendChild(allOption);

  categories.forEach(group => {
    const groupLabel = document.createElement('div');
    groupLabel.textContent = group.label;
    groupLabel.style.fontWeight = 'bold';
    groupLabel.style.padding = '6px 12px 2px 12px';
    groupLabel.style.color = '#888';
    optionsFragment.appendChild(groupLabel);
    group.options.forEach(option => {
      const opt = document.createElement('div');
      opt.className = 'custom-select-option';
      opt.textContent = option.label;
      opt.dataset.value = option.value;
      opt.tabIndex = 0;
      opt.style.padding = '8px 12px';
      opt.style.cursor = 'pointer';
      opt.addEventListener('click', () => {
        customCategoryValue = option.value;
        input.value = option.label;
        dropdown.style.display = 'none';
        updateLogoDisplay();
      });
      optionsFragment.appendChild(opt);
    });
  });

  dropdown.appendChild(search);
  dropdown.appendChild(optionsFragment);

  // Mostra/oculta dropdown
  input.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    search.value = '';
    filterOptions('');
    setTimeout(() => search.focus(), 100);
  });

  // Fecha dropdown ao clicar fora
  document.addEventListener('click', function handleClickOutside(e) {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Filtra opções
  function filterOptions(term) {
    // Função para normalizar texto (remover acentos e lowercase)
    function normalizarTexto(str) {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // CORRETO: Remover apenas acentos
        .toLowerCase();
    }
    const termNorm = normalizarTexto(term.trim());
    const options = dropdown.querySelectorAll('.custom-select-option');
    options.forEach(opt => {
      if (opt === allOption) return; // sempre mostra "Todas as Categorias"
      const labelNorm = normalizarTexto(opt.textContent);
      opt.style.display = labelNorm.includes(termNorm) ? '' : 'none';
    });
    // Esconde grupos se nenhum filho visível
    const groupLabels = dropdown.querySelectorAll('div');
    let lastWasGroup = false;
    groupLabels.forEach(el => {
      if (el.className === 'custom-select-option') {
        lastWasGroup = false;
      } else if (el !== search && el !== allOption) {
        // é um group label
        // se o próximo visível for um option, mostra, senão esconde
        let next = el.nextSibling;
        let hasVisible = false;
        while (next && next.className === 'custom-select-option') {
          if (next.style.display !== 'none') { hasVisible = true; break; }
          next = next.nextSibling;
        }
        el.style.display = hasVisible ? '' : 'none';
      }
    });
  }
  search.addEventListener('input', function () {
    filterOptions(this.value);
  });

  // Navegação por teclado
  dropdown.addEventListener('keydown', function(e) {
    const focusable = Array.from(dropdown.querySelectorAll('.custom-select-option')).filter(opt => opt.style.display !== 'none');
    const idx = focusable.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusable[idx + 1] || focusable[0];
      next && next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusable[idx - 1] || focusable[focusable.length - 1];
      prev && prev.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.activeElement.click();
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.blur();
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);
  customCategoryContainer.appendChild(wrapper);

  // Inicializa valor
  input.value = 'Todas as Categorias';
}

// Atualiza o filtro de categoria para usar o valor do custom select
function getSelectedCategory() {
  return customCategoryValue;
}

// Atualiza os logos com base no filtro
export async function updateLogoDisplay() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const locationTerm = document.getElementById('location-input')?.value.toLowerCase() || '';
    const isUselocation = document.getElementById('use-location').checked;
    let cityeUselocation = "";
  debugger;
    if (isUselocation) {
        cityeUselocation = document.getElementById('detected-city').textContent;
    }

    const selectedCategory = getSelectedCategory();
    const logos = await loadLogosFromStorage();

    const normalizar = termo => {
        if (!termo) return "";
        
        // Remove acentos e caracteres especiais
        const removeAcentos = (str) => {
            return str.normalize('NFD')
                     .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                     .replace(/[^\w\s-]/g, '') // Remove caracteres especiais exceto hífen
                     .replace(/\s+/g, ' ') // Remove espaços múltiplos
                     .trim();
        };
        
        return removeAcentos(termo.trim().toLowerCase());
    };

      const separarPartes = termo => {
        const [cidade, uf] = normalizar(termo).split(/\s*-\s*/);
        return [cidade.trim(), uf?.trim()].filter(Boolean);
      };

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
        //if (!contratoAtivo(logo)) return false;
      const termo = searchTerm?.toLowerCase();
      
        const isOpen = isOpenNow(logo.openingHours);
        const statusText = isOpen ? 'aberto' : 'fechado';
        
        const matchesSearch =
          !termo ||
          logo.clientAddress?.toLowerCase().includes(termo) ||
          logo.clientNeighborhood?.toLowerCase().includes(termo) ||
          logo.clientCep?.toLowerCase().includes(termo) ||
          logo.description?.toLowerCase().includes(termo) ||
          logo.clientName?.toLowerCase().includes(termo) ||
          logo.clientFantasyName?.toLowerCase().includes(termo) ||
          logo.cellphone?.toLowerCase().includes(termo) ||
          logo.clientWhatsapp?.toLowerCase().includes(termo) ||
          logo.clientWebsite?.toLowerCase().includes(termo) ||
          logo.telephone?.toLowerCase().includes(termo) ||
          statusText.includes(termo); // <- aqui entra o "aberto" ou "fechado"
      
      
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
        const logoElement = createLogoCard(logo);
        container.innerHTML += logoElement;
    });
  
   if (window.ColorThief) {
         // document.querySelectorAll('.logo-img').forEach(applyLogoBgColor);
      }
}


// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('logo-container');
    if (container) {
        await loadLogos();
        renderCustomCategorySelect();
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            e.preventDefault();
            e.stopPropagation();
            updateLogoDisplay();
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', function(e) {
            e.preventDefault();
            e.stopPropagation();
            updateLogoDisplay();
        });
    }
    
    // Adiciona evento para o checkbox de localização
    const useLocationCheckbox = document.getElementById('use-location');
    if (useLocationCheckbox) {
        useLocationCheckbox.addEventListener('change', function(e) {
            e.preventDefault();
            e.stopPropagation();
            updateLogoDisplay();
        });
    }
        
});

 
// WhatsApp flutuante da Nexonda
const whatsappNumber = '5515996257159'; // Exemplo: 55 + DDD + número
const whatsappMessage = 'Olá, gostaria de mais informações sobre a Nexonda! 😊';
const whatsappLink = document.querySelector('.whatsapp-float');

if (whatsappLink) {
  const encodedMessage = encodeURIComponent(whatsappMessage);
  whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
}


//Autocomplete - pesquisa por nome de cidade e/ou UF
const locationInputForAutocomplete = document.getElementById('location-input');
if (locationInputForAutocomplete) {
    locationInputForAutocomplete.addEventListener('input', function(e) {
        e.preventDefault();
        e.stopPropagation();
        updateLogoDisplay();
    });
}

async function getUniqueCitiesFromLogos() {
    const logos = await loadLogosFromStorage();
    const cityMap = new Map(); // Usamos Map para manter a ordem

    // Função para normalizar texto (remover acentos)
    const normalizarTexto = (str) => {
        if (!str) return "";
        return str.normalize('NFD')
                 .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                 .replace(/[^\w\s-]/g, '') // Remove caracteres especiais exceto hífen
                 .replace(/\s+/g, ' ') // Remove espaços múltiplos
                 .trim()
                 .toLowerCase();
    };

    logos.forEach(logo => {
        if (logo.clientCity && logo.clientUf) {
            const cityNormalized = normalizarTexto(logo.clientCity);
            const ufNormalized = normalizarTexto(logo.clientUf);
            const key = `${cityNormalized}-${ufNormalized}`;
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

if (inputElement && suggestionsList) {
    inputElement.addEventListener("input", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        
        const searchTerm = this.value.toLowerCase().trim();
        suggestionsList.innerHTML = "";

        if (searchTerm.length < 2) {
            suggestionsList.style.display = "none";
            return;
        }

        // Função para normalizar texto (remover acentos)
        const normalizarTexto = (str) => {
            if (!str) return "";
            return str.normalize('NFD')
                     .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                     .replace(/[^\w\s-]/g, '') // Remove caracteres especiais exceto hífen
                     .replace(/\s+/g, ' ') // Remove espaços múltiplos
                     .trim()
                     .toLowerCase();
        };

        const searchTermNormalized = normalizarTexto(searchTerm);
        const rawCities = await getUniqueCitiesFromLogos();
        const uniqueCityMap = new Map(); // chave: nome normalizado, valor: nome original

        rawCities.forEach(city => {
            const normalized = normalizarTexto(city);
            if (!uniqueCityMap.has(normalized)) {
                uniqueCityMap.set(normalized, city.trim());
            }
        });

        const filteredCities = Array.from(uniqueCityMap.entries())
            .filter(([normalized, original]) => normalized.includes(searchTermNormalized))
            .map(([normalized, original]) => original);

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
                        e.preventDefault();
                        e.stopPropagation();
                        
                        inputElement.value = city;
                        suggestionsList.innerHTML = "";
                        suggestionsList.style.display = "none";
                        
                        // Atualiza a exibição dos logos após selecionar uma cidade
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
}

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
    if (inputElement && suggestionsList && event.target !== inputElement && 
        !suggestionsList.contains(event.target)) {
        suggestionsList.style.display = "none";
    }
    
    // Evita conflitos com outros eventos de clique
    if (event.target.closest('.search-box') || 
        event.target.closest('.category-filter') || 
        event.target.closest('.suggestions-list')) {
        return;
    }
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

          const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/publicContacts', {
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
  debugger
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
  const nome = logo.clientFantasyName || '';
  const categoria = getCategoryLabelByValue(logo.category);
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

  // Exibir endereço e mapa apenas se showAddress for true
  let addressHtml = '';
  let mapHtml = '';
  if (logo.showAddress) {
    addressHtml = `<div class='modal-info-row'><span class='modal-info-label'>Endereço:</span> <span class='modal-info-value'>${endereco || '-'}</span></div>`;
    if (logo.clientLat && logo.clientLng) {
      mapHtml = `<div class='modal-map'><iframe width='100%' height='220' style='border:0' loading='lazy' allowfullscreen referrerpolicy='no-referrer-when-downgrade' src='https://www.google.com/maps?q=${logo.clientLat},${logo.clientLng}&hl=pt&z=16&output=embed'></iframe></div>`;
    }
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
        ${addressHtml}
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
    e.preventDefault();
    e.stopPropagation();
    
    // Evita conflitos com outros eventos de clique
    if (e.target.closest('.search-box') || 
        e.target.closest('.category-filter') || 
        e.target.closest('.suggestions-list')) {
        return;
    }
    
    const logo = JSON.parse(decodeURIComponent(infoIcon.dataset.logo));
    openLogoInfoModal(logo);
  }
});

//Evitar erro AdSense
if (!window.adsbygoogle || !window.adsbygoogle.loaded) {
  console.warn("AdSense bloqueado ou não carregado");
}

// Filtro de categorias por texto digitado
const categorySearchInput = document.getElementById('category-search-input');
if (categorySearchInput && categorySelect) {
  categorySearchInput.addEventListener('input', function () {
    const searchTerm = this.value.trim().toLowerCase();
    // Para cada optgroup
    Array.from(categorySelect.children).forEach(optgroup => {
      if (optgroup.tagName === 'OPTGROUP') {
        let hasVisible = false;
        Array.from(optgroup.children).forEach(option => {
          const label = option.textContent.toLowerCase();
          const match = label.includes(searchTerm);
          option.style.display = match ? '' : 'none';
          if (match) hasVisible = true;
        });
        // Esconde optgroup se nenhum filho visível
        optgroup.style.display = hasVisible ? '' : 'none';
      } else if (optgroup.tagName === 'OPTION') {
        // Para o option "Todas as Categorias"
        const label = optgroup.textContent.toLowerCase();
        optgroup.style.display = label.includes(searchTerm) ? '' : 'none';
      }
    });
  });
}
