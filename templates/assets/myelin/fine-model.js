// FINE — food-ordering organ, BROWSER SIMULATION model (MYELIN Web Lite). No DOM, no storage, no ordering / payment API.
// Everything is SIMULATED: events exist only when the visitor presses a demonstration control. Nothing is monitored, persisted, uploaded or read from an imported file.
// Ordering outcomes are SEPARATELY RECORDED simulation choices (order placed / no order placed / attempted but not completed) — never inferred from a website visit.
// "Return to main activity" is a demonstration button, NOT browser-observed return verification.
// Not defined by the approved plan, so only demonstrated and listed as open decisions: what triggers a warning, the warning / response wording, how long a food break lasts,
// whether a failed attempt counts as "no order placed", episode closure, supported sites, conflict rules, the real return evidence.
// Event contract (append-only; `at` is a UTC instant in epoch ms, displayed in IST only):
//   FOOD_SITE_OPENED {site}      one visit starts (one entry event = one visit)
//   MENU_BROWSED                 the visitor marked that the menu was browsed (optional step)
//   WARNING_DISPLAYED            a FINE distraction warning was shown; this CREATES the episode
//   USER_RESPONSE {choice}       TAKE_A_BREAK | CONTINUE_ORDERING (simulation choices); one per episode
//   BREAK_STARTED / BREAK_FINISHED   an intentional food break (started by TAKE_A_BREAK; finished by the visitor)
//   SITE_EXITED                  the visit ends
//   RETURN_RECORDED              demonstration "returned to main activity"; only after the exit, once per visit
//   ORDER_OUTCOME {outcome}      ORDER_PLACED | NO_ORDER | ATTEMPT_FAILED; separately recorded, once per visit
import {ist, istDayStart, istDayEnd, dur, clockDur, mmss} from './store-model.js';
export {ist, istDayStart, istDayEnd, dur, clockDur, mmss};
export const SITES = Object.freeze(['Zomato', 'Swiggy', "Domino's", 'Uber Eats', 'Other']);   // demonstration list, NOT an approved supported-site list
export const CHOICES = Object.freeze({TAKE_A_BREAK: 'TAKE A BREAK', CONTINUE_ORDERING: 'CONTINUE ORDERING'});
export const OUTCOMES = Object.freeze({ORDER_PLACED: 'Successful order', NO_ORDER: 'No order placed', ATTEMPT_FAILED: 'Attempted, not completed'});

