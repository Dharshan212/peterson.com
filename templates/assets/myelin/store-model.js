// STORE — shopping-activity organ, BROWSER SIMULATION model (MYELIN Web Lite). No DOM, no storage.
// Everything here is SIMULATED: events exist only when the visitor presses a demonstration control; nothing is monitored, nothing is persisted, nothing is read from
// an imported database file.
// IMPLEMENTED (confirmed behavioural rules):
//   1. Eligible shopping activity reaching 10:00 -> the initial STORE intervention (prompt) is displayed and an episode is created.
//   2. The prompt offers I'M BACK and I WANT TO SHOP.
//   3. I'M BACK records a return INTENTION only; it is never a verified return.
//   4. I WANT TO SHOP records a chosen additional shopping time, any value from 1 s up to 13:15 (a shorter allowance is supported).
//   5. The combined time is capped at 23:15 from the start of the eligible shopping activity (10:00 + 13:15), never "13:15 in total": the allowance ends at
//      min(button press + chosen time, entry + 23:15).
//   7. Leaving a shopping website is recorded as an exit and is NEVER a verified return.
// DEMONSTRATED ONLY: DEMO_RETURN_EVIDENCE_RECORDED is a button the visitor presses. It is NOT browser-observed return verification and is never labelled "verified".
// NOT DEFINED (so not implemented, see STORE_PHASE1_REPORT.md): follow-up timing after I'M BACK, repeated responses, what happens when the allowance elapses (final
//   reminder), episode closure and outcome names, conflict rules, the real return-verification evidence, the supported-site list, and the report format.
// Event contract (append-only; `at` is a UTC instant in epoch ms, displayed in IST only):
//   SHOPPING_SITE_OPENED {site}          one visit starts (one visit = one entry event)
//   THRESHOLD_REACHED                    dwell on that visit reached 10:00 (at = entry + 10:00 exactly)
//   STORE_PROMPT_DISPLAYED               the initial prompt is shown; this CREATES the episode (same instant as the threshold)
//   USER_RESPONSE {choice, allowanceMs?, deadlineAt?, capped?}   IM_BACK | I_WANT_TO_SHOP; at most one per episode (a rule of this demonstration, not an approved rule)
//   ALLOWANCE_ELAPSED                    the chosen shopping time ran out while the site was still open (a time fact; nothing is shown or enforced)
//   SITE_EXITED                          the visit ends (exit alone proves nothing about returning)
//   DEMO_RETURN_EVIDENCE_RECORDED        demonstration evidence button, accepted only for the most recent episode after its site was exited
export const THRESHOLD_MS = 10 * 60 * 1000;
export const ALLOWANCE_MAX_MS = (13 * 60 + 15) * 1000;
export const COMBINED_MAX_MS = THRESHOLD_MS + ALLOWANCE_MAX_MS;      // 23:15 from the start of the eligible shopping activity
export const SITES = Object.freeze(['Amazon', 'Flipkart', 'Myntra', 'Other']);   // demonstration list, NOT an approved supported-site list
export const CHOICES = Object.freeze({IM_BACK: "I'M BACK", I_WANT_TO_SHOP: 'I WANT TO SHOP'});

