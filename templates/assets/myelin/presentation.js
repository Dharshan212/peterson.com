// Presentation-only coordinator. It READS the accepted event ledger and the runtime state
// and writes only DOM attributes (html[data-accent], #wlAlertBorder, #engineStatusPill[data-state]).
// It never calls a runtime command, never emits an event and never touches an organ.
//
// Rules are a port of the desktop CONTROL_STATION/application.py coordinators
// (_NormalSinePresentationCoordinator, _SecantAtmosphereCoordinator) and of
// UI_THEMES/theme.py ThemeController priority (RED > AMBER > GREEN):
//   SINE   stage 2 displayed -> AMBER after 1 s; stage 3 displayed -> RED after 1 s (same owner replaces).
//   MIRL   closed RETURNED   -> releases a still-active SINE AMBER/RED 2 s later (never GREEN).
//   SINE   closed otherwise  -> release now. Resolution (RETURNED) keeps the claim until the MIRL release.
//   NORMAL BREAK return gate displayed -> GREEN now; its acknowledgement releases GREEN only.
//   MINE   MINE-1 displayed  -> AMBER latched to the episode; MINE-2 displayed -> RED; released on closure.
//   SECANT stage 2/3 displayed -> AMBER/RED now; released on episode closure.
//   COSECANT continuity popup shown (BREAK_COMPLETE / BREAK_ALREADY_OVER / FINAL_LOCK) -> GREEN now;
//            RETURN_INTENT / RETURN_CONFIRMED release it and suppress a re-claim for that break.
//   Stage 1 and COSINE claim nothing. Pause does not reset; end / emergency / new session do.
// Delays are anchored to each fact's own wall-clock timestamp (event.utc), as the desktop anchors to
// occurred_monotonic_ns, so replaying a runtime after a Tutorial swap reproduces the same result.
const RANK = {green: 1, amber: 2, red: 3};
const GREEN_STAGES = new Set(['BREAK_COMPLETE', 'BREAK_ALREADY_OVER', 'FINAL_LOCK']);
const LIVE = new Set(['ACTIVE', 'PAUSED']);

