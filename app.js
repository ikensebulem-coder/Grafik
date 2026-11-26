const API_HOST = '://google.com';
const API_URL = 'https://' + API_HOST + '/macros/s/AKfycbx6nli0VU42FJwE72gfOK4M_Lg0Vd1qftDqaX5WLBa6oUuyEqltuZJYePjubzUAG3XnDg/exec';




const isApkApp = /wv\)|Median|GoNative|WebIntoApp/i.test(navigator.userAgent) || window.location.protocol === 'file:';
const EDITOR_KEY_STORAGE = 'grafik_editor_secret_v2', EXPECTED_SECRET = '8482', CACHE_KEY = 'gas_dual_tables_cache_v66', OFFLINE_SNAPSHOT = null;
let editorSecret = '';
try { editorSecret = localStorage.getItem(EDITOR_KEY_STORAGE) || ''; } catch (e) {}
let isViewOnlyMode = (editorSecret !== EXPECTED_SECRET), isForceReadOnly = false, isEditEnabled = false;
let cachedData = null, activeScroller = null, scrollUnlockTimer = null, scrollRafPending = false, cachedMetrics = null, isSyncing = false;
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function normalizeHeaderKey(headerText) { return String(headerText || '').trim().replace(/\s+/g, ' '); }

function formatClientStamp() {
  const now = new Date(), pad = n => String(n).padStart(2, '0');
  return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function renderLastUpdated(stamp) {
  const dateEl = document.getElementById('lastUpdatedDate'), noteEl = document.getElementById('lastUpdatedNote');
  if (dateEl) dateEl.textContent = stamp ? `Обновлено: ${stamp}` : '';
  if (noteEl) noteEl.textContent = stamp ? 'Друзья, проверьте свои пункты. Изменённые ячейки выделены зелёным цветом.' : '';
}

function updateEditToggleUI() {
  const btn = document.getElementById('editToggleBtn');
  if (!btn) return;
  if (OFFLINE_SNAPSHOT || isForceReadOnly) { btn.style.display = 'none'; return; }
  btn.style.display = 'inline-flex';
  const activeState = !isViewOnlyMode && isEditEnabled;
  btn.setAttribute('aria-checked', activeState ? 'true' : 'false');
  if (activeState) btn.classList.add('active'); else btn.classList.remove('active');
}

function applyEditModeState(enabled) {
  isEditEnabled = enabled;
  updateEditToggleUI();
  if (cachedData) {
    const s1Left = document.getElementById('scroll1').scrollLeft, s2Left = document.getElementById('scroll2').scrollLeft;
    renderTable('table1', cachedData.table1, 1);
    renderTable('table2', cachedData.table2, 2);
    cachedMetrics = null;
    document.getElementById('scroll1').scrollLeft = s1Left;
    document.getElementById('scroll2').scrollLeft = s2Left;
  }
}

function toggleEditMode() {
  if (OFFLINE_SNAPSHOT || isForceReadOnly) return;
  if (isViewOnlyMode) {
    const modal = document.getElementById('secretModal'), input = document.getElementById('secretCodeInput');
    if (modal && input) { input.value = ''; input.placeholder = '****'; modal.style.display = 'flex'; setTimeout(() => input.focus(), 50); }
    return;
  }
  applyEditModeState(!isEditEnabled);
}

function closeSecretModal() { const modal = document.getElementById('secretModal'); if (modal) modal.style.display = 'none'; }

function submitSecretCode() {
  const input = document.getElementById('secretCodeInput'), code = input ? String(input.value || '').trim() : '';
  if (code === EXPECTED_SECRET) {
    editorSecret = code;
    try { localStorage.setItem(EDITOR_KEY_STORAGE, editorSecret); } catch (e) {}
    isViewOnlyMode = false; closeSecretModal(); applyEditModeState(true);
  } else if (input) { input.value = ''; input.placeholder = 'Неверный код'; input.focus(); }
}

function getCurrentWeekLabel(tableIndex) {
  const now = new Date(), day = now.getDay(), diffToMonday = day === 0 ? -6 : 1 - day;
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  if (tableIndex === 2) targetDate.setDate(targetDate.getDate() + 6);
  return `${targetDate.getDate()} ${MONTHS_RU.at(targetDate.getMonth())}`;
}

function renderTable(tableId, rows, tableIndex) {
  const table = document.getElementById(tableId);
  table.innerHTML = '';
  if (!rows || !rows.length) return -1;
  const currentWeekLabel = getCurrentWeekLabel(tableIndex);
  let activeCol = -1;
  const recentEdits = (cachedData && cachedData.recentEdits) ? cachedData.recentEdits : {};
  const canEdit = !isViewOnlyMode && !isForceReadOnly && !OFFLINE_SNAPSHOT && isEditEnabled;
  const headerRow = rows.at(0) || [], nowMs = Date.now(), mappedRows = rows.map((row, idx) => ({ row, origIdx: idx }));
  if (tableIndex === 1) {
    for (let i = 0; i < mappedRows.length - 1; i++) {
      const currLabel = String(mappedRows[i].row.at(0) || '').trim().toLowerCase(), nextLabel = String(mappedRows[i + 1].row.at(0) || '').trim().toLowerCase();
      if ((currLabel.startsWith('расп') && nextLabel.startsWith('закл')) || (currLabel.startsWith('закл') && nextLabel.startsWith('расп'))) {
        const temp = mappedRows[i]; mappedRows[i] = mappedRows[i + 1]; mappedRows[i + 1] = temp; i++;
      }
    }
  }
  mappedRows.forEach(({ row, origIdx }, visualIdx) => {
    const tr = document.createElement('tr');
    const isSpacer = (tableIndex === 1 && origIdx === 15), isSubHeader = (tableIndex === 1 && origIdx === 16);
    const rowLabel = String(row.at(0) || '').trim();
    const isTemaRow = (tableIndex === 2 && (origIdx === 2 || rowLabel.toLowerCase().includes('тема')));
    if (isSpacer) tr.classList.add('spacer-row');
    if (isSubHeader) tr.classList.add('sub-header-row');
    const isTask3to7 = /^(?:№\s*)?[3-7](?:\D|$)/.test(rowLabel) || (origIdx >= 4 && origIdx <= 8);
    if (tableIndex === 1 && origIdx > 0 && origIdx < 15 && isTask3to7) tr.classList.add('beige-row');
    row.forEach((cellVal, cIdx) => {
      const cell = document.createElement(visualIdx === 0 ? 'th' : 'td');
      const formattedVal = ((visualIdx === 0 || isSubHeader) && cIdx > 0) ? String(cellVal).replace(/\s*воскресенье/i, '\nвоскресенье') : cellVal;
      if (visualIdx === 0 && cIdx > 0 && String(cellVal).includes(currentWeekLabel)) activeCol = cIdx;
      if (visualIdx > 0 && cIdx > 0 && !isSpacer && !isSubHeader) {
        const hKey = normalizeHeaderKey(headerRow.at(cIdx)), exp = recentEdits[`${tableIndex}_${origIdx}_${hKey}`];
        if (exp && exp > nowMs) cell.classList.add('edited-cell');
      }
      if (isTemaRow && cIdx > 0) {
        cell.classList.add('tema-cell');
        const editor = document.createElement('div');
        editor.className = 'tema-editor'; editor.textContent = cellVal;
        if (canEdit) {
          editor.contentEditable = 'true';
          editor.addEventListener('blur', () => { if (editor.textContent !== cellVal) saveCell(tableIndex, origIdx, cIdx, editor.textContent, cell); });
        }
        cell.appendChild(editor);
      } else {
        cell.textContent = isSpacer ? '' : formattedVal;
        if (canEdit && origIdx > 0 && !isSpacer && !isSubHeader) {
          cell.contentEditable = 'true';
          cell.addEventListener('blur', () => { if (cell.textContent !== cellVal) saveCell(tableIndex, origIdx, cIdx, cell.textContent, cell); });
        }
      }
      tr.appendChild(cell);
    });
    table.appendChild(tr);
  });
  return activeCol;
}
function getTableMetrics() {
  if (cachedMetrics) return cachedMetrics;
  const t1 = document.getElementById('table1'), t2 = document.getElementById('table2');
  if (!t1 || !t2) return null;
  const h1 = Array.from(t1.querySelectorAll('tr:first-child th')), h2 = Array.from(t2.querySelectorAll('tr:first-child th'));
  if (h1.length < 2 || h2.length < 2) return null;
  cachedMetrics = {
    s1: { stickyW: h1.at(0).offsetWidth, cols: h1.map(th => ({ left: th.offsetLeft, width: th.offsetWidth })) },
    s2: { stickyW: h2.at(0).offsetWidth, cols: h2.map(th => ({ left: th.offsetLeft, width: th.offsetWidth })) }
  };
  return cachedMetrics;
}

function scrollToWeekColumn(scrollId, tableId, colIndex) {
  if (colIndex <= 0) return;
  const container = document.getElementById(scrollId), table = document.getElementById(tableId);
  const headers = table.querySelectorAll('tr:first-child th'), stickyWidth = headers.length > 0 ? headers.item(0).offsetWidth : 82, targetTh = headers.item(colIndex);
  if (targetTh) container.scrollLeft = Math.max(0, targetTh.offsetLeft - stickyWidth);
}

function syncSmartScroll(sourceScroll, sourceKey, targetScroll, targetKey) {
  const metrics = getTableMetrics();
  if (!metrics) return;
  const src = metrics[sourceKey], tgt = metrics[targetKey], sCols = src.cols, tCols = tgt.cols;
  if (sourceScroll.scrollLeft <= 1) { targetScroll.scrollLeft = 0; return; }
  const viewStart = sourceScroll.scrollLeft + src.stickyW;
  let colIdx = 1, fraction = 0;
  for (let i = 1; i < sCols.length; i++) {
    const colLeft = sCols.at(i).left, colWidth = sCols.at(i).width;
    if (viewStart >= colLeft && viewStart < colLeft + colWidth) { colIdx = i; fraction = colWidth > 0 ? (viewStart - colLeft) / colWidth : 0; break; }
    if (i === sCols.length - 1 && viewStart >= colLeft + colWidth) { colIdx = i; fraction = 1; }
  }
  const targetCol = tCols.at(Math.min(colIdx, tCols.length - 1));
  if (targetCol) targetScroll.scrollLeft = Math.max(0, targetCol.left + fraction * targetCol.width - tgt.stickyW);
}

function initScrollSync() {
  const s1 = document.getElementById('scroll1'), s2 = document.getElementById('scroll2');
  if (!s1 || !s2) return;
  window.addEventListener('resize', () => { cachedMetrics = null; }, { passive: true });
  function handleScroll(sourceId, sourceEl, targetEl, targetId) {
    if (activeScroller && activeScroller !== sourceId) return;
    activeScroller = sourceId;
    if (!scrollRafPending) { scrollRafPending = true; requestAnimationFrame(() => { syncSmartScroll(sourceEl, sourceId, targetEl, targetId); scrollRafPending = false; }); }
    clearTimeout(scrollUnlockTimer);
    scrollUnlockTimer = setTimeout(() => { activeScroller = null; }, 90);
  }
  s1.addEventListener('scroll', () => handleScroll('s1', s1, s2, 's2'), { passive: true });
  s2.addEventListener('scroll', () => handleScroll('s2', s2, s1, 's1'), { passive: true });
  s1.addEventListener('touchstart', () => { activeScroller = 's1'; }, { passive: true });
  s2.addEventListener('touchstart', () => { activeScroller = 's2'; }, { passive: true });
}

function saveCell(tableIndex, rowIndex, colIndex, value, cellElement) {
  if (isViewOnlyMode || isForceReadOnly || OFFLINE_SNAPSHOT || !isEditEnabled) return;
  const status = document.getElementById('syncStatus');
  status.textContent = 'Сохранение...';
  const localStamp = formatClientStamp();
  if (cellElement) cellElement.classList.add('edited-cell');
  if (cachedData) {
    const targetTable = tableIndex === 1 ? cachedData.table1 : cachedData.table2;
    if (targetTable && targetTable.at(rowIndex)) {
      targetTable.at(rowIndex).splice(colIndex, 1, value);
      cachedData.lastUpdated = localStamp;
      const hKey = normalizeHeaderKey((targetTable.at(0) || []).at(colIndex));
      if (!cachedData.recentEdits) cachedData.recentEdits = {};
      cachedData.recentEdits[`${tableIndex}_${rowIndex}_${hKey}`] = Date.now() + 14 * 24 * 60 * 60 * 1000;
      renderLastUpdated(localStamp);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData)); } catch (e) {}
    }
  }
  const onSaved = res => {
    const finalStamp = (res && res.stamp) ? res.stamp : localStamp;
    renderLastUpdated(finalStamp);
    if (cachedData) { cachedData.lastUpdated = finalStamp; if (res && res.recentEdits) cachedData.recentEdits = res.recentEdits; try { localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData)); } catch (e) {} }
    status.textContent = 'Сохранено';
    setTimeout(() => { if (status.textContent === 'Сохранено') status.textContent = ''; }, 1500);
  };
  const onError = () => { status.textContent = 'Нет сети'; setTimeout(() => { if (status.textContent === 'Нет сети') status.textContent = ''; }, 2500); };
  fetch(API_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateCell', secret: editorSecret, tableIndex: tableIndex, rowIndex: rowIndex, colIndex: colIndex, value: value }) }).then(() => onSaved(null)).catch(onError);
}

