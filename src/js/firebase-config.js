// firebaseConfig.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import { getFirestore, serverTimestamp  } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyDRw0prhCxJ1i1D2volCP94oiZQCGG-FeA",
  authDomain: "brandconnect-50647.firebaseapp.com",
  projectId: "brandconnect-50647",
  storageBucket: "brandconnect-50647.firebasestorage.app",
  messagingSenderId: "1014308588575",
  appId: "1:1014308588575:web:bb942ac00418060605192a",
  measurementId: "G-NGGVGTHM0G"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços Firebase
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Exportando o app e os serviços
export { app, auth, firestore, storage, serverTimestamp};
