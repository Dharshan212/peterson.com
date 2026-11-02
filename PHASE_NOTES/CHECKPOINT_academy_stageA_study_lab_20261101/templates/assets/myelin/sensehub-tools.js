// SenseHub — FIRMWARE LAB and MYELINOSCOPE (Digital Oscilloscope): browser DEMONSTRATIONS of the Edge interfaces.
// Reference (read-only): MYELIN_EDGE_TRIAL/SENSEHUB/firmware_lab/* (lab.py, device_panel.py, bottom_panel.py) and SENSEHUB/oscilloscope.py.
// FIRMWARE LAB here is a VISUAL DEMONSTRATION: there is no compiler, no uploader, no serial or Bluetooth transport and no Arduino CLI in a browser; its action buttons answer with a clearly labelled message.
// MYELINOSCOPE shows a SIMULATED ECG generator (the Edge instrument is also simulated / recorded-excerpt only and has no device I/O of its own); CH2 is "not connected" exactly as in the Edge build.
import {el} from './dom.js';
import {icon, ecgValue, RATE, drawPlot} from './sensehub-core.js';

const btn = (label, id, fn, cls = '', ico = null) => el('button', {type: 'button', class: `sh-btn ${cls}`, id, on: {click: fn}}, ico ? icon(ico, 16) : null, el('span', {}, label));
const pad = (n, w = 2) => String(n).padStart(w, '0');

/* ======================================================================== FIRMWARE LAB (visual demonstration) ======================================================================== */
const SAMPLE = {
  'sensehub_sample.ino': ['// VISUAL DEMONSTRATION SAMPLE — not real SenseHub firmware, never compiled or uploaded.', '#include "config.h"', '', 'void setup() {', '  // initialise the board here', '}', '', 'void loop() {', '  // read and report here', '}'],
  'config.h': ['// VISUAL DEMONSTRATION SAMPLE — not real SenseHub firmware.', '#pragma once', '', '#define SAMPLE_RATE_HZ 250', '#define CHANNELS 2']
};
const STRIP = [['DEVICE', 'chip', 'NOT CONNECTED'], ['PORT', 'plug', '—'], ['BOARD', 'adc', 'NOT CONFIGURED'], ['PROFILE', 'file', '—'], ['TOOLCHAIN', 'code', 'NOT CONFIGURED'], ['CONNECTION', 'plug', 'NOT CONNECTED']];
const SECTIONS = [['BUILD TARGET', [['Search', '—'], ['Board', 'NOT CONFIGURED'], ['FQBN', '—'], ['Platform', '—'], ['Options', '—']]],
  ['CONNECTED DEVICE', [['Found', 'none'], ['Device', 'NOT CONNECTED'], ['Port', '—'], ['Detected board', '—'], ['Profile', '—'], ['Status', 'NOT CONNECTED'], ['Target match', '—'], ['Last scan', 'never']]],
  ['TOOLCHAIN', [['Arduino CLI version', 'NOT CONFIGURED'], ['Environment', '—'], ['Core version', '—'], ['Build profile', '—'], ['Toolchain status', 'NOT CONFIGURED']]],
  ['FIRMWARE', [['Verified build', '—'], ['Firmware version', '—'], ['Build information', '—']]],
  ['TRANSPORT CAPABILITY', [['USB (CDC)', 'not available in a browser'], ['BLE (GATT)', 'not available in a browser'], ['Classic SPP', 'not available in a browser']]]];

