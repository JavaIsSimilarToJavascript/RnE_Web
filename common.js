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
  localStorage.setItem('researchNotes', JSON.stringify(notes));
}

// 일정 관련
function getEvents() {
  return JSON.parse(localStorage.getItem('researchEvents') || '[]');
}

function saveEvents(events) {
  localStorage.setItem('researchEvents', JSON.stringify(events));
}

// 논문 관련
function getPapers() {
  return JSON.parse(localStorage.getItem('researchPapers') || '[]');
}

function savePapers(papers) {
  localStorage.setItem('researchPapers', JSON.stringify(papers));
}

