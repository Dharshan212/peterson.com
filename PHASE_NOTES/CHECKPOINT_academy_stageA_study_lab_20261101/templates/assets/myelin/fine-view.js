// FINE — main page and four-section dashboard (Overview · Episode History · Ordering Analytics · About FINE) plus a simulation-only report, over the SIMULATED ledger in fine-model.js.
// Visual reference only: the supplied FINE designs. Every number, row, map node and chart point is derived from recorded ledger events; example values in the designs are never shown.
// All clock times are IST (Asia/Kolkata, UTC+05:30). Nothing is persisted or uploaded, nothing reads an imported file, and no ordering / payment API exists.
import {el, button} from './dom.js';
import {showCard, hostActive} from './popup-stage.js';
import {SITES, CHOICES, OUTCOMES, ist, istDayStart, istDayEnd, dur, clockDur, mmss, journey} from './fine-model.js';

const D = '—', HOUR = 3600000, DAY = 24 * HOUR, IST_MS = 19800000;
const DEMO_NOTE = 'Demonstration return — pressed by the visitor, NOT observed or verified by the browser.';
const stamp = (ms) => `${ist(ms).time} IST`;
const stampDate = (ms) => `${ist(ms).date} · ${ist(ms).time} IST`;
const SITE_COLOURS = ['#f43f5e', '#fb923c', '#22c55e', '#a78bfa', '#38bdf8'];
const SERIES = [['ORDER_PLACED', 'Successful orders', '#22c55e'], ['NO_ORDER', 'No order placed', '#60a5fa'], ['ATTEMPT_FAILED', 'Attempted, not completed', '#f43f5e']];
const svgNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); kids.forEach((c) => n.append(c)); return n; };
const svgIcon = (d) => { const s = el('span', {class: 'st-ic', 'aria-hidden': 'true'}); s.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; return s; };
const ICON = {fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-2 2-3 5-3 8h3v10"/>', ret: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', last: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/>'};

/** What the recorded facts of a visit say, in words. Never an invented outcome. */
function summaryOf(v) {
  const p = [v.isEpisode ? 'warning displayed' : 'no warning'];
  if (v.choice) p.push(CHOICES[v.choice].toLowerCase() + ' chosen');
  if (v.breakStartAt !== null) p.push(v.breakEndAt !== null ? 'break finished' : 'break running');
  p.push(v.exitedAt === null ? 'still on site' : 'site exited');
  if (v.returnAt !== null) p.push('return recorded (demo)');
  p.push(v.outcome ? OUTCOMES[v.outcome].toLowerCase() : 'ordering outcome not recorded');
  return p.join(' · ');
}
const outTone = (o) => (o === 'ORDER_PLACED' ? 'good' : o === 'ATTEMPT_FAILED' ? 'bad' : o === 'NO_ORDER' ? 'info' : 'muted');

export function createFineView({ledger}) {
  let host = null, dash = null, dashBody = null, opener = null, msg = '';
  const S = {tab: 'overview', mainIdx: 0, hPage: 0, sel: null, report: false,
    hist: {kind: '24h', from: '', to: '', note: ''}, ana: {kind: '7d', from: '', to: '', note: ''}};
  const TABS = [['overview', 'Overview'], ['history', 'Episode History'], ['analytics', 'Ordering Analytics'], ['about', 'About FINE']];

  const model = () => ({d: ledger.derive(), now: ledger.clock()});
  const windowOf = (r, now) => {
    if (r.kind === '24h') return {lo: now - DAY, hi: now};
    if (r.kind === '7d') return {lo: now - 7 * DAY, hi: now};
    if (r.kind === '30d') return {lo: now - 30 * DAY, hi: now};
    if (!r.from || !r.to) return null;
    const lo = istDayStart(r.from), hi = istDayEnd(r.to);
    return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi ? {lo, hi} : null;
  };
  const within = (t, w) => !!w && t !== null && t >= w.lo && t <= w.hi;
  const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
  const empty = (t, id) => el('p', {class: 'st-empty', id}, t);
  function pager(total, page, size, set, label) {
    const pages = Math.max(1, Math.ceil(total / size)), p = Math.min(Math.max(0, page), pages - 1), a = total ? p * size + 1 : 0, b = Math.min(total, (p + 1) * size);
    const newer = button('‹ NEWER', () => set(p - 1), {class: 'st-btn sm', 'aria-label': `Newer ${label}`}), older = button('OLDER ›', () => set(p + 1), {class: 'st-btn sm', 'aria-label': `Older ${label}`});
    newer.disabled = p <= 0; older.disabled = p >= pages - 1;
    return {page: p, node: el('div', {class: 'st-pager'}, el('span', {class: 'st-count'}, total ? `${String(a).padStart(2, '0')}–${String(b).padStart(2, '0')} OF ${total}` : '0 OF 0'), newer, older)};
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
    wrap.append(bar, el('span', {class: 'st-lbl'}, 'FROM'), from, el('span', {class: 'st-lbl'}, 'TO'), to, ap, el('span', {class: 'st-warn', role: 'alert', id: idp + 'Note'}, r.note));
    return wrap;
  }
  const mostVisited = (d) => { const m = new Map(SITES.map((s) => [s, 0])); d.visits.forEach((v) => m.set(v.site, m.get(v.site) + 1)); return [...m].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || SITES.indexOf(a[0]) - SITES.indexOf(b[0])); };

  /* ---------- the centred simulated popup (popup-stage.js): the FINE warning, derived from the recorded state only ---------- */
  function popupSpec() {
    const a = model().d.active;
    if (!host || !host.classList.contains('active') || !a || a.warningAt === null || a.choice) return null;
    return {sig: `fine-${a.key}`, label: 'FINE POPUP', world: 'green', badge: 'FINE', eyebrow: 'MYELIN · FINE · SIMULATION', headline: 'Food-ordering warning', message: `A FINE distraction warning was displayed on ${a.site}.`, lines: [`SITE: ${a.site}`],
      status: 'DISPLAYED · AWAITING YOUR CHOICE', buttons: [{label: 'TAKE A BREAK', id: 'fnPopBreak', onClick: () => ledger.respond('TAKE_A_BREAK')}, {label: 'CONTINUE ORDERING', id: 'fnPopContinue', onClick: () => ledger.respond('CONTINUE_ORDERING')}],
      footer: 'FINE · SIMULATION · NO REAL ORDER OR PAYMENT', aria: 'FINE popup (simulation)'};
  }

  /* ---------- simulation controls ---------- */
  function controls(d) {
    const act = (fn) => () => { const r = fn(); msg = r && r.ok === false ? r.reason : ''; render(); };
    const sel = el('select', {class: 'wl-input st-select', id: 'fnSite', 'aria-label': 'Demonstration food-ordering site'}, SITES.map((s) => el('option', {value: s}, s)));
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const a = d.active, lv = d.visits[d.visits.length - 1] || null, running = d.visits.some((v) => v.breakStartAt !== null && v.breakEndAt === null);
    const canOutcome = !!lv && !lv.outcome;
    const log = ledger.events.slice(-12).reverse();
    return el('section', {class: 'card st-card', id: 'fnControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SIMULATION CONTROLS'), pill('DEMO EVENTS ONLY', 'warn')),
      el('p', {class: 'st-hint'}, 'Nothing is monitored and no real order, payment or ordering service is involved. A visit exists only when you press OPEN SITE. The warning, the response, the break and the return are demonstration choices; ordering outcomes (placed / not placed / attempted but not completed) are recorded separately by you and are never inferred from a visit. "Return" is a demonstration button, not a browser observation.'),
      el('div', {class: 'st-ctl'}, mk('TRIGGER FINE WARNING', 'fnTrigger', () => { if (!a) { const r0 = ledger.openSite(sel.value); if (r0 && r0.ok === false) return r0; } return ledger.showWarning(); }, true, 'primary'),
        sel, mk('OPEN SITE', 'fnOpen', () => ledger.openSite(sel.value), !a), mk('+1 MIN', 'fnAdv1', () => ledger.advance(60000), true), mk('+1 HOUR', 'fnAdv60', () => ledger.advance(HOUR), true),
        mk('BROWSE MENU', 'fnBrowse', () => ledger.browseMenu(), !!a && a.browsedAt === null), mk('SHOW FINE WARNING', 'fnWarn', () => ledger.showWarning(), !!a && a.warningAt === null),
        mk('TAKE A BREAK', 'fnBreak', () => ledger.respond('TAKE_A_BREAK'), !!a && a.warningAt !== null && !a.choice), mk('CONTINUE ORDERING', 'fnContinue', () => ledger.respond('CONTINUE_ORDERING'), !!a && a.warningAt !== null && !a.choice),
        mk('FINISH BREAK', 'fnEndBreak', () => ledger.finishBreak(), running), mk('EXIT SITE', 'fnExit', () => ledger.exitSite(), !!a),
        mk('RECORD DEMONSTRATION RETURN (NOT BROWSER-OBSERVED)', 'fnReturn', () => ledger.recordReturn(), !!lv && lv.exitedAt !== null && lv.returnAt === null && !running, 'demo'),
        mk('CLEAR DEMO DATA', 'fnClear', () => { S.mainIdx = S.hPage = 0; S.sel = null; return ledger.clear(); }, ledger.events.length > 0, 'ghost')),
      el('div', {class: 'st-ctl st-allow', id: 'fnOutcomeRow'}, el('span', {class: 'st-lbl'}, 'RECORD ORDERING OUTCOME OF THE LATEST VISIT (separate choice):'),
        mk('ORDER PLACED', 'fnOrdered', () => ledger.recordOutcome('ORDER_PLACED'), canOutcome), mk('NO ORDER PLACED', 'fnNoOrder', () => ledger.recordOutcome('NO_ORDER'), canOutcome), mk('ATTEMPTED, NOT COMPLETED', 'fnFailed', () => ledger.recordOutcome('ATTEMPT_FAILED'), canOutcome)),
      el('p', {class: 'st-msg', id: 'fnMsg', role: 'status', 'aria-live': 'polite'}, msg),
      el('h4', {class: 'st-sub'}, 'Recorded events (latest 12, newest first)'),
      log.length ? el('ol', {class: 'st-log', id: 'fnLog'}, log.map((e) => el('li', {}, el('span', {class: 'mono'}, `${ist(e.at).date} ${stamp(e.at)}`), el('b', {}, e.type), el('span', {}, [e.site, e.choice && CHOICES[e.choice], e.outcome && OUTCOMES[e.outcome]].filter(Boolean).join(' · ')))))
        : el('p', {class: 'st-hint', id: 'fnLogEmpty'}, 'No FINE events recorded yet.'));
  }

  /* ---------- main page ---------- */
  const tile = (n, label, id, hint, flag) => el('div', {class: 'st-tile'}, el('b', {id}, String(n)), el('span', {}, label), flag ? pill(flag, 'warn') : null, el('small', {}, hint));
  function statusOf(d) {
    const a = d.active;
    if (a && a.isEpisode) return {open: true, text: `Episode ${a.id} — ${a.choice ? CHOICES[a.choice].toLowerCase() + ' chosen' : 'warning displayed'}${a.breakStartAt !== null && a.breakEndAt === null ? ', break running' : ''}`, state: 'ACTIVE'};
    if (a) return {open: false, text: `No active episode — ${a.site} open`, state: 'INACTIVE'};
    return {open: false, text: 'No active episode', state: 'INACTIVE'};
  }
  function banner(d, idp) {
    const s = statusOf(d);
    return el('div', {class: `st-banner${s.open ? ' open' : ''}`, id: idp + 'Banner'}, el('div', {}, el('span', {class: 'st-eyebrow'}, el('i', {}), 'EPISODE'), el('b', {class: 'st-status', id: idp + 'Status'}, s.text)), el('div', {class: 'st-latest'}, el('b', {id: idp + 'State', class: s.open ? 't-warn' : 't-muted'}, s.state)));
  }
  function mainPage() {
    const {d} = model(), c = d.counts, ep = d.latestEpisode;
    const flow = el('section', {class: 'card st-card', id: 'fnFlowCard'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'fnFlowTitle'}, ep ? `Recent FINE Episode Flow — ${ep.id}` : 'Recent FINE Episode Flow'), el('span', {class: 'st-count'}, ep ? `${journey(ep).length} recorded events` : 'no episode recorded')),
      el('p', {class: 'st-hint'}, 'Complete journey from website entry to return, built only from recorded events.'),
      ep ? [nodeStrip(journey(ep)), ep.returnAt !== null ? el('p', {class: 'st-hint', id: 'fnFlowDemo'}, DEMO_NOTE) : null] : el('p', {class: 'st-hint', id: 'fnFlowEmpty'}, 'No FINE episode has been recorded. An episode is created when a FINE warning is displayed on an open food-ordering visit. Use the simulation controls below.'));
    const top = mostVisited(d), total = d.visits.length;
    const most = el('section', {class: 'card st-card', id: 'fnMostCard'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'MOST VISITED FOOD WEBSITE'), pill('BY OBSERVED ENTRIES', 'ghost')),
      top.length ? el('div', {class: 'fn-bars', id: 'fnMostBars'}, top.map(([s, n]) => el('div', {class: 'fn-bar', 'data-site': s}, el('span', {}, s), el('div', {class: 'fn-track'}, el('i', {style: `width:${Math.round(100 * n / total)}%`})), el('b', {}, `${n} ${n === 1 ? 'entry' : 'entries'} · ${Math.round(100 * n / total)}%`))))
        : el('p', {class: 'st-hint', id: 'fnMostEmpty'}, 'No food-ordering website entries recorded.'), top.length ? el('p', {class: 'st-hint', id: 'fnMostTop'}, `Most visited: ${top[0][0]} (${top[0][1]})`) : null);
    const done = d.visits.filter((v) => v.exitedAt !== null), durs = done.map((v) => v.exitedAt - v.openedAt);
    const beh = el('section', {class: 'card st-card', id: 'fnBehaviour'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'PLATFORM BEHAVIOUR')),
      el('div', {class: 'st-tiles3'}, [['TOTAL SESSIONS', String(total), 'fnBSessions', 'Distinct food-ordering visits'], ['AVERAGE SESSION DURATION', durs.length ? dur(durs.reduce((a, b) => a + b, 0) / durs.length) : D, 'fnBAvg', 'Exited visits only'], ['LONGEST SESSION', durs.length ? dur(Math.max(...durs)) : D, 'fnBLongest', 'Exited visits only']].map(([l, v, id, h]) => el('div', {class: 'st-tile'}, el('span', {}, l), el('b', {id, class: 'fn-small'}, v), el('small', {}, h)))));
    const latest = ledger.events.slice(-5).reverse();
    const lev = el('section', {class: 'card st-card', id: 'fnLatest'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'LATEST EVENTS'), el('span', {class: 'st-count'}, `Last ${latest.length} of ${ledger.events.length} recorded`)),
      latest.length ? el('ol', {class: 'st-log'}, latest.map((e) => el('li', {}, el('span', {class: 'mono'}, stamp(e.at)), el('b', {}, e.type.replaceAll('_', ' ')), el('span', {}, [e.site, e.choice && CHOICES[e.choice], e.outcome && OUTCOMES[e.outcome]].filter(Boolean).join(' · '))))) : el('p', {class: 'st-hint'}, 'No events recorded yet.'));
    return el('div', {class: 'mh-wrap st-wrap', id: 'fnMain', 'aria-label': 'FINE'},
      el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'FINE — FOOD ORDERING REGULATION'), el('p', {class: 'st-hint'}, 'Food-ordering website activity and return behaviour. Browser simulation — not OS monitoring and no real orders. All times IST.')),
        el('div', {class: 'st-chips'}, pill('SOURCE: SIMULATION (DEMO EVENTS)', 'info'), pill('IST · UTC+05:30', 'ghost'), button('REFRESH', () => render(), {class: 'st-btn', id: 'fnRefresh'}), button('OPEN FINE DASHBOARD', (e) => openDash(e.currentTarget), {class: 'st-btn primary', id: 'fnOpenDash'}))),
      banner(d, 'fn'),
      el('div', {class: 'fn-tiles4', id: 'fnTiles'}, tile(c.entries, 'FOOD WEBSITE ENTRIES', 'fnEntries', 'Total number of times a food-ordering website was entered'), tile(c.warnings, 'DISTRACTION WARNINGS', 'fnWarnings', 'FINE warnings displayed'),
        tile(c.returnsWithoutOrdering, 'RETURNS WITHOUT ORDERING', 'fnNoOrderReturns', 'Returns whose visit was separately recorded as "no order placed"', 'DEMO RETURNS'), tile(c.returnsAfterBreak, 'RETURNED AFTER FINISHED BREAK', 'fnBreakReturns', 'Returns made after a food break was finished', 'DEMO RETURNS')),
      el('div', {class: 'fn-grid'}, flow, most), el('div', {class: 'fn-grid'}, beh, lev), controls(d));
  }

  /* ---------- dashboard views ---------- */
  const views = {
    overview() {
      const {d} = model(), c = d.counts, recent = d.visits.slice().reverse().slice(0, 6);
      return [el('h2', {class: 'st-sec'}, 'FINE — OVERVIEW'), banner(d, 'fnO'),
        el('div', {class: 'st-tiles3'},
          el('div', {class: 'st-tile h'}, svgIcon(ICON.fork), el('div', {}, el('span', {}, 'TOTAL EPISODES'), el('b', {id: 'fnOEpisodes'}, String(c.episodes)), el('small', {}, 'Episodes created when a FINE warning was displayed'))),
          el('div', {class: 'st-tile h'}, svgIcon(ICON.ret), el('div', {}, el('span', {}, 'RETURNS'), el('b', {id: 'fnOReturns'}, String(c.returns)), el('small', {}, 'Demonstration returns recorded — not browser-observed'))),
          el('div', {class: 'st-tile h'}, svgIcon(ICON.last), el('div', {}, el('span', {}, 'LAST RECORDED OUTCOME'), el('b', {id: 'fnOLast', class: 'fn-small t-' + outTone(d.lastOutcome)}, d.lastOutcome ? OUTCOMES[d.lastOutcome] : D), el('small', {}, 'Latest separately recorded ordering outcome')))),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'RECENT ACTIVITY'), pill(`${recent.length} OF ${d.visits.length} VISITS`, 'ghost')),
          recent.length ? el('ol', {class: 'fn-recent', id: 'fnRecent'}, recent.map((v) => el('li', {'data-visit': v.key}, el('span', {class: 'mono'}, stampDate(v.openedAt)), el('b', {}, v.site), el('span', {}, summaryOf(v))))) : empty('No food-ordering activity has been recorded.', 'fnRecentEmpty')),
        el('p', {class: 'st-foot'}, 'Everything on this page is simulation evidence: no real website, order or person was observed.')];
    },
    history() {
      const {d, now} = model(), w = windowOf(S.hist, now), list = d.episodes.filter((v) => within(v.warningAt, w)).sort((a, b) => b.warningAt - a.warningAt);
      const pg = pager(list.length, S.hPage, 10, (p) => { S.hPage = p; S.sel = null; renderDash(); }, 'episodes'); S.hPage = pg.page;
      const pageEps = list.slice(S.hPage * 10, S.hPage * 10 + 10);
      if (!pageEps.some((e) => e.key === S.sel)) S.sel = pageEps[0] ? pageEps[0].key : null;
      const cur = pageEps.find((e) => e.key === S.sel) || null;
      const strip = pageEps.length ? el('div', {class: 'st-eps', id: 'fnEpStrip'}, pageEps.map((e) => el('button', {type: 'button', class: 'st-epc' + (e.key === S.sel ? ' on' : ''), id: 'fnEp-' + e.key, 'data-episode': e.id, 'aria-pressed': String(e.key === S.sel), on: {click: () => { S.sel = e.key; renderDash(); }}},
        el('b', {}, e.id), el('strong', {}, e.site.toUpperCase()), el('span', {}, `${ist(e.warningAt).date} · ${ist(e.warningAt).time.slice(0, 5)}`), el('em', {class: 't-' + outTone(e.outcome)}, e.outcome ? OUTCOMES[e.outcome] : 'OUTCOME NOT RECORDED')))) : null;
      return [el('h2', {class: 'st-sec'}, 'FINE — EPISODE HISTORY'),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'EPISODE HISTORY · TIME RANGE')), rangeControl(S.hist, () => { S.hPage = 0; S.sel = null; renderDash(); }, 'fnH'), !w ? el('p', {class: 'st-hint'}, 'Choose a valid custom range and press APPLY.') : null),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'FINE EPISODES · LATEST FIRST'), pg.node),
          el('p', {class: 'st-hint'}, 'Each card is one FINE episode (a food-ordering visit on which a FINE warning was displayed). Choose an episode to view its journey map. Ten per page, times in IST.'),
          strip || empty(w ? 'No FINE episodes were recorded in this time range.' : 'No valid time range is applied.', 'fnHistEmpty')),
        cur ? el('section', {class: 'card st-card', id: 'fnSelected'}, el('div', {class: 'st-card-h'}, el('h3', {}, el('span', {}, 'EPISODE JOURNEY '), el('b', {class: 'st-id', id: 'fnSelId'}, cur.id)), pill(cur.outcome ? OUTCOMES[cur.outcome] : 'OUTCOME NOT RECORDED', outTone(cur.outcome))),
          el('p', {class: 'st-hint'}, `${cur.site} · ${stampDate(cur.warningAt)} · ${summaryOf(cur)}`), nodeStrip(journey(cur)), cur.returnAt !== null ? el('p', {class: 'st-hint'}, DEMO_NOTE) : null) : null];
    },
    analytics() {
      const {d, now} = model(), w = windowOf(S.ana, now);
      const outs = d.visits.filter((v) => v.outcome && within(v.outcomeAt, w)), n = (o) => outs.filter((v) => v.outcome === o).length;
      const vis = d.visits.filter((v) => within(v.openedAt, w)), unrec = vis.filter((v) => !v.outcome).length;
      const hourly = S.ana.kind === '24h', step = hourly ? HOUR : DAY, lo = w ? Math.floor((w.lo + IST_MS) / step) * step - IST_MS : 0, hi = w ? w.hi : 0;
      const buckets = []; if (w) for (let t = lo; t <= hi && buckets.length < 120; t += step) buckets.push(t);
      const count = (o, b) => outs.filter((v) => v.outcome === o && v.outcomeAt >= b && v.outcomeAt < b + step).length;
      const chart = (() => {
        if (!w) return empty('No valid time range is applied.', 'fnLineEmpty');
        if (!outs.length) return empty('No ordering outcomes were recorded in this time range, so there is no line graph.', 'fnLineEmpty');
        const W = 720, H = 240, L = 40, R = 14, T = 14, B = 34, max = Math.max(3, ...SERIES.flatMap(([o]) => buckets.map((b) => count(o, b)))), x = (i) => L + (buckets.length > 1 ? i * (W - L - R) / (buckets.length - 1) : 0), y = (v) => T + (H - T - B) * (1 - v / max);
        const s = svg('svg', {viewBox: `0 0 ${W} ${H}`, class: 'fn-svg', id: 'fnLine', role: 'img', 'aria-label': 'Ordering outcomes over time'});
        for (let g = 0; g <= max; g++) { s.append(svg('line', {x1: L, x2: W - R, y1: y(g), y2: y(g), class: 'fn-grid-l'})); const t = svg('text', {x: L - 6, y: y(g) + 4, 'text-anchor': 'end', class: 'fn-ax'}); t.textContent = String(g); s.append(t); }
        const every = Math.max(1, Math.ceil(buckets.length / 8));
        buckets.forEach((b, i) => { if (i % every) return; const t = svg('text', {x: x(i), y: H - 12, 'text-anchor': 'middle', class: 'fn-ax'}); t.textContent = hourly ? ist(b + 1).time.slice(0, 2) + ':00' : ist(b + 1).date.slice(0, 5); s.append(t); });
        for (const [o, label, colour] of SERIES) {
          const pts = buckets.map((b, i) => [x(i), y(count(o, b)), count(o, b)]);
          s.append(svg('polyline', {points: pts.map((p) => p[0] + ',' + p[1]).join(' '), fill: 'none', stroke: colour, 'stroke-width': 2, 'data-series': o}));
          pts.forEach((p, i) => s.append(svg('circle', {cx: p[0], cy: p[1], r: 3, fill: colour, 'data-series': o, 'data-count': p[2], 'data-bucket': buckets[i]})));
        }
        return s;
      })();
      const bySite = SITES.map((s) => [s, vis.filter((v) => v.site === s).length]).filter(([, k]) => k > 0).sort((a, b) => b[1] - a[1]), tot = vis.length;
      const pie = (() => {
        if (!tot) return empty('No food-ordering website entries were recorded in this time range.', 'fnPieEmpty');
        const C = 2 * Math.PI * 54, s = svg('svg', {viewBox: '0 0 160 160', class: 'fn-pie', id: 'fnPie', role: 'img', 'aria-label': 'Most-used food-ordering websites'});
        s.append(svg('circle', {cx: 80, cy: 80, r: 54, fill: 'none', class: 'fn-ring', 'stroke-width': 24}));
        let off = 0; bySite.forEach(([site, k], i) => { const len = k / tot * C; s.append(svg('circle', {cx: 80, cy: 80, r: 54, fill: 'none', stroke: SITE_COLOURS[i % 5], 'stroke-width': 24, 'stroke-dasharray': `${len} ${C}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 80 80)', 'data-site': site, 'data-count': k})); off += len; });
        const t = svg('text', {x: 80, y: 86, 'text-anchor': 'middle', class: 'fn-pie-v'}); t.textContent = String(tot); s.append(t); return s;
      })();
      return [el('h2', {class: 'st-sec'}, 'FINE — ORDERING ANALYTICS'),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'TIME RANGE')), rangeControl(S.ana, () => renderDash(), 'fnA')),
        el('div', {class: 'st-tiles3'},
          el('div', {class: 'st-tile h'}, svgIcon(ICON.fork), el('div', {}, el('span', {}, 'SUCCESSFUL ORDERS'), el('b', {id: 'fnASuccess', class: 't-good'}, String(n('ORDER_PLACED'))), el('small', {}, 'Separately recorded "order placed" choices'))),
          el('div', {class: 'st-tile h'}, svgIcon(ICON.ret), el('div', {}, el('span', {}, 'VISITS WITH NO ORDER PLACED'), el('b', {id: 'fnANone', class: 't-info'}, String(n('NO_ORDER'))), el('small', {}, 'Separately recorded "no order placed" choices'))),
          el('div', {class: 'st-tile h'}, svgIcon(ICON.last), el('div', {}, el('span', {}, 'ATTEMPTED, NOT COMPLETED'), el('b', {id: 'fnAFailed', class: 't-bad'}, String(n('ATTEMPT_FAILED'))), el('small', {}, 'Separately recorded unsuccessful attempts')))),
        el('p', {class: 'st-hint', id: 'fnAUnrec'}, `${unrec} visit${unrec === 1 ? '' : 's'} in this range ${unrec === 1 ? 'has' : 'have'} no ordering outcome recorded; they are not counted as ordered, not ordered or failed.`),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'ORDERING ACTIVITY OVER TIME'), pill(hourly ? 'PER HOUR · IST' : 'PER DAY · IST', 'ghost')),
          el('p', {class: 'st-hint'}, 'Counts of the recorded ordering outcomes by the time each outcome was recorded.'), chart,
          el('div', {class: 'fn-legend', id: 'fnLineLegend'}, SERIES.map(([o, l, c]) => el('span', {}, el('i', {style: `background:${c}`}), l)))),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'MOST-USED FOOD-ORDERING WEBSITES'), pill('BASED ON VISITS, NOT ORDERS', 'warn')),
          el('p', {class: 'st-hint'}, 'Share of observed website entries (visits) in the range. A visit does not show that an order was placed.'),
          el('div', {class: 'fn-piewrap'}, pie, tot ? el('ul', {class: 'st-list fn-pielist', id: 'fnPieList'}, bySite.map(([s, k], i) => el('li', {'data-site': s}, el('i', {style: `background:${SITE_COLOURS[i % 5]}`}), `${s} — ${k} (${Math.round(100 * k / tot)}%)`))) : null))];
    },
    about() {
      const g = (n, t, body) => el('section', {class: 'card st-card st-about'}, el('span', {class: 'st-eyebrow'}, n), el('h3', {}, t), ...body.map((x) => el('p', {class: 'st-hint'}, x)));
      const list = (id, items) => el('ul', {class: 'st-list', id}, items.map((t) => el('li', {}, t)));
      const flow = ['Website entered', 'Browsing menu', 'Warning shown', 'Response', 'Break (optional)', 'Website exited', 'Return to main activity', 'Ordering outcome recorded'];
      return [el('h2', {class: 'st-sec'}, 'FINE — ABOUT FINE'),
        el('section', {class: 'card st-card st-hero'}, svgIcon(ICON.fork), el('div', {}, el('span', {class: 'st-eyebrow'}, 'MYELIN · MODULE PROFILE'), el('h2', {class: 'st-big'}, 'FINE'), el('b', {class: 'st-tagline'}, 'Food Ordering Regulation'),
          el('p', {class: 'st-hint'}, 'FINE is a browser demonstration of how MYELIN could document visits to food-ordering websites, show a mindful warning, and separate what the user chose from what was actually recorded. It is a research-style simulation, not a clinical tool.'))),
        el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'INTERACTION FLOW'), pill('SIMULATED', 'warn')),
          el('div', {class: 'st-journey', id: 'fnAboutFlow'}, flow.flatMap((t, i) => [i ? el('div', {class: 'st-arrow', 'aria-hidden': 'true'}, el('span', {}, '→')) : null, el('div', {class: 'st-node'}, el('b', {class: 'st-n'}, '#' + (i + 1)), el('strong', {}, t))]).filter(Boolean)),
          el('p', {class: 'st-hint'}, 'Only steps that actually occur appear on a journey map; a different visit produces a different path.')),
        el('section', {class: 'card st-card', id: 'fnAboutMetrics'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'WHAT THE METRICS MEAN')),
          list('fnAboutMetricsList', ['Food website entries — the number of times a food-ordering website was entered (one entry = one visit).', 'Distraction warnings — the number of FINE warnings displayed; each warning creates one episode.',
            'Returns without ordering — demonstration returns on visits that were separately recorded as "no order placed".', 'Returned after finished break — demonstration returns made after a food break was finished.',
            'Successful orders / no order placed / attempted, not completed — three separately recorded simulation choices. A visit, a cart or an exit never decides them; a visit without a recorded outcome is counted in none of them.', 'Most visited website — a count of entries, not of orders.'])),
        el('section', {class: 'card st-card', id: 'fnAboutLimits'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SIMULATION AND PRIVACY LIMITATIONS'), pill('NO REAL MONITORING', 'warn')),
          list('fnAboutLimitsList', ['All events are created by the buttons on the FINE page. Nothing is monitored; no real website, order, payment or person is involved, and no ordering or payment service is connected.', 'Nothing is stored, uploaded or read from an imported database file; the data disappears when the page is reloaded.',
            'The "return" is a demonstration button. This browser cannot observe or verify that a person returned to another activity.', 'FINE makes no claim to change eating behaviour, and does not measure attention, health, hunger or any brain state.'])),
        el('section', {class: 'card st-card', id: 'fnOpenDecisions'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'DESIGN DECISIONS STILL OPEN'), pill('NOT IMPLEMENTED — NOT INVENTED', 'warn')),
          list('fnOpenDecisionsList', ['F1 · What triggers a FINE warning (here: the SHOW FINE WARNING button) and its wording and buttons.', 'F2 · The real response choices and how long a food break lasts (here: TAKE A BREAK / CONTINUE ORDERING, with no duration rule).', 'F3 · The real evidence of a return and of a finished break.',
            'F4 · Whether an attempted-but-unsuccessful order counts as "no order placed" for the returns-without-ordering metric (here: only the "no order placed" choice).', 'F5 · When an episode closes and what its outcomes are called.', 'F6 · The approved list of supported food-ordering websites.', 'F7 · Conflict rules with other MYELIN organs and between several sites.', 'F8 · The content and format of a real FINE report.']))];
    }
  };

  /* ---------- report (simulation evidence only) ---------- */
  function reportText() {
    const {d, now} = model(), c = d.counts, L = [];
    L.push('FINE SIMULATION REPORT — SIMULATION EVIDENCE ONLY', 'No real orders, payments, websites or people were observed. Every event below was created by a demonstration button in MYELIN Web Lite.', `Generated ${stampDate(now)} (simulated clock, IST)`, '');
    L.push('COUNTS', `Food website entries: ${c.entries}`, `Distraction warnings: ${c.warnings}`, `Episodes: ${c.episodes}`, `Demonstration returns: ${c.returns}`, `Returns without ordering (recorded "no order placed"): ${c.returnsWithoutOrdering}`, `Returns after a finished break: ${c.returnsAfterBreak}`, '');
    L.push('ORDERING OUTCOMES (separately recorded simulation choices)', `Successful orders: ${c.success}`, `No order placed: ${c.noOrder}`, `Attempted, not completed: ${c.failed}`, `Visits with no outcome recorded: ${c.unrecorded}`, '');
    L.push('MOST VISITED (by entries)', ...(mostVisited(d).map(([s, n]) => `${s}: ${n}`).concat(d.visits.length ? [] : ['none recorded'])), '');
    L.push('EPISODES (newest first)'); if (!d.episodes.length) L.push('none recorded');
    d.episodes.slice().sort((a, b) => b.warningAt - a.warningAt).forEach((v) => L.push(`${v.id} · ${v.site} · warning ${stampDate(v.warningAt)} · ${summaryOf(v)}`));
    L.push('', 'RECORDED EVENTS (chronological)'); if (!ledger.events.length) L.push('none recorded');
    ledger.events.forEach((e) => L.push(`${stampDate(e.at)} · ${e.type}${[e.site, e.choice && CHOICES[e.choice], e.outcome && OUTCOMES[e.outcome]].filter(Boolean).length ? ' · ' + [e.site, e.choice && CHOICES[e.choice], e.outcome && OUTCOMES[e.outcome]].filter(Boolean).join(' · ') : ''}`));
    L.push('', 'LIMITATIONS', 'Simulation only. Returns are demonstration buttons, not browser-observed. Nothing is stored or uploaded. Not a clinical or scientific result.');
    return L.join('\n');
  }
  function reportView() {
    const text = reportText();
    const dl = button('DOWNLOAD (.TXT)', () => {
      const blob = new Blob([text], {type: 'text/plain'}), a = el('a', {href: URL.createObjectURL(blob), download: `FINE-simulation-report-${ist(ledger.clock()).ddmmyyyy}.txt`}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, {class: 'st-btn primary', id: 'fnReportDownload'});
    return [el('h2', {class: 'st-sec'}, 'FINE — SIMULATION REPORT'), el('div', {class: 'st-banner open', id: 'fnReportBanner'}, el('b', {class: 'st-status'}, 'SIMULATION EVIDENCE — NOT REAL ORDERS OR REAL MONITORING')),
      el('section', {class: 'card st-card'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'REPORT PREVIEW'), el('div', {class: 'st-right'}, button('‹ BACK', () => { S.report = false; renderDash(); }, {class: 'st-btn sm', id: 'fnReportBack'}), dl)), el('pre', {class: 'fn-report', id: 'fnReportText'}, text))];
  }

  /* ---------- dashboard shell ---------- */
  function dashChrome() {
    const open = model().d.active && model().d.active.isEpisode, chip = dash.querySelector('#fnDashOpen');
    chip.textContent = open ? 'FINE: EPISODE OPEN' : 'FINE: NO OPEN EPISODE'; chip.className = 'st-pill ' + (open ? 'warn' : 'bad');
    [...dash.querySelectorAll('.st-nav button')].forEach((b) => { const on = !S.report && b.dataset.tab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  }
  function renderDash() {
    if (!dash) return;
    const focusId = document.activeElement && dash.contains(document.activeElement) ? document.activeElement.id : '';
    dashChrome(); const top = dashBody.scrollTop;
    dashBody.replaceChildren(...(S.report ? reportView() : views[S.tab]()).filter(Boolean)); dashBody.scrollTop = top;
    if (focusId) { const f = dash.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
  }
  function closeDash() { if (!dash) return; document.removeEventListener('keydown', onKey, true); dash.remove(); dash = null; dashBody = null; S.report = false; (opener && opener.isConnected ? opener : document.getElementById('fnOpenDash'))?.focus(); opener = null; }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDash(); return; }
    if (e.key === 'Tab' && dash) { const f = [...dash.querySelectorAll('button,select,input,[tabindex="0"]')].filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  }
  function openDash(from) {
    if (dash) { dash.querySelector('.glass-close')?.focus(); return; }
    opener = from || document.activeElement;
    const closeBtn = button('', closeDash, {class: 'glass-close', 'aria-label': 'Close FINE dashboard'}); closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const nav = el('nav', {class: 'st-nav', 'aria-label': 'FINE sections', role: 'tablist'}, TABS.map(([k, t], i) => { const b = el('button', {type: 'button', role: 'tab', 'data-tab': k, id: 'fnTab-' + k, on: {click: () => { S.tab = k; S.report = false; renderDash(); }}}, t);
      b.addEventListener('keydown', (e) => { const n = e.key === 'ArrowDown' ? (i + 1) % TABS.length : e.key === 'ArrowUp' ? (i + TABS.length - 1) % TABS.length : null; if (n !== null) { e.preventDefault(); S.tab = TABS[n][0]; S.report = false; renderDash(); nav.children[n].focus(); } }); return b; }));
    dashBody = el('div', {class: 'st-body', id: 'fnBody', role: 'tabpanel', tabindex: '-1'});
    const report = button('GET REPORT', () => { S.report = true; renderDash(); }, {class: 'st-btn primary', id: 'fnReport', title: 'A simple report built only from the simulated events. Marked as simulation evidence.'});
    const openChip = pill('FINE: NO OPEN EPISODE', 'bad'); openChip.id = 'fnDashOpen';
    dash = el('div', {class: 'glass-overlay open st-dash', id: 'fnDash', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fnDashTitle'}, el('div', {class: 'glass-panel st-panel'},
      el('div', {class: 'st-head'}, el('b', {class: 'st-brand'}, 'MYELIN'), el('h2', {id: 'fnDashTitle'}, 'LIVE FINE DASHBOARD'), el('div', {class: 'st-chips'}, openChip, pill('SIMULATION · DEMO DATA', 'good'), pill('IST · UTC+05:30', 'ghost'), closeBtn)),
      el('div', {class: 'st-sub2'}, el('span', {}, 'FINE · Food Ordering Regulation'), el('span', {}, 'Web demonstration, not OS monitoring'), el('span', {class: 'st-spacer'}), el('span', {class: 'st-warn'}, 'Report = simulation evidence only'), report),
      el('div', {class: 'st-split'}, el('div', {class: 'st-side'}, el('span', {class: 'st-eyebrow'}, 'FINE SECTIONS'), nav), dashBody),
      el('div', {class: 'st-foot2'}, el('span', {}, 'MYELIN WEB LITE · FINE'), el('span', {}, 'SIMULATED EVENTS · ALL TIMES IST'))));
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
    showCard(popupSpec(), {owner: 'fine', alive: hostActive(() => host)});
  }
  let subscribed = false;
  return {
    mount(h) { host = h; if (!subscribed) { subscribed = true; ledger.subscribe(() => { if ((host && host.classList.contains('active')) || dash) render(); }); } render(); },
    openDashboard: openDash, closeDashboard: closeDash, get dashboardOpen() { return !!dash; }
  };
}
