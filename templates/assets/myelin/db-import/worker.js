// Dedicated worker that opens ONE user-selected SQLite file from memory, read-only, and answers fixed questions about it.
// Ops: open / probe / check (Stage 2 surface) and load / model (Stage 3: the canonical SECANT evidence adapter). It has no network code, no storage code and
// no SQL taken from the file: every statement below is a literal. The bytes arrive as a transferred ArrayBuffer, live only in this worker and are dropped by close().
// Imported evidence never leaves this worker except as the plain, derived presentation model; nothing is written anywhere.
'use strict';
const LIB = '1.14.2';                                        // pinned, vendored build (see vendor/sqlite/MANIFEST.json)
importScripts('limits.js', 'header.js', 'pycompat.js', 'sha256.js', 'pyjson.js', 'timeutil.js', 'contracts.js', 'evidence.js', 'projection.js', 'presentation.js', 'organs.js', 'metrichub.js', 'sciencelab.js',
  'explorer-known.js', 'explorer-inventory.js',
  `../vendor/sqlite/sql.js-${LIB}/sql-wasm-browser.js`);
const L = self.MYELIN_DB_LIMITS, NS = self.MYELIN_DB;
const WAL_NOTICE = 'This file is flagged as WAL-mode. A single .db file may not include transactions that were still in its -wal file; completeness cannot be determined from the file alone.';

// Fixed, literal statements. Table names are constants in this file; nothing from a database file is ever interpolated into SQL.
const COUNT_SQL = Object.freeze({
  sessions: 'SELECT COUNT(*) FROM "sessions"', secant_events: 'SELECT COUNT(*) FROM "secant_events"', secant_founding_source: 'SELECT COUNT(*) FROM "secant_founding_source"',
  study_events: 'SELECT COUNT(*) FROM "study_events"', study_resource_events: 'SELECT COUNT(*) FROM "study_resource_events"', study_resources: 'SELECT COUNT(*) FROM "study_resources"',
  study_resource_boundaries: 'SELECT COUNT(*) FROM "study_resource_boundaries"', study_resource_intervals: 'SELECT COUNT(*) FROM "study_resource_intervals"',
  study_resource_observation_evidence: 'SELECT COUNT(*) FROM "study_resource_observation_evidence"', cosecant_events: 'SELECT COUNT(*) FROM "cosecant_events"',
  presentation_aliases: 'SELECT COUNT(*) FROM "presentation_aliases"'
});
const ROWS_SQL = Object.freeze({
  sessions: 'SELECT * FROM "sessions" LIMIT ?', secant_events: 'SELECT * FROM "secant_events" LIMIT ?', secant_founding_source: 'SELECT * FROM "secant_founding_source" LIMIT ?',
  study_events: 'SELECT * FROM "study_events" LIMIT ?', study_resource_events: 'SELECT * FROM "study_resource_events" LIMIT ?', study_resources: 'SELECT * FROM "study_resources" LIMIT ?',
  study_resource_boundaries: 'SELECT * FROM "study_resource_boundaries" LIMIT ?', study_resource_intervals: 'SELECT * FROM "study_resource_intervals" LIMIT ?',
  study_resource_observation_evidence: 'SELECT * FROM "study_resource_observation_evidence" LIMIT ?', cosecant_events: 'SELECT * FROM "cosecant_events" LIMIT ?',
  presentation_aliases: 'SELECT * FROM "presentation_aliases" LIMIT ?'
});
const TABLE_KIND_SQL = 'SELECT type, sql FROM sqlite_master WHERE name = ?';
const OBJECTS_SQL = "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view')";
const SCHEMA_VERSION_SQL = "SELECT value FROM myelin_meta WHERE key = 'schema_version'";
const SECANT_INDEX_SQL = "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'ix_secant_events_session_episode_time'";
const RECEIPTS_SQL = "SELECT key, value FROM myelin_meta WHERE key LIKE 'passive_recorder:v1:run:%'";

