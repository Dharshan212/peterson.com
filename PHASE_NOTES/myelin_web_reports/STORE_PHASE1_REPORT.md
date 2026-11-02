ORGAN: STORE (Phase 1) — UPDATED after the owner's review of 2026-10-30. Browser simulation. Not deployed.

# 1. What changed
All UI is preserved (main page, four dashboard tabs, pagination, ranges, filters, IST, report button). The model now follows the confirmed timing rules, and the invented closure / outcome rules were removed.

# 2. IMPLEMENTED (confirmed rules, deterministic simulation clock)
1. Eligible shopping activity reaches **10:00** → the initial STORE prompt is displayed and the episode is created (THRESHOLD_REACHED + STORE_PROMPT_DISPLAYED at exactly entry + 10:00).
2. Buttons **I'M BACK** and **I WANT TO SHOP**.
3. **I'M BACK** records a return **intention** only; it never counts as a return and starts no timer.
4. **I WANT TO SHOP** records a chosen additional shopping time: any value from **1 s to 13:15**, so a shorter allowance is supported (minutes / seconds control; 0:00, over 13:15 and non-integer values are refused with a message).
5. **Combined limit 23:15 from the start of the shopping activity** (10:00 + 13:15, not 13:15 in total): the allowance ends at min(button press + chosen time, entry + 23:15); a choice that would pass the limit is cut to it and marked "capped at 23:15". A response after 23:15 is refused. At the end of the chosen time a time fact ALLOWANCE_ELAPSED is recorded while the site is still open (nothing is shown or enforced).
7. **An exit is recorded as an exit and never counts as a return.** The recorded state after an exit is "EXITED — NO RETURN EVIDENCE".

# 3. DEMONSTRATED ONLY (kept visibly distinct)
* **RECORD DEMONSTRATION RETURN EVIDENCE (NOT BROWSER-OBSERVED)** is a button pressed by the visitor. This browser cannot observe or verify a return. It is accepted only after the exit, once, for the most recent episode; the event is DEMO_RETURN_EVIDENCE_RECORDED, tagged "DEMO · NOT BROWSER-OBSERVED" in maps, shown as "DEMO RETURN EVIDENCE", and the RETURNS tile is flagged "DEMO EVIDENCE" (it counts these demonstration events only).
* One response per episode and one demonstration-evidence event per episode are demonstration rules, not approved rules.
* All events are simulated; nothing is monitored, stored, uploaded or read from an imported file.

# 4. Removed / corrected
* Removed the END OBSERVATION button, the EPISODE_CLOSED event and the outcome names **CONTINUED, NO RETURN, RETURNED**, the "VERIFIED RETURN" response node and the page title's "VERIFIED RETURN". Episodes are now shown by recorded state (prompt displayed / I'M BACK recorded / chosen time running / elapsed / exited — no return evidence / demo return evidence). The banner states that episode closure is not defined yet.
* GET STORE REPORT remains disabled with the visible reason (content and format not specified).

# 5. Design decisions STILL OPEN (listed on the About STORE tab as D1–D10; none invented)
* **D1** I'M BACK follow-up timing: how long, what is checked, whether prompts repeat.
* **D2** Whether a response can change or repeat (e.g. I'M BACK then I WANT TO SHOP).
* **D3** How the real prompt offers the shopping time (free value or presets) and whether the time counts from the button press (used here, capped at 23:15) or from the 10:00 mark.
* **D4** What happens when the chosen time ends: final reminder, wording, buttons, timing (only the elapsed time is recorded here).
* **D5** What exactly starts "eligible shopping activity" (site entry is used here); several tabs and unfocused time.
* **D6** The browser-observable evidence that verifies a real return, and how long it must last.
* **D7** When an episode closes and what its outcomes are called.
* **D8** Conflict rules (other MYELIN organs; several shopping sites).
* **D9** The approved list of supported shopping sites (Amazon, Flipkart, Myntra, Other are demonstration entries).
* **D10** The content and format of the STORE report.

# 6. Tests (focused only)
`t127_store.py` **55/55**: model rules with an injected clock (threshold, allowance bounds, 13:15 at the 10:00 mark ends at exactly 23:15, a shorter allowance, a late choice capped to 23:15, no elapsed fact when exiting early, refusal after 23:15, exit never a return, demo evidence rules, no closure or outcome event, IST ids across the UTC/IST boundary) and the page (allowance control refusals, banners, journeys, demo labelling, pagination over 15 episodes, ranges, filter, forbidden outcome wording absent everywhere, About lists, imported-file isolation, console clean). Plus `t126` 11/11, `t40` 56/56, `t45` 30/30, `t46` 37/37, `t53` 60/60, `t101` 35/35, `t112` 11/11. Two test-side errors and one real model bug (demo-evidence acceptance compared objects from two separate derivations) were found and fixed in this pass; the first run of the rewritten test failed 8 checks for those reasons.

# 7. Files changed (this pass)
`assets/myelin/store-model.js`, `store-view.js`, `desktop-skin.css` (+ a few `st-*` rules), test `PHASE_NOTES/tools/p2/t127_store.py`. dist = 77 files.

# 8. Rollback
New: `PHASE_NOTES/CHECKPOINT_store_phase1_timing_20261030/`. Preserved unchanged: `CHECKPOINT_store_phase1_20261030/` (previous STORE state) and `CHECKPOINT_science_lab_ch3_ch5_20261030/`.

# 9. STOPPED at STORE. FINE, TANGENT and COT were not started.
