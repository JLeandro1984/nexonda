import { contactsApi } from './api.js';

// Elementos DOM
const contactForm = document.getElementById("contact-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const messageInput = document.getElementById("message");
const categorySelect = document.getElementById("category-select");

// Constantes
const STORAGE_KEY = 'contactFormData';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadFormData();
});

contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    try {
        const formData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            message: messageInput.value.trim(),
            category: categorySelect.value,
            createdAt: new Date().toISOString()
        };

        // Validação básica
        if (!formData.name || !formData.email || !formData.message) {
            showAlert('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        // Validação de email
        if (!isValidEmail(formData.email)) {
            showAlert('Por favor, insira um email válido.', 'error');
            return;
        }

        // Envia o formulário
        await contactsApi.add(formData);
        
        // Limpa o formulário e o localStorage
        contactForm.reset();
        localStorage.removeItem(STORAGE_KEY);
        
        showAlert('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showAlert('Erro ao enviar mensagem. Por favor, tente novamente.', 'error');
    }
});

// Salva os dados do formulário no localStorage
function saveFormData() {
    const formData = {
        name: nameInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        message: messageInput.value,
        category: categorySelect.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
}

// Carrega os dados do formulário do localStorage
function loadFormData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        const formData = JSON.parse(savedData);
        nameInput.value = formData.name || '';
        emailInput.value = formData.email || '';
        phoneInput.value = formData.phone || '';
        messageInput.value = formData.message || '';
        categorySelect.value = formData.category || '';
    }
}

// Adiciona listeners para salvar os dados
nameInput.addEventListener('input', saveFormData);
emailInput.addEventListener('input', saveFormData);
phoneInput.addEventListener('input', saveFormData);
messageInput.addEventListener('input', saveFormData);
categorySelect.addEventListener('change', saveFormData);

// Funções auxiliares
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}