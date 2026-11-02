// Page-side controller for the DB reader worker (Stage 2 qualification surface).
// - the file is size-checked from File.size BEFORE its bytes are read;
// - the bytes are TRANSFERRED to the worker (this thread keeps no copy);
// - every operation has a watchdog: when it expires the worker is terminated (and a fresh one is created for the next call);
// - the module has no network, storage or DOM-output code. Filenames are never sent to the worker.
const MESSAGES = Object.freeze({
  TOO_LARGE: 'The file is larger than the import limit.', EMPTY_FILE: 'The file is empty.', NOT_SQLITE: 'This is not a SQLite database file.',
  TRUNCATED: 'The file is truncated or its size is inconsistent.', MALFORMED_HEADER: 'The SQLite file header is not valid.',
  UNSUPPORTED_ENCODING: 'Unsupported database text encoding.', MALFORMED_DATABASE: 'The database structure is damaged.', OPEN_FAILED: 'The database could not be opened safely.',
  TIMEOUT: 'Reading the file took too long and was stopped.', WASM_UNAVAILABLE: 'The SQLite engine could not start in this browser.', INTERNAL: 'The reader stopped unexpectedly.',
  NO_DATABASE: 'No database is open.', UNKNOWN_OPERATION: 'Unknown reader operation.', UNKNOWN_LIBRARY: 'The reader library is not available.', INTEGRITY_CHECK_FAILED: 'The database failed its structural check and was not read.', UNSUPPORTED_SCHEMA: 'Unsupported database schema/version.', SESSION_SCOPE_UNAVAILABLE: 'The session records could not be read.', INVALID_SESSION: 'The selected session is not valid.', READ_FAILED: 'The file could not be read.',
  NO_INVENTORY: 'The table list has not been read yet.', UNKNOWN_TABLE: 'That table is not part of the current table list.', INVALID_PAGE: 'That page request is not valid.', NOT_BROWSABLE: 'The rows of this table cannot be shown in this version.'
});
const freeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v)) freeze(v[k]); } return v; };
export const describe = (code) => MESSAGES[code] || 'The file could not be used.';

export function createDbReader({workerUrl, timeoutMs} = {}) {
  const url = workerUrl || new URL('./worker.js', import.meta.url).href;
  let worker = null, ready = null, limits = null, seq = 0;
  const pending = new Map();

  function reset(code) {
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.terminate(); }
    worker = null; ready = null;
    for (const [, p] of pending) p.resolve({ok: false, code});
    pending.clear();
  }
  function spawn() {
    if (worker) return ready;
    worker = new Worker(url);
    ready = new Promise((resolve) => {
      worker.onmessage = (ev) => {
        const m = ev.data || {};
        if (m.type === 'ready') { limits = m.limits; resolve({ok: true, lib: m.lib, limits: m.limits}); return; }
        if (m.type === 'fatal') { resolve({ok: false, code: m.code || 'WASM_UNAVAILABLE'}); return; }
        const p = pending.get(m.id);
        if (p) { pending.delete(m.id); p.resolve(m); }
      };
      worker.onerror = () => { resolve({ok: false, code: 'WASM_UNAVAILABLE'}); reset('INTERNAL'); };
    });
    return ready;
  }
  async function call(op, buffer, options) {
    const r = await spawn();
    if (!r.ok) return r;
    const id = ++seq, limit = timeoutMs || (op === 'load' || op === 'model' || op === 'organ' || op === 'metrichub' || op === 'chapter6' || op === 'history' || op === 'reconstruct' ? limits.LOAD_TIMEOUT_MS : limits.OP_TIMEOUT_MS);
    return new Promise((resolve) => {
      const timer = setTimeout(() => reset('TIMEOUT'), limit);
      pending.set(id, {resolve: (m) => { clearTimeout(timer); resolve(m); }});
      worker.postMessage({id, op, buffer, options}, buffer ? [buffer] : []);
    });
  }
  return {
    ready: () => spawn(),
    async open(file) {
      const r = await spawn();
      if (!r.ok) return r;
      if (!file || typeof file.size !== 'number') return {ok: false, code: 'READ_FAILED'};
      if (file.size > limits.MAX_BYTES) return {ok: false, code: 'TOO_LARGE'};
      let buf;
      try { buf = await file.arrayBuffer(); } catch (e) { return {ok: false, code: 'READ_FAILED'}; }
      return call('open', buf);
    },
    probe: () => call('probe'),
    /** Explorer E1: every table/view/index/trigger/virtual table of the open file as metadata, exact counts where feasible, and the schema classification. Needs a passing structural check (run here once). */
    async inventory({countBudgetMs} = {}) { return freeze(await call('inventory', undefined, {countBudgetMs})); },
    /** Explorer E1: detail and exact count of ONE table of the last inventory (tables beyond the first-call detail limit, or a count retry). */
    async table(id) { return freeze(await call('table', undefined, {id})); },
    /** Explorer: one page of rows (offset/limit) of one browsable table of the last inventory, as display cells. */
    async page(id, offset, limit) { return freeze(await call('page', undefined, {id, offset, limit})); },
    check: () => call('check'),
    /** Validates the open file with the desktop's rules and returns an immutable presentation model for one session (default: latest with evidence). */
    async load({sessionId = null, timezone = 'UTC'} = {}) { return freeze(await call('load', undefined, {sessionId: sessionId === null ? null : String(sessionId), timezone})); },
    async model({sessionId = null, timezone = 'UTC'} = {}) { return freeze(await call('model', undefined, {sessionId: sessionId === null ? null : String(sessionId), timezone})); },
    /** Phase 2B: one event-ledger organ (mirl | mine | cosine) projected through the desktop's read model for the given display time zone. */
    async organ({organ, timezone = 'UTC', full = false}) { return freeze(await call('organ', undefined, {organ, timezone, full})); },
    /** Phase 2C/2D: the lifetime Metric Hub projection and the Science Lab Chapter 6 lifetime cards, through the ported desktop readers. */
    async metricHub({timezone = 'UTC'} = {}) { return freeze(await call('metrichub', undefined, {timezone})); },
    async chapter6({timezone = 'UTC'} = {}) { return freeze(await call('chapter6', undefined, {timezone})); },
    async history() { return freeze(await call('history', undefined, {})); },
    /** Chapter 3 / Chapter 5: reconstruct and certify one historical experiment from the file's durable evidence (fail-closed). */
    async reconstruct({experimentId, timezone = 'UTC'}) { return freeze(await call('reconstruct', undefined, {experimentId, timezone})); },
    close: () => call('close'),
    /** Remove file: close the database, TERMINATE the worker (the only way WebAssembly memory is returned) and drop every reference. */
    async remove() { try { if (worker) await call('close'); } catch (e) { /* the worker is terminated next either way */ } reset('REMOVED'); return {ok: true}; },
    dispose: () => reset('INTERNAL')
  };
}
