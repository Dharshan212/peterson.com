// MINE — interactive BROWSER DEMONSTRATION (MYELIN Web Lite), same pattern as the SINE demonstration.
// It does NOT re-implement any rule: it drives the existing MINE organ (the approved timing and event rules of this build's Runtime) in a SEPARATE demonstration Runtime on a MANUAL, deterministic clock
// (nothing advances unless a button is pressed). The simulated events are rendered through the existing MINE Main Station page and the existing "MINE — Deep Analysis" dashboard
// (mineModel / buildMinePage / createMineAnalysis). It never touches the Control Station runtime, the stored local history, an imported database file or Science Lab: simulated events live only in this
// module's memory and are labelled SIMULATION. Popups are displayed the instant they are requested (the interface's role in the real page); display failures are not part of the demonstration.
import {el, button} from './dom.js';
import {Runtime} from './runtime.js';
import {SURFACES} from './simulator.js';
import {mineModel, buildMinePage, createMineAnalysis} from './mine-station.js';
import {syncRuntimePopup, clearStage, visibleId} from './popup-stage.js';

const KINDS = ['TASK', 'MESSAGING', 'ORDINARY', 'UNKNOWN'];
const ACTIVITIES = Object.entries(SURFACES).filter(([, s]) => KINDS.includes(s.kind));
const MESSAGERS = ACTIVITIES.filter(([, s]) => s.kind === 'MESSAGING');
const fmtS = (s) => { const t = Math.floor(Math.max(0, s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
const IDLE_LIVE = {available: true, active: false, paused: false, hasEpisode: false, state: 'No active episode', platform: 'Unavailable', branch: 'Unavailable', returnStatus: 'No active episode'};

export function createMineDemo({T, mineLive, now = () => Date.now(), onChange = () => {}, toast = () => {}}) {
  let rt = null, base = now(), active = false, msg = '', allowMinutes = 5, hostRef = null;
  const wall = () => base + Math.round((rt ? rt.time : 0) * 1000);   // simulated wall clock: demonstration start + simulated seconds
  const running = () => !!rt && rt.state === 'ACTIVE';
  function instantDisplay(o) { const orig = o.request.bind(o); o.request = (...a) => { orig(...a); if (o.popup && !o.popup.displayed) o.r.display(o.popup.id); }; }
  function start() { base = now(); rt = new Runtime({namespace: 'demo', wallNow: wall}); rt.start({speed: 1}); instantDisplay(rt.mine); }
  const openEpisode = () => (rt && ['ACTIVE', 'PAUSED'].includes(rt.state) && rt.mine.episodeId && rt.mine.state !== 'CLOSED' ? {episodeId: rt.mine.episodeId, sessionId: rt.session.id} : null);
  const model = () => mineModel(rt && rt.session ? [rt.snapshot()] : [], openEpisode());
  const live = () => (rt && rt.session ? mineLive(rt) : IDLE_LIVE);
  const analysis = createMineAnalysis({getModel: model, T, actions: {export: () => toast('PDF export is not available for the MINE demonstration (simulated evidence).')}});

  /** Seconds to the next MINE step of the current state, or null when time does not run towards one (nothing is invented). */
  function toNextStep() {
    if (!running()) return null;
    const m = rt.mine, messaging = rt.available && rt.observation.kind === 'MESSAGING';
    if (!m.episodeId || m.state === 'CLOSED') return messaging ? Math.max(0.25, 600 - (m.state === 'CLOSED' ? 0 : m.dwell)) : null;
    if (m.recovery) return null;
    if (m.state === 'RETURN_INTENT_ACTIVE') return messaging && m.remaining > 0 ? m.remaining : null;
    if (m.state === 'IMPORTANT_ALLOWANCE_ACTIVE') return Math.max(0.25, m.deadline - rt.time);
    return null;
  }
  const act = (fn) => () => { try { fn(); msg = ''; } catch (e) { msg = e.message || String(e); } render(); };
  const advance = (sec) => { if (!running()) throw new Error('Start a demonstration session first.'); rt.advance(sec); };
  /** TRIGGER NEXT MINE POPUP: only the existing controls — start the session, open a messaging platform, advance to the engine's next MINE step. No timing is changed. */
  function triggerNext() {
    if (!running()) start();
    const m = rt.mine;
    if (!(m.episodeId && m.state !== 'CLOSED') && !(rt.available && rt.observation.kind === 'MESSAGING')) rt.setEvidence(SURFACES.chatA);
    const n = toNextStep();
    if (n === null) throw new Error('No further MINE popup is due now: answer a displayed popup, keep a messaging platform open for the window, or return to the work task.');
    advance(Math.ceil(n * 4) / 4);
  }

  function controls() {
    const sel = el('select', {class: 'wl-input st-select', id: 'mdActivity', 'aria-label': 'Simulated activity'}, ACTIVITIES.map(([k, s]) => el('option', {value: k}, `${s.label} (${s.kind})`)));
    sel.value = rt ? (ACTIVITIES.find(([, s]) => s.resourceId === rt.observation.resourceId) || ['task'])[0] : 'task';
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const m = rt && rt.mine, next = toNextStep(), pop = m && m.popup && m.popup.displayed ? m.popup : null;
    const row1 = el('div', {class: 'st-ctl'}, mk('TRIGGER NEXT MINE POPUP', 'mdTrigger', triggerNext, true, 'primary'), mk(rt ? 'RESTART DEMONSTRATION SESSION' : 'START DEMONSTRATION SESSION', 'mdStart', () => start(), true),
      mk('RESET DEMONSTRATION', 'mdReset', () => { rt = null; allowMinutes = 5; }, !!rt, 'ghost'), mk('END SESSION', 'mdEnd', () => rt.end('ENDED'), running()));
    const row2 = el('div', {class: 'st-ctl'}, sel, mk('SWITCH ACTIVITY', 'mdSwitch', () => rt.setEvidence(SURFACES[sel.value]), running()), mk('WORK TASK', 'mdTask', () => rt.setEvidence(SURFACES.task), running()),
      ...MESSAGERS.map(([k, s]) => mk(String(s.platform || s.label).toUpperCase(), 'md' + k.charAt(0).toUpperCase() + k.slice(1), () => rt.setEvidence(SURFACES[k]), running())));
    const row3 = el('div', {class: 'st-ctl'}, [['+5 SEC', 5], ['+10 SEC', 10], ['+30 SEC', 30], ['+1 MIN', 60], ['+5 MIN', 300], ['+10 MIN', 600]].map(([l, v]) => mk(l, 'mdAdv' + v, () => advance(v), running())),
      mk('ADVANCE TO NEXT MINE STEP', 'mdAdvNext', () => advance(Math.ceil(next * 4) / 4), running() && next !== null));
    const resp = el('div', {class: 'st-ctl st-allow', id: 'mdResponses'}, el('span', {class: 'st-lbl'}, 'SIMULATED USER RESPONSES (MINE-1):'),
      mk('I WILL COME BACK', 'mdBack', () => { if (!rt.command('MINE', 'come-back')) throw new Error('A displayed MINE-1 is required.'); }, running() && !!m && m.state === 'MINE1_ACTIVE' && !!pop),
      mk("IT'S IMPORTANT", 'mdImportant', () => { if (!rt.command('MINE', 'important')) throw new Error('A displayed MINE-1 is required.'); }, running() && !!m && m.state === 'MINE1_ACTIVE' && !!pop));
    const entry = m && m.state === 'IMPORTANT_DURATION_ENTRY' ? el('div', {class: 'st-ctl st-allow', id: 'mdAllowEntry'}, el('span', {class: 'st-lbl'}, 'IMPORTANT ALLOWANCE (5–30 min):'),
      (() => { const i = el('input', {type: 'number', class: 'wl-input st-num', id: 'mdAllowMin', min: '5', max: '30', value: String(allowMinutes), 'aria-label': 'Allowance minutes'}); i.addEventListener('input', () => { allowMinutes = Number(i.value); }); return i; })(),
      mk('START ALLOWANCE', 'mdAllowStart', () => { if (!rt.command('MINE', 'duration', allowMinutes)) throw new Error('The allowance could not be started.'); }, running())) : null;
    const hint = !running() ? 'No demonstration session is running.' : next === null ? (m.recovery ? 'MINE is verifying the return; no step counts down.' : m.state === 'MINE1_ACTIVE' ? 'Waiting for a response to MINE-1.' : m.state === 'RETURN_INTENT_ACTIVE' || !m.episodeId ? 'No MINE step is counting down (the 10:00 messaging dwell and the 13:15 window only run while a messaging platform is open).' : 'No MINE step is counting down.') : `Next MINE step in ${fmtS(next)}.`;
    return el('section', {class: 'card st-card', id: 'mdControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'MINE DEMONSTRATION CONTROLS'), pill('SIMULATED EVIDENCE · NOT FROM ANY DATABASE FILE', 'warn')),
      el('p', {class: 'st-hint'}, 'A separate, manually clocked simulation of the approved MINE rules: after 10:00 of messaging dwell MINE-1 is displayed. "I will come back" opens a 13:15 return window; "It\'s important" asks for a 5–30 minute allowance. When the window or allowance ends while messaging continues, MINE-2A / MINE-2B is displayed. A response is only an intention: a return is verified only by the engine\'s own return rule (task focus kept, then a closure confirmation). Nothing here is stored, uploaded or mixed with imported evidence.'),
      row1, row2, row3, resp, entry, el('p', {class: 'st-msg', id: 'mdMsg', role: 'status', 'aria-live': 'polite'}, msg), el('p', {class: 'st-hint', id: 'mdNextHint'}, hint));
  }
  function status() {
    const r = rt, mod = model(), l = live(), mn = r && r.mine, run = !!r && ['ACTIVE', 'PAUSED'].includes(r.state);
    const dwell = !r ? '—' : mn.episodeId && mn.state !== 'CLOSED' ? 'EPISODE OPEN' : mn.state === 'CLOSED' ? 'EPISODE CLOSED' : `${fmtS(mn.dwell)} / 10:00`;
    const cells = [['SIMULATED CLOCK', r && r.session ? fmtS(r.time) : '00:00', 'mdClock'], ['SESSION', !r ? 'NOT STARTED' : r.state, 'mdState'], ['ACTIVITY', r ? ((Object.values(SURFACES).find((x) => x.resourceId === r.observation.resourceId) || {}).label || r.observation.kind) : '—', 'mdActivityNow'],
      ['MINE STATE', run || (r && r.session) ? l.state : '—', 'mdMineState'], ['PLATFORM', run || (r && r.session) ? l.platform : '—', 'mdPlatform'], ['BRANCH', run || (r && r.session) ? l.branch : '—', 'mdBranch'], ['RETURN STATUS', run || (r && r.session) ? l.returnStatus : '—', 'mdReturn'],
      ['MESSAGING DWELL', dwell, 'mdDwell'], ['EPISODES', String(mod.episodes.length), 'mdEpisodes']];
    return el('div', {class: 'cot-tiles sd-status', id: 'mdStatus'}, cells.map(([k, v, id]) => el('div', {class: 'st-tile'}, el('span', {}, k), el('b', {id, class: 'fn-small'}, v))));
  }
  function modeBar() {
    const mk = (label, id, on) => button(label, () => { active = id === 'mineModeDemo'; if (!active) { analysis.close(); clearStage('mine'); } onChange(); }, {class: 'st-btn' + (on ? ' primary' : ''), id, 'aria-pressed': String(on)});
    return el('div', {class: 'st-ctl sd-modebar', id: 'mineModeBar', role: 'group', 'aria-label': 'MINE source'}, mk('BROWSER SESSION', 'mineModeBrowser', !active), mk('MINE DEMONSTRATION (SIMULATION)', 'mineModeDemo', active),
      active ? pill('SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE', 'warn') : null);
  }
  function mount(host) {
    hostRef = host;
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '';
    const m = model(), page = buildMinePage({model: m, live: live(), T, actions: {refresh: () => render(), view: () => analysis.open(host.querySelector('#mnView'))}});
    host.replaceChildren(modeBar(), el('div', {class: 'mh-wrap st-wrap'}, el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'MINE — DEMONSTRATION'), el('p', {class: 'st-hint'}, 'Interactive browser simulation of the MINE messaging intervention, its user responses and the episode journey. Simulated clock — nothing is monitored.'))), status(), controls()), page);
    if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    if (analysis.isOpen) analysis.refresh();
    syncRuntimePopup(rt, {owner: 'mine', alive: visibleId('mdControls'), after: render, toast});
  }
  function render() { if (hostRef && hostRef.isConnected && active) mount(hostRef); }
  return {get active() { return active; }, bar: modeBar, mount, render, getRuntime: () => rt, getModel: model, closeAnalysis: () => analysis.close()};
}
