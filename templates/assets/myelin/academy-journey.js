// MYELIN Academy — the guided JOURNEY (chapters for the existing Academy engine in academy.js; the original eight-chapter tour is untouched and still available as the CLASSIC TOUR).
// The mascot explains, the visitor operates the real Web Lite control, MYELIN responds. In the first chapters (Control Station, Live Telemetry, Study Mode) a step advances only when its action is detected
// from real simulation facts. From the Study hand-off on (SECANT, COSECANT) the Academy PLAYS the flow: it narrates, then presses the REAL control or popup button itself (extra.auto) so the visitor sees the
// happenings without waiting; the visitor may press the control first, press DO IT NOW / NEXT, take over with I'LL DO IT, or hover the guide to hold it. The step is still only DONE when the real
// simulation fact is observed. Every event is SIMULATED and isolated (tutorial runtime, or the demonstrations' own in-memory sessions).
// Order: Control Station -> Live Telemetry -> Study Mode (parts, keywords, time, START) -> SECANT 1/2/3 -> COSECANT break -> choose ONE of six organs (not COT) -> its guided tutorial -> the closing letter.
import {el, button} from './dom.js';

const $ = (id) => document.getElementById(id);
const T = (id) => (($(id) || {}).textContent || '').trim();
const stageHead = () => { const p = document.querySelector('#wlDemoStage.on .wl-pp'); return p ? ((p.querySelector('h2') || {}).textContent || '').trim() : null; };
const dashOpen = () => !!document.querySelector('.glass-overlay.open');
const logHas = (list, type) => [...document.querySelectorAll(`#${list} li b`)].some((b) => b.textContent === type);
const lab = () => window.myelinStudyLab;
const labS = () => (lab() ? lab().state : null);
const press = (id) => { const b = $(id); if (b && !b.disabled) b.click(); };           // used ONLY for mode switches / resets while a chapter is being set up
const demoMode = (id) => { const b = $(id); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const setIn = (id, v) => { const i = $(id); if (i && !i.disabled) { i.value = String(v); i.dispatchEvent(new Event('input', {bubbles: true})); } };
const popupBtn = (label) => { const b = [...document.querySelectorAll('#wlDemoStage .wl-pp button')].find((x) => !x.disabled && x.textContent.trim().toUpperCase().includes(label)); if (b) { b.click(); return true; } return false; };
const closeDash = () => { const o = document.querySelector('.glass-overlay.open'); if (!o) return; const a = document.activeElement; (a && o.contains(a) ? a : o).dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); };
const pickScn = (w) => { const b = [...document.querySelectorAll('#acScenario button')].find((x) => x.textContent.toLowerCase().includes(w)); if (b) b.click(); return !!b; };
const tutBtn = (label) => { const b = [...document.querySelectorAll('#wlPopup button')].find((x) => !x.disabled && x.textContent.toUpperCase().includes(label)); if (b) b.click(); return !!b; };
const btnText = (label) => { const b = [...document.querySelectorAll('button')].find((x) => !x.disabled && x.textContent.trim().toUpperCase().includes(label)); if (b) b.click(); return !!b; };
const STOPW = new Set('this that these those with from your you the and for into about what when how why are was were lecture lesson video part full episode course class tutorial'.split(' '));
const titleWords = (s) => [...new Set((String(s).toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).filter((w) => !STOPW.has(w)))];
/** The guide's suggestion for a custom video: the longest words name the topic (important, 2 points), the others are ordinary keywords (1 point). */
const suggest = (title) => { const w = titleWords(title); if (w.length < 2) return {ok: false}; const byLen = [...w].sort((a, b) => b.length - a.length); const imp = byLen.slice(0, Math.min(2, w.length - 1)); const kw = w.filter((x) => !imp.includes(x)).slice(0, 5); const cap = (x) => x[0].toUpperCase() + x.slice(1); return {ok: true, subject: cap(imp[0]), keywords: kw.join(', '), important: imp.join(', ')}; };
const feedHas = (tag) => !!document.querySelector(`#feed .feed-item[data-badge="${tag}"]`);

export const ORGANS = [
  {key: 'sine', name: 'SINE / Live MIRL', line: 'Social-feed drift: a gentle three-stage reminder, and a recorded return.', tone: 'red'},
  {key: 'mine', name: 'MINE', line: 'Messaging: a question after ten minutes, a promise to come back, and what follows.', tone: 'violet'},
  {key: 'cosine', name: 'COSINE', line: 'Streaming: the five-minute intention gate, return intention or an intentional break.', tone: 'cyan'},
  {key: 'store', name: 'STORE', line: 'Shopping: a prompt at ten minutes and a chosen shopping time.', tone: 'amber'},
  {key: 'fine', name: 'FINE', line: 'Food ordering: a warning, an intentional food break, and the order outcome.', tone: 'green'},
  {key: 'tangent', name: 'TANGENT', line: 'Gaming: a persistent reminder with no buttons at 23:15.', tone: 'blue'}];

/** Exact closing letter (supplied by the creator). One entry = one paragraph. */
export const LETTER = [
  'Before you go...',
  'If you\'ve made it this far, thank you for spending a little of your time with MYELIN.',
  'I started building MYELIN because of something I kept wondering about.',
  'We open a website, watch a video, read a message, or begin working on something important. Sometimes, without really noticing, one thing leads to another. And somewhere along the way, the reason we started can slip into the background.',
  'I became curious about that moment.',
  'Not just when we get distracted, but what happens afterward. When we decide to return. When we choose to continue. When a simple reminder gives us an opportunity to reconsider what we wanted to do.',
  'I couldn\'t see what someone was thinking, and I didn\'t want to pretend that I could.',
  'So I built MYELIN to observe the interactions we can actually see, ask gentle questions, and explore what happens next.',
  'MYELIN was never meant to judge how you spend your time.',
  'Sometimes a break is exactly what you need. Sometimes a conversation matters more than the work waiting for you. And sometimes you simply want to finish what you started.',
  'Those choices belong to you.',
  'I don\'t know where you\'ll go after closing this guide. Perhaps back to your studies, a favourite video, a message from someone, or something entirely different.',
  'Whatever it is, I hope it\'s something you\'ve chosen for yourself.',
  'Thank you for exploring my little piece of research.',
  'What I saw, I built. What happens next is your choice.',
  '— Dharshan Keba (aka) Peterson',
  'MYELIN Creator'];

