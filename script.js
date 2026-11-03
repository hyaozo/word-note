const APP_PASSWORD = 'eksdjwkd';
const UNLOCK_KEY = 'wrongAnswerWordsUnlocked';
const NOTES_KEY = 'wrongAnswerWords';
const BACKUP_KEY = 'wrongAnswerWordsBackup';

const $ = id => document.getElementById(id);

const els = {
  passwordScreen: $('passwordScreen'),
  appShell: $('appShell'),
  passwordInput: $('passwordInput'),
  passwordSubmitButton: $('passwordSubmitButton'),
  passwordMessage: $('passwordMessage'),

  wordInput: $('wordInput'),
  meaningInput: $('meaningInput'),
  pronunciationInput: $('pronunciationInput'),
  resetButton: $('resetButton'),
  naverButton: $('naverButton'),
  saveButton: $('saveButton'),
  backToListButton: $('backToListButton'),
  saveBackupButton: $('saveBackupButton'),
  restoreBackupButton: $('restoreBackupButton'),
  fileInput: $('fileInput'),
  bulkToggleButton: $('bulkToggleButton'),
  bulkBox: $('bulkBox'),
  bulkInput: $('bulkInput'),
  bulkPreviewButton: $('bulkPreviewButton'),
  bulkClearButton: $('bulkClearButton'),
  resultWord: $('resultWord'),
  resultPronunciation: $('resultPronunciation'),
  resultMeaning: $('resultMeaning'),
  message: $('message'),
  searchInput: $('searchInput'),
  searchClearButton: $('searchClearButton'),
  statsText: $('statsText'),
  noteList: $('noteList'),

  hideMemorized: $('hideMemorized'),
  sortSelect: $('sortSelect'),
  pageSizeSelect: $('pageSizeSelect'),
  selectAllDelete: $('selectAllDelete'),
  deleteSelectedButton: $('deleteSelectedButton'),
  prevPageButton: $('prevPageButton'),
  nextPageButton: $('nextPageButton'),
  pageInfo: $('pageInfo'),
  paginationWrap: $('paginationWrap'),

  confirmModal: $('confirmModal'),
  modalText: $('modalText'),
  modalCancel: $('modalCancel'),
  modalConfirm: $('modalConfirm'),

  deleteConfirmModal: $('deleteConfirmModal'),
  deleteModalTitle: $('deleteModalTitle'),
  deleteModalText: $('deleteModalText'),
  deleteModalCancel: $('deleteModalCancel'),
  deleteModalConfirm: $('deleteModalConfirm'),

  floatingLockButton: $('floatingLockButton'),
  floatingHideButton: $('floatingHideButton'),
  quizButton: $('quizButton'),

  quizModal: $('quizModal'),
  quizHideMeaningButton: $('quizHideMeaningButton'),
  quizHideWordButton: $('quizHideWordButton'),
  quizStatus: $('quizStatus'),
  quizFrontLabel: $('quizFrontLabel'),
  quizFront: $('quizFront'),
  quizAnswerWrap: $('quizAnswerWrap'),
  quizBackLabel: $('quizBackLabel'),
  quizBack: $('quizBack'),
  quizPronunciation: $('quizPronunciation'),
  quizActionsBefore: $('quizActionsBefore'),
  quizActionsAfter: $('quizActionsAfter'),
  quizRevealButton: $('quizRevealButton'),
  quizDontKnowButton: $('quizDontKnowButton'),
  quizCloseButton: $('quizCloseButton'),
  quizMemorizedButton: $('quizMemorizedButton'),
  quizStudyAgainButton: $('quizStudyAgainButton'),
  quizNextButton: $('quizNextButton'),

  previewModal: $('previewModal'),
  previewNote: $('previewNote'),
  previewTableBody: $('previewTableBody'),
  previewCancelButton: $('previewCancelButton'),
  previewImportButton: $('previewImportButton'),

  updateCheckModal: $('updateCheckModal'),
  updateCheckNote: $('updateCheckNote'),
  updateCheckTableBody: $('updateCheckTableBody'),
  updateCheckCancelButton: $('updateCheckCancelButton'),
  updateCheckAddOnlyButton: $('updateCheckAddOnlyButton'),
  updateCheckApplyButton: $('updateCheckApplyButton')
};

let pendingUpdateWord = null;
let editingId = null;
let pendingDeleteAction = null;
let lastScrollY = 0;
let canReturnToList = false;

let quizPool = [];
let quizCurrent = null;
let quizMode = 'hideMeaning';
let quizAnswerShown = false;
let quizRepeatQueue = [];
let pendingImportRows = [];
let pendingImportSummary = null;

let currentPage = 1;

const POS_MAP = {
  '명': '명', '명사': '명',
  '동': '동', '동사': '동',
  '형': '형', '형용사': '형',
  '부': '부', '부사': '부',
  '접': '접', '접속사': '접',
  '감': '감', '감탄사': '감',
  '숙': '숙', '숙어': '숙'
};

function isUnlocked() {
  return localStorage.getItem(UNLOCK_KEY) === 'true';
}

function getNotes() {
  return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]').map(note => ({
    ...note,
    pronunciation: note.pronunciation || '',
    pos: Array.isArray(note.pos) ? note.pos : [],
    checkedForDelete: Boolean(note.checkedForDelete)
  }));
}

