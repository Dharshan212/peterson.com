// Port of SECANT/dashboard_projection.prepare_presentation + SECANT/dashboard_integration.DashboardIntegration._prepare_model.
// Produces the SAME presentation model the desktop hands to its dashboard (snake_case keys, tuples as arrays), built only from validated durable facts.
// Evidence states stay distinct: "No data" / "Not recorded" / "Unavailable" (and the schema gate reports "Unsupported database schema/version").
'use strict';
(function (g) {
  const NS = g.MYELIN_DB;
  const {ValueError, dict, isDict, isInt, isStr, has, eq, truthy, str, sortedBy, get, item: at} = NS;
  const P = NS.projection, E = NS.evidence, C = NS.contracts;
  const NR = 'Not recorded', NODATA = 'No data', UNAV = 'Unavailable', SESSION = 'Selected MYELIN session';

  const num = (v) => (typeof v === 'number' ? String(v) : str(v));
  const human = (v) => NS.capitalize(str(v).replaceAll('_', ' '));
  function durationText(seconds) {                                // duration_text
    if (seconds === null) return NR;
    if (NS.isFloat(seconds) && seconds > 0 && seconds < 1) return '<1s';
    if (isInt(seconds) && seconds > 0n && seconds < 1n) return '<1s';
    let s = isInt(seconds) ? Number(seconds) : Math.trunc(seconds);
    const hours = Math.floor(s / 3600), rem = s - hours * 3600, minutes = Math.floor(rem / 60), sec = rem - minutes * 60;
    return (hours ? `${hours}h ` : '') + `${minutes}m ${String(sec).padStart(2, '0')}s`;
  }
  const secantFlowTone = (e) => {
    const name = e.event_name;
    if (name === 'SECANT_DISPLAYED') return ({1: 'blue', 2: 'amber', 3: 'red'})[String(e.stage)] || 'neutral';
    if (name === 'SECANT_RECOVERY_INTERRUPTED' || name === 'SECANT_FROZEN') return 'yellow';
    if (name === 'SECANT_EPISODE_CLOSED') return e.reason === 'recovered' ? 'green' : 'neutral';
    if (['SECANT_ACTION_INTENT', 'SECANT_RETURN_STARTED', 'SECANT_RETURN_VERIFIED', 'SECANT_RECOVERY_CLOSED'].includes(name)) return 'green';
    return name === 'SECANT_EPISODE_FOUNDED' ? 'purple' : 'neutral';
  };
  const cosecantFlowTone = (kind) => {
    if (kind === 'BREAK_STARTED') return 'purple';
    if (['BREAK_COMPLETE', 'BREAK_ALREADY_OVER', 'FINAL_LOCKED', 'RETURN_CONFIRMATION_LOST', 'RETURN_CONFIRMATION_INTERRUPTED', 'BREAK_CANCELLED'].includes(kind)) return 'yellow';
    if (['RETURN_INTENT_RECORDED', 'RETURN_CONFIRMATION_STARTED', 'RETURN_CONFIRMATION_RESTARTED', 'RETURN_CONFIRMED'].includes(kind)) return 'green';
    return 'neutral';
  };
  const NAMES = {SECANT_ACTION_INTENT: 'Return to Study Selected', SECANT_RETURN_STARTED: 'Return Process Started', SECANT_RETURN_VERIFIED: 'Return Verified', SECANT_RECOVERY_INTERRUPTED: 'Recovery Interrupted',
    SECANT_RECOVERY_CLOSED: 'Recovery Closed', SECANT_EPISODE_CLOSED: 'Episode Closed', SECANT_EPISODE_FOUNDED: 'Episode Founded', SECANT_DISPLAYED: 'SECANT Displayed'};
  /** _secant_target_title */
  function secantTargetTitle(episode, study) {
    if (episode.founded === null) return 'Title not recorded';
    const [sid, context] = episode.identity;
    const blocks = study.blocks.filter((b) => eq(context, `${str(sid)}:${C.studyContextToken(b.key[1], b.key[2])}`)).map((b) => b.key);
    if (blocks.length !== 1) return 'Title not recorded';
    const colon = context.indexOf(':'), token = colon < 0 ? '' : context.slice(colon + 1);
    const matches = study.resources.filter((r) => eq(P.scope(r).slice(0, 3), blocks[0]) && eq(P.scope(r)[3], token) && eq(r.resource_key, episode.founded.study_target_resource_id));
    return matches.length === 1 ? matches[0].title : 'Title not recorded';
  }
  const stableDesc = (items, keyFn) => items.map((v, i) => [keyFn(v), i, v]).sort((a, b) => NS.cmp(b[0], a[0]) || a[1] - b[1]).map((x) => x[2]);

  /** prepare_presentation(snapshot, timezone_key) */
  function preparePresentation(snapshot, tz) {
    const stamp = (value, full = false) => {
      if (!truthy(value)) return NR;
      return NS.attempt(() => NS.time.stampOf(value, tz, full), ['ValueError', 'OverflowError'], () => UNAV);
    };
    const tableState = (name) => ({AVAILABLE: NODATA, NOT_RECORDED: NR, UNAVAILABLE: UNAV})[snapshot.tables[name].status];
    const metric = (name, value, note = SESSION) => [name, num(value), note];
    const tr = (name) => snapshot.tables[name].rows;

    const secant = P.projectSecant(snapshot), study = P.projectStudy(snapshot), breaks0 = P.projectCosecant(snapshot);
    const secantArchive = [], allEvents = [];
    const aliasRows = tr('presentation_aliases');
    const aliasOf = (kind, nativeId) => aliasRows.find((r) => eq(at(r, 'entity_kind'), kind) && eq(at(r, 'native_id'), nativeId));
    for (const episode of secant) {
      const source = episode.source_status === 'AVAILABLE' ? C.resourceTitle(episode.source) : episode.source_status === 'UNAVAILABLE' ? UNAV : 'Title not recorded';
      const stage = truthy(episode.stage_reached) ? `SECANT-${episode.stage_reached}` : NR;
      const closure = episode.closed ? human(episode.closed.reason) : 'In progress';
      const valid = episode.summary_eligible, qualityLabel = episode.quality_status === 'PENDING' ? 'Pending' : UNAV;
      const mapping = aliasOf('SECANT', episode.identity[2]) || dict();
      const events = [], nodes = [];
      (episode.status === 'AVAILABLE' ? episode.events : []).forEach((event, index) => {
        const name = has(NAMES, event.event_name) ? NAMES[event.event_name] : human(event.event_name);
        const detail = truthy(event.reason) ? human(event.reason) : (truthy(event.stage) ? `Stage ${event.stage}` : 'Recorded');
        const [basis, occurred] = P.secantEventClock(event);
        events.push([String(index + 1), stamp(occurred), name, source, basis + ' · ' + (valid ? 'Recorded' : episode.quality_status)]);
        nodes.push(['SECANT', name, (valid ? detail : detail + ' · ' + episode.quality_status) + ' · ' + basis, stamp(occurred), valid ? secantFlowTone(event) : 'neutral', '']);
      });
      const intents = P.named(episode, 'SECANT_ACTION_INTENT'), verified = P.named(episode, 'SECANT_RETURN_VERIFIED'), interruptions = P.named(episode, 'SECANT_RECOVERY_INTERRUPTED');
      const lastClock = (list) => P.secantEventClock(list[list.length - 1]);
      secantArchive.push({
        episode_id: episode.identity[2], scope_identity: episode.identity, session_id: episode.identity[0], display_episode_id: episode.display_episode_id,
        evidence_status: episode.status, quality_status: episode.quality_status, quality_diagnostic: episode.quality_diagnostic, summary_eligible: valid,
        source, started: stamp(get(mapping, 'founding_at_utc'), true), stage: valid ? stage : qualityLabel,
        outcome: valid ? closure : qualityLabel + ' · ' + (episode.status === 'AVAILABLE' ? episode.quality_status : 'Invalid evidence'),
        return_intent: valid ? (intents.length ? lastClock(intents)[0] + ' · ' + stamp(lastClock(intents)[1]) : NR) : qualityLabel,
        verification: valid ? (verified.length ? 'Confirmed · ' + lastClock(verified)[0] + ' · ' + stamp(lastClock(verified)[1]) : NR) : qualityLabel,
        interruption: valid ? ([...new Set(interruptions.map((r) => human(r.reason)))].join(', ') || NR) : qualityLabel,
        closure: valid ? closure : qualityLabel, study_resource: secantTargetTitle(episode, study),
        platform: (truthy(get(episode.source, 'platform_key')) ? episode.source.platform_key : NR), events, map_nodes: nodes,
        recorded_at: episode.events.length ? stamp(episode.events[episode.events.length - 1].recorded_at_utc, true) : NR
      });
      (episode.status === 'AVAILABLE' ? episode.events : []).forEach((r, i) => allEvents.push([P.secantEventClock(r)[1], events[i]]));
    }
    const founding = (item) => { const r = aliasRows.find((x) => eq(at(x, 'entity_kind'), 'SECANT') && eq(at(x, 'native_id'), item.episode_id)); return r ? get(r, 'founding_at_utc', '') : ''; };
    const archiveSorted = stableDesc(secantArchive, (item) => founding(item));
    const ordered = sortedBy(allEvents, (pair) => NS.time.parseUtc(pair[0])).map((pair, i) => [String(i + 1)].concat(pair[1].slice(1)));
    const missing = tableState('secant_events');
    const recent = archiveSorted.length ? archiveSorted[0] : Object.fromEntries(['display_episode_id', 'source', 'stage', 'outcome', 'recorded_at', 'study_resource', 'return_intent', 'verification', 'interruption', 'closure'].map((k) => [k, missing]));
    const recentFields = [['Episode ID', recent.display_episode_id], ['Distraction Source', recent.source], ['Stage Reached', recent.stage], ['Closure', recent.outcome], ['Recorded At', recent.recorded_at], ['Current study material', recent.study_resource]];
    const recentFlow = archiveSorted.length ? archiveSorted[0].map_nodes : [];
    const secantOk = snapshot.tables.secant_events.status === 'AVAILABLE';
    const quality = P.recorderQuality(snapshot);
    const eligible = secant.filter((e) => e.summary_eligible);
    const counts = [eligible.length, eligible.reduce((n, e) => n + P.named(e, 'SECANT_RETURN_VERIFIED').length, 0), eligible.reduce((n, e) => n + P.named(e, 'SECANT_RECOVERY_INTERRUPTED').length, 0)];
    const excludedNote = `Finalized validated evidence; ${secant.length - eligible.length} recorded episodes excluded`;
    const emptySecant = quality.status === 'PENDING' ? 'Pending' : tableState('secant_events');
    const secantMetrics = ['CAPTURED EPISODES', 'VERIFIED RETURNS', 'INTERRUPTED RECOVERIES'].map((n, i) => metric(n, secantOk ? (secant.length ? counts[i] : emptySecant) : tableState('secant_events'), excludedNote));
    const resources = study.resources, studyOk = study.status === 'AVAILABLE';
    const roleOk = snapshot.tables.study_resources.status === 'AVAILABLE' && studyOk, timerOk = snapshot.tables.study_events.status === 'AVAILABLE' && studyOk;
    const jumps = study.jumps, direct = jumps.filter((j) => j.connector === 'Direct observed change').length;
    const confirmed = new Set(study.visits.filter((v) => eq(get(v.initial, 'measured_classification'), 'UNCERTAIN') && eq(get(v.effective, 'user_confirmation'), 'STUDY')
      && eq(get(v.effective, 'classification'), 'STUDY_ALIGNED') && ['PRIMARY', 'LATER'].includes(v.qualification)).map((v) => NS.repr(P.scope(v).concat([v.resource_key]))));
    const timer = study.blocks.length ? durationText(NS.sum(study.blocks.map((b) => b.elapsed))) : tableState('study_events');
    const studyMissing = (!studyOk || study.diagnostics.some(([, st]) => st === 'UNAVAILABLE')) ? UNAV : NR;
    const studyMetrics = [
      metric('STUDY RESOURCES', roleOk ? resources.length : studyMissing),
      metric('DIRECT STUDY JUMPS', studyOk && !study.diagnostics.length ? (study.blocks.length && !study.visits.length ? NR : direct) : studyMissing),
      metric('TOTAL STUDY TIME', timerOk ? timer : studyMissing, 'Recorded Study timer elapsed'),
      metric('CONFIRMED UNCERTAIN RESOURCES', studyOk && !study.diagnostics.length ? (study.blocks.length && !study.visits.length ? NR : confirmed.size) : studyMissing)];
    const boundaries = tr('study_resource_boundaries');
    const observationStamp = (visit, first) => {
      const oid = first ? visit.first_observation_id : visit.last_observation_id, values = new Map();
      for (const b of boundaries) {
        if (!eq(P.scope(b), P.scope(visit))) continue;
        for (const side of ['from', 'to']) if (eq(at(b, side + '_observation_id'), oid)) { const v = at(b, side + '_observed_at_utc'); values.set(NS.repr([v]), v); }
      }
      if (values.size === 1) return stamp([...values.values()][0]);
      return values.size ? UNAV : NR;
    };
    const historyRows = (visits) => visits.map((v, i) => [String(i + 1), v.title, eq(v.continuity_status, 'SINGLE_OBSERVATION') ? 'Single observation' : durationText(Number(v.supported_duration_ns) / 1e9), observationStamp(v, true), observationStamp(v, false), v.qualification]);
    const CONFIRMATION = {NONE: 'None', STUDY: 'Confirmed', OFF_TASK: 'Confirmed off-task'};
    const confirmation = (p) => { const value = get(p, 'user_confirmation'); return isStr(value) && has(CONFIRMATION, value) ? CONFIRMATION[value] : (value === null ? NR : UNAV); };
    const confidence = (p, field) => (get(p, field) !== null ? NS.fixed0(Number(p[field]) * 100) + '%' : NR);
    const cls = (v, key) => str(get(v, key, NR)).replaceAll('_', ' ');
    const evidenceRows = (visits, archive = false) => visits.map((v, i) => archive
      ? [String(i + 1), v.title, cls(v.initial, 'measured_classification'), cls(v.effective, 'classification'), confirmation(v.effective)]
      : [String(i + 1), v.title, cls(v.initial, 'measured_classification'), confidence(v.initial, 'measured_confidence'), confirmation(v.effective), v.qualification]);
    const jumpNodes = (entries) => entries.map((j) => [j.visit.qualification, j.visit.title, 'Study-aligned', observationStamp(j.visit, false), 'green', j.connector]);

    const studyArchive = [];
    for (const block of study.blocks) {
      const p = block.payload, key = block.key;
      const visits = study.visits.filter((v) => eq(P.scope(v).slice(0, 3), key)), blockJumps = jumps.filter((j) => eq(P.scope(j.visit).slice(0, 3), key));
      const primaryRes = resources.find((r) => eq(P.scope(r).slice(0, 3), key) && r.role === 'PRIMARY');
      const started = stamp(get(p, 'started_wall_time_utc'), true);
      studyArchive.push({demo_key: NS.pyjson.dumps(key), scope_identity: key, session_id: key[0], date: started.split(' · ')[0], title: truthy(get(p, 'subject')) ? p.subject : NR,
        started, ended: stamp(get(p, 'completed_wall_time_utc'), true), duration: durationText(block.elapsed), primary: primaryRes ? primaryRes.title : NR, resources: historyRows(visits),
        evidence: evidenceRows(visits, true), direct_study_jumps: String(blockJumps.filter((j) => j.connector === 'Direct observed change').length),
        events: block.events.map((r, i) => [String(i + 1), stamp(at(r, 'created_at_utc')), human(at(r, 'action')), 'Recorded']), jump_nodes: jumpNodes(blockJumps)});
    }
    const attrVisit = study.visits.find((v) => eq(get(v.initial, 'measured_classification'), 'UNCERTAIN')) || (study.visits.length ? study.visits[0] : null);
    const attrValues = attrVisit ? [attrVisit.title, cls(attrVisit.initial, 'measured_classification'), confidence(attrVisit.initial, 'measured_confidence'), confirmation(attrVisit.effective),
      cls(attrVisit.effective, 'classification'), confidence(attrVisit.effective, 'confidence'), attrVisit.qualification, 'Behavioural only']
      : Array(8).fill(!studyOk ? UNAV : tableState('study_resource_observation_evidence'));
    const evidenceAttrs = ['Resource', 'Initial Classification', 'Initial Confidence', 'User Confirmation', 'Effective Classification', 'Effective Confidence', 'Qualification', 'Evidence scope'].map((k, i) => [k, attrValues[i]]);
    const confirmationNodes = (attrVisit ? attrVisit.evidence : []).filter((r) => at(r, 'kind') === 'CONFIRMATION' || eq(r, attrVisit.evidence[0])).map((r) => {
      const obs = at(r, 'kind') === 'OBSERVATION';
      return [obs ? 'OBSERVATION' : 'CONFIRMATION', cls(r.authority, obs ? 'measured_classification' : 'classification'), confidence(r.authority, obs ? 'measured_confidence' : 'confidence'), NR,
        eq(get(r.authority, 'measured_classification'), 'UNCERTAIN') ? 'amber' : 'green', ''];
    });

    const breaks = stableDesc(breaks0, (b) => get(b.started || dict(), 'occurred_wall_time_utc', ''));
    const co = breaks.length ? breaks[0] : null, coMissing = tableState('cosecant_events');
    const coValue = (b) => {
      if (b.status !== 'AVAILABLE') return Array(5).fill(UNAV);
      const kinds = new Set(b.events.map((r) => r.kind));
      const target = b.target !== null ? C.resourceTitle(b.target, get(b.started || dict(), 'return_target_display_metadata'), {observed_ns: get(b.target, 'observed_monotonic_ns')}) : 'Title not recorded';
      const outcome = kinds.has('RETURN_CONFIRMED') ? 'Returned' : kinds.has('BREAK_CANCELLED') ? 'Break Cancelled' : kinds.has('SAFE_SHUTDOWN') ? 'Closed' : 'In progress';
      const rev = b.events.slice().reverse();
      const retEv = rev.find((r) => r.kind === 'RETURN_CONFIRMED'), returned = retEv ? retEv.payload.occurred_wall_time_utc : null;
      const lastEv = rev.find((r) => ['RETURN_CONFIRMED', 'RETURN_CONFIRMATION_LOST', 'RETURN_CONFIRMATION_STARTED', 'RETURN_CONFIRMATION_RESTARTED'].includes(r.kind)), lastConfirmation = lastEv ? lastEv.kind : null;
      const confirmationStatus = returned ? 'Confirmed' : ['Break Cancelled', 'Closed'].includes(outcome) ? NR : lastConfirmation === 'RETURN_CONFIRMATION_LOST' ? 'Interrupted' : lastConfirmation ? 'Confirming' : NR;
      return [target, outcome, truthy(returned) ? stamp(returned) : NR, confirmationStatus, durationText(b.allowance)];
    };
    const [target, outcome, returned, confirmationValue, allowance] = co ? coValue(co) : Array(5).fill(coMissing);
    const coAlias = co ? co.display_break_id : coMissing;
    const coEvents = co && co.status === 'AVAILABLE' ? co.events : [];
    const validBreaks = breaks.filter((b) => b.status === 'AVAILABLE');
    const coMetrics = [['RECORDED BREAKS', 'BREAK_STARTED'], ['COMPLETED ALLOWANCES', 'BREAK_COMPLETE'], ['CONFIRMED RETURNS', 'RETURN_CONFIRMED'], ['CANCELLED BREAKS', 'BREAK_CANCELLED']].map(([label, event]) =>
      metric(label, snapshot.tables.cosecant_events.status === 'AVAILABLE' && breaks.length ? validBreaks.filter((b) => b.events.some((r) => r.kind === event)).length : tableState('cosecant_events'),
        `Validated same-session breaks; ${breaks.length - validBreaks.length} invalid breaks excluded`));
    const coFlow = coEvents.map((r) => ['COSECANT', human(r.kind), human(r.payload.to_state), stamp(r.payload.occurred_wall_time_utc), cosecantFlowTone(r.kind), '']);
    const overviewMetrics = secantMetrics.concat(studyMetrics.slice(0, 3));
    const context = {source_banner: `RECORDED EVIDENCE · SESSION ${snapshot.session_id}`, about_architecture: 'Recorded evidence is read and supplied through presentation setters.', about_dashboard_time: 'Prepared values',
      about_foundation_title: 'DATA FOUNDATION', about_input_category: 'RECORDED INPUT', about_input_time: 'Read-only', about_source: 'Read-only MYELIN database projection', about_stage: 'Display values are prepared from recorded evidence.', about_stage_label: 'SOURCE SCOPE'};
    for (const name of ['cosecant_events', 'cosecant_returns', 'distraction_attributes', 'episodes_flow', 'episodes_summary', 'evidence_attributes', 'evidence_summary', 'landing_events', 'landing_flow', 'overview_events', 'overview_flow', 'overview_insights',
      'secant_archive_events', 'secant_archive_list', 'secant_archive_summary', 'study_archive_events', 'study_archive_list', 'study_archive_summary']) context[name] = 'Recorded evidence in the selected scope.';
    context.overview_events = context.landing_events = 'Recorded event times; occurrence order preserved.';
    context.secant_archive_events = 'Clock basis shown per event: OCCURRED AT uses paired recorder clocks; RECORDED AT is write time. Quality exclusions remain visible.';
    if (secant.some((e) => e.display_episode_id === UNAV) || breaks.some((b) => b.display_break_id === UNAV)) context.source_banner += ' · Alias unavailable';
    const primaryR = resources.find((r) => r.role === 'PRIMARY'), laterR = resources.find((r) => r.role === 'LATER');
    const primary = primaryR ? primaryR.title : NR, later = laterR ? laterR.title : 'None';
    const sessionRows = tr('sessions');
    const distractionMetrics = secantMetrics.concat([metric('DISTRACTION SOURCES', secantOk && snapshot.tables.secant_founding_source.status === 'AVAILABLE'
      ? new Set(eligible.filter((e) => e.source_status === 'AVAILABLE').map((e) => NS.repr([get(e.source, 'key')]))).size : tableState('secant_founding_source'))]);
    const lastBlock = study.blocks.length ? study.blocks[study.blocks.length - 1] : null;
    return {
      context, secant_facts: secant, recorder_quality: quality, study_facts: study, cosecant_facts: breaks,
      landing: {status: ['●  EPISODE', recent.outcome, 'RECORDED', 'cyan'], recent_episode: recentFields, recent_badges: [recent.outcome, recent.stage], metrics: overviewMetrics.slice(0, 4),
        behaviour: [recent.source, has(recent, 'platform') ? recent.platform : missing, recent.stage, recent.outcome], latest_events: ordered.slice(-5).reverse(), journey: recentFlow},
      overview: {metrics: overviewMetrics, recent_episode: recentFields,
        study_snapshot: [['Primary resource', primary], ['Later resource', later], ['Confirmed uncertain resources', studyMetrics[3][1]], ['Observed study path', 'Qualified Study resources'], ['Distraction videos', 'Excluded']],
        latest_events: ordered,
        insights: [['Scope', `Session ${snapshot.session_id}`], ['Session lifecycle', sessionRows.length ? (truthy(get(sessionRows[0], 'close_reason')) ? sessionRows[0].close_reason : 'In progress') : tableState('sessions')],
          ['Study area', lastBlock ? (truthy(get(lastBlock.payload, 'subject')) ? lastBlock.payload.subject : NR) : tableState('study_events')], ['Study Jump', 'Gaps and interruptions remain distinct.']], journey: recentFlow},
      episodes: {metrics: distractionMetrics, rows: archiveSorted.map((r, i) => [String(i + 1), r.display_episode_id, r.source, r.stage, r.outcome, r.recorded_at]), recent_episode: recentFields, flow: recentFlow},
      distraction_history: {metrics: distractionMetrics, rows: archiveSorted.map((r, i) => [String(i + 1), r.source, r.started, r.stage, r.return_intent, r.verification, r.closure]),
        attributes: ['Distraction Source', 'Return Intent', 'Return Verified', 'Stage Reached', 'Closure', 'Outcome scope', 'Recovery Interruption', 'Recorded At'].map((k, i) =>
          [k, [recent.source, recent.return_intent, recent.verification, recent.stage, recent.closure, 'Behavioural only', recent.interruption, recent.recorded_at][i]]), flow: recentFlow},
      study_history: {metrics: studyMetrics, rows: historyRows(study.visits.filter((v) => v.eligible)), jump_nodes: jumpNodes(jumps)},
      study_evidence: {metrics: studyMetrics, rows: evidenceRows(study.visits), attributes: evidenceAttrs, confirmation_nodes: confirmationNodes},
      cosecant: {main_summary: ['BREAK ID', 'LAST RECORDED STATE', 'BREAK TYPE', 'SELECTED ALLOWANCE', 'RETURN TARGET', 'OUTCOME'].map((k, i) =>
          [k, [coAlias, coEvents.length ? human(coEvents[coEvents.length - 1].payload.to_state) : coMissing, co && co.started ? NR : coMissing, allowance, target, outcome][i]]),
        recent_break: ['Break ID', 'Selected Allowance', 'Return Target', 'Return Confirmation', 'Outcome', 'Recorded At'].map((k, i) =>
          [k, [coAlias, allowance, target, confirmationValue, outcome, coEvents.length ? stamp(at(coEvents[coEvents.length - 1], 'created_at_utc'), true) : coMissing][i]]),
        metrics: coMetrics,
        break_history: ['Break ID', 'Break Type', 'Selected Allowance', 'Return Target', 'Allowance Status', 'Return Status', 'Outcome'].map((k, i) =>
          [k, [coAlias, co && co.started ? NR : coMissing, allowance, target, coEvents.some((r) => r.kind === 'BREAK_COMPLETE') ? 'Completed' : coEvents.some((r) => r.kind === 'BREAK_CANCELLED') ? 'Cancelled' : NR, confirmationValue, outcome][i]]),
        events: coEvents.map((r) => [human(r.kind), 'Recorded', stamp(r.payload.occurred_wall_time_utc)]),
        return_history: breaks.map((b) => { const v = coValue(b); return [v[0], v[2], v[3], v[1]]; }), flow: coFlow},
      secant_archive: archiveSorted, study_archive: studyArchive};
  }

  /* ---------------- DashboardIntegration._prepare_model ---------------- */
  const emptySnapshot = (status, sid) => ({session_id: sid, tables: Object.fromEntries(E.TABLES.map((n) => [n, E.table([], status)])), recorder_receipts: E.table([], 'NOT_RECORDED')});
  function unavailableModel(sid) {
    const m = preparePresentation(emptySnapshot('UNAVAILABLE', isInt(sid) && sid > 0n ? sid : 1n), 'UTC');
    m.context.source_banner = 'UNAVAILABLE · Evidence read failed';
    m.overview.insights = [['Scope', 'Unavailable']].concat(m.overview.insights.slice(1));
    m.secant_empty = m.study_empty = ['UNAVAILABLE', 'Historical evidence could not be read.'];
    return m;
  }
  /** corpus = evidence.buildCorpus(...) ; sid = BigInt session id or null (latest); tz = IANA key. Returns {model, error}. */
  function prepareModel(corpus, sid, tz, cache = new Map()) {
    try {
      if (sid !== null && (!isInt(sid) || sid <= 0n)) throw ValueError('Invalid selected session');
      const prep = (s) => { const k = String(s.session_id); if (!cache.has(k)) cache.set(k, preparePresentation(s, tz)); return cache.get(k); };
      let selected = sid !== null ? corpus.find((s) => s.session_id === sid) : (corpus.length ? corpus[corpus.length - 1] : null), model;
      if (!selected) {
        if (sid !== null) throw ValueError('Selected session is not durably available');
        model = preparePresentation(emptySnapshot('AVAILABLE', 1n), tz);
        model.context.source_banner = 'RECORDED EVIDENCE · No data';
        model.overview.insights = [['Scope', NODATA]].concat(model.overview.insights.slice(1));
      } else model = prep(selected);
      const archiveModels = corpus.map(prep);
      const secantFailed = corpus.some((s) => s.tables.secant_events.status === 'UNAVAILABLE');
      const studyFailed = archiveModels.some((m) => m.study_facts.status === 'UNAVAILABLE');
      const recorded = archiveModels.flatMap((m) => m.secant_facts), eligible = recorded.filter((e) => e.summary_eligible);
      const lifetimeFailed = secantFailed || corpus.some((s) => s.recorder_receipts.status === 'UNAVAILABLE');
      let note = `Lifetime finalized validated evidence; ${recorded.length - eligible.length} recorded episodes excluded`, values;
      if (lifetimeFailed) { values = Array(3).fill(UNAV); note = 'Lifetime evidence unavailable; historical read incomplete'; }
      else if (recorded.length) values = [eligible.length, eligible.reduce((n, e) => n + P.named(e, 'SECANT_RETURN_VERIFIED').length, 0), eligible.reduce((n, e) => n + P.named(e, 'SECANT_RECOVERY_INTERRUPTED').length, 0)];
      else {
        const emptyStatus = archiveModels.some((m) => m.recorder_quality.status === 'PENDING') ? 'Pending' : (corpus.length && corpus.every((s) => s.tables.secant_events.status === 'NOT_RECORDED')) ? NR : NODATA;
        values = Array(3).fill(emptyStatus);
      }
      const parent = model.landing.metrics;
      model = Object.assign({}, model);
      model.landing = Object.assign({}, model.landing, {metrics: parent.slice(0, 3).map((m, i) => [m[0], num(values[i]), note]).concat(parent.slice(3))});
      model.secant_archive = archiveModels.slice().reverse().flatMap((m) => m.secant_archive);
      model.study_archive = archiveModels.slice().reverse().filter((m) => m.study_facts.status !== 'UNAVAILABLE').flatMap((m) => m.study_archive);
      model.archive_diagnostics = corpus.flatMap((s) => Object.entries(s.tables).filter(([, t]) => t.status === 'UNAVAILABLE').map(([name]) => [s.session_id, name]));
      if (secantFailed || studyFailed) { model.context = Object.assign({}, model.context); model.context.source_banner += ' · Some historical evidence unavailable'; }
      model.secant_empty = secantFailed ? ['UNAVAILABLE', 'Historical episodes could not be validated.'] : null;
      model.study_empty = studyFailed ? ['UNAVAILABLE', 'Historical Study sessions could not be validated.'] : null;
      for (const [kind, table] of [['secant', 'secant_events'], ['study', 'study_events']]) {
        if (corpus.length && corpus.every((s) => s.tables[table].status === 'NOT_RECORDED')) model[kind + '_empty'] = ['NOT RECORDED', 'Historical evidence was not recorded.'];
      }
      return {model, error: '', detail: ''};
    } catch (e) {
      // The desktop catches every Exception here and shows an explicit Unavailable model; the detail is for tests / diagnostics only, never for display.
      if (e instanceof Error) return {model: unavailableModel(sid), error: e instanceof NS.PyError ? e.kind : 'Error', detail: String(e && e.stack || e).slice(0, 600)};
      throw e;
    }
  }
  /** The latest session that has any SECANT / Study / COSECANT evidence (the web default; the desktop would use the latest session of all). */
  function defaultSessionId(corpus) {
    for (let i = corpus.length - 1; i >= 0; i--) {
      const s = corpus[i];
      if (['secant_events', 'study_events', 'cosecant_events', 'study_resources'].some((n) => s.tables[n].rows.length)) return s.session_id;
    }
    return corpus.length ? corpus[corpus.length - 1].session_id : null;
  }
  NS.presentation = {preparePresentation, prepareModel, unavailableModel, defaultSessionId, durationText, human};
})(self);
