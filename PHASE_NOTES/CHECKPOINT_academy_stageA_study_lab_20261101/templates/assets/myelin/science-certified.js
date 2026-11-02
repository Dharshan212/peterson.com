// Science Lab pages for a CERTIFIED historical reconstruction of one experiment of an imported database file.
//   The package itself is built by db-import/sciencelab.js (a port of SCIENCE_LAB/analysis.py + evidence.py + history.py); this module only PRESENTS it:
//   Chapter 5 -- the desktop's HISTORICAL RECONSTRUCTION summary (chapter5_view._HistoryDialog.render_result) and the seven Results & Discussion sections as
//                build_chapter5_presentation words them (never labelled TRANSFERRED);  Chapter 3 -- the whole certified package (coverage, timeline, metrics, whole-MYELIN
//                summary, findings, patterns, organ rows, scopes, limitations, provenance).
//   Nothing here computes a scientific value: every number is read from the package. An experiment the desktop could not certify shows its reason and no result.
import {el, button} from './dom.js';

/** chapter6_view._format_latency_ns: whole minutes, then seconds with the exact fractional nanoseconds (trailing zeros removed). */
export function formatNs(value) {
  const ns = BigInt(value), whole = ns / 1000000000n, frac = ns % 1000000000n, minutes = whole / 60n, seconds = whole % 60n;
  let t = String(seconds);
  if (frac) t += '.' + String(frac).padStart(9, '0').replace(/0+$/, '');
  return minutes ? `${minutes} min ${t} s` : `${t} s`;
}

export const RECONSTRUCTION_LABEL = 'HISTORICAL RECONSTRUCTION';
const BOUNDARY = 'These results describe software-observed behavioral evidence and should not be interpreted as direct measurement of neural state, neurotransmitter activity, diagnosis, or subjective mental state.';
const SECTIONS = [['1', 'RESULTS OVERVIEW', 'SUMMARY'], ['2', 'BEHAVIOURAL RESULTS', 'BEHAVIOURAL EVIDENCE'], ['3', 'RESULT PATTERNS', 'TRENDS & INSIGHTS'], ['4', 'DISCUSSION', 'INTERPRETATION'],
  ['5', 'ALTERNATIVE EXPLANATIONS', 'CRITICAL ANALYSIS'], ['6', 'INTERPRETIVE SUMMARY', 'THESIS SUMMARY'], ['7', 'LIMITATIONS IN INTERPRETATION', 'STUDY LIMITATIONS']];

const metricLine = (m) => `${m.label}: ${m.status === 'AVAILABLE' ? `${m.value} ${m.unit}`.trim() : m.status === 'NO_EVIDENCE' ? 'No evidence' : 'Unavailable'} [${m.status}] — ${m.reason}`;
const wholeLine = (r) => `${r.source.replaceAll('_', ' ')} — ${r.label}: ${r.status === 'AVAILABLE' ? String(r.count) : r.status === 'NO_EVIDENCE' ? 'No evidence' : 'Unavailable'} [${r.status}]`;