export function createFirmwareLab() {
  const S = {open: Object.keys(SAMPLE).slice(0, 1), active: 'sensehub_sample.ino', bottom: 'OUTPUT', out: ['[LAB] Firmware Lab — VISUAL DEMONSTRATION. No compiler, uploader, serial or Bluetooth transport exists in this browser.']};
  const host = el('div', {class: 'sh-fw', id: 'shFw'});
  const out = (line) => { S.out.push(line); renderBottom(); };
  const demo = (what) => () => out(`[${what}] VISUAL DEMONSTRATION — no ${{VERIFY: 'compiler', UPLOAD: 'uploader or device', CANCEL: 'running job', MONITOR: 'serial transport', CHECK: 'toolchain', SCAN: 'device scan'}[what]} exists in the browser; nothing was ${{VERIFY: 'built', UPLOAD: 'flashed', CANCEL: 'cancelled', MONITOR: 'opened', CHECK: 'checked', SCAN: 'scanned'}[what]}.`);
  const tabsEl = el('div', {class: 'sh-fw-tabs', role: 'tablist'}), code = el('pre', {class: 'sh-code', id: 'shFwCode', tabindex: '0', 'aria-label': 'Sample source (read-only)'}), bottomTabs = el('div', {class: 'sh-fw-btabs', role: 'tablist'}), bottom = el('div', {class: 'sh-fw-bottom', id: 'shFwBottom'});
  function renderEditor() {
    tabsEl.replaceChildren(...S.open.map((f) => el('span', {class: 'sh-fw-tab', 'data-active': String(f === S.active)}, el('button', {type: 'button', class: 'sh-fw-tabname', role: 'tab', 'aria-selected': String(f === S.active), on: {click: () => { S.active = f; renderEditor(); }}}, f),
      el('button', {type: 'button', class: 'sh-fw-x', 'aria-label': `Close ${f}`, on: {click: () => { S.open = S.open.filter((x) => x !== f); S.active = S.open[0] || null; renderEditor(); }}}, '×'))));
    if (!S.active) { code.replaceChildren(el('div', {class: 'sh-fw-empty'}, el('b', {}, 'No file open'), el('span', {}, 'Open a firmware folder,\nthen double-click a file in the project tree.'))); return; }
    code.replaceChildren(...SAMPLE[S.active].map((l, i) => el('div', {class: 'sh-line'}, el('span', {class: 'sh-ln'}, String(i + 1)), el('span', {class: l.trim().startsWith('//') ? 'sh-cm' : l.startsWith('#') ? 'sh-pp' : ''}, l || ' '))));
  }
  function renderBottom() {
    bottomTabs.replaceChildren(...['OUTPUT', 'PROBLEMS', 'MONITOR', 'PROTOCOL'].map((t) => el('button', {type: 'button', class: 'sh-fw-btab', role: 'tab', id: `shFwB_${t}`, 'aria-selected': String(S.bottom === t), on: {click: () => { S.bottom = t; renderBottom(); }}}, t)));
    if (S.bottom === 'OUTPUT') bottom.replaceChildren(...S.out.map((l) => el('div', {class: 'sh-mono'}, l)));
    else if (S.bottom === 'PROBLEMS') bottom.replaceChildren(el('div', {class: 'sh-table sh-prob'}, ...['Severity', 'File', 'Line:Col', 'Message'].map((h) => el('span', {class: 'sh-th'}, h))), el('p', {class: 'sh-muted'}, 'No problems recorded — nothing is compiled in this demonstration.'));
    else bottom.replaceChildren(el('p', {class: 'sh-muted'}, `${S.bottom} is not available in this browser demonstration (no serial or transport exists).`));
    bottom.scrollTop = bottom.scrollHeight;
  }
  const tree = el('div', {class: 'sh-fw-tree', id: 'shFwTree'}, el('div', {class: 'sh-fw-folder'}, icon('folder', 16), el('b', {}, 'sensehub_sample'), el('span', {class: 'sh-chip sh-chip-amber'}, 'SAMPLE')),
    ...Object.keys(SAMPLE).map((f) => el('button', {type: 'button', class: 'sh-fw-file', 'data-file': f, on: {dblclick: () => { if (!S.open.includes(f)) S.open.push(f); S.active = f; renderEditor(); }, click: () => { if (!S.open.includes(f)) S.open.push(f); S.active = f; renderEditor(); }}}, icon('file', 16), f)),
    el('p', {class: 'sh-muted sh-mono'}, 'A fixed sample project. Opening a real firmware folder needs the desktop application.'));
  const device = el('div', {class: 'sh-fw-dev'}, el('div', {class: 'sh-fw-devhead'}, el('b', {class: 'sh-muted'}, 'DEVICE / TOOLCHAIN'), el('span', {class: 'grow'}), btn('CHECK', 'shFwCheck', demo('CHECK'), 'sh-sm'), btn('SCAN', 'shFwScan', demo('SCAN'), 'sh-sm')),
    ...SECTIONS.map(([t, rows]) => el('div', {class: 'sh-fw-sec'}, el('b', {class: 'sh-fw-sect'}, t), el('div', {class: 'sh-kv'}, ...rows.flatMap(([k, v]) => [el('span', {class: 'sh-muted'}, k), el('b', {class: v === '—' ? 'sh-muted' : ''}, v)])))));
  host.append(el('div', {class: 'sh-fw-banner'}, el('span', {class: 'sh-chip sh-chip-amber'}, 'VISUAL DEMONSTRATION'), el('span', {}, 'Firmware Lab layout only — not a working compiler or uploader. Nothing is built, flashed or connected.')),
    el('div', {class: 'sh-fw-strip', id: 'shFwStrip'}, ...STRIP.map(([k, g, v]) => el('div', {class: 'sh-fw-st'}, icon(g, 18), el('span', {}, el('i', {}, k), el('b', {class: v.startsWith('NOT') || v === '—' ? 'sh-muted' : ''}, v))))),
    el('div', {class: 'sh-fw-actions'}, btn('VERIFY', 'shFwVerify', demo('VERIFY'), 'sh-action', 'check'), btn('UPLOAD', 'shFwUpload', demo('UPLOAD'), 'sh-action', 'play'), btn('CANCEL', 'shFwCancel', demo('CANCEL'), 'sh-action sh-neutral', 'stop'), btn('SERIAL / TRANSPORT MONITOR', 'shFwMonitor', demo('MONITOR'), 'sh-action sh-neutral', 'terminal')),
    el('div', {class: 'sh-fw-main'}, el('section', {class: 'sh-fw-pane'}, el('b', {class: 'sh-fw-title'}, 'PROJECT'), tree), el('section', {class: 'sh-fw-pane sh-fw-editor'}, el('b', {class: 'sh-fw-title'}, 'EDITOR'), tabsEl, code), el('section', {class: 'sh-fw-pane'}, device)),
    el('div', {class: 'sh-fw-bpane'}, bottomTabs, bottom));
  renderEditor(); renderBottom();
  return {root: host};
}

