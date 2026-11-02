// Lifetime Metric Hub (METRIC_HUB/read_model.py read_lifetime_metric_hub), plus the Science Lab Chapter 6 lifetime validators it depends on
// (SCIENCE_LAB/chapter6_lifetime.py and the successful-return chain of SCIENCE_LAB/analysis.py), ported for the browser reader.
// Every source table is read once through fixed literal statements; a source that cannot be read or validated makes ITS organ metric UNAVAILABLE with the reason, never a zero.
// Documented differences from the desktop: the snapshot digest/path/time are run metadata and are not reproduced; a table that is a view or virtual table is refused (the desktop would run it).
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, O = NS.organs, {PyError} = NS;
  const AVAILABLE = 'AVAILABLE', UNAVAILABLE = 'UNAVAILABLE', NO_DATA = 'NO_DATA';
  const TRIGGER_VERSIONS = new Set(['myelin-trigger-v3', 'myelin-trigger-v4']);
  const SINE_DISPLAY_VERSIONS = new Set(['myelin-sine-v1', 'myelin-sine-v2', 'myelin-sine-v3']);
  const SOCIAL = new Set(['social', 'youtube_watch', 'selected_video', 'youtube_shorts', 'youtube_other']);
  const MINE_STAGES = new Set(['MINE1_DISPLAYED', 'MINE2A_DISPLAYED', 'MINE2B_DISPLAYED']);
  const COSINE_STAGES = new Set(['INTENT_GATE_DISPLAYED', 'BREAK_ACK_DISPLAYED', 'FINAL_CALLBACK_DISPLAYED']);
  const COSECANT_STAGES = new Set(['BREAK_COMPLETE', 'BREAK_ALREADY_OVER', 'FINAL_LOCKED']);
  const MINE_RETURNS = new Set(['RETURNED_AFTER_INTENT', 'EARLY_RETURN_DURING_IMPORTANT_ALLOWANCE', 'RETURNED_AFTER_CALLBACK']);
  const COSINE_RETURNS = new Set(['RETURNED_AFTER_INTENT', 'EARLY_RETURN', 'RETURNED_AFTER_CALLBACK']);
  const PLATFORM_KEYS = new Set(['netflix', 'prime_video', 'jiohotstar', 'disney_plus', 'hulu', 'hbo_max', 'apple_tv_plus', 'paramount_plus']);
  const COSECANT_SCHEMA = 'myelin-cosecant-v2';
  const isB = (x) => typeof x === 'bigint';
  class SourceError extends Error { constructor(m) { super(m); this.source = true; } }
  class IntegrityError extends Error { constructor(m) { super(m); this.pyName = 'AnalysisIntegrityError'; this.pyMessage = m; } }            // SCIENCE_LAB.analysis.AnalysisIntegrityError
  const TZ_MESSAGES = new Set(['UTC timestamp is unreadable', 'timestamp does not identify a UTC instant']);
  /** _bounded(): "ExceptionName: message", whitespace-collapsed, 300 characters. */
  function bounded(e) {
    let name = 'Error', msg = String(e && e.message || e);
    if (e instanceof SourceError) name = '_SourceError';                 // the desktop's private exception class is part of its message text
    else if (e instanceof PyError) { name = TZ_MESSAGES.has(e.pyMessage) ? 'TimezoneProjectionError' : e.kind; msg = e.pyMessage; }
    return `${name}: ${msg}`.split(/\s+/).filter(Boolean).join(' ').slice(0, 300);
  }
  const catches = (e) => e instanceof SourceError || (e instanceof PyError && (e.kind === 'ValueError' || e.kind === 'OverflowError' || TZ_MESSAGES.has(e.pyMessage)));
  const pyName = (e) => (e instanceof PyError ? (e.name === 'JSONDecodeError' ? 'JSONDecodeError' : e.kind) : '_SourceError');
  const mv = (status, value, reason, unit, count = null) => ({status, value, reason, evidence_unit: unit, source_count: count});
  const avail = (value, reason, unit, count = null) => mv(AVAILABLE, value, reason, unit, count);
  const unav = (reason, unit) => mv(UNAVAILABLE, null, reason, unit, null);
  const organUnav = (organ, reason) => ({organ, triggers: unav(reason, 'approved stage identity per genuine episode/break'), returned: unav(reason, 'validated behavioural return per genuine episode/break'), trigger_disclosure: reason, return_disclosure: reason});
  const cmpBig = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const jobj = (text, source) => {
    let v;
    try { v = NS.pyjson.loads(String(text)); } catch (e) { if (e instanceof PyError || (e && /RecursionError/.test(e.message))) throw new SourceError(`${source} contains malformed JSON`); throw e; }
    if (!NS.isDict(v)) throw new SourceError(`${source} payload is not an object`);
    return v;
  };
  const strOf = (v) => O.pyStrOf(NS.truthy(v) ? v : '');
  const canonical = (value, field) => {
    let us;
    try { us = NS.time.parseUtc(value); } catch (e) { if (catches(e)) throw new SourceError(`sessions contains an invalid ${field}`); throw e; }
    return [NS.time.isoZ(us), us];
  };
  const sortBy = (items, key) => items.map((v, i) => [key(v), i, v]).sort((p, q) => { for (let k = 0; k < p[0].length; k++) { const a = p[0][k], b = q[0][k], c = typeof a === 'string' ? NS.cmp(a, b) : cmpBig(a, b); if (c) return c; } return p[1] - q[1]; }).map((x) => x[2]);

  /* ---------------- sessions ---------------- */
  function sessionPopulation(rows) {
    const ids = [], sources = [];
    for (const row of rows) {
      const id = row.id;
      if (!isB(id) || id <= 0n) throw new SourceError('sessions contains an invalid primary key');
      const [st, started] = canonical(row.started_at_utc, 'started_at_utc');
      let closedText = null;
      if (row.closed_at_utc !== null && row.closed_at_utc !== undefined) {
        if (!NS.strip(O.pyStrOf(row.closed_at_utc))) throw new SourceError('sessions contains an empty closed_at_utc');
        const [ct, closed] = canonical(row.closed_at_utc, 'closed_at_utc');
        if (closed < started) throw new SourceError('session closes before it starts');
        closedText = ct;
      }
      ids.push(id);
      sources.push([started, {session_id: id, order_key: [st, id], started_at_utc: st, closed_at_utc: closedText}]);
    }
    if (ids.length !== new Set(ids.map(String)).size) throw new SourceError('sessions contains duplicate primary keys');
    const ordered = sources.slice().sort((a, b) => cmpBig(a[0], b[0]) || cmpBig(a[1].session_id, b[1].session_id)).map((x) => x[1]);
    return [avail(ids.length, 'All committed parent session identities, including open sessions.', 'distinct sessions.id', rows.length), new Set(ids.map(String)), ordered];
  }

  /* ---------------- SINE ---------------- */
  function sineDisplays(rows, sessionIds) {
    const displays = [], seen = new Set();
    for (const row of rows) {
      if (O.pyStrOf(row.kind) !== 'SINE_DISPLAYED') continue;
      const rowId = row.id, sid = row.session_id, ep = strOf(row.episode_uid), cand = strOf(row.candidate_uid), popup = strOf(row.popup_request_id), ns = row.occurred_monotonic_ns;
      const p = jobj(row.payload_json, 'sine_facts'), stage = NS.get(p, 'stage'), wall = NS.get(p, 'occurred_wall_time_utc');
      if (!isB(rowId) || rowId <= 0n || seen.has(String(rowId)) || !isB(sid) || !sessionIds.has(String(sid)) || !ep || !cand || !popup || !isB(ns) || ns < 0n || !isB(stage) || !(stage === 1n || stage === 2n || stage === 3n)
        || typeof wall !== 'string' || !wall || NS.get(p, 'kind') !== 'SINE_DISPLAYED' || !NS.eq(NS.get(p, 'session_id'), sid) || NS.get(p, 'episode_uid') !== ep || NS.get(p, 'candidate_uid') !== cand
        || NS.get(p, 'popup_request_id') !== popup || !NS.eq(NS.get(p, 'occurred_monotonic_ns'), ns) || !SINE_DISPLAY_VERSIONS.has(NS.get(p, 'schema_version'))) throw new SourceError(`invalid SINE display evidence at row ${rowId}`);
      NS.time.parseUtc(wall);
      seen.add(String(rowId));
      displays.push({row_id: rowId, session_id: sid, episode_uid: ep, candidate_uid: cand, stage, popup_request_id: popup, occurred_monotonic_ns: ns, occurred_wall_time_utc: wall});
    }
    const parent = new Map(), candEpisode = new Map();
    for (const d of displays) {
      const p0 = parent.has(d.episode_uid) ? parent.get(d.episode_uid) : (parent.set(d.episode_uid, d.session_id), d.session_id);
      if (p0 !== d.session_id) throw new SourceError('one SINE episode identity spans parent sessions');
      const k = `${d.session_id}|${d.candidate_uid}`, e0 = candEpisode.has(k) ? candEpisode.get(k) : (candEpisode.set(k, d.episode_uid), d.episode_uid);
      if (e0 !== d.episode_uid) throw new SourceError('one SINE candidate maps to multiple genuine episodes');
    }
    return displays;
  }
  function sineTriggerMetric(displays) {
    const slots = new Set(displays.map((d) => `${d.session_id}|${d.episode_uid}|${d.stage}`)), sessions = [...new Set(displays.map((d) => `${d.session_id}|${d.episode_uid}|${d.stage}`))].map((k) => BigInt(k.split('|')[0]));
    return [avail(slots.size, 'Numbered SINE-1/2/3 stages, once per genuine episode and stage; stage-0 post-break gates and same-episode reappearances are excluded.', 'numbered SINE stage first appearance per genuine episode', displays.length), sessions.sort(cmpBig)];
  }

  /* ---------------- Chapter 6 return chain (SCIENCE_LAB/analysis.py) ---------------- */
  const evName = (e) => e.event_name, evTime = (e) => e.occurred_monotonic_ns, evId = (e) => e.event_id, evAttempt = (e) => e.attempt_id;
  function evSupport(e) {
    const v = e.supporting_event_ids;
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !x)) throw new IntegrityError('MIRL supporting-event identity is malformed');
    return v;
  }
  const supportedEvent = (event, expected, episodeId, byId) => {
    const ids = evSupport(event);
    if (ids.some((id) => !byId.has(id) || String(byId.get(id).episode_id || '') !== episodeId || evTime(byId.get(id)) > evTime(event))) throw new IntegrityError('successful MIRL chain has a broken durable support');
    const m = ids.filter((id) => evName(byId.get(id)) === expected).map((id) => byId.get(id));
    if (m.length !== 1) throw new IntegrityError(`successful MIRL chain cannot prove ${expected} support`);
    return m[0];
  };
  const uniqueEpisodeEvent = (events, name) => { const m = events.filter((e) => evName(e) === name); if (m.length !== 1) throw new IntegrityError(`successful MIRL episode does not contain one ${name} event`); return m[0]; };
  const uniqueAttemptEvent = (events, name, attempt, index) => { const m = events.filter((e) => evName(e) === name && evAttempt(e) === attempt && e.attempt_index === index); if (m.length !== 1) throw new IntegrityError(`successful MIRL attempt does not contain one ${name} event`); return m[0]; };
  function successfulReturnChain(episodeId, events, closed, byId) {
    const attempt = evAttempt(closed), index = closed.attempt_index;
    if (!attempt || !isB(index) || index <= 0n) throw new IntegrityError('successful MIRL closure lacks attempt identity');
    const created = uniqueEpisodeEvent(events, 'episode_created');
    const openings = events.filter((e) => evName(e) === 'sine_displayed' && e.sine_stage === 1n && (() => { const s = evSupport(e); return s.length === 1 && s[0] === evId(created); })());
    if (openings.length !== 1) throw new IntegrityError('successful MIRL episode lacks one durable opening SINE display');
    const opening = openings[0];
    const closureCompleted = supportedEvent(closed, 'closure_confirmation_completed', episodeId, byId);
    const closureStarted = uniqueAttemptEvent(events, 'closure_confirmation_started', attempt, index);
    const returnVerified = supportedEvent(closureStarted, 'return_verified', episodeId, byId);
    const verificationCompleted = supportedEvent(returnVerified, 'return_verification_completed', episodeId, byId);
    const returnStarted = uniqueAttemptEvent(events, 'return_verification_started', attempt, index);
    const disq = new Set(['return_verification_interrupted', 'closure_confirmation_interrupted', 'evidence_gap', 'emergency_stopped']);
    if (events.some((e) => evAttempt(e) === attempt && e.attempt_index === index && disq.has(evName(e)) && evTime(returnStarted) <= evTime(e) && evTime(e) <= evTime(closed))) throw new IntegrityError('successful MIRL closure contains an interrupted or evidence-gap attempt');
    const attemptEvents = [returnStarted, verificationCompleted, returnVerified, closureStarted, closureCompleted, closed];
    if (attemptEvents.some((e) => evAttempt(e) !== attempt || e.attempt_index !== index)) throw new IntegrityError('successful MIRL chain changed attempt identity');
    const chain = [created, opening, ...attemptEvents], t = chain.map(evTime);
    if (!(t[0] <= t[1] && t[1] < t[2] && t.slice(2).every((x, i) => i + 3 >= t.length || x <= t[i + 3]))) throw new IntegrityError('successful MIRL chain is out of order');
    return chain;
  }
  /** _lifetime_successful_return_onset_latency_samples: [{episode_id, attempt_id, latency_ns}], skipped */
  function lifetimeSamples(events) {
    const byId = new Map(); for (const e of events) byId.set(evId(e), e);
    const byEpisode = new Map(); for (const e of events) { const id = String(e.episode_id || ''); if (!id) continue; if (!byEpisode.has(id)) byEpisode.set(id, []); byEpisode.get(id).push(e); }
    const ids = [...byEpisode.keys()].sort((a, b) => NS.cmp(a, b)), samples = []; let skipped = 0;
    for (const id of ids) {
      const list = byEpisode.get(id), closes = list.filter((e) => evName(e) === 'episode_closed' && String(e.reason || '') === 'RETURNED');
      if (!closes.length) continue;
      if (closes.length !== 1) { skipped++; continue; }
      let chain;
      try { chain = successfulReturnChain(id, list, closes[0], byId); } catch (e) { if (e instanceof IntegrityError) { skipped++; continue; } throw e; }
      samples.push({episode_id: id, attempt_id: evAttempt(chain[2]), latency_ns: evTime(chain[2]) - evTime(chain[1])});
    }
    return [samples, skipped];
  }
  const legacyNote = (n) => (n <= 0 ? '' : ` ${n} historical ${n === 1 ? 'episode' : 'episodes'} could not support the complete durable return-onset chain and were excluded.`);

  function sineReturnMetric(displays, mirl, sessionIds) {
    const [samples, skipped] = lifetimeSamples(mirl);
    if (skipped) throw new SourceError(`scoped Chapter 6 validation excluded ${skipped} returned episode(s)`);
    const byEpisode = new Map(); for (const e of mirl) { if (!byEpisode.has(e.episode_id)) byEpisode.set(e.episode_id, []); byEpisode.get(e.episode_id).push(e); }
    const stage1 = new Map();
    for (const d of displays) if (d.stage === 1n) { const k = JSON.stringify([String(d.session_id), d.candidate_uid, d.occurred_wall_time_utc]); if (!stage1.has(k)) stage1.set(k, new Set()); stage1.get(k).add(d.episode_uid); }
    const mapped = new Map(), owner = new Map();
    for (const s of samples) {
      const created = (byEpisode.get(s.episode_id) || []).filter((e) => evName(e) === 'episode_created');
      if (created.length !== 1) throw new SourceError('validated MIRL return lacks one episode-created identity');
      const o = created[0];
      if (!isB(o.session_id) || !sessionIds.has(String(o.session_id)) || !o.candidate_uid) throw new SourceError('validated MIRL return lacks a valid parent/candidate');
      const m = stage1.get(JSON.stringify([String(o.session_id), o.candidate_uid, o.occurred_wall_time_utc])) || new Set();
      if (m.size !== 1) throw new SourceError('validated MIRL return cannot map uniquely to its genuine SINE episode');
      const sineEpisode = [...m][0], prev = owner.has(sineEpisode) ? owner.get(sineEpisode) : (owner.set(sineEpisode, s.episode_id), s.episode_id);
      if (prev !== s.episode_id) throw new SourceError('multiple MIRL episodes map to one SINE episode');
      mapped.set(s.episode_id, [o.session_id, sineEpisode]);
    }
    const slots = new Map(); for (const [sid, ep] of mapped.values()) slots.set(`${sid}|${ep}`, sid);
    return [avail(slots.size, 'Scoped Chapter 6 durable return-chain validation, mapped to genuine SINE episodes. This does not resolve global MIRL degradation.', 'scoped Chapter 6 validated returned SINE episode', samples.length), [...slots.values()].sort(cmpBig)];
  }
  /** METRIC_HUB._mirl_events: row/payload identity checks, then the MirlEvent. */
  function mirlRows(rows) {
    const events = [], seen = new Set();
    for (const row of rows) {
      const p = jobj(row.payload_json, 'mirl_events'), eid = strOf(NS.get(p, 'event_id'));
      if (!eid || seen.has(eid) || eid !== O.pyStrOf(row.event_id) || strOf(NS.get(p, 'episode_id')) !== O.pyStrOf(row.episode_id) || !NS.eq(NS.get(p, 'episode_sequence'), row.episode_sequence)
        || strOf(NS.get(p, 'event_name')) !== O.pyStrOf(row.event_name) || !NS.eq(NS.get(p, 'occurred_monotonic_ns'), row.occurred_monotonic_ns) || !NS.eq(NS.get(p, 'session_id'), row.session_id)) throw new SourceError(`MIRL row identity mismatch at ${row.event_id}`);
      let ev;
      try { ev = O.mirlEvent(row.payload_json); } catch (e) { if (e instanceof PyError && (e.kind === 'KeyError' || e.kind === 'TypeError' || e.kind === 'ValueError')) throw new SourceError(`invalid MIRL event ${eid}`); throw e; }
      seen.add(eid); events.push(ev);
    }
    return events;
  }

  /* ---------------- MINE / COSINE ---------------- */
  const rowsToMine = (rows) => rows.map((r) => { try { return O.mineEvent(r); } catch (e) { if (e instanceof PyError && (e.kind === 'TypeError' || e.kind === 'ValueError')) throw new SourceError('MINE row cannot be reconstructed'); throw e; } });
  const rowsToCosine = (rows) => rows.map((r) => { try { return O.cosineEvent(r); } catch (e) { if (e instanceof PyError && (e.kind === 'TypeError' || e.kind === 'ValueError')) throw new SourceError('COSINE row cannot be reconstructed'); throw e; } });
  function mineMetric(rows, sessionIds, zone) {
    const events = rowsToMine(rows);
    if (events.some((e) => !sessionIds.has(String(e.parent_session_id)))) throw new SourceError('MINE contains an invalid parent session');
    const proj = O.readMine({zone, events});
    if (!proj.available) throw new SourceError(`MINE validation failed: ${proj.status}`);
    const slots = new Map(), returned = new Map();
    for (const ep of proj.episodes) {
      const id = `${ep.session_id}|${ep.generation}|${ep.mine_episode_id}`;
      for (const e of ep.events) if (MINE_STAGES.has(e.event_name) && e.event_class === 'PRESENTATION') slots.set(`${id}|${e.event_name}`, ep.session_id);
      const conf = ep.events.filter((e) => e.event_name === 'RETURN_CONFIRMED');
      if (conf.length > 1) throw new SourceError('MINE episode has multiple return confirmations');
      if (conf.length) {
        const closes = ep.events.filter((e) => e.event_name === 'MINE_SESSION_CLOSED');
        if (closes.length !== 1) throw new SourceError('MINE confirmed return lacks one closure');
        const c = conf[0], close = closes[0], outcome = O.pyStrOf(NS.has(c.payload_facts, 'closure_outcome') ? c.payload_facts.closure_outcome : '');
        if (c.event_class !== 'DERIVED' || close.sequence <= c.sequence || close.payload_facts.closure_reason !== 'VERIFIED_RETURN' || close.payload_facts.closure_outcome !== outcome || !MINE_RETURNS.has(outcome)) throw new SourceError('MINE return/closure proof is inconsistent');
        returned.set(id, ep.session_id);
      }
    }
    return {metric: {organ: 'MINE', triggers: avail(slots.size, 'MINE1/MINE2A/MINE2B presentation stages, once per episode and stage.', 'validated MINE presentation stage per genuine episode/generation', events.filter((e) => MINE_STAGES.has(e.event_name) && e.event_class === 'PRESENTATION').length),
      returned: avail(returned.size, 'RETURN_CONFIRMED with matching successful same-episode closure.', 'validated returned MINE episode', returned.size),
      trigger_disclosure: 'Validated MINE presentation stages; restorations do not add a stage slot.', return_disclosure: 'Confirmed same-episode return and successful closure.'},
      triggerSessions: [...slots.values()].sort(cmpBig), returnSessions: [...returned.values()].sort(cmpBig)};
  }
  function cosineMetric(rows, sessionIds, zone) {
    const events = rowsToCosine(rows);
    if (events.some((e) => e.session_id === null || !sessionIds.has(String(e.session_id)))) throw new SourceError('COSINE contains an invalid parent session');
    const proj = O.readCosine({zone, events});
    if (!proj.available) throw new SourceError(`COSINE validation failed: ${proj.status}`);
    const slots = new Map(), returned = new Map();
    for (const ep of proj.episodes) {
      if (!isB(ep.parent_session_id)) throw new SourceError('COSINE episode lacks a parent session');
      const id = `${ep.parent_session_id}|${ep.cosine_session_id}|${ep.generation}`;
      for (const e of ep.events) if (COSINE_STAGES.has(e.event_name) && e.event_class === 'PRESENTATION') slots.set(`${id}|${e.event_name}`, ep.parent_session_id);
      const conf = ep.events.filter((e) => e.event_name === 'RETURN_CONFIRMED');
      if (conf.length > 1) throw new SourceError('COSINE episode has multiple return confirmations');
      if (conf.length) {
        const closes = ep.events.filter((e) => e.event_name === 'COSINE_SESSION_CLOSED');
        if (closes.length !== 1) throw new SourceError('COSINE confirmed return lacks one closure');
        const c = conf[0], close = closes[0], outcome = O.pyStrOf(NS.has(c.payload_display, 'closure_outcome') ? c.payload_display.closure_outcome : '');
        if (c.event_class !== 'DERIVED' || close.sequence <= c.sequence || close.payload_display.closure_reason !== 'RETURN_CONFIRMED' || close.payload_display.closure_outcome !== outcome || !COSINE_RETURNS.has(outcome)) throw new SourceError('COSINE return/closure proof is inconsistent');
        returned.set(id, ep.parent_session_id);
      }
    }
    return {metric: {organ: 'COSINE', triggers: avail(slots.size, 'PARTIAL: explicit acknowledged INTENT_GATE, BREAK_ACK and FINAL_CALLBACK displays only; duration-popup visibility is not evidenced.', 'acknowledged COSINE presentation stage per genuine episode/generation',
      events.filter((e) => COSINE_STAGES.has(e.event_name) && e.event_class === 'PRESENTATION').length),
      returned: avail(returned.size, 'RETURN_CONFIRMED with matching successful OTT episode closure.', 'validated returned COSINE episode', returned.size),
      trigger_disclosure: 'PARTIAL — acknowledged displays only; duration-popup visibility unsupported.', return_disclosure: 'Confirmed same-episode return; handovers and intent are excluded.'},
      triggerSessions: [...slots.values()].sort(cmpBig), returnSessions: [...returned.values()].sort(cmpBig)};
  }

  /* ---------------- behaviour distribution (pie) ---------------- */
  const PIE_EXPLANATION = 'One episode per documented first display: SINE-1 joined to its accepted trigger, MINE-1 joined to same-generation messaging evidence, and COSINE intent-gate display joined to same-episode certified OTT evidence.';
  const pieSummary = (ex) => Object.keys(ex).sort((a, b) => NS.cmp(a, b)).filter((k) => ex[k] > 0).map((k) => ({reason_code: k, count: ex[k]}));
  const pieUnavailable = (reason, ex = {}) => { const s = pieSummary(ex); return {status: UNAVAILABLE, social_count: null, ott_count: null, messaging_count: null, eligible_total: null, social_percent: null, ott_percent: null, messaging_percent: null, excluded_identity_count: s.reduce((a, x) => a + x.count, 0), exclusions: s, source_explanation: PIE_EXPLANATION, status_message: reason}; };
  function pieComplete(social, ott, messaging, ex) {
    const total = social + ott + messaging, s = pieSummary(ex), excluded = s.reduce((a, x) => a + x.count, 0);
    if (total === 0) return {status: NO_DATA, social_count: social, ott_count: ott, messaging_count: messaging, eligible_total: 0, social_percent: null, ott_percent: null, messaging_percent: null, excluded_identity_count: excluded, exclusions: s, source_explanation: PIE_EXPLANATION, status_message: 'No documented distraction-intervention episodes.'};
    const sp = 100 * social / total, op = 100 * ott / total, mp = 100 * messaging / total;
    if (Math.abs(sp + op + mp - 100) > 1e-8) throw NS.ValueError('pie percentages do not conserve 100 percent');
    return {status: AVAILABLE, social_count: social, ott_count: ott, messaging_count: messaging, eligible_total: total, social_percent: sp, ott_percent: op, messaging_percent: mp, excluded_identity_count: excluded, exclusions: s, source_explanation: PIE_EXPLANATION, status_message: 'Documented distraction-intervention episode distribution is available.'};
  }
  function triggerEvidence(rows, sessionIds) {
    const out = new Map(), seen = new Set();
    for (const row of rows) {
      const rowId = row.id, sid = row.session_id, cand = strOf(row.candidate_uid), ns = row.occurred_monotonic_ns, p = jobj(row.payload_json, 'triggers'), ev = NS.get(p, 'evidence'), rec = NS.get(p, 'recovery_model');
      if (!isB(rowId) || rowId <= 0n || seen.has(String(rowId)) || !isB(sid) || !sessionIds.has(String(sid)) || !cand || !isB(ns) || ns <= 0n || NS.get(p, 'candidate_uid') !== cand || !NS.eq(NS.get(p, 'session_id'), sid)
        || NS.get(p, 'trigger') !== true || !TRIGGER_VERSIONS.has(NS.get(p, 'schema_version')) || !NS.isDict(ev) || !NS.eq(NS.get(ev, 'observed_monotonic_ns'), ns) || !NS.isDict(rec)) throw new SourceError(`invalid accepted trigger evidence at row ${rowId}`);
      const key = `${sid}|${cand}`;
      if (out.has(key)) throw new SourceError('accepted trigger identity is duplicated');
      seen.add(String(rowId));
      const low = (v) => NS.strip(strOf(v)).toLowerCase();
      out.set(key, {session_id: sid, candidate_uid: cand, reason: strOf(NS.get(p, 'reason')), source: strOf(NS.get(ev, 'source')), source_rule_id: strOf(NS.get(ev, 'source_rule_id')), source_policy_version: strOf(NS.get(ev, 'source_policy_version')),
        platform_key: low(NS.get(ev, 'platform_key')), surface_class: low(NS.get(ev, 'surface_class')), study_context_token: strOf(NS.get(ev, 'study_context_token')), evidence_digest: strOf(NS.get(ev, 'evidence_digest')), model_category: low(NS.get(rec, 'model_category'))});
    }
    return out;
  }
  function socialCount(displays, triggers, ex) {
    const grouped = new Map(), represented = new Set();
    for (const d of displays) { if (d.stage !== 1n) continue; const k = `${d.session_id}|${d.episode_uid}`; if (!grouped.has(k)) grouped.set(k, []); grouped.get(k).push(d); represented.add(`${d.session_id}|${d.candidate_uid}`); }
    let eligible = 0;
    for (const [k, list] of grouped) {
      const cands = new Set(list.map((d) => d.candidate_uid));
      if (cands.size !== 1) { ex.SINE_AMBIGUOUS_IDENTITY = (ex.SINE_AMBIGUOUS_IDENTITY || 0) + 1; continue; }
      const t = triggers.get(`${k.split('|')[0]}|${[...cands][0]}`);
      if (!t) { ex.SINE_TRIGGER_MISSING = (ex.SINE_TRIGGER_MISSING || 0) + 1; continue; }
      if (!t.evidence_digest || !t.source_rule_id || !t.source_policy_version) { ex.SINE_TRIGGER_INCOMPLETE = (ex.SINE_TRIGGER_INCOMPLETE || 0) + 1; continue; }
      if (!t.platform_key || t.platform_key === 'unknown' || !SOCIAL.has(t.surface_class) || ['activity', 'messaging', 'cosine'].includes(t.surface_class) || t.model_category === 'activity' || PLATFORM_KEYS.has(t.platform_key)) { ex.SINE_CATEGORY_UNSUPPORTED = (ex.SINE_CATEGORY_UNSUPPORTED || 0) + 1; continue; }
      let ok;
      if (t.source === 'study_off_task') ok = t.reason === 'study_off_task_dwell' && t.source_rule_id === 'RI-STUDY-OFF-TASK-READY-001' && !!t.study_context_token;
      else if (t.source === 'executive_blacklist') ok = t.reason === 'executive_blacklist_dwell' && t.source_rule_id.startsWith('EB-');
      else ok = false;
      if (!ok) { ex.SINE_CONTEXT_UNSUPPORTED = (ex.SINE_CONTEXT_UNSUPPORTED || 0) + 1; continue; }
      eligible++;
    }
    for (const key of triggers.keys()) if (!represented.has(key)) ex.SINE_NOT_DISPLAYED = (ex.SINE_NOT_DISPLAYED || 0) + 1;
    return eligible;
  }
  function messagingCount(events, zone, ex) {
    const proj = O.readMine({zone, events});
    if (!proj.available) throw new SourceError(`MINE pie validation failed: ${proj.status}`);
    const groups = new Map(); for (const e of events) { const k = `${e.parent_session_id}|${e.generation}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    let eligible = 0; const seen = new Set();
    for (const ep of proj.episodes) {
      const id = `${ep.session_id}|${ep.generation}|${ep.mine_episode_id}`;
      if (seen.has(id)) { ex.MINE_DUPLICATE_IDENTITY = (ex.MINE_DUPLICATE_IDENTITY || 0) + 1; continue; }
      seen.add(id);
      const ordered = groups.get(`${ep.session_id}|${ep.generation}`).slice().sort((a, b) => cmpBig(a.sequence, b.sequence)), named = (n) => ordered.filter((e) => e.event_name === n);
      const cands = named('MINE_CANDIDATE_STARTED'), entered = named('MESSAGING_PLATFORM_ENTERED'), displays = named('MINE1_DISPLAYED'), starts = named('MINE_EPISODE_STARTED');
      if (!(cands.length === 1 && entered.length === 1 && displays.length === 1 && starts.length === 1)) { ex.MINE_LINEAGE_AMBIGUOUS = (ex.MINE_LINEAGE_AMBIGUOUS || 0) + 1; continue; }
      const [cand, pe, disp, st] = [cands[0], entered[0], displays[0], starts[0]];
      if (cand.event_class !== 'OBSERVED' || pe.event_class !== 'OBSERVED' || disp.event_class !== 'PRESENTATION' || st.event_class !== 'DERIVED' || !(cand.sequence < pe.sequence && pe.sequence < disp.sequence && disp.sequence < st.sequence)
        || disp.mine_episode_id !== ep.mine_episode_id || st.mine_episode_id !== ep.mine_episode_id || !disp.request_id || disp.request_id !== st.request_id) { ex.MINE_LINEAGE_INVALID = (ex.MINE_LINEAGE_INVALID || 0) + 1; continue; }
      if (!cand.platform_key || cand.platform_key !== pe.platform_key || !cand.evidence_token || cand.evidence_token !== pe.evidence_token) { ex.MINE_PLATFORM_AMBIGUOUS = (ex.MINE_PLATFORM_AMBIGUOUS || 0) + 1; continue; }
      let current = pe.platform_key;
      for (const e of ordered) {
        if (e.sequence >= disp.sequence) break;
        if (e.event_name !== 'MESSAGING_PLATFORM_TRANSITION') continue;
        const p = jobj(e.payload_json, 'mine_events');
        if (NS.get(p, 'from_platform') !== current || NS.get(p, 'to_platform') !== e.platform_key || !e.platform_key || !e.evidence_token) { current = ''; break; }
        current = e.platform_key;
      }
      if (!current) { ex.MINE_PLATFORM_AMBIGUOUS = (ex.MINE_PLATFORM_AMBIGUOUS || 0) + 1; continue; }
      eligible++;
    }
    return eligible;
  }
  function ottCount(events, zone, ex) {
    const proj = O.readCosine({zone, events});
    if (!proj.available) throw new SourceError(`COSINE pie validation failed: ${proj.status}`);
    const groups = new Map(); for (const e of events) { const k = JSON.stringify([e.cosine_session_id, String(e.generation)]); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); }
    let eligible = 0; const seen = new Set();
    for (const ep of proj.episodes) {
      if (!isB(ep.parent_session_id)) { ex.COSINE_PARENT_MISSING = (ex.COSINE_PARENT_MISSING || 0) + 1; continue; }
      const id = `${ep.parent_session_id}|${ep.cosine_session_id}|${ep.generation}`;
      if (seen.has(id)) { ex.COSINE_DUPLICATE_IDENTITY = (ex.COSINE_DUPLICATE_IDENTITY || 0) + 1; continue; }
      seen.add(id);
      const ordered = groups.get(JSON.stringify([ep.cosine_session_id, String(ep.generation)])).slice().sort((a, b) => cmpBig(a.sequence, b.sequence)), named = (n) => ordered.filter((e) => e.event_name === n);
      const starts = named('COSINE_SESSION_STARTED'), entered = named('OTT_PLATFORM_ENTERED'), elig = named('INTENT_GATE_ELIGIBLE'), reqs = named('INTENT_GATE_REQUESTED'), displays = named('INTENT_GATE_DISPLAYED');
      if (!(starts.length === 1 && entered.length === 1 && elig.length === 1 && reqs.length === 1 && displays.length === 1)) { if (displays.length) ex.COSINE_LINEAGE_AMBIGUOUS = (ex.COSINE_LINEAGE_AMBIGUOUS || 0) + 1; continue; }
      const [st, pe, ge, rq, ds] = [starts[0], entered[0], elig[0], reqs[0], displays[0]];
      if (st.session_id !== ep.parent_session_id || st.event_class !== 'OBSERVED' || pe.event_class !== 'OBSERVED' || ge.event_class !== 'DERIVED' || rq.event_class !== 'DERIVED' || ds.event_class !== 'PRESENTATION'
        || !(st.sequence < pe.sequence && pe.sequence < ge.sequence && ge.sequence < rq.sequence && rq.sequence < ds.sequence) || !rq.request_id || ge.request_id !== rq.request_id || ds.request_id !== rq.request_id) { ex.COSINE_LINEAGE_INVALID = (ex.COSINE_LINEAGE_INVALID || 0) + 1; continue; }
      const sp = jobj(st.payload_json, 'cosine_events');
      if (!PLATFORM_KEYS.has(st.platform_key) || pe.platform_key !== st.platform_key || !st.evidence_token || pe.evidence_token !== st.evidence_token || !['CERTIFIED_HOST', 'NATIVE_PROCESS', 'WINDOWS_APP'].includes(NS.get(sp, 'evidence_source'))) { ex.COSINE_PLATFORM_AMBIGUOUS = (ex.COSINE_PLATFORM_AMBIGUOUS || 0) + 1; continue; }
      let current = st.platform_key;
      for (const e of ordered) {
        if (e.sequence >= ds.sequence) break;
        if (e.event_name !== 'HOPPER_TRANSITION') continue;
        const p = jobj(e.payload_json, 'cosine_events');
        if (NS.get(p, 'from_platform') !== current || NS.get(p, 'to_platform') !== e.platform_key || !PLATFORM_KEYS.has(e.platform_key) || !e.evidence_token) { current = ''; break; }
        current = e.platform_key;
      }
      if (!current) { ex.COSINE_PLATFORM_AMBIGUOUS = (ex.COSINE_PLATFORM_AMBIGUOUS || 0) + 1; continue; }
      eligible++;
    }
    return eligible;
  }
  function behaviourDistribution(src, sessionIds, zone) {
    const ex = {}, triggers = triggerEvidence(src.triggers, sessionIds), displays = sineDisplays(src.sine, sessionIds), mine = rowsToMine(src.mine), cosine = rowsToCosine(src.cosine);
    if (mine.some((e) => !sessionIds.has(String(e.parent_session_id)))) throw new SourceError('MINE pie source contains an invalid parent session');
    if (cosine.some((e) => e.session_id === null || !sessionIds.has(String(e.session_id)))) throw new SourceError('COSINE pie source contains an invalid parent session');
    const social = socialCount(displays, triggers, ex), ott = ottCount(cosine, zone, ex), messaging = messagingCount(mine, zone, ex);
    return pieComplete(social, ott, messaging, ex);
  }

  /* ---------------- COSECANT ---------------- */
  function cosecantMetric(rows, sessionIds) {
    const groups = new Map(); let sourceStageRows = 0;
    for (const row of rows) {
      const kind = O.pyStrOf(row.kind), p = jobj(row.payload_json, 'cosecant_events'), breakId = strOf(row.break_id);
      if (!breakId && kind === 'SAFE_SHUTDOWN') continue;
      const sid = row.session_id;
      if (!isB(row.id) || row.id <= 0n || !isB(sid) || !sessionIds.has(String(sid)) || !breakId || !isB(row.sequence) || row.sequence <= 0n || !isB(row.occurred_monotonic_ns) || row.occurred_monotonic_ns < 0n
        || !NS.eq(NS.get(p, 'sequence'), row.sequence) || NS.get(p, 'break_id') !== breakId || NS.get(p, 'kind') !== kind || !NS.eq(NS.get(p, 'observed_monotonic_ns'), row.occurred_monotonic_ns) || NS.get(p, 'schema_version') !== COSECANT_SCHEMA) throw new SourceError(`invalid COSECANT evidence at row ${row.id}`);
      const wall = NS.get(p, 'occurred_wall_time_utc');
      if (typeof wall !== 'string' || !wall) throw new SourceError('COSECANT fact lacks a UTC timestamp');
      NS.time.parseUtc(wall);
      const k = `${sid}|${breakId}`; if (!groups.has(k)) groups.set(k, {sid, facts: []}); groups.get(k).facts.push(p);
      if (COSECANT_STAGES.has(kind)) sourceStageRows++;
    }
    const slots = new Map(), returned = new Map();
    for (const [key, {sid, facts}] of groups) {
      const ordered = facts.slice().sort((a, b) => cmpBig(NS.get(a, 'sequence'), NS.get(b, 'sequence'))), seqs = ordered.map((f) => f.sequence);
      if (!seqs.every((v, i) => v === seqs[0] + BigInt(i))) throw new SourceError('COSECANT break sequence is not contiguous');
      const starts = ordered.filter((f) => f.kind === 'BREAK_STARTED'), relevant = ordered.some((f) => COSECANT_STAGES.has(f.kind) || f.kind === 'RETURN_CONFIRMED');
      if (relevant && (starts.length !== 1 || starts[0].sequence !== seqs[0])) throw new SourceError('COSECANT break lacks one opening BREAK_STARTED fact');
      const kinds = ordered.map((f) => String(f.kind)), want = {BREAK_COMPLETE: 'BREAK_COMPLETE', BREAK_ALREADY_OVER: 'BREAK_ALREADY_OVER', FINAL_LOCKED: 'FINAL_LOCK'};
      for (const f of ordered) if (COSECANT_STAGES.has(String(f.kind))) { if (NS.get(f, 'to_state') !== want[f.kind]) throw new SourceError('COSECANT reminder transition has the wrong state'); slots.set(`${key}|${f.kind}`, sid); }
      if (kinds.includes('BREAK_ALREADY_OVER') && !kinds.includes('BREAK_COMPLETE')) throw new SourceError('COSECANT overdue stage lacks break completion');
      if (kinds.includes('FINAL_LOCKED') && (!kinds.includes('BREAK_COMPLETE') || !kinds.includes('BREAK_ALREADY_OVER'))) throw new SourceError('COSECANT final stage lacks its reminder path');
      const conf = ordered.filter((f) => f.kind === 'RETURN_CONFIRMED');
      if (conf.length > 1) throw new SourceError('COSECANT break has multiple return confirmations');
      if (conf.length) {
        const cpos = ordered.map((f, i) => (f.kind === 'BREAK_COMPLETE' ? i : -1)).filter((i) => i >= 0), at = ordered.indexOf(conf[0]);
        if (!cpos.length || cpos[0] >= at || NS.get(conf[0], 'to_state') !== 'CONFIRMED' || !strOf(NS.get(conf[0], 'evidence_token'))) throw new SourceError('COSECANT return lacks same-break resource proof');
        returned.set(key, sid);
      }
    }
    return {metric: {organ: 'COSECANT', triggers: avail(slots.size, 'Reminder stages REACHED (BREAK_COMPLETE, BREAK_ALREADY_OVER, FINAL_LOCKED), once per genuine break; these are not witnessed popup paints.', 'durable COSECANT reminder stage reached per genuine break', sourceStageRows),
      returned: avail(returned.size, 'Same-break completion plus exact-resource RETURN_CONFIRMED proof.', 'validated returned COSECANT break', returned.size),
      trigger_disclosure: 'Reminder stages REACHED — not independently witnessed popup paints.', return_disclosure: 'Completed same-break exact-resource return confirmation.'}, triggerSessions: [...slots.values()].sort(cmpBig), returnSessions: [...returned.values()].sort(cmpBig)};
  }

  /* ---------------- assembly ---------------- */
  function sumMetric(label, parts) {
    const blocked = parts.filter(([, m]) => m.status !== AVAILABLE).map(([n]) => n);
    if (blocked.length) return unav(`${label} unavailable because ${blocked.join(', ')} contribution(s) are unavailable.`, 'sum of the four displayed organ contributions');
    return avail(parts.reduce((a, [, m]) => a + Number(m.value), 0), 'Exact sum of the four displayed same-snapshot organ contributions.', 'sum of the four displayed organ contributions', 4);
  }
  const countIn = (list, sid) => list.filter((x) => x === sid).length;
  function sessionMetric(lifetime, list, sid) {
    if (list === null || lifetime.status !== AVAILABLE) return unav(lifetime.reason, lifetime.evidence_unit);
    const v = countIn(list, sid); return avail(v, lifetime.reason, lifetime.evidence_unit, v);
  }
  function buildSessionRows(sources, evidence, sessions, totalTriggers, totalReturned) {
    if (sessions.status !== AVAILABLE) throw new SourceError('session population is unavailable');
    if (sources.length !== sessions.value) throw new SourceError('session row population does not reconcile');
    const byName = {}; for (const e of evidence) byName[e.metric.organ] = e;
    const rows = [];
    sources.forEach((src, i) => {
      const per = {};
      for (const name of ['SINE', 'COSINE', 'MINE', 'COSECANT']) { const o = byName[name]; per[name] = {triggers: sessionMetric(o.metric.triggers, o.triggerSessions, src.session_id), returned: sessionMetric(o.metric.returned, o.returnSessions, src.session_id)}; }
      const tp = ['SINE', 'COSINE', 'MINE', 'COSECANT'].map((n) => [n, per[n].triggers]), rp = ['SINE', 'COSINE', 'MINE', 'COSECANT'].map((n) => [n, per[n].returned]);
      rows.push({session_id: src.session_id, ordinal: i + 1, order_key: src.order_key, started_at_utc: src.started_at_utc, closed_at_utc: src.closed_at_utc, is_closed: src.closed_at_utc !== null, sine: per.SINE, cosine: per.COSINE, mine: per.MINE, cosecant: per.COSECANT,
        combined_triggers: sumMetric('Session combined triggers', tp), combined_returned: sumMetric('Session combined returned', rp)});
    });
    for (const [name, attr] of [['SINE', 'sine'], ['COSINE', 'cosine'], ['MINE', 'mine'], ['COSECANT', 'cosecant']]) for (const mn of ['triggers', 'returned']) {
      const life = byName[name].metric[mn]; if (life.status !== AVAILABLE) continue;
      const vals = rows.map((r) => r[attr][mn]);
      if (vals.some((v) => v.status !== AVAILABLE) || vals.reduce((a, v) => a + Number(v.value), 0) !== Number(life.value)) throw new SourceError(`${name} per-session ${mn} does not reconcile`);
    }
    for (const [label, life, attr] of [['trigger', totalTriggers, 'combined_triggers'], ['return', totalReturned, 'combined_returned']]) {
      if (life.status !== AVAILABLE) continue;
      const vals = rows.map((r) => r[attr]);
      if (vals.some((v) => v.status !== AVAILABLE) || vals.reduce((a, v) => a + Number(v.value), 0) !== Number(life.value)) throw new SourceError(`combined per-session ${label} total does not reconcile`);
    }
    return rows;
  }
  const SQLS = {
    sessions: ['sessions', ['id', 'started_at_utc', 'closed_at_utc'], 'SELECT id, started_at_utc, closed_at_utc FROM "sessions" ORDER BY id LIMIT ?'],
    triggers: ['triggers', ['id', 'session_id', 'candidate_uid', 'occurred_monotonic_ns', 'payload_json'], 'SELECT id, session_id, candidate_uid, occurred_monotonic_ns, payload_json FROM "triggers" ORDER BY id LIMIT ?'],
    sine_facts: ['sine_facts', ['id', 'session_id', 'episode_uid', 'candidate_uid', 'kind', 'popup_request_id', 'occurred_monotonic_ns', 'payload_json'], 'SELECT id, session_id, episode_uid, candidate_uid, kind, popup_request_id, occurred_monotonic_ns, payload_json FROM "sine_facts" ORDER BY occurred_monotonic_ns, id LIMIT ?'],
    mirl_events: ['mirl_events', ['event_id', 'session_id', 'episode_id', 'episode_sequence', 'event_name', 'occurred_monotonic_ns', 'payload_json'], 'SELECT event_id, session_id, episode_id, episode_sequence, event_name, occurred_monotonic_ns, payload_json FROM "mirl_events" ORDER BY occurred_monotonic_ns, event_id LIMIT ?'],
    mine_events: ['mine_events', ['event_id', 'session_id', 'mine_episode_id', 'generation', 'sequence', 'event_name', 'event_class', 'occurred_at_utc', 'monotonic_ns', 'platform_key', 'platform_label', 'request_id', 'evidence_token', 'payload_json', 'schema_version'], 'SELECT * FROM "mine_events" ORDER BY session_id, generation, sequence, event_id LIMIT ?'],
    cosine_events: ['cosine_events', ['event_id', 'session_id', 'cosine_session_id', 'generation', 'sequence', 'event_name', 'event_class', 'occurred_at_utc', 'monotonic_ns', 'platform_key', 'content_title', 'request_id', 'evidence_token', 'payload_json', 'schema_version'], 'SELECT * FROM "cosine_events" ORDER BY cosine_session_id, generation, sequence, event_id LIMIT ?'],
    cosecant_events: ['cosecant_events', ['id', 'session_id', 'break_id', 'sequence', 'kind', 'occurred_monotonic_ns', 'payload_json'], 'SELECT id, session_id, break_id, sequence, kind, occurred_monotonic_ns, payload_json FROM "cosecant_events" ORDER BY break_id, sequence, id LIMIT ?']
  };
  function allUnavailable(reason) {
    return {sessions: unav(reason, 'distinct sessions.id'), total_triggers: unav(reason, 'sum of four organ trigger contributions'), total_returned: unav(reason, 'sum of four organ return contributions'), sine: organUnav('SINE', reason), cosine: organUnav('COSINE', reason),
      mine: organUnav('MINE', reason), cosecant: organUnav('COSECANT', reason), behaviour_distribution: pieUnavailable(reason), status: UNAVAILABLE, status_message: reason, session_rows: [], session_series_status: UNAVAILABLE, session_series_message: 'Session series is unavailable.', read_only: true};
  }
  function readLifetimeMetricHub(ctx) {
    const zone = ctx.zone, errors = {}, data = {};
    for (const [name, [table, cols, sql]] of Object.entries(SQLS)) {
      try {
        const have = ctx.columns(table);
        if (!have.length) throw new SourceError(`required table ${table} is missing`);
        const missing = cols.filter((c) => !have.includes(c)).sort();
        if (missing.length) throw new SourceError(`${table} is missing columns: ${missing.join(', ')}`);
        data[name] = ctx.rows(sql);
      } catch (e) { if (e instanceof SourceError || e instanceof PyError) { errors[name] = bounded(e); data[name] = []; } else throw e; }
    }
    let sessions, sessionIds, sources;
    if (errors.sessions) { sessions = unav(errors.sessions, 'distinct sessions.id'); sessionIds = new Set(); sources = []; }
    else { try { [sessions, sessionIds, sources] = sessionPopulation(data.sessions); } catch (e) { if (!catches(e)) throw e; sessions = unav(bounded(e), 'distinct sessions.id'); sessionIds = new Set(); sources = []; } }
    let sineEv, mineEv, cosineEv, cosecantEv;
    if (sessions.status !== AVAILABLE) { const r = 'Parent session population is unavailable.'; const u = (o) => ({metric: organUnav(o, r), triggerSessions: null, returnSessions: null}); sineEv = u('SINE'); mineEv = u('MINE'); cosineEv = u('COSINE'); cosecantEv = u('COSECANT'); }
    else {
      let displays = [], sineTriggers, sineTrigSessions, sineReturned, sineRetSessions;
      try { if (errors.sine_facts) throw new SourceError(errors.sine_facts); displays = sineDisplays(data.sine_facts, sessionIds); [sineTriggers, sineTrigSessions] = sineTriggerMetric(displays); }
      catch (e) { if (!catches(e)) throw e; displays = []; sineTriggers = unav(bounded(e), 'numbered SINE stage first appearance per episode'); sineTrigSessions = null; }
      try {
        if (errors.mirl_events) throw new SourceError(errors.mirl_events);
        if (sineTriggers.status !== AVAILABLE) throw new SourceError('SINE lineage evidence is unavailable');
        [sineReturned, sineRetSessions] = sineReturnMetric(displays, mirlRows(data.mirl_events), sessionIds);
      } catch (e) { if (!catches(e)) throw e; sineReturned = unav(bounded(e), 'scoped Chapter 6 validated returned SINE episode'); sineRetSessions = null; }
      sineEv = {metric: {organ: 'SINE', triggers: sineTriggers, returned: sineReturned, trigger_disclosure: 'Numbered SINE-1/2/3 once per episode/stage; stage-0 and relapse repeats excluded.', return_disclosure: 'SCOPED Chapter 6 validation; global MIRL degradation is not resolved.'}, triggerSessions: sineTrigSessions, returnSessions: sineRetSessions};
      const run = (name, fn) => { try { if (errors[name]) throw new SourceError(errors[name]); return fn(); } catch (e) { if (!catches(e)) throw e; return {metric: organUnav(name === 'mine_events' ? 'MINE' : name === 'cosine_events' ? 'COSINE' : 'COSECANT', bounded(e)), triggerSessions: null, returnSessions: null}; } };
      mineEv = run('mine_events', () => mineMetric(data.mine_events, sessionIds, zone));
      cosineEv = run('cosine_events', () => cosineMetric(data.cosine_events, sessionIds, zone));
      cosecantEv = run('cosecant_events', () => cosecantMetric(data.cosecant_events, sessionIds));
    }
    const evidence = [sineEv, cosineEv, mineEv, cosecantEv], [sine, cosine, mine, cosecant] = evidence.map((e) => e.metric);
    let behaviour;
    if (sessions.status !== AVAILABLE) behaviour = pieUnavailable('Parent session population is unavailable.');
    else {
      try {
        const failed = ['triggers', 'sine_facts', 'mine_events', 'cosine_events'].filter((n) => errors[n]);
        if (failed.length) throw new SourceError('Required pie source unavailable: ' + failed.map((n) => `${n} (${errors[n]})`).join(', '));
        behaviour = behaviourDistribution({triggers: data.triggers, sine: data.sine_facts, mine: data.mine_events, cosine: data.cosine_events}, sessionIds, zone);
      } catch (e) { if (!catches(e)) throw e; behaviour = pieUnavailable(bounded(e)); }
    }
    const totalTriggers = sumMetric('Total Triggers', [sine, cosine, mine, cosecant].map((o) => [o.organ, o.triggers])), totalReturned = sumMetric('Total Returned', [sine, cosine, mine, cosecant].map((o) => [o.organ, o.returned]));
    let rows, seriesStatus, seriesMessage;
    try {
      rows = buildSessionRows(sources, evidence, sessions, totalTriggers, totalReturned);
      seriesStatus = rows.every((r) => r.combined_triggers.status === AVAILABLE && r.combined_returned.status === AVAILABLE) ? AVAILABLE : UNAVAILABLE;
      seriesMessage = seriesStatus === AVAILABLE ? 'Per-session values reconcile exactly to the lifetime KPIs.' : 'Per-session rows contain explicitly unavailable organ values.';
    } catch (e) { if (!catches(e)) throw e; rows = []; seriesStatus = UNAVAILABLE; seriesMessage = `Session series unavailable: ${bounded(e)}`; }
    const ok = sessions.status === AVAILABLE && totalTriggers.status === AVAILABLE && totalReturned.status === AVAILABLE;
    return {sessions, total_triggers: totalTriggers, total_returned: totalReturned, sine, cosine, mine, cosecant, behaviour_distribution: behaviour, status: ok ? AVAILABLE : UNAVAILABLE,
      status_message: ok ? 'Live lifetime snapshot loaded read-only.' : 'Some lifetime metrics are unavailable; see the affected cards.', session_rows: rows, session_series_status: seriesStatus, session_series_message: seriesMessage, read_only: true};
  }

  /* ---------------- Chapter 6 lifetime cards (chapter6_lifetime.build_lifetime_summary) ---------------- */
  const DIST_LABELS = {instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X', tiktok: 'TikTok', snapchat: 'Snapchat', twitch: 'Twitch', reddit: 'Reddit', quora: 'Quora', '9gag': '9GAG', threads: 'Threads', bluesky: 'Bluesky', pinterest: 'Pinterest', tumblr: 'Tumblr', flickr: 'Flickr', '4chan': '4chan'};
  const MIRL_PAYLOAD_SQL = 'SELECT payload_json FROM "mirl_events" ORDER BY occurred_monotonic_ns, event_id LIMIT ?';
  const roundHalfEven = (x) => { const f = Math.floor(x), d = x - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : (f % 2 === 0 ? f : f + 1); };
  function normalizeKey(k) { const parts = k.replace(/-/g, '_').split('_').filter(Boolean); return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') || k; }
  function formatSeconds(total) {
    const t = Math.max(0, roundHalfEven(total)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60, parts = [];
    if (h) parts.push(`${h} h`); if (h || m) parts.push(`${m} min`); parts.push(`${sec} s`); return parts.join(' ');
  }
  function lifetimeSummary(ctx) {
    const card = (key, status, value, unit, reason, count = null) => ({key, status, value, unit, reason, supporting_count: count});
    let best, worst, distraction, ott;
    // best / worst return
    try {
      const rows = ctx.rows(MIRL_PAYLOAD_SQL);
      const events = rows.map((r) => O.mirlEvent(r.payload_json)), [samples, skipped] = lifetimeSamples(events);
      if (!samples.length) { const reason = ('no successfully closed MIRL episode in the lifetime database has a complete durable return-onset chain.' + legacyNote(skipped)).trim(); best = card('best_return', UNAVAILABLE, null, 'ns', reason); worst = card('worst_return', UNAVAILABLE, null, 'ns', reason); }
      else {
        const lat = samples.map((s) => s.latency_ns), lo = lat.reduce((a, b) => (b < a ? b : a)), hi = lat.reduce((a, b) => (b > a ? b : a)), n = samples.length;
        best = card('best_return', AVAILABLE, lo, 'ns', `minimum lifetime opening-SINE-display to final-successful-return-onset latency across ${n} eligible historical episode(s).${legacyNote(skipped)}`.trim(), n);
        worst = card('worst_return', AVAILABLE, hi, 'ns', `maximum lifetime opening-SINE-display to final-successful-return-onset latency across ${n} eligible historical episode(s).${legacyNote(skipped)}`.trim(), n);
      }
    } catch (e) { if (!(e instanceof PyError || e instanceof SourceError)) throw e; const reason = `read_error:${pyName(e)}`; best = card('best_return', UNAVAILABLE, null, 'ns', reason); worst = card('worst_return', UNAVAILABLE, null, 'ns', reason); }
    // top distraction platform (read_trigger_platform_keys)
    try {
      const keys = []; for (const row of O.operationalTriggerRows(ctx)) { const ev = O.triggerEvidence(String(NS.truthy(row.payload_json) ? row.payload_json : '')); const k = NS.strip(O.pyStrOf(NS.truthy(NS.get(ev, 'platform_key')) ? NS.get(ev, 'platform_key') : '')); if (k) keys.push(k); }
      const counts = new Map(); for (const k of keys) counts.set(k, (counts.get(k) || 0) + 1);
      if (!counts.size) distraction = card('top_distraction_platform', UNAVAILABLE, null, '', 'no durable lifetime trigger record carries a certified structured platform_key.');
      else {
        const max = Math.max(...counts.values()), winners = [...counts].filter(([, c]) => c === max).map(([k]) => k).sort((a, b) => NS.cmp(a, b)), label = (k) => DIST_LABELS[k.trim().toLowerCase()] || normalizeKey(k);
        distraction = winners.length > 1 ? card('top_distraction_platform', AVAILABLE, 'TIE', '', `TIE: ${winners.map((k) => `${label(k)} (${max})`).join(', ')} each with ${max} valid durable lifetime distraction-trigger record(s).`, max)
          : card('top_distraction_platform', AVAILABLE, label(winners[0]), '', `greatest number of valid durable lifetime distraction-trigger records: ${max} record(s) across the lifetime trigger ledger.`, max);
      }
    } catch (e) { if (!(e instanceof PyError || e instanceof SourceError)) throw e; distraction = card('top_distraction_platform', UNAVAILABLE, null, '', `read_error:${pyName(e)}`); }
    // top OTT platform (read_cosine_events -> _closed_cosine_platform_seconds)
    try {
      const events = ctx.rows(SQLS.cosine_events[2]).map(O.cosineEvent), totals = new Map(), seen = new Set(); let contributing = 0;
      for (const e of events) {
        if (e.event_name !== 'COSINE_SESSION_CLOSED') continue;
        const id = JSON.stringify([e.cosine_session_id, String(e.generation)]); if (seen.has(id)) continue; seen.add(id);
        let p; try { p = NS.pyjson.loads(e.payload_json); } catch (x) { if (x instanceof PyError) continue; throw x; }
        const ps = NS.isDict(p) ? NS.get(p, 'platform_seconds') : null;
        if (!NS.isDict(ps) || !Object.keys(ps).length) continue;
        let any = false;
        for (const k0 of Object.keys(ps)) { const key = NS.strip(O.pyStrOf(NS.truthy(k0) ? k0 : '')); if (!key) continue; let sec; try { sec = O.toFloat(ps[k0]); } catch (x) { if (x instanceof PyError) continue; throw x; } if (!(sec > 0)) continue; totals.set(key, (totals.get(key) || 0) + sec); any = true; }
        if (any) contributing++;
      }
      if (!totals.size) ott = card('top_ott_platform', UNAVAILABLE, null, '', 'no closed lifetime COSINE session carries valid durable supported platform-seconds evidence.');
      else {
        const max = Math.max(...totals.values()), winners = [...totals].filter(([, s]) => s === max).map(([k]) => k).sort((a, b) => NS.cmp(a, b)), text = formatSeconds(max), label = (k) => O.COSINE_LABELS[k] || normalizeKey(k);
        ott = winners.length > 1 ? card('top_ott_platform', AVAILABLE, 'TIE', '', `TIE: ${winners.map((k) => `${label(k)} (${text})`).join(', ')} each with ${text} cumulative supported OTT time across lifetime COSINE history.`, contributing)
          : card('top_ott_platform', AVAILABLE, label(winners[0]), '', `highest cumulative supported OTT time across lifetime COSINE history: ${text} across ${contributing} contributing closed session(s).`, contributing);
      }
    } catch (e) { if (!(e instanceof PyError || e instanceof SourceError)) throw e; ott = card('top_ott_platform', UNAVAILABLE, null, '', `read_error:${pyName(e)}`); }
    return {best_return: best, worst_return: worst, top_distraction_platform: distraction, top_ott_platform: ott};
  }

  /* ---------------- Science Lab Chapter 5 listing (SCIENCE_LAB/history.list_experiment_history over PERSISTENCE read_all_science_lab_experiments) ---------------- */
  const HIST_SQL = 'SELECT * FROM "science_lab_experiments" ORDER BY created_at_utc DESC, experiment_id DESC LIMIT ?';
  const RT = (m) => new PyError('RuntimeError', m);
  const exactInt = (v, n) => { if (!isB(v)) throw RT(`stored ${n} is not an exact integer`); return v; };
  const exactText = (v, n) => { if (typeof v !== 'string' || !v || v !== NS.strip(v)) throw RT(`stored ${n} is not a valid non-empty string`); return v; };
  /** PERSISTENCE.storage._science_lab_experiment_from_row: one row -> a validated ScienceLabExperimentRecord (RuntimeError on any malformed field). */
  function expRecord(row) {
    const sid = exactInt(row.parent_session_id, 'parent_session_id'); if (sid <= 0n) throw RT('stored parent_session_id is not positive');
    const dateKey = exactText(row.date_key, 'date_key'); if (dateKey.length !== 8 || /[^0-9]/.test(dateKey)) throw RT('stored date_key is not exactly 8 ASCII digits');
    const seq = exactInt(row.daily_sequence, 'daily_sequence'); if (seq < 1n || seq > 99n) throw RT('stored daily_sequence is outside 1 through 99');
    const id = exactText(row.experiment_id, 'experiment_id'); if (id !== `MYL-${dateKey}-SCI${String(seq).padStart(2, '0')}`) throw RT('stored experiment_id does not match its date and sequence');
    const status = exactText(row.status, 'status'); if (!['RUNNING', 'COMPLETED', 'INTERRUPTED'].includes(status)) throw RT('stored Science Lab experiment status is invalid');
    const startedAt = exactText(row.started_at_utc, 'started_at_utc'), startedNs = exactInt(row.started_monotonic_ns, 'started_monotonic_ns'); if (startedNs <= 0n) throw RT('stored started_monotonic_ns is not positive');
    const endedAt = row.ended_at_utc === null ? null : exactText(row.ended_at_utc, 'ended_at_utc'), endedNs = row.ended_monotonic_ns === null ? null : exactInt(row.ended_monotonic_ns, 'ended_monotonic_ns');
    if (typeof row.end_reason !== 'string') throw RT('stored end_reason is not text');
    const reason = row.end_reason;
    if (status === 'RUNNING') { if (endedAt !== null || endedNs !== null || reason !== '') throw RT('stored RUNNING experiment has terminal fields'); }
    else if (status === 'COMPLETED') { if (endedAt === null || endedNs === null || endedNs < startedNs || !['USER_END', 'PARENT_SESSION_ENDED'].includes(reason)) throw RT('stored COMPLETED experiment is malformed'); }
    else if (endedAt === null || endedNs !== null || reason !== 'CRASH_RECOVERY') throw RT('stored INTERRUPTED experiment is malformed');
    exactText(row.runtime_instance_id, 'runtime_instance_id'); exactText(row.created_at_utc, 'created_at_utc'); exactText(row.updated_at_utc, 'updated_at_utc');
    return {experiment_id: id, parent_session_id: sid, date_key: dateKey, daily_sequence: seq, status, started_at_utc: startedAt, started_monotonic_ns: startedNs, ended_at_utc: endedAt, ended_monotonic_ns: endedNs, end_reason: reason};
  }
  function experimentHistory(ctx) {
    if (!ctx.columns('science_lab_experiments').length) throw new PyError('OperationalError', 'no such table: science_lab_experiments');
    return ctx.rows(HIST_SQL).map((row) => {
      const r = expRecord(row);
      let eligible = true, why = '';
      if (r.status !== 'COMPLETED') { eligible = false; why = `status is ${r.status}, not COMPLETED`; } else if (r.ended_monotonic_ns === null || r.ended_at_utc === null) { eligible = false; why = 'completed record is missing its durable end boundary'; }
      return {experiment_id: r.experiment_id, parent_session_id: r.parent_session_id, status: r.status, started_at_utc: r.started_at_utc, ended_at_utc: r.ended_at_utc, end_reason: r.end_reason, eligible, reason: why};
    });
  }

  NS.metrichub = {readLifetimeMetricHub, allUnavailable, lifetimeSummary, lifetimeSamples, experimentHistory, SQLS, successfulReturnChain, IntegrityError, expRecord, lifetimeSampleChain: null};
})(self);
