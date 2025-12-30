let currentUser = null;
let editingNoteId = null;

// 사용자 선택
document.getElementById('user-select').addEventListener('change', (e) => {
  const userId = e.target.value;
  if (userId) {
    currentUser = {
      id: parseInt(userId),
      name: e.target.options[e.target.selectedIndex].text
    };
    renderNotes();
    showNotesList();
  } else {
    currentUser = null;
    document.getElementById('notes-list-container').innerHTML = `
      <div class="card">
        <div class="empty-state">
          <p>연구원을 선택하면 노트를 작성할 수 있습니다.</p>
        </div>
      </div>
    `;
  }
});

// 노트 목록 렌더링
function renderNotes() {
  if (!currentUser) return;

  const notes = getNotes();
  const userNotes = notes.filter(note => note.userId === currentUser.id);

  if (userNotes.length === 0) {
    document.getElementById('notes-list-container').innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${currentUser.name}의 연구 노트</h3>
          <button class="btn btn-primary" onclick="startNewNote()">새 노트 작성</button>
        </div>
        <div class="empty-state">
          <p>작성된 연구 노트가 없습니다.</p>
        </div>
      </div>
    `;
    return;
  }

  // 최신순 정렬
  userNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const notesHTML = userNotes.map(note => `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(note.week)}주차 연구노트</h3>
        <div>
          <button class="btn btn-secondary" onclick="editNote(${note.id})">수정</button>
          <button class="btn btn-danger" onclick="deleteNote(${note.id})">삭제</button>
        </div>
      </div>
      <div class="form-group">
        <label>연구 내용</label>
        <p style="white-space: pre-wrap; color: #64748b;">${escapeHtml(note.researchContent || '내용 없음')}</p>
      </div>
      <div class="form-group">
        <label>결과 및 성과</label>
        <p style="white-space: pre-wrap; color: #64748b;">${escapeHtml(note.results || '내용 없음')}</p>
      </div>
      <div class="form-group">
        <label>다음 주 계획</label>
        <p style="white-space: pre-wrap; color: #64748b;">${escapeHtml(note.nextPlan || '내용 없음')}</p>
      </div>
      <div style="font-size: 0.9rem; color: #94a3b8; margin-top: 1rem;">
        작성일: ${new Date(note.createdAt).toLocaleDateString('ko-KR')}
        ${note.updatedAt !== note.createdAt ? ` | 수정일: ${new Date(note.updatedAt).toLocaleDateString('ko-KR')}` : ''}
      </div>
    </div>
  `).join('');

  document.getElementById('notes-list-container').innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${currentUser.name}의 연구 노트 (${userNotes.length}개)</h3>
        <button class="btn btn-primary" onclick="startNewNote()">새 노트 작성</button>
      </div>
    </div>
    ${notesHTML}
  `;
}

// 새 노트 작성 시작
function startNewNote() {
  if (!currentUser) {
    alert('연구원을 먼저 선택해주세요.');
    return;
  }
  editingNoteId = null;
  document.getElementById('form-title').textContent = '새 연구 노트 작성';
  document.getElementById('note-form').reset();
  showNoteForm();
}

// 노트 수정 시작
function editNote(noteId) {
  const notes = getNotes();
  const note = notes.find(n => n.id === noteId);
  if (!note) return;

  editingNoteId = noteId;
  document.getElementById('form-title').textContent = '연구 노트 수정';
  document.getElementById('week').value = note.week || '';
  document.getElementById('research-content').value = note.researchContent || '';
  document.getElementById('results').value = note.results || '';
  document.getElementById('next-plan').value = note.nextPlan || '';
  showNoteForm();
}

// 노트 삭제
function deleteNote(noteId) {
  if (!confirm('정말 이 연구 노트를 삭제하시겠습니까?')) return;

  const notes = getNotes();
  const updatedNotes = notes.filter(note => note.id !== noteId);
  saveNotes(updatedNotes);
  renderNotes();
}

// 노트 저장
document.getElementById('note-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    alert('연구원을 먼저 선택해주세요.');
    return;
  }

  const week = document.getElementById('week').value.trim();
  if (!week) {
    alert('주차를 입력해주세요.');
    return;
  }

  const notes = getNotes();
  const noteData = {
    week: week,
    researchContent: document.getElementById('research-content').value.trim(),
    results: document.getElementById('results').value.trim(),
    nextPlan: document.getElementById('next-plan').value.trim()
  };

  if (editingNoteId) {
    // 수정
    const updatedNotes = notes.map(note =>
      note.id === editingNoteId
        ? { ...note, ...noteData, updatedAt: new Date().toISOString() }
        : note
    );
    saveNotes(updatedNotes);
  } else {
    // 새로 작성
    const newNote = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      ...noteData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    notes.push(newNote);
    saveNotes(notes);
  }

  cancelEdit();
  renderNotes();
});

// 취소
function cancelEdit() {
  editingNoteId = null;
  document.getElementById('note-form').reset();
  showNotesList();
}

// 폼 보이기/숨기기
function showNoteForm() {
  document.getElementById('notes-list-container').classList.add('hidden');
  document.getElementById('note-form-container').classList.remove('hidden');
  document.getElementById('week').focus();
}

function showNotesList() {
  document.getElementById('notes-list-container').classList.remove('hidden');
  document.getElementById('note-form-container').classList.add('hidden');
}

// 전역 함수
window.startNewNote = startNewNote;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.cancelEdit = cancelEdit;

// Re-render when remote updates arrive
window.addEventListener('rande:updated', (e) => {
  if (e.detail && e.detail.type === 'notes') {
    renderNotes();
  }
});

