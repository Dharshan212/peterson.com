// MYELIN Web Lite — the CENTRED POPUP STAGE shared by the eight module demonstrations (SINE, MINE, COSINE, SECANT / COSECANT, STORE, FINE, TANGENT, COT).
// PRESENTATION ONLY. It never advances a clock, changes a threshold, writes an event or closes a popup by itself: it draws what a simulation already decided is displayed,
// in the middle of the browser viewport on a translucent backdrop, and hands every button press back to that simulation's own command path.
//  * Runtime-driven modules (SINE, MINE, SECANT / COSECANT, incl. the Normal Break selector and gate): the accepted popup family of popups.js (createPopup / refreshPopup) is reused unchanged,
//    bound to the module's SEPARATE demonstration Runtime.
//  * Ledger / model driven modules (COSINE, STORE, FINE, TANGENT, COT): a card in the same visual family (the SINE popup layout and worlds) built from a small spec that the module's view derives
//    from its own recorded state.
// One popup at a time. The backdrop never blocks the page (pointer-events: none) so the simulation controls stay usable; a small bar at the top labels the popup as a SIMULATION and can hide / show it.
// Popups that have no buttons (protected / persistent states) get a darker backdrop and stay until the simulation itself removes them.
import {el} from './dom.js';
import {createPopup, refreshPopup} from './popups.js';

const ORDER = ['cosecant', 'normalBreak', 'secant', 'sine', 'mine', 'cosine'];
const div = (cls, ...kids) => el('div', {class: cls}, ...kids);
const txt = (tag, cls, value, attrs = {}) => el(tag, {class: cls, ...attrs}, value);
const upper = (s) => String(s ?? '').toUpperCase();
const svgNode = (markup) => { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; };
const GLYPH = () => svgNode('<svg class="pp-glyph" viewBox="0 0 22 20" width="22" height="20" aria-hidden="true" focusable="false"><path d="M11 1.5 20 18H2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><path d="M11 7.5v5M11 15v.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>');

let stage = null, barText = null, barBtn = null, cur = null, hidden = false, timer = 0;

function ensure() {
  if (stage && stage.isConnected) return stage;
  barText = el('span', {class: 'pp-stage-label', id: 'wlDemoStageLabel'}, '');
  barBtn = el('button', {type: 'button', class: 'pp-stage-btn', id: 'wlDemoStageToggle', 'aria-label': 'Hide or show the simulated popup'}, 'HIDE');
  barBtn.addEventListener('click', () => { hidden = !hidden; apply(); });
  stage = el('div', {id: 'wlDemoStage', class: 'pp-stage', 'aria-label': 'Simulated popup'}, el('div', {class: 'pp-stage-bar', role: 'status'}, barText, barBtn));
  document.body.append(stage);
  return stage;
}
function apply() {
  if (!stage) return;
  stage.classList.toggle('on', !!cur);
  stage.classList.toggle('pp-off', !!cur && hidden);
  stage.dataset.protected = cur && cur.protected && !hidden ? '1' : '0';
  barBtn.textContent = hidden ? 'SHOW POPUP' : 'HIDE';
  barText.textContent = cur ? (hidden ? `${cur.label} · HIDDEN` : `${cur.label} · SIMULATION · NOTHING IS MONITORED`) : '';
}
function removeCurrent() {
  if (cur && cur.root) cur.root.remove();
  cur = null; hidden = false; clearInterval(timer); timer = 0; apply();
}
function place(root, meta) {
  ensure();
  if (cur && cur.root && cur.root !== root) cur.root.remove();
  stage.append(root);
  cur = {...meta, root}; hidden = false;
  if (!timer) timer = setInterval(() => { if (cur && !cur.alive()) removeCurrent(); }, 400);   // a popup never outlives the page / view that owns it
  apply();
}
/** Removes the popup when it belongs to `owner` (or any popup when no owner is given). */
export function clearStage(owner) { if (cur && (!owner || cur.owner === owner)) removeCurrent(); }
/** Whether a visible element (the module's own controls) is still on screen: the usual `alive` test of a demonstration. */
export const visibleId = (id) => () => { const n = document.getElementById(id); return !!n && n.isConnected && n.offsetParent !== null; };
export const hostActive = (get) => () => { const h = get(); return !!h && h.isConnected && h.classList.contains('active'); };

