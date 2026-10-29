// Importar los módulos necesarios de Firebase desde los servidores de Google (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tus credenciales reales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDdTgDJQ4HAM2NSPgfHuYiEW7SyEtaSUOw",
  authDomain: "fulltimateteam-555f6.firebaseapp.com",
  projectId: "fulltimateteam-555f6",
  storageBucket: "fulltimateteam-555f6.firebasestorage.app",
  messagingSenderId: "332718290010",
  appId: "1:332718290010:web:f9ee96ab9148eb8da19463",
  measurementId: "G-PNCF23F3DP"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- FUNCIONES DE GUARDADO Y CARGA GLOBAL ---

// 1. Guardar la partida en Firestore asociada al usuario actual
window.guardarPartidaNube = async function(datosDelJuego) {
    const user = auth.currentUser;
    if (!user) {
        console.warn("No hay ningun usuario conectado para guardar.");
        return false;
    }

    try {
        await setDoc(doc(db, "partidas_usuarios", user.uid), {
            datos: datosDelJuego,
            ultimaModificacion: new Date().toISOString()
        });
        console.log("¡Partida guardada en la nube con éxito!");
        return true;
    } catch (error) {
        console.error("Error al guardar en la nube:", error);
        return false;
    }
};

// 2. Cargar la partida desde Firestore
window.cargarPartidaNube = async function() {
    const user = auth.currentUser;
    if (!user) return null;

    try {
        const docRef = doc(db, "partidas_usuarios", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Partida encontrada en la nube.");
            return docSnap.data().datos;
        } else {
            console.log("El usuario no tiene una partida guardada previa.");
            return null;
        }
    } catch (error) {
        console.error("Error al cargar la partida:", error);
        return null;
    }
};

// Exportar auth para usarlo en el login si lo necesitas
export { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut };