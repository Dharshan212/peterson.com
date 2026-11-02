// Desktop intervention-popup family, rendered in the browser.
// PRESENTATION ONLY. It reads runtime/organ state and calls the existing command path
// (runtime.command) exactly as the previous generic popup did. It never advances a stage,
// closes a popup by itself, writes an event, or changes a threshold: the organ's own
// `popup` object stays the single authority for what is shown and when it disappears.
//
// Desktop sources reproduced here (MYELIN2.0_ULTIMATE_TRIAL):
//   SINE 1/2/3 + post-break gate ...... SINE/popup.py (SinePopupWindow), SINE/sine.py (_presentation)
//   Normal Break selector / active .... SINE/popup.py (NormalBreakSelectorWindow / NormalBreakActiveWindow)
//   MINE-1, duration, MINE-2A/2B ...... MINE/popup.py (Mine1Popup / Mine2Popup), MINE/mine.py (_show_mine2_effect)
//   COSINE 1, 2A/2B, 3, 4 ............. COSINE/popup.py (Cosine*Popup, CosineMascot)
//   SECANT 1/2/3 ...................... SECANT/popup.py (create_qt_presenter.Window), UI_THEMES/theme.py (secant_popup_*)
//   COSECANT continuity ............... COSECANT_STUDY_MODE/view.py (ContinuityPopup), UI_THEMES/theme.py (cosecantPopup*)
import {el} from './dom.js';

const pad = n => String(n).padStart(2, '0');
const mmss = s => { s = Math.max(0, Math.ceil(Number.isFinite(s) ? s : 0)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
const svg = markup => { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; };
const div = (cls, ...kids) => el('div', {class: cls}, ...kids);
const txt = (tag, cls, value, attrs = {}) => el(tag, {class: cls, ...attrs}, value);
const upper = s => String(s ?? '').toUpperCase();

// SINE/popup.py PALETTES visible_seconds (SINE/sine.py SinePolicy 45 / 60 / 600), mirrored by organs/sine.js.
const SINE_VISIBLE = {1: 45, 2: 60, 3: 600};
const SINE_COPY = {
  1: {world: 'blue', headline: 'Cognitive Drift Detected', message: 'The current resource reached its intervention threshold.', intensity: 'Gentle'},
  2: {world: 'amber', headline: 'Still Here?', message: 'You stepped away for a moment, but the loop pulled you back. Your focus window is still open.', intensity: 'Aware'},
  3: {world: 'red', headline: 'Long Drift Detected', message: "You've been away for a while. Protected Red remains active until recovery is factually verified.", intensity: 'Direct'}
};
const GATE_COPY = {headline: 'WELCOME BACK', message: "Hope you have refreshed and enjoyed your break. Let's come back to focus."};

// Button wording for actions that only RECORD AN INTENTION. A label must never read as a verified return:
// recovery is judged separately from observed evidence (see the organ files; desktop COSINE/popup.py states the same rule).
const INTENT_NOTE = 'Records your intention only. A return is verified separately from observed evidence.';
const COSINE_LABELS = {'return-intention': "I'M COMING BACK", 'intentional-break': 'SET A TIME'};   // desktop source: "SORRY, I'LL COME BACK" / "YEAH, I WANT SOME BREAK"
const ORB = () => div('pp-orb');
const GLYPH = () => svg('<svg class="pp-glyph" viewBox="0 0 22 20" width="22" height="20" aria-hidden="true" focusable="false"><path d="M11 1.5 20 18H2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><rect x="10.1" y="6.5" width="1.8" height="6" rx=".9" fill="currentColor"/><circle cx="11" cy="15.5" r="1" fill="currentColor"/></svg>');
const MASCOT = () => svg('<svg class="pp-mascot" viewBox="0 0 164 140" width="164" height="140" role="img" aria-label="COSINE companion" focusable="false"><ellipse cx="82" cy="73" rx="62" ry="55" fill="var(--cyan)" fill-opacity=".204"/><ellipse cx="82" cy="73" rx="54" ry="48" fill="var(--surface-2)" stroke="var(--cyan)" stroke-width="2.5"/><g class="pp-eyes" fill="var(--text)"><ellipse cx="62.5" cy="66" rx="7.5" ry="5"/><ellipse cx="101.5" cy="66" rx="7.5" ry="5"/></g><path d="M66.6 90.2A17 10 0 0 0 97.4 90.2" fill="none" stroke="var(--cyan)" stroke-width="2.4" stroke-linecap="round"/></svg>');

function buttonsRow(ctx, specs, status) {
  const row = div('pp-actions');
  const out = [];
  specs.forEach((s, i) => {
    const b = el('button', {type: 'button', class: `pp-btn ${i === 0 ? 'pp-primary' : 'pp-secondary'}`, 'data-command': s.action, ...(s.intent ? {title: INTENT_NOTE} : {})}, s.label);
    b.addEventListener('click', () => {
      if (b.disabled) return;
      const field = ctx.root.querySelector('#wlDuration');
      const bad = s.check && s.check(field?.value);
      if (bad) { status(bad); return; }
      const res = ctx.act(s.action, field?.value);
      if (res.error || res.ok === false) status('NOT ACCEPTED · ' + upper(res.error || 'PLEASE RETRY'));
    });
    out.push(b); row.append(b);
  });
  return {row, buttons: out};
}

function durationField({min, max, label, maxLength, placeholder, mono}) {
  const input = el('input', {id: 'wlDuration', class: 'pp-field', type: 'text', inputmode: 'numeric', autocomplete: 'off', maxlength: String(maxLength), placeholder, 'aria-label': label, 'data-min': String(min), 'data-max': String(max)});
  input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, maxLength); });
  return input;
}
function onEnter(input, primary) {   // desktop: QLineEdit.returnPressed submits the primary action
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); primary?.click(); } });
}

