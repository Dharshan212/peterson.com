// COSINE — interactive BROWSER DEMONSTRATION (MYELIN Web Lite), same pattern as the SINE and MINE demonstrations.
// It does NOT re-implement or invent any rule: it drives the existing COSINE organ (this build's Runtime, which follows the approved COSINE rules) in a SEPARATE demonstration Runtime on a MANUAL,
// deterministic clock (nothing advances unless a button is pressed). Approved rules shown: 300 s of supported OTT foreground evidence -> the Intention Gate; "I'll come back" starts a 300 s
// return-intent window (continued OTT converts it to a break request); "I want some break" asks for 10-200 whole minutes; the YAY acknowledgement does not change the break; at the deadline the
// button-less Final Callback appears; a return is verified only by the engine's own recovery rule; platform switches are Hopper transitions inside the same episode.
// The events are rendered through the existing COSINE page and "COSINE — Deep Analysis" dashboard (cosineModel / buildCosinePage / createCosineAnalysis). Nothing here touches the Control Station
// runtime, the stored local history, an imported database file or Science Lab; simulated events live only in this module's memory and are labelled SIMULATION. The two streaming platforms are the
// simulator's own surfaces: there is no platform detection. Popups are displayed the instant they are requested; display failures are not part of the demonstration.
// The popup the engine says is displayed is drawn in the CENTRE of the viewport by the shared popup stage (popup-stage.js); its buttons only call the same rt.command() paths as the controls below.
// A popup answer is an INTENTION, never proof of return: the return is verified only by the engine's own recovery rule.
import {el, button} from './dom.js';
import {Runtime} from './runtime.js';
import {SURFACES} from './simulator.js';
import {cosineModel, buildCosinePage, createCosineAnalysis} from './cosine-station.js';
import {showCard, clearStage, visibleId} from './popup-stage.js';