/** Runtime-driven popups (the accepted family of popups.js), bound to a module's demonstration Runtime. opt: {owner, alive, after, toast}. */
export function syncRuntimePopup(rt, opt) {
  const o = rt ? ORDER.map((k) => rt[k]).find((x) => x && x.popup) : null, p = o && o.popup;
  if (!rt || !p || rt.state !== 'ACTIVE') { if (cur && cur.kind === 'rt' && cur.owner === opt.owner) removeCurrent(); return; }
  if (!cur || cur.kind !== 'rt' || cur.owner !== opt.owner || cur.sig !== p.id) {
    const act = (action, value) => {
      try { const ok = rt.command(o.name, action, value, p.generation); if (opt.after) opt.after(); return {ok}; }
      catch (e) { if (opt.toast) opt.toast(e.message); return {error: e.message}; }
    };
    const root = createPopup({r: rt, o, p, act});
    if (!root) { if (cur && cur.owner === opt.owner) removeCurrent(); return; }
    root.id = 'wlDemoPopup';                                  // never the Control Station's own #wlPopup, which its renderer owns
    place(root, {kind: 'rt', sig: p.id, owner: opt.owner, alive: opt.alive, label: `${upper(o.name).replaceAll('_', ' ')} POPUP`, protected: !(p.actions && p.actions.length)});
  }
  cur.alive = opt.alive;
  refreshPopup(cur.root, {r: rt, o, p});
  if (!p.displayed && rt.state === 'ACTIVE') rt.display(p.id, p.generation);
  apply();
}

function buildCard(spec) {
  const status = txt('p', 'pp-status', spec.status || '', {'aria-live': 'polite'});
  const lines = (spec.lines || []).map((l) => txt('p', 'pp-resource', l));
  const strip = spec.progress === undefined ? null : div('pp-strip', div('pp-strip-fill'));
  const count = spec.countdown === undefined ? null : txt('p', 'pp-countdown', spec.countdown);
  const eyebrow = div('pp-eyebrow-row', div('pp-orb'), txt('span', 'pp-eyebrow', spec.eyebrow), div('pp-grow'), spec.protected ? GLYPH() : null, txt('span', 'pp-badge pp-badge-sine', spec.badge));
  const kids = [eyebrow, div('pp-gap6'), txt('h2', 'pp-headline pp-h26', spec.headline, {id: 'wlDemoPopupTitle'}), txt('p', 'pp-message pp-m14', spec.message, {id: spec.messageId || 'wlDemoPopupMessage', ...(spec.messageAttrs || {})}), ...lines, div('pp-grow'), status];
  if (spec.extra) kids.push(spec.extra());
  const buttons = (spec.buttons || []).map((b, i) => {
    const btn = el('button', {type: 'button', class: `pp-btn ${i === 0 ? 'pp-primary' : 'pp-secondary'}`, id: b.id, 'data-command': b.cmd || b.id}, b.label);
    btn.addEventListener('click', () => { const r = b.onClick(); if (r && r.ok === false) status.textContent = 'NOT ACCEPTED · ' + upper(r.reason || 'PLEASE RETRY'); });
    return btn;
  });
  if (buttons.length) kids.push(div('pp-actions', ...buttons)); else kids.push(txt('p', 'pp-protected-note', spec.noButtons || 'NO BUTTONS'));
  kids.push(div('pp-gap6'));
  if (strip) kids.push(strip);
  if (count) kids.push(count);
  kids.push(txt('p', 'pp-footer', spec.footer));
  const root = el(spec.tag || 'section', {id: spec.domId || 'wlDemoPopup', class: `wl-pp pp-sine pp-sim pp-enter pp-shown pp-world-${spec.world}${spec.protected ? ' pp-protected' : ''}${spec.cls ? ' ' + spec.cls : ''}`, role: 'region', 'aria-label': spec.aria, 'aria-labelledby': 'wlDemoPopupTitle', 'data-organ': spec.badge, 'data-sim': '1', tabindex: '-1'}, div('pp-shell', ...kids));
  const fill = strip && strip.firstChild;
  const update = (s) => {
    status.textContent = s.status || '';
    (s.lines || []).forEach((l, i) => { if (lines[i]) lines[i].textContent = l; });
    if (fill && s.progress !== undefined) fill.style.width = `${Math.max(0, Math.min(1, s.progress)) * 100}%`;
    if (count && s.countdown !== undefined) count.textContent = s.countdown;
  };
  update(spec);
  queueMicrotask(() => { try { root.focus({preventScroll: true}); } catch { /* focus is a convenience only */ } });
  return {root, update};
}
/** Card popups of the model / ledger driven modules. spec === null removes the popup this owner shows. opt: {owner, alive}. */
export function showCard(spec, opt) {
  if (!spec) { if (cur && cur.kind === 'card' && cur.owner === opt.owner) removeCurrent(); return; }
  if (cur && cur.kind === 'card' && cur.owner === opt.owner && cur.sig === spec.sig) { cur.alive = opt.alive; cur.update(spec); apply(); return; }
  const built = buildCard(spec);
  place(built.root, {kind: 'card', sig: spec.sig, owner: opt.owner, alive: opt.alive, label: spec.label, protected: !!spec.protected, update: built.update});
}
