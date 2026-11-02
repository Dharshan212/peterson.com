// SenseHub — LAB ANALYSIS (browser DEMONSTRATION of the Edge SenseHub page: SENSEHUB/page.py + report_preview.py).
// Everything shown is a SIMULATED fixture or a button you pressed: Device Connections, the two channel traces (a deterministic generator, never a measurement), the event markers, the console and the
// episode history. No port is opened, nothing is acquired, nothing is stored. Phone pickup / return markers are a DEMONSTRATION addition: the accepted Edge build contains no phone-sensing feature.
import {el} from './dom.js';
import {icon, SIGNALS, RATE, WINDOW, drawPlot} from './sensehub-core.js';

const pad = (n, w = 2) => String(n).padStart(w, '0');
const clockText = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(Math.floor(s % 60))}`;
const STATUS = {CONNECTED: 'green', WAITING: 'amber', DISCONNECTED: 'red'}, ORDER = ['CONNECTED', 'WAITING', 'DISCONNECTED'];
const DEVICES = [['ESP32', 'Microcontroller', 'chip', 'CONNECTED', 'Port: COM3   |   FW: v1.2.0'], ['ADC', 'Analog-to-Digital Converter', 'adc', 'WAITING', 'Interface: SPI   |   S/N: ADC-001'], ['BioAmp EXG', 'Biosignal Amplifier', 'amp', 'CONNECTED', 'Interface: I2C   |   S/N: BA-EXG-042']];
const EVENTS0 = [['23:14:02.341', 'SenseHub Episode Started', 'SYS', 'Lab analysis session init...', 'cyan'], ['23:14:08.127', 'SINE-1 Triggered', 'BRAIN', 'Sample marker (stage 1)', 'purple'], ['23:14:12.903', 'SINE-2 Triggered', 'BRAIN', 'Sample marker (stage 2)', 'purple'],
  ['23:14:18.556', 'SINE-3 Triggered', 'BRAIN', 'Sample marker (stage 3)', 'purple'], ['23:14:26.114', 'Verified Return', 'BRAIN', 'Signal returned to baseline', 'green']];
const CONSOLE0 = [['23:14:02', 'SYS', 'SenseHub initialized', ''], ['23:14:02', 'SCAN', 'Searching serial ports...', ''], ['23:14:03', 'USB', 'COM5 detected', 'COM5'], ['23:14:03', 'ESP32', 'Handshake request sent', ''], ['23:14:03', 'ESP32', 'SENSEHUB_EDGE_V0.1', ''],
  ['23:14:04', 'ADC', 'ADS1115 detected', ''], ['23:14:04', 'ADC', 'Channel 0 ready', ''], ['23:14:04', 'BIOAMP', 'Input stream active', ''], ['23:14:05', 'RATE', '250 samples/sec', ''], ['23:14:05', 'STREAM', 'START', 'START'], ['23:14:06', null, 'RX > 18243,18239,18250...', '']];
const HISTORY0 = [['#021', 'Heart', '2025-04-25  14:32:18', '00:08:24', 'COMPLETED'], ['#020', 'Brain', '2025-04-24  10:15:03', '00:12:17', 'COMPLETED'], ['#019', 'Heart', '2025-04-23  16:41:55', '00:06:52', 'COMPLETED'], ['#018', 'Brain', '2025-04-22  09:28:11', '00:15:03', 'COMPLETED'],
  ['#017', 'Heart', '2025-04-21  13:05:44', '00:07:18', 'COMPLETED'], ['#016', 'Brain', '2025-04-20  11:22:37', '00:09:56', 'COMPLETED'], ['#015', 'Heart', '2025-04-19  15:48:02', '00:05:31', 'COMPLETED'], ['#010', 'Brain', '2025-04-14  09:51:30', '00:09:12', 'REVIEW']];
const OV_LEFT = [['Episode ID', '#021'], ['Type', 'Heart (ECG)'], ['Start Time', '2025-04-25  14:32:18'], ['Duration', '00:08:24 (504 s)'], ['Device', 'SenseHub v1.2.0 (ESP32)'], ['Subject', 'Lab Sample 03']];
const OV_RIGHT = [['Samples (Total)', '100,800'], ['Heart Samples', '50,400 (250 Hz)'], ['Brain Samples', '50,400 (250 Hz)'], ['Firmware', 'v1.2.0'], ['Acquisition Mode', 'Dual Channel'], ['Analysis Version', 'v0.1.0']];
const TYPES = {
  HEART: {key: 'HEART', stream: 'ECG · CH1', glyph: 'heart', role: 'red', blurb: "Cardiac evidence only: ECG signal around the episode's events.", device: 'SenseHub v1.2.0 (ESP32) · ADC ADS1115 · BioAmp EXG', channel: 'CH1 — Heart (ECG) · 250 Hz', overview: 'ECG OVERVIEW — whole episode (sample)', sig: 'ecg',
    columns: ['HR before → after (bpm)', 'R-R shift (ms)', 'Response latency (ms)'], rows: [['72.0 → 73.4', '−9.1', '340'], ['72.1 → 78.6', '−28.4', '312'], ['72.4 → 80.2', '−35.0', '298'], ['79.8 → 73.1', '+33.2', '410']],
    metrics: [['HR (mean)', '72 bpm'], ['R-R (mean)', '832 ms'], ['Peak amplitude', '1.12 mV'], ['Signal quality (SNR)', '0.96 · high']]},
  BRAIN: {key: 'BRAIN', stream: 'EXG · CH2', glyph: 'brain', role: 'cyan', blurb: "Brain/EXG evidence only: EXG signal around the episode's events.", device: 'SenseHub v1.2.0 (ESP32) · ADC ADS1115 · BioAmp EXG', channel: 'CH2 — Brain (EXG) · 250 Hz', overview: 'EXG OVERVIEW — whole episode (sample)', sig: 'exg',
    columns: ['RMS before → after (µV)', 'Peak change (µV)', 'Response latency (ms)'], rows: [['17.9 → 19.2', '+6.1', '280'], ['18.1 → 22.4', '+14.8', '255'], ['18.4 → 24.9', '+19.6', '240'], ['23.8 → 18.6', '−12.2', 'n/a']],
    metrics: [['RMS', '18.4 µV'], ['Peak', '73.2 µV'], ['Band', '0.5 – 50 Hz · band power later'], ['Signal quality', '0.91 · good']]}
};
const REPORT_EVENTS = [['SINE-1', 102, '14:34:00'], ['SINE-2', 247, '14:36:25'], ['SINE-3', 389, '14:38:47'], ['VERIFIED RETURN', 472, '14:40:10']];

export function createLab({T, onFrameNeeded}) {
  const S = {tab: 'live', run: 'idle', acc: 0, t0: 0, mode: 0, status: DEVICES.map((d) => d[3]), phone: 'ON DESK', phoneAt: 0, selected: '#021', demo: 0, episode: '--', report: null, quarter: -1,
    console: CONSOLE0.map(([s, g, m, h]) => ({stamp: s, tag: g, msg: m, hl: h})), events: EVENTS0.map(([t, e, c, d, r]) => ({t, e, c, d, r})), history: HISTORY0.map(([id, type, at, dur, st]) => ({id, type, at, dur, st, demo: false}))};
  const now = () => performance.now();
  const elapsed = () => (S.run === 'running' ? S.acc + (now() - S.t0) / 1000 : S.acc);
  const stamp = (d = new Date()) => `${T.time(d.toISOString())}.${pad(d.getMilliseconds(), 3)}`;
  const $$ = (sel, root = host) => root.querySelector(sel);
  const cache = {ecg: [], exg: []};
  const sample = (k, i) => { const c = cache[k]; return c[i] ?? (c[i] = SIGNALS[k].value(i)); };

  /* ---------------- log / markers ---------------- */
  function log(tag, msg, hl = '') { S.console.push({stamp: T.time(new Date().toISOString()), tag, msg, hl}); if (S.console.length > 300) S.console.shift(); renderConsole(); }
  function addEvent(e, c, d, r) { S.events.push({t: stamp(), e, c, d, r}); if (S.events.length > 14) S.events.shift(); renderEvents(); }

  /* ---------------- device connections ---------------- */
  function setStatus(i, next) { if (S.status[i] === next) return; S.status[i] = next; log(DEVICES[i][0].toUpperCase().replace(' ', ''), `status → ${next} (simulated)`); renderDevices(); }
  function renderDevices() {
    const box = $$('#shDevices'); if (!box) return;
    box.replaceChildren(...DEVICES.map((d, i) => {
      const role = STATUS[S.status[i]];
      return el('div', {class: 'sh-row sh-dev', 'aria-label': `${d[0]} — simulated device`, 'data-device': d[0]},
        el('div', {class: 'sh-dev-top'}, el('span', {class: 'sh-dev-ico'}, icon(d[2], 30)), el('div', {class: 'sh-dev-names'}, el('b', {}, d[0]), el('span', {}, d[1])),
          el('span', {class: 'sh-dot', 'data-role': role}), el('button', {type: 'button', class: 'sh-status', id: `shDev${i}`, 'data-tone': S.status[i].toLowerCase(), title: 'Simulated status — click to preview the next state', 'aria-label': `Device status ${S.status[i].toLowerCase()} (simulated)`,
            on: {click: () => setStatus(i, ORDER[(ORDER.indexOf(S.status[i]) + 1) % 3])}}, S.status[i])), el('div', {class: 'sh-meta'}, d[4]));
    }));
  }

  /* ---------------- channel cards ---------------- */
  function channelCard(kind) {
    const heart = kind === 'ecg', title = heart ? 'CH1 — HEART (ECG)' : 'CH2 — BRAIN (EXG)', stats = heart ? [['HR (BPM)', '72'], ['R-R (ms)', '832'], ['Amplitude (mV)', '1.12']] : [['RMS (µV)', '18.4'], ['Peak (µV)', '73.2'], ['Band (Hz)', '0.5 – 50']];
    const cv = el('canvas', {class: 'sh-trace', 'aria-label': `Simulated ${heart ? 'ECG' : 'EXG'} waveform, ${heart ? 'heart' : 'brain'} channel`, role: 'img'});
    const dot = el('span', {class: 'sh-dot', 'data-role': 'muted'}), badge = el('span', {class: 'sh-badge', 'data-role': 'muted'}, 'PREVIEW');
    const card = el('div', {class: 'sh-row sh-chan', id: heart ? 'shChHeart' : 'shChBrain'},
      el('div', {class: 'sh-chan-head'}, el('span', {class: heart ? 'sh-red' : 'sh-cyan'}, icon(heart ? 'heart' : 'brain', 22)), el('b', {}, title), el('span', {class: 'grow'}), dot, badge,
        el('span', {class: 'sh-chip2'}, heart ? '1 mV/div' : '50 µV/div'), el('span', {class: 'sh-chip2'}, '250 Hz'), el('span', {class: 'sh-chip sh-chip-amber'}, 'SIMULATED')),
      el('div', {class: 'sh-chan-body'}, cv, el('div', {class: 'sh-stat'}, ...stats.flatMap(([c, v]) => [el('span', {}, c), el('b', {}, v)]), el('i', {}, 'sample values'))));
    return {card, cv, kind, setRun(state) { const [t, r] = {idle: ['PREVIEW', 'muted'], running: ['LIVE (DEMO)', 'green'], paused: ['PAUSED', 'amber']}[state]; badge.textContent = t; badge.dataset.role = r; dot.dataset.role = r; }};
  }
  const heart = channelCard('ecg'), brain = channelCard('exg');

  function drawChannel(ch, el_) {
    if (!ch.card.isConnected || ch.card.offsetParent === null) return;
    const k = ch.kind, sig = SIGNALS[k], vals = [];
    if (S.run === 'idle') for (let i = 0; i < WINDOW; i++) vals.push(sample(k, i));
    else { const target = Math.floor(el_ * RATE); for (let i = Math.max(0, target - WINDOW + 1); i <= target; i++) vals.push(sample(k, i)); }
    drawPlot(ch.cv, {values: vals, count: WINDOW, range: sig.range, ticks: sig.ticks, title: sig.title, label: sig.label, fmt: (v) => (k === 'ecg' ? v.toFixed(1) : v.toFixed(0))});
  }
  function frame() {
    if (S.report || S.tab !== 'live') return;
    const e = elapsed();
    if (heart.card.offsetParent !== null) {
      if (S.mode !== 2) drawChannel(heart, e);
      if (S.mode !== 1) drawChannel(brain, e);
    }
    const q = Math.floor(e * 4);
    if (q !== S.quarter || S.run !== 'running') { S.quarter = q; readouts(e); }
  }
  function readouts(e) {
    const set = (id, t, role) => { const n = $$(id); if (!n) return; if (n.textContent !== t) n.textContent = t; if (role) n.dataset.role = role; };
    set('#shElapsed', clockText(e)); set('#shSamples', Math.floor(e * RATE).toLocaleString('en-US'));
    const [t, r] = {idle: ['NO DATA', 'muted'], running: ['DEMO SIGNAL', 'green'], paused: ['HELD', 'amber']}[S.run];
    set('#shSignal', t, r); set('#shEpisode', S.run === 'idle' ? '--' : S.episode);
  }
  function setRun(state) {
    S.run = state; heart.setRun(state); brain.setRun(state);
    const idle = state === 'idle', b = (id) => $$(id);
    b('#shStart').disabled = !idle; b('#shPause').disabled = idle; b('#shStop').disabled = idle; b('#shPause').lastChild.textContent = state === 'paused' ? 'RESUME' : 'PAUSE';
    b('#shPause').firstChild.replaceWith(icon(state === 'paused' ? 'play' : 'pause', 16)); S.quarter = -1; readouts(elapsed()); frame(); onFrameNeeded();
  }
  function start() {
    S.acc = 0; S.t0 = now(); S.demo += 1; S.episode = `DEMO-${pad(S.demo)}`; setRun('running');
    log('STREAM', 'START (simulated)', 'START'); addEvent('SenseHub Episode Started', 'SYS', `Simulated episode ${S.episode}`, 'cyan');
  }
  function pause() {
    if (S.run === 'running') { S.acc += (now() - S.t0) / 1000; setRun('paused'); log('STREAM', 'PAUSE (simulated)'); }
    else if (S.run === 'paused') { S.t0 = now(); setRun('running'); log('STREAM', 'RESUME (simulated)', 'RESUME'); }
  }
  function stop() {
    const secs = Math.round(elapsed()), kind = S.mode === 0 ? 'Heart + Brain' : S.mode === 1 ? 'Heart' : 'Brain', d = new Date();
    S.history.unshift({id: `#${S.episode}`, type: kind, at: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${T.time(d.toISOString())}`, dur: clockText(secs), st: 'COMPLETED', demo: true, secs, mode: S.mode});
    S.acc = 0; setRun('idle'); log('STREAM', `STOP — ${S.episode} ${clockText(secs)} (simulated)`); renderHistory();
  }

  /* ---------------- panels ---------------- */
  const panel = (title, ico, chipText, ...extra) => el('section', {class: 'sh-panel'}, el('div', {class: 'sh-panel-head'}, icon(ico, 20), el('h3', {}, title), chipText ? el('span', {class: 'sh-chip sh-chip-amber'}, chipText) : null, el('span', {class: 'grow'}), ...extra));
  const btn = (label, id, fn, cls = '', ico = null) => el('button', {type: 'button', class: `sh-btn ${cls}`, id, on: {click: fn}}, ico ? icon(ico, 16) : null, el('span', {}, label));

  function devicesPanel() {
    const p = panel('Device Connections', 'plug', 'SIMULATED DEVICES');
    const note = el('p', {class: 'sh-mono sh-note', id: 'shConnectNote'}, 'Control Station link: not connected (prototype).');
    p.append(el('div', {id: 'shDevices', class: 'sh-devices'}),
      el('div', {class: 'sh-simbar'}, el('span', {class: 'sh-lbl'}, 'SIMULATE DEVICE STATES:'), btn('CONNECT ALL', 'shAllOn', () => DEVICES.forEach((_, i) => setStatus(i, 'CONNECTED')), 'sh-sm'), btn('DISCONNECT ALL', 'shAllOff', () => DEVICES.forEach((_, i) => setStatus(i, 'DISCONNECTED')), 'sh-sm')),
      el('button', {type: 'button', class: 'sh-connect', id: 'shConnect', 'aria-label': 'Connect to Control Station', on: {click: () => { note.textContent = 'Prototype only — no link is made in this phase.'; }}}, icon('monitor', 28), el('span', {}, 'CONNECT TO CONTROL STATION'), icon('chevron', 20)), note);
    return p;
  }
  function signalPanel() {
    const mode = el('select', {class: 'sh-select', id: 'shMode', 'aria-label': 'Signal mode (simulated)', on: {change: (e) => { S.mode = e.target.selectedIndex; heart.card.hidden = S.mode === 2; brain.card.hidden = S.mode === 1; frame(); }}},
      ...['Dual Channel (Heart + Brain)', 'Heart only (ECG)', 'Brain only (EXG)'].map((t) => el('option', {}, t)));
    const p = panel('Signal Acquisition', 'ecg', 'SIMULATED SIGNAL', mode);
    const ro = (cap, id, v, muted) => el('div', {class: 'sh-ro'}, el('span', {}, cap), el('b', {id, 'data-role': muted ? 'muted' : ''}, v));
    p.append(heart.card, brain.card, el('div', {class: 'sh-controls'}, el('div', {class: 'sh-ctl-btns'}, btn('START', 'shStart', start, 'sh-start', 'play'), btn('PAUSE', 'shPause', pause, 'sh-pause', 'pause'), btn('STOP', 'shStop', stop, 'sh-stop', 'stop')),
      el('div', {class: 'sh-readouts'}, ro('Elapsed:', 'shElapsed', '00:00:00'), ro('Samples:', 'shSamples', '0'), ro('Signal:', 'shSignal', 'NO DATA', true), ro('Episode ID:', 'shEpisode', '--'))),
      el('p', {class: 'sh-mono sh-note'}, 'Simulated waveforms from a deterministic generator — no ESP32, ADC or BioAmp is read.'));
    return p;
  }
  const dotFor = (r) => el('span', {class: 'sh-dot', 'data-role': r});
  function renderEvents() {
    const t = $$('#shEvents'); if (!t) return;
    t.replaceChildren(...['Time', 'Event', 'Channel', 'Details'].map((h) => el('span', {class: 'sh-th'}, h)), ...S.events.flatMap((e) => [el('span', {class: 'sh-mono sh-muted'}, e.t), el('span', {class: 'sh-ev'}, dotFor(e.r), e.e), el('span', {class: 'sh-mono sh-ch', 'data-ch': e.c}, e.c), el('span', {class: 'sh-muted'}, e.d)]));
    const ph = $$('#shPhone'); if (ph) { ph.textContent = `PHONE (DEMO): ${S.phone}`; ph.dataset.role = S.phone === 'ON DESK' ? 'muted' : 'amber'; }
    const pk = $$('#shMkPick'), rt = $$('#shMkReturn'); if (pk) { pk.disabled = S.phone !== 'ON DESK'; rt.disabled = S.phone === 'ON DESK'; }
  }
  function markersPanel() {
    const mark = (id, label, fn) => btn(label, id, fn, 'sh-sm');
    const stage = (n) => () => addEvent(`SINE-${n} Triggered`, 'BRAIN', `Demonstration marker (stage ${n})`, 'purple');
    const pick = () => { S.phone = 'PICKED UP'; S.phoneAt = now(); addEvent('Phone Pickup', 'SENSE', 'Demonstration event — phone sensing is not part of the accepted Edge build', 'amber'); log('SENSE', 'phone pickup (demonstration, simulated)'); };
    const back = () => { const away = Math.max(0, Math.round((now() - S.phoneAt) / 1000)); S.phone = 'ON DESK'; addEvent('Phone Return', 'SENSE', `Away ${clockText(away).slice(3)} — demonstration event, not an Edge feature`, 'green'); log('SENSE', `phone return after ${away} s (demonstration, simulated)`); };
    const p = panel('Active Event Markers', 'flag', 'DEMO VALUES', el('span', {class: 'sh-chip sh-chip-phone', id: 'shPhone'}, 'PHONE (DEMO): ON DESK'));
    p.append(el('div', {class: 'sh-table', id: 'shEvents'}),
      el('div', {class: 'sh-simbar sh-wrap'}, el('span', {class: 'sh-lbl'}, 'ADD DEMONSTRATION EVENT:'), mark('shMk1', 'SINE-1', stage(1)), mark('shMk2', 'SINE-2', stage(2)), mark('shMk3', 'SINE-3', stage(3)),
        mark('shMkVerified', 'VERIFIED RETURN', () => addEvent('Verified Return', 'BRAIN', 'Demonstration marker — signal returned to baseline', 'green')), mark('shMkPick', 'PHONE PICKUP', pick), mark('shMkReturn', 'PHONE RETURN', back)),
      el('p', {class: 'sh-mono sh-note'}, 'Sample timeline plus the demonstration events you add — no event is being recorded. SENSE phone events are a demonstration only.'));
    return p;
  }
  function renderConsole() {
    for (const id of ['#shConsole', '#shConsole2']) {
      const c = $$(id); if (!c) continue;
      c.replaceChildren(...S.console.map((l) => { const msg = l.hl ? l.msg.split(l.hl).flatMap((p, i, a) => (i < a.length - 1 ? [p, el('span', {class: 'sh-grn'}, l.hl)] : [p])) : [l.msg];
        return el('div', {}, el('span', {class: 'sh-muted'}, l.stamp + '  '), l.tag ? el('span', {class: l.tag === 'STREAM' ? 'sh-grn' : 'sh-cy'}, `[${l.tag}]`.padEnd(9, ' ')) : null, ...msg); }));
      c.scrollTop = c.scrollHeight;
    }
  }
  function consolePanel(id, minH) {
    const p = panel('Device Console', 'terminal', 'SAMPLE LOG'); const c = el('div', {class: 'sh-console', id, role: 'log', 'aria-label': 'Device console, sample log'}); c.style.minHeight = minH; p.append(c); return p;
  }

  /* ---------------- history ---------------- */
  function renderHistory() {
    const list = $$('#shHistory'); if (!list) return;
    list.replaceChildren(el('div', {class: 'sh-hist-head'}, ...['ID', 'TYPE', 'DATE / TIME', 'DURATION', 'STATUS'].map((h) => el('span', {}, h))),
      ...S.history.map((r) => el('div', {class: 'sh-row sh-hrow', 'data-ep': r.id, 'data-selected': String(r.id === S.selected), tabindex: '0', role: 'button', title: 'Select this episode', on: {click: () => select(r.id), keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(r.id); } }}},
        el('b', {}, r.id), el('span', {class: 'sh-htype'}, icon(r.type === 'Brain' ? 'brain' : 'heart', 18), r.type), el('span', {}, r.at), el('span', {class: 'sh-mono'}, r.dur), el('span', {class: 'sh-hstat', 'data-role': r.st === 'COMPLETED' ? 'green' : 'amber'}, dotFor(r.st === 'COMPLETED' ? 'green' : 'amber'), r.st))));
    renderOverview();
  }
  function select(id) { S.selected = id; renderHistory(); }
  function renderOverview() {
    const box = $$('#shOverview'); if (!box) return; const r = S.history.find((x) => x.id === S.selected) || S.history[0];
    let left = OV_LEFT.map((x) => x.slice()), right = OV_RIGHT.map((x) => x.slice());
    if (r.demo) {
      const per = r.mode === 0 ? 2 : 1, n = r.secs * 250;
      left = [['Episode ID', r.id], ['Type', r.type], ['Start Time', r.at], ['Duration', `${r.dur} (${r.secs} s)`], ['Device', 'SenseHub (simulated)'], ['Subject', 'Demonstration']];
      right = [['Samples (Total)', (n * per).toLocaleString('en-US')], ['Heart Samples', r.mode === 2 ? '0' : `${n.toLocaleString('en-US')} (250 Hz)`], ['Brain Samples', r.mode === 1 ? '0' : `${n.toLocaleString('en-US')} (250 Hz)`], ['Firmware', 'none (simulated)'], ['Acquisition Mode', ['Dual Channel', 'Heart only', 'Brain only'][r.mode]], ['Analysis Version', 'demonstration']];
    } else left[0][1] = r.id;
    const grid = (pairs) => el('div', {class: 'sh-kv'}, ...pairs.flatMap(([k, v]) => [el('span', {class: 'sh-muted'}, k), el('b', {}, v)]));
    box.replaceChildren(grid(left), grid(right));
  }

  /* ---------------- report flow (dummy layout) ---------------- */
  function openReport(episode) { S.report = {episode, kind: null, preview: false, status: ''}; renderReport(); apply(); }
  function renderReport() {
    const box = $$('#shReportBox'); if (!box) return; const R = S.report; if (!R) { box.replaceChildren(); return; }
    const top = el('div', {class: 'sh-rp-top'}, btn('←  BACK TO LAB ANALYSIS', 'shRpBack', () => { S.report = null; renderReport(); apply(); }, 'sh-ghost'), el('b', {class: 'sh-rp-title'}, 'GENERATE REPORT'), el('span', {class: 'sh-chip sh-chip-amber'}, 'DUMMY LAYOUT'), el('span', {class: 'sh-chip sh-chip-amber'}, 'SIMULATED'));
    if (!R.preview) {
      const card = (k) => { const t = TYPES[k]; return el('button', {type: 'button', class: 'sh-card', id: `shRpType${k}`, 'data-kind': k, 'aria-pressed': String(R.kind === k), on: {click: () => { R.kind = k; renderReport(); }}},
        el('span', {class: t.role === 'red' ? 'sh-red' : 'sh-cyan'}, icon(t.glyph, 44)), el('span', {class: 'sh-card-t'}, el('b', {class: t.role === 'red' ? 'sh-red' : 'sh-cyan'}, k), el('span', {class: 'sh-mono sh-muted'}, t.stream), el('span', {}, t.blurb))); };
      box.replaceChildren(top, el('section', {class: 'sh-panel sh-rp-select'}, el('h2', {class: 'sh-mono sh-rp-h'}, 'REPORT TYPE'), el('p', {class: 'sh-muted'}, 'Choose the evidence stream for this report. HEART and BRAIN are separate reports — they are never merged into one.'),
        el('p', {class: 'sh-mono', id: 'shRpEpisode'}, `Episode ${R.episode}   ·   Source SIMULATED`), el('div', {class: 'sh-cards'}, card('HEART'), card('BRAIN')),
        el('div', {class: 'sh-rp-act'}, btn('PREVIEW REPORT', 'shRpPreview', () => { R.preview = true; renderReport(); }, 'sh-primary'), el('span', {class: 'sh-mono sh-muted', id: 'shRpHint'}, R.kind ? `REPORT TYPE = ${R.kind}  —  press PREVIEW REPORT to continue.` : 'Select HEART or BRAIN to continue — the choice is required.'))));
      $$('#shRpPreview').disabled = !R.kind; return;
    }
    const t = TYPES[R.kind], sig = SIGNALS[t.sig];
    const mini = (title, off, secs, markers, h) => { const cv = el('canvas', {class: 'sh-mini', 'aria-label': title, role: 'img'}); cv.style.height = h + 'px'; const wrap = el('figure', {class: 'sh-fig'}, el('figcaption', {class: 'sh-mono'}, title), cv);
      queueMicrotask(() => { const vals = []; const n = secs * RATE; for (let i = 0; i < n; i += secs > 20 ? 20 : 1) vals.push(sample(t.sig, off + i)); drawPlot(cv, {values: vals, count: vals.length, range: sig.range, ticks: sig.ticks.filter((_, i) => i % 2 === 0), title: sig.unit, tmin: 0, tmax: secs, xticks: 4, xlabel: 'Time (s)', left: 44, bottom: 24, markers, label: 'SIMULATED', color: t.role === 'red' ? tokensRole('red') : undefined}); }); return wrap; };
    const tokensRole = (r) => getComputedStyle(document.documentElement).getPropertyValue(`--${r}`).trim() || '#F43F5E';
    const meta = [['Report Type', t.key], ['Episode', R.episode], ['Source', 'SIMULATED'], ['Duration', '00:08:24  (504 s)'], ['Session start', '2025-04-25  14:32:18'], ['Session end', '2025-04-25  14:40:42'], ['Device context', t.device], ['Signal channel', t.channel]];
    const paper = el('section', {class: 'sh-paper', id: 'shPaper'}, el('div', {class: 'sh-rp-head'}, el('b', {class: 'sh-mono sh-rp-big'}, 'LAB ANALYSIS REPORT'), el('span', {class: 'sh-chip sh-chip-amber'}, 'DUMMY LAYOUT · SAMPLE VALUES'), el('span', {class: 'grow'}), el('b', {class: `sh-mono ${t.role === 'red' ? 'sh-red' : 'sh-cyan'}`, id: 'shRpBadge'}, `REPORT TYPE = ${t.key}`)),
      el('div', {class: 'sh-kv sh-kv2'}, ...meta.flatMap(([k, v]) => [el('span', {class: 'sh-muted'}, k), el('b', {}, v)])),
      el('h3', {class: 'sh-mono sh-sec'}, 'EVENT SUMMARY'),
      el('div', {class: 'sh-etable'}, ...['Event', 'Time', 'Window', ...t.columns].map((h) => el('span', {class: 'sh-th'}, h)), ...REPORT_EVENTS.flatMap(([e, s, c], i) => [el('b', {class: e.startsWith('VERIFIED') ? 'sh-grn' : 'sh-purple'}, e), el('span', {class: 'sh-mono'}, `${s} s · ${c}`), el('span', {class: 'sh-mono'}, `${s - 10}–${s + 10} s`), ...t.rows[i].map((v) => el('b', {class: 'sh-mono'}, v))])),
      el('h3', {class: 'sh-mono sh-sec'}, 'SIGNAL ANALYSIS'), mini(t.overview, 0, 60, [[0.2, 'S1'], [0.4, 'S2'], [0.6, 'S3'], [0.85, 'R']], 130),
      el('div', {class: 'sh-minis'}, ...REPORT_EVENTS.map(([e], i) => mini(`${e} · −10 s … +10 s`, i * 1700 + 300, 4, [[0.5, '']], 112))),
      el('div', {class: 'sh-tiles'}, ...t.metrics.map(([k, v]) => el('div', {class: 'sh-tile'}, el('span', {class: 'sh-muted'}, k), el('b', {class: 'sh-mono'}, v)))),
      el('h3', {class: 'sh-mono sh-sec'}, 'ANALYST NOTES'), el('textarea', {class: 'sh-notes', 'aria-label': 'Analyst notes (placeholder)', placeholder: 'Analyst notes (editable, not saved — placeholder)'}),
      el('div', {class: 'sh-rp-foot'}, btn('CHANGE TYPE', 'shRpChange', () => { R.preview = false; renderReport(); }, 'sh-ghost'), el('span', {class: 'sh-mono sh-muted grow', id: 'shRpStatus'}, R.status || ''),
        btn('GENERATE PDF', 'shRpPdf', () => { R.status = `PDF placeholder — nothing was generated (REPORT TYPE = ${t.key}, episode ${R.episode}). The report format is not defined yet.`; $$('#shRpStatus').textContent = R.status; }, 'sh-primary'),
        btn('EXPORT CSV', 'shRpCsv', () => { R.status = `CSV placeholder — nothing was generated (REPORT TYPE = ${t.key}, episode ${R.episode}). The report format is not defined yet.`; $$('#shRpStatus').textContent = R.status; }, 'sh-primary')),
      el('p', {class: 'sh-mono sh-note'}, 'Dummy layout with sample values — the final report format will be specified later. Shows simulated signal quantities only; no diagnosis or interpretation.'));
    box.replaceChildren(top, paper);
  }

  /* ---------------- page ---------------- */
  const tabs = [['live', 'LIVE ANALYSIS', 'ecg'], ['history', 'EPISODE HISTORY', 'clock'], ['console', 'DEVICE CONSOLE', 'terminal']];
  const host = el('div', {class: 'sh-lab', id: 'shLab'});
  function apply() {
    const rep = !!S.report;
    $$('#shTabs').hidden = rep; for (const t of tabs) { $$(`#shTab_${t[0]}`).setAttribute('aria-selected', String(S.tab === t[0])); $$(`#shPane_${t[0]}`).hidden = rep || S.tab !== t[0]; }
    $$('#shReportBox').hidden = !rep; onFrameNeeded();
  }
  function show(tab) { S.tab = tab; apply(); frame(); }
  host.append(
    el('div', {class: 'sh-tabrow', id: 'shTabs'}, el('div', {class: 'sh-tabs', role: 'tablist', 'aria-label': 'Lab Analysis views'}, ...tabs.map(([k, l, g]) => el('button', {type: 'button', class: 'sh-tab', id: `shTab_${k}`, role: 'tab', on: {click: () => show(k)}}, icon(g, 20), el('span', {}, l)))),
      btn('GENERATE REPORT', 'shReportBtn', () => openReport(S.history[0].id), 'sh-report', 'report')),
    el('div', {id: 'shPane_live', role: 'tabpanel'}, el('div', {class: 'sh-grid sh-g57'}, devicesPanel(), signalPanel()), el('div', {class: 'sh-grid sh-g65'}, markersPanel(), consolePanel('shConsole', '170px'))),
    el('div', {id: 'shPane_history', role: 'tabpanel', hidden: true}, el('div', {class: 'sh-grid sh-g56'},
      (() => { const p = panel('Episode List', 'clock', 'SAMPLE DATA'); p.append(el('div', {id: 'shHistory'})); return p; })(),
      (() => { const p = panel('Episode Overview', 'flag', 'SAMPLE DATA', btn('GENERATE REPORT', 'shReportBtn2', () => openReport(S.selected), 'sh-report sh-sm', 'report')); p.append(el('div', {class: 'sh-ov', id: 'shOverview'}), el('p', {class: 'sh-mono sh-note'}, 'Sample values for the Edge fixtures; demonstration episodes you record show their own duration and sample counts. The report preview is a dummy layout.')); return p; })())),
    el('div', {id: 'shPane_console', role: 'tabpanel', hidden: true}, consolePanel('shConsole2', '420px'), el('p', {class: 'sh-mono sh-note'}, 'Sample log plus the simulated actions you take — no command input and no device output exist in this browser demonstration.')),
    el('div', {id: 'shReportBox', hidden: true}));
  renderDevices(); renderEvents(); renderConsole(); renderHistory(); heart.setRun('idle'); brain.setRun('idle'); setRun('idle');
  return {
    root: host, frame, show, setStatus, get state() { return S; },
    running: () => S.run === 'running' && S.tab === 'live' && !S.report && host.isConnected,
    refresh() { renderDevices(); renderEvents(); renderConsole(); renderHistory(); renderReport(); frame(); },
    ids: {tab: S.tab}
  };
}
