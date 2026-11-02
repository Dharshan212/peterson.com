// COT — Check-in On Task, BROWSER SIMULATION model (MYELIN Web Lite). No DOM, no storage.
// COT is NOT a blocker, a distraction detector or a recovery intervention: it only asks "Is it related to your work?" (YES / NO). YES is a self-reported statement about
// relevance, never verified focus or behavioural recovery. Everything is SIMULATED by buttons; nothing is monitored, persisted, uploaded or read from an imported file.
// Rules implemented (from the owner's brief), all on a deterministic simulation clock:
//   * After 10:00 of ELIGIBLE simulated activity the check-in popup is displayed, then every further 10:00 of eligible activity (10:00, 20:00, 30:00 ...). Only displayed popups are counted.
//   * Entering an activity covered by SINE / MINE / SECANT / COSINE / FINE / STORE PAUSES COT: no popup, the countdown freezes, the remaining time is preserved, no missed reminders pile up.
//   * Resuming eligible activity continues the SAME schedule from the saved countdown. If less than 60 s remained, one full minute of eligible activity passes before that pending popup.
//   * Entering the explicitly designated focus app ENDS the session (kept in history, counters reset); a new session starts only when new eligible activity begins. No app is a reset
//     destination unless the visitor designated it.
// Event contract (append-only, `at` = UTC epoch ms displayed in IST only):
//   SESSION_STARTED · ACTIVITY_ENTERED {name, category, kind ELIGIBLE|PAUSING|FOCUS, organ?} · COT_PAUSED {remainingMs} · COT_RESUMED {remainingMs, graceApplied, newDue}
//   POPUP_DISPLAYED {n, dueElapsed} · POPUP_RESPONSE {choice YES|NO} · POPUP_UNANSWERED {reason DISMISSED|NEXT_POPUP|SESSION_ENDED} · SESSION_ENDED {reason, app} · FOCUS_APP_DESIGNATED {app}
// Not defined by the brief (so only listed as open decisions, see COT_PHASE4_REPORT.md): what else counts as eligible activity, the grid after a delayed popup, how long an unanswered popup
// stays, whether a pending popup survives a pause, how a focus app is designated, other ways a session can end, how the popup appears outside this page, activity categories.
import {ist, istDayStart, istDayEnd, dur, clockDur, mmss} from './store-model.js';
export {ist, istDayStart, istDayEnd, dur, clockDur, mmss};
export const INTERVAL_MS = 10 * 60 * 1000;
export const GRACE_MS = 60 * 1000;
export const MSG = Object.freeze({YES: 'GREAT — ENJOY YOUR WORK.', NO: 'COME BACK SOON — YOU HAVE A LOT OF WORK TO DO.'});
export const QUESTION = 'Is it related to your work?';
// Demonstration catalogues (NOT detections): ordinary eligible activities with a category, and activities covered by another MYELIN organ (COT pauses on them).
export const ELIGIBLE = Object.freeze([['ResearchGate', 'Research / Documentation'], ['Stack Overflow', 'Information / Reading'], ['YouTube (Educational)', 'Education / Learning'], ['Wikipedia', 'Information / Reading'], ['Document Editor', 'Research / Documentation'], ['Other website', 'Others']]);
export const PAUSING = Object.freeze([['Instagram', 'SINE'], ['WhatsApp', 'MINE'], ['Study-mode distraction', 'SECANT'], ['Streaming video', 'COSINE'], ['Food-ordering site', 'FINE'], ['Shopping site', 'STORE']]);

