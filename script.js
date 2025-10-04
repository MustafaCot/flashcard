// script.js — type="module"

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, deleteDoc, doc, updateDoc
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

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/***** Global durumlar *****/
let currentUser = null;
let courseToDelete = null;
let courseIdToDelete = null;
let deleteButton = null;
let courseIdToEdit = null;

/***** DOM yardımcıları *****/
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const courseContainer = $('#courseContainer');

/***** Kurs kartı render (⋮ menülü) *****/
function renderCourseCard(docId, name, count = 0) {
  const card = document.createElement('div');
  card.className = 'course-card';
  card.dataset.id = docId;
  card.dataset.name = name;
  card.style.position = 'relative';

  card.innerHTML = `
    <button class="card-menu-btn" aria-haspopup="true" aria-expanded="false" title="Seçenekler">⋮</button>
    <div class="card-menu" role="menu">
      <button class="edit-option" role="menuitem">Düzenle</button>
      <button class="delete-option" role="menuitem">Sil</button>
    </div>
    <h2 class="course-card__title">${name}</h2>
    <div class="course-card__count">${count}</div>
    <div class="course-card__label">ünite</div>
  `;

  const menuBtn = card.querySelector('.card-menu-btn');
  const menu    = card.querySelector('.card-menu');

  // Menü aç/kapat
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    $$('.card-menu.active').forEach(m => { if (m !== menu) m.classList.remove('active'); });
    menu.classList.toggle('active');
    menuBtn.setAttribute('aria-expanded', menu.classList.contains('active') ? 'true' : 'false');
  });

  // Düzenle seçeneği
  menu.querySelector('.edit-option').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('active');
    openEditCourseModal(docId, name);
  });

  // Sil seçeneği
  menu.querySelector('.delete-option').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('active');
    confirmDelete(menuBtn, name, docId);
  });

  // Kartın boş bir yerine tıklanınca ünitelere git
  card.addEventListener('click', () => {
    menu.classList.remove('active');
    window.location.href = `units.html?courseId=${docId}&courseName=${encodeURIComponent(name)}`;
  });

  const spacer = courseContainer?.querySelector('.spacer');
  if (spacer) courseContainer.insertBefore(card, spacer);
  else courseContainer.appendChild(card);
}

/***** Kursları temizle *****/
function clearCards() {
  $$('.course-card, .empty-message').forEach(el => el.remove());
}

/***** Firestore referans *****/
function getCoursesCollectionRef(uid) {
  return collection(db, `users/${uid}/courses`);
}

/***** Realtime listener *****/
function startRealtimeListener(uid) {
  const q = query(getCoursesCollectionRef(uid), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    clearCards();

    if (snapshot.empty) {
      const msg = document.createElement('p');
      msg.className = 'empty-message';
      msg.textContent = "Herhangi bir konu bulunmuyor. Lütfen yeni konu ekleyin.";
      const spacer = courseContainer.querySelector('.spacer');
      courseContainer.insertBefore(msg, spacer || null);
      return;
    }

    snapshot.forEach((d) => {
      const data = d.data();
      renderCourseCard(d.id, data.name, data.count ?? 0);
    });
  }, (error) => {
    console.error("[firestore] onSnapshot error:", error);
  });
}

/***** Auth kontrolü *****/
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    startRealtimeListener(user.uid);
  }
});

/***** Modal: Kurs ekle *****/
export function openModal() {
  $('#modalOverlay')?.classList.add('active');
  $('#courseInput')?.focus();
}
export function closeModal() {
  $('#modalOverlay')?.classList.remove('active');
  const inp = $('#courseInput'); if (inp) inp.value = '';
}
export function closeModalOnOverlay(event) {
  if (event.target.id === 'modalOverlay') closeModal();
}
export function handleKeyPress(event) {
  if (event.key === 'Enter') addCourse();
}
export async function addCourse() {
  const input = $('#courseInput');
  const courseName = (input?.value || '').trim();
  if (!courseName || !currentUser) return;

  try {
    await addDoc(getCoursesCollectionRef(currentUser.uid), {
      name: courseName,
      count: 0,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error('[firestore] addCourse error:', err);
  }
}

/***** Modal: Kurs silme *****/
function confirmDelete(button, courseName, docId) {
  deleteButton = button;
  courseToDelete = courseName;
  courseIdToDelete = docId;
  $('#deleteCourseName').textContent = courseName;
  $('#deleteModalOverlay')?.classList.add('active');
}
function closeDeleteModal() {
  $('#deleteModalOverlay')?.classList.remove('active');
  deleteButton = null; courseToDelete = null; courseIdToDelete = null;
}
function showFinalConfirmation() {
  $('#finalDeleteCourseName').textContent = courseToDelete ?? '';
  $('#finalConfirmModalOverlay')?.classList.add('active');
  $('#deleteModalOverlay')?.classList.remove('active');
}
function closeFinalConfirmModal() {
  $('#finalConfirmModalOverlay')?.classList.remove('active');
  deleteButton = null; courseToDelete = null; courseIdToDelete = null;
}
async function deleteCourse() {
  if (!currentUser || !courseIdToDelete) return;
  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/courses/${courseIdToDelete}`));
  } catch (err) {
    console.error('[firestore] deleteCourse error:', err);
  } finally {
    closeFinalConfirmModal();
  }
}

/***** Modal: Kurs düzenle *****/
function openEditCourseModal(id, oldName) {
  courseIdToEdit = id;
  const input = $('#editCourseInput');
  if (input) input.value = oldName || '';
  $('#editCourseModalOverlay')?.classList.add('active');
}
function closeEditCourseModal() {
  $('#editCourseModalOverlay')?.classList.remove('active');
  const input = $('#editCourseInput'); if (input) input.value = '';
  courseIdToEdit = null;
}
async function saveCourseEdit() {
  const newName = ($('#editCourseInput')?.value || '').trim();
  if (!newName || !courseIdToEdit || !currentUser) return;
  try {
    await updateDoc(doc(db, `users/${currentUser.uid}/courses/${courseIdToEdit}`), { name: newName });
  } catch (err) {
    console.error('[firestore] update course name error:', err);
  } finally {
    closeEditCourseModal();
  }
}

/***** Logout *****/
function setupLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });
  }
}

/***** DOM hazır *****/
document.addEventListener('DOMContentLoaded', () => {
  // Kurs ekleme butonu
  const openers = [...document.querySelectorAll('#addCourseBtn'), ...document.querySelectorAll('.btn-add')];
  openers.forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));

  // Menüleri dışarı tıklayınca kapat
  document.addEventListener('click', () => {
    $$('.card-menu.active').forEach(m => m.classList.remove('active'));
    $$('.card-menu-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded','false'));
  });

  setupLogout();
});

/***** Window binding (HTML onclick için) *****/
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOnOverlay = closeModalOnOverlay;
window.handleKeyPress = handleKeyPress;
window.addCourse = addCourse;

window.closeDeleteModal = closeDeleteModal;
window.showFinalConfirmation = showFinalConfirmation;
window.closeFinalConfirmModal = closeFinalConfirmModal;
window.deleteCourse = deleteCourse;

window.closeEditCourseModal = closeEditCourseModal;
window.saveCourseEdit = saveCourseEdit;