// ------------------------------------------------------------------ SINE family
function buildSine(ctx) {
  const {p} = ctx, gate = p.stage === 'RESUME_GATE', stage = Number(p.stage);
  const copy = gate ? {world: 'green', ...GATE_COPY} : SINE_COPY[stage];
  const protectedRed = !gate && stage === 3;
  const root = ctx.root; root.classList.add('pp-sine', 'pp-enter', `pp-world-${copy.world}`);
  if (protectedRed) root.classList.add('pp-protected');
  const status = txt('p', 'pp-status', 'WAITING FOR FACTUAL DISPLAY ACKNOWLEDGEMENT', {'aria-live': 'polite'});
  const eyebrow = div('pp-eyebrow-row', ORB(), txt('span', 'pp-eyebrow', gate ? 'MYELIN · BREAK ENDED' : 'MYELIN · SESSION ALERT'), div('pp-grow'),
    protectedRed ? GLYPH() : null, txt('span', 'pp-badge pp-badge-sine', gate ? 'RETURN' : `SINE-${stage}`));
  const children = [eyebrow, div('pp-gap6'), txt('h2', 'pp-headline pp-h26', copy.headline, {id: 'wlPopupTitle'}), txt('p', 'pp-message pp-m14', copy.message)];
  const res = String(ctx.r.observation?.label || '').trim();
  if (res) children.push(txt('p', 'pp-resource', `RESOURCE: ${res}`));
  children.push(div('pp-grow'), status);
  let buttons = [];
  if (p.actions.length) {
    const specs = gate ? [{label: "I'M BACK", action: 'resume'}]
      : [{label: stage === 2 ? "I'M BACK NOW" : "I'M BACK", action: 'return', intent: true}, ...p.actions.filter(a => a === 'normal-break').map(a => ({label: 'NEED A BREAK', action: a}))];
    const b = buttonsRow(ctx, specs, m => { status.textContent = m; }); buttons = b.buttons; children.push(b.row);
  } else children.push(txt('p', 'pp-protected-note', 'NO BUTTONS · AWAITING VERIFIED FOCUS RETURN'));
  const strip = div('pp-strip', div('pp-strip-fill'));
  const count = txt('p', 'pp-countdown', gate ? 'NO DISPLAY DEADLINE · WAITING FOR YOUR ACKNOWLEDGEMENT' : 'DISPLAY WINDOW --:--', {id: 'wlPopupProgress'});
  children.push(div('pp-gap6'), strip, count, txt('p', 'pp-footer', gate ? 'POST-BREAK RETURN · NOT A SINE STAGE' : `SINE STAGE ${stage} OF 3 · ${upper(copy.intensity)}`));
  root.append(div('pp-shell', ...children));
  const fill = strip.firstChild;
  return {update({r, o, p}) {
    root.classList.toggle('pp-shown', !!p.displayed);
    if (gate) { fill.style.width = '100%'; status.textContent = p.displayed ? "DISPLAYED · PRESS I'M BACK WHEN YOU ARE READY" : 'WAITING FOR FACTUAL DISPLAY ACKNOWLEDGEMENT'; return; }
    const total = SINE_VISIBLE[stage], left = p.displayed ? total - (r.time - p.displayedAt) : total, rec = r.mirl.recovery;
    count.textContent = `DISPLAY WINDOW: ${mmss(left)}`;
    fill.style.width = `${Math.max(0, Math.min(1, left / total)) * 100}%`;
    status.textContent = rec ? `RETURN ${rec.phase === 'CONFIRMING' ? 'CONFIRMING' : 'VERIFYING'} · SUPPORTED ${mmss(rec.seconds)}`
      : !p.displayed ? 'WAITING FOR FACTUAL DISPLAY ACKNOWLEDGEMENT'
      : left <= 0 ? (protectedRed ? 'DISPLAY WINDOW ELAPSED · RED REMAINS AUTHORITY-PROTECTED' : 'DISPLAY WINDOW ELAPSED · WAITING FOR SINE CLOSE COMMAND')
      : 'DISPLAYED · WAITING FOR SINE AUTHORITY';
  }};
}