/** chapter5_view.build_chapter5_presentation, for a reconstructed (not transferred) package. Throws on the same inconsistency the desktop refuses. */
export function presentation(pkg) {
  if (!pkg || pkg.analysis_status !== 'CERTIFIED') throw new Error('Chapter 5 requires a certified package');
  const resource = pkg.source_coverage.filter((r) => r.source_system === 'RESOURCE_INTENT');
  if (resource.length !== 1 || resource[0].status !== 'UNAVAILABLE' || resource[0].reason !== 'no_durable_event_identity' || resource[0].item_count !== null) throw new Error('Resource Intent coverage truth changed');
  const available = pkg.key_metrics.filter((m) => m.status === 'AVAILABLE').length, total = pkg.key_metrics.length;
  const overview = [`Experiment ID: ${pkg.experiment_id}`, `Parent Session ID: ${pkg.parent_session_id}`, 'Analysis: CERTIFIED', `Reconstruction: ${RECONSTRUCTION_LABEL} (not transferred)`,
    `Experiment window: [${pkg.experiment_start_monotonic_ns}, ${pkg.experiment_end_monotonic_ns}) monotonic ns`, `Available metrics: ${available} of ${total}`, `Certified patterns: ${pkg.certified_patterns.length}`,
    'The selected experiment is a bounded subset of the full parent session.', 'Source coverage: ' + pkg.source_coverage.map((r) => `${r.source_system.replaceAll('_', ' ')}=${r.status}`).join('; '),
    'Whole-MYELIN full-session summary:', ...pkg.whole_myelin_summary.map(wholeLine)];
  const behavioral = pkg.key_metrics.map(metricLine);
  const patterns = pkg.certified_patterns.length ? pkg.certified_patterns.map((p) => `${p.label}: ${p.description} [${p.code}]`) : ['No certified patterns were present in the transferred package.'];
  const by = Object.fromEntries(pkg.key_metrics.map((m) => [m.code, m])), verified = by.verified_returns, codes = new Set(pkg.certified_patterns.map((p) => p.code)), discussion = [];
  if (verified && verified.status === 'AVAILABLE') discussion.push(`The selected experiment contained ${verified.value} factually verified return event(s). This describes observed recovery behavior within the experiment window and does not establish an explanation for return.`);
  if (codes.has('RELAPSE_AFTER_VERIFIED_RETURN')) discussion.push('A factual relapse was observed after a verified return in at least one MIRL episode. This supports treating return and sustained re-engagement as distinct behavioral events.');
  if (codes.has('MULTIPLE_VERIFIED_RETURNS')) discussion.push('Multiple verified returns occurred during the selected experiment, indicating repeated recovery events rather than one uninterrupted behavioral trajectory.');
  if (pkg.key_metrics.some((m) => m.status === 'UNAVAILABLE')) discussion.push('Some behavioral quantities remain unavailable because the current durable evidence does not support a complete certified calculation.');
  if (!discussion.length) discussion.push('The transferred package contains no additional certified discussion rule.');
  const alternatives = [], row = (s) => pkg.whole_myelin_summary.find((r) => r.source === s);
  if (verified && verified.status === 'AVAILABLE' && Number(verified.value)) alternatives.push('Software-observed return does not prove subjective attentional recovery.');
  if (row('NORMAL_BREAK') && row('NORMAL_BREAK').status === 'AVAILABLE' && row('NORMAL_BREAK').count) alternatives.push('Recorded breaks may be deliberate and task-compatible.');
  if (row('MINE') && row('MINE').status === 'AVAILABLE' && row('MINE').count) alternatives.push('Messaging activity may be purposeful rather than distracting.');
  alternatives.push('Missing durable Resource Intent history limits complete task-alignment reconstruction.');
  const summary = [`Experiment ${pkg.experiment_id} was reconstructed and certified from the durable evidence of parent session ${pkg.parent_session_id}.`,
    `Within this experiment, ${available} of ${total} metric values were available and ${pkg.certified_patterns.length} certified pattern(s) were retained.`,
    'Interpretation is limited to observed or derived software-observed evidence and the limitations carried by the package.'];
  const limitations = [...new Set([...pkg.limitations, BOUNDARY])];
  return {overview, behavioral, patterns, discussion, alternatives, summary, limitations};
}

const note = (id, text, cls = 'dbs-text dbs-warn') => el('p', {class: cls, id, role: 'status'}, text);
const when = (T, iso) => (iso && Number.isFinite(Date.parse(iso)) ? `${T.day(iso)} ${T.hm(iso)} [${T.tag()}]` : '—');

