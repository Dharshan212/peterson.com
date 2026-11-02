// Viewing-mode advice (presentation only): on a PHONE showing a conventional narrow mobile layout, a MYELIN-themed screen recommends the browser's "Desktop site" mode in landscape.
// No browser API reports whether "Desktop site" is ticked, so this is a heuristic, never a claim: the screen is shown only when ALL of these hold
//   * the device has a touchscreen,
//   * its physical screen is phone-sized (shorter side <= 700 CSS px),
//   * and either the browser identifies itself as a mobile browser (Desktop site sends a desktop user agent) or the layout viewport is narrow (<= 700 px).
// "Continue anyway" always opens the normal interface (remembered for this tab). Ordinary desktops and tablets never see the screen. Nothing here touches the simulation, popups,
// telemetry, SenseHub, Study Mode, Science Lab or imported files. Add ?viewdiag to the address to see exactly what was detected on a device.
const KEY = 'myelin.viewing.continue';
const root = document.documentElement;
let gate = null, dismissed = false, held = [];
try { dismissed = sessionStorage.getItem(KEY) === '1'; } catch { /* storage is optional */ }

function mobileBrowser() {
  const uad = navigator.userAgentData;                       // only exposed in secure contexts
  if (uad && typeof uad.mobile === 'boolean' && uad.mobile) return true;
  return /Android|Mobi|iPhone|iPod/i.test(navigator.userAgent || '');
}
function facts() {
  return {touch: navigator.maxTouchPoints || 0, screen: `${screen.width}x${screen.height}`, shortSide: Math.min(screen.width, screen.height), inner: `${innerWidth}x${innerHeight}`,
    mobileUa: mobileBrowser(), uaMobileFlag: navigator.userAgentData ? navigator.userAgentData.mobile : 'n/a (insecure page)', dpr: devicePixelRatio};
}
function wanted() {
  if (dismissed) return false;
  const f = facts();
  return f.touch > 0 && f.shortSide <= 700 && (f.mobileUa || innerWidth <= 700);
}
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function build() {
  const card = mk('div', 'vm-card');
  const brand = mk('div', 'vm-brand');
  const logo = document.querySelector('.brand-title .logo-row');
  if (logo) { const c = logo.cloneNode(true); c.querySelectorAll('defs').forEach((d) => d.remove()); brand.append(c); } else brand.append(mk('div', 'vm-brand-fallback', 'MYELIN — web lite'));
  const head = mk('div', 'vm-head');
  const title = mk('h1', 'vm-title', 'BEST VIEWED IN DESKTOP MODE'); title.id = 'vmTitle'; title.tabIndex = -1;
  const msg = mk('p', 'vm-msg', 'MYELIN Web Lite is designed for a desktop-style research experience.'); msg.id = 'vmMsg';
  head.append(brand, title, msg);
  const steps = mk('ol', 'vm-steps');
  steps.setAttribute('aria-label', 'How to switch to Desktop site');
  for (const t of ['Open your browser\'s three-dot menu.', 'Enable "Desktop site".', 'Rotate your phone to landscape.']) steps.append(mk('li', 'vm-step', t));
  const foot = mk('p', 'vm-foot', 'For the best experience, use a PC or a mobile browser in Desktop site mode.');
  const go = mk('button', 'vm-continue', 'CONTINUE ANYWAY'); go.type = 'button'; go.id = 'vmContinue';
  go.addEventListener('click', dismiss);
  card.append(head, steps, foot, go);
  const g = mk('div', 'vm-gate'); g.id = 'vmGate'; g.hidden = true;
  g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'vmTitle'); g.setAttribute('aria-describedby', 'vmMsg');
  g.append(card);
  g.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); else if (e.key === 'Tab') { e.preventDefault(); go.focus({preventScroll: true}); } });   // one control: keep focus inside the dialog
  document.body.append(g);
  return g;
}
function show() {
  if (!gate) gate = build();
  if (!gate.hidden) return;
  held = [...document.body.children].filter((e) => e !== gate && !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName)).map((e) => [e, e.inert]);
  held.forEach(([e]) => { e.inert = true; });
  gate.hidden = false; root.classList.add('vm-open');
  gate.querySelector('#vmContinue').focus({preventScroll: true});
}
function hide() {
  if (!gate || gate.hidden) return;
  gate.hidden = true; root.classList.remove('vm-open');
  held.forEach(([e, was]) => { e.inert = was; }); held = [];
}
function dismiss() {
  dismissed = true;
  try { sessionStorage.setItem(KEY, '1'); } catch { /* storage is optional */ }
  hide();
  const first = document.getElementById('menuToggle'); if (first) first.focus({preventScroll: true});
}
let diag = null;
function sync() {
  if (wanted()) show(); else hide();
  if (/[?&]viewdiag\b/.test(location.search)) {
    if (!diag) { diag = mk('pre', 'vm-diag'); diag.id = 'vmDiag'; document.body.append(diag); }
    diag.textContent = `viewing-mode  gate: ${gate && !gate.hidden ? 'SHOWN' : 'hidden'}${dismissed ? ' (continued)' : ''}\n${JSON.stringify(facts(), null, 1)}`;
  }
}
addEventListener('resize', sync);
screen.orientation?.addEventListener('change', sync);
sync();
