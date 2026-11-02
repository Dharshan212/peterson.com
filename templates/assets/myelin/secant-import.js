// MYELIN Web: imported SECANT evidence -> the structure the existing SECANT page renders.
// The input is the DESKTOP's own presentation model (SECANT/dashboard_projection.prepare_presentation, ported and qualified in db-import/). This module is a
// pure, field-by-field translation: sections are renamed to the page's names and nothing is computed, defaulted, summed or invented. Every value the page shows
// for imported data is a value the desktop projection produced for the selected session.
const rows = (v) => (Array.isArray(v) ? v : []);

/** @returns the same shape secant-station.js `prepare()` returns for simulated data, plus `imported: true` and the desktop's own context texts. */
export function secantFromDesktop(m) {
  const c = m.context || {}, L = m.landing || {}, O = m.overview || {}, E = m.episodes || {}, D = m.distraction_history || {}, S = m.study_history || {},
    V = m.study_evidence || {}, C = m.cosecant || {};
  return {
    imported: true, ctx: c, banner: c.source_banner,
    landing: {status: L.status, recent: L.recent_episode, badges: L.recent_badges, metrics: L.metrics, behaviour: L.behaviour, events: rows(L.latest_events), flow: rows(L.journey)},
    overview: {metrics: O.metrics, recent: O.recent_episode, study: O.study_snapshot, events: rows(O.latest_events), insights: O.insights, flow: rows(O.journey)},
    episodes: {metrics: E.metrics, rows: rows(E.rows), recent: E.recent_episode, flow: rows(E.flow)},
    distraction: {metrics: D.metrics, rows: rows(D.rows), attrs: D.attributes, flow: rows(D.flow)},
    study: {metrics: S.metrics, rows: rows(S.rows), jumps: rows(S.jump_nodes)},
    evidence: {metrics: V.metrics, rows: rows(V.rows), attrs: V.attributes, nodes: rows(V.confirmation_nodes)},
    cosecant: {main: C.main_summary, recent: C.recent_break, metrics: C.metrics, history: C.break_history, events: rows(C.events), returns: rows(C.return_history), flow: rows(C.flow)},
    secArchive: rows(m.secant_archive).map((a) => ({
      key: JSON.stringify(a.scope_identity), sessionId: a.session_id, displayId: a.display_episode_id, valid: a.summary_eligible, evidenceStatus: a.evidence_status, qualityStatus: a.quality_status,
      source: a.source, started: a.started, date: String(a.started || '').split(' · ')[0], stage: a.stage, outcome: a.outcome, returnIntent: a.return_intent, verification: a.verification,
      interruption: a.interruption, closure: a.closure, studyResource: a.study_resource, platform: a.platform, recordedAt: a.recorded_at, events: rows(a.events), nodes: rows(a.map_nodes)})),
    stArchive: rows(m.study_archive).map((b) => ({
      key: String(b.demo_key), sessionId: b.session_id, date: b.date, title: b.title, started: b.started, ended: b.ended, duration: b.duration, primary: b.primary, resources: rows(b.resources),
      evidence: rows(b.evidence), direct: b.direct_study_jumps, events: rows(b.events), nodes: rows(b.jump_nodes), resourceCount: rows(b.resources).length})),
    archiveDiagnostics: rows(m.archive_diagnostics), secantEmpty: m.secant_empty || null, studyEmpty: m.study_empty || null
  };
}

/** The page sections and row arities the SECANT page reads; used by the tests to prove the mapper output is complete. */
export const PAGE_SHAPE = Object.freeze({
  landing: ['status', 'recent', 'badges', 'metrics', 'behaviour', 'events', 'flow'], overview: ['metrics', 'recent', 'study', 'events', 'insights', 'flow'],
  episodes: ['metrics', 'rows', 'recent', 'flow'], distraction: ['metrics', 'rows', 'attrs', 'flow'], study: ['metrics', 'rows', 'jumps'], evidence: ['metrics', 'rows', 'attrs', 'nodes'],
  cosecant: ['main', 'recent', 'metrics', 'history', 'events', 'returns', 'flow']
});
