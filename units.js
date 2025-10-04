// units.js — type="module"

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp, 
  onSnapshot, query, orderBy, deleteDoc, doc, 
  updateDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser = null;
let courseId = null;
let courseName = null;

let unitToDelete = null;
let unitIdToDelete = null;
let deleteButton = null;
let unitIdToEdit = null;

const $ = (s) => document.querySelector(s);
const unitContainer = $('#unitContainer');

/***** Firestore path *****/
function getUnitsRef(uid) {
  return collection(db, `users/${uid}/courses/${courseId}/units`);
}

/***** Render Ünite Kartı *****/
function renderUnitCard(docId, name, count = 0) {
  const card = document.createElement('div');
  card.className = 'course-card';
  card.dataset.id = docId;
  card.style.position = 'relative';
 card.innerHTML = `
  <button class="card-menu-btn" aria-haspopup="true" aria-expanded="false">⋮</button>
  <div class="card-menu">
    <button class="edit-option">Düzenle</button>
    <button class="delete-option">Sil</button>
  </div>
  <h2 class="course-card__title">${name}</h2>
  <div class="unit-card__count">${count}</div>   <!-- 🔥 class farklı -->
  <div class="course-card__label">Kart</div>
`;

  const menuBtn = card.querySelector('.card-menu-btn');
  const menu    = card.querySelector('.card-menu');

  // Menü aç/kapat
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.card-menu.active').forEach(m => { if (m !== menu) m.classList.remove('active'); });
    menu.classList.toggle('active');
    menuBtn.setAttribute('aria-expanded', menu.classList.contains('active') ? 'true' : 'false');
  });

  // Düzenle
  menu.querySelector('.edit-option').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('active');
    openEditUnitModal(docId, name);
  });

  // Sil
  menu.querySelector('.delete-option').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('active');
    confirmDeleteUnit(menuBtn, name, docId);
  });

  unitContainer.insertBefore(card, unitContainer.querySelector('.spacer'));
}

/***** Listener *****/
function startRealtimeListener(uid) {
  const q = query(getUnitsRef(uid), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    [...unitContainer.querySelectorAll('.course-card, .empty-message')].forEach(el => el.remove());

    if (snap.empty) {
      const msg = document.createElement('p');
      msg.className = 'empty-message';
      msg.textContent = "Bu konuda henüz ünite yok. Lütfen ünite ekleyin.";
      unitContainer.insertBefore(msg, unitContainer.querySelector('.spacer'));
      return;
    }

    snap.forEach((d) => {
      const data = d.data();
      renderUnitCard(d.id, data.name, data.count ?? 0);
    });
  });
}

/***** Auth *****/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    startRealtimeListener(user.uid);
  } else {
    await signInAnonymously(auth);
  }
});

/***** Modal: Ünite ekle *****/
function openUnitModal() { $('#unitModalOverlay')?.classList.add('active'); }
function closeUnitModal() { $('#unitModalOverlay')?.classList.remove('active'); const i=$('#unitInput'); if (i) i.value=''; }
function closeUnitModalOnOverlay(e) { if (e.target.id === 'unitModalOverlay') closeUnitModal(); }
function handleUnitKeyPress(e) { if (e.key === 'Enter') addUnit(); }

async function addUnit() {
  const input = $('#unitInput');
  const name = (input?.value || '').trim();
  if (!name || !currentUser) return;

  await addDoc(getUnitsRef(currentUser.uid), { 
    name, 
    count: 0,               // 🔥 ünite ilk açıldığında kart sayısı 0
    createdAt: serverTimestamp() 
  });

  closeUnitModal();
}

