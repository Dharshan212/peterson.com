// MYELIN Web: the data-source bar. While an imported database file is open, every page says where its numbers come from:
//   a connected dashboard  -> "IMPORTED DB FILE SNAPSHOT", the file, the scope (one session, with the session picker, or the whole file) and the snapshot/WAL notes;
//   any other dashboard    -> "SIMULATION - NOT FROM IMPORTED DB" (it still shows the browser simulation, never a mixture).
// The bar does not exist in the layout until a file is open. Text only (textContent); no HTML from the file ever reaches it.
import {el, button} from './dom.js';
import {LIFETIME_LABEL} from './imported-source.js';

const PLACEHOLDER_PAGES = new Set([]);
const WAL_SHORT = 'WAL-mode file: records still held in its -wal file may be missing, so this snapshot may be incomplete.';

export function mountSourceBar({source, getPage, getZone, openExplorer}) {
  const host = el('div', {class: 'dbs-bar', id: 'dbSourceBar', role: 'region', 'aria-label': 'Data source', hidden: ''});
  const anchor = document.querySelector('.main > .topbar');
  if (anchor) anchor.after(host); else document.querySelector('.main')?.prepend(host);

  const fmt = (iso) => {
    const t = Date.parse(iso || '');
    if (!Number.isFinite(t)) return iso ? String(iso) : 'start time not recorded';
    try { return new Intl.DateTimeFormat('en-GB', {timeZone: getZone(), day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short'}).format(new Date(t)); }
    catch (e) { return String(iso); }
  };
  const sessionLabel = (s) => '#' + s.id + ' · ' + fmt(s.startedAtUtc) + ' · ' + (s.closedAtUtc ? 'closed' : 'no close recorded') + (s.hasEvidence ? '' : ' · no SECANT/Study records');
  const raw = () => button('VIEW RAW RECORDS', openExplorer, {class: 'c3-btn dbs-btn', id: 'dbsRaw'});

  function update() {
    if (!source.active || PLACEHOLDER_PAGES.has(getPage())) { host.hidden = true; host.replaceChildren(); return; }   // a reserved module page shows no data at all, so it carries no data-source claim
    const hadFocus = document.activeElement && document.activeElement.id === 'dbsSession';
    host.hidden = false;
    const name = source.file ? source.file.name : '';
    if (!source.ready) { host.className = 'dbs-bar dbs-import'; host.replaceChildren(el('span', {class: 'dbs-tag'}, 'IMPORTED DB FILE'), el('span', {class: 'dbs-text', role: 'status'}, 'Opening ' + name + ' ...')); return; }
    const page = getPage(), contract = source.isConnected(page) ? source.contract(page) : null;
    if (!contract) {
      host.className = 'dbs-bar dbs-sim';
      host.replaceChildren(el('span', {class: 'dbs-tag dbs-sim-tag', id: 'dbsTag'}, 'SIMULATION — NOT FROM IMPORTED DB'),
        el('span', {class: 'dbs-text'}, 'A database file (' + name + ') is open, but this dashboard is not connected to it. Everything on this page comes from MYELIN Web’s browser simulation, so any wording here about a database being loaded refers to the simulation, not to your file. The file’s records are in the Database Explorer.'), raw());
      return;
    }
    host.className = 'dbs-bar dbs-import';
    const kids = [el('span', {class: 'dbs-tag', id: 'dbsTag'}, 'IMPORTED DB FILE SNAPSHOT'), el('strong', {class: 'dbs-file'}, name),
      el('span', {class: 'dbs-chip', id: 'dbsScope'}, contract.scope === 'LIFETIME' ? LIFETIME_LABEL : 'SESSION-SPECIFIC'),
      el('span', {class: 'dbs-chip'}, 'Snapshot · not live · read in this browser only')];
    if (source.walFlagged()) kids.push(el('span', {class: 'dbs-chip dbs-warn', role: 'note', id: 'dbsWal'}, WAL_SHORT));
    if (contract.scope === 'SESSION') {
      const list = source.sessions(), stNow = source.organ(page);
      if (list === null && (stNow.status === 'UNSUPPORTED' || stNow.status === 'UNAVAILABLE')) { /* the notice below explains; there are no sessions to list */ }
      else if (list === null) kids.push(el('span', {class: 'dbs-text', role: 'status'}, 'Reading sessions ...'));
      else if (!list.length) kids.push(el('span', {class: 'dbs-text', id: 'dbsNoSessions'}, 'No sessions are recorded in this file.'));
      else {
        const sel = el('select', {class: 'wl-input dbs-select', id: 'dbsSession', 'aria-label': 'Imported session'}, list.slice().reverse().map((s) => el('option', {value: String(s.id)}, sessionLabel(s))));
        sel.value = String(source.selectedSessionId());
        sel.addEventListener('change', () => source.selectSession(Number(sel.value)));
        kids.push(el('label', {class: 'dbs-pick'}, el('span', {}, 'Session'), sel));
        const sug = source.suggestion();
        if (sug) kids.push(el('span', {class: 'dbs-text dbs-note', id: 'dbsSuggest'}, 'The selected session has no SECANT or Study records.'), button('SHOW SESSION #' + sug.id + ' (latest with records)', () => source.selectSession(sug.id), {class: 'c3-btn dbs-btn', id: 'dbsSuggestBtn'}));
      }
    }
    const st = source.organ(page);
    if (st.status === 'UNSUPPORTED' || st.status === 'UNAVAILABLE') kids.push(el('span', {class: 'dbs-text dbs-warn', role: 'alert', id: 'dbsStatus'}, contract.title + ' unavailable: ' + st.reason));
    kids.push(raw());
    host.replaceChildren(...kids);
    if (hadFocus) document.getElementById('dbsSession')?.focus();
  }
  return {update, element: host};
}
