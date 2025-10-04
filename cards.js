// cards.js — Tinder-style kart sistemi
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/*** Firebase Config ***/
const firebaseConfig = {
  apiKey: "AIzaSyDxxN6Fh9NPeY5O7tpvZEOu3X5kbXsJ5Nw",
  authDomain: "flaskart-6b1c9.firebaseapp.com",
  projectId: "flaskart-6b1c9",
  storageBucket: "flaskart-6b1c9.firebasestorage.app",
  messagingSenderId: "25479701217",
  appId: "1:25479701217:web:44cedffb2717e14ea18da0"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let courseId = null;
let unitId = null;
let cards = [];
let editingCardId = null;

/*** Yardımcılar ***/
const $ = (s) => document.querySelector(s);
const deck = $('#cardDeck');

/*** Auth kontrolü ***/
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const params = new URLSearchParams(window.location.search);
    courseId = params.get('courseId');
    unitId = params.get('unitId');
    
    if (!courseId || !unitId) {
      alert('Ders veya ünite bulunamadı!');
      window.location.href = 'units.html';
      return;
    }
    
    await loadCards();
  } else {
    window.location.href = "login.html";
  }
});

/*** Kartları Yükle ***/
async function loadCards() {
  try {
    const ref = collection(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitId}/cards`);
    const snap = await getDocs(ref);
    cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (cards.length === 0) {
      showEmptyState();
      return;
    }
    
    // Rastgele sırala
    cards.sort(() => Math.random() - 0.5);
    renderCards();
  } catch (error) {
    console.error('Kartlar yüklenirken hata:', error);
    alert('Kartlar yüklenemedi. Lütfen tekrar deneyin.');
  }
}

/*** Boş Durum Göster ***/
function showEmptyState() {
  deck.innerHTML = `
    <div style="text-align: center; color: var(--color-text-secondary); padding: 40px;">
      <h2 style="font-size: 2rem; margin-bottom: 1rem;">📚</h2>
      <h3 style="margin-bottom: 0.5rem;">Henüz kart eklenmemiş</h3>
      <p>Hemen ilk kartını ekleyerek çalışmaya başla!</p>
    </div>
  `;
}

/*** Kartları Render Et ***/
function renderCards() {
  deck.innerHTML = '';
  cards.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.zIndex = cards.length - i;
    div.dataset.cardId = card.id;
    
    div.innerHTML = `
      <div class="card-inner">
        <div class="card-front">
          <h2>${card.front || 'Başlık yok'}</h2>
          <p>${card.back || 'İçerik yok'}</p>
        </div>
        <div class="card-back" style="display: none;">
          <h2>${card.front || 'Başlık yok'}</h2>
          <p>${card.back || 'İçerik yok'}</p>
          <div class="card-actions">
            <button class="card-action-btn edit-btn" onclick="window.openEditModal('${card.id}')">
              ✏️ Düzenle
            </button>
            <button class="card-action-btn delete-btn" onclick="window.deleteCard('${card.id}')">
              🗑️ Sil
            </button>
          </div>
        </div>
      </div>
    `;
    
    deck.appendChild(div);
  });
  initSwipe();
}

/*** Swipe Mantığı ***/
function initSwipe() {
  const allCards = document.querySelectorAll('.card');
  
  allCards.forEach((card) => {
    let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false;
    let startTime = 0;
    let isFlipped = false;

    const onStart = (e) => {
      const point = e.touches ? e.touches[0] : e;
      startX = point.clientX;
      startY = point.clientY;
      startTime = Date.now();
      isDragging = true;
      card.style.transition = 'none';
      card.style.cursor = 'grabbing';
    };

    const onMove = (e) => {
      if (!isDragging) return;
      
      const point = e.touches ? e.touches[0] : e;
      currentX = point.clientX - startX;
      currentY = point.clientY - startY;
      
      // Eğer hareket küçükse, tıklama olabilir
      if (Math.abs(currentX) < 5 && Math.abs(currentY) < 5) {
        return;
      }
      
      e.preventDefault();
      const rotate = currentX / 20;
      
      card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
      
      // Renk efekti
      if (currentX > 50) {
        card.style.borderLeft = '5px solid #10b981';
      } else if (currentX < -50) {
        card.style.borderLeft = '5px solid #ef4444';
      } else {
        card.style.borderLeft = 'none';
      }
    };

    const onEnd = (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const point = e.changedTouches ? e.changedTouches[0] : e;
      const movedX = point.clientX - startX;
      const movedY = point.clientY - startY;
      const moveDistance = Math.sqrt(movedX * movedX + movedY * movedY);
      const timeDiff = Date.now() - startTime;
      
      card.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
      card.style.cursor = 'grab';
      card.style.borderLeft = 'none';

      // Eğer hareket çok az ve hızlıysa, tıklama olarak algıla (flip)
      if (moveDistance < 10 && timeDiff < 300) {
        flipCard(card);
        card.style.transform = '';
        return;
      }

      // Swipe kontrolü
      if (Math.abs(movedX) > 100) {
        if (movedX > 0) {
          card.classList.add('swipe-right');
        } else {
          card.classList.add('swipe-left');
        }
        
        setTimeout(() => {
          card.remove();
          checkRemainingCards();
        }, 400);
      } else {
        // Geri dön
        card.style.transform = '';
      }
    };

    // Touch ve Mouse eventleri
    card.addEventListener('mousedown', onStart);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseup', onEnd);
    card.addEventListener('mouseleave', onEnd);
    
    card.addEventListener('touchstart', onStart, { passive: true });
    card.addEventListener('touchmove', onMove, { passive: false });
    card.addEventListener('touchend', onEnd);
  });
}

/*** Kart Flip ***/
function flipCard(card) {
  const front = card.querySelector('.card-front');
  const back = card.querySelector('.card-back');
  
  if (!front || !back) return;
  
  if (front.style.display !== 'none') {
    // Ön yüzden arka yüze
    front.style.display = 'none';
    back.style.display = 'flex';
  } else {
    // Arka yüzden ön yüze
    front.style.display = 'flex';
    back.style.display = 'none';
  }
}

/*** Kalan Kartları Kontrol Et ***/
function checkRemainingCards() {
  const remainingCards = document.querySelectorAll('.card');
  if (remainingCards.length === 0) {
    showEndMessage();
  }
}

/*** Bitiş Mesajı ***/
function showEndMessage() {
  deck.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--color-text);">
      <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">🎉</h2>
      <h3 style="margin-bottom: 0.5rem;">Tüm kartları tamamladınız!</h3>
      <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">Harika iş! Tüm kartları gözden geçirdiniz.</p>
      <button onclick="window.restartCards()" class="btn-add" style="margin: 0 auto;">
        🔄 Yeniden Başlat
      </button>
    </div>
  `;
}

/*** Kartları Yeniden Başlat ***/
function restartCards() {
  loadCards();
}

/*** Tekli Kart Ekleme/Düzenleme Modalı ***/
function openCardModal() {
  editingCardId = null;
  const modal = $('#cardModalOverlay');
  const title = modal?.querySelector('.modal__title');
  const addBtn = modal?.querySelector('.modal__button--primary');
  
  if (modal) {
    modal.classList.add('active');
    if (title) title.textContent = 'Yeni Kart Ekle';
    if (addBtn) addBtn.textContent = 'Ekle';
    
    // Input'ları temizle
    const frontInput = $('#cardFront');
    const backInput = $('#cardBack');
    if (frontInput) frontInput.value = '';
    if (backInput) backInput.value = '';
    
    // İlk input'a focus
    setTimeout(() => frontInput?.focus(), 100);
  }
}

function openEditModal(cardId) {
  editingCardId = cardId;
  const card = cards.find(c => c.id === cardId);
  
  if (!card) return;
  
  const modal = $('#cardModalOverlay');
  const title = modal?.querySelector('.modal__title');
  const addBtn = modal?.querySelector('.modal__button--primary');
  
  if (modal) {
    modal.classList.add('active');
    if (title) title.textContent = 'Kartı Düzenle';
    if (addBtn) addBtn.textContent = 'Güncelle';
    
    // Input'lara mevcut değerleri yükle
    const frontInput = $('#cardFront');
    const backInput = $('#cardBack');
    if (frontInput) frontInput.value = card.front || '';
    if (backInput) backInput.value = card.back || '';
    
    setTimeout(() => frontInput?.focus(), 100);
  }
}

function closeCardModal() {
  const modal = $('#cardModalOverlay');
  if (modal) modal.classList.remove('active');
  editingCardId = null;
}

function closeCardModalOnOverlay(e) {
  if (e.target.id === 'cardModalOverlay') {
    closeCardModal();
  }
}

async function addCard() {
  const front = $('#cardFront')?.value.trim();
  const back = $('#cardBack')?.value.trim();
  
  if (!front) {
    alert("Kart başlığı boş olamaz!");
    return;
  }
  
  if (!back) {
    alert("Kart içeriği boş olamaz!");
    return;
  }
  
  try {
    if (editingCardId) {
      // Güncelleme
      const docRef = doc(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitId}/cards`, editingCardId);
      await updateDoc(docRef, {
        front,
        back,
        updatedAt: serverTimestamp()
      });
      alert("Kart başarıyla güncellendi! ✅");
    } else {
      // Yeni ekleme
      await addDoc(collection(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitId}/cards`), {
        front,
        back,
        createdAt: serverTimestamp()
      });
      alert("Kart başarıyla eklendi! 🎉");
    }
    
    closeCardModal();
    await loadCards();
  } catch (error) {
    console.error('İşlem sırasında hata:', error);
    alert('İşlem tamamlanamadı. Lütfen tekrar deneyin.');
  }
}

