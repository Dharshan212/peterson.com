// SECANT / Study Mode / COSECANT — interactive BROWSER DEMONSTRATION (MYELIN Web Lite), same source-switch pattern as the SINE, MINE and COSINE demonstrations.
// It does NOT re-implement any rule: it drives the existing STUDY, SECANT and COSECANT organs (the approved rules of this build's Runtime) in a SEPARATE demonstration Runtime on a MANUAL, deterministic clock
// (nothing advances unless a button is pressed): prepare a study block (subject, task, minutes, break length, the registered study material), start it, watch the study timer, drift to a distraction so SECANT
// raises SECANT-1 / 2 / 3 (with the response records), and take a COSECANT study break — BREAK COMPLETE at the scheduled end, BREAK ALREADY OVER five minutes later, COME BACK PLEASE one minute after that,
// then an observed return to the exact study resource confirmed for three seconds. The events are rendered through the existing SECANT page and "SECANT — Deep Analysis" dashboard (secantModel /
// buildSecantPage / createSecantAnalysis). Earlier simulated sessions are kept in memory so the dashboard's existing past-session views have something to pick. It never touches the Control Station runtime or
// its Study Mode panel, the stored local history, an imported database file or Science Lab; simulated events live only in this module's memory and are labelled SIMULATION. Popups are displayed the instant
// they are requested; display failures are not part of the demonstration. No window or app is monitored: every activity is a simulator surface.
import {el, button} from './dom.js';
import {Runtime} from './runtime.js';
import {SURFACES} from './simulator.js';
import {secantModel, buildSecantPage, createSecantAnalysis} from './secant-station.js';
import {syncRuntimePopup, clearStage, visibleId} from './popup-stage.js';