let SQL = null, db = null, corpus = null, walFlag = false, presentationCache = null;
let integrity = null, fileHeader = null, registry = null;      // Explorer (E1): quick_check verdict for the open file, its header facts, and the last inventory's table registry

function fail(code, extra) { return Object.assign({ok: false, code}, extra || {}); }
function dropDb() { corpus = null; presentationCache = null; walFlag = false; integrity = null; fileHeader = null; registry = null; try { if (db) db.close(); } catch (e) { /* closing a failed handle is best effort */ } db = null; }
function classify(e) { return /malformed|not a database|corrupt|disk image|truncat/i.test(String(e && e.message)) ? 'MALFORMED_DATABASE' : 'OPEN_FAILED'; }
function one(sql, params) {
  const st = db.prepare(sql);
  try { if (params) st.bind(params); return st.step() ? st.get() : null; } finally { st.free(); }
}

function open(buffer) {
  dropDb();
  if (!(buffer instanceof ArrayBuffer)) return fail('MALFORMED_HEADER');
  if (buffer.byteLength > L.MAX_BYTES) return fail('TOO_LARGE');
  const bytes = new Uint8Array(buffer);
  const h = self.inspectDbHeader(bytes);
  if (!h.ok) return fail(h.code);
  if (h.encoding !== 1) return fail('UNSUPPORTED_ENCODING');
  try {
    db = new SQL.Database(bytes);
    db.exec('PRAGMA query_only = ON');
    db.exec('PRAGMA trusted_schema = OFF');           // schema objects in the file may not call unsafe functions
    one('SELECT COUNT(*) FROM sqlite_master');         // forces the schema to be parsed now
  } catch (e) { dropDb(); return fail(classify(e)); }
  walFlag = h.walFlag; fileHeader = h; integrity = null; registry = null;
  // A WAL-flagged file is opened exactly as given; whether its -wal contents were merged cannot be known from this single file.
  return {ok: true, header: h, wal: {flagged: h.walFlag}, sqliteVersion: one('SELECT sqlite_version()')[0]};
}

function probe() {
  if (!db) return fail('NO_DATABASE');
  const tables = {};
  let blocking = null;
  for (const name of Object.keys(COUNT_SQL)) {
    const kind = one(TABLE_KIND_SQL, [name]);
    if (!kind) { tables[name] = {status: 'NOT_RECORDED'}; continue; }
    if (kind[0] !== 'table' || /^\s*CREATE\s+VIRTUAL/i.test(String(kind[1]))) { tables[name] = {status: 'UNAVAILABLE', reason: 'NOT_A_PLAIN_TABLE'}; continue; }
    try {
      const n = one(COUNT_SQL[name])[0];
      tables[name] = n > L.MAX_ROWS_PER_TABLE ? {status: 'UNAVAILABLE', reason: 'ROW_LIMIT_EXCEEDED', rows: n} : {status: 'AVAILABLE', rows: n};
    } catch (e) { tables[name] = {status: 'UNAVAILABLE', reason: 'READ_FAILED'}; }
  }
  if (tables.sessions.status !== 'AVAILABLE') blocking = 'SESSION_SCOPE_UNAVAILABLE';
  return {ok: true, schema: schemaGate(), tables, blocking};
}
function schemaGate() {
  const meta = one(TABLE_KIND_SQL, ['myelin_meta']);
  if (meta && meta[0] === 'table') {
    try {
      const row = one(SCHEMA_VERSION_SQL), v = row == null ? null : String(row[0]).slice(0, 16);
      return {status: v === L.SUPPORTED_SCHEMA_VERSION ? 'SUPPORTED' : 'UNSUPPORTED', version: v};
    } catch (e) { return {status: 'UNSUPPORTED', version: null}; }
  }
  return {status: 'UNSUPPORTED', version: null};
}

