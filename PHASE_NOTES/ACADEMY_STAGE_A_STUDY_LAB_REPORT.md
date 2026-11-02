# MYELIN Academy — Stage A: Study Mode teaching simulation

Date: 2026-11-01 · `C:\Users\Dharshan\Downloads\Peterson.com` · Not deployed · **Stage B (full Academy) not started.**
Checkpoint: `PHASE_NOTES/CHECKPOINT_academy_stageA_study_lab_20261101` · Backup before editing: `PHASE_NOTES/backup_before_study_lab/` · Evidence: `PHASE_NOTES/evidence_study_lab/`.

## 1. What the accepted rules actually are (read-only inspection of the desktop source)
Authority: `MYELIN_EDGE_TRIAL/COSECANT_STUDY_MODE/study_alignment.py` (schema `myelin-study-evidence-v5`) and `CORE_ENGINE/resource_intent.py` (classifier v12).
* **Keyword weights: ordinary = 1 point, important = 2 points. There is no 3-point "core-subject" tier** in the accepted calculator. (Your brief mentioned 3; I implemented the accepted 1 / 2 and did not invent a tier. Core coverage means the *share of important keywords matched*, used for a cap, not extra points.)
* Multi-word entries split into words; each word counts once; important wins over ordinary; common words (the, of, video, study …) score nothing.
* Confidence = matched points ÷ possible points, minus background-mismatch penalties (funny, compilation, highlights … unless your subject/task justifies them), then **held back by caps**: uncertified identity or any mismatch → 74; only one usable keyword → 74; only one matched → 50; no important keyword matched → 50; fewer than half of ≥ 2 important matched → 50. If the whole task title appears in a certified learning resource, 100.
* **Bands (Resource Intent):** ≥ 75 and certified identity → STUDY ALIGNED; > 25 → UNCERTAIN (reported as 50 %); otherwise OFF-TASK. Words never certify identity.
* **Uncertain:** no off-task dwell, no SINE; after 300 s of unresolved uncertainty a Study confirmation asks (and again every 300 s): "IS THIS PART OF YOUR CURRENT STUDY?" with **THIS IS STUDY MATERIAL** and **I'M COMING BACK**. The first makes the resource effectively STUDY ALIGNED (SINE withheld); the second makes it a confirmed off-task fact whose dwell starts at 0.
* The existing Web Lite Study Mode engine does not score keywords (it matches the exact resource ID), so the lab is a separate teaching module that ports the desktop arithmetic; the engine, SECANT and COSECANT were not touched.

## 2. What was built (3 new files + 2 link lines)
`study-lab-core.js` (pure model: calculator port, bands, scenario builder, validation), `study-lab.js` (UI, mounts itself into Study Mode, exposes `window.myelinStudyLab` for Stage B), `study-lab.css`; `myelin_web_sample.html` gains two link lines. No other file changed.
In Study Mode a new bar offers **STUDY SESSION** (the real page, default) and **STUDY TEACHING SIMULATION** (the lab; the real page is hidden, not removed). The lab is labelled SIMULATED TUTORIAL — NOT MONITORING.
1. **Choose a video** — DEFAULT VIDEO (prepared example "How Neurons Fire: The Action Potential Explained", clearly a tutorial example) or CUSTOM VIDEO (own title, subject, task, optional URL, keywords, important keywords). The URL is a declared resource only: never opened, fetched or inspected (tested: no network request). Custom input is validated in plain English.
2. **Prepare** — study length (presets 25/45/60/90), break length, subject, task, keywords, important keywords, PREPARE; every field has a numbered explanation. Optional COPY TO THE STUDY MODE FORM / COPY FROM THE STUDY MODE FORM write only the six real form fields, only when pressed.
3. **Keyword points** — evidence-not-rewards explanation, your declared keywords with 1 / 2 points and the total, the 75 / 25 bands, the six safety limits in plain English, and **TRY IT** (type any title: matched words highlighted, points table, caps, confidence, band bar; identity toggle shows the 74 cap).
4. **Three outcomes** on a **manual clock** (+10 s, +1 min, +5 min, ADVANCE TO THE NEXT STEP, RESET):
   * **Aligned** — evidence, highlighted matches, verdict; off-task dwell NONE, distraction warning NOT SHOWN, SINE / SECANT withheld; stays quiet however long the clock runs.
   * **Uncertain** — partial matches and the missing important keywords; no popup before 5:00; at exactly 5:00 the centred **Study confirmation** appears with the desktop wording; unanswered it stays and asks again at 10:00; THIS IS STUDY MATERIAL → effective STUDY ALIGNED; I'M COMING BACK → confirmed off-task, dwell restarts at 00:00 (called an intention, not a measured return). Explains why uncertain is not a confirmed distraction.
   * **Not aligned** — no matches, mismatch words named; dwell 00:00 / 05:00; at 5:00 "SECANT-1 DUE" and a hand-off button to the existing SECANT simulation (no SECANT popup is faked here).
   An isolated **tutorial event list** (STUDY_RESOURCE_DECLARED … STUDY_CONFIRMATION_RECORDED …) is labelled as not part of Live Telemetry, history or imported evidence.
For a custom video the three observed titles are generated from the visitor's own words and verified by the calculator (aligned needs ≥ 2 different keywords and ≥ 1 important one; if "uncertain" cannot be built from partial matches it uses the uncertified-identity example).

## 3. Verification
* `t143_study_lab.py` **46/46**: the browser calculator reproduces the real desktop calculator on **23 golden cases** (confidence, caps, points, coverage, penalties, suspicious keywords, basis, reasons, per-keyword evidence, band) — golden file generated from the actual `study_alignment.py` by `study_lab_golden.py`; default and custom flows; validation; URL never fetched; points lesson; three outcomes incl. both confirmation answers and the exact 5:00 timing; centred popup; isolation (engine IDLE, Live Telemetry count and local/session storage unchanged); accessibility (labels, aria-current, status, aria-pressed, no tiny buttons); seven themes (contrast ≥ 4.5, no overflow); 1280 / 1024 / 980 px; only the new files + two link lines changed.
* Regression: `t44` Study Mode 46/46, `t54` SECANT 71/71, `t136` SECANT demo 57/57, `t40` 56/56, `t140` COSINE 73/73, `t139` SenseHub 64/64, `t141` 124/124, `t142` 24/24 (these two had their file-list baselines extended), `t137` 54/55 (the one miss is your newer `research.html`).
* Not done: the physical phone (Stage A is desktop-first; phones follow the Desktop-site policy).

## 4. Decisions / notes for you
1. **Weights are 1 and 2** (accepted v5). Say if you want a different teaching weight; that would be a desktop-rule change, not a tutorial change.
2. The off-task pathway ends at the SECANT hand-off. The SECANT-1/2/3 popups, schedule (5:00, +10 min, +13:15 min was **not verified in this stage**) and the SECANT dashboard are Stage B.
3. The default video's three observed titles are authored; they are verified in the test (90.909 % / 36.364 % / 0 %).
4. Desktop-only wording note: the uncertain popup uses the desktop's own labels (including "I'M COMING BACK" on the second button).

STOPPED after Stage A. Stage B (Control Station + telemetry chapters, connecting this lab, SECANT / COSECANT lessons, organ choice, closing letter, signature, HAPPY SURFING) waits for your approval.
