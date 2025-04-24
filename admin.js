// Constantes
const STORAGE_KEY = 'logoGalleryData';

// Função para carregar logos do localStorage
function loadLogosFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData ? JSON.parse(storedData) : [];
}

// Função para salvar logos no localStorage
function saveLogosToStorage(logos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logos));
}

// Sample data structure for logos (in a real application, this would come from a database)
let logos = loadLogosFromStorage();

// DOM Elements
const addLogoBtn = document.getElementById('add-logo-btn');
const logoForm = document.getElementById('logo-form');
const logoManagementForm = document.getElementById('logo-management-form');
const logosList = document.getElementById('logos-list');
const cancelBtn = document.querySelector('.cancel-btn');

// Function to create a logo card
function createLogoCard(logo) {
    const card = document.createElement('div');
    card.className = 'logo-card';
    card.innerHTML = `
        <img src="${logo.imageUrl}" alt="${logo.name}">
        <h3>${logo.name}</h3>
        <p>Categoria: ${logo.category}</p>
        <p>Website: <a href="${logo.websiteUrl}" target="_blank">${logo.websiteUrl}</a></p>
        <div class="logo-actions">
            <button class="edit-btn" data-id="${logo.id}">Editar</button>
            <button class="delete-btn" data-id="${logo.id}">Excluir</button>
        </div>
    `;
    return card;
}

// Function to load logos into the admin interface
function loadLogosAdmin() {
    logosList.innerHTML = '';
    logos.forEach(logo => {
        const logoCard = createLogoCard(logo);
        logosList.appendChild(logoCard);
    });
}

// Function to show the logo form
function showLogoForm(logo = null) {
    logoForm.style.display = 'block';
    if (logo) {
        document.getElementById('logo-id').value = logo.id;
        document.getElementById('logo-name').value = logo.name;
        document.getElementById('logo-image').value = logo.imageUrl;
        document.getElementById('logo-website').value = logo.websiteUrl;
        document.getElementById('logo-category').value = logo.category;
    } else {
        logoManagementForm.reset();
    }
}

// Function to hide the logo form
function hideLogoForm() {
    logoForm.style.display = 'none';
    logoManagementForm.reset();
}

// Função para validar o logo
function validateLogo(logoData) {
    const errors = [];
    
    // Validar URL da imagem
    if (!logoData.imageUrl) {
        errors.push('URL do logo é obrigatória');
    } else {
        // Verificar extensão do arquivo
        const validExtensions = ['.png', '.svg'];
        const hasValidExtension = validExtensions.some(ext => 
            logoData.imageUrl.toLowerCase().endsWith(ext)
        );
        
        if (!hasValidExtension) {
            errors.push('Formato de arquivo inválido. Use apenas PNG ou SVG.');
        }
    }

    // Validar nome da empresa
    if (!logoData.name || logoData.name.trim().length < 2) {
        errors.push('Nome da empresa deve ter pelo menos 2 caracteres');
    }

    // Validar URL do website
    if (!logoData.websiteUrl) {
        errors.push('URL do website é obrigatória');
    } else {
        try {
            new URL(logoData.websiteUrl);
        } catch (e) {
            errors.push('URL do website inválida');
        }
    }

    // Validar categoria
    if (!logoData.category || logoData.category.trim().length < 2) {
        errors.push('Categoria deve ter pelo menos 2 caracteres');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Função para exibir erros de validação
function showValidationErrors(errors) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'validation-errors';
    errorContainer.innerHTML = `
        <h4>Erros de Validação:</h4>
        <ul>
            ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
    `;
    
    // Remover erros anteriores se existirem
    const existingErrors = document.querySelector('.validation-errors');
    if (existingErrors) {
        existingErrors.remove();
    }
    
    // Inserir novos erros antes do formulário
    logoForm.insertBefore(errorContainer, logoManagementForm);
}

// Function to handle form submission
function handleLogoFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        id: document.getElementById('logo-id').value || Date.now(),
        name: document.getElementById('logo-name').value,
        imageUrl: document.getElementById('logo-image').value,
        websiteUrl: document.getElementById('logo-website').value,
        category: document.getElementById('logo-category').value
    };

    // Validar os dados
    const validation = validateLogo(formData);
    
    if (!validation.isValid) {
        showValidationErrors(validation.errors);
        return;
    }

    // Se a validação passar, prosseguir com o salvamento
    const existingIndex = logos.findIndex(logo => logo.id == formData.id);
    if (existingIndex !== -1) {
        logos[existingIndex] = formData;
    } else {
        logos.push(formData);
    }

    // Salvar no localStorage
    saveLogosToStorage(logos);

    // Reload logos and hide form
    loadLogosAdmin();
    hideLogoForm();
}

// Function to handle logo deletion
function handleLogoDelete(logoId) {
    if (confirm('Tem certeza que deseja excluir este logo?')) {
        logos = logos.filter(logo => logo.id != logoId);
        saveLogosToStorage(logos);
        loadLogosAdmin();
    }
}

// Function to handle logo editing
function handleLogoEdit(logoId) {
    const logo = logos.find(logo => logo.id == logoId);
    if (logo) {
        showLogoForm(logo);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuário está autenticado
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
        window.location.href = 'login.html';
        return;
    }

    // Exibir nome do usuário
    const userName = localStorage.getItem('userName') || 'Usuário';
    document.querySelector('.user-info span').textContent = userName;

    // Adicionar evento de logout
    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
    });

    // Adicionar eventos aos cards de opções
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.addEventListener('click', () => {
            const option = card.getAttribute('data-option');
            switch (option) {
                case 'manage-logos':
                    window.location.href = 'manage-logos.html';
                    break;
                case 'settings':
                    window.location.href = 'settings.html';
                    break;
            }
        });
    });

    // Carregar informações do usuário
    loadUserInfo();

    loadLogosAdmin();

    addLogoBtn.addEventListener('click', () => showLogoForm());
    cancelBtn.addEventListener('click', hideLogoForm);
    logoManagementForm.addEventListener('submit', handleLogoFormSubmit);

    // Delegate events for edit and delete buttons
    logosList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('edit-btn')) {
            handleLogoEdit(target.dataset.id);
        } else if (target.classList.contains('delete-btn')) {
            handleLogoDelete(target.dataset.id);
        }
    });
});

function loadUserInfo() {
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    
    if (userName) {
        document.getElementById('user-name').textContent = userName;
    } else {
        // Se não tiver o nome do usuário, buscar do servidor
        fetch('/api/user/info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('user-name').textContent = data.name;
            localStorage.setItem('userName', data.name);
        })
        .catch(error => {
            console.error('Erro ao carregar informações do usuário:', error);
        });
    }
} 