// Optional structural check (fixed PRAGMA, first problem only). It is a gate for reading, NOT evidence that the SECANT records are valid.
function check() {
  if (!db) return fail('NO_DATABASE');
  try {
    const row = one('PRAGMA quick_check(1)');
    const text = row == null ? '' : String(row[0]);
    integrity = text === 'ok' ? 'ok' : 'failed';
    return {ok: true, result: text === 'ok' ? 'ok' : 'PROBLEM', detail: text === 'ok' ? '' : text.slice(0, 160)};
  } catch (e) { integrity = 'failed'; return {ok: true, result: 'PROBLEM', detail: 'CHECK_FAILED'}; }
}

/* ---------------- Explorer (E1): inventory and schema classification, metadata only ---------------- */
// Every Explorer operation passes through this gate: the structural check runs once per opened file and a failure blocks ALL further Explorer operations.
function explorerGate() {
  if (!db) return fail('NO_DATABASE');
  if (integrity === null) check();
  if (integrity !== 'ok') return fail('INTEGRITY_CHECK_FAILED', {detail: ''});          // banner only: no table list, no counts, no version, no rows
  return null;
}
const clampInt = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
function inventoryOp(options) {
  const refused = explorerGate(); if (refused) return refused;
  const r = NS.explorer.inventory.buildInventory(db, {header: fileHeader, countBudgetMs: clampInt(options && options.countBudgetMs, 0, L.COUNT_BUDGET_MAX_MS, L.COUNT_BUDGET_MS)});
  registry = r.registry;
  return r.inventory;
}
function pageOp(options) {
  const refused = explorerGate(); if (refused) return refused;
  if (!registry) return fail('NO_INVENTORY');
  const id = options && options.id, offset = options && options.offset, limit = options && options.limit;
  if (!Number.isInteger(id) || !registry.has(id)) return fail('UNKNOWN_TABLE');
  if (!Number.isInteger(offset) || offset < 0 || offset > 2147483647 || !Number.isInteger(limit) || limit < 1 || limit > L.PAGE_MAX_ROWS) return fail('INVALID_PAGE');
  return NS.explorer.inventory.readPage(db, registry.get(id), offset, limit);
}
function tableOp(options) {
  const refused = explorerGate(); if (refused) return refused;
  if (!registry) return fail('NO_INVENTORY');
  const id = options && options.id;
  if (!Number.isInteger(id) || !registry.has(id)) return fail('UNKNOWN_TABLE');
  return {ok: true, table: NS.explorer.inventory.describeTable(db, registry.get(id))};
}