// ------------------------------------------------------------------ Normal Break selector
function buildBreakSelector(ctx) {
  const {p} = ctx, root = ctx.root; root.classList.add('pp-nb', 'pp-world-green');
  const status = txt('p', 'pp-status pp-s105', '5–30 WHOLE MINUTES', {'aria-live': 'polite'});
  const input = durationField({min: p.min, max: p.max, label: 'Break duration in whole minutes', maxLength: 2, placeholder: '5–30'});
  const check = v => {
    const t = String(v ?? '').trim();
    if (!t || !/^\d+$/.test(t)) return 'ENTER ONE WHOLE NUMBER FROM 5 TO 30';
    const n = Number(t); return n < p.min || n > p.max ? 'BREAK MUST BE BETWEEN 5 AND 30 WHOLE MINUTES' : '';
  };
  const b = buttonsRow(ctx, [{label: 'START BREAK', action: 'duration', check}, {label: 'CANCEL', action: 'cancel'}], m => { status.textContent = m; });
  onEnter(input, b.buttons[0]);
  root.append(div('pp-shell', txt('p', 'pp-eyebrow pp-center', 'MYELIN · NORMAL BREAK'), txt('h2', 'pp-headline pp-h25', 'TAKE A BREAK', {id: 'wlPopupTitle'}),
    txt('p', 'pp-message pp-m125', 'Choose a whole-minute break. No duration is selected by default.'),
    div('pp-field-row', input, txt('span', 'pp-unit', 'MIN')), status, b.row, txt('p', 'pp-countdown pp-hidden', '', {id: 'wlPopupProgress'})));
  return {focus: input, update() {}};
}

