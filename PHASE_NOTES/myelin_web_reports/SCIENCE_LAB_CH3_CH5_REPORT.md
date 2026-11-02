# MYELIN Web — Science Lab Chapter 3 certification and Chapter 5 results (imported database)

Date 2026-10-30 · Working copy `Peterson.com_MYELIN_WORKING` · Build `dist/` 75 files, content hash `ff019c089717c88b` (unchanged during the regression) · **Not deployed.** The protected original `Peterson.com`, MYELIN Core, Edge, SenseHub, the desktop sources and every original `.db` were not touched. The accepted database-integration baseline is preserved in `PHASE_NOTES/CHECKPOINT_db_integration_baseline_20261030/` as the rollback point.

## 1. What now works

Open a MYELIN `.db` (schema 9) and go to Science Lab:

| Chapter | Before | Now |
|---|---|---|
| 3 — Data Analysis | Unavailable | Lists the file's experiments. **OPEN ANALYSIS** rebuilds and certifies one experiment from the file's durable evidence and shows the whole package: source coverage, key metrics (with the exact desktop nanosecond form), successful-return onset latency, whole-MYELIN summary, timeline, certified patterns, derived findings, SINE stages, MINE / COSINE / COSECANT / SECANT rows with their experiment scopes, limitations and provenance. |
| 5 — Results & Discussion | list only, results Unavailable | **VIEW RESULTS** shows the desktop's *HISTORICAL RECONSTRUCTION* summary and the seven Results & Discussion sections, worded as `build_chapter5_presentation` words them. |
| Experiment that cannot be certified | — | Shows `Unavailable: <the desktop's exact reason>` and **no result**. |

Nothing is estimated or fabricated: a package exists only when the ported fail-closed analysis certifies it. The reconstruction is labelled HISTORICAL RECONSTRUCTION, never TRANSFERRED (same rule as the desktop history dialog); PDF export stays disabled for imported evidence; the simulator experiment workflow does not run while a file is open. Imported bytes are still never stored or uploaded.

## 2. How it is built (reusing the accepted architecture)

* `db-import/sciencelab.js` (NEW, previous stretch): faithful port of `SCIENCE_LAB/analysis.py`, `evidence.py` and `history.reconstruct_historical_experiment`, including the SECANT recorder-readiness / digest / lifecycle certification, full-containment rules for MINE / COSINE / SECANT, MIRL successful-return chain and official EPI / MINE / COS display codes. Reuses `organs.js`, `metrichub.js` readers and the worker's literal-SQL allow-list (added `normal_break_events`, `study_events`).
* `db-import/worker.js` / `client.js`: new `reconstruct` op behind the same integrity + schema-9 gate.
* `imported-source.js`: new cached `reconstruction(experimentId)` (keyed by experiment and display zone, discarded with the file).
* `science-certified.js` (NEW): presentation only — the port of the Chapter 5 presentation builder, the Chapter 5 result view and the Chapter 3 package view. A rendering fault now shows a visible message instead of a blank page.
* `science-import.js`: experiment lists for both chapters; `ui.js` (two in-line call changes), `desktop-skin.css` (+6 rules).

## 3. Desktop-versus-browser parity

The desktop's real `gather_session_evidence` + `analyze_finalized_session` run on private copies; the browser's whole package is compared field by field (including provenance, display codes and every limitation text).

| Suite | Result |
|---|---|
| t124 real snapshot, 17 experiments + 2 invalid ids × 2 zones | 38/38 |
| t124 18 fail-closed / incomplete-evidence files | 325/325 |
| t125 pages vs the desktop package / reasons (real + 6 files) | 1,431/1,431 |
| Consolidated regression of every earlier suite on the final build | all passed on first run (list in `test_output_control_station/fin2_summary.txt`) |

Fail-closed cases whose *reasons equal the desktop's*: session without closure timestamp, experiment still RUNNING, malformed or zero-length window, MIRL chain broken, unknown MIRL event name, SINE payload not JSON / without identity, trigger acceptance broken, MINE structural error, MINE / COSINE episode crossing the boundary, duplicate COSECANT fact, malformed COSECANT effective time, Study completion without block, NORMAL_BREAK payload not JSON, SECANT receipt removed or digest tampered.

## 4. Honest record

* **Fixture defects (mine, fixed):** the first fail-closed run (76/344) compared against a desktop that refused my reduced fixture files (foreign-key orphans, then orphaned presentation aliases after deleting evidence). The mutants are now made from the full snapshot; the invalid run is kept as `sci_mut_run1_invalid_fixtures.txt` in the scratch folder.
* **Page defect found by the new page test and fixed:** a provenance reference without a monotonic time threw while rendering, leaving a blank Chapter 3 page for one real experiment. Fixed, and a visible fallback message added for any future render fault.
* **Documented difference:** a file that fails SQLite's own integrity check (mutant S03: a CHECK-violating experiment row) is refused by the browser's integrity gate at once; the desktop reader simply cannot list its experiments. Not a defect — the stricter gate is the accepted behaviour for every dashboard.
* **t63 (memory after REMOVE FILE)** passed in this run (12/12). No reproducible growing leak was seen; it was not investigated, as instructed.
* The test-writing steps used a stand-alone Python restatement of the Chapter 5 section wording as an independent check of the JavaScript transcription.

## 5. Limitations

* PDF export of a historical reconstruction (desktop `generate_report_pdf`) is not offered for imported evidence.
* Chapter 5's seven sections for a historical reconstruction are an addition on top of the desktop's history dialog (which shows only the compact summary); they use the desktop's own wording and are labelled as a reconstruction, not a transfer.
* Measured in headless Chrome on this machine; a very large file reconstructs on request in the worker (about a minute for the 17-experiment real snapshot's heaviest runs in the test harness).
* Everything listed in the earlier report (snapshot not live, 250,000-row cap, no plain "UTC" zone, SECANT `archive_diagnostics` not displayed) still applies.

## 6. Files changed (shipped)

New: `science-certified.js`, `db-import/sciencelab.js`. Edited: `science-import.js`, `imported-source.js`, `ui.js` (two in-line calls), `db-import/worker.js`, `db-import/client.js`, `db-import/organs.js`, `db-import/metrichub.js`, `desktop-skin.css`. Not shipped: `tools/gold_science.py`, `tools/p2/t124_science_parity.py`, `t125_science_result_pages.py`, `make_science_mutants.py`, `run_final_all_v2.sh`, updated `t123` (Chapter 5 buttons now enabled for eligible experiments; Chapter 3 no longer "Unavailable").

## 7. How to try it

Serve `dist/` with `py -3 PHASE_NOTES/tools/serve_with_headers.py dist 8801`, open `http://127.0.0.1:8801/index.html`, Settings → OPEN DB FILE, then Science Lab → Chapter 3 (OPEN ANALYSIS) or Chapter 5 (VIEW RESULTS). Changing the display time zone re-reconstructs with the new zone's display codes. REMOVE FILE returns to the simulation.
