# Existing-module simulation upgrade — Phase 3 COSINE (corrected rules)

Working copy only. Not deployed. Not yet copied into the original `Peterson.com`. Replaces the engine-rule demonstration (kept as the rollback checkpoint).

## What changed
The COSINE demonstration now follows your corrected design, using a **lightweight, separate simulation model** (`cosine-ott-model.js`). It does **not** use or change the Runtime or the COSINE organ, reads no database, and keeps events only in memory. Same place and pattern as before: COSINE page → **BROWSER SESSION | COSINE DEMONSTRATION (SIMULATION)**, manual clock, labelled SIMULATED EVIDENCE.

| Your rule | Demonstrated |
|---|---|
| 1. Initial popup at 23:15 of eligible OTT viewing | Popup at exactly 23:15 of *cumulative* eligible viewing (23:10 shows none). |
| 2. Buttons 10 MORE MIN / FINISH MY SHOW | Exactly those two buttons; the old intention gate, break length and YAY are gone. |
| 3. Unanswered → CONTINUED WATCHING, no more popups that OTT session | "NO RESPONSE (SIMULATED)" records it; 30 more minutes (and a Hopper switch) show no further popup. |
| 4. WELCOME BACK once when the focus application opens after OTT | Shown once; opening the focus application again does not repeat it. |
| 5. Suppressed if SINE opened / took priority | "SINE OPENS FIRST (SIMULATED)" switch; Welcome Back is then recorded as suppressed and never displayed. |
| 6. Hopper: OTT-to-OTT = same session | Netflix ↔ Prime Video stay in one session; viewing time is added up across them (10:00 + 13:15 → popup on Prime Video). |
| 7. Session closes after a five-minute gap; resuming within the gap continues | 4:55 without OTT still open; exactly 5:00 closes; OTT inside the gap = "OTT session resumed", same session; OTT after closure = a new session whose viewing restarts at 00:00. |

Everything is shown through the **existing COSINE page** (banner, current episode, latest events, platform behaviour, journey map) and the **existing Deep Analysis dashboard** (seven tabs; Episodes / Intent / Hopper / Evidence tested with the simulated events).

## Interpretations I had to make (please confirm or correct)
The correction does not define these; I chose the smallest reading and invented no new popup stages, timers or recovery rules:
1. **"Unanswered"** is applied when the popup is displayed and (a) you choose NO RESPONSE, (b) you open the focus application without answering, or (c) the OTT session closes while it is still open. No popup timeout was invented.
2. **After 10 MORE MIN / FINISH MY SHOW** the choice is recorded and **nothing else happens** (no follow-up popup, no 10-minute timer). If 10 MORE MIN should re-prompt later, I need that rule.
3. **WELCOME BACK needs an earlier COSINE popup** in that OTT session (so a 3-minute Netflix glance followed by work shows none). If it should appear after any OTT use, say so.
4. **"Focus application"** = the simulator's Work-task surface only. Other non-OTT activities just count as the gap.
5. **WELCOME BACK stays eligible after the session has closed** (focus application opened later than five minutes): it is then shown once and recorded after the closure event. It is not delivered if a new OTT session starts first.
6. **SINE** is a simulated switch only (no SINE logic). It affects WELCOME BACK only; it does not suppress the 23:15 popup, because the correction names only WELCOME BACK.
7. **Popup and Welcome Back wording** is not specified, so the demonstration shows only the button labels and "WELCOME BACK"; no message copy was invented.
8. Switching to a *different* OTT platform on resuming inside the gap is recorded as a Hopper transition in the same session.

## Changes to files
New: `assets/myelin/cosine-ott-model.js`; test `PHASE_NOTES/tools/p2/t135_cosine_demo_corrected.py`. Rewritten: `assets/myelin/cosine-demo.js`. Edited (additive only): `assets/myelin/cosine-station.js` — labels, stage grouping and choice text for the new demonstration events, plus the Intent tab's choice-event lookup; every desktop/imported label and path is untouched and takes precedence. `ui.js` returns to its original `cosineLive`; only the demo hook remains. **Not touched:** Runtime, simulator, every organ (including COSINE), desktop-exported COSINE data, the imported-database readers, SINE/MINE demonstrations (byte-identical to the rollback checkpoint — tested). dist = 87 files.

## Tests
`t135_cosine_demo_corrected.py` **44/44**: sidebar and default view unchanged; labelling; controls disabled before start; no session from focus time; session start; no popup at 23:10; popup at exactly 23:15 with the two buttons; no old-engine events; unanswered recorded and no further popup; Hopper in the same session; Welcome Back once and not repeated; resume within the gap; gap open at 4:55 and closed at 5:00; new session restarts viewing; cumulative viewing across platforms; both answers; leaving for the focus application unanswered; unanswered at closure; Welcome Back after closure; none without a popup; SINE suppression and its lock; dashboard reuse (seven tabs, tabs render); reset; **determinism**; browser-session isolation; imported-file separation and restoration; SINE/MINE untouched; console clean; engine/readers byte-identical.
Focused regression on the full build before the final one-line label change: all 26 test files first-run green (corrected COSINE 44, MINE demo 32, SINE demo 38, STORE 55, FINE 46, TANGENT 38, COT 54, sidebar 5, control station 56, Study 46, Metric Hub 30, Science Lab 37, MIRL 58, MINE 54, COSINE 60, SECANT 71, functional 51, interaction 34, keyboard 21, harness 23, Academy 37, behaviour 35, wording 11, imported-file organ pages 84/84 and 17/17, Metric/Science pages 12/12). After that change the corrected-flow test (44/44) and the COSINE page test (60/60) were re-run and pass.
Visual (`PHASE_NOTES/evidence/p3c_cosine_demo_*.png`): neon (popup, Welcome Back), white page and dashboard, 390 px with no horizontal scroll. Other themes not individually screenshotted.

## Limits
The page's existing tiles "Confirmed Returns" and "Breaks Started" and the "Break chosen" fact belong to the production engine's events and read 0 / "—" here. PDF export is declined for the demonstration. Timing question (MIRL 300 s / 10 s vs engine 10 s / 60 s) remains with you; it is not part of this model.

## Checkpoint
`PHASE_NOTES/CHECKPOINT_existing_modules_phase3_cosine_corrected_20261031/`. Rollback: `CHECKPOINT_existing_modules_phase3_cosine_20261031/` (engine-rule demonstration, 35/35) kept untouched; backup of the edited files in `PHASE_NOTES/backup_before_cosine_correction/`.

## STOPPED after the COSINE correction. SECANT, thesis work and deployment were not started. Awaiting your approval of COSINE Phase 3.
