// firebase-upload.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

// Configuração do Firebase (substitua pelos dados reais do seu projeto)
   const firebaseConfig = {
    apiKey: "AIzaSyDRw0prhCxJ1i1D2volCP94oiZQCGG-FeA",
    authDomain: "brandconnect-50647.firebaseapp.com",
    projectId: "brandconnect-50647",
    storageBucket: "brandconnect-50647.firebasestorage.app",
    messagingSenderId: "1014308588575",
    appId: "1:1014308588575:web:bb942ac00418060605192a"
  };

// Inicializa o app
const app = initializeApp(firebaseConfig);

// Instâncias do Firebase
const auth = getAuth(app);
const storage = getStorage(app);

/**
 * Logout do usuário Firebase
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Observa mudanças no estado do usuário (login/logout)
 * @param {(user: any | null) => void} callback
 */
export function onAuthChanged(callback) {
  onAuthStateChanged(auth, callback);
}

/**
 * Faz upload de arquivo para Firebase Storage na pasta do usuário autenticado e retorna URL pública.
 * @param {File} file - Arquivo a ser enviado (ex: de input file).
 * @param {string} folder - Pasta base no storage (ex: 'logos', 'banners').
 * @returns {Promise<{ url: string, fullPath: string }>} - URL e caminho completo no storage.
 */
export async function uploadToFirebaseStorage(file, folder = "logos") {
  if (!file) throw new Error("Arquivo inválido");

  console.log('Iniciando upload para Firebase Storage...');
  
  // Usa o email do localStorage como identificador do usuário
  const userEmail = localStorage.getItem('userEmail');
  let uid = 'anonymous';
  
  if (userEmail) {
    // Cria um UID baseado no email (remove caracteres especiais)
    uid = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    console.log('Usando email como UID:', uid);
  } else {
    console.log('Email não encontrado, usando UID anônimo');
  }

  const storageRef = ref(storage, `${folder}/${uid}/${file.name}`);

  try {
    console.log('Fazendo upload do arquivo:', file.name);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    console.log('Upload concluído com sucesso:', url);
    return { url, fullPath: snapshot.ref.fullPath };
  } catch (error) {
    console.error('Erro no upload Firebase Storage:', error);
    throw new Error("Erro no upload Firebase Storage: " + error.message);
  }
}

/**
 * Deleta arquivo do Firebase Storage pelo caminho completo (fullPath).
 * @param {string} fullPath - Caminho completo do arquivo no storage.
 * @returns {Promise<boolean>} - true se deletado com sucesso.
 */
export async function deleteFromFirebaseStorage(fullPath) {
  if (!fullPath) throw new Error("fullPath é obrigatório para deletar");

  console.log('Tentando deletar arquivo do Firebase Storage:', fullPath);

  const fileRef = ref(storage, fullPath);

  try {
    await deleteObject(fileRef);
    console.log('Arquivo deletado com sucesso:', fullPath);
    return true;
  } catch (error) {
    console.error("Erro ao deletar arquivo do Firebase Storage:", error);
    
    // Se não conseguir deletar, apenas loga o erro mas não falha
    // Isso pode acontecer se o arquivo já foi deletado ou não existe
    console.warn("Não foi possível deletar o arquivo, mas continuando...");
    return false;
  }
}

/**
 * Mostra preview da mídia no container HTML dado a URL e tipo.
 * @param {HTMLElement} container - Container onde inserir o preview.
 * @param {string} url - URL da imagem ou vídeo.
 * @param {"image"|"video"} type - Tipo do arquivo.
 */
export function showMediaPreview(container, url, type) {
  container.innerHTML = "";

  if (type === "image") {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Pré-visualização da imagem";
    img.style.maxWidth = "300px";
    img.style.borderRadius = "8px";
    container.appendChild(img);
  } else if (type === "video") {
    const video = document.createElement("video");
    video.src = url;
    video.controls = true;
    video.style.maxWidth = "300px";
    video.style.borderRadius = "8px";
    container.appendChild(video);
  }
}