function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function hasBackup() {
  return localStorage.getItem(BACKUP_KEY) !== null;
}

function saveManualBackup() {
  localStorage.setItem(BACKUP_KEY, localStorage.getItem(NOTES_KEY) || '[]');
  showMessage('현재 상태를 백업했습니다.');
}

function restoreBackupNotes() {
  if (!hasBackup()) {
    showMessage('복원할 백업이 없습니다. 먼저 백업 저장을 눌러주세요.');
    return;
  }

  const backup = localStorage.getItem(BACKUP_KEY);
  localStorage.setItem(NOTES_KEY, backup || '[]');
  clearInputs();
  currentPage = 1;
  renderNotes();
  showMessage('백업한 상태로 복원했습니다.');
}

function showFloatingButtons() {
  if (els.floatingHideButton) els.floatingHideButton.style.display = 'block';
  if (els.floatingLockButton) els.floatingLockButton.style.display = 'block';
  if (els.quizButton) els.quizButton.style.display = 'block';
}

function hideFloatingButtons() {
  if (els.floatingHideButton) els.floatingHideButton.style.display = 'none';
  if (els.floatingLockButton) els.floatingLockButton.style.display = 'none';
  if (els.quizButton) els.quizButton.style.display = 'none';
}

function showBackToListButton() {
  if (els.backToListButton) {
    els.backToListButton.classList.add('show');
  }
}

function hideBackToListButton() {
  if (els.backToListButton) {
    els.backToListButton.classList.remove('show');
  }
}

function syncHideMemorizedUI() {
  if (els.hideMemorized && els.floatingHideButton) {
    const isActive = els.hideMemorized.checked;
    els.floatingHideButton.classList.toggle('active', isActive);
    els.floatingHideButton.textContent = isActive ? '풀기' : '숨김';
    els.floatingHideButton.title = isActive ? '외운 단어 숨기기 해제' : '외운 단어 숨기기';
  }
}

function unlockApp() {
  localStorage.setItem(UNLOCK_KEY, 'true');
  els.passwordScreen.classList.add('hidden');
  els.appShell.classList.remove('hidden');
  showFloatingButtons();

  setTimeout(() => {
    updateWordInputFont();
    resetResult();
    syncHideMemorizedUI();
    hideBackToListButton();
    renderNotes();
    els.wordInput.focus();
  }, 0);
}

function lockApp() {
  localStorage.removeItem(UNLOCK_KEY);
  els.appShell.classList.add('hidden');
  els.passwordScreen.classList.remove('hidden');
  hideFloatingButtons();
  hideBackToListButton();
  closeQuizModal();
  canReturnToList = false;
  els.passwordInput.value = '';
  els.passwordMessage.textContent = '잠금이 다시 설정되었습니다.';
  els.passwordInput.focus();
}

function tryUnlock() {
  const value = els.passwordInput.value;
  if (value === APP_PASSWORD) {
    els.passwordMessage.textContent = '';
    unlockApp();
  } else {
    els.passwordMessage.textContent = '비밀번호가 올바르지 않습니다.';
    els.passwordInput.select();
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let messageTimer = null;
function showMessage(text) {
  els.message.textContent = text;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    els.message.textContent = '';
  }, 2200);
}

function resetResult() {
  els.resultWord.textContent = '';
  els.resultPronunciation.textContent = '';
  els.resultMeaning.textContent = '';
}

function clearInputs() {
  els.wordInput.value = '';
  els.meaningInput.value = '';
  els.pronunciationInput.value = '';
  editingId = null;
  updateWordInputFont();
  resetResult();
  hideBackToListButton();
  canReturnToList = false;
}

function setTopFields(word, meaning, pronunciation = '') {
  els.wordInput.value = word || '';
  els.meaningInput.value = meaning || '';
  els.pronunciationInput.value = pronunciation || '';
  updateWordInputFont();
  els.resultWord.textContent = word || '';
  els.resultPronunciation.textContent = pronunciation || '';
  els.resultMeaning.textContent = meaning || '';
}