export function createJourney(api) {
  const {app} = api;
  const J = {organ: null, chapters: [], letterEl: null, organsEl: null, pad: 13, manual: false, modeAsked: false, video: 'default', isManual: () => J.manual};   // pad: typical length of the organ tutorial still to come, so the progress bar does not jump back when one is chosen
  const rt = () => app.getRuntime();
  /** step(id, target, say, done, {hint, enter, speed, scen}) in the engine's shape: [target, say, predicate, hintFn, speed, scenarioKeys, extra]. */
  const st = (id, target, say, done = () => true, o = {}) => [target, say, done, null, o.speed ?? null, o.scen ?? null, {...o, id}];
  const demo = (modeBtn, resetBtn, extra) => async () => { demoMode(modeBtn); await new Promise((r) => setTimeout(r, 60)); if (resetBtn) press(resetBtn); if (extra) extra(); };

  // ---------------------------------------------------------------- 1. CONTROL STATION (conversation: praise each press, short Engine Core summary, then a YES/NO gate)
  const control = {name: 'CONTROL', title: 'The Control Station', page: 'control', setup: () => { J.manual = false; J.modeAsked = false; J.video = 'default'; const r = rt(); if (['ACTIVE', 'PAUSED'].includes(r.state)) r.end('INTERRUPTED'); }, steps: [
    st('ctl.start', '#btnEngineStart', 'Hey, I\'m your MYELIN guide, and this is the Engine Core. Press START to begin a safe, simulated session.', (r) => r.state === 'ACTIVE', {direct: true, praise: 'Great, you pressed START! The engine is running.', hint: 'Press the green START button in the Engine Core card.'}),
    st('ctl.pause', '#btnEnginePause', 'PAUSE freezes everything at once. Give it a press.', (r) => r.state === 'PAUSED', {direct: true, praise: 'You just paused MYELIN. Now try pressing RESUME.', hint: 'Press PAUSE. The same button will then read RESUME.'}),
    st('ctl.resume', '#btnEnginePause', 'Go on, press RESUME. It\'s the same button.', (r) => r.events.some((e) => e.type === 'SESSION_RESUMED') && r.state === 'ACTIVE', {direct: true, praise: 'Great, you just resumed the engine!', hint: 'Press RESUME (the same button).'}),
    st('ctl.summary', '.hero-card', 'The Engine Core in short: the ring counts your active time, PAUSE freezes it, STOP ends the session, and EMERGENCY stops everything at once. Shall we see Live Telemetry?', () => true, {noRing: true, ask: {yes: 'YES', no: 'NO'}})]};

  // ---------------------------------------------------------------- 2. LIVE TELEMETRY (the guide stands on the left and runs the whole SINE story; no highlight, no pressing needed)
  const skip = (sec) => { const r = rt(); if (r && r.state === 'ACTIVE' && sec > 0) { const sp = r.speed; r.speed = 1; r.advance(sec); r.speed = sp; } };
  // Skips the tutorial clock to ~1.5 s before SINE's next stage (idempotent), then the step's live clock lets the real popup be displayed in real time: a bulk jump alone would out-run the popup display handshake.
  const toNext = () => { const s = rt() && rt().sine; if (!s) return; if (!s.episodeId) skip(300 - (s.dwell || 0) - 1.5); else if (s.remaining != null) skip(s.remaining - 1.5); };
  const SC = ['social', 'task'], LEFT = {left: true, noRing: true, top: true};
  const sineStage = (n) => () => !!$('wlPopup') && !!rt() && rt().sine.stage === n;
  const telemetry = {name: 'TELEMETRY', title: 'Live Telemetry', page: 'control', setup: () => {}, steps: [
    st('tel.intro', '#mlLiveTelemetry', 'This is Live Telemetry: one line for every event, all simulated. Let\'s pretend I start scrolling social media.', () => true, {...LEFT, flow: true}),
    st('tel.social', '#mlLiveTelemetry', 'There I go, scrolling. Watch the log on the right.', () => feedHas('DWELL'), {...LEFT, scen: SC, speed: 60, auto: () => pickScn('social'), hint: 'Pick "Social" in the small box under my message.'}),
    st('tel.rows', '#feed', 'See DWELL? SOCIAL is where I am, and DWELL means a fresh visit began. Now five minutes of scrolling pass.', () => true, {...LEFT, flow: true}),
    st('tel.s1', '#mlLiveTelemetry', 'Five minutes later, still scrolling…', sineStage(1), {...LEFT, live: 1, auto: toNext, hint: 'Wait a moment: the tutorial clock skips ahead.'}),
    st('tel.trigger', '#feed', 'SINE-1, a friendly nudge! On the right, TRIGGER means SINE just opened an episode.', () => true, {...LEFT, feed: true, flow: true}),
    st('tel.sched', '#feed', 'And look: SINE 2 is already scheduled for 10:00. That is 600 seconds from now.', () => true, {...LEFT, feed: true, flow: true}),
    st('tel.back1', '#wlPopup', 'I\'ll press I\'M BACK. It is only a promise, not proof.', (r) => r.events.some((e) => e.organ === 'SINE' && e.type === 'RETURN_INTENT'), {...LEFT, auto: () => tutBtn('BACK'), hint: 'Press I\'M BACK in the popup.'}),
    st('tel.monitor', '#feed', 'MONITOR says USER PRESSED, I\'M BACK. But I keep scrolling, so nothing is resolved.', () => true, {...LEFT, flow: true}),
    st('tel.s2', '#mlLiveTelemetry', 'Ten minutes later, still scrolling…', sineStage(2), {...LEFT, live: 1, auto: toNext, hint: 'Wait a moment: the tutorial clock skips ahead.'}),
    st('tel.s2read', '#feed', 'SINE-2, firmer, and it has one button. And SINE 3 is now scheduled for 13:15.', () => true, {...LEFT, feed: true, flow: true}),
    st('tel.s3', '#mlLiveTelemetry', 'I keep scrolling, and after 13:15…', sineStage(3), {...LEFT, live: 1, auto: toNext, hint: 'Wait a moment: the tutorial clock skips ahead.'}),
    st('tel.oops', '#wlPopup', 'SINE-3. Oops… there are no buttons on this one! How do we make it disappear?', () => true, {...LEFT, flow: true}),
    st('tel.five', '#wlPopup', 'Easy: go back to work! Let me come back for just 5 seconds…', () => !!rt() && rt().events.some((e) => e.type === 'RETURN_INTERRUPTED'), {...LEFT, scen: SC, auto: () => { pickScn('task'); skip(5); pickScn('social'); skip(1); }, hint: 'Pick Task / Work, then Social again.'}),
    st('tel.still', '#wlPopup', 'BRUH… it\'s still there! Five seconds is not enough.', () => true, {...LEFT, flow: true}),
    st('tel.rule', '#feed', 'An episode ends only after a real return: 10 seconds to verify, then 60 seconds to close it for good.', () => true, {...LEFT, flow: true}),
    st('tel.real', '#wlPopup', 'OK. Properly back to work this time.', (r) => r.sine.outcome === 'RETURNED', {...LEFT, scen: SC, auto: () => { pickScn('task'); skip(80); }, hint: 'Pick Task / Work and wait.'}),
    st('tel.boom', '#feed', 'BOOM, gone! The log shows RETURN INTENT, RETURNED and MIRL: the episode is closed.', () => true, {...LEFT, flow: true}),
    st('tel.stop', '#btnEngineStop', 'That is Live Telemetry. Press STOP to end this session.', (r) => r.state === 'ENDED', {left: true, top: true, direct: true, praise: 'Session ended. On to Study Mode!', hint: 'Press STOP in the Engine Core card.'})]};

  // ---------------------------------------------------------------- 3. STUDY MODE (conversation: pick a video, the guide enters it, keywords, time, three outcomes, then the "distract?" gate)
  const studyEnter = async () => { if (lab()) { lab().setOpen(true); press('slRestart'); } };
  const submitVideo = async (v) => {
    const s = suggest(v), hint = $('acHint');
    if (!s.ok) { if (hint) { hint.textContent = 'Use at least two real words, for example "Neuron Signal Basics: Sodium Explained".'; hint.hidden = false; } return; }
    press('slPickCustom'); await wait(180);
    setIn('slCTitle', v); setIn('slCSubject', s.subject); setIn('slCTask', v); setIn('slCKeywords', s.keywords); setIn('slCImportant', s.important);
    await wait(80); press('slUseVideo');
  };
  const declared = () => !!(labS() && labS().decl);
  const both = () => { const e = (labS() && labS().events) || []; return e.some((x) => x.name === 'STUDY_CONFIRMATION_RECORDED' && x.text.includes('THIS IS STUDY MATERIAL')) && e.some((x) => x.name === 'STUDY_CONFIRMATION_RECORDED' && x.text.includes('I\'M COMING BACK')); };
  const study = {name: 'STUDY', title: 'Study Mode and keyword points', page: 'study-mode', setup: () => {}, after: studyEnter, steps: [
    st('stu.hi', '#sxLabBar', 'ALRIGHT, LET\'S STUDY NOW. THIS IS GONNA BE STRICTER, BRUH.', () => true, {flow: true}),
    st('stu.choose', '#slStepVideo', 'First, pick the video you will study. Default, or your own?', () => true, {ask: {yes: 'DEFAULT', no: 'CUSTOM', onYes: () => { J.video = 'default'; }, onNo: () => { J.video = 'custom'; return 'next'; }}}),
    st('stu.pickdef', '#slStepVideo', 'I\'ll use the default one, a neuroscience lecture. I enter it for you.', declared, {skip: () => J.video !== 'default', auto: () => { press('slPickDefault'); setTimeout(() => press('slUseVideo'), 200); }, hint: 'Choose DEFAULT VIDEO, then press USE THIS VIDEO.'}),
    st('stu.name', '#slStepVideo', 'Type the name of your video here, and I\'ll enter it for you.', declared, {skip: () => J.video !== 'custom', direct: true, noRing: true, arrow: false, praise: 'Got it! Entered. Here is what I guessed from your title.', prompt: {placeholder: 'e.g. Neuron Signal Basics: Sodium Explained', label: 'Your video name', onSubmit: submitVideo}}),
    st('stu.words', '#slKeywords', 'These are your keywords: words a good video title should contain. Each one found is worth 1 point.', () => true, {flow: true}),
    st('stu.imp', '#slImportant', 'Important keywords name your topic. Each one is worth 2 points.', () => true, {flow: true}),
    st('stu.time', '#slStudyMin', 'Set your study time and break here. Change them if you like; I\'ll keep these.', () => true, {flow: true}),
    st('stu.prep', '#slPrepare', 'Now I prepare your study block.', () => !!(labS() && labS().plan.prepared), {auto: () => press('slPrepare'), hint: 'Press PREPARE THE STUDY BLOCK.'}),
    st('stu.pts', '#slToPoints', 'Next: how the points work.', () => !!(labS() && labS().step === 'points'), {auto: () => press('slToPoints'), hint: 'Press the NEXT button inside the lab.'}),
    st('stu.rules', '.sl-rules', 'Simple: 1 point for an ordinary word, 2 for an important one. The share of points found decides what MYELIN thinks.', () => true, {flow: true}),
    st('stu.try', '#slTryTitle', 'Let\'s test it: I type your video\'s title and you watch the points add up.', () => !!(labS() && labS().tryTitle.trim().length > 2), {auto: () => setIn('slTryTitle', (labS() && labS().decl && labS().decl.title) || 'Neuron Signal Basics: Sodium Explained'), hint: 'Type a few words in the box.'}),
    st('stu.bands', '.sl-bands', '75% or more: STUDY ALIGNED. Above 25%: UNCERTAIN. 25% or less: OFF-TASK.', () => true, {flow: true}),
    st('stu.scn', '#slToScenarios', 'Now three situations.', () => !!(labS() && labS().step === 'scenarios'), {auto: () => press('slToScenarios'), hint: 'Press the NEXT button inside the lab.'}),
    st('stu.aligned', '#slScnAligned', 'One: you watch your own video. Aligned, so no reminder at all.', () => !!(labS() && labS().scn && labS().scn.kind === 'aligned'), {auto: () => press('slScnAligned'), hint: 'Press SCENARIO 1 · STUDY ALIGNED.'}),
    st('stu.uncertain', '#slScnUncertain', 'Two: a title that is only half related. Five unclear minutes pass, then MYELIN asks you.', () => !!(labS() && labS().scn && labS().scn.kind === 'uncertain' && labS().scn.prompts >= 1), {auto: () => { press('slScnUncertain'); setTimeout(() => press('slAdvNext'), 250); }, hint: 'Press SCENARIO 2 · UNCERTAIN, then ADVANCE.'}),
    st('stu.answer', '#slScnPanel', 'I answer THIS IS STUDY MATERIAL. MYELIN believes you and treats it as study.', () => !!(labS() && labS().scn && labS().scn.confirm), {auto: () => btnText('THIS IS STUDY MATERIAL'), hint: 'Press either button in the popup.'}),
    st('stu.both', '#slScnReset', 'And the other answer: I\'M COMING BACK. That is only your promise, not proof.', both, {auto: () => { press('slScnReset'); setTimeout(() => press('slScnUncertain'), 250); setTimeout(() => press('slAdvNext'), 500); setTimeout(() => btnText('I\'M COMING BACK'), 900); }, hint: 'Repeat scenario 2 and press the other button.'}),
    st('stu.off', '#slScnOff', 'Three: a title with none of your words. Five minutes of that and the first intervention is due.', () => !!(labS() && labS().scn && labS().scn.kind === 'off' && labS().scn.dueLogged), {auto: () => { press('slScnOff'); setTimeout(() => press('slAdvNext'), 250); }, hint: 'Press SCENARIO 3 · NOT ALIGNED, then ADVANCE.'}),
    st('stu.gate', '#slPathway', 'WHAT IF WE TRY TO DISTRACT WHILE STUDYING? Do you wanna see?', () => true, {ask: {yes: 'YES', no: 'NO', onNo: () => { api.go(api.lessonStart(J.chapters.indexOf(cosecant))); return 'handled'; }}})]};

  // ---------------------------------------------------------------- 4. SECANT (gate + automated / manual; the Academy presses the real controls and popup buttons, or guides you to press them)
  const advance = () => press('szAdvNext');
  /** START: carries the Study test (subject, task, times) into the SECANT demonstration's own setup, then presses its real buttons. Safe to repeat. */
  const carry = async () => {
    const P = (labS() && labS().plan) || {};
    if (T('szStudyState') === 'ACTIVE') return;
    if (/^START/i.test(T('szStart'))) { press('szStart'); await wait(200); }
    if (P.subject) setIn('szSubject', P.subject);
    if (P.task) setIn('szTaskText', P.task);
    if (P.studyMin) setIn('szStudyMin', P.studyMin);
    if (P.breakMin) setIn('szBreakMin', P.breakMin);
    await wait(150); press('szPrepare'); await wait(250); press('szBlockStart');
  };
  const modeAsk = {yes: 'AUTOMATED', no: 'I\'LL TRY', onYes: () => { J.manual = false; J.modeAsked = true; }, onNo: () => { J.manual = true; J.modeAsked = true; return 'next'; }};
  const secantDemo = demo('secantModeDemo', 'szReset');
  const secant = {name: 'SECANT', title: 'SECANT — Study recovery', page: 'secant', setup: () => {}, after: secantDemo, steps: [
    st('sec.mode', '#secantModeBar', 'This is SECANT: it watches your study and escalates if you drift. Shall I run the demo myself, or do you want to try?', () => true, {ask: modeAsk}),
    st('sec.carry', '#szStart', 'First I start your study session, with the subject, keywords and time you set.', () => T('szStudyState') === 'ACTIVE', {auto: carry, hint: 'Press START DEMONSTRATION SESSION, PREPARE STUDY BLOCK, then START STUDY.'}),
    st('sec.drift', '#szOfftask', 'Now I get distracted: off-task resource.', () => /off-task/i.test(T('szActivityNow')), {auto: () => press('szOfftask'), hint: 'Press OFF-TASK RESOURCE.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Now get distracted yourself: press OFF-TASK RESOURCE.'}}),
    st('sec.s1', '#szAdvNext', 'Five minutes of dwelling go by…', () => stageHead() === 'Study focus notice', {auto: advance, hint: 'Press ADVANCE TO NEXT SECANT / COSECANT STEP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Dwell for five minutes: press ADVANCE.'}}),
    st('sec.s1read', '#wlDemoStage .wl-pp', 'SECANT-1: "You just got distracted." Come back, or dwell? RETURN TO STUDY would only be a promise. Let\'s dwell more!', () => true, {flow: true}),
    st('sec.s2', '#szAdvNext', 'Ten minutes later… oh wow, another reminder!', () => stageHead() === 'Study return pending', {auto: advance, hint: 'Press ADVANCE TO NEXT SECANT / COSECANT STEP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Keep dwelling: press ADVANCE for ten more minutes.'}}),
    st('sec.s2read', '#wlDemoStage .wl-pp', 'SECANT-2: firmer, with one button. Feeling like dwelling more? Bruh, let\'s see the next stage.', () => true, {flow: true}),
    st('sec.anyapp', '#szChatA', 'Watch this: I switch to WhatsApp. SECANT keeps going, because Study Mode guards ONE topic, so any other app still counts.', () => /whatsapp/i.test(T('szActivityNow')) && /^SECANT-2/.test(T('szSecant')), {feed: true, auto: () => press('szChatA'), hint: 'Press WHATSAPP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Try it: press WHATSAPP. SECANT keeps going, because Study Mode guards ONE topic, so any other app still counts.'}}),
    st('sec.s3', '#szAdvNext', 'Still dwelling? Thirteen minutes later…', () => stageHead() === 'Study return required', {auto: advance, hint: 'Press ADVANCE TO NEXT SECANT / COSECANT STEP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'One more time: press ADVANCE.'}}),
    st('sec.s3read', '#wlDemoStage .wl-pp', 'SECANT-3. NO BUTTONS. YOU MUST RETURN TO THE SAME VIDEO YOU WERE ON!', () => true, {flow: true}),
    st('sec.pick', '#szStudyRes', 'Fine, fine! I\'m going back to the study feed: the exact video.', () => /^exact study/i.test(T('szActivityNow')), {feed: true, auto: () => press('szStudyRes'), hint: 'Press EXACT STUDY RESOURCE.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Your turn: choose the study feed. Press EXACT STUDY RESOURCE (I hid the popup so you can see it).'}}),
    st('sec.return', '#szAdv10', 'Now MYELIN has to see me stay there: 10 seconds to verify, then 60 seconds to close.', () => stageHead() === null && Number(T('szEpisodes')) >= 1 && T('szSecant') === 'Inactive', {feed: true, auto: async () => { press('szAdv10'); await wait(250); press('szAdv60'); }, hint: 'Press +10 SEC, then +1 MIN.'}),
    st('sec.rule', '#szSecant', 'Not easy, bruh. Back on the video: 10 seconds to verify, then 60 seconds to close it. Same as SINE.', () => true, {flow: true}),
    st('sec.dash', '#sqOpen', 'Let\'s peek at the SECANT dashboard.', () => dashOpen(), {auto: () => press('sqOpen'), hint: 'Press OPEN DEEP ANALYSIS.'}),
    st('sec.dashread', '.glass-overlay.open', 'Every stage, every popup response and the verified return, all recorded. A button press is a promise; the return is what counts.', () => true, {flow: true}),
    st('sec.dashclose', '.glass-overlay.open', 'Closing it.', () => !dashOpen(), {auto: closeDash, hint: 'Press Escape to close the dashboard.'})]};

  // ---------------------------------------------------------------- 5. COSECANT (gate; the same running session: say you now want a break)
  const cosecant = {name: 'COSECANT', title: 'COSECANT — study breaks', page: 'secant', setup: () => {}, after: () => demoMode('secantModeDemo'), steps: [
    st('cos.gate', '#secantModeBar', 'What if you need a break while studying? Want to see how COSECANT handles it?', () => true, {ask: {yes: 'YES', no: 'NO', onNo: () => { api.go(api.lessonStart(J.chapters.indexOf(choose))); return 'handled'; }}}),
    st('cos.mode', '#secantModeBar', 'Shall I run it myself, or do you want to try?', () => true, {skip: () => J.modeAsked, ask: modeAsk}),
    st('cos.block', '#szStart', 'Your study session is running. (If it had stopped, I would start it again.)', () => T('szStudyState') === 'ACTIVE', {auto: carry, hint: 'Press START DEMONSTRATION SESSION, PREPARE STUDY BLOCK, then START STUDY.'}),
    st('cos.length', '#szBreakMin', 'You pick the break length here, in minutes. Yours is the break you set earlier.', () => true, {flow: true}),
    st('cos.start', '#szBreakStart', 'I take the break: START BREAK. The study timer pauses.', () => T('szCosecant') === 'Break active', {auto: () => press('szBreakStart'), hint: 'Press START BREAK (COSECANT).', m: {auto: null, direct: true, flow: true, feed: true, say: 'Take your break: press START BREAK (COSECANT).'}}),
    st('cos.away', '#szOfftask', 'On my break I wander off to something else.', () => /off-task/i.test(T('szActivityNow')), {auto: () => press('szOfftask'), hint: 'Press OFF-TASK RESOURCE.'}),
    st('cos.complete', '#szAdvNext', 'The break ends…', () => stageHead() === 'BREAK COMPLETE', {auto: advance, hint: 'Press ADVANCE TO NEXT SECANT / COSECANT STEP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Let the break run out: press ADVANCE.'}}),
    st('cos.completeread', '#wlDemoStage .wl-pp', 'BREAK COMPLETE: your planned break is over. One button, and it is only a promise.', () => true, {flow: true}),
    st('cos.over', '#szAdvNext', 'I did not go back. Five minutes later…', () => stageHead() === 'BREAK ALREADY OVER', {auto: advance, hint: 'Press ADVANCE TO NEXT SECANT / COSECANT STEP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Don\'t go back yet: press ADVANCE.'}}),
    st('cos.overread', '#wlDemoStage .wl-pp', 'BREAK ALREADY OVER. Same button, same meaning.', () => true, {flow: true}),
    st('cos.final', '#szAdvNext', 'One more minute…', () => stageHead() === 'COME BACK PLEASE', {auto: advance, hint: 'Press ADVANCE TO NEXT SECANT / COSECANT STEP.', m: {auto: null, direct: true, flow: true, feed: true, say: 'One more minute: press ADVANCE.'}}),
    st('cos.finalread', '#wlDemoStage .wl-pp', 'COME BACK PLEASE. No buttons: it closes only after an observed return.', () => true, {flow: true}),
    st('cos.pick', '#szStudyRes', 'OK, back to my video: the study feed.', () => /^exact study/i.test(T('szActivityNow')), {feed: true, auto: () => press('szStudyRes'), hint: 'Press EXACT STUDY RESOURCE.', m: {auto: null, direct: true, flow: true, feed: true, say: 'Your turn: choose the study feed. Press EXACT STUDY RESOURCE (I hid the popup so you can see it).'}}),
    st('cos.return', '#szAdv1', 'MYELIN has to see me there for three seconds.', () => T('szCosecant') === 'No break' && T('szStudyState') === 'ACTIVE', {feed: true, auto: async () => { for (let i = 0; i < 4; i++) { press('szAdv1'); await wait(200); } }, hint: 'Press +1 SEC until the break closes.'}),
    st('cos.dash', '#sqOpen', 'The dashboard shows the whole break.', () => dashOpen(), {auto: () => press('sqOpen'), hint: 'Press OPEN DEEP ANALYSIS.'}),
    st('cos.dashread', '.glass-overlay.open', 'Break started, BREAK COMPLETE, BREAK ALREADY OVER, COME BACK PLEASE, then the return confirmed after three seconds. Only recorded steps appear.', () => true, {flow: true}),
    st('cos.dashclose', '.glass-overlay.open', 'Closing it. That is Study Mode.', () => !dashOpen(), {auto: closeDash, hint: 'Press Escape to close the dashboard.'})]};

  // ---------------------------------------------------------------- 6. CHOOSE ONE ORGAN
  const choose = {name: 'CHOOSE', title: 'Choose your organ', page: 'control', setup: () => { J.organ = null; }, steps: [
    st('pick.organ', '#acOrganPanel', 'Choose one organ to explore.', () => !!J.organ, {hint: 'Select one of the six organ cards.'})]};

  // ---------------------------------------------------------------- 7. THE ORGAN TUTORIALS (conversation: a short chat, the Academy presses the real controls, or "I'll try" with an arrow)
  const organ = (key, title, page, after, steps) => ({name: key.toUpperCase(), title, page, setup: () => {}, after, when: () => J.organ === key, steps});
  const modeStep = (p, target, say) => st(`${p}.mode`, target, say, () => true, {skip: () => J.modeAsked, ask: modeAsk});
  /** a step the Academy performs (auto) or, in "I'll try", the visitor performs (msay) with the arrow on the button. press = a control on the page (popup hidden so it is visible); pop = a popup button (popup stays). */
  const doIt = (id, target, say, msay, done, auto, o = {}) => st(id, target, say, done, {auto, hint: o.hint, feed: o.pop ? undefined : true, m: {auto: null, direct: true, flow: true, feed: o.pop ? undefined : true, say: msay}});
  const read = (id, target, say) => st(id, target, say, () => true, {flow: true});
  const dashSteps = (p, openBtn, openLabel, what) => [
    st(`${p}.dash`, `#${openBtn}`, `Let's peek at the ${what}.`, () => dashOpen(), {auto: () => press(openBtn), hint: `Press ${openLabel}.`}),
    st(`${p}.dashread`, '.glass-overlay.open', 'This is the real dashboard, built only from what we just did. Counters, history, timeline: recorded events, never your thoughts.', () => true, {flow: true}),
    st(`${p}.dashclose`, '.glass-overlay.open', 'Closing it.', () => !dashOpen(), {auto: closeDash, hint: 'Press Escape.'})];
  const logStep = (id, target, say, msay, list, type, auto, hint) => doIt(id, target, say, msay, () => logHas(list, type), auto, {hint});

  const sine = organ('sine', 'SINE / Live MIRL', 'live-mirl', demo('mirlModeDemo', 'sdReset'), [
    modeStep('si', '#mirlModeBar', 'SINE: the social-feed organ. A gentle reminder in three stages, and a recorded return. Shall I run the demo, or do you want to try?'),
    doIt('si.start', '#sdStart', 'Starting a SINE session.', 'Press START DEMONSTRATION SESSION.', () => T('sdState') === 'ACTIVE', () => press('sdStart'), {hint: 'Press START DEMONSTRATION SESSION.'}),
    doIt('si.social', '#sdSocial', 'I\'m scrolling social media.', 'Pretend you are scrolling: press SOCIAL FEED.', () => /social|feed|instagram/i.test(T('sdActivityNow')), () => press('sdSocial'), {hint: 'Press SOCIAL FEED.'}),
    doIt('si.s1', '#sdAdvNext', 'Five minutes of scrolling…', 'Five minutes of scrolling: press ADVANCE.', () => stageHead() === 'Cognitive Drift Detected', () => press('sdAdvNext'), {hint: 'Press ADVANCE TO NEXT SINE STEP.'}),
    read('si.s1read', '#wlDemoStage .wl-pp', 'SINE-1: a question, not an accusation. I\'M BACK says you are returning. NEED A BREAK starts a normal break.'),
    doIt('si.intent', '#wlDemoStage .wl-pp', 'I press I\'M BACK. That is only a promise: MYELIN now waits to see if I really return.', 'Your turn: press I\'M BACK in the popup.', () => /waiting/i.test(T('sdRecovery')), () => popupBtn('BACK'), {pop: true, hint: 'Press I\'M BACK in the popup.'}),
    doIt('si.return', '#sdTask', 'Now I really go back to work: 10 seconds to verify, then 60 to close.', 'Go back to work: press WORK TASK, then +10 SEC, then +1 MIN.', () => Number(T('sdVerified')) >= 1, async () => { press('sdTask'); await wait(250); press('sdAdv10'); await wait(250); press('sdAdv60'); }, {hint: 'Press WORK TASK, then +10 SEC, then +1 MIN.'}),
    doIt('si.stages', '#sdTrigger', 'Let\'s peek at all three stages.', 'Press TRIGGER NEXT SINE POPUP three times to see every stage.', () => T('sdStage') === 'SINE-3', async () => { for (let i = 0; i < 3; i++) { press('sdTrigger'); await wait(350); } }, {hint: 'Press TRIGGER NEXT SINE POPUP three times.'}),
    read('si.s3read', '#wlDemoStage .wl-pp', 'SINE-3 has no buttons. SINE-2 had just one. And a promise is never a return.'),
    ...dashSteps('si', 'mirlOpenDash', 'OPEN FULL DASHBOARD', 'Live MIRL dashboard'),
    read('si.limits', '#sdEpisodes', 'SINE sees the simulator\'s social feed and the clock. It can\'t know what you were thinking, or whether a return was real focus.')]);

  const mine = organ('mine', 'MINE — messaging', 'mine', demo('mineModeDemo', 'mdReset'), [
    modeStep('mi', '#mineModeBar', 'MINE: the messaging organ. One question after ten minutes, and your answer picks the path. Shall I run the demo, or do you want to try?'),
    doIt('mi.start', '#mdStart', 'Starting a MINE session.', 'Press START DEMONSTRATION SESSION.', () => T('mdState') === 'ACTIVE', () => press('mdStart'), {hint: 'Press START DEMONSTRATION SESSION.'}),
    doIt('mi.chat', '#mdChatA', 'I\'m chatting on WhatsApp. (A simulator surface: nothing is read.)', 'Press WHATSAPP.', () => /whatsapp/i.test(T('mdActivityNow')), () => press('mdChatA'), {hint: 'Press WHATSAPP.'}),
    doIt('mi.m1', '#mdAdvNext', 'Ten minutes of chatting…', 'Ten minutes of chatting: press ADVANCE.', () => /MESSAGING APP/i.test(stageHead() || ''), () => press('mdAdvNext'), {hint: 'Press ADVANCE TO NEXT MINE STEP.'}),
    read('mi.m1read', '#wlDemoStage .wl-pp', 'MINE-1 asks what you are doing. I WILL COME BACK is a promise. IT\'S IMPORTANT lets you choose time for an important chat.'),
    doIt('mi.m1resp', '#wlDemoStage .wl-pp', 'I press I WILL COME BACK. A promise, and a return window opens.', 'Your turn: press I WILL COME BACK in the popup.', () => T('mdMineState') === 'Return Intent', () => popupBtn('I WILL COME BACK'), {pop: true, hint: 'Press I WILL COME BACK.'}),
    doIt('mi.hop', '#mdChatB', 'But I keep chatting, and I switch to Telegram. Same episode: MINE counts one stretch.', 'Keep chatting, on another app: press TELEGRAM. Same episode.', () => /telegram/i.test(T('mdPlatform')), () => press('mdChatB'), {hint: 'Press TELEGRAM.'}),
    doIt('mi.m2', '#mdAdvNext', 'I promised, but I\'m still chatting. 13:15 later…', 'Still chatting: press ADVANCE for 13:15 more.', () => stageHead() === 'YOU SAID YOU WOULD COME BACK', () => press('mdAdvNext'), {hint: 'Press ADVANCE TO NEXT MINE STEP.'}),
    read('mi.m2read', '#wlDemoStage .wl-pp', 'MINE-2A: no buttons. It only reminds you what you said, and it closes after a real return.'),
    doIt('mi.return', '#mdTask', 'OK, I really go back to work: verify, then close.', 'Go back to work: press WORK TASK, then +10 SEC, then +1 MIN.', () => /closure/i.test(T('mdMineState')), async () => { press('mdTask'); await wait(250); press('mdAdv10'); await wait(250); press('mdAdv60'); }, {hint: 'Press WORK TASK, then +10 SEC, then +1 MIN.'}),
    ...dashSteps('mi', 'mnView', 'VIEW ANALYSIS', 'MINE Deep Analysis'),
    read('mi.limits', '#mdEpisodes', 'MINE sees which messaging surface is up, and for how long. It can\'t see messages or people. IT\'S IMPORTANT is your own word.')]);

  const cosine = organ('cosine', 'COSINE — streaming', 'cosine', demo('cosineModeDemo', 'cdReset'), [
    modeStep('co', '#cosineModeBar', 'COSINE: the streaming organ. After five minutes it asks one question. Shall I run the demo, or do you want to try?'),
    doIt('co.start', '#cdStart', 'Starting a COSINE session.', 'Press START DEMONSTRATION SESSION.', () => T('cdState') === 'ACTIVE', () => press('cdStart'), {hint: 'Press START DEMONSTRATION SESSION.'}),
    doIt('co.stream', '#cdStreamA', 'I\'m streaming on Netflix.', 'Press NETFLIX.', () => /netflix/i.test(T('cdPlatform')), () => press('cdStreamA'), {hint: 'Press NETFLIX.'}),
    doIt('co.gate', '#cdAdvNext', 'Five minutes of streaming…', 'Five minutes of streaming: press ADVANCE.', () => /INTERESTED TO WATCH/i.test(stageHead() || ''), () => press('cdAdvNext'), {hint: 'Press ADVANCE TO NEXT COSINE STEP.'}),
    read('co.gateread', '#wlDemoStage .wl-pp', 'The intention gate. SORRY, I\'LL COME BACK opens a five-minute return window. YEAH, I WANT SOME BREAK lets you pick 10 to 200 minutes. Nothing is decided for you.'),
    doIt('co.intent', '#wlDemoStage .wl-pp', 'I press SORRY, I\'LL COME BACK. The return window opens.', 'Your turn: press SORRY, I\'LL COME BACK.', () => T('cdCosineState') === 'Return Intent', () => popupBtn('SORRY'), {pop: true, hint: 'Press SORRY, I\'LL COME BACK.'}),
    doIt('co.hop', '#cdStreamB', 'I keep streaming, now on Prime Video. Hopping platforms stays in the same episode.', 'Keep streaming elsewhere: press PRIME VIDEO.', () => T('cdHops') === '1', () => press('cdStreamB'), {hint: 'Press PRIME VIDEO.'}),
    doIt('co.convert', '#cdAdvNext', 'I never went back, so my promise turns into a break request…', 'Press ADVANCE: your promise turns into a break request.', () => /KEEP WATCHING/i.test(stageHead() || ''), () => press('cdAdvNext'), {hint: 'Press ADVANCE TO NEXT COSINE STEP.'}),
    doIt('co.duration', '#wlDemoStage .wl-pp', 'MYELIN asks for a break length, 10 to 200 minutes. I keep 10.', 'Keep 10 minutes and press START WATCHING.', () => /ENJOY THE SHOW/i.test(stageHead() || ''), () => popupBtn('START WATCHING'), {pop: true, hint: 'Press START WATCHING in the popup.'}),
    doIt('co.yay', '#wlDemoStage .wl-pp', 'Break set. I press YAY. It does not change the break clock.', 'Press YAY.', () => stageHead() === null && T('cdCosineState') === 'Break Active', () => popupBtn('YAY'), {pop: true, hint: 'Press YAY.'}),
    doIt('co.deadline', '#cdAdvNext', 'The break runs out…', 'Let the break run out: press ADVANCE.', () => /HOPE YOU ENJOYED/i.test(stageHead() || ''), () => press('cdAdvNext'), {hint: 'Press ADVANCE TO NEXT COSINE STEP.'}),
    read('co.callback', '#wlDemoStage .wl-pp', 'The Final Callback: no buttons. It goes away only after a real return.'),
    doIt('co.return', '#cdTask', 'Now I really go back to work: verify, then close.', 'Go back to work: press WORK TASK, then +10 SEC, then +1 MIN.', () => T('cdDwell') === 'EPISODE CLOSED', async () => { press('cdTask'); await wait(250); press('cdAdv10'); await wait(250); press('cdAdv60'); }, {hint: 'Press WORK TASK, then +10 SEC, then +1 MIN.'}),
    ...dashSteps('co', 'cxOpen', 'OPEN ANALYSIS', 'COSINE Deep Analysis'),
    doIt('co.other', '#cdReset', 'And the other choice: a break straight away. I reset, trigger the popup, and press YEAH, I WANT SOME BREAK.', 'The other choice: press RESET DEMONSTRATION, then TRIGGER COSINE POPUP, then YEAH, I WANT SOME BREAK.', () => /HOW LONG/i.test(stageHead() || ''), async () => { press('cdReset'); await wait(300); press('cdTrigger'); await wait(700); popupBtn('YEAH, I WANT SOME BREAK'); }, {hint: 'Press RESET DEMONSTRATION, TRIGGER COSINE POPUP, then YEAH, I WANT SOME BREAK.'}),
    read('co.otherread', '#wlDemoStage .wl-pp', 'An intentional break skips the return window: you choose 10 to 200 minutes right away. Then the same deadline, Final Callback and real return follow.'),
    read('co.limits', '#cdEpisodes', 'COSINE sees the simulator\'s streaming surface and the clock. It can\'t see what you watch, or why.')]);

  const store = organ('store', 'STORE — shopping', 'store', demo('', 'stClear'), [
    modeStep('sto', '#stControls', 'STORE: the shopping organ. One prompt after ten minutes on a shopping site. Shall I run the demo, or do you want to try?'),
    doIt('sto.trigger', '#stTrigger', 'I open a shopping site and let ten minutes pass.', 'Press TRIGGER STORE POPUP: it opens a visit and jumps to 10:00.', () => stageHead() === 'Shopping time reached', () => press('stTrigger'), {hint: 'Press TRIGGER STORE POPUP.'}),
    read('sto.read', '#wlDemoStage .wl-pp', 'Shopping time reached. I\'M BACK is only a promise. I WANT TO SHOP lets you pick extra time, up to 13:15, never past 23:15 in total.'),
    logStep('sto.resp', '#wlDemoStage .wl-pp', 'I press I WANT TO SHOP, and keep the default time.', 'Your turn: press I WANT TO SHOP in the popup.', 'stLog', 'USER_RESPONSE', () => popupBtn('I WANT TO SHOP'), 'Press I WANT TO SHOP in the popup.'),
    logStep('sto.end', '#stAdvEnd', 'The chosen shopping time runs out with the site still open. A time fact; nothing is enforced.', 'Press ADVANCE TO END OF CHOSEN TIME.', 'stLog', 'ALLOWANCE_ELAPSED', () => press('stAdvEnd'), 'Press ADVANCE TO END OF CHOSEN TIME.'),
    logStep('sto.exit', '#stExit', 'I leave the site. Leaving is recorded, but it is never a verified return.', 'Press EXIT SITE.', 'stLog', 'SITE_EXITED', () => press('stExit'), 'Press EXIT SITE.'),
    logStep('sto.ret', '#stReturn', 'And a demo-only return record. Clearly not a browser-observed return.', 'Press RECORD DEMONSTRATION RETURN EVIDENCE (demo only).', 'stLog', 'DEMO_RETURN_EVIDENCE_RECORDED', () => press('stReturn'), 'Press RECORD DEMONSTRATION RETURN EVIDENCE.'),
    ...dashSteps('sto', 'stOpenDash', 'OPEN STORE DASHBOARD', 'STORE dashboard'),
    read('sto.limits', '#stLog', 'STORE records the steps you simulated. Its return and report rules aren\'t defined yet, so nothing here is a verified result.')]);

  const fine = organ('fine', 'FINE — food ordering', 'fine', demo('', 'fnClear'), [
    modeStep('fi', '#fnControls', 'FINE: the food-ordering organ. A warning, and your choice of a food break. Shall I run the demo, or do you want to try?'),
    doIt('fi.trigger', '#fnTrigger', 'I open a food-ordering site, and the warning appears.', 'Press TRIGGER FINE WARNING.', () => stageHead() === 'Food-ordering warning', () => press('fnTrigger'), {hint: 'Press TRIGGER FINE WARNING.'}),
    read('fi.read', '#wlDemoStage .wl-pp', 'The warning. TAKE A BREAK starts a food break. CONTINUE ORDERING records that you carried on. Either way, your choice.'),
    logStep('fi.break', '#wlDemoStage .wl-pp', 'I press TAKE A BREAK.', 'Your turn: press TAKE A BREAK in the popup.', 'fnLog', 'BREAK_STARTED', () => popupBtn('TAKE A BREAK'), 'Press TAKE A BREAK in the popup.'),
    logStep('fi.endbreak', '#fnEndBreak', 'Break over.', 'Press FINISH BREAK when your break is over.', 'fnLog', 'BREAK_FINISHED', () => press('fnEndBreak'), 'Press FINISH BREAK.'),
    logStep('fi.exit', '#fnExit', 'I leave the site. An exit proves nothing about returning.', 'Press EXIT SITE.', 'fnLog', 'SITE_EXITED', () => press('fnExit'), 'Press EXIT SITE.'),
    logStep('fi.ret', '#fnReturn', 'And a demo-only return record.', 'Press RECORD DEMONSTRATION RETURN (demo only).', 'fnLog', 'RETURN_RECORDED', () => press('fnReturn'), 'Press RECORD DEMONSTRATION RETURN.'),
    doIt('fi.outcome', '#fnOrdered', 'Last, what happened to the order? That is your own choice, recorded separately. I pick ORDER PLACED.', 'Record the order outcome: press ORDER PLACED, NO ORDER PLACED or ATTEMPTED.', () => logHas('fnLog', 'ORDER_OUTCOME'), () => press('fnOrdered'), {hint: 'Press one of the three outcome buttons.'}),
    ...dashSteps('fi', 'fnOpenDash', 'OPEN FINE DASHBOARD', 'FINE dashboard'),
    read('fi.limits', '#fnLog', 'FINE records only simulated choices. What triggers a real warning, and how long a break lasts, are open decisions, not findings.')]);

  const tangent = organ('tangent', 'TANGENT — gaming', 'tangent', demo('', 'tnClear'), [
    modeStep('tn', '#tnControls', 'TANGENT: the gaming organ. One persistent reminder at 23:15. The web version can\'t detect, block or overlay a real game. Shall I run the demo, or do you want to try?'),
    logStep('tn.open', '#tnOpen', 'I open a game.', 'Press OPEN GAME.', 'tnLog', 'GAME_OPENED', () => press('tnOpen'), 'Press OPEN GAME.'),
    doIt('tn.rem', '#tnAdvRem', 'Time flies. It\'s 23:15…', 'Press ADVANCE TO 23:15 REMINDER.', () => stageHead() === 'Gaming reminder', () => press('tnAdvRem'), {hint: 'Press ADVANCE TO 23:15 REMINDER.'}),
    read('tn.remread', '#wlDemoStage .wl-pp', 'The Gaming reminder: persistent, with no buttons by design. It blocks nothing, and it starts the episode.'),
    logStep('tn.exit', '#tnExit', 'I quit the game. Quitting is recorded, and is never a verified return.', 'Press EXIT GAME.', 'tnLog', 'GAME_EXITED', () => press('tnExit'), 'Press EXIT GAME.'),
    logStep('tn.ret', '#tnReturn', 'And a demo-only return record.', 'Press RECORD DEMONSTRATION RETURN (demo only).', 'tnLog', 'DEMO_RETURN_EVIDENCE_RECORDED', () => press('tnReturn'), 'Press RECORD DEMONSTRATION RETURN.'),
    ...dashSteps('tn', 'tnOpenDash', 'OPEN TANGENT DASHBOARD', 'TANGENT dashboard'),
    read('tn.limits', '#tnLog', 'TANGENT records simulated sessions and one reminder. Escalation, gaming breaks and real return evidence aren\'t defined yet.')]);

  // ---------------------------------------------------------------- 8. CLOSING LETTER
  const letter = {name: 'LETTER', title: 'Before you go', page: 'control', setup: () => {}, steps: [
    st('let.letter', '#acLetterPane', 'Before you go...', () => true, {}),
    st('let.final', '#acFinalPane', 'Your time. Your choice.', () => true, {})]};

  J.chapters = [control, telemetry, study, secant, cosecant, choose, sine, mine, cosine, store, fine, tangent, letter];

  // ---------------------------------------------------------------- overlays (organ choice, letter, final screen)
  function organCards() {
    const cards = ORGANS.map((o) => { const b = button('', () => { J.organ = o.key; api.rebuild(); api.go(api.lessonStart(J.chapters.findIndex((c) => c.name === o.key.toUpperCase()))); }, {class: `acj-card tone-${o.tone}`, id: `acOrgan_${o.key}`, 'data-organ': o.key});
      b.append(el('b', {}, o.name), el('span', {}, o.line)); return b; });
    return el('div', {class: 'acj-overlay acj-organs', id: 'acOrgans', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'acOrganTitle', hidden: ''},
      el('div', {class: 'acj-panel', id: 'acOrganPanel'}, el('span', {class: 'ac-chip'}, 'MYELIN ACADEMY'), el('h2', {id: 'acOrganTitle'}, 'Choose your organ'),
        el('p', {}, 'SECANT and COSECANT you have already met. Choose any one of the six other organs and you will be guided through its own simulation, its popups and its dashboard.'),
        el('div', {class: 'acj-grid', role: 'group', 'aria-label': 'Organs'}, cards),
        el('div', {class: 'acj-actions'}, button('BACK', () => api.go(api.index() - 1), {class: 'ac-btn ghost', id: 'acOrganBack'}), button('EXIT ACADEMY', () => api.stop(), {class: 'ac-btn link', id: 'acOrganExit'}))));
  }
  function letterEl() {
    const paras = LETTER.slice(1, 15).map((t) => el('p', {}, t));
    const sig = el('div', {class: 'acj-sig', id: 'acSignature'},
      el('img', {class: 'acj-sig-neon', src: 'assets/myelin/brand/signature-neon.png', alt: 'Handwritten signature reading Dharshan Keba, in glowing blue ink', width: '1100', height: '363', decoding: 'async'}),
      el('img', {class: 'acj-sig-ink', src: 'assets/myelin/brand/signature-original.png', alt: 'Handwritten signature reading Dharshan Keba, in blue ink', width: '1100', height: '347', decoding: 'async'}));
    const letterPane = el('article', {class: 'acj-letter', id: 'acLetterPane', 'aria-labelledby': 'acLetterTitle'}, el('h2', {id: 'acLetterTitle', tabindex: '-1'}, LETTER[0]), ...paras, sig, el('p', {class: 'acj-from'}, LETTER[15]), el('p', {class: 'acj-role'}, LETTER[16]),
      el('div', {class: 'acj-actions'}, button('BACK', () => api.go(api.index() - 1), {class: 'ac-btn ghost', id: 'acLetterBack'}), button('CONTINUE', () => api.go(api.index() + 1), {class: 'ac-btn primary', id: 'acLetterNext'})));
    const finalPane = el('section', {class: 'acj-final', id: 'acFinalPane', 'aria-labelledby': 'acFinalTitle', hidden: ''}, el('h2', {id: 'acFinalTitle'}, 'YOUR TIME. YOUR CHOICE.'),
      el('div', {class: 'acj-actions'}, button('HAPPY SURFING', () => J.finish(), {class: 'ac-btn primary acj-big', id: 'acHappy'})),
      el('p', {class: 'acj-note', id: 'acNote'}, 'This Academy used simulated behavioural interactions. It did not measure your thoughts or your attention.'),
      el('div', {class: 'acj-actions'}, button('BACK', () => api.go(api.index() - 1), {class: 'ac-btn ghost', id: 'acFinalBack'})));
    return el('div', {class: 'acj-overlay acj-letterwrap', id: 'acLetterWrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Closing letter', hidden: ''}, letterPane, finalPane);
  }
  J.mountOverlays = (root) => { if (J.organsEl) return; J.organsEl = organCards(); J.letterEl = letterEl(); root.append(J.organsEl, J.letterEl); };
  /** Called by the engine for every drawn step: shows the matching overlay (and hides the coach behind it). */
  J.overlays = (l) => {
    J.mountOverlays($('acRoot'));
    const id = l.step[6] && l.step[6].id, root = $('acRoot');
    const organs = id === 'pick.organ', letterOn = id === 'let.letter' || id === 'let.final';
    J.organsEl.hidden = !organs; J.letterEl.hidden = !letterOn;
    $('acLetterPane').hidden = id !== 'let.letter'; $('acFinalPane').hidden = id !== 'let.final';
    if (organs || letterOn) root.dataset.overlay = organs ? 'organs' : 'letter'; else delete root.dataset.overlay;
    if (organs) requestAnimationFrame(() => { const f = $('acOrgan_sine'); if (f) f.focus({preventScroll: true}); });
    if (id === 'let.letter') { J.letterEl.scrollTop = 0; requestAnimationFrame(() => { const f = $('acLetterTitle'); if (f) f.focus({preventScroll: true}); }); }
    if (id === 'let.final') requestAnimationFrame(() => { const f = $('acHappy'); if (f) f.focus({preventScroll: true}); });
  };
  /** Puts every demonstration back to its ordinary default view; used when the journey ends. Nothing is started. */
  J.cleanup = () => {
    if (J.organsEl) J.organsEl.hidden = true; if (J.letterEl) J.letterEl.hidden = true; delete $('acRoot').dataset.overlay;
    for (const id of ['mirlModeBrowser', 'mineModeBrowser', 'cosineModeBrowser', 'secantModeBrowser']) { const b = $(id); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
    if (lab()) { lab().setOpen(false); }
    if (J.organsEl) J.organsEl.remove(); if (J.letterEl) J.letterEl.remove(); J.organsEl = J.letterEl = null; J.organ = null;
  };
  J.finish = async () => { J.cleanup(); api.stop(); await app.ui.navigate('control'); };
  return J;
}