/***** Modal: Ünite silme (iki aşamalı) *****/
function confirmDeleteUnit(button, name, docId) {
  deleteButton = button;
  unitToDelete = name;
  unitIdToDelete = docId;
  $('#deleteUnitName').textContent = name;
  $('#deleteUnitModalOverlay')?.classList.add('active');
}
function closeDeleteUnitModal() {
  $('#deleteUnitModalOverlay')?.classList.remove('active');
  deleteButton = null; unitToDelete = null; unitIdToDelete = null;
}
function closeDeleteUnitModalOnOverlay(e) { if (e.target.id === 'deleteUnitModalOverlay') closeDeleteUnitModal(); }

function showFinalUnitConfirmation() {
  $('#finalDeleteUnitName').textContent = unitToDelete ?? '';
  $('#finalConfirmUnitModalOverlay')?.classList.add('active');
  $('#deleteUnitModalOverlay')?.classList.remove('active');
}
function closeFinalConfirmUnitModal() {
  $('#finalConfirmUnitModalOverlay')?.classList.remove('active');
  deleteButton = null; unitToDelete = null; unitIdToDelete = null;
}
function closeFinalConfirmUnitModalOnOverlay(e) { if (e.target.id === 'finalConfirmUnitModalOverlay') closeFinalConfirmUnitModal(); }

async function deleteUnit() {
  if (!currentUser || !unitIdToDelete) return;

  await deleteDoc(doc(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitIdToDelete}`));

  closeFinalConfirmUnitModal();

  if (deleteButton) {
    const card = deleteButton.closest('.course-card');
    if (card) {
      card.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => card.remove(), 300);
    }
  }
}

/***** Modal: Ünite düzenle *****/
function openEditUnitModal(id, oldName) {
  unitIdToEdit = id;
  const input = $('#editUnitInput');
  if (input) input.value = oldName || '';
  $('#editUnitModalOverlay')?.classList.add('active');
}
function closeEditUnitModal() {
  $('#editUnitModalOverlay')?.classList.remove('active');
  const input = $('#editUnitInput'); if (input) input.value = '';
  unitIdToEdit = null;
}
function closeEditUnitModalOnOverlay(e) {
  if (e.target.id === 'editUnitModalOverlay') closeEditUnitModal();
}
function handleEditUnitKeyPress(e) {
  if (e.key === 'Enter') saveUnitEdit();
}
async function saveUnitEdit() {
  const newName = ($('#editUnitInput')?.value || '').trim();
  if (!newName || !unitIdToEdit || !currentUser) return;
  try {
    await updateDoc(doc(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitIdToEdit}`), { name: newName });
  } catch (err) {
    console.error('[firestore] update unit name error:', err);
  } finally {
    closeEditUnitModal();
  }
}

/***** window binding *****/
window.closeUnitModal = closeUnitModal;
window.closeUnitModalOnOverlay = closeUnitModalOnOverlay;
window.handleUnitKeyPress = handleUnitKeyPress;
window.addUnit = addUnit;

window.closeDeleteUnitModal = closeDeleteUnitModal;
window.closeDeleteUnitModalOnOverlay = closeDeleteUnitModalOnOverlay;
window.showFinalUnitConfirmation = showFinalUnitConfirmation;
window.closeFinalConfirmUnitModal = closeFinalConfirmUnitModal;
window.closeFinalConfirmUnitModalOnOverlay = closeFinalConfirmUnitModalOnOverlay;
window.deleteUnit = deleteUnit;

window.closeEditUnitModal = closeEditUnitModal;
window.closeEditUnitModalOnOverlay = closeEditUnitModalOnOverlay;
window.handleEditUnitKeyPress = handleEditUnitKeyPress;
window.saveUnitEdit = saveUnitEdit;

/***** sayfa yüklenince *****/
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  courseId = params.get('courseId');
  courseName = params.get('courseName');
  if (courseName) $('#courseTitle').textContent = courseName;
  $('#addUnitBtn')?.addEventListener('click', () => { openUnitModal(); });

  // dışarı tıklayınca menüleri kapat
  document.addEventListener('click', () => {
    document.querySelectorAll('.card-menu.active').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.card-menu-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded','false'));
  });
});
