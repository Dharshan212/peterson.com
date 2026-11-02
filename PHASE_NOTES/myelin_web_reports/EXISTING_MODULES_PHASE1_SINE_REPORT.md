# Existing-module simulation upgrade — Part A (sidebar) + Phase 1: SINE / Live MIRL

Working copy only. Not deployed. **Not yet copied into the original `Peterson.com`**: the original still holds the COT-final transfer. At the start there was no drift (every MYELIN file identical; your 14 newer files untouched).

## Part A — sidebar
New order: **Core** (Control, Study Mode, Metric Hub) → **Modules** → **Research** (Science Lab only) → **System** (SenseHub, coming soon, unchanged).
MODULES: **SINE — Live MIRL**, MINE, COSINE, SECANT Dashboard, STORE, FINE, TANGENT, COT.
Only the label changed. Every `data-page` routing id is the same (`live-mirl` …). The Live MIRL page keeps its own title and content, so the label does not change its meaning.

## Phase 1 — SINE / Live MIRL interactive demonstration
**Where:** Live MIRL page → source switch **BROWSER SESSION | SINE DEMONSTRATION (SIMULATION)**. The default is the existing browser-session view, unchanged.

**How it works:** `sine-demo.js` drives the *existing* SINE, MIRL and Normal Break organ classes (the approved timing and event rules of this build) in a **separate demonstration Runtime** on a **manual clock**. Nothing advances unless a button is pressed; event wall times are start time + simulated seconds; popups are displayed the moment they are requested. No rule was re-implemented. The events are shown through the **existing Live MIRL page and its Open Full Dashboard** (mirlModel / buildMirlPage / createMirlDashboard), so the MIRL event journey, tiles and dashboard are the established presentation.

**Controls:** start / restart, **RESET**, end session; switch the simulated activity (work task, social feed, others); +5 s / +10 s / +30 s / +1 min / +5 min / +10 min; **ADVANCE TO NEXT SINE STEP** (from the engine's own countdown); simulated responses **RETURN INTENT** and **NORMAL BREAK** (SINE-1 only: 5–30 min entry, break, resume gate, then SINE-2). Status tiles update automatically: clock, session, activity, SINE stage, social dwell, MIRL return phase, episodes, verified returns.

**Rules visible in the demo (all produced by the engine):** 5:00 of social dwell → SINE-1 and the MIRL episode; +10:00 → SINE-2; +13:15 → SINE-3 (protected red, no response); a return intent is only an intention; MIRL records Return Verified only after the work task is kept for 10 s, and closes the episode (RETURNED) only after a further 60 s confirmation; switching away interrupts the verification; a break holds SINE and MIRL.

**Labelling:** "SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE" beside the switch, and "SIMULATED EVIDENCE · NOT FROM ANY DATABASE FILE" on the controls.

**Separation (tested):** the browser-session view shows none of the demonstration events and the Control Station runtime never starts; nothing is stored or uploaded; with an imported `.db` open the page is the imported-evidence view (no switch, no controls, no simulated values) and the demonstration returns untouched when the file is removed. The MIRL readers, the imported-database display and Science Lab certification were not modified.

**Not done / limits:** popup display failures (the 45 s display deadline) are not part of the demonstration; MIRL's "Verified Returns" tile keeps its existing meaning (closed, confirmed returns); PDF export is declined for the demonstration; MINE, COSINE and SECANT are untouched and wait for their own phases.

## Files
New: `assets/myelin/sine-demo.js`; test `PHASE_NOTES/tools/p2/t132_sine_demo.py`.
Edited: `templates/myelin_web_sample.html` (sidebar only), `assets/myelin/ui.js` (import, one constructor call, demo branch and source switch in `mirlPage`, a guard so the real-time timer refresh does not overwrite the demo), `assets/myelin/desktop-skin.css` (a few rules); tests `t40` and `t126` updated for the intended new sidebar order. dist = 84 files.

## Tests (focused)
`t132_sine_demo.py` **38/38**: sidebar order, labels, routing ids and navigation of every row; the demonstration (not-started state, no episode on the task, 4:55 no episode, SINE-1 at exactly 5:00, SINE-2 at +10:00, SINE-3 at +13:15, nothing verified without a return, verification only after 10 s, closure only after 60 s, interruption, return intent, Normal Break and resume gate, reuse of the existing dashboard, reset); **determinism** (two identical click scripts give identical journeys, deltas and counters); isolation from the browser session and Control Station runtime; imported-file separation and restoration; timer guard; console clean.

Focused regression, all first-run on the final build: STORE 55, FINE 46, TANGENT 38, COT 54 and 22; control station 56, Study Mode 46, Metric Hub 30, Science Lab 37, **MIRL 58**, MINE 54, COSINE 60, SECANT 71; sidebar tests 5; labelling 35; wording 11; keyboard 21, interaction 34, functional 51, harness 23, Academy 37; imported-file organ pages vs the desktop readers 55/55 and with a running simulation 17/17; imported Metric Hub and Science Lab pages 12/12.
Visual: neon, white and 390 px. One real overflow was found and fixed (the long evidence label did not wrap on a phone). The other themes were not individually screenshotted.

## Checkpoint
`PHASE_NOTES/CHECKPOINT_existing_modules_phase1_sine_20261031/`. Backup of the edited files before this work: `PHASE_NOTES/backup_before_existing_modules/`. The COT-final checkpoint (what is in the original) is preserved.

## STOPPED after SINE. MINE, COSINE and SECANT were not started. Awaiting your approval.
