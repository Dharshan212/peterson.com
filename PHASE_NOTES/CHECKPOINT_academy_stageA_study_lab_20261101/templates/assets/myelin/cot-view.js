// COT — Check-in On Task: main page (four metric boxes, session status, session journey map, check-in telemetry, recent sessions, activity categories), the gentle non-blocking
// popup, simulation controls and a simulation-only TXT report, over the SIMULATED ledger in cot-model.js. Visual reference only: the supplied COT design.
// Every number, node and row is derived from recorded events; the design's example values are never shown. All clock times are IST. Nothing is persisted, uploaded or monitored.
import {el, button} from './dom.js';
import {showCard, hostActive} from './popup-stage.js';
import {ELIGIBLE, PAUSING, MSG, QUESTION, INTERVAL_MS, ist, dur, clockDur, mmss, journey, telemetry} from './cot-model.js';

const D = '—', HOUR = 3600000;
const COLOURS = ['#a78bfa', '#38bdf8', '#f43f5e', '#fb923c', '#22c55e', '#94a3b8'];
const svgNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); kids.forEach((c) => n.append(c)); return n; };
const ICONS = {start: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', activity: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16"/>', activityP: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 13h6"/>',
  pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>', resume: '<circle cx="12" cy="12" r="9"/><path d="M9 8l5 4-5 4zM16 8v8"/>', popup: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', end: '<path d="M6 3v18"/><path d="M6 4h12l-2 4 2 4H6"/>'};