export function createFineLedger({now = () => Date.now()} = {}) {
  let events = [], offset = 0;
  const listeners = new Set();
  const clock = () => now() + offset;
  const emit = () => { for (const fn of [...listeners]) { try { fn(); } catch (e) { /* a subscriber must not break the ledger */ } } };
  const add = (type, extra = {}) => { events.push(Object.freeze({seq: events.length + 1, type, at: clock(), ...extra})); };
  const ok = () => { emit(); return {ok: true}; };
  const no = (reason) => ({ok: false, reason});

  function derive() {
    const visits = [];
    let cur = null;
    for (const e of events) {
      if (e.type === 'FOOD_SITE_OPENED') { cur = {key: 'visit-' + e.seq, site: e.site, openedAt: e.at, events: [e]}; visits.push(cur); continue; }
      const v = e.visitKey ? visits.find((x) => x.key === e.visitKey) : cur;
      if (v) v.events.push(e);
    }
    for (const v of visits) {
      const at = (t) => { const e = v.events.find((x) => x.type === t); return e ? e.at : null; };
      const resp = v.events.find((e) => e.type === 'USER_RESPONSE'), out = v.events.find((e) => e.type === 'ORDER_OUTCOME');
      Object.assign(v, {browsedAt: at('MENU_BROWSED'), warningAt: at('WARNING_DISPLAYED'), choice: resp ? resp.choice : null, choiceAt: resp ? resp.at : null, breakStartAt: at('BREAK_STARTED'), breakEndAt: at('BREAK_FINISHED'),
        exitedAt: at('SITE_EXITED'), returnAt: at('RETURN_RECORDED'), outcome: out ? out.outcome : null, outcomeAt: out ? out.at : null, isEpisode: at('WARNING_DISPLAYED') !== null});
    }
    const episodes = visits.filter((v) => v.isEpisode), perDay = new Map();
    for (const v of episodes.slice().sort((a, b) => a.warningAt - b.warningAt || a.openedAt - b.openedAt)) { const d = ist(v.warningAt).ddmmyyyy, n = (perDay.get(d) || 0) + 1; perDay.set(d, n); v.id = `FINE-${d}-${String(n).padStart(2, '0')}`; }
    const active = visits.find((v) => v.exitedAt === null) || null;
    const returned = visits.filter((v) => v.returnAt !== null);
    const lastOutcome = visits.filter((v) => v.outcome).reduce((a, b) => (!a || b.outcomeAt >= a.outcomeAt ? b : a), null);
    const byOutcome = (o) => visits.filter((v) => v.outcome === o).length;
    return {visits, episodes, active, latestEpisode: episodes.length ? episodes.reduce((a, b) => (b.warningAt >= a.warningAt ? b : a)) : null, lastOutcome: lastOutcome ? lastOutcome.outcome : null,
      counts: {entries: visits.length, warnings: episodes.length, episodes: episodes.length, returns: returned.length,
        returnsWithoutOrdering: returned.filter((v) => v.outcome === 'NO_ORDER').length,
        returnsAfterBreak: returned.filter((v) => v.breakEndAt !== null && v.breakEndAt <= v.returnAt).length,
        success: byOutcome('ORDER_PLACED'), noOrder: byOutcome('NO_ORDER'), failed: byOutcome('ATTEMPT_FAILED'), unrecorded: visits.filter((v) => !v.outcome).length}};
  }
  const latestVisit = () => { const v = derive().visits; return v.length ? v[v.length - 1] : null; };
  return {
    clock, derive, get events() { return events.slice(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    openSite(site) {
      if (!SITES.includes(site)) return no('Unknown demonstration site.');
      if (derive().active) return no('A food-ordering site is already open. Exit it first.');
      add('FOOD_SITE_OPENED', {site}); return ok();
    },
    advance(ms) { if (!(ms > 0)) return no('Advance by a positive amount.'); offset += ms; return ok(); },
    browseMenu() { const v = derive().active; if (!v) return no('No food-ordering site is open.'); if (v.browsedAt !== null) return no('Menu browsing was already recorded for this visit.'); add('MENU_BROWSED'); return ok(); },
    showWarning() { const v = derive().active; if (!v) return no('No food-ordering site is open.'); if (v.warningAt !== null) return no('A warning was already displayed for this visit.'); add('WARNING_DISPLAYED'); return ok(); },
    respond(choice) {
      if (!CHOICES[choice]) return no('Unknown response choice.');
      const v = derive().active; if (!v || v.warningAt === null) return no('No FINE warning is displayed.');
      if (v.choice) return no('A response was already recorded for this episode.');
      add('USER_RESPONSE', {choice}); if (choice === 'TAKE_A_BREAK') add('BREAK_STARTED'); return ok();
    },
    finishBreak() {
      const v = derive().visits.find((x) => x.breakStartAt !== null && x.breakEndAt === null); if (!v) return no('No food break is running.');
      add('BREAK_FINISHED', {visitKey: v.key}); return ok();
    },
    exitSite() { const v = derive().active; if (!v) return no('No food-ordering site is open.'); add('SITE_EXITED'); return ok(); },
    /** DEMONSTRATION ONLY — not browser-observed return verification. */
    recordReturn() {
      const v = latestVisit(); if (!v) return no('No visit has been recorded.');
      if (v.exitedAt === null) return no('A return can only be recorded after the food-ordering site was exited.');
      if (v.returnAt !== null) return no('A return was already recorded for this visit.');
      if (v.breakStartAt !== null && v.breakEndAt === null) return no('A food break is still running: finish the break first.');
      add('RETURN_RECORDED', {visitKey: v.key}); return ok();
    },
    /** A separately recorded simulation choice about ordering; never inferred from the visit. */
    recordOutcome(outcome) {
      if (!OUTCOMES[outcome]) return no('Unknown ordering outcome.');
      const v = latestVisit(); if (!v) return no('No visit has been recorded.');
      if (v.outcome) return no('An ordering outcome was already recorded for this visit.');
      add('ORDER_OUTCOME', {outcome, visitKey: v.key}); return ok();
    },
    clear() { events = []; offset = 0; emit(); return {ok: true}; }
  };
}

/** The recorded steps of one visit as journey nodes — only events that occurred; a missing step stays missing. */
export function journey(v) {
  const nodes = [];
  for (const e of v.events) {
    const n = {at: e.at};
    if (e.type === 'FOOD_SITE_OPENED') Object.assign(n, {kind: 'open', label: 'Website entered', tag: 'ENTRY', note: v.site});
    else if (e.type === 'MENU_BROWSED') Object.assign(n, {kind: 'browse', label: 'Browsing menu', tag: 'OBSERVED'});
    else if (e.type === 'WARNING_DISPLAYED') Object.assign(n, {kind: 'warning', label: 'Warning shown', tag: 'WARNING', note: 'FINE distraction warning'});
    else if (e.type === 'USER_RESPONSE') Object.assign(n, {kind: 'response', label: CHOICES[e.choice], tag: 'RESPONSE', note: 'Simulation choice'});
    else if (e.type === 'BREAK_STARTED') Object.assign(n, {kind: 'break', label: 'Break started', tag: 'BREAK'});
    else if (e.type === 'BREAK_FINISHED') Object.assign(n, {kind: 'break', label: 'Break finished', tag: 'BREAK', note: v.breakStartAt !== null ? `Break lasted ${dur(e.at - v.breakStartAt)}` : ''});
    else if (e.type === 'SITE_EXITED') Object.assign(n, {kind: 'exit', label: 'Website exited', tag: 'EXIT', note: 'Exit alone is not a return'});
    else if (e.type === 'RETURN_RECORDED') Object.assign(n, {kind: 'demo', label: 'Return to main activity', tag: 'DEMO · NOT BROWSER-OBSERVED'});
    else if (e.type === 'ORDER_OUTCOME') Object.assign(n, {kind: 'outcome-' + e.outcome, label: OUTCOMES[e.outcome], tag: 'RECORDED CHOICE', note: 'Separately recorded, not inferred'});
    else continue;
    nodes.push(n);
  }
  return nodes.sort((a, b) => a.at - b.at);
}