/** The state of a selected experiment as a page body: loading / unavailable (desktop reason) / certified content via `ok(pkg, data)`. */
function stateBody(rec, id, ok) {
  if (rec.status === 'LOADING') return [note('sciReconLoading', `Reconstructing ${id} from the durable evidence of the imported file ...`, 'wl-empty')];
  if (rec.status !== 'AVAILABLE') return [el('h3', {class: 'c5x-title', id: 'sciReconHead'}, `${id}  ·  ${RECONSTRUCTION_LABEL}`), note('sciReconUnavailable', `Unavailable: ${rec.reason || 'The experiment could not be reconstructed.'}`)];
  const d = rec.data;
  if (d.status !== 'CERTIFIED' || !d.package) return [el('h3', {class: 'c5x-title', id: 'sciReconHead'}, `${id}  ·  ${RECONSTRUCTION_LABEL}`), note('sciReconUnavailable', `Unavailable: ${d.reason}`)];
  try { return ok(d.package, d); }
  catch (e) { return [el('h3', {class: 'c5x-title', id: 'sciReconHead'}, `${id}  ·  ${RECONSTRUCTION_LABEL}`), note('sciReconRenderError', `The certified package could not be displayed (${e && e.message ? e.message : 'unexpected error'}). No result is shown.`)]; }
}

/* ---------- Chapter 5: results of one reconstructed experiment ---------- */
const lines = (arr, id) => el('div', {class: 'c5x-lines', id}, arr.map((t) => el('p', {class: 'c5x-p'}, t)));
export function chapter5Result(rec, id, T, back) {
  const head = el('div', {class: 'c5x-hero-a'}, button('‹ BACK TO EXPERIMENTS', back, {class: 'c5x-btn sm', id: 'sciReconBack'}));
  const body = stateBody(rec, id, (pkg, d) => {
    const p = presentation(pkg);
    return [el('h3', {class: 'c5x-title', id: 'sciReconHead'}, `${pkg.experiment_id}  ·  ${RECONSTRUCTION_LABEL}`),
      el('p', {class: 'c5x-p', id: 'sciReconIdentity'}, `Parent session ${pkg.parent_session_id}  ·  Analysis: ${pkg.analysis_status}  ·  ${d.reason}`),
      el('p', {class: 'c5x-p', id: 'sciReconWindow'}, `Experiment window ${when(T, pkg.experiment_started_at_utc)} → ${when(T, pkg.experiment_ended_at_utc)}  ·  session finalized ${when(T, pkg.session_finalized_at_utc)}`),
      el('p', {class: 'c5x-p', id: 'sciReconCoverage'}, 'Source coverage — ' + pkg.source_coverage.map((r) => `${r.source_system}: ${r.status}`).join('  ·  ')),
      el('p', {class: 'c5x-p', id: 'sciReconMetrics'}, 'Key metrics — ' + pkg.key_metrics.map((m) => `${m.label}: ${m.status === 'AVAILABLE' ? m.value : m.status}`).join('  ·  ')),
      el('p', {class: 'c5x-p', id: 'sciReconOrgans'}, 'Whole-MYELIN organ availability — ' + pkg.whole_myelin_summary.map((r) => `${r.source}: ${r.status}${r.count !== null ? ` (${r.count})` : ''}`).join('  ·  ')),
      el('div', {class: 'c5x-grid', id: 'sciReconSections'}, SECTIONS.map(([n, t, tag], i) => el('section', {class: 'card c5x-sec', 'data-section': n},
        el('div', {class: 'c5x-sec-h'}, el('span', {class: 'c5x-badge'}, n), el('h3', {}, t), el('i', {}, tag)),
        lines([p.overview, p.behavioral, p.patterns, p.discussion, p.alternatives, p.summary, p.limitations][i], `sciReconSec${n}`)))),
      el('div', {class: 'c5x-note'}, el('b', {}, 'IMPORTANT NOTE'), el('span', {}, 'This is a historical reconstruction from durable evidence in the imported file. It is not a transferred result, and PDF export is not available for imported evidence.'))];
  });
  return el('div', {class: 'card c5x-card', id: 'sciImported'}, head, ...body);
}

