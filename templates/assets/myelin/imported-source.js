// MYELIN Web: THE one owner of an imported database file.
// Owns the reader worker, the inventory, the session list and the selected session, the display time zone, and the per-dashboard evidence models derived from the
// file. The Database Explorer, the data-source bar and every connected dashboard talk to this module; nothing else opens a database. Everything is held in memory
// only: Remove File terminates the worker and drops every reference. Nothing is uploaded, stored or synchronised.
//
// Dashboards declare themselves in CONNECTED. A page that is not listed is, by definition, still driven by the browser simulation and is labelled as such.
import {organReason} from './organ-import.js';
const CONNECTED = Object.freeze({
  secant: Object.freeze({organ: 'secant', scope: 'SESSION', title: 'SECANT dashboard'}),
  'live-mirl': Object.freeze({organ: 'mirl', scope: 'LIFETIME', title: 'Live MIRL dashboard', ledger: true}),
  mine: Object.freeze({organ: 'mine', scope: 'LIFETIME', title: 'MINE dashboard', ledger: true}),
  cosine: Object.freeze({organ: 'cosine', scope: 'LIFETIME', title: 'COSINE dashboard', ledger: true}),
  'metric-hub': Object.freeze({organ: 'metrichub', scope: 'LIFETIME', title: 'Metric Hub', ledger: true}),
  'science-lab': Object.freeze({organ: 'sciencelab', scope: 'LIFETIME', title: 'Science Lab', ledger: true})
});
export const LIFETIME_LABEL = 'LIFETIME — ALL SESSIONS IN IMPORTED FILE';

const FATAL = new Set(['TIMEOUT', 'INTERNAL', 'NO_DATABASE', 'WASM_UNAVAILABLE']);
const SCHEMA_REASON = {
  UNSUPPORTED_VERSION: (inv) => 'This file records schema version "' + (inv.schema.version && inv.schema.version.text !== undefined ? inv.schema.version.text : 'unknown') + '". This site interprets version 9 only.',
  LEGACY_UNVERSIONED: () => 'This is an older MYELIN database without a recorded schema version, which this site does not interpret.',
  NOT_MYELIN: () => 'This SQLite file does not look like a MYELIN database.'
};

