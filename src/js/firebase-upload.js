// firebase-upload.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

// Configuração do Firebase (substitua pelos dados reais do seu projeto)
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

  // Adiciona timestamp ao nome do arquivo para evitar conflitos
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileNameWithoutExt = file.name.replace(`.${fileExtension}`, '');
  
  // Remove caracteres especiais e espaços do nome do arquivo
  const sanitizedFileName = fileNameWithoutExt
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  const uniqueFileName = `${sanitizedFileName}_${timestamp}.${fileExtension}`;

  const storageRef = ref(storage, `${folder}/${uid}/${uniqueFileName}`);

  try {
    console.log('Fazendo upload do arquivo:', uniqueFileName);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    console.log('Upload concluído com sucesso:', url);
    return { url, fullPath: snapshot.ref.fullPath };
  } catch (error) {
    console.error('Erro no upload Firebase Storage:', error);
    
    // Se o erro for de permissão, tenta fazer upload para pasta pública
    if (error.code === 'storage/unauthorized' || error.message.includes('permission')) {
      console.log('Tentando upload para pasta pública...');
      const publicRef = ref(storage, `${folder}/public/${uniqueFileName}`);
      
      try {
        const publicSnapshot = await uploadBytes(publicRef, file);
        const publicUrl = await getDownloadURL(publicSnapshot.ref);
        console.log('Upload para pasta pública concluído:', publicUrl);
        return { url: publicUrl, fullPath: publicSnapshot.ref.fullPath };
      } catch (publicError) {
        console.error('Erro no upload para pasta pública:', publicError);
        
        // Se ainda falhar, tenta pasta temporária
        console.log('Tentando upload para pasta temporária...');
        const tempRef = ref(storage, `temp/${uniqueFileName}`);
        
        try {
          const tempSnapshot = await uploadBytes(tempRef, file);
          const tempUrl = await getDownloadURL(tempSnapshot.ref);
          console.log('Upload para pasta temporária concluído:', tempUrl);
          return { url: tempUrl, fullPath: tempSnapshot.ref.fullPath };
        } catch (tempError) {
          console.error('Erro no upload para pasta temporária:', tempError);
          throw new Error("Erro no upload Firebase Storage: " + tempError.message);
        }
      }
    }
    
    throw new Error("Erro no upload Firebase Storage: " + error.message);
  }
}

/**
 * Deleta arquivo do Firebase Storage pelo caminho completo (fullPath).
 * @param {string} fullPath - Caminho completo do arquivo no storage.
 * @returns {Promise<boolean>} - true se deletado com sucesso.
 */
export async function deleteFromFirebaseStorage(fullPath) {
  if (!fullPath) {
    console.warn("fullPath é vazio, pulando exclusão");
    return true;
  }

  console.log('Tentando deletar arquivo do Firebase Storage:', fullPath);

  const fileRef = ref(storage, fullPath);

  try {
    await deleteObject(fileRef);
    console.log('Arquivo deletado com sucesso:', fullPath);
    return true;
  } catch (error) {
    console.error("Erro ao deletar arquivo do Firebase Storage:", error);
    
    // Se o erro for de arquivo não encontrado, considera sucesso
    if (error.code === 'storage/object-not-found') {
      console.log('Arquivo já não existe, considerando exclusão bem-sucedida');
      return true;
    }
    
    // Se não conseguir deletar, apenas loga o erro mas não falha
    // Isso pode acontecer se o arquivo já foi deletado ou não existe
    console.warn("Não foi possível deletar o arquivo, mas continuando...");
    return false;
  }
}

/**
 * Verifica se um arquivo existe no Firebase Storage
 * @param {string} fullPath - Caminho completo do arquivo no storage.
 * @returns {Promise<boolean>} - true se o arquivo existe.
 */
export async function fileExists(fullPath) {
  if (!fullPath) return false;

  try {
    const fileRef = ref(storage, fullPath);
    await getDownloadURL(fileRef);
    return true;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return false;
    }
    // Para outros erros (como permissão), assume que o arquivo existe
    return true;
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
