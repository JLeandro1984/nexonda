import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { app } from './firebase-config.js';  // Sua configuração Firebase já exportada

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.querySelector('.error-message') || document.createElement('div');
    const googleLoginBtn = document.getElementById('google-login-btn');

    // Adiciona a div de erro se ela não existir
    if (!document.querySelector('.error-message')) {
        errorMessage.classList.add('error-message');
        document.querySelector('.login-box').appendChild(errorMessage);
    }

    // Verificar se há mensagem de sucesso do registro (não necessária no Google)
    if (localStorage.getItem('registerSuccess')) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Cadastro realizado com sucesso! Faça login para continuar.';
        loginForm.insertBefore(successMessage, loginForm.firstChild);
        localStorage.removeItem('registerSuccess');
    }

    // Função para fazer login com Google
    googleLoginBtn.addEventListener('click', async () => {
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Salvar informações do usuário logado
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userName', user.displayName);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userId', user.uid);

            // Redirecionar para a página de administração
            window.location.href = 'admin.html';
        } catch (error) {
            errorMessage.textContent = 'Erro ao fazer login com Google';
            errorMessage.style.display = 'block';
            console.error(error.message);
        }
    });

    // Verifica se o usuário já está logado
    if (localStorage.getItem('isAuthenticated') === 'true') {
        window.location.href = 'admin.html';
    }
});