// ------------------------------------------------------------------ MINE
function buildMine(ctx) {
  const {p} = ctx, root = ctx.root, stage = String(p.stage), two = stage.startsWith('MINE-2'), dur = stage === 'DURATION';
  root.classList.add('pp-mine', two ? 'pp-tone-red' : 'pp-tone-amber');
  const plat = ctx.r.observation?.platform;
  const status = txt('p', 'pp-status pp-s12', dur ? 'MINE IS WAITING FOR YOUR CHOSEN MINUTES' : 'AWAITING DISPLAY ACKNOWLEDGEMENT', {'aria-live': 'polite'});
  const variant = stage.replace('MINE-', 'MINE');
  const head = div('pp-mine-head', txt('span', 'pp-eyebrow pp-mono13', 'MYELIN · MINE'), div('pp-grow'), txt('span', 'pp-badge pp-badge-mine', dur ? "IT'S IMPORTANT" : two ? variant : 'MINE-1'));
  const kids = [head, div('pp-rail')];
  let buttons = [], confirming = null, field = null;
  if (two) {
    const a = stage === 'MINE-2A';
    kids.push(txt('h2', 'pp-headline pp-h26 pp-bold', a ? 'YOU SAID YOU WOULD COME BACK' : 'YOUR IMPORTANT MESSAGING TIME IS OVER', {id: 'wlPopupTitle'}),
      txt('p', 'pp-message pp-m15', a ? 'You intended to return. Your important work is waiting.' : 'Your chosen messaging time is over. It is time to return.'));
    confirming = txt('p', 'pp-confirming', '', {'aria-live': 'polite'}); kids.push(confirming, status, txt('p', 'pp-footer pp-f11', 'MINE · FINAL CALLBACK · NO ACTION BUTTONS'));
  } else if (dur) {
    field = durationField({min: p.min, max: p.max, label: 'Important messaging duration in whole minutes', maxLength: 4, placeholder: 'MINUTES'});
    const b = buttonsRow(ctx, [{label: 'SET IMPORTANT TIME', action: 'duration'}], m => { status.textContent = m; }); onEnter(field, b.buttons[0]); buttons = b.buttons;
    kids.push(txt('h2', 'pp-headline pp-h26 pp-bold', 'IT SEEMS YOU HAVE STARTED USING A MESSAGING APP', {id: 'wlPopupTitle'}),
      txt('p', 'pp-message pp-m15', 'HOW MANY WHOLE MINUTES DO YOU NEED? ENTER ANY VALUE FROM 5 THROUGH 30.'));
    if (plat) kids.push(txt('p', 'pp-context', `MESSAGING APP · ${plat}`));
    kids.push(div('pp-field-row pp-mine-field', field, b.row.querySelector('button')), status, txt('p', 'pp-footer pp-f11', 'MINE · INTENTION GATE'));
  } else {
    const b = buttonsRow(ctx, [{label: 'I WILL COME BACK', action: 'come-back', intent: true}, {label: "IT'S IMPORTANT", action: 'important'}], m => { status.textContent = m; }); buttons = b.buttons;
    kids.push(txt('h2', 'pp-headline pp-h26 pp-bold', 'IT SEEMS YOU HAVE STARTED USING A MESSAGING APP', {id: 'wlPopupTitle'}),
      txt('p', 'pp-message pp-m15', 'BUT YOU HAVE IMPORTANT WORK — RETURN IF THIS IS NOT IMPORTANT.'));
    if (plat) kids.push(txt('p', 'pp-context', `MESSAGING APP · ${plat}`));
    kids.push(b.row, status, txt('p', 'pp-footer pp-f11', 'MINE · INTENTION GATE'));
  }
  kids.push(txt('p', 'pp-countdown pp-hidden', '', {id: 'wlPopupProgress'}));
  root.append(div('pp-card', ...kids));
  return {focus: field, update({o, p}) {
    root.classList.toggle('pp-shown', !!p.displayed);
    if (!dur) { buttons.forEach(b => { b.disabled = !p.displayed; }); status.textContent = p.displayed ? 'COMMAND ACCEPTED' : 'AWAITING DISPLAY ACKNOWLEDGEMENT'; }
    if (confirming) { confirming.textContent = o.recovery ? 'RETURN CONFIRMING' : ''; }
  }};
}