const ACTIVITIES = Object.entries(SURFACES);
const MATERIALS = Object.entries(SURFACES).filter(([, s]) => s.kind === 'STUDY');
const QUICK = [['study', 'szStudyRes', 'EXACT STUDY RESOURCE'], ['task', 'szTask', 'WORK TASK'], ['chatA', 'szChatA', 'WHATSAPP'], ['streamA', 'szStreamA', 'NETFLIX'], ['offtask', 'szOfftask', 'OFF-TASK RESOURCE'], ['unknown', 'szUnknown', 'UNCERTAIN']];
const DISTRACTION = ['SOCIAL', 'MESSAGING', 'STREAMING', 'OFF_TASK'];
const fmtS = (s) => { const t = Math.floor(Math.max(0, s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
const NA = 'Not available';
const SECANT_COPY = {1: ['Study focus notice', 'The active study block is running. Return to the registered study resource.'], 2: ['Study return pending', 'The study session is still off-track. Return to the registered study resource.'], 3: ['Study return required', 'The study session remains off-track. Return to the registered study resource so recovery can be verified.']};
const COSECANT_COPY = {BREAK_COMPLETE: ['BREAK COMPLETE', 'Your planned break has ended. Return to your registered Study task.'], BREAK_ALREADY_OVER: ['BREAK ALREADY OVER', 'Your planned break has been over for five minutes. Return to your registered Study task.'],
  FINAL_LOCK: ['COME BACK PLEASE', 'Open the exact registered Study resource. This protected notice closes only after observed return. (No buttons.)']};
const CS_LABEL = {BREAK_ACTIVE: 'Break active', BREAK_COMPLETE: 'Break complete', BREAK_ALREADY_OVER: 'Break already over', FINAL_LOCK: 'Final lock · COME BACK PLEASE', CLOSED: 'Closed'};

export function createSecantDemo({T, now = () => Date.now(), onChange = () => {}, toast = () => {}}) {
  let rt = null, history = [], base = now(), active = false, msg = '', hostRef = null;
  const form = {subject: 'Demonstration subject', task: 'Demonstration study task', studyMin: 60, breakMin: 10};
  const wall = () => base + Math.round((rt ? rt.time : 0) * 1000);   // simulated wall clock: demonstration start + simulated seconds
  const running = () => !!rt && rt.state === 'ACTIVE';
  function instantDisplay(o) { const orig = o.request.bind(o); o.request = (...a) => { orig(...a); if (o.popup && !o.popup.displayed) o.r.display(o.popup.id); }; }
  function start() {
    let floor = 0;
    if (rt && rt.session) { if (['ACTIVE', 'PAUSED'].includes(rt.state)) rt.end('ENDED'); history.push(rt.snapshot()); floor = base + Math.round(rt.time * 1000) + 60000; }
    base = Math.max(now(), floor); rt = new Runtime({namespace: 'demo', wallNow: wall}); rt.start({speed: 1}); instantDisplay(rt.secant); instantDisplay(rt.cosecant);
  }
  const snaps = () => [...history, ...(rt && rt.session ? [rt.snapshot()] : [])];
  const model = () => secantModel(snaps(), null);
  const analysis = createSecantAnalysis({getModel: model, T, actions: {export: () => toast('PDF export is not available for the SECANT demonstration (simulated evidence).'), rerender: () => render()}});
  const act = (fn) => () => { try { fn(); msg = ''; } catch (e) { msg = e.message || String(e); } render(); };
  const advance = (sec) => { if (!running()) throw new Error('Start a demonstration session first.'); rt.advance(sec); };
  const kindNow = () => (rt && rt.available ? rt.observation.kind : 'UNKNOWN');
  const label = () => (rt ? ((Object.values(SURFACES).find((x) => x.resourceId === rt.observation.resourceId) || {}).label || rt.observation.kind) : null);

  /** [seconds, what] of the engine's next countdown (study end, SECANT stage, COSECANT stage / return confirmation), or null when time does not run towards one. */
  function nextStep() {
    if (!running()) return null;
    const st = rt.study, sc = rt.secant, cs = rt.cosecant, c = [];
    if (cs.active) {
      const e = rt.time - cs.deadline;
      if (cs.returning) c.push([3 - cs.confirm, 'the COSECANT return confirmation']);
      if (e < 0) c.push([-e, 'BREAK COMPLETE']); else if (e < 300) c.push([300 - e, 'BREAK ALREADY OVER']); else if (e < 360) c.push([360 - e, 'COME BACK PLEASE']);
    } else if (st.state === 'ACTIVE') {
      c.push([st.plan.duration - st.activeSeconds, 'the end of the study block']);
      if (sc.scope && !sc.breakHeld) {
        if (sc.recovery) c.push([(sc.recovery.phase === 'VERIFYING' ? 10 : 60) - sc.recovery.seconds, sc.recovery.phase === 'VERIFYING' ? 'return verification' : 'closure confirmation']);
        else if (sc.state === 'CLOSED') { if (evidence().known && DISTRACTION.includes(rt.observation.kind)) c.push([300, 'SECANT-1']); }
        else if (!sc.episodeId) { if (rt.available && DISTRACTION.includes(rt.observation.kind)) c.push([300 - sc.dwell, 'SECANT-1']); }
        else if (sc.remaining !== null && evidence().known && !evidence().exact) c.push([sc.remaining, `SECANT-${sc.stage + 1}`]);
      }
    }
    c.sort((a, b) => a[0] - b[0]);
    return c.length && c[0][0] > 0 ? c[0] : null;
  }
  /** The evidence the SECANT engine itself reads: known (available, not UNKNOWN) and whether it is the exact registered study resource. (The engine's internal `held` flag can stay set until its next tick after a pause/resume, so the readout is based on the evidence instead.) */
  function evidence() { const o = rt.available ? rt.observation : {kind: 'UNKNOWN', resourceId: null}, plan = rt.study.plan; return {known: o.kind !== 'UNKNOWN', exact: !!plan && o.kind === 'STUDY' && o.resourceId === plan.resourceId}; }
  /** TRIGGER NEXT SECANT / COSECANT POPUP: only the existing controls — start the session, prepare and start a study block, open a distraction, advance to the engine's next step. No timing is changed. */
  function triggerNext() {
    if (!running()) start();
    const st = rt.study;
    if (['EMPTY', 'COMPLETED', 'SHUTDOWN'].includes(st.state)) rt.command('STUDY', 'prepare', {subject: form.subject, task: form.task, studyMinutes: form.studyMin, breakMinutes: form.breakMin, resourceId: MATERIALS[0][1].resourceId});
    if (rt.study.state === 'READY') rt.command('STUDY', 'start');
    if (!rt.cosecant.active && !(rt.available && DISTRACTION.includes(rt.observation.kind)) && !rt.secant.episodeId) rt.setEvidence(SURFACES.chatA);
    const nx = nextStep();
    if (!nx) throw new Error('No further SECANT / COSECANT popup is due now: observe the exact study resource, or start a break from the Study controls.');
    advance(Math.ceil(nx[0] * 4) / 4);
  }
  function popupNow() { if (!rt) return null; const p = [rt.cosecant, rt.secant].find((o) => o.popup && o.popup.displayed); return p ? p.popup : null; }

  function controls() {
    const mk = (lab, id, fn, on, cls = '') => { const b = button(lab, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const input = (id, type, value, aria, cls, on, set) => { const i = el('input', {type, class: 'wl-input ' + cls, id, value: String(value), 'aria-label': aria}); if (type === 'number') { i.min = '1'; i.max = '1440'; } i.disabled = !on; i.addEventListener('input', () => set(type === 'number' ? Number(i.value) : i.value)); return i; };
    const st = rt && rt.study, sc = rt && rt.secant, cs = rt && rt.cosecant, on = running(), locked = !!st && ['ACTIVE', 'PAUSED'].includes(st.state);
    const nx = nextStep(), pop = popupNow();
    const sel = el('select', {class: 'wl-input st-select', id: 'szActivity', 'aria-label': 'Simulated activity'}, ACTIVITIES.map(([k, s]) => el('option', {value: k}, `${s.label} (${s.kind})`)));
    sel.value = rt ? (ACTIVITIES.find(([, s]) => s.resourceId === rt.observation.resourceId) || ['task'])[0] : 'task';
    const mat = el('select', {class: 'wl-input st-select', id: 'szMaterial', 'aria-label': 'Study material'}, MATERIALS.map(([k, s]) => el('option', {value: s.resourceId}, `${s.label} (${s.resourceId})`)));
    mat.disabled = !on || locked;
    const row1 = el('div', {class: 'st-ctl'}, mk('TRIGGER NEXT SECANT / COSECANT POPUP', 'szTrigger', triggerNext, true, 'primary'), mk(rt ? 'RESTART DEMONSTRATION SESSION' : 'START DEMONSTRATION SESSION', 'szStart', () => start(), true),
      mk('RESET DEMONSTRATION', 'szReset', () => { rt = null; history = []; }, !!rt || history.length > 0, 'ghost'), mk('END SESSION', 'szEnd', () => rt.end('ENDED'), on));
    const setup = el('div', {class: 'st-ctl sz-form', id: 'szSetup'}, el('span', {class: 'st-lbl'}, 'STUDY MATERIAL & TIMER SETUP:'), input('szSubject', 'text', form.subject, 'Subject', '', on && !locked, (v) => { form.subject = v; }),
      input('szTaskText', 'text', form.task, 'Task', '', on && !locked, (v) => { form.task = v; }), mat, el('span', {class: 'st-lbl'}, 'STUDY MIN'), input('szStudyMin', 'number', form.studyMin, 'Study minutes', 'st-num', on && !locked, (v) => { form.studyMin = v; }),
      el('span', {class: 'st-lbl'}, 'BREAK MIN'), input('szBreakMin', 'number', form.breakMin, 'Break minutes', 'st-num', on && !locked, (v) => { form.breakMin = v; }),
      mk('PREPARE STUDY BLOCK', 'szPrepare', () => { if (!rt.command('STUDY', 'prepare', {subject: form.subject, task: form.task, studyMinutes: form.studyMin, breakMinutes: form.breakMin, resourceId: mat.value})) throw new Error('The study block could not be prepared.'); }, on && !locked && st.state !== 'SHUTDOWN'));
    const sa = (a) => () => { if (!rt.command('STUDY', a)) throw new Error('That Study action is not available now.'); };
    const sRow = el('div', {class: 'st-ctl', id: 'szStudyActions'}, el('span', {class: 'st-lbl'}, 'STUDY MODE:'), mk('START STUDY', 'szBlockStart', sa('start'), on && st.state === 'READY'),
      mk('PAUSE', 'szBlockPause', sa('pause'), on && st.state === 'ACTIVE' && !cs.active && !sc.unresolved), mk('RESUME', 'szBlockResume', sa('resume'), on && st.state === 'PAUSED' && !cs.active && !sc.unresolved),
      mk('COMPLETE', 'szBlockComplete', sa('complete'), on && ['ACTIVE', 'PAUSED'].includes(st.state)), mk('START BREAK (COSECANT)', 'szBreakStart', sa('break'), on && st.state === 'ACTIVE' && !cs.active && !(sc.unresolved && sc.stage >= 2)));
    const row2 = el('div', {class: 'st-ctl'}, sel, mk('SWITCH ACTIVITY', 'szSwitch', () => rt.setEvidence(SURFACES[sel.value]), on), ...QUICK.map(([k, id, l]) => mk(l, id, () => rt.setEvidence(SURFACES[k]), on)));
    const row3 = el('div', {class: 'st-ctl'}, [['+1 SEC', 1], ['+5 SEC', 5], ['+10 SEC', 10], ['+30 SEC', 30], ['+1 MIN', 60], ['+5 MIN', 300], ['+10 MIN', 600]].map(([l, v]) => mk(l, 'szAdv' + v, () => advance(v), on)),
      mk('ADVANCE TO NEXT SECANT / COSECANT STEP', 'szAdvNext', () => advance(Math.ceil(nx[0] * 4) / 4), on && !!nx));
    let ptxt = 'SIMULATED POPUP — none is displayed';
    if (pop) { const c = pop.organ === 'SECANT' ? SECANT_COPY[pop.stage] : COSECANT_COPY[pop.stage]; ptxt = `SIMULATED ${pop.organ === 'SECANT' ? `SECANT-${pop.stage}` : 'COSECANT'} POPUP — ${c[0]}: ${c[1]}`; }
    const has = (a) => on && !!pop && pop.actions.includes(a);
    const popRow = el('div', {class: 'st-ctl st-allow', id: 'szPopup'}, el('span', {class: 'st-lbl', id: 'szPopupText'}, ptxt),
      mk('RETURN TO STUDY', 'szReturn', () => { if (!rt.command(pop.organ, 'return')) throw new Error('No return response is available.'); }, has('return')),
      mk('START STUDY BREAK', 'szSecBreak', () => { if (!rt.command('SECANT', 'study-break')) throw new Error('A displayed SECANT-1 is required.'); }, has('study-break') && pop.organ === 'SECANT'));
    const hint = !on ? (rt ? 'The demonstration session has ended.' : 'No demonstration session is running.') : nx ? `Next step in ${fmtS(nx[0])} (${nx[1]}).` : cs.active ? 'No step is counting down: the break ends only when the exact study resource is observed for three seconds.' : st.state === 'READY' ? 'Study block prepared. Press START STUDY.' : st.state === 'ACTIVE' ? 'No SECANT / COSECANT step is counting down (SECANT counts only while a distraction is open; a break is started from the Study controls).' : st.state === 'PAUSED' ? 'The study block is paused.' : 'Prepare a study block to begin.';
    return el('section', {class: 'card st-card', id: 'szControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SECANT DEMONSTRATION CONTROLS'), pill('SIMULATED EVIDENCE · NOT FROM ANY DATABASE FILE', 'warn')),
      el('p', {class: 'st-hint'}, 'A separate, manually clocked simulation of the approved Study Mode, SECANT and COSECANT rules. Prepare a study block (the only registered study material is the Exact Study resource), start it and watch the study timer. Opening a distraction for 5:00 raises SECANT-1; SECANT-2 follows 10:00 later and SECANT-3 13:15 after that, until the exact study resource is observed (10 s verification, then a 60 s closure confirmation). START BREAK (COSECANT) pauses the block for the selected break length: BREAK COMPLETE appears at its end, BREAK ALREADY OVER five minutes later and COME BACK PLEASE one minute after that; the break ends only when the exact study resource is observed for three seconds. Nothing here is stored, uploaded or mixed with imported evidence, and no window is monitored.'),
      row1, setup, sRow, row2, row3, popRow, el('p', {class: 'st-msg', id: 'szMsg', role: 'status', 'aria-live': 'polite'}, msg), el('p', {class: 'st-hint', id: 'szNextHint'}, hint));
  }
  function secantText() {
    if (!rt || !rt.study.plan || !['ACTIVE', 'PAUSED'].includes(rt.study.state) || !rt.secant.scope) return rt && rt.secant.scope ? 'Inactive' : NA;
    const sc = rt.secant, rec = sc.recovery && sc.recovery.phase;
    if (sc.state === 'CLOSED') return 'Inactive';
    if (sc.breakHeld) return 'Break hold';
    if (sc.episodeId && !rec && !evidence().known) return `Paused · ${fmtS(sc.remaining)}`;
    if (rec === 'VERIFYING') return `Return verify ${fmtS(sc.recovery.seconds)} / 00:10`;
    if (rec === 'CONFIRMING') return `Closure ${fmtS(sc.recovery.seconds)} / 01:00`;
    if (sc.episodeId && sc.stage === 3) return 'SECANT-3 · return required';
    if (sc.episodeId && (sc.stage === 1 || sc.stage === 2)) return `SECANT-${sc.stage} · ${fmtS(sc.remaining)} to SECANT-${sc.stage + 1}`;
    return sc.dwell > 0 ? `Off-task ${fmtS(sc.dwell)} / 05:00` : 'Inactive';
  }
  function status() {
    const r = rt, mod = model(), st = r && r.study, plan = st && st.plan, cs = r && r.cosecant, has = !!plan && st.state !== 'EMPTY', remaining = has ? Math.max(0, plan.duration - st.activeSeconds) : 0;
    let ret = 'Not started';
    if (cs && cs.active) ret = cs.returning ? `Confirming ${fmtS(cs.confirm)} / 00:03` : cs.state === 'BREAK_ACTIVE' ? 'Waiting for break end' : 'Waiting for exact resource';
    else if (r && r.secant.recovery) ret = `${r.secant.recovery.phase === 'VERIFYING' ? 'Verifying' : 'Closure confirming'} ${fmtS(r.secant.recovery.seconds)}`;
    const cells = [['SIMULATED CLOCK', r && r.session ? fmtS(r.time) : '00:00', 'szClock'], ['DEMONSTRATION', !r ? 'NOT STARTED' : r.state, 'szState'], ['ACTIVITY', r ? label() : NA, 'szActivityNow'],
      ['STUDY STATE', has ? st.state : r ? 'No block prepared' : NA, 'szStudyState'], ['STUDY MATERIAL', has ? ((Object.values(SURFACES).find((x) => x.resourceId === plan.resourceId) || {}).label || plan.resourceId) : NA, 'szMaterialNow'],
      ['STUDY TIMER · REMAINING', has ? fmtS(remaining) : NA, 'szRemaining'], ['PLANNED', has ? fmtS(plan.duration) : NA, 'szPlanned'], ['ELAPSED STUDY', has ? fmtS(st.activeSeconds) : NA, 'szElapsed'],
      ['SECANT', secantText(), 'szSecant'], ['COSECANT', cs && cs.active ? (CS_LABEL[cs.state] || cs.state) : r ? 'No break' : NA, 'szCosecant'], ['SELECTED BREAK', has ? fmtS(plan.breakSeconds) : NA, 'szBreakSel'],
      ['BREAK REMAINING', cs && cs.active && cs.state === 'BREAK_ACTIVE' ? fmtS(Math.max(0, cs.deadline - r.time)) : cs && cs.active ? 'Break ended' : NA, 'szBreakLeft'], ['RETURN CHECK', ret, 'szReturnNow'],
      ['SECANT EPISODES (THIS SESSION)', r && r.session ? String(mod.episodes.filter((e) => e.sessionId === r.session.id).length) : NA, 'szEpisodes'], ['DEMONSTRATION SESSIONS', String(mod.sessions.length), 'szSessions'], ['APP CATEGORY · STUDY ALIGNMENT', 'Not tracked', 'szNotTracked']];
    const pct = has ? Math.min(100, Math.round(st.activeSeconds / plan.duration * 100)) : 0;
    const bar = el('div', {class: 'sc-bar', id: 'szProg', role: 'progressbar', 'aria-label': 'Study progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct)}, el('i', {style: `width:${pct}%`}));
    return el('div', {}, el('div', {class: 'cot-tiles sd-status', id: 'szStatus'}, cells.map(([k, v, id]) => el('div', {class: 'st-tile'}, el('span', {}, k), el('b', {id, class: 'fn-small'}, v)))), bar);
  }
  function modeBar() {
    const mk = (lab, id, on) => button(lab, () => { active = id === 'secantModeDemo'; if (!active) { analysis.close(); clearStage('secant'); } onChange(); }, {class: 'st-btn' + (on ? ' primary' : ''), id, 'aria-pressed': String(on)});
    return el('div', {class: 'st-ctl sd-modebar', id: 'secantModeBar', role: 'group', 'aria-label': 'SECANT source'}, mk('BROWSER SESSION', 'secantModeBrowser', !active), mk('SECANT DEMONSTRATION (SIMULATION)', 'secantModeDemo', active),
      active ? pill('SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE', 'warn') : null);
  }
  function mount(host) {
    hostRef = host;
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '';
    const page = buildSecantPage({model: model(), T, actions: {refresh: () => render(), open: () => analysis.open(host.querySelector('#sqOpen'))}});
    host.replaceChildren(modeBar(), el('div', {class: 'mh-wrap st-wrap'}, el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'SECANT — DEMONSTRATION'), el('p', {class: 'st-hint'}, 'Interactive browser simulation of Study Mode, the SECANT study reminders and a COSECANT study break. Simulated clock — nothing is monitored.'))), status(), controls()), page);
    if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    if (analysis.isOpen) analysis.refresh();
    syncRuntimePopup(rt, {owner: 'secant', alive: visibleId('szControls'), after: render, toast});
  }
  function render() { if (hostRef && hostRef.isConnected && active) mount(hostRef); }
  return {get active() { return active; }, bar: modeBar, mount, render, getRuntime: () => rt, getModel: model, closeAnalysis: () => analysis.close()};
}
