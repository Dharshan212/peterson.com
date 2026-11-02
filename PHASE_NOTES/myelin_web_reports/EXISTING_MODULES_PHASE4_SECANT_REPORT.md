# Existing-module simulation upgrade — Phase 4: SECANT (with Study Mode and COSECANT)

Working copy only. Not deployed. Not yet copied into the original `Peterson.com`.

## What was built
**Where:** the SECANT Dashboard page → source switch **BROWSER SESSION | SECANT DEMONSTRATION (SIMULATION)** (same pattern as SINE, MINE and COSINE). The default is the existing browser-session SECANT page, unchanged.

**How it works:** `secant-demo.js` drives the *existing* STUDY, SECANT and COSECANT organs (the approved rules of this build's Runtime) in a **separate demonstration Runtime** on a **manual clock**: nothing advances unless a button is pressed, popups are displayed the moment they are requested. No rule was re-implemented or invented. The events are shown through the **existing SECANT page** (status, recent episode, tiles, behaviour, latest events, flow) and the existing **"SECANT — Deep Analysis" dashboard** (SECANT and COSECANT faces, history routes), fed by `secantModel` / `buildSecantPage` / `createSecantAnalysis`. Study Mode controls live inside the demonstration panel; the Control Station's own Study panel and runtime are not touched.

**Demonstrated, in your order:**
1. **Start a simulated study session** (START / RESTART / RESET / END; earlier simulated sessions stay in memory so the dashboard's existing past-session views have entries).
2. **Select / confirm study material:** subject, task, study minutes, break minutes and the registered study material (the only registered material is the *Exact Study resource*); PREPARE validates with the engine's own messages ("Enter a subject and task.", "Choose whole minutes from 1 to 1440.").
3. **Study timer:** planned / elapsed / remaining, progress bar, START / PAUSE / RESUME / COMPLETE; pausing freezes the timer.
4. **SECANT reminders and interaction records:** a distraction (e.g. WhatsApp) for 5:00 → **SECANT-1**; **+10:00 → SECANT-2**; **+13:15 → SECANT-3**; RETURN TO STUDY records "Return to Study Selected" (an intention only); START STUDY BREAK is offered on SECANT-1 only; return to the exact study resource → 10 s verification, 60 s closure confirmation → episode closed (recovered).
5. **COSECANT break:** the selected break length; **BREAK COMPLETE** at the scheduled end; **BREAK ALREADY OVER** five minutes later; **COME BACK PLEASE** (final lock, no buttons) one minute after that; observed return to the exact study resource confirmed for **three seconds** (interrupt it and it restarts); the study timer resumes. A return observed *before* the break ends is not admitted (engine rule); with the resource already open it starts at the moment the break ends.
6. **Timeline and evidence** appear in the existing SECANT page flow and in the Deep Analysis COSECANT face (break started → complete → already over → final locked → return intent → confirmation started / lost / restarted → return confirmed).
7. **Session picker, evidence presentation and imported database integration preserved:** with a database file open the page is the imported-evidence view (no switch, no controls, no simulated values); the demonstration returns untouched when the file is removed.

Also: ADVANCE TO NEXT SECANT / COSECANT STEP (from the engine's own countdown; +1 s … +10 min buttons), a manual-clock status panel, and the presentation principle you set: values that do not exist yet read **Not available**, and what this simulation does not measure (app category, study alignment) reads **Not tracked** — never an implied zero.

## Details to know
- The engine's internal "held" flag can stay set until its next tick after a pause/resume; the demonstration's readout therefore follows the observed evidence instead (a display choice, no engine change).
- The existing page's own tiles ("Captured Episodes", "Verified Returns" …) count only *finalized validated* episodes and say so ("1 recorded episodes excluded"); an episode still in progress therefore shows 0 there until it closes. That is the existing page's wording, left as is.
- No new behaviour was invented: Study Mode, SECANT and COSECANT already contain every rule above. Nothing about SECANT/COSECANT rules is open for your decision in this phase.
- Recorded earlier, still open for you: the MIRL 300 s / 10 s return-verification specification versus the engine's 10 s / 60 s (SECANT uses the engine's 10 s + 60 s here, labelled simulation).

## Files
New: `assets/myelin/secant-demo.js`; test `PHASE_NOTES/tools/p2/t136_secant_demo.py`. Edited: `assets/myelin/ui.js` (import, demo constructor, demo branch + source switch in `secantPage`; in-line byte edits), `assets/myelin/desktop-skin.css` (appended rules). **Not touched** (byte-identical to the corrected-COSINE checkpoint; tested): runtime, simulator, every organ (Study / SECANT / COSECANT included), `secant-station.js`, `secant-import.js`, COSINE / MINE / SINE modules, STORE / FINE / TANGENT / COT models. dist = 88 files.

## Tests
`t136_secant_demo.py` **57/57** — sidebar and default view unchanged; labelling; controls disabled before start; Not available / Not tracked; blank subject and 0 minutes refused; prepared on the registered material; timer, progress bar, pause / resume; 4:55 no SECANT, exactly 5:00 SECANT-1; responses; interaction record; SECANT-2 and SECANT-3 timings and button sets; verification 10 s + 60 s closure and "recovered"; COMPLETE; second and third sessions kept for the dashboard; break from active Study: started, frozen timer, early return not admitted, BREAK COMPLETE at exactly the end, intent-only response, BREAK ALREADY OVER at +5:00, COME BACK PLEASE at +1:00 with no buttons, three-second confirmation with interruption and restart, study timer resumes; break from SECANT-1; return starting at expiry; existing dashboard (both faces, COSECANT evidence, Study history, PAST STUDY SESSIONS view); reset; **determinism**; browser-session isolation; imported-file separation and restoration; SINE / MINE / COSINE untouched; console clean; engine and readers byte-identical.
Focused regression (final build): see the result line at the foot of this file.
Visual (`PHASE_NOTES/evidence/p4_secant_demo_*.png`): neon (SECANT-1, after break), white COSECANT dashboard, 390 px with no horizontal scroll. Other themes not individually screenshotted.

## Checkpoint
`PHASE_NOTES/CHECKPOINT_existing_modules_phase4_secant_20261031/`; backup of the edited files `PHASE_NOTES/backup_before_secant_demo/`; the corrected-COSINE checkpoint (accepted), the engine-rule COSINE checkpoint, MINE, SINE and COT-final checkpoints are preserved.

## STOPPED after SECANT. Thesis work, deployment and any further feature were not started. Awaiting your approval.

**Regression result (final build, all first-run):** SECANT demo 57, corrected COSINE demo 44, MINE demo 32, SINE demo 38, sidebar 5, STORE 55, FINE 46, TANGENT 38, COT 54, control station 56, Study Mode 46, Metric Hub 30, Science Lab 37, MIRL 58, MINE 54, COSINE 60, SECANT 71, functional 51, interaction 34, keyboard 21, harness 23, Academy 37, behaviour 35, wording 11, imported-file organ pages vs the desktop readers 84/84 and 17/17 (with a running simulation), Metric Hub / Science Lab pages 12/12 — 0 failures.