export function mountPresentation(app) {
  const root = document.documentElement;
  const border = document.createElement('div');
  border.id = 'wlAlertBorder';
  border.className = 'wl-alert-border';
  border.setAttribute('aria-hidden', 'true');
  border.hidden = true;
  document.body.append(border);

  let rt = null, sessionId = null, cursor = 0, current = null, wake = null, normalBreakSine = null;
  let claims = new Map();           // claimId -> {atm, pending:{atm,at}|null, releaseAt:number|null}
  let suppressed = new Set();       // COSECANT claims released by an authoritative fact

  const stamp = e => Date.parse(e.utc) || Date.now();
  const claim = id => claims.get(id);
  function setNow(id, atm, {keepHigher = false} = {}) {
    const c = claims.get(id);
    if (c && keepHigher && c.atm && RANK[c.atm] > RANK[atm]) return;
    claims.set(id, {atm, pending: null, releaseAt: null});
  }
  function schedule(id, atm, at) {
    let c = claims.get(id);
    if (c && (c.atm === atm || c.pending?.atm === atm)) return;
    if (!c) { c = {atm: null, pending: null, releaseAt: null}; claims.set(id, c); }
    c.pending = {atm, at};
  }

  function reset() { claims = new Map(); suppressed = new Set(); normalBreakSine = null; }

  function process(e) {
    const ep = e.episodeId, t = stamp(e), stage = e.payload?.stage;
    switch (e.organ) {
      case 'SESSION':
        if (e.type === 'SESSION_STARTED' || e.type === 'SESSION_ENDED') reset();
        break;
      case 'SINE': {
        const id = `sine:${ep}`;
        if (e.type === 'STAGE_DISPLAYED' && (stage === 2 || stage === 3) && ep) schedule(id, stage === 3 ? 'red' : 'amber', t + 1000);
        else if (e.type === 'EPISODE_CLOSED') {
          const c = claim(id);
          if (!c) break;
          if (e.payload?.outcome === 'RETURNED') { c.pending = null; if (!c.atm) claims.delete(id); }
          else claims.delete(id);
        }
        break;
      }
      case 'MIRL':
        if (e.type === 'EPISODE_CLOSED' && e.payload?.outcome === 'RETURNED') {
          const c = claim(`sine:${ep}`);
          if (c && (c.atm === 'amber' || c.atm === 'red')) c.releaseAt = t + 2000;
        }
        break;
      case 'NORMAL_BREAK':
        if (e.type === 'BREAK_STARTED') normalBreakSine = e.payload?.sineEpisodeId || null;
        else if (e.type === 'STAGE_DISPLAYED' && stage === 'RESUME_GATE' && normalBreakSine) setNow(`sine:${normalBreakSine}`, 'green');
        else if (e.type === 'RESUME_ACKNOWLEDGED' && normalBreakSine) {
          const id = `sine:${normalBreakSine}`;
          if (claim(id)?.atm === 'green') claims.delete(id);
        }
        break;
      case 'MINE': {
        const id = `mine:${ep}`;
        if (e.type === 'STAGE_DISPLAYED' && ep) {
          if (stage === 'MINE-1') setNow(id, 'amber', {keepHigher: true});
          else if (typeof stage === 'string' && stage.startsWith('MINE-2')) setNow(id, 'red');
        } else if (e.type === 'EPISODE_CLOSED') claims.delete(id);
        break;
      }
      case 'SECANT': {
        const id = `secant:${ep}`;
        if (e.type === 'STAGE_DISPLAYED' && ep && (stage === 2 || stage === 3)) setNow(id, stage === 3 ? 'red' : 'amber');
        else if (e.type === 'EPISODE_CLOSED') claims.delete(id);
        break;
      }
      case 'COSECANT': {
        const id = `cosecant:${ep}`;
        if (e.type === 'STAGE_DISPLAYED' && ep && GREEN_STAGES.has(stage) && !suppressed.has(id)) setNow(id, 'green');
        else if (e.type === 'RETURN_INTENT' || e.type === 'RETURN_CONFIRMED') { suppressed.add(id); claims.delete(id); }
        else if (e.type === 'EPISODE_CLOSED') claims.delete(id);
        break;
      }
      default:
    }
  }

  function pillState(state) { return state === 'ACTIVE' ? 'active' : state === 'PAUSED' ? 'paused' : state === 'EMERGENCY' ? 'alert' : 'idle'; }

  function update() {
    const r = app.getRuntime();
    if (!r) return;
    const sid = r.session?.id || null;
    if (r !== rt || sid !== sessionId || r.events.length < cursor) { rt = r; sessionId = sid; cursor = 0; reset(); }
    for (; cursor < r.events.length; cursor++) process(r.events[cursor]);

    const now = Date.now();
    let next = Infinity;
    for (const [id, c] of claims) {
      if (c.pending) { if (now >= c.pending.at) { c.atm = c.pending.atm; c.pending = null; } else next = Math.min(next, c.pending.at); }
      if (c.releaseAt) { if (now >= c.releaseAt) { claims.delete(id); continue; } next = Math.min(next, c.releaseAt); }
      if (!c.atm && !c.pending) claims.delete(id);
    }
    if (!LIVE.has(r.state)) reset();

    let top = null;
    for (const c of claims.values()) if (c.atm && (!top || RANK[c.atm] > RANK[top])) top = c.atm;
    if (top !== current) {
      current = top;
      if (top) root.dataset.accent = top; else delete root.dataset.accent;
      border.dataset.tone = top || '';
      border.hidden = !(top === 'amber' || top === 'red');   // GREEN and base themes show no warning border
    }
    // An atmosphere is always a dark world on the desktop, whatever base theme sits underneath.
    const wantTheme = top ? 'dark' : (root.dataset.world === 'white' ? 'light' : 'dark');
    if (root.dataset.theme !== wantTheme) root.dataset.theme = wantTheme;

    const pill = document.getElementById('engineStatusPill');
    if (pill) { const s = pillState(r.state); if (pill.dataset.state !== s) pill.dataset.state = s; }

    clearTimeout(wake);
    if (Number.isFinite(next)) wake = setTimeout(update, Math.max(20, next - now + 5));
  }

  // Read-only diagnostics for acceptance checks; no setter, no command path.
  Object.defineProperty(window, 'MYELIN_PRESENTATION', {value: Object.freeze({
    get atmosphere() { return current; },
    get claims() { return [...claims].map(([id, c]) => ({id, atmosphere: c.atm, pending: c.pending?.atm || null})); },
    get base() { return root.dataset.world || 'neon'; }
  })});

  update();
  return {update};
}
