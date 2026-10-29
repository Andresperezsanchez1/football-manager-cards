/* --- SISTEMA DE INICIO DE SESIÓN Y MULTI-USUARIO --- */
let currentUser = localStorage.getItem("fmc-current-user") || null;

function getCurrentStorageKey() {
  return currentUser ? `fmc-save-user-${currentUser}` : "fmc-save-v2";
}

const originalSaveLogic = typeof save === 'function' ? save : function(){};
save = function() {
  try {
    const key = getCurrentStorageKey();
    localStorage.setItem(key, JSON.stringify(compactStateForStorage(state)));
  } catch(e){}
  if (typeof render === 'function') render();
};

function openAuthModal() {
  const m = document.getElementById('authModal');
  if (m) m.style.display = 'flex';
}

function closeAuthModal() {
  const m = document.getElementById('authModal');
  if (m) m.style.display = 'none';
}

function submitAuth(action) {
  const userEl = document.getElementById('authUsername');
  const passEl = document.getElementById('authPassword');
  if (!userEl || !passEl) return;
  const user = userEl.value.trim();
  const pass = passEl.value.trim();
  
  if (!user || !pass) {
    alert("Ingresa usuario y contraseña.");
    return;
  }
  
  const accounts = JSON.parse(localStorage.getItem("fmc-accounts") || "{}");
  
  if (action === 'register') {
    if (accounts[user]) {
      alert("El usuario ya existe. Intenta iniciar sesión.");
      return;
    }
    accounts[user] = pass;
    localStorage.setItem("fmc-accounts", JSON.stringify(accounts));
    currentUser = user;
    localStorage.setItem("fmc-current-user", user);
    save();
    alert("¡Cuenta creada con éxito!");
  } else if (action === 'login') {
    if (!accounts[user] || accounts[user] !== pass) {
      alert("Usuario o contraseña incorrectos.");
      return;
    }
    currentUser = user;
    localStorage.setItem("fmc-current-user", user);
    const raw = localStorage.getItem(getCurrentStorageKey());
    if (raw) {
      try {
        const loadedState = JSON.parse(raw);
        Object.assign(state, loadedState);
      } catch(e){}
    }
    alert(`¡Bienvenido de nuevo, ${user}!`);
  }
  
  updateAuthUI();
  closeAuthModal();
  if (typeof render === 'function') render();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("fmc-current-user");
  updateAuthUI();
  location.reload();
}

function updateAuthUI() {
  const btn = document.getElementById('authBtnHeader');
  if (btn) {
    if (currentUser) {
      btn.innerHTML = `👤 ${currentUser} (Salir)`;
      btn.onclick = logoutUser;
      btn.style.background = "#e11d48";
    } else {
      btn.innerHTML = `👤 Iniciar Sesión`;
      btn.onclick = openAuthModal;
      btn.style.background = "#22c55e";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
});
