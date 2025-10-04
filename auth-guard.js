// auth-guard.js — type="module"
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDxxN6Fh9NPeY5O7tpvZEOu3X5kbXsJ5Nw",
  authDomain: "flaskart-6b1c9.firebaseapp.com",
  projectId: "flaskart-6b1c9",
  storageBucket: "flaskart-6b1c9.firebasestorage.app",
  messagingSenderId: "25479701217",
  appId: "1:25479701217:web:44cedffb2717e14ea18da0",
  measurementId: "G-JB7J6N3P37"
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Eğer login değilse, login.html'e yönlendir
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
});
