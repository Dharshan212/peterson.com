// Presentation only: no runtime imports, commands, events, clocks or storage writes.
const $ = id => document.getElementById(id);
const mobile = matchMedia('(max-width: 700px)');
const root = document.body;
const targets = ['page-control', 'page-study-mode'];
const button = (label, cls) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label);
  return b;
};

// CSS changes visual order only. Original nodes and runtime references stay intact.
const health = $('csHealthHint').closest('.card');
health.id = 'mlSessionHealth';
const feedCard = $('feed').closest('.card');
feedCard.id = 'mlLiveTelemetry';
function fold(card, content, title, startClosed = false) {
  const b = button(`Collapse ${title}`, 'ml-mobile-only ml-fold-toggle');
  b.textContent = '⌄'; b.setAttribute('aria-controls', content.id);
  card.querySelector('.card-head').append(b);
  card.classList.toggle('ml-folded', startClosed);
  const update = () => {
    const closed = mobile.matches && card.classList.contains('ml-folded');
    b.setAttribute('aria-expanded', String(!closed));
    b.setAttribute('aria-label', `${closed ? 'Expand' : 'Collapse'} ${title}`);
    // inert keeps collapsed content out of keyboard navigation; nodes keep updating.
    content.inert = closed;
  };
  b.addEventListener('click', () => { card.classList.toggle('ml-folded'); update(); });
  mobile.addEventListener('change', update); update();
}
fold(feedCard, $('feed'), 'Live Telemetry', true);
fold($('sxRi'), $('sxRiRows'), 'Resource Intent', true);
fold($('sxTele'), $('sxTeleRows'), 'Study Telemetry', true);