function isEnglishWord(word) {
  return /^[A-Za-z][A-Za-z\s'-]*$/.test(word);
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizePosList(posText) {
  if (!posText) return [];
  return String(posText)
    .split(',')
    .map(v => v.trim())
    .map(v => POS_MAP[v] || '')
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

function updateWordInputFont() {
  const value = els.wordInput.value.trim();
  if (value && isEnglishWord(value)) {
    els.wordInput.classList.add('is-english');
  } else {
    els.wordInput.classList.remove('is-english');
  }
}

function fetchMeaning(word) {
  const cleanedWord = word.trim().toLowerCase();

  if (!cleanedWord) {
    resetResult();
    return false;
  }

  if (!isEnglishWord(cleanedWord)) {
    els.resultWord.textContent = cleanedWord;
    els.resultPronunciation.textContent = '';
    els.resultMeaning.textContent = '정확한 영어 단어를 입력해주세요.';
    return false;
  }

  els.resultWord.textContent = cleanedWord;

  const notes = getNotes();
  const savedNote = notes.find(item => item.word.toLowerCase() === cleanedWord);

  if (savedNote) {
    els.resultPronunciation.textContent = savedNote.pronunciation || '';
    els.resultMeaning.textContent = savedNote.meaning;

    if (!els.meaningInput.value.trim()) {
      els.meaningInput.value = savedNote.meaning;
    }

    if (!els.pronunciationInput.value.trim() && savedNote.pronunciation) {
      els.pronunciationInput.value = savedNote.pronunciation;
    }

    return true;
  }

  els.resultPronunciation.textContent = '';
  els.resultMeaning.textContent = '저장된 단어가 없습니다.';
  return false;
}

function openNaverDictionary(word) {
  const cleanedWord = word.trim();
  if (!cleanedWord) {
    showMessage('사전으로 찾을 단어를 입력해주세요.');
    return;
  }
  window.open('https://en.dict.naver.com/#/search?query=' + encodeURIComponent(cleanedWord), '_blank');
}

function findNoteIndex(word, notes = getNotes()) {
  return notes.findIndex(item => item.word.toLowerCase() === word.toLowerCase());
}

function createNote({ word, meaning, pronunciation = '', pos = [] }) {
  return {
    id: Date.now() + Math.random(),
    word,
    meaning,
    pronunciation,
    pos,
    checkWord: false,
    checkMeaning: false,
    checkMemorized: false,
    checkedForDelete: false,
    createdAt: Date.now()
  };
}

function sortNotes(notes) {
  const type = els.sortSelect.value;
  if (type === 'alphabet') return [...notes].sort((a, b) => a.word.localeCompare(b.word));
  if (type === 'memorized') return [...notes].sort((a, b) => Number(a.checkMemorized) - Number(b.checkMemorized));
  return [...notes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function getFilteredNotes(sourceNotes = getNotes()) {
  const keyword = els.searchInput.value.trim().toLowerCase();
  const hideChecked = els.hideMemorized.checked;

  let filtered = sourceNotes.filter(note =>
    note.word.toLowerCase().includes(keyword) ||
    note.meaning.toLowerCase().includes(keyword) ||
    String(note.pronunciation || '').toLowerCase().includes(keyword) ||
    note.pos.join(',').toLowerCase().includes(keyword)
  );

  if (hideChecked) filtered = filtered.filter(note => !note.checkMemorized);
  return sortNotes(filtered);
}

function getPageSize() {
  const value = els.pageSizeSelect.value;
  if (value === 'all') return Infinity;
  return Number(value) || 20;
}

function getPagedNotes(filteredNotes) {
  const pageSize = getPageSize();

  if (pageSize === Infinity) {
    return {
      items: filteredNotes,
      totalPages: 1,
      currentPage: 1
    };
  }

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const items = filteredNotes.slice(start, start + pageSize);

  return {
    items,
    totalPages,
    currentPage
  };
}

function updatePagination(totalCount, totalPages) {
  const isAll = getPageSize() === Infinity;
  const noData = totalCount === 0;

  if (isAll || noData) {
    els.paginationWrap.style.display = 'none';
    els.pageInfo.textContent = noData ? '0 / 0' : '1 / 1';
    els.prevPageButton.disabled = true;
    els.nextPageButton.disabled = true;
    return;
  }

  els.paginationWrap.style.display = 'flex';
  els.pageInfo.textContent = `${currentPage} / ${totalPages}`;
  els.prevPageButton.disabled = currentPage <= 1;
  els.nextPageButton.disabled = currentPage >= totalPages;
}

function updateSearchClearButton() {
  els.searchClearButton.classList.toggle('show', !!els.searchInput.value.trim());
}

function updateStats(notes = getNotes()) {
  const hiddenCount = notes.filter(note => note.checkMemorized).length;
  const hideState = els.hideMemorized.checked ? '켜짐' : '꺼짐';
  els.statsText.textContent = `전체 ${notes.length}개 · 숨김 ${hiddenCount}개 · 외운 단어 숨김 ${hideState}`;
}

function syncSelectAllState(notes) {
  const visibleNotes = getPagedNotes(getFilteredNotes(notes)).items;
  els.selectAllDelete.checked = visibleNotes.length > 0 && visibleNotes.every(note => note.checkedForDelete);
}

function renderNotes() {
  const notes = getNotes();
  const filtered = getFilteredNotes(notes);
  const paged = getPagedNotes(filtered);

  els.noteList.innerHTML = '';
  updateStats(notes);
  updateSearchClearButton();
  syncSelectAllState(notes);
  syncHideMemorizedUI();
  updatePagination(filtered.length, paged.totalPages);

  if (!filtered.length) {
    els.noteList.innerHTML = '<div class="empty-text">저장된 오답노트가 없습니다.</div>';
    return;
  }

  paged.items.forEach(note => {
    const posList = note.pos || [];
    const posText = posList.join(' · ');
    const item = document.createElement('div');

    item.className =
      'note-item note-clickable' +
      (note.checkMemorized ? ' memorized' : '') +
      (note.checkedForDelete ? ' selected-delete' : '');

    item.innerHTML = `
      <div class="note-line">
        <div class="delete-check-wrap">
          <input type="checkbox" ${note.checkedForDelete ? 'checked' : ''} data-delete-check="${note.id}">
        </div>

        <div class="word-area" data-load="${note.id}">
          <div class="word-inline">
            <span class="note-word ${note.checkWord ? 'highlight-word' : ''}">${escapeHtml(note.word)}</span>
            <span class="note-pron">${escapeHtml(note.pronunciation || '')}</span>
          </div>
          ${posText ? `<div class="selected-pos-text">${escapeHtml(posText)}</div>` : ''}
        </div>

        <div data-load="${note.id}">
          <span class="note-meaning ${note.checkMeaning ? 'highlight-meaning' : ''}">${escapeHtml(note.meaning)}</span>
        </div>

        <div class="pos-buttons">
          ${createPosButton(note.id, posList, '명', 'active-noun')}
          ${createPosButton(note.id, posList, '동', 'active-verb')}
          ${createPosButton(note.id, posList, '형', 'active-adj')}
          ${createPosButton(note.id, posList, '부', 'active-adv')}
          ${createPosButton(note.id, posList, '접', 'active-conj')}
          ${createPosButton(note.id, posList, '감', 'active-excl')}
          ${createPosButton(note.id, posList, '숙', 'active-phrase')}
        </div>

        <div class="check-row">
          ${createCheckLabel(note.id, 'checkWord', note.checkWord, '단어')}
          ${createCheckLabel(note.id, 'checkMeaning', note.checkMeaning, '뜻')}
          ${createCheckLabel(note.id, 'checkMemorized', note.checkMemorized, '외움')}
        </div>

        <div class="menu-wrap">
          <button class="menu-btn" data-menu-btn="${note.id}" type="button">⋯</button>
          <div class="menu-popup" id="menu-${note.id}">
            <button class="menu-item" data-edit="${note.id}" type="button">수정</button>
            <button class="menu-item" data-delete="${note.id}" type="button">삭제</button>
          </div>
        </div>
      </div>
    `;

    els.noteList.appendChild(item);
  });

  bindNoteEvents();
}

function createPosButton(id, posList, label, activeClass) {
  return `<button class="pos-btn ${posList.includes(label) ? activeClass : ''}" data-pos-id="${id}" data-pos="${label}" type="button">${label}</button>`;
}

function createCheckLabel(id, key, checked, label) {
  return `
    <label class="check-box">
      <input type="checkbox" ${checked ? 'checked' : ''} data-id="${id}" data-key="${key}">
      ${label}
    </label>
  `;
}

function bindNoteEvents() {
  els.noteList.querySelectorAll('input[type="checkbox"]').forEach(box => {
    box.addEventListener('click', e => e.stopPropagation());
  });

  els.noteList.querySelectorAll('[data-delete-check]').forEach(box => {
    box.addEventListener('change', () => toggleDeleteCheck(Number(box.dataset.deleteCheck)));
  });

  els.noteList.querySelectorAll('input[data-id][data-key]').forEach(box => {
    box.addEventListener('change', () => toggleCheck(Number(box.dataset.id), box.dataset.key));
  });

  els.noteList.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteNote(Number(btn.dataset.delete));
    });
  });

  els.noteList.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      startEdit(Number(btn.dataset.edit));
      closeAllMenus();
    });
  });

  els.noteList.querySelectorAll('[data-menu-btn]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const menu = $('menu-' + btn.dataset.menuBtn);
      const isShown = menu.classList.contains('show');
      closeAllMenus();
      if (!isShown) menu.classList.add('show');
    });
  });

  els.noteList.querySelectorAll('[data-pos-id]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      togglePos(Number(btn.dataset.posId), btn.dataset.pos);
    });
  });

  els.noteList.querySelectorAll('[data-load]').forEach(area => {
    area.addEventListener('click', () => loadNoteToTop(Number(area.dataset.load)));
  });
}

