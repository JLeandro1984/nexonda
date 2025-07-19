// ===== AUTH PREMIUM - Sistema de Autenticação Premium =====

/*import { showAlert } from '../components/alert.js';*/
import { logosApi } from './api.js';

// Função para decodificar JWT
function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Erro ao decodificar o token JWT:', e);
        return null;
    }
}

// Estados da aplicação
let currentStep = 'cnpj';
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

// Elementos DOM
const authScreen = document.getElementById('auth-premium-screen');
const premiumDashboard = document.getElementById('premium-dashboard');
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeAuthPremium();
});

function initializeAuthPremium() {
    console.log('[DEBUG] initializeAuthPremium iniciada');
    
    // Verificar se já está autenticado no sistema (token no localStorage)
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        console.log('[DEBUG] Sem token, redirecionando para login premium');
        showAlert('Você precisa estar autenticado para acessar esta área. Faça login premium primeiro.', 'Acesso Restrito', 'error');
        setTimeout(() => {
            window.location.href = '/pages/login-premium.html';
        }, 2000);
        return;
    }
    
    // Verificar se já está autenticado premium (antes de verificar step)
    const isAuthenticated = checkPremiumAuth();
    
    if (isAuthenticated) {
        console.log('[DEBUG] Usuário já autenticado premium, exibindo dashboard');
        showPremiumDashboard();
        return;
    }
    
    // Verificar parâmetro step na URL
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    
    // Se step=cnpj, forçar a etapa de CNPJ independente do status de autenticação premium
    if (stepParam === 'cnpj') {
        console.log('[DEBUG] Step=cnpj detectado, forçando etapa de CNPJ');
        // Limpar autenticação premium anterior para forçar novo fluxo
        clearPremiumAuth();
        setupEventListeners();
        
        // Tentar obter email do localStorage primeiro
        let savedEmail = localStorage.getItem('premiumUserEmail');
        
        // Se não houver email salvo, tentar extrair do token JWT
        if (!savedEmail && token) {
            try {
                const decodedToken = decodeJwt(token);
                if (decodedToken && decodedToken.email) {
                    savedEmail = decodedToken.email;
                    localStorage.setItem('premiumUserEmail', savedEmail);
                }
            } catch (error) {
                console.error('[DEBUG] Erro ao decodificar token:', error);
            }
        }
        
        if (savedEmail) {
            userEmail = savedEmail;
            showStep('cnpj');
        } else {
            console.log('[DEBUG] Sem email disponível, redirecionando para login premium');
            showAlert('Email não encontrado. Faça login premium novamente.', 'Email Não Encontrado', 'error');
            setTimeout(() => {
                window.location.href = '/pages/login-premium.html';
            }, 2000);
        }
        return;
    }
    
    // Se chegou aqui, não está autenticado premium e não tem step=cnpj
    // Redirecionar para login premium
    console.log('[DEBUG] Usuário não autenticado premium, redirecionando para login');
    showAlert('Acesso restrito. Faça login premium para continuar.', 'Acesso Restrito', 'error');
    setTimeout(() => {
        window.location.href = '/pages/login-premium.html';
    }, 2000);
}

function setupEventListeners() {
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
            // savePremiumAuth(); // Remover salvamento e redirecionamento prematuro
            // window.location.href = 'AdminPremium.html';
            // Novo fluxo: gerar e enviar código OTP, mostrar step OTP
            await sendOtpCode();
            showStep('otp');
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
        
        console.log('[DEBUG] handleOtpVerification iniciada');
        console.log('[DEBUG] Input OTP:', inputOtp);
        console.log('[DEBUG] OTP esperado:', otpCode);
        console.log('[DEBUG] userEmail:', userEmail);
        console.log('[DEBUG] userCNPJ:', userCNPJ);
        
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
            console.log('[DEBUG] OTP válido! Salvando autenticação...');
            hideLoading();
            showAlert('Autenticação realizada com sucesso!', 'success');
            
            // Salvar dados de autenticação
            savePremiumAuth();
            console.log('[DEBUG] Autenticação salva, mostrando dashboard...');
            
            // Mostrar dashboard
            showPremiumDashboard();
            console.log('[DEBUG] Dashboard deve estar visível agora');
        } else {
            console.log('[DEBUG] OTP inválido. Tentativa:', attempts + 1);
            hideLoading();
            showAlert('Código incorreto. Tente novamente.', 'error');
            attempts++;
            
            if (attempts >= MAX_ATTEMPTS) {
                showAlert('Máximo de tentativas excedido. Tente novamente mais tarde.', 'error');
                resetAuth();
            }
        }
        
    } catch (error) {
        console.error('[DEBUG] Erro na verificação OTP:', error);
        hideLoading();
        showAlert('Erro ao verificar código: ' + error.message, 'error');
    }
}

