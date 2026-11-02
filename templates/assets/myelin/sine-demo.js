// SINE / Live MIRL — interactive BROWSER DEMONSTRATION (MYELIN Web Lite).
// It does NOT re-implement any rule: it drives the existing SINE, MIRL and Normal Break organs (the approved timing and event rules of this build's Runtime) in a SEPARATE demonstration
// Runtime instance on a MANUAL, deterministic clock (nothing advances unless a button is pressed). The demonstration events are rendered through the existing Live MIRL page and dashboard
// (mirlModel / buildMirlPage / createMirlDashboard). Nothing here touches the Control Station runtime, the stored local history, an imported database file or Science Lab:
// simulated events live only in this module's memory and are labelled SIMULATION. MIRL "verified" facts appear only when the engine's own return-verification rule produces them in the simulation.
// Popups are displayed the instant they are requested (the interface's role in the real page), so display failures are not part of this demonstration.
import {el, button} from './dom.js';
import {Runtime} from './runtime.js';
import {SURFACES} from './simulator.js';
import {mirlModel, buildMirlPage, createMirlDashboard, duration} from './live-mirl.js';
import {syncRuntimePopup, clearStage, visibleId} from './popup-stage.js';

const KINDS = ['TASK', 'SOCIAL', 'ORDINARY', 'UNKNOWN', 'OFF_TASK'];
const ACTIVITIES = Object.entries(SURFACES).filter(([, s]) => KINDS.includes(s.kind));
const fmtS = (s) => { const t = Math.floor(Math.max(0, s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);

export function createSineDemo({T, now = () => Date.now(), onChange = () => {}, toast = () => {}}) {
  let rt = null, base = now(), active = false, msg = '', breakMinutes = 5, hostRef = null;
  const wall = () => base + Math.round((rt ? rt.time : 0) * 1000);   // simulated wall clock: demonstration start + simulated seconds
  const running = () => !!rt && rt.state === 'ACTIVE';

  function instantDisplay(o) { const orig = o.request.bind(o); o.request = (...a) => { orig(...a); if (o.popup && !o.popup.displayed) o.r.display(o.popup.id); }; }
  function start() {
    base = now(); rt = new Runtime({namespace: 'demo', wallNow: wall}); rt.start({speed: 1});
    instantDisplay(rt.sine); instantDisplay(rt.normalBreak);
  }
  const openEpisode = () => (rt && ['ACTIVE', 'PAUSED'].includes(rt.state) && rt.mirl.episodeId && rt.mirl.state !== 'CLOSED' ? {episodeId: rt.mirl.episodeId, sessionId: rt.session.id} : null);
  const model = () => mirlModel(rt && rt.session ? [rt.snapshot()] : [], openEpisode());
  function live(m) {
    const r = rt, run = !!r && ['ACTIVE', 'PAUSED'].includes(r.state);
    if (!run) return {open: null, signal: false, sineStage: 'SINE INACTIVE', sineTimer: '—', time: 0, triggerNo: null, sessionNo: null};
    const s = r.sine, open = openEpisode(), stage = s.episodeId && s.stage > 0 && ['ACTIVE', 'PROTECTED_RED'].includes(s.state) ? `SINE-${s.stage}` : 'SINE INACTIVE';
    const win = s.stage === 1 ? 600 : s.stage === 2 ? 795 : null, timer = s.episodeId && stage !== 'SINE INACTIVE' && Number.isFinite(s.remaining) && win ? `${fmtS(win - s.remaining)} / ${fmtS(win)}` : '—';
    return {open, signal: true, sineStage: stage, sineTimer: timer, time: r.time, triggerNo: open && m ? m.episodes.find((e) => e.episodeId === open.episodeId)?.triggerNo ?? null : null, sessionNo: 1};
  }
  const dash = createMirlDashboard({getModel: model, getLive: () => live(model()), T, actions: {export: () => toast('PDF export is not available for the SINE demonstration (simulated evidence).')}});

  /** Seconds to the next SINE stage of the current state, or null when time does not run towards one (nothing is invented). */
  function toNextStage() {
    if (!running()) return null;
    const s = rt.sine, hold = rt.normalBreak.holds || rt.mirl.recovery?.phase === 'CONFIRMING';
    if (hold) return null;
    if (!s.episodeId || s.state === 'CLOSED') return rt.available && rt.observation.kind === 'SOCIAL' ? Math.max(0.25, 300 - (s.state === 'CLOSED' ? 0 : s.dwell)) : null;
    return s.remaining !== null && s.stage < 3 ? s.remaining : null;
  }
  const act = (fn) => () => { try { fn(); msg = ''; } catch (e) { msg = e.message || String(e); } render(); };
  const advance = (sec) => { if (!running()) throw new Error('Start a demonstration session first.'); rt.advance(sec); };
  /** TRIGGER NEXT SINE POPUP: only the existing controls, in order — start the session, open the social feed, advance to the engine's next stage. No timing is changed. */
  function triggerNext() {
    if (!running()) start();
    const s = rt.sine;
    if (!(s.episodeId && s.state !== 'CLOSED') && !(rt.available && rt.observation.kind === 'SOCIAL')) rt.setEvidence(SURFACES.social);
    const n = toNextStage();
    if (n === null) throw new Error(rt.normalBreak.holds ? 'Time towards the next SINE step is held by the Normal Break.' : s.stage >= 3 ? 'SINE-3 is the last stage; return to the work task so MIRL can verify the return.' : 'No further SINE popup is due now.');
    advance(Math.ceil(n * 4) / 4);
  }

  function controls() {
    const sel = el('select', {class: 'wl-input st-select', id: 'sdActivity', 'aria-label': 'Simulated activity'}, ACTIVITIES.map(([k, s]) => el('option', {value: k}, `${s.label} (${s.kind})`)));
    sel.value = rt ? (ACTIVITIES.find(([, s]) => s.resourceId === rt.observation.resourceId) || ['task'])[0] : 'task';
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const next = toNextStage(), s = rt && rt.sine, pop = s && s.popup && s.popup.displayed ? s.popup : null, nb = rt && rt.normalBreak;
    const row1 = el('div', {class: 'st-ctl'}, mk('TRIGGER NEXT SINE POPUP', 'sdTrigger', triggerNext, true, 'primary'), mk(rt ? 'RESTART DEMONSTRATION SESSION' : 'START DEMONSTRATION SESSION', 'sdStart', () => start(), true),
      mk('RESET DEMONSTRATION', 'sdReset', () => { rt = null; breakMinutes = 5; }, !!rt, 'ghost'), mk('END SESSION', 'sdEnd', () => rt.end('ENDED'), running()));
    const row2 = el('div', {class: 'st-ctl'}, sel, mk('SWITCH ACTIVITY', 'sdSwitch', () => rt.setEvidence(SURFACES[sel.value]), running()),
      mk('WORK TASK', 'sdTask', () => rt.setEvidence(SURFACES.task), running()), mk('SOCIAL FEED', 'sdSocial', () => rt.setEvidence(SURFACES.social), running()));
    const row3 = el('div', {class: 'st-ctl'}, [['+5 SEC', 5], ['+10 SEC', 10], ['+30 SEC', 30], ['+1 MIN', 60], ['+5 MIN', 300], ['+10 MIN', 600]].map(([l, v]) => mk(l, 'sdAdv' + v, () => advance(v), running())),
      mk('ADVANCE TO NEXT SINE STEP', 'sdAdvNext', () => advance(Math.ceil(next * 4) / 4), running() && next !== null));
    const resp = el('div', {class: 'st-ctl st-allow', id: 'sdResponses'}, el('span', {class: 'st-lbl'}, 'SIMULATED USER RESPONSES:'),
      mk('RETURN INTENT', 'sdIntent', () => { if (!rt.command('SINE', 'return')) throw new Error('A displayed SINE-1 or SINE-2 is required.'); }, running() && !!pop && s.stage < 3),
      mk('NORMAL BREAK (SINE-1 ONLY)', 'sdBreak', () => rt.command('SINE', 'normal-break'), running() && !!pop && s.stage === 1 && rt.study.state !== 'ACTIVE'));
    const br = nb && nb.state === 'DURATION_ENTRY' ? el('div', {class: 'st-ctl st-allow', id: 'sdBreakEntry'}, el('span', {class: 'st-lbl'}, 'BREAK LENGTH (5–30 min):'),
      (() => { const i = el('input', {type: 'number', class: 'wl-input st-num', id: 'sdBreakMin', min: '5', max: '30', value: String(breakMinutes), 'aria-label': 'Break minutes'}); i.addEventListener('input', () => { breakMinutes = Number(i.value); }); return i; })(),
      mk('START BREAK', 'sdBreakStart', () => rt.command('NORMAL_BREAK', 'duration', breakMinutes), running()), mk('CANCEL', 'sdBreakCancel', () => rt.command('NORMAL_BREAK', 'cancel'), running(), 'ghost'))
      : nb && nb.state === 'ACTIVE' ? el('div', {class: 'st-ctl st-allow', id: 'sdBreakActive'}, el('span', {class: 'st-lbl'}, 'NORMAL BREAK ACTIVE — SINE and MIRL are held.'), mk('STOP BREAK EARLY', 'sdBreakStop', () => rt.command('NORMAL_BREAK', 'stop'), running()))
      : nb && nb.state === 'RESUME_GATE' ? el('div', {class: 'st-ctl st-allow', id: 'sdBreakGate'}, el('span', {class: 'st-lbl'}, 'BREAK OVER — acknowledge to continue with SINE-2.'), mk('RESUME', 'sdBreakResume', () => rt.command('NORMAL_BREAK', 'resume'), running())) : null;
    return el('section', {class: 'card st-card', id: 'sdControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'SINE DEMONSTRATION CONTROLS'), pill('SIMULATED EVIDENCE · NOT FROM ANY DATABASE FILE', 'warn')),
      el('p', {class: 'st-hint'}, 'A separate, manually clocked simulation of the approved SINE / MIRL rules: after 5:00 of social-feed dwell SINE-1 is displayed; SINE-2 follows 10:00 later and SINE-3 (protected red) 13:15 after that. A RETURN INTENT is only an intention. MIRL verifies a return only after the engine\'s own rule (work task kept for 10 s, then confirmed after 60 s). Nothing here is stored, uploaded or mixed with imported evidence.'),
      row1, row2, row3, resp, br, el('p', {class: 'st-msg', id: 'sdMsg', role: 'status', 'aria-live': 'polite'}, msg),
      el('p', {class: 'st-hint', id: 'sdNextHint'}, !running() ? 'No demonstration session is running.' : next === null ? (rt.normalBreak.holds ? 'Time towards the next SINE step is held by the Normal Break.' : rt.mirl.recovery?.phase === 'CONFIRMING' ? 'SINE is held while MIRL confirms the return.' : 'No SINE step is counting down (switch to the social feed to start the 5:00 dwell).') : `Next SINE step in ${fmtS(next)}.`));
  }
  function status() {
    const r = rt, m = model(), l = live(m), run = !!r && ['ACTIVE', 'PAUSED'].includes(r.state);
    const cells = [['SIMULATED CLOCK', run || (r && r.session) ? fmtS(r.time) : '00:00', 'sdClock'], ['SESSION', !r ? 'NOT STARTED' : r.state, 'sdState'], ['ACTIVITY', r ? ((Object.values(SURFACES).find((x) => x.resourceId === r.observation.resourceId) || {}).label || r.observation.kind) : '—', 'sdActivityNow'], ['SINE', l.sineStage, 'sdStage'],
      ['SOCIAL DWELL', !r ? '—' : r.sine.episodeId && r.sine.state !== 'CLOSED' ? 'EPISODE OPEN' : r.sine.state === 'CLOSED' ? 'EPISODE CLOSED' : `${fmtS(r.sine.dwell)} / 05:00`, 'sdDwell'], ['MIRL RETURN', r && r.mirl.recovery ? `${r.mirl.recovery.phase} ${fmtS(r.mirl.recovery.seconds)}` : r && r.mirl.episodeId && r.mirl.state !== 'CLOSED' ? 'WAITING FOR RETURN' : '—', 'sdRecovery'],
      ['EPISODES', String(m.episodes.length), 'sdEpisodes'], ['VERIFIED RETURNS', String(m.verified), 'sdVerified']];
    return el('div', {class: 'cot-tiles sd-status', id: 'sdStatus'}, cells.map(([k, v, id]) => el('div', {class: 'st-tile'}, el('span', {}, k), el('b', {id, class: 'fn-small'}, v))));
  }
  function modeBar() {
    const mk = (label, id, on) => button(label, () => { active = id === 'mirlModeDemo'; if (!active) clearStage('sine'); onChange(true); }, {class: 'st-btn' + (on ? ' primary' : ''), id, 'aria-pressed': String(on)});
    return el('div', {class: 'st-ctl sd-modebar', id: 'mirlModeBar', role: 'group', 'aria-label': 'Live MIRL source'}, mk('BROWSER SESSION', 'mirlModeBrowser', !active), mk('SINE DEMONSTRATION (SIMULATION)', 'mirlModeDemo', active),
      active ? pill('SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE', 'warn') : null);
  }
  function mount(host) {
    hostRef = host;
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '';
    const m = model(), page = buildMirlPage({model: m, live: live(m), T, actions: {refresh: () => render(), open: () => dash.open(host.querySelector('#mirlOpenDash'))}});
    host.replaceChildren(modeBar(), el('div', {class: 'mh-wrap st-wrap'}, el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'SINE — LIVE MIRL DEMONSTRATION'), el('p', {class: 'st-hint'}, 'Interactive browser simulation of the SINE stage progression and the MIRL event journey. Simulated clock — nothing is monitored.'))), status(), controls()), page);
    if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    if (dash.isOpen) dash.refresh();
    syncRuntimePopup(rt, {owner: 'sine', alive: visibleId('sdControls'), after: render, toast});
  }
  function render() { if (hostRef && hostRef.isConnected && active) mount(hostRef); }
  return {get active() { return active; }, bar: modeBar, mount, render, getRuntime: () => rt, getModel: model, closeDashboard: () => dash.close()};
}