/* ---------------- Stage 3: read the fixed tables, validate with the desktop's rules, build the presentation ---------------- */
function toDict(o) { const d = Object.create(null); for (const k of Object.keys(o)) d[k] = o[k]; return d; }
function readTable(name) {
  const rows = [], st = db.prepare(ROWS_SQL[name]);
  try {
    st.bind([L.MAX_ROWS_PER_TABLE + 1]);
    while (st.step()) rows.push(toDict(st.getAsObject(null, {useBigInt: true})));
  } finally { st.free(); }
  return rows;
}
function readRaw() {
  const available = [], errors = {}, rows = {};
  const objects = {};
  const st = db.prepare(OBJECTS_SQL);
  try { while (st.step()) { const [n, t, s] = st.get(); objects[n] = [t, s]; } } finally { st.free(); }
  for (const name of Object.keys(ROWS_SQL)) {
    const o = objects[name];
    if (!o) continue;
    available.push(name);
    if (o[0] !== 'table' || /^\s*CREATE\s+VIRTUAL/i.test(String(o[1]))) { errors[name] = 'NotAPlainTable'; continue; }
    try { rows[name] = readTable(name); } catch (e) { errors[name] = 'OperationalError'; }
  }
  let receipts;
  const meta = objects.myelin_meta;
  if (!meta || meta[0] !== 'table') receipts = {absent: true};
  else {
    try {
      const list = [], rs = db.prepare(RECEIPTS_SQL);
      try { while (rs.step()) list.push(rs.get()); } finally { rs.free(); }
      receipts = {rows: list};
    } catch (e) { receipts = {error: 'OperationalError'}; }
  }
  return {available, rows, errors, receipts};
}
const plain = (v) => {
  if (typeof v === 'bigint') return (v >= -9007199254740991n && v <= 9007199254740991n) ? Number(v) : v.toString();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = plain(v[k]); return o; }
  return v;
};
const KEYS = ['context', 'landing', 'overview', 'episodes', 'distraction_history', 'study_history', 'study_evidence', 'cosecant', 'secant_archive', 'study_archive', 'archive_diagnostics', 'secant_empty', 'study_empty'];
function buildModel(sessionId, timezone) {
  let sid = null;
  if (sessionId !== null && sessionId !== undefined) { if (!/^[0-9]{1,18}$/.test(String(sessionId))) return fail('INVALID_SESSION'); sid = BigInt(sessionId); }
  else sid = NS.presentation.defaultSessionId(corpus);
  const tz = String(timezone || 'UTC');
  presentationCache = presentationCache || new Map();
  if (!presentationCache.has(tz)) presentationCache.set(tz, new Map());   // per-session presentations are pure: reused when only the selected session changes
  const r = NS.presentation.prepareModel(corpus, sid, tz, presentationCache.get(tz));
  const model = {};
  for (const k of KEYS) model[k] = plain(r.model[k]);
  return {ok: true, model, selectedSessionId: sid === null ? null : Number(sid), error: r.error, detail: r.detail || ''};
}
const SESSION_EVIDENCE_TABLES = ['secant_events', 'study_events', 'cosecant_events', 'study_resources'];
function sessionList() {
  return corpus.map((s) => {
    const row = s.tables.sessions.rows[0] || {}, text = (v) => (typeof v === 'string' ? v : v === null || v === undefined ? null : String(v));
    return {id: Number(s.session_id), startedAtUtc: text(row.started_at_utc), closedAtUtc: text(row.closed_at_utc), closeReason: text(row.close_reason),
      hasEvidence: SESSION_EVIDENCE_TABLES.some((n) => s.tables[n].rows.length > 0)};
  });
}
function load(opts) {
  if (!db) return fail('NO_DATABASE');
  const c = check();
  if (c.result !== 'ok') return fail('INTEGRITY_CHECK_FAILED', {detail: c.detail});          // a read error, never "zero observations"
  const schema = schemaGate();
  if (schema.status !== 'SUPPORTED') return fail('UNSUPPORTED_SCHEMA', {version: schema.version});
  let raw;
  try { raw = readRaw(); } catch (e) { return fail('READ_FAILED'); }
  try { corpus = NS.evidence.buildCorpus(raw); }
  catch (e) { corpus = null; if (e instanceof NS.PyError) return fail('SESSION_SCOPE_UNAVAILABLE'); throw e; }
  const built = buildModel(opts && opts.sessionId, opts && opts.timezone);
  if (!built.ok) return built;
  return Object.assign(built, {sessions: sessionList(), wal: {flagged: walFlag, notice: walFlag ? WAL_NOTICE : ''}, schema});
}
function model(opts) {
  if (!db || !corpus) return fail('NO_DATABASE');
  const built = buildModel(opts && opts.sessionId, opts && opts.timezone);
  return built.ok ? Object.assign(built, {sessions: sessionList()}) : built;
}

