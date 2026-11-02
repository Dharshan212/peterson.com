// Study teaching simulation — PURE model (no DOM, no storage, no clock). A faithful JavaScript port of the accepted MYELIN desktop Study-evidence rules so the tutorial teaches the real arithmetic:
//   * COSECANT_STUDY_MODE/study_alignment.py  (schema myelin-study-evidence-v5): keyword points, caps, background-mismatch penalties, exact-task-title route.
//   * CORE_ENGINE/resource_intent.py          (classifier v12): the bands that turn the confidence into STUDY_ALIGNED / UNCERTAIN / OFF-TASK, and the Study confirmation rules.
// Weights in force: ordinary keyword = 1 point, important keyword = 2 points. There is no third tier and no bonus: points are WEIGHTED EVIDENCE about how closely an observed title relates to the
// declared study topic, never rewards. The calculator never certifies identity from words; identity is a separate input ("simulated certified resource identity" in the tutorial).
// Nothing here inspects a page, a video or a user: the tutorial supplies the "observed title" itself.
export const SCHEMA = 'myelin-study-evidence-v5';
export const NORMAL_POINTS = 1, IMPORTANT_POINTS = 2;
export const UNCERTAIN_CAP = 74, SINGLE_MATCH_CAP = 50;                 // caps on the NUMBER (calculator)
export const ALIGNED_MIN = 75, UNCERTAIN_MIN = 25;                      // Resource Intent bands: >= 75 (certified identity) aligned, > 25 uncertain, otherwise off-task
export const CONFIRM_INTERVAL_S = 300;                                  // STUDY_UNCERTAINTY_INTERVAL_SECONDS: unresolved uncertainty asks the user every 5:00
export const OFFTASK_FIRST_S = 300;                                     // off-task dwell before the first Study intervention (SECANT-1) in the accepted simulation

const COMMON = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'study', 'the', 'this', 'to', 'video', 'with']);
export const MISMATCH = {asmr: 30, celebrity: 20, compilation: 20, detox: 20, funny: 20, gameplay: 30, gaming: 25, highlights: 20, lofi: 25, meme: 30, memes: 30, motivation: 15, music: 20, prank: 30, reaction: 20, reels: 20, shorts: 20, song: 25, songs: 25, trailer: 25, vlog: 25};
const TOKEN = /[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu;
const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase();
export const tokens = (text) => (norm(text).match(TOKEN) || []).filter((t) => !COMMON.has(t));
const words = (text) => (norm(text).match(/[\p{L}\p{N}\p{M}]+/gu) || []);

/** Splits "a, b c" style input into entries (comma / semicolon / new line separated). */
export const splitList = (text) => String(text ?? '').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);

/** Each meaningful word of a keyword entry carries points once; IMPORTANT wins instead of double counting (as the desktop does). */
export function keywordRules(normal, important) {
  const rules = new Map(), ignored = [];
  for (const raw of normal) { const t = tokens(raw); if (!t.length) { ignored.push(String(raw)); continue; } for (const k of t) if (!rules.has(k)) rules.set(k, {importance: 'NORMAL', points: NORMAL_POINTS}); }
  for (const raw of important) { const t = tokens(raw); if (!t.length) { ignored.push(String(raw)); continue; } for (const k of t) rules.set(k, {importance: 'IMPORTANT', points: IMPORTANT_POINTS}); }
  return {rules: [...rules].map(([keyword, v]) => ({keyword, ...v})), ignored};
}

/** The whole declared task as contiguous words (order and numbers preserved); partial words never qualify. */
export function exactTaskMatch(task, title) {
  const tw = words(task), ww = words(title);
  if (!tw.length || !tokens(task).length) return false;
  for (let i = 0; i + tw.length <= ww.length; i++) if (tw.every((w, j) => ww[i + j] === w)) return true;
  return false;
}
const round3 = (x) => Math.round((x + Number.EPSILON) * 1000) / 1000;

