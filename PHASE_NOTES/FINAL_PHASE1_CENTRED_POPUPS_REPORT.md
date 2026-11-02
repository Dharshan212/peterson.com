# MYELIN Web Lite — final Phase 1: centred popup simulations (all eight modules)

Project: `C:\Users\Dharshan\Downloads\Peterson.com` (the master site). Not deployed. Phases 2–4 (Live Telemetry, SenseHub, MYELIN Guide) were not started.

## What was built
A shared **centred popup stage** (`assets/myelin/popup-stage.js` + appended rules in `popups.css`). Every module now shows its popup **in the middle of the viewport** (desktop and mobile) on a **translucent, non-blocking backdrop**, with a top label *"<MODULE> POPUP · SIMULATION · NOTHING IS MONITORED"* and a **HIDE / SHOW POPUP** button. Protected / persistent no-button popups get a darker backdrop. Every module also has a **TRIGGER … POPUP** button that only chains that module's own existing controls (start, open the activity, advance the clock to the next step the engine / model defines) — no timing or rule was changed.

| Module | Trigger button | Popup (as shown) | Source of the design |
|---|---|---|---|
| SINE / Live MIRL | TRIGGER NEXT SINE POPUP | SINE-1, SINE-2, SINE-3 (protected red, no buttons), Normal Break selector, post-break gate | the accepted popup family (`popups.js`), unchanged |
| MINE | TRIGGER NEXT MINE POPUP | MINE-1, duration, MINE-2A / 2B | accepted family |
| SECANT / COSECANT | TRIGGER NEXT SECANT / COSECANT POPUP | SECANT-1 (RETURN TO STUDY / NEED BREAK), SECANT-2, SECANT-3 (no buttons), BREAK COMPLETE, BREAK ALREADY OVER, COME BACK PLEASE (no buttons) | accepted family |
| COSINE | TRIGGER COSINE POPUP / TRIGGER WELCOME BACK POPUP | the corrected 23:15 popup (10 MORE MIN / FINISH MY SHOW) and WELCOME BACK (no buttons) | SINE-layout card in the same visual family |
| STORE | TRIGGER STORE POPUP | prompt with I'M BACK / I WANT TO SHOP + the chosen-time field | same card family |
| FINE | TRIGGER FINE WARNING | warning with TAKE A BREAK / CONTINUE ORDERING | same card family |
| TANGENT | TRIGGER TANGENT REMINDER | persistent reminder, no buttons | same card family |
| COT | TRIGGER COT CHECK-IN | "Is it related to your work?" YES / NO / NOT NOW and the reply with CLOSE (was a bottom-right corner card) | same card family |

* **Functional:** popup buttons call the module's own command path (the demonstration Runtime for SINE / MINE / SECANT, the ledger or model for the others); the page tiles, journey maps and dashboards update as before.
* **Live telemetry:** each popup's own readouts follow the simulation clock (e.g. SINE "DISPLAY WINDOW" counts down after +30 s; STORE / TANGENT show time on site / in game, refreshed every second) and the module's page tiles update on every step.
* **Lifecycle:** a popup disappears when its simulation removes it, when you leave the page, switch back to BROWSER SESSION, or open an imported database file (the imported view never shows a simulated popup); it returns with the page's still-pending simulated state.
* **Themes:** centred and visible in all seven themes (neon, white, black, purple + the amber / red / green stage palettes).
* **Mobile:** the older rule that docks the Control Station popup to the bottom edge is overridden inside the stage, so demo popups are centred on a 390 px viewport as well.

## Limitations (genuine)
1. **Wording:** the accepted designs fix buttons and states, not copy, for the card popups. Headlines such as "Shopping time reached", "Food-ordering warning", "Gaming reminder", "Streaming time reached" and WELCOME BACK's line are neutral, factual placeholders (button labels are the approved ones). Replace them when approved copy exists.
2. **TANGENT** reminder is shown while the game is open and removed when the game is exited (a presentation choice; the model defines no closure). **COSINE's WELCOME BACK** card stays while the focus application is the current activity.
3. **SINE's 3-second "BREAK ACTIVE" window** is not drawn (the page row shows the active break); the selector popup and the post-break gate are.
4. The backdrop dims but does **not** block the page (so the simulation controls stay usable); drag-to-move works on the runtime-driven popups only.
5. The **Control Station's own** popups are unchanged (already centred; no backdrop added).
6. **"Live telemetry"** here means popup / page readouts following the manual or ledger clock; a continuously running live feed is Phase 2.
7. Default **SECANT study length** changed from 25 to 60 minutes (a form default) so SECANT-3 (at 28:15) can be reached by the trigger button; no rule changed.
8. The **working copy** (`Peterson.com_MYELIN_WORKING`) was intentionally not modified; `Peterson.com` is now ahead of it by this phase.

## Files
New: `assets/myelin/popup-stage.js`; test `PHASE_NOTES/tools/p2/t137_centred_popups.py`. Edited: `sine-demo.js`, `mine-demo.js`, `cosine-demo.js`, `secant-demo.js` (popup hook + trigger + source-switch clean-up), `store-view.js`, `fine-view.js`, `tangent-view.js`, `cot-view.js` (popup spec + trigger), `popups.css` (appended stage rules). **Unchanged (byte-identical to the accepted working copy, tested):** runtime, simulator, every organ, `popups.js`, the STORE / FINE / TANGENT / COT / COSINE models, the SECANT / MINE / MIRL / COSINE dashboards and imported-database readers. **The 14 owner-newer files** (index, research, views, thesis pages and assets) are byte-identical to the backup (tested). dist = 89 files.

## Tests
`t137_centred_popups.py` **55/55**: per module the trigger, centring (desktop 1440×900 and mobile 390×844, |offset| ≤ 2.5 px and fully inside the viewport), backdrop + SIMULATION label, existing buttons / protected no-button states, working buttons, popup telemetry following the clock, hide / show, seven themes, navigation / source-switch / imported-file clean-up, owner files and engines unchanged, console clean.
Targeted regression on the master `dist`, all passing: SECANT demo 57, COSINE demo 44, MINE demo 32, SINE demo 38, sidebar 5, STORE 55, FINE 46, TANGENT 38, COT 54 (after restoring the popup's `aside` element), control station 56, Metric Hub 30, Science Lab 37, MIRL 58, MINE 54, COSINE 60, SECANT 71, functional 51, keyboard 21, harness 23, Academy 37, imported-file organ pages vs desktop 84/84, Metric / Science pages 12/12; interaction 34/34 (one earlier run showed 25/34 only because the Academy intro appeared late while the machine was busy; two clean re-runs passed).
Visual: `PHASE_NOTES/evidence_centred_popups/` — eight desktop popups (neon), COT / MINE in the white theme, and mobile STORE / SECANT.

## Checkpoint
`PHASE_NOTES/CHECKPOINT_final_phase1_centred_popups_20261031/` (templates, dist hash `da4dbf8976f7a06d`, test). Rollback to the state before this phase: `Peterson.com_BACKUP_BEFORE_FINAL_MYELIN_TRANSFER_20261031` plus `PHASE_NOTES/backup_before_centred_popups/` (the edited files).

## STOPPED. Phase 2 Live Telemetry, Phase 3 SenseHub, Phase 4 MYELIN Guide and deployment were not started. Awaiting your approval.