// ------------------------------------------------------------------ COSINE
function cosineFacts(ctx) {
  const ev = ctx.r.events, last = t => { for (let i = ev.length - 1; i >= 0; i--) if (ev[i].organ === 'COSINE' && ev[i].type === t && ev[i].episodeId === ctx.o.episodeId) return ev[i]; return null; };
  return {intent: last('INTENT_CHOSEN'), committed: last('BREAK_COMMITTED')};
}
function buildCosine(ctx) {
  const {p} = ctx, root = ctx.root, stage = String(p.stage); root.classList.add('pp-cosine');
  const facts = cosineFacts(ctx), failed = stage === 'DURATION' && facts.intent?.payload?.choice === 'RETURN';
  const plat = ctx.r.observation?.platform;
  const status = txt('p', 'pp-status pp-s12', 'AWAITING DISPLAY ACKNOWLEDGEMENT', {'aria-live': 'polite'});
  const badge = {INTENT_GATE: 'INTENTION', DURATION: failed ? 'SET A LIMIT' : 'BREAK LENGTH', BREAK_ACK: 'BREAK SET', FINAL_CALLBACK: 'FOCUS'}[stage];
  const footer = {INTENT_GATE: 'COSINE · INTENTION GATE', DURATION: 'COSINE · BREAK DURATION', BREAK_ACK: 'COSINE · BREAK ACKNOWLEDGEMENT', FINAL_CALLBACK: 'COSINE · FINAL CALLBACK'}[stage];
  const kids = [div('pp-eyebrow-row', ORB(), txt('span', 'pp-eyebrow pp-e13', 'MYELIN · COSINE'), div('pp-grow'), txt('span', 'pp-badge pp-badge-cosine', badge))];
  const headline = t => txt('h2', 'pp-headline pp-h27', t, {id: 'wlPopupTitle'});
  let buttons = [], field = null, focus = null, rowFn = null;
  const ctxLine = txt('p', 'pp-context', plat ? `NOW PLAYING: ${plat}` : '');
  const tuneOn = on => root.classList.toggle('pp-has-display-gate', on);
  if (stage === 'INTENT_GATE') {
    kids.push(headline('IT SEEMS YOU ARE INTERESTED TO WATCH THIS SHOW'), MASCOT());
    if (plat) kids.push(ctxLine);
    const b = buttonsRow(ctx, [{label: COSINE_LABELS['return-intention'], action: 'return-intention', intent: true}, {label: COSINE_LABELS['intentional-break'], action: 'intentional-break'}], m => { status.textContent = m; });
    buttons = b.buttons; kids.push(status, b.row); tuneOn(true);
  } else if (stage === 'DURATION') {
    if (failed) kids.push(headline("IT SEEMS YOU'D LIKE TO KEEP WATCHING."), txt('p', 'pp-message pp-m15 pp-pre', "LET'S SET A LIMIT.\nI'LL CALL YOU BACK WHEN YOUR BREAK IS OVER."), txt('p', 'pp-context', 'TRY TO KEEP IT TO ONE EPISODE.'));
    else kids.push(headline('HOW LONG WOULD YOU LIKE YOUR BREAK TO BE?'));
    field = durationField({min: p.min, max: p.max, label: 'Break length in whole minutes', maxLength: 4, placeholder: 'XX'});
    const b = buttonsRow(ctx, [{label: failed ? 'START WATCHING' : 'SET TIME', action: 'duration'}], m => { status.textContent = m; }); onEnter(field, b.buttons[0]); buttons = b.buttons;
    status.textContent = 'COSINE IS WAITING FOR YOUR CHOSEN MINUTES'; focus = field;
    kids.push(div('pp-field-row', field, txt('span', 'pp-unit pp-unit-c', 'MINS')), status, b.row);
  } else if (stage === 'BREAK_ACK') {
    const mins = facts.committed ? Math.round(facts.committed.payload.seconds / 60) : null;
    kids.push(headline('ENJOY THE SHOW'), txt('p', 'pp-message pp-m15', "I'LL CALL YOU BACK IN"), txt('p', 'pp-minutes', mins === null ? '-- MINS' : `${mins} MINS`));
    const b = buttonsRow(ctx, [{label: 'YAY', action: 'ack'}], m => { status.textContent = m; }); buttons = b.buttons; kids.push(status, b.row); tuneOn(true);
  } else {
    kids.push(headline('HOPE YOU ENJOYED THE SHOW.'), txt('p', 'pp-message pp-m15', "NOW IT'S TIME TO FOCUS."), MASCOT(), status);
  }
  kids.push(txt('p', 'pp-footer pp-f11', footer), txt('p', 'pp-countdown pp-hidden', '', {id: 'wlPopupProgress'}));
  root.append(div('pp-card', ...kids));
  return {focus, update({p}) {
    root.classList.toggle('pp-shown', !!p.displayed);
    if (stage === 'DURATION') return;
    buttons.forEach(b => { b.disabled = !p.displayed; });
    status.textContent = p.displayed ? 'COMMAND ACCEPTED' : 'AWAITING DISPLAY ACKNOWLEDGEMENT';
  }};
}

