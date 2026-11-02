// Port of SECANT/dashboard_evidence.py (the read side, after the rows have been fetched by the worker's fixed queries):
// per-table status (AVAILABLE / NOT_RECORDED / UNAVAILABLE), recorder receipts, validated display aliases and per-session scoping.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB, {ValueError, TypeErr, dict, isDict, isInt, isStr, has, attempt, CAUGHT} = NS;
  const TABLES = ['sessions', 'secant_events', 'secant_founding_source', 'study_events', 'study_resource_events', 'study_resources',
    'study_resource_boundaries', 'study_resource_intervals', 'study_resource_observation_evidence', 'cosecant_events', 'presentation_aliases'];
  const ROW_LIMIT = 250000;
  const table = (rows, status, diagnostic = '') => ({rows, status, diagnostic});

  /** _read_receipts: raw = {absent:true} | {error:'<ExceptionName>'} | {rows:[[key, value-text], ...]} */
  function readReceipts(raw) {
    if (raw.absent) return table([], 'NOT_RECORDED');
    if (raw.error) return table([], 'UNAVAILABLE', raw.error);
    return attempt(() => {
      const rows = [];
      for (const [key, value] of raw.rows) {
        const receipt = NS.pyjson.loads(value);
        if (!isDict(receipt) || key !== 'passive_recorder:v1:run:' + NS.str(NS.get(receipt, 'run_id', ''))) throw ValueError('Recorder receipt identity mismatch');
        const sessions = NS.get(receipt, 'attached_session_ids');
        if (!Array.isArray(sessions) || sessions.some((s) => !isInt(s) || s <= 0n)) throw ValueError('Invalid recorder parent scope');
        rows.push(receipt);
      }
      return table(rows, 'AVAILABLE');
    }, ['ValueError', 'TypeError'], (e) => table([], 'UNAVAILABLE', e.kind));
  }
  const scopeReceipts = (receipts, sid) => table(receipts.rows.filter((r) => r.attached_session_ids.some((s) => s === sid)), receipts.status, receipts.diagnostic);

  /** read_display_alias: only a validated persisted alias; anything else is 'Unavailable'. */
  function readDisplayAlias(snapshot, kind, nativeId) {
    const t = snapshot.tables.presentation_aliases;
    if (!t || t.status !== 'AVAILABLE' || (kind !== 'SECANT' && kind !== 'COSECANT')) return 'Unavailable';
    const rows = t.rows.filter((r) => NS.eq(r.entity_kind ?? null, kind) && NS.eq(r.native_id ?? null, nativeId));
    if (rows.length !== 1) return 'Unavailable';
    const row = rows[0];
    return attempt(() => {
      const ordinal = NS.item(row, 'daily_ordinal');
      if (!NS.eq(NS.item(row, 'alias_version'), 1n) || !isInt(ordinal) || ordinal < 1n) return 'Unavailable';
      const dayRaw = NS.item(row, 'founding_utc_date');
      if (!isStr(dayRaw)) throw TypeErr('fromisoformat: argument must be str');
      const m0 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayRaw);
      if (!m0) throw ValueError('Invalid isoformat string');
      const [y, mo, d] = [+m0[1], +m0[2], +m0[3]];
      const dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > dim[mo - 1]) throw ValueError('day is out of range for month');
      const alias = NS.item(row, 'display_alias');
      const match = isStr(alias) ? /^(SEC|COSEC)-(\d{8})-(\d{2,})$/.exec(alias) : null;
      const ddmmyyyy = `${m0[3]}${m0[2]}${m0[1]}`;
      if (!match || match[1] !== (kind === 'SECANT' ? 'SEC' : 'COSEC') || match[2] !== ddmmyyyy || match[3] !== String(ordinal).padStart(2, '0')) return 'Unavailable';
      return alias;
    }, ['KeyError', 'TypeError', 'ValueError'], () => 'Unavailable');
  }

  const sidKey = (v) => (isInt(v) ? 'i' + String(v) : typeof v === 'number' && Number.isInteger(v) ? 'i' + String(v) : 'x');
  const REQUIRED = (name) => {
    const r = new Set(name === 'sessions' ? ['id'] : name === 'secant_founding_source' ? ['event_id'] : name === 'presentation_aliases' ? ['entity_kind', 'native_id'] : ['session_id']);
    if (name === 'secant_events') { r.add('event_id'); r.add('episode_id'); }
    if (name === 'cosecant_events') r.add('break_id');
    return r;
  };

  /**
   * read_corpus, after fetching. raw = {available:[table names that are plain tables], rows:{name:[row dicts]|undefined}, errors:{name:'<ExceptionName>'}, receipts:{...}}
   * Throws a ValueError (the desktop raises) when session scope authority is missing or unreadable.
   */
  function buildCorpus(raw) {
    const available = new Set(raw.available);
    if (!available.has('sessions')) throw ValueError('Session scope authority is missing');
    const tables = {};
    const receipts = readReceipts(raw.receipts);
    for (const name of TABLES) {
      try {
        if (raw.errors && raw.errors[name]) { const e = NS.ValueError(raw.errors[name]); e.dbError = raw.errors[name]; throw e; }
        const rows = available.has(name) ? (raw.rows[name] || []) : [];
        if (rows.length > ROW_LIMIT) throw ValueError('Dashboard historical read limit exceeded');
        const required = REQUIRED(name);
        if (rows.some((r) => ![...required].every((k) => has(r, k)))) throw ValueError('Missing durable scope columns');
        tables[name] = table(rows, available.has(name) ? 'AVAILABLE' : 'NOT_RECORDED');
      } catch (e) {
        if (!(e instanceof NS.PyError)) throw e;
        if (name === 'sessions') throw e;
        tables[name] = table([], 'UNAVAILABLE', e.dbError || 'ValueError');
      }
    }
    const bySession = {};
    for (const name of TABLES) {
      if (name === 'sessions' || name === 'secant_founding_source' || name === 'presentation_aliases') continue;
      const m = new Map();
      for (const r of tables[name].rows) { const k = sidKey(r.session_id); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
      bySession[name] = m;
    }
    const result = [];
    for (const session of tables.sessions.rows) {
      const sid = session.id, key = sidKey(sid);
      const secant = (bySession.secant_events.get(key) || []), cosecant = (bySession.cosecant_events.get(key) || []);
      const eventIds = new Set(secant.map((r) => r.event_id));
      const aliases = new Set([...secant.map((r) => 'SECANT\u0000' + NS.str(r.episode_id)), ...cosecant.map((r) => 'COSECANT\u0000' + NS.str(r.break_id))]);
      const scoped = {};
      for (const name of TABLES) {
        const t = tables[name];
        if (name === 'sessions') { scoped[name] = table([session], t.status, t.diagnostic); continue; }
        if (name === 'secant_founding_source') {
          if (tables.secant_events.status === 'UNAVAILABLE') { scoped[name] = table([], 'UNAVAILABLE', 'SECANT parent unavailable'); continue; }
          scoped[name] = table(t.rows.filter((r) => eventIds.has(r.event_id)), t.status, t.diagnostic); continue;
        }
        if (name === 'presentation_aliases') { scoped[name] = table(t.rows.filter((r) => aliases.has(NS.str(r.entity_kind) + '\u0000' + NS.str(r.native_id))), t.status, t.diagnostic); continue; }
        scoped[name] = table(bySession[name].get(key) || [], t.status, t.diagnostic);
      }
      result.push({session_id: sid, tables: scoped, recorder_receipts: scopeReceipts(receipts, sid)});
    }
    return NS.sortedBy(result, (s) => s.session_id);
  }
  NS.evidence = {TABLES, ROW_LIMIT, table, readReceipts, scopeReceipts, readDisplayAlias, buildCorpus};
})(self);
