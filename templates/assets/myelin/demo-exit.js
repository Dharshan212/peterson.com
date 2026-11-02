// Demo-level exit / reset. A visitor to the public demonstration must always be able to leave the simulation,
// even while a protected intervention (SINE-3, MINE-2, SECANT-3, COSECANT final lock, COSINE final callback)
// is on screen. These controls are DELIBERATELY NOT part of #wlPopup, so a protected popup still has zero
// intervention buttons and no intervention can be answered, dismissed or satisfied from here.
//
// They call only the paths the Control Station buttons already use:
//   END SESSION  == the STOP button  (app.end('ENDED'): every unresolved organ workflow is cancelled with a
//                   non-successful outcome; nothing is recorded as a return), or the Academy's own Skip tour
//                   when the guided tutorial is running.
//   RESET DEMO   == END SESSION, then Task / Work evidence, Control page, sidebar and dialogs closed.
//                   Local history is NOT deleted (that stays behind its own confirmation in Local settings).
import {el} from './dom.js';

const LIVE = new Set(['ACTIVE', 'PAUSED']);

export function mountDemoExit(app) {
  const mk = (label, title, fn) => { const b = el('button', {type: 'button', class: 'wl-de-btn', title, 'data-demo': label.toLowerCase().replace(/\s+/g, '-')}, label); b.addEventListener('click', fn); return b; };
  async function leave(reset) {
    if (app.academy?.open) app.academy.stop(); else if (LIVE.has(app.getRuntime().state)) app.end('ENDED');
    if (reset) {
      app.ui.closeModal?.();
      document.body.classList.remove('sidebar-open');
      app.simulator?.select('task');
      await app.ui.navigate('control');
      scrollTo({top: 0});
    }
    node.hidden = true;
  }
  const node = el('div', {id: 'wlDemoExit', class: 'wl-demo-exit', role: 'group', 'aria-label': 'Demonstration controls (separate from the intervention)', hidden: ''},
    el('span', {class: 'wl-de-tag'}, 'DEMO'),
    mk('END SESSION', 'End this simulated session. It does not answer or satisfy the intervention and is never recorded as a return.', () => leave(false)),
    mk('RESET DEMO', 'End the session and reset the workspace to Task / Work on the Control page. Local history is kept.', () => leave(true)));
  document.body.append(node);

  let last = '';
  function update() {
    const r = app.getRuntime(), pop = document.getElementById('wlPopup') || document.getElementById('wlBreakActive');
    const show = !!pop && !!r && LIVE.has(r.state);
    if (!show) { if (!node.hidden) node.hidden = true; last = ''; return; }
    if (node.hidden) node.hidden = false;
    // keep it right after the popup in tab order, then place it just outside the popup's frame
    if (pop.nextElementSibling !== node) pop.after(node);
    const b = pop.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, h = node.offsetHeight || 34, w = node.offsetWidth || 260;
    let top = b.bottom + 8;
    if (top + h > vh - 8) top = b.top - 8 - h;
    if (top < 8) top = 8;
    const left = Math.max(8, Math.min(vw - w - 8, b.right - w));
    const key = `${Math.round(top)}|${Math.round(left)}`;
    if (key !== last) { node.style.top = `${top}px`; node.style.left = `${left}px`; last = key; }
  }
  window.addEventListener('resize', () => { last = ''; update(); });
  document.addEventListener('wl-pp-move', () => { last = ''; update(); });
  return {update};
}
