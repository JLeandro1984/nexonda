// Função para gerar um nonce aleatório
function generateNonce() {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return nonce;
}

// Função para decodificar um token JWT
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

// Função para fazer login com Google
async function handleGoogleLogin() {
    try {
        // Limpa tokens anteriores
        localStorage.removeItem('authToken');
        localStorage.removeItem('auth_nonce');

        // Gera um nonce para segurança
        const nonce = generateNonce();
        localStorage.setItem('auth_nonce', nonce);
        console.log('Nonce gerado e salvo:', nonce);

        // Abre o popup de login do Google
        const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
            'client_id=1014308588575-k68riqpgl9l0isqm33iral0i9eu9u7pp.apps.googleusercontent.com' +
            '&redirect_uri=' + encodeURIComponent(window.location.origin + '/src/pages/auth-callback.html') +
            '&response_type=id_token' +
            '&scope=' + encodeURIComponent('email profile openid') +
            '&nonce=' + nonce +
            '&prompt=select_account';

        console.log('URL de autenticação:', googleAuthUrl);

        const popup = window.open(googleAuthUrl, 'Google Login', 'width=500,height=600');

        if (!popup) {
            throw new Error('O popup foi bloqueado pelo navegador. Por favor, permita popups para este site.');
        }

        // Aguarda o resultado do popup
        const result = await new Promise((resolve, reject) => {
            const messageHandler = function (event) {
                // Ignora mensagens do React DevTools
                if (event.data && event.data.source === 'react-devtools-content-script') {
                    return;
                }

                console.log('Mensagem recebida:', event.data);
                console.log('Origem da mensagem:', event.origin);

                // Verifica se a origem é a mesma
                if (event.origin === window.location.origin) {
                    window.removeEventListener('message', messageHandler);
                    if (event.data.error) {
                        reject(new Error(event.data.error));
                    } else if (event.data.token) {
                        console.log('Token recebido do popup');
                        resolve(event.data);
                    } else {
                        reject(new Error('Resposta inválida do popup'));
                    }
                }
            };

            window.addEventListener('message', messageHandler);

            // Timeout após 2 minutos
            setTimeout(() => {
                window.removeEventListener('message', messageHandler);
                reject(new Error('Tempo limite excedido'));
            }, 120000);
        });

        if (!result.token) {
            throw new Error('Token não recebido do Google');
        }

        // Verifica a autorização com o token recebido
        const response = await fetch('https://us-central1-brandconnect-50647.cloudfunctions.net/authenticate', {
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
        console.log('Dados da resposta:', data);

        if (!data.authorized) {
            throw new Error('Acesso negado. Seu email não está autorizado.');
        }

        // Armazena o token
        console.log('Salvando token no localStorage');
        localStorage.setItem('authToken', result.token);

        // Decodifica e salva nome do usuário
        const decodedToken = decodeJwt(result.token);
        if (decodedToken && decodedToken.name) {
            localStorage.setItem('userName', decodedToken.name);
            console.log('Nome do usuário salvo:', decodedToken.name);
        }

        // Verifica se o token foi salvo corretamente
        const savedToken = localStorage.getItem('authToken');
        if (!savedToken) {
            throw new Error('Erro ao salvar o token');
        }

        console.log('Token salvo com sucesso');
        // Redireciona para a página admin
        window.location.href = 'admin.html';

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

// Função para verificar se o usuário está autenticado
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    console.log('Verificando autenticação. Token:', token ? 'Presente' : 'Ausente');

    if (!token) return false;

    try {
        const response = await fetch('https://us-central1-brandconnect-50647.cloudfunctions.net/authenticate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.log('Token inválido, removendo do localStorage');
            localStorage.removeItem('authToken');
            return false;
        }

        const data = await response.json();
        console.log('Resposta da verificação:', data);
        return data.authorized;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('authToken');
        return false;
    }
}

// Função para redirecionar com base no status de autenticação
async function handleAuthRedirect() {
    try {
        const currentPath = window.location.pathname;
        const isAuthenticated = await checkAuth();
        console.log('Status de autenticação:', isAuthenticated);

        if (currentPath.includes('login.html') && isAuthenticated) {
            console.log('Usuário autenticado, redirecionando para admin');
            window.location.href = 'admin.html';
            return;
        }

        if (!currentPath.includes('login.html') && !isAuthenticated) {
            console.log('Usuário não autenticado, redirecionando para login');
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error('Erro no redirecionamento:', error);
        window.location.href = 'login.html';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, inicializando...');
    const googleLoginBtn = document.getElementById('google-login-btn');

    if (googleLoginBtn) {
        console.log('Botão de login encontrado, adicionando evento');
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    } else {
        console.error('Botão de login não encontrado!');
    }

    handleAuthRedirect();
});
