// SenseHub (MYELIN — Edge) — BROWSER DEMONSTRATION page. A web adaptation of the Edge SenseHub page (SENSEHUB/page.py: title + tool switch + Lab Analysis), the Firmware Lab layout and the MYELINOSCOPE.
// SIMULATED evidence only: no ESP32, serial, Bluetooth, ECG acquisition, compiler or uploader exists here, and nothing is stored or sent. The MYELIN IDE, Serial Plotter and Wi-Fi tools of the Edge build
// need serial / network / the Arduino CLI and are therefore not part of this demonstration.
import {el} from './dom.js';
import {icon} from './sensehub-core.js';
import {createLab} from './sensehub-lab.js';
import {createFirmwareLab, createScope} from './sensehub-tools.js';

const TOOLS = [['fw', 'FIRMWARE LAB', 'code', 'VISUAL DEMONSTRATION · NOT A COMPILER'], ['scope', 'MYELINOSCOPE', 'plot', 'SIMULATED SIGNAL · DIGITAL OSCILLOSCOPE'], ['lab', 'LAB ANALYSIS', 'flask', 'SIMULATED DATA · BROWSER DEMONSTRATION']];

export function createSenseHubView({T}) {
  let root = null, tool = 'lab', raf = 0, chipEl = null;
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  const lab = createLab({T, onFrameNeeded: kick}), fw = createFirmwareLab(), scope = createScope({onChange: kick});
  const views = {lab: lab.root, fw: fw.root, scope: scope.root};
  function loop() {
    raf = 0;
    if (!root || !root.isConnected || root.offsetParent === null) return;
    let again = false;
    if (tool === 'lab' && lab.running()) { lab.frame(); again = true; }
    if (tool === 'scope' && scope.running()) { scope.draw(); again = true; }
    if (again) raf = requestAnimationFrame(loop);
  }
  function show(next) {
    tool = next;
    for (const [k] of TOOLS) { views[k].hidden = k !== tool; root.querySelector(`#shTool_${k}`).setAttribute('aria-pressed', String(k === tool)); }
    chipEl.textContent = TOOLS.find((t) => t[0] === tool)[3];
    requestAnimationFrame(() => { if (tool === 'lab') lab.frame(); if (tool === 'scope') scope.sync(); kick(); });
  }
  function build() {
    chipEl = el('span', {class: 'sh-chip sh-chip-amber', id: 'shHeaderChip'}, '');
    const switcher = el('div', {class: 'sh-tools', role: 'group', 'aria-label': 'SenseHub tool'}, ...TOOLS.map(([k, label, g]) => el('button', {type: 'button', class: 'sh-tool', id: `shTool_${k}`, 'aria-pressed': 'false', 'aria-label': `SenseHub tool: ${label}`, on: {click: () => show(k)}}, icon(g, 20), el('span', {}, label))));
    root = el('div', {class: 'mh-wrap sh-page', id: 'shPage', 'aria-label': 'SenseHub — simulated browser demonstration'},
      el('div', {class: 'sh-head'}, el('div', {class: 'sh-titles'}, el('div', {class: 'sh-h1'}, el('h1', {}, 'SenseHub'), chipEl), el('div', {class: 'sh-sub'}, el('span', {}, 'Sensor interface and biosignal acquisition'), el('span', {class: 'sh-chip'}, 'LABORATORY MODULE'))), switcher),
      el('div', {class: 'sh-banner', id: 'shBanner', role: 'note'}, el('span', {class: 'sh-chip sh-chip-amber'}, 'SIMULATED — BROWSER DEMONSTRATION'),
        el('span', {}, 'No ESP32, serial port, Bluetooth, ECG acquisition, compiler or uploader exists here; every device state, waveform and event is simulated. MYELIN IDE, Serial Plotter and Wi-Fi are Edge hardware tools and are not part of this demonstration.')),
      lab.root, fw.root, scope.root);
    show('lab');
  }
  return {
    /** Draws the SenseHub page into its page host (re-called whenever the page becomes visible). */
    mount(host) { if (!root) build(); if (host.firstChild !== root) host.replaceChildren(root); lab.refresh(); show(tool); },
    get tool() { return tool; }
  };
}