const FMT = new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
/** An instant in Indian Standard Time (Asia/Kolkata, UTC+05:30): {date: 'DD-MM-YYYY', time: 'HH:MM:SS', ymd: 'YYYY-MM-DD', ddmmyyyy: 'DDMMYYYY'}. */
export function ist(ms) {
  const p = Object.fromEntries(FMT.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {date: `${p.day}-${p.month}-${p.year}`, time: `${p.hour}:${p.minute}:${p.second}`, ymd: `${p.year}-${p.month}-${p.day}`, ddmmyyyy: `${p.day}${p.month}${p.year}`};
}
export const istDayStart = (ymd) => Date.parse(`${ymd}T00:00:00+05:30`);
export const istDayEnd = (ymd) => Date.parse(`${ymd}T23:59:59.999+05:30`);
/** Elapsed duration (not a clock time): "12m 35s", "4s", "1h 02m 03s". */
export function dur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m ${String(r).padStart(2, '0')}s` : m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
}
export const clockDur = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':'); };
export const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

/** A fresh in-memory ledger. `now` is injectable so tests are deterministic; `offset` is the simulated clock jump made by the ADVANCE controls. */
export function createStoreLedger({now = () => Date.now()} = {}) {
  let events = [], offset = 0;
  const listeners = new Set();
  const clock = () => now() + offset;
  const emit = () => { for (const fn of [...listeners]) { try { fn(); } catch (e) { /* a subscriber must not break the ledger */ } } };
  const add = (type, at, extra = {}) => { events.push(Object.freeze({seq: events.length + 1, id: 'store-event-' + (events.length + 1), type, at, ...extra})); };
  const ok = (changed = true) => { if (changed) emit(); return {ok: true}; };
  const no = (reason) => ({ok: false, reason});

  /** The state every rule below needs, derived from the events alone. */
  function derive() {
    const visits = [], episodes = [];
    let cur = null;
    for (const e of events) {
      if (e.type === 'SHOPPING_SITE_OPENED') { cur = {key: 'visit-' + e.seq, site: e.site, openedAt: e.at, exitedAt: null, thresholdAt: null, episode: null, events: [e]}; visits.push(cur); }
      else if (!cur) continue;
      else if (e.type === 'DEMO_RETURN_EVIDENCE_RECORDED') { const v = e.visitKey && visits.find((x) => x.key === e.visitKey); if (v) v.events.push(e); }
      else { cur.events.push(e); if (e.type === 'SITE_EXITED') cur.exitedAt = e.at; if (e.type === 'THRESHOLD_REACHED') cur.thresholdAt = e.at; }
    }
    for (const v of visits) {
      const prompt = v.events.find((e) => e.type === 'STORE_PROMPT_DISPLAYED');
      if (!prompt) continue;
      const resp = v.events.find((e) => e.type === 'USER_RESPONSE'), demo = v.events.find((e) => e.type === 'DEMO_RETURN_EVIDENCE_RECORDED'), elapsed = v.events.find((e) => e.type === 'ALLOWANCE_ELAPSED');
      const ep = {key: v.key, site: v.site, visit: v, promptAt: prompt.at, choice: resp ? resp.choice : null, choiceAt: resp ? resp.at : null,
        allowanceMs: resp && resp.allowanceMs ? resp.allowanceMs : null, deadlineAt: resp && resp.deadlineAt ? resp.deadlineAt : null, capped: !!(resp && resp.capped),
        elapsedAt: elapsed ? elapsed.at : null, exitedAt: v.exitedAt, demoReturnAt: demo ? demo.at : null, events: v.events.slice()};
      ep.state = ep.exitedAt === null ? 'ON_SITE' : 'EXITED';
      v.episode = ep; episodes.push(ep);
    }
    // Deterministic display ids STO-DDMMYYYY-NN: the IST date of the prompt, numbered by prompt time then event order, over every recorded episode.
    const order = episodes.slice().sort((a, b) => a.promptAt - b.promptAt || a.visit.events[0].seq - b.visit.events[0].seq), perDay = new Map();
    for (const ep of order) { const d = ist(ep.promptAt).ddmmyyyy, n = (perDay.get(d) || 0) + 1; perDay.set(d, n); ep.id = `STO-${d}-${String(n).padStart(2, '0')}`; }
    const active = visits.find((v) => v.exitedAt === null) || null;
    const latest = episodes.length ? episodes.reduce((a, b) => (b.promptAt >= a.promptAt ? b : a)) : null;
    // Episode CLOSURE is not defined (see the header), so no episode is ever "closed": an episode is ON_SITE or EXITED, and its recorded facts are shown as they are.
    return {visits, episodes, active, activeEpisode: active ? active.episode : null, latest,
      counts: {visits: visits.length, episodes: episodes.length, returns: episodes.filter((e) => e.demoReturnAt !== null).length}};
  }

  /** Time-driven facts only: the 10:00 threshold + prompt, and the end of a chosen shopping allowance. */
  function tick() {
    let changed = false;
    const v = derive().active;
    if (!v) return false;
    if (v.thresholdAt === null && clock() - v.openedAt >= THRESHOLD_MS) { const at = v.openedAt + THRESHOLD_MS; add('THRESHOLD_REACHED', at); add('STORE_PROMPT_DISPLAYED', at); changed = true; }
    const ep = derive().active.episode;
    if (ep && ep.deadlineAt !== null && ep.elapsedAt === null && clock() >= ep.deadlineAt) { add('ALLOWANCE_ELAPSED', ep.deadlineAt); changed = true; }
    if (changed) emit();
    return changed;
  }
  return {
    clock, derive, tick, get events() { return events.slice(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    openSite(site) {
      if (!SITES.includes(site)) return no('Unknown demonstration site.');
      if (derive().active) return no('A shopping site is already open. Exit it first.');
      add('SHOPPING_SITE_OPENED', clock(), {site}); return ok();
    },
    advance(ms) { if (!(ms > 0)) return no('Advance by a positive amount.'); offset += ms; const t = tick(); emit(); return {ok: true, ticked: t}; },
    /** Moves the simulated clock exactly to the 10:00 threshold of the open visit. */
    advanceToThreshold() {
      const v = derive().active; if (!v) return no('No shopping site is open.');
      if (v.thresholdAt !== null) return no('The threshold has already been reached.');
      offset += Math.max(0, v.openedAt + THRESHOLD_MS - clock()); tick(); emit(); return {ok: true};
    },
    /** Moves the simulated clock exactly to the end of the chosen shopping time of the open episode. */
    advanceToAllowanceEnd() {
      const ep = derive().activeEpisode; if (!ep || ep.deadlineAt === null) return no('No shopping time has been chosen on the open site.');
      if (ep.elapsedAt !== null) return no('The chosen shopping time has already elapsed.');
      offset += Math.max(0, ep.deadlineAt - clock()); tick(); emit(); return {ok: true};
    },
    /** choice IM_BACK | I_WANT_TO_SHOP. For I_WANT_TO_SHOP, allowanceMs is the chosen additional shopping time: 1 s .. 13:15. */
    respond(choice, {allowanceMs} = {}) {
      if (!CHOICES[choice]) return no('Unknown prompt choice.');
      tick();
      const ep = derive().activeEpisode; if (!ep) return no('No STORE prompt is displayed.');
      if (ep.choice) return no('A response was already recorded for this episode.');
      const at = clock();
      if (choice === 'IM_BACK') { add('USER_RESPONSE', at, {choice}); return ok(); }
      if (!Number.isInteger(allowanceMs) || allowanceMs < 1000) return no('Choose a shopping time of at least 1 second.');
      if (allowanceMs > ALLOWANCE_MAX_MS) return no('The shopping time can be at most 13 min 15 s.');
      const open = ep.visit.openedAt, wanted = at + allowanceMs, cap = open + COMBINED_MAX_MS, deadlineAt = Math.min(wanted, cap);
      if (cap - at < 1000) return no('The combined limit of 23 min 15 s from the start of the shopping activity has already passed.');
      add('USER_RESPONSE', at, {choice, allowanceMs, deadlineAt, capped: wanted > cap}); return ok();
    },
    exitSite() { tick(); const v = derive().active; if (!v) return no('No shopping site is open.'); add('SITE_EXITED', clock()); return ok(); },
    /** DEMONSTRATION ONLY — not browser-observed return verification. */
    recordDemoReturnEvidence() {
      const d = derive(), ep = d.latest; if (!ep) return no('No episode has been recorded.');
      if (ep.exitedAt === null) return no('Demonstration return evidence can only be recorded after the shopping site was exited.');
      if (ep.demoReturnAt !== null) return no('Demonstration return evidence was already recorded for this episode.');
      if (d.visits[d.visits.length - 1].episode !== ep) return no('Only the most recent episode can receive demonstration return evidence.');
      add('DEMO_RETURN_EVIDENCE_RECORDED', clock(), {visitKey: ep.key}); return ok();
    },
    clear() { events = []; offset = 0; emit(); return {ok: true}; }
  };
}

/** The recorded steps of one episode as journey nodes — only events that actually occurred; a missing step stays missing. */
export function journey(ep) {
  const nodes = [];
  for (const e of ep.events) {
    if (e.type === 'SHOPPING_SITE_OPENED') nodes.push({kind: 'open', label: `${ep.site} opened`, tag: 'ENTRY', at: e.at});
    else if (e.type === 'THRESHOLD_REACHED') nodes.push({kind: 'threshold', label: '10-min threshold', tag: 'OBSERVED', at: e.at});
    else if (e.type === 'STORE_PROMPT_DISPLAYED') nodes.push({kind: 'prompt', label: 'STORE prompt displayed', tag: 'PROMPT', at: e.at});
    else if (e.type === 'USER_RESPONSE') nodes.push({kind: 'response', label: e.choice === 'IM_BACK' ? "I'M BACK" : `I WANT TO SHOP — ${mmss(e.allowanceMs)}`, tag: 'INTENTION', at: e.at,
      note: e.choice === 'IM_BACK' ? 'Return intention only' : `Chosen time ends ${ist(e.deadlineAt).time} IST${e.capped ? ' (capped at 23:15 from entry)' : ''}`});
    else if (e.type === 'ALLOWANCE_ELAPSED') nodes.push({kind: 'elapsed', label: 'Chosen shopping time elapsed', tag: 'TIME', at: e.at, note: 'Site still open'});
    else if (e.type === 'SITE_EXITED') nodes.push({kind: 'exit', label: `${ep.site} exited`, tag: 'EXIT', at: e.at, note: 'Exit alone is not a return'});
    else if (e.type === 'DEMO_RETURN_EVIDENCE_RECORDED') nodes.push({kind: 'demo', label: 'Demonstration return evidence', tag: 'DEMO · NOT BROWSER-OBSERVED', at: e.at});
  }
  return nodes.sort((a, b) => a.at - b.at);
}