// ------------------------------------------------------------------ SECANT
const SECANT_COPY = {
  1: {tone: 'blue', title: 'Study focus notice', body: 'The active study block is running. Return to the registered study resource.'},
  2: {tone: 'amber', title: 'Study return pending', body: 'The study session is still off-track. Return to the registered study resource.'},
  3: {tone: 'red', title: 'Study return required', body: 'The study session remains off-track. Return to the registered study resource so recovery can be verified.'}
};
function buildSecant(ctx) {
  const {p} = ctx, root = ctx.root, stage = Number(p.stage), c = SECANT_COPY[stage]; root.classList.add('pp-secant', `pp-secant-${c.tone}`);
  const res = txt('p', 'pp-resource pp-secant-resource', 'REGISTERED RESOURCE · Awaiting projection');
  const status = txt('p', 'pp-status pp-s13', 'Awaiting SECANT projection', {'aria-live': 'polite'});
  const kids = [div('pp-secant-head', txt('span', 'pp-secant-eyebrow', '●  MYELIN · SESSION ALERT'), div('pp-grow'), txt('span', 'pp-badge pp-badge-secant', `SECANT-${stage}`)), div('pp-gap8'),
    txt('h2', 'pp-headline pp-h34', c.title, {id: 'wlPopupTitle'}), txt('p', 'pp-message pp-m17', c.body), res, div('pp-grow'), status];
  let buttons = [];
  if (p.actions.length) {
    const specs = [{label: 'RETURN TO STUDY', action: 'return', intent: true}, ...p.actions.filter(a => a === 'study-break').map(() => ({label: 'NEED BREAK', action: 'study-break'}))];
    const b = buttonsRow(ctx, specs, m => { status.textContent = m; }); buttons = b.buttons; kids.push(b.row);
  } else kids.push(txt('p', 'pp-protected-note pp-s13', 'NO BUTTONS · RETURN TO YOUR STUDY RESOURCE'));
  const bar = div('pp-progress', div('pp-progress-fill'));
  const timing = txt('p', 'pp-timing', 'SECANT TIMING · —', {id: 'wlPopupProgress'});
  kids.push(div('pp-gap6'), bar, timing, txt('p', 'pp-footer pp-f12', 'STUDY ACTIVE · SECANT INTERVENTION'));
  root.append(div('pp-shell', ...kids));
  const fill = bar.firstChild;
  return {update({r, o, p}) {
    const plan = r.study.plan; res.textContent = 'REGISTERED RESOURCE · ' + (plan ? `${plan.subject} · ${plan.task}` : 'Registered Study resource');
    status.textContent = 'SECANT · ' + (p.displayed ? 'DISPLAYED' : 'REQUESTED');
    const rec = o.recovery; let ratio = 0, line;
    if (o.held && !rec) line = `HOLD · EVIDENCE · ${mmss(o.remaining)}`;
    else if (rec && (rec.phase === 'VERIFYING' || rec.phase === 'CONFIRMING')) {
      const verifying = rec.phase === 'VERIFYING', target = verifying ? 10 : 60; ratio = Math.min(1, rec.seconds / target);
      line = `${verifying ? 'RETURN VERIFY ' : 'CLOSURE '}${mmss(rec.seconds)} / ${mmss(target)}`;
    } else if (stage === 3) line = 'RED · RETURN REQUIRED';
    else line = 'ESCALATION REMAINING · ' + mmss(o.remaining);
    timing.textContent = line; fill.style.width = `${ratio * 100}%`;
    buttons.forEach(b => { b.disabled = !p.displayed; });
  }};
}