/* ======================================================================== MYELINOSCOPE (Digital Oscilloscope) ======================================================================== */
const TIME_DIVS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2], AMP_DIVS = [0.05, 0.1, 0.2, 0.5, 1, 2];
const EPISODES = [['#021', 'Heart', 504], ['#019', 'Heart', 412], ['#017', 'Heart', 438], ['#015', 'Heart', 331]];
const PREVIEW_S = 10;
const ecgAt = (i) => ecgValue(((i % (PREVIEW_S * RATE)) + PREVIEW_S * RATE) % (PREVIEW_S * RATE));   // a repeating 10 s preview, like the instrument's "repeating Ns preview"
const g3 = (v, d = 3) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);

export function createScope({onChange = () => {}} = {}) {
  const S = {state: 'DISCONNECTED', episode: null, ch: 'CH1', ti: 4, ai: 3, frozen: false, advanced: false, display: 'TRIGGERED', trig: 'AUTO', edge: 'RISING', level: 0.3, filter: 'RAW', tc: false, vc: false, t0: performance.now(), hold: 0};
  const host = el('div', {class: 'sh-scope', id: 'shScope'});
  const $$ = (s) => host.querySelector(s);
  const now = () => (S.frozen ? S.hold : (performance.now() - S.t0) / 1000);
  const rec = () => S.state === 'RECORDED';
  const win = () => TIME_DIVS[S.ti] * 10;

  function window_() {   // the samples of the current view (oldest..newest) and the time of the first one
    const w = win(), n = Math.max(2, Math.round(w * RATE)), tNow = rec() ? 0 : now();
    let start = rec() ? 0 : tNow - w, trig = 'UNTRIGGERED';
    if (!rec() && S.display === 'TRIGGERED' && S.trig !== 'OFF') {   // align the first rising / falling crossing of the level inside the older half of a 2x window
      const base = Math.floor((tNow - 2 * w) * RATE); let found = null;
      for (let i = base; i < base + n; i++) { const a = ecgAt(i), b = ecgAt(i + 1); if (S.edge === 'RISING' ? a < S.level && b >= S.level : a > S.level && b <= S.level) { found = i; break; } }
      if (found !== null) { start = (found + 1) / RATE - 0.2 * w; trig = 'TRIGGERED'; } else if (S.trig !== 'AUTO') trig = 'WAITING';
    } else if (!rec() && S.display === 'ROLL') trig = 'ROLL';
    const i0 = Math.round(start * RATE), vals = [];
    for (let i = 0; i < n; i++) vals.push(ecgAt(i0 + i));
    if (S.filter === 'FILTERED') { let lp = vals[0], hp = vals[0]; const a1 = 1 - Math.exp(-2 * Math.PI * 40 / RATE), a2 = 1 - Math.exp(-2 * Math.PI * 0.5 / RATE); for (let i = 0; i < n; i++) { lp += a1 * (vals[i] - lp); hp += a2 * (lp - hp); vals[i] = lp - hp; } }
    return {vals, start, w, trig, n};
  }
  function draw() {
    const cv = $$('#shScopeCv'); if (!cv || cv.offsetParent === null) return;
    const d = window_(), amp = AMP_DIVS[S.ai], half = amp * 4, cursors = [];
    if (S.tc) cursors.push({kind: 't', pos: 0.25 * d.w, name: 'T1'}, {kind: 't', pos: 0.75 * d.w, name: 'T2'});
    if (S.vc) cursors.push({kind: 'v', pos: half * 0.5, name: 'V1'}, {kind: 'v', pos: -half * 0.5, name: 'V2'});
    drawPlot(cv, {values: d.vals, count: d.n, alignLeft: true, range: [-half, half], ticks: Array.from({length: 9}, (_, i) => -half + i * amp), title: `${S.ch} (mV)`, tmin: 0, tmax: d.w, xticks: 10, xlabel: `${TIME_DIVS[S.ti]} s / div`, fmt: (v) => g3(v, amp < 0.1 ? 2 : 1), cursors, label: S.filter === 'FILTERED' ? 'SIMULATED ECG · FILTERED' : 'SIMULATED ECG', left: 52, bottom: 30});
    const lo = Math.min(...d.vals), hi = Math.max(...d.vals), mean = d.vals.reduce((s, v) => s + v, 0) / d.n, rms = Math.sqrt(d.vals.reduce((s, v) => s + v * v, 0) / d.n);
    $$('#shScopeStatus').textContent = `SIMULATED ECG · ${rec() ? 'RECORDED EXCERPT' : 'LOCAL SIMULATION'} • ${rec() ? 'READ-ONLY' : S.frozen ? 'FROZEN' : 'LIVE'} • ${S.display} · ${S.trig} • ${d.trig} • ${S.filter}`;
    $$('#shScopeCursor').textContent = (S.tc || S.vc) ? [S.tc ? `T1 ${g3(0.25 * d.w)} s   T2 ${g3(0.75 * d.w)} s   Δt ${g3(0.5 * d.w)} s   1/Δt ${g3(1 / (0.5 * d.w))} Hz` : '', S.vc ? `V1 ${g3(half * 0.5)} mV   V2 ${g3(-half * 0.5)} mV   ΔV ${g3(half)} mV` : ''].filter(Boolean).join('\n') : 'CURSORS OFF';
    $$('#shScopeMeas').textContent = `CURRENT VIEW · ${S.filter}\nMIN ${g3(lo)} mV   MAX ${g3(hi)} mV   P–P ${g3(hi - lo)} mV\nMEAN ${g3(mean)} mV   RMS ${g3(rms)} mV   N ${d.n}   WINDOW ${g3(d.w)} s   RATE ${RATE} Hz`;
  }
  function sync() {
    const dis = S.state === 'DISCONNECTED';
    $$('#shScopePlaceholder').hidden = !dis; $$('#shScopeWork').hidden = dis;
    if (!dis) {
      $$('#shScopeState').textContent = rec() ? 'RECORDED • READ-ONLY' : '● MYELINOSCOPE CONNECTED';
      $$('#shScopeSource').textContent = rec() ? `SOURCE: SIMULATED EXCERPT · HEART • ECG · ${RATE} Hz · first ${Math.min(60, S.episode[2])} s of ${S.episode[2]} s episode` : `SOURCE: SIMULATED · HEART • ECG · ${RATE} Hz · repeating ${PREVIEW_S} s preview`;
      $$('#shScopeEpisodeLbl').textContent = rec() ? S.episode[0] : 'Ready for episode inspection';
      $$('#shScopeClose').hidden = !rec(); $$('#shScopeFreeze').disabled = rec(); $$('#shScopeFreeze span').textContent = S.frozen ? 'RUN' : 'FREEZE';
      $$('#shScopeBadge').textContent = rec() ? 'SIMULATED ECG · RECORDED EXCERPT' : 'SIMULATED ECG · LOCAL SIMULATION';
      const ch2 = S.ch === 'CH2'; $$('#shScopeNote').hidden = !ch2; $$('#shScopeCv').hidden = ch2; $$('#shScopeCh2Blank').hidden = !ch2;
      for (const id of ['#shScopeTime', '#shScopeAmp']) $$(id).disabled = false; $$('#shScopeAmp').disabled = ch2;
      $$('#shScopeTimeVal').textContent = `${TIME_DIVS[S.ti]} s / div`; $$('#shScopeAmpVal').textContent = `${AMP_DIVS[S.ai]} mV / div`;
      for (const b of host.querySelectorAll('.sh-chbtn')) b.setAttribute('aria-pressed', String(b.dataset.ch === S.ch));
      $$('#shScopeTime').value = S.ti; $$('#shScopeAmp').value = S.ai; $$('#shScopeDisplay').value = S.display; $$('#shScopeTrig').value = S.trig; $$('#shScopeEdge').value = S.edge; $$('#shScopeLevel').value = S.level; $$('#shScopeFilter').value = S.filter; $$('#shScopeTc').checked = S.tc; $$('#shScopeVc').checked = S.vc;
      $$('#shScopeAdv').hidden = !S.advanced; $$('#shScopeAdvToggle').textContent = `ADVANCED CONTROLS  ${S.advanced ? '▾' : '▸'}`;
    }
    for (const r of host.querySelectorAll('[data-analyze]')) r.disabled = S.state === 'RECORDED' && S.episode && r.dataset.analyze === S.episode[0];
    draw(); onChange();
  }
  const set = (patch) => { Object.assign(S, patch); sync(); };
  function toggleFreeze() { if (S.frozen) { S.t0 = performance.now() - S.hold * 1000; S.frozen = false; } else { S.hold = (performance.now() - S.t0) / 1000; S.frozen = true; } sync(); }
  const sel = (id, label, opts, key) => el('label', {class: 'sh-fld'}, el('span', {}, label), el('select', {id, class: 'sh-select', on: {change: (e) => set({[key]: e.target.value})}}, ...opts.map((o) => el('option', {value: Array.isArray(o) ? o[0] : o}, Array.isArray(o) ? o[1] : o))));
  const slider = (id, valId, label, max, key, ends) => el('div', {class: 'sh-sl'}, el('div', {class: 'sh-sl-h'}, el('span', {class: 'sh-lbl'}, label), el('b', {id: valId, class: 'sh-mono'})),
    el('div', {class: 'sh-sl-t'}, el('span', {class: 'sh-mono sh-muted'}, ends[0]), el('input', {type: 'range', id, min: '0', max: String(max), step: '1', value: String(S[key]), 'aria-label': label, on: {input: (e) => set({[key]: +e.target.value})}}), el('span', {class: 'sh-mono sh-muted'}, ends[1])));
  const chip = (id, name, role, ok) => el('button', {type: 'button', class: 'sh-chbtn', id, 'data-ch': name, 'data-connected': String(ok), 'aria-pressed': String(name === 'CH1'), on: {click: () => set({ch: name})}}, el('b', {}, name), el('span', {}, role), el('i', {class: ok ? 'sh-grn' : 'sh-red'}, ok ? 'ACTIVE' : 'NOT CONNECTED'));
  host.append(
    el('div', {class: 'sh-scope-ph', id: 'shScopePlaceholder'}, el('b', {class: 'sh-scope-nc', id: 'shScopeNc'}, '○ MYELINOSCOPE NOT CONNECTED'), el('p', {}, 'Detailed signal inspection is currently inactive.\nConnect when deeper inspection is required.'),
      btn('CONNECT MYELINOSCOPE', 'shScopeConnect', () => set({state: 'CONNECTED', episode: null, t0: performance.now(), frozen: false}), 'sh-primary')),
    el('div', {class: 'sh-scope-work', id: 'shScopeWork', hidden: true}, el('b', {class: 'sh-cyan sh-scope-st', id: 'shScopeState'}), el('span', {class: 'sh-mono sh-muted', id: 'shScopeSource'}), el('b', {id: 'shScopeEpisodeLbl'}),
      el('span', {class: 'sh-badge2', id: 'shScopeBadge'}),
      el('div', {class: 'sh-chrow'}, chip('shScopeCh1', 'CH1', 'PRIMARY', true), chip('shScopeCh2', 'CH2', 'FUTURE SECOND BIOAMP', false)),
      el('p', {class: 'sh-muted', id: 'shScopeNote', hidden: true}, 'CH2 is NOT CONNECTED. It is reserved for a future second BioAmp and shows no signal; the amplitude controls act on CH1 only, so they are paused while CH2 is selected.'),
      el('canvas', {class: 'sh-scope-cv', id: 'shScopeCv', role: 'img', 'aria-label': 'Simulated ECG oscilloscope trace'}), el('div', {class: 'sh-scope-blank', id: 'shScopeCh2Blank', hidden: true}, 'CH2 — NOT CONNECTED — no signal'),
      el('div', {class: 'sh-scales'}, slider('shScopeTime', 'shScopeTimeVal', 'TIME / DIV  ·  horizontal', TIME_DIVS.length - 1, 'ti', ['0.01 s', '2 s']), slider('shScopeAmp', 'shScopeAmpVal', 'AMPLITUDE / DIV  ·  vertical', AMP_DIVS.length - 1, 'ai', ['0.05 mV', '2 mV'])),
      el('div', {class: 'sh-simbar'}, btn('FREEZE', 'shScopeFreeze', toggleFreeze, 'sh-sm'), btn('RESET', 'shScopeReset', () => set({ti: 4, ai: 3, frozen: false, t0: performance.now(), display: 'TRIGGERED', trig: 'AUTO', edge: 'RISING', level: 0.3, filter: 'RAW', tc: false, vc: false}), 'sh-sm')),
      el('p', {class: 'sh-mono sh-muted', id: 'shScopeStatus'}),
      el('button', {type: 'button', class: 'sh-advtoggle', id: 'shScopeAdvToggle', on: {click: () => set({advanced: !S.advanced})}}),
      el('div', {class: 'sh-adv', id: 'shScopeAdv', hidden: true}, el('b', {class: 'sh-cyan'}, 'TRIGGER'), el('div', {class: 'sh-adv-g'}, sel('shScopeDisplay', 'DISPLAY', ['TRIGGERED', 'ROLL'], 'display'), sel('shScopeTrig', 'TRIGGER', ['OFF', 'AUTO', 'NORMAL', 'SINGLE'], 'trig'), sel('shScopeEdge', 'EDGE', ['RISING', 'FALLING'], 'edge'),
        el('label', {class: 'sh-fld'}, el('span', {}, 'LEVEL (mV)'), el('input', {type: 'number', id: 'shScopeLevel', class: 'sh-select', step: '0.1', value: '0.3', on: {input: (e) => set({level: +e.target.value || 0})}}))),
        el('b', {class: 'sh-cyan'}, 'SIGNAL VIEW'), sel('shScopeFilter', 'RAW / FILTERED', [['RAW', 'RAW'], ['FILTERED', 'FILTERED · 0.5–40 Hz']], 'filter'),
        el('b', {class: 'sh-cyan'}, 'CURSOR MEASUREMENTS'), el('div', {class: 'sh-adv-g'}, el('label', {class: 'sh-chk'}, el('input', {type: 'checkbox', id: 'shScopeTc', on: {change: (e) => set({tc: e.target.checked})}}), 'T1 / T2  time cursors'), el('label', {class: 'sh-chk'}, el('input', {type: 'checkbox', id: 'shScopeVc', on: {change: (e) => set({vc: e.target.checked})}}), 'V1 / V2  voltage cursors')),
        el('pre', {class: 'sh-mono sh-readout', id: 'shScopeCursor'}), el('b', {class: 'sh-cyan'}, 'CURRENT-VIEW MEASUREMENTS'), el('pre', {class: 'sh-mono sh-readout', id: 'shScopeMeas'})),
      el('div', {class: 'sh-simbar'}, btn('CLOSE EPISODE', 'shScopeClose', () => set({state: 'CONNECTED', episode: null, t0: performance.now(), frozen: false}), 'sh-sm'), el('span', {class: 'grow'}), btn('DISCONNECT MYELINOSCOPE', 'shScopeDisconnect', () => set({state: 'DISCONNECTED', episode: null, frozen: false}), 'sh-sm'))),
    el('b', {class: 'sh-cyan sh-scope-h'}, 'EPISODE ANALYSIS'), el('p', {class: 'sh-muted'}, 'Open an episode for recorded, read-only inspection. The current catalog contains simulated sample episodes.'),
    el('div', {class: 'sh-eplist', id: 'shScopeEpisodes'}, ...EPISODES.map(([id, kind, dur]) => el('div', {class: 'sh-row sh-ep'}, el('b', {}, id), el('span', {class: 'sh-muted'}, `${kind} • ECG · SIMULATED · ${Math.floor(dur / 60)}:${pad(dur % 60)}`), el('span', {class: 'grow'}), btn('ANALYZE', `shAnalyze${id.slice(1)}`, () => set({state: 'RECORDED', episode: [id, kind, dur], frozen: false}), 'sh-sm')))));
  for (const b of host.querySelectorAll('.sh-ep button')) b.dataset.analyze = b.closest('.sh-ep').firstChild.textContent;
  sync();
  return {root: host, draw, running: () => S.state === 'CONNECTED' && !S.frozen && host.isConnected && host.offsetParent !== null, sync, get state() { return S; }};
}
