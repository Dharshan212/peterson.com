# Viewing-mode policy — "BEST VIEWED IN DESKTOP MODE" screen for phones

Date: 2026-11-01 · `C:\Users\Dharshan\Downloads\Peterson.com` · Not deployed.
Checkpoint: `PHASE_NOTES/CHECKPOINT_viewing_mode_20261101` · Backup: `PHASE_NOTES/backup_before_viewing_mode/` · Evidence: `PHASE_NOTES/evidence_viewing_mode/`.

## Decision applied
Compact mobile redesign work **stopped**. Desktop-style viewing is the recommended experience on phones. Nothing was added to the mobile layout; the earlier compact layout, the wide-layout rules and the zoom lens (default 60 %) are left exactly as they were and are what "Continue anyway" / Desktop site use.

## What was added (2 new files + 2 link lines)
`assets/myelin/viewing-mode.js`, `assets/myelin/viewing-mode.css`, linked from `templates/myelin_web_sample.html` (`dist/index.html` is rebuilt from it). It builds a full-screen MYELIN-themed dialog using the existing theme tokens (all seven themes), the existing logo and brand text:

* Headline **BEST VIEWED IN DESKTOP MODE**; message "MYELIN Web Lite is designed for a desktop-style research experience."; steps 1. Open your browser's three-dot menu. 2. Enable "Desktop site". 3. Rotate your phone to landscape.; footer "For the best experience, use a PC or a mobile browser in Desktop site mode."; button **CONTINUE ANYWAY**.
* Portrait: one centred card. Narrow landscape (short screen): two columns so everything still fits without scrolling.
* Accessible: `role="dialog"`, `aria-modal`, labelled by the headline, focus on CONTINUE ANYWAY, background inert, Tab stays in the dialog, Escape also continues, page scroll locked while open, text ≥ 14 px, button 48 px.
* "Continue anyway" is remembered for the tab (sessionStorage) and moves focus to MENU.

## How it decides (heuristic — not a claim of exact detection)
No browser API reports the "Desktop site" checkbox. The screen shows only when **all** are true: the device has a touchscreen; its physical screen's shorter side is ≤ 700 CSS px (a phone, not a tablet or PC); and either the browser says it is a mobile browser (Desktop site makes Chrome send a desktop user agent; UA client hints are used when the page is secure, the user-agent string otherwise) or the layout viewport is ≤ 700 px wide. Ordinary desktops (no touch), narrow desktop windows and tablets never see it. A phone in Desktop site mode sends a desktop user agent and a wide layout, so it gets the normal interface.
**Real-device check:** open `http://10.15.57.121:8090/index.html?viewdiag` on the S24 FE (normal and Desktop site, portrait and landscape): a small box prints exactly what the browser reports and whether the screen is SHOWN or hidden. If it ever misjudges, "Continue anyway" covers it and the facts tell me what to adjust.

## Verification (`t142_viewing_mode.py` 24/24, emulated Chrome)
The S24 FE itself was not in my reach; the four modes were emulated with Chrome's device emulation (touch, screen, viewport, user agent and UA client hints) on both a secure page and the plain-http hotspot address (which hides client hints).
* S24 FE normal mobile **portrait** (412 × 915) and **landscape** (915 × 412): screen shown with the exact wording, card centred inside the viewport, no scroll, no sideways overflow.
* S24 FE **Desktop site landscape** (desktop UA, 985 px layout): **no** screen, normal interface; same on the plain-http page.
* **Standard desktop** (1440 px), narrow desktop window (600 px, no touch) and a tablet (800 × 1280): no screen.
* Dismissal: button, Escape, remembered after reload, focus returns to MENU, background restored; rotating with the screen open keeps it readable; seven themes keep readable contrast; `?viewdiag` output.
* Regression: `t141` 124/124, `t140` 73/73, `t139` 64/64, `t40` 56/56, `t137` 54/55 (the one miss is your newer `research.html`). Only the two new files and two link lines differ from the previous checkpoint; organs, popups, Live Telemetry, SenseHub, Study Mode, Science Lab, readers, themes and academic pages are untouched.

STOPPED. MYELIN Guide and deployment have not been started.