/** @param {{getZone: () => string}} opts  getZone returns the IANA time zone the interface currently displays. */
export function createImportedSource({getZone}) {
  let phase = 'NONE', reader = null, file = null, inventory = null, describeCode = null, serial = 0, lastError = '';
  let sessions = null, loadFailure = null, loading = false, explicit = null;
  const cache = new Map();
  const listeners = new Set();
  const emit = () => { for (const fn of [...listeners]) { try { fn(); } catch (e) { /* a subscriber must not break the source */ } } };

  const instant = (iso) => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? t : null; };
  /** Chronological by recorded start time; sessions whose start time is not a valid timestamp are listed first, unordered, and are never the default. */
  function sortSessions(list) {
    return list.slice().sort((a, b) => {
      const x = instant(a.startedAtUtc), y = instant(b.startedAtUtc);
      if (x === null && y === null) return a.id - b.id;
      if (x === null) return -1;
      if (y === null) return 1;
      return x - y || a.id - b.id;
    });
  }
  function selectedSessionId() {
    if (!sessions || !sessions.length) return null;
    if (explicit !== null && sessions.some((s) => s.id === explicit)) return explicit;
    const dated = sessions.filter((s) => instant(s.startedAtUtc) !== null);
    return (dated.length ? dated[dated.length - 1] : sessions[sessions.length - 1]).id;     // the latest chronological session
  }

  async function dropReader() { const r = reader; reader = null; if (r) { try { await r.remove(); } catch (e) { /* the worker is terminated either way */ } } }
  function resetState() { phase = 'NONE'; file = null; inventory = null; sessions = null; loadFailure = null; loading = false; explicit = null; cache.clear(); }
  async function fatal(code) {
    lastError = (describeCode && describeCode(code)) || 'The database reader stopped. The file was removed.';
    serial++; await dropReader(); resetState(); emit();
  }

  /** Open a local file. Resolves {ok:true} or {ok:false, message}. The file name is shown to the user only; it is never sent to the worker. */
  async function open(f) {
    serial++; await dropReader(); resetState(); lastError = '';
    const mine = serial;
    phase = 'OPENING'; file = {name: f.name, size: f.size}; emit();
    const refuse = async (message) => { if (mine === serial) { await dropReader(); resetState(); emit(); } return {ok: false, message}; };
    if (/\.myl$/i.test(f.name)) return refuse('This is a .myl file (a SenseHub recording container), not a MYELIN .db database. The two formats are different and are not combined.');
    let mod;
    try { mod = await import('./db-import/client.js'); } catch (e) { return refuse('The SQLite reader could not be loaded in this browser.'); }
    describeCode = mod.describe;
    const r = mod.createDbReader();
    reader = r;
    const opened = await r.open(f);
    if (mine !== serial) return {ok: false, superseded: true};
    if (!opened.ok) return refuse(mod.describe(opened.code));
    const inv = await r.inventory({});
    if (mine !== serial) return {ok: false, superseded: true};
    if (!inv.ok) return refuse(mod.describe(inv.code) + (inv.code === 'INTEGRITY_CHECK_FAILED' ? ' No records are shown from a file that fails its structural check.' : ''));
    inventory = inv; phase = 'READY';
    emit();
    return {ok: true};
  }
  async function remove() { serial++; await dropReader(); resetState(); lastError = ''; emit(); }

  // ---- dashboard evidence ------------------------------------------------------------------------------------------------------------------
  function statusFromFailure(res) {
    if (res.code === 'UNSUPPORTED_SCHEMA') return {status: 'UNSUPPORTED', reason: 'Schema version "' + (res.version === null || res.version === undefined ? 'unknown' : res.version) + '" is not supported. This site interprets version 9 only.'};
    if (res.code === 'SESSION_SCOPE_UNAVAILABLE') return {status: 'UNAVAILABLE', reason: 'The session records of this file could not be read, so no session can be selected.'};
    if (res.code === 'INVALID_SESSION') return {status: 'UNAVAILABLE', reason: 'The selected session is not valid.'};
    return {status: 'UNAVAILABLE', reason: (describeCode && describeCode(res.code)) || 'The file could not be interpreted.'};
  }
  function accept(res, sid, zone) {
    if (!res.ok) { if (FATAL.has(res.code)) { fatal(res.code); return null; } return statusFromFailure(res); }
    if (res.error) return {status: 'UNAVAILABLE', reason: 'This session could not be interpreted under the desktop validation rules, so no values are shown for it.'};
    return {status: 'AVAILABLE', model: res.model, sessionId: sid, zone};
  }
  async function loadSessions(zone) {
    if (loading) return;
    loading = true;
    const mine = serial, r = reader;
    const res = await r.load({sessionId: null, timezone: zone});
    if (mine !== serial) return;
    loading = false;
    if (!res.ok) {
      if (FATAL.has(res.code)) { fatal(res.code); return; }
      loadFailure = statusFromFailure(res); emit(); return;
    }
    sessions = sortSessions(res.sessions || []);
    const sid = selectedSessionId();
    // the model the worker returned is for ITS default session; it is reused only when that is the session we selected
    if (res.selectedSessionId === sid) { const first = accept(res, sid, zone); if (first) cache.set('secant|' + sid + '|' + zone, first); }
    emit();
  }
  async function loadModel(name, sid, zone, key) {
    const mine = serial, r = reader;
    cache.set(key, {status: 'LOADING'});
    const res = await r.model({sessionId: sid === null ? null : String(sid), timezone: zone});
    if (mine !== serial) return;
    const out = accept(res, sid, zone);
    if (out) { cache.set(key, out); emit(); }
  }

  async function loadLedger(spec, zone, key) {
    const mine = serial, r = reader;
    cache.set(key, {status: 'LOADING'});
    if (spec.organ === 'sciencelab') {          // Chapter 6 lifetime cards + the Chapter 5 experiment listing; each can fail on its own
      const [c6, hist] = await Promise.all([r.chapter6({timezone: zone}), r.history()]);
      if (mine !== serial) return;
      const bad = [c6, hist].find((x) => !x.ok);
      let o2;
      if (bad) { if (FATAL.has(bad.code)) { fatal(bad.code); return; } o2 = statusFromFailure(bad); }
      else o2 = {status: 'AVAILABLE', zone, data: {chapter6: c6.status === 'AVAILABLE' ? c6.data : null, chapter6Reason: c6.status === 'AVAILABLE' ? null : organReason('Chapter 6 lifetime evidence', null, c6.reason),
        history: hist.status === 'AVAILABLE' ? hist.data : null, historyReason: hist.status === 'AVAILABLE' ? null : organReason('Experiment history', null, hist.reason)}};
      cache.set(key, o2); emit(); return;
    }
    const res = spec.organ === 'metrichub' ? await r.metricHub({timezone: zone}) : await r.organ({organ: spec.organ, timezone: zone});
    if (mine !== serial) return;
    let out;
    if (!res.ok) { if (FATAL.has(res.code)) { fatal(res.code); return; } out = statusFromFailure(res); }
    else if (res.status === 'UNAVAILABLE') out = {status: 'UNAVAILABLE', reason: organReason(spec.title, null, res.reason)};
    else if (res.data.available === false && spec.organ !== 'mirl') out = {status: 'UNAVAILABLE', reason: organReason(spec.title, res.data)};
    else out = {status: 'AVAILABLE', data: res.data, zone};
    cache.set(key, out); emit();
  }

  /** The state of one dashboard's imported evidence: NONE | NOT_CONNECTED | LOADING | AVAILABLE | UNSUPPORTED | UNAVAILABLE. Never a simulator value. */
  function organ(name) {
    if (phase !== 'READY') return {status: 'NONE'};
    const spec = CONNECTED[name];
    if (!spec) return {status: 'NOT_CONNECTED'};
    const state = inventory.schema.state;
    if (state !== 'SUPPORTED_9') return {status: 'UNSUPPORTED', reason: (SCHEMA_REASON[state] || (() => 'This file is not in a supported format.'))(inventory)};
    const zone = getZone();
    if (spec.ledger) {                        // MIRL / MINE / COSINE: lifetime ledgers read through their own read models; no session list is involved
      const lkey = name + '|LIFETIME|' + zone, lhit = cache.get(lkey);
      if (lhit) return lhit;
      loadLedger(spec, zone, lkey);
      return {status: 'LOADING'};
    }
    if (loadFailure) return loadFailure;
    if (sessions === null) { loadSessions(zone); return {status: 'LOADING'}; }
    const sid = selectedSessionId(), key = name + '|' + sid + '|' + zone;
    const hit = cache.get(key);
    if (hit) return hit;
    loadModel(name, sid, zone, key);
    return {status: 'LOADING'};
  }
  /** The certified Chapter 3 reconstruction of one recorded experiment (desktop history.reconstruct_historical_experiment): NONE | LOADING | AVAILABLE {data: {status, package, reason}} | UNAVAILABLE | UNSUPPORTED. */
  function reconstruction(experimentId) {
    if (phase !== 'READY') return {status: 'NONE'};
    if (inventory.schema.state !== 'SUPPORTED_9') return {status: 'UNSUPPORTED', reason: 'This file is not in the supported format.'};
    const zone = getZone(), key = 'recon|' + experimentId + '|' + zone, hit = cache.get(key);
    if (hit) return hit;
    const mine = serial, r = reader;
    cache.set(key, {status: 'LOADING'});
    r.reconstruct({experimentId, timezone: zone}).then((res) => {
      if (mine !== serial) return;
      let out;
      if (!res.ok) { if (FATAL.has(res.code)) { fatal(res.code); return; } out = statusFromFailure(res); }
      else out = res.status === 'AVAILABLE' ? {status: 'AVAILABLE', data: res.data, zone} : {status: 'UNAVAILABLE', reason: res.reason || 'The reconstruction could not be completed.'};
      cache.set(key, out); emit();
    });
    return {status: 'LOADING'};
  }
  function suggestion() {
    if (!sessions) return null;
    const sid = selectedSessionId(), cur = sessions.find((s) => s.id === sid);
    if (!cur || cur.hasEvidence) return null;
    const dated = sessions.filter((s) => s.hasEvidence && instant(s.startedAtUtc) !== null);
    return dated.length ? dated[dated.length - 1] : null;
  }

  return {
    open, remove, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    get active() { return phase !== 'NONE'; }, get phase() { return phase; }, get ready() { return phase === 'READY'; },
    get reader() { return reader; }, get file() { return file; }, get inventory() { return inventory; }, get lastError() { return lastError; },
    walFlagged: () => !!(inventory && inventory.file && inventory.file.walFlagged),
    isConnected: (pageKey) => Object.prototype.hasOwnProperty.call(CONNECTED, pageKey),
    contract: (pageKey) => CONNECTED[pageKey] || null,
    organ, reconstruction, sessions: () => (sessions ? sessions.slice() : null), selectedSessionId, suggestion,
    selectSession: (id) => { if (!sessions || !sessions.some((s) => s.id === id)) return false; explicit = id; emit(); return true; },
    zoneChanged: () => { cache.clear(); emit(); }
  };
}