const clock = $('hudClock');
const clockTools = clock.querySelector('.sc-btns');
clockTools.id = 'mlClockTools';
const clockExpand = button('Expand clock options', 'ml-mobile-only ml-clock-expand');
clockExpand.textContent = '⌄'; clockExpand.setAttribute('aria-controls', clockTools.id);
clockExpand.setAttribute('aria-expanded', 'false');
clock.querySelector('.hud-clock-head').append(clockExpand);
clockExpand.addEventListener('click', () => {
  const open = clock.classList.toggle('ml-tools-open');
  clockExpand.setAttribute('aria-expanded', String(open));
  clockExpand.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} clock options`);
});
const clockMenu = button('Hide or show system clock', 'ml-mobile-only ml-clock-menu');
clockMenu.textContent = 'Hide / show clock';
clockMenu.addEventListener('click', () => $('clockToggle').click());
document.querySelector('.sidebar-foot').prepend(clockMenu);

// Reuse the existing chart action and its event handler.
$('getChartBtn').setAttribute('aria-label', 'Get chart');
$('getChartBtn').title = 'Get chart';

const hint = document.createElement('div');
hint.className = 'ml-landscape-hint'; hint.setAttribute('role', 'status');
const hintText = document.createElement('span');
hintText.textContent = 'Using desktop site on a phone? Rotate to landscape for a better experience.';
const dismiss = button('Dismiss landscape suggestion', 'ml-rotate-dismiss');
dismiss.textContent = '×'; hint.append(hintText, dismiss);
document.querySelector('.topbar').before(hint);
let dismissed = false;
dismiss.addEventListener('click', () => { dismissed = true; sync(); });
function sync() {
  const page = targets.find(id => $(id).classList.contains('active'));
  if (page) root.dataset.mobilePage = page;
  else delete root.dataset.mobilePage;
  // Chrome exposes no reliable "Desktop site" switch. Detect the relevant case:
  // a wide layout viewport on a small portrait touchscreen. Never force rotation.
  const phoneDesktop = navigator.maxTouchPoints > 0 && innerWidth > 700 &&
    Math.min(screen.width, screen.height) <= 600 && screen.height > screen.width;
  root.toggleAttribute('data-phone-desktop', !!page && phoneDesktop && !dismissed);
}
new MutationObserver(sync).observe(document.querySelector('.main'), {
  subtree: true, attributes: true, attributeFilter: ['class']
});
addEventListener('resize', sync);
screen.orientation?.addEventListener('change', sync);
sync();

// ---- Zoom lens: a phone showing a WIDE layout (Chrome "Desktop site" or landscape) cannot pinch out below "page fits the width", unlike PC browser zoom.
// The lens button scales the page content (.main) down in steps, like a PC zoom-out. It is shown only on small touchscreens with a wide layout, never changes the viewport
// meta or pinch-zoom, never touches popups / Academy / sidebar, and is presentation only (the level is kept for this tab in sessionStorage when available).
const LENS_LEVELS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.33, 0.25, 0.2];
const mainEl = document.querySelector('.main');
let lensIdx = LENS_LEVELS.indexOf(0.6);   // default: 60 % (a level the user picked earlier in this tab, including 100 %, wins)
try { const i = LENS_LEVELS.indexOf(Number(sessionStorage.getItem('myelin.lens'))); if (i >= 0) lensIdx = i; } catch { /* storage is optional */ }
const lens = document.createElement('div');
lens.className = 'ml-lens'; lens.id = 'mlLens'; lens.hidden = true;
const lensBtn = button('Zoom lens', 'ml-lens-btn');
lensBtn.setAttribute('aria-expanded', 'false'); lensBtn.setAttribute('aria-controls', 'mlLensPanel');
lensBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7.5 10h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const lensPanel = document.createElement('div');
lensPanel.className = 'ml-lens-panel'; lensPanel.id = 'mlLensPanel'; lensPanel.hidden = true;
const lensOut = button('Zoom out', 'ml-lens-step'); lensOut.textContent = '−';
const lensRead = document.createElement('span'); lensRead.className = 'ml-lens-read'; lensRead.setAttribute('role', 'status'); lensRead.setAttribute('aria-live', 'polite');
const lensIn = button('Zoom in', 'ml-lens-step'); lensIn.textContent = '+';
const lensReset = button('Reset zoom to 100 percent', 'ml-lens-reset'); lensReset.textContent = '100%';
lensPanel.append(lensOut, lensRead, lensIn, lensReset);
lens.append(lensBtn, lensPanel);
document.body.append(lens);
function lensApply() {
  const z = LENS_LEVELS[lensIdx];
  mainEl.style.zoom = z === 1 ? '' : String(z);
  lensRead.textContent = `${Math.round(z * 100)}%`;
  lensOut.disabled = lensIdx === LENS_LEVELS.length - 1; lensIn.disabled = lensIdx === 0;
  root.toggleAttribute('data-lens-zoom', z !== 1); root.style.setProperty('--ml-lens-z', String(z));
  root.toggleAttribute('data-eff-wide', innerWidth <= 1240 && innerWidth / z >= 1241);   // content is as wide as the desktop's: use the desktop header and columns
  try { sessionStorage.setItem('myelin.lens', String(z)); } catch { /* storage is optional */ }
}
function lensSync() {
  const wanted = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 700 && innerWidth > 700;
  lens.hidden = !wanted;
  if (wanted) lensApply(); else { mainEl.style.zoom = ''; root.removeAttribute('data-lens-zoom'); root.removeAttribute('data-eff-wide'); root.style.removeProperty('--ml-lens-z'); }
}
lensBtn.addEventListener('click', () => { const open = lensPanel.hidden; lensPanel.hidden = !open; lensBtn.setAttribute('aria-expanded', String(open)); });
lensOut.addEventListener('click', () => { if (lensIdx < LENS_LEVELS.length - 1) { lensIdx++; lensApply(); } });
lensIn.addEventListener('click', () => { if (lensIdx > 0) { lensIdx--; lensApply(); } });
lensReset.addEventListener('click', () => { lensIdx = 0; lensApply(); });
addEventListener('resize', lensSync);
screen.orientation?.addEventListener('change', lensSync);
lensSync();
