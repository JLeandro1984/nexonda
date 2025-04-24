document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.querySelector('.error-message');

    // Verificar se há mensagem de sucesso do registro
    if (localStorage.getItem('registerSuccess')) {
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Cadastro realizado com sucesso! Faça login para continuar.';
        loginForm.insertBefore(successMessage, loginForm.firstChild);
        localStorage.removeItem('registerSuccess');
    }

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Obter usuários cadastrados
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Procurar usuário
        const user = users.find(u => 
            (u.username === username || u.email === username) && u.password === password
        );

        if (user) {
            // Salvar informações do usuário logado
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userName', user.fullname);
            localStorage.setItem('userId', user.id);
            
            // Redirecionar para a página de administração
            window.location.href = 'admin.html';
        } else {
            errorMessage.textContent = 'Usuário ou senha incorretos';
            errorMessage.style.display = 'block';
        }
    });

    // Verifica se o usuário já está logado
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'admin.html';
    }
}); 