async function handleResendOtp() {
    try {
        console.log('[DEBUG] handleResendOtp - Iniciando reenvio de código');
        console.log(`[DEBUG] handleResendOtp - Código atual antes do reenvio: ${otpCode}`);
        
        showLoading('Reenviando código...');
        await sendOtpCode();
        hideLoading();
        showAlert('Novo código enviado com sucesso!', 'success');
        
        console.log(`[DEBUG] handleResendOtp - Código após reenvio: ${otpCode}`);
        
    } catch (error) {
        console.error('[DEBUG] handleResendOtp - Erro ao reenviar código:', error);
        hideLoading();
        showAlert('Erro ao reenviar código: ' + error.message, 'error');
    }
}

function handlePremiumLogout() {
    clearPremiumAuth();
    resetAuth();
    showAuthScreen();
    window.location.href = '/pages/login-premium.html';
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
    try {
        // Gerar código OTP de 6 dígitos
        const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
        otpCode = newOtpCode; // Atribuir à variável global
        
        // Definir expiração (5 minutos)
        otpExpiry = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
        
        console.log(`[DEBUG] sendOtpCode - Gerando novo código OTP para ${userEmail}: ${otpCode}`);
        console.log(`[DEBUG] sendOtpCode - Código armazenado na variável otpCode: ${otpCode}`);
        
        // Enviar código via Cloud Function
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/sendPremiumVerificationCode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: userEmail,
                cnpj: userCNPJ,
                otpCode: otpCode
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao enviar código');
        }
        
        console.log('[DEBUG] sendOtpCode - Código OTP enviado com sucesso');
        console.log(`[DEBUG] sendOtpCode - Código final na variável: ${otpCode}`);
        
        showAlert('Código de verificação enviado para seu e-mail!', 'Código Enviado', 'success');
        
        // Iniciar timer
        startOtpTimer();
        
        // Configurar reenvio
        setupResendTimer();
        
    } catch (error) {
        console.error('[DEBUG] sendOtpCode - Erro ao enviar código OTP:', error);
        
        // Em caso de erro, mostrar código no console para teste
        console.log(`[DEBUG] sendOtpCode - Código de teste (envio falhou): ${otpCode}`);
        showAlert(`Erro ao enviar código. Código de teste: ${otpCode}`, 'Erro no Envio', 'error');
        
        // Mesmo assim, iniciar timer e reenvio
        startOtpTimer();
        setupResendTimer();
    }
}

