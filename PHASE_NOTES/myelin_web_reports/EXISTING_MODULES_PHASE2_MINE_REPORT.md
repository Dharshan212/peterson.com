# Existing-module simulation upgrade — Phase 2: MINE

Working copy only. Not deployed. Not yet copied into the original `Peterson.com`.

## What was built
**Where:** the MINE page → source switch **BROWSER SESSION | MINE DEMONSTRATION (SIMULATION)** (same pattern as SINE). The default is the existing browser-session MINE page, unchanged.

**How it works:** `mine-demo.js` drives the *existing* MINE organ (the approved timing and event rules of this build's Runtime) in a **separate demonstration Runtime** on a **manual clock**: nothing advances unless a button is pressed, event wall times are start time + simulated seconds, popups are displayed the moment they are requested. No rule was re-implemented. The events are shown through the **existing MINE Main Station page** (banner, activity, news, timeline, map, history) and the existing **"MINE — Deep Analysis" dashboard** (VIEW ANALYSIS, five tabs), both fed by the demonstration's events through `mineModel` / `buildMinePage` / `createMineAnalysis`.

**Controls:** start / restart, **RESET**, end session; switch the simulated activity (work task, WhatsApp, Telegram, others); +5 s / +10 s / +30 s / +1 min / +5 min / +10 min; **ADVANCE TO NEXT MINE STEP** (from the engine's own countdown); simulated responses **I WILL COME BACK** and **IT'S IMPORTANT** (with a 5–30 minute allowance entry); live status tiles (clock, session, activity, MINE state, platform, branch, return status, messaging dwell, episodes).

**Flow demonstrated (all produced by the engine):** 10:00 of messaging dwell → MINE episode + **MINE-1**; "I will come back" → 13:15 return window → **MINE-2A** if messaging continues; "It's important" → allowance 5–30 min (4 min is refused with the engine's message) → **MINE-2B** when it ends; a messaging-platform change is recorded on the same episode; returning to the work task starts the engine's return check (visual confirming 3 s, verification 10 s, closure confirmation 60 s) and the episode closes RETURNED; going back to messaging during the confirmation records "Closure confirmation interrupted" and the episode stays open. A response is only an intention; nothing is verified unless the engine's rule produces it.

**Labelling and separation (tested):** "SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE" beside the switch and on the controls. The browser-session view shows none of the demonstration events and the Control Station runtime never starts; nothing is stored or uploaded; with an imported `.db` open the page is the imported-evidence view (no switch, no controls, no simulated values) and the demonstration returns untouched when the file is removed. The MINE readers, the imported-database display, Science Lab certification, the sidebar and the SINE demonstration were not changed.

## Recorded for later reconciliation (not acted on)
The engine's return-verification timings that the SINE and MINE demonstrations show — **10 s verification and 60 s closure confirmation** (plus MINE's 3 s visual confirming) — differ from the earlier MIRL specification you quote (**300 s continuous return verification, 10 s closure confirmation**). Both demonstrations display the engine as it is in this build, labelled simulation. No SINE or engine change was made. This is a decision for you: which timing is authoritative for the website's runtime (and whether the demonstrations should then be re-run on corrected rules).

## Not done / limits
Popup display failures are not part of the demonstration; PDF export is declined for the demonstration; COSINE and SECANT are untouched and wait for their own phases.

## Files
New: `assets/myelin/mine-demo.js`; test `PHASE_NOTES/tools/p2/t133_mine_demo.py`. Edited: `assets/myelin/ui.js` (import, `mineLive` can describe a given runtime, demo branch + source switch in `minePage`), `assets/myelin/desktop-skin.css` (one rule). dist = 85 files.

## Tests (focused)
`t133_mine_demo.py` **32/32** — default view unchanged; labelling; not-started state; task time creates nothing; 9:55 no episode; episode and MINE-1 at exactly 10:00; responses offered with nothing verified; come-back branch and 13:15 window; platform change; MINE-2A after the window; visual confirming / verifying / closure confirming / closed RETURNED; existing Deep Analysis dashboard reused; important branch, allowance validation (4 min refused), 7-minute allowance, MINE-2B; interrupted confirmation; reset; **determinism** (two identical click scripts give identical maps and counters); browser-session isolation; imported-file separation and restoration; SINE demonstration still present and unchanged; console clean.
Focused regression, all first-run on the final build: SINE 38, STORE 55, FINE 46, TANGENT 38, COT 54, sidebar tests 5, control station 56, Study Mode 46, Metric Hub 30, Science Lab 37, MIRL 58, **MINE 54**, COSINE 60, SECANT 71, labelling 35, wording 11, keyboard 21, interaction 34, functional 51, harness 23, Academy 37; imported-file organ pages vs the desktop readers **84/84** (real snapshot plus MINE fixtures: empty, middle event missing, open episode with no close) and with a running simulation 17/17; imported Metric Hub / Science Lab pages 12/12.
Visual: neon, white and 390 px (no horizontal scroll). The other themes were not individually screenshotted.

## Checkpoint
`PHASE_NOTES/CHECKPOINT_existing_modules_phase2_mine_20261031/`; backup before this phase `PHASE_NOTES/backup_before_mine_demo/`; the SINE checkpoint and the COT-final checkpoint are preserved.

## STOPPED after MINE. COSINE, SECANT, thesis work and deployment were not started. Awaiting your approval.