/** Port of StudyEvidenceCalculator.evaluate(). Returns the full auditable evidence object. */
export function studyEvidence({subject = '', task = '', keywords = [], important = [], title = '', identityCertified = false, allowExactTask = false}) {
  const {rules, ignored} = keywordRules(keywords, important);
  const titleSet = new Set(tokens(title));
  const evidence = rules.map((r) => ({...r, matched: titleSet.has(r.keyword)}));
  const rawPossible = evidence.reduce((a, e) => a + e.points, 0), rawMatched = evidence.reduce((a, e) => a + (e.matched ? e.points : 0), 0);
  const rawPercent = rawPossible ? (rawMatched / rawPossible) * 100 : 0;
  const stTokens = new Set(tokens(`${subject} ${task}`)), kwTokens = new Set(evidence.map((e) => e.keyword));
  const mismatch = [];
  for (const [term, penalty] of Object.entries(MISMATCH)) {
    const inTitle = titleSet.has(term), inKw = kwTokens.has(term), legit = stTokens.has(term);
    if (inTitle || inKw) mismatch.push({term, penalty, inTitle, inKeywords: inKw, legitimised: legit, applied: inTitle && !legit, suspicious: inKw && !legit});
  }
  const suspicious = new Set(mismatch.filter((m) => m.suspicious).map((m) => m.term));
  const eligible = evidence.filter((e) => !suspicious.has(e.keyword));
  const effPossible = eligible.reduce((a, e) => a + e.points, 0), effMatched = eligible.reduce((a, e) => a + (e.matched ? e.points : 0), 0);
  const effPercent = effPossible ? (effMatched / effPossible) * 100 : 0;
  const core = eligible.filter((e) => e.importance === 'IMPORTANT'), corePossible = core.length, coreMatched = core.filter((e) => e.matched).length;
  const coreCoverage = corePossible ? (coreMatched / corePossible) * 100 : 0;
  const penalty = Math.min(100, mismatch.filter((m) => m.applied).reduce((a, m) => a + m.penalty, 0));
  const exact = exactTaskMatch(task, title), exactQualified = !!(allowExactTask && identityCertified && exact);
  let conf = Math.max(0, (exactQualified ? 100 : effPercent) - penalty);
  const caps = [], reasons = [];
  const cap = (limit, code) => { if (conf > limit) { caps.push(code); conf = limit; } };
  if (suspicious.size) reasons.push('Suspicious user keywords were excluded because Subject/Task did not support them');
  if (penalty) { reasons.push(`Background mismatch evidence reduced confidence by ${penalty} percentage points`); cap(UNCERTAIN_CAP, 'BACKGROUND_MISMATCH_PRESENT'); }
  if (!identityCertified) { cap(UNCERTAIN_CAP, 'RESOURCE_IDENTITY_NOT_CERTIFIED'); reasons.push('Uncertified resource identity cannot receive automatic Study protection'); }
  const matchedCount = eligible.filter((e) => e.matched).length;
  if (exactQualified) reasons.push('The complete declared task title matches the certified learning resource');
  else if (eligible.length === 0) { conf = 0; reasons.push('No eligible Study keywords remained for scoring'); }
  else if (eligible.length === 1) { cap(UNCERTAIN_CAP, 'ONLY_ONE_ELIGIBLE_KEYWORD'); reasons.push('One Study keyword alone is not enough for automatic alignment'); }
  else if (matchedCount === 1) { cap(SINGLE_MATCH_CAP, 'ONLY_ONE_KEYWORD_MATCHED'); reasons.push('A single matching keyword cannot automatically prove Study alignment'); }
  if (corePossible && !exactQualified) {
    if (coreMatched === 0) { cap(SINGLE_MATCH_CAP, 'NO_IMPORTANT_KEYWORD_MATCHED'); reasons.push('No important Study keyword matched the current title'); }
    else if (corePossible >= 2 && coreCoverage < 50) { cap(SINGLE_MATCH_CAP, 'IMPORTANT_KEYWORD_COVERAGE_BELOW_HALF'); reasons.push('Less than half of important Study keywords matched'); }
  }
  conf = round3(Math.max(0, Math.min(100, conf)));
  return {title, normalizedTitle: tokens(title).join(' '), keywordEvidence: evidence, ignored, rawMatchedPoints: rawMatched, rawPossiblePoints: rawPossible, rawScorePercent: round3(rawPercent),
    effectiveMatchedPoints: effMatched, effectivePossiblePoints: effPossible, effectiveScorePercent: round3(effPercent), coreMatchedCount: coreMatched, corePossibleCount: corePossible,
    coreCoveragePercent: round3(coreCoverage), mismatchPenaltyPercent: penalty, mismatchEvidence: mismatch, suspiciousKeywords: [...suspicious], identityCertified, confidencePercent: conf,
    safetyCaps: caps, reasons, exactTaskMatch: exact, alignmentBasis: exactQualified ? 'EXACT_TASK_TITLE' : 'WEIGHTED_KEYWORDS', schema: SCHEMA};
}