function saveCurrentNote(forceUpdate = false) {
  const word = normalizeText(els.wordInput.value);
  const meaning = normalizeText(els.meaningInput.value);
  const pronunciation = normalizeText(els.pronunciationInput.value);

  if (!word) return showMessage('단어를 입력해주세요.');
  if (!meaning) return showMessage('뜻을 입력해주세요.');

  const notes = getNotes();

  if (editingId !== null) {
    const target = notes.find(item => item.id === editingId);
    if (target) {
      target.word = word;
      target.meaning = meaning;
      target.pronunciation = pronunciation;
      saveNotes(notes);
      showMessage('수정되었습니다.');
    }
    clearInputs();
    renderNotes();
    return;
  }

  const existingIndex = findNoteIndex(word, notes);

  if (existingIndex > -1 && !forceUpdate) {
    const oldMeaning = notes[existingIndex].meaning || '';
    const oldPron = notes[existingIndex].pronunciation || '(없음)';
    const newPron = pronunciation || '(없음)';

    els.modalText.textContent =
      '이전에 저장된 내용과 현재 입력한 내용이 다를 수 있습니다.\n\n' +
      '이전 뜻: ' + oldMeaning + '\n' +
      '새 뜻: ' + meaning + '\n\n' +
      '이전 발음: ' + oldPron + '\n' +
      '새 발음: ' + newPron + '\n\n' +
      '수정하시겠습니까?';

    pendingUpdateWord = word;
    els.confirmModal.classList.add('show');
    return;
  }

  if (existingIndex > -1) {
    notes[existingIndex].meaning = meaning;
    notes[existingIndex].pronunciation = pronunciation;
    saveNotes(notes);
    showMessage('기존 단어를 수정했습니다.');
  } else {
    notes.push(createNote({
      word,
      meaning,
      pronunciation,
      pos: []
    }));
    saveNotes(notes);
    showMessage('오답노트에 저장되었습니다.');
  }

  currentPage = 1;
  clearInputs();
  renderNotes();
}

