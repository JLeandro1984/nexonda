// login-premium.js
// Igual ao login.js, mas redireciona para AdminPremium.html após login

function generateNonce() {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return nonce;
}

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

async function handleGoogleLogin() {
    try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('auth_nonce');
        const nonce = generateNonce();
        localStorage.setItem('auth_nonce', nonce);
        const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            'client_id=1002258958685-aot7kcicobv2tcusjv0rmt1g1v6ar6nv.apps.googleusercontent.com' +
            '&redirect_uri=' + encodeURIComponent(window.location.origin + '/pages/auth-callback.html') +
            '&response_type=id_token' +
            '&scope=' + encodeURIComponent('email profile openid') +
            '&nonce=' + nonce +
            '&prompt=select_account';
        const popup = window.open(googleAuthUrl, 'Google Login', 'width=500,height=600');
        if (!popup) {
            throw new Error('O popup foi bloqueado pelo navegador. Por favor, permita popups para este site.');
        }
        const result = await new Promise((resolve, reject) => {
            const messageHandler = function (event) {
                if (event.data && event.data.source === 'react-devtools-content-script') {
                    return;
                }
                if (event.origin === window.location.origin) {
                    window.removeEventListener('message', messageHandler);
                    if (event.data.error) {
                        reject(new Error(event.data.error));
                    } else if (event.data.token) {
                        resolve(event.data);
                    } else {
                        reject(new Error('Resposta inválida do popup'));
                    }
                }
            };
            window.addEventListener('message', messageHandler);
            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                reject(new Error('Tempo limite excedido'));
            }, 120000);
        });
        if (!result.token) {
            throw new Error('Token não recebido do Google');
        }
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authenticatePremium', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Erro na autenticação');
        }
        const data = await response.json();
        if (!data.authorized) {
            throw new Error('Acesso negado. Seu email não está autorizado.');
        }
        localStorage.setItem('authToken', result.token);
        const decodedToken = decodeJwt(result.token);
        let userEmail = '';
        if (decodedToken && decodedToken.email) {
            userEmail = decodedToken.email;
            localStorage.setItem('userName', decodedToken.name || '');
        }
        const savedToken = localStorage.getItem('authToken');
        if (!savedToken) {
            throw new Error('Erro ao salvar o token');
        }
        // ===== Validação premium: checar se email existe na coleção logos =====
        if (!userEmail) {
            throw new Error('Não foi possível obter o e-mail do usuário Google.');
        }
        // (Removido: consulta à coleção authorizedUsersClientePremium via API do frontend)
        // Salva o email premium e redireciona para etapa CNPJ
        localStorage.setItem('premiumUserEmail', userEmail);
        window.location.href = 'AdminPremium.html';
    } catch (error) {
        console.error('Erro detalhado:', error);
        const errorMessage = document.querySelector('.error-message') || document.createElement('div');
        errorMessage.textContent = error.message || 'Erro na autenticação';
        errorMessage.style.display = 'block';
        if (!document.querySelector('.error-message')) {
            errorMessage.classList.add('error-message');
            document.querySelector('.login-box').appendChild(errorMessage);
        }
    }
}

// Inicialização

document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
}); 