function applyData(data, preserveScroll) {
  const s1Left = preserveScroll ? document.getElementById('scroll1').scrollLeft : 0, s2Left = preserveScroll ? document.getElementById('scroll2').scrollLeft : 0;
  cachedData = data;
  renderLastUpdated(data.lastUpdated || '');
  const col1 = renderTable('table1', data.table1, 1), col2 = renderTable('table2', data.table2, 2);
  cachedMetrics = null;
  setTimeout(() => {
    if (preserveScroll) { document.getElementById('scroll1').scrollLeft = s1Left; document.getElementById('scroll2').scrollLeft = s2Left; }
    else { scrollToWeekColumn('scroll1', 'table1', col1); scrollToWeekColumn('scroll2', 'table2', col2); }
    getTableMetrics();
  }, 50);
  const dlBtn = document.getElementById('downloadOfflineBtn');
  if (dlBtn) { if (OFFLINE_SNAPSHOT || isApkApp) dlBtn.style.display = 'none'; else dlBtn.style.display = 'inline-block'; }
}

function openDownloadModal() { if (cachedData) document.getElementById('confirmModal').style.display = 'flex'; }
function closeDownloadModal() { document.getElementById('confirmModal').style.display = 'none'; }
function confirmAndDownload() { closeDownloadModal(); downloadOfflineFile(); }

