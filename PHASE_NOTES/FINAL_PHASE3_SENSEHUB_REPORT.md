# MYELIN Web Lite — Final Phase 3: SenseHub (browser demonstration)

Date: 2026-10-31 · Main project: `C:\Users\Dharshan\Downloads\Peterson.com` · Not deployed.
Checkpoint: `PHASE_NOTES/CHECKPOINT_final_phase3_sensehub_20261031` (dist = 95 files, hash `a1711c8fd80f50f8`).

## What this is
The sidebar's SenseHub row (System group) is now a real page: a **web adaptation of the existing MYELIN — Edge SenseHub**, built from the Edge source (read-only: `MYELIN_EDGE_TRIAL/SENSEHUB/page.py`, `report_preview.py`, `oscilloscope.py`, `firmware_lab/`, `glyphs.py`). Everything on it is **SIMULATED**; a persistent banner and per-panel chips say so. No ESP32, serial, Bluetooth, ECG acquisition, compiler, uploader, storage or network call exists in the code (checked by a static scan of the four SenseHub scripts).

## Edge interfaces reproduced
| Edge interface | Web demonstration |
|---|---|
| SenseHub page shell: title, subtitle, LABORATORY MODULE chip, tool switch | Same header; tools FIRMWARE LAB / MYELINOSCOPE / LAB ANALYSIS |
| Lab Analysis tabs: LIVE ANALYSIS, EPISODE HISTORY, DEVICE CONSOLE, GENERATE REPORT | Same four controls |
| Device Connections: ESP32, ADC, BioAmp EXG, status pills, CONNECT TO CONTROL STATION | Clickable pills cycle CONNECTED / WAITING / DISCONNECTED; CONNECT ALL / DISCONNECT ALL; the Control Station button answers "Prototype only — no link is made in this phase." (as in Edge) |
| Signal Acquisition: CH1 HEART (ECG), CH2 BRAIN (EXG), scale chips, stat boxes, START / PAUSE / STOP, elapsed / samples / signal / episode ID, signal mode | Deterministic simulated 72 bpm ECG and EXG tones at 250 Hz, 5 s scrolling window; HELD / RESUME; Heart-only / Brain-only modes |
| Active Event Markers | Edge sample rows plus timestamped (HH:MM:SS.mmm) markers you add; SINE-1/2/3, Verified Return |
| Device Console | Edge sample log, with each simulated action appended and tagged "(simulated)" |
| Episode History + Overview | Edge sample episodes #021 … #010; each recorded run adds a `#DEMO-NN` row |
| Report flow (HEART / BRAIN type first, preview, PDF/CSV) | Dummy layout with drawn simulated plots; PDF / CSV buttons are honest placeholders ("nothing was generated") |
| Firmware Lab layout | Status strip, project tree, editor tabs, device / toolchain panel, OUTPUT / PROBLEMS / MONITOR / PROTOCOL — **VISUAL DEMONSTRATION**; VERIFY / UPLOAD / MONITOR print that no compiler / uploader / serial transport exists and nothing was built, flashed or opened |
| MYELINOSCOPE (Digital Oscilloscope) | CONNECT / DISCONNECT, CH1 active, CH2 "future second BioAmp — NOT CONNECTED" (no signal invented), time/div and amplitude/div, FREEZE / RESET, TRIGGERED / ROLL display, trigger, filter, T1/T2 and V1/V2 cursors, current-view measurements, read-only simulated episode excerpts |

## Not reproduced
MYELIN IDE, Serial Plotter and Wi-Fi tools (they need serial / network / Arduino CLI), and anything that exists in Edge only as a proposal.

## Demonstration-only / additions to flag
* **Phone pickup / return** events (PHONE PICKUP / PHONE RETURN buttons, "PHONE (DEMO)" chip, SENSE marker rows) are a **demonstration addition you requested; phone sensing is not part of the accepted Edge build**, and the marker details say so.
* Edge hosts the oscilloscope inside Science Lab chapter 4; Science Lab was not to change, so MYELINOSCOPE is a SenseHub tool here.
* Marker/console rows and `#DEMO-NN` episodes live in page memory only; nothing is stored, and nothing is added to Live Telemetry (separate simulation).
* Academy lesson 5 still narrates SenseHub as COMING SOON (Academy is protected; not edited).

## Checks (focused)
* `t139_sensehub.py` **64/64**: sidebar and page, header, banner, devices, signal states and clock, pause/resume, modes, phone events with timestamps, history/overview, report flow, Firmware Lab honesty, MYELINOSCOPE controls, seven themes, 390 px layout (fixed two wrapping overflows found by the test), no hardware/network APIs, console clean, protected files.
* Updated expectations only for the SenseHub row (was inert COMING SOON): `t40` 56/56, `t132` 38/38; `t126` 5/5 unchanged.
* Neighbours: `t137` 54/55 and `t138` 26/27 — the single failure in each is their byte check of `templates/research.html`, which the **owner edited at 21:38** (after the Phase 2 checkpoint). This phase did not touch it; it is left as saved. The other 13 owner-protected files are byte-identical to the backup.
* Runtime, organs, popups, module models, imported-database readers, Science Lab, Metric Hub and Academy sources are byte-identical to the Phase 2 checkpoint.
* Evidence: `PHASE_NOTES/evidence_sensehub/` (10 screenshots: live, history, console, report, Firmware Lab, MYELINOSCOPE, white theme, mobile).

## Files
New: `assets/myelin/sensehub-core.js`, `sensehub-lab.js`, `sensehub-tools.js`, `sensehub-view.js`, `sensehub.css`; test `tools/p2/t139_sensehub.py`.
Edited: `templates/myelin_web_sample.html` (nav row + page host), `assets/myelin/ui.js` (import + route). Backup: `PHASE_NOTES/backup_before_sensehub/`.

STOPPED. Phase 4 (MYELIN Guide), thesis work and deployment have not been started.