const KINDS = ['TASK', 'STREAMING', 'UNKNOWN', 'OFF_TASK'];
const ACTIVITIES = Object.entries(SURFACES).filter(([, s]) => KINDS.includes(s.kind));
const STREAMS = ACTIVITIES.filter(([, s]) => s.kind === 'STREAMING');
const fmtS = (s) => { const t = Math.floor(Math.max(0, s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
const IDLE_LIVE = {available: true, active: false, paused: false, state: '', platform: '', minutes: null, hops: 0};
const POPUP_TEXT = {INTENT_GATE: 'COSINE INTENTION GATE — IT SEEMS YOU ARE INTERESTED TO WATCH THIS SHOW', DURATION: 'HOW LONG WOULD YOU LIKE YOUR BREAK TO BE? (10–200 whole minutes)', BREAK_ACK: 'BREAK SET — acknowledge with YAY (the break clock does not change)', FINAL_CALLBACK: "HOPE YOU ENJOYED THE SHOW. NOW IT'S TIME TO FOCUS. (no buttons)"};

export function createCosineDemo({T, cosineLive, now = () => Date.now(), onChange = () => {}, toast = () => {}}) {
  let rt = null, base = now(), active = false, msg = '', breakMinutes = 10, hostRef = null;
  const cx = {sel: null, flowFor: null, fullFlow: false};
  const wall = () => base + Math.round((rt ? rt.time : 0) * 1000);   // simulated wall clock: demonstration start + simulated seconds
  const running = () => !!rt && rt.state === 'ACTIVE';
  function instantDisplay(o) { const orig = o.request.bind(o); o.request = (...a) => { orig(...a); if (o.popup && !o.popup.displayed) o.r.display(o.popup.id); }; }
  function start() { base = now(); rt = new Runtime({namespace: 'demo', wallNow: wall}); rt.start({speed: 1}); instantDisplay(rt.cosine); cx.sel = null; cx.flowFor = null; }
  const openEpisode = () => (rt && ['ACTIVE', 'PAUSED'].includes(rt.state) && rt.cosine.episodeId && rt.cosine.state !== 'CLOSED' ? {episodeId: rt.cosine.episodeId, sessionId: rt.session.id} : null);
  const model = () => cosineModel(rt && rt.session ? [rt.snapshot()] : [], openEpisode());
  const live = () => (rt && rt.session ? cosineLive(model(), rt) : IDLE_LIVE);
  const analysis = createCosineAnalysis({getModel: model, T, state: cx, actions: {export: () => toast('PDF export is not available for the COSINE demonstration (simulated evidence).'), rerender: () => render()}});

  /** Seconds to the next COSINE step of the current state, or null when time does not run towards one (nothing is invented). */
  function toNextStep() {
    if (!running()) return null;
    const c = rt.cosine, ott = rt.available && rt.observation.kind === 'STREAMING';
    if (!c.episodeId || c.state === 'CLOSED') return ott ? Math.max(0.25, 300 - (c.state === 'CLOSED' ? 0 : c.dwell)) : null;
    if (c.recovery) return null;
    if (c.state === 'RETURN_INTENT_OBSERVING') return ott && c.remaining > 0 ? c.remaining : null;
    if (c.state === 'BREAK_ACTIVE') return Math.max(0.25, c.deadline - rt.time);
    return null;
  }
  /** TRIGGER COSINE POPUP: only the existing controls — start the session if needed, open a streaming platform, advance to the engine's own 5:00 Intention Gate. */
  function triggerGate() {
    if (!rt || !running()) start();
    const c = rt.cosine;
    if (c.popup && c.popup.displayed) throw new Error('A COSINE popup is already displayed.');
    if (c.episodeId) throw new Error('COSINE has already passed its Intention Gate for this episode; use the controls below (or RESET DEMONSTRATION).');
    if (!(rt.available && rt.observation.kind === 'STREAMING')) rt.setEvidence(SURFACES[STREAMS[0][0]]);
    const next = toNextStep();
    if (next === null) throw new Error('No Intention Gate is due.');
    rt.advance(Math.ceil(next * 4) / 4);
  }
  const answer = (fn) => () => { try { fn(); msg = ''; render(); return {ok: true}; } catch (e) { msg = e.message || String(e); render(); return {ok: false, reason: msg}; } };
  const must = (ok, why) => { if (!ok) throw new Error(why); };
  /** The simulated popup the engine says is displayed, as a centred card (the wording is the desktop COSINE popup's; the buttons call the engine's own commands). */
  function popupSpec() {
    const c = rt && rt.cosine, p = c && c.popup;
    if (!rt || rt.state !== 'ACTIVE' || !p || !p.displayed) return null;
    const stage = String(p.stage), plat = rt.observation && rt.observation.platform;
    const base = {sig: `cosine-${p.id}-${stage}`, label: 'COSINE POPUP', world: 'blue', badge: 'COSINE', eyebrow: 'MYELIN · COSINE · SIMULATION', aria: 'COSINE popup (simulation)'};
    if (stage === 'INTENT_GATE') return {...base, headline: 'IT SEEMS YOU ARE INTERESTED TO WATCH THIS SHOW', message: plat ? `NOW PLAYING: ${plat}` : 'A supported streaming platform has had 5:00 of foreground evidence.',
      status: 'DISPLAYED · YOUR ANSWER IS AN INTENTION, NOT PROOF OF RETURN', footer: 'COSINE · INTENTION GATE · SIMULATION', buttons: [
        {label: "SORRY, I'LL COME BACK", id: 'cdPopIntent', onClick: answer(() => must(rt.command('COSINE', 'return-intention'), 'The Intention Gate is not displayed.'))},
        {label: 'YEAH, I WANT SOME BREAK', id: 'cdPopBreak', onClick: answer(() => must(rt.command('COSINE', 'intentional-break'), 'The Intention Gate is not displayed.'))}]};
    if (stage === 'DURATION') {
      const failed = rt.events.some((e) => e.organ === 'COSINE' && e.type === 'INTENT_CHOSEN' && e.episodeId === c.episodeId && e.payload && e.payload.choice === 'RETURN');
      let field = null;
      return {...base, headline: failed ? "IT SEEMS YOU'D LIKE TO KEEP WATCHING." : 'HOW LONG WOULD YOU LIKE YOUR BREAK TO BE?', message: failed ? "LET'S SET A LIMIT. I'LL CALL YOU BACK WHEN YOUR BREAK IS OVER." : 'WHOLE MINUTES, 10–200.',
        status: 'COSINE IS WAITING FOR YOUR CHOSEN MINUTES', footer: 'COSINE · BREAK DURATION · SIMULATION',
        extra: () => { field = el('input', {type: 'number', class: 'wl-input st-num', id: 'cdPopBreakMin', min: '10', max: '200', value: String(breakMinutes), 'aria-label': 'Break length in whole minutes'}); field.addEventListener('input', () => { breakMinutes = Number(field.value); }); return el('div', {class: 'pp-field-row'}, field, el('span', {class: 'pp-unit'}, 'MINS')); },
        buttons: [{label: failed ? 'START WATCHING' : 'SET TIME', id: 'cdPopSetTime', onClick: answer(() => must(rt.command('COSINE', 'duration', Number(field ? field.value : breakMinutes)), 'The break could not be started.'))}]};
    }
    if (stage === 'BREAK_ACK') {
      const k = rt.events.filter((e) => e.organ === 'COSINE' && e.type === 'BREAK_COMMITTED' && e.episodeId === c.episodeId).pop(), mins = k ? Math.round(k.payload.seconds / 60) : null;
      return {...base, headline: 'ENJOY THE SHOW', message: `I'LL CALL YOU BACK IN ${mins === null ? '--' : mins} MINS`, status: 'DISPLAYED · THE BREAK CLOCK IS NOT CHANGED BY THIS ACKNOWLEDGEMENT', footer: 'COSINE · BREAK ACKNOWLEDGEMENT · SIMULATION',
        buttons: [{label: 'YAY', id: 'cdPopYay', onClick: answer(() => must(rt.command('COSINE', 'ack'), 'No break acknowledgement is displayed.'))}]};
    }
    return {...base, world: 'green', protected: true, headline: 'HOPE YOU ENJOYED THE SHOW.', message: "NOW IT'S TIME TO FOCUS.", status: 'DISPLAYED · THE RETURN IS CHECKED FROM THE ACTIVITY, NOT FROM A BUTTON', noButtons: 'NO BUTTONS · FINAL CALLBACK', footer: 'COSINE · FINAL CALLBACK · SIMULATION'};
  }
  const act = (fn) => () => { try { fn(); msg = ''; } catch (e) { msg = e.message || String(e); } render(); };
  const advance = (sec) => { if (!running()) throw new Error('Start a demonstration session first.'); rt.advance(sec); };

  function controls() {
    const sel = el('select', {class: 'wl-input st-select', id: 'cdActivity', 'aria-label': 'Simulated activity'}, ACTIVITIES.map(([k, s]) => el('option', {value: k}, `${s.label} (${s.kind})`)));
    sel.value = rt ? (ACTIVITIES.find(([, s]) => s.resourceId === rt.observation.resourceId) || ['task'])[0] : 'task';
    const mk = (label, id, fn, on, cls = '') => { const b = button(label, act(fn), {class: 'st-btn ' + cls, id}); b.disabled = !on; return b; };
    const c = rt && rt.cosine, next = toNextStep(), pop = c && c.popup && c.popup.displayed ? c.popup : null, stage = pop ? String(pop.stage) : null;
    const row1 = el('div', {class: 'st-ctl'}, mk('TRIGGER COSINE POPUP', 'cdTrigger', triggerGate, true, 'primary'), mk(rt ? 'RESTART DEMONSTRATION SESSION' : 'START DEMONSTRATION SESSION', 'cdStart', () => start(), true),
      mk('RESET DEMONSTRATION', 'cdReset', () => { rt = null; breakMinutes = 10; cx.sel = null; cx.flowFor = null; clearStage('cosine'); }, !!rt, 'ghost'), mk('END SESSION', 'cdEnd', () => rt.end('ENDED'), running()));
    const row2 = el('div', {class: 'st-ctl'}, sel, mk('SWITCH ACTIVITY', 'cdSwitch', () => rt.setEvidence(SURFACES[sel.value]), running()), mk('WORK TASK', 'cdTask', () => rt.setEvidence(SURFACES.task), running()),
      ...STREAMS.map(([k, s]) => mk(String(s.platform || s.label).toUpperCase(), 'cd' + k.charAt(0).toUpperCase() + k.slice(1), () => rt.setEvidence(SURFACES[k]), running())));
    const row3 = el('div', {class: 'st-ctl'}, [['+5 SEC', 5], ['+10 SEC', 10], ['+30 SEC', 30], ['+1 MIN', 60], ['+5 MIN', 300], ['+10 MIN', 600]].map(([l, v]) => mk(l, 'cdAdv' + v, () => advance(v), running())),
      mk('ADVANCE TO NEXT COSINE STEP', 'cdAdvNext', () => advance(Math.ceil(next * 4) / 4), running() && next !== null));
    const popupCard = el('div', {class: 'st-ctl st-allow', id: 'cdPopup'}, el('span', {class: 'st-lbl', id: 'cdPopupText'}, stage ? `SIMULATED COSINE POPUP — ${POPUP_TEXT[stage] || stage}` : 'SIMULATED COSINE POPUP — none is displayed'),
      mk("SORRY, I'LL COME BACK", 'cdIntent', () => { if (!rt.command('COSINE', 'return-intention')) throw new Error('The Intention Gate is not displayed.'); }, running() && stage === 'INTENT_GATE'),
      mk('YEAH, I WANT SOME BREAK', 'cdBreak', () => { if (!rt.command('COSINE', 'intentional-break')) throw new Error('The Intention Gate is not displayed.'); }, running() && stage === 'INTENT_GATE'),
      mk('YAY', 'cdYay', () => { if (!rt.command('COSINE', 'ack')) throw new Error('No break acknowledgement is displayed.'); }, running() && stage === 'BREAK_ACK'));
    const entry = stage === 'DURATION' ? el('div', {class: 'st-ctl st-allow', id: 'cdDurationEntry'}, el('span', {class: 'st-lbl'}, 'BREAK LENGTH (whole minutes, 10–200):'),
      (() => { const i = el('input', {type: 'number', class: 'wl-input st-num', id: 'cdBreakMin', min: '10', max: '200', value: String(breakMinutes), 'aria-label': 'Break minutes'}); i.addEventListener('input', () => { breakMinutes = Number(i.value); }); return i; })(),
      mk('START BREAK', 'cdBreakStart', () => { if (!rt.command('COSINE', 'duration', breakMinutes)) throw new Error('The break could not be started.'); }, running())) : null;
    const hint = !running() ? 'No demonstration session is running.' : next === null ? (c.recovery ? 'COSINE is verifying the return; no step counts down.' : stage === 'INTENT_GATE' ? 'The Intention Gate stays displayed until a choice is made; the engine has no timeout for an unanswered gate, so nothing happens by itself.' : 'No COSINE step is counting down (the 5:00 of OTT evidence and the 5:00 return-intent window only run while a streaming platform is open).') : `Next COSINE step in ${fmtS(next)}.`;
    return el('section', {class: 'card st-card', id: 'cdControls'}, el('div', {class: 'st-card-h'}, el('h3', {}, 'COSINE DEMONSTRATION CONTROLS'), pill('SIMULATED EVIDENCE · NOT FROM ANY DATABASE FILE', 'warn')),
      el('p', {class: 'st-hint'}, 'A separate, manually clocked simulation of the approved COSINE rules. After 5:00 of streaming evidence the Intention Gate appears. "Sorry, I\'ll come back" is only an intention (a 5:00 return window; continued streaming converts it into a break request); "Yeah, I want some break" asks for 10–200 minutes. At the break deadline the button-less Final Callback appears. A return is verified only by the engine\'s own recovery rule (focus kept, then a closure confirmation); switching between Netflix and Prime Video is a Hopper transition inside the same episode. Nothing here is stored, uploaded or mixed with imported evidence, and no platform is detected.'),
      row1, row2, row3, popupCard, entry, el('p', {class: 'st-msg', id: 'cdMsg', role: 'status', 'aria-live': 'polite'}, msg), el('p', {class: 'st-hint', id: 'cdNextHint'}, hint));
  }
  function status() {
    const r = rt, mod = model(), l = live(), c = r && r.cosine, run = !!r && r.session;
    const dwell = !r ? '—' : c.episodeId && c.state !== 'CLOSED' ? 'EPISODE OPEN' : c.state === 'CLOSED' ? 'EPISODE CLOSED' : `${fmtS(c.dwell)} / 05:00`;
    const brk = r && c.state === 'BREAK_ACTIVE' ? `${fmtS(Math.max(0, c.deadline - r.time))} LEFT` : '—';
    const cells = [['SIMULATED CLOCK', run ? fmtS(r.time) : '00:00', 'cdClock'], ['SESSION', !r ? 'NOT STARTED' : r.state, 'cdState'], ['ACTIVITY', r ? ((Object.values(SURFACES).find((x) => x.resourceId === r.observation.resourceId) || {}).label || r.observation.kind) : '—', 'cdActivityNow'],
      ['COSINE STATE', run ? (l.state || 'Inactive') : '—', 'cdCosineState'], ['PLATFORM', run ? (l.platform || '—') : '—', 'cdPlatform'], ['OTT DWELL', dwell, 'cdDwell'], ['BREAK', brk, 'cdBreakLeft'],
      ['HOPPER TRANSITIONS', run ? String(mod.episodes.reduce((a, e) => a + (e.hopperCount || 0), 0)) : '—', 'cdHops'], ['EPISODES', String(mod.episodes.length), 'cdEpisodes']];
    return el('div', {class: 'cot-tiles sd-status', id: 'cdStatus'}, cells.map(([k, v, id]) => el('div', {class: 'st-tile'}, el('span', {}, k), el('b', {id, class: 'fn-small'}, v))));
  }
  function modeBar() {
    const mk = (label, id, on) => button(label, () => { active = id === 'cosineModeDemo'; if (!active) { analysis.close(); clearStage('cosine'); } onChange(); }, {class: 'st-btn' + (on ? ' primary' : ''), id, 'aria-pressed': String(on)});
    return el('div', {class: 'st-ctl sd-modebar', id: 'cosineModeBar', role: 'group', 'aria-label': 'COSINE source'}, mk('BROWSER SESSION', 'cosineModeBrowser', !active), mk('COSINE DEMONSTRATION (SIMULATION)', 'cosineModeDemo', active),
      active ? pill('SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE', 'warn') : null);
  }
  function mount(host) {
    hostRef = host;
    const focusId = document.activeElement && host.contains(document.activeElement) ? document.activeElement.id : '';
    const m = model(), page = buildCosinePage({model: m, live: live(), T, state: cx, actions: {refresh: () => render(), open: () => analysis.open(host.querySelector('#cxOpen')), rerender: () => render()}});
    host.replaceChildren(modeBar(), el('div', {class: 'mh-wrap st-wrap'}, el('div', {class: 'st-title'}, el('div', {}, el('h1', {}, 'COSINE — DEMONSTRATION'), el('p', {class: 'st-hint'}, 'Interactive browser simulation of the COSINE streaming intervention, its responses, Hopper transitions and the episode journey. Simulated clock — nothing is monitored.'))), status(), controls()), page);
    if (focusId) { const f = host.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus(); }
    if (analysis.isOpen) analysis.refresh();
    showCard(popupSpec(), {owner: 'cosine', alive: visibleId('cdControls')});
  }
  function render() { if (hostRef && hostRef.isConnected && active) mount(hostRef); }
  return {get active() { return active; }, bar: modeBar, mount, render, getRuntime: () => rt, getModel: model, closeAnalysis: () => analysis.close()};
}