// ------------------------------------------------------------------ COSECANT
function buildCosecant(ctx) {
  const {p} = ctx, root = ctx.root; root.classList.add('pp-cosecant');
  const message = txt('h2', 'pp-headline pp-h27 pp-x800', '', {id: 'wlPopupTitle'}), detail = txt('p', 'pp-message pp-m14', '');
  const status = txt('p', 'pp-status pp-s105', '', {'aria-live': 'polite'}), count = txt('p', 'pp-countdown pp-c11', '', {id: 'wlPopupProgress'});
  const locked = p.stage === 'FINAL_LOCK', kids = [div('pp-eyebrow-row', txt('span', 'pp-dot', '●'), txt('span', 'pp-eyebrow', 'MYELIN · STUDY RETURN'), div('pp-grow'), txt('span', 'pp-badge pp-badge-cosecant', 'COSECANT')), div('pp-gap8'), message, detail, div('pp-grow'), status, count];
  let buttons = [];
  if (p.actions.length) { const b = buttonsRow(ctx, [{label: 'RETURN TO STUDY', action: 'return', intent: true}], m => { status.textContent = m; }); buttons = b.buttons; kids.push(b.row); }
  else kids.push(txt('p', 'pp-protected-note pp-s105', 'NO BUTTONS · EXACT STUDY RETURN REQUIRED'));
  kids.push(div('pp-accent-line'), txt('p', 'pp-footer pp-f95', 'MYELIN · APPROVED BREAK RETURN'));
  root.append(div('pp-shell', ...kids));
  return {update({r, o, p}) {
    const over = r.time - o.deadline, returning = !!o.returning;
    if (returning && locked) {
      message.textContent = 'RETURN DETECTED'; detail.textContent = 'Keep the exact registered Study resource present while COSECANT verifies the return.';
      status.textContent = 'FACTUAL RETURN DETECTED · VERIFYING CONTINUITY'; count.textContent = `RETURN VERIFICATION · ${mmss(3 - o.confirm)}`;
    } else if (locked) {
      message.textContent = 'COME BACK PLEASE'; detail.textContent = 'Open the exact registered Study resource. This protected notice closes only after observed return.';
      status.textContent = 'FINAL RETURN LOCK · WAITING FOR EXACT RESOURCE'; count.textContent = 'EXACT STUDY RETURN REQUIRED';
    } else if (p.stage === 'BREAK_ALREADY_OVER') {
      message.textContent = 'BREAK ALREADY OVER'; detail.textContent = 'Your planned break has been over for five minutes. Return to your registered Study task.';
      status.textContent = 'APPROVED BREAK OVERDUE · RETURN INTENT AVAILABLE'; count.textContent = `NEXT AUTHORITY · ${mmss(360 - over)}`;
    } else {
      message.textContent = 'BREAK COMPLETE'; detail.textContent = 'Your planned break has ended. Return to your registered Study task.';
      status.textContent = 'APPROVED BREAK COMPLETE · RETURN INTENT AVAILABLE'; count.textContent = `NEXT AUTHORITY · ${mmss(300 - over)}`;
    }
    buttons.forEach(b => { b.disabled = false; });
  }};
}

// ------------------------------------------------------------------ dispatcher
function family(o, p) {
  if (o.name === 'SINE') return buildSine;
  if (o.name === 'NORMAL_BREAK') return p.stage === 'RESUME_GATE' ? buildSine : buildBreakSelector;
  if (o.name === 'MINE') return buildMine;
  if (o.name === 'COSINE') return buildCosine;
  if (o.name === 'SECANT') return buildSecant;
  if (o.name === 'COSECANT') return buildCosecant;
  return null;
}

