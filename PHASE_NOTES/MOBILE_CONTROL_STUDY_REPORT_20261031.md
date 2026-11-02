# MYELIN Web Lite — Control Station and Study Mode mobile optimisation

Completed locally on 31 October 2026. No deployment or Guide work.

## Files

Existing files modified, each by exactly two asset links:

- `templates/myelin_web_sample.html`
- `dist/index.html`
- `dist/myelin_web_sample.html`

Presentation assets created:

- `templates/assets/myelin/mobile-layout.css`
- `templates/assets/myelin/mobile-layout.js`
- `dist/assets/myelin/mobile-layout.css`
- `dist/assets/myelin/mobile-layout.js`

No routes changed. The static copies are updated directly to match the template, without rebuilding unrelated assets.

## Result

At widths up to 700 px, only Control Station and Study Mode receive the compact MENU / MYELIN / chart header, compact clock with expandable options, and smaller Academy launcher. Hide/show clock remains available in MENU. Existing chart and settings handlers are reused.

Control Station stacks Engine Core, collapsible Live Telemetry and Local Session Health first, followed by every existing resource, continuity, escalation and handover panel. START / PAUSE or RESUME / STOP and EMERGENCY remain visible. Collapsed telemetry continues to receive events, and its simulation warning is always visible.

Study Mode preserves the circular timer, three timer values, all five runtime action buttons, four presets, all six setup fields, PREPARE, menus and status information. Resource Intent and Study Telemetry start collapsed on mobile and can be expanded. Inputs and primary buttons use 44 px minimum heights; PREPARE is 48 px.

The additional JavaScript changes DOM presentation only: no runtime imports, engine commands, time advancement, event generation or storage writes. Collapsing preserves the existing live content nodes. Desktop layouts and other modules retain their original styling.

Mobile runtime notices are centered within these two views, overriding an older bottom-sheet rule. Existing popup logic, actions and the centered module-demonstration stage remain unchanged.

A dismissible landscape suggestion appears for a wide layout viewport on a small portrait touchscreen, covering the usual Chrome Desktop site case. It clears in landscape and does not block interaction or force rotation. Chrome does not expose the actual Desktop site switch to page JavaScript, so this uses viewport, screen and touch detection. The detection was checked against portrait desktop-site phone, normal mobile, landscape phone, desktop and tablet inputs; a physical phone was not available for hardware verification.

## Verification

| Check | Result |
| --- | --- |
| Control Station at 360 / 390 / 430 px | Passed; no document overflow or off-screen controls |
| Study Mode at 360 / 390 / 430 px | Passed; no document overflow or off-screen controls |
| Desktop at 1440 px | Original and updated header, clock, timer and card coordinates/dimensions match exactly on both views |
| Main timer | Start, advancing time, pause stability, resume and stop passed |
| Emergency | Existing confirmation and cancellation passed |
| Study | Prepare, start, advancing timer, planned/end values, pause stability, resume, break and complete passed |
| Forms | Presets, text/numeric fields, active-study locking and full-width PREPARE passed |
| Collapsible panels | Telemetry receives events while collapsed; both Study status panels retain content |
| Clock / chart | Expand options, settings, clock collapse/restore, MENU hide/show and existing chart interface passed |
| Theme compatibility | Four selectable worlds tested on both views: Neon, White, Black, Purple. Amber, Red and Green runtime palettes checked through existing accelerated simulation flows |
| Centered popup | Green protected return notice verified centered and within the viewport at 360 / 390 / 430 px, including Control Station |
| JavaScript syntax | Node syntax check passed |
| Normal preview | Verified at `http://127.0.0.1:5500/templates/myelin_web_sample.html`; no browser errors observed |

Timer and alert tests used a separate temporary loopback origin so the ordinary preview's sessions were not changed. Test sessions were ended. Temporary test server was stopped after testing.

## Scope audit and rollback

SHA-256 comparison against the checkpoint found only the three listed pre-existing HTML entry points changed. All pre-existing engines, organ timing rules (including COSINE), telemetry projection logic, popup source, SenseHub, database readers, Science Lab and academic pages remain byte-identical. Template and dist copies of both new assets match.

Rollback checkpoint: `PHASE_NOTES/CHECKPOINT_mobile_control_study_20261031/` contains the original three HTML files and the baseline hash manifest. To roll back, restore those three files and remove the four new presentation assets listed above. No engine files need restoration.

Evidence: `PHASE_NOTES/evidence_mobile_control_study_20261031/` contains final screenshots, six width checks, desktop comparisons, centered-popup screenshots and machine-readable measurements.

![Control Station](evidence_mobile_control_study_20261031/myelin-control-final.png)

![Study Mode](evidence_mobile_control_study_20261031/myelin-study-final.png)