/* ---------------- Phase 2B: the event-ledger organs (MIRL, MINE, COSINE), read through the desktop's own read models ---------------- */
const ORGAN_TABLES = Object.freeze({sessions: 1, triggers: 1, sine_facts: 1, mirl_events: 1, mine_events: 1, cosine_events: 1, cosecant_events: 1, science_lab_experiments: 1, normal_break_events: 1, study_events: 1});
const TABLE_INFO_SQL = Object.freeze({sessions: 'PRAGMA table_info("sessions")', triggers: 'PRAGMA table_info("triggers")', sine_facts: 'PRAGMA table_info("sine_facts")', mirl_events: 'PRAGMA table_info("mirl_events")',
  mine_events: 'PRAGMA table_info("mine_events")', cosine_events: 'PRAGMA table_info("cosine_events")', cosecant_events: 'PRAGMA table_info("cosecant_events")', science_lab_experiments: 'PRAGMA table_info("science_lab_experiments")'});
function columnsOf(name) {
  if (!ORGAN_TABLES[name]) throw NS.ValueError('unknown ledger');
  if (!one(TABLE_KIND_SQL, [name])) return [];
  const sql = TABLE_INFO_SQL[name], out = [], st = db.prepare(sql);          // literal statements only; the name is a key into this table, never SQL text
  try { while (st.step()) out.push(String(st.get()[1])); } finally { st.free(); }
  return out;
}
function rowsOf(sql) {
  const name = (/FROM "([a-z_]+)"/.exec(sql) || [])[1];
  if (!ORGAN_TABLES[name]) throw NS.ValueError('unknown ledger');
  const kind = one(TABLE_KIND_SQL, [name]);
  if (!kind) throw new NS.PyError('OperationalError', 'no such table: ' + name);
  if (kind[0] !== 'table' || /^\s*CREATE\s+VIRTUAL/i.test(String(kind[1]))) throw new NS.PyError('OperationalError', 'NotAPlainTable');
  const rows = [], st = db.prepare(sql);
  try { st.bind([L.MAX_ROWS_PER_TABLE + 1]); while (st.step()) rows.push(toDict(st.getAsObject(null, {useBigInt: true}))); } finally { st.free(); }
  if (rows.length > L.MAX_ROWS_PER_TABLE) throw NS.ValueError('Dashboard historical read limit exceeded');
  return rows;
}
const ORGANS = Object.freeze({mirl: NS.organs.readMirl, mine: NS.organs.readMine, cosine: NS.organs.readCosine});
function gate() {
  if (!db) return fail('NO_DATABASE');
  const c = check();
  if (c.result !== 'ok') return fail('INTEGRITY_CHECK_FAILED', {detail: c.detail});
  const schema = schemaGate();
  if (schema.status !== 'SUPPORTED') return fail('UNSUPPORTED_SCHEMA', {version: schema.version});
  return {schema};
}
function receiptsOf() {
  const out = [], st = db.prepare(RECEIPTS_SQL);
  try { while (st.step()) { const r = st.get(); out.push([String(r[0]), String(r[1])]); } } finally { st.free(); }
  return out;
}
/** Chapter 3: reconstruct and certify ONE historical experiment (SCIENCE_LAB/history.reconstruct_historical_experiment), fail-closed. */
function reconstructOp(options) {
  const g = gate(); if (g.ok === false) return g;
  const id = options && options.experimentId, zone = String((options && options.timezone) || 'UTC'), meta = {wal: {flagged: walFlag, notice: walFlag ? WAL_NOTICE : ''}, schema: g.schema};
  try {
    if (!corpus) { const raw = readRaw(); corpus = NS.evidence.buildCorpus(raw); }
    // The desktop adapter reads one session with `SELECT * FROM secant_events WHERE session_id=?`, which SQLite answers through the recorder's own index
    // (session, study context, episode, monotonic time, event id); the same order is reproduced here so provenance lists come out identically.
    const byIndex = !!one(SECANT_INDEX_SQL);
    const snapshotOf = (sid) => {
      const s = corpus.find((x) => x.session_id === sid) || null, t = s && s.tables.secant_events;
      if (!s || !byIndex || !t || t.status !== 'AVAILABLE') return s;
      const rows = NS.sortedBy(t.rows, (r) => [r.study_context_id, r.episode_id, r.occurred_monotonic_ns, r.event_id]);
      return Object.assign({}, s, {tables: Object.assign({}, s.tables, {secant_events: Object.assign({}, t, {rows})})});
    };
    const data = NS.sciencelab.reconstruct({zone, rows: rowsOf, columns: columnsOf, receipts: receiptsOf}, typeof id === 'string' ? id : '', snapshotOf);
    return Object.assign({ok: true, organ: 'reconstruct', status: 'AVAILABLE', data: plain(data)}, meta);
  } catch (e) {
    if (e instanceof NS.PyError) return Object.assign({ok: true, organ: 'reconstruct', status: 'UNAVAILABLE', reason: e.kind}, meta);
    throw e;
  }
}
function lifetimeOp(kind, options) {
  const g = gate(); if (g.ok === false) return g;
  const zone = String((options && options.timezone) || 'UTC'), meta = {wal: {flagged: walFlag, notice: walFlag ? WAL_NOTICE : ''}, schema: g.schema};
  try {
    const ctx = {zone, rows: rowsOf, columns: columnsOf};
    const data = kind === 'metrichub' ? NS.metrichub.readLifetimeMetricHub(ctx) : kind === 'history' ? NS.metrichub.experimentHistory(ctx) : NS.metrichub.lifetimeSummary(ctx);
    return Object.assign({ok: true, organ: kind, status: 'AVAILABLE', data: plain(data)}, meta);
  } catch (e) {
    if (e instanceof NS.PyError) return Object.assign({ok: true, organ: kind, status: 'UNAVAILABLE', reason: e.kind}, meta);
    throw e;
  }
}
function organOp(options) {
  const g0 = gate(); if (g0.ok === false) return g0;
  const schema = g0.schema;
  const organ = options && options.organ;
  if (typeof organ !== 'string' || !Object.prototype.hasOwnProperty.call(ORGANS, organ)) return fail('UNKNOWN_ORGAN');
  const zone = String((options && options.timezone) || 'UTC');
  try {
    const data = ORGANS[organ]({zone, rows: rowsOf});
    if (!(options && options.full)) delete data.all_episode_rows;
    return {ok: true, organ, status: 'AVAILABLE', data: plain(data), wal: {flagged: walFlag, notice: walFlag ? WAL_NOTICE : ''}, schema};
  } catch (e) {
    if (e instanceof NS.PyError) return {ok: true, organ, status: 'UNAVAILABLE', reason: e.kind, wal: {flagged: walFlag, notice: walFlag ? WAL_NOTICE : ''}, schema};
    throw e;
  }
}

