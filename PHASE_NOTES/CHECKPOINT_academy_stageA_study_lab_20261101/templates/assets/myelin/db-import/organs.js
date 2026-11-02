// Read models of the event-ledger organs (MIRL, MINE, COSINE), ported from the desktop's pure-Python read side:
//   MIRL/read_model.py (+ MIRL.mirl event contract), MINE/read_model.py, COSINE/read_model.py, and the PERSISTENCE/storage.py readers that turn rows into events
//   (read_mirl_events, read_mine_events, read_cosine_events, read_trigger_identities, read_trigger_fire_times).
// Same value model as the SECANT adapter (ints are BigInt, floats are Number, dicts are null-prototype objects). Every database statement is a literal given to the
// worker; nothing from the file reaches SQL. A reader failure makes the organ UNAVAILABLE (the desktop's READ_ERROR), never an empty or healthy-looking result.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, {PyError} = NS;
  const VE = (m) => new PyError('ValueError', m), TE = (m) => new PyError('TypeError', m);
  const isB = (x) => typeof x === 'bigint';
  const NSEC = 1000000000;

  /* ---------------- Python conversions used by the storage readers ---------------- */
  function toInt(v) {
    if (isB(v)) return v;
    if (typeof v === 'boolean') return v ? 1n : 0n;
    if (typeof v === 'number') {
      if (Number.isNaN(v)) throw VE('cannot convert float NaN to integer');
      if (!Number.isFinite(v)) throw new PyError('OverflowError', 'cannot convert float infinity to integer');
      return BigInt(Math.trunc(v));
    }
    if (typeof v === 'string') { const t = NS.strip(v); if (/^[+-]?\d+(?:_\d+)*$/.test(t)) return BigInt(t.replace(/_/g, '')); throw VE('invalid literal for int()'); }
    throw TE('int() argument must be a string or a real number');
  }
  function toFloat(v) {
    if (isB(v)) return Number(v);
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') {
      const t = NS.strip(v);
      if (/^[+-]?(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[eE][+-]?\d+(?:_\d+)*)?$/.test(t)) return Number(t.replace(/_/g, ''));
      if (/^[+-]?(?:inf|infinity)$/i.test(t)) return t[0] === '-' ? -Infinity : Infinity;
      if (/^[+-]?nan$/i.test(t)) return NaN;
      throw VE('could not convert string to float');
    }
    throw TE('float() argument must be a string or a real number');
  }
  function pyRepr(v) {
    if (v === null || v === undefined) return 'None';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (isB(v)) return String(v);
    if (typeof v === 'number') return Number.isInteger(v) && Math.abs(v) < 1e16 ? v.toFixed(1) : String(v);
    if (typeof v === 'string') return NS.repr ? NS.repr(v) : "'" + v + "'";
    if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
    if (NS.isDict(v)) return '{' + Object.keys(v).map((k) => pyRepr(k) + ': ' + pyRepr(v[k])).join(', ') + '}';
    return String(v);
  }
  const pyStrOf = (v) => (typeof v === 'string' ? v : pyRepr(v));
  const req = (p, k) => { if (!NS.isDict(p)) throw TE('payload is not a mapping'); if (!NS.has(p, k)) throw NS.KeyErr(k); return p[k]; };
  const opt = (p, k, d) => (NS.has(p, k) ? p[k] : d);
  const isNone = (v) => v === null || v === undefined;
  const nonempty = (v) => typeof v === 'string' && NS.strip(v) !== '';
  const cp = (a, b) => (a === b ? 0 : NS.cmp(a, b));
  const cmpTuple = (a, b) => { for (let i = 0; i < a.length; i++) { const c = typeof a[i] === 'string' ? NS.cmp(a[i], b[i]) : a[i] < b[i] ? -1 : a[i] > b[i] ? 1 : 0; if (c) return c; } return 0; };
  const sortBy = (items, key, reverse) => items.map((v, i) => [key(v), i, v]).sort((p, q) => (reverse ? cmpTuple(q[0], p[0]) : cmpTuple(p[0], q[0])) || p[1] - q[1]).map((x) => x[2]);

  /* ---------------- selected-timezone projection (project_utc_datetime) ---------------- */
  const fmtCache = new Map();
  function zoneFmt(zone) {
    if (!fmtCache.has(zone)) {
      try { fmtCache.set(zone, new Intl.DateTimeFormat('en-GB', Object.assign({year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'}, zone === 'local' ? {} : {timeZone: zone}))); }
      catch (e) { throw NS.time.TimezoneProjectionError('named presentation timezone is unavailable: ' + zone); }
    }
    return fmtCache.get(zone);
  }
  /** The projected civil fields of a UTC instant (BigInt microseconds): {y, mo, d, h, mi, s, micro, offsetMinutes, date: 'YYYY-MM-DD', text: 'YYYY-MM-DD HH:MM:SS.ffffff+HH:MM'}. */
  function localParts(us, zone) {
    const secs = us >= 0n ? us / 1000000n : -((-us + 999999n) / 1000000n), micro = Number(us - secs * 1000000n), ms = Number(secs) * 1000, P = {};
    for (const p of zoneFmt(zone).formatToParts(new Date(ms))) P[p.type] = +p.value;
    const asUtc = Date.UTC(P.year, P.month - 1, P.day, P.hour, P.minute, P.second), off = Math.round((asUtc - ms) / 60000), p2 = (n, w = 2) => String(n).padStart(w, '0');
    const sign = off < 0 ? '-' : '+', ao = Math.abs(off), date = `${p2(P.year, 4)}-${p2(P.month)}-${p2(P.day)}`;
    return {y: P.year, mo: P.month, d: P.day, h: P.hour, mi: P.minute, s: P.second, micro, offsetMinutes: off, date, text: `${date} ${p2(P.hour)}:${p2(P.minute)}:${p2(P.second)}.${p2(micro, 6)}${sign}${p2(Math.floor(ao / 60))}:${p2(ao % 60)}`};
  }
  const checkZone = (zone) => { if (!NS.strip(String(zone || ''))) throw NS.time.TimezoneProjectionError('presentation timezone key is empty'); zoneFmt(zone); };

  /* ---------------- ast.literal_eval for the trigger evidence repr (literals only; anything else is a ValueError, as in Python) ---------------- */
  function literalEval(text) {
    let i = 0; const n = text.length;
    const bad = (m) => { throw VE(m || 'malformed node or string'); };
    const ws = () => { while (i < n && /\s/.test(text[i])) i++; };
    function str() {
      const q = text[i]; i++; let out = '';
      for (;;) {
        if (i >= n) bad('unterminated string');
        const c = text[i];
        if (c === q) { i++; return out; }
        if (c === '\\') {
          const e = text[i + 1], simple = {n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b', f: '\f', v: '\v', 0: '\0'};
          if (e in simple) { out += simple[e]; i += 2; continue; }
          if (e === 'x') { out += String.fromCharCode(parseInt(text.slice(i + 2, i + 4), 16)); i += 4; continue; }
          if (e === 'u') { out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16)); i += 6; continue; }
          if (e === 'U') { out += String.fromCodePoint(parseInt(text.slice(i + 2, i + 10), 16)); i += 10; continue; }
          bad('unsupported escape');
        }
        if (c === '\n') bad('newline in string');
        out += c; i++;
      }
    }
    function value() {
      ws(); const c = text[i];
      if (c === '{') {
        i++; ws(); const o = NS.dict(); let isSet = false;
        if (text[i] === '}') { i++; return o; }
        for (;;) {
          ws(); const k = value(); ws();
          if (text[i] === ':') { i++; const v = value(); o[typeof k === 'string' ? k : pyRepr(k)] = v; } else isSet = true;
          ws(); if (text[i] === ',') { i++; ws(); if (text[i] === '}') { i++; break; } continue; }
          if (text[i] === '}') { i++; break; }
          bad();
        }
        return isSet ? [] : o;
      }
      if (c === '[' || c === '(') {
        const close = c === '[' ? ']' : ')'; i++; const a = []; ws();
        if (text[i] === close) { i++; return a; }
        for (;;) { a.push(value()); ws(); if (text[i] === ',') { i++; ws(); if (text[i] === close) { i++; break; } continue; } if (text[i] === close) { i++; break; } bad(); }
        return a;
      }
      if (c === "'" || c === '"') { let s = str(); ws(); while (text[i] === "'" || text[i] === '"') { s += str(); ws(); } return s; }
      const m = /^-?(?:\d+(?:_\d+)*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(i));
      if (m) { i += m[0].length; return /[.eE]/.test(m[0]) ? Number(m[0].replace(/_/g, '')) : BigInt(m[0].replace(/_/g, '')); }
      for (const [w, v] of [['True', true], ['False', false], ['None', null]]) if (text.startsWith(w, i) && !/\w/.test(text[i + w.length] || '')) { i += w.length; return v; }
      return bad();
    }
    const v = value(); ws(); if (i < n) bad(); return v;
  }

  /* ---------------- trigger facts (storage.py: _operational_trigger_rows_in_snapshot, read_trigger_identities, read_trigger_fire_times) ---------------- */
  const TRIGGERS_SQL = 'SELECT id, session_id, candidate_uid, payload_json, created_at_utc FROM "triggers" ORDER BY id LIMIT ?';
  const ACCEPTED_SQL = "SELECT session_id, candidate_uid, episode_uid, kind, payload_json FROM \"sine_facts\" WHERE kind='SINE_TRIGGER_ACCEPTED' ORDER BY id LIMIT ?";
  const ISO_AWARE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2})(?::(\d{2})(?::(\d{2})(?:[.,]\d+)?)?)?)?([+-]\d{2}(?::?\d{2}(?::?\d{2}(?:\.\d+)?)?)?)$/;
  function isoAware(text) {
    const m = ISO_AWARE.exec(text.replace('Z', '+00:00'));
    if (!m) return false;
    const [y, mo, d] = [+m[1], +m[2], +m[3]], dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return y >= 1 && mo >= 1 && mo <= 12 && d >= 1 && d <= dim[mo - 1] && (m[4] === undefined || +m[4] <= 23) && (m[5] === undefined || +m[5] <= 59) && (m[6] === undefined || +m[6] <= 59);
  }
  function operationalTriggerRows(ctx) {
    const candidates = new Map();
    for (const row of ctx.rows(TRIGGERS_SQL)) candidates.set(JSON.stringify([String(row.session_id), row.candidate_uid === null ? null : String(row.candidate_uid), String(row.id)]), row);
    const accepted = new Map();
    for (const row of ctx.rows(ACCEPTED_SQL)) {
      const payload = NS.pyjson.loads(String(row.payload_json));
      if (!NS.isDict(payload)) throw VE('SINE acceptance payload must be an object');
      const eventId = NS.get(payload, 'operational_event_id'), stamp = NS.get(payload, 'occurred_wall_time_utc'), episodeUid = NS.get(payload, 'episode_uid');
      const key = JSON.stringify([String(row.session_id), row.candidate_uid === null ? null : String(row.candidate_uid), isB(eventId) || typeof eventId === 'number' ? String(eventId) : eventId]);
      if (!(isB(eventId) && eventId > 0n) || NS.get(payload, 'kind') !== row.kind || !NS.eq(NS.get(payload, 'session_id'), row.session_id) || NS.get(payload, 'candidate_uid') !== row.candidate_uid
        || !NS.truthy(episodeUid) || episodeUid !== row.episode_uid || typeof stamp !== 'string' || !stamp || !candidates.has(key)) throw VE('Unbound SINE operational acceptance');
      if (!isoAware(stamp)) throw VE('SINE acceptance time must be timezone-aware');
      const prior = accepted.get(key);
      if (prior) { if (prior.episode_uid !== episodeUid || prior.accepted_at_utc !== stamp) throw VE('Conflicting SINE operational acceptance'); continue; }
      accepted.set(key, Object.assign({}, candidates.get(key), {episode_uid: episodeUid, accepted_at_utc: stamp}));
    }
    return [...accepted.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  function triggerEvidence(payloadText) {
    let payload;
    try { payload = NS.pyjson.loads(payloadText); } catch (e) { if (e instanceof PyError) return NS.dict(); throw e; }
    const ev = NS.isDict(payload) ? NS.get(payload, 'evidence') : null;
    if (NS.isDict(ev)) return ev;
    if (typeof ev === 'string') { try { const parsed = literalEval(ev); if (NS.isDict(parsed)) return parsed; } catch (e) { if (!(e instanceof PyError)) throw e; } }
    return NS.dict();
  }
  /** {identities: candidate_uid -> surface label, fireTimes: candidate_uid -> accepted-at stamp} */
  function triggerFacts(ctx) {
    const rows = operationalTriggerRows(ctx), identities = Object.create(null), fireTimes = Object.create(null);
    for (const row of rows) {
      const uid = NS.strip(pyStrOf(NS.truthy(row.candidate_uid) ? row.candidate_uid : '')), stamp = NS.strip(pyStrOf(NS.truthy(row.accepted_at_utc) ? row.accepted_at_utc : ''));
      if (uid && stamp) fireTimes[uid] = stamp;
      if (!uid) continue;
      const ev = triggerEvidence(String(NS.truthy(row.payload_json) ? row.payload_json : ''));
      let label = NS.strip(pyStrOf(NS.truthy(NS.get(ev, 'platform_key')) ? NS.get(ev, 'platform_key') : ''));
      if (!label) label = NS.strip(pyStrOf(NS.truthy(NS.get(ev, 'process_name')) ? NS.get(ev, 'process_name') : ''));
      if (label) identities[uid] = label;
    }
    return {identities, fireTimes, count: rows.length};
  }

  /* ======================================== MIRL ======================================== */
  const MIRL_SCHEMA = 'myelin-mirl-v2', MAX_CLOSED = 100, ABANDONED = 'NOT_RETURNED';
  const CONTRACT = {
    trigger_prepared: ['OBSERVED', false], first_display_timed_out: ['DERIVED', false], first_display_rejected: ['OBSERVED', false], episode_created: ['OBSERVED', true],
    sine_displayed: ['OBSERVED', true], sine_response_recorded: ['OBSERVED', true], return_intent_recorded: ['OBSERVED', true], sine_terminated: ['OBSERVED', true],
    return_verification_started: ['OBSERVED', true], return_unverified: ['DERIVED', true], return_verification_interrupted: ['OBSERVED', true], return_verification_completed: ['OBSERVED', true],
    return_verified: ['DERIVED', true], closure_confirmation_started: ['OBSERVED', true], closure_confirmation_interrupted: ['OBSERVED', true], relapse_detected: ['DERIVED', true],
    episode_resumed: ['DERIVED', true], closure_confirmation_completed: ['OBSERVED', true], episode_closed: ['DERIVED', true], evidence_gap: ['OBSERVED', true], emergency_stopped: ['OBSERVED', true]
  };
  const CONTROL_ALLOWED = new Set(['trigger_prepared', 'first_display_timed_out', 'first_display_rejected']);
  const MIRL_SQL = 'SELECT payload_json FROM "mirl_events" ORDER BY occurred_monotonic_ns, event_id LIMIT ?';

  /** read_mirl_events: payload_json -> MirlEvent (any malformed field raises, exactly as the desktop reader does). */
  function mirlEvent(text) {
    const p = NS.pyjson.loads(String(text));
    const name = pyStrOf(req(p, 'event_name')), cls = pyStrOf(req(p, 'event_class'));
    if (!NS.has(CONTRACT, name)) throw VE(`'${name}' is not a valid MirlEventName`);
    if (cls !== 'OBSERVED' && cls !== 'DERIVED') throw VE(`'${cls}' is not a valid MirlEventClass`);
    const sid = opt(p, 'session_id', null), oid = opt(p, 'operational_event_id', null), sup = opt(p, 'supporting_event_ids', []);
    return {
      kind: pyStrOf(req(p, 'kind')), event_name: name, event_class: cls, event_id: pyStrOf(req(p, 'event_id')), episode_id: pyStrOf(req(p, 'episode_id')),
      episode_sequence: toInt(req(p, 'episode_sequence')), occurred_monotonic_ns: toInt(req(p, 'occurred_monotonic_ns')), occurred_wall_time_utc: pyStrOf(req(p, 'occurred_wall_time_utc')),
      session_id: isNone(sid) ? null : toInt(sid), candidate_uid: pyStrOf(opt(p, 'candidate_uid', '')), operational_event_id: isNone(oid) ? null : toInt(oid),
      attempt_id: pyStrOf(opt(p, 'attempt_id', '')), attempt_index: toInt(opt(p, 'attempt_index', 0n)), sine_stage: toInt(opt(p, 'sine_stage', 0n)), sine_occurrence: toInt(opt(p, 'sine_occurrence', 0n)),
      reason: pyStrOf(opt(p, 'reason', '')), response: pyStrOf(opt(p, 'response', '')), elapsed_seconds: toFloat(opt(p, 'elapsed_seconds', 0)), target_seconds: toFloat(opt(p, 'target_seconds', 0)),
      supporting_event_ids: Array.isArray(sup) ? sup.slice() : typeof sup === 'string' ? Array.from(sup) : NS.isDict(sup) ? Object.keys(sup) : (() => { throw TE('object is not iterable'); })(),
      detail: pyStrOf(opt(p, 'detail', '')), schema_version: pyStrOf(opt(p, 'schema_version', ''))
    };
  }
  const validUtcZ = (v) => { if (typeof v !== 'string' || !v.endsWith('Z') || v !== NS.strip(v)) return false; try { NS.time.parseUtc(v); return true; } catch (e) { if (e instanceof PyError) return false; throw e; } };
  const issue = (code, detail, episode = '', ev = '') => ({code, severity: 'ERROR', detail, episode_id: episode, event_id: ev});
  const elapsed = (a, b) => Math.max(0, Number(b - a) / NSEC);

  function mirlEpisode(episodeId, events) {
    const w = {episode: episodeId, issues: [], state: 'EXPECT_CREATED', attempt: '', lastInterruption: '', verifCompleted: '', returnVerified: '', closureCompleted: '', emergency: '', sineTerminated: '',
      verifStartedNs: 0n, closureStartedNs: 0n, nextAttempt: 1n, seen: new Set()};
    const add = (code, detail, ev) => w.issues.push(issue(code, detail, episodeId, ev ? ev.event_id : ''));
    const expect = (ev, states) => { if (!states.includes(w.state)) add('ILLEGAL_EVENT_ORDER', `${ev.event_name} is illegal after state ${w.state}.`, ev); };
    const expectAttempt = (ev, st) => { expect(ev, [st]); if (!w.attempt || ev.attempt_id !== w.attempt) add('ATTEMPT_ID_MISMATCH', 'Event is not bound to the active attempt.', ev); };
    const timer = (ev, startedNs) => {
      if (ev.target_seconds <= 0) add('MISSING_TIMER_TARGET', 'Timer completion has no positive target.', ev);
      if (ev.elapsed_seconds < ev.target_seconds) add('TIMER_COMPLETED_EARLY', 'Elapsed time is below target.', ev);
      const f = elapsed(startedNs, ev.occurred_monotonic_ns);
      if (startedNs <= 0n || f < ev.target_seconds) add('MONOTONIC_TIMER_COMPLETED_EARLY', 'Monotonic event timestamps do not cover the declared timer target.', ev);
    };
    // identity and sequence
    if (!events.length) add('EMPTY_EPISODE', 'Episode contains no events.');
    else {
      let expected = 1n, prev = 0n; const first = events[0];
      for (const ev of events) {
        if (ev.episode_sequence !== expected) { add('BROKEN_EPISODE_SEQUENCE', `Expected sequence ${expected}, found ${ev.episode_sequence}.`, ev); expected = ev.episode_sequence; }
        expected += 1n;
        if (ev.occurred_monotonic_ns <= 0n) add('INVALID_MONOTONIC_TIME', 'Event monotonic time is not positive.', ev);
        else if (ev.occurred_monotonic_ns < prev) add('MONOTONIC_TIME_REGRESSION', 'Event time moved backwards.', ev);
        if (ev.occurred_monotonic_ns > prev) prev = ev.occurred_monotonic_ns;
        if (!validUtcZ(ev.occurred_wall_time_utc)) add('INVALID_WALL_TIMESTAMP', 'Event UTC timestamp is malformed.', ev);
        if (ev.episode_id !== episodeId) add('EPISODE_ID_MISMATCH', 'Event episode ID changed.', ev);
        if (ev.session_id !== first.session_id) add('SESSION_ID_MISMATCH', 'Session ID changed inside episode.', ev);
        if (ev.candidate_uid !== first.candidate_uid) add('CANDIDATE_ID_MISMATCH', 'Candidate UID changed inside episode.', ev);
        if (ev.operational_event_id !== first.operational_event_id) add('OPERATIONAL_EVENT_ID_MISMATCH', 'Operational event ID changed inside episode.', ev);
        const c = CONTRACT[ev.event_name];
        if (ev.event_class !== c[0]) add('EVENT_CLASS_MISMATCH', `${ev.event_name} must be ${c[0]}.`, ev);
        if (ev.schema_version !== MIRL_SCHEMA) add('SCHEMA_VERSION_MISMATCH', `Unsupported event schema ${ev.schema_version}.`, ev);
      }
      const known = new Set();
      for (const ev of events) { for (const r of ev.supporting_event_ids) if (!known.has(r)) add('BROKEN_EVENT_REFERENCE', `Supporting event ${pyStrOf(r)} is missing or not earlier.`, ev); known.add(ev.event_id); }
    }
    // lifecycle replay
    for (const ev of events) {
      const name = ev.event_name, sup = ev.supporting_event_ids;
      switch (name) {
        case 'episode_created': expect(ev, ['EXPECT_CREATED']); w.state = 'WAITING'; break;
        case 'sine_displayed': case 'sine_response_recorded': case 'return_intent_recorded': expect(ev, ['WAITING', 'VERIFY', 'CLOSURE']); break;
        case 'return_verification_started':
          expect(ev, ['WAITING']);
          if (!ev.attempt_id || ev.attempt_index <= 0n) add('MISSING_ATTEMPT_IDENTITY', 'Verification start lacks attempt identity.', ev);
          if (w.seen.has(ev.attempt_id)) add('REUSED_ATTEMPT_ID', 'Recovery attempt ID was reused.', ev);
          if (ev.attempt_index !== w.nextAttempt) add('BROKEN_ATTEMPT_SEQUENCE', `Expected attempt ${w.nextAttempt}, found ${ev.attempt_index}.`, ev);
          w.seen.add(ev.attempt_id); w.nextAttempt = ev.attempt_index + 1n > w.nextAttempt ? ev.attempt_index + 1n : w.nextAttempt;
          w.attempt = ev.attempt_id; w.verifStartedNs = ev.occurred_monotonic_ns; w.closureStartedNs = 0n; w.state = 'VERIFY'; break;
        case 'return_unverified': expectAttempt(ev, 'VERIFY'); break;
        case 'return_verification_interrupted': expectAttempt(ev, 'VERIFY'); w.lastInterruption = ev.event_id; w.state = 'VERIFY_INTERRUPTED'; break;
        case 'return_verification_completed': expectAttempt(ev, 'VERIFY'); timer(ev, w.verifStartedNs); w.verifCompleted = ev.event_id; w.state = 'VERIFY_COMPLETED'; break;
        case 'return_verified':
          expectAttempt(ev, 'VERIFY_COMPLETED');
          if (!sup.includes(w.verifCompleted)) add('UNBOUND_RETURN_VERIFICATION', 'Return verified is not bound to completion.', ev);
          w.returnVerified = ev.event_id; w.state = 'RETURN_VERIFIED'; break;
        case 'closure_confirmation_started':
          expectAttempt(ev, 'RETURN_VERIFIED');
          if (!sup.includes(w.returnVerified)) add('UNBOUND_CLOSURE_START', 'Closure start is not bound to verified return.', ev);
          w.closureStartedNs = ev.occurred_monotonic_ns; w.state = 'CLOSURE'; break;
        case 'closure_confirmation_interrupted': expectAttempt(ev, 'CLOSURE'); w.lastInterruption = ev.event_id; w.state = 'CLOSURE_INTERRUPTED'; break;
        case 'relapse_detected':
          expectAttempt(ev, 'CLOSURE_INTERRUPTED');
          if (!sup.includes(w.lastInterruption)) add('UNBOUND_RELAPSE', 'Relapse is not bound to closure interruption.', ev);
          w.lastInterruption = ev.event_id; w.state = 'RELAPSE'; break;
        case 'episode_resumed':
          expect(ev, ['VERIFY_INTERRUPTED', 'CLOSURE_INTERRUPTED', 'RELAPSE']);
          if (!sup.includes(w.lastInterruption)) add('UNBOUND_EPISODE_RESUME', 'Episode resume lacks interruption evidence.', ev);
          w.attempt = ''; w.state = 'WAITING'; break;
        case 'closure_confirmation_completed': expectAttempt(ev, 'CLOSURE'); timer(ev, w.closureStartedNs); w.closureCompleted = ev.event_id; w.state = 'CLOSURE_COMPLETED'; break;
        case 'emergency_stopped': expect(ev, ['WAITING', 'VERIFY', 'CLOSURE']); w.emergency = ev.event_id; w.state = 'EMERGENCY'; break;
        case 'sine_terminated':
          expect(ev, ['WAITING', 'VERIFY', 'CLOSURE']);
          if (!ev.reason) add('MISSING_TERMINAL_REASON', 'SINE termination lacks its factual reason.', ev);
          w.sineTerminated = ev.event_id; w.state = 'SINE_TERMINATED'; break;
        case 'evidence_gap': expect(ev, ['WAITING', 'VERIFY', 'CLOSURE']); break;
        case 'episode_closed':
          if (ev.reason === 'RETURNED') { expect(ev, ['CLOSURE_COMPLETED']); if (!sup.includes(w.closureCompleted)) add('UNBOUND_RETURNED_CLOSE', 'RETURNED close lacks closure completion.', ev); }
          else if (ev.reason === 'EMERGENCY') { expect(ev, ['EMERGENCY']); if (!sup.includes(w.emergency)) add('UNBOUND_EMERGENCY_CLOSE', 'Emergency close lacks emergency event.', ev); }
          else if (ev.reason === 'ABORTED') { expect(ev, ['SINE_TERMINATED']); if (!sup.includes(w.sineTerminated)) add('UNBOUND_ABORTED_CLOSE', 'Nonrecovery close lacks SINE termination.', ev); }
          else add('UNKNOWN_EPISODE_OUTCOME', `Unsupported close outcome ${pyRepr(ev.reason)}.`, ev);
          w.state = 'CLOSED'; break;
        default: add('ILLEGAL_EPISODE_EVENT', `${name} is not an episode event.`, ev);
      }
    }
    if (w.state === 'EXPECT_CREATED') add('MISSING_EPISODE_CREATED', 'Episode has no episode_created event.');
    if (['VERIFY_INTERRUPTED', 'CLOSURE_INTERRUPTED', 'RELAPSE', 'VERIFY_COMPLETED', 'RETURN_VERIFIED', 'CLOSURE_COMPLETED', 'EMERGENCY', 'SINE_TERMINATED'].includes(w.state)) add('INCOMPLETE_ATOMIC_EVENT_SEQUENCE', `Episode ended its stored sequence in intermediate state ${w.state}.`);
    // row
    const first = events[0], created = events.find((e) => e.event_name === 'episode_created');
    const startedNs = created ? created.occurred_monotonic_ns : first.occurred_monotonic_ns, startedAt = created ? created.occurred_wall_time_utc : first.occurred_wall_time_utc;
    const closed = [...events].reverse().find((e) => e.event_name === 'episode_closed'), outcome = closed ? (closed.reason || null) : null;
    const attempts = new Set(events.filter((e) => e.attempt_id).map((e) => e.attempt_id)), relapses = events.filter((e) => e.event_name === 'relapse_detected');
    const intent = events.find((e) => e.event_name === 'return_intent_recorded'), verified = events.find((e) => e.event_name === 'return_verified');
    const stages = [...new Set(events.filter((e) => e.sine_stage > 0n).map((e) => Number(e.sine_stage)))].sort((a, b) => a - b);
    const integrity = w.issues.length ? 'DEGRADED' : 'CONFIRMED';
    const lastStatus = (() => {
      if (w.issues.length) return 'DEGRADED';
      if (closed) return `CLOSED_${closed.reason || 'UNKNOWN'}`;
      return ({WAITING: 'WAITING_FOR_RETURN', VERIFY: 'RETURN_VERIFICATION_ACTIVE', CLOSURE: 'CLOSURE_CONFIRMATION_ACTIVE', CLOSED: 'CLOSED'})[w.state] || `INCOMPLETE_${w.state}`;
    })();
    const row = {
      episode_id: episodeId, short_display_id: (() => { const tail = episodeId.split('-').pop().slice(0, 8).toUpperCase(); return tail ? `MIRL-${tail}` : 'MIRL-UNKNOWN'; })(),
      source_event_id: first.operational_event_id === null || first.operational_event_id === 0n ? 0n : first.operational_event_id, session_id: first.session_id === null ? 0n : first.session_id, candidate_uid: first.candidate_uid,
      started_at: startedAt, episode_status: lastStatus, final_outcome: outcome,
      terminal_reason: (() => { const t = [...events].reverse().find((e) => e.event_name === 'sine_terminated'); return t ? t.reason : ''; })(),
      return_intent_latency_seconds: intent ? elapsed(startedNs, intent.occurred_monotonic_ns) : null,
      verified_return_latency_seconds: verified && !w.issues.length ? elapsed(startedNs, verified.occurred_monotonic_ns) : null,
      stable_recovery_latency_seconds: closed && outcome === 'RETURNED' && !w.issues.length ? elapsed(startedNs, closed.occurred_monotonic_ns) : null,
      recovery_attempt_count: attempts.size, relapse_count: relapses.length, relapse_timings_seconds: relapses.map((e) => elapsed(startedNs, e.occurred_monotonic_ns)),
      sine_stages_exposed: stages, sine_responses: events.filter((e) => e.event_name === 'sine_response_recorded' && e.response).map((e) => e.response),
      timeline: events.map((e) => ({episode_id: episodeId, episode_seq: e.episode_sequence, occurred_at: e.occurred_wall_time_utc, event_name: e.event_name, observed_or_derived: e.event_class,
        reason_or_outcome_code: e.reason || e.response || null, reference: e.supporting_event_ids.length ? pyStrOf(e.supporting_event_ids[0]) : null, integrity_status: integrity, monotonic_ns: e.occurred_monotonic_ns, event_id: e.event_id})),
      integrity_status: integrity, integrity_issues: w.issues, application: '', trigger_fired_at: ''
    };
    return {row, exclusions: w.issues.length ? [{metric: 'native_episode_metrics', reason: 'episode_integrity_degraded', detail: w.issues.map((i) => i.code).join('; '), episode_id: episodeId}] : []};
  }

  /** The whole MIRL read: events + trigger facts -> the desktop's LiveMirlProjection (plus the episode/exclusion records Metric Hub and Science Lab consume). */
  function readMirl(ctx) {
    checkZone(ctx.zone);
    const events = ctx.rows(MIRL_SQL).map((r) => mirlEvent(r.payload_json)), facts = triggerFacts(ctx);
    const issues = [], controls = [], grouped = new Map(), seen = new Set();
    for (const ev of events) {
      if (seen.has(ev.event_id)) { issues.push(issue('DUPLICATE_EVENT_ID', `Duplicate MIRL event ID ${ev.event_id}.`, ev.episode_id, ev.event_id)); continue; }
      seen.add(ev.event_id);
      if (ev.episode_id) { if (!grouped.has(ev.episode_id)) grouped.set(ev.episode_id, []); grouped.get(ev.episode_id).push(ev); } else controls.push(ev);
    }
    const bigCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    for (const [id, list] of grouped) grouped.set(id, list.map((v, i) => [v, i]).sort((p, q) => bigCmp(p[0].episode_sequence, q[0].episode_sequence) || bigCmp(p[0].occurred_monotonic_ns, q[0].occurred_monotonic_ns) || NS.cmp(p[0].event_id, q[0].event_id) || p[1] - q[1]).map((x) => x[0]));
    controls.sort((a, b) => bigCmp(a.occurred_monotonic_ns, b.occurred_monotonic_ns) || NS.cmp(a.event_id, b.event_id));
    for (const ev of controls) {
      const c = CONTRACT[ev.event_name];
      if (!CONTROL_ALLOWED.has(ev.event_name)) issues.push(issue('ILLEGAL_CONTROL_EVENT', `${ev.event_name} cannot exist without episode identity.`, '', ev.event_id));
      if (c[1]) issues.push(issue('CONTROL_EVENT_CONTRACT_MISMATCH', 'Control event disagrees with the MIRL event contract.', '', ev.event_id));
      else if (ev.event_class !== c[0]) issues.push(issue('CONTROL_EVENT_CLASS_MISMATCH', `${ev.event_name} has the wrong event class.`, '', ev.event_id));
      if (ev.episode_sequence !== 0n || ev.episode_id) issues.push(issue('CONTROL_EVENT_IDENTITY_MISMATCH', 'Control event must have empty episode identity and sequence zero.', '', ev.event_id));
      if (ev.schema_version !== MIRL_SCHEMA) issues.push(issue('CONTROL_EVENT_SCHEMA_MISMATCH', `Unsupported control-event schema ${ev.schema_version}.`, '', ev.event_id));
    }
    let rows = [], exclusions = [];
    for (const [id, list] of grouped) { const r = mirlEpisode(id, list); rows.push(r.row); exclusions.push(...r.exclusions); issues.push(...r.row.integrity_issues); }
    // display masks (EPI-DDMMYYYY-NN, by the selected zone's civil date of the opening instant)
    const ordered = [];
    for (const row of rows) if (validUtcZ(row.started_at)) ordered.push([NS.time.parseUtc(row.started_at), row.episode_id, row]);
    ordered.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0) || NS.cmp(a[1], b[1]));
    const daily = Object.create(null), masks = new Map();
    for (const [us, id] of ordered) { const lp = localParts(us, ctx.zone), key = `${String(lp.d).padStart(2, '0')}${String(lp.mo).padStart(2, '0')}${String(lp.y).padStart(4, '0')}`; daily[key] = (daily[key] || 0) + 1; masks.set(id, `EPI-${key}-${String(daily[key]).padStart(2, '0')}`); }
    rows = rows.map((r) => (masks.has(r.episode_id) ? Object.assign(r, {short_display_id: masks.get(r.episode_id)}) : r));
    if (Object.keys(facts.identities).length || Object.keys(facts.fireTimes).length) rows = rows.map((r) => Object.assign(r, {application: facts.identities[r.candidate_uid] || r.application, trigger_fired_at: facts.fireTimes[r.candidate_uid] || r.trigger_fired_at}));
    rows = sortBy(rows, (r) => [r.timeline.length ? r.timeline[r.timeline.length - 1].occurred_at : r.started_at, r.episode_id], true);
    const status = issues.length ? 'DEGRADED' : !rows.length ? 'UNAVAILABLE' : 'CONFIRMED';
    const counts = {RETURNED: 0, EMERGENCY: 0, PENDING: 0, DEGRADED: 0};
    for (const r of rows) { if (r.integrity_status === 'DEGRADED') counts.DEGRADED++; else if (r.final_outcome) counts[r.final_outcome] = (counts[r.final_outcome] || 0) + 1; else counts.PENDING++; }
    // live projection (display scope): only the latest unresolved episode stays "active"; earlier unresolved ones are provably abandoned
    const unresolved = rows.filter((r) => r.final_outcome === null);
    const stillOpen = unresolved.length ? sortBy(unresolved, (r) => [r.started_at, r.episode_id], true)[0].episode_id : null;
    const active = [], closedRows = [];
    for (const r of rows) { if (r.final_outcome !== null) closedRows.push(r); else if (r.episode_id === stillOpen) active.push(r); else closedRows.push(Object.assign({}, r, {final_outcome: ABANDONED})); }
    const measured = rows.map((r) => r.verified_return_latency_seconds).filter((x) => x !== null);
    const available = rows.length > 0;
    const message = status === 'DEGRADED' ? 'DEGRADED EVIDENCE — review integrity issues and exclusions' : (status === 'UNAVAILABLE' || !available) ? 'NO MIRL EPISODE EVIDENCE' : 'INTEGRITY-CONFIRMED MIRL EVIDENCE';
    return {
      available, integrity_status: status, status_message: message, empty_state_reason: available ? null : 'No factual MIRL episode has been recorded.',
      active_episodes: active, recently_closed_episodes: closedRows.slice(0, MAX_CLOSED), all_episode_rows: rows, native_outcome_counts: counts, worst_return_latency_seconds: measured.length ? Math.max(...measured) : null,
      evidence_availability: {native_mirl_events: available, integrity_confirmed: status === 'CONFIRMED', legacy_evidence: false}, integrity_issues: issues, exclusions, exclusion_count: exclusions.length,
      episode_event_count: events.length - controls.length, control_event_count: controls.length, trigger_count: facts.count, presentation_timezone: ctx.zone,
      _events: ctx.keepEvents ? events : undefined
    };
  }

  /* ======================================== MINE ======================================== */
  const MINE_SCHEMA = 'myelin-mine-v1-isolated';
  const MINE_SQL = 'SELECT event_id, session_id, mine_episode_id, generation, sequence, event_name, event_class, occurred_at_utc, monotonic_ns, platform_key, platform_label, request_id, evidence_token, payload_json, schema_version FROM "mine_events" ORDER BY session_id, generation, sequence, event_id LIMIT ?';
  const MINE_CLASSES = new Set(['OBSERVED', 'DERIVED', 'USER_ACTION', 'PRESENTATION']);
  const APPROVED = {
    MESSAGING_DWELL_SEGMENT_COMPLETED: ['segment_order', 'platform_key', 'dwell_seconds'], MESSAGING_PLATFORM_TRANSITION: ['from_platform', 'to_platform'], RETURN_INTENT_RECORDED: ['choice'], IMPORTANT_INTENT_RECORDED: ['choice'],
    IMPORTANT_DURATION_COMMITTED: ['duration_minutes'], IMPORTANT_ALLOWANCE_STARTED: ['duration_minutes'], RETURN_VISUAL_CONFIRMING_STARTED: ['variant'], RETURN_VERIFICATION_STARTED: ['branch', 'visual_stage'],
    RETURN_VERIFICATION_COMPLETED: ['branch'], RETURN_VERIFICATION_INTERRUPTED: ['reason', 'branch', 'stage'], CLOSURE_CONFIRMATION_STARTED: ['branch'], CLOSURE_CONFIRMATION_INTERRUPTED: ['reason'],
    CLOSURE_CONFIRMATION_COMPLETED: ['closure_outcome'], RETURN_CONFIRMED: ['closure_outcome'], MINE_SESSION_CLOSED: ['closure_reason', 'closure_outcome'], MINE_RUNTIME_STOPPED: ['closure_reason', 'closure_outcome'],
    EMERGENCY_STOPPED: ['closure_reason', 'closure_outcome'], MINE_CANDIDATE_RESET: ['outcome'], MINE_CANDIDATE_ENDED_BEFORE_INTERVENTION: ['outcome'], EVIDENCE_GAP: ['reason'], STUDY_PREEMPTED_MINE: ['formal_episode'],
    STUDY_PREEMPTION_RELEASED: ['future_mine_eligibility_only'], MINE_HANDOVER_SUPERSEDED_BY_CONTEXT: ['old_kind', 'reason']
  };
  const BRANCH_EVENTS = new Set(['RETURN_INTENT_RECORDED', 'IMPORTANT_INTENT_RECORDED']), CHOICES = new Set(['I_WILL_COME_BACK', 'ITS_IMPORTANT']);
  const RETURN_CLOSURE = new Set(['RETURN_VISUAL_CONFIRMING_STARTED', 'RETURN_VERIFICATION_STARTED', 'RETURN_VERIFICATION_COMPLETED', 'RETURN_VERIFICATION_INTERRUPTED', 'CLOSURE_CONFIRMATION_STARTED',
    'CLOSURE_CONFIRMATION_INTERRUPTED', 'CLOSURE_CONFIRMATION_COMPLETED', 'RETURN_CONFIRMED', 'MINE_SESSION_CLOSED', 'MINE_RUNTIME_STOPPED', 'EMERGENCY_STOPPED']);
  const plainJson = (v) => v;      // payload values keep the value model; callers convert

  function mineEvent(r) {
    const cls = pyStrOf(r.event_class); if (!MINE_CLASSES.has(cls)) throw VE(`'${cls}' is not a valid MineEventClass`);
    return {event_id: pyStrOf(r.event_id), parent_session_id: toInt(r.session_id), mine_episode_id: pyStrOf(r.mine_episode_id), sequence: toInt(r.sequence), event_name: pyStrOf(r.event_name), event_class: cls,
      occurred_at_utc: pyStrOf(r.occurred_at_utc), monotonic_ns: toInt(r.monotonic_ns), generation: toInt(r.generation), platform_key: pyStrOf(r.platform_key), platform_label: pyStrOf(r.platform_label),
      request_id: pyStrOf(r.request_id), evidence_token: pyStrOf(r.evidence_token), payload_json: pyStrOf(r.payload_json), schema_version: pyStrOf(r.schema_version)};
  }
  const finite = (x) => (isB(x) ? true : Number.isFinite(x));
  function mineValidate(ev) {
    const required = [ev.event_id, ev.event_name, ev.occurred_at_utc, ev.schema_version];
    if (!required.every(nonempty) || [ev.parent_session_id, ev.sequence, ev.generation, ev.monotonic_ns].some((v) => v <= 0n)) return ['MALFORMED_EVENT', 'Event fields do not satisfy the durable MINE record contract.', null];
    if (ev.schema_version !== MINE_SCHEMA) return ['UNSUPPORTED_SCHEMA', 'Event schema is not the current MINE schema.', null];
    try { NS.time.parseUtc(ev.occurred_at_utc); } catch (e) { if (e instanceof PyError) return ['MALFORMED_UTC', 'Event timestamp is not a readable UTC instant.', null]; throw e; }
    let payload;
    try { payload = NS.pyjson.loads(ev.payload_json, {strict: true}); if (!NS.isDict(payload)) throw VE('payload must be an object'); } catch (e) { if (e instanceof PyError || (e && /RecursionError/.test(e.message))) return ['MALFORMED_PAYLOAD', 'Event payload is not an unambiguous finite JSON object.', null]; throw e; }
    const approved = APPROVED[ev.event_name] || [], display = NS.dict();
    for (const k of Object.keys(payload).sort()) if (approved.includes(k)) display[k] = payload[k];
    const withheld = Object.keys(payload).length - Object.keys(display).length, get = (k) => (NS.has(payload, k) ? payload[k] : null);
    if (BRANCH_EVENTS.has(ev.event_name) && (typeof get('choice') !== 'string' || !CHOICES.has(get('choice')) || ev.event_class !== 'USER_ACTION')) return ['MALFORMED_CHOICE', 'Branch event does not contain an approved choice.', null];
    if (ev.event_name === 'IMPORTANT_DURATION_COMMITTED' && (!isB(get('duration_minutes')) || get('duration_minutes') < 5n || get('duration_minutes') > 30n)) return ['MALFORMED_DURATION', 'Committed important duration must be a whole 5-30 minutes.', null];
    if (ev.event_name === 'MESSAGING_PLATFORM_TRANSITION' && (!nonempty(get('from_platform')) || !nonempty(get('to_platform')) || get('from_platform') === get('to_platform') || ev.platform_key !== get('to_platform') || ev.event_class !== 'OBSERVED')) return ['MALFORMED_MESSENGER_HOP', 'Messenger transition must factually record distinct from/to platforms.', null];
    if (ev.event_name === 'MESSAGING_DWELL_SEGMENT_COMPLETED') {
      const so = get('segment_order'), ds = get('dwell_seconds');
      if (!isB(so) || so <= 0n || !(isB(ds) || typeof ds === 'number') || !Number.isFinite(Number(ds)) || Number(ds) < 0 || !nonempty(get('platform_key')) || ev.platform_key !== get('platform_key') || ev.event_class !== 'DERIVED')
        return ['MALFORMED_DWELL_SEGMENT', 'Dwell segment must record ordered certified platform seconds.', null];
    }
    if (ev.event_name === 'MINE_SESSION_CLOSED' && !(nonempty(get('closure_reason')) && nonempty(get('closure_outcome')))) return ['MALFORMED_CLOSURE', 'Episode closure must record reason and outcome.', null];
    return ['', '', {display, withheld}];
  }
  function mineGroupIssues(key, events) {
    const out = [], add = (code, detail) => out.push({code, detail, session_id: key[0], generation: key[1]});
    if (events.some((e) => e.parent_session_id !== key[0] || e.generation !== key[1])) add('MIXED_GENERATION_KEY', 'Group contains more than one session/generation key.');
    const seqs = events.map((e) => e.sequence), uniq = [...new Set(seqs.map(String))];
    if (uniq.length !== seqs.length) add('DUPLICATE_SEQUENCE', 'Generation contains duplicate sequence numbers.');
    const sortedU = [...new Set(seqs)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (!sortedU.every((v, i) => v === BigInt(i + 1))) add('NON_CONTIGUOUS_SEQUENCE', 'Generation sequence must start at one with no gaps.');
    const starts = events.filter((e) => e.event_name === 'MINE_CANDIDATE_STARTED');
    if (starts.length !== 1 || starts[0].sequence !== 1n) add('INVALID_CANDIDATE_BOUNDARY', 'Generation requires one candidate start at sequence one.');
    const eps = events.filter((e) => e.event_name === 'MINE_EPISODE_STARTED');
    if (eps.length > 1) add('AMBIGUOUS_EPISODE_START', 'Generation contains multiple formal episode starts.');
    const ids = new Set(events.filter((e) => e.mine_episode_id).map((e) => e.mine_episode_id));
    if (ids.size > 1) add('AMBIGUOUS_EPISODE_ID', 'Generation contains conflicting formal episode IDs.');
    if ((eps.length > 0) !== (ids.size > 0)) add('INVALID_EPISODE_ID_BOUNDARY', 'Formal episode start and minted identity disagree.');
    if (eps.length && !eps[0].mine_episode_id) add('MISSING_EPISODE_ID', 'Formal episode start has no minted episode identity.');
    const closes = events.filter((e) => e.event_name === 'MINE_SESSION_CLOSED'), maxSeq = seqs.reduce((a, b) => (a > b ? a : b), 0n);
    if (closes.length > 1 || (closes.length && closes[0].sequence !== maxSeq)) add('INVALID_CLOSE_BOUNDARY', 'Episode closure must be unique and final.');
    if (events.filter((e) => BRANCH_EVENTS.has(e.event_name)).length > 1) add('AMBIGUOUS_BRANCH', 'Generation contains multiple durable branch choices.');
    if (events.filter((e) => e.event_name === 'IMPORTANT_DURATION_COMMITTED').length > 1) add('AMBIGUOUS_DURATION', 'Generation contains multiple committed durations.');
    const orders = events.filter((e) => e.event_name === 'MESSAGING_DWELL_SEGMENT_COMPLETED').map((e) => NS.pyjson.loads(e.payload_json).segment_order);
    if (orders.length !== new Set(orders.map(String)).size) add('DUPLICATE_DWELL_SEGMENT', 'Generation contains duplicate dwell segment order.');
    if (orders.length && !orders.every((v, i) => i === 0 || orders[i - 1] <= v)) add('REGRESSED_DWELL_SEGMENT', 'Dwell segment order regresses by event sequence.');
    const ordered = events.slice().sort((a, b) => (a.sequence < b.sequence ? -1 : a.sequence > b.sequence ? 1 : 0));
    for (let i = 1; i < ordered.length; i++) if (ordered[i].monotonic_ns < ordered[i - 1].monotonic_ns) { add('REGRESSED_MONOTONIC_ORDER', 'Generation monotonic evidence regresses by sequence.'); break; }
    let current = '';
    for (const ev of ordered) {
      if (ev.event_name === 'MESSAGING_PLATFORM_ENTERED') current = ev.platform_key;
      else if (ev.event_name === 'MESSAGING_PLATFORM_TRANSITION') {
        let payload; try { payload = NS.pyjson.loads(ev.payload_json); } catch (e) { if (e instanceof PyError) continue; throw e; }
        if (current && NS.get(payload, 'from_platform') !== current) add('BROKEN_MESSENGER_CHAIN', 'Messenger transition does not continue the recorded route.');
        current = pyStrOf(isNone(NS.get(payload, 'to_platform', '')) ? 'None' : NS.get(payload, 'to_platform', ''));
      }
    }
    return out;
  }
  function mbiBand(s) { if (s <= 600) return '10 MIN OR LESS'; if (s <= 1800) return '11–30 MIN'; if (s <= 3600) return '31–60 MIN'; if (s <= 7200) return '61–120 MIN'; return 'MORE THAN 120 MIN'; }
  const MBI_NONE = 'Factual messaging dwell duration was not recorded for these episodes.', MBI_SOME = 'Factual messaging dwell segments from the latest 10 formal MINE episodes.';
  const usOf = (stamp) => NS.time.parseUtc(stamp);
  const bigCmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function readMine(ctx) {
    checkZone(ctx.zone);
    const unavailable = (status, message, issues) => ({available: false, status, status_message: message, structural_issues: issues || [], overview: {captured_episode_count: null, closed_episode_count: null, confirmed_return_count: null, recorded_generation_count: null, messenger_hop_count: null, population_scope: 'DATABASE_SNAPSHOT'}, episodes: [], latest_events: [], latest_or_selected_recent_episode: null, dwell_records: [], mbi_available: false, mbi_status_message: MBI_NONE, latest_episode_key: null, presentation_timezone: ctx.zone});
    const events = ctx.events || ctx.rows(MINE_SQL).map(mineEvent);
    const groups = new Map(), sanitized = new Map(), issues = [];
    for (const ev of events) {
      const [code, detail, safe] = mineValidate(ev);
      if (code) { issues.push({code, detail, session_id: null, generation: null}); continue; }
      if (sanitized.has(ev.event_id)) issues.push({code: 'DUPLICATE_EVENT_ID', detail: 'Durable event identity occurs more than once.', session_id: null, generation: null});
      sanitized.set(ev.event_id, safe);
      const k = `${ev.parent_session_id}|${ev.generation}`; if (!groups.has(k)) groups.set(k, {key: [ev.parent_session_id, ev.generation], events: []}); groups.get(k).events.push(ev);
    }
    const keys = [...groups.values()].sort((a, b) => bigCmp(a.key[0], b.key[0]) || bigCmp(a.key[1], b.key[1]));
    for (const gr of keys) issues.push(...mineGroupIssues(gr.key, gr.events));
    if (issues.length) {
      const num = (v) => (v === null ? 0n : v);
      issues.sort((a, b) => NS.cmp(a.code, b.code) || bigCmp(num(a.session_id), num(b.session_id)) || bigCmp(num(a.generation), num(b.generation)));
      return unavailable('STRUCTURAL_ERROR', 'MINE structural validation failed; snapshot facts withheld.', issues);
    }
    let projected;
    try {
      projected = new Map();
      for (const gr of keys) {
        const ordered = gr.events.slice().sort((a, b) => bigCmp(a.sequence, b.sequence)); let prev = null; const list = [];
        for (const ev of ordered) {
          const lp = localParts(usOf(ev.occurred_at_utc), ctx.zone), safe = sanitized.get(ev.event_id);
          list.push({session_id: ev.parent_session_id, generation: ev.generation, mine_episode_id: ev.mine_episode_id, sequence: ev.sequence, event_name: ev.event_name, event_class: ev.event_class, occurred_at_utc: ev.occurred_at_utc,
            occurred_at_local: lp.text, platform_key: ev.platform_key, platform_label: ev.platform_label || ev.platform_key, payload_facts: safe.display, withheld_payload_field_count: safe.withheld,
            elapsed_from_previous_seconds: prev === null ? null : Number(ev.monotonic_ns - prev) / NSEC, schema_version: ev.schema_version});
          prev = ev.monotonic_ns;
        }
        projected.set(gr, list);
      }
      const episodeOf = (list) => {
        const start = list.find((e) => e.event_name === 'MINE_EPISODE_STARTED'), episodeId = start.mine_episode_id, close = list.find((e) => e.event_name === 'MINE_SESSION_CLOSED');
        const entered = list.find((e) => e.event_name === 'MESSAGING_PLATFORM_ENTERED'), cand = list[0], starting = entered || cand;
        const branchEv = list.find((e) => BRANCH_EVENTS.has(e.event_name)), durEv = list.find((e) => e.event_name === 'IMPORTANT_DURATION_COMMITTED');
        const labels = Object.create(null), route = [], hops = [];
        if (entered && entered.platform_key) { labels[entered.platform_key] = entered.platform_label || entered.platform_key; route.push([entered.platform_key, labels[entered.platform_key]]); }
        for (const e of list) {
          if (e.event_name !== 'MESSAGING_PLATFORM_TRANSITION') continue;
          const sk = pyStrOf(e.payload_facts.from_platform), dk = pyStrOf(e.payload_facts.to_platform), sl = sk in labels ? labels[sk] : sk, dl = e.platform_label || dk; labels[dk] = dl;
          if (!route.length) route.push([sk, sl]);
          if (route[route.length - 1][0] !== dk) { route.push([dk, dl]); hops.push({from_platform_key: sk, from_platform_label: sl, to_platform_key: dk, to_platform_label: dl, sequence: e.sequence, occurred_at_utc: e.occurred_at_utc, occurred_at_local: e.occurred_at_local}); }
        }
        const dwell = list.filter((e) => e.event_name === 'MESSAGING_DWELL_SEGMENT_COMPLETED').map((e) => ({session_id: cand.session_id, generation: cand.generation, mine_episode_id: episodeId, display_episode_id: '', segment_order: e.payload_facts.segment_order,
          platform_key: e.platform_key, platform_label: e.platform_label || e.platform_key, dwell_seconds: toFloat(e.payload_facts.dwell_seconds), mbi_band: mbiBand(toFloat(e.payload_facts.dwell_seconds)), completed_at_utc: e.occurred_at_utc, completed_at_local: e.occurred_at_local}));
        const cf = close ? close.payload_facts : null;
        return {session_id: cand.session_id, generation: cand.generation, mine_episode_id: episodeId, display_episode_id: '', started_at_utc: cand.occurred_at_utc, started_at_local: cand.occurred_at_local,
          ended_at_utc: close ? close.occurred_at_utc : null, ended_at_local: close ? close.occurred_at_local : null, starting_platform_key: starting.platform_key, starting_platform_label: starting.platform_label,
          branch: branchEv ? pyStrOf(branchEv.payload_facts.choice) : null, important_duration_minutes: durEv ? durEv.payload_facts.duration_minutes : null, closure_outcome: cf ? pyStrOf(cf.closure_outcome) : null,
          closure_reason: cf ? pyStrOf(cf.closure_reason) : null, is_closed: !!close, return_verified: list.some((e) => e.event_name === 'RETURN_VERIFICATION_COMPLETED'),
          closure_confirmed: list.some((e) => e.event_name === 'CLOSURE_CONFIRMATION_COMPLETED'), event_count: list.length, events: list, return_closure_events: list.filter((e) => RETURN_CLOSURE.has(e.event_name)),
          messenger_platforms: route, messenger_hops: hops, mbi_available: dwell.length > 0, mbi_status_message: dwell.length ? MBI_SOME : MBI_NONE, dwell_records: dwell};
      };
      const startUs = (ep) => usOf(ep.events.find((e) => e.event_name === 'MINE_EPISODE_STARTED').occurred_at_utc);
      let episodes = [...projected.values()].filter((l) => l.some((e) => e.event_name === 'MINE_EPISODE_STARTED')).map(episodeOf);
      episodes = sortBy(episodes, (e) => [usOf(e.started_at_utc), e.session_id, e.generation], true);
      const chrono = sortBy(episodes, (e) => [startUs(e), e.session_id, e.generation], false), daily = Object.create(null), alias = new Map();
      for (const ep of chrono) {
        const fs = ep.events.find((e) => e.event_name === 'MINE_EPISODE_STARTED'), d = fs.occurred_at_local.slice(0, 10), code = `${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(0, 4)}`;
        daily[code] = (daily[code] || 0) + 1; alias.set(`${ep.session_id}|${ep.generation}`, `MINE-${code}-${String(daily[code]).padStart(2, '0')}`);
      }
      episodes = episodes.map((ep) => { const a = alias.get(`${ep.session_id}|${ep.generation}`); return Object.assign(ep, {display_episode_id: a, dwell_records: ep.dwell_records.map((r) => Object.assign(r, {display_episode_id: a}))}); });
      const recent = sortBy([...projected.keys()], (gr) => [usOf(projected.get(gr)[projected.get(gr).length - 1].occurred_at_utc), gr.key[0], gr.key[1]], true);
      const latest = recent.flatMap((gr) => projected.get(gr).slice().reverse());
      const overview = {captured_episode_count: episodes.length, closed_episode_count: episodes.filter((e) => e.is_closed).length, confirmed_return_count: episodes.filter((e) => e.events.some((x) => x.event_name === 'RETURN_CONFIRMED')).length,
        recorded_generation_count: projected.size, messenger_hop_count: latest.filter((e) => e.event_name === 'MESSAGING_PLATFORM_TRANSITION').length, population_scope: 'DATABASE_SNAPSHOT'};
      const dwellAll = episodes.slice(0, 10).flatMap((ep) => (ep.dwell_records.length ? ep.dwell_records : [{session_id: ep.session_id, generation: ep.generation, mine_episode_id: ep.mine_episode_id, display_episode_id: ep.display_episode_id, segment_order: null,
        platform_key: ep.starting_platform_key, platform_label: ep.starting_platform_label, dwell_seconds: null, mbi_band: null, completed_at_utc: null, completed_at_local: null}]));
      const mbiAvailable = dwellAll.some((r) => r.dwell_seconds !== null), latestEp = episodes[0] || null;
      return {available: true, presentation_timezone: ctx.zone, overview, episodes, latest_episode_key: latestEp ? [latestEp.session_id, latestEp.generation] : null, latest_events: latest, latest_or_selected_recent_episode: latestEp ? latestEp : null,
        status: episodes.length ? 'AVAILABLE' : 'EMPTY', status_message: episodes.length ? 'Facts from the durable MINE database snapshot.' : latest.length ? 'No formal MINE episodes; candidate evidence is available.' : 'No MINE events in the database snapshot.',
        structural_issues: [], mbi_available: mbiAvailable, mbi_status_message: mbiAvailable ? MBI_SOME : MBI_NONE, dwell_records: dwellAll};
    } catch (e) {
      if (e instanceof PyError && (e.kind === 'ValueError' || e.kind === 'OverflowError')) return unavailable('TIMEZONE_ERROR', 'UTC evidence could not be projected into the selected timezone.');
      throw e;
    }
  }

  /* ======================================== COSINE ======================================== */
  const COSINE_SCHEMA = 'myelin-cosine-v3-parent-session';
  const COSINE_LABELS = {netflix: 'Netflix', prime_video: 'Prime Video', jiohotstar: 'JioHotstar', disney_plus: 'Disney+', hulu: 'Hulu', hbo_max: 'HBO Max', apple_tv_plus: 'Apple TV+', paramount_plus: 'Paramount+'};
  const COSINE_SQL = 'SELECT event_id, session_id, cosine_session_id, generation, sequence, event_name, event_class, occurred_at_utc, monotonic_ns, platform_key, content_title, request_id, evidence_token, payload_json, schema_version FROM "cosine_events" ORDER BY cosine_session_id, generation, sequence, event_id LIMIT ?';
  const HELD = new Set(['foreground_ott_seconds', 'platform_seconds', 'break_start_effective_ns', 'break_deadline_effective_ns']);
  const CHOICE_EVENTS = {RETURN_INTENT_RECORDED: 'RETURN_INTENTION', BREAK_INTENT_RECORDED: 'INTENTIONAL_BREAK'};
  function cosineEvent(r) {
    const cls = pyStrOf(r.event_class); if (!MINE_CLASSES.has(cls)) throw VE(`'${cls}' is not a valid EventClass`);
    return {event_id: pyStrOf(r.event_id), session_id: isNone(r.session_id) ? null : toInt(r.session_id), cosine_session_id: pyStrOf(r.cosine_session_id), sequence: toInt(r.sequence), event_name: pyStrOf(r.event_name), event_class: cls,
      occurred_at_utc: pyStrOf(r.occurred_at_utc), monotonic_ns: toInt(r.monotonic_ns), generation: toInt(r.generation), platform_key: pyStrOf(r.platform_key), content_title: pyStrOf(r.content_title),
      request_id: pyStrOf(r.request_id), evidence_token: pyStrOf(r.evidence_token), payload_json: pyStrOf(r.payload_json), schema_version: pyStrOf(r.schema_version)};
  }
  function sanitize(v) {
    if (NS.isDict(v)) { const out = NS.dict(); let count = 0; for (const k of Object.keys(v).sort()) { if (HELD.has(k)) count++; else { const [s, c] = sanitize(v[k]); out[k] = s; count += c; } } return [out, count]; }
    if (Array.isArray(v)) { const pairs = v.map(sanitize); return [pairs.map((p) => p[0]), pairs.reduce((a, p) => a + p[1], 0)]; }
    if (typeof v === 'number' && !Number.isFinite(v)) throw VE('non-finite JSON value');
    return [v, 0];
  }
  function cosineValidate(ev) {
    const text = [ev.event_id, ev.cosine_session_id, ev.event_name, ev.occurred_at_utc, ev.schema_version];
    if (!text.every(nonempty) || [ev.sequence, ev.generation, ev.monotonic_ns].some((v) => v <= 0n) || (ev.session_id !== null && ev.session_id <= 0n)) return ['MALFORMED_EVENT', 'Event fields do not satisfy the durable record contract.', null];
    if (ev.schema_version !== COSINE_SCHEMA) return ['UNSUPPORTED_SCHEMA', 'Event schema is not the current NEW COSINE schema.', null];
    try { NS.time.parseUtc(ev.occurred_at_utc); } catch (e) { if (e instanceof PyError) return ['MALFORMED_UTC', 'Event timestamp does not identify a readable UTC instant.', null]; throw e; }
    let payload, display, withheld;
    try { payload = NS.pyjson.loads(ev.payload_json, {strict: true}); if (!NS.isDict(payload)) throw VE('payload must be an object'); [display, withheld] = sanitize(payload); }
    catch (e) { if (e instanceof PyError || (e && /RecursionError/.test(e.message))) return ['MALFORMED_PAYLOAD', 'Event payload is not an unambiguous finite JSON object.', null]; throw e; }
    const get = (k) => (NS.has(payload, k) ? payload[k] : null), name = ev.event_name;
    if (NS.has(CHOICE_EVENTS, name) && (get('choice') !== CHOICE_EVENTS[name] || ev.event_class !== 'USER_ACTION')) return ['MALFORMED_CHOICE', 'Durable choice event and recorded choice disagree.', null];
    if (name === 'BREAK_DURATION_COMMITTED' && (!isB(get('duration_minutes')) || get('duration_minutes') <= 0n)) return ['MALFORMED_BREAK_COMMIT', 'Committed duration must be a positive integer number of minutes.', null];
    if (name === 'HOPPER_TRANSITION' && !(nonempty(get('from_platform')) && nonempty(get('to_platform')))) return ['MALFORMED_HOPPER', 'Hopper transition must record both platform keys.', null];
    if (name === 'COSINE_SESSION_CLOSED' && !(nonempty(get('closure_reason')) && nonempty(get('closure_outcome')))) return ['MALFORMED_CLOSURE', 'Closure must record its reason and outcome.', null];
    return ['', '', {display, withheld}];
  }
  function cosineGroupIssues(key, events) {
    const out = [], add = (code, detail) => out.push({code, detail, event_id: '', cosine_session_id: key[0], generation: key[1]});
    if (events.some((e) => e.cosine_session_id !== key[0] || e.generation !== key[1])) add('MIXED_EPISODE_KEY', 'Group contains more than one episode identity or generation.');
    if (new Set(events.map((e) => (e.session_id === null ? 'None' : String(e.session_id)))).size !== 1) add('MIXED_PARENT_SESSION', 'Episode rows disagree about the parent session.');
    const seqs = events.map((e) => e.sequence);
    if (new Set(seqs.map(String)).size !== seqs.length) add('DUPLICATE_SEQUENCE', 'Episode contains duplicate sequence numbers.');
    const su = [...new Set(seqs)].sort(bigCmp);
    if (!su.every((v, i) => v === BigInt(i + 1))) add('NON_CONTIGUOUS_SEQUENCE', 'Episode sequence must start at one with no gaps.');
    const starts = events.filter((e) => e.event_name === 'COSINE_SESSION_STARTED');
    if (starts.length !== 1 || starts[0].sequence !== 1n) add('INVALID_START_BOUNDARY', 'Episode requires exactly one start at sequence one.');
    const closes = events.filter((e) => e.event_name === 'COSINE_SESSION_CLOSED'), mx = seqs.reduce((a, b) => (a > b ? a : b), 0n);
    if (closes.length > 1 || (closes.length && closes[0].sequence !== mx)) add('INVALID_CLOSE_BOUNDARY', 'A closure must be unique and the final episode event.');
    if (events.filter((e) => NS.has(CHOICE_EVENTS, e.event_name)).length > 1) add('AMBIGUOUS_CHOICE', 'Multiple durable choices cannot project to one choice.');
    if (events.filter((e) => e.event_name === 'BREAK_DURATION_COMMITTED').length > 1) add('AMBIGUOUS_BREAK_COMMIT', 'Multiple committed durations cannot project to one duration.');
    return out;
  }
  function readCosine(ctx) {
    checkZone(ctx.zone);
    const unavailable = (status, message, issues) => ({available: false, status, status_message: message, structural_issues: issues || [], overview: {captured_episode_count: null, confirmed_return_count: null, break_started_count: null, population_scope: 'DATABASE_SNAPSHOT', usual_return_seconds: null, usual_return_status: 'UNAVAILABLE', usual_return_reason: 'Phase 2 definition not certified'}, episodes: [], latest_events: [], latest_or_selected_recent_episode: null, presentation_timezone: ctx.zone});
    const events = ctx.events || ctx.rows(COSINE_SQL).map(cosineEvent), groups = new Map(), sanitized = new Map(), issues = [];
    for (const ev of events) {
      const [code, detail, safe] = cosineValidate(ev);
      if (code) { issues.push({code, detail, event_id: '', cosine_session_id: '', generation: null}); continue; }
      if (sanitized.has(ev.event_id)) issues.push({code: 'DUPLICATE_EVENT_ID', detail: 'Event ID occurs more than once.', event_id: ev.event_id, cosine_session_id: '', generation: null});
      sanitized.set(ev.event_id, safe);
      const k = JSON.stringify([ev.cosine_session_id, String(ev.generation)]); if (!groups.has(k)) groups.set(k, {key: [ev.cosine_session_id, ev.generation], events: []}); groups.get(k).events.push(ev);
    }
    const keys = [...groups.values()].sort((a, b) => NS.cmp(a.key[0], b.key[0]) || bigCmp(a.key[1], b.key[1]));
    for (const gr of keys) issues.push(...cosineGroupIssues(gr.key, gr.events));
    if (issues.length) {
      issues.sort((a, b) => NS.cmp(a.code, b.code) || NS.cmp(a.cosine_session_id, b.cosine_session_id) || bigCmp(a.generation === null ? 0n : a.generation, b.generation === null ? 0n : b.generation) || NS.cmp(a.event_id, b.event_id));
      return unavailable('STRUCTURAL_ERROR', 'COSINE structural validation failed; snapshot facts withheld.', issues);
    }
    try {
      const projectEvent = (e) => { const lp = localParts(usOf(e.occurred_at_utc), ctx.zone), s = sanitized.get(e.event_id);
        return {event_id: e.event_id, cosine_session_id: e.cosine_session_id, generation: e.generation, sequence: e.sequence, event_name: e.event_name, event_class: e.event_class, occurred_at_utc: e.occurred_at_utc, occurred_at_local: lp.text,
          platform_key: e.platform_key, platform_label: COSINE_LABELS[e.platform_key] || e.platform_key, content_title: e.content_title, request_id: e.request_id, payload_display: s.display, withheld_payload_field_count: s.withheld, schema_version: e.schema_version}; };
      const episodeOf = (gr) => {
        const ordered = gr.events.slice().sort((a, b) => bigCmp(a.sequence, b.sequence)), list = ordered.map(projectEvent), start = list[0], close = list.find((e) => e.event_name === 'COSINE_SESSION_CLOSED');
        const choiceEv = list.find((e) => NS.has(CHOICE_EVENTS, e.event_name)), durEv = list.find((e) => e.event_name === 'BREAK_DURATION_COMMITTED');
        const hopper = list.filter((e) => e.event_name === 'HOPPER_TRANSITION').map((e) => { const f = pyStrOf(e.payload_display.from_platform), t = pyStrOf(e.payload_display.to_platform);
          return {from_platform: f, to_platform: t, from_platform_label: COSINE_LABELS[f] || f, to_platform_label: COSINE_LABELS[t] || t, sequence: e.sequence, occurred_at_utc: e.occurred_at_utc, occurred_at_local: e.occurred_at_local}; });
        const reason = close ? pyStrOf(close.payload_display.closure_reason) : null, outcome = close ? pyStrOf(close.payload_display.closure_outcome) : null, held = reason === 'SINE_HANDOFF' || outcome === 'HANDOVER';
        return {cosine_session_id: gr.key[0], generation: gr.key[1], parent_session_id: ordered[0].session_id, started_at_utc: start.occurred_at_utc, started_at_local: start.occurred_at_local, ended_at_utc: close ? close.occurred_at_utc : null,
          ended_at_local: close ? close.occurred_at_local : null, starting_platform_key: start.platform_key, starting_platform_label: start.platform_label, event_count: list.length, user_choice: choiceEv ? choiceEv.payload_display.choice : null,
          chosen_break_minutes: durEv ? durEv.payload_display.duration_minutes : null, hopper_count: hopper.length, hopper_transitions: hopper, closure_reason: reason, closure_outcome: outcome, is_closed: !!close, events: list,
          hold_context: held, hold_context_reason: held ? 'SINE/COSINE handoff: context only; interpretation on HOLD.' : null};
      };
      const episodes = sortBy(keys.map(episodeOf), (e) => [usOf(e.started_at_utc), e.cosine_session_id, e.generation], true);
      const latest = episodes.flatMap((e) => e.events.slice().reverse());
      return {available: true, presentation_timezone: ctx.zone, overview: {captured_episode_count: episodes.length, confirmed_return_count: latest.filter((e) => e.event_name === 'RETURN_CONFIRMED').length, break_started_count: latest.filter((e) => e.event_name === 'BREAK_STARTED').length,
        population_scope: 'DATABASE_SNAPSHOT', usual_return_seconds: null, usual_return_status: 'UNAVAILABLE', usual_return_reason: 'Phase 2 definition not certified'}, episodes, latest_events: latest,
        latest_or_selected_recent_episode: episodes[0] || null, status: episodes.length ? 'AVAILABLE' : 'EMPTY', status_message: episodes.length ? 'Facts from the database snapshot.' : 'No COSINE events in the database snapshot.', structural_issues: []};
    } catch (e) {
      if (e instanceof PyError && (e.kind === 'ValueError' || e.kind === 'OverflowError')) return unavailable('TIMEZONE_ERROR', 'UTC evidence could not be projected into the selected timezone.');
      throw e;
    }
  }

  NS.organs = {readMirl, readMine, readCosine, triggerFacts, operationalTriggerRows, triggerEvidence, literalEval, localParts, mirlEvent, mineEvent, cosineEvent, toInt, toFloat, pyStrOf, pyRepr, validUtcZ, MBI_NONE, MBI_SOME, COSINE_LABELS};
})(self);