function downloadOfflineFile() {
  if (!cachedData) return;
  const now = new Date(), pad = n => String(n).padStart(2, '0');
  const stamp = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const snapshotPayload = JSON.stringify({ savedAt: stamp, data: cachedData }).replace(/<\/script>/gi, '<\\/script>');
  const cloneDoc = document.documentElement.cloneNode(true);
  const cloneHint = cloneDoc.querySelector('#viewerHint'); if (cloneHint) cloneHint.style.display = 'block';
  const cloneEditBtn = cloneDoc.querySelector('#editToggleBtn'); if (cloneEditBtn) cloneEditBtn.style.display = 'none';
  const cloneModal = cloneDoc.querySelector('#confirmModal'); if (cloneModal) cloneModal.style.display = 'none';
  const cloneSecretModal = cloneDoc.querySelector('#secretModal'); if (cloneSecretModal) cloneSecretModal.style.display = 'none';
  let html = '<!DOCTYPE html>\n' + cloneDoc.outerHTML;
  html = html.replace('const OFFLINE_SNAPSHOT = null;', `const OFFLINE_SNAPSHOT = ${snapshotPayload};`);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `График_${pad(now.getDate())}-${pad(now.getMonth() + 1)}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function syncWithServer(hasLocalCache, preserveScroll) {
  if (isSyncing || OFFLINE_SNAPSHOT) return;
  isSyncing = true;
  const status = document.getElementById('syncStatus');
  status.textContent = 'Синхронизация...';
  const onLoaded = data => { isSyncing = false; try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {} applyData(data, preserveScroll); status.textContent = ''; };
  const onLoadError = () => {
    isSyncing = false;
    if (hasLocalCache) { status.textContent = 'Офлайн-режим'; setTimeout(() => { if (status.textContent === 'Офлайн-режим') status.textContent = ''; }, 2500); }
    else { status.textContent = 'Нет сети'; }
  };
  fetch(`${API_URL}?api=1&t=${Date.now()}`, { redirect: 'follow' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(onLoaded).catch(onLoadError);
}

function loadTables() {
  const hint = document.getElementById('viewerHint'); if (hint) hint.style.display = 'none';
  updateEditToggleUI();
  let hasLocalCache = false;
  try { const raw = localStorage.getItem(CACHE_KEY); if (raw) { applyData(JSON.parse(raw), false); hasLocalCache = true; } } catch (e) {}
  syncWithServer(hasLocalCache, hasLocalCache);
  window.addEventListener('online', () => { syncWithServer(!!cachedData, true); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && navigator.onLine) syncWithServer(!!cachedData, true); });
}

function bootApp() {
  if (isApkApp) document.body.classList.add('apk-mode');
  initScrollSync();
  const input = document.getElementById('secretCodeInput');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') submitSecretCode(); });
  loadTables();
}

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootApp); else bootApp();
