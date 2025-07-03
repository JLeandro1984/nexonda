import { showAlert } from '../components/alert.js';

// DOM Elements
const userInfoSpan = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-button');
const manageLogosBtn = document.querySelector('[data-option="manage-logos"]');
const settingsBtn = document.querySelector('[data-option="settings"]');

// Estado global de autenticação
let authState = {
    isChecking: false,
    isAuthenticated: false,
    user: null
};

// Flag para controlar redirecionamentos
let isNavigating = false;

// Função para decodificar o token JWT
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erro ao decodificar token:', error);
        return null;
    }
}

// Função para atualizar o nome do usuário no menu
function updateUserName(name) {
    if (userInfoSpan) {
        userInfoSpan.textContent = name || 'Usuário';
    }
}

// Função para verificar se o usuário está autenticado
async function checkAuth() {
    if (authState.isChecking) return authState.isAuthenticated;
    authState.isChecking = true;

    try {
        const token = localStorage.getItem('authToken');
        console.log('Verificando autenticação. Token:', token ? 'Presente' : 'Ausente');
        
        if (!token) {
            authState.isAuthenticated = false;
            return false;
        }

        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authenticate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.log('Token inválido, removendo do localStorage');
            localStorage.removeItem('authToken');
            authState.isAuthenticated = false;
            return false;
        }

        const data = await response.json();
        console.log('Resposta da verificação:', data);

        if (data.authorized) {
            // Decodifica o token e salva o nome do usuário
            const decodedToken = decodeJwt(token);
            if (decodedToken && decodedToken.name) {
                localStorage.setItem('userName', decodedToken.name);
                updateUserName(decodedToken.name);
            }
            authState.isAuthenticated = true;
            return true;
        }

        authState.isAuthenticated = false;
        return false;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('authToken');
        authState.isAuthenticated = false;
        return false;
    } finally {
        authState.isChecking = false;
    }
}

// Função para fazer logout
async function handleLogout() {
    try {
        const token = localStorage.getItem('authToken');
        if (token) {
            await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        authState.isAuthenticated = false;
        authState.user = null;
        window.location.href = 'login.html';
    }
}

// Função para redirecionar para a página de gerenciamento de logos
function handleManageLogos() {
    if (authState.isAuthenticated) {
        window.location.href = 'manage-logos.html';
    } else {
        window.location.href = 'login.html';
    }
}

// Função para mostrar mensagem de funcionalidade em desenvolvimento
function handleSettings() {
    showAlert('Funcionalidade em desenvolvimento.', 'info');
}

// Função para inicializar a interface do admin
function initializeAdminInterface() {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (manageLogosBtn) {
        manageLogosBtn.addEventListener('click', handleManageLogos);
    }
    if (settingsBtn) {
        settingsBtn.addEventListener('click', handleSettings);
    }
}

// Função para gerenciar a navegação
async function handleNavigation() {
    if (isNavigating) return;
    isNavigating = true;

    try {
        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('login.html');
        const isAuthenticated = await checkAuth();
        const token = localStorage.getItem('authToken');

        console.log('=== Estado Atual ===');
        console.log('URL:', window.location.href);
        console.log('É página de login:', isLoginPage);
        console.log('Está autenticado:', isAuthenticated);
        console.log('Token:', token ? 'Presente' : 'Ausente');

        if (isLoginPage && isAuthenticated) {
            window.location.href = 'admin.html';
            return;
        }

        if (!isLoginPage && !isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        if (isAuthenticated) {
            initializeAdminInterface();
        }
    } catch (error) {
        console.error('Erro no handleNavigation:', error);
        window.location.href = 'login.html';
    } finally {
        isNavigating = false;
    }
}

// Função para navegar para outra página mantendo a autenticação
function navigateTo(page) {
    const token = localStorage.getItem('authToken');
    if (token) {
        // Navegação interna, sem uso de sessionStorage e sem abrir nova aba
        window.location.href = page;
    } else {
        window.location.href = 'login.html';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');
    // Adiciona eventos aos botões de navegação
    const manageLogosBtn = document.querySelector('[data-option="manage-logos"]');
    if (manageLogosBtn) {
        manageLogosBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('manage-logos.html');
        });
    }
    const manageAdvertisingBtn = document.getElementById('manage-advertising-btn');
    if (manageAdvertisingBtn) {
        manageAdvertisingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('manage-advertising.html');
        });
    }
    handleNavigation();
});

// Adiciona listener para mudanças de autenticação
window.addEventListener('storage', (event) => {
    if (event.key === 'authToken') {
        handleNavigation();
    }
});