async function deleteCard(cardId) {
  if (!confirm('Bu kartı silmek istediğinizden emin misiniz?')) {
    return;
  }
  
  try {
    const docRef = doc(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitId}/cards`, cardId);
    await deleteDoc(docRef);
    alert("Kart başarıyla silindi! 🗑️");
    await loadCards();
  } catch (error) {
    console.error('Kart silinirken hata:', error);
    alert('Kart silinemedi. Lütfen tekrar deneyin.');
  }
}

/*** Butonlar ***/
const addCardBtn = $('#addCardBtn');
const addBulkBtn = $('#addBulkBtn');

if (addCardBtn) {
  addCardBtn.addEventListener('click', openCardModal);
}

if (addBulkBtn) {
  addBulkBtn.addEventListener('click', openBulkModal);
}

/*** Toplu Kart Ekleme ***/
let bulkCards = [];

function openBulkModal() {
  const modal = $('#bulkModalOverlay');
  if (!modal) return;
  
  bulkCards = [{ front: '', back: '' }]; // İlk boş kart
  renderBulkCards();
  modal.classList.add('active');
  
  // İlk input'a focus
  setTimeout(() => {
    const firstInput = $('#bulkCardsContainer input');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeBulkModal() {
  const modal = $('#bulkModalOverlay');
  if (modal) modal.classList.remove('active');
  bulkCards = [];
}

function closeBulkModalOnOverlay(e) {
  if (e.target.id === 'bulkModalOverlay') {
    closeBulkModal();
  }
}

function renderBulkCards() {
  const container = $('#bulkCardsContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  bulkCards.forEach((card, index) => {
    const row = document.createElement('div');
    row.className = 'bulk-card-row';
    row.innerHTML = `
      <input 
        type="text" 
        placeholder="Başlık (Tab tuşuna basın)" 
        value="${card.front}"
        data-index="${index}"
        data-field="front"
        class="bulk-front-input"
      >
      <textarea 
        placeholder="Açıklama (Enter ile yeni kart)"
        data-index="${index}"
        data-field="back"
        class="bulk-back-input"
        rows="2"
      >${card.back}</textarea>
      ${bulkCards.length > 1 ? `<button class="bulk-delete-btn" onclick="removeBulkCard(${index})">🗑️</button>` : '<div style="width: 40px;"></div>'}
    `;
    container.appendChild(row);
  });
  
  // Event listener'ları ekle
  attachBulkCardEvents();
}

function attachBulkCardEvents() {
  const frontInputs = document.querySelectorAll('.bulk-front-input');
  const backInputs = document.querySelectorAll('.bulk-back-input');
  
  frontInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      bulkCards[index].front = e.target.value;
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const index = parseInt(e.target.dataset.index);
        const backInput = document.querySelector(`.bulk-back-input[data-index="${index}"]`);
        if (backInput) backInput.focus();
      }
    });
  });
  
  backInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      bulkCards[index].back = e.target.value;
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const index = parseInt(e.target.dataset.index);
        
        // Yeni kart ekle
        if (index === bulkCards.length - 1) {
          bulkCards.push({ front: '', back: '' });
          renderBulkCards();
          
          // Yeni eklenen kartın front input'una focus
          setTimeout(() => {
            const newInput = document.querySelector(`.bulk-front-input[data-index="${index + 1}"]`);
            if (newInput) newInput.focus();
          }, 50);
        }
      }
    });
  });
}

function removeBulkCard(index) {
  if (bulkCards.length <= 1) {
    alert('En az bir kart olmalı!');
    return;
  }
  
  bulkCards.splice(index, 1);
  renderBulkCards();
}

async function saveBulkCards() {
  // Boş olmayan kartları filtrele
  const validCards = bulkCards.filter(card => card.front.trim() && card.back.trim());
  
  if (validCards.length === 0) {
    alert('En az bir geçerli kart eklemelisiniz!');
    return;
  }
  
  const confirmMsg = `${validCards.length} kart eklenecek. Onaylıyor musunuz?`;
  if (!confirm(confirmMsg)) return;
  
  try {
    const batch = [];
    const ref = collection(db, `users/${currentUser.uid}/courses/${courseId}/units/${unitId}/cards`);
    
    for (const card of validCards) {
      batch.push(
        addDoc(ref, {
          front: card.front.trim(),
          back: card.back.trim(),
          createdAt: serverTimestamp()
        })
      );
    }
    
    await Promise.all(batch);
    
    closeBulkModal();
    alert(`✅ ${validCards.length} kart başarıyla eklendi!`);
    await loadCards();
  } catch (error) {
    console.error('Toplu kart eklenirken hata:', error);
    alert('Kartlar eklenemedi. Lütfen tekrar deneyin.');
  }
}

/*** Export global ***/
window.closeCardModal = closeCardModal;
window.closeCardModalOnOverlay = closeCardModalOnOverlay;
window.addCard = addCard;
window.restartCards = restartCards;
window.openEditModal = openEditModal;
window.deleteCard = deleteCard;
window.closeBulkModal = closeBulkModal;
window.closeBulkModalOnOverlay = closeBulkModalOnOverlay;
window.saveBulkCards = saveBulkCards;
window.removeBulkCard = removeBulkCard;