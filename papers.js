// 논문 목록 렌더링
function renderPapers() {
  const papers = getPapers();

  if (papers.length === 0) {
    document.getElementById('papers-list').innerHTML = `
      <div class="card">
        <div class="empty-state">
          <p>등록된 논문이 없습니다.</p>
        </div>
      </div>
    `;
    return;
  }

  // 최신순 정렬
  papers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const papersHTML = papers.map(paper => `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${escapeHtml(paper.title)}</h3>
          ${paper.authors ? `<p style="color: #64748b; margin-top: 0.25rem; font-size: 0.9rem;">${escapeHtml(paper.authors)}</p>` : ''}
          ${paper.year || paper.journal ? `
            <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem;">
              ${paper.year ? paper.year + '년' : ''} ${paper.journal ? (paper.year ? ' • ' : '') + paper.journal : ''}
            </p>
          ` : ''}
        </div>
        <div>
          ${paper.fileData ? `
            <button class="btn btn-primary" onclick="downloadPaper(${paper.id})">다운로드</button>
          ` : ''}
          ${paper.url ? `
            <a href="${escapeHtml(paper.url)}" target="_blank" class="btn btn-secondary">링크 열기</a>
          ` : ''}
          <button class="btn btn-danger" onclick="deletePaper(${paper.id})">삭제</button>
        </div>
      </div>
      ${paper.description ? `
        <div class="form-group">
          <p style="white-space: pre-wrap; color: #64748b;">${escapeHtml(paper.description)}</p>
        </div>
      ` : ''}
      <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 1rem;">
        등록일: ${new Date(paper.createdAt).toLocaleDateString('ko-KR')}
      </div>
    </div>
  `).join('');

  document.getElementById('papers-list').innerHTML = papersHTML;
}

// 논문 추가
document.getElementById('paper-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('paper-title').value.trim();
  if (!title) {
    alert('논문 제목을 입력해주세요.');
    return;
  }

  const fileInput = document.getElementById('paper-file');
  const url = document.getElementById('paper-url').value.trim();
  
  if (!fileInput.files[0] && !url) {
    if (!confirm('파일이나 URL이 없습니다. 그래도 추가하시겠습니까?')) {
      return;
    }
  }

  let fileData = null;
  if (fileInput.files[0]) {
    const file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }
    
    // 파일을 Base64로 변환
    fileData = await fileToBase64(file);
  }

  const papers = getPapers();
  const newPaper = {
    id: Date.now(),
    title: title,
    authors: document.getElementById('paper-authors').value.trim() || null,
    year: document.getElementById('paper-year').value ? parseInt(document.getElementById('paper-year').value) : null,
    journal: document.getElementById('paper-journal').value.trim() || null,
    description: document.getElementById('paper-description').value.trim() || null,
    fileData: fileData,
    fileName: fileInput.files[0] ? fileInput.files[0].name : null,
    url: url || null,
    createdAt: new Date().toISOString()
  };

  papers.push(newPaper);
  savePapers(papers);

  document.getElementById('paper-form').reset();
  renderPapers();
});

// 논문 다운로드
function downloadPaper(paperId) {
  const papers = getPapers();
  const paper = papers.find(p => p.id === paperId);
  if (!paper || !paper.fileData) return;

  // Base64를 Blob으로 변환
  const byteCharacters = atob(paper.fileData.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });

  // 다운로드
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = paper.fileName || `${paper.title}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 논문 삭제
function deletePaper(paperId) {
  if (!confirm('정말 이 논문을 삭제하시겠습니까?')) return;

  const papers = getPapers();
  const updatedPapers = papers.filter(p => p.id !== paperId);
  savePapers(updatedPapers);
  renderPapers();
}

// 파일을 Base64로 변환
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 전역 함수
window.downloadPaper = downloadPaper;
window.deletePaper = deletePaper;

// 초기화
renderPapers();