/** The Resource Intent bands (CORE_ENGINE/resource_intent.py): evidence -> verdict. Title text never certifies identity, so aligned also needs a certified identity. */
export function classify(ev) {
  if (ev.rawPossiblePoints === 0 && ev.alignmentBasis !== 'EXACT_TASK_TITLE') return {classification: 'UNCERTAIN', measuredConfidence: 0.5, why: 'NO_KEYWORDS_DECLARED'};
  if (ev.confidencePercent >= ALIGNED_MIN && ev.identityCertified) return {classification: 'STUDY_ALIGNED', measuredConfidence: ev.confidencePercent / 100, why: 'STUDY_EVIDENCE_ALIGNED'};
  if (ev.confidencePercent > UNCERTAIN_MIN) return {classification: 'UNCERTAIN', measuredConfidence: 0.5, why: 'STUDY_EVIDENCE_UNCERTAIN'};
  return {classification: 'DISTRACTION', measuredConfidence: 1 - ev.confidencePercent / 100, why: 'STUDY_EVIDENCE_OFF_TASK'};
}
export const LABEL = {STUDY_ALIGNED: 'STUDY ALIGNED', UNCERTAIN: 'UNCERTAIN', DISTRACTION: 'OFF-TASK'};

/** Plain-English wording for each safety cap the calculator can apply. */
export const CAP_TEXT = {
  BACKGROUND_MISMATCH_PRESENT: 'The title contains words such as "funny", "compilation" or "highlights" that your subject and task do not justify, so MYELIN will not protect it automatically (the number is held at 74 or less).',
  RESOURCE_IDENTITY_NOT_CERTIFIED: 'Words in a title can never prove which site or video this is. Without a certified identity the number is held at 74 or less, however many keywords match.',
  ONLY_ONE_ELIGIBLE_KEYWORD: 'Only one usable keyword was declared; one word alone is not enough for automatic alignment (held at 74 or less).',
  ONLY_ONE_KEYWORD_MATCHED: 'Only one keyword matched; a single match cannot prove alignment (held at 50 or less).',
  NO_IMPORTANT_KEYWORD_MATCHED: 'None of your important keywords appeared, so the number is held at 50 or less.',
  IMPORTANT_KEYWORD_COVERAGE_BELOW_HALF: 'Fewer than half of your important keywords appeared, so the number is held at 50 or less.'};

/** A prepared example so a visitor can learn without typing anything. Clearly a TUTORIAL EXAMPLE: no video is opened, played, fetched or inspected. */
export const DEFAULT_VIDEO = {
  id: 'default', label: 'TUTORIAL EXAMPLE', title: 'How Neurons Fire: The Action Potential Explained', subject: 'Neuroscience', task: 'Action potential lecture', url: '',
  keywords: ['membrane', 'sodium', 'potassium', 'signal', 'channels'], important: ['action potential', 'neuron'],
  scenarios: {
    aligned: 'Action Potential in a Neuron: Sodium and Potassium Channels Across the Membrane',
    uncertain: 'Neuron Signal Basics: Sodium Explained',
    off: 'Funny Cat Fails Compilation — Weekend Highlights'}};