self.onmessage = (ev) => {
  const {id, op, buffer, options} = ev.data || {};
  let out;
  try {
    if (!SQL) out = fail('WASM_UNAVAILABLE');
    else if (op === 'open') out = open(buffer);
    else if (op === 'probe') out = probe();
    else if (op === 'check') out = check();
    else if (op === 'inventory') out = inventoryOp(options);
    else if (op === 'table') out = tableOp(options);
    else if (op === 'page') out = pageOp(options);
    else if (op === 'load') out = load(options);
    else if (op === 'model') out = model(options);
    else if (op === 'organ') out = organOp(options);
    else if (op === 'metrichub' || op === 'chapter6' || op === 'history') out = lifetimeOp(op, options);
    else if (op === 'reconstruct') out = reconstructOp(options);
    else if (op === 'close') { dropDb(); out = {ok: true}; }
    else out = fail('UNKNOWN_OPERATION');
  } catch (e) { dropDb(); out = fail('INTERNAL'); }
  postMessage(Object.assign({id}, out));
};

initSqlJs({locateFile: (f) => `../vendor/sqlite/sql.js-${LIB}/${f}`})
  .then((s) => { SQL = s; postMessage({type: 'ready', lib: LIB, limits: L}); })
  .catch(() => postMessage({type: 'fatal', code: 'WASM_UNAVAILABLE'}));