/* ---------- Chapter 3: the whole certified package ---------- */
const th = (cells) => el('tr', {}, cells.map((c) => el('th', {}, c)));
const tbl = (id, head, rows) => el('div', {class: 'c3x-scroll'}, el('table', {class: 'c3x-table', id}, el('thead', {}, th(head)), el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, c === null || c === undefined ? '—' : String(c))))))));
const humanKey = (k) => k.replaceAll('_', ' ');
const section = (title, id, ...kids) => el('section', {class: 'card c5x-sec', id}, el('div', {class: 'c5x-sec-h'}, el('h3', {}, title)), ...kids.filter(Boolean));
const offset = (pkg, ns) => ns === null || ns === undefined ? null : `+${(Number(BigInt(ns) - BigInt(pkg.experiment_start_monotonic_ns)) / 1e9).toFixed(3)} s`;
function genericRows(id, rows, skip = []) {
  if (!rows.length) return null;
  const keys = Object.keys(rows[0]).filter((k) => k !== 'provenance' && !skip.includes(k) && typeof rows[0][k] !== 'object');
  return tbl(id, keys.map(humanKey), rows.map((r) => keys.map((k) => r[k])));
}
const scopeLine = (s) => s && `${s.source}: ${s.status} — fully contained ${s.fully_contained_count}, cross-boundary overlap ${s.cross_boundary_overlap_count}, outside window ${s.outside_window_count}${s.reason ? ` (${s.reason})` : ''}`;
export function chapter3Package(rec, id, T, back) {
  const head = el('div', {class: 'c5x-hero-a'}, button('‹ BACK TO EXPERIMENTS', back, {class: 'c5x-btn sm', id: 'sciReconBack'}));
  const body = stateBody(rec, id, (pkg, d) => {
    const codes = new Map(pkg.sine_episode_display_ids), ext = pkg.successful_return_onset_latency_extrema, kids = [];
    kids.push(el('h3', {class: 'c5x-title', id: 'sciC3Head'}, `${pkg.experiment_id}  ·  ${RECONSTRUCTION_LABEL}`),
      el('p', {class: 'c5x-p', id: 'sciC3Status'}, `Analysis: ${pkg.analysis_status}  ·  ${d.reason}`),
      el('p', {class: 'c5x-p'}, `Parent session ${pkg.parent_session_id}  ·  window ${when(T, pkg.experiment_started_at_utc)} → ${when(T, pkg.experiment_ended_at_utc)}  ·  session finalized ${when(T, pkg.session_finalized_at_utc)}`),
      el('p', {class: 'c5x-p'}, `Experiment window [${pkg.experiment_start_monotonic_ns}, ${pkg.experiment_end_monotonic_ns}) monotonic ns. The experiment is a bounded subset of the full parent session.`));
    kids.push(section('SOURCE COVERAGE', 'sciC3Coverage', tbl('sciC3CoverageTable', ['Source', 'Status', 'Items', 'Reason'], pkg.source_coverage.map((r) => [r.source_system.replaceAll('_', ' '), r.status, r.item_count, r.reason]))));
    kids.push(section('KEY METRICS', 'sciC3Metrics', tbl('sciC3MetricsTable', ['Metric', 'Status', 'Value', 'Readable', 'Basis'], pkg.key_metrics.map((m) => [m.label, m.status, m.status === 'AVAILABLE' ? `${m.value} ${m.unit}`.trim() : null, m.status === 'AVAILABLE' && m.unit === 'ns' ? formatNs(m.value) : null, m.reason]))));
    if (ext) kids.push(section('SUCCESSFUL-RETURN ONSET LATENCY', 'sciC3Latency', el('p', {class: 'c5x-p'}, `Eligible samples: ${ext.eligible_sample_count}. ${ext.reference_definition}`),
      tbl('sciC3LatencyTable', ['', 'Status', 'Value', 'Readable', 'Basis'], [['Best', ext.best_successful_return_onset_latency], ['Worst', ext.worst_successful_return_onset_latency]].map(([n, x]) => [n, x.status, x.status === 'AVAILABLE' ? `${x.value} ${x.unit}` : null, x.status === 'AVAILABLE' ? formatNs(x.value) : null, x.reason]))));
    kids.push(section('WHOLE-MYELIN SUMMARY', 'sciC3Whole', tbl('sciC3WholeTable', ['Source', 'Measure', 'Status', 'Count', 'Reason'], pkg.whole_myelin_summary.map((r) => [r.source.replaceAll('_', ' '), r.label, r.status, r.count, r.reason]))));
    kids.push(section('TIMELINE', 'sciC3Timeline', pkg.timeline.length ? tbl('sciC3TimelineTable', ['Offset', 'Source', 'Stage', 'Lane', 'Event', 'Durable id'], pkg.timeline.map((e) => [offset(pkg, e.occurred_monotonic_ns), e.source, e.stage, e.lane, e.label, e.durable_id])) : el('p', {class: 'c5x-p'}, 'No certified timeline events exist inside this experiment window.')));
    kids.push(section('CERTIFIED PATTERNS', 'sciC3Patterns', pkg.certified_patterns.length ? tbl('sciC3PatternsTable', ['Pattern', 'Description', 'Code'], pkg.certified_patterns.map((x) => [x.label, x.description, x.code])) : el('p', {class: 'c5x-p'}, 'No certified patterns were present.')));
    kids.push(section('DERIVED FINDINGS', 'sciC3Findings', pkg.derived_findings.length ? tbl('sciC3FindingsTable', ['Finding', 'Label', 'Code'], pkg.derived_findings.map((x) => [x.text, x.scientific_label, x.code])) : el('p', {class: 'c5x-p'}, 'No derived findings.')));
    if (pkg.sine_stage_rows.length) kids.push(section('SINE ESCALATION STAGES', 'sciC3Sine', tbl('sciC3SineTable', ['Episode', 'Stage', 'Popup request', 'Displayed', 'Response', 'Resource'], pkg.sine_stage_rows.map((r) => [codes.get(r.episode_id) || r.episode_id, r.stage, r.popup_request_id, when(T, r.display_wall_time_utc), r.response || '—', r.resource_key]))));
    for (const [title, key, rowsKey, scope] of [['MINE EPISODES', 'Mine', 'mine_episode_rows', 'mine_experiment_scope'], ['COSINE EPISODES', 'Cosine', 'cosine_episode_rows', 'cosine_experiment_scope'], ['COSECANT BREAKS', 'Cosecant', 'cosecant_break_rows', null], ['SECANT EPISODES', 'Secant', 'secant_episode_rows', 'secant_experiment_scope']]) {
      const rows = pkg[rowsKey], sc = scope && pkg[scope];
      if (rows.length || sc) kids.push(section(title, `sciC3${key}`, sc ? el('p', {class: 'c5x-p'}, scopeLine(sc)) : null, genericRows(`sciC3${key}Table`, rows, ['source_status']) || el('p', {class: 'c5x-p'}, 'No fully contained rows in this experiment window.')));
    }
    kids.push(section('LIMITATIONS', 'sciC3Limits', el('div', {class: 'c5x-lines'}, pkg.limitations.map((t) => el('p', {class: 'c5x-p'}, t)))));
    kids.push(section('PROVENANCE', 'sciC3Prov', el('p', {class: 'c5x-p'}, `${pkg.provenance.length} durable event reference(s) support this package.`), tbl('sciC3ProvTable', ['Source', 'Event', 'Durable id', 'Offset'], pkg.provenance.map((r) => [r.source, r.event_kind, r.durable_id, offset(pkg, r.occurred_monotonic_ns)]))));
    return kids;
  });
  return el('div', {class: 'card c5x-card', id: 'sciImported'}, head, ...body);
}