const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const OFF_CANDIDATES = ['Funny Cat Fails Compilation — Weekend Highlights', 'Weekend Vlog: Holiday Shopping Haul', 'Top Ten Movie Trailer Reactions', 'Relaxing Lofi Beats To Chill To'];
/** Observed titles for the three teaching scenarios. The default video has authored titles; a custom video gets titles built from the visitor's own words and VERIFIED with the calculator. */
export function buildScenarios(decl) {
  const base = {subject: decl.subject, task: decl.task, keywords: decl.keywords, important: decl.important, allowExactTask: false};
  const ev = (title, certified = true) => studyEvidence({...base, title, identityCertified: certified});
  const out = {};
  const fixed = decl.scenarios;
  if (fixed) {
    for (const [k, title] of Object.entries(fixed)) out[k] = {title, certified: true, via: 'AUTHORED'};
  } else {
    const {rules} = keywordRules(decl.keywords, decl.important);
    const imp = rules.filter((r) => r.importance === 'IMPORTANT').map((r) => r.keyword), nor = rules.filter((r) => r.importance === 'NORMAL').map((r) => r.keyword);
    const mk = (parts) => `${cap1(String(decl.subject || '').trim() || 'Study')} — ${parts.join(' ')}`;
    const aligned = [decl.title, mk([...imp, ...nor])].find((t) => t && classify(ev(t)).classification === 'STUDY_ALIGNED');
    out.aligned = aligned ? {title: aligned, certified: true, via: 'KEYWORDS'} : null;
    let unc = null;
    for (let i = 1; i <= imp.length && !unc; i++) for (let j = 0; j <= nor.length && !unc; j++) {
      if (i === imp.length && j === nor.length) continue;
      const t = mk([...imp.slice(0, i), ...nor.slice(0, j)]);
      const v = ev(t);
      if (classify(v).classification === 'UNCERTAIN' && v.keywordEvidence.some((e) => e.matched)) unc = {title: t, certified: true, via: 'PARTIAL_KEYWORDS'};
    }
    if (!unc && out.aligned) unc = {title: out.aligned.title, certified: false, via: 'UNCERTIFIED_IDENTITY'};
    out.uncertain = unc;
    const off = OFF_CANDIDATES.find((t) => classify(ev(t)).classification === 'DISTRACTION');
    out.off = off ? {title: off, certified: true, via: 'UNRELATED'} : null;
  }
  for (const k of Object.keys(out)) if (out[k]) { out[k].evidence = ev(out[k].title, out[k].certified); out[k].verdict = classify(out[k].evidence); }
  return out;
}

/** Validation for a declared study video (custom or edited). Returns a list of plain-English problems (empty = fine). */
export function validateDeclaration(d) {
  const problems = [];
  if (!String(d.title || '').trim()) problems.push('Give the video a title (the name you would see on its page).');
  if (!String(d.subject || '').trim()) problems.push('Enter the subject you are studying.');
  if (!String(d.task || '').trim()) problems.push('Enter the task or lecture title.');
  const {rules} = keywordRules(d.keywords, d.important);
  if (!rules.some((r) => r.importance === 'IMPORTANT')) problems.push('Enter at least one important (main) keyword.');
  if (rules.length < 2) problems.push('Enter at least two different keywords in total: MYELIN never treats one word alone as enough evidence.');
  return problems;
}

/** What Study Mode does with each verdict, per the accepted rules (Resource Intent decides; Study Mode, SINE and SECANT own their own parts). */
export const TREATMENT = {
  STUDY_ALIGNED: 'Treated as verified study material. No off-task dwell starts and no distraction warning is shown. Automatic alignment is a statement about the resource, not a permission slip: the study timer, breaks and return rules belong to Study Mode and COSECANT.',
  UNCERTAIN: 'Not confirmed as a distraction. While the evidence stays uncertain, no off-task dwell counts and no SINE or SECANT intervention starts. After five unresolved minutes MYELIN asks you once to clarify; every further five minutes it asks again.',
  DISTRACTION: 'An off-task fact is recorded. The off-task dwell then counts towards the first Study intervention at 5:00, handled by the accepted SECANT simulation. Nothing is judged about you: only the observed title against the words you declared.'};
