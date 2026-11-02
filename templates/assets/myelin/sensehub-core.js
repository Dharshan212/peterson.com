// SenseHub (MYELIN — Edge) browser DEMONSTRATION — shared pieces: glyphs, the simulated waveforms and the canvas plot.
// Reference (read-only): MYELIN_EDGE_TRIAL/SENSEHUB/glyphs.py and page.py (_ecg_value / _exg_value / _Trace). Everything drawn here is SIMULATED: a deterministic generator, not a body and not a device.
// No serial port, Bluetooth, ESP32, ADC, BioAmp, firmware or upload exists in this browser demonstration.

/* ---------------- glyphs (the Edge glyph set, 24 x 24 stroke units) ---------------- */
const P = {
  ecg: '<path d="M2 12H6Q7.5 8.5 9 12H10.5L12.5 3.5L15 19.5L16.5 12H22"/>',
  adc: '<path d="M2 12H6L8.5 4L12 20L15 8L17 12H22"/>',
  heart: '<path d="M12 20.5C5 15 2.5 11.5 2.5 8.5C2.5 5.6 4.7 3.5 7.3 3.5C9.3 3.5 11 4.6 12 6.2C13 4.6 14.7 3.5 16.7 3.5C19.3 3.5 21.5 5.6 21.5 8.5C21.5 11.5 19 15 12 20.5Z"/>',
  brain: '<g><path d="M12 4.6C10 2.8 6.6 3.4 6.1 6.4C3.8 6.9 3.2 10 4.8 11.4C3.6 13 4.4 15.6 6.4 16.2C6.6 18.8 9.6 20 12 18.6L12 4.6M7.6 9.6L10 10.6M7.6 13.6L10 13"/></g><g transform="translate(24 0) scale(-1 1)"><path d="M12 4.6C10 2.8 6.6 3.4 6.1 6.4C3.8 6.9 3.2 10 4.8 11.4C3.6 13 4.4 15.6 6.4 16.2C6.6 18.8 9.6 20 12 18.6L12 4.6M7.6 9.6L10 10.6M7.6 13.6L10 13"/></g>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9.5 3.5V7M9.5 17V20.5M12 3.5V7M12 17V20.5M14.5 3.5V7M14.5 17V20.5M3.5 9.5H7M17 9.5H20.5M3.5 12H7M17 12H20.5M3.5 14.5H7M17 14.5H20.5"/>',
  amp: '<path d="M8 4V20L20 12Z"/><path d="M3 9H8M3 15H8"/>',
  plug: '<path d="M6 8H18V11C18 14.5 15 16.5 12 16.5C9 16.5 6 14.5 6 11Z"/><path d="M9 3V8M15 3V8M12 16.5V21"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16V20M8 20H16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7V12L15.5 14"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9L10.5 12L7 15M12.5 15.5H17"/>',
  flag: '<path d="M5 3V21"/><path d="M5 4H18L14.5 8.5L18 13H5"/>',
  flask: '<path d="M9 2V8L3.4 17.6C2.6 19 3.6 20.7 5.2 20.7H18.8C20.4 20.7 21.4 19 20.6 17.6L15 8V2"/><path d="M9 2H15"/>',
  chevron: '<path d="M9 5L16 12L9 19"/>',
  play: '<path d="M7 4L19 12L7 20Z"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  stop: '<rect x="5.5" y="5.5" width="13" height="13" rx="2"/>',
  code: '<path d="M8 6L2.5 12L8 18M16 6L21.5 12L16 18M13.5 4L10.5 20"/>',
  plot: '<path d="M3 3V21H21"/><path d="M6 16L10 9L14 14L19 6"/><path d="M6 12L10 15.5L14 9.5L19 13"/>',
  check: '<path d="M4.5 12.5L10 18L19.5 6.5"/>',
  folder: '<path d="M3 6H9L11 8.5H21V19H3Z"/>',
  file: '<path d="M6 3H14L19 8V21H6Z"/><path d="M14 3V8H19"/>',
  report: '<path d="M6 3H14L19 8V21H6Z"/><path d="M14 3V8H19"/><path d="M9 12H16M9 15H16M9 18H16"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5H13"/>',
  back: '<path d="M15 5L8 12L15 19"/>'
};
const FILLED = new Set(['play', 'pause', 'stop']);
export function icon(name, size = 18) {
  const t = document.createElement('template'), f = FILLED.has(name);
  t.innerHTML = `<svg class="sh-ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${f ? 1.2 : 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
  return t.content.firstChild;
}

/* ---------------- simulated waveforms (page.py: _noise, _ecg_value, _exg_value) ---------------- */
export const RATE = 250, WINDOW = 5 * RATE;
function noise(index, salt) {
  let x = (Math.imul(index, 2654435761 >>> 0) + Math.imul(salt, 40503)) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519 >>> 0) >>> 0; x ^= x >>> 13; x >>>= 0;
  return x / 2147483648 - 1;
}
const PERIOD = 60 / 72, WAVES = [[0.14, 0.18, 0.025], [0.245, -0.22, 0.008], [0.26, 1.55, 0.010], [0.278, -0.38, 0.010], [0.45, 0.32, 0.045]];
/** Simulated ECG (mV) at one sample index: 72 bpm with slight R-R jitter. */
export function ecgValue(i) {
  const t = i / RATE, first = Math.floor(t / PERIOD);
  let v = -0.35 + 0.03 * Math.sin(2 * Math.PI * 0.25 * t) + 0.03 * noise(i, 5);
  for (const beat of [first - 1, first, first + 1]) {
    const dt = t - (beat * PERIOD + 0.03 * noise(beat, 91));
    if (dt > -0.1 && dt < 0.9) for (const [c, a, w] of WAVES) v += a * Math.exp(-((dt - c) ** 2) / (2 * w * w));
  }
  return v;
}
const TONES = [[6.0, 0.7, 12.0], [10.0, 2.1, 16.0], [19.0, 4.0, 9.0], [33.0, 5.3, 5.0]];
/** Simulated EXG (µV) at one sample index: slowly breathing tones plus noise. */
export function exgValue(i) {
  const t = i / RATE;
  let v = TONES.reduce((s, [f, ph, a]) => s + a * Math.sin(2 * Math.PI * f * t + ph), 0);
  v *= 1 + 0.25 * Math.sin(2 * Math.PI * 0.2 * t);
  v += 9 * noise(i, 17);
  return Math.max(-95, Math.min(95, v));
}
export const SIGNALS = {
  ecg: {value: ecgValue, range: [-2, 2], ticks: [-2, -1, 0, 1, 2], title: 'Amplitude (mV)', unit: 'mV', label: 'SAMPLE WAVEFORM · SIMULATED ECG'},
  exg: {value: exgValue, range: [-100, 100], ticks: [-100, -50, 0, 50, 100], title: 'Amplitude (µV)', unit: 'µV', label: 'SAMPLE WAVEFORM · SIMULATED EXG'}
};

/* ---------------- canvas plot (the Edge _Trace look: dashed grid, tick labels, glow stroke) ---------------- */
export function tokens() {
  const cs = getComputedStyle(document.documentElement), g = (n, d) => (cs.getPropertyValue(n).trim() || d);
  return {cyan: g('--cyan', '#38BDF8'), muted: g('--muted', '#94A3B8'), card: g('--surface-2', '#16202F'), base: g('--base', '#0B0F19'), text: g('--text', '#E5E7EB'), green: g('--green', '#22C55E'), amber: g('--amber', '#FBBF24'), red: g('--red', '#F43F5E')};
}
const minus = (s) => String(s).replace('-', '−');
/** Draws one plot. o: {values (oldest..newest), range, ticks, title, label, tmin, tmax, count (samples per window), color, cursors} */
export function drawPlot(cv, o) {
  const dpr = window.devicePixelRatio || 1, w = Math.max(80, cv.clientWidth), h = Math.max(60, cv.clientHeight);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'), t = tokens(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const L = o.left ?? 56, R = 10, T = 6, B = o.bottom ?? 36, pw = Math.max(10, w - L - R), ph = Math.max(10, h - T - B), [lo, hi] = o.range;
  ctx.fillStyle = t.card; ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.6; ctx.fillStyle = t.base; ctx.fillRect(L, T, pw, ph); ctx.globalAlpha = 1;
  const yOf = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;
  ctx.font = '10px "Segoe UI", sans-serif'; ctx.textBaseline = 'middle';
  ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
  for (const v of o.ticks) {
    const y = yOf(v); ctx.strokeStyle = t.muted; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = t.muted; ctx.textAlign = 'right'; ctx.fillText(minus((o.fmt ? o.fmt(v) : v.toFixed(Math.abs(hi - lo) < 10 ? 1 : 0))), L - 8, y);
  }
  const xs = o.xticks ?? 5, tmin = o.tmin ?? -5, tmax = o.tmax ?? 0;
  for (let s = 0; s <= xs; s++) {
    const x = L + (s / xs) * pw, sec = tmin + (s / xs) * (tmax - tmin);
    ctx.strokeStyle = t.muted; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = t.muted; ctx.textAlign = 'center'; ctx.fillText(minus(+sec.toFixed(3)), x, T + ph + 12);
  }
  ctx.setLineDash([]); ctx.strokeStyle = t.muted; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.fillStyle = t.muted; ctx.textAlign = 'center';
  ctx.save(); ctx.translate(11, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(o.title || '', 0, 0); ctx.restore();
  if (o.xlabel !== '') ctx.fillText(o.xlabel ?? 'Time (s) — now at right', L + pw / 2, h - 8);
  const vals = o.values || [], n = vals.length, per = o.count ?? n;
  if (n > 1) {
    const step = pw / (per - 1), x0 = o.alignLeft ? L : L + pw - (n - 1) * step;
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
    for (const [dy, a, wd] of [[-1.5, 0.22, 1.6], [1.5, 0.22, 1.6], [0, 1, 1.6]]) {
      ctx.globalAlpha = a; ctx.strokeStyle = o.color || t.cyan; ctx.lineWidth = wd; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < n; k++) { const x = x0 + k * step, y = yOf(vals[k]) + dy; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  for (const c of o.cursors || []) {   // measurement cursors: {kind:'t'|'v', pos (axis units), name}
    ctx.strokeStyle = t.amber; ctx.setLineDash([5, 3]); ctx.lineWidth = 1; ctx.beginPath();
    if (c.kind === 't') { const x = L + ((c.pos - tmin) / (tmax - tmin)) * pw; ctx.moveTo(x, T); ctx.lineTo(x, T + ph); } else { const y = yOf(c.pos); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); }
    ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = t.amber; ctx.textAlign = 'left'; ctx.fillText(c.name, c.kind === 't' ? L + ((c.pos - tmin) / (tmax - tmin)) * pw + 3 : L + 4, c.kind === 't' ? T + 9 : yOf(c.pos) - 7);
  }
  for (const m of o.markers || []) {   // [fraction 0..1, tag]
    const x = L + m[0] * pw; ctx.strokeStyle = t.amber; ctx.globalAlpha = 0.8; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (m[1]) { ctx.fillStyle = t.amber; ctx.textAlign = 'center'; ctx.fillText(m[1], x, T + 9); }
  }
  if (o.label) { ctx.font = '600 9px Consolas, monospace'; ctx.globalAlpha = 0.85; ctx.fillStyle = t.muted; ctx.textAlign = 'right'; ctx.fillText(o.label, L + pw - 8, T + 11); ctx.globalAlpha = 1; }
}
