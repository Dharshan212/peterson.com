// TANGENT — main page and three-section dashboard (Session List · Episode History · About TANGENT) plus a simulation-only report, over the SIMULATED ledger in tangent-model.js.
// Visual reference only: the supplied TANGENT designs. Every number, row and map node is derived from recorded ledger events; example values in the designs are never shown.
// All clock times are IST (Asia/Kolkata, UTC+05:30). Nothing is persisted or uploaded, nothing reads an imported file, and this web page cannot detect or intervene in any real game.
// Episode closure and outcome names are NOT defined, so episodes are shown by recorded state (on game / exited) and recorded facts only.
import {el, button} from './dom.js';
import {showCard, hostActive} from './popup-stage.js';
import {GAMES, REMINDER_MS, ist, istDayStart, istDayEnd, dur, clockDur, mmss, journey} from './tangent-model.js';

const D = '—', HOUR = 3600000, DAY = 24 * HOUR;
const DEMO_NOTE = 'Demonstration return — pressed by the visitor, NOT observed or verified by the browser.';
const stamp = (ms) => `${ist(ms).time} IST`;
const stampDate = (ms) => `${ist(ms).date} · ${ist(ms).time} IST`;
const COLOURS = ['#38bdf8', '#a78bfa', '#22c55e', '#f43f5e', '#fb923c'];
const svgNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); kids.forEach((c) => n.append(c)); return n; };
const svgIcon = (d) => { const s = el('span', {class: 'st-ic', 'aria-hidden': 'true'}); s.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; return s; };
const ICON = {pad: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/>', bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>', ret: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'};
const chip = (g) => { const s = el('span', {class: 'tn-chip', 'aria-hidden': 'true'}, g.slice(0, 1).toUpperCase()); return s; };   // a neutral letter chip: no brand or logo is implied

/** The recorded state as words, with a tone. Never an outcome: closure and outcome names are undefined. */
function state(s) {
  if (!s.isEpisode) return s.exitedAt === null ? {label: 'ON GAME', tone: 'warn'} : {label: 'LEFT BEFORE REMINDER', tone: 'muted'};
  if (s.exitedAt === null) return {label: 'REMINDER DISPLAYED — GAME OPEN', tone: 'warn'};
  return s.returnAt !== null ? {label: 'DEMO RETURN EVIDENCE', tone: 'info'} : {label: 'EXITED AFTER REMINDER — NO RETURN EVIDENCE', tone: 'muted'};
}
const short = (s) => (!s.isEpisode ? (s.exitedAt === null ? 'ON GAME' : 'NO REMINDER') : s.exitedAt === null ? 'GAME OPEN' : s.returnAt !== null ? 'DEMO EVIDENCE' : 'EXITED');

export function createTangentView({ledger}) {
  let host = null, dash = null, dashBody = null, opener = null, msg = '';
  const S = {tab: 'sessions', sPage: 0, ePage: 0, sel: null, game: 'ALL', report: false, mainIdx: 0,
    sess: {kind: '7d', from: '', to: '', note: ''}, hist: {kind: '7d', from: '', to: '', note: ''}};
  const TABS = [['sessions', 'Session List'], ['history', 'Episode History'], ['about', 'About']];
  const model = () => ({d: ledger.derive(), now: ledger.clock()});
  const windowOf = (r, now) => {
    if (r.kind === '24h') return {lo: now - DAY, hi: now};
    if (r.kind === '7d') return {lo: now - 7 * DAY, hi: now};
    if (r.kind === '30d') return {lo: now - 30 * DAY, hi: now};
    if (!r.from || !r.to) return null;
    const lo = istDayStart(r.from), hi = istDayEnd(r.to);
    return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi ? {lo, hi} : null;
  };
  const within = (t, w) => !!w && t >= w.lo && t <= w.hi;
  const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
  const empty = (t, id) => el('p', {class: 'st-empty', id}, t);
  function pager(total, page, size, set, label) {
    const pages = Math.max(1, Math.ceil(total / size)), p = Math.min(Math.max(0, page), pages - 1), a = total ? p * size + 1 : 0, b = Math.min(total, (p + 1) * size);
    const prev = button('‹ NEWER', () => set(p - 1), {class: 'st-btn sm', 'aria-label': `Newer ${label}`}), next = button('OLDER ›', () => set(p + 1), {class: 'st-btn sm', 'aria-label': `Older ${label}`});
    prev.disabled = p <= 0; next.disabled = p >= pages - 1;
    return {page: p, node: el('div', {class: 'st-pager'}, el('span', {class: 'st-count'}, total ? `${String(a).padStart(2, '0')}–${String(b).padStart(2, '0')} OF ${total}` : '0 OF 0'), prev, next)};
  }
  function nodeStrip(nodes) {
    const strip = el('div', {class: 'st-journey'});
    nodes.forEach((n, i) => {
      if (i) strip.append(el('div', {class: 'st-arrow', 'aria-hidden': 'true'}, el('span', {}, '→'), el('small', {}, '+' + mmss(n.at - nodes[i - 1].at))));
      strip.append(el('div', {class: `st-node k-${n.kind}`}, el('b', {class: 'st-n'}, '#' + (i + 1)), el('strong', {}, n.label), pill(n.tag, 'ghost'), n.note ? el('span', {class: 'st-obs'}, n.note) : null, el('span', {class: 'st-obs'}, `Observed • ${stamp(n.at)}`)));
    });
    return strip;
  }
  function rangeControl(r, apply, idp) {
    const wrap = el('div', {class: 'st-range', id: idp + 'Range'});
    const kinds = [['24h', '24 HOURS'], ['7d', '7 DAYS'], ['30d', '30 DAYS'], ['custom', 'CUSTOM RANGE']];
    const bar = el('div', {class: 'st-seg', role: 'group', 'aria-label': 'Time range'}, kinds.map(([k, t]) => button(t, () => { r.kind = k; r.note = ''; if (k !== 'custom') apply(); else renderDash(); }, {class: 'st-btn sm' + (r.kind === k ? ' on' : ''), 'data-range': k, 'aria-pressed': String(r.kind === k)})));
    const from = el('input', {type: 'date', class: 'wl-input st-date', id: idp + 'From', value: r.from, 'aria-label': 'From date (IST)'}), to = el('input', {type: 'date', class: 'wl-input st-date', id: idp + 'To', value: r.to, 'aria-label': 'To date (IST)'});
    from.disabled = to.disabled = r.kind !== 'custom';
    const ap = button('APPLY', () => { r.from = from.value; r.to = to.value; r.note = !r.from || !r.to ? 'Choose both dates.' : r.from > r.to ? 'The From date is after the To date.' : ''; if (!r.note) apply(); else renderDash(); }, {class: 'st-btn primary sm', id: idp + 'Apply'});
    ap.disabled = r.kind !== 'custom';
    const game = el('select', {class: 'wl-input st-select', id: idp + 'Game', 'aria-label': 'Game filter'}, el('option', {value: 'ALL'}, 'All games'), GAMES.map(([g]) => el('option', {value: g}, g)));
    game.value = S.game; game.addEventListener('change', () => { S.game = game.value; S.sPage = S.ePage = 0; S.sel = null; renderDash(); });
    wrap.append(bar, el('span', {class: 'st-lbl'}, 'FROM'), from, el('span', {class: 'st-lbl'}, 'TO'), to, ap, el('span', {class: 'st-lbl'}, 'GAME'), game, el('span', {class: 'st-warn', role: 'alert', id: idp + 'Note'}, r.note));
    return wrap;
  }
  const byPlatform = (d) => { const m = new Map(); d.sessions.forEach((s) => m.set(s.platform, (m.get(s.platform) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); };

  /* ---------- controls ---------- */
  /* ---------- the centred simulated popup (popup-stage.js): the persistent 23:15 reminder (no buttons), derived from the recorded state only ---------- */
  function popupSpec() {
    const {d, now} = model(), a = d.active;
    if (!host || !host.classList.contains('active') || !a || a.reminderAt === null) return null;
    return {sig: `tangent-${a.key}`, label: 'TANGENT POPUP', world: 'red', badge: 'TANGENT', eyebrow: 'MYELIN · TANGENT · SIMULATION', headline: 'Gaming reminder', message: `${a.game} has been open for 23:15.`, lines: [`GAME: ${a.game} · ${a.platform}`],
      status: `DISPLAYED · ${mmss(now - a.openedAt)} IN GAME`, protected: true, noButtons: 'NO BUTTONS · PERSISTENT REMINDER', footer: 'TANGENT · SIMULATION · IT CANNOT DETECT OR OVERLAY ANY REAL GAME', aria: 'TANGENT reminder (simulation)'};
  }

  function controls(d) {
    const act = (fn) => () => { const r = fn(); msg = r && r.ok === false ? r.reason : ''; render(); };
    const sel = el('select', {class: 'wl-input st-select', id: 'tnGame', 'aria-label': 'Demonstration game'}, GAMES.map(([g, p]) => el('option', {value: g}, `${g} (${p})`)));
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const a = d.active, ep = d.latestEpisode, log = ledger.events.slice(-12).reverse();
    return el('section', {class: 'card st-card', id: 'tnControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SIMULATION CONTROLS'), pill('DEMO EVENTS ONLY', 'warn')),
      el('p', {class: 'st-hint'}, 'Nothing is monitored and no real game is detected: a session exists only when you press OPEN GAME, and time moves only with the clock or the ADVANCE buttons. The reminder appears at 23:15 of an open game. Exiting a game is never a return; the last button creates a DEMONSTRATION event only — this browser cannot observe or verify a real return.'),
      el('div', {class: 'st-ctl'}, mk('TRIGGER TANGENT REMINDER', 'tnTrigger', () => { if (!a) { const r0 = ledger.openGame(sel.value); if (r0 && r0.ok === false) return r0; } return ledger.advanceToReminder(); }, true, 'primary'),
        sel, mk('OPEN GAME', 'tnOpen', () => ledger.openGame(sel.value), !a), mk('+1 MIN', 'tnAdv1', () => ledger.advance(60000), true), mk('+1 HOUR', 'tnAdv60', () => ledger.advance(HOUR), true),
        mk('ADVANCE TO 23:15 REMINDER', 'tnAdvRem', () => ledger.advanceToReminder(), !!a && a.reminderAt === null), mk('EXIT GAME', 'tnExit', () => ledger.exitGame(), !!a),
        mk('RECORD DEMONSTRATION RETURN (NOT BROWSER-OBSERVED)', 'tnReturn', () => ledger.recordDemoReturn(), !!ep && ep.exitedAt !== null && ep.returnAt === null, 'demo'),
        mk('CLEAR DEMO DATA', 'tnClear', () => { S.sPage = S.ePage = S.mainIdx = 0; S.sel = null; return ledger.clear(); }, ledger.events.length > 0, 'ghost')),
      el('p', {class: 'st-msg', id: 'tnMsg', role: 'status', 'aria-live': 'polite'}, msg),
      el('h4', {class: 'st-sub'}, 'Recorded events (latest 12, newest first)'),
      log.length ? el('ol', {class: 'st-log', id: 'tnLog'}, log.map((e) => el('li', {}, el('span', {class: 'mono'}, `${ist(e.at).date} ${stamp(e.at)}`), el('b', {}, e.type), el('span', {}, e.game ? `${e.game} · ${e.platform}` : '')))) : el('p', {class: 'st-hint', id: 'tnLogEmpty'}, 'No TANGENT events recorded yet.'));
  }

  /* ---------- main page ---------- */
  const tile = (n, label, id, hint, flag, icon) => el('div', {class: 'st-tile h'}, svgIcon(icon), el('div', {}, el('b', {id}, String(n)), el('span', {}, label), flag ? pill(flag, 'warn') : null, el('small', {}, hint)));
  function statusOf(d) {
    const a = d.active;
    if (a && a.isEpisode) return {open: true, text: `Episode ${a.id} — reminder displayed, game still open`};
    if (a) return {open: false, text: `No active episode — ${a.game} open`, live: a};
    return {open: false, text: d.counts.reminders ? 'No game open' : 'No Active Episode'};
  }
  function banner(d, now, idp) {
    const s = statusOf(d), lat = d.latestEpisode ? state(d.latestEpisode) : null;
    const live = s.live ? el('span', {class: 'mono', 'data-live': 'remaining', 'data-from': String(s.live.openedAt)}, ` · ${mmss(Math.max(0, REMINDER_MS - (now - s.live.openedAt)))} to the 23:15 reminder`) : null;
    return el('div', {class: `st-banner${s.open ? ' open' : ''}`, id: idp + 'Banner'}, el('div', {}, el('span', {class: 'st-eyebrow'}, el('i', {}), 'EPISODE STATUS'), el('b', {class: 'st-status', id: idp + 'Status'}, s.text, live),
        d.counts.reminders ? el('small', {class: 'st-hint', id: idp + 'Closure'}, 'Episode closure is not defined yet; episodes are shown by their recorded state.') : null),
      el('div', {class: 'st-latest'}, el('span', {class: 'st-eyebrow'}, 'LATEST EPISODE STATE'), el('b', {id: idp + 'Latest', class: 't-' + (lat ? lat.tone : 'muted')}, lat ? lat.label : D)));
  }
  function mainPage() {
    const {d, now} = model(), c = d.counts, sess = d.sessions.slice().reverse();
    S.mainIdx = Math.min(Math.max(0, S.mainIdx), Math.max(0, sess.length - 1));
    const cur = sess[S.mainIdx] || null;
    const nav = (dir) => { const b = button(dir < 0 ? '‹' : '›', () => { S.mainIdx += dir; render(); }, {class: 'st-btn sm', 'aria-label': dir < 0 ? 'Newer session' : 'Older session', id: dir < 0 ? 'tnJNewer' : 'tnJOlder'}); b.disabled = dir < 0 ? S.mainIdx <= 0 : S.mainIdx >= sess.length - 1; return b; };
    const jc = el('section', {class: 'card st-card', id: 'tnJourneyCard'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'tnJourneyTitle'}, cur ? `Journey Map — ${cur.isEpisode ? cur.id : 'session without a reminder'}` : 'Journey Map'), el('div', {class: 'st-right'}, el('span', {class: 'st-count', id: 'tnJourneyCount'}, cur ? `${journey(cur).length} recorded events` : 'no session recorded'), nav(-1), nav(1))),
      cur ? [nodeStrip(journey(cur)), el('p', {class: 'st-hint', id: 'tnJourneyState'}, `Recorded state: ${state(cur).label}.${cur.returnAt !== null ? ' ' + DEMO_NOTE : ''}`)]
        : el('p', {class: 'st-hint', id: 'tnJourneyEmpty'}, 'No gaming session has been recorded. A session is created only by OPEN GAME below; an episode only when the 23:15 reminder is displayed.'));
    const recent = sess.slice(0, 5), pl = byPlatform(d), tot = d.sessions.length;
    const table = el('section', {class: 'card st-card', id: 'tnRecentCard'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'RECENT GAMING SESSIONS (LATEST 5)'), button('VIEW ALL', (e) => { S.tab = 'sessions'; openDash(e.currentTarget); }, {class: 'st-btn sm', id: 'tnViewAll'})),
      recent.length ? el('div', {class: 'st-tblwrap'}, el('table', {class: 'st-table', id: 'tnRecent'}, el('thead', {}, el('tr', {}, ['#', 'Date (IST)', 'Platform', 'Game', 'Total duration', 'Reminder', 'Recorded state'].map((h) => el('th', {}, h)))),
        el('tbody', {}, recent.map((s, i) => el('tr', {'data-session': s.key}, el('td', {}, String(sess.length - i)), el('td', {}, stampDate(s.openedAt)), el('td', {}, s.platform), el('td', {}, el('b', {}, s.game)), el('td', {}, s.exitedAt === null ? el('span', {class: 'mono', 'data-live': 'dwell', 'data-from': String(s.openedAt)}, dur(now - s.openedAt) + ' (so far)') : dur(s.exitedAt - s.openedAt)),
          el('td', {}, s.isEpisode ? `Yes (23:15)` : s.exitedAt === null ? 'Not yet' : 'No'), el('td', {class: 't-' + state(s).tone}, state(s).label)))))) : empty('No gaming sessions have been recorded.', 'tnRecentEmpty'));
    const plat = el('section', {class: 'card st-card', id: 'tnPlatCard'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'MOST USED GAMING PLATFORMS'), pill('BY OBSERVED GAME ENTRIES', 'ghost')),
      tot ? el('div', {class: 'fn-piewrap'}, donut(pl, tot, 'tnPlatPie', 'Gaming sessions by platform'), el('ul', {class: 'st-list fn-pielist', id: 'tnPlatList'}, pl.map(([p, n], i) => el('li', {'data-platform': p}, el('i', {style: `background:${COLOURS[i % 5]}`}), `${p} — ${n} (${Math.round(100 * n / tot)}%)`)))) : el('p', {class: 'st-hint', id: 'tnPlatEmpty'}, 'No gaming platform has been observed yet.'));
    return el('div', {class: 'mh-wrap st-wrap', id: 'tnMain', 'aria-label': 'TANGENT'},
      el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'TANGENT — GAMING INTERRUPTION'), el('p', {class: 'st-hint'}, 'Gaming activity and return after a reminder. Browser simulation — it cannot detect, block or overlay any real game; no return is verified by this browser. All times IST.')),
        el('div', {class: 'st-chips'}, pill('SOURCE: LOCAL EVENTS (SIMULATION)', 'info'), pill('IST · UTC+05:30', 'ghost'), button('OPEN TANGENT DASHBOARD', (e) => openDash(e.currentTarget), {class: 'st-btn primary', id: 'tnOpenDash'}))),
      banner(d, now, 'tn'),
      el('div', {class: 'st-tiles3', id: 'tnTiles'}, tile(c.sessions, 'GAMING SESSIONS', 'tnSessions', 'Number of times a game was entered', null, ICON.pad), tile(c.reminders, 'REMINDERS SHOWN', 'tnReminders', 'TANGENT reminders displayed (after 23 min 15 s)', null, ICON.bell),
        tile(c.returns, 'RETURNS', 'tnReturns', 'Demonstration return evidence only — this browser cannot verify a real return', 'DEMO EVIDENCE', ICON.ret)),
      jc, el('div', {class: 'fn-grid'}, table, plat), controls(d));
  }
  function donut(rows, tot, id, label) {
    const C = 2 * Math.PI * 54, s = svg('svg', {viewBox: '0 0 160 160', class: 'fn-pie', id, role: 'img', 'aria-label': label});
    s.append(svg('circle', {cx: 80, cy: 80, r: 54, fill: 'none', class: 'fn-ring', 'stroke-width': 24}));
    let off = 0; rows.forEach(([k, n], i) => { const len = n / tot * C; s.append(svg('circle', {cx: 80, cy: 80, r: 54, fill: 'none', stroke: COLOURS[i % 5], 'stroke-width': 24, 'stroke-dasharray': `${len} ${C}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 80 80)', 'data-platform': k, 'data-count': n})); off += len; });
    const t = svg('text', {x: 80, y: 86, 'text-anchor': 'middle', class: 'fn-pie-v'}); t.textContent = String(tot); s.append(t); return s;
  }

  /* ---------- dashboard views ---------- */
  const views = {
    sessions() {
      const {d, now} = model(), w = windowOf(S.sess, now), list = d.sessions.map((s, i) => ({s, n: i + 1})).filter(({s}) => within(s.openedAt, w) && (S.game === 'ALL' || s.game === S.game)).reverse();
      const pg = pager(list.length, S.sPage, 10, (p) => { S.sPage = p; renderDash(); }, 'sessions'); S.sPage = pg.page;
      const rows = list.slice(S.sPage * 10, S.sPage * 10 + 10);
      const table = rows.length ? el('div', {class: 'st-tblwrap'}, el('table', {class: 'st-table', id: 'tnSessionTable'}, el('thead', {}, el('tr', {}, ['#', 'Game / platform', 'Time entered (IST)', 'Total dwell', 'Time exited (IST)', 'Episode / recorded state'].map((h) => el('th', {}, h)))),
        el('tbody', {}, rows.map(({s, n}) => el('tr', {'data-session': s.key}, el('td', {}, String(n)), el('td', {}, chip(s.game), el('b', {}, ' ' + s.game), el('br'), el('small', {class: 'st-hint'}, s.platform)), el('td', {}, stampDate(s.openedAt)),
          el('td', {}, s.exitedAt === null ? el('span', {class: 'mono', 'data-live': 'dwell', 'data-from': String(s.openedAt)}, dur(now - s.openedAt) + ' (ongoing)') : dur(s.exitedAt - s.openedAt)),
          el('td', {}, s.exitedAt === null ? 'Exit not recorded yet (ongoing)' : stampDate(s.exitedAt)),
          el('td', {}, s.isEpisode ? button(`${s.id} ›`, () => { S.tab = 'history'; S.sel = s.key; S.ePage = 0; S.game = 'ALL'; S.hist.kind = '30d'; renderDash(); }, {class: 'st-btn sm', 'data-episode': s.id, 'aria-label': `Open episode ${s.id}`}) : null, el('span', {class: 't-' + state(s).tone}, (s.isEpisode ? ' ' : '') + state(s).label))))))) : empty(w ? 'No gaming sessions were recorded for this time range and game.' : 'No valid time range is applied.', 'tnSessionsEmpty');
      return [el('h2', {class: 'st-sec'}, 'TANGENT — SESSION LIST'), el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'TIME RANGE AND GAME')), rangeControl(S.sess, () => { S.sPage = 0; renderDash(); }, 'tnS')),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'GAMING SESSIONS (LATEST FIRST)'), pg.node), table),
        el('p', {class: 'st-foot'}, 'Game and platform names are demonstration entries, not detections. An unknown exit time is shown as ongoing, never as an invented time. An exit is never a return.')];
    },
    history() {
      const {d, now} = model(), w = windowOf(S.hist, now), list = d.episodes.filter((s) => within(s.reminderAt, w) && (S.game === 'ALL' || s.game === S.game)).sort((a, b) => b.reminderAt - a.reminderAt);
      const pg = pager(list.length, S.ePage, 10, (p) => { S.ePage = p; S.sel = null; renderDash(); }, 'episodes'); S.ePage = pg.page;
      const pageEps = list.slice(S.ePage * 10, S.ePage * 10 + 10);
      if (!pageEps.some((e) => e.key === S.sel)) S.sel = pageEps[0] ? pageEps[0].key : null;
      const cur = pageEps.find((e) => e.key === S.sel) || null;
      const row = (e, i) => { const nodes = journey(e); return el('div', {class: 'tn-row' + (e.key === S.sel ? ' on' : ''), id: 'tnEp-' + e.key, 'data-episode': e.id},
        el('b', {class: 'st-n'}, '#' + String(S.ePage * 10 + i + 1).padStart(2, '0')), el('div', {class: 'tn-id'}, el('strong', {}, e.id), el('small', {}, `${e.game} · ${e.platform}`)),
        el('div', {class: 'tn-mini'}, nodes.map((n, j) => el('span', {class: `tn-n k-${n.kind}`}, el('i', {}, j ? '→' : ''), el('b', {}, n.label), el('small', {}, n.at ? stamp(n.at) : '')))),
        pill(short(e), state(e).tone === 'info' ? 'info' : state(e).tone === 'warn' ? 'warn' : 'ghost'), button('VIEW DETAILS ›', () => { S.sel = e.key; renderDash(); }, {class: 'st-btn sm', 'aria-pressed': String(e.key === S.sel), 'data-view': e.id})); };
      return [el('h2', {class: 'st-sec'}, 'TANGENT — EPISODE HISTORY'), el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'TIME RANGE AND GAME')), rangeControl(S.hist, () => { S.ePage = 0; S.sel = null; renderDash(); }, 'tnH'), !w ? el('p', {class: 'st-hint'}, 'Choose a valid custom range and press APPLY.') : null),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'EPISODES (LATEST 10 PER PAGE)'), pg.node),
          el('p', {class: 'st-hint'}, 'Each map is one TANGENT episode: a gaming session whose 23:15 reminder was displayed. Only recorded steps appear; sessions that ended before the reminder have no episode. Times in IST.'),
          pageEps.length ? el('div', {class: 'tn-rows', id: 'tnEpRows'}, pageEps.map(row)) : empty(w ? 'No TANGENT episodes were recorded for this time range and game.' : 'No valid time range is applied.', 'tnHistEmpty')),
        cur ? el('section', {class: 'card st-card', id: 'tnSelected'}, el('div', {class: 'st-card-h'}, el('h3', {}, el('span', {}, 'EPISODE DETAILS '), el('b', {class: 'st-id', id: 'tnSelId'}, cur.id)), pill(state(cur).label, state(cur).tone)),
          el('p', {class: 'st-hint'}, `${cur.game} · ${cur.platform} · reminder ${stampDate(cur.reminderAt)}${cur.returnAt !== null ? ' · ' + DEMO_NOTE : ''}`), nodeStrip(journey(cur))) : null];
    },
    about() {
      const g = (n, t, body) => el('section', {class: 'card st-card st-about'}, el('span', {class: 'st-eyebrow'}, n), el('h3', {}, t), ...body.map((x) => el('p', {class: 'st-hint'}, x)));
      const list = (id, items) => el('ul', {class: 'st-list', id}, items.map((t) => el('li', {}, t)));
      const legend = [['Game opened', 'A gaming session was entered.'], ['Reminder displayed', 'The TANGENT reminder appeared 23 min 15 s after entry while the game was still open (persistent prompt, no buttons).'], ['Game exited', 'The session ended. An exit is not a return.'], ['Return to main activity', 'A DEMONSTRATION event pressed by the visitor — not observed by the browser.']];
      return [el('h2', {class: 'st-sec'}, 'TANGENT — ABOUT'),
        el('section', {class: 'card st-card st-hero'}, svgIcon(ICON.pad), el('div', {}, el('span', {class: 'st-eyebrow'}, 'MYELIN · MODULE PROFILE'), el('h2', {class: 'st-big'}, 'TANGENT'), el('b', {class: 'st-tagline'}, 'Gaming interruption observation'),
          el('p', {class: 'st-hint'}, 'TANGENT observes gaming activity and a gentle reminder during prolonged play. It records when a game is entered, when the reminder is displayed, when the game is exited, and — only as a demonstration here — whether the user returns to their original activity.'))),
        el('section', {class: 'card st-card', id: 'tnAboutMetrics'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'KEY METRICS IN THIS DASHBOARD')), list('tnAboutMetricsList', ['Gaming sessions — the number of times a game was entered (one entry = one session).', 'Reminders shown — the number of TANGENT reminders displayed, after 23 min 15 s of an open game.', 'Returns — demonstration return evidence on episodes. This browser cannot verify a real return; a game exit is never counted as a return.'])),
        el('section', {class: 'card st-card', id: 'tnAboutLegend'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'EVENT FLOW LEGEND'), pill('SIMULATED', 'warn')),
          el('div', {class: 'tn-legend'}, legend.map(([t, x]) => el('div', {class: 'st-node'}, el('strong', {}, t), el('span', {class: 'st-obs'}, x)))), el('p', {class: 'st-hint'}, 'A session that ends before 23:15 has no reminder and no episode; a missing step stays missing on a map.')),
        el('section', {class: 'card st-card', id: 'tnAboutLimits'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'DATA SOURCE AND LIMITATIONS'), pill('NO REAL MONITORING', 'warn')),
          list('tnAboutLimitsList', ['Every event on these pages is created by a button on the TANGENT page. Nothing is monitored; the web version cannot detect, block or overlay any Windows game or other application, and it is not an OS-level intervention.', 'Game and platform names are demonstration entries and no brand or game is implied to have been observed.',
            'Nothing is stored or uploaded and nothing is read from an imported database file; data disappears when the page is reloaded.', 'TANGENT does not measure attention, wellbeing or any brain state, and makes no claim to change gaming behaviour.'])),
        el('section', {class: 'card st-card', id: 'tnOpenDecisions'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'DESIGN DECISIONS STILL OPEN'), pill('NOT IMPLEMENTED — NOT INVENTED', 'warn')),
          list('tnOpenDecisionsList', ['T1 · Confirmation of the 23 min 15 s reminder threshold and of the persistent no-button prompt (taken from the plan, marked "to be verified").', 'T2 · What happens after the reminder (second prompt, escalation, time limit).', 'T3 · The intentional gaming break and how it relates to other MYELIN organs.',
            'T4 · The real evidence of a return to the main activity, and how long it must last.', 'T5 · When an episode closes and what its outcomes are called (no closure or outcome name is shown).', 'T6 · Which games and launchers are supported, and how a game is identified.', 'T7 · Conflict rules with other organs and with several games at once.', 'T8 · The content and format of a real TANGENT report.']))];
    }
  };

  /* ---------- report (simulation evidence only) ---------- */
  function reportText() {
    const {d, now} = model(), c = d.counts, L = [];
    L.push('TANGENT SIMULATION REPORT — SIMULATION EVIDENCE ONLY', 'No real games, people or monitoring were involved. Every event below was created by a demonstration button in MYELIN Web Lite.', `Generated ${stampDate(now)} (simulated clock, IST)`, '');
    L.push('COUNTS', `Gaming sessions: ${c.sessions}`, `Reminders shown (23 min 15 s): ${c.reminders}`, `Demonstration returns: ${c.returns}`, '');
    L.push('PLATFORMS (by game entries)', ...(d.sessions.length ? byPlatform(d).map(([p, n]) => `${p}: ${n}`) : ['none recorded']), '');
    L.push('SESSIONS (latest first)'); if (!d.sessions.length) L.push('none recorded');
    d.sessions.slice().reverse().forEach((s) => L.push(`${s.isEpisode ? s.id : 'no episode'} · ${s.game} (${s.platform}) · entered ${stampDate(s.openedAt)} · ${s.exitedAt === null ? 'exit not recorded (ongoing)' : 'exited ' + stampDate(s.exitedAt) + ' · dwell ' + dur(s.exitedAt - s.openedAt)} · ${state(s).label}`));
    L.push('', 'RECORDED EVENTS (chronological)'); if (!ledger.events.length) L.push('none recorded');
    ledger.events.forEach((e) => L.push(`${stampDate(e.at)} · ${e.type}${e.game ? ' · ' + e.game + ' (' + e.platform + ')' : ''}`));
    L.push('', 'LIMITATIONS', 'Simulation only. A game exit is not a return; returns are demonstration buttons, not browser-observed. Nothing is stored or uploaded. Not a clinical or scientific result.');
    return L.join('\n');
  }
  function reportView() {
    const text = reportText();
    const dl = button('DOWNLOAD (.TXT)', () => { const blob = new Blob([text], {type: 'text/plain'}), a = el('a', {href: URL.createObjectURL(blob), download: `TANGENT-simulation-report-${ist(ledger.clock()).ddmmyyyy}.txt`}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, {class: 'st-btn primary', id: 'tnReportDownload'});
    return [el('h2', {class: 'st-sec'}, 'TANGENT — SIMULATION REPORT'), el('div', {class: 'st-banner open', id: 'tnReportBanner'}, el('b', {class: 'st-status'}, 'SIMULATION EVIDENCE — NOT REAL GAMES OR REAL MONITORING')),
      el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'REPORT PREVIEW'), el('div', {class: 'st-right'}, button('‹ BACK', () => { S.report = false; renderDash(); }, {class: 'st-btn sm', id: 'tnReportBack'}), dl)), el('pre', {class: 'fn-report', id: 'tnReportText'}, text))];
  }

  /* ---------- dashboard shell ---------- */
  function dashChrome() {
    const open = model().d.activeEpisode, c = dash.querySelector('#tnDashOpen');
    c.textContent = open ? 'TANGENT: EPISODE OPEN' : 'TANGENT: NO OPEN EPISODE'; c.className = 'st-pill ' + (open ? 'warn' : 'bad');
    [...dash.querySelectorAll('.st-nav button')].forEach((b) => { const on = !S.report && b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function renderDash() {
    if (!dash) return;
    const focusId = document.activeElement && dash.contains(document.activeElement) ? document.activeElement.id : '';
    dashChrome(); const top = dashBody.scrollTop;
    dashBody.replaceChildren(...(S.report ? reportView() : views[S.tab]()).filter(Boolean)); dashBody.scrollTop = top;
    if (focusId) { const f = dash.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
  }
  function closeDash() { if (!dash) return; document.removeEventListener('keydown', onKey, true); dash.remove(); dash = null; dashBody = null; S.report = false; (opener && opener.isConnected ? opener : document.getElementById('tnOpenDash'))?.focus(); opener = null; }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDash(); return; }
    if (e.key === 'Tab' && dash) { const f = [...dash.querySelectorAll('button,select,input,[tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  }
  function openDash(from) {
    if (dash) { dash.querySelector('.glass-close')?.focus(); renderDash(); return; }
    opener = from || document.activeElement;
    const closeBtn = button('', closeDash, {class: 'glass-close', 'aria-label': 'Close TANGENT dashboard'}); closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const nav = el('nav', {class: 'st-nav', 'aria-label': 'TANGENT sections', role: 'tablist'}, TABS.map(([k, t], i) => { const b = el('button', {type: 'button', role: 'tab', 'data-tab': k, id: 'tnTab-' + k, on: {click: () => { S.tab = k; S.report = false; renderDash(); }}}, t);
      b.addEventListener('keydown', (e) => { const n = e.key === 'ArrowDown' ? (i + 1) % TABS.length : e.key === 'ArrowUp' ? (i + TABS.length - 1) % TABS.length : null; if (n !== null) { e.preventDefault(); S.tab = TABS[n][0]; S.report = false; renderDash(); nav.children[n].focus(); } }); return b; }));
    dashBody = el('div', {class: 'st-body', id: 'tnBody', role: 'tabpanel', tabindex: '-1'});
    const report = button('GET REPORT', () => { S.report = true; renderDash(); }, {class: 'st-btn primary', id: 'tnReport', title: 'A simple report built only from the simulated events. Marked as simulation evidence.'});
    const openChip = pill('TANGENT: NO OPEN EPISODE', 'bad'); openChip.id = 'tnDashOpen';
    dash = el('div', {class: 'glass-overlay open st-dash', id: 'tnDash', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tnDashTitle'}, el('div', {class: 'glass-panel st-panel'},
      el('div', {class: 'st-head'}, el('b', {class: 'st-brand'}, 'MYELIN'), el('h2', {id: 'tnDashTitle'}, 'TANGENT — GAMING'), el('div', {class: 'st-chips'}, openChip, pill('SOURCE: LOCAL EVENTS (SIMULATION)', 'good'), pill('IST · UTC+05:30', 'ghost'), closeBtn)),
      el('div', {class: 'st-sub2'}, el('span', {}, 'TANGENT · Gaming interruption observation'), el('span', {}, 'Web demonstration, cannot detect real games'), el('span', {class: 'st-spacer'}), el('span', {class: 'st-warn'}, 'Report = simulation evidence only'), report),
      el('div', {class: 'st-split'}, el('div', {class: 'st-side'}, el('span', {class: 'st-eyebrow'}, 'TANGENT SECTIONS'), nav), dashBody),
      el('div', {class: 'st-foot2'}, el('span', {}, 'MYELIN WEB LITE · TANGENT'), el('span', {}, 'SIMULATED EVENTS · ALL TIMES IST'))));
    dash.addEventListener('mousedown', (e) => { if (e.target === dash) closeDash(); });
    document.body.append(dash); document.addEventListener('keydown', onKey, true); renderDash(); closeBtn.focus();
  }

  function render() {
    if (host) {
      const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '';
      host.replaceChildren(mainPage());
      if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    }
    if (dash) renderDash();
    showCard(popupSpec(), {owner: 'tangent', alive: hostActive(() => host)});
  }
  function live() {
    const now = ledger.clock();
    for (const n of document.querySelectorAll('[data-live]')) {
      const from = Number(n.dataset.from), k = n.dataset.live;
      if (k === 'remaining') n.textContent = ` · ${mmss(Math.max(0, REMINDER_MS - (now - from)))} to the 23:15 reminder`;
      else if (k === 'dwell') n.textContent = dur(now - from) + (n.closest('#tnSessionTable') ? ' (ongoing)' : ' (so far)');
    }
  }
  let timer = null;
  function start() {
    if (timer) return;
    ledger.subscribe(() => { if ((host && host.classList.contains('active')) || dash) render(); });
    timer = setInterval(() => { if ((host && host.classList.contains('active')) || dash) { ledger.tick(); live(); showCard(popupSpec(), {owner: 'tangent', alive: hostActive(() => host)}); } }, 1000);
  }
  return {mount(h) { host = h; start(); render(); }, openDashboard: openDash, closeDashboard: closeDash, get dashboardOpen() { return !!dash; }};
}
