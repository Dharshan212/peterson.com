// MYELIN Web: OPEN DB FILE / DATABASE EXPLORER / REMOVE FILE.
// Opens ONE local MYELIN .db snapshot chosen by the user, reads it inside a Web Worker (SQLite/WebAssembly, see db-import/), and shows its actual tables and rows
// page by page. Everything shown comes from the selected file; nothing is generated, uploaded or stored. The reader module is loaded only when a file is opened,
// so the normal website never fetches the SQLite engine. Values are always written with textContent (never as HTML).
import {el, button} from './dom.js';

const PAGE_SIZES = [25, 50, 100, 250];
const WAL_NOTICE = 'This file is flagged as WAL-mode. A single .db file may not include transactions that were still in its -wal file, so the records shown may be incomplete.';
const ROW_KEY_LABEL = {ROWID: 'ordered by the table row id (rowid)', WITHOUT_ROWID_KEY: 'ordered by the table primary key'};
const NOT_BROWSABLE = {NO_UNIQUE_ROW_KEY: 'This table has no unique row key, so its rows cannot be shown in a reliable order in this version. Its structure and record count are shown.',
  TOO_MANY_COLUMNS: 'This table has too many columns to be shown in this version. Its structure and record count are shown.',
  TABLE_NOT_READABLE: 'This table cannot be read safely in this version (for example, an unusual name). It is listed so nothing is hidden.',
  DETAIL_NOT_LOADED_YET: 'Loading this table’s details.'};
const STATE_TEXT = {
  SUPPORTED_9: ['ok', 'MYELIN database, schema version 9 (supported).'],
  UNSUPPORTED_VERSION: ['warn', 'Unsupported MYELIN schema version. This site supports version 9. The raw tables below can still be inspected; validated dashboards are not available for this file.'],
  LEGACY_UNVERSIONED: ['warn', 'Older MYELIN database without a recorded schema version. The raw tables below can still be inspected; validated dashboards are not available for this file.'],
  NOT_MYELIN: ['warn', 'This is a SQLite database, but it does not look like a MYELIN database. Its raw tables can still be inspected.']
};
const bytesText = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MiB' : n >= 1024 ? (n / 1024).toFixed(1) + ' KiB' : n + ' bytes');
const num = (n) => Number(n).toLocaleString('en-US');

