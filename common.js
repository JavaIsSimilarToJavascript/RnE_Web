// 공통 유틸리티 함수

// HTML 이스케이프
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 연구 노트 관련
function getNotes() {
  return JSON.parse(localStorage.getItem('researchNotes') || '[]');
}

function saveNotes(notes) {
  // Always persist locally
  localStorage.setItem('researchNotes', JSON.stringify(notes));
  // If sync enabled, also write to Firestore
  if (window.RandeSync && window.RandeSync.enabled) {
    window.RandeSync.saveNotes(notes).catch(e => console.warn('saveNotes Firestore failed', e));
  }
}

// 일정 관련
function getEvents() {
  return JSON.parse(localStorage.getItem('researchEvents') || '[]');
}

function saveEvents(events) {
  localStorage.setItem('researchEvents', JSON.stringify(events));
  if (window.RandeSync && window.RandeSync.enabled) {
    window.RandeSync.saveEvents(events).catch(e => console.warn('saveEvents Firestore failed', e));
  }
}

// 논문 관련
function getPapers() {
  return JSON.parse(localStorage.getItem('researchPapers') || '[]');
}

function savePapers(papers) {
  localStorage.setItem('researchPapers', JSON.stringify(papers));
  if (window.RandeSync && window.RandeSync.enabled) {
    window.RandeSync.savePapers(papers).catch(e => console.warn('savePapers Firestore failed', e));
  }
}


// --- Firestore-based Sync Manager ---
window.RandeSync = (function(){
  let enabled = false;
  let app = null;
  let db = null;
  let unsubscribers = [];

  function emitStatus(status) {
    window.dispatchEvent(new CustomEvent('rande:sync-status', { detail: { status } }));
  }

  function emitUpdate(type) {
    window.dispatchEvent(new CustomEvent('rande:updated', { detail: { type } }));
  }

  function loadFirebase() {
    return new Promise((resolve, reject) => {
      if (window.firebase && window.firebase.firestore) return resolve();
      const scripts = [
        'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js'
      ];
      let loaded = 0;
      scripts.forEach(src => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => { loaded++; if (loaded === scripts.length) resolve(); };
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });
    });
  }

  async function init(firebaseConfig) {
    await loadFirebase();
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    db = firebase.firestore();
  }

  async function enable(firebaseConfig) {
    if (enabled) return;
    emitStatus('starting');
    if (!firebaseConfig) throw new Error('firebaseConfig required');
    await init(firebaseConfig);

    // Merge strategy: if remote exists and is newer than local, use remote. Otherwise push local to remote.
    await synchronizeAll();

    // start realtime listeners
    startListeners();
    enabled = true;
    emitStatus('enabled');
  }

  function disable() {
    stopListeners();
    enabled = false;
    emitStatus('disabled');
  }

  function startListeners() {
    stopListeners();
    const types = ['notes', 'events', 'papers'];
    types.forEach(type => {
      const unsub = db.collection('rande').doc(type).onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (!data) return;
        const items = data.items || [];
        // Update local storage
        if (type === 'notes') localStorage.setItem('researchNotes', JSON.stringify(items));
        if (type === 'events') localStorage.setItem('researchEvents', JSON.stringify(items));
        if (type === 'papers') localStorage.setItem('researchPapers', JSON.stringify(items));
        emitUpdate(type);
      }, err => {
        console.warn('onSnapshot error', err);
      });
      unsubscribers.push(unsub);
    });
  }

  function stopListeners() {
    while (unsubscribers.length) {
      const u = unsubscribers.pop();
      try { u(); } catch (e) {}
    }
  }

  async function saveDoc(type, items) {
    if (!db) throw new Error('Firestore not initialized');
    const ref = db.collection('rande').doc(type);
    const payload = { items: items, updatedAt: new Date().toISOString() };
    await ref.set(payload);
  }

  async function fetchDoc(type) {
    if (!db) throw new Error('Firestore not initialized');
    const ref = db.collection('rande').doc(type);
    const doc = await ref.get();
    if (!doc.exists) return null;
    return doc.data();
  }

  async function synchronizeAll() {
    // For each type, compare updatedAt
    const localNotes = JSON.parse(localStorage.getItem('researchNotes') || '[]');
    const localEvents = JSON.parse(localStorage.getItem('researchEvents') || '[]');
    const localPapers = JSON.parse(localStorage.getItem('researchPapers') || '[]');

    const remoteNotesDoc = await fetchDoc('notes');
    if (remoteNotesDoc && remoteNotesDoc.updatedAt && new Date(remoteNotesDoc.updatedAt) > new Date(localStorage.getItem('rande_notes_sync_ts') || 0)) {
      localStorage.setItem('researchNotes', JSON.stringify(remoteNotesDoc.items || []));
    } else if (!remoteNotesDoc) {
      await saveDoc('notes', localNotes);
    }

    const remoteEventsDoc = await fetchDoc('events');
    if (remoteEventsDoc && remoteEventsDoc.updatedAt && new Date(remoteEventsDoc.updatedAt) > new Date(localStorage.getItem('rande_events_sync_ts') || 0)) {
      localStorage.setItem('researchEvents', JSON.stringify(remoteEventsDoc.items || []));
    } else if (!remoteEventsDoc) {
      await saveDoc('events', localEvents);
    }

    const remotePapersDoc = await fetchDoc('papers');
    if (remotePapersDoc && remotePapersDoc.updatedAt && new Date(remotePapersDoc.updatedAt) > new Date(localStorage.getItem('rande_papers_sync_ts') || 0)) {
      localStorage.setItem('researchPapers', JSON.stringify(remotePapersDoc.items || []));
    } else if (!remotePapersDoc) {
      await saveDoc('papers', localPapers);
    }

    // mark sync timestamps
    localStorage.setItem('rande_notes_sync_ts', new Date().toISOString());
    localStorage.setItem('rande_events_sync_ts', new Date().toISOString());
    localStorage.setItem('rande_papers_sync_ts', new Date().toISOString());
  }

  return {
    get enabled() { return enabled; },
    enable, disable, saveNotes: (n) => saveDoc('notes', n), saveEvents: (e) => saveDoc('events', e), savePapers: (p) => saveDoc('papers', p)
  };
})();


