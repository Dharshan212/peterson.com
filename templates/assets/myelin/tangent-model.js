// TANGENT — gaming organ, BROWSER SIMULATION model (MYELIN Web Lite). No DOM, no storage.
// Everything is SIMULATED: events exist only when the visitor presses a demonstration control; nothing is monitored, persisted, uploaded or read from an imported file.
// The web version cannot detect, block or overlay any game or other Windows software; it is not an OS-level intervention.
// From the owner's plan (to be verified): the eligible gaming-activity reminder threshold is 23 min 15 s, and the reminder is a persistent prompt WITHOUT buttons.
//   -> implemented as a deterministic, clock-driven rule: the reminder is displayed at exactly entry + 23:15 while the game is still open; it has no response events.
// A game EXIT is never a verified return. "Return to main activity" is a DEMONSTRATION button, NOT browser-observed return verification.
// NOT defined, so only listed as open decisions (see TANGENT_PHASE3_REPORT.md): the intentional gaming break and its relation to other organs, what happens after the reminder
//   (escalation / second prompt), episode closure and outcome names, the real return evidence, the supported-game list, conflict rules, the real report format.
// Event contract (append-only; `at` is a UTC instant in epoch ms, displayed in IST only):
//   GAME_OPENED {game, platform}          one gaming session starts (one entry event = one session)
//   REMINDER_DISPLAYED                    entry + 23:15 reached with the game still open; this CREATES the episode; persistent, no buttons
//   GAME_EXITED                           the session ends (an exit proves nothing about returning)
//   DEMO_RETURN_EVIDENCE_RECORDED         demonstration only; accepted for the most recent episode once its game was exited
import {ist, istDayStart, istDayEnd, dur, clockDur, mmss} from './store-model.js';
export {ist, istDayStart, istDayEnd, dur, clockDur, mmss};
export const REMINDER_MS = (23 * 60 + 15) * 1000;
export const GAMES = Object.freeze([['Counter-Strike 2', 'Steam'], ['Valorant', 'Riot Games'], ['Minecraft', 'Launcher'], ['Dota 2', 'Steam'], ['Apex Legends', 'EA App'], ['Fortnite', 'Epic Games'], ['Rocket League', 'Epic Games'], ['Roblox', 'Roblox']]);   // demonstration list, NOT an approved supported-game list

