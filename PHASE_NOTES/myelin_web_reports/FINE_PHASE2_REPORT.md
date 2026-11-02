ORGAN COMPLETED: FINE (Phase 2) — browser simulation. Not deployed.

# Implemented
* **Menu → Modules → FINE** is a real page (no longer a reserved placeholder). Main page (per the reference): episode banner (ACTIVE / INACTIVE), four boxes — **Food website entries · Distraction warnings · Returns without ordering · Returned after finished break** — a **Recent FINE episode flow** map built from the latest episode's own recorded events, **Most visited food website** (entry-count bars), platform behaviour (sessions / average / longest), latest events, **OPEN FINE DASHBOARD** and REFRESH. Everything is labelled SIMULATION (DEMO EVENTS), IST.
* **Simulation controls:** open site, browse menu, show FINE warning, TAKE A BREAK / CONTINUE ORDERING, finish break, exit, demonstration return, +1 min / +1 hour clock, and three **separate ordering-outcome choices** (order placed / no order placed / attempted, not completed), clear data, plus a latest-12 event log.
* **Dashboard (4 tabs):** *Overview* (total episodes, returns, last recorded outcome, recent activity); *Episode History* (ids `FINE-DDMMYYYY-NN` from the IST date of the warning, journey maps not tables, 24 h / 7 d / 30 d / custom IST range, ten per page with newer/older); *Ordering Analytics* (successful orders, visits with no order placed, attempted-not-completed, line graph over time per hour/day in IST, donut of most-used websites labelled "based on visits, not orders", explicit count of visits with no outcome recorded); *About FINE* (flow, metric meanings, simulation and privacy limits, open decisions).
* **GET REPORT:** a simple text report built only from the simulated events (counts, outcomes, most visited, episodes, event list, limitations), banner "SIMULATION EVIDENCE — NOT REAL ORDERS OR REAL MONITORING", preview plus .TXT download. No real orders or monitoring are claimed.

# Rules honoured
* Success / failure / non-ordering are **separately recorded choices**, never inferred from a visit, cart or exit; a visit with no recorded outcome is counted in none of them (and said so).
* "Returns without ordering" = demonstration returns on visits separately recorded as "no order placed"; "returned after finished break" = demonstration return after a finished break. The return is a **demonstration button, not browser verification**, flagged DEMO on the boxes and nodes.
* No ordering/payment API, no database, nothing stored or uploaded or read from an imported file. STORE files untouched (its test still 55/55).

# Demonstrated only / open decisions (F1–F8, also on About FINE; none invented)
F1 what triggers a warning and its wording · F2 real response choices and break length · F3 real return / finished-break evidence · F4 whether an attempted-not-completed order counts as "no order placed" for the returns metric (here: only the "no order placed" choice) · F5 episode closure and outcome names · F6 supported websites (Zomato, Swiggy, Domino's, Uber Eats, Other are demo entries) · F7 conflict rules · F8 real report content/format.

# Tests (focused)
`t128_fine.py` **46/46** (event rules with an injected clock incl. IST ids across the UTC/IST boundary; all metric boxes; flow map; most visited; controls; four tabs; custom range; pagination 10/page over 18 episodes; separate outcomes; line graph/pie data equals the counts; empty-range message; report preview and downloaded blob equal; imported-file isolation; STORE untouched; console clean). Regression: STORE `t127` 55/55, `t126` 9/9 (TANGENT, COT still reserved), `t40` 56/56, `t46` 37/37, `t51` 58/58, `t101` 35/35, `t112` 11/11. Visual check at desktop width and 390 px (no horizontal scroll). During the work: 3 test-side mistakes and one small real bug (focus did not return to the opener because the page re-renders while the dashboard is open) were fixed.

# Files
New: `assets/myelin/fine-model.js`, `fine-view.js`, `PHASE_NOTES/tools/p2/t128_fine.py`. Edited: `ui.js` (one import + one render branch), `source-bar.js` (FINE no longer a data-less placeholder), `desktop-skin.css` (+`fn-*` rules), test `t126`. dist = 79 files.

# Rollback
`PHASE_NOTES/CHECKPOINT_fine_phase2_20261030/`; STORE checkpoints and `backup_before_fine/` preserved.

# STOPPED. TANGENT and COT not started. Awaiting explicit approval for Phase 3.
