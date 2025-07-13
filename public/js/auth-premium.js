// ===== AUTH PREMIUM - Sistema de Autenticação Premium =====

import { showAlert } from '../components/alert.js';
import { logosApi } from './api.js';

// Estados da aplicação
let currentStep = 'login';
let userEmail = '';
let userCNPJ = '';
let otpCode = '';
let otpExpiry = null;
let otpTimer = null;
let resendTimer = null;
let attempts = 0;
const MAX_ATTEMPTS = 3;
const OTP_VALIDITY_MINUTES = 5;
const RESEND_COOLDOWN_MINUTES = 2;
let emailExistsInLogos = false;

// Elementos DOM
const authScreen = document.getElementById('auth-premium-screen');
const premiumDashboard = document.getElementById('premium-dashboard');
const gmailLoginBtn = document.getElementById('gmail-login-btn');
const validateCnpjBtn = document.getElementById('validate-cnpj-btn');
const verifyOtpBtn = document.getElementById('verify-otp-btn');
const resendOtpBtn = document.getElementById('resend-otp-btn');
const logoutPremiumBtn = document.getElementById('logout-premium-btn');
const cnpjInput = document.getElementById('cnpj-input');
const cnpjFeedback = document.createElement('small');
cnpjFeedback.id = 'cnpj-feedback';
cnpjFeedback.className = 'form-hint error-message';
if (cnpjInput && cnpjInput.parentNode && !document.getElementById('cnpj-feedback')) {
    cnpjInput.parentNode.appendChild(cnpjFeedback);
}
const otpInput = document.getElementById('otp-input');
const userEmailDisplay = document.getElementById('user-email-display');
const otpEmailDisplay = document.getElementById('otp-email-display');
const premiumUserEmail = document.getElementById('premium-user-email');
const premiumUserCnpj = document.getElementById('premium-user-cnpj');
const loadingElement = document.getElementById('auth-loading');
const loadingMessage = document.getElementById('loading-message');
const gmailInput = document.getElementById('gmail-input');
const gmailInputHint = document.getElementById('gmail-input-hint');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeAuthPremium();
});

function initializeAuthPremium() {
    // Verificar se já está autenticado no sistema (token no localStorage)
    const token = localStorage.getItem('authToken');
    if (!token) {
        showAlert('Você precisa estar autenticado para acessar esta área. Faça login normalmente primeiro.', 'Acesso restrito', 'error');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 1500);
        return;
    }
    // Verificar se já está autenticado premium
    const isAuthenticated = checkPremiumAuth();
    if (isAuthenticated) {
        showPremiumDashboard();
        return;
    }
    // Event listeners
    setupEventListeners();
    // Verificar se há email salvo
    const savedEmail = localStorage.getItem('premiumUserEmail');
    if (savedEmail) {
        userEmail = savedEmail;
        showStep('cnpj');
    }
}

function setupEventListeners() {
    // Login Gmail
    if (gmailLoginBtn) {
        gmailLoginBtn.addEventListener('click', handleGmailLogin);
    }
    // Validação e feedback do input Gmail
    if (gmailInput) {
        gmailInput.addEventListener('input', handleGmailInputValidationAsync);
        gmailInput.addEventListener('blur', handleGmailInputValidationAsync);
        gmailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !gmailLoginBtn.disabled) handleGmailLogin();
        });
    }

    // Validação CNPJ
    if (validateCnpjBtn) {
        validateCnpjBtn.addEventListener('click', handleCnpjValidation);
    }

    // Verificação OTP
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', handleOtpVerification);
    }

    // Reenvio OTP
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', handleResendOtp);
    }

    // Logout Premium
    if (logoutPremiumBtn) {
        logoutPremiumBtn.addEventListener('click', handlePremiumLogout);
    }

    // Input listeners
    if (cnpjInput) {
        cnpjInput.addEventListener('input', formatCNPJ);
        cnpjInput.addEventListener('input', clearCnpjError);
        cnpjInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleCnpjValidation();
        });
    }

    if (otpInput) {
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
        otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleOtpVerification();
        });
    }
}