function startEdit(id) {
  const target = getNotes().find(item => item.id === id);
  if (!target) return;
  lastScrollY = window.scrollY;
  canReturnToList = true;
  showBackToListButton();
  editingId = id;
  setTopFields(target.word, target.meaning, target.pronunciation || '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showMessage('수정할 내용을 위 입력칸에서 바꾼 뒤 저장하세요.');
}

function loadNoteToTop(id) {
  const target = getNotes().find(item => item.id === id);
  if (!target) return;
  lastScrollY = window.scrollY;
  canReturnToList = true;
  showBackToListButton();
  editingId = null;
  setTopFields(target.word, target.meaning, target.pronunciation || '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToSavedPosition() {
  if (!canReturnToList) return;
  window.scrollTo({ top: lastScrollY, behavior: 'smooth' });
  hideBackToListButton();
  canReturnToList = false;
}

function toggleCheck(id, key) {
  const notes = getNotes();
  const target = notes.find(item => item.id === id);
  if (!target) return;
  target[key] = !target[key];
  saveNotes(notes);
  renderNotes();
}

function toggleDeleteCheck(id) {
  const notes = getNotes();
  const target = notes.find(item => item.id === id);
  if (!target) return;
  target.checkedForDelete = !target.checkedForDelete;
  saveNotes(notes);
  renderNotes();
}

function togglePos(id, pos) {
  const notes = getNotes();
  const target = notes.find(item => item.id === id);
  if (!target) return;
  target.pos = target.pos || [];
  target.pos = target.pos.includes(pos)
    ? target.pos.filter(item => item !== pos)
    : [...target.pos, pos];
  saveNotes(notes);
  renderNotes();
}

function deleteNote(id) {
  const notes = getNotes();
  const target = notes.find(item => item.id === id);
  if (!target) return;

  pendingDeleteAction = () => {
    saveNotes(notes.filter(item => item.id !== id));
    clearInputs();
    renderNotes();
    showMessage('삭제되었습니다.');
  };

  els.deleteModalTitle.textContent = '삭제 확인';
  els.deleteModalText.textContent = `"${target.word}" 단어를 삭제하시겠습니까?`;
  els.deleteConfirmModal.classList.add('show');
}

function deleteSelectedNotes() {
  const notes = getNotes();
  const selected = notes.filter(note => note.checkedForDelete);

  if (!selected.length) {
    showMessage('삭제할 항목을 먼저 선택해주세요.');
    return;
  }

  pendingDeleteAction = () => {
    saveNotes(notes.filter(note => !note.checkedForDelete));
    els.selectAllDelete.checked = false;
    clearInputs();
    currentPage = 1;
    renderNotes();
    showMessage(`${selected.length}개 항목을 삭제했습니다.`);
  };

  els.deleteModalTitle.textContent = '선택 삭제 확인';
  els.deleteModalText.textContent = `선택한 ${selected.length}개 항목을 삭제하시겠습니까?`;
  els.deleteConfirmModal.classList.add('show');
}

function closeConfirmModal() {
  els.confirmModal.classList.remove('show');
  pendingUpdateWord = null;
}

function closeDeleteConfirm() {
  els.deleteConfirmModal.classList.remove('show');
  pendingDeleteAction = null;
}

function analyzeImportRows(rows) {
  const notes = getNotes();

  const result = {
    addRows: [],
    updateRows: [],
    skipRows: []
  };

  rows.forEach(row => {
    const word = String(row.word || '').trim().toLowerCase();
    const existing = notes.find(note => note.word.toLowerCase() === word);

    if (!existing) {
      result.addRows.push(row);
      return;
    }

    const sameMeaning = normalizeText(existing.meaning) === normalizeText(row.meaning);
    const samePron = normalizeText(existing.pronunciation || '') === normalizeText(row.pronunciation || '');
    const samePos =
      JSON.stringify([...(existing.pos || [])].sort()) ===
      JSON.stringify([...(row.pos || [])].sort());

    if (sameMeaning && samePron && samePos) {
      result.skipRows.push(row);
    } else {
      result.updateRows.push(row);
    }
  });

  return result;
}

function openPreviewModal(rows) {
  const summary = analyzeImportRows(rows);
  pendingImportSummary = summary;
  pendingImportRows = [...summary.addRows, ...summary.updateRows];

  const previewRows = [
    ...summary.addRows.map(row => ({ ...row, _status: '추가' })),
    ...summary.updateRows.map(row => ({ ...row, _status: '수정' }))
  ];

  if (!previewRows.length) {
    showMessage('모든 항목이 기존 내용과 같아서 가져올 내용이 없습니다.');
    return;
  }

  els.previewTableBody.innerHTML = previewRows.map(row => `
    <tr>
      <td>${escapeHtml(row._status)}</td>
      <td>${escapeHtml(row.word || '')}</td>
      <td>${escapeHtml(row.meaning || '')}</td>
      <td>${escapeHtml(row.pronunciation || '')}</td>
      <td>${escapeHtml((row.pos || []).join(', '))}</td>
    </tr>
  `).join('');

  els.previewNote.textContent =
    `추가 ${summary.addRows.length}개, 수정 ${summary.updateRows.length}개, 중복 제외 ${summary.skipRows.length}개`;

  els.previewImportButton.textContent = summary.updateRows.length ? '다음' : '가져오기';
  els.previewModal.classList.add('show');
}

function closePreviewModal() {
  els.previewModal.classList.remove('show');
  pendingImportRows = [];
  pendingImportSummary = null;
  els.previewTableBody.innerHTML = '';
}

function openUpdateCheckModal() {
  if (!pendingImportSummary || !pendingImportSummary.updateRows.length) return;

  const notes = getNotes();

  els.updateCheckTableBody.innerHTML = pendingImportSummary.updateRows.map(row => {
    const existing = notes.find(note => note.word.toLowerCase() === String(row.word || '').toLowerCase());

    const oldMeaning = existing?.meaning || '';
    const newMeaning = row.meaning || '';
    const oldPron = existing?.pronunciation || '';
    const newPron = row.pronunciation || '';
    const oldPos = (existing?.pos || []).join(', ');
    const newPos = (row.pos || []).join(', ');

    return `
      <tr>
        <td>${escapeHtml(row.word || '')}</td>
        <td>${escapeHtml(oldMeaning || '(없음)')}</td>
        <td>${escapeHtml(newMeaning || '(없음)')}</td>
        <td>${escapeHtml(oldPron || '(없음)')}</td>
        <td>${escapeHtml(newPron || '(없음)')}</td>
        <td>${escapeHtml(oldPos || '(없음)')}</td>
        <td>${escapeHtml(newPos || '(없음)')}</td>
      </tr>
    `;
  }).join('');

  els.updateCheckNote.textContent =
    `새 단어 ${pendingImportSummary.addRows.length}개, 수정 ${pendingImportSummary.updateRows.length}개, 중복 제외 ${pendingImportSummary.skipRows.length}개`;

  els.updateCheckModal.classList.add('show');
}

function closeUpdateCheckModal() {
  els.updateCheckModal.classList.remove('show');
  els.updateCheckTableBody.innerHTML = '';
}

function parseLine(line, modeHint = '') {
  const raw = String(line || '').trim();
  if (!raw) return null;

  const makeRow = parts => {
    const word = normalizeText(parts[0] || '');
    const meaning = normalizeText(parts[1] || '');
    const pronunciation = normalizeText(parts[2] || '');
    const pos = normalizePosList(parts[3] || '');
    return word && meaning ? { word, meaning, pronunciation, pos } : null;
  };

  if (modeHint === 'csv') return makeRow(raw.split(',').map(v => v.trim()));
  if (raw.includes('\t')) return makeRow(raw.split('\t').map(v => v.trim()));
  if (raw.includes(':')) return makeRow(raw.split(':').map(v => v.trim()));
  if (raw.includes(' - ')) return makeRow(raw.split(' - ').map(v => v.trim()));
  if (raw.includes(' = ')) return makeRow(raw.split(' = ').map(v => v.trim()));
  return null;
}

function parseImportText(text, fileName = '') {
  const lines = String(text || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  if (!lines.length) return [];

  const isCsv = fileName.toLowerCase().endsWith('.csv');
  const dataLines = isCsv && lines[0].toLowerCase().includes('word') && lines[0].toLowerCase().includes('meaning')
    ? lines.slice(1)
    : lines;

  return dataLines.map(line => parseLine(line, isCsv ? 'csv' : '')).filter(Boolean);
}

function importWordPairs(rows) {
  if (!rows.length) {
    showMessage('가져올 데이터가 없습니다.');
    return;
  }

  const notes = getNotes();
  let added = 0, updated = 0, skipped = 0;

  rows.forEach(({ word, meaning, pronunciation, pos }) => {
    const cleanWord = normalizeText(word);
    const cleanMeaning = normalizeText(meaning);
    const cleanPron = normalizeText(pronunciation);
    const cleanPos = Array.isArray(pos) ? pos : [];

    if (!cleanWord || !cleanMeaning) {
      skipped++;
      return;
    }

    const existingIndex = findNoteIndex(cleanWord, notes);
    if (existingIndex > -1) {
      notes[existingIndex].meaning = cleanMeaning;
      notes[existingIndex].pronunciation = cleanPron;
      notes[existingIndex].pos = cleanPos;
      updated++;
    } else {
      notes.push(createNote({
        word: cleanWord,
        meaning: cleanMeaning,
        pronunciation: cleanPron,
        pos: cleanPos
      }));
      added++;
    }
  });

  saveNotes(notes);
  clearInputs();
  currentPage = 1;
  renderNotes();
  showMessage(`가져오기 완료: 추가 ${added}개, 수정 ${updated}개, 건너뜀 ${skipped}개`);
}

function previewImportText(text, fileName = '') {
  const rows = parseImportText(text, fileName);
  if (!rows.length) {
    showMessage('형식을 읽을 수 없습니다. 예: run: 달리다: 런: 동, 명');
    return;
  }

  openPreviewModal(rows);
}

function closeAllMenus() {
  document.querySelectorAll('.menu-popup').forEach(menu => menu.classList.remove('show'));
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function resetQuizButtons() {
  els.quizActionsBefore.style.display = 'flex';
  els.quizActionsAfter.style.display = 'none';
  els.quizAnswerWrap.classList.remove('show');
  quizAnswerShown = false;
}

function updateQuizModeButtons() {
  els.quizHideMeaningButton.classList.toggle('active', quizMode === 'hideMeaning');
  els.quizHideWordButton.classList.toggle('active', quizMode === 'hideWord');
}

function updateQuizStatus() {
  const remaining = quizPool.length + (quizCurrent ? 1 : 0);
  const repeats = quizRepeatQueue.length;
  els.quizStatus.textContent = `남은 카드 ${remaining}개 · 다시 볼 카드 ${repeats}개`;
}

function renderQuizCard() {
  if (!quizCurrent) {
    els.quizFrontLabel.textContent = '';
    els.quizFront.textContent = '퀴즈가 끝났습니다.';
    els.quizBackLabel.textContent = '';
    els.quizBack.textContent = '';
    els.quizPronunciation.textContent = '';
    els.quizAnswerWrap.classList.remove('show');
    els.quizActionsBefore.style.display = 'none';
    els.quizActionsAfter.style.display = 'none';
    updateQuizStatus();
    return;
  }

  resetQuizButtons();
  updateQuizModeButtons();

  if (quizMode === 'hideMeaning') {
    els.quizFrontLabel.textContent = '단어';
    els.quizFront.textContent = quizCurrent.word;
    els.quizBackLabel.textContent = '뜻';
    els.quizBack.textContent = quizCurrent.meaning;
    els.quizPronunciation.textContent = quizCurrent.pronunciation || '';
  } else {
    els.quizFrontLabel.textContent = '뜻';
    els.quizFront.textContent = quizCurrent.meaning;
    els.quizBackLabel.textContent = '단어';
    els.quizBack.textContent = quizCurrent.word;
    els.quizPronunciation.textContent = quizCurrent.pronunciation || '';
  }

  updateQuizStatus();
}

function getNextQuizCard() {
  if (!quizPool.length && quizRepeatQueue.length) {
    quizPool = shuffleArray(quizRepeatQueue);
    quizRepeatQueue = [];
  }

  quizCurrent = quizPool.shift() || null;
  renderQuizCard();
}

function openQuizModal() {
  const notes = getNotes().filter(note => !note.checkMemorized);

  if (!notes.length) {
    showMessage('퀴즈에 사용할 단어가 없습니다. 외움 체크 안 된 단어를 확인해주세요.');
    return;
  }

  quizPool = shuffleArray(notes);
  quizRepeatQueue = [];
  quizCurrent = null;
  quizMode = 'hideMeaning';
  updateQuizModeButtons();
  els.quizModal.classList.add('show');
  getNextQuizCard();
}

function closeQuizModal() {
  if (els.quizModal) els.quizModal.classList.remove('show');
  quizPool = [];
  quizRepeatQueue = [];
  quizCurrent = null;
  quizAnswerShown = false;
}

function revealQuizAnswer() {
  if (!quizCurrent) return;
  quizAnswerShown = true;
  els.quizAnswerWrap.classList.add('show');
  els.quizActionsBefore.style.display = 'none';
  els.quizActionsAfter.style.display = 'flex';
}

function enqueueCurrentQuiz() {
  if (!quizCurrent) return;
  quizRepeatQueue.push({ ...quizCurrent });
}

function quizDontKnow() {
  if (!quizCurrent) return;
  enqueueCurrentQuiz();
  revealQuizAnswer();
}

function quizStudyAgain() {
  if (!quizCurrent) return;
  enqueueCurrentQuiz();
  getNextQuizCard();
}

function markQuizMemorized() {
  if (!quizCurrent) return;

  const notes = getNotes();
  const target = notes.find(note => note.id === quizCurrent.id);
  if (target) {
    target.checkMemorized = true;
    saveNotes(notes);
    renderNotes();
  }

  getNextQuizCard();
}

function setQuizMode(mode) {
  quizMode = mode;
  updateQuizModeButtons();
  if (quizCurrent) renderQuizCard();
}

els.passwordSubmitButton.addEventListener('click', tryUnlock);

els.passwordInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    tryUnlock();
  }
});

els.resetButton.addEventListener('click', clearInputs);
els.naverButton.addEventListener('click', () => openNaverDictionary(els.wordInput.value));
els.saveButton.addEventListener('click', () => saveCurrentNote());
els.backToListButton.addEventListener('click', backToSavedPosition);
els.saveBackupButton.addEventListener('click', saveManualBackup);
els.restoreBackupButton.addEventListener('click', restoreBackupNotes);
els.bulkToggleButton.addEventListener('click', () => els.bulkBox.classList.toggle('show'));

if (els.floatingLockButton) {
  els.floatingLockButton.addEventListener('click', lockApp);
}

if (els.floatingHideButton) {
  els.floatingHideButton.addEventListener('click', () => {
    els.hideMemorized.checked = !els.hideMemorized.checked;
    currentPage = 1;
    syncHideMemorizedUI();
    renderNotes();
  });
}

if (els.quizButton) {
  els.quizButton.addEventListener('click', openQuizModal);
}

els.bulkPreviewButton.addEventListener('click', () => previewImportText(els.bulkInput.value, 'bulk.txt'));

els.bulkClearButton.addEventListener('click', () => {
  els.bulkInput.value = '';
  els.bulkInput.focus();
});

els.fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    previewImportText(event.target.result, file.name);
    els.fileInput.value = '';
  };
  reader.readAsText(file, 'utf-8');
});

