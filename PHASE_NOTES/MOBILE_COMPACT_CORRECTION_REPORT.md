# Mobile compact-density correction (Control Station + Study Mode)

Date: 2026-11-01 · `C:\Users\Dharshan\Downloads\Peterson.com` · Not deployed.
Checkpoint: `PHASE_NOTES/CHECKPOINT_mobile_compact_20261101` · Backup before editing: `PHASE_NOTES/backup_before_mobile_compact/` · Evidence: `PHASE_NOTES/evidence_mobile_compact/` (before / after at 360, 390, 412, 430 px).

## Zoom investigation (no code change)
* Viewport meta is `width=device-width, initial-scale=1.0`: **no** `maximum-scale`, `minimum-scale` or `user-scalable` restriction. No CSS `zoom`, no body transform and no `min-width` on html / body / `.main` (tested). Pinch-zoom is untouched.
* Why the phone cannot zoom out: Chrome on Android lets you pinch out only until the page fits the screen width. With no horizontal overflow the layout already fits exactly, so there is nothing further to zoom out to. On the PC, Ctrl-minus is *page zoom* (changes CSS pixel size), a different feature. In **Desktop site** mode Chrome uses a wide (about 980 px) layout viewport and the same "fit width" floor applies; the compact phone layout does not apply there because it is under 700 px (the existing landscape hint covers that case). This is browser behaviour, not a site setting. To get smaller content on a phone, the layout itself must be denser, which is what this correction does. (Chrome's own Settings → Accessibility → Default zoom may also help; I could not test it on the phone.)

## What was wrong
The earlier mobile layout (`mobile-layout.css`, ≤ 700 px, only Control Station + Study Mode) fitted but was loose: 190 px rings, 16 px card padding, 14 px gaps, a 111 px clock, stacked clock lines, 14 px field gaps, uneven action-button rows, a 48 px Academy bubble, a decorative axon canvas.

## Change (one file: `templates/assets/myelin/mobile-layout.css`, a "Compact density" block appended inside `@media (max-width: 700px)`)
| Area | Before (412 px) | After |
| --- | --- | --- |
| Header block (menu / brand / chart + clock) | 183 px | 130 px |
| System clock card | 111 px, three stacked lines | 70 px: time left, LOCAL zone + day/date right, expand control clear of them |
| Engine Core ring | 190 px | 150 px (time 28 px) |
| Control hero card | 429 px | 363 px |
| Control page total | 2802 px | ~2420 px |
| START / PAUSE / STOP | 3 equal, 44 px | unchanged (kept), EMERGENCY full width, 44 px |
| Session Health | 70 px tiles | 55 px, three equal tiles |
| Live Telemetry | folded (kept) | folded, 99 px, SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING warning always visible, expands |
| Study ring | 190 px | 156 px |
| Study timer card | 504 px | 416 px (task, ring, planned / elapsed / ends-at together) |
| Study actions | 3 + 2 uneven | row 1 three equal; row 2 COMPLETE and START BREAK equal halves; all ≥ 44 px |
| Presets | 4 columns | 4 equal columns kept |
| Setup fields | 14 px gaps, one column | 8 px gaps; STUDY and BREAK LENGTH share a row, other four full width; inputs ≥ 44 px, 16 px text (no zoom-on-focus) |
| Study page total | 1840 px | ~1490 px |
| Academy launcher | 48 px | 40 px with a 44 px hit area |
| Decoration | axon canvas drawn | not drawn on phones |
| SINE carousel arrows | 26 × 24 px | 44 × 40 px |

`web-lite.css` forces the setup fields to one column with `!important` at ≤ 600 px, so the two-column length row uses a matching `!important`. Every Study field, button and card is kept; Study Telemetry and Resource Intent remain compact expandable cards. Body text was not shrunk below 9–10 px labels already used; field text is 16 px.

## Verification
* `t141_mobile_compact.py` **106/106** at 360 / 390 / 412 / 430 px: viewport and zoom, no overflow (idle and running), compact header and clock with no overlapping control, ring sizes, equal-width START / PAUSE / STOP, EMERGENCY, equal health tiles, telemetry fold and warning, tap targets, START / PAUSE / RESUME / STOP, every Study field, preset and action alignment, PREPARE → START → COMPLETE on the compact layout, expandable cards, all seven themes, COSINE / SenseHub / Metric Hub pages unaffected, **desktop 1440, 1024 and 768 px geometry identical to the previous build**, only `mobile-layout.css` changed by this task.
* Regression: `t140` 73/73 (five-minute COSINE incl. 390 px popup), `t139` 64/64, `t40` 56/56, `t137` 54/55 (the only miss is `research.html`, your own newer edit).
* Not tested: the physical S24 FE (the layout was driven in headless Chrome at your viewport widths against your screenshot); a Chrome *Desktop site* view.

## Not changed
Desktop layouts, all seven themes' tokens, the eight organs, COSINE five-minute flow, centred popups, Live Telemetry, SenseHub, Science Lab, readers, simulation rules, runtime logic, `mobile-layout.js`, academic / thesis pages. The "READ ONLY · Web Locks is unavailable" notice you saw appears on plain http because Chrome hides Web Locks there; it is unrelated to layout (enable the Chrome insecure-origin flag from the hotspot test, or use https/localhost).

## Follow-up: Desktop-site / landscape phone (zoom lens + desktop-like layout)
Reported from the phone in Chrome *Desktop site*: the clock was drawn over the MYELIN name, the page could not be zoomed out, and the layout stacked into one column. Changes (still only `mobile-layout.css` and the appended block of `mobile-layout.js`):
* **Clock / name overlap and centring:** a pre-existing bug on the real site from 701 to ~1240 px wide (not only on phones). From 701 to 1240 px row 1 is now MENU | the brand EXACTLY centred on the page (within 2 px, circuit traces kept at 1181-1240 as on the desktop) | Hide Clock / Get Chart, and the normal 260 x 120 clock card sits on its own row beneath (a first attempt kept the clock beside MENU but pushed the brand 78-167 px right of centre; true centring needs about 1520 px otherwise). The clock card itself is never restyled. Known, pre-existing and untouched: on the real desktop at 1241-1300 px the brand sits 35 to 5 px left of centre. On short (landscape) screens the header scrolls away instead of staying fixed over the page. 1241 px and wider is byte-for-byte the same layout.
* **Desktop arrangement:** from 861 px the Control Station is two columns as on the desktop: Engine Core + Local Session Health on the left, **Live Telemetry with Handover Telemetry on the right**. Study Mode is two columns from 861 px too. Below 861 px it stays one column; up to 700 px the compact phone layout applies.
* **Zoom lens:** on a small touchscreen showing a wide layout (Desktop site / landscape) a 44 px lens button appears bottom-left. It opens - / level / + / 100% and scales the page content from 100 % down to 20 % (steps 90, 80, 70, 60, 50, 40, 33, 25, 20) like a PC zoom-out; at 20 % almost the whole Control Station fits one landscape screen. The Academy launcher, popups and the lens keep their size; the level is remembered per tab; it is off in the compact phone layout and on real PCs. Pinch-zoom and the viewport meta are untouched. Note: CSS zoom does not change the browser's media-query width, which is why the layout rules above were widened instead of relying on the lens.
* Tests: `t141` now **121/121** (adds header, two-column, lens and popup-centring checks); `t140` 73/73, `t139` 64/64, `t40` 56/56, `t137` 54/55 and `t138` 26/27 (the one miss in each is your newer `research.html`).
* **Zoomed-out lens = desktop look:** with the lens at 70 % or 60 % on a ~985 px landscape viewport the content is effectively 1400 px+ wide, but the browser's media queries still report 985 px, which had kept the centred-brand layout (clock on its own row, no circuit traces). `mobile-layout.js` now sets `data-eff-wide` when viewport / zoom >= 1241 px and the CSS then restores the real desktop header (MENU, clock beside it, circuit traces on both sides of the brand) and two columns. At 90 / 80 % (effective width under 1241 px, where the desktop header would collide) the centred-brand layout stays. Tested in `t141` E1 / E2 (123/123).
* **Default zoom:** the lens now starts at **60 %** on a small touchscreen with a wide layout (Desktop site / landscape); a level chosen earlier in the same tab, including 100 %, wins. Phone-portrait compact layout and real PCs are unaffected. `t141` 124/124.

STOPPED. MYELIN Guide (Phase 4) and deployment have not been started.
