# MYELIN Web — transfer into the original `Peterson.com` (2026-10-31)

Source: `C:\Users\Dharshan\Downloads\Peterson.com_MYELIN_WORKING`  →  Destination: `C:\Users\Dharshan\Downloads\Peterson.com`. Not deployed. The working copy and all its rollback checkpoints were not touched or deleted.

## 1. Backup
`C:\Users\Dharshan\Downloads\Peterson.com_BACKUP_BEFORE_MYELIN_TRANSFER_20261031` — a complete copy of the original taken before any change, verified identical file-by-file (140 of 140, SHA-256; manifest `BACKUP_MANIFEST_SHA256.txt` inside it, and the per-file transfer log `TRANSFER_LOG.txt`). The pristine Oct 25 archive `Peterson.com_BASELINE_20261025.zip` also still exists.

## 2. How it was merged (not a folder replace)
A three-way comparison was made for every file: the Oct 25 baseline manifest (81 files) vs the original now vs the working copy.

| Class | Files | Action |
|---|---|---|
| Your newer work in the original | 14 (`templates/index.html`, `templates/research.html`, `views.py`, `bluepad32-thesis.html`, `anesthesia-control-research.html` and their 9 asset files) | **left exactly as they were** |
| Working copy newer, original still equal to the baseline (`scripts/build-static.mjs`, `templates/_headers`, `assets/myelin/web-lite.css`) | 3 | updated |
| Changed in both lineages (`ui.js`, `myelin_web_sample.html`) and 6 module files present in both with different content (`cosine-station.js`, `desktop-skin.css`, `live-mirl.js`, `mine-station.js`, `science-ch6.js`, `secant-station.js`) | 8 | updated **after proving** each original copy is byte-identical to an earlier snapshot kept in the working copy's backups/checkpoints, i.e. it contains no edits of yours; the guard aborts if that is not true |
| New files | 39 | added (module code, database readers, vendored SQLite engine with its licence files, `RUN_WEB_LITE.bat`) |
| Dev tooling (outside published folders) | 2 | `PHASE_NOTES/tools/build_equiv.py` (updated allow-list build) and `serve_with_headers.py` (local server with the release headers) |
| Docs | 5 | module reports with their open decisions in `PHASE_NOTES/myelin_web_reports/` |

Result: 12 files updated, 45 added, **0 removed, 0 conflicts left unresolved** (the 8 apparent conflicts were all resolved as ancestors, none needed a manual textual merge). Nothing was silently discarded.

## 3. Newer changes preserved
Confirmed by hash against the backup: all 14 of your newer files are byte-identical to before the transfer, and every changed file is from the working-copy lineage. `views.py`, `index.html` (which links to `myelin_web_sample.html`) and `research.html` were not edited.

## 4. What was transferred
MYELIN Web Lite interface and navigation; Database Explorer and the imported-database readers (SQLite engine, schema-9 readers); SECANT, MIRL, MINE, COSINE integrations; Metric Hub; Science Lab Chapters 3, 5 and 6; STORE, FINE, TANGENT, COT (with the final popup-priority correction); the dashboard designs, simulations and TXT reports; styling, scripts, brand assets, release headers and the build configuration (`scripts/build-static.mjs`, `_headers`, `build_equiv.py`). **Not copied:** databases, the real snapshot, test fixtures, test suites, scratch data, logs, screenshots and the working copy's checkpoints (they stay in the working copy). The shipped files contain no local paths, database names or real-data identifiers (scanned).

## 5. Final build and smoke tests (from the original directory)
* `dist/` rebuilt in the original with `PHASE_NOTES\tools\build_equiv.py`: 83 files, content hash `cf0686584e74c54c` — **identical to the working copy's final build** (the final COT checkpoint). No `.db/.py/.pdf` in `dist`.
* All 127 internal references (page links, scripts, styles, module imports) resolve; the release CSP (with the SQLite `wasm` allowance) is served.
* Smoke tests against a server serving the original's `dist`: module menu and four pages 5/5; STORE 55/55; FINE 46/46; TANGENT 38/38; COT 54/54 and popup-priority 22/22; control station 56/56; Study Mode 46/46; Metric Hub 30/30; Science Lab 37/37; MIRL 58/58; MINE 54/54; COSINE 60/60; SECANT 71/71; labelling / isolation 35/35; wording 11/11; imported-database Metric Hub + Science Lab pages on the real snapshot 12/12; Chapter 3 / 5 result pages on the real snapshot 44/44. All first-run passes. The full development regression campaign was not repeated.

## 6. Remaining (not done here)
* `views.py` (your newer Flask file) has no route for `myelin_web_sample.html` or `assets/myelin/…`; the published site uses `dist/` (Netlify), so this only matters if you serve through Flask. Left for your decision.
* Node is not installed here, so the Node build `scripts/build-static.mjs` was updated but not run; the Python build was used and verified identical in intent (same allow-list).
* MYELIN Web is **not deployed**; final website acceptance and deployment are separate steps.
* Still to do on the website: thesis page and demo videos (not started), the open design decisions listed in the module reports (STORE D-items, FINE F1–F8, TANGENT T1–T8, COT C1–C8), real-data report formats, other-theme visual checks.
* The `PHASE_NOTES/backup_original_before_secant/` folder that already existed in the original was left in place.
