// Database Explorer: inventory, schema classification and PAGED reading of ONE open, integrity-checked SQLite database.
// Runs only inside the reader worker. Metadata comes from sqlite_master, a few table-valued PRAGMAs with the object name bound as a parameter, and COUNT(*)
// of ordinary tables. It never queries a view or a virtual table and never executes anything stored in the file. Row values leave only through readPage():
// one page of one ordinary, uniquely ordered table, as tagged display cells.
//
// SQL discipline (PRAGMA query_only is NOT relied upon -- it does not stop PRAGMA/ATTACH): every statement that can run is a frozen constant in SQL below, the
// COUNT template whose only variable part is ONE well-formed doubled-quote identifier, or a page statement built here from identifiers that came out of this
// file's own sqlite_master and were verified (BUILT). run() refuses anything else, and the test suite scans every prepare()/exec() call site in the shipped sources.
'use strict';
(function (g) {
  const NS = g.MYELIN_DB = g.MYELIN_DB || {};
  const ex = NS.explorer = NS.explorer || {};
  const L = g.MYELIN_DB_LIMITS, K = ex.known;
  const STRICT = new TextDecoder('utf-8', {fatal: true}), LENIENT = new TextDecoder('utf-8');
  const EMPTY = new Uint8Array(0);

  const SQL = Object.freeze({
    // name / tbl_name / sql are fetched as BYTES (capped) so invalid UTF-8 is detected exactly and a hostile multi-megabyte name cannot flood memory
    MASTER: 'SELECT type, CAST(substr(CAST(name AS BLOB), 1, ?) AS BLOB), length(CAST(name AS BLOB)), CAST(substr(CAST(tbl_name AS BLOB), 1, ?) AS BLOB), length(CAST(tbl_name AS BLOB)), '
      + 'typeof(sql), CAST(substr(CAST(sql AS BLOB), 1, ?) AS BLOB), length(CAST(sql AS BLOB)) FROM sqlite_master ORDER BY rowid',
    TABLE_LIST: "SELECT CAST(substr(CAST(name AS BLOB), 1, ?) AS BLOB), length(CAST(name AS BLOB)), type, ncol, wr, strict FROM pragma_table_list WHERE schema = 'main'",
    XINFO: 'SELECT cid, CAST(substr(CAST(name AS BLOB), 1, ?) AS BLOB), length(CAST(name AS BLOB)), CAST(substr(CAST(type AS BLOB), 1, 512) AS BLOB), "notnull", '
      + 'dflt_value IS NULL, CAST(substr(CAST(dflt_value AS BLOB), 1, 1024) AS BLOB), pk, hidden FROM pragma_table_xinfo(?)',
    INDEX_LIST: 'SELECT CAST(substr(CAST(name AS BLOB), 1, ?) AS BLOB), length(CAST(name AS BLOB)), "unique", origin, partial FROM pragma_index_list(?)',
    INDEX_XINFO: 'SELECT seqno, cid, CAST(substr(CAST(name AS BLOB), 1, ?) AS BLOB), name IS NULL, desc, CAST(substr(CAST(coll AS BLOB), 1, 128) AS BLOB), key FROM pragma_index_xinfo(?)',
    MODULES: 'SELECT CAST(name AS BLOB) FROM pragma_module_list',
    VERSION: "SELECT typeof(value), value FROM myelin_meta WHERE key = 'schema_version' LIMIT 2"
  });
  const ALLOWED = new Set(Object.values(SQL));
  const COUNT_PREFIX = 'SELECT COUNT(*) FROM ';
  const QUOTED = /^"(?:[^"]|"")*"$/;
  const BUILT = new Set();             // page statements built from verified identifiers for the CURRENT inventory
  const quote = (name) => '"' + name.replace(/"/g, '""') + '"';

  /** The single place a statement is prepared. Anything that is not a registry constant or a well-formed COUNT template is refused. */
  function run(db, sql, params) {
    if (!ALLOWED.has(sql) && !BUILT.has(sql) && !(typeof sql === 'string' && sql.startsWith(COUNT_PREFIX) && QUOTED.test(sql.slice(COUNT_PREFIX.length)))) throw new Error('SQL_NOT_ALLOWED');
    const st = db.prepare(sql), out = [];
    try { if (params) st.bind(params); while (st.step()) out.push(st.get(null, {useBigInt: true})); } finally { st.free(); }
    return out;
  }

  // ---- text helpers --------------------------------------------------------------------------------------------------------------------
  const hex = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; };
  const bytesOf = (v) => (v === null || v === undefined ? EMPTY : v);
  const num = (v) => (typeof v === 'bigint' ? (v >= -9007199254740991n && v <= 9007199254740991n ? Number(v) : v.toString()) : v);
  const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u206f\ufeff\ufff9-\ufffb]/g;
  /** Display-safe form of a name: control, bidi and invisible characters become visible escapes (the real name is kept in `name`). */
  const escapeText = (s) => s.replace(/\\/g, '\\\\').replace(INVISIBLE, (c) => { const n = c.codePointAt(0); return n < 256 ? '\\x' + n.toString(16).padStart(2, '0') : '\\u' + n.toString(16).padStart(4, '0'); });
  const INVISIBLE_CELL = /[\u0000-\u0008\u000b-\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u2064\u2066-\u206f\ufeff\ufff9-\ufffb]/g;
  const escapeCell = (s) => s.replace(INVISIBLE_CELL, (c) => { const n = c.codePointAt(0); return n < 256 ? '\\x' + n.toString(16).padStart(2, '0') : '\\u' + n.toString(16).padStart(4, '0'); });
  const escapeBytes = (u8) => { let s = ''; for (const b of u8) s += b === 92 ? '\\\\' : (b >= 32 && b < 127) ? String.fromCharCode(b) : '\\x' + b.toString(16).padStart(2, '0'); return s; };
  /** Decode a capped name. valid = exact UTF-8, not truncated, no NUL, within the character limit. */
  function decodeName(u8, byteLen) {
    const n = Number(byteLen), truncated = n > L.NAME_MAX_BYTES;
    const cut = truncated ? u8.subarray(0, L.NAME_MAX_BYTES) : u8;
    let text = null, strictOk = false;
    if (!truncated) { try { text = STRICT.decode(cut); strictOk = new TextEncoder().encode(text).length === cut.length; } catch (e) { text = null; } }
    const display = strictOk ? escapeText(text) : escapeBytes(cut);
    const nulFree = strictOk && !text.includes('\u0000');
    const reasons = [];
    if (truncated) reasons.push('NAME_TOO_LONG');
    else if (!strictOk) reasons.push('NAME_NOT_VALID_UTF8');
    else if (!nulFree) reasons.push('NAME_CONTAINS_NUL');
    else if (text.length > L.NAME_MAX_CHARS) reasons.push('NAME_TOO_LONG');
    return {text: strictOk ? text : LENIENT.decode(cut), exact: strictOk, escaped: display + (truncated ? '\u2026' : ''), bytes: n, hex: (!strictOk || truncated) ? hex(cut.subarray(0, 128)) : undefined, reasons, addressable: reasons.length === 0};
  }
  function textOf(u8, byteLen, isNull) {
    if (isNull) return null;
    const total = Number(byteLen), truncated = total > u8.length;
    let text, lossy = false;
    try { text = STRICT.decode(u8); } catch (e) { text = LENIENT.decode(u8); lossy = true; }
    return {text, truncated, bytes: total, lossy};
  }
  const lowerKey = (s) => s.toLowerCase();

  // ---- ordering contract: rows are paged only in an order SQLite guarantees (a unique key) -------------------------------------------------------
  function orderingContract(rec) {
    const names = new Set(rec.columns.map((c) => c.name.toLowerCase()));
    if (rec.withoutRowid) {
      const pk = rec.columns.filter((c) => c.primaryKeyPosition > 0).sort((a, b) => a.primaryKeyPosition - b.primaryKeyPosition).map((c) => c.name);
      return {mode: 'WITHOUT_ROWID_KEY', keyColumns: pk, guarantee: 'TOTAL', limitations: []};
    }
    const alias = ['rowid', '_rowid_', 'oid'].find((a) => !names.has(a));
    if (alias) return {mode: 'ROWID', alias, guarantee: 'TOTAL', limitations: ['ROWID_IS_LOCAL_TO_THIS_FILE']};
    const ipk = rec.columns.find((c) => c.primaryKeyPosition === 1 && /^integer$/i.test(c.declaredType) && rec.columns.filter((x) => x.primaryKeyPosition > 0).length === 1);
    if (ipk) return {mode: 'ROWID', alias: ipk.name, aliasIsColumn: true, guarantee: 'TOTAL', limitations: ['ROWID_IS_LOCAL_TO_THIS_FILE']};
    // Every rowid alias is shadowed by a column and no primary key orders the rows: there is no unique key. V1 shows such a table's structure and exact count but
    // not its rows (ordering by value alone is not reproducible when values compare equal but differ -- measured in E1 -- so no page order can be promised).
    return {mode: 'VALUE_ORDER_ONLY', guarantee: 'NONE', limitations: ['NO_UNIQUE_ROW_KEY']};
  }

  // ---- page statement: built only from identifiers that came out of this file and were verified; registered in BUILT so run() accepts exactly this text ----
  const CELL_CAP = () => L.CELL_MAX_BYTES, BLOB_PREVIEW = 32;
  function browseInfo(reg) {
    const rec = reg.rec, shown = rec.columns.filter((c) => c.hidden !== 1);
    reg.pageSql = null;
    if (rec.ordering.mode === 'VALUE_ORDER_ONLY') return {status: 'NOT_BROWSABLE', reason: 'NO_UNIQUE_ROW_KEY'};
    if (shown.length * 3 > 2000) return {status: 'NOT_BROWSABLE', reason: 'TOO_MANY_COLUMNS'};          // SQLite returns at most 2000 columns per statement
    const sel = shown.map((c) => { const q = quote(c.name); return `typeof(${q}), CASE typeof(${q}) WHEN 'text' THEN substr(CAST(${q} AS BLOB), 1, ${CELL_CAP()}) WHEN 'blob' THEN substr(${q}, 1, ${BLOB_PREVIEW}) ELSE ${q} END, CASE WHEN typeof(${q}) IN ('text','blob') THEN length(CAST(${q} AS BLOB)) END`; }).join(', ');
    const o = rec.ordering, order = o.mode === 'ROWID' ? (o.aliasIsColumn ? quote(o.alias) : o.alias) : o.keyColumns.map(quote).join(', ');
    reg.pageSql = `SELECT ${sel} FROM ${quote(reg.name)} ORDER BY ${order} LIMIT ? OFFSET ?`;
    BUILT.add(reg.pageSql);
    return {status: 'BROWSABLE', reason: null};
  }

  // ---- per-table detail -----------------------------------------------------------------------------------------------------------------------
  function sessionCandidates(rec) {
    const known = rec.myelin.expectedInSchema9 ? (K.sessionColumns[lowerKey(rec.name)] || []) : [];
    const out = [];
    for (const c of rec.columns) {
      if (known.includes(c.name)) out.push({name: c.name, basis: 'KNOWN_MYELIN_COLUMN'});
      else if (/^session_id$|_session_id$/i.test(c.name)) out.push({name: c.name, basis: 'NAME_HINT'});
    }
    return out;
  }
  function loadDetail(db, reg) {
    const rec = reg.rec;
    rec.columns = null; rec.primaryKey = []; rec.sessionColumnCandidates = []; rec.ordering = null; rec.indexes = []; rec.detail = 'LOADED'; rec.browse = {status: 'NOT_BROWSABLE', reason: 'TABLE_NOT_READABLE'}; reg.pageSql = null;
    if (!reg.addressable) { rec.access = {status: 'RESTRICTED', reason: reg.nameReasons[0] || 'NAME_NOT_ADDRESSABLE'}; return; }
    try {
      const rawCols = run(db, SQL.XINFO, [L.NAME_MAX_BYTES + 1, reg.name]);
      if (rawCols.length === 0) { rec.access = {status: 'RESTRICTED', reason: 'NAME_LOOKUP_FAILED'}; return; }   // every real table has a column: an empty answer means the name did not resolve
      const cols = rawCols.map((r) => {
        const n = decodeName(bytesOf(r[1]), r[2]), hidden = Number(r[8]);
        const c = {cid: Number(r[0]), name: n.text, nameEscaped: n.escaped, declaredType: textOf(bytesOf(r[3]), bytesOf(r[3]).length, false).text, notNull: Number(r[4]) === 1,
          defaultValue: r[5] === 1n ? null : textOf(bytesOf(r[6]), bytesOf(r[6]).length, false).text, primaryKeyPosition: Number(r[7]), hidden,
          generated: hidden === 2 ? 'VIRTUAL' : hidden === 3 ? 'STORED' : null, addressable: n.addressable};
        if (n.hex) c.nameHex = n.hex;
        return c;
      });
      rec.columns = cols;
      rec.primaryKey = cols.filter((c) => c.primaryKeyPosition > 0).sort((a, b) => a.primaryKeyPosition - b.primaryKeyPosition).map((c) => c.name);
      rec.sessionColumnCandidates = sessionCandidates(rec);
      // indexes of this table (object names bound as parameters; no identifier is ever concatenated)
      for (const ir of run(db, SQL.INDEX_LIST, [L.NAME_MAX_BYTES + 1, reg.name])) {
        const n = decodeName(bytesOf(ir[0]), ir[1]);
        const idx = {name: n.text, nameEscaped: n.escaped, unique: ir[2] === 1n, origin: String(ir[3]), partial: ir[4] === 1n, columns: null};
        if (n.addressable) idx.columns = run(db, SQL.INDEX_XINFO, [L.NAME_MAX_BYTES + 1, n.text]).map((c) => ({seqno: Number(c[0]), cid: Number(c[1]), name: c[3] === 1n ? null : decodeName(bytesOf(c[2]), bytesOf(c[2]).length).text, expression: c[3] === 1n && Number(c[1]) === -2, descending: c[4] === 1n, collation: textOf(bytesOf(c[5]), bytesOf(c[5]).length, false).text, key: c[6] === 1n}));
        rec.indexes.push(idx);
      }
      if (cols.some((c) => !c.addressable)) { rec.access = {status: 'RESTRICTED', reason: 'COLUMN_NAME_NOT_ADDRESSABLE'}; rec.ordering = null; return; }
      rec.ordering = orderingContract(rec);
      rec.access = {status: 'READABLE', reason: null};
      rec.browse = browseInfo(reg);
    } catch (e) {
      rec.access = {status: 'RESTRICTED', reason: 'INSPECT_FAILED'}; rec.error = String(e && e.message || e).slice(0, 120);
    }
  }
  /** Exact COUNT(*) for one readable table, or an explicit reason it is unavailable. An empty table is {status:'EXACT', value:0}; unavailable never has a value. */
  function countFor(db, reg) {
    const rec = reg.rec;
    if (rec.access.status !== 'READABLE') return {status: 'UNAVAILABLE', reason: 'TABLE_NOT_READABLE'};
    try {
      const v = run(db, COUNT_PREFIX + quote(reg.name))[0][0];
      return {status: 'EXACT', value: num(v)};
    } catch (e) { return {status: 'UNAVAILABLE', reason: 'COUNT_FAILED', message: String(e && e.message || e).slice(0, 120)}; }
  }

  // ---- schema classification ------------------------------------------------------------------------------------------------------------------
  function classify(db, byLower, metaIsNotATable) {
    const meta = byLower.get('myelin_meta');
    const ordinary = [...byLower.values()].filter((r) => r.rec.kind !== 'system');
    const present = (list) => list.filter((n) => byLower.has(n));
    const distinctive = present(K.distinctiveTables), generic = present(K.genericTables);
    const out = {state: null, reasons: [], version: null, myelinTablesPresent: present(K.schema9Tables), missingSchema9Tables: K.schema9Tables.filter((n) => !byLower.has(n)),
      unrecognisedTables: ordinary.filter((r) => !K.schema9Tables.includes(r.rec.name.toLowerCase())).length};
    const heuristic = () => { // no usable myelin_meta: decide from MYELIN-specific table names
      if (distinctive.length >= 2 || (distinctive.length === 1 && generic.length >= 1)) { out.state = 'LEGACY_UNVERSIONED'; out.reasons.push('MYELIN_TABLES_WITHOUT_VERSION'); }
      else { out.state = 'NOT_MYELIN'; out.reasons.push('NO_MYELIN_SIGNATURE'); if (distinctive.length || generic.length) out.reasons.push('WEAK_NAME_OVERLAP_ONLY'); }
    };
    if (!meta) { if (metaIsNotATable) out.reasons.push('MYELIN_META_NOT_AN_ORDINARY_TABLE'); heuristic(); return out; }
    if (meta.rec.detail !== 'LOADED') loadDetail(db, meta);
    const cols = meta.rec.columns ? meta.rec.columns.map((c) => c.name) : [];
    if (meta.rec.access.status !== 'READABLE' || !cols.includes('key') || !cols.includes('value')) { out.state = 'LEGACY_UNVERSIONED'; out.reasons.push('MYELIN_META_UNREADABLE_OR_WITHOUT_KEY_VALUE'); return out; }
    let rows;
    try { rows = run(db, SQL.VERSION); } catch (e) { out.state = 'LEGACY_UNVERSIONED'; out.reasons.push('VERSION_QUERY_FAILED'); return out; }
    if (rows.length === 0) { out.state = 'LEGACY_UNVERSIONED'; out.reasons.push('NO_VERSION_ROW'); out.version = {present: false}; return out; }
    if (rows.length > 1) { out.state = 'UNSUPPORTED_VERSION'; out.reasons.push('AMBIGUOUS_VERSION'); out.version = {present: true, rows: rows.length}; return out; }
    const sqlType = rows[0][0], value = rows[0][1];
    // identical to the validated reader's gate (worker.js schemaGate): the stored value, rendered as text, must equal '9'
    const rendered = (value === null || value === undefined) ? '' : (typeof value === 'bigint' || typeof value === 'number') ? String(value) : String(value instanceof Uint8Array ? LENIENT.decode(value) : value);
    out.version = {present: true, rows: 1, storedAs: sqlType, text: rendered.slice(0, 32), truncated: rendered.length > 32};
    if (rendered === K.supportedSchemaVersion) { out.state = 'SUPPORTED_9'; out.reasons.push('VERSION_EQUALS_9'); }
    else { out.state = 'UNSUPPORTED_VERSION'; out.reasons.push('VERSION_NOT_9'); }
    return out;
  }

  // ---- inventory ------------------------------------------------------------------------------------------------------------------------------
  const VTAB_SQL = /^\s*CREATE\s+VIRTUAL\s+TABLE\b/i;
  const ID = '(?:"(?:[^"]|"")*"|\\[[^\\]]*\\]|`[^`]*`|\'[^\']*\'|[A-Za-z_\\u0080-\\uffff][\\w$\\u0080-\\uffff]*)';
  const VTAB_MODULE = new RegExp('^\\s*CREATE\\s+VIRTUAL\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:' + ID + '\\s*\\.\\s*)?' + ID + '\\s+USING\\s+(' + ID + ')', 'i');
  function moduleOf(sqlText) {
    const m = VTAB_MODULE.exec(sqlText || ''); if (!m) return null;
    let s = m[1];
    if (s[0] === '"') s = s.slice(1, -1).replace(/""/g, '"'); else if ('[`\''.includes(s[0])) s = s.slice(1, -1);
    return s;
  }

  /** @returns {{inventory: object, registry: Map<number, object>}} */
  function buildInventory(db, ctx) {
    const t0 = performance.now(), registry = new Map(), warnings = [];
    BUILT.clear();
    const master = run(db, SQL.MASTER, [L.NAME_MAX_BYTES + 1, L.NAME_MAX_BYTES + 1, L.SQL_TEXT_LIMIT]);
    const modules = new Set(run(db, SQL.MODULES).map((r) => LENIENT.decode(bytesOf(r[0])).toLowerCase()));
    const tl = new Map();
    let tableListError = null;
    try { for (const r of run(db, SQL.TABLE_LIST, [L.NAME_MAX_BYTES + 1])) tl.set(hex(bytesOf(r[0])) + ':' + r[1], {type: r[2], ncol: Number(r[3]), wr: Number(r[4]) === 1, strict: Number(r[5]) === 1}); }
    catch (e) { tableListError = String(e && e.message || e).slice(0, 120); warnings.push('TABLE_LIST_UNAVAILABLE'); }

    const out = {tables: [], virtualTables: [], views: [], triggers: [], indexes: [], otherObjects: []};
    const counts = {master: master.length};
    let listed = 0, truncatedList = false;
    const byLower = new Map(), regsInOrder = [];
    master.forEach((row, order) => {
      if (listed >= L.INVENTORY_LIST_LIMIT) { truncatedList = true; return; }
      listed++;
      const type = String(row[0]), nm = decodeName(bytesOf(row[1]), row[2]);
      const sql = textOf(bytesOf(row[6]), row[7], row[5] === 'null');
      const tbl = decodeName(bytesOf(row[3]), row[4]);
      const base = {order, name: nm.text, nameEscaped: nm.escaped, nameBytes: nm.bytes, sql};
      if (nm.hex) base.nameHex = nm.hex;
      if (!nm.exact) base.nameValidUtf8 = false;
      if (type === 'table') {
        if (sql && VTAB_SQL.test(sql.text)) {
          const mod = moduleOf(sql.text);
          out.virtualTables.push(Object.assign(base, {kind: 'virtual', module: mod, moduleAvailable: mod === null ? null : modules.has(mod.toLowerCase()),
            access: {status: 'METADATA_ONLY', reason: mod !== null && !modules.has(mod.toLowerCase()) ? 'VIRTUAL_TABLE_MODULE_UNAVAILABLE' : 'VIRTUAL_TABLE_NOT_READ'},
            count: {status: 'UNAVAILABLE', reason: 'METADATA_ONLY'}}));
          const info = tl.get(hex(bytesOf(row[1]).subarray(0, L.NAME_MAX_BYTES + 1)) + ':' + row[2]);
          if (info && info.type !== 'virtual') warnings.push('KIND_DISAGREES:' + nm.escaped.slice(0, 60));
          return;
        }
        const info = tl.get(hex(bytesOf(row[1]).subarray(0, L.NAME_MAX_BYTES + 1)) + ':' + row[2]) || {};
        const lower = lowerKey(nm.text);
        const rec = Object.assign(base, {id: registry.size, kind: /^sqlite_/i.test(nm.text) ? 'system' : info.type === 'shadow' ? 'shadow' : 'table',
          myelin: {expectedInSchema9: K.schema9Tables.includes(lower)}, withoutRowid: info.wr === undefined ? null : info.wr, strict: info.strict === undefined ? null : info.strict,
          declaredColumnCount: info.ncol === undefined ? null : info.ncol, access: {status: 'PENDING', reason: null}, detail: 'NOT_LOADED', columns: null, primaryKey: [], sessionColumnCandidates: [],
          ordering: null, indexes: [], browse: {status: 'PENDING', reason: 'DETAIL_NOT_LOADED_YET'}, count: {status: 'UNAVAILABLE', reason: 'NOT_COUNTED_YET'}});
        if (tableListError) rec.withoutRowid = null;
        if (info.type && info.type !== 'table' && info.type !== 'shadow' && info.type !== 'virtual') warnings.push('TABLE_LIST_KIND:' + String(info.type).slice(0, 20));
        const reg = {rec, name: nm.text, addressable: nm.addressable, nameReasons: nm.reasons};
        registry.set(rec.id, reg); regsInOrder.push(reg); out.tables.push(rec);
        if (nm.exact && !byLower.has(lower)) byLower.set(lower, reg);
      } else if (type === 'view') out.views.push(Object.assign(base, {kind: 'view', table: tbl.text, access: {status: 'METADATA_ONLY', reason: 'VIEW_NOT_QUERIED'}, count: {status: 'UNAVAILABLE', reason: 'METADATA_ONLY'}}));
      else if (type === 'trigger') out.triggers.push(Object.assign(base, {kind: 'trigger', table: tbl.text, tableEscaped: tbl.escaped, access: {status: 'METADATA_ONLY', reason: 'TRIGGER_NEVER_EXECUTED'}}));
      else if (type === 'index') out.indexes.push(Object.assign(base, {kind: 'index', table: tbl.text, tableEscaped: tbl.escaped, automatic: sql === null, access: {status: 'METADATA_ONLY', reason: 'INDEX_NOT_READ'}}));
      else out.otherObjects.push(Object.assign(base, {kind: 'unknown', sqliteType: type.slice(0, 20)}));
    });
    if (truncatedList) warnings.push('LIST_TRUNCATED');

    // detail for the first INVENTORY_DETAIL_LIMIT tables; counts afterwards under a time budget
    let detailed = 0;
    for (const reg of regsInOrder) {
      if (detailed >= L.INVENTORY_DETAIL_LIMIT) break;
      loadDetail(db, reg); detailed++;
    }
    const notLoaded = regsInOrder.length - detailed;
    for (const reg of regsInOrder) if (reg.rec.detail !== 'LOADED') { reg.rec.access = {status: 'PENDING', reason: 'DETAIL_NOT_LOADED_YET'}; reg.rec.count = {status: 'UNAVAILABLE', reason: 'DETAIL_NOT_LOADED_YET'}; }
    const cStart = performance.now();
    for (const reg of regsInOrder) {
      if (reg.rec.detail !== 'LOADED') continue;
      if (reg.rec.access.status !== 'READABLE') { reg.rec.count = {status: 'UNAVAILABLE', reason: 'TABLE_NOT_READABLE'}; continue; }
      if (performance.now() - cStart >= ctx.countBudgetMs) { reg.rec.count = {status: 'UNAVAILABLE', reason: 'TIME_BUDGET'}; continue; }
      reg.rec.count = countFor(db, reg);
    }
    const metaIsNotATable = [...out.virtualTables, ...out.views].some((o) => lowerKey(o.name) === 'myelin_meta');
    const schema = classify(db, byLower, metaIsNotATable);
    // the validated adapter's tables, for the capability report (presence only; says nothing about the records)
    const adapterPresent = K.secantAdapterTables.filter((n) => byLower.has(n)), adapterMissing = K.secantAdapterTables.filter((n) => !byLower.has(n));
    const inventory = {
      ok: true, file: Object.assign({pageSize: ctx.header.pageSize, pageCount: ctx.header.pageCount, walFlagged: !!ctx.header.walFlag, encoding: 'UTF-8'}),
      integrity: 'ok', schema,
      capabilities: {
        rawExplorer: {available: true, scope: 'READABLE_ORDINARY_TABLES', note: 'Raw browsing needs a structurally valid file; it does not depend on the schema version and it is not validation.'},
        validatedAdapters: {secant: {eligible: schema.state === 'SUPPORTED_9', basis: 'SCHEMA_VERSION_GATE_ONLY', tablesPresent: adapterPresent, tablesMissing: adapterMissing,
          note: 'Eligibility only permits ATTEMPTING validation; it says nothing about whether any record is valid evidence.'}}
      },
      tables: out.tables, virtualTables: out.virtualTables, views: out.views, triggers: out.triggers, indexes: out.indexes, otherObjects: out.otherObjects,
      modules: [...modules].sort(),
      summary: {
        schemaObjectsInFile: master.length, listed, listTruncated: truncatedList,
        tables: out.tables.length, readable: out.tables.filter((t) => t.access.status === 'READABLE').length, restricted: out.tables.filter((t) => t.access.status === 'RESTRICTED').length,
        detailNotLoaded: notLoaded, virtualTables: out.virtualTables.length, views: out.views.length, triggers: out.triggers.length, indexes: out.indexes.length,
        countsExact: out.tables.filter((t) => t.count.status === 'EXACT').length, countsUnavailable: out.tables.filter((t) => t.count.status !== 'EXACT').length
      },
      warnings, tableListError, elapsedMs: Math.round((performance.now() - t0) * 10) / 10
    };
    return {inventory, registry};
  }

  /** Detail (columns, indexes, ordering contract, exact count) for ONE table of the last inventory -- used for tables beyond the first-call detail limit and to retry a count. */
  function describeTable(db, reg, ctx) {
    loadDetail(db, reg);
    reg.rec.count = countFor(db, reg);
    return reg.rec;
  }

  // ---- one page of rows as display cells (NULL decided by typeof() only; text decoded strictly; nothing converted or interpreted) -------------------------
  function cellOf(tp, v, len) {
    if (tp === 'null') return {t: 'null'};
    if (tp === 'integer') return {t: 'int', v: String(v)};
    if (tp === 'real') return {t: 'real', v: Object.is(v, -0) ? '-0' : String(v)};
    const bytes = bytesOf(v), n = Number(len);
    if (tp === 'blob') return {t: 'blob', n, hex: hex(bytes)};
    const trunc = n > bytes.length;
    for (let trim = 0; trim < (trunc ? 4 : 1); trim++) {       // a multibyte character split by the byte cap is retried one byte shorter
      try { return {t: 'text', d: escapeCell(STRICT.decode(trim ? bytes.subarray(0, bytes.length - trim) : bytes)), n, trunc}; } catch (e) { /* retry */ }
    }
    return {t: 'text', d: escapeBytes(bytes.subarray(0, 256)), n, trunc, invalid: true};      // not valid UTF-8: shown as escaped bytes, never guessed
  }
  function readPage(db, reg, offset, limit) {
    const rec = reg.rec;
    if (!reg.pageSql) return {ok: false, code: 'NOT_BROWSABLE', reason: rec.browse ? rec.browse.reason : 'DETAIL_NOT_LOADED_YET'};
    const shown = rec.columns.filter((c) => c.hidden !== 1), rows = run(db, reg.pageSql, [limit, offset]);
    return {ok: true, offset, limit, ordering: rec.ordering.mode, count: rec.count,
      columns: shown.map((c) => ({name: c.name, nameEscaped: c.nameEscaped, declaredType: c.declaredType, primaryKeyPosition: c.primaryKeyPosition, generated: c.generated})),
      rows: rows.map((r) => shown.map((_, i) => cellOf(r[3 * i], r[3 * i + 1], r[3 * i + 2])))};
  }

  ex.inventory = Object.freeze({buildInventory, describeTable, readPage});
  ex._internal = Object.freeze({SQL, run, quote, decodeName, escapeText, moduleOf, orderingContract, QUOTED});    // exposed for the unit tests only
})(self);
