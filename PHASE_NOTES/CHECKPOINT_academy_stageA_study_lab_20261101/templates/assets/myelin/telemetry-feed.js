// MYELIN Web Lite — Live Telemetry projector: the SIMULATED events of the browser runtime presented in the shape of the desktop Control Station feed
// (CONTROL_STATION/application.py FeedList: newest-first rows of dot / time / message / tag; CORE_ENGINE/monitor.py supplies the real row vocabulary).
// PRESENTATION ONLY. It reads events the simulation already recorded and writes none. A row exists only when a recorded simulated event supports it:
// nothing is detected, no window title or application is invented (an "application" is the simulator surface the evidence names), and organs the desktop does not
// publish to this feed (SECANT, COSECANT, Study timer events) add no rows, exactly as on the desktop.
// SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING.
import {el} from './dom.js';
import {SURFACES} from './simulator.js';

export const FEED_MAX = 80;                                  // FeedList.MAX_ROWS
const SURF = Object.values(SURFACES);
const bySurface = (id) => SURF.find((s) => s.resourceId === id) || null;
const up = (s) => String(s ?? '').toUpperCase();
const words = (s) => String(s ?? '').replaceAll('_', ' ').replaceAll('-', ' ').trim();
const mmss = (s) => { const t = Math.max(0, Math.round(s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

/** Badge and tone of a foreground-activity row (monitor.py _activity_telemetry_semantics, over the simulated surface kind). */
export function activitySemantics(kind, studyActive) {
  if (studyActive) {
    if (kind === 'STUDY') return ['STUDY', 'green'];
    if (kind === 'TASK') return ['STUDY FOCUS', 'violet'];
    if (kind === 'STREAMING') return ['OTT', 'study-yellow'];
    if (kind === 'MESSAGING') return ['MESSAGING', 'study-orange'];
    if (kind === 'SOCIAL') return ['SOCIAL', 'red'];
    return ['STUDY ACTIVITY', 'cyan'];
  }
  if (kind === 'STREAMING') return ['OTT', 'cyan'];
  if (kind === 'MESSAGING') return ['MESSAGING', 'cyan'];
  if (kind === 'SOCIAL') return ['SOCIAL', 'amber'];
  if (kind === 'TASK') return ['FOCUS', 'cyan'];
  return ['ACTIVITY', 'cyan'];
}

/** events (oldest first) -> {rows, handover}; each row {utc, text, tag, tone}. */
export function projectFeed(events) {
  const rows = [], handover = [];
  let studyActive = false, obs = null, firstObs = true, sessionAt = null, started = false, lastIdentity = '';
  const cos = {phase: null, platform: '', minutes: null, callback: false, outcome: ''};
  const mine = {phase: null, platform: '', branch: '', minutes: null, variant: '', popup: false, outcome: ''};
  const push = (utc, text, tag, tone) => rows.push({utc, text, tag, tone});
  const appOf = (s, p) => up((s && (s.platform || s.label)) || (p && (p.platform || p.label)) || 'UNKNOWN');
  const activity = (utc, p) => {
    const s = bySurface(p.resourceId) || p, [tag, tone] = activitySemantics(p.kind, studyActive);
    obs = {kind: p.kind, platform: (s && (s.platform || s.label)) || '', label: (s && s.label) || ''};
    const identity = `${p.resourceId}|${tag}|${tone}`;
    if (identity === lastIdentity) return;                       // the desktop appends an activity row only when the foreground identity changes
    lastIdentity = identity;
    push(utc, `${appOf(s, p)} — ${p.resourceId}`, tag, tone);
    if (p.kind === 'SOCIAL' && !studyActive) push(utc, `${appOf(s, p)} — person is dwelling`, 'DWELL', 'violet');   // DWELL: a fresh actionable resource visit began
  };
  const cosineRow = (utc) => {
    const parts = ['COSINE — ' + cos.phase];
    if (cos.minutes) parts.push(`${cos.minutes} min`);
    if (cos.platform) parts.push(cos.platform);
    if (cos.outcome) parts.push(cos.outcome);
    if (cos.callback) parts.push('CALLBACK VISIBLE');
    push(utc, parts.join(' · '), 'COSINE', 'cyan');
  };
  const mineRow = (utc, ret) => {
    const parts = ['MINE — ' + mine.phase];
    if (mine.platform) parts.push(mine.platform);
    if (mine.branch) parts.push(mine.branch);
    if (mine.minutes) parts.push(`${mine.minutes} min`);
    if (mine.variant) parts.push(mine.variant);
    if (mine.popup) parts.push('POPUP VISIBLE');
    if (mine.outcome) parts.push(mine.outcome);
    push(utc, parts.join(' · '), ret ? 'RETURN' : 'MINE', ret ? 'green' : 'red');
  };
  for (const e of events) {
    const p = e.payload || {}, o = e.organ, t = e.type;
    if (o === 'SESSION') { if (t === 'SESSION_STARTED') { sessionAt = e.utc; started = true; } continue; }
    if (o === 'WORKSPACE') {
      if (t === 'RESOURCE_CHANGED') { firstObs = false; activity(e.utc, p); }
      else if (t === 'OBSERVATION_INTERVAL' && firstObs && started && p.supported) { firstObs = false; activity(sessionAt || e.utc, p); }   // the observation in force from the start of the session
      continue;
    }
    if (o === 'STUDY') {
      if (t === 'BLOCK_STARTED' || t === 'BLOCK_RESUMED') studyActive = true;
      else if (['BLOCK_PAUSED', 'BLOCK_COMPLETED', 'BLOCK_INTERRUPTED'].includes(t)) studyActive = false;
      if (t === 'BLOCK_STARTED') handover.push({utc: e.utc, text: 'STUDY OWNERSHIP ACTIVE', tag: 'STUDY', tone: 'green'});
      continue;
    }
    if (o === 'SINE') {
      if (t === 'EPISODE_STARTED') push(e.utc, 'SINE admission accepted — display pending', 'TRIGGER', 'red');
      else if (t === 'STAGE_DISPLAYED' && Number(p.stage) === 1) push(e.utc, `SINE 2 — stage scheduled for ${mmss(600)}`, 'SINE', 'amber');
      else if (t === 'STAGE_DISPLAYED' && Number(p.stage) === 2) push(e.utc, `SINE 3 — stage scheduled for ${mmss(795)}`, 'SINE', 'amber');
      else if (t === 'RETURN_INTENT') push(e.utc, "USER PRESSED — I'M BACK", 'MONITOR', 'cyan');
      continue;
    }
    if (o === 'NORMAL_BREAK') {
      if (t === 'BREAK_COMPLETED' || t === 'BREAK_STOPPED') push(e.utc, "BREAK ENDED — waiting for I'M BACK, SINE 2 not started", 'RETURN GATE', 'green');
      else if (t === 'RESUME_ACKNOWLEDGED') push(e.utc, "I'M BACK acknowledged — same episode stays at SINE 1", 'RETURN GATE', 'green');
      continue;
    }
    if (o === 'MIRL') {
      if (t === 'RETURN_STARTED') push(e.utc, 'RETURN UNVERIFIED — verification started', 'RETURN INTENT', 'amber');
      else if (t === 'RETURN_VERIFIED') { push(e.utc, 'USER RETURNED — WELCOME BACK TO FOCUS', 'RETURNED', 'green'); push(e.utc, `RETURN CONFIRMED — CLOSURE INITIATED FOR ${mmss(60)}`, 'MIRL', 'cyan'); }
      else if (t === 'EPISODE_CLOSED') {
        if (p.outcome === 'STUDY_PREEMPTED') push(e.utc, 'Study Mode started', 'MIRL', 'cyan');
        else push(e.utc, `EPISODE CLOSED — ${up(words(p.outcome))}`, 'MIRL', p.outcome === 'RETURNED' ? 'green' : 'cyan');
      }
      continue;
    }
    if (o === 'COSINE') {
      const plat = () => (cos.platform = (obs && obs.platform) || cos.platform);
      if (t === 'EPISODE_STARTED') { Object.assign(cos, {phase: 'OBSERVING OTT', minutes: null, callback: false, outcome: ''}); plat(); }
      else if (t === 'POPUP_REQUESTED' && p.stage === 'INTENT_GATE') { cos.phase = 'INTENT GATE PENDING'; cosineRow(e.utc); }
      else if (t === 'STAGE_DISPLAYED' && p.stage === 'INTENT_GATE') { cos.phase = 'INTENT GATE ACTIVE'; cosineRow(e.utc); }
      else if (t === 'INTENT_CHOSEN') { cos.phase = p.choice === 'RETURN' ? 'RETURN INTENT OBSERVING' : 'DURATION ENTRY'; cosineRow(e.utc); }
      else if (t === 'BREAK_COMMITTED') { cos.phase = 'BREAK ACTIVE'; cos.minutes = Math.round((p.seconds || 0) / 60); cosineRow(e.utc); }
      else if (t === 'PLATFORM_CHANGED') { cos.platform = (obs && obs.platform) || String(p.to || ''); if (cos.phase) cosineRow(e.utc); }
      else if (t === 'BREAK_COMPLETED') { cos.phase = 'FINAL CALLBACK ACTIVE'; cos.callback = true; cosineRow(e.utc); }
      else if (t === 'RETURN_STARTED') { cos.phase = 'RETURN VERIFYING'; cosineRow(e.utc); }
      else if (t === 'RETURN_VERIFIED') { cos.phase = 'CLOSURE CONFIRMING'; cosineRow(e.utc); }
      else if (t === 'EPISODE_CLOSED') { cos.phase = 'CLOSED'; cos.callback = false; cos.outcome = up(words(p.outcome)); cosineRow(e.utc); }
      continue;
    }
    if (o === 'MINE') {
      const plat = () => (mine.platform = (obs && obs.platform) || mine.platform);
      if (t === 'EPISODE_STARTED') { Object.assign(mine, {phase: null, branch: '', minutes: null, variant: '', popup: false, outcome: ''}); plat(); }
      else if (t === 'STAGE_DISPLAYED' && p.stage === 'MINE-1') { Object.assign(mine, {phase: 'MINE1 ACTIVE', popup: true}); mineRow(e.utc, false); }
      else if (t === 'STAGE_DISPLAYED' && String(p.stage).startsWith('MINE-2')) { Object.assign(mine, {phase: 'MINE2 ACTIVE', popup: true, variant: String(p.stage).replace('MINE-', 'MINE')}); mineRow(e.utc, false); }
      else if (t === 'BRANCH_CHOSEN') { Object.assign(mine, {phase: p.branch === 'A' ? 'RETURN INTENT ACTIVE' : 'IMPORTANT DURATION ENTRY', branch: p.branch === 'A' ? 'COME BACK' : 'IMPORTANT', popup: false}); mineRow(e.utc, false); }
      else if (t === 'ALLOWANCE_COMMITTED') { Object.assign(mine, {phase: 'IMPORTANT ALLOWANCE ACTIVE', minutes: Math.round((p.seconds || 0) / 60), popup: false}); mineRow(e.utc, false); }
      else if (t === 'PLATFORM_CHANGED') { mine.platform = (obs && obs.platform) || mine.platform; if (mine.phase) mineRow(e.utc, false); }
      else if (t === 'RETURN_STARTED') { Object.assign(mine, {phase: 'RETURN VISUAL CONFIRMING', popup: false}); mineRow(e.utc, true); }
      else if (t === 'VERIFICATION_STARTED') { mine.phase = 'RETURN VERIFYING'; mineRow(e.utc, true); }
      else if (t === 'RETURN_VERIFIED') { mine.phase = 'CLOSURE CONFIRMING'; mineRow(e.utc, true); }
      else if (t === 'EPISODE_CLOSED') { Object.assign(mine, {phase: 'CLOSED', popup: false, outcome: up(words(p.outcome))}); mineRow(e.utc, p.outcome === 'RETURNED'); }
      continue;
    }
  }
  return {rows, handover};
}

/** One desktop-style feed row: dot · time · message · tag (CONTROL_STATION FeedList.append). */
export function feedItem(row, T) {
  return el('div', {class: 'feed-item', 'data-tone': row.tone || 'cyan', 'data-badge': row.tag || ''},
    el('span', {class: 'feed-dot', 'aria-hidden': 'true'}), el('span', {class: 't'}, T.time(row.utc)), el('span', {class: 'msg'}, row.text), row.tag ? el('span', {class: 'tag'}, row.tag) : null);
}
/** Newest first, at most FEED_MAX rows (the desktop list keeps 80). */
export const newestFirst = (rows) => rows.slice(-FEED_MAX).reverse();
