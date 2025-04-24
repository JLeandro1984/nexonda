document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    // Função para validar o formulário
    function validateForm(formData) {
        const errors = [];

        // Validar nome completo
        if (formData.fullname.length < 3) {
            errors.push('Nome completo deve ter pelo menos 3 caracteres');
        }

        // Validar nome de usuário
        if (formData.username.length < 3) {
            errors.push('Nome de usuário deve ter pelo menos 3 caracteres');
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errors.push('E-mail inválido');
        }

        // Validar senha
        if (formData.password.length < 8) {
            errors.push('Senha deve ter pelo menos 8 caracteres');
        }

        if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) {
            errors.push('Senha deve conter letras e números');
        }

        // Validar confirmação de senha
        if (formData.password !== formData.confirmPassword) {
            errors.push('As senhas não coincidem');
        }

        return errors;
    }

    // Função para mostrar mensagens de erro
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Função para esconder mensagens de erro
    function hideError() {
        errorMessage.style.display = 'none';
    }

    // Função para salvar usuário
    function saveUser(userData) {
        // Obter usuários existentes ou inicializar array vazio
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        // Verificar se usuário já existe
        if (users.some(user => user.username === userData.username)) {
            throw new Error('Nome de usuário já existe');
        }
        if (users.some(user => user.email === userData.email)) {
            throw new Error('E-mail já está em uso');
        }

        // Adicionar novo usuário
        users.push({
            id: Date.now(),
            fullname: userData.fullname,
            username: userData.username,
            email: userData.email,
            password: userData.password // Em um sistema real, a senha seria hasheada
        });

        // Salvar no localStorage
        localStorage.setItem('users', JSON.stringify(users));
    }

    // Handler do formulário
    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        hideError();

        const formData = {
            fullname: document.getElementById('fullname').value.trim(),
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirm-password').value
        };

        // Validar formulário
        const errors = validateForm(formData);
        if (errors.length > 0) {
            showError(errors.join('\n'));
            return;
        }

        try {
            // Tentar salvar o usuário
            saveUser(formData);
            
            // Redirecionar para a página de login com mensagem de sucesso
            localStorage.setItem('registerSuccess', 'true');
            window.location.href = 'login.html';
        } catch (error) {
            showError(error.message);
        }
    });
}); 