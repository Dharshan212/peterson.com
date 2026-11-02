// Study teaching simulation (Academy Stage A). A self-contained, SIMULATED tutorial inside Study Mode: choose a study video (tutorial example or your own words), prepare a study block,
// learn how keyword points are weighed, and operate three outcomes (aligned / uncertain / off-task) on a MANUAL clock. The arithmetic is a port of the accepted desktop Study-evidence rules
// (study-lab-core.js). It never inspects a page, a video or a person: "observed titles" are supplied by the tutorial, and the browser is not monitoring anything.
// Isolation: it owns its own state and its own event list; it never touches the engine runtime, Live Telemetry, stored history, imported evidence, SECANT or COSECANT.
// The only things it may write into the page are the six Study Mode form fields, and only when the visitor presses COPY TO THE STUDY FORM.
import {el, button} from './dom.js';
import {showCard, clearStage, visibleId} from './popup-stage.js';
import * as C from './study-lab-core.js';

const mmss = (s) => { const t = Math.max(0, Math.floor(s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const STEPS = [['video', '1 · CHOOSE A VIDEO'], ['plan', '2 · PREPARE THE BLOCK'], ['points', '3 · KEYWORD POINTS'], ['scenarios', '4 · THREE OUTCOMES']];
const FORM = {subject: 'sxSubject', task: 'sxTask', keywords: 'sxKeywords', important: 'sxImportant', studyMin: 'sxStudyMin', breakMin: 'sxBreakMin'};
const tone = (c) => ({STUDY_ALIGNED: 'ok', UNCERTAIN: 'warn', DISTRACTION: 'bad'}[c] || '');
const pill = (t, cls = '') => el('span', {class: 'st-pill ' + cls}, t);
const TOKEN = /[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu;

export function createStudyLab() {
  const S = {open: false, step: 'video', pick: null, draft: {title: '', subject: '', task: '', url: '', keywords: '', important: ''}, decl: null,
    plan: {studyMin: 45, breakMin: 10, subject: '', task: '', keywords: '', important: '', prepared: false}, scenarios: null, scn: null, clock: 0, events: [], msg: '', tryTitle: '', tryCert: true};
  let host = null, rootEl = null, bar = null;
  const log = (name, text, extra = '') => { S.events.unshift({t: S.clock, name, text, extra}); if (S.events.length > 60) S.events.pop(); };

  // ------------------------------------------------------------------------------------------------ helpers
  const markTitle = (title, ev) => {
    const hit = new Map(ev.keywordEvidence.filter((k) => k.matched).map((k) => [k.keyword, k.importance]));
    const out = el('span', {class: 'sl-title-marked'}); let last = 0;
    const text = String(title);
    for (const m of text.matchAll(TOKEN)) {
      if (m.index > last) out.append(text.slice(last, m.index));
      const imp = hit.get(m[0].normalize('NFKC').toLowerCase());
      out.append(imp ? el('mark', {class: imp === 'IMPORTANT' ? 'sl-hit sl-hit-imp' : 'sl-hit', title: imp === 'IMPORTANT' ? 'important keyword matched (2 points)' : 'keyword matched (1 point)'}, m[0]) : m[0]);
      last = m.index + m[0].length;
    }
    if (last < text.length) out.append(text.slice(last));
    return out;
  };
  const evidenceTable = (ev) => el('table', {class: 'sl-table', 'aria-label': 'Keyword evidence'},
    el('thead', {}, el('tr', {}, ['KEYWORD', 'TYPE', 'POINTS', 'IN TITLE', 'EARNED'].map((h) => el('th', {scope: 'col'}, h)))),
    el('tbody', {}, ev.keywordEvidence.length ? ev.keywordEvidence.map((k) => {
      const sus = ev.suspiciousKeywords.includes(k.keyword);
      return el('tr', {class: sus ? 'sl-excl' : k.matched ? 'sl-yes' : 'sl-no', 'data-keyword': k.keyword},
        el('td', {}, k.keyword), el('td', {}, k.importance === 'IMPORTANT' ? 'IMPORTANT' : 'ORDINARY'), el('td', {}, String(k.points)), el('td', {}, sus ? 'EXCLUDED' : k.matched ? 'YES ✓' : 'no ✗'), el('td', {}, sus ? '—' : k.matched ? `+${k.points}` : '0'));
    }) : el('tr', {}, el('td', {colspan: '5'}, 'No keywords declared.'))));
  const band = (ev, verdict) => {
    const v = Math.max(0, Math.min(100, ev.confidencePercent));
    return el('div', {class: 'sl-band', role: 'img', 'aria-label': `Confidence ${ev.confidencePercent} percent: ${C.LABEL[verdict.classification]}. Off-task up to 25, uncertain above 25, aligned from 75.`},
      el('div', {class: 'sl-band-track'}, el('i', {class: 'sl-seg bad', style: 'width:25%'}, 'OFF-TASK'), el('i', {class: 'sl-seg warn', style: 'width:50%'}, 'UNCERTAIN'), el('i', {class: 'sl-seg ok', style: 'width:25%'}, 'ALIGNED'), el('b', {class: 'sl-marker', style: `left:${v}%`})),
      el('div', {class: 'sl-band-scale'}, el('span', {}, '0'), el('span', {style: 'left:25%'}, '25'), el('span', {style: 'left:75%'}, '75'), el('span', {style: 'left:100%'}, '100')));
  };
  /** The shared "how the number was made" explanation used by the try-a-title box and the three scenarios. */
  const explain = (ev, verdict, idPhrase) => {
    const imp = ev.keywordEvidence.filter((k) => k.importance === 'IMPORTANT' && !ev.suspiciousKeywords.includes(k.keyword)), impHit = imp.filter((k) => k.matched);
    const lines = [
      `Points earned: ${ev.effectiveMatchedPoints} of ${ev.effectivePossiblePoints} possible = ${ev.effectiveScorePercent}%.`,
      imp.length ? `Important keywords found: ${impHit.length} of ${imp.length}${impHit.length ? ' (' + impHit.map((k) => k.keyword).join(', ') + ')' : ''}${imp.length > impHit.length ? ' · missing: ' + imp.filter((k) => !k.matched).map((k) => k.keyword).join(', ') : ''}.` : 'No important keywords were declared.',
      ev.mismatchPenaltyPercent ? `Background mismatch words in the title took ${ev.mismatchPenaltyPercent} points off.` : null,
      ev.alignmentBasis === 'EXACT_TASK_TITLE' ? 'The complete declared task title appears in the title of a certified learning resource, which counts as 100%.' : null,
      idPhrase];
    return el('div', {class: 'sl-explain'},
      el('ul', {class: 'sl-lines'}, lines.filter(Boolean).map((l) => el('li', {}, l)), ev.safetyCaps.map((c) => el('li', {class: 'sl-cap', 'data-cap': c}, C.CAP_TEXT[c] || c))),
      el('div', {class: 'sl-result'}, el('span', {}, 'CONFIDENCE'), el('b', {class: 'sl-num'}, `${ev.confidencePercent}%`), pill(C.LABEL[verdict.classification], tone(verdict.classification)), el('span', {class: 'sl-resnote'}, `(${ev.keywordEvidence.length} keyword${ev.keywordEvidence.length === 1 ? '' : 's'}, schema ${ev.schema})`)),
      band(ev, verdict));
  };
  const field = (id, label, why, control) => el('div', {class: 'sl-field'}, el('label', {for: id}, label), control, el('p', {class: 'sl-why', id: id + 'Why'}, why));
  const input = (id, key, obj, attrs = {}) => { const i = el('input', {id, class: 'wl-input sl-input', value: obj[key] ?? '', ...attrs}); i.addEventListener('input', () => { obj[key] = i.type === 'number' ? Number(i.value) : i.value; }); return i; };

  // ------------------------------------------------------------------------------------------------ steps
  function stepVideo() {
    const dv = C.DEFAULT_VIDEO;
    const pickBtn = (id, label, sub, on) => { const b = button('', () => { S.pick = id === 'slPickDefault' ? 'default' : 'custom'; S.msg = ''; render(); }, {class: 'sl-pick' + (on ? ' on' : ''), id, 'aria-pressed': String(on)}); b.append(el('b', {}, label), el('span', {}, sub)); return b; };
    const head = el('div', {class: 'sl-picks', role: 'group', 'aria-label': 'Choose a study video'}, pickBtn('slPickDefault', 'DEFAULT VIDEO', 'A prepared educational example with its subject, title and keywords.', S.pick === 'default'),
      pickBtn('slPickCustom', 'CUSTOM VIDEO', 'Name your own video and choose your own subject and keywords.', S.pick === 'custom'));
    let body;
    if (S.pick === 'default') {
      body = el('div', {class: 'sl-pane', id: 'slDefaultPane'}, pill('TUTORIAL EXAMPLE — nothing is played, fetched or inspected', 'warn'),
        el('dl', {class: 'sl-kv'}, el('dt', {}, 'Video title'), el('dd', {id: 'slDefTitle'}, dv.title), el('dt', {}, 'Subject'), el('dd', {}, dv.subject), el('dt', {}, 'Task / lecture'), el('dd', {}, dv.task),
          el('dt', {}, 'Ordinary keywords'), el('dd', {}, dv.keywords.join(', ')), el('dt', {}, 'Important keywords'), el('dd', {}, dv.important.join(', '))),
        el('p', {class: 'st-hint'}, 'This is the study resource you are declaring. MYELIN will compare what it is told is open with these words; it never opens or plays the video.'),
        button('USE THIS VIDEO', () => useVideo({...dv, keywords: [...dv.keywords], important: [...dv.important]}), {class: 'st-btn primary', id: 'slUseVideo'}));
    } else if (S.pick === 'custom') {
      const d = S.draft;
      body = el('div', {class: 'sl-pane', id: 'slCustomPane'}, pill('YOUR OWN WORDS — declared by you, never checked against a real page', 'warn'),
        field('slCTitle', 'VIDEO NAME / TITLE', 'The name you would see on the video page. It becomes the declared study resource.', input('slCTitle', 'title', d, {placeholder: 'e.g. Introduction to Thermodynamics, Lecture 4'})),
        field('slCSubject', 'SUBJECT', 'The broad topic you are studying.', input('slCSubject', 'subject', d, {placeholder: 'Subject'})),
        field('slCTask', 'STUDY TASK / LECTURE', 'What you are doing with this video.', input('slCTask', 'task', d, {placeholder: 'Task or lecture title'})),
        field('slCUrl', 'VIDEO URL (OPTIONAL)', 'Recorded only as a declared resource. The tutorial never opens, downloads or reads this address, and entering one proves nothing about the page.', input('slCUrl', 'url', d, {placeholder: 'https://… (optional)', type: 'text'})),
        field('slCKeywords', 'KEYWORDS (ORDINARY — 1 POINT EACH)', 'Words you expect a relevant title to contain. Separate with commas.', input('slCKeywords', 'keywords', d, {placeholder: 'e.g. heat, entropy, energy'})),
        field('slCImportant', 'IMPORTANT KEYWORDS (2 POINTS EACH)', 'The one to three words that most clearly name the topic. Separate with commas.', input('slCImportant', 'important', d, {placeholder: 'e.g. thermodynamics, law'})),
        el('div', {class: 'st-ctl'}, button('COPY FROM THE STUDY MODE FORM', readForm, {class: 'st-btn', id: 'slReadForm'}), button('USE THIS VIDEO', () => {
          const decl = {id: 'custom', label: 'YOUR VIDEO', title: S.draft.title.trim(), subject: S.draft.subject.trim(), task: S.draft.task.trim(), url: S.draft.url.trim(), keywords: C.splitList(S.draft.keywords), important: C.splitList(S.draft.important)};
          const problems = C.validateDeclaration(decl);
          if (problems.length) { S.msg = problems.join(' '); render(); return; }
          useVideo(decl);
        }, {class: 'st-btn primary', id: 'slUseVideo'})));
    } else body = el('p', {class: 'st-hint', id: 'slPickHint'}, 'Choose DEFAULT VIDEO to start straight away, or CUSTOM VIDEO to use your own subject and keywords.');
    return el('section', {class: 'card st-card sl-step', id: 'slStepVideo', 'aria-labelledby': 'slStepVideoH'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'slStepVideoH'}, 'CHOOSE A STUDY VIDEO'), pill('THE VIDEO BECOMES THE DECLARED STUDY RESOURCE')),
      el('p', {class: 'st-hint'}, 'In MYELIN you tell Study Mode what you intend to study. Everything that follows compares what is observed with what you declared here.'), head, body);
  }
  function useVideo(decl) {
    S.decl = decl; S.plan = {...S.plan, subject: decl.subject, task: decl.task, keywords: decl.keywords.join(', '), important: decl.important.join(', '), prepared: false}; S.scenarios = null; S.scn = null; S.step = 'plan'; S.msg = '';
    log('STUDY_RESOURCE_DECLARED', `Declared study resource: "${decl.title}"${decl.url ? ' (address recorded, never opened)' : ''}.`, decl.id === 'default' ? 'tutorial example' : 'your video'); render();
  }
  function readForm() {
    const v = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
    S.draft.subject = v(FORM.subject) || S.draft.subject; S.draft.task = v(FORM.task) || S.draft.task; S.draft.keywords = v(FORM.keywords) || S.draft.keywords; S.draft.important = v(FORM.important) || S.draft.important;
    S.msg = 'Copied what is in the Study Mode form (empty fields were left alone).'; render();
  }
  function stepPlan() {
    if (!S.decl) return el('section', {class: 'card st-card sl-step', id: 'slStepPlan'}, el('p', {class: 'st-hint'}, 'Choose a video first (step 1).'));
    const p = S.plan;
    const presets = el('div', {class: 'sl-presets', role: 'group', 'aria-label': 'Study length presets'}, [25, 45, 60, 90].map((m) => button(`${m} MIN`, () => { p.studyMin = m; render(); }, {class: 'st-btn' + (p.studyMin === m ? ' primary' : ''), id: 'slDur' + m, 'aria-pressed': String(p.studyMin === m)})));
    const body = el('div', {class: 'sl-form'},
      field('slStudyMin', 'STUDY LENGTH (MINUTES)', '1 · How long this study block should run. The presets simply fill this box.', el('div', {}, presets, input('slStudyMin', 'studyMin', p, {type: 'number', min: '1', max: '1440'}))),
      field('slBreakMin', 'BREAK LENGTH (MINUTES)', '2 · The break you plan to take. Breaks are regulated later by COSECANT; choosing one here does not start it.', input('slBreakMin', 'breakMin', p, {type: 'number', min: '1', max: '1440'})),
      field('slSubject', 'SUBJECT', '3 · The topic area. Words here also explain why a word such as "music" in a title may be legitimate for you.', input('slSubject', 'subject', p)),
      field('slTask', 'TASK / LECTURE TITLE', '4 · The specific piece of work. If a certified page title contains this whole task, in order, MYELIN treats it as an exact match.', input('slTask', 'task', p)),
      field('slKeywords', 'KEYWORDS', '5 · Ordinary keywords: words a relevant title is likely to contain. Each one is worth 1 point.', input('slKeywords', 'keywords', p)),
      field('slImportant', 'IMPORTANT KEYWORDS', '6 · The main words naming the topic. Each is worth 2 points, and if none of them appears the evidence is held back.', input('slImportant', 'important', p)),
      el('div', {class: 'st-ctl'}, button('PREPARE THE STUDY BLOCK', prepare, {class: 'st-btn primary', id: 'slPrepare'}), el('span', {class: 'st-hint'}, '7 · Preparing records the declaration. Nothing starts and nothing is monitored.')));
    const done = p.prepared ? el('div', {class: 'sl-prepared', id: 'slPrepared', role: 'status'}, pill('STUDY BLOCK PREPARED · TUTORIAL', 'ok'),
      el('p', {}, `${p.studyMin} min study · ${p.breakMin} min break · declared resource “${S.decl.title}”${S.decl.url ? ' · address recorded, never opened' : ''}`),
      el('p', {class: 'st-hint'}, 'Declared words: ' + C.keywordRules(C.splitList(p.keywords), C.splitList(p.important)).rules.map((r) => `${r.keyword} (${r.points})`).join(' · ')),
      el('div', {class: 'st-ctl'}, button('COPY TO THE STUDY MODE FORM', copyToForm, {class: 'st-btn', id: 'slFillForm'}), button('NEXT: HOW KEYWORD POINTS WORK', () => { S.step = 'points'; render(); }, {class: 'st-btn primary', id: 'slToPoints'}))) : null;
    return el('section', {class: 'card st-card sl-step', id: 'slStepPlan', 'aria-labelledby': 'slStepPlanH'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'slStepPlanH'}, 'PREPARE THE STUDY BLOCK'), pill(S.decl.id === 'default' ? 'TUTORIAL EXAMPLE' : 'YOUR VIDEO')),
      el('p', {class: 'st-hint', id: 'slDeclared'}, `Declared study resource: “${S.decl.title}”. Each field below has a short note on why it exists.`), body, done);
  }
  function prepare() {
    const p = S.plan, decl = {...S.decl, subject: p.subject.trim(), task: p.task.trim(), keywords: C.splitList(p.keywords), important: C.splitList(p.important)};
    const problems = C.validateDeclaration(decl);
    if (!(p.studyMin >= 1) || !(p.breakMin >= 1)) problems.push('Study and break lengths must be at least one minute.');
    if (problems.length) { S.msg = problems.join(' '); p.prepared = false; render(); return; }
    S.decl = decl; if (decl.id === 'default' && (decl.subject !== C.DEFAULT_VIDEO.subject || decl.task !== C.DEFAULT_VIDEO.task || decl.keywords.join() !== C.DEFAULT_VIDEO.keywords.join() || decl.important.join() !== C.DEFAULT_VIDEO.important.join())) { delete S.decl.scenarios; } else if (decl.id === 'default') S.decl.scenarios = C.DEFAULT_VIDEO.scenarios;
    S.scenarios = C.buildScenarios(S.decl); S.scn = null; p.prepared = true; S.msg = '';
    log('STUDY_BLOCK_PREPARED', `Prepared a ${p.studyMin} min study / ${p.breakMin} min break block for “${decl.title}”.`, 'tutorial'); render();
  }
  function copyToForm() {
    const set = (id, v) => { const e = document.getElementById(id); if (!e || e.disabled) return false; e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); return true; };
    const p = S.plan, ok = [set(FORM.subject, p.subject), set(FORM.task, p.task), set(FORM.keywords, p.keywords), set(FORM.important, p.important), set(FORM.studyMin, String(p.studyMin)), set(FORM.breakMin, String(p.breakMin))];
    S.msg = ok.every(Boolean) ? 'Copied into the Study Mode form (switch to STUDY SESSION to see it). Nothing was started.' : 'Some Study Mode fields are locked or unavailable right now, so they were left unchanged.'; render();
  }
  function stepPoints() {
    if (!S.plan.prepared) return el('section', {class: 'card st-card sl-step', id: 'slStepPoints'}, el('p', {class: 'st-hint'}, 'Prepare the study block first (step 2).'));
    const {rules} = C.keywordRules(C.splitList(S.plan.keywords), C.splitList(S.plan.important)), total = rules.reduce((a, r) => a + r.points, 0);
    const demo = S.tryTitle.trim() ? C.studyEvidence({subject: S.decl.subject, task: S.decl.task, keywords: S.decl.keywords, important: S.decl.important, title: S.tryTitle, identityCertified: S.tryCert}) : null;
    const tryOut = el('div', {class: 'sl-tryout', id: 'slTryOut', 'aria-live': 'polite'});
    if (demo) { const v = C.classify(demo); tryOut.append(el('p', {class: 'sl-obs'}, 'Observed title: ', markTitle(S.tryTitle, demo)), evidenceTable(demo), explain(demo, v, S.tryCert ? 'Identity: pretended certified (the tutorial grants this).' : 'Identity: NOT certified, so the number cannot rise above 74.')); }
    else tryOut.append(el('p', {class: 'st-hint'}, 'Type any page title above to see which declared words it earns points for.'));
    const ti = el('input', {id: 'slTryTitle', class: 'wl-input sl-input', value: S.tryTitle, placeholder: 'Try a title, e.g. “' + (S.scenarios && S.scenarios.uncertain ? S.scenarios.uncertain.title : 'Neuron Signal Basics') + '”', 'aria-describedby': 'slTryHint'});
    ti.addEventListener('input', () => { S.tryTitle = ti.value; renderTry(); });
    const cb = el('input', {type: 'checkbox', id: 'slTryCert'}); cb.checked = S.tryCert; cb.addEventListener('change', () => { S.tryCert = cb.checked; renderTry(); });
    function renderTry() { const f = document.getElementById('slStepPoints'); if (!f) return; const fresh = stepPoints(); f.querySelector('#slTryOut').replaceWith(fresh.querySelector('#slTryOut')); }
    return el('section', {class: 'card st-card sl-step', id: 'slStepPoints', 'aria-labelledby': 'slStepPointsH'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'slStepPointsH'}, 'HOW KEYWORD POINTS WORK'), pill('EVIDENCE, NOT REWARDS', 'warn')),
      el('p', {class: 'sl-lead'}, 'Keyword points are not scores to win. They are weighted evidence about how closely an observed title relates to the topic you declared.'),
      el('div', {class: 'sl-rules'},
        el('div', {class: 'sl-rule'}, el('b', {}, '1 point'), el('span', {}, 'for each ORDINARY keyword found in the title')),
        el('div', {class: 'sl-rule imp'}, el('b', {}, '2 points'), el('span', {}, 'for each IMPORTANT keyword: the words that really name your topic carry more influence')),
        el('div', {class: 'sl-rule'}, el('b', {}, 'Percentage'), el('span', {}, 'points found ÷ points possible, then limited by safety rules (below)'))),
      el('table', {class: 'sl-table', 'aria-label': 'Your declared keywords'}, el('thead', {}, el('tr', {}, ['YOUR KEYWORD', 'TYPE', 'POINTS'].map((h) => el('th', {scope: 'col'}, h)))),
        el('tbody', {id: 'slDeclTable'}, rules.map((r) => el('tr', {class: r.importance === 'IMPORTANT' ? 'sl-imp' : ''}, el('td', {}, r.keyword), el('td', {}, r.importance === 'IMPORTANT' ? 'IMPORTANT' : 'ORDINARY'), el('td', {}, String(r.points)))),
          el('tr', {class: 'sl-total'}, el('td', {colspan: '2'}, 'MOST A TITLE CAN EARN'), el('td', {}, String(total))))),
      el('div', {class: 'sl-bands'}, el('h4', {}, 'What the percentage means'),
        el('ul', {class: 'sl-lines'}, el('li', {}, [el('b', {class: 'ok'}, '75 and above'), ' with a certified resource identity → STUDY ALIGNED']), el('li', {}, [el('b', {class: 'warn'}, 'above 25 and under 75'), ' → UNCERTAIN (never treated as a confirmed distraction)']), el('li', {}, [el('b', {class: 'bad'}, '25 or below'), ' → OFF-TASK']))),
      el('div', {class: 'sl-bands'}, el('h4', {}, 'Safety limits (they hold the number back, they never add to it)'),
        el('ul', {class: 'sl-lines'}, Object.entries(C.CAP_TEXT).map(([k, t]) => el('li', {'data-cap': k}, t)))),
      el('div', {class: 'sl-try'}, el('h4', {}, 'TRY IT: type a page title'), el('p', {class: 'st-hint', id: 'slTryHint'}, 'This is the tutorial\'s own calculator running the real rules on words you type. Nothing is being observed.'),
        ti, el('label', {class: 'sl-check', for: 'slTryCert'}, cb, ' Pretend the page identity is certified'), tryOut),
      el('p', {class: 'sl-limit', id: 'slLimit'}, 'What this cannot show: matching words cannot prove that you paid attention, that the content is truly on-task, or that a page is what its title says. It is one piece of evidence about a title.'),
      el('div', {class: 'st-ctl'}, button('NEXT: THREE OUTCOMES', () => { S.step = 'scenarios'; render(); }, {class: 'st-btn primary', id: 'slToScenarios'})));
  }

  // ------------------------------------------------------------------------------------------------ scenarios
  const dwellOf = (s) => (s.kind === 'off' ? S.clock - s.startedAt : s.confirm === 'OFF_TASK' ? S.clock - s.offFrom : 0);
  const uncOf = (s) => (s.kind === 'uncertain' && !s.confirm ? S.clock - s.startedAt : 0);
  function pickScenario(kind) {
    const sc = S.scenarios && S.scenarios[kind];
    if (!sc) { S.msg = 'These keywords cannot produce this outcome. Add more keywords in step 2.'; render(); return; }
    clearStage('studylab'); S.clock = 0; S.scn = {kind, ...sc, startedAt: 0, prompts: 0, confirm: null, offFrom: 0};   // every outcome starts on a fresh manual clock
    log('STUDY_EVIDENCE_EVALUATED', `Observed title evaluated: “${sc.title}” → ${sc.evidence.confidencePercent}% (${sc.verdict.classification}).`, kind === 'aligned' ? 'scenario 1' : kind === 'uncertain' ? 'scenario 2' : 'scenario 3');
    log('RESOURCE_INTENT_CLASSIFIED', `Resource Intent: ${C.LABEL[sc.verdict.classification]}.`, sc.verdict.classification === 'UNCERTAIN' ? 'measured 50% UNCERTAIN' : ''); S.msg = ''; render();
  }
  function advance(sec) {
    const s = S.scn; if (!s) return;
    const before = S.clock; S.clock += sec;
    if (s.kind === 'uncertain' && !s.confirm) {
      const due = Math.floor((S.clock - s.startedAt) / C.CONFIRM_INTERVAL_S);
      while (s.prompts < due) { s.prompts += 1; log('STUDY_CONFIRMATION_POPUP_REQUESTED', `Five minutes of unresolved uncertainty requested clarification (request ${s.prompts}).`, 'Resource Intent'); }
    }
    if ((s.kind === 'off' || s.confirm === 'OFF_TASK') && !s.dueLogged && dwellOf(s) >= C.OFFTASK_FIRST_S) { s.dueLogged = true; log('OFF_TASK_DWELL_REACHED_FIRST_STAGE', 'Off-task dwell reached 5:00: the first Study intervention (SECANT-1) is now due in the accepted SECANT simulation.', 'hand-off'); }
    void before; render();
  }
  function nextStep() {
    const s = S.scn; if (!s) return null;
    if (s.kind === 'uncertain' && !s.confirm) return (Math.floor((S.clock - s.startedAt) / C.CONFIRM_INTERVAL_S) + 1) * C.CONFIRM_INTERVAL_S - (S.clock - s.startedAt);
    if ((s.kind === 'off' || s.confirm === 'OFF_TASK') && dwellOf(s) < C.OFFTASK_FIRST_S) return C.OFFTASK_FIRST_S - dwellOf(s);
    return null;
  }
  function answer(choice) {
    const s = S.scn; if (!s || s.confirm) return { ok: false, reason: 'Already answered.' };
    s.confirm = choice; if (choice === 'OFF_TASK') s.offFrom = S.clock;
    log('STUDY_CONFIRMATION_RECORDED', choice === 'STUDY' ? 'You answered THIS IS STUDY MATERIAL: the resource is now treated as study (effective state STUDY ALIGNED; SINE withheld).' : 'You answered I\'M COMING BACK: the resource is treated as off-task from now (confirmed distraction; off-task dwell starts at 00:00).', 'your response — not proof of return');
    clearStage('studylab'); render(); return {ok: true};
  }
  const popupSpec = () => {
    const s = S.scn; if (!s || s.kind !== 'uncertain' || s.confirm || s.prompts < 1) return null;
    return {sig: `studylab-confirm-${s.startedAt}-${s.prompts}`, label: 'STUDY CONFIRMATION', world: 'amber', badge: 'STUDY MODE', eyebrow: 'MYELIN · STUDY CONFIRMATION · SIMULATION', headline: 'IS THIS PART OF YOUR CURRENT STUDY?', message: s.title,
      lines: ['MEASURED 50% UNCERTAIN'], status: `Clarification ${s.prompts} · measured 50% UNCERTAIN`, footer: 'STUDY MODE · RESOURCE INTENT · SIMULATION · YOUR ANSWER IS EVIDENCE, NOT PROOF',
      buttons: [{label: 'THIS IS STUDY MATERIAL', id: 'slConfirmStudy', onClick: () => answer('STUDY')}, {label: "I'M COMING BACK", id: 'slConfirmReturn', onClick: () => answer('OFF_TASK')}], aria: 'Study confirmation (simulation)'};
  };
  function stepScenarios() {
    if (!S.plan.prepared) return el('section', {class: 'card st-card sl-step', id: 'slStepScenarios'}, el('p', {class: 'st-hint'}, 'Prepare the study block first (step 2).'));
    const s = S.scn;
    const sb = (id, kind, label, sub) => { const b = button('', () => pickScenario(kind), {class: 'sl-pick' + (s && s.kind === kind ? ' on' : ''), id, 'aria-pressed': String(!!(s && s.kind === kind))}); b.append(el('b', {}, label), el('span', {}, sub)); return b; };
    const picks = el('div', {class: 'sl-picks three', role: 'group', 'aria-label': 'Choose an outcome'}, sb('slScnAligned', 'aligned', 'SCENARIO 1 · STUDY ALIGNED', 'Matches what you declared.'), sb('slScnUncertain', 'uncertain', 'SCENARIO 2 · UNCERTAIN', 'Only some of your words appear.'), sb('slScnOff', 'off', 'SCENARIO 3 · NOT ALIGNED', 'None of your words appear.'));
    const nx = nextStep(), mk = (label, id, fn, on = true) => { const b = button(label, fn, {class: 'st-btn', id}); b.disabled = !on || !s; return b; };
    const clockBar = el('div', {class: 'st-ctl sl-clock', role: 'group', 'aria-label': 'Manual tutorial clock'}, el('span', {class: 'sl-clockval', id: 'slClock'}, `CLOCK ${mmss(S.clock)}`), mk('+10 SEC', 'slAdv10', () => advance(10)), mk('+1 MIN', 'slAdv60', () => advance(60)), mk('+5 MIN', 'slAdv300', () => advance(300)),
      mk('ADVANCE TO THE NEXT STEP', 'slAdvNext', () => advance(Math.ceil(nx)), nx !== null), mk('RESET THIS OUTCOME', 'slScnReset', () => { clearStage('studylab'); S.scn = null; S.clock = 0; render(); }), el('span', {class: 'st-hint'}, 'Nothing moves unless you press a button.'));
    let panel = el('p', {class: 'st-hint', id: 'slScnHint'}, 'Pick an outcome. Each one shows what the simulated observation “sees”, how the evidence is weighed, and how Study Mode responds.');
    if (s) {
      const ev = s.evidence, v = s.verdict, cls = v.classification;
      const eff = s.confirm === 'STUDY' ? 'STUDY ALIGNED (confirmed by you)' : s.confirm === 'OFF_TASK' ? 'OFF-TASK (confirmed by you)' : C.LABEL[cls];
      const idNote = s.via === 'UNCERTIFIED_IDENTITY' ? 'Identity: NOT certified in this example, to show that matching words alone never certify a resource.' : s.certified ? 'Identity: simulated as certified (the tutorial grants this; it never inspects a real page).' : 'Identity: not certified.';
      const dw = dwellOf(s), uc = uncOf(s);
      const tile = (k, val, id) => el('div', {class: 'st-tile'}, el('span', {}, k), el('b', {id, class: 'fn-small'}, val));
      const tiles = [tile('RESOURCE INTENT', C.LABEL[cls] + (cls === 'UNCERTAIN' ? ' · 50%' : ''), 'slTileClass'), tile('STUDY MODE TREATS IT AS', eff, 'slTileEffective')];
      let treat = C.TREATMENT[cls], extra = null;
      if (cls === 'STUDY_ALIGNED') tiles.push(tile('OFF-TASK DWELL', 'NONE', 'slTileDwell'), tile('DISTRACTION WARNING', 'NOT SHOWN', 'slTileWarn'), tile('SINE / SECANT', 'WITHHELD · NOT STARTED', 'slTileIv'));
      if (cls === 'UNCERTAIN') {
        if (!s.confirm) tiles.push(tile('UNRESOLVED FOR', `${mmss(uc)} / 05:00`, 'slTileUnres'), tile('NEXT CLARIFICATION', s.prompts ? `ASKED (${s.prompts}) · waiting for you` : `in ${mmss(nx ?? 0)}`, 'slTileNext'), tile('OFF-TASK DWELL', 'NOT COUNTING', 'slTileDwell'), tile('SINE / SECANT', 'NOT STARTED', 'slTileIv'));
        else if (s.confirm === 'STUDY') tiles.push(tile('CLARIFICATION', 'THIS IS STUDY MATERIAL', 'slTileConf'), tile('OFF-TASK DWELL', 'NONE', 'slTileDwell'), tile('SINE / SECANT', 'WITHHELD', 'slTileIv'));
        else tiles.push(tile('CLARIFICATION', "I'M COMING BACK", 'slTileConf'), tile('OFF-TASK DWELL', `${mmss(dw)} / 05:00`, 'slTileDwell'), tile('FIRST INTERVENTION', dw >= C.OFFTASK_FIRST_S ? 'SECANT-1 DUE' : 'SECANT-1 AT 05:00', 'slTileIv'));
        extra = el('div', {class: 'sl-callout', id: 'slWhyUncertain'}, el('b', {}, 'Why uncertain is not a distraction. '), 'Some of your words appear but not enough, or the identity cannot be certified, so MYELIN cannot tell. It asks you, because you know what you are studying. “I\'M COMING BACK” is an intention you state; it is not a measured return.');
      }
      if (cls === 'DISTRACTION') {
        tiles.push(tile('OFF-TASK DWELL', `${mmss(dw)} / 05:00`, 'slTileDwell'), tile('FIRST INTERVENTION', dw >= C.OFFTASK_FIRST_S ? 'SECANT-1 DUE' : 'SECANT-1 AT 05:00', 'slTileIv'), tile('DISTRACTION WARNING', dw >= C.OFFTASK_FIRST_S ? 'DUE' : 'NOT YET', 'slTileWarn'));
        extra = el('div', {class: 'sl-callout', id: 'slPathway'}, el('b', {}, 'Off-task pathway. '), 'Resource Intent reports an off-task fact; Study Mode counts the dwell; the first intervention is SECANT-1 at 5:00 of eligible off-task time (demonstrated in the SECANT chapter, using the accepted SECANT simulation). ',
          button('OPEN THE SECANT SIMULATION', () => { const r = document.querySelector('.nav-row[data-page="secant"]'); if (r) r.click(); }, {class: 'st-btn', id: 'slOpenSecant'}));
      }
      if (s.confirm === 'OFF_TASK') extra = el('div', {class: 'sl-callout', id: 'slPathway'}, el('b', {}, 'Off-task pathway. '), 'Your answer made the resource a confirmed off-task fact, so the dwell counts from 00:00 towards the first intervention at 5:00 (SECANT-1, shown in the SECANT chapter). ', button('OPEN THE SECANT SIMULATION', () => { const r = document.querySelector('.nav-row[data-page="secant"]'); if (r) r.click(); }, {class: 'st-btn', id: 'slOpenSecant'}));
      panel = el('div', {class: 'sl-scn', id: 'slScnPanel', 'data-outcome': cls},
        el('div', {class: 'sl-scn-h'}, pill(C.LABEL[cls] + ' · ' + (s.kind === 'aligned' ? 'SCENARIO 1' : s.kind === 'uncertain' ? 'SCENARIO 2' : 'SCENARIO 3'), tone(cls)), pill('SIMULATED OBSERVATION', 'warn')),
        el('p', {class: 'sl-obs'}, el('span', {class: 'sl-obs-l'}, 'THE SIMULATED OBSERVATION SEES A PAGE TITLE: '), markTitle(s.title, ev)),
        el('p', {class: 'st-hint'}, 'Highlighted words are your declared keywords that appear in the title (gold = important, 2 points).'),
        evidenceTable(ev), explain(ev, v, idNote),
        el('div', {class: 'cot-tiles sd-status sl-tiles', id: 'slTiles'}, tiles),
        el('div', {class: 'sl-treat', id: 'slTreat'}, el('b', {}, 'What Study Mode does with this. '), treat), extra,
        el('p', {class: 'sl-sep', id: 'slAuthorities'}, 'Who decides what: Resource Intent decides the verdict (this lesson). Study Mode owns the study timer and block. SINE / SECANT own interventions. COSECANT owns planned breaks and exact returns. Each stays separate.'));
    }
    const evs = el('ol', {class: 'sl-events', id: 'slEvents', 'aria-label': 'Simulated tutorial events'}, S.events.length ? S.events.map((e) => el('li', {}, el('time', {}, mmss(e.t)), el('b', {}, e.name), el('span', {}, e.text), e.extra ? el('i', {}, e.extra) : null)) : el('li', {class: 'st-hint'}, 'No tutorial events yet.'));
    return el('section', {class: 'card st-card sl-step', id: 'slStepScenarios', 'aria-labelledby': 'slStepScnH'}, el('div', {class: 'st-card-h'}, el('h3', {id: 'slStepScnH'}, 'THREE OUTCOMES'), pill('MANUAL CLOCK · SIMULATED', 'warn')),
      el('p', {class: 'st-hint'}, 'Same declared study block, three different pages. Choose one, move the clock, and watch how Study Mode responds.'), picks, clockBar, panel,
      el('div', {class: 'sl-evwrap'}, el('h4', {}, 'SIMULATED TUTORIAL EVENTS'), el('p', {class: 'st-hint'}, 'Isolated from Live Telemetry, stored history and imported evidence. They describe what the tutorial simulated, nothing about you.'), evs));
  }

  // ------------------------------------------------------------------------------------------------ shell
  function nav() {
    const reach = {video: true, plan: !!S.decl, points: S.plan.prepared, scenarios: S.plan.prepared};
    return el('nav', {class: 'sl-nav', 'aria-label': 'Tutorial steps'}, STEPS.map(([k, label], i) => { const b = button(label, () => { S.step = k; S.msg = ''; render(); }, {class: 'st-btn sl-navbtn' + (S.step === k ? ' primary' : ''), id: 'slNav_' + k, 'aria-current': S.step === k ? 'step' : 'false'}); b.disabled = !reach[k]; b.dataset.step = String(i + 1); return b; }));
  }
  function render() {
    if (!rootEl) return;
    const focusId = document.activeElement && rootEl.contains(document.activeElement) ? document.activeElement.id : '';
    const body = S.step === 'video' ? stepVideo() : S.step === 'plan' ? stepPlan() : S.step === 'points' ? stepPoints() : stepScenarios();
    rootEl.replaceChildren(
      el('div', {class: 'sl-head'}, el('div', {}, el('h2', {id: 'slTitle'}, 'STUDY MODE — TEACHING SIMULATION'), el('p', {class: 'st-hint'}, 'Learn how MYELIN reads a study video: declare it, weigh its keywords, and see three outcomes. The mascot-guided Academy will walk through this later.')),
        el('div', {class: 'sl-badges'}, pill('SIMULATED TUTORIAL — NOT MONITORING', 'warn'), pill('NOTHING IS WATCHED, PLAYED OR MEASURED'))),
      nav(), el('p', {class: 'st-msg', id: 'slMsg', role: 'status', 'aria-live': 'polite'}, S.msg), body,
      el('div', {class: 'st-ctl sl-foot'}, button('RESTART THE TUTORIAL', () => { clearStage('studylab'); Object.assign(S, {step: 'video', pick: null, decl: null, scenarios: null, scn: null, clock: 0, events: [], msg: '', tryTitle: '', tryCert: true}); S.plan = {studyMin: 45, breakMin: 10, subject: '', task: '', keywords: '', important: '', prepared: false}; render(); }, {class: 'st-btn ghost', id: 'slRestart'}),
        el('span', {class: 'st-hint'}, 'Keyword matching is one piece of evidence about a title. It does not prove attention, and the tutorial never reads a real page or video.')));
    if (focusId) { const f = rootEl.querySelector('#' + CSS.escape(focusId)); if (f && !f.disabled) f.focus({preventScroll: true}); }
    showCard(S.open ? popupSpec() : null, {owner: 'studylab', alive: visibleId('slTitle')});
  }
  function setOpen(on) {
    S.open = on; const sx = host.closest('.sx') || host.parentElement;
    if (on) sx.setAttribute('data-lab', 'on'); else { sx.removeAttribute('data-lab'); clearStage('studylab'); }
    host.hidden = !on; bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.id === 'sxModeLab') === on)));
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('primary', (b.id === 'sxModeLab') === on));
    if (on) render();
  }
  function mount(container) {
    bar = el('div', {class: 'st-ctl sl-modebar', id: 'sxLabBar', role: 'group', 'aria-label': 'Study Mode view'},
      button('STUDY SESSION', () => setOpen(false), {class: 'st-btn primary', id: 'sxModeSession', 'aria-pressed': 'true'}), button('STUDY TEACHING SIMULATION', () => setOpen(true), {class: 'st-btn', id: 'sxModeLab', 'aria-pressed': 'false'}),
      el('span', {class: 'st-hint'}, 'The teaching simulation is separate from your real Study Mode session.'));
    host = el('section', {class: 'sx-surface sl-root', id: 'sxLab', hidden: ''}, el('div', {class: 'mh-wrap st-wrap', id: 'slRoot'}));
    rootEl = host.firstChild; container.prepend(bar); container.append(host);
  }
  return {mount, render, setOpen, state: S, core: C};
}

// Mounts itself into Study Mode (presentation only). Exposed for the later guided Academy as window.myelinStudyLab.
const container = typeof document !== 'undefined' ? document.querySelector('#page-study-mode .mh-wrap.sx') : null;
if (container && !document.getElementById('sxLab')) { const lab = createStudyLab(); lab.mount(container); window.myelinStudyLab = lab; }