// ===== HANDLERS =====

async function handleGmailLogin() {
    try {
        // Pega o valor do input
        const email = gmailInput.value.trim();
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
            showAlert('Digite um e-mail Gmail válido.', 'Erro', 'error');
            gmailInput.classList.add('error-state');
            gmailInputHint.textContent = 'Digite um e-mail Gmail válido (ex: seuemail@gmail.com)';
            gmailInputHint.classList.add('error-message');
            return;
        }
        // Verifica se existe na coleção logos
        if (!emailExistsInLogos) {
            showAlert('E-mail não cadastrado no sistema.', 'Erro', 'error');
            gmailInput.classList.add('error-state');
            gmailInputHint.textContent = 'E-mail não cadastrado no sistema.';
            gmailInputHint.classList.add('error-message');
            gmailLoginBtn.disabled = true;
            return;
        }
        showLoading('Iniciando login com Gmail...');
        userEmail = email;
        localStorage.setItem('premiumUserEmail', email);
        hideLoading();
        showStep('cnpj');
    } catch (error) {
        hideLoading();
        showAlert('Erro ao fazer login com Gmail: ' + error.message, 'error');
    }
}

async function handleCnpjValidation() {
    try {
        const cnpj = cnpjInput.value.replace(/\D/g, '');
        
        if (!cnpj || cnpj.length !== 14) {
            showAlert('CNPJ inválido. Digite um CNPJ válido.', 'Erro', 'error');
            cnpjInput.classList.add('error-state');
            cnpjFeedback.textContent = 'CNPJ inválido. Digite um CNPJ válido.';
            cnpjFeedback.classList.add('error-message');
            return;
        }

        showLoading('Validando CNPJ...');
        
        // Validar CNPJ na coleção logos
        const isValid = await validateCnpjInLogos(userEmail, cnpj);
        
        if (isValid) {
            userCNPJ = cnpj;
            hideLoading();
            clearCnpjError();
            savePremiumAuth();
            // Redireciona diretamente para AdminPremium.html após validação do CNPJ
            window.location.href = 'AdminPremium.html';
            return;
        } else {
            hideLoading();
            showAlert('E-mail e CNPJ não encontrados juntos no sistema. Verifique se ambos pertencem ao mesmo cadastro.', 'Erro', 'error');
            cnpjInput.classList.add('error-state');
            cnpjFeedback.textContent = 'E-mail e CNPJ não encontrados juntos no sistema.';
            cnpjFeedback.classList.add('error-message');
            attempts++;
            
            if (attempts >= MAX_ATTEMPTS) {
                showAlert('Máximo de tentativas excedido. Tente novamente mais tarde.', 'Erro', 'error');
                resetAuth();
            }
        }
        
    } catch (error) {
        hideLoading();
        showAlert('Erro ao validar CNPJ: ' + error.message, 'error');
    }
}

function clearCnpjError() {
    cnpjInput.classList.remove('error-state');
    cnpjFeedback.textContent = '';
    cnpjFeedback.classList.remove('error-message');
}

async function handleOtpVerification() {
    try {
        const inputOtp = otpInput.value;
        
        if (!inputOtp || inputOtp.length !== 6) {
            showAlert('Digite o código de 6 dígitos.', 'error');
            return;
        }

        if (isOtpExpired()) {
            showAlert('Código expirado. Solicite um novo código.', 'error');
            return;
        }

        showLoading('Verificando código...');
        
        // Verificar OTP
        if (inputOtp === otpCode) {
            hideLoading();
            showAlert('Autenticação realizada com sucesso!', 'success');
            
            // Salvar dados de autenticação
            savePremiumAuth();
            
            // Mostrar dashboard
            showPremiumDashboard();
        } else {
            hideLoading();
            showAlert('Código incorreto. Tente novamente.', 'error');
            attempts++;
            
            if (attempts >= MAX_ATTEMPTS) {
                showAlert('Máximo de tentativas excedido. Tente novamente mais tarde.', 'error');
                resetAuth();
            }
        }
        
    } catch (error) {
        hideLoading();
        showAlert('Erro ao verificar código: ' + error.message, 'error');
    }
}