const icon = (k) => { const s = el('span', {class: 'cot-ic', 'aria-hidden': 'true'}); s.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.activity}</svg>`; return s; };
const stamp = (ms) => `${ist(ms).time} IST`;
const stampDate = (ms) => `${ist(ms).date} · ${ist(ms).time} IST`;
const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
const ratioOf = (c) => ({text: `${c.yes} : ${c.no}`, sub: c.yes + c.no ? `${Math.round(100 * c.yes / (c.yes + c.no))}% Yes · ${Math.round(100 * c.no / (c.yes + c.no))}% No` : 'No responses recorded'});

export function createCotView({ledger}) {
  let host = null, popupEl = null, msg = '', reportOpen = null;
  const S = {sel: null, showAll: false, rPage: 0, lastReply: null};
  const model = () => { const st = ledger.status(), now = ledger.clock(); return {st, d: st.d, now}; };
  const selected = (d) => { const list = d.sessions; if (!list.length) return null; return list.find((x) => x.key === S.sel) || list[list.length - 1]; };

  /* ---------- controls ---------- */
  function controls(st) {
    const act = (fn) => () => { const r = fn(); msg = r && r.ok === false ? r.reason : ''; render(); };
    const mkSel = (id, label, groups) => el('select', {class: 'wl-input st-select', id, 'aria-label': label}, groups);
    const act1 = mkSel('cotActivity', 'Simulated activity', [el('optgroup', {label: 'Ordinary activity (COT counts down)'}, ELIGIBLE.map(([n, c]) => el('option', {value: n}, `${n} — ${c}`))), el('optgroup', {label: 'Covered by another MYELIN organ (COT pauses)'}, PAUSING.map(([n, o]) => el('option', {value: n}, `${n} — ${o}`)))]);
    const focus = mkSel('cotFocusSel', 'Designated focus app', [el('option', {value: ''}, '— none designated —'), ...ELIGIBLE.map(([n]) => el('option', {value: n}, n))]); focus.value = st.focusApp || '';
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const counting = st.state === 'ACTIVE', log = ledger.events.slice(-12).reverse();
    return el('section', {class: 'card st-card', id: 'cotControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SIMULATION CONTROLS'), pill('DEMO EVENTS ONLY', 'warn')),
      el('p', {class: 'st-hint'}, 'Nothing is monitored. Choose a simulated activity and press ENTER ACTIVITY; time moves only with the clock or the ADVANCE buttons. COT counts down only during ordinary activity, pauses on activity covered by another organ, and the session ends only when you enter the focus app you designated.'),
      el('div', {class: 'st-ctl'}, mk('TRIGGER COT CHECK-IN', 'cotTrigger', () => { if (st.state !== 'ACTIVE') { const r0 = ledger.enterActivity(ELIGIBLE[0][0]); if (r0 && r0.ok === false) return r0; } return ledger.advanceToNextCheckin(); }, true, 'primary'),
        act1, mk('ENTER ACTIVITY', 'cotEnter', () => ledger.enterActivity(act1.value), true), mk('+30 SEC', 'cotAdv30', () => ledger.advance(30000), true), mk('+1 MIN', 'cotAdv1', () => ledger.advance(60000), true), mk('+10 MIN', 'cotAdv10', () => ledger.advance(600000), true),
        mk('ADVANCE TO NEXT CHECK-IN', 'cotAdvNext', () => ledger.advanceToNextCheckin(), counting), mk('CLEAR DEMO DATA', 'cotClear', () => { S.sel = null; S.rPage = 0; S.lastReply = null; return ledger.clear(); }, ledger.events.length > 0, 'ghost')),
      el('div', {class: 'st-ctl st-allow', id: 'cotFocusRow'}, el('span', {class: 'st-lbl'}, 'DESIGNATED FOCUS APP (entering it ends the session):'), focus, mk('DESIGNATE', 'cotFocusSet', () => ledger.designateFocusApp(focus.value || null), true),
        el('span', {class: 'st-hint', id: 'cotFocusNow'}, st.focusApp ? `Designated: ${st.focusApp}. No other app is a reset destination.` : 'None designated yet: no activity resets the session.')),
      el('p', {class: 'st-msg', id: 'cotMsg', role: 'status', 'aria-live': 'polite'}, msg),
      el('h4', {class: 'st-sub'}, 'Recorded events (latest 12, newest first)'),
      log.length ? el('ol', {class: 'st-log', id: 'cotLog'}, log.map((e) => el('li', {}, el('span', {class: 'mono'}, `${ist(e.at).date} ${stamp(e.at)}`), el('b', {}, e.type), el('span', {}, [e.name, e.choice, e.reason, e.n && '#' + e.n, e.app].filter(Boolean).join(' · '))))) : el('p', {class: 'st-hint', id: 'cotLogEmpty'}, 'No COT events recorded yet.'));
  }

  /* ---------- page ---------- */
  const tile = (n, label, id, hint, tone, ic) => el('div', {class: 'st-tile h cot-tile ' + tone}, el('span', {class: 'st-ic'}, (() => { const x = icon(ic); return x; })()), el('div', {}, el('span', {}, label), el('b', {id}, String(n)), el('small', {id: id + 'Sub'}, hint)));
  function banner(st, now) {
    const cur = st.current, live = st.state === 'ACTIVE' || st.state === 'PAUSED';
    const text = st.state === 'ACTIVE' ? 'Active Session' : st.state === 'PAUSED' ? `COT paused — covered by ${cur.organ}` : 'No active session';
    const next = st.state === 'ACTIVE' ? el('b', {id: 'cotNext', class: 'mono', 'data-live': 'next'}, mmss(st.remaining)) : st.state === 'PAUSED' ? el('b', {id: 'cotNext', class: 'mono'}, `${mmss(st.remaining)} (frozen)`) : el('b', {id: 'cotNext', class: 'mono'}, D);
    return el('div', {class: `st-banner${live ? ' open' : ''}`, id: 'cotBanner'},
      el('div', {}, el('span', {class: 'st-eyebrow'}, el('i', {}), 'REMINDER SESSION STATUS'), el('b', {class: 'st-status', id: 'cotStatus'}, text)),
      el('div', {class: 'cot-next'}, el('span', {class: 'st-lbl'}, 'Next check-in in'), next, el('small', {class: 'st-hint', id: 'cotNextAt'}, live ? `at ${mmss(st.nextDue)} of eligible activity` : 'starts with the first eligible activity')),
      el('div', {class: 'st-latest'}, el('span', {class: 'st-lbl'}, 'Current activity'), el('b', {id: 'cotCurrent'}, cur ? cur.name : D)));
  }
  function journeyCard(d, s, now) {
    const idx = s ? d.sessions.indexOf(s) : -1, sel = el('select', {class: 'wl-input st-select', id: 'cotSel', 'aria-label': 'Choose a COT session'}, d.sessions.slice().reverse().map((x) => el('option', {value: x.key}, `${x.id} · ${ist(x.startedAt).date} ${ist(x.startedAt).time.slice(0, 5)}${x.endedAt ? '' : ' · active'}`)));
    if (s) sel.value = s.key; sel.disabled = !s; sel.addEventListener('change', () => { S.sel = sel.value; render(); });
    const nav = (dir) => { const b = button(dir < 0 ? '‹' : '›', () => { S.sel = d.sessions[idx + dir].key; render(); }, {class: 'st-btn sm', id: dir < 0 ? 'cotOlder' : 'cotNewer', 'aria-label': dir < 0 ? 'Older session' : 'Newer session'}); b.disabled = !s || (dir < 0 ? idx <= 0 : idx >= d.sessions.length - 1); return b; };
    const nodes = s ? journey(s) : [], map = el('div', {class: 'cot-map', id: 'cotMap'});
    nodes.forEach((n, i) => { if (i) map.append(el('div', {class: 'cot-conn', 'aria-hidden': 'true'}, el('small', {}, '+' + mmss(n.at - nodes[i - 1].at))));
      map.append(el('div', {class: `cot-step k-${n.kind}`}, el('b', {class: 'st-n'}, '#' + (i + 1)), el('span', {class: 'cot-dot'}, icon(n.kind)), el('span', {class: 'st-obs'}, stamp(n.at)), el('div', {class: 'cot-lab'}, el('strong', {}, n.label), el('small', {}, n.note), n.chip ? pill(n.chip.text, n.chip.tone) : null))); });
    return el('section', {class: 'card st-card', id: 'cotJourney'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'cotJourneyTitle'}, s ? `SESSION JOURNEY MAP — ${s.id}` : 'SESSION JOURNEY MAP'), el('div', {class: 'st-right'}, el('span', {class: 'st-count', id: 'cotJourneyCount'}, s ? `${nodes.length} events recorded` : 'no session recorded'), sel, nav(-1), nav(1))),
      s ? [map, el('p', {class: 'st-hint', id: 'cotJourneyNote'}, `${s.endedAt ? 'Completed session' : 'Session in progress'} · started ${stampDate(s.startedAt)}${s.endedAt ? ' · ended ' + stampDate(s.endedAt) : ''}`)]
        : el('p', {class: 'st-hint', id: 'cotJourneyEmpty'}, 'No COT session has been recorded. A session starts when ordinary activity begins; use the simulation controls below.'));
  }
  function telemetryCard(s, now) {
    const rows = s ? telemetry(s, now) : [];
    return el('section', {class: 'card st-card', id: 'cotTelemetryCard'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'CHECK-IN TELEMETRY', el('small', {class: 'st-hint'}, ' (selected session)')), el('span', {class: 'st-count', id: 'cotTelemetryCount'}, `${rows.length} ${rows.length === 1 ? 'activity' : 'activities'} recorded`)),
      el('p', {class: 'st-hint'}, 'Historical simulated activity records — not a live monitoring feed; no real application or browser activity is detected.'),
      rows.length ? el('div', {class: 'st-tblwrap'}, el('table', {class: 'st-table', id: 'cotTelemetry'}, el('thead', {}, el('tr', {}, ['#', 'Activity / application', 'Category', 'Entry (IST)', 'Time spent', 'COT response', 'Exit / pause event'].map((h) => el('th', {}, h)))),
        el('tbody', {}, rows.map((r) => el('tr', {'data-activity': r.name}, el('td', {}, String(r.n)), el('td', {}, el('b', {}, r.name)), el('td', {}, r.category), el('td', {}, stamp(r.enteredAt)),
          el('td', {}, r.ongoing ? el('span', {class: 'mono', 'data-live': 'spent', 'data-from': String(r.enteredAt)}, dur(r.spentMs) + ' (ongoing)') : dur(r.spentMs)), el('td', {class: r.response === 'YES' ? 't-good' : r.response === 'NO' ? 't-bad' : ''}, r.response || D), el('td', {}, r.event)))))) : el('p', {class: 'st-empty', id: 'cotTelemetryEmpty'}, 'No activity records for this session.'));
  }
  function recentCard(d) {
    const list = d.sessions.slice().reverse(), size = S.showAll ? 10 : 5, pages = Math.max(1, Math.ceil(list.length / size)); S.rPage = Math.min(S.rPage, pages - 1);
    const rows = S.showAll ? list.slice(S.rPage * size, S.rPage * size + size) : list.slice(0, 5), now = ledger.clock();
    const pg = S.showAll ? el('div', {class: 'st-pager'}, el('span', {class: 'st-count'}, `${list.length ? S.rPage * size + 1 : 0}–${Math.min(list.length, S.rPage * size + size)} OF ${list.length}`), (() => { const b = button('‹ NEWER', () => { S.rPage--; render(); }, {class: 'st-btn sm', id: 'cotRNewer'}); b.disabled = S.rPage <= 0; return b; })(), (() => { const b = button('OLDER ›', () => { S.rPage++; render(); }, {class: 'st-btn sm', id: 'cotROlder'}); b.disabled = S.rPage >= pages - 1; return b; })()) : null;
    return el('section', {class: 'card st-card', id: 'cotRecentCard'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'RECENT COT SESSIONS'), el('div', {class: 'st-right'}, pg, button(S.showAll ? 'SHOW LATEST 5' : 'VIEW ALL', () => { S.showAll = !S.showAll; S.rPage = 0; render(); }, {class: 'st-btn sm', id: 'cotViewAll'}))),
      rows.length ? el('div', {class: 'st-tblwrap'}, el('table', {class: 'st-table', id: 'cotRecent'}, el('thead', {}, el('tr', {}, ['#', 'Session ID', 'Date & time (IST)', 'Duration', 'Popups', 'Yes', 'No', 'Ratio'].map((h) => el('th', {}, h)))),
        el('tbody', {}, rows.map((x) => { const r = ratioOf(x.counts); return el('tr', {'data-session': x.id, class: x.key === (selected(d) || {}).key ? 'cot-on' : '', on: {click: () => { S.sel = x.key; render(); }}}, el('td', {}, String(d.sessions.indexOf(x) + 1)), el('td', {}, el('b', {}, x.id)), el('td', {}, stampDate(x.startedAt)), el('td', {}, dur((x.endedAt || now) - x.startedAt) + (x.endedAt ? '' : ' (active)')), el('td', {}, String(x.counts.displayed)), el('td', {}, String(x.counts.yes)), el('td', {}, String(x.counts.no)), el('td', {}, r.text)); })))) : el('p', {class: 'st-empty', id: 'cotRecentEmpty'}, 'No COT sessions have been recorded.'));
  }
  function categoryCard(s, now) {
    const rows = s ? telemetry(s, now) : [], m = new Map(); rows.forEach((r) => m.set(r.kind === 'PAUSING' ? 'Covered by other organs (COT paused)' : r.category, (m.get(r.kind === 'PAUSING' ? 'Covered by other organs (COT paused)' : r.category) || 0) + r.spentMs));
    const list = [...m].sort((a, b) => b[1] - a[1]), tot = list.reduce((a, b) => a + b[1], 0);
    const pie = () => { const C = 2 * Math.PI * 54, v = svg('svg', {viewBox: '0 0 160 160', class: 'fn-pie', id: 'cotCatPie', role: 'img', 'aria-label': 'Activity categories by time'}); v.append(svg('circle', {cx: 80, cy: 80, r: 54, fill: 'none', class: 'fn-ring', 'stroke-width': 24}));
      let off = 0; list.forEach(([k, ms], i) => { const len = tot ? ms / tot * C : 0; v.append(svg('circle', {cx: 80, cy: 80, r: 54, fill: 'none', stroke: COLOURS[i % 6], 'stroke-width': 24, 'stroke-dasharray': `${len} ${C}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 80 80)', 'data-category': k, 'data-ms': ms})); off += len; }); return v; };
    return el('section', {class: 'card st-card', id: 'cotCatCard'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'MOST USED ACTIVITY CATEGORIES', el('small', {class: 'st-hint'}, ' (selected session)')), pill('BY TIME SPENT', 'ghost')),
      tot ? el('div', {class: 'fn-piewrap'}, pie(), el('ul', {class: 'st-list fn-pielist', id: 'cotCatList'}, list.map(([k, ms], i) => el('li', {'data-category': k}, el('i', {style: `background:${COLOURS[i % 6]}`}), `${k} — ${Math.round(100 * ms / tot)}%`)))) : el('p', {class: 'st-hint', id: 'cotCatEmpty'}, 'No activity time recorded for this session.'));
  }
  const NOTES = ['COT asks "Is it related to your work?" and nothing else: it never blocks, escalates, or forces navigation. YES is a self-reported statement about relevance — not verified focus or recovery.', 'First check-in after 10:00 of eligible activity, then every 10:00 (10:00, 20:00, 30:00 …); only displayed popups are counted.',
    'Activity covered by SINE, MINE, SECANT, COSINE, FINE or STORE pauses COT: no popup, the countdown freezes, nothing accumulates. On resume the same schedule continues; with under 60 s left, one full minute passes first.', 'Entering the designated focus app ends the session (kept in the history, counters reset); a new session starts with the next eligible activity.'];
  const OPEN = ['C1 · What else counts as "eligible activity": TANGENT / gaming, idle time, an unlisted organ (only the six listed organs pause COT here).', 'C2 · The check-in grid after a delayed popup (used: the original 10-minute marks, e.g. 10:30 then 20:00).', 'C3 · How long an unanswered popup stays (here: until answered, dismissed, replaced by the next check-in or the session ends).',
    'C4 · Whether a popup hidden by a pause should reappear when COT resumes (here: it is hidden at once, nothing is recorded, and it reappears still awaiting a response).', 'C5 · How a focus app is designated in real use, and whether there may be several.', 'C6 · Other ways a session may end (idle timeout, long pause).', 'C7 · How the popup appears outside this page.', 'C8 · How activities are categorised (the categories here are demonstration labels).'];
  function mainPage() {
    const {st, d, now} = model(), s = selected(d), c = s ? s.counts : {displayed: 0, yes: 0, no: 0, unanswered: 0}, r = ratioOf(c);
    return el('div', {class: 'mh-wrap st-wrap', id: 'cotMain', 'aria-label': 'COT'},
      el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'COT — CHECK-IN ON TASK'), el('p', {class: 'st-hint'}, 'Gentle activity check-ins to understand if the current activity is work related.')),
        el('div', {class: 'st-chips'}, el('span', {class: 'st-hint', id: 'cotModeNote'}, 'Simulation mode | All timestamps in IST | No real monitoring'), button('GET REPORT', () => openReport(), {class: 'st-btn primary', id: 'cotReport', title: 'A simple report of the selected session, built only from the simulated events.'}))),
      el('div', {class: 'cot-tiles', id: 'cotTiles'}, tile(c.displayed, 'REMINDERS DISPLAYED', 'cotShown', c.unanswered ? `Total COT popups in this session · ${c.unanswered} unanswered` : 'Total COT popups in this session', 'purple', 'popup'), tile(c.yes, 'YES RESPONSES', 'cotYes', 'Marked as work related', 'green', 'start'),
        tile(c.no, 'NO RESPONSES', 'cotNo', 'Marked as not work related', 'red', 'end'), tile(r.text, 'YES : NO RATIO', 'cotRatio', r.sub, 'blue', 'resume')),
      banner(st, now), el('div', {class: 'cot-grid'}, journeyCard(d, s, now), telemetryCard(s, now)), el('div', {class: 'fn-grid'}, recentCard(d), categoryCard(s, now)),
      el('section', {class: 'card st-card', id: 'cotNotes'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'ABOUT THIS SIMULATION'), pill('SIMULATION — NOT REAL MONITORING', 'warn')), el('ul', {class: 'st-list', id: 'cotNotesList'}, NOTES.map((t) => el('li', {}, t))),
        el('h4', {class: 'st-sub'}, 'Design decisions still open (not invented)'), el('ul', {class: 'st-list', id: 'cotOpenList'}, OPEN.map((t) => el('li', {}, t)))), controls(st));
  }

  /* ---------- the gentle, non-blocking popup ---------- */
  function popup(st) {
    if (st.state === 'PAUSED') S.lastReply = null;   // another organ has priority: the popup (or its reply) is hidden at once; the recorded state is untouched
    const need = host && host.classList.contains('active') && st.state !== 'PAUSED' && (st.pending || S.lastReply);
    if (!need) { showCard(null, {owner: 'cot'}); popupEl = null; return; }
    const alive = hostActive(() => host), base = {label: 'COT POPUP', badge: 'COT', eyebrow: 'MYELIN · COT CHECK-IN · SIMULATION', domId: 'cotPopup', tag: 'aside', aria: 'COT check-in (simulation)'};
    const answer = (choice) => () => { const r = ledger.respond(choice); msg = r.ok ? '' : r.reason; S.lastReply = r.ok ? choice : null; render(); return r; };
    const spec = st.pending ? {...base, sig: `cot-q-${st.pending.n}`, world: 'blue', headline: 'Check-in', message: QUESTION, messageId: 'cotQuestion', status: 'DISPLAYED · YOUR ANSWER IS SELF-REPORTED',
        buttons: [{label: 'YES', id: 'cotYesBtn', onClick: answer('YES')}, {label: 'NO', id: 'cotNoBtn', onClick: answer('NO')}, {label: 'NOT NOW', id: 'cotDismiss', onClick: () => { const r = ledger.dismiss(); msg = r.ok ? '' : r.reason; S.lastReply = null; render(); return r; }}],
        footer: 'COT · SIMULATION · YES IS NOT VERIFIED FOCUS'}
      : {...base, sig: `cot-r-${S.lastReply}-${st.session.popups.length}`, world: S.lastReply === 'YES' ? 'green' : 'amber', headline: 'Check-in answered', message: MSG[S.lastReply], messageId: 'cotReply', messageAttrs: {'data-choice': S.lastReply}, status: 'RECORDED · SELF-REPORTED',
        buttons: [{label: 'CLOSE', id: 'cotReplyClose', onClick: () => { S.lastReply = null; render(); return {ok: true}; }}], footer: 'COT · SIMULATION · NO ACTION IS FORCED'};
    showCard(spec, {owner: 'cot', alive}); popupEl = document.getElementById('cotPopup');
  }

  /* ---------- report ---------- */
  function reportText() {
    const {d, now} = model(), s = selected(d), L = ['COT SIMULATION REPORT — SIMULATION EVIDENCE — NOT REAL DEVICE OR BROWSER MONITORING', 'Every event below was created by a demonstration button in MYELIN Web Lite. COT only asks whether an activity is related to work; YES is a self-reported statement, not verified focus.', `Generated ${stampDate(now)} (simulated clock, IST)`, ''];
    if (!s) { L.push('No COT session has been recorded.'); return L.join('\n'); }
    const c = s.counts, r = ratioOf(c), nodes = journey(s), tel = telemetry(s, now);
    L.push('SESSION', `Session ID: ${s.id}`, `Started: ${stampDate(s.startedAt)}`, `Ended: ${s.endedAt ? stampDate(s.endedAt) + ' (' + s.endReason + ')' : 'still in progress'}`, `Duration: ${dur((s.endedAt || now) - s.startedAt)}`, '');
    L.push('MAIN METRICS', `Reminders displayed: ${c.displayed}`, `Yes responses: ${c.yes}`, `No responses: ${c.no}`, `Yes : No ratio: ${r.text} (${r.sub})`, `Unanswered: ${c.unanswered}${c.awaiting ? ' · awaiting: ' + c.awaiting : ''}`, '');
    L.push('RECORDED CHECK-IN RESPONSES'); if (!s.popups.length) L.push('none recorded');
    s.popups.forEach((p) => L.push(`#${p.n} displayed ${stampDate(p.at)} (due at ${mmss(p.dueElapsed)} of eligible activity) · ${p.response ? p.response + ' at ' + stamp(p.respondedAt) : p.unanswered ? 'unanswered (' + p.unanswered + ')' : 'awaiting response'}`));
    L.push('', 'CHRONOLOGICAL JOURNEY'); nodes.forEach((n, i) => L.push(`${i + 1}. ${stampDate(n.at)} · ${n.label} · ${n.note}${n.chip ? ' · ' + n.chip.text : ''}`));
    L.push('', 'HISTORICAL TELEMETRY (simulated activity records)'); tel.forEach((t) => L.push(`${t.n}. ${t.name} · ${t.category} · entered ${stamp(t.enteredAt)} · spent ${dur(t.spentMs)}${t.ongoing ? ' (ongoing)' : ''} · response ${t.response || '—'} · ${t.event}`));
    L.push('', 'LIMITATIONS', 'Simulation only. No real application, website, device or browser was monitored. Nothing is stored or uploaded. Not a clinical or scientific result.');
    return L.join('\n');
  }
  function closeReport() { if (!reportOpen) return; document.removeEventListener('keydown', onKey, true); reportOpen.remove(); reportOpen = null; document.getElementById('cotReport')?.focus(); }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeReport(); } }
  function openReport() {
    if (reportOpen) return;
    const text = reportText();
    const closeBtn = button('', closeReport, {class: 'glass-close', 'aria-label': 'Close report'}); closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const dl = button('DOWNLOAD (.TXT)', () => { const blob = new Blob([text], {type: 'text/plain'}), a = el('a', {href: URL.createObjectURL(blob), download: `COT-simulation-report-${ist(ledger.clock()).ddmmyyyy}.txt`}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, {class: 'st-btn primary', id: 'cotReportDownload'});
    reportOpen = el('div', {class: 'glass-overlay open st-dash', id: 'cotReportDialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cotReportTitle'}, el('div', {class: 'glass-panel st-panel'},
      el('div', {class: 'st-head'}, el('b', {class: 'st-brand'}, 'MYELIN'), el('h2', {id: 'cotReportTitle'}, 'COT — SIMULATION REPORT'), el('div', {class: 'st-chips'}, dl, closeBtn)),
      el('div', {class: 'st-body'}, el('div', {class: 'st-banner open', id: 'cotReportBanner'}, el('b', {class: 'st-status'}, 'SIMULATION EVIDENCE — NOT REAL DEVICE OR BROWSER MONITORING')), el('pre', {class: 'fn-report', id: 'cotReportText'}, text))));
    reportOpen.addEventListener('mousedown', (e) => { if (e.target === reportOpen) closeReport(); });
    document.body.append(reportOpen); document.addEventListener('keydown', onKey, true); closeBtn.focus();
  }

  function render() {
    if (!host) return;
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '', val = {};
    for (const i of ['cotActivity', 'cotFocusSel']) { const e = document.getElementById(i); if (e) val[i] = e.value; }
    host.replaceChildren(mainPage());
    for (const [i, v] of Object.entries(val)) { const e = document.getElementById(i); if (e && i === 'cotActivity') e.value = v; }
    if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    popup(ledger.status());
  }
  function live() {
    const st = ledger.status(), now = ledger.clock();
    const nx = document.getElementById('cotNext'); if (nx && nx.dataset.live === 'next' && st.state === 'ACTIVE') nx.textContent = mmss(st.remaining);
    for (const n of document.querySelectorAll('[data-live="spent"]')) n.textContent = dur(now - Number(n.dataset.from)) + ' (ongoing)';
  }
  let timer = null;
  function start() {
    if (timer) return;
    ledger.subscribe(() => { if (host && host.classList.contains('active')) render(); else popup(ledger.status()); });
    timer = setInterval(() => { if (host && host.classList.contains('active')) { ledger.tick(); live(); } else if (popupEl) popup(ledger.status()); }, 1000);
  }
  return {mount(h) { host = h; start(); render(); }, openReport, closeReport, get reportOpen() { return !!reportOpen; }, hidePopup() { popup(ledger.status()); }};
}
