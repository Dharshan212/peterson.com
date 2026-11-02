# MYELIN Web Lite — final Phase 2: Live Telemetry correction

Project: `C:\Users\Dharshan\Downloads\Peterson.com` (master). Not deployed. Phases 3 (SenseHub) and 4 (MYELIN Guide) were not started.

## What the desktop Live Telemetry really is (read-only inspection)
Source inspected, read-only: `MYELIN2.0_ULTIMATE_TRIAL` — `CONTROL_STATION/application.py` (`FeedList`, `FeedTag`, the Control page's *Live Telemetry* and *Handover Telemetry* cards), `UI_THEMES/theme.py` (feed QSS, `FEED_BADGE_*` colours) and `CORE_ENGINE/monitor.py` (the row vocabulary: activity rows, DWELL, TRIGGER, SINE, MONITOR, RETURN GATE, RETURN INTENT, RETURNED, MIRL, COSINE, MINE / RETURN). The desktop window was rendered once with a temporary profile (START never pressed, nothing monitored, no desktop file changed) and fed presentation-only sample rows so the web feed could be compared pixel-for-structure.
Anatomy: a card headed **LIVE TELEMETRY** with a right-hand "*N* events"; newest-first one-line rows of **dot · time (mono) · message · tag**; tags tinted by tone (cyan, amber, red, green, violet, study-yellow, study-orange, muted) with badge-specific colours (OTT, COSINE, HANDOVER, MONITOR, STUDY, FOCUS); at most 80 rows while the count keeps the total; below it **HANDOVER TELEMETRY** (Monitor territory, Relationship, State, Continuity bar, Study authority, Global pause, *Recent family signals*).

## What changed in the web
Before: raw engine events in two-line link-coloured rows ("COSINE · EPISODE CLOSED / 1293:16 · SIMULATED", "*N* lifecycle facts").
Now (`telemetry-feed.js`, `ui.js`, `desktop-skin.css`, label elements in `myelin_web_sample.html`): the same cards with the desktop's row anatomy, metrics (8 px dot, 11 px mono time, 11 px message, 9 px 600-weight uppercase tag, 9 px / 6 px padding, 1 px divider), tone and badge colours (the desktop's theme constants), "*N* events", 80-row cap, newest first. Both cards carry **SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING**. Rows come only from the simulated runtime's recorded events:

| Row (tag · tone) | Supported by this simulated evidence |
|---|---|
| FOCUS / SOCIAL / OTT / MESSAGING / ACTIVITY (and STUDY, STUDY FOCUS, STUDY ACTIVITY, study-yellow OTT, study-orange MESSAGING while a Study block runs) | the simulator surface in force; added only when the foreground identity changes; the text is `SURFACE — resource id` |
| DWELL (violet) | a social surface entered outside Study |
| TRIGGER (red), SINE (amber), MONITOR (cyan) | SINE admission, stage 2 / 3 scheduled (10:00 / 13:15), I'M BACK pressed |
| RETURN GATE (green) | Normal Break ended / I'M BACK acknowledged |
| RETURN INTENT, RETURNED, MIRL | return verification started / verified / closure initiated 01:00 / episode closed; "Study Mode started" when Study pre-empts an episode |
| COSINE (cyan), MINE (red) / RETURN (green) | state transitions of those organs, with platform, minutes, branch, popup visibility and outcome |
| Handover card: STUDY (green) "STUDY OWNERSHIP ACTIVE" | a Study block started |

## What matches the desktop vs what is simulation-only
**Matches:** card structure and headings; row anatomy and metrics; tone / badge palette; newest-first, 80-row cap and running total; the activity badge / tone rules (incl. Study tones); the real row vocabulary and wording listed above; the Handover card's layout; theming across the four worlds and three stage-accent palettes.
**Simulation-only / deliberately different:**
* An "application" is the simulator surface and the message tail is its resource id — no window titles, processes or detections exist or are invented.
* SECANT, COSECANT, Study-timer and Normal-Break-start events add **no** rows, because the desktop does not publish them to this feed either.
* Handover card: Monitor territory, Relationship and State read **Not tracked** (the browser simulation has no Monitor handover), continuity stays empty, no handover lifecycle rows; Study authority and Global pause come from the simulation.
* Times are the browser clock in the chosen display zone; the feed restarts with each new simulated session (the desktop keeps appending within one app run).
* COSINE / MINE phase words are the web organs' own state names; the SINE "re-armed" row is not shown because the web engine requests SINE-2 immediately after a break gate.
* Colour fidelity notes: the white-theme FOCUS tag uses the text colour (the desktop's white tag vanishes on the white world); the dark-blue OTT tag is as low-contrast as on the desktop.

## Tests (focused; the whole website regression was not repeated)
* `t138_live_telemetry.py` **27/27** — labels and empty states; first row from the evidence in force; no duplicate activity row; SOCIAL + DWELL; TRIGGER / SINE schedule; MONITOR row from the popup button; return rows in order; OTT / MESSAGING; MINE and COSINE rows; Study semantics and tones; no rows from SECANT / COSECANT; Handover card (Not tracked, hint, Global pause PAUSED); only desktop vocabulary and no invented readings; desktop metrics and badge colours (computed styles); 80-row cap with running total; seven themes; neighbours intact; imported file adds nothing to the feed; console clean; the 14 owner files and the engines / readers / Science Lab / models byte-identical.
* Neighbours re-run on the master site, all passing: centred popups 55, sidebar 5, Control Station 56, Science Lab 37, functional 51, interaction 34, keyboard 21, harness 23, Academy 37, imported-database readers vs desktop 84/84, imported Metric Hub / Science Lab pages 12/12.
* Visual: `PHASE_NOTES/evidence_live_telemetry/` — desktop render (`desk_tele_*`), web before (`web_before_*`) and after (`web_after_*`), and side-by-side `compare_neon.png` / `compare_white.png`.

## Files
New: `assets/myelin/telemetry-feed.js`; test `PHASE_NOTES/tools/p2/t138_live_telemetry.py`. Edited: `assets/myelin/ui.js` (feed painter, handover values), `desktop-skin.css` (appended feed rules), `templates/myelin_web_sample.html` (the two SIMULATED labels). **Not touched:** desktop MYELIN Core / Edge (read-only), the 14 owner-protected files, runtime / organs / event models / popups / module models / imported-database readers / Science Lab. dist = 90 files.

## Checkpoint
`PHASE_NOTES/CHECKPOINT_final_phase2_live_telemetry_20261031/` (templates, dist, test, report). Rollback: `PHASE_NOTES/backup_before_live_telemetry/` (the three edited files) and the earlier checkpoints, incl. `CHECKPOINT_final_phase1_centred_popups_20261031`.

## STOPPED. Phase 3 SenseHub, Phase 4 MYELIN Guide, thesis work and deployment were not started. Awaiting your approval.