async function handleResendOtp() {
    try {
        showLoading('Reenviando código...');
        await sendOtpCode();
        hideLoading();
        showAlert('Novo código enviado com sucesso!', 'success');
        
    } catch (error) {
        hideLoading();
        showAlert('Erro ao reenviar código: ' + error.message, 'error');
    }
}

function handlePremiumLogout() {
    clearPremiumAuth();
    resetAuth();
    showAuthScreen();
    showAlert('Logout realizado com sucesso!', 'success');
}

async function handleGmailInputValidationAsync() {
    const value = gmailInput.value.trim();
    const isFormatValid = /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value);
    if (!isFormatValid) {
        gmailInput.classList.remove('success-state');
        gmailInput.classList.add('error-state');
        gmailInputHint.textContent = 'Digite um e-mail Gmail válido (ex: seuemail@gmail.com)';
        gmailInputHint.classList.remove('success-message');
        gmailInputHint.classList.add('error-message');
        gmailLoginBtn.disabled = true;
        emailExistsInLogos = false;
        return;
    }
    // Consulta na coleção logos
    gmailInputHint.textContent = 'Verificando e-mail...';
    gmailInputHint.classList.remove('error-message', 'success-message');
    gmailInput.classList.remove('error-state', 'success-state');
    gmailLoginBtn.disabled = true;
    emailExistsInLogos = false;
    try {
        const { logosApi } = await import('./api.js');
        const logos = await logosApi.getAll();
        // Log para debug
        console.log('[AdminPremium] Emails encontrados na coleção logos:', logos.map(l => l.email));
        // Busca case-insensitive
        const found = logos.some(logo => (logo.email || '').toLowerCase() === value.toLowerCase());
        if (found) {
            gmailInput.classList.remove('error-state');
            gmailInput.classList.add('success-state');
            gmailInputHint.textContent = 'E-mail cadastrado!';
            gmailInputHint.classList.remove('error-message');
            gmailInputHint.classList.add('success-message');
            gmailLoginBtn.disabled = false;
            emailExistsInLogos = true;
        } else {
            gmailInput.classList.remove('success-state');
            gmailInput.classList.add('error-state');
            gmailInputHint.textContent = 'E-mail não cadastrado no sistema.';
            gmailInputHint.classList.remove('success-message');
            gmailInputHint.classList.add('error-message');
            gmailLoginBtn.disabled = true;
            emailExistsInLogos = false;
        }
    } catch (error) {
        console.error('[AdminPremium] Erro ao consultar API logos:', error);
        gmailInput.classList.remove('success-state');
        gmailInput.classList.add('error-state');
        gmailInputHint.textContent = 'Erro ao verificar e-mail. Tente novamente mais tarde.';
        gmailInputHint.classList.remove('success-message');
        gmailInputHint.classList.add('error-message');
        gmailLoginBtn.disabled = true;
        emailExistsInLogos = false;
    }
}

// ===== FUNÇÕES AUXILIARES =====

async function validateCnpjInLogos(email, cnpj) {
    try {
        // Buscar na coleção authorizedUsersClientePremium via endpoint REST
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authenticatePremium', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Não autorizado ou erro na autenticação premium');
        }
        const data = await response.json();
        // Verifica se o email e o CNPJ coincidem e está ativo
        if (
            data.user &&
            data.user.email.toLowerCase() === email.toLowerCase() &&
            data.user.clientCNPJ.replace(/\D/g, '') === cnpj.replace(/\D/g, '') &&
            data.user.planType &&
            data.user.planType.startsWith('premium')
        ) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao validar CNPJ:', error);
        return false;
    }
}

async function sendOtpCode() {
    // Gerar código OTP de 6 dígitos
    otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Definir expiração (5 minutos)
    otpExpiry = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
    
    // Em produção, enviar email real
    console.log(`Código OTP enviado para ${userEmail}: ${otpCode}`);
    
    // Mostrar código no console para teste
    showAlert(`Código de teste: ${otpCode}`, 'info');
    
    // Iniciar timer
    startOtpTimer();
    
    // Configurar reenvio
    setupResendTimer();
}

