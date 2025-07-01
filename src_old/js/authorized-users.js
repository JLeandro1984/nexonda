import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';
import { showAlert } from '../components/alert.js';

// Configuração do Firebase (mesma do firebase-upload.js)
  const firebaseConfig = {
    apiKey: "AIzaSyC1qppTJiumA9bFlCLDpDWdOADjr-GBuUY",
    authDomain: "nexonda-281084.firebaseapp.com",
    projectId: "nexonda-281084",
    storageBucket: "nexonda-281084.firebasestorage.app",
    messagingSenderId: "1002258958685",
    appId: "1:1002258958685:web:aac80c40220d8fabfa00b4"
  };

// Inicializa o app
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let currentUser = null;

// Função para obter token de autenticação
async function getAuthToken() {
    if (!currentUser) {
        throw new Error('Usuário não autenticado');
    }
    return await currentUser.getIdToken();
}

// Função para carregar lista de usuários
async function loadUsers() {
    try {
        const token = await getAuthToken();
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authorizedUsers', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar usuários');
        }

        const users = await response.json();
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.isAdmin ? 'Administrador' : 'Usuário'}</td>
                <td>${user.addedBy || '-'}</td>
                <td>${user.addedAt ? new Date(user.addedAt.toDate()).toLocaleDateString() : '-'}</td>
                <td>
                    <button class="delete-btn" data-id="${user.id}">Remover</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Adicionar event listeners para botões de remoção
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteUser);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showAlert('Erro ao carregar lista de usuários', 'info');
    }
}

// Função para adicionar novo usuário
async function handleAddUser(event) {
    event.preventDefault();
    
    const email = document.getElementById('user-email').value;
    const isAdmin = document.getElementById('is-admin').checked;

    try {
        const token = await getAuthToken();
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authorizedUsers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, isAdmin })
        });

        if (!response.ok) {
            throw new Error('Erro ao adicionar usuário');
        }

        showAlert('Usuário adicionado com sucesso!', 'success');
        document.getElementById('add-user-form').reset();
        loadUsers();
    } catch (error) {
        console.error('Erro ao adicionar usuário:', error);
        showAlert('Erro ao adicionar usuário', 'error');
    }
}

// Função para remover usuário
async function handleDeleteUser(event) {
    if (!confirm('Tem certeza que deseja remover este usuário?')) {
        return;
    }

    const userId = event.target.dataset.id;

    try {
        const token = await getAuthToken();
        const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authorizedUsers', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: userId })
        });

        if (!response.ok) {
            throw new Error('Erro ao remover usuário');
        }

        showAlert('Usuário removido com sucesso!', 'success');
        loadUsers();
    } catch (error) {
        console.error('Erro ao remover usuário:', error);
        showAlert('Erro ao remover usuário', 'error');
    }
}

// Função para fazer logout
function handleLogout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch(error => {
        console.error('Erro ao fazer logout:', error);
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const token = await getAuthToken();
                const response = await fetch('https://us-central1-nexonda-281084.cloudfunctions.net/authorizedUsers', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Usuário não autorizado');
                }

                const users = await response.json();
                const currentUserData = users.find(u => u.email === user.email);
                
                if (!currentUserData?.isAdmin) {
                    showAlert('Acesso negado. Apenas administradores podem acessar esta página.', 'infor');
                    window.location.href = 'admin.html';
                    return;
                }

                // Carregar lista de usuários
                loadUsers();
            } catch (error) {
                console.error('Erro de autorização:', error);
                window.location.href = 'login.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // Event listeners
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}); 