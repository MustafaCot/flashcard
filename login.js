// login.js — type="module"

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/***** Firebase Config *****/
const firebaseConfig = {
  apiKey: "AIzaSyDxxN6Fh9NPeY5O7tpvZEOu3X5kbXsJ5Nw",
  authDomain: "flaskart-6b1c9.firebaseapp.com",
  projectId: "flaskart-6b1c9",
  storageBucket: "flaskart-6b1c9.firebasestorage.app",
  messagingSenderId: "25479701217",
  appId: "1:25479701217:web:44cedffb2717e14ea18da0",
  measurementId: "G-JB7J6N3P37"
};

// Tekil app instance
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// "Beni hatırla" (kalıcı oturum)
await setPersistence(auth, browserLocalPersistence).catch(console.error);

/***** Oturum kontrolü *****/
// Eğer zaten giriş yapıldıysa index.html'e yönlendir
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (window.location.pathname.endsWith("login.html")) {
      window.location.href = "index.html";
    }
  }
});

// Helpers
const $ = (id) => document.getElementById(id);

/***** LOGIN *****/
$("loginBtn")?.addEventListener("click", async () => {
  const email = $("loginEmail")?.value.trim();
  const pass  = $("loginPassword")?.value.trim();

  if (!email || !pass) return alert("Lütfen e-posta ve parola girin.");
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "index.html";
  } catch (e) {
    let msg = "Giriş başarısız.";
    if (e.code === "auth/user-not-found") msg = "Kullanıcı bulunamadı.";
    if (e.code === "auth/wrong-password") msg = "Parola hatalı.";
    if (e.code === "auth/invalid-email") msg = "Geçerli bir e-posta giriniz.";
    alert(msg);
  }
});

// Enter ile login
["loginEmail", "loginPassword"].forEach(id => {
  $(id)?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") $("loginBtn").click();
  });
});

/***** REGISTER *****/
$("registerBtn")?.addEventListener("click", async () => {
  const email = $("registerEmail")?.value.trim();
  const p1    = $("registerPassword")?.value.trim();
  const p2    = $("registerPassword2")?.value.trim();

  if (!email || !p1 || !p2) return alert("Lütfen tüm alanları doldurun.");
  if (p1 !== p2) return alert("Parolalar eşleşmiyor.");

  try {
    await createUserWithEmailAndPassword(auth, email, p1);
    alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    // login ekranına dön
    document.getElementById("registerCard").style.display = "none";
    document.getElementById("loginCard").style.display = "block";
  } catch (e) {
    let msg = "Kayıt başarısız.";
    if (e.code === "auth/email-already-in-use") msg = "Bu e-posta zaten kayıtlı.";
    if (e.code === "auth/weak-password") msg = "Parola en az 6 karakter olmalı.";
    if (e.code === "auth/invalid-email") msg = "Geçerli bir e-posta giriniz.";
    alert(msg);
  }
});

/***** LOGOUT örneği *****/
// Eğer index.html'e logout butonu koyarsan çalışır
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