function startOtpTimer() {
    if (otpTimer) clearInterval(otpTimer);
    
    otpTimer = setInterval(() => {
        const now = new Date();
        const timeLeft = Math.max(0, otpExpiry - now);
        
        if (timeLeft === 0) {
            clearInterval(otpTimer);
            document.getElementById('otp-countdown').textContent = '00:00';
            
            // Código expirado - mostrar aviso mas não redirecionar
            console.log('[DEBUG] Código OTP expirado');
            showAlert('Código de verificação expirado. Clique em "Reenviar código" para solicitar um novo.', 'Código Expirado', 'warning');
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
    console.log('[DEBUG] showStep chamada com:', step);
    
    // Verificar se a tela de autenticação está visível
    const authScreen = document.getElementById('auth-premium-screen');
    const premiumDashboard = document.getElementById('premium-dashboard');
    
    console.log('[DEBUG] Auth screen hidden:', authScreen?.classList.contains('hidden'));
    console.log('[DEBUG] Premium dashboard hidden:', premiumDashboard?.classList.contains('hidden'));
    
    // Garantir que a tela de autenticação está visível
    if (authScreen) {
        authScreen.classList.remove('hidden');
        console.log('[DEBUG] Auth screen agora visível');
    }
    
    // Garantir que o dashboard está oculto
    if (premiumDashboard) {
        premiumDashboard.classList.add('hidden');
        console.log('[DEBUG] Premium dashboard oculto');
    }
    
    // Esconder todos os steps
    const allSteps = document.querySelectorAll('.auth-step');
    console.log('[DEBUG] Steps encontrados:', allSteps.length);
    
    allSteps.forEach(el => {
        el.classList.remove('active');
        console.log('[DEBUG] Step removido:', el.id);
    });
    
    // Mostrar step atual
    const stepElement = document.getElementById(`step-${step}`);
    console.log('[DEBUG] Elemento do step encontrado:', !!stepElement);
    
    if (stepElement) {
        stepElement.classList.add('active');
        console.log('[DEBUG] Step ativado:', step);
    } else {
        console.error('[DEBUG] Elemento do step não encontrado:', `step-${step}`);
    }
    
    currentStep = step;
    
    // Atualizar informações
    if (step === 'cnpj' && userEmail) {
        console.log('[DEBUG] Atualizando email display:', userEmail);
        if (userEmailDisplay) {
            userEmailDisplay.textContent = userEmail;
        } else {
            console.error('[DEBUG] userEmailDisplay não encontrado');
        }
    }
    
    if (step === 'otp' && userEmail) {
        console.log('[DEBUG] Atualizando OTP email display:', userEmail);
        if (otpEmailDisplay) {
            otpEmailDisplay.textContent = userEmail;
        } else {
            console.error('[DEBUG] otpEmailDisplay não encontrado');
        }
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
    console.log('[DEBUG] showPremiumDashboard iniciada');
    console.log('[DEBUG] authScreen:', !!authScreen);
    console.log('[DEBUG] premiumDashboard:', !!premiumDashboard);
    
    if (authScreen) {
        authScreen.classList.add('hidden');
        console.log('[DEBUG] Auth screen ocultada');
    }
    
    if (premiumDashboard) {
        premiumDashboard.classList.remove('hidden');
        console.log('[DEBUG] Premium dashboard tornada visível');
        
        // Atualizar informações do usuário
        if (premiumUserEmail) {
            premiumUserEmail.textContent = userEmail;
            console.log('[DEBUG] Email atualizado no dashboard:', userEmail);
        }
        
        if (premiumUserCnpj) {
            const formattedCnpj = userCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
            premiumUserCnpj.textContent = `CNPJ: ${formattedCnpj}`;
            console.log('[DEBUG] CNPJ atualizado no dashboard:', formattedCnpj);
        }
    } else {
        console.error('[DEBUG] Elemento premiumDashboard não encontrado!');
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
    console.log('[DEBUG] Autenticação premium salva com expiração em 24 horas');
}

function checkPremiumAuth() {
    const authData = localStorage.getItem('premiumAuth');
    if (!authData) {
        console.log('[DEBUG] Nenhuma autenticação premium encontrada');
        return false;
    }
    
    try {
        const data = JSON.parse(authData);
        const now = Date.now();
        
        console.log('[DEBUG] Verificando autenticação premium:', {
            email: data.email,
            expiresAt: new Date(data.expiresAt),
            now: new Date(now),
            isValid: now < data.expiresAt
        });
        
        if (now > data.expiresAt) {
            console.log('[DEBUG] Autenticação premium expirada, limpando dados');
            clearPremiumAuth();
            return false;
        }
        
        // Restaurar dados
        userEmail = data.email;
        userCNPJ = data.cnpj;
        console.log('[DEBUG] Autenticação premium válida, dados restaurados');
        return true;
        
    } catch (error) {
        console.error('[DEBUG] Erro ao verificar autenticação premium:', error);
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
    
    // Redirecionar para login premium em vez de mostrar step login
    console.log('[DEBUG] Reset auth, redirecionando para login premium');
    window.location.href = '/pages/login-premium.html';
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
        //showAlert('Acesso restrito. Faça login premium para continuar.', 'error');
        return false;
    }
    return true;
}

// ===== VERIFICAÇÃO PERIÓDICA DA SESSÃO =====

function startSessionCheck() {
    // Verificar a sessão a cada 5 minutos
    setInterval(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('[DEBUG] Token não encontrado, limpando sessão premium');
            clearPremiumAuth();
            return;
        }
        
        // Verificar se a autenticação premium ainda é válida
        const isPremiumValid = checkPremiumAuth();
        if (!isPremiumValid) {
            console.log('[DEBUG] Sessão premium expirada, limpando dados');
            clearPremiumAuth();
            return;
        }
        
        console.log('[DEBUG] Sessão premium válida, mantendo ativa');
    }, 5 * 60 * 1000); // 5 minutos
}

// ===== INICIALIZAÇÃO =====

// Inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeAuthPremium();
        startSessionCheck();
    });
} else {
    // DOM já está pronto
    initializeAuthPremium();
    startSessionCheck();
}

// Também inicializar quando a página for carregada (para casos de navegação)
window.addEventListener('load', () => {
    // Verificar se já foi inicializado
    if (!document.getElementById('auth-premium-screen')) {
        return; // Não é a página premium
    }
    // Forçar reinicialização para garantir que o step seja respeitado
    setTimeout(() => {
        initializeAuthPremium();
        startSessionCheck();
    }, 100);
});

/*
function showAlert(message, type = 'info') {
    // Remove qualquer alerta anterior
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();

    // Cria o HTML do modal
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${type}`;
    alertBox.innerHTML = `
        <div class="custom-alert-content">
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()">Fechar</button>
        </div>
    `;
    document.body.appendChild(alertBox);
}*/