function startOtpTimer() {
    if (otpTimer) clearInterval(otpTimer);
    
    otpTimer = setInterval(() => {
        const now = new Date();
        const timeLeft = Math.max(0, otpExpiry - now);
        
        if (timeLeft === 0) {
            clearInterval(otpTimer);
            document.getElementById('otp-countdown').textContent = '00:00';
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        document.getElementById('otp-countdown').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function setupResendTimer() {
    if (resendTimer) clearTimeout(resendTimer);
    
    resendOtpBtn.disabled = true;
    resendOtpBtn.textContent = `Aguarde ${RESEND_COOLDOWN_MINUTES}min`;
    
    resendTimer = setTimeout(() => {
        resendOtpBtn.disabled = false;
        resendOtpBtn.textContent = 'Reenviar código';
    }, RESEND_COOLDOWN_MINUTES * 60 * 1000);
}

function isOtpExpired() {
    return new Date() > otpExpiry;
}

function formatCNPJ(input) {
    let value = input.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    input.target.value = value;
}

// ===== CONTROLE DE TELAS =====

function showStep(step) {
    // Esconder todos os steps
    document.querySelectorAll('.auth-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Mostrar step atual
    const stepElement = document.getElementById(`step-${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
    }
    
    currentStep = step;
    
    // Atualizar informações
    if (step === 'cnpj' && userEmail) {
        userEmailDisplay.textContent = userEmail;
    }
    
    if (step === 'otp' && userEmail) {
        otpEmailDisplay.textContent = userEmail;
    }
}

function showLoading(message) {
    if (loadingElement && loadingMessage) {
        loadingMessage.textContent = message;
        loadingElement.classList.remove('hidden');
    }
}

function hideLoading() {
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
}

function showPremiumDashboard() {
    if (authScreen) authScreen.classList.add('hidden');
    if (premiumDashboard) {
        premiumDashboard.classList.remove('hidden');
        
        // Atualizar informações do usuário
        if (premiumUserEmail) premiumUserEmail.textContent = userEmail;
        if (premiumUserCnpj) {
            const formattedCnpj = userCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
            premiumUserCnpj.textContent = `CNPJ: ${formattedCnpj}`;
        }
    }
}

function showAuthScreen() {
    if (premiumDashboard) premiumDashboard.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
}

// ===== PERSISTÊNCIA =====

function savePremiumAuth() {
    const authData = {
        email: userEmail,
        cnpj: userCNPJ,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    };
    
    localStorage.setItem('premiumAuth', JSON.stringify(authData));
}

function checkPremiumAuth() {
    const authData = localStorage.getItem('premiumAuth');
    if (!authData) return false;
    
    try {
        const data = JSON.parse(authData);
        const now = Date.now();
        
        if (now > data.expiresAt) {
            clearPremiumAuth();
            return false;
        }
        
        // Restaurar dados
        userEmail = data.email;
        userCNPJ = data.cnpj;
        return true;
        
    } catch (error) {
        clearPremiumAuth();
        return false;
    }
}

function clearPremiumAuth() {
    localStorage.removeItem('premiumAuth');
    localStorage.removeItem('premiumUserEmail');
}

function resetAuth() {
    userEmail = '';
    userCNPJ = '';
    otpCode = '';
    attempts = 0;
    
    if (cnpjInput) cnpjInput.value = '';
    if (otpInput) otpInput.value = '';
    
    if (otpTimer) clearInterval(otpTimer);
    if (resendTimer) clearTimeout(resendTimer);
    
    showStep('login');
}

// ===== EXPORTS =====

export function getPremiumUser() {
    return {
        email: userEmail,
        cnpj: userCNPJ
    };
}

export function isPremiumAuthenticated() {
    return checkPremiumAuth();
}

export function requirePremiumAuth() {
    if (!isPremiumAuthenticated()) {
        showAlert('Acesso restrito. Faça login premium para continuar.', 'error');
        return false;
    }
    return true;
} 