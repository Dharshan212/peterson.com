// Science Lab pages for an IMPORTED database file.
//   Chapter 6: the four lifetime Evidence cards, from the desktop's Chapter 6 lifetime summary (ported in db-import/metrichub.js); values are formatted exactly as the desktop view does.
//   Chapter 5: the list of durable experiments recorded in the file (the desktop's history listing); VIEW RESULTS reconstructs and certifies the experiment from the file's durable
//              evidence (db-import/sciencelab.js, a port of the desktop's Chapter 3 analysis) and shows it as a HISTORICAL RECONSTRUCTION -- or the desktop's reason it cannot be certified.
//   Chapter 3: the same experiment list; OPEN ANALYSIS shows the whole certified package. No simulated workflow runs while a file is open.
import {el, button} from './dom.js';
import {formatNs, chapter5Result, chapter3Package} from './science-certified.js';
export {formatNs};
export function chapter6FromDesktop(c) {
  const card = (x) => ({status: x.status, value: x.status === 'AVAILABLE' ? (x.unit === 'ns' ? formatNs(x.value) : String(x.value)) : null, reason: x.reason});
  return {best_return: card(c.best_return), worst_return: card(c.worst_return), top_distraction_platform: card(c.top_distraction_platform), top_ott_platform: card(c.top_ott_platform), generatedAt: new Date().toISOString(), imported: true};
}

const panel = (title, kids) => el('div', {class: 'card c5x-card', id: 'sciImported'}, el('h2', {class: 'c5x-title'}, title), ...kids);
const sel = {c3: null, c5: null};      // the experiment each chapter is showing; `follow` resets them when the file changes
let lastFile = null;
const follow = (ctx) => { if (ctx.file !== lastFile) { lastFile = ctx.file; sel.c3 = null; sel.c5 = null; } };   // another file (or none) starts with no experiment selected

export function notice(o, title = 'Science Lab — imported database evidence') {
  const wait = o.status === 'LOADING' || o.status === 'NONE';
  return el('div', {class: 'card'}, el('h2', {}, title), el('p', {class: wait ? 'wl-empty' : 'dbs-text dbs-warn', id: 'sciImportNotice', role: wait ? 'status' : 'alert'}, wait ? 'Reading the imported file ...' : (o.reason || 'This chapter cannot show the imported file.')),
    el('p', {class: 'hint'}, 'The records of the open file remain available in the Database Explorer. No simulated data is shown on this page while a file is open.'));
}
/** The experiment list shared by Chapters 3 and 5; the action button opens the reconstruction of that experiment. */
function experimentList(o, T, key, label, onOpen) {
  const h = o.data.history, when = (iso) => (iso && Number.isFinite(Date.parse(iso)) ? `${T.day(iso)} ${T.hm(iso)} [${T.tag()}]` : '—');
  if (h === null) return el('p', {class: 'dbs-text dbs-warn', role: 'alert', id: 'sciHistUnavailable'}, `Experiment history unavailable: ${o.data.historyReason}`);
  return el('div', {class: 'c5x-hist', id: 'sciHistory'}, h.length ? h.map((x) => {
    const b = button(label, () => { sel[key] = x.experiment_id; onOpen(); }, {class: 'c5x-btn sm', 'aria-label': `${label} for ${x.experiment_id}`, title: x.eligible ? 'Reconstruct and certify this experiment from the durable evidence of the file.' : x.reason});
    b.disabled = !x.eligible;
    return el('div', {class: 'card c5x-hrow', 'data-experiment': x.experiment_id}, el('div', {}, el('b', {}, `${x.experiment_id}  ·  session ${x.parent_session_id}`),
      el('span', {}, `${x.status}  ·  ${when(x.started_at_utc)} → ${when(x.ended_at_utc)}${x.end_reason ? '  ·  ' + x.end_reason.replaceAll('_', ' ') : ''}${x.eligible ? '' : '  ·  ' + x.reason}`),
      el('span', {class: 'c5x-p'}, x.eligible ? 'Result: reconstructed on request from the durable evidence of the file.' : `Result: Unavailable — ${x.reason}.`)), b);
  }) : [el('p', {class: 'c5x-p'}, 'No durable experiments are recorded in this file.')]);
}
export function chapter3(o, T, ctx) {
  follow(ctx);
  if (o.status !== 'AVAILABLE') return notice(o, 'Chapter 3 — Data Analysis');
  if (sel.c3) return chapter3Package(ctx.recon(sel.c3), sel.c3, T, () => { sel.c3 = null; ctx.redraw(); });
  const h = o.data.history;
  return panel('CHAPTER 3 — DATA ANALYSIS', [
    el('p', {class: 'c5x-p', id: 'sciC3Status'}, h === null ? 'Experiment history is unavailable for this file.' : `${h.length} durable experiment record(s) in the imported file. Choose one to reconstruct and certify its analysis package.`),
    el('p', {class: 'c5x-p'}, 'The analysis is rebuilt from the durable evidence of the file by the desktop’s fail-closed rules: evidence that cannot be certified is reported as Unavailable with its reason, never estimated. No simulated experiment workflow runs while a database file is open.'),
    experimentList(o, T, 'c3', 'OPEN ANALYSIS', ctx.redraw)]);
}
export function chapter5(o, T, ctx) {
  follow(ctx);
  if (o.status !== 'AVAILABLE') return notice(o, 'Chapter 5 — Results & Discussion');
  if (sel.c5) return chapter5Result(ctx.recon(sel.c5), sel.c5, T, () => { sel.c5 = null; ctx.redraw(); });
  const h = o.data.history;
  return panel('CHAPTER 5 — RESULTS & DISCUSSION', [
    el('p', {class: 'c5x-p', id: 'sciHistStatus'}, h === null ? 'Experiment history is unavailable for this file.' : `${h.length} durable experiment record(s) in the imported file, newest first.`),
    el('p', {class: 'c5x-p'}, 'VIEW RESULTS reconstructs the experiment from the file’s durable evidence and shows it as a HISTORICAL RECONSTRUCTION. An experiment whose evidence cannot be certified shows the reason and no result.'),
    experimentList(o, T, 'c5', 'VIEW RESULTS', ctx.redraw)]);
}
