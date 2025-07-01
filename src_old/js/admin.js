import { showAlert } from '../components/alert.js';

// DOM Elements
const userInfoSpan = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-button');
const manageLogosBtn = document.getElementById('manage-logos-btn');
const manageUsersBtn = document.getElementById('manage-users-btn');
const manageAdvertisingBtn = document.getElementById('manage-advertising-btn');

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

// Função para carregar estatísticas do sistema
async function loadSystemStats() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Carregar estatísticas de usuários
        const usersResponse = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/listAuthorizedUsers', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            document.getElementById('total-users').textContent = usersData.users ? usersData.users.length : 0;
        }

        // Carregar estatísticas de logos
        const logosResponse = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/publicLogos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (logosResponse.ok) {
            const logosData = await logosResponse.json();
            document.getElementById('total-logos').textContent = logosData.logos ? logosData.logos.length : 0;
        }

        // Carregar estatísticas de anúncios
        const adsResponse = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/premiumAds', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (adsResponse.ok) {
            const adsData = await adsResponse.json();
            document.getElementById('total-ads').textContent = adsData.ads ? adsData.ads.length : 0;
        }

        // Carregar estatísticas de cliques (insights)
        const insightsResponse = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/logInsight', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'stats',
                payload: { action: 'getStats' }
            })
        });
        
        if (insightsResponse.ok) {
            const insightsData = await insightsResponse.json();
            document.getElementById('total-clicks').textContent = insightsData.totalClicks || 0;
        }

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Função para inicializar a interface do admin
function initializeAdminInterface() {
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (manageLogosBtn) {
        manageLogosBtn.addEventListener('click', handleManageLogos);
    }
    if (manageUsersBtn) {
        manageUsersBtn.addEventListener('click', () => navigateTo('admin/users.html'));
    }
    if (manageAdvertisingBtn) {
        manageAdvertisingBtn.addEventListener('click', () => navigateTo('manage-advertising.html'));
    }
    
    // Carregar estatísticas do sistema
    loadSystemStats();
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
        // Salva o token em sessionStorage também para garantir que estará disponível na próxima página
        sessionStorage.setItem('authToken', token);
        window.location.href = page;
    } else {
        window.location.href = 'login.html';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');
    
    // Adiciona eventos aos botões de navegação
    const manageLogosBtn = document.getElementById('manage-logos-btn');
    if (manageLogosBtn) {
        manageLogosBtn.addEventListener('click', () => navigateTo('manage-logos.html'));
    }

    const manageAdvertisingBtn = document.getElementById('manage-advertising-btn');
    if (manageAdvertisingBtn) {
        manageAdvertisingBtn.addEventListener('click', () => navigateTo('manage-advertising.html'));
    }

    handleNavigation();
});

// Adiciona listener para mudanças de autenticação
window.addEventListener('storage', (event) => {
    if (event.key === 'authToken') {
        handleNavigation();
    }
});