export function createTangentLedger({now = () => Date.now()} = {}) {
  let events = [], offset = 0;
  const listeners = new Set();
  const clock = () => now() + offset;
  const emit = () => { for (const fn of [...listeners]) { try { fn(); } catch (e) { /* a subscriber must not break the ledger */ } } };
  const add = (type, at, extra = {}) => { events.push(Object.freeze({seq: events.length + 1, type, at, ...extra})); };
  const ok = () => { emit(); return {ok: true}; };
  const no = (reason) => ({ok: false, reason});

  function derive() {
    const sessions = [];
    let cur = null;
    for (const e of events) {
      if (e.type === 'GAME_OPENED') { cur = {key: 'session-' + e.seq, game: e.game, platform: e.platform, openedAt: e.at, events: [e]}; sessions.push(cur); continue; }
      const s = e.visitKey ? sessions.find((x) => x.key === e.visitKey) : cur;
      if (s) s.events.push(e);
    }
    for (const s of sessions) {
      const at = (t) => { const e = s.events.find((x) => x.type === t); return e ? e.at : null; };
      Object.assign(s, {reminderAt: at('REMINDER_DISPLAYED'), exitedAt: at('GAME_EXITED'), returnAt: at('DEMO_RETURN_EVIDENCE_RECORDED')});
      s.isEpisode = s.reminderAt !== null;
    }
    const episodes = sessions.filter((s) => s.isEpisode), perDay = new Map();
    for (const s of episodes.slice().sort((a, b) => a.reminderAt - b.reminderAt || a.openedAt - b.openedAt)) { const d = ist(s.reminderAt).ddmmyyyy, n = (perDay.get(d) || 0) + 1; perDay.set(d, n); s.id = `TAN-${d}-${String(n).padStart(2, '0')}`; }
    const active = sessions.find((s) => s.exitedAt === null) || null;
    // Episode CLOSURE is not defined, so no episode is ever "closed": it is on-game or exited, and the recorded facts are shown as they are.
    return {sessions, episodes, active, activeEpisode: active && active.isEpisode ? active : null, latest: sessions.length ? sessions[sessions.length - 1] : null,
      latestEpisode: episodes.length ? episodes.reduce((a, b) => (b.reminderAt >= a.reminderAt ? b : a)) : null,
      counts: {sessions: sessions.length, reminders: episodes.length, returns: episodes.filter((s) => s.returnAt !== null).length}};
  }
  /** The only time-driven fact: the reminder at entry + 23:15 while the game is still open. */
  function tick() {
    const s = derive().active;
    if (!s || s.reminderAt !== null || clock() - s.openedAt < REMINDER_MS) return false;
    add('REMINDER_DISPLAYED', s.openedAt + REMINDER_MS); emit(); return true;
  }
  return {
    clock, derive, tick, get events() { return events.slice(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    openGame(game) {
      const g = GAMES.find((x) => x[0] === game); if (!g) return no('Unknown demonstration game.');
      if (derive().active) return no('A game is already open. Exit it first.');
      add('GAME_OPENED', clock(), {game: g[0], platform: g[1]}); return ok();
    },
    advance(ms) { if (!(ms > 0)) return no('Advance by a positive amount.'); offset += ms; tick(); emit(); return {ok: true}; },
    advanceToReminder() {
      const s = derive().active; if (!s) return no('No game is open.');
      if (s.reminderAt !== null) return no('The reminder has already been displayed.');
      offset += Math.max(0, s.openedAt + REMINDER_MS - clock()); tick(); emit(); return {ok: true};
    },
    exitGame() { tick(); const s = derive().active; if (!s) return no('No game is open.'); add('GAME_EXITED', clock()); return ok(); },
    /** DEMONSTRATION ONLY — not browser-observed return verification. */
    recordDemoReturn() {
      const d = derive(), ep = d.latestEpisode; if (!ep) return no('No TANGENT episode has been recorded.');
      if (ep.exitedAt === null) return no('Demonstration return evidence can only be recorded after the game was exited.');
      if (ep.returnAt !== null) return no('Demonstration return evidence was already recorded for this episode.');
      add('DEMO_RETURN_EVIDENCE_RECORDED', clock(), {visitKey: ep.key}); return ok();
    },
    clear() { events = []; offset = 0; emit(); return {ok: true}; }
  };
}

/** The recorded steps of one session as journey nodes — only events that occurred; a missing step stays missing. */
export function journey(s) {
  const nodes = [];
  for (const e of s.events) {
    const n = {at: e.at};
    if (e.type === 'GAME_OPENED') Object.assign(n, {kind: 'open', label: 'Game opened', tag: 'ENTRY', note: `${s.game} · ${s.platform}`});
    else if (e.type === 'REMINDER_DISPLAYED') Object.assign(n, {kind: 'reminder', label: 'Reminder displayed', tag: 'REMINDER', note: 'Persistent prompt · no buttons · 23:15 after entry'});
    else if (e.type === 'GAME_EXITED') Object.assign(n, {kind: 'exit', label: 'Game exited', tag: 'EXIT', note: s.reminderAt !== null ? `Played ${dur(e.at - s.reminderAt)} after the reminder · exit is not a return` : 'Left before the 23:15 reminder'});
    else if (e.type === 'DEMO_RETURN_EVIDENCE_RECORDED') Object.assign(n, {kind: 'demo', label: 'Return to main activity', tag: 'DEMO · NOT BROWSER-OBSERVED'});
    else continue;
    nodes.push(n);
  }
  return nodes.sort((a, b) => a.at - b.at);
}