els.previewCancelButton.addEventListener('click', closePreviewModal);

els.previewImportButton.addEventListener('click', () => {
  if (!pendingImportSummary) {
    showMessage('가져올 데이터가 없습니다.');
    closePreviewModal();
    return;
  }

  if (pendingImportSummary.updateRows.length) {
    els.previewModal.classList.remove('show');
    openUpdateCheckModal();
    return;
  }

  const rows = [...pendingImportSummary.addRows];
  closePreviewModal();
  importWordPairs(rows);
});

els.updateCheckCancelButton.addEventListener('click', () => {
  closeUpdateCheckModal();
  closePreviewModal();
  showMessage('가져오기를 취소했습니다.');
});

els.updateCheckAddOnlyButton.addEventListener('click', () => {
  const rows = [...(pendingImportSummary?.addRows || [])];
  closeUpdateCheckModal();
  closePreviewModal();

  if (!rows.length) {
    showMessage('저장할 새 단어가 없습니다.');
    return;
  }

  importWordPairs(rows);
});

els.updateCheckApplyButton.addEventListener('click', () => {
  const rows = [
    ...(pendingImportSummary?.addRows || []),
    ...(pendingImportSummary?.updateRows || [])
  ];

  closeUpdateCheckModal();
  closePreviewModal();

  if (!rows.length) {
    showMessage('저장할 항목이 없습니다.');
    return;
  }

  importWordPairs(rows);
});

