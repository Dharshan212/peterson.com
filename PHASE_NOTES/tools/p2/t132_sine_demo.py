"""Part A (sidebar order) + Phase 1 (SINE / Live MIRL interactive demonstration): Modules above Research and System with the new order and labels (routing ids unchanged); the demonstration drives the
existing SINE / MIRL organ rules on a manual clock (5:00 social dwell -> SINE-1, +10:00 -> SINE-2, +13:15 -> SINE-3), return intent is only an intention, MIRL verification appears only after the engine's
own 10 s rule, interruption / relapse, Normal Break, journeys through the existing Live MIRL page, reset, determinism, isolation from the browser session, the Control Station runtime and imported files.
usage: t132_sine_demo.py <base_url> <chrome_port> <db for the imported-file isolation check>"""
import os, sys, json, time, re
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, db = sys.argv[1], int(sys.argv[2]), sys.argv[3]
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:700])
site = Site(base, cport); J = site.J
click = lambda i: J("(()=>{const b=document.getElementById(%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(i))
dis = lambda i: site.jl("document.getElementById(%s).disabled" % json.dumps(i))
has = lambda i: site.jl("!!document.getElementById(%s)" % json.dumps(i))
txt = lambda i: site.jl("(document.getElementById(%s)||{}).textContent||null" % json.dumps(i))
steps = lambda: site.jl("[...document.querySelectorAll('#mirlJourney .journey-step .name, #mirlJourney .jflow-outcome .jf-label')].map(e=>e.textContent)")
deltas = lambda: site.jl("[...document.querySelectorAll('#mirlJourney .jflow-link')].map(e=>e.textContent)")
def adv(*ids):
    for i in ids: assert click(i), i
    time.sleep(0.05)
def script_episode():
    """start, 4:55 of social dwell (no episode), SINE-1, SINE-2, SINE-3"""
    assert click("sdStart"); adv("sdSocial", "sdAdv300")        # 5:00 -> SINE-1 (episode created, popup displayed)
try:
    site.load()
    # ------------------------------------------------------------------ Part A: sidebar
    groups = site.jl("[...document.querySelectorAll('.nav-group')].map(g=>[g.querySelector('.nav-group-title').textContent,[...g.querySelectorAll('.nav-row')].map(r=>[(r.dataset.page||'(mode toggle)'),r.querySelector('.nav-row-label').textContent])])")
    names = [g[0] for g in groups]
    check("A1.group_order", "Modules sits above Research and System; Core first", names == ["Core", "Modules", "Research", "System"], names)
    check("A2.modules_order", "MODULES order: SINE — Live MIRL, MINE, COSINE, SECANT Dashboard, STORE, FINE, TANGENT, COT", [r[1] for r in groups[1][1]] == ["SINE — Live MIRL", "MINE", "COSINE", "SECANT Dashboard", "STORE", "FINE", "TANGENT", "COT"], groups[1])
    check("A3.routing_ids_unchanged", "internal routing identifiers are unchanged (Live MIRL still data-page live-mirl)", [r[0] for r in groups[1][1]] == ["live-mirl", "mine", "cosine", "secant", "store", "fine", "tangent", "cot"], groups[1])
    check("A4.research_core_system", "Research holds Science Lab only; Core keeps Control / Study Mode / Metric Hub; System keeps SenseHub (now a live demonstration page)", [r[1] for r in groups[2][1]] == ["Science Lab"] and [r[1] for r in groups[0][1]] == ["Control", "Study Mode", "Metric Hub"] and groups[3][1][0][1] == "SenseHub" and "COMING SOON" not in site.jl("document.getElementById('navSenseHub').innerText"), groups)
    ok_nav = True
    for pg in ["control", "metric-hub", "live-mirl", "mine", "cosine", "secant", "store", "fine", "tangent", "cot", "science-lab"]:
        site.goto_page(pg); ok_nav = ok_nav and site.jl("document.getElementById('page-%s').classList.contains('active')" % pg)
    check("A5.every_row_navigates", "every sidebar row still opens its page", ok_nav)
    # ------------------------------------------------------------------ Phase 1: SINE demonstration
    site.goto_page("live-mirl"); time.sleep(0.4)
    check("B1.default_unchanged", "the default Live MIRL view is the existing browser-session page (banner, journey, dashboard button) with a source switch above it; no demonstration controls", has("mirlModeBar") and has("mirlBanner") and has("mirlOpenDash") and not has("sdControls") and site.jl("document.getElementById('mirlModeBrowser').getAttribute('aria-pressed')") == "true")
    ctl_before = site.jl("window.MYELIN.state")
    click("mirlModeDemo"); time.sleep(0.3)
    check("B2.demo_mode_labelled", "demonstration mode is labelled SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE; not started; only START is available", "SIMULATED EVIDENCE — NOT HISTORICAL" in site.jl("document.getElementById('mirlModeBar').innerText") and txt("sdState") == "NOT STARTED" and not dis("sdStart") and dis("sdSocial") and dis("sdAdvNext") and dis("sdIntent") and dis("sdReset"))
    check("B3.empty_page_honest", "before any event the existing MIRL page below says there is no episode evidence", "No Episode Evidence" in txt("mirlBanner") and not steps())
    assert click("sdStart"); time.sleep(0.2)
    check("B4.started_clock_zero", "session ACTIVE on the manual clock 00:00, activity Task / Work, SINE inactive, zero counters", txt("sdState") == "ACTIVE" and txt("sdClock") == "00:00" and "Task" in txt("sdActivityNow") and txt("sdStage") == "SINE INACTIVE" and txt("sdEpisodes") == "0" and txt("sdVerified") == "0")
    adv("sdAdv300"); time.sleep(0.1)
    check("B5.no_dwell_on_task", "ten minutes on the work task create no episode and no SINE stage (time moves only by the buttons)", txt("sdClock") == "05:00" and txt("sdEpisodes") == "0" and txt("sdStage") == "SINE INACTIVE", txt("sdClock"))
    adv("sdSocial", "sdAdv60", "sdAdv60", "sdAdv60", "sdAdv60", "sdAdv30", "sdAdv10", "sdAdv10", "sdAdv5"); time.sleep(0.1)
    check("B6.dwell_just_below_threshold", "4:55 on the social feed: still no episode (dwell 04:55 / 05:00)", txt("sdDwell") == "04:55 / 05:00" and txt("sdEpisodes") == "0" and txt("sdStage") == "SINE INACTIVE", (txt("sdDwell"), txt("sdStage")))
    adv("sdAdv5"); time.sleep(0.2)
    check("B7.sine1_at_5min", "at exactly 5:00 of dwell SINE-1 is displayed and the MIRL episode is created; counters update", txt("sdStage") == "SINE-1" and txt("sdEpisodes") == "1" and "Episode Active" in txt("mirlBanner") and steps() == ["Episode Created", "Sine Displayed"] and txt("sdDwell") == "EPISODE OPEN", (txt("sdStage"), steps()))
    check("B8.responses_available", "RETURN INTENT and NORMAL BREAK are available on a displayed SINE-1 and nothing is verified yet", not dis("sdIntent") and not dis("sdBreak") and txt("sdVerified") == "0")
    check("B9.next_step_hint", "the next SINE step is announced from the engine's own countdown (10:00)", "Next SINE step in 10:00" in txt("sdNextHint"), txt("sdNextHint"))
    adv("sdAdvNext"); time.sleep(0.2)
    check("B10.sine2_after_10min", "ADVANCE TO NEXT SINE STEP -> SINE-2 displayed exactly 10:00 later; the journey gains one SINE display", txt("sdStage") == "SINE-2" and steps() == ["Episode Created", "Sine Displayed", "Sine Displayed"] and "Next SINE step in 13:15" in txt("sdNextHint"), (txt("sdStage"), steps(), txt("sdNextHint")))
    adv("sdAdvNext"); time.sleep(0.2)
    check("B11.sine3_protected", "13:15 later SINE-3 (protected red) is displayed; no response is offered for it and no further step counts down", txt("sdStage") == "SINE-3" and dis("sdIntent") and dis("sdBreak") and dis("sdAdvNext") and steps().count("Sine Displayed") == 3, (txt("sdStage"), steps()))
    check("B12.no_fabricated_recovery", "after three SINE stages with no return there is no return start, no verification, no confirmation and Verified Returns is 0", txt("sdVerified") == "0" and not [s for s in steps() if "Verif" in s or "Confirm" in s or "Return" in s], steps())
    adv("sdTask"); time.sleep(0.1)
    check("B13.return_starts_verifying", "switching to the work task starts MIRL return verification (VERIFYING 00:00), still not verified", txt("sdRecovery") == "VERIFYING 00:00" and txt("sdVerified") == "0" and steps()[-1] == "Return Verification Started", (txt("sdRecovery"), steps()))
    adv("sdAdv5"); time.sleep(0.1)
    check("B14.five_seconds_not_enough", "after 5 s of work the return is still unverified (the 10 s rule)", txt("sdRecovery") == "VERIFYING 00:05" and txt("sdVerified") == "0")
    adv("sdAdv5"); time.sleep(0.1)
    check("B15.verified_after_10s", "after 10 s the engine records Return Verified (a derived MIRL fact, simulated) and a 60 s closure confirmation begins; the Verified Returns counter (closed returns) is still 0; labelled simulated evidence", txt("sdVerified") == "0" and txt("sdRecovery").startswith("CONFIRMING") and "Return Verified" in steps() and "SIMULATED EVIDENCE" in site.jl("document.getElementById('mirlModeBar').innerText"), (txt("sdVerified"), txt("sdRecovery"), steps()))
    adv("sdAdv30"); time.sleep(0.1)
    check("B16.not_closed_yet", "30 s into the confirmation the episode is still open", "Episode Active" in txt("mirlBanner") and txt("sdRecovery").startswith("CONFIRMING 00:30"))
    adv("sdAdv30"); time.sleep(0.2)
    check("B17.closed_returned", "after 60 s the confirmation completes and the episode closes as RETURNED; the journey ends with the closure outcome and Verified Returns becomes 1", txt("sdVerified") == "1" and "No Active Episode" in txt("mirlBanner") and "RETURNED" in txt("mirlBanner") and steps()[-1] == "RETURNED" and "Closure Confirmation Completed" in steps(), steps())
    # ---- interruption: a new episode whose return is interrupted by a resource change
    adv("sdSocial", "sdAdv300"); time.sleep(0.2)
    check("B18.second_episode_after_reset_dwell", "a new social dwell starts a second episode (two episodes, still one verified return)", txt("sdEpisodes") == "2" and txt("sdVerified") == "1" and txt("sdStage") == "SINE-1", (txt("sdEpisodes"), txt("sdStage")))
    adv("sdTask", "sdAdv5", "sdSocial"); time.sleep(0.2)
    check("B19.interrupted_return", "returning to work for 5 s then back to the feed records an interrupted verification; nothing is verified", "Return Verification Interrupted" in steps() and txt("sdVerified") == "1" and txt("sdRecovery") == "WAITING FOR RETURN", (steps(), txt("sdRecovery")))
    # ---- return intent is only an intention
    adv("sdIntent"); time.sleep(0.2)
    check("B20.intent_is_only_intent", "RETURN INTENT is recorded as an intention (SINE response + MIRL intent) and verifies nothing; the popup is closed so it cannot be pressed twice", "Return Intent Recorded" in steps() and "Sine Response Recorded" in steps() and txt("sdVerified") == "1" and dis("sdIntent"), steps())
    # ---- Normal break from SINE-1
    check("B21.break_unavailable_after_hide", "the SINE-1 popup was closed by the return intent, so Normal Break is no longer offered", dis("sdBreak"))
    adv("sdStart"); time.sleep(0.2); adv("sdSocial", "sdAdv300"); time.sleep(0.2)
    adv("sdBreak"); time.sleep(0.2)
    check("B22.break_duration_entry", "NORMAL BREAK opens a 5–30 minute duration entry", has("sdBreakEntry") and has("sdBreakStart"))
    J("(()=>{const i=document.getElementById('sdBreakMin');i.value=5;i.dispatchEvent(new Event('input',{bubbles:true}));return true})()"); adv("sdBreakStart"); time.sleep(0.2)
    check("B23.break_holds_sine", "an active break holds SINE and MIRL: the stage countdown shows the hold message", has("sdBreakActive") and "held by the Normal Break" in txt("sdNextHint"), txt("sdNextHint"))
    adv("sdAdv300"); time.sleep(0.2)
    check("B24.resume_gate", "after the 5-minute break the resume gate appears; SINE-2 is requested only after RESUME", has("sdBreakGate") and txt("sdStage") == "SINE-1")
    adv("sdBreakResume"); time.sleep(0.2)
    check("B25.sine2_after_break", "RESUME continues the same episode with SINE-2", txt("sdStage") == "SINE-2" and txt("sdEpisodes") == "1", txt("sdStage"))
    # ---- existing dashboard reuse
    click("mirlOpenDash"); time.sleep(0.4)
    check("B26.existing_dashboard_reused", "the existing MIRL deep dashboard opens on the demonstration episode (reused presentation)", site.jl("!!document.querySelector('.mirl-dash, #mirlDash, .glass-overlay.open')") and "EPI-" in site.jl("document.body.innerText"))
    J("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true"); time.sleep(0.3)
    # ---- reset + determinism
    adv("sdReset"); time.sleep(0.2)
    check("B27.reset", "RESET DEMONSTRATION discards the session: NOT STARTED, no journey, counters zero, only START available", txt("sdState") == "NOT STARTED" and not steps() and txt("sdEpisodes") == "0" and txt("sdVerified") == "0" and dis("sdReset") and not dis("sdStart"))
    def full_run():
        assert click("sdStart"); adv("sdSocial", "sdAdv300", "sdAdvNext", "sdTask", "sdAdv10", "sdAdv60"); time.sleep(0.2)
        return steps(), deltas(), [txt(i) for i in ("sdClock", "sdStage", "sdEpisodes", "sdVerified")]
    r1 = full_run(); adv("sdReset"); r2 = full_run()
    check("B28.deterministic", "two identical button sequences produce identical journeys, deltas and counters (manual clock only)", r1 == r2 and len(r1[0]) == 7, (r1, r2))
    # ---- isolation
    click("mirlModeBrowser"); time.sleep(0.3)
    check("B29.browser_session_untouched", "the browser-session view shows none of the demonstration events and the Control Station runtime never started", "No Episode Evidence" in txt("mirlBanner") and site.jl("window.MYELIN.state") == ctl_before and not has("sdControls"), (site.jl("window.MYELIN.state"), ctl_before))
    click("mirlModeDemo"); time.sleep(0.3)
    assert site.open_db(db); site.goto_page("live-mirl"); time.sleep(0.8)
    tag = site.jl("(document.getElementById('dbsTag')||{}).textContent||null")
    check("B30.imported_file_separate", "with a database file open the page is the imported-evidence view: no source switch, no demonstration controls, no simulated values", tag and "IMPORTED" in tag and not has("mirlModeBar") and not has("sdControls") and not has("sdStatus"), tag)
    site.remove_db(); site.goto_page("live-mirl"); time.sleep(0.5)
    check("B31.demo_retained_after_removal", "after removing the file the demonstration (same session) is back, untouched", has("sdControls") and txt("sdState") == "ACTIVE")
    t1 = txt("sdStage"); time.sleep(1.6)
    check("B32.page_timer_does_not_overwrite_demo", "the real-time MIRL page refresh does not overwrite the demonstration's own timer / stage", txt("sdStage") == t1)
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("B33.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
