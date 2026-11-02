ORGAN COMPLETED: TANGENT (Phase 3) — browser simulation. Not deployed.

# Implemented
* **Menu → Modules → TANGENT** is a real page. **Main page:** episode banner (status + latest episode state), three boxes in the requested order — **Gaming sessions · Reminders shown · Returns** — a **Journey Map** of the latest session built from its own recorded events (older/newer arrows), **Recent gaming sessions (latest 5)**, **Most used gaming platforms** donut (by observed game entries), simulation controls, event log, OPEN TANGENT DASHBOARD. Labelled SOURCE: LOCAL EVENTS (SIMULATION), IST.
* **Dashboard — exactly three tabs:** *Session List* (game / platform with neutral letter chips — no brand logos, time entered IST, total dwell, time exited IST or "Exit not recorded yet (ongoing)", episode link or recorded state; time range 24 h / 7 d / 30 d / custom IST; game filter; ten per page, newer/older); *Episode History* (visual episode **maps**, ten per page, older/newer, custom range, game filter, details panel; sessions that ended before the reminder have no episode and no reminder node); *About* (what TANGENT is, the three metrics, event-flow legend, data source and limitations, open decisions).
* **GET REPORT:** a simple simulation-evidence report (counts, platforms, sessions, events, limitations), banner "SIMULATION EVIDENCE — NOT REAL GAMES OR REAL MONITORING", preview + .TXT download identical to the preview.

# Rules (from the plan; implemented deterministically on the simulation clock)
* Reminder at **entry + 23:15** while the game is still open, recorded once at that exact instant (also when the clock jumps past it, and before a later exit); it **creates the episode**. The reminder is a **persistent prompt with no buttons**: it has no response events.
* A **game exit is never a verified return**; it is recorded as an exit ("exit is not a return"). A session that ends before 23:15 is a session with no episode.
* Episode ids `TAN-DDMMYYYY-NN` from the IST date of the reminder. Unknown exit times are shown as ongoing, never invented. All times IST.

# Demonstrated only
**RECORD DEMONSTRATION RETURN (NOT BROWSER-OBSERVED)** is a visitor-pressed button (only after the exit, once, for the most recent episode). The RETURNS box counts these demonstration events and is flagged DEMO EVIDENCE; maps tag the node "DEMO · NOT BROWSER-OBSERVED". The web page cannot detect, block or overlay any real game and is not an OS-level intervention; game / platform names are demonstration entries. Nothing is stored, uploaded, read from an imported file or connected to any service.

# Open decisions (T1–T8, also on the About tab; none invented)
T1 confirm the 23 min 15 s threshold and the persistent no-button prompt (taken from the plan, "to be verified") · T2 what happens after the reminder (second prompt, escalation, limit) · T3 the intentional gaming break and its relation to other organs · T4 the real evidence of a return and how long it must last · T5 episode closure and outcome names (none shown; the design's Returned / Continued / Timeout / No Episode were NOT used) · T6 supported games / launchers and how a game is identified · T7 conflict rules · T8 the real report content and format.

# Tests (focused)
`t129_tangent.py` **38/38** (rules with an injected clock: 23:14 vs 23:15, once-only reminder, no response events, exit never a return, demo evidence rules, early exit, IST ids across the date boundary; page: three boxes, journey map, recent sessions, platform donut, controls, three tabs, ongoing exit, game filter, episode link, maps not tables, invalid range, About + T1–T8, forbidden outcome wording absent, report preview + download, ten per page over 15 episodes, imported-file isolation, STORE and FINE untouched, console clean). Regression: STORE `t127` 55/55, FINE `t128` 46/46, `t126` 7/7 (COT still reserved), `t40` 56/56, `t46` 37/37, `t53` 60/60, `t54` 71/71, `t101` 35/35, `t112` 11/11. Visual check at desktop and 390 px (no horizontal scroll). The first run of the new test passed after correcting three expected values in the test itself (not the product).

# Files
New: `assets/myelin/tangent-model.js`, `tangent-view.js`, `PHASE_NOTES/tools/p2/t129_tangent.py`. Edited: `ui.js` (one import + one render branch), `source-bar.js` (TANGENT no longer a data-less placeholder), `desktop-skin.css` (+`tn-*` rules), test `t126`. dist = 81 files. STORE and FINE files untouched.

# Rollback
`PHASE_NOTES/CHECKPOINT_tangent_phase3_20261030/`; STORE, FINE and Science Lab checkpoints and `backup_before_tangent/` preserved.

# STOPPED. COT not started. Awaiting explicit approval before any further phase.
