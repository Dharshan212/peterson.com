# COSINE correction — the approved five-minute flow replaces the 23:15 demonstration

Date: 2026-10-31 · Main project: `C:\Users\Dharshan\Downloads\Peterson.com` · Not deployed.
Checkpoint: `PHASE_NOTES/CHECKPOINT_cosine_five_minute_correction_20261031` · Backup before editing: `PHASE_NOTES/backup_before_cosine_5min_correction/`.

## What changed
The COSINE demonstration (COSINE page → COSINE DEMONSTRATION source) now drives the **existing desktop-aligned COSINE engine** (the same runtime rules the 35/35 engine-rule demonstration used) on a manual clock, instead of the separate 23:15 model. No timing model was invented.

Flow, all produced by the engine:
1. Certified OTT (Netflix / Prime Video surfaces) foreground evidence; nothing appears before **5:00** (4:55 creates no episode and no popup).
2. At exactly **5:00** the Intention Gate appears **centred** with **SORRY, I'LL COME BACK** and **YEAH, I WANT SOME BREAK**; the popup says an answer is an intention, not proof of return. An unanswered gate stays (the engine has no timeout).
3. **Return intention** → the existing 5:00 return window; continued streaming converts it into the break request (break-length popup, "START WATCHING").
   **Intentional break** → break-length popup ("SET TIME"), whole minutes **10–200** (9, 5 and 201 refused with the engine's message; 10 and 200 accepted).
4. Break acknowledgement (YAY; the break clock is unchanged), deadline, button-less **Final Callback** (protected, darker backdrop).
5. Staying on streaming is not a return. A real simulated return to the work task starts the engine's focus verification; focus must be **continuous 10 s** (a relapse resets it), then the **60 s** closure confirmation; the episode closes only after both (also on the break-request branch).
6. Netflix ↔ Prime Video is a Hopper transition inside the same episode, shown on the existing COSINE page and **COSINE — Deep Analysis** dashboard.

`TRIGGER COSINE POPUP` uses only the existing controls (start if needed, open a streaming platform, advance to the engine's own 5:00 gate); a second press while the gate is displayed is refused.

## Files changed (all in `templates/assets/myelin/`)
* `cosine-demo.js` — restored from the engine-rule version and re-integrated with the centred popup stage (popup card derived from the engine's displayed popup; its buttons call the same `rt.command()` paths; popup removed on reset / leaving the demonstration).
* `cosine-station.js` — back to the accepted engine-rule file (the 23:15 event labels were removed).
* `cosine-ott-model.js` — **deleted** (the standalone 23:15 model). `dist` rebuilt from scratch (94 files; it is no longer served: 404).
* `ui.js` — two COSINE lines only: the demo constructor receives `cosineLive`, and `cosineLive(model, rr)` accepts the demonstration runtime again.
* Tests (`PHASE_NOTES/tools/p2/`): new `t140_cosine_five_minute.py`; `t137` COSINE section updated for the five-minute popup; the `cosine-station.js` baseline removed from the byte-identity lists of `t137/t138/t139` (t140 Z1 covers it).

## The incorrect 23:15 flow
No longer active or reachable: no 23:15 initial popup, no 10 MORE MIN / FINISH MY SHOW, no Welcome Back popup or trigger, no OTT-gap / CONTINUED WATCHING model; the page text and sources contain none of them (tested). There is one COSINE demonstration only.

## Test results
* `t140_cosine_five_minute.py` **73/73** — flow, popup at 5:00, both branches through the popup, 10–200 validation (9 / 5 / 201 refused, 10 / 200 accepted), five-minute return window, acknowledgement, Final Callback, genuine-focus relapse, 10 s verification, 60 s confirmation, closure only after valid return, Hopper (3 transitions), Deep Analysis, centred on desktop and at 390 px (no sideways scroll), imported-database separation and restoration, browser-session isolation, SINE/MINE switches untouched, console clean, protected files.
* Neighbours: `t137` 54/55 and `t138` 26/27 — the one failure in each is the byte check of `templates/research.html`, the owner's own newer edit (unchanged by this correction, identical to the SenseHub checkpoint); `t139` 64/64; `t53` (COSINE page + Deep Analysis, browser-session) 60/60; `t40` 56/56; `t126` 5/5; `t132` 38/38.
* Evidence: `PHASE_NOTES/evidence_cosine_5min/` (gate, break-length popup, acknowledgement, Final Callback, page after closure, 390 px gate).

## Other modules / protected areas
SINE, MINE, SECANT/COSECANT, STORE, FINE, TANGENT, COT demonstrations, the shared popup stage and popup family, runtime and organs, Live Telemetry, SenseHub, imported-database readers, Science Lab, Metric Hub, Academy and `cosine-data.js` are byte-identical to the SenseHub checkpoint (test Z2). The other 13 owner-protected files match the transfer backup; `research.html` was not touched. Desktop MYELIN Core / Edge untouched.

## Notes
* The Control Station's own (non-demo) COSINE popup still uses the web labels "I'M COMING BACK" / "SET A TIME" from `popups.js`; the demonstration popup uses the desktop labels you specified. `popups.js` was not changed. Say if you want the Control Station labels aligned.
* Desktop text and the MIRL specification quote different return timings (10 s / 60 s here vs 300 s / 10 s); the engine as is was used, as before.

STOPPED. Phase 4 — MYELIN Guide has not been started.