els.selectAllDelete.addEventListener('change', () => {
  const visibleIds = getPagedNotes(getFilteredNotes(getNotes())).items.map(item => item.id);
  const notes = getNotes();

  notes.forEach(note => {
    if (visibleIds.includes(note.id)) {
      note.checkedForDelete = els.selectAllDelete.checked;
    }
  });

  saveNotes(notes);
  renderNotes();
});

els.deleteSelectedButton.addEventListener('click', deleteSelectedNotes);

els.wordInput.addEventListener('input', () => {
  updateWordInputFont();
  fetchMeaning(els.wordInput.value);
});

els.wordInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    fetchMeaning(els.wordInput.value);
    els.meaningInput.focus();
  }
});

els.meaningInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    els.pronunciationInput.focus();
  }
});

els.pronunciationInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveCurrentNote();
  }
});

els.searchInput.addEventListener('input', () => {
  currentPage = 1;
  renderNotes();
});

els.searchClearButton.addEventListener('click', () => {
  els.searchInput.value = '';
  currentPage = 1;
  renderNotes();
});

els.sortSelect.addEventListener('change', () => {
  currentPage = 1;
  renderNotes();
});

els.pageSizeSelect.addEventListener('change', () => {
  currentPage = 1;
  renderNotes();
});

