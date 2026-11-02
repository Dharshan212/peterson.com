// Science Lab Chapter 3 evidence reconstruction and certification, ported from the desktop:
//   SCIENCE_LAB/history.py (reconstruct_historical_experiment), evidence.py (gather_session_evidence), secant_adapter.py, analysis.py (analyze_finalized_session and every builder/validator).
// It fails closed at the first unmet requirement, exactly like the desktop: an unreadable experiment, a missing session closure, any evidence that cannot support a coherent package
// gives an UNAVAILABLE outcome with the reason; a partial or approximated package is never produced. Same value model as the other adapters (ints are BigInt; counts are Numbers).
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, O = NS.organs, MH = NS.metrichub, P = NS.projection, {PyError} = NS;
  const AVAILABLE = 'AVAILABLE', NO_EVIDENCE = 'NO_EVIDENCE', UNAVAILABLE = 'UNAVAILABLE', NOT_APPLICABLE = 'NOT_APPLICABLE';
  const FULLY = 'FULLY_CONTAINED', CROSS = 'CROSS_BOUNDARY_OVERLAP', OUTSIDE = 'OUTSIDE_WINDOW';
  const CERTIFIED = 'CERTIFIED', NO_COMPLETED = 'NO_COMPLETED_EXPERIMENT', ANALYSIS_UNAVAILABLE = 'ANALYSIS_UNAVAILABLE', MAIN = 'MAIN', BREAK = 'BREAK';
  const VALUE_STATUSES = new Set([AVAILABLE, NO_EVIDENCE, UNAVAILABLE]);
  const TIMELINE_STAGES = new Set(['OFF_TASK_DWELL', 'TRIGGER', 'RETURN', 'VERIFIED_RETURN', 'EPISODE_CLOSURE', 'BREAK_LANE']);
  const METRIC_ROSTER = [['task_aligned_time', 'Task-aligned time'], ['off_task_dwell', 'Off-task dwell'], ['return_latency', 'Return latency'], ['verified_returns', 'Verified returns'], ['relapses', 'Relapses'],
    ['post_return_persistence', 'Post-return persistence'], ['context_switches', 'Context switches'], ['experiment_duration', 'Experiment duration']];
  const WHOLE_ROSTER = [['SINE', 'Completed episodes'], ['MINE', 'Completed episodes'], ['COSINE', 'Completed episodes'], ['MIRL', 'Verified recoveries'], ['SECANT', 'Completed episodes'], ['COSECANT', 'Completed returns'],
    ['STUDY', 'Completed study blocks'], ['NORMAL_BREAK', 'Completed break events']];
  const REQUIRED_COVERAGE = new Set(['SINE', 'NORMAL_BREAK', 'MINE', 'COSINE', 'MIRL', 'STUDY', 'COSECANT', 'RESOURCE_INTENT']);
  const RETURN_ONSET_REFERENCE = 'opening MIRL SINE display to return_verification_started for the final attempt durably linked to return_verified and successful episode_closed';
  const isB = (x) => typeof x === 'bigint';
  class PyErr extends Error { constructor(name, msg) { super(msg); this.pyName = name; this.pyMessage = msg; } }
  const AIE = (m) => new PyErr('AnalysisIntegrityError', m), VE = (m) => new PyErr('ValueError', m), TE = (m) => new PyErr('TypeError', m);
  const errName = (e) => (e && e.pyName) || (e instanceof PyError ? e.kind : (e && e.constructor && e.constructor.name) || 'Error');
  const errMsg = (e) => (e && e.pyMessage !== undefined ? e.pyMessage : String((e && e.message) || e));
  const cmpS = (a, b) => NS.cmp(a, b), cmpB = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const sortBy = (items, key) => items.map((v, i) => [key(v), i, v]).sort((p, q) => { for (let k = 0; k < p[0].length; k++) { const a = p[0][k], b = q[0][k], c = typeof a === 'string' ? cmpS(a, b) : isB(a) || isB(b) ? cmpB(BigInt(a), BigInt(b)) : a < b ? -1 : a > b ? 1 : 0; if (c) return c; } return p[1] - q[1]; }).map((x) => x[2]);

  /* ---------------- evidence references, values, windows ---------------- */
  function ref(source, durable_id, ns, kind, note = '') {
    if (!source || !durable_id || !kind) throw VE('evidence provenance requires source, identity and kind');
    if (ns !== null && (!isB(ns) || ns < 0n)) throw VE('provenance monotonic time must be non-negative');
    return {source, durable_id, occurred_monotonic_ns: ns, event_kind: kind, note};
  }
  const refKey = (r) => JSON.stringify([r.source, r.durable_id, r.occurred_monotonic_ns === null ? null : String(r.occurred_monotonic_ns), r.event_kind, r.note]);
  const dedupeRefs = (arr) => { const seen = new Set(), out = []; for (const r of arr) { const k = refKey(r); if (!seen.has(k)) { seen.add(k); out.push(r); } } return out; };
  const dedupe = (arr) => [...new Set(arr.filter((x) => x))];
  function validateValue(status, value) {
    if (!VALUE_STATUSES.has(status)) throw VE('unknown analysis availability status');
    if (status === AVAILABLE && value === null) throw VE('AVAILABLE analysis requires a value');
    if (status !== AVAILABLE && value !== null) throw VE('non-AVAILABLE analysis cannot carry a value');
  }
  function validateWindow(s, e) { if (!isB(s) || !isB(e)) throw TE('experiment bounds must be exact integers'); if (s < 0n || e < s) throw VE('experiment window is invalid'); }
  function inWindow(t, s, e) { validateWindow(s, e); if (!isB(t)) throw TE('point timestamp must be an exact integer'); return s <= t && t < e; }
  const value = (status, v, unit, reason, provenance = []) => { validateValue(status, v); return {status, value: v, unit, reason, provenance}; };
  const metric = (code, label, status, reason, o = {}) => { const v = o.value === undefined ? null : o.value; validateValue(status, v); return {code, label, status, value: v, unit: o.unit || '', reason, provenance: o.provenance || [], samples: o.samples || []}; };

  /* ---------------- MIRL accessors ---------------- */
  const evName = (e) => e.event_name, evTime = (e) => e.occurred_monotonic_ns, evId = (e) => e.event_id, evAttempt = (e) => e.attempt_id;
  function evSupport(e) { const v = e.supporting_event_ids; if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !x)) throw AIE('MIRL supporting-event identity is malformed'); return v; }
  const mirlRef = (e) => ref('MIRL', evId(e), evTime(e), evName(e));
  const chainRef = (e) => ref('MIRL', evId(e), evTime(e), evName(e), `episode_id=${e.episode_id};attempt_id=${evAttempt(e) || 'none'};supporting_event_ids=${evSupport(e).join(',') || 'none'}`);
  function mirlEvents(snapshot, coverage) {
    if (coverage.MIRL.status === UNAVAILABLE) return [];
    if (snapshot.mirl === null) { if (coverage.MIRL.status === NO_EVIDENCE) return []; throw AIE('MIRL evidence is absent despite AVAILABLE coverage'); }
    if (snapshot.mirl.session_id !== snapshot.parent_session_id) throw AIE('MIRL evidence belongs to another session');
    const events = snapshot.mirl.events.slice(), seen = new Set();
    for (const e of events) {
      if (e.session_id !== snapshot.parent_session_id || typeof e.event_id !== 'string' || !e.event_id || !isB(e.occurred_monotonic_ns) || e.occurred_monotonic_ns < 0n || !evName(e)) throw AIE('MIRL event is malformed');
      if (seen.has(e.event_id)) throw AIE('MIRL event identity is duplicated');
      seen.add(e.event_id);
    }
    return events;
  }

  /* ---------------- generic source records ---------------- */
  function payloadOf(rec) {
    let v;
    try { v = NS.pyjson.loads(rec.payload_json); } catch (e) { if (e instanceof PyError || (e && /RecursionError/.test(e.message))) throw AIE('source payload is not valid JSON'); throw e; }
    if (!NS.isDict(v)) throw AIE('source payload is not a JSON object');
    return v;
  }
  function genericRecords(evidence, source, sid) {
    if (evidence === null) return [];
    if (evidence.session_id !== sid) throw AIE(`${source} evidence belongs to another session`);
    const records = evidence.records.slice();
    for (const r of records) {
      if (r.source_system !== source || r.session_id !== sid || typeof r.source_event_id !== 'string' || !r.source_event_id || typeof r.kind !== 'string' || !r.kind || !isB(r.occurred_monotonic_ns) || r.occurred_monotonic_ns < 0n) throw AIE(`${source} source record is malformed`);
      payloadOf(r);
    }
    return records;
  }
  const recordRef = (r) => ref(String(r.source_system), String(r.source_event_id), r.occurred_monotonic_ns, String(r.kind));

  /* ---------------- coverage ---------------- */
  function coverageBySource(rows) {
    const result = {};
    for (const row of rows) {
      if (!row || NS.has(result, row.source_system)) throw AIE('source coverage is malformed or duplicated');
      if (!VALUE_STATUSES.has(row.status)) throw AIE('source coverage has an unknown status');
      if (row.status === UNAVAILABLE) { if (row.item_count !== null) throw AIE('UNAVAILABLE source cannot carry a count'); }
      else if (!Number.isInteger(row.item_count) || row.item_count < 0) throw AIE('readable source requires a non-negative count');
      if (row.status === AVAILABLE && row.item_count === 0) throw AIE('AVAILABLE source cannot have zero evidence rows');
      if (row.status === NO_EVIDENCE && row.item_count !== 0) throw AIE('NO_EVIDENCE source must have zero rows');
      result[row.source_system] = row;
    }
    if (!NS.has(result, 'SECANT')) result.SECANT = {source_system: 'SECANT', status: UNAVAILABLE, reason: 'SECANT absent from legacy snapshot', item_count: null};
    const keys = Object.keys(result);
    if (keys.length !== REQUIRED_COVERAGE.size + 1 || !keys.every((k) => REQUIRED_COVERAGE.has(k) || k === 'SECANT')) throw AIE('final snapshot source coverage roster is incomplete');
    const r = result.RESOURCE_INTENT;
    if (r.status !== UNAVAILABLE || r.reason !== 'no_durable_event_identity' || r.item_count !== null) throw AIE('Resource Intent coverage semantics changed');
    return result;
  }
  function validateSnapshotEvidence(snapshot, coverage) {
    const by = {SINE: snapshot.sine, NORMAL_BREAK: snapshot.normal_break, MINE: snapshot.mine, COSINE: snapshot.cosine, MIRL: snapshot.mirl, STUDY: snapshot.study, COSECANT: snapshot.cosecant};
    for (const [source, ev] of Object.entries(by)) {
      const row = coverage[source];
      if (row.status === UNAVAILABLE) { if (ev !== null) throw AIE(`${source} evidence exists despite UNAVAILABLE coverage`); continue; }
      if (ev === null) throw AIE(`${source} evidence is absent despite readable coverage`);
      if (ev.session_id !== snapshot.parent_session_id) throw AIE(`${source} evidence belongs to another session`);
      const population = source === 'MIRL' ? ev.events : (source === 'MINE' || source === 'COSINE') ? ev.episodes : ev.records;
      if (!Array.isArray(population)) throw AIE(`${source} evidence population is mutable`);
      if (population.length !== row.item_count) throw AIE(`${source} evidence count disagrees with coverage`);
    }
    const sec = snapshot.secant, cov = coverage.SECANT;
    if (sec !== null) {
      if (sec.session_id !== snapshot.parent_session_id || sec.status !== cov.status) throw AIE('SECANT coverage/session mismatch');
      if (cov.status !== UNAVAILABLE && cov.item_count !== sec.episodes.length) throw AIE('SECANT coverage count mismatch');
    } else if (cov.status !== UNAVAILABLE) throw AIE('SECANT readable coverage lacks evidence');
    if (snapshot.resource_intent !== null) throw AIE('Resource Intent evidence must remain unavailable');
  }

  /* ---------------- the Chapter 6 chain (shared with the lifetime cards) ---------------- */
  function returnOnsetSamples(events, start, end) {
    validateWindow(start, end);
    const byId = new Map(); for (const e of events) byId.set(evId(e), e);
    const byEp = new Map(); for (const e of events) { const id = String(e.episode_id || ''); if (!id) continue; if (!byEp.has(id)) byEp.set(id, []); byEp.get(id).push(e); }
    const samples = [];
    for (const id of [...byEp.keys()].sort(cmpS)) {
      const list = byEp.get(id), closes = list.filter((e) => evName(e) === 'episode_closed' && String(e.reason || '') === 'RETURNED');
      if (!closes.length) continue;
      if (closes.length !== 1) throw AIE('MIRL episode has ambiguous successful closure identity');
      const chain = MH.successfulReturnChain(id, list, closes[0], byId);
      if (!chain.every((e) => inWindow(evTime(e), start, end))) continue;
      const [, opening, started, , verified, , , closed] = chain;
      const refs = chain.map(chainRef), s = {episode_id: id, attempt_id: evAttempt(started), latency_ns: evTime(started) - evTime(opening), opening_sine_display: chainRef(opening), successful_return_onset: chainRef(started),
        return_verified: chainRef(verified), episode_closed: chainRef(closed), supporting_event_chain: refs};
      // SuccessfulReturnOnsetLatencySample.__post_init__
      if (!s.episode_id || !s.attempt_id) throw VE('return-onset sample requires episode and attempt identity');
      if (!isB(s.latency_ns) || s.latency_ns <= 0n) throw VE('return-onset latency must be a positive integer');
      const keys = new Set(refs.map(refKey));
      if (![s.opening_sine_display, s.successful_return_onset, s.return_verified, s.episode_closed].every((a) => keys.has(refKey(a)))) throw VE('return-onset sample dropped a required evidence anchor');
      if (keys.size !== refs.length) throw VE('return-onset supporting chain contains duplicate evidence');
      const a = s.opening_sine_display.occurred_monotonic_ns, b = s.successful_return_onset.occurred_monotonic_ns, c = s.return_verified.occurred_monotonic_ns, d = s.episode_closed.occurred_monotonic_ns;
      if (!(a < b && b <= c && c <= d)) throw VE('return-onset sample evidence is out of order');
      if (s.latency_ns !== b - a) throw VE('return-onset latency disagrees with evidence anchors');
      samples.push(s);
    }
    return sortBy(samples, (s) => [s.opening_sine_display.occurred_monotonic_ns, s.episode_id]);
  }
  const sampleRefs = (samples) => dedupeRefs(samples.flatMap((s) => s.supporting_event_chain));
  function returnExtrema(snapshot, coverage, start, end) {
    const samples = returnOnsetSamples(mirlEvents(snapshot, coverage), start, end);
    let best, worst;
    if (!samples.length) {
      const reason = coverage.MIRL.status === UNAVAILABLE ? `MIRL evidence is unavailable: ${coverage.MIRL.reason}` : 'no successfully closed MIRL episode has a complete durable return-onset chain wholly inside the selected experiment';
      best = value(UNAVAILABLE, null, 'ns', reason); worst = value(UNAVAILABLE, null, 'ns', reason);
    } else {
      const lat = samples.map((s) => s.latency_ns), lo = lat.reduce((a, b) => (b < a ? b : a)), hi = lat.reduce((a, b) => (b > a ? b : a));
      best = value(AVAILABLE, lo, 'ns', 'minimum certified opening-SINE-display to final-successful-return-onset latency', sampleRefs(samples.filter((s) => s.latency_ns === lo)));
      worst = value(AVAILABLE, hi, 'ns', 'maximum certified opening-SINE-display to final-successful-return-onset latency', sampleRefs(samples.filter((s) => s.latency_ns === hi)));
    }
    return {best_successful_return_onset_latency: best, worst_successful_return_onset_latency: worst, eligible_sample_count: samples.length, unit: 'ns', reference_definition: RETURN_ONSET_REFERENCE,
      experiment_start_monotonic_ns: start, experiment_end_monotonic_ns: end, samples};
  }

  /* ---------------- metrics, timeline, whole-MYELIN ---------------- */
  function returnLatencySamples(events, verifiedEvents) {
    const out = [];
    for (const v of verifiedEvents) {
      const id = String(v.episode_id || ''), displays = events.filter((e) => String(e.episode_id || '') === id && evName(e) === 'sine_displayed' && evTime(e) <= evTime(v));
      if (!displays.length) continue;
      const shown = sortBy(displays, (e) => [evTime(e), evId(e)])[0];
      out.push(value(AVAILABLE, evTime(v) - evTime(shown), 'ns', 'factual SINE display to MIRL verified-return proof', [mirlRef(shown), mirlRef(v)]));
    }
    return out;
  }
  function buildMetrics(snapshot, coverage, experiment, start, end) {
    const labels = Object.fromEntries(METRIC_ROSTER), m = {};
    m.task_aligned_time = metric('task_aligned_time', labels.task_aligned_time, UNAVAILABLE, 'a complete durable Resource Intent ledger is unavailable; unknown time cannot be classified');
    m.off_task_dwell = metric('off_task_dwell', labels.off_task_dwell, UNAVAILABLE, 'certified sources do not provide one complete non-overlapping experiment-wide off-task interval population');
    m.post_return_persistence = metric('post_return_persistence', labels.post_return_persistence, UNAVAILABLE, 'no certified task-aligned persistence endpoint exists after verified return');
    m.context_switches = metric('context_switches', labels.context_switches, UNAVAILABLE, 'no complete durable context-switch identity ledger covers the experiment');
    const mst = coverage.MIRL.status, events = mirlEvents(snapshot, coverage);
    const verified = events.filter((e) => evName(e) === 'return_verified' && inWindow(evTime(e), start, end)), relapses = events.filter((e) => evName(e) === 'relapse_detected' && inWindow(evTime(e), start, end));
    if (mst === UNAVAILABLE) for (const k of ['verified_returns', 'relapses', 'return_latency']) m[k] = metric(k, labels[k], UNAVAILABLE, coverage.MIRL.reason);
    else if (mst === NO_EVIDENCE) {
      m.verified_returns = metric('verified_returns', labels.verified_returns, NO_EVIDENCE, 'MIRL contains no session evidence');
      m.relapses = metric('relapses', labels.relapses, NO_EVIDENCE, 'MIRL contains no session evidence');
      m.return_latency = metric('return_latency', labels.return_latency, NO_EVIDENCE, 'no verified recovery episode exists');
    } else {
      m.verified_returns = metric('verified_returns', labels.verified_returns, AVAILABLE, 'factual MIRL return_verified events in [start,end)', {value: verified.length, unit: 'count', provenance: verified.map(mirlRef)});
      m.relapses = metric('relapses', labels.relapses, AVAILABLE, 'factual MIRL relapse_detected events in [start,end)', {value: relapses.length, unit: 'count', provenance: relapses.map(mirlRef)});
      const samples = returnLatencySamples(events, verified);
      m.return_latency = metric('return_latency', labels.return_latency, UNAVAILABLE, samples.length ? 'per-episode factual latency samples are retained, but no approved single-card aggregation is defined' : 'no complete factual display-to-verified-return pair exists', {samples});
    }
    m.experiment_duration = metric('experiment_duration', labels.experiment_duration, AVAILABLE, 'ended_monotonic_ns - started_monotonic_ns', {value: end - start, unit: 'ns', provenance: [ref('SCIENCE_LAB_EXPERIMENT', experiment.experiment_id, start, 'COMPLETED_EXPERIMENT_WINDOW', `end_monotonic_ns=${end}`)]});
    return METRIC_ROSTER.map(([code]) => m[code]);
  }
  function buildTimeline(snapshot, start, end) {
    const events = [], sid = snapshot.parent_session_id;
    const tev = (source, stage, ns, label, id, lane, prov) => {
      if (!TIMELINE_STAGES.has(stage)) throw VE('unknown Chapter 3 timeline stage');
      if (lane !== MAIN && lane !== BREAK) throw VE('unknown Chapter 3 timeline lane');
      if (!isB(ns)) throw TE('timeline monotonic time must be an exact integer'); if (ns < 0n) throw VE('timeline monotonic time cannot be negative');
      if (!source || !label || !id) throw VE('timeline event requires source, label and identity'); if (!prov.length) throw VE('timeline event requires provenance');
      return {source, stage, occurred_monotonic_ns: ns, label, durable_id: id, lane, provenance: prov};
    };
    for (const r of genericRecords(snapshot.sine, 'SINE', sid)) {
      const mp = {SINE_DISPLAYED: ['TRIGGER', 'SINE intervention factually displayed'], SINE_EPISODE_RESOLVED: ['EPISODE_CLOSURE', 'SINE episode resolved']}[r.kind];
      if (mp && inWindow(r.occurred_monotonic_ns, start, end)) events.push(tev('SINE', mp[0], r.occurred_monotonic_ns, mp[1], r.source_event_id, MAIN, [recordRef(r)]));
    }
    for (const r of genericRecords(snapshot.normal_break, 'NORMAL_BREAK', sid)) {
      const label = {NORMAL_BREAK_STARTED: 'Approved Normal Break started', NORMAL_BREAK_COMPLETED: 'Approved Normal Break completed', NORMAL_BREAK_STOPPED: 'Approved Normal Break stopped'}[r.kind];
      if (!label) continue;
      if (inWindow(r.occurred_monotonic_ns, start, end)) events.push(tev('NORMAL_BREAK', 'BREAK_LANE', r.occurred_monotonic_ns, label, r.source_event_id, BREAK, [recordRef(r)]));
    }
    const mm = {return_verification_started: ['RETURN', 'Factual return evidence began'], return_verified: ['VERIFIED_RETURN', 'MIRL return verified'], episode_closed: ['EPISODE_CLOSURE', 'MIRL episode closed']};
    const coverage = Object.fromEntries(snapshot.source_coverage.map((r) => [r.source_system, r]));
    for (const e of mirlEvents(snapshot, coverage)) { const mp = mm[evName(e)]; if (mp && inWindow(evTime(e), start, end)) events.push(tev('MIRL', mp[0], evTime(e), mp[1], evId(e), MAIN, [mirlRef(e)])); }
    const cm = {BREAK_STARTED: ['BREAK_LANE', BREAK, 'Approved Study break started'], BREAK_COMPLETE: ['BREAK_LANE', BREAK, 'Approved Study break elapsed'], RETURN_CONFIRMATION_STARTED: ['RETURN', MAIN, 'Study return confirmation began'], RETURN_CONFIRMED: ['VERIFIED_RETURN', MAIN, 'Study return confirmed']};
    for (const r of genericRecords(snapshot.cosecant, 'COSECANT', sid)) {
      const mp = cm[r.kind]; if (!mp) continue;
      const p = payloadOf(r), ts = NS.has(p, 'effective_monotonic_ns') ? p.effective_monotonic_ns : r.occurred_monotonic_ns;
      if (!isB(ts)) throw AIE('COSECANT effective timestamp is malformed');
      if (inWindow(ts, start, end)) events.push(tev('COSECANT', mp[0], ts, mp[2], r.source_event_id, mp[1], [ref('COSECANT', r.source_event_id, ts, r.kind, 'effective_monotonic_ns from durable fact payload')]));
    }
    const unique = new Map();
    for (const e of events) { const k = JSON.stringify([e.source, e.durable_id, e.stage]); if (unique.has(k)) throw AIE('duplicate normalized timeline identity'); unique.set(k, e); }
    return sortBy([...unique.values()], (e) => [e.occurred_monotonic_ns, e.source, e.durable_id, e.stage]);
  }
  const wholeRow = (source, label, status, count, reason, prov = []) => { validateValue(status, count); if (count !== null && (!Number.isInteger(count) || count < 0)) throw VE('Whole-MYELIN count must be a non-negative integer'); return {source, label, status, count, reason, provenance: prov}; };
  function wholeGeneric(evidence, source, sid, terminal, field) {
    const ids = new Map();
    for (const r of genericRecords(evidence, source, sid)) {
      if (!terminal.has(r.kind)) continue;
      const id = payloadOf(r)[field];
      if (typeof id !== 'string' || !id) throw AIE(`${source} terminal fact lacks identity`);
      if (!ids.has(id)) ids.set(id, recordRef(r));
    }
    return [ids.size, [...ids.keys()].sort(cmpS).map((k) => ids.get(k))];
  }
  function buildWhole(snapshot, coverage) {
    const sid = snapshot.parent_session_id;
    const builders = {
      SINE: () => wholeGeneric(snapshot.sine, 'SINE', sid, new Set(['SINE_EPISODE_RESOLVED']), 'episode_uid'),
      NORMAL_BREAK: () => wholeGeneric(snapshot.normal_break, 'NORMAL_BREAK', sid, new Set(['NORMAL_BREAK_COMPLETED', 'NORMAL_BREAK_STOPPED']), 'break_id'),
      COSECANT: () => wholeGeneric(snapshot.cosecant, 'COSECANT', sid, new Set(['RETURN_CONFIRMED']), 'break_id'),
      STUDY: () => {
        const ids = new Map();
        for (const r of genericRecords(snapshot.study, 'STUDY', sid)) {
          if (!(r.kind === 'COMPLETE' || r.kind === 'TARGET_REACHED')) continue;
          const p = payloadOf(r); if (NS.get(p, 'state') !== 'COMPLETED') continue;
          const b = NS.get(p, 'block_id'), gen = NS.get(p, 'generation');
          if (typeof b !== 'string' || !b || !isB(gen)) throw AIE('Study completion lacks block identity');
          const k = JSON.stringify([b, String(gen)]); if (!ids.has(k)) ids.set(k, [b, gen, recordRef(r)]);
        }
        const rows = sortBy([...ids.values()], (x) => [x[0], x[1]]);
        return [rows.length, rows.map((x) => x[2])];
      },
      MIRL: () => { const ids = new Map(); for (const e of mirlEvents(snapshot, coverage)) if (evName(e) === 'return_verified' && !ids.has(evId(e))) ids.set(evId(e), mirlRef(e)); return [ids.size, [...ids.keys()].sort(cmpS).map((k) => ids.get(k))]; },
      MINE: () => {
        if (snapshot.mine === null) throw AIE('MINE evidence is absent despite AVAILABLE coverage');
        const ids = new Map();
        for (const ep of snapshot.mine.episodes) {
          if (ep.session_id !== sid) throw AIE('MINE episode belongs to another session');
          if (typeof ep.is_closed !== 'boolean') throw AIE('MINE episode completion state is malformed');
          if (!ep.is_closed) continue;
          const id = ep.mine_episode_id; if (typeof id !== 'string' || !id) throw AIE('closed MINE episode lacks durable identity');
          if (!ids.has(id)) ids.set(id, ref('MINE', id, null, 'CLOSED_EPISODE', 'MineEpisodeProjection.is_closed'));
        }
        return [ids.size, [...ids.keys()].sort(cmpS).map((k) => ids.get(k))];
      },
      COSINE: () => {
        if (snapshot.cosine === null) throw AIE('COSINE evidence is absent despite AVAILABLE coverage');
        const ids = new Map();
        for (const ep of snapshot.cosine.episodes) {
          if (ep.parent_session_id !== sid) throw AIE('COSINE episode belongs to another session');
          if (typeof ep.is_closed !== 'boolean') throw AIE('COSINE episode completion state is malformed');
          if (!ep.is_closed) continue;
          if (typeof ep.cosine_session_id !== 'string' || !ep.cosine_session_id || !isB(ep.generation)) throw AIE('closed COSINE episode lacks durable identity');
          const id = `${ep.cosine_session_id}:${ep.generation}`; if (!ids.has(id)) ids.set(id, ref('COSINE', id, null, 'CLOSED_EPISODE', 'CosineEpisodeProjection.is_closed'));
        }
        return [ids.size, [...ids.keys()].sort(cmpS).map((k) => ids.get(k))];
      },
      SECANT: () => [snapshot.secant.episodes.length, snapshot.secant.episodes.map((e) => ref('SECANT', e.events[e.events.length - 1].event_id, e.events[e.events.length - 1].at_ns, 'SECANT_EPISODE_CLOSED'))]
    };
    return WHOLE_ROSTER.map(([source, label]) => {
      const cov = coverage[source];
      if (cov.status !== AVAILABLE) return wholeRow(source, label, cov.status, null, cov.reason || 'readable source contains no session evidence');
      const [count, refs] = builders[source]();
      return wholeRow(source, label, AVAILABLE, count, 'counted from the full finalized parent-session population', refs);
    });
  }

  /* ---------------- SINE stage rows and display codes ---------------- */
  function buildSineStageRows(snapshot, coverage, start, end) {
    if (coverage.SINE.status !== AVAILABLE) return [];
    const groups = new Map(), order = [];
    for (const r of genericRecords(snapshot.sine, 'SINE', snapshot.parent_session_id)) {
      if (r.kind !== 'SINE_DISPLAYED' && r.kind !== 'SINE_RESPONSE_RECORDED') continue;
      if (!inWindow(r.occurred_monotonic_ns, start, end)) continue;
      const p = payloadOf(r), ep = NS.get(p, 'episode_uid'), stage = NS.get(p, 'stage'), popup = NS.get(p, 'popup_request_id');
      if (typeof ep !== 'string' || !ep || !isB(stage) || typeof popup !== 'string' || !popup) throw AIE('SINE fact lacks durable episode/stage/display identity');
      const key = JSON.stringify([ep, String(stage), popup]);
      if (!groups.has(key)) groups.set(key, {ep, stage, popup, refs: []});
      const entry = groups.get(key); entry.refs.push(recordRef(r));
      if (r.kind === 'SINE_DISPLAYED') { entry.display = r; entry.resource_key = O.pyStrOf(NS.get(p, 'resource_key', '')); entry.wall = O.pyStrOf(NS.get(p, 'occurred_wall_time_utc', '')); }
      else entry.response = O.pyStrOf(NS.get(p, 'response', ''));
      if (!order.includes(key)) order.push(key);
    }
    const rows = [];
    for (const key of order) {
      const e = groups.get(key); if (!e.display) continue;
      if (!(e.stage === 1n || e.stage === 2n || e.stage === 3n)) throw VE('SINE stage row stage must be 1, 2 or 3');
      rows.push({episode_id: e.ep, stage: Number(e.stage), popup_request_id: e.popup, display_monotonic_ns: e.display.occurred_monotonic_ns, display_wall_time_utc: e.wall || '', response: e.response || '', resource_key: e.resource_key || '', provenance: e.refs});
    }
    return sortBy(rows, (r) => [r.display_monotonic_ns, r.episode_id, r.stage, r.popup_request_id]);
  }
  function sineStage1Index(snapshot, coverage) {
    if (coverage.SINE.status !== AVAILABLE || snapshot.sine === null) return new Map();
    const index = new Map();
    for (const r of genericRecords(snapshot.sine, 'SINE', snapshot.parent_session_id)) {
      if (r.kind !== 'SINE_DISPLAYED') continue;
      const p = payloadOf(r); if (NS.get(p, 'stage') !== 1n) continue;
      const ep = NS.get(p, 'episode_uid'), cand = NS.get(p, 'candidate_uid'), wall = NS.get(p, 'occurred_wall_time_utc');
      if (typeof ep !== 'string' || !ep || typeof cand !== 'string' || !cand || typeof wall !== 'string' || !wall) continue;
      if (!index.has(ep)) index.set(ep, [cand, wall]);
    }
    return index;
  }
  function resolveDisplayCodes(snapshot, coverage, sineRows, extrema) {
    const sineIds = [...new Set(sineRows.map((r) => r.episode_id))], sampleIds = [...new Set(extrema.samples.map((s) => s.episode_id))];
    if (!sineIds.length && !sampleIds.length) return [];
    if (coverage.MIRL.status !== AVAILABLE || snapshot.mirl === null) throw AIE('certified SINE/MIRL evidence exists but MIRL evidence is unavailable, so the official EPI- display code cannot be resolved without guessing');
    const rows = snapshot.mirl.live_mirl_rows, codes = new Map(), idToCode = new Map();
    for (const r of rows) { const id = String(r.episode_id || ''), d = String(r.short_display_id || ''); if (id && d) idToCode.set(id, d); }
    for (const id of sampleIds) {
      const d = idToCode.get(id);
      if (!d) throw AIE(`MIRL episode ${O.pyRepr(id)} has no matching certified live-MIRL projection row (it may have aged out of MIRL's recent-episode window); its official display code cannot be resolved without guessing`);
      codes.set(id, d);
    }
    if (sineIds.length) {
      const index = sineStage1Index(snapshot, coverage);
      for (const id of sineIds) {
        const ident = index.get(id);
        if (!ident) throw AIE(`SINE episode ${O.pyRepr(id)} has no certified stage-1 display fact; its official MIRL display code cannot be resolved`);
        const matches = rows.filter((r) => String(r.candidate_uid || '') === ident[0] && String(r.started_at || '') === ident[1]);
        if (!matches.length) throw AIE(`SINE episode ${O.pyRepr(id)} has no matching certified MIRL episode (it may have aged out of MIRL's recent-episode window); its official display code cannot be resolved without guessing`);
        if (matches.length > 1) throw AIE(`SINE episode ${O.pyRepr(id)} matches more than one certified MIRL episode; the official display code mapping is ambiguous`);
        const d = String(matches[0].short_display_id || '');
        if (!d) throw AIE(`matched MIRL episode for SINE episode ${O.pyRepr(id)} has no official display code`);
        codes.set(id, d);
      }
    }
    return [...codes.entries()].sort((a, b) => cmpS(a[0], b[0]) || cmpS(a[1], b[1]));
  }

  /* ---------------- MINE / COSINE rows and scopes ---------------- */
  function episodeBounds(rawEvents, idFn) {
    const bounds = new Map();
    for (const e of rawEvents) {
      const id = idFn(e); if (!id) continue;
      const t = e.monotonic_ns; if (!isB(t)) throw AIE('raw event lacks a durable monotonic timestamp');
      if (bounds.has(id)) { let [lo, hi] = bounds.get(id); if (t < lo.monotonic_ns) lo = e; if (t > hi.monotonic_ns) hi = e; bounds.set(id, [lo, hi]); } else bounds.set(id, [e, e]);
    }
    return bounds;
  }
  const classify = (o, c, s, e) => (s <= o && c < e ? FULLY : (c < s || o >= e) ? OUTSIDE : CROSS);
  const rawRef = (source, e, note) => ref(source, String(e.event_id || ''), e.monotonic_ns, String(e.event_name || ''), note);
  function mineClassifications(snapshot, start, end) {
    if (snapshot.mine === null) return [];
    const bounds = episodeBounds(snapshot.mine.raw_events, (e) => String(e.mine_episode_id || '')), out = [];
    for (const ep of snapshot.mine.episodes) {
      if (ep.session_id !== snapshot.parent_session_id) throw AIE('MINE episode belongs to another session');
      if (!ep.is_closed) continue;
      const id = String(ep.mine_episode_id || ''); if (!id) throw AIE('closed MINE episode lacks durable identity');
      const span = bounds.get(id); if (!span) throw AIE('closed MINE episode has no matching raw-event monotonic span');
      out.push([ep, classify(span[0].monotonic_ns, span[1].monotonic_ns, start, end), span[0], span[1]]);
    }
    return out;
  }
  function buildMineRows(snapshot, coverage, start, end) {
    if (coverage.MINE.status !== AVAILABLE || snapshot.mine === null) return [];
    const rows = [];
    for (const [ep, status, open, close] of mineClassifications(snapshot, start, end)) {
      if (status !== FULLY) continue;
      const id = String(ep.mine_episode_id || ''), disp = String(ep.display_episode_id || '');
      if (!id) throw VE('MINE episode row requires a durable episode identity'); if (!disp) throw VE('MINE episode row requires an official display episode id');
      if (close.monotonic_ns < open.monotonic_ns) throw VE('MINE episode row has an inverted monotonic span');
      rows.push({episode_id: id, display_episode_id: disp, branch: ep.branch, important_duration_minutes: ep.important_duration_minutes, closure_outcome: ep.closure_outcome, closure_reason: ep.closure_reason, return_verified: !!ep.return_verified,
        started_at_utc: String(ep.started_at_utc || ''), ended_at_utc: ep.ended_at_utc, opening_monotonic_ns: open.monotonic_ns, closing_monotonic_ns: close.monotonic_ns,
        provenance: [rawRef('MINE', open, "earliest raw MineEvent in this episode's monotonic span"), rawRef('MINE', close, "latest raw MineEvent in this episode's monotonic span")]});
    }
    return sortBy(rows, (r) => [r.opening_monotonic_ns, r.episode_id]);
  }
  function scopeStatus(source, counts, overlapRefs) {
    const c = counts[FULLY], o = counts[CROSS];
    if (c > 0) return [FULLY, o > 0 ? `${c} ${source} episode(s) fully contained and analysed; ${o} additional episode(s) crossed the experiment boundary and were excluded from quantitative rows` : `${c} ${source} episode(s) fully contained and analysed`, overlapRefs];
    if (o > 0) return [CROSS, `${source} activity overlapped the experiment boundary but no episode was fully contained; excluded from quantitative rows, not absent`, overlapRefs];
    return [OUTSIDE, `certified ${source} episodes exist for this session but none overlap this experiment`, []];
  }
  function makeScope(source, status, fc, co, oc, reason, prov = []) {
    if (![FULLY, CROSS, OUTSIDE, NO_EVIDENCE, UNAVAILABLE].includes(status)) throw VE('organ experiment scope has an unknown status');
    for (const n of [fc, co, oc]) if (!Number.isInteger(n) || n < 0) throw VE('organ experiment scope counts must be non-negative integers');
    if (status === CROSS && fc !== 0) throw VE('CROSS_BOUNDARY_OVERLAP status contradicts a fully-contained episode');
    if (status === FULLY && fc === 0) throw VE('FULLY_CONTAINED status requires at least one contained episode');
    if (co > 0 && !prov.length) throw VE('any cross-boundary overlap count requires provenance, regardless of the winning status');
    if (co === 0 && status === CROSS) throw VE('CROSS_BOUNDARY_OVERLAP status requires a non-zero overlap count');
    return {source, status, fully_contained_count: fc, cross_boundary_overlap_count: co, outside_window_count: oc, reason, provenance: prov};
  }
  function organScope(source, snapshot, coverage, classifications) {
    const row = coverage[source];
    if (row.status !== AVAILABLE) return makeScope(source, row.status, 0, 0, 0, row.reason);
    const counts = {[FULLY]: 0, [CROSS]: 0, [OUTSIDE]: 0}, overlap = [], noun = source === 'MINE' ? 'MineEvent' : 'CosineEvent';
    for (const [, status, open, close] of classifications) {
      counts[status]++;
      if (status === CROSS) { overlap.push(rawRef(source, open, `earliest raw ${noun} of a boundary-overlapping episode`)); overlap.push(rawRef(source, close, `latest raw ${noun} of a boundary-overlapping episode`)); }
    }
    const [st, reason, refs] = scopeStatus(source, counts, overlap);
    return makeScope(source, st, counts[FULLY], counts[CROSS], counts[OUTSIDE], reason, refs);
  }
  function cosineClassifications(snapshot, start, end) {
    if (snapshot.cosine === null) return [];
    const bounds = episodeBounds(snapshot.cosine.raw_events, (e) => `${e.cosine_session_id || ''}:${e.generation === undefined ? '' : e.generation}`), out = [];
    for (const ep of snapshot.cosine.episodes) {
      if (ep.parent_session_id !== snapshot.parent_session_id) throw AIE('COSINE episode belongs to another session');
      if (!ep.is_closed) continue;
      if (typeof ep.cosine_session_id !== 'string' || !ep.cosine_session_id || !isB(ep.generation)) throw AIE('closed COSINE episode lacks durable identity');
      const span = bounds.get(`${ep.cosine_session_id}:${ep.generation}`); if (!span) throw AIE('closed COSINE episode has no matching raw-event monotonic span');
      out.push([ep, classify(span[0].monotonic_ns, span[1].monotonic_ns, start, end), span[0], span[1]]);
    }
    return out;
  }
  function buildCosineRows(snapshot, coverage, start, end) {
    if (coverage.COSINE.status !== AVAILABLE || snapshot.cosine === null) return [];
    const idx = new Map(snapshot.cosine.display_ids.map(([s, gen, d]) => [JSON.stringify([s, String(gen)]), d])), rows = [];
    for (const [ep, status, open, close] of cosineClassifications(snapshot, start, end)) {
      if (status !== FULLY) continue;
      const id = `${ep.cosine_session_id}:${ep.generation}`, disp = idx.get(JSON.stringify([ep.cosine_session_id, String(ep.generation)])) || '';
      if (!disp) throw VE('COSINE episode row requires an official display episode id');
      if (close.monotonic_ns < open.monotonic_ns) throw VE('COSINE episode row has an inverted monotonic span');
      rows.push({episode_id: id, display_episode_id: disp, starting_platform_key: String(ep.starting_platform_key || ''), starting_platform_label: String(ep.starting_platform_label || ''), user_choice: ep.user_choice, chosen_break_minutes: ep.chosen_break_minutes,
        hopper_count: Number(ep.hopper_count || 0), closure_outcome: ep.closure_outcome, closure_reason: ep.closure_reason, started_at_utc: String(ep.started_at_utc || ''), ended_at_utc: ep.ended_at_utc,
        opening_monotonic_ns: open.monotonic_ns, closing_monotonic_ns: close.monotonic_ns,
        provenance: [rawRef('COSINE', open, "earliest raw CosineEvent in this episode's monotonic span"), rawRef('COSINE', close, "latest raw CosineEvent in this episode's monotonic span")]});
    }
    return sortBy(rows, (r) => [r.opening_monotonic_ns, r.episode_id]);
  }

  /* ---------------- COSECANT break rows, findings, patterns ---------------- */
  const BREAK_FIELDS = {BREAK_STARTED: 'break_started_monotonic_ns', BREAK_COMPLETE: 'break_complete_monotonic_ns', BREAK_ALREADY_OVER: 'break_already_over_monotonic_ns', FINAL_LOCKED: 'final_locked_monotonic_ns', RETURN_CONFIRMED: 'return_confirmed_monotonic_ns'};
  function buildBreakRows(snapshot, coverage, start, end) {
    if (coverage.COSECANT.status !== AVAILABLE) return [];
    const groups = new Map(), order = [];
    for (const r of genericRecords(snapshot.cosecant, 'COSECANT', snapshot.parent_session_id)) {
      const field = BREAK_FIELDS[r.kind]; if (!field) continue;
      const p = payloadOf(r), bid = NS.get(p, 'break_id');
      if (typeof bid !== 'string' || !bid) throw AIE('COSECANT fact lacks durable break identity');
      const ts = NS.has(p, 'effective_monotonic_ns') ? p.effective_monotonic_ns : r.occurred_monotonic_ns;
      if (!isB(ts)) throw AIE('COSECANT effective timestamp is malformed');
      if (!inWindow(ts, start, end)) continue;
      if (!groups.has(bid)) groups.set(bid, {refs: []});
      const entry = groups.get(bid);
      if (NS.has(entry, field)) throw AIE(`duplicate COSECANT ${r.kind} fact for one break`);
      entry[field] = ts; entry.refs.push(ref('COSECANT', r.source_event_id, ts, r.kind, 'effective_monotonic_ns from durable fact payload'));
      if (!order.includes(bid)) order.push(bid);
    }
    const rows = [];
    for (const bid of order) {
      const e = groups.get(bid), get = (k) => (NS.has(e, k) ? e[k] : null), complete = get('break_complete_monotonic_ns'), confirmed = get('return_confirmed_monotonic_ns');
      let lat = null, status, reason;
      if (confirmed === null) { status = UNAVAILABLE; reason = 'no certified RETURN_CONFIRMED fact for this break in this experiment window'; }
      else if (complete === null || confirmed < complete) { status = NOT_APPLICABLE; reason = 'returned before break completion'; }
      else { lat = confirmed - complete; status = AVAILABLE; reason = 'BREAK_COMPLETE to RETURN_CONFIRMED (locked definition)'; }
      rows.push({break_id: bid, break_started_monotonic_ns: get('break_started_monotonic_ns'), break_complete_monotonic_ns: complete, break_already_over_monotonic_ns: get('break_already_over_monotonic_ns'), final_locked_monotonic_ns: get('final_locked_monotonic_ns'),
        return_confirmed_monotonic_ns: confirmed, post_break_return_latency_ns: lat, post_break_return_latency_status: status, post_break_return_latency_reason: reason, provenance: e.refs});
    }
    return sortBy(rows, (r) => [r.break_started_monotonic_ns !== null ? r.break_started_monotonic_ns : -1n, r.break_id]);
  }
  function buildFindings(metrics) {
    const by = Object.fromEntries(metrics.map((m) => [m.code, m])), dur = by.experiment_duration;
    const out = [{code: 'EXPERIMENT_DURATION', scientific_label: 'DERIVED', text: `The selected experiment lasted ${dur.value} nanoseconds.`, provenance: dur.provenance}];
    const v = by.verified_returns;
    if (v.status === AVAILABLE) out.push({code: 'VERIFIED_RETURN_COUNT', scientific_label: 'MEASURED', text: `${v.value} verified returns occurred within the selected experiment.`, provenance: v.provenance});
    for (const m of metrics) if (m.status === UNAVAILABLE) out.push({code: `${m.code.toUpperCase()}_LIMITATION`, scientific_label: 'LIMITATION', text: `${m.label} is unavailable because ${m.reason}.`, provenance: m.provenance});
    return out;
  }
  function buildPatterns(snapshot, metrics, start, end) {
    const by = Object.fromEntries(metrics.map((m) => [m.code, m])), patterns = [], v = by.verified_returns;
    if (v.status === AVAILABLE && Number(v.value || 0) >= 2) patterns.push({code: 'MULTIPLE_VERIFIED_RETURNS', label: 'Multiple verified returns', description: 'At least two factual MIRL verified-return events occurred in the experiment.', provenance: v.provenance});
    const coverage = Object.fromEntries(snapshot.source_coverage.map((r) => [r.source_system, r])), events = mirlEvents(snapshot, coverage), byEp = new Map();
    for (const e of events) if (evName(e) === 'return_verified' && inWindow(evTime(e), start, end)) { const k = String(e.episode_id || ''); if (!byEp.has(k)) byEp.set(k, []); byEp.get(k).push(e); }
    const pairs = [];
    for (const e of events) {
      if (evName(e) !== 'relapse_detected' || !inWindow(evTime(e), start, end)) continue;
      const prior = (byEp.get(String(e.episode_id || '')) || []).filter((c) => evTime(c) < evTime(e));
      if (prior.length) { const latest = sortBy(prior, (c) => [evTime(c), evId(c)]).pop(); pairs.push(mirlRef(latest), mirlRef(e)); }
    }
    if (pairs.length) patterns.push({code: 'RELAPSE_AFTER_VERIFIED_RETURN', label: 'Relapse after verified return', description: 'A factual MIRL relapse followed a verified return in the same episode.', provenance: dedupeRefs(pairs)});
    return patterns;
  }
  function baseLimitations(snapshot, coverage) {
    const items = ['Science Lab analyzes behavioral/software evidence only; it does not directly measure brain state.', 'Science Lab does not directly measure neurotransmitter activity.', ...snapshot.limitations];
    for (const s of Object.keys(coverage).sort(cmpS)) if (coverage[s].status === UNAVAILABLE) items.push(`${s}: unavailable (${coverage[s].reason}).`);
    return dedupe(items);
  }

  /* ---------------- SECANT (secant_adapter.py) ---------------- */
  function recorderReadiness(statuses, runIds = []) {
    if (!statuses.length) return [UNAVAILABLE, 'PENDING / NOT_RECORDED: no final recorder readiness receipt'];
    const gv = (s, k) => (NS.has(s, k) ? s[k] : null);
    if (statuses.some((s) => typeof gv(s, 'run_id') !== 'string' || !gv(s, 'run_id'))) return [UNAVAILABLE, 'Missing recorder identity'];
    if (new Set(statuses.map((s) => s.run_id)).size !== statuses.length) return [UNAVAILABLE, 'Ambiguous recorder status identity'];
    const have = new Set(statuses.map((s) => s.run_id)); if (![...runIds].every((r) => have.has(r))) return [UNAVAILABLE, 'Recorder clock-domain receipt missing'];
    if (statuses.length !== 1) return [UNAVAILABLE, 'Multiple recorder domains for one session'];
    for (const s of statuses) {
      if (!NS.eq(gv(s, 'contract_version'), 1n)) return [UNAVAILABLE, 'Unsupported recorder quality contract'];
      if (gv(s, 'coverage') !== 'BOUNDED_OBSERVATION' || !NS.eq(gv(s, 'dropped'), 0n) || NS.truthy(gv(s, 'gap_reasons'))) return [UNAVAILABLE, 'Recording loss / recorder gap; not a SECANT behavioural evidence_gap'];
      if (gv(s, 'writer_state') !== 'CLOSED' || gv(s, 'final_flush_committed') !== true || !NS.eq(gv(s, 'pending'), 0n) || !NS.truthy(gv(s, 'closed_at_utc'))) return [UNAVAILABLE, 'PENDING: recorder final flush has not been committed'];
    }
    return [AVAILABLE, 'Durable final recorder flush committed'];
  }
  function validateLifecycle(facts) {
    if (!facts.length || facts[0].name !== 'SECANT_EPISODE_FOUNDED' || facts[facts.length - 1].name !== 'SECANT_EPISODE_CLOSED') throw VE('Invalid SECANT lifecycle boundaries');
    if (facts.slice(1).some((b, i) => b.at_ns < facts[i].at_ns)) throw VE('Unordered SECANT chronology');
    const displays = facts.filter((f) => f.name === 'SECANT_DISPLAYED');
    if (!displays.length || displays[0].stage !== 1n || displays[0].at_ns !== facts[0].at_ns) throw VE('Episode founding lacks factual SECANT-1 display');
    if (displays[0].request_id !== facts[0].request_id) throw VE('Founding/display request mismatch');
    const stages = displays.map((f) => f.stage);
    if (stages.slice(1).some((b, i) => b < stages[i] || b > stages[i] + 1n)) throw VE('Invalid displayed-stage chronology');
    const attempts = new Map();
    for (const f of facts) {
      if (f.name === 'SECANT_ACTION_INTENT' && f.reason !== 'RETURN TO STUDY') throw VE('Unsupported return intent');
      if (f.name === 'SECANT_RETURN_STARTED') { if (!f.attempt_id || attempts.has(f.attempt_id)) throw VE('Invalid recovery attempt identity'); attempts.set(f.attempt_id, ['STARTED', f.at_ns]); }
      else if (f.name === 'SECANT_RETURN_VERIFIED' || f.name === 'SECANT_RECOVERY_CLOSED' || f.name === 'SECANT_RECOVERY_INTERRUPTED') {
        const [phase, at] = attempts.get(f.attempt_id) || ['MISSING', -1n];
        if (!(phase === 'STARTED' || phase === 'VERIFIED') || f.at_ns < at) throw VE('Recovery event lacks ordered attempt evidence');
        if (f.name === 'SECANT_RETURN_VERIFIED') { if (phase !== 'STARTED' || f.at_ns - at < 10000000000n) throw VE('Verification lacks supported minimum chronology'); attempts.set(f.attempt_id, ['VERIFIED', f.at_ns]); }
        else if (f.name === 'SECANT_RECOVERY_CLOSED') { if (phase !== 'VERIFIED' || f.at_ns - at < 60000000000n) throw VE('Recovery closure lacks confirmation chronology'); attempts.set(f.attempt_id, ['CLOSED', f.at_ns]); }
        else attempts.set(f.attempt_id, ['INTERRUPTED', f.at_ns]);
      }
    }
    const recovered = facts.filter((f) => f.name === 'SECANT_RECOVERY_CLOSED'), last = facts[facts.length - 1];
    if (last.reason === 'recovered') { if (recovered.length !== 1 || recovered[0].at_ns !== last.at_ns) throw VE('Recovered terminal lacks factual recovery closure'); }
    else if (recovered.length) throw VE('Recovery closure conflicts with terminal reason');
  }
  const gget = (row, k) => { if (!NS.has(row, k)) throw NS.KeyErr(k); return row[k]; };
  function certifySource(snapshot, statuses) {
    const sid = snapshot.session_id, table = snapshot.tables.secant_events;
    if (!table || table.status !== AVAILABLE) return {session_id: sid, status: UNAVAILABLE, reason: 'SECANT source NOT_RECORDED or unreadable', episodes: [], fact_refs: []};
    const raw = table.rows;
    const refs = raw.filter((r) => typeof r.event_id === 'string' && r.event_id && typeof r.event_name === 'string' && r.event_name && isB(r.occurred_monotonic_ns) && r.occurred_monotonic_ns >= 0n).map((r) => [r.event_id, r.occurred_monotonic_ns, r.event_name]);
    const runIds = new Set(raw.map((r) => (NS.has(r, 'recorder_run_id') ? r.recorder_run_id : null)));
    let [status, reason] = recorderReadiness(statuses, runIds);
    if (status !== AVAILABLE) return {session_id: sid, status, reason, episodes: [], fact_refs: refs};
    if (statuses.some((r) => !NS.get(r, 'attached_session_ids', []).some((x) => x === sid))) return {session_id: sid, status: UNAVAILABLE, reason: 'Recorder receipt belongs to another session', episodes: [], fact_refs: refs};
    if (!raw.length) return {session_id: sid, status: NO_EVIDENCE, reason: 'Finalized readable SECANT source has no recorded episodes', episodes: [], fact_refs: []};
    try {
      for (const r of raw) {
        if (gget(r, 'recording_quality') !== 'BOUNDED_OBSERVATION') throw VE('Recording loss / recorder gap');
        const fact = [1n, gget(r, 'session_id'), gget(r, 'study_context_id'), gget(r, 'study_target_resource_id'), gget(r, 'episode_id'), gget(r, 'event_name'), gget(r, 'stage'), gget(r, 'occurred_monotonic_ns'), gget(r, 'request_id'), gget(r, 'attempt_id'), gget(r, 'evidence_id'), gget(r, 'reason')];
        const canonical = P.canonical(fact);
        if (r.canonical_fact_json !== canonical || r.fact_digest !== P.digest(canonical) || r.event_id !== P.digest(P.canonical(['secant-event-v1', fact, gget(r, 'occurrence_ordinal')]))) throw VE('Durable SECANT identity/content mismatch');
        if (!String(r.study_context_id).startsWith(String(sid) + ':')) throw VE('Study context belongs to another session');
      }
      const episodes = [];
      for (const ep of P.projectSecant(snapshot)) {
        if (ep.status !== AVAILABLE) throw VE(ep.diagnostic);
        if (ep.founded === null || ep.closed === null) throw VE('INCOMPLETE: founding or episode closure missing; last event is not closure');
        if (new Set(ep.events.map((r) => r.study_target_resource_id)).size !== 1) throw VE('Study target changed inside native episode');
        const facts = ep.events.map((r) => ({event_id: r.event_id, name: r.event_name, at_ns: r.occurred_monotonic_ns, stage: r.stage, request_id: r.request_id, attempt_id: r.attempt_id, reason: r.reason}));
        validateLifecycle(facts);
        let srcStatus = ep.source_status, src = ep.source;
        if (srcStatus === AVAILABLE) {
          try {
            const stored = snapshot.tables.secant_founding_source.rows.find((r) => r.event_id === ep.founded.event_id);
            if (!stored) throw VE('no founding source');
            const payload = NS.pyjson.loads(stored.source_evidence_json), core = NS.dict(); for (const k of Object.keys(payload)) core[k] = payload[k];
            delete core.display_metadata; core.resource = NS.contracts.exactResource(core.resource);
            const founding = NS.contracts.foundingSource(core);
            if (founding.meaning !== 'OFF_TASK' || founding.observed_monotonic_ns > ep.founded.occurred_monotonic_ns || !(founding.territory !== 'ORDINARY' || founding.confirmed_off_task || founding.certified_ott)) throw VE('Invalid founding observation');
          } catch (e) { if (e instanceof PyError || e instanceof PyErr || e instanceof TypeError) { srcStatus = UNAVAILABLE; src = NS.dict(); } else throw e; }
        }
        let title = 'NOT_RECORDED', titleStatus = 'NOT_RECORDED';
        if (srcStatus === AVAILABLE && NS.get(src, 'display_metadata') !== null && NS.has(src, 'display_metadata')) {
          try {
            const meta = NS.contracts.validateDisplayMetadata(src.display_metadata, {observation_id: src.display_observation_id, observed_ns: src.display_observed_ns});
            if (meta !== null) { title = NS.contracts.resourceTitle(src, src.display_metadata, {observation_id: src.display_observation_id, observed_ns: src.display_observed_ns}); titleStatus = AVAILABLE; }
          } catch (e) { if (e instanceof PyError) { titleStatus = UNAVAILABLE; title = 'UNAVAILABLE: invalid recorded display metadata'; } else throw e; }
        }
        episodes.push({session_id: sid, context_id: ep.identity[1], episode_id: ep.identity[2], recorder_run_id: ep.events[0].recorder_run_id, display_alias: ep.display_episode_id, source_status: srcStatus, founding_source: String(NS.has(src, 'key') ? src.key : srcStatus),
          caption_status: titleStatus, founding_caption: title, events: facts});
      }
      return {session_id: sid, status: AVAILABLE, reason: 'Complete durable SECANT lifecycles; window classification required', episodes, fact_refs: refs};
    } catch (e) {
      if (e instanceof PyErr || e instanceof PyError || e instanceof TypeError) return {session_id: sid, status: UNAVAILABLE, reason: errMsg(e), episodes: [], fact_refs: refs};
      throw e;
    }
  }
  const secOpen = (e) => e.events[0].at_ns, secClose = (e) => e.events[e.events.length - 1].at_ns;
  function secantClassify(source, start, end) {
    if (!isB(start) || !isB(end) || end <= start) throw VE('Invalid experiment window');
    const refs = source.fact_refs.filter(([id]) => id).map(([id, at, name]) => ref('SECANT', id, at, name));
    if (source.status !== AVAILABLE) return [[], makeScope('SECANT', source.status, 0, 0, 0, source.reason, refs)];
    const contained = []; let overlap = 0, outside = 0;
    for (const ep of source.episodes) { if (start <= secOpen(ep) && secClose(ep) < end) contained.push(ep); else if (secClose(ep) < start || secOpen(ep) >= end) outside++; else overlap++; }
    const status = contained.length ? FULLY : overlap ? CROSS : outside ? OUTSIDE : NO_EVIDENCE;
    return [contained, makeScope('SECANT', status, contained.length, overlap, outside, `${contained.length} contained; ${overlap} overlapping excluded; ${outside} outside experiment`, refs)];
  }
  function secantValidateRows(rows, scope, sid, start, end) {
    if (scope === null) { if (rows.length) throw VE('SECANT rows lack experiment scope'); return; }
    if (scope.source !== 'SECANT' || scope.fully_contained_count !== rows.length) throw VE('SECANT scope count mismatch');
    if (rows.length && scope.status !== FULLY) throw VE('SECANT rows lack contained certification');
    const identities = new Set();
    for (const row of rows) {
      if (row.session_id !== sid) throw VE('SECANT row session/type mismatch');
      validateLifecycle(row.events);
      if (!(start <= secOpen(row) && secOpen(row) <= secClose(row) && secClose(row) < end)) throw VE('SECANT episode crosses experiment boundary');
      const key = JSON.stringify([row.context_id, row.episode_id]); if (identities.has(key)) throw VE('Duplicate SECANT episode'); identities.add(key);
      const actual = new Set(scope.provenance.filter((r) => r.source === 'SECANT').map((r) => JSON.stringify([r.durable_id, String(r.occurred_monotonic_ns), r.event_kind])));
      if (!row.events.every((f) => actual.has(JSON.stringify([f.event_id, String(f.at_ns), f.name])))) throw VE('SECANT rows lost native provenance');
    }
  }

  /* ---------------- the analysis itself ---------------- */
  function collectProvenance(experimentRef, parts) {
    const refs = [experimentRef];
    for (const p of parts) refs.push(...p);
    const seen = new Map(); for (const r of refs) seen.set(refKey(r), r);
    return sortBy([...seen.values()], (r) => [r.source, r.durable_id, r.occurred_monotonic_ns === null ? -1n : r.occurred_monotonic_ns, r.event_kind, r.note]);
  }
  function analyze(finalized, experiments) {
    const sid = finalized.parent_session_id;
    if (!isB(sid) || sid <= 0n) throw AIE('finalized parent session identity is invalid');
    const snapshot = finalized.evidence_snapshot;
    if (!snapshot || typeof snapshot !== 'object') throw AIE('finalized evidence snapshot type is invalid');
    if (snapshot.parent_session_id !== sid) throw AIE('finalized snapshot belongs to another session');
    if (typeof finalized.finalized_at_utc !== 'string' || !finalized.finalized_at_utc) throw AIE('session finalization time is missing');
    const coverage = coverageBySource(snapshot.source_coverage);
    validateSnapshotEvidence(snapshot, coverage);
    const whole = buildWhole(snapshot, coverage), baseLim = baseLimitations(snapshot, coverage);
    const completed = experiments.filter((x) => x.parent_session_id === sid && x.status === 'COMPLETED' && x.ended_monotonic_ns !== null);
    if (!completed.length) return {status: NO_COMPLETED, package: null, reason: 'no completed Science Lab experiment exists for the finalized session', source_coverage: snapshot.source_coverage, whole_myelin_summary: whole,
      limitations: dedupe([...baseLim, 'No completed Science Lab experiment is available for analysis.'])};
    const selected = sortBy(completed, (x) => [x.started_monotonic_ns, x.experiment_id]).pop(), start = selected.started_monotonic_ns, end = selected.ended_monotonic_ns;
    validateWindow(start, end);
    if (!selected.experiment_id || !selected.started_at_utc || !selected.ended_at_utc) throw AIE('selected completed experiment identity is incomplete');
    let timeline = buildTimeline(snapshot, start, end);
    const metrics = buildMetrics(snapshot, coverage, selected, start, end), extrema = returnExtrema(snapshot, coverage, start, end);
    const findings = buildFindings(metrics), patterns = buildPatterns(snapshot, metrics, start, end);
    const sineRows = buildSineStageRows(snapshot, coverage, start, end), mineRows = buildMineRows(snapshot, coverage, start, end), cosineRows = buildCosineRows(snapshot, coverage, start, end), breakRows = buildBreakRows(snapshot, coverage, start, end);
    const mineScope = organScope('MINE', snapshot, coverage, mineClassifications(snapshot, start, end)), cosineScope = organScope('COSINE', snapshot, coverage, cosineClassifications(snapshot, start, end));
    const [secantRows, secantScope] = secantClassify(snapshot.secant, start, end);
    secantValidateRows(secantRows, secantScope, sid, start, end);
    const secTimeline = [];
    for (const ep of secantRows) for (const ev of ep.events) {
      const stage = {SECANT_EPISODE_FOUNDED: 'TRIGGER', SECANT_DISPLAYED: 'TRIGGER', SECANT_ACTION_INTENT: 'RETURN', SECANT_RETURN_STARTED: 'RETURN', SECANT_RETURN_VERIFIED: 'VERIFIED_RETURN', SECANT_RECOVERY_CLOSED: 'EPISODE_CLOSURE', SECANT_EPISODE_CLOSED: 'EPISODE_CLOSURE'}[ev.name] || 'RETURN';
      const r = ref('SECANT', ev.event_id, ev.at_ns, ev.name, 'Fully contained SECANT episode; ' + ep.recorder_run_id);
      let label = `${ep.display_alias}: ${ev.name.replace(/^SECANT_/, '').replaceAll('_', ' ')}`;
      if (ev.name === 'SECANT_DISPLAYED') label += ` SECANT-${ev.stage}`;
      if (ev.reason) label += ' — ' + ev.reason;
      secTimeline.push({source: 'SECANT', stage, occurred_monotonic_ns: ev.at_ns, label, durable_id: ev.event_id, lane: MAIN, provenance: [r]});
    }
    timeline = sortBy([...timeline, ...secTimeline], (e) => [e.occurred_monotonic_ns]);
    const displayIds = resolveDisplayCodes(snapshot, coverage, sineRows, extrema);
    const limitations = dedupe([...baseLim, 'SECANT experiment scope: ' + secantScope.reason, 'The selected experiment may cover only part of its parent MYELIN session.', ...metrics.filter((m) => m.status === UNAVAILABLE).map((m) => `${m.label}: ${m.reason}`),
      ...(extrema.eligible_sample_count === 0 ? [`Best successful-return-onset latency: ${extrema.best_successful_return_onset_latency.reason}`, `Worst successful-return-onset latency: ${extrema.worst_successful_return_onset_latency.reason}`] : [])]);
    const experimentRef = ref('SCIENCE_LAB_EXPERIMENT', selected.experiment_id, start, 'COMPLETED_EXPERIMENT_WINDOW', 'Exact durable [start,end) experiment boundary.');
    let provenance = collectProvenance(experimentRef, [timeline.flatMap((x) => x.provenance), metrics.flatMap((x) => x.provenance), metrics.flatMap((x) => x.samples.flatMap((s) => s.provenance)), whole.flatMap((x) => x.provenance), findings.flatMap((x) => x.provenance),
      patterns.flatMap((x) => x.provenance), extrema.samples.flatMap((s) => s.supporting_event_chain), sineRows.flatMap((x) => x.provenance), mineRows.flatMap((x) => x.provenance), cosineRows.flatMap((x) => x.provenance), breakRows.flatMap((x) => x.provenance), mineScope.provenance, cosineScope.provenance]);
    provenance = dedupeRefs([...provenance, ...secantScope.provenance]);
    const pkg = {experiment_id: selected.experiment_id, parent_session_id: sid, experiment_started_at_utc: selected.started_at_utc, experiment_ended_at_utc: selected.ended_at_utc, experiment_start_monotonic_ns: start, experiment_end_monotonic_ns: end,
      session_finalized_at_utc: finalized.finalized_at_utc, source_coverage: Object.values(coverage), timeline, key_metrics: metrics, whole_myelin_summary: whole, derived_findings: findings, certified_patterns: patterns, secant_episode_rows: secantRows, secant_experiment_scope: secantScope,
      sine_stage_rows: sineRows, mine_episode_rows: mineRows, cosine_episode_rows: cosineRows, cosecant_break_rows: breakRows, mine_experiment_scope: mineScope, cosine_experiment_scope: cosineScope, limitations, provenance, analysis_status: CERTIFIED,
      successful_return_onset_latency_extrema: extrema, sine_episode_display_ids: displayIds};
    validatePackage(pkg, selected);
    return {status: CERTIFIED, package: pkg, reason: 'certified Chapter 3 result package is ready', source_coverage: pkg.source_coverage, whole_myelin_summary: pkg.whole_myelin_summary, limitations: pkg.limitations};
  }
  function validatePackage(pkg, selected) {
    if (pkg.analysis_status !== CERTIFIED) throw AIE('package is not marked CERTIFIED');
    if (selected.status !== 'COMPLETED' || selected.ended_monotonic_ns === null) throw AIE('selected experiment is not factually completed');
    if (pkg.experiment_id !== selected.experiment_id || pkg.parent_session_id !== selected.parent_session_id || pkg.experiment_start_monotonic_ns !== selected.started_monotonic_ns || pkg.experiment_end_monotonic_ns !== selected.ended_monotonic_ns
      || pkg.experiment_started_at_utc !== selected.started_at_utc || pkg.experiment_ended_at_utc !== selected.ended_at_utc) throw AIE('package experiment identity changed');
    const s = pkg.experiment_start_monotonic_ns, e = pkg.experiment_end_monotonic_ns; validateWindow(s, e);
    const seenT = new Set();
    for (const ev of pkg.timeline) { if (!inWindow(ev.occurred_monotonic_ns, s, e)) throw AIE('timeline event escaped experiment window'); const k = JSON.stringify([ev.source, ev.durable_id, ev.stage]); if (seenT.has(k)) throw AIE('timeline contains duplicate identity/stage'); seenT.add(k); }
    if (pkg.key_metrics.map((m) => m.code).join('|') !== METRIC_ROSTER.map((x) => x[0]).join('|')) throw AIE('metric roster changed');
    for (const m of pkg.key_metrics) { validateValue(m.status, m.value); if (m.code === 'experiment_duration' && (m.value !== e - s || m.value < 0n)) throw AIE('experiment duration is inconsistent'); }
    if (pkg.whole_myelin_summary.map((r) => r.source).join('|') !== WHOLE_ROSTER.map((x) => x[0]).join('|')) throw AIE('Whole-MYELIN roster changed');
    const cov = coverageBySource(pkg.source_coverage);
    for (const [source, row] of Object.entries(cov)) if (row.status === UNAVAILABLE && !pkg.limitations.some((l) => l.includes(source))) throw AIE('unavailable source limitation was dropped');
    for (const m of pkg.key_metrics) if (m.status === UNAVAILABLE && !pkg.limitations.some((l) => l.includes(m.reason))) throw AIE('unavailable metric limitation was dropped');
    const x = pkg.successful_return_onset_latency_extrema;
    if (x.experiment_start_monotonic_ns !== s || x.experiment_end_monotonic_ns !== e) throw AIE('return-onset extrema escaped experiment scope');
    for (const smp of x.samples) if (smp.supporting_event_chain.some((r) => !inWindow(r.occurred_monotonic_ns, s, e))) throw AIE('return-onset evidence escaped experiment window');
    const stageKeys = new Set();
    for (const r of pkg.sine_stage_rows) { if (!inWindow(r.display_monotonic_ns, s, e)) throw AIE('SINE stage row escaped experiment window'); const k = JSON.stringify([r.episode_id, r.stage, r.popup_request_id]); if (stageKeys.has(k)) throw AIE('SINE stage row contains duplicate identity'); stageKeys.add(k); }
    for (const [label, rows] of [['MINE', pkg.mine_episode_rows], ['COSINE', pkg.cosine_episode_rows]]) {
      const ids = new Set();
      for (const r of rows) { if (!(s <= r.opening_monotonic_ns && r.closing_monotonic_ns < e)) throw AIE(`${label} episode row escaped experiment window`); if (ids.has(r.episode_id)) throw AIE(`${label} episode row contains duplicate identity`); ids.add(r.episode_id); }
    }
    const breakIds = new Set();
    for (const r of pkg.cosecant_break_rows) {
      for (const c of [r.break_started_monotonic_ns, r.break_complete_monotonic_ns, r.break_already_over_monotonic_ns, r.final_locked_monotonic_ns, r.return_confirmed_monotonic_ns]) if (c !== null && !inWindow(c, s, e)) throw AIE('COSECANT break row escaped experiment window');
      if (breakIds.has(r.break_id)) throw AIE('COSECANT break row contains duplicate identity'); breakIds.add(r.break_id);
    }
    for (const [source, scope, rows] of [['MINE', pkg.mine_experiment_scope, pkg.mine_episode_rows], ['COSINE', pkg.cosine_experiment_scope, pkg.cosine_episode_rows]]) {
      if (!scope || scope.source !== source) throw AIE(`${source} experiment scope is missing or mislabeled`);
      if (scope.status === FULLY && !rows.length) throw AIE(`${source} experiment scope claims FULLY_CONTAINED with no rows`);
      if (scope.status !== FULLY && rows.length) throw AIE(`${source} experiment scope contradicts its own quantitative rows`);
      if (scope.fully_contained_count !== rows.length) throw AIE(`${source} experiment scope's fully_contained_count disagrees with its rows`);
      if (scope.status === CROSS && !scope.provenance.length) throw AIE(`${source} CROSS_BOUNDARY_OVERLAP scope requires provenance`);
      if (scope.cross_boundary_overlap_count > 0 && !scope.provenance.length) throw AIE(`${source} scope has overlapping episodes but lost their provenance`);
    }
  }
  /** analyze_finalized_session: never raises; any internal failure is an ANALYSIS_UNAVAILABLE outcome with the exception name and a bounded message. */
  function analyzeFinalized(finalized, experiments) {
    try { return analyze(finalized, experiments); }
    catch (e) {
      if (!(e instanceof PyErr) && !(e instanceof PyError) && !(e && e.pyName)) throw e;
      const msg = errMsg(e).split(/\s+/).filter(Boolean).join(' ').slice(0, 240) || errName(e), snap = finalized.evidence_snapshot, cov = (snap && snap.source_coverage) || [];
      return {status: ANALYSIS_UNAVAILABLE, package: null, reason: `${errName(e)}: ${msg}`, source_coverage: cov, whole_myelin_summary: [], limitations: [`Chapter 3 analysis could not certify the finalized evidence: ${errName(e)}.`]};
    }
  }

  /* ---------------- evidence gathering (evidence.py gather_session_evidence) ---------------- */
  const SRC_SQL = {
    sine: ['SINE', 'sine_facts', 'SELECT id, session_id, kind, occurred_monotonic_ns, payload_json, created_at_utc FROM "sine_facts" ORDER BY occurred_monotonic_ns, id LIMIT ?', 'sine_facts:'],
    normal_break: ['NORMAL_BREAK', 'normal_break_events', 'SELECT event_id AS id, session_id, kind, occurred_monotonic_ns, payload_json, created_at_utc FROM "normal_break_events" ORDER BY occurred_monotonic_ns, event_id LIMIT ?', ''],
    study: ['STUDY', 'study_events', 'SELECT id, session_id, action AS kind, occurred_monotonic_ns, payload_json, created_at_utc FROM "study_events" ORDER BY occurred_monotonic_ns, id LIMIT ?', 'study_events:'],
    cosecant: ['COSECANT', 'cosecant_events', 'SELECT id, session_id, kind, occurred_monotonic_ns, payload_json, created_at_utc FROM "cosecant_events" ORDER BY occurred_monotonic_ns, id LIMIT ?', 'cosecant_events:']
  };
  function cosineDisplayIds(episodes) {
    const byDate = new Map();
    for (const ep of episodes) {
      let us; try { us = NS.time.parseUtc(ep.started_at_utc); } catch (e) { if (e instanceof PyError) continue; throw e; }
      const lp = O.localParts(us, 'UTC'), key = `${String(lp.d).padStart(2, '0')}${String(lp.mo).padStart(2, '0')}${String(lp.y).padStart(4, '0')}`;
      if (!byDate.has(key)) byDate.set(key, []); byDate.get(key).push([us, ep]);
    }
    const out = new Map();
    for (const [key, list] of byDate) { sortBy(list, (x) => [x[0], x[1].cosine_session_id, x[1].generation]).forEach(([, ep], i) => out.set(JSON.stringify([ep.cosine_session_id, String(ep.generation)]), `COS-${key}-${String(i + 1).padStart(2, '0')}`)); }
    return out;
  }
  function gather(ctx, sid, snapshotOf) {
    const coverage = [], limitations = [], zone = ctx.zone;
    // the analytics bundle: MIRL (whole snapshot), MINE and COSINE projections; a MIRL failure fails the whole gather exactly as read_control_station_analytics does
    const mirl = O.readMirl(Object.assign({}, ctx, {keepEvents: true}));
    let mineProj = null, mineEvents = [], cosProj = null, cosEvents = [], mineErr = false, cosErr = false;
    try { mineEvents = ctx.rows(`SELECT event_id, session_id, mine_episode_id, generation, sequence, event_name, event_class, occurred_at_utc, monotonic_ns, platform_key, platform_label, request_id, evidence_token, payload_json, schema_version FROM "mine_events" ORDER BY session_id, generation, sequence, event_id LIMIT ?`).map(O.mineEvent); mineProj = O.readMine({zone, events: mineEvents}); }
    catch (e) { if (!(e instanceof PyError)) throw e; mineErr = true; }
    try { cosEvents = ctx.rows(`SELECT event_id, session_id, cosine_session_id, generation, sequence, event_name, event_class, occurred_at_utc, monotonic_ns, platform_key, content_title, request_id, evidence_token, payload_json, schema_version FROM "cosine_events" ORDER BY cosine_session_id, generation, sequence, event_id LIMIT ?`).map(O.cosineEvent); cosProj = O.readCosine({zone, events: cosEvents}); }
    catch (e) { if (!(e instanceof PyError)) throw e; cosErr = true; }
    const factSource = (key) => {
      const [name, table, sql, prefix] = SRC_SQL[key];
      let records;
      try {
        records = ctx.rows(sql).filter((r) => r.session_id === sid).map((r) => ({source_system: name, source_event_id: prefix + String(r.id), session_id: r.session_id, kind: O.pyStrOf(r.kind), occurred_monotonic_ns: r.occurred_monotonic_ns, payload_json: O.pyStrOf(r.payload_json), created_at_utc: O.pyStrOf(r.created_at_utc)}));
      } catch (e) {
        if (!(e instanceof PyError)) throw e;
        const reason = `read_error:${e.kind}`; coverage.push({source_system: name, status: UNAVAILABLE, reason, item_count: null}); limitations.push(`${name}: unavailable (${reason}) for this snapshot.`); return null;
      }
      coverage.push({source_system: name, status: records.length ? AVAILABLE : NO_EVIDENCE, reason: '', item_count: records.length});
      return {session_id: sid, records};
    };
    const sine = factSource('sine'), normalBreak = factSource('normal_break');
    let mine = null;
    if (mineProj !== null && mineProj.available) {
      const matched = mineProj.episodes.filter((ep) => ep.session_id === sid), raw = mineEvents.filter((e) => e.parent_session_id === sid).map((e) => Object.assign({}, e, {monotonic_ns: e.monotonic_ns}));
      mine = {session_id: sid, episodes: matched, raw_events: raw};
      coverage.push({source_system: 'MINE', status: matched.length ? AVAILABLE : NO_EVIDENCE, reason: '', item_count: matched.length});
    } else { const reason = mineErr ? 'read_error' : 'projection_unavailable'; coverage.push({source_system: 'MINE', status: UNAVAILABLE, reason, item_count: null}); limitations.push(`MINE: unavailable (${reason}) for this snapshot.`); }
    let cosine = null;
    if (cosProj !== null && cosProj.available) {
      const all = cosProj.episodes, ids = cosineDisplayIds(all), matched = all.filter((ep) => ep.parent_session_id === sid);
      const display = matched.map((ep) => [String(ep.cosine_session_id), ep.generation, ids.get(JSON.stringify([ep.cosine_session_id, String(ep.generation)])) || '']);
      cosine = {session_id: sid, episodes: matched, raw_events: cosEvents.filter((e) => e.session_id === sid), display_ids: display};
      coverage.push({source_system: 'COSINE', status: matched.length ? AVAILABLE : NO_EVIDENCE, reason: '', item_count: matched.length});
    } else { const reason = cosErr ? 'read_error' : 'projection_unavailable'; coverage.push({source_system: 'COSINE', status: UNAVAILABLE, reason, item_count: null}); limitations.push(`COSINE: unavailable (${reason}) for this snapshot.`); }
    const events = mirl._events.filter((e) => e.session_id === sid);
    const liveRows = (mirl.active_episodes.concat(mirl.recently_closed_episodes)).filter((r) => r.session_id === sid);
    coverage.push({source_system: 'MIRL', status: events.length ? AVAILABLE : NO_EVIDENCE, reason: '', item_count: events.length});
    const mirlEv = {session_id: sid, events, live_mirl_rows: liveRows};
    const study = factSource('study'), cosecant = factSource('cosecant');
    const secant = readSecant(ctx, sid, snapshotOf);
    coverage.push({source_system: 'SECANT', status: secant.status, reason: secant.reason, item_count: secant.status !== UNAVAILABLE ? secant.episodes.length : null});
    if (secant.status === UNAVAILABLE) limitations.push('SECANT: ' + secant.reason);
    coverage.push({source_system: 'RESOURCE_INTENT', status: UNAVAILABLE, reason: 'no_durable_event_identity', item_count: null});
    limitations.push('RESOURCE_INTENT: unavailable (no_durable_event_identity) until a complete durable Resource Intent evidence contract is approved.');
    return {parent_session_id: sid, generated_at_utc: '', source_coverage: coverage, secant, sine, normal_break: normalBreak, mine, cosine, mirl: mirlEv, study, cosecant, resource_intent: null, limitations};
  }
  function readSecant(ctx, sid, snapshotOf) {
    try {
      const statuses = [];
      for (const [key, text] of ctx.receipts()) {
        const status = NS.pyjson.loads(text);
        if (NS.get(status, 'attached_session_ids', []).some((x) => x === sid)) {
          if (key !== 'passive_recorder:v1:run:' + O.pyStrOf(NS.get(status, 'run_id', ''))) throw VE('Recorder identity mismatch');
          statuses.push(status);
        }
      }
      const [st, reason] = recorderReadiness(statuses);
      if (st !== AVAILABLE) return {session_id: sid, status: st, reason, episodes: [], fact_refs: []};
      const snapshot = snapshotOf(sid);
      if (!snapshot) return {session_id: sid, status: UNAVAILABLE, reason: 'SECANT read unavailable: KeyError', episodes: [], fact_refs: []};
      return certifySource(snapshot, statuses);
    } catch (e) {
      if (e instanceof PyErr || e instanceof PyError || e instanceof TypeError) return {session_id: sid, status: UNAVAILABLE, reason: `SECANT read unavailable: ${errName(e)}`, episodes: [], fact_refs: []};
      throw e;
    }
  }

  /* ---------------- history.reconstruct_historical_experiment ---------------- */
  function reconstruct(ctx, experimentId, snapshotOf) {
    const out = (status, pkg, reason) => ({status, experiment_id: String(experimentId), package: pkg, reason});
    if (typeof experimentId !== 'string' || !NS.strip(experimentId)) return out(UNAVAILABLE, null, 'no experiment id was given');
    let selected = null;
    try {
      if (experimentId !== NS.strip(experimentId)) throw VE('experiment_id must not contain surrounding whitespace');
      const row = ctx.rows('SELECT * FROM "science_lab_experiments" ORDER BY created_at_utc DESC, experiment_id DESC LIMIT ?').find((r) => r.experiment_id === experimentId);
      selected = row ? MH.expRecord(row) : null;
    } catch (e) { if (e instanceof PyError || e instanceof PyErr) return out(UNAVAILABLE, null, `could not read the durable experiment record: ${errName(e)}`); throw e; }
    if (selected === null) return out(UNAVAILABLE, null, 'no durable experiment record exists with this exact id');
    if (selected.status !== 'COMPLETED') return out(UNAVAILABLE, null, `experiment status is ${selected.status}, not COMPLETED`);
    if (selected.ended_monotonic_ns === null || selected.ended_at_utc === null) return out(UNAVAILABLE, null, 'completed experiment is missing its durable end boundary');
    let finalizedAt;
    try {
      const r = ctx.rows('SELECT id, closed_at_utc FROM "sessions" ORDER BY id LIMIT ?').find((x) => x.id === selected.parent_session_id);
      finalizedAt = !r || r.closed_at_utc === null ? null : O.pyStrOf(r.closed_at_utc);
    } catch (e) { if (e instanceof PyError) return out(UNAVAILABLE, null, `could not read the parent session's closure record: ${errName(e)}`); throw e; }
    if (!finalizedAt) return out(UNAVAILABLE, null, "the parent MYELIN session has no durable closure timestamp; historical reconstruction requires an authoritative finalization time and will not invent one");
    let snapshot;
    try { snapshot = gather(ctx, selected.parent_session_id, snapshotOf); }
    catch (e) { if (e instanceof PyError || e instanceof PyErr) return out(UNAVAILABLE, null, `evidence snapshot read failed: ${errName(e)}`); throw e; }
    const outcome = analyzeFinalized({parent_session_id: selected.parent_session_id, evidence_snapshot: snapshot, completed_experiment_id: selected.experiment_id, finalized_at_utc: finalizedAt}, [selected]);
    if (outcome.status !== CERTIFIED || outcome.package === null) return out(UNAVAILABLE, null, outcome.reason || `analysis outcome was ${outcome.status}`);
    const pkg = outcome.package;
    if (pkg.experiment_id !== selected.experiment_id) return out(UNAVAILABLE, null, 'reconstructed package experiment id does not match the selected experiment');
    if (pkg.parent_session_id !== selected.parent_session_id) return out(UNAVAILABLE, null, 'reconstructed package session does not match the selected experiment');
    if (pkg.experiment_start_monotonic_ns !== selected.started_monotonic_ns || pkg.experiment_end_monotonic_ns !== selected.ended_monotonic_ns) return out(UNAVAILABLE, null, "reconstructed package window does not match the selected experiment's durable bounds");
    return out(CERTIFIED, pkg, 'reconstructed and certified from durable evidence');
  }

  NS.sciencelab = {reconstruct, analyzeFinalized, gather};
})(self);
