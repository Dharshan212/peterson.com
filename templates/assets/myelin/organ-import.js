// Imported-file view-models for the MIRL, MINE and COSINE pages: a pure, field-by-field mapping from the desktop read models (as ported in db-import/organs.js) to the shape the
// existing pages already render. No value is estimated or invented; a display rule that exists on the desktop (CONTROL_STATION/application.py) is applied exactly, and the one place
// where a snapshot differs from a live desktop (an episode with no recorded close is never called "active") is labelled.
const dash = '—';
const NO_CLOSE = 'NO_CLOSE_RECORDED';
const sec = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Microseconds since the epoch of a canonical UTC stamp (strict "...Z" form), or null. */
function strictUs(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z$/.exec(String(text || ''));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isFinite(t) ? t * 1000 + (m[7] ? Number(m[7].padEnd(6, '0')) : 0) : null;
}
/** application.py _mirl_parse_any_utc: the strict form, or the "+00:00" form the older writer produced. */
function anyUs(text) {
  const s = String(text || '').trim(), z = strictUs(s);
  if (z !== null || !s.endsWith('+00:00')) return z;
  return strictUs(s.slice(0, -6) + 'Z');
}
/** application.py _mirl_delta: the gap between two projected stamps, truncated toward zero. */
function deltaText(a, b) {
  const x = strictUs(a), y = strictUs(b);
  if (x === null || y === null) return dash;
  const gap = Math.trunc((y - x) / 1e6), sign = gap >= 0 ? '+' : '-', g = Math.abs(gap), h = Math.floor(g / 3600), m = Math.floor((g % 3600) / 60), s = g % 60;
  return h ? `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ============================== MIRL ============================== */
export function mirlFromDesktop(d) {
  const shown = d.active_episodes.map((r) => ({r, open: true})).concat(d.recently_closed_episodes.map((r) => ({r, open: false})));
  const episodes = shown.map(({r, open}) => {
    const tl = r.timeline.map((e, i) => ({name: e.event_name, kind: e.observed_or_derived === 'DERIVED' ? 'derived' : 'observed', utc: e.occurred_at, eff: Number.isFinite(e.monotonic_ns) ? e.monotonic_ns / 1e9 : undefined,
      code: e.reason_or_outcome_code, ref: e.reference, eventId: e.event_id, seq: e.episode_seq, deltaNext: i + 1 < r.timeline.length ? deltaText(e.occurred_at, r.timeline[i + 1].occurred_at) : undefined}));
    let rec = null; for (const e of r.timeline) if (e.event_name === 'return_verified') rec = e;          // _mirl_recovered_at: the LAST verified return
    const recoveredUtc = rec ? rec.occurred_at : null, a = anyUs(r.started_at), b = anyUs(recoveredUtc);
    const measured = a !== null && b !== null && (b - a) >= 0 ? (b - a) / 1e6 : null;                     // _mirl_measured_return_latency
    return {episodeId: r.episode_id, id: r.short_display_id, startedUtc: r.started_at, outcome: open ? NO_CLOSE : r.final_outcome, timeline: tl, stages: r.sine_stages_exposed.slice(),
      sessionNo: r.session_id, triggerNo: r.source_event_id, triggerUtc: r.trigger_fired_at || null, application: r.application || r.candidate_uid || '', recoveredUtc,
      attempts: r.recovery_attempt_count, relapses: r.relapse_count, integrity: r.integrity_status, live: false, measured, verifiedLatency: sec(r.verified_return_latency_seconds), imported: true};
  });
  const verified = episodes.filter((r) => r.outcome === 'RETURNED').length;
  const cands = []; if (sec(d.worst_return_latency_seconds) !== null) cands.push(d.worst_return_latency_seconds);
  for (const r of episodes) if (r.outcome === 'RETURNED' && Number.isFinite(r.measured)) cands.push(r.measured);        // _mirl_worst_drift_text
  const seqOf = (eid, ev) => { const row = episodes.find((x) => x.episodeId === eid); const t = row && row.timeline.find((x) => x.eventId === ev); return t ? t.seq : dash; };
  return {episodes, active: [], closed: episodes, state: episodes.length ? 'idle' : 'empty', focus: episodes[0] || null, integrity: d.integrity_status,
    issues: d.integrity_issues.map((i) => ({code: i.code, episode: i.episode_id || dash, seq: i.event_id ? seqOf(i.episode_id, i.event_id) : dash})), exclusionCount: d.exclusion_count,
    counts: d.native_outcome_counts, verified, worstDrift: cands.length ? Math.max(...cands) : null, generatedAt: new Date().toISOString(), imported: true, statusMessage: d.status_message,
    src: {population: 'Imported database file snapshot — native MIRL events (read-only)', range: 'All sessions in the imported file', projector: 'myelin-mirl-read-model-v1 (browser port of the desktop projector)', chip: 'Source: Imported File'}};
}
/** What a snapshot says about the "live" tiles: nothing is running, so nothing claims to be. */
export const mirlImportedLive = () => ({open: null, signal: false, sineStage: 'SINE INACTIVE', sineTimer: dash, time: 0, triggerNo: null, sessionNo: null});

/* ============================== MINE ============================== */
const words = (v) => String(v || '').replaceAll('_', ' ').trim().replace(/\s+/g, ' ');
function mineEvent(e, i, prev, outcome) {
  return {name: e.event_name, cls: e.event_class, utc: e.occurred_at_utc, eff: undefined, platform: e.platform_label || null, facts: e.payload_facts || {}, seq: Number(e.sequence), delta: e.elapsed_from_previous_seconds,
    outcome: e.event_name === 'MINE_SESSION_CLOSED' ? outcome : undefined, platformKey: e.platform_key};
}
export function mineFromDesktop(d) {
  const episodes = d.episodes.map((ep) => {
    const outcome = ep.is_closed ? (words(ep.closure_outcome).toUpperCase() || 'CLOSED') : '';
    const events = ep.events.map((e, i) => mineEvent(e, i, null, outcome));
    return {key: `${ep.session_id}|${ep.generation}`, episodeId: ep.mine_episode_id, id: ep.display_episode_id, sessionNo: ep.session_id, startedUtc: ep.started_at_utc, endedUtc: ep.ended_at_utc, closed: ep.is_closed,
      outcome, branch: ep.branch || '', startingPlatform: ep.starting_platform_label || '', route: ep.messenger_platforms.map((p) => p[1]), hops: ep.messenger_hops.map((h) => ({from: h.from_platform_label, to: h.to_platform_label, utc: h.occurred_at_utc})),
      events, returnVerified: ep.return_verified, closureConfirmed: ep.closure_confirmed, live: false, reason: ep.closure_reason || '', imported: true};
  });
  const news = d.latest_events.slice(0, 3).map((e) => { const ep = episodes.find((x) => x.key === `${e.session_id}|${e.generation}`); return Object.assign(mineEvent(e, 0, null, ep ? ep.outcome : ''), {episode: ep ? ep.id : ''}); });
  const dwell = d.dwell_records.map((r) => ({platform: r.platform_label || 'Not recorded', seconds: r.dwell_seconds, band: r.mbi_band, episode: r.display_episode_id, segment: r.segment_order === null ? '' : r.segment_order, utc: r.completed_at_utc}));
  return {episodes, latest: episodes[0] || null, news, dwell, available: true, generatedAt: new Date().toISOString(), imported: true, statusMessage: d.status_message,
    src: {durable: 'imported database file snapshot (read-only)', live: 'none — a file is a snapshot, not a running engine', status: 'Imported snapshot'}};
}
export const mineImportedLive = () => ({available: true, active: false, paused: false, hasEpisode: false, state: 'No active episode', platform: 'Unavailable', branch: 'Unavailable', returnStatus: 'No active episode'});

/* ============================== COSINE ============================== */
const epochOf = (iso) => { const us = strictUs(iso) ?? anyUs(iso); return us === null ? Date.parse(iso) / 1000 : us / 1e6; };
export function cosineFromDesktop(d) {
  // application.py cosine_episode_display_ids: COS-DDMMYYYY-NN from the immutable UTC start instant, ordered by (instant, session id, generation)
  const aliases = new Map(), byDate = new Map();
  for (const ep of d.episodes) {
    const t = new Date(ep.started_at_utc); if (!Number.isFinite(+t)) continue;
    const key = `${String(t.getUTCDate()).padStart(2, '0')}${String(t.getUTCMonth() + 1).padStart(2, '0')}${t.getUTCFullYear()}`;
    if (!byDate.has(key)) byDate.set(key, []); byDate.get(key).push([epochOf(ep.started_at_utc), ep]);
  }
  for (const [key, list] of byDate) { list.sort((p, q) => p[0] - q[0] || (p[1].cosine_session_id < q[1].cosine_session_id ? -1 : p[1].cosine_session_id > q[1].cosine_session_id ? 1 : 0) || Number(p[1].generation) - Number(q[1].generation)); list.forEach(([, ep], i) => aliases.set(`${ep.cosine_session_id}|${ep.generation}`, `COS-${key}-${String(i + 1).padStart(2, '0')}`)); }
  const episodes = d.episodes.map((ep) => {
    const events = ep.events.map((e) => ({name: e.event_name, cls: e.event_class, utc: e.occurred_at_utc, eff: epochOf(e.occurred_at_utc), platform: e.platform_label, platformKey: e.platform_key, payload: e.payload_display || {},
      title: e.content_title || null, hop: e.event_name === 'HOPPER_TRANSITION' ? {from: COS_LABEL(e.payload_display.from_platform), to: COS_LABEL(e.payload_display.to_platform)} : undefined,
      closed: e.event_name === 'COSINE_SESSION_CLOSED' ? e.payload_display.closure_outcome : undefined, request: e.request_id || null, seq: Number(e.sequence)}));
    return {key: `${ep.parent_session_id}|${ep.cosine_session_id}`, episodeId: ep.cosine_session_id, id: aliases.get(`${ep.cosine_session_id}|${ep.generation}`) || 'COS-UNKNOWN', sessionNo: ep.parent_session_id, generation: Number(ep.generation),
      startedUtc: ep.started_at_utc, endedUtc: ep.ended_at_utc, closed: ep.is_closed, reason: ep.closure_reason, outcome: ep.closure_outcome, startKey: ep.starting_platform_key, startLabel: ep.starting_platform_label,
      userChoice: ep.user_choice, minutes: ep.chosen_break_minutes, hops: ep.hopper_transitions.map((h) => ({to: h.to_platform, label: h.to_platform_label, utc: h.occurred_at_utc})), hopperCount: ep.hopper_count, events, eventCount: ep.event_count,
      live: false, holdContext: ep.hold_context, imported: true};
  });
  return {episodes, latest: episodes[0] || null, overview: {captured: d.overview.captured_episode_count, confirmed: d.overview.confirmed_return_count, breaks: d.overview.break_started_count, usual: 'UNAVAILABLE', usualReason: d.overview.usual_return_reason},
    generatedAt: new Date().toISOString(), imported: true, statusMessage: d.status_message};
}
const LABELS = {netflix: 'Netflix', prime_video: 'Prime Video', jiohotstar: 'JioHotstar', disney_plus: 'Disney+', hulu: 'Hulu', hbo_max: 'HBO Max', apple_tv_plus: 'Apple TV+', paramount_plus: 'Paramount+'};
function COS_LABEL(key) { return LABELS[key] || key; }
export const cosineImportedLive = () => ({available: true, active: false, paused: false, state: '', platform: '', minutes: null, hops: 0});

/** Why a ledger organ cannot be shown, in words a visitor can act on (the desktop's own status message plus the structural issue codes). */
export function organReason(title, data, code) {
  if (data && data.available === false) {
    const codes = [...new Set((data.structural_issues || []).map((i) => i.code))];
    return `${title} unavailable: ${data.status_message}${codes.length ? ' (' + codes.slice(0, 6).join(', ') + (codes.length > 6 ? ', …' : '') + ')' : ''} The records remain readable in the Database Explorer.`;
  }
  const why = {OperationalError: 'a table the desktop reader needs is missing or is not an ordinary table', ValueError: 'a recorded event or its trigger evidence failed the desktop reader’s validation', TypeError: 'a recorded event has a field of the wrong type',
    KeyError: 'a recorded event is missing a required field', OverflowError: 'a recorded value is out of range', TimezoneProjectionError: 'the selected time zone could not be applied'}[code] || 'the evidence could not be read';
  return `${title} unavailable: ${why}. Nothing is shown rather than a partial or guessed result. The records remain readable in the Database Explorer.`;
}