if (els.hideMemorized) {
  els.hideMemorized.addEventListener('change', () => {
    currentPage = 1;
    syncHideMemorizedUI();
    renderNotes();
  });
}

els.prevPageButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderNotes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

els.nextPageButton.addEventListener('click', () => {
  const totalPages = getPagedNotes(getFilteredNotes(getNotes())).totalPages;
  if (currentPage < totalPages) {
    currentPage++;
    renderNotes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

els.modalCancel.addEventListener('click', closeConfirmModal);

els.modalConfirm.addEventListener('click', () => {
  if (pendingUpdateWord) saveCurrentNote(true);
  closeConfirmModal();
});

els.deleteModalCancel.addEventListener('click', closeDeleteConfirm);

els.deleteModalConfirm.addEventListener('click', () => {
  if (typeof pendingDeleteAction === 'function') pendingDeleteAction();
  closeDeleteConfirm();
});

els.quizHideMeaningButton.addEventListener('click', () => setQuizMode('hideMeaning'));
els.quizHideWordButton.addEventListener('click', () => setQuizMode('hideWord'));
els.quizRevealButton.addEventListener('click', revealQuizAnswer);
els.quizDontKnowButton.addEventListener('click', quizDontKnow);
els.quizCloseButton.addEventListener('click', closeQuizModal);
els.quizMemorizedButton.addEventListener('click', markQuizMemorized);
els.quizStudyAgainButton.addEventListener('click', quizStudyAgain);
els.quizNextButton.addEventListener('click', getNextQuizCard);

[els.confirmModal, els.deleteConfirmModal, els.quizModal, els.previewModal, els.updateCheckModal].forEach(modal => {
  if (!modal) return;
  modal.addEventListener('click', e => {
    if (e.target !== modal) return;
    if (modal === els.confirmModal) closeConfirmModal();
    if (modal === els.deleteConfirmModal) closeDeleteConfirm();
    if (modal === els.quizModal) closeQuizModal();
    if (modal === els.previewModal) closePreviewModal();
    if (modal === els.updateCheckModal) closeUpdateCheckModal();
  });
});

document.addEventListener('click', closeAllMenus);

window.addEventListener('load', () => {
  syncHideMemorizedUI();

  if (isUnlocked()) {
    unlockApp();
  } else {
    hideFloatingButtons();
    hideBackToListButton();
    els.passwordScreen.classList.remove('hidden');
    els.appShell.classList.add('hidden');
    els.passwordInput.focus();
  }
});

window.lockApp = lockApp;
