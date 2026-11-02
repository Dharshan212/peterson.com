// Port of SECANT/dashboard_projection.py -- the PURE durable-fact layer (no display text): project_secant, recorder_quality, project_study, project_cosecant
// and their validators. Rules are translated statement by statement from the desktop source; the comments quote the desktop's own error messages.
// Value model: see pycompat.js (ints are BigInt). A snapshot is {session_id, tables:{name:{rows,status,diagnostic}}, recorder_receipts}.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB;
  const {ValueError, TypeErr, KeyErr, dict, isDict, isInt, isStr, has, eq, truthy, str, attempt, CAUGHT, CAUGHT4, sortedBy, cmp, lt, le, gt, ge, add, sub, item: at, get} = NS;
  const C = NS.contracts, E = NS.evidence;
  const ZERO = 0n, NS_PER_S = 1000000000n;

  const EVENT_ORDER = {SECANT_EPISODE_FOUNDED: 0, SECANT_DISPLAYED: 1, SECANT_ACTION_INTENT: 2, SECANT_FROZEN: 3, SECANT_RESUMED: 4, SECANT_RETURN_STARTED: 5,
    SECANT_RETURN_VERIFIED: 6, SECANT_RECOVERY_INTERRUPTED: 7, SECANT_RECOVERY_CLOSED: 8, SECANT_EPISODE_CLOSED: 9};
  const isOrderName = (n) => isStr(n) && has(EVENT_ORDER, n);
  const canonical = (v) => NS.pyjson.dumps(v, {ensureAscii: false, compact: true});
  const digest = (text) => NS.sha256Hex(text);
  const rows = (snapshot, name) => snapshot.tables[name].rows;
  const object = (value) => {                                   // _object
    const r = NS.pyjson.loads(value);
    if (!isDict(r)) throw ValueError('Expected evidence object');
    return r;
  };
  /** _scope(row) -> (session_id, study_block_id, study_generation, study_context_token) with None for absent keys. */
  const scope = (row) => ['session_id', 'study_block_id', 'study_generation', 'study_context_token'].map((k) => get(row, k));
  const eqList = (a, b) => NS.eq(a, b);
  const nonEmptyStr = (v) => isStr(v) && NS.strip(v) !== '';
  const needInt = (v, msg) => { if (!isInt(v)) throw ValueError(msg); return v; };

  /* ---------------- SECANT clock / immutable fact / lifecycle ---------------- */
  function secantOccurredAt(row) {                               // secant_occurred_at
    const occurred = at(row, 'occurred_monotonic_ns'), received = at(row, 'recorder_received_monotonic_ns');
    if (!isInt(occurred) || !isInt(received) || !(occurred >= 0n && occurred <= received) || !truthy(at(row, 'recorder_run_id'))) throw ValueError('Invalid SECANT occurrence clock pair');
    const base = NS.time.parseUtc(at(row, 'recorder_received_at_utc')), lag = (received - occurred + 999n) / 1000n;
    return NS.time.isoZ(base - lag);
  }
  function secantEventClock(row) {                               // secant_event_clock
    if (!['recorder_received_monotonic_ns', 'recorder_received_at_utc'].some((k) => has(row, k))) { NS.time.parseUtc(at(row, 'recorded_at_utc')); return ['RECORDED AT', row.recorded_at_utc]; }
    return ['OCCURRED AT', secantOccurredAt(row)];
  }
  function validateSecantFact(row) {                             // _validate_secant_fact
    for (const f of ['session_id', 'occurrence_ordinal']) { const v = at(row, f); if (!isInt(v) || v <= 0n) throw ValueError('Invalid SECANT integer identity'); }
    const cv = at(row, 'contract_version');
    if (!isInt(cv) || cv !== 1n) throw ValueError('Unsupported SECANT contract');
    for (const f of ['study_context_id', 'study_target_resource_id', 'episode_id', 'recorder_run_id']) { if (!nonEmptyStr(at(row, f))) throw ValueError('Missing SECANT identity'); }
    for (const f of ['request_id', 'attempt_id', 'evidence_id', 'reason']) { if (!isStr(at(row, f))) throw ValueError('Invalid SECANT fact field'); }
    if (!row.study_context_id.startsWith(String(row.session_id) + ':')) throw ValueError('SECANT context belongs to another parent');
    if (!['BOUNDED_OBSERVATION', 'RECORDING_GAP_DETECTED'].includes(at(row, 'recording_quality'))) throw ValueError('Invalid recorder coverage');
    const fact = [1n].concat(['session_id', 'study_context_id', 'study_target_resource_id', 'episode_id', 'event_name', 'stage', 'occurred_monotonic_ns', 'request_id', 'attempt_id', 'evidence_id', 'reason'].map((k) => at(row, k)));
    const encoded = canonical(fact);
    if (at(row, 'canonical_fact_json') !== encoded || at(row, 'fact_digest') !== digest(encoded) || at(row, 'event_id') !== digest(canonical(['secant-event-v1', fact, row.occurrence_ordinal]))) {
      throw ValueError('SECANT immutable fact integrity mismatch');
    }
    secantEventClock(row);
  }
  function validateSecantLifecycle(events) {                     // _validate_secant_lifecycle
    if (!events.length || events[0].event_name !== 'SECANT_EPISODE_FOUNDED') throw ValueError('SECANT founding must be first');
    if (new Set(events.map((r) => at(r, 'study_target_resource_id'))).size !== 1) throw ValueError('SECANT target changed inside episode');
    const displays = events.filter((r) => r.event_name === 'SECANT_DISPLAYED');
    if (!displays.length || !eq(displays[0].stage, 1n) || !eq(displays[0].occurred_monotonic_ns, events[0].occurred_monotonic_ns)
        || !eq(displays[0].request_id, events[0].request_id) || !truthy(displays[0].request_id)) throw ValueError('SECANT founding/display linkage missing');
    for (let i = 0; i + 1 < displays.length; i++) { const a = displays[i], b = displays[i + 1]; if (b.stage < a.stage || b.stage > a.stage + 1n) throw ValueError('Invalid SECANT stage chronology'); }
    const attempts = new Map(), requests = new Set(), recovered = [];
    let active = null;
    events.forEach((row, index) => {
      const name = row.event_name, atNs = row.occurred_monotonic_ns, attempt = row.attempt_id;
      if (name === 'SECANT_DISPLAYED') { if (!truthy(row.request_id)) throw ValueError('Display request missing'); requests.add(row.request_id); }
      if (name === 'SECANT_ACTION_INTENT' && (row.reason !== 'RETURN TO STUDY' || !requests.has(row.request_id))) throw ValueError('Unlinked return intent');
      if ((name === 'SECANT_FROZEN' || name === 'SECANT_RESUMED') && row.reason !== 'uncertainty') throw ValueError('Invalid uncertainty hold');
      if (name === 'SECANT_RETURN_STARTED') {
        if (!truthy(attempt) || attempts.has(attempt) || active !== null || !truthy(row.evidence_id)) throw ValueError('Invalid recovery attempt start');
        attempts.set(attempt, ['STARTED', atNs]); active = attempt;
      } else if (['SECANT_RETURN_VERIFIED', 'SECANT_RECOVERY_INTERRUPTED', 'SECANT_RECOVERY_CLOSED'].includes(name)) {
        const [phase, began] = attempts.has(attempt) ? attempts.get(attempt) : ['MISSING', -1n];
        if (active !== attempt || !['STARTED', 'VERIFIED'].includes(phase) || atNs < began) throw ValueError('Recovery fact lacks its ordered attempt');
        if (name === 'SECANT_RETURN_VERIFIED') {
          if (phase !== 'STARTED' || atNs - began < 10000000000n || !truthy(row.evidence_id)) throw ValueError('Invalid return verification');
          attempts.set(attempt, ['VERIFIED', atNs]);
        } else if (name === 'SECANT_RECOVERY_CLOSED') {
          if (phase !== 'VERIFIED' || atNs - began < 60000000000n || !truthy(row.evidence_id)) throw ValueError('Invalid recovery closure');
          attempts.set(attempt, ['CLOSED', atNs]); active = null; recovered.push(row);
        } else {
          if (!truthy(row.reason)) throw ValueError('Interruption reason missing');
          attempts.set(attempt, ['INTERRUPTED', atNs]); active = null;
        }
      }
      if (name === 'SECANT_EPISODE_CLOSED' && (index !== events.length - 1 || !truthy(row.reason))) throw ValueError('Invalid terminal closure ordering');
    });
    const last = events[events.length - 1], terminal = last.event_name === 'SECANT_EPISODE_CLOSED' ? last : null;
    if (terminal && terminal.reason === 'recovered') {
      if (recovered.length !== 1 || !eq(recovered[0].occurred_monotonic_ns, terminal.occurred_monotonic_ns)) throw ValueError('Recovered episode lacks linked recovery closure');
    } else if (recovered.length) throw ValueError('INCOMPLETE: recovery closure lacks matching recovered episode terminal');
  }

  /* ---------------- recorder quality ---------------- */
  function recorderQuality(snapshot, evRows = null) {            // recorder_quality
    evRows = evRows === null ? rows(snapshot, 'secant_events') : evRows;
    const table = snapshot.recorder_receipts;
    const result = (status, diagnostic) => ({status, diagnostic, receipts: table.rows});
    if (evRows.some((r) => eq(get(r, 'recording_quality'), 'RECORDING_GAP_DETECTED'))) return result('RECORDING_GAP_DETECTED', 'Recorded row reports recorder loss; distinct from behavioral evidence_gap');
    if (table.status === 'UNAVAILABLE') return result('UNAVAILABLE', 'Recorder receipts unavailable');
    if (!table.rows.length) return result('NOT_RECORDED', 'Final recorder receipt not recorded');
    return attempt(() => {
      const runs = new Set(evRows.map((r) => at(r, 'recorder_run_id'))), known = new Set(table.rows.map((r) => at(r, 'run_id')));
      if (table.rows.length !== 1 || ![...runs].every((x) => known.has(x))) throw ValueError('Incompatible recorder clock domains');
      const receipt = table.rows[0];
      if (!isInt(at(receipt, 'contract_version')) || receipt.contract_version !== 1n || !isStr(at(receipt, 'run_id')) || !receipt.run_id || !receipt.attached_session_ids.some((s) => s === snapshot.session_id)) {
        throw ValueError('Invalid recorder receipt contract/scope');
      }
      for (const f of ['pending', 'dropped']) { const v = at(receipt, f); if (!isInt(v) || v < 0n) throw ValueError('Invalid recorder counts'); }
      if (!['BOUNDED_OBSERVATION', 'RECORDING_GAP_DETECTED'].includes(at(receipt, 'coverage'))) throw ValueError('Unknown recorder coverage');
      if (typeof at(receipt, 'final_flush_committed') !== 'boolean' || !Array.isArray(at(receipt, 'gap_reasons'))) throw ValueError('Invalid recorder finality fields');
      if (receipt.coverage === 'RECORDING_GAP_DETECTED' || receipt.dropped !== 0n || receipt.gap_reasons.length || evRows.some((r) => at(r, 'recording_quality') === 'RECORDING_GAP_DETECTED')) {
        return result('RECORDING_GAP_DETECTED', 'Recorder recording gap; distinct from behavioral evidence_gap');
      }
      const state = at(receipt, 'writer_state');
      if (state === 'FAILED') throw ValueError('Recorder writer failed');
      if (!['STARTING', 'ACTIVE', 'DRAINING', 'CLOSED'].includes(state)) throw ValueError('Unknown recorder writer state');
      if (state !== 'CLOSED' || receipt.final_flush_committed !== true || receipt.pending !== 0n || !truthy(at(receipt, 'closed_at_utc'))) {
        return result('PENDING', 'Recorder final flush is not proven; Stop is not finality');
      }
      NS.time.parseUtc(receipt.closed_at_utc);
      return result('FINALIZED', 'Durable final flush committed; bounded recorded coverage');
    }, CAUGHT, (e) => result('UNAVAILABLE', NS.pyStr(e)));
  }

  /* ---------------- founding source ---------------- */
  function sourceOf(founded, snapshot) {                         // _source
    const table = snapshot.tables.secant_founding_source, empty = dict();
    if (table.status === 'UNAVAILABLE') return ['UNAVAILABLE', empty];
    if (founded === null) return ['NOT_RECORDED', empty];
    const matches = table.rows.filter((r) => eq(at(r, 'event_id'), founded.event_id));
    if (!matches.length) return ['NOT_RECORDED', empty];
    if (matches.length !== 1) return ['UNAVAILABLE', empty];
    const row = matches[0];
    return attempt(() => {
      const payload = NS.pyjson.loads(at(row, 'source_evidence_json'));
      const resource = at(payload, 'resource');
      if (!isDict(payload)) throw TypeErr('dict() argument must be a mapping');
      const core = dict(payload); delete core.display_metadata;
      core.resource = C.exactResource(resource);
      const authority = C.foundingSource(core);
      if (authority.meaning !== 'OFF_TASK' || authority.observed_monotonic_ns > founded.occurred_monotonic_ns
          || !(authority.territory !== 'ORDINARY' || authority.confirmed_off_task || authority.certified_ott)) throw ValueError('Invalid founding source authority');
      if (!eq(at(row, 'source_extension_version'), 1n) || !eq(at(resource, 'key'), at(row, 'source_resource_id')) || !eq(at(payload, 'evidence_id'), at(row, 'source_evidence_id'))
          || !eq(at(payload, 'observed_monotonic_ns'), at(row, 'source_observed_monotonic_ns')) || !eq(at(resource, 'version'), 1n) || !['BROWSER', 'DESKTOP'].includes(at(resource, 'kind'))) {
        throw ValueError('Source authority mismatch');
      }
      let out = resource;
      if (get(payload, 'display_metadata') !== null) {
        out = dict(resource); out.display_metadata = payload.display_metadata; out.display_observation_id = payload.evidence_id; out.display_observed_ns = payload.observed_monotonic_ns;
      }
      return ['AVAILABLE', out];
    }, CAUGHT, () => ['UNAVAILABLE', empty]);
  }

  /* ---------------- project_secant ---------------- */
  const named = (episode, name) => episode.events.filter((r) => r.event_name === name);
  function projectSecant(snapshot) {
    const groups = new Map();
    for (const row of rows(snapshot, 'secant_events')) {
      const key = [get(row, 'session_id'), get(row, 'study_context_id'), get(row, 'episode_id')], k = NS.repr(key);
      if (!groups.has(k)) groups.set(k, {key, rows: []});
      groups.get(k).rows.push(row);
    }
    const result = [], perEpisode = new Map();
    for (const gr of groups.values()) { const k = NS.repr([gr.key[2]]); perEpisode.set(k, (perEpisode.get(k) || 0) + 1); }
    for (const {key, rows: rs} of sortedBy([...groups.values()], (gr) => NS.repr(gr.key))) {
      let status = 'AVAILABLE', diagnostic = '', founded = null, closed = null, stage = null, events = rs.slice();
      try {
        attempt(() => {
          if (!eq(key[0], snapshot.session_id) || !truthy(key[1]) || !truthy(key[2])) throw ValueError('Episode scope mismatch');
          if (perEpisode.get(NS.repr([key[2]])) !== 1) throw ValueError('Native episode spans multiple Study contexts');
          if (new Set(rs.map((r) => at(r, 'event_id'))).size !== rs.length) throw ValueError('Duplicate durable event identity');
          if (new Set(rs.map((r) => at(r, 'recorder_run_id'))).size !== 1) throw ValueError('Multiple recorder clock domains');
          for (const row of rs) {
            validateSecantFact(row);
            if (!eq(at(row, 'contract_version'), 1n) || !isOrderName(at(row, 'event_name'))) throw ValueError('Unsupported SECANT event contract');
            if (!isInt(row.occurred_monotonic_ns) || row.occurred_monotonic_ns < 0n) throw ValueError('Invalid occurrence clock');
            if (!isInt(row.stage) || !(row.stage >= 0n && row.stage <= 3n)) throw ValueError('Invalid recorded stage');
            NS.time.parseUtc(at(row, 'recorded_at_utc'));
          }
          events = sortedBy(rs, (r) => [r.occurred_monotonic_ns, BigInt(EVENT_ORDER[r.event_name]), r.occurrence_ordinal, r.event_id]);
          const foundings = events.filter((r) => r.event_name === 'SECANT_EPISODE_FOUNDED'), closures = events.filter((r) => r.event_name === 'SECANT_EPISODE_CLOSED');
          if (foundings.length > 1 || closures.length > 1) throw ValueError('Ambiguous episode lifecycle');
          founded = foundings.length ? foundings[0] : null; closed = closures.length ? closures[0] : null;
          const displayed = events.filter((r) => r.event_name === 'SECANT_DISPLAYED').map((r) => r.stage);
          if (displayed.some((v) => v === 0n)) throw ValueError('Displayed stage is invalid');
          stage = displayed.length ? displayed.reduce((a, b) => (b > a ? b : a)) : null;
          if (founded && events[0].occurred_monotonic_ns < founded.occurred_monotonic_ns) throw ValueError('Event predates episode founding');
          validateSecantLifecycle(events);
        }, CAUGHT4, (e) => { throw e; });
      } catch (e) {
        if (!(e instanceof NS.PyError) || !CAUGHT4.includes(e.kind)) throw e;
        status = 'UNAVAILABLE'; diagnostic = NS.pyStr(e);
      }
      const quality = recorderQuality(snapshot, rs), [sourceStatus, source] = sourceOf(founded, snapshot);
      result.push({identity: key, events, status, diagnostic, source_status: sourceStatus, source, stage_reached: stage, founded, closed,
        display_episode_id: E.readDisplayAlias(snapshot, 'SECANT', key[2]), quality_status: quality.status, quality_diagnostic: quality.diagnostic,
        get summary_eligible() { return this.status === 'AVAILABLE' && this.quality_status === 'FINALIZED'; }});
    }
    return result;
  }

  /* ---------------- project_study ---------------- */
  const numish = (x) => isInt(x) || NS.isFloat(x);
  function projectStudy(snapshot) {
    const result = {status: 'AVAILABLE', blocks: [], resources: [], visits: [], jumps: [], diagnostics: []};
    for (const name of ['study_events', 'study_resources', 'study_resource_intervals', 'study_resource_boundaries', 'study_resource_observation_evidence']) {
      const st = snapshot.tables[name].status;
      if (st !== 'AVAILABLE') { result.diagnostics.push([name, st]); if (st === 'UNAVAILABLE') result.status = 'UNAVAILABLE'; }
    }
    try {
      attempt(() => {
        const blocks = new Map();
        for (const row of sortedBy(rows(snapshot, 'study_events'), (r) => at(r, 'id'))) {
          const p = object(at(row, 'payload_json'));
          if (!eq(at(row, 'session_id'), snapshot.session_id) || !eq(get(p, 'block_id'), at(row, 'study_block_id'))) throw ValueError('Study timer scope mismatch');
          const generation = get(p, 'generation');
          if (eq(generation, 0n) && !truthy(row.study_block_id) && eq(at(row, 'action'), 'SAFE_SHUTDOWN') && eq(get(p, 'elapsed_seconds'), 0n) && !truthy(get(p, 'started_wall_time_utc'))) continue;
          if (!isInt(generation) || generation <= 0n) throw ValueError('Invalid Study generation');
          const elapsed = get(p, 'elapsed_seconds');
          if (!numish(elapsed) || !NS.isFinite(elapsed) || elapsed < 0) throw ValueError('Invalid recorded Study timer');
          const key = [snapshot.session_id, row.study_block_id, generation], k = NS.repr(key);
          if (!blocks.has(k)) blocks.set(k, {key, events: []});
          const block = blocks.get(k);
          if ((has(block, 'elapsed') ? block.elapsed : 0n) > elapsed) throw ValueError('Study elapsed reset within one generation');
          block.elapsed = elapsed; block.payload = p;
          block.events.push(row);
        }
        result.blocks = [...blocks.values()];
        const roles = new Map();
        for (const row of rows(snapshot, 'study_resources')) {
          const identity = object(at(row, 'identity_json'));
          if (!eq(at(row, 'contract_version'), 1n) || !eq(get(identity, 'key'), at(row, 'resource_key')) || !eq(get(identity, 'kind'), at(row, 'identity_kind')) || !eq(get(identity, 'version'), at(row, 'identity_version'))
              || lt(at(row, 'qualified_monotonic_ns'), at(row, 'first_aligned_monotonic_ns')) || !['PRIMARY', 'LATER'].includes(at(row, 'role')) || !eq(at(row, 'session_id'), snapshot.session_id)) {
            throw ValueError('Invalid Study resource authority');
          }
          const key = NS.repr(scope(row).concat([at(row, 'resource_key')]));
          if (roles.has(key)) throw ValueError('Duplicate Study qualification');
          roles.set(key, row);
          const provenance = object(get(row, 'provenance_json', '{}'));
          const rec = dict(row); rec.title = C.resourceTitle(identity, get(provenance, 'display_metadata'), {observation_id: get(provenance, 'observation_id'), observed_ns: row.qualified_monotonic_ns});
          result.resources.push(rec);
        }
        const observations = new Map();
        for (const row of rows(snapshot, 'study_resource_observation_evidence')) {
          const identity = object(at(row, 'identity_json')), p = object(at(row, 'authority_json'));
          if (!eq(at(row, 'extension_version'), 1n) || !eq(get(identity, 'key'), at(row, 'resource_key')) || !eq(get(get(p, 'resource', dict()), 'key'), row.resource_key) || !eq(at(row, 'session_id'), snapshot.session_id)) {
            throw ValueError('Invalid observation identity');
          }
          for (const field of ['measured_confidence', 'confidence']) {
            const value = get(p, field);
            if (value !== null && (!numish(value) || !NS.isFinite(value) || !(value >= 0 && value <= 1))) throw ValueError('Invalid measured confidence');
          }
          const rec = dict(row); rec.authority = p; rec.identity = identity;
          const k = NS.repr([at(row, 'interval_id')]);
          if (!observations.has(k)) observations.set(k, []);
          observations.get(k).push(rec);
        }
        const visits = [];
        for (const row of rows(snapshot, 'study_resource_intervals')) {
          const rs = sortedBy(observations.get(NS.repr([at(row, 'interval_id')])) || [], (r) => [truthy(get(r, 'confirmation_applied_monotonic_ns')) ? r.confirmation_applied_monotonic_ns : at(r, 'observed_monotonic_ns'), at(r, 'kind') !== 'OBSERVATION', at(r, 'evidence_id')]);
          const observed = rs.filter((r) => at(r, 'kind') === 'OBSERVATION');
          const first = at(row, 'first_observed_monotonic_ns'), last = at(row, 'last_observed_monotonic_ns'), count = at(row, 'observation_count'), duration = at(row, 'supported_duration_ns');
          if (!eq(at(row, 'interval_extension_version'), 1n) || gt(first, last) || !eq(duration, sub(last, first)) || !eq(BigInt(observed.length), count) || !observed.length) throw ValueError('Incomplete or invalid supported interval');
          const o0 = observed[0], oN = observed[observed.length - 1];
          if (!eq(at(o0, 'observation_id'), at(row, 'first_observation_id')) || !eq(at(oN, 'observation_id'), at(row, 'last_observation_id')) || !eq(at(o0, 'observed_monotonic_ns'), first) || !eq(at(oN, 'observed_monotonic_ns'), last)) throw ValueError('Interval endpoint mismatch');
          if (rs.some((r) => !eqList(scope(r), scope(row)) || !eq(at(r, 'resource_key'), row.resource_key) || !eq(at(r, 'interval_capture_id'), at(row, 'capture_id')))) throw ValueError('Cross-scope interval evidence');
          if (eq(count, 1n)) {
            if (!eq(duration, 0n) || !eq(at(row, 'continuity_status'), 'SINGLE_OBSERVATION')) throw ValueError('Invalid single observation');
          } else {
            if (le(duration, 0n) || !eq(at(row, 'continuity_status'), 'SUPPORTED_SPAN')) throw ValueError('Invalid supported span');
            for (let i = 0; i + 1 < observed.length; i++) {
              const left = observed[i], right = observed[i + 1], delta = sub(at(right, 'observed_monotonic_ns'), at(left, 'observed_monotonic_ns'));
              if (!eq(at(right, 'observation_sequence'), add(at(left, 'observation_sequence'), 1n)) || !(gt(delta, 0n) && le(delta, at(row, 'continuity_max_gap_ns')))) throw ValueError('Unsupported interval continuity');
            }
          }
          const qualified = roles.get(NS.repr(scope(row).concat([at(row, 'resource_key')]))) || null;
          const initial = rs[0].authority, effective = rs[rs.length - 1].authority;
          const eligible = !!(qualified && le(qualified.qualified_monotonic_ns, last) && eq(get(effective, 'classification'), 'STUDY_ALIGNED')
            && (!eq(get(initial, 'measured_classification'), 'UNCERTAIN') || eq(get(effective, 'user_confirmation'), 'STUDY')));
          const v = dict(row);
          v.title = C.resourceTitle(o0.identity, get(o0.authority, 'display_metadata'), {observation_id: o0.observation_id, sequence: o0.observation_sequence, observed_ns: first});
          v.qualification = qualified ? qualified.role : 'Not qualified'; v.initial = initial; v.effective = effective; v.evidence = rs; v.eligible = eligible;
          visits.push(v);
        }
        const sortedVisits = sortedBy(visits, (r) => [scope(r), at(r, 'capture_id'), at(r, 'span_ordinal')]);
        for (const sc of new Set(sortedVisits.map((v) => NS.repr(scope(v))))) {
          if (new Set(sortedVisits.filter((v) => NS.repr(scope(v)) === sc).map((v) => v.capture_id)).size > 1) throw ValueError('Multiple interval capture domains need a validated chronology');
        }
        result.visits = sortedVisits;
        const boundaries = rows(snapshot, 'study_resource_boundaries');
        let previousIndex = -1;
        sortedVisits.forEach((visit, index) => {
          if (!visit.eligible) return;
          result.jumps.push({visit, connector: ''});
          if (result.jumps.length < 2) { previousIndex = index; return; }
          const previous = sortedVisits[previousIndex], chain = sortedVisits.slice(previousIndex, index + 1);
          let continuous = eqList(scope(previous), scope(visit)) && eq(previous.capture_id, visit.capture_id);
          for (let i = 0; i + 1 < chain.length; i++) {
            const left = chain[i], right = chain[i + 1];
            const links = boundaries.filter((b) => eqList(scope(b), scope(left)) && eq(at(b, 'from_observation_id'), left.last_observation_id) && eq(at(b, 'to_observation_id'), right.first_observation_id)
              && eq(at(b, 'from_resource_key'), left.resource_key) && eq(at(b, 'to_resource_key'), right.resource_key));
            continuous = continuous && links.length === 1;
            if (links.length) {
              const b = links[0];
              continuous = continuous && eq(at(b, 'continuity'), 'CONTIGUOUS_OBSERVED_CHANGE');
              continuous = continuous && !truthy(NS.pyjson.loads(at(b, 'gap_reasons_json'))) && !truthy(NS.pyjson.loads(at(b, 'capture_gap_reasons_json')));
              continuous = continuous && eq(get(b, 'contract_version'), 1n);
              continuous = continuous && eq(get(b, 'from_observed_monotonic_ns'), left.last_observed_monotonic_ns);
              continuous = continuous && eq(get(b, 'to_observed_monotonic_ns'), right.first_observed_monotonic_ns);
              if (continuous) continuous = eq(get(b, 'to_observation_ordinal', -1n), add(get(b, 'from_observation_ordinal', -3n), 1n));
              const delta = sub(right.first_observed_monotonic_ns, left.last_observed_monotonic_ns);
              const m = lt(left.continuity_max_gap_ns, right.continuity_max_gap_ns) ? left.continuity_max_gap_ns : right.continuity_max_gap_ns;
              continuous = continuous && (gt(delta, 0n) && le(delta, m));
            }
          }
          let connector;
          if (!continuous) connector = 'Evidence gap';
          else if (index === previousIndex + 1 && !eq(previous.resource_key, visit.resource_key) && eq(get(previous.effective, 'classification'), 'STUDY_ALIGNED') && eq(get(visit.initial, 'classification'), 'STUDY_ALIGNED')) connector = 'Direct observed change';
          else if (chain.slice(1, -1).some((r) => eq(get(r.effective, 'classification'), 'DISTRACTION'))) connector = 'Interruption recorded';
          else connector = 'Evidence gap';
          result.jumps[result.jumps.length - 2].connector = connector;
          previousIndex = index;
        });
      }, CAUGHT, (e) => { throw e; });
    } catch (e) {
      if (!(e instanceof NS.PyError) || !CAUGHT.includes(e.kind)) throw e;
      result.status = 'UNAVAILABLE'; result.visits = []; result.jumps = [];
      result.diagnostics.push(['validation', NS.pyStr(e)]);
    }
    return result;
  }

  /* ---------------- project_cosecant ---------------- */
  const REMINDERS = ['BREAK_COMPLETE', 'BREAK_ALREADY_OVER', 'FINAL_LOCK'];
  function validateCosecantChain(itemRec) {                      // _validate_cosecant_chain
    const events = itemRec.events, started = itemRec.started;
    if (!events.length || started === null || events[0].kind !== 'BREAK_STARTED') throw ValueError('COSECANT opening fact missing');
    const block = get(started, 'study_block_id');
    if (!isStr(block) || !block) throw ValueError('COSECANT Study block missing');
    let state = null, complete = false, confirmationAt = null, completeAt = null;
    const seen = new Set();
    for (const event of events) {
      const p = event.payload, kind = event.kind;
      const atNs = get(p, 'effective_monotonic_ns'), observed = get(p, 'observed_monotonic_ns');
      if (!eq(get(p, 'study_block_id'), block) || !isInt(atNs) || !isInt(observed) || !(atNs >= 0n && atNs <= observed) || lt(atNs, at(started, 'effective_monotonic_ns'))) throw ValueError('COSECANT scope or clock mismatch');
      const before = get(p, 'from_state'), after = get(p, 'to_state');
      if (state !== null && !eq(before, state)) throw ValueError('COSECANT transition chain is broken');
      const target = get(p, 'return_target');
      const typed = isDict(target) ? C.returnTarget(target) : null;
      if (target !== null && typed === null) throw ValueError('Invalid target payload');
      const extension = get(p, 'return_target_extension_version'), generation = get(p, 'return_target_study_generation');
      C.validateReturnTarget({kind: C.factKind(kind), extension_version: extension, target: typed, study_block_id: block, study_generation: generation, effective_monotonic_ns: atNs});
      if (typed !== null && typed.study_context_token !== C.studyContextToken(block, generation)) throw ValueError('Return target belongs to another Study context');
      const metadata = get(p, 'return_target_display_metadata');
      if (metadata !== null) {
        if (typed === null) throw ValueError('Caption lacks its own return target');
        C.validateDisplayMetadata(metadata, {observed_ns: typed.observed_monotonic_ns});
      }
      const allowanceExtension = get(p, 'selected_break_extension_version');
      if (allowanceExtension !== null && (!isInt(allowanceExtension) || allowanceExtension !== 1n)) throw ValueError('Unsupported allowance contract');
      if (get(p, 'selected_break_seconds') !== null && (allowanceExtension === null || kind !== 'BREAK_STARTED')) throw ValueError('Allowance lacks opening extension authority');
      let valid;
      if (kind === 'BREAK_STARTED') valid = ['INACTIVE', 'CONFIRMED', 'CANCELLED'].some((s) => eq(before, s)) && eq(after, 'BREAK_ACTIVE') && seen.size === 0;
      else if (kind === 'BREAK_COMPLETE') {
        valid = eq(before, 'BREAK_ACTIVE') && eq(after, 'BREAK_COMPLETE') && !complete;
        if (itemRec.allowance !== null) valid = valid && eq(atNs, add(at(started, 'effective_monotonic_ns'), itemRec.allowance * NS_PER_S));
        complete = true; completeAt = atNs;
      } else if (kind === 'BREAK_ALREADY_OVER') valid = eq(before, 'BREAK_COMPLETE') && eq(after, 'BREAK_ALREADY_OVER') && complete && !seen.has(kind) && atNs >= completeAt;
      else if (kind === 'FINAL_LOCKED') valid = eq(before, 'BREAK_ALREADY_OVER') && eq(after, 'FINAL_LOCK') && complete && !seen.has(kind) && atNs >= completeAt;
      else if (kind === 'RETURN_INTENT_RECORDED') valid = ['BREAK_COMPLETE', 'BREAK_ALREADY_OVER'].some((s) => eq(before, s)) && eq(after, before);
      else if (kind === 'RETURN_CONFIRMATION_STARTED' || kind === 'RETURN_CONFIRMATION_RESTARTED') {
        valid = complete && atNs >= completeAt && eq(after, 'RETURN_CONFIRMING') && (kind === 'RETURN_CONFIRMATION_STARTED' ? REMINDERS.some((s) => eq(before, s)) : eq(before, 'RETURN_CONFIRMING') && confirmationAt !== null);
        confirmationAt = atNs;
      } else if (kind === 'RETURN_CONFIRMATION_LOST') { valid = eq(before, 'RETURN_CONFIRMING') && REMINDERS.some((s) => eq(after, s)) && confirmationAt !== null && atNs >= confirmationAt; confirmationAt = null; }
      else if (kind === 'RETURN_CONFIRMED') { valid = complete && eq(before, 'RETURN_CONFIRMING') && eq(after, 'CONFIRMED') && confirmationAt !== null && atNs - confirmationAt === 3000000000n && !seen.has(kind); confirmationAt = null; }
      else if (kind === 'BREAK_CANCELLED') { valid = REMINDERS.concat(['BREAK_ACTIVE', 'RETURN_CONFIRMING']).some((s) => eq(before, s)) && eq(after, 'CANCELLED'); confirmationAt = null; }
      else if (kind === 'SAFE_SHUTDOWN') { valid = !['INACTIVE', 'SHUTDOWN'].some((s) => eq(before, s)) && eq(after, 'SHUTDOWN'); confirmationAt = null; }
      else valid = false;
      if (kind === 'RETURN_CONFIRMATION_STARTED' || kind === 'RETURN_CONFIRMATION_RESTARTED' || kind === 'RETURN_CONFIRMED') {
        const token = get(p, 'evidence_token');
        valid = valid && isStr(token) && NS.strip(token) !== '';
      }
      if (!valid) throw ValueError('Invalid same-break confirmation/lifecycle evidence: ' + kind);
      seen.add(kind); state = after;
    }
  }
  function projectCosecant(snapshot) {
    const groups = new Map(), sequences = new Map();
    for (const r of rows(snapshot, 'cosecant_events')) if (truthy(get(r, 'break_id'))) { const k = NS.repr([get(r, 'sequence')]); sequences.set(k, (sequences.get(k) || 0) + 1); }
    for (const row of rows(snapshot, 'cosecant_events')) {
      if (!truthy(at(row, 'break_id')) && at(row, 'kind') === 'SAFE_SHUTDOWN') continue;
      const k = NS.repr([row.break_id]);
      if (!groups.has(k)) groups.set(k, {native: row.break_id, rows: []});
      groups.get(k).rows.push(row);
    }
    const result = [];
    for (const {native, rows: rs} of groups.values()) {
      const rec = {native_id: native, display_break_id: E.readDisplayAlias(snapshot, 'COSECANT', native), status: 'AVAILABLE', events: [], started: null, target: null, allowance: null, diagnostic: ''};
      try {
        attempt(() => {
          let previous = sub(rs.map((r) => at(r, 'sequence')).reduce((a, b) => (lt(b, a) ? b : a)), 1n);
          for (const row of sortedBy(rs, (r) => at(r, 'sequence'))) {
            const p = object(at(row, 'payload_json'));
            if (!eq(at(row, 'session_id'), snapshot.session_id) || !eq(at(p, 'break_id'), native) || !eq(at(p, 'kind'), row.kind) || !eq(at(p, 'sequence'), row.sequence) || !eq(row.sequence, add(previous, 1n))
                || (sequences.get(NS.repr([row.sequence])) || 0) !== 1) throw ValueError('Invalid break chronology');
            if (!isInt(row.sequence) || row.sequence <= 0n || !isInt(get(p, 'sequence')) || !isInt(get(row, 'id')) || row.id <= 0n || !isStr(native) || !NS.strip(native) || !eq(get(p, 'schema_version'), 'myelin-cosecant-v2')
                || !isInt(at(row, 'occurred_monotonic_ns')) || !eq(get(p, 'observed_monotonic_ns'), row.occurred_monotonic_ns)) throw ValueError('Invalid COSECANT durable contract');
            NS.time.parseUtc(at(p, 'occurred_wall_time_utc'));
            previous = row.sequence;
            const ev = dict(row); ev.payload = p; rec.events.push(ev);
            if (row.kind === 'BREAK_STARTED') {
              if (rec.started !== null) throw ValueError('Duplicate break start');
              rec.started = p;
              if (has(p, 'selected_break_extension_version')) {
                const secs = at(p, 'selected_break_seconds');
                if (!isInt(p.selected_break_extension_version) || p.selected_break_extension_version !== 1n || !isInt(secs) || !(secs >= 60n && secs <= 86400n)) throw ValueError('Invalid allowance');
                rec.allowance = secs;
              }
              if (has(p, 'return_target_extension_version')) {
                if (!eq(p.return_target_extension_version, 1n) || !isDict(at(p, 'return_target'))) throw ValueError('Invalid return target');
                rec.target = p.return_target;
                if (!eq(get(rec.target, 'identity_version'), 1n) || !['BROWSER', 'DESKTOP'].some((s) => eq(get(rec.target, 'identity_kind'), s))) throw ValueError('Invalid authoritative return identity');
                if (rec.target.identity_kind === 'BROWSER' && !(truthy(get(rec.target, 'platform_key')) && truthy(get(rec.target, 'resource_token')))) throw ValueError('Incomplete browser return identity');
              }
            }
          }
          validateCosecantChain(rec);
        }, CAUGHT, (e) => { throw e; });
      } catch (e) {
        if (!(e instanceof NS.PyError) || !CAUGHT.includes(e.kind)) throw e;
        rec.status = 'UNAVAILABLE'; rec.diagnostic = NS.pyStr(e);
      }
      result.push(rec);
    }
    return result;
  }

  NS.projection = {EVENT_ORDER, secantOccurredAt, secantEventClock, validateSecantFact, validateSecantLifecycle, recorderQuality, sourceOf, projectSecant, projectStudy, projectCosecant, scope, named, canonical, digest, object};
})(self);