export function createPopup({r, o, p, act}) {
  const build = family(o, p);
  if (!build) return null;
  const root = el('section', {id: 'wlPopup', class: 'wl-pp', role: 'region', 'aria-label': `${o.name} intervention`, 'aria-labelledby': 'wlPopupTitle', 'data-stage': String(p.stage), 'data-organ': o.name, tabindex: '-1'});
  const ctx = {r, o, p, act, root};
  const view = build(ctx);
  root._pp = view;
  // The desktop shows accent-on-fill buttons in the live body accent; pick a readable ink once.
  const m = /^#?([0-9a-f]{6})$/i.exec(getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim());
  if (m) { const n = parseInt(m[1], 16), l = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; root.style.setProperty('--ppon', l > 0.55 ? '#0B0F19' : '#FFFFFF'); }
  attachDrag(root);
  queueMicrotask(() => { try { (view.focus || root).focus({preventScroll: true}); } catch { /* focus is a convenience only */ } });
  view.update({r, o, p});
  return root;
}
export function refreshPopup(root, ctx) { root?._pp?.update(ctx); }

// Web adaptation: a desktop popup is its own OS window and can be moved aside; here it may be dragged so
// the Evidence workspace stays reachable. Interactive controls and touch layouts are excluded.
function attachDrag(root) {
  let start = null;
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.pointerType === 'touch' || matchMedia('(max-width:700px)').matches || e.target.closest('button,input,select,textarea,a')) return;
    start = {x: e.clientX, y: e.clientY, dx: parseFloat(root.style.getPropertyValue('--dx')) || 0, dy: parseFloat(root.style.getPropertyValue('--dy')) || 0};
    root.setPointerCapture(e.pointerId); root.classList.add('pp-dragging');
  });
  root.addEventListener('pointermove', e => { if (!start) return; root.style.setProperty('--dx', `${start.dx + e.clientX - start.x}px`); root.style.setProperty('--dy', `${start.dy + e.clientY - start.y}px`); document.dispatchEvent(new Event('wl-pp-move')); });
  const end = () => { start = null; root.classList.remove('pp-dragging'); };
  root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
}

// ------------------------------------------------------------------ Normal Break active window (3 s, presentation only)
let breakShown = null, breakTimer = 0;
export function syncBreakActive(r) {
  const nb = r.normalBreak, host = document.getElementById('wlBreakActive');
  const live = r.state === 'ACTIVE' && nb.state === 'ACTIVE' && Number.isFinite(nb.deadline);
  if (!live) { host?.remove(); if (nb.state !== 'ACTIVE') breakShown = null; return; }
  if (breakShown !== nb.episodeId) {
    breakShown = nb.episodeId; host?.remove();
    const count = txt('p', 'pp-countdown pp-break-clock', '--:--');
    const node = el('section', {id: 'wlBreakActive', class: 'wl-pp pp-nb pp-nb-active pp-world-green', role: 'status', 'aria-label': 'Break active'},
      div('pp-shell', txt('p', 'pp-eyebrow pp-center', 'MYELIN · NORMAL BREAK'), txt('h2', 'pp-headline pp-h25', 'BREAK ACTIVE'),
        txt('p', 'pp-message pp-m125', "The break clock is owned by MYELIN's Normal Break authority."), count,
        txt('p', 'pp-status pp-s105', 'SAME SINE EPISODE HELD'), txt('p', 'pp-enjoy', 'ENJOY YOUR BREAK')));
    node._count = count; document.body.append(node); attachDrag(node);
    clearTimeout(breakTimer); breakTimer = setTimeout(() => document.getElementById('wlBreakActive')?.remove(), 3000);  // desktop: NormalBreakActiveWindow 3 s presentation timeout
  }
  const n = document.getElementById('wlBreakActive'); if (n?._count) n._count.textContent = mmss(nb.deadline - r.time);
}