export function createCotLedger({now = () => Date.now()} = {}) {
  let events = [], offset = 0;
  const listeners = new Set();
  const clock = () => now() + offset;
  const emit = () => { for (const fn of [...listeners]) { try { fn(); } catch (e) { /* a subscriber must not break the ledger */ } } };
  const add = (type, at, extra = {}) => { events.push(Object.freeze({seq: events.length + 1, type, at, ...extra})); };
  const ok = () => { emit(); return {ok: true}; };
  const no = (reason) => ({ok: false, reason});

  /** Replays every event: sessions with their activities / popups, and the scheduling state needed by the next action. */
  function derive() {
    const sessions = []; let s = null, cur = null, focusApp = null;
    const adv = (t) => { if (s && !s.endedAt && s.inEligible) s.acc += t - s.lastT; if (s && !s.endedAt) s.lastT = t; };
    for (const e of events) {
      if (e.type === 'FOCUS_APP_DESIGNATED') { focusApp = e.app; continue; }
      if (e.type === 'SESSION_STARTED') { s = {key: 'cot-session-' + e.seq, startedAt: e.at, endedAt: null, endReason: null, endApp: null, events: [e], acc: 0, lastT: e.at, inEligible: false, nextDue: INTERVAL_MS, shown: 0, pending: null, paused: false, pausedRemaining: null, activities: [], popups: []}; sessions.push(s); continue; }
      const live = s && !s.endedAt;
      if (e.type === 'ACTIVITY_ENTERED') {
        cur = {name: e.name, kind: e.kind, organ: e.organ || null, category: e.category, at: e.at};
        if (live && e.kind !== 'FOCUS') { adv(e.at); const prev = s.activities[s.activities.length - 1]; if (prev && prev.exitedAt === null) prev.exitedAt = e.at; s.activities.push({name: e.name, category: e.category, kind: e.kind, organ: e.organ || null, enteredAt: e.at, exitedAt: null}); s.inEligible = e.kind === 'ELIGIBLE'; s.events.push(e); }
        continue;
      }
      if (!live) continue;
      adv(e.at); s.events.push(e);
      if (e.type === 'COT_PAUSED') { s.paused = true; s.pausedRemaining = e.remainingMs; }
      else if (e.type === 'COT_RESUMED') { s.paused = false; s.pausedRemaining = null; s.nextDue = e.newDue; }
      else if (e.type === 'POPUP_DISPLAYED') { const p = {n: e.n, at: e.at, dueElapsed: e.dueElapsed, activityIdx: s.activities.length - 1, response: null, respondedAt: null, unanswered: null, unansweredAt: null}; s.popups.push(p); s.pending = p; s.shown = e.n; s.nextDue = INTERVAL_MS * (e.n + 1); }
      else if (e.type === 'POPUP_RESPONSE' && s.pending) { s.pending.response = e.choice; s.pending.respondedAt = e.at; s.pending = null; }
      else if (e.type === 'POPUP_UNANSWERED' && s.pending) { s.pending.unanswered = e.reason; s.pending.unansweredAt = e.at; s.pending = null; }
      else if (e.type === 'SESSION_ENDED') { s.endedAt = e.at; s.endReason = e.reason; s.endApp = e.app || null; s.inEligible = false; const prev = s.activities[s.activities.length - 1]; if (prev && prev.exitedAt === null) prev.exitedAt = e.at; }
    }
    const perDay = new Map();
    for (const x of sessions) { const d = ist(x.startedAt).ddmmyyyy, n = (perDay.get(d) || 0) + 1; perDay.set(d, n); x.id = `COT-${d}-${String(n).padStart(2, '0')}`; }
    for (const x of sessions) {
      const yes = x.popups.filter((p) => p.response === 'YES').length, nos = x.popups.filter((p) => p.response === 'NO').length;
      x.counts = {displayed: x.popups.length, yes, no: nos, unanswered: x.popups.filter((p) => p.unanswered).length, awaiting: x.popups.filter((p) => !p.response && !p.unanswered).length};
    }
    const active = sessions.length && !sessions[sessions.length - 1].endedAt ? sessions[sessions.length - 1] : null;
    return {sessions, active, cur, focusApp};
  }
  /** Scheduling status at the current simulated instant. */
  function status() {
    const d = derive(), s = d.active, t = clock();
    if (!s) return {state: 'NONE', current: d.cur, focusApp: d.focusApp, d};
    const acc = s.acc + (s.inEligible ? t - s.lastT : 0), remaining = s.nextDue - acc;
    return {state: s.paused ? 'PAUSED' : s.inEligible ? 'ACTIVE' : 'IDLE', session: s, acc, remaining, nextDue: s.nextDue, current: d.cur, focusApp: d.focusApp, pending: s.pending, d};
  }
  /** The only time-driven facts: popups due while eligible activity runs. Each is recorded at its exact instant. */
  function tick() {
    const d = derive(), s = d.active; if (!s || !s.inEligible) return false;
    const t = clock(); let acc = s.acc, last = s.lastT, due = s.nextDue, n = s.shown, pending = !!s.pending, changed = false;
    while (acc + (t - last) >= due) {
      const at = last + (due - acc); if (pending) add('POPUP_UNANSWERED', at, {reason: 'NEXT_POPUP'});
      n += 1; add('POPUP_DISPLAYED', at, {n, dueElapsed: due}); pending = true; acc = due; last = at; due = INTERVAL_MS * (n + 1); changed = true;
    }
    if (changed) emit(); return changed;
  }
  const entry = (name) => { const e = ELIGIBLE.find((x) => x[0] === name), p = PAUSING.find((x) => x[0] === name); return e ? {name, category: e[1], kind: 'ELIGIBLE'} : p ? {name, category: `Covered by ${p[1]}`, kind: 'PAUSING', organ: p[1]} : null; };
  return {
    clock, derive, status, tick, get events() { return events.slice(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    designateFocusApp(app) {
      if (app !== null && !ELIGIBLE.some((x) => x[0] === app)) return no('Only an ordinary activity can be designated as the focus app.');
      add('FOCUS_APP_DESIGNATED', clock(), {app}); return ok();
    },
    enterActivity(name) {
      tick(); const info = entry(name); if (!info) return no('Unknown simulated activity.');
      const st = status(); if (st.current && st.current.name === name) return no('You are already in this activity.');
      const t = clock();
      if (info.kind === 'ELIGIBLE' && st.focusApp === name) {          // the explicitly designated focus app: end the session, reset the counters
        if (st.session) { if (st.pending) add('POPUP_UNANSWERED', t, {reason: 'SESSION_ENDED'}); add('SESSION_ENDED', t, {reason: 'FOCUS_APP_RETURN', app: name}); }
        add('ACTIVITY_ENTERED', t, {name, category: 'Designated focus app', kind: 'FOCUS'}); return ok();
      }
      if (info.kind === 'PAUSING') {
        add('ACTIVITY_ENTERED', t, info);
        if (st.session && st.session.inEligible) add('COT_PAUSED', t, {remainingMs: st.remaining});
        return ok();
      }
      if (!st.session) { add('SESSION_STARTED', t); add('ACTIVITY_ENTERED', t, info); return ok(); }
      add('ACTIVITY_ENTERED', t, info);
      if (st.session.paused) { const rem = st.remaining, grace = rem < GRACE_MS; add('COT_RESUMED', t, {remainingMs: rem, graceApplied: grace, newDue: st.acc + (grace ? GRACE_MS : rem)}); }
      return ok();
    },
    advance(ms) { if (!(ms > 0)) return no('Advance by a positive amount.'); offset += ms; tick(); emit(); return {ok: true}; },
    advanceToNextCheckin() {
      tick(); const st = status(); if (st.state !== 'ACTIVE') return no('COT is only counting down during eligible activity.');
      offset += Math.max(0, st.remaining); tick(); emit(); return {ok: true};
    },
    respond(choice) {
      if (choice !== 'YES' && choice !== 'NO') return no('Unknown response.');
      tick(); const st = status(); if (!st.pending) return no('No COT check-in is waiting for an answer.');
      if (st.state === 'PAUSED') return no('COT is paused: the check-in is hidden until eligible activity resumes.');
      add('POPUP_RESPONSE', clock(), {choice}); return ok();
    },
    dismiss() { tick(); const st = status(); if (!st.pending) return no('No COT check-in is waiting for an answer.'); if (st.state === 'PAUSED') return no('COT is paused: the check-in is hidden until eligible activity resumes.'); add('POPUP_UNANSWERED', clock(), {reason: 'DISMISSED'}); return ok(); },
    clear() { events = []; offset = 0; emit(); return {ok: true}; }
  };
}

/** The recorded steps of one session as journey nodes — only events that occurred; nothing is invented. */
export function journey(s) {
  const nodes = [];
  for (const e of s.events) {
    const n = {at: e.at, chip: null};
    if (e.type === 'SESSION_STARTED') Object.assign(n, {kind: 'start', label: 'Session started', note: 'Eligible activity begins'});
    else if (e.type === 'ACTIVITY_ENTERED') Object.assign(n, {kind: e.kind === 'PAUSING' ? 'activityP' : 'activity', label: `Entered: ${e.name}`, note: e.kind === 'PAUSING' ? `Covered by ${e.organ}` : e.category});
    else if (e.type === 'COT_PAUSED') Object.assign(n, {kind: 'pause', label: 'COT paused', note: `Countdown frozen · ${mmss(e.remainingMs)} remaining preserved`});
    else if (e.type === 'COT_RESUMED') Object.assign(n, {kind: 'resume', label: 'COT resumed', note: `${mmss(e.remainingMs)} remaining${e.graceApplied ? ' · under 1 min left: one full minute allowed' : ''}`});
    else if (e.type === 'POPUP_DISPLAYED') {
      const p = s.popups.find((x) => x.n === e.n && x.at === e.at);
      const chip = p.response ? {text: `Response: ${p.response}`, tone: p.response === 'YES' ? 'good' : 'bad'} : p.unanswered ? {text: `Unanswered (${p.unanswered.replace('_', ' ').toLowerCase()})`, tone: 'muted'} : {text: 'Awaiting response', tone: 'warn'};
      Object.assign(n, {kind: 'popup', label: `COT check-in #${e.n}`, note: `Due at ${mmss(e.dueElapsed)} of eligible activity${p.respondedAt ? ' · answered ' + ist(p.respondedAt).time + ' IST' : ''}`, chip});
    } else if (e.type === 'SESSION_ENDED') Object.assign(n, {kind: 'end', label: 'Session ended / reset', note: e.reason === 'FOCUS_APP_RETURN' ? `Returned to the designated focus app: ${e.app}` : e.reason});
    else continue;
    nodes.push(n);
  }
  return nodes;
}
/** Telemetry rows of a session: ordinary simulated activity records (historical, not a live feed). */
export function telemetry(s, nowMs) {
  return s.activities.map((a, i) => {
    const next = s.activities[i + 1], end = a.exitedAt === null ? (s.endedAt || nowMs) : a.exitedAt, popups = s.popups.filter((p) => p.activityIdx === i);
    const resp = popups.length ? popups.map((p) => p.response || (p.unanswered ? 'UNANSWERED' : 'AWAITING')).join(', ') : null;
    let event;
    if (a.exitedAt === null) event = s.endedAt ? 'SESSION ENDED' : a.kind === 'PAUSING' ? 'COT PAUSED' : 'ACTIVE';
    else if (!next) event = 'SESSION ENDED';
    else if (a.kind === 'PAUSING') event = next.kind === 'ELIGIBLE' ? 'COT RESUMED' : 'STILL PAUSED';
    else event = next.kind === 'PAUSING' ? 'COT PAUSED' : 'EXITED';
    return {n: i + 1, name: a.name, category: a.category, kind: a.kind, enteredAt: a.enteredAt, spentMs: end - a.enteredAt, ongoing: a.exitedAt === null && !s.endedAt, response: resp, event};
  });
}
