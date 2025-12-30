let currentDate = new Date();

// 캘린더 렌더링
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 월 표시
  document.getElementById('current-month').textContent = 
    `${year}년 ${month + 1}월`;

  // 이번 달 첫 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // 이벤트 가져오기
  const events = getEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 캘린더 그리드 생성
  const calendarGrid = document.getElementById('calendar-grid');
  calendarGrid.innerHTML = '';

  // 요일 헤더
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  daysOfWeek.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  // 날짜 셀
  const current = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    const dayNumber = current.getDate();
    const isOtherMonth = current.getMonth() !== month;
    const isToday = current.toDateString() === today.toDateString();
    
    if (isOtherMonth) dayCell.classList.add('other-month');
    if (isToday) dayCell.classList.add('today');

    // 이벤트 확인
    const dateStr = formatDate(current);
    const dayEvents = events.filter(e => e.date === dateStr);
    if (dayEvents.length > 0) {
      dayCell.classList.add('has-event');
    }

    dayCell.innerHTML = `
      <div class="calendar-day-number">${dayNumber}</div>
      ${dayEvents.length > 0 ? `<div class="calendar-day-events">${dayEvents.length}개</div>` : ''}
    `;

    dayCell.onclick = () => {
      if (dayEvents.length > 0) {
        showEventDetails(dayEvents, dateStr);
      }
    };

    calendarGrid.appendChild(dayCell);
    current.setDate(current.getDate() + 1);
  }

  // 사이드바 이벤트 리스트
  renderEventList(events, month);
}

// 이벤트 리스트 렌더링
function renderEventList(events, month) {
  const monthEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.getMonth() === month;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const eventList = document.getElementById('event-list');
  if (monthEvents.length === 0) {
    eventList.innerHTML = '<p style="color: #94a3b8;">이번 달 일정이 없습니다.</p>';
    return;
  }

  eventList.innerHTML = monthEvents.map(event => `
    <div class="event-item" onclick="editEvent(${event.id})">
      <div class="event-date">${new Date(event.date).toLocaleDateString('ko-KR')}</div>
      <div class="event-title">${escapeHtml(event.title)}</div>
    </div>
  `).join('');
}

// 월 변경
function changeMonth(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  renderCalendar();
}

// 오늘로 이동
function goToToday() {
  currentDate = new Date();
  renderCalendar();
}

// 이벤트 추가
document.getElementById('event-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('event-title').value.trim();
  const date = document.getElementById('event-date').value;
  const description = document.getElementById('event-description').value.trim();

  if (!title || !date) {
    alert('제목과 날짜를 입력해주세요.');
    return;
  }

  const events = getEvents();
  const newEvent = {
    id: Date.now(),
    title: title,
    date: date,
    description: description,
    createdAt: new Date().toISOString()
  };

  events.push(newEvent);
  saveEvents(events);

  document.getElementById('event-form').reset();
  renderCalendar();
});

// 이벤트 수정/삭제
function editEvent(eventId) {
  const events = getEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return;

  if (confirm('이 일정을 삭제하시겠습니까?')) {
    const updatedEvents = events.filter(e => e.id !== eventId);
    saveEvents(updatedEvents);
    renderCalendar();
  }
}

// 날짜 포맷팅
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 이벤트 상세 보기
function showEventDetails(events, date) {
  const eventList = events.map(e => `• ${e.title}`).join('\n');
  alert(`${date}\n\n${eventList}`);
}

// 전역 함수
window.changeMonth = changeMonth;
window.goToToday = goToToday;
window.editEvent = editEvent;

// 초기화
document.getElementById('event-date').value = formatDate(new Date());
renderCalendar();

