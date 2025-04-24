import { categories } from './categories.js';

const STORAGE_KEY = 'logoGalleryData';
const categorySelect = document.getElementById("category-select");

// Carrega logos do localStorage
function loadLogosFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
}

// Cria elemento HTML para um logo
function createLogoElement(logo) {
    const logoItem = document.createElement('div');
    logoItem.className = 'logo-item';

    const imageSrc = logo.imageUrl || logo.imagem || '';

    logoItem.innerHTML = `
        <img src="${imageSrc}" alt="${logo.clientName}" loading="lazy">
        <h3>${logo.clientName}</h3>
        <p>${logo.category}</p>
    `;

    logoItem.addEventListener('click', () => {
        if (logo.websiteUrl) {
            window.open(logo.websiteUrl, '_blank');
        }
    });

    return logoItem;
}

// Renderiza todos os logos
function loadLogos() {
    const container = document.getElementById('logo-container');
    container.innerHTML = '';
    const logos = loadLogosFromStorage();

    logos.forEach(logo => {
        const logoElement = createLogoElement(logo);
        container.appendChild(logoElement);
    });
}

// Popula categorias no select de filtro
function populateFilterCategories() {
    categories.forEach(group => {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        group.options.forEach(option => {
            const optionElement = document.createElement("option");
            optionElement.value = option.label; // o valor comparado com logo.category
            optionElement.textContent = option.label;
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
