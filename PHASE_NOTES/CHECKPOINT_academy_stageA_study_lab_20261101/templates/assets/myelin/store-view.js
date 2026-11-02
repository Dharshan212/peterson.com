// STORE — main page and four-section dashboard (Overview · Episode History · Response · About STORE), presented over the SIMULATED ledger in store-model.js.
// Visual reference only: the supplied STORE designs. Every number, row and map node is derived from recorded ledger events; example values in the designs are never shown.
// All clock times are IST (Asia/Kolkata, UTC+05:30); dwell values are elapsed durations. Nothing is persisted or uploaded and nothing here reads an imported database file.
// Episode closure and outcome names are NOT defined yet, so episodes are shown by their recorded state (on site / exited) and recorded facts, never as "closed" or with an outcome.
import {el, button} from './dom.js';
import {showCard, hostActive} from './popup-stage.js';
import {SITES, CHOICES, THRESHOLD_MS, ALLOWANCE_MAX_MS, COMBINED_MAX_MS, ist, istDayStart, istDayEnd, dur, clockDur, mmss, journey} from './store-model.js';

const D = '—', HOUR = 3600000, DAY = 24 * HOUR;
const DEMO_NOTE = 'Demonstration evidence — pressed by the visitor, NOT observed or verified by the browser.';
const stamp = (ms) => { const t = ist(ms); return `${t.time} IST`; };
const stampDate = (ms) => { const t = ist(ms); return `${t.date} · ${t.time} IST`; };
const svgIcon = (d) => { const s = el('span', {class: 'st-ic', 'aria-hidden': 'true'}); s.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; return s; };
const ICON = {home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', exit: '<path d="M4 12h12"/><path d="M12 8l4 4-4 4"/><path d="M20 5v14"/>'};

/** The recorded state of an episode as words, with a tone. Never an outcome: closure and outcome names are undefined. */
function epState(ep) {
  if (ep.state === 'ON_SITE') {
    if (!ep.choice) return {label: 'PROMPT DISPLAYED', tone: 'warn'};
    if (ep.choice === 'IM_BACK') return {label: "I'M BACK RECORDED", tone: 'warn'};
    return {label: ep.elapsedAt !== null ? 'CHOSEN TIME ELAPSED' : 'CHOSEN SHOPPING TIME RUNNING', tone: 'warn'};
  }
  return ep.demoReturnAt !== null ? {label: 'DEMO RETURN EVIDENCE', tone: 'info'} : {label: 'EXITED — NO RETURN EVIDENCE', tone: 'muted'};
}
const epShort = (ep) => (ep.state === 'ON_SITE' ? 'ON SITE' : ep.demoReturnAt !== null ? 'DEMO EVIDENCE' : 'EXITED');

export function createStoreView({ledger}) {
  let host = null, dash = null, dashBody = null, opener = null, msg = '';
  const S = {tab: 'overview', mainIdx: 0, ovPage: 0, hPage: 0, rPage: 0, sel: null, site: 'ALL', allow: {m: 13, s: 15},
    hist: {kind: '24h', from: '', to: '', note: ''}, resp: {kind: '7d', from: '', to: '', note: ''}};
  const TABS = [['overview', 'Overview'], ['history', 'Episode History'], ['response', 'Response'], ['about', 'About STORE']];

  /* ---------- derived state ---------- */
  const model = () => { const d = ledger.derive(), now = ledger.clock(); return {d, now}; };
  const windowOf = (r, now) => {
    if (r.kind === '24h') return {lo: now - DAY, hi: now};
    if (r.kind === '7d') return {lo: now - 7 * DAY, hi: now};
    if (r.kind === '30d') return {lo: now - 30 * DAY, hi: now};
    if (!r.from || !r.to) return null;
    const lo = istDayStart(r.from), hi = istDayEnd(r.to);
    return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi ? {lo, hi} : null;
  };
  const inWin = (ep, w) => !!w && ep.promptAt >= w.lo && ep.promptAt <= w.hi;
  const newestFirst = (eps) => eps.slice().sort((a, b) => b.promptAt - a.promptAt || b.visit.events[0].seq - a.visit.events[0].seq);
  const visitState = (v) => (v.episode ? epState(v.episode) : v.exitedAt === null ? {label: 'ON SITE', tone: 'warn'} : {label: 'LEFT BEFORE PROMPT', tone: 'muted'});
  const statusText = (d) => {
    const ep = d.activeEpisode;
    if (ep) {
      const stage = !ep.choice ? 'STORE prompt displayed' : ep.choice === 'IM_BACK' ? "I'M BACK recorded (follow-up timing not defined)" : ep.elapsedAt !== null ? 'chosen shopping time elapsed, site still open' : 'chosen shopping time running';
      return {open: true, text: `Episode ${ep.id} — ${stage}`, ep};
    }
    if (d.active) return {open: false, text: `No active episode — ${d.active.site} open`, live: d.active};
    return {open: false, text: d.counts.episodes ? 'No shopping site open' : 'No Active Episode'};
  };

  /* ---------- small builders ---------- */
  const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
  function pager(total, page, size, set, label) {
    const pages = Math.max(1, Math.ceil(total / size)), p = Math.min(Math.max(0, page), pages - 1), a = total ? p * size + 1 : 0, b = Math.min(total, (p + 1) * size);
    const newer = button('‹ NEWER', () => set(p - 1), {class: 'st-btn sm', 'aria-label': `Newer ${label}`}), older = button('OLDER ›', () => set(p + 1), {class: 'st-btn sm', 'aria-label': `Older ${label}`});
    newer.disabled = p <= 0; older.disabled = p >= pages - 1;
    return {page: p, node: el('div', {class: 'st-pager'}, el('span', {class: 'st-count'}, total ? `${String(a).padStart(2, '0')}–${String(b).padStart(2, '0')} OF ${total}` : '0 OF 0'), newer, older)};
  }
  function nodeStrip(nodes, ep) {
    const strip = el('div', {class: 'st-journey'});
    nodes.forEach((n, i) => {
      if (i) strip.append(el('div', {class: 'st-arrow', 'aria-hidden': 'true'}, el('span', {}, '→'), el('small', {}, '+' + mmss(n.at - nodes[i - 1].at))));
      strip.append(el('div', {class: `st-node k-${n.kind}`}, el('b', {class: 'st-n'}, '#' + (i + 1)), el('strong', {}, n.label), pill(n.tag, 'ghost'), n.note ? el('span', {class: 'st-obs'}, n.note) : null, el('span', {class: 'st-obs'}, `Observed • ${stamp(n.at)}`)));
    });
    return strip;
  }

  /* ---------- the centred simulated popup (popup-stage.js): the STORE prompt, derived from the recorded state only ---------- */
  function popupSpec() {
    const {d, now} = model(), v = d.active, ep = d.activeEpisode;
    if (!host || !host.classList.contains('active') || !v || !ep || ep.choice) return null;
    const field = () => { const mk = (k, max, id, label) => { const i = el('input', {type: 'number', min: '0', max: String(max), value: String(S.allow[k]), id, 'aria-label': label}); i.addEventListener('input', () => { S.allow[k] = Number(i.value); }); return i; };
      return el('div', {class: 'pp-extra'}, el('span', {}, 'I WANT TO SHOP FOR'), mk('m', 13, 'stPopMin', 'Chosen shopping time, minutes'), el('span', {}, 'MIN'), mk('s', 59, 'stPopSec', 'Chosen shopping time, seconds'), el('span', {}, 'SEC')); };
    return {sig: `store-${ep.key}`, label: 'STORE POPUP', world: 'amber', badge: 'STORE', eyebrow: 'MYELIN · STORE · SIMULATION', headline: 'Shopping time reached', message: `Shopping activity on ${v.site} has reached 10:00.`, lines: [`SITE: ${v.site}`],
      status: `DISPLAYED · ${mmss(now - v.openedAt)} ON SITE · AWAITING YOUR CHOICE`, extra: field,
      buttons: [{label: "I'M BACK", id: 'stPopBack', onClick: () => ledger.respond('IM_BACK')}, {label: 'I WANT TO SHOP', id: 'stPopShop', onClick: () => ledger.respond('I_WANT_TO_SHOP', {allowanceMs: (S.allow.m * 60 + S.allow.s) * 1000})}],
      footer: "STORE · SIMULATION · I'M BACK RECORDS AN INTENTION ONLY", aria: 'STORE popup (simulation)'};
  }

  /* ---------- the simulation controls (demonstration events only) ---------- */
  function controls(d) {
    const act = (fn) => () => { const r = fn(); msg = r && r.ok === false ? r.reason : ''; render(); };
    const sel = el('select', {class: 'wl-input st-select', id: 'stSite', 'aria-label': 'Demonstration shopping site'}, SITES.map((s) => el('option', {value: s}, s)));
    const num = (id, v, max, label) => { const i = el('input', {type: 'number', class: 'wl-input st-num', id, min: '0', max: String(max), value: String(v), 'aria-label': label}); i.addEventListener('input', () => { S.allow[id === 'stAllowMin' ? 'm' : 's'] = Number(i.value); }); return i; };
    const mi = num('stAllowMin', S.allow.m, 13, 'Chosen shopping time, minutes'), se = num('stAllowSec', S.allow.s, 59, 'Chosen shopping time, seconds');
    const allowMs = () => (Number(mi.value) * 60 + Number(se.value)) * 1000;
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const v = d.active, ep = d.activeEpisode, last = d.latest;
    const row = el('div', {class: 'st-ctl'},
      mk('TRIGGER STORE POPUP', 'stTrigger', () => { if (!v) { const r0 = ledger.openSite(sel.value); if (r0 && r0.ok === false) return r0; } if (ledger.derive().activeEpisode) return {ok: false, reason: 'A STORE prompt already exists for this visit.'}; return ledger.advanceToThreshold(); }, true, 'primary'),
      sel, mk('OPEN SITE', 'stOpen', () => ledger.openSite(sel.value), !v),
      mk('+1 MIN', 'stAdv1', () => ledger.advance(60000), true), mk('+1 HOUR', 'stAdv60', () => ledger.advance(HOUR), true),
      mk('ADVANCE TO 10:00 THRESHOLD', 'stAdvThr', () => ledger.advanceToThreshold(), !!v && v.thresholdAt === null),
      mk("I'M BACK", 'stBack', () => ledger.respond('IM_BACK'), !!ep && !ep.choice),
      mk('I WANT TO SHOP', 'stShop', () => ledger.respond('I_WANT_TO_SHOP', {allowanceMs: allowMs()}), !!ep && !ep.choice),
      mk('ADVANCE TO END OF CHOSEN TIME', 'stAdvEnd', () => ledger.advanceToAllowanceEnd(), !!ep && ep.deadlineAt !== null && ep.elapsedAt === null),
      mk('EXIT SITE', 'stExit', () => ledger.exitSite(), !!v),
      mk('RECORD DEMONSTRATION RETURN EVIDENCE (NOT BROWSER-OBSERVED)', 'stReturn', () => ledger.recordDemoReturnEvidence(), !!last && last.exitedAt !== null && last.demoReturnAt === null && d.visits[d.visits.length - 1].episode === last, 'demo'),
      mk('CLEAR DEMO DATA', 'stClear', () => { S.mainIdx = S.ovPage = S.hPage = S.rPage = 0; S.sel = null; return ledger.clear(); }, ledger.events.length > 0, 'ghost'));
    const allowRow = el('div', {class: 'st-ctl st-allow', id: 'stAllowRow'}, el('span', {class: 'st-lbl'}, 'I WANT TO SHOP — chosen shopping time (1 s to 13:15):'), mi, el('span', {class: 'st-lbl'}, 'min'), se, el('span', {class: 'st-lbl'}, 'sec'),
      el('span', {class: 'st-hint'}, 'The chosen time can never take the combined time beyond 23:15 from the start of the shopping activity.'));
    const log = ledger.events.slice(-12).reverse();
    return el('section', {class: 'card st-card', id: 'stControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SIMULATION CONTROLS'), pill('DEMO EVENTS ONLY', 'warn')),
      el('p', {class: 'st-hint'}, 'Nothing is monitored. A shopping visit exists only when you press OPEN SITE; time moves only with the clock or the ADVANCE buttons. The prompt appears at 10:00 on the open site. I\'M BACK and I WANT TO SHOP record intentions, never a verified return, and leaving the site is never a return. The last button creates a DEMONSTRATION event only: this browser cannot observe or verify a real return.'),
      row, allowRow, el('p', {class: 'st-msg', id: 'stMsg', role: 'status', 'aria-live': 'polite'}, msg),
      el('h4', {class: 'st-sub'}, 'Recorded events (latest 12, newest first)'),
      log.length ? el('ol', {class: 'st-log', id: 'stLog'}, log.map((e) => el('li', {}, el('span', {class: 'mono'}, `${ist(e.at).date} ${stamp(e.at)}`), el('b', {}, e.type), el('span', {}, [e.site, e.choice && CHOICES[e.choice], e.allowanceMs && `${mmss(e.allowanceMs)} chosen`, e.capped && 'capped at 23:15'].filter(Boolean).join(' · ')))))
        : el('p', {class: 'st-hint', id: 'stLogEmpty'}, 'No STORE events recorded yet.'));
  }

  /* ---------- main page ---------- */
  function banner(d, now, idp) {
    const s = statusText(d, now), ep = s.ep;
    const live = s.live ? el('span', {class: 'mono', 'data-live': 'threshold', 'data-from': String(s.live.openedAt)}, ` · ${mmss(Math.min(now - s.live.openedAt, THRESHOLD_MS))} of 10:00`)
      : ep && ep.deadlineAt !== null && ep.elapsedAt === null ? el('span', {class: 'mono', 'data-live': 'allowance', 'data-to': String(ep.deadlineAt)}, ` · ${mmss(Math.max(0, ep.deadlineAt - now))} left`) : null;
    const lat = d.latest ? epState(d.latest) : null;
    return el('div', {class: `st-banner${s.open ? ' open' : ''}`, id: idp + 'Banner'}, el('div', {}, el('span', {class: 'st-eyebrow'}, el('i', {}), 'EPISODE STATUS'), el('b', {class: 'st-status', id: idp + 'Status'}, s.text, live),
        d.counts.episodes ? el('small', {class: 'st-hint', id: idp + 'Closure'}, 'Episode closure is not defined yet; episodes are shown by their recorded state.') : null),
      el('div', {class: 'st-latest'}, el('span', {class: 'st-eyebrow'}, 'LATEST EPISODE STATE'), el('b', {id: idp + 'Latest', class: 't-' + (lat ? lat.tone : 'muted')}, lat ? lat.label : D)));
  }
  function tile(n, label, id, hint, flag) { return el('div', {class: 'st-tile'}, el('b', {id}, String(n)), el('span', {}, label), flag ? pill(flag, 'warn') : null, el('small', {}, hint)); }
  function mainPage() {
    const {d, now} = model(), eps = newestFirst(d.episodes);
    S.mainIdx = Math.min(Math.max(0, S.mainIdx), Math.max(0, eps.length - 1));
    const ep = eps[S.mainIdx] || null;
    const nav = (dir) => { const b = button(dir < 0 ? '‹' : '›', () => { S.mainIdx += dir; render(); }, {class: 'st-btn sm', 'aria-label': dir < 0 ? 'Newer episode' : 'Older episode', id: dir < 0 ? 'stJNewer' : 'stJOlder'}); b.disabled = dir < 0 ? S.mainIdx <= 0 : S.mainIdx >= eps.length - 1; return b; };
    const journeyCard = el('section', {class: 'card st-card', id: 'stJourneyCard'},
      el('div', {class: 'st-card-h'}, el('h3', {id: 'stJourneyTitle'}, ep ? `Shopping Journey — ${ep.id}` : 'Shopping Journey'), el('div', {class: 'st-right'}, el('span', {class: 'st-count', id: 'stJourneyCount'}, ep ? `${journey(ep).length} recorded events` : 'no episode recorded'), nav(-1), nav(1))),
      ep ? [nodeStrip(journey(ep), ep), el('p', {class: 'st-hint', id: 'stJourneyState'}, `Recorded state: ${epState(ep).label}.${ep.demoReturnAt !== null ? ' ' + DEMO_NOTE : ''}`)]
        : el('p', {class: 'st-hint', id: 'stJourneyEmpty'}, 'No STORE episode has been recorded. An episode is created only when a shopping visit reaches the 10-minute threshold and the STORE prompt is displayed. Use the simulation controls below.'));
    return el('div', {class: 'mh-wrap st-wrap', id: 'stMain', 'aria-label': 'STORE'},
      el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'STORE — SHOPPING INTERVENTION & RETURN EVIDENCE'), el('p', {class: 'st-hint'}, 'Shopping activity and the response journey around STORE prompts. Browser simulation — not OS monitoring; no return is verified by this browser. All times IST.')),
        el('div', {class: 'st-chips'}, pill('SOURCE: SIMULATION (DEMO EVENTS)', 'info'), pill('IST · UTC+05:30', 'ghost'), button('OPEN STORE DASHBOARD', (e) => openDash(e.currentTarget), {class: 'st-btn primary', id: 'stOpenDash'}))),
      banner(d, now, 'st'),
      el('div', {class: 'st-tiles', id: 'stTiles'}, tile(d.counts.visits, 'SHOPPING SITE VISITS', 'stVisits', 'Entry events of a shopping site (one entry = one visit)'), tile(d.counts.episodes, 'EPISODES', 'stEpisodes', 'Episodes created when the STORE prompt was displayed'),
        tile(d.counts.returns, 'RETURNS', 'stReturns', 'Demonstration return evidence only — this browser cannot verify a real return', 'DEMO EVIDENCE')),
      journeyCard, controls(d));
  }

  /* ---------- dashboard ---------- */
  function rangeControl(r, apply, idp) {
    const wrap = el('div', {class: 'st-range', id: idp + 'Range'});
    const kinds = [['24h', '24 HOURS'], ['7d', '7 DAYS'], ['30d', '30 DAYS'], ['custom', 'CUSTOM RANGE']];
    const bar = el('div', {class: 'st-seg', role: 'group', 'aria-label': 'Time range'}, kinds.map(([k, t]) => button(t, () => { r.kind = k; r.note = ''; if (k !== 'custom') apply(); else renderDash(); }, {class: 'st-btn sm' + (r.kind === k ? ' on' : ''), 'data-range': k, 'aria-pressed': String(r.kind === k)})));
    const from = el('input', {type: 'date', class: 'wl-input st-date', id: idp + 'From', value: r.from, 'aria-label': 'From date (IST)'}), to = el('input', {type: 'date', class: 'wl-input st-date', id: idp + 'To', value: r.to, 'aria-label': 'To date (IST)'});
    from.disabled = to.disabled = r.kind !== 'custom';
    const ap = button('APPLY', () => { r.from = from.value; r.to = to.value; r.note = !r.from || !r.to ? 'Choose both dates.' : r.from > r.to ? 'The From date is after the To date.' : ''; if (!r.note) apply(); else renderDash(); }, {class: 'st-btn primary sm', id: idp + 'Apply'});
    ap.disabled = r.kind !== 'custom';
    wrap.append(bar, el('span', {class: 'st-lbl'}, 'FROM'), from, el('span', {class: 'st-lbl'}, 'TO'), to, ap, el('span', {class: 'st-warn', role: 'alert', id: idp + 'Note'}, r.note));
    return wrap;
  }
  const empty = (t, id) => el('p', {class: 'st-empty', id}, t);

  const views = {
    overview() {
      const {d, now} = model();
      const dwellOf = (v) => (v.exitedAt === null ? now : v.exitedAt) - v.openedAt;
      const total = d.visits.reduce((a, v) => a + dwellOf(v), 0), exits = d.visits.filter((v) => v.exitedAt !== null), lastOut = exits.length ? Math.max(...exits.map((v) => v.exitedAt)) : null;
      const rows = d.visits.map((v, i) => ({v, n: i + 1})).reverse(), pg = pager(rows.length, S.ovPage, 6, (p) => { S.ovPage = p; renderDash(); }, 'website records');
      S.ovPage = pg.page;
      const body = rows.length ? el('div', {class: 'st-tblwrap'}, el('table', {class: 'st-table', id: 'stVisitTable'}, el('thead', {}, el('tr', {}, ['#', 'Shopping website', 'Entered (IST)', 'Dwell', 'Exited (IST)', 'Recorded state'].map((h) => el('th', {}, h)))),
        el('tbody', {}, rows.slice(S.ovPage * 6, S.ovPage * 6 + 6).map(({v, n}) => { const vs = visitState(v); return el('tr', {'data-visit': v.key}, el('td', {}, String(n).padStart(2, '0')), el('td', {}, el('b', {}, v.site)), el('td', {}, stampDate(v.openedAt)),
          el('td', {}, v.exitedAt === null ? el('span', {class: 'mono', 'data-live': 'dwell', 'data-from': String(v.openedAt)}, dur(now - v.openedAt) + ' (so far)') : dur(v.exitedAt - v.openedAt)),
          el('td', {}, v.exitedAt === null ? 'ON SITE' : stampDate(v.exitedAt)), el('td', {class: 't-' + vs.tone}, vs.label)); })))) : empty('No shopping website visits have been recorded.', 'stVisitsEmpty');
      return [el('h2', {class: 'st-sec'}, 'STORE — OVERVIEW'), banner(d, now, 'stO'),
        el('div', {class: 'st-tiles3'},
          el('div', {class: 'st-tile h'}, svgIcon(ICON.home), el('div', {}, el('span', {}, 'SHOPPING WEBSITES VISITED'), el('b', {id: 'stOVisits'}, String(d.counts.visits)), el('small', {}, 'Observed website entries'))),
          el('div', {class: 'st-tile h'}, svgIcon(ICON.clock), el('div', {}, el('span', {}, 'TIME DWELLED'), el('b', {id: 'stODwell', 'data-live': 'total', class: 'mono'}, clockDur(total)), el('small', {}, 'Total observed shopping dwell (elapsed)'))),
          el('div', {class: 'st-tile h'}, svgIcon(ICON.exit), el('div', {}, el('span', {}, 'LAST CAME OUT'), el('b', {id: 'stOLast', class: 'mono'}, lastOut === null ? D : stamp(lastOut)), el('small', {}, lastOut === null ? 'No exit has been observed' : 'Last observed exit from a shopping site')))),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'WEBSITE ACTIVITY'), el('div', {class: 'st-right'}, pill(`TOTAL: ${d.counts.visits} VISIT${d.counts.visits === 1 ? '' : 'S'}`, 'ghost'), pg.node)),
          el('p', {class: 'st-hint'}, 'Where the shopping sites were opened, time spent, and when they were exited — all in IST (Asia/Kolkata).'), body),
        el('p', {class: 'st-foot'}, 'Browsing evidence only — an exit never proves that the user returned to the previous task, and nothing here reveals purchases, products or clicks inside a shopping site. "DEMO RETURN EVIDENCE" is a demonstration button, not a browser observation.')];
    },
    history() {
      const {d, now} = model(), w = windowOf(S.hist, now), list = newestFirst(d.episodes).filter((e) => inWin(e, w));
      const pg = pager(list.length, S.hPage, 10, (p) => { S.hPage = p; S.sel = null; renderDash(); }, 'episodes'); S.hPage = pg.page;
      const pageEps = list.slice(S.hPage * 10, S.hPage * 10 + 10);
      if (!pageEps.some((e) => e.key === S.sel)) S.sel = pageEps[0] ? pageEps[0].key : null;
      const cur = pageEps.find((e) => e.key === S.sel) || null;
      const strip = pageEps.length ? el('div', {class: 'st-eps', id: 'stEpStrip'}, pageEps.map((e, i) => el('button', {type: 'button', class: 'st-epc' + (e.key === S.sel ? ' on' : ''), id: 'stEp-' + e.key, 'data-episode': e.id, 'aria-pressed': String(e.key === S.sel), on: {click: () => { S.sel = e.key; renderDash(); }}},
        el('b', {}, '#' + String(S.hPage * 10 + i + 1).padStart(2, '0')), el('strong', {}, e.site.toUpperCase()), el('span', {}, `${ist(e.promptAt).date} · ${ist(e.promptAt).time.slice(0, 5)}`), el('em', {class: 't-' + epState(e).tone}, epShort(e))))) : null;
      return [el('h2', {class: 'st-sec'}, 'STORE — EPISODE HISTORY'),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'EPISODE HISTORY · TIME RANGE')), rangeControl(S.hist, () => { S.hPage = 0; S.sel = null; renderDash(); }, 'stH'),
          !w ? el('p', {class: 'st-hint'}, 'Choose a valid custom range and press APPLY.') : null),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'LATEST 10 SHOPPING EPISODES'), pg.node),
          el('p', {class: 'st-hint'}, 'Each card is one STORE episode (a shopping visit that reached the 10-minute threshold and was prompted). Choose an episode to view its observed event map. Times in IST.'),
          strip || empty(w ? 'No STORE episodes were recorded in this time range.' : 'No valid time range is applied.', 'stHistEmpty')),
        cur ? el('section', {class: 'card st-card', id: 'stSelected'}, el('div', {class: 'st-card-h'}, el('h3', {}, el('span', {}, 'SELECTED JOURNEY '), el('b', {class: 'st-id', id: 'stSelId'}, cur.id)), pill(epState(cur).label, epState(cur).tone)),
          el('p', {class: 'st-hint'}, `${cur.site} · observed event sequence · ${stampDate(cur.promptAt)}${cur.demoReturnAt !== null ? ' · ' + DEMO_NOTE : ''}`), nodeStrip(journey(cur), cur)) : null];
    },
    response() {
      const {d, now} = model(), w = windowOf(S.resp, now);
      const all = newestFirst(d.episodes).filter((e) => inWin(e, w)), list = all.filter((e) => S.site === 'ALL' || e.site === S.site);
      const pg = pager(list.length, S.rPage, 4, (p) => { S.rPage = p; renderDash(); }, 'response maps'); S.rPage = pg.page;
      const tally = (c) => list.filter((e) => e.choice === c).length, none = list.filter((e) => !e.choice).length;
      const chips = el('div', {class: 'st-seg', role: 'group', 'aria-label': 'Website filter'}, [['ALL', 'ALL WEBSITES'], ...SITES.map((s) => [s, s.toUpperCase()])].map(([k, t]) => button(t, () => { S.site = k; S.rPage = 0; renderDash(); }, {class: 'st-btn sm' + (S.site === k ? ' on' : ''), 'data-site': k, 'aria-pressed': String(S.site === k)})));
      const card = (e) => {
        const st = epState(e);
        const nodes = [[`${e.site} observed`, `Shopping dwell ${dur(e.promptAt - e.visit.openedAt)} at the prompt`, 'site'], ['STORE prompt', 'Displayed', 'prompt'],
          e.choice === 'IM_BACK' ? ["I'M BACK", 'Return intention only — not a verified return', 'resp']
            : e.choice ? [`I WANT TO SHOP — ${mmss(e.allowanceMs)}`, `Chosen time ends ${stamp(e.deadlineAt)}${e.capped ? ' (capped at 23:15 from entry)' : ''}`, 'resp'] : ['No response recorded', 'No button press was recorded', 'none'],
          e.state === 'ON_SITE' ? [e.elapsedAt !== null ? 'Chosen time elapsed' : 'Site still open', e.elapsedAt !== null ? `Elapsed ${stamp(e.elapsedAt)}; site still open` : 'No exit recorded yet', 'open']
            : e.demoReturnAt !== null ? ['DEMO RETURN EVIDENCE', DEMO_NOTE, 'demo'] : ['EXITED — NO RETURN EVIDENCE', 'Exit alone is not a return', 'exit']];
        const strip = el('div', {class: 'st-journey st-resp'}); nodes.forEach(([t, s, k], i) => { if (i) strip.append(el('div', {class: 'st-arrow', 'aria-hidden': 'true'}, el('span', {}, '→'))); strip.append(el('div', {class: 'st-node r-' + k}, el('strong', {}, t), el('span', {class: 'st-obs'}, s))); });
        return el('section', {class: 'card st-card', 'data-episode': e.id}, el('div', {class: 'st-card-h'}, el('div', {}, el('h3', {}, e.site), el('p', {class: 'st-hint'}, `STORE interaction on ${e.site} · ${stampDate(e.promptAt)}`)), el('div', {class: 'st-right'}, pill(st.label, st.tone), pill(e.id, 'ghost'))), strip);
      };
      return [el('h2', {class: 'st-sec'}, 'STORE — RESPONSE'),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('div', {}, el('h3', {}, 'USER RESPONSES DURING SHOPPING'), el('p', {class: 'st-hint'}, 'What was pressed in the STORE prompt while a shopping website was open. Recorded choices, IST.')), pill('RECORDED CHOICES · IST', 'ghost')),
          chips, rangeControl(S.resp, () => { S.rPage = 0; renderDash(); }, 'stR'),
          el('div', {class: 'st-tally', id: 'stTally'}, el('span', {}, `I'M BACK: `, el('b', {id: 'stTBack'}, String(tally('IM_BACK')))), el('span', {}, 'I WANT TO SHOP: ', el('b', {id: 'stTShop'}, String(tally('I_WANT_TO_SHOP')))), el('span', {}, 'No response recorded: ', el('b', {id: 'stTNone'}, String(none))))),
        ...(list.length ? list.slice(S.rPage * 4, S.rPage * 4 + 4).map(card) : [empty(w ? 'No STORE prompts were recorded for this website and time range.' : 'No valid time range is applied.', 'stRespEmpty')]),
        list.length ? el('div', {class: 'st-pagerow'}, pg.node) : null,
        el('p', {class: 'st-foot'}, 'The response map records STORE prompt selections only, not clicks inside a shopping site. I\'M BACK and I WANT TO SHOP are intentions; leaving the site is not a return, and a real return would need separate browser-observed evidence that is not defined yet.')];
    },
    about() {
      const g = (n, t, body, tag) => el('section', {class: 'card st-card st-about'}, el('span', {class: 'st-eyebrow'}, n), el('h3', {}, t), ...body.map((x) => el('p', {class: 'st-hint'}, x)), tag ? pill(tag, 'ghost') : null);
      const list = (id, items) => el('ul', {class: 'st-list', id}, items.map((t) => el('li', {}, t)));
      return [el('h2', {class: 'st-sec'}, 'STORE — ABOUT STORE'),
        el('section', {class: 'card st-card st-hero'}, svgIcon(ICON.home), el('div', {}, el('span', {class: 'st-eyebrow'}, 'MYELIN · MODULE PROFILE'), el('h2', {class: 'st-big'}, 'STORE'), el('b', {class: 'st-tagline'}, 'Shopping activity · intention · observed return'),
          el('p', {class: 'st-hint'}, 'STORE is a browser demonstration of how MYELIN could document visits to shopping websites, present a timed check-in, and record the difference between a user\'s choice and an observed return to another activity.'))),
        el('div', {class: 'st-grid2'},
          g('01', 'WHAT STORE OBSERVES', ['Shopping-site entry and exit events, dwell on the open site, the STORE prompt, the button the user pressed and the shopping time chosen.', 'In this web demonstration those events exist only when you press the simulation controls.'], 'BEHAVIOURAL EVIDENCE'),
          g('02', 'HOW AN EPISODE WORKS', ['When eligible shopping activity reaches 10 minutes, the STORE prompt is displayed and an episode is created. The user can choose I\'M BACK or I WANT TO SHOP. I\'M BACK records a return intention only. I WANT TO SHOP records an additional shopping time of up to 13 minutes 15 seconds; a shorter time is allowed.',
            'The combined time is limited to 23 minutes 15 seconds from the start of the shopping activity (10:00 + 13:15), not 13:15 in total. Leaving the site is recorded as an exit and is never a verified return.'], 'CHOICE ≠ VERIFIED RETURN'),
          g('03', 'TIME AND HISTORY', ['Every displayed clock time is Indian Standard Time (IST, UTC+05:30). Dwell values are elapsed durations. Episode ids are STO-DDMMYYYY-NN, numbered by prompt time within each IST date.', 'Episode History shows ten episode maps per page with 24-hour, 7-day, 30-day and custom date ranges.'], 'ASIA / KOLKATA'),
          g('04', 'SCIENTIFIC LIMITS', ['STORE does not measure attention, dopamine, purchasing decisions, personal intent, or the contents of shopping pages, and it makes no claim that it improves focus or prevents shopping.', 'The events on these pages are simulated demonstration events. Nothing is monitored or stored, and the web version cannot observe other applications or the operating system.'], 'NO NEURAL CLAIMS')),
        el('section', {class: 'card st-card', id: 'stImplemented'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'IMPLEMENTED IN THIS DEMONSTRATION'), pill('CONFIRMED RULES', 'good')),
          list('stImplementedList', ['Initial prompt at 10:00 of eligible shopping activity; episode created.', 'Buttons I\'M BACK (return intention only) and I WANT TO SHOP (chosen time 1 s to 13:15).', 'Combined limit 23:15 from the start of the shopping activity; a chosen time that would pass it is cut to it and marked "capped".', 'An exit is recorded as an exit and never counts as a return.'])),
        el('section', {class: 'card st-card', id: 'stDemoOnly'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'DEMONSTRATED ONLY — NOT BROWSER-OBSERVED'), pill('DEMO', 'info')),
          list('stDemoOnlyList', ['RECORD DEMONSTRATION RETURN EVIDENCE is a button pressed by the visitor. This browser cannot observe or verify that a person returned to another activity; the RETURNS tile counts these demonstration events only.', 'One response per episode and one demonstration evidence event per episode are rules of this demonstration, not approved rules.'])),
        el('section', {class: 'card st-card', id: 'stOpenDecisions'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'DESIGN DECISIONS STILL OPEN'), pill('NOT IMPLEMENTED — NOT INVENTED', 'warn')),
          list('stOpenDecisionsList', ['D1 · I\'M BACK follow-up: how long, what is checked, and whether prompts repeat.', 'D2 · Whether a response can change or repeat (e.g. I\'M BACK followed by I WANT TO SHOP).', 'D3 · How the shopping time is chosen in the real prompt (free value or presets), and whether it counts from the button press (used here, capped at 23:15) or from the 10:00 mark.',
            'D4 · What happens when the chosen shopping time ends: the final reminder, its wording, buttons and timing (here only the elapsed time is recorded).', 'D5 · What exactly starts "eligible shopping activity" (site entry is used here) and how several tabs / unfocused time count.',
            'D6 · The browser-observable evidence that verifies a real return, and the time it must last.', 'D7 · When an episode closes and what its outcomes are called (no closure or outcome name is shown).', 'D8 · Conflict rules with other MYELIN organs and between several shopping sites.', 'D9 · The approved list of supported shopping sites (Amazon, Flipkart, Myntra, Other are demonstration entries).',
            'D10 · The content and format of the STORE report (GET STORE REPORT stays unavailable).'])),
        el('section', {class: 'card st-card st-evid'}, el('div', {}, el('b', {}, 'Evidence-first design'), el('p', {class: 'st-hint'}, 'Observed website activity and STORE response events are kept distinct from each other. Simulated events are never mixed with evidence imported from a database file; this module does not read an imported file.')), pill('SOURCE: SIMULATION', 'info'))];
    }
  };

  function dashChrome() {
    const open = model().d.activeEpisode;
    const chip = dash.querySelector('#stDashOpen');
    chip.textContent = open ? 'STORE: EPISODE OPEN' : 'STORE: NO OPEN EPISODE'; chip.className = 'st-pill ' + (open ? 'warn' : 'bad');
    [...dash.querySelectorAll('.st-nav button')].forEach((b) => { const on = b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function renderDash() {
    if (!dash) return;
    const focusId = document.activeElement && dash.contains(document.activeElement) ? document.activeElement.id : '';
    dashChrome(); const top = dashBody.scrollTop;
    dashBody.replaceChildren(...views[S.tab]().filter(Boolean)); dashBody.scrollTop = top;
    if (focusId) { const f = dash.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
  }
  function closeDash() { if (!dash) return; document.removeEventListener('keydown', onKey, true); dash.remove(); dash = null; dashBody = null; (opener && opener.isConnected ? opener : null)?.focus(); opener = null; }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDash(); return; }
    if (e.key === 'Tab' && dash) { const f = [...dash.querySelectorAll('button,select,input,[tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  }
  function openDash(from) {
    if (dash) { dash.querySelector('.glass-close')?.focus(); return; }
    opener = from || document.activeElement;
    const closeBtn = button('', closeDash, {class: 'glass-close', 'aria-label': 'Close STORE dashboard'}); closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const nav = el('nav', {class: 'st-nav', 'aria-label': 'STORE sections', role: 'tablist'}, TABS.map(([k, t], i) => { const b = el('button', {type: 'button', role: 'tab', 'data-tab': k, id: 'stTab-' + k, on: {click: () => { S.tab = k; renderDash(); }}}, t);
      b.addEventListener('keydown', (e) => { const n = e.key === 'ArrowDown' ? (i + 1) % TABS.length : e.key === 'ArrowUp' ? (i + TABS.length - 1) % TABS.length : null; if (n !== null) { e.preventDefault(); S.tab = TABS[n][0]; renderDash(); nav.children[n].focus(); } }); return b; }));
    dashBody = el('div', {class: 'st-body', id: 'stBody', role: 'tabpanel', tabindex: '-1'});
    const report = button('GET STORE REPORT', () => {}, {class: 'st-btn primary', id: 'stReport', title: 'The STORE report content and format have not been specified, so no report can be generated. Nothing is exported.'}); report.disabled = true;
    const openChip = pill('STORE: NO OPEN EPISODE', 'bad'); openChip.id = 'stDashOpen';
    dash = el('div', {class: 'glass-overlay open st-dash', id: 'stDash', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'stDashTitle'}, el('div', {class: 'glass-panel st-panel'},
      el('div', {class: 'st-head'}, el('b', {class: 'st-brand'}, 'MYELIN'), el('h2', {id: 'stDashTitle'}, 'LIVE STORE DASHBOARD'), el('div', {class: 'st-chips'}, openChip, pill('SIMULATION · DEMO DATA', 'good'), pill('IST · UTC+05:30', 'ghost'), closeBtn)),
      el('div', {class: 'st-sub2'}, el('span', {}, 'STORE · Shopping Activity & Intervention Evidence'), el('span', {}, 'Web demonstration, not OS monitoring'), el('span', {class: 'st-spacer'}), el('span', {class: 'st-warn', id: 'stReportWhy'}, 'Report unavailable: content and format not yet specified.'), report),
      el('div', {class: 'st-split'}, el('div', {class: 'st-side'}, el('span', {class: 'st-eyebrow'}, 'STORE SECTIONS'), nav), dashBody),
      el('div', {class: 'st-foot2'}, el('span', {}, 'MYELIN WEB LITE · STORE'), el('span', {}, 'SIMULATED EVENTS · ALL TIMES IST'))));
    dash.addEventListener('mousedown', (e) => { if (e.target === dash) closeDash(); });
    document.body.append(dash); document.addEventListener('keydown', onKey, true); renderDash(); closeBtn.focus();
  }

  /* ---------- page host, live text, refresh ---------- */
  function render() {
    if (host) {
      const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '';
      host.replaceChildren(mainPage());
      if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    }
    if (dash) renderDash();
    showCard(popupSpec(), {owner: 'store', alive: hostActive(() => host)});
  }
  function live() {
    const now = ledger.clock();
    for (const n of document.querySelectorAll('[data-live]')) {
      const from = Number(n.dataset.from), k = n.dataset.live;
      if (k === 'threshold') n.textContent = ` · ${mmss(Math.min(now - from, THRESHOLD_MS))} of 10:00`;
      else if (k === 'allowance') n.textContent = ` · ${mmss(Math.max(0, Number(n.dataset.to) - now))} left`;
      else if (k === 'dwell') n.textContent = dur(now - from) + ' (so far)';
      else if (k === 'total') { const d = ledger.derive(); n.textContent = clockDur(d.visits.reduce((a, v) => a + ((v.exitedAt === null ? now : v.exitedAt) - v.openedAt), 0)); }
    }
  }
  let timer = null;
  function start() {
    if (timer) return;
    ledger.subscribe(() => { if ((host && host.classList.contains('active')) || dash) render(); });
    timer = setInterval(() => { if ((host && host.classList.contains('active')) || dash) { ledger.tick(); live(); showCard(popupSpec(), {owner: 'store', alive: hostActive(() => host)}); } }, 1000);
  }
  return {
    /** Draws the STORE main page into its page host (also re-called when the page becomes visible). */
    mount(h) { host = h; start(); render(); },
    openDashboard: openDash, closeDashboard: closeDash, get dashboardOpen() { return !!dash; }
  };
}