export function mountDbExplorer({openModal, closeModal, toast, source: src}) {
  let reader = null, file = null, inv = null, host = null, navRow = null, token = 0;       // mirrors of the shared imported source (src), refreshed by sync()
  const sync = () => { reader = src.reader; file = src.file; inv = src.inventory; };
  let tv = null;                                   // current table view: {rec, offset, size, total, result, busy}

  const alive = () => host && host.isConnected;
  const show = (...nodes) => { if (alive()) host.replaceChildren(...nodes); };
  const ensureHost = () => { if (!alive()) { host = el('div', {class: 'dbx'}); openModal('Database Explorer', host); document.querySelector('.wl-modal .glass-panel')?.classList.add('dbx-panel'); } };

  // ---- file choice and loading ---------------------------------------------------------------------------------------------------------------
  function pick() {
    const input = el('input', {type: 'file', accept: '.db,.sqlite,.sqlite3,application/vnd.sqlite3,application/x-sqlite3', hidden: ''});
    input.addEventListener('change', () => { const f = input.files && input.files[0]; input.remove(); if (f) load(f); });
    document.body.append(input); input.click();
  }
  async function load(f) {
    tv = null; token++;
    navRow?.remove(); navRow = null;
    ensureHost();
    show(el('p', {class: 'dbx-busy', role: 'status'}, 'Reading ' + f.name + ' ...'));
    const res = await src.open(f);                                  // the shared source owns the reader, the checks and the inventory
    sync();
    if (!alive()) return;
    if (!res.ok) { if (!res.superseded) fail(res.message); return; }
    addNavRow();
    showTables();
  }
  function fail(message) {
    show(el('div', {class: 'dbx-source dbx-bad', role: 'alert'}, el('strong', {}, 'This file was not opened.'), el('p', {}, message), el('p', {class: 'dbx-hint'}, 'Nothing was uploaded or stored.')),
      button('CHOOSE ANOTHER FILE', pick), button('CLOSE', closeModal));
  }
  async function remove() {
    await src.remove(); sync(); tv = null; token++;
    navRow?.remove(); navRow = null;
    closeModal();
    toast('Database file removed. MYELIN is back to its normal browser simulation.');
  }
  function addNavRow() {
    navRow?.remove();
    navRow = el('button', {type: 'button', class: 'nav-row wl-foot-row', id: 'navDbFile', on: {click: () => { document.body.classList.remove('sidebar-open'); reopen(); }}},
      el('span', {class: 'nav-row-icon'}), el('span', {class: 'nav-row-label'}, 'Database file (local)'));
    navRow.firstChild.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>';
    document.querySelector('.sidebar-foot')?.prepend(navRow);
  }
  function reopen() { ensureHost(); if (tv) showTable(); else showTables(); }

  // ---- source / status banner ------------------------------------------------------------------------------------------------------------------
  function sourceBanner() {
    const [tone, base] = STATE_TEXT[inv.schema.state] || ['warn', 'Unknown schema state.'];
    const v = inv.schema.version, found = inv.schema.state === 'UNSUPPORTED_VERSION' ? (v && v.rows > 1 ? ' The file records more than one schema version.' : v && v.text !== undefined ? ' Version recorded in this file: "' + v.text + '".' : '') : '';
    const text = base + found;
    return el('div', {class: 'dbx-source'},
      el('div', {class: 'dbx-source-head'}, el('span', {class: 'dbx-tag'}, 'LOCAL FILE SNAPSHOT'), el('strong', {class: 'dbx-file'}, file.name), el('span', {class: 'dbx-muted'}, bytesText(file.size))),
      el('p', {class: 'dbx-hint'}, 'Read in this browser only. Nothing is uploaded or stored, and the original file is not changed. This is a snapshot taken when the file was selected, not a live connection.'),
      inv.file.walFlagged ? el('p', {class: 'dbx-state dbx-warn', role: 'note'}, WAL_NOTICE) : '',
      el('p', {class: 'dbx-state dbx-' + tone, role: 'status'}, 'Structural check passed. ' + text),
      el('p', {class: 'dbx-hint'}, 'These are raw recorded values. A value shown in a table is not validated MYELIN evidence.'),
      el('div', {class: 'dbx-actions'}, button('REMOVE FILE', remove, {id: 'dbxRemove'}), button('CLOSE', closeModal)));
  }

  // ---- tables ----------------------------------------------------------------------------------------------------------------------------------
  function countText(c) { return c.status === 'EXACT' ? num(c.value) : 'count unavailable'; }
  function showTables() {
    tv = null;
    const s = inv.summary;
    const rows = inv.tables.map((t) => {
      const open = t.access.status === 'READABLE' || t.access.status === 'PENDING';
      const tag = t.myelin.expectedInSchema9 ? 'MYELIN table' : t.kind === 'system' ? 'SQLite system table' : 'other table';
      return el('tr', {class: 'dbx-row'},
        el('td', {class: 'dbx-name'}, t.nameEscaped), el('td', {}, tag), el('td', {class: 'dbx-num'}, countText(t.count)),
        el('td', {class: 'dbx-num'}, t.columns ? String(t.columns.filter((c) => c.hidden !== 1).length) : '-'),
        el('td', {}, open ? button('OPEN', () => openTable(t.id), {'aria-label': 'Open table ' + t.nameEscaped}) : el('span', {class: 'dbx-muted'}, 'not readable')));
    });
    const other = [['views', inv.views], ['triggers', inv.triggers], ['indexes', inv.indexes], ['virtual tables', inv.virtualTables]].filter(([, l]) => l.length);
    show(sourceBanner(),
      el('h3', {class: 'dbx-h'}, 'Tables (' + s.tables + ')'),
      s.listTruncated ? el('p', {class: 'dbx-state dbx-warn'}, 'This file has ' + num(s.schemaObjectsInFile) + ' schema objects; only the first ' + num(s.listed) + ' are listed.') : '',
      el('div', {class: 'wl-table-wrap dbx-wrap'}, el('table', {class: 'mn-table dbx-table'},
        el('thead', {}, el('tr', {}, ['Table', 'Kind', 'Records', 'Columns', ''].map((h) => el('th', {}, h)))), el('tbody', {}, rows))),
      other.length ? el('details', {class: 'dbx-other'}, el('summary', {}, 'Other schema objects (listed only; never run): ' + other.map(([k, l]) => l.length + ' ' + k).join(', ')),
        ...other.map(([k, l]) => el('p', {class: 'dbx-hint'}, k + ': ' + l.slice(0, 60).map((o) => o.nameEscaped).join(', ') + (l.length > 60 ? ', ...' : '')))) : '');
  }

  // ---- one table, page by page -----------------------------------------------------------------------------------------------------------------
  async function openTable(id) {
    const mine = ++token;
    show(sourceBanner(), el('p', {class: 'dbx-busy', role: 'status'}, 'Reading table details ...'));
    const t = await reader.table(id);
    if (mine !== token || !alive()) return;
    if (!t.ok) { show(sourceBanner(), el('p', {class: 'dbx-state dbx-bad'}, 'The table could not be read.'), button('BACK TO TABLES', showTables)); return; }
    tv = {rec: t.table, offset: 0, size: tv?.size || 50, total: t.table.count.status === 'EXACT' ? t.table.count.value : null, result: null, busy: false};
    if (t.table.browse.status === 'BROWSABLE') await loadPage(0); else showTable();
  }
  async function loadPage(offset) {
    if (!tv || tv.busy) return;
    tv.busy = true; showTable();
    const mine = ++token, cur = tv;
    const r = await reader.page(cur.rec.id, offset, cur.size);
    if (mine !== token || tv !== cur) return;
    cur.busy = false;
    if (!r.ok) { cur.result = null; cur.error = r.reason || r.code; } else { cur.result = r; cur.offset = offset; cur.error = null; }
    showTable();
  }
  function cellNode(c) {
    const td = el('td');
    if (c.t === 'null') { td.className = 'dbx-null'; td.textContent = 'NULL'; }
    else if (c.t === 'int' || c.t === 'real') { td.className = 'dbx-num'; td.textContent = c.v; }
    else if (c.t === 'blob') { td.className = 'dbx-blob'; td.textContent = 'BLOB ' + c.n + ' bytes' + (c.hex ? ': ' + c.hex.replace(/(..)/g, '$1 ').trim() + (c.n > c.hex.length / 2 ? ' ...' : '') : ''); }
    else if (c.d === '' && !c.invalid) { td.className = 'dbx-null'; td.textContent = '(empty)'; }
    else {
      td.className = 'dbx-text'; td.textContent = c.d + (c.trunc ? ' ... (' + num(c.n) + ' bytes in total)' : '');
      if (c.invalid) td.append(el('span', {class: 'dbx-badge'}, 'invalid UTF-8'));
    }
    return td;
  }
  function showTable() {
    const { rec, size, total, result } = tv, busy = tv.busy;
    const o = rec.ordering ? ROW_KEY_LABEL[rec.ordering.mode] : null;
    const head = [el('div', {class: 'dbx-actions'}, button('BACK TO TABLES', showTables), el('h3', {class: 'dbx-h dbx-inline'}, rec.nameEscaped)),
      el('p', {class: 'dbx-hint'}, 'Records: ' + countText(rec.count) + (rec.myelin.expectedInSchema9 ? ' - MYELIN table' : '') + (o ? ' - rows ' + o : '') + '. Raw recorded values, not validated evidence.')];
    const cols = rec.columns ? el('details', {class: 'dbx-other'}, el('summary', {}, 'Columns (' + rec.columns.filter((c) => c.hidden !== 1).length + ')'),
      el('div', {class: 'wl-table-wrap dbx-wrap'}, el('table', {class: 'mn-table dbx-table'}, el('thead', {}, el('tr', {}, ['Column', 'Declared type', 'Key', 'Not null', 'Default'].map((h) => el('th', {}, h)))),
        el('tbody', {}, rec.columns.filter((c) => c.hidden !== 1).map((c) => el('tr', {}, el('td', {class: 'dbx-name'}, c.nameEscaped), el('td', {}, c.declaredType || '(none)'),
          el('td', {}, c.primaryKeyPosition ? 'primary key ' + c.primaryKeyPosition : ''), el('td', {}, c.notNull ? 'yes' : ''), el('td', {}, c.defaultValue ?? ''))))))) : '';
    if (rec.browse.status !== 'BROWSABLE') { show(sourceBanner(), ...head, cols, el('p', {class: 'dbx-state dbx-warn', role: 'note'}, NOT_BROWSABLE[rec.browse.reason] || 'Rows cannot be shown for this table.')); return; }
    if (tv.error) { show(sourceBanner(), ...head, cols, el('p', {class: 'dbx-state dbx-bad', role: 'alert'}, 'This page could not be read (' + tv.error + ').')); return; }
    const first = result ? result.offset + 1 : tv.offset + 1, last = result ? result.offset + result.rows.length : tv.offset;
    const lastOffset = total === null ? null : Math.max(0, Math.floor((total - 1) / size) * size);
    const atEnd = total !== null ? tv.offset + size >= total : (result ? result.rows.length < size : true);
    const sizeSel = el('select', {class: 'wl-input', 'aria-label': 'Rows per page', disabled: busy}, PAGE_SIZES.map((n) => el('option', {value: String(n)}, n + ' rows')));
    sizeSel.value = String(size); sizeSel.addEventListener('change', () => { tv.size = Number(sizeSel.value); loadPage(0); });
    const jump = el('input', {type: 'number', min: '1', class: 'wl-input dbx-jump', 'aria-label': 'Go to page number', placeholder: 'page'});
    const go = () => { const p = Math.floor(Number(jump.value)); if (!Number.isFinite(p) || p < 1) return; const off = (p - 1) * size; if (total !== null && off >= total) return; loadPage(off); };
    jump.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const pager = el('div', {class: 'dbx-pager'},
      button('FIRST', () => loadPage(0), {disabled: busy || tv.offset === 0}), button('PREVIOUS', () => loadPage(Math.max(0, tv.offset - size)), {disabled: busy || tv.offset === 0}),
      el('span', {class: 'dbx-range', role: 'status'}, busy ? 'Reading ...' : (result && result.rows.length ? 'Records ' + num(first) + ' to ' + num(last) + ' of ' + (total === null ? 'an unknown number (count unavailable)' : num(total)) : (total === 0 ? 'This table has no records.' : 'No records on this page.'))),
      button('NEXT', () => loadPage(tv.offset + size), {disabled: busy || atEnd}), button('LAST', () => loadPage(lastOffset), {disabled: busy || lastOffset === null || tv.offset === lastOffset}),
      sizeSel, jump, button('GO', go));
    let data = '';
    if (result && result.rows.length) {
      data = el('div', {class: 'wl-table-wrap dbx-wrap dbx-data'}, el('table', {class: 'mn-table dbx-table'},
        el('thead', {}, el('tr', {}, el('th', {title: 'Position in this ordering (not a stored value)'}, '#'), ...result.columns.map((c) => el('th', {title: c.declaredType || ''}, c.nameEscaped)))),
        el('tbody', {}, result.rows.map((r, i) => el('tr', {}, el('td', {class: 'dbx-pos'}, String(result.offset + i + 1)), ...r.map(cellNode))))));
    }
    show(sourceBanner(), ...head, cols, pager, data);
  }

  // ---- hooks used by the Settings dialog ---------------------------------------------------------------------------------------------------------
  function settingsControls() {
    if (!file) return [button('OPEN DB FILE', pick, {id: 'wlOpenDbFile'}), el('p', {class: 'dbx-hint'}, 'Inspect a local MYELIN .db snapshot. It is read in this browser only; nothing is uploaded.')];
    return [el('p', {class: 'dbx-hint', id: 'wlDbStatus'}, 'Database file open: ' + file.name + ' (' + bytesText(file.size) + '), local snapshot. Dashboards connected to it say so in the data-source bar; every other dashboard keeps its browser simulation and is labelled "SIMULATION \u2014 NOT FROM IMPORTED DB".'),
      button('DATABASE EXPLORER', () => { closeModal(); reopen(); }, {id: 'wlOpenExplorer'}), button('REMOVE FILE', remove, {id: 'wlRemoveDb'})];
  }
  // the source can also end without the Explorer asking (e.g. the reader stopped): clear what depended on it
  src.subscribe(() => {
    const wasOpen = !!inv;
    sync();
    if (!src.active && wasOpen) { navRow?.remove(); navRow = null; tv = null; token++; if (alive()) fail(src.lastError || 'The database file was removed.'); }
  });
  return {settingsControls, isOpen: () => src.active, reopen};
}
