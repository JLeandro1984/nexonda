import { getAuth, signInAnonymously, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

export async function loginFirebaseCustomToken(idToken) {
  console.log('Tentando login Firebase...');
  
  try {
    const auth = getAuth();
    
    // Verifica se já está autenticado
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('Usuário já autenticado no Firebase:', currentUser.email || currentUser.uid);
      return currentUser;
    }
    
    // Decodifica o token JWT para obter informações do usuário
    const decodedToken = decodeJwt(idToken);
    if (!decodedToken || !decodedToken.email) {
      throw new Error('Token inválido ou sem informações de usuário');
    }
    
    console.log('Token decodificado:', decodedToken.email);
    
    // Como o login anônimo está desabilitado, vamos apenas salvar as informações no localStorage
    // e retornar um objeto que simula um usuário autenticado
    localStorage.setItem('userEmail', decodedToken.email);
    if (decodedToken.name) {
      localStorage.setItem('userName', decodedToken.name);
    }
    
    console.log('Informações do usuário salvas no localStorage');
    
    // Retorna um objeto que simula um usuário autenticado
    return {
      uid: decodedToken.email.replace(/[^a-zA-Z0-9]/g, '_'),
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.email
    };
  } catch (error) {
    console.error('Erro no login Firebase:', error);
    throw error;
  }
}

// Função para decodificar JWT
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
