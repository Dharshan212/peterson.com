"""COSINE CORRECTION — the approved FIVE-MINUTE COSINE flow replaces the incorrect 23:15 demonstration.
Flow (all produced by the existing engine on a manual clock): certified OTT foreground evidence -> 5:00 gate -> Intention Gate with SORRY, I'LL COME BACK / YEAH, I WANT SOME BREAK ->
return intention = 5:00 return window (continued streaming converts it into the break request) | intentional break = 10-200 minutes -> YAY acknowledgement -> deadline -> button-less Final Callback ->
a real simulated return (10 s focus verification, 60 s closure confirmation) -> episode closed. A popup answer is an intention, never proof of return. Netflix <-> Prime Video = Hopper transition.
The popup is drawn centred by the shared popup stage (desktop and 390 px). The 23:15 / 10 MORE MIN / FINISH MY SHOW / Welcome Back model is gone.
usage: t140_cosine_five_minute.py <base_url> <chrome_port> <db for the imported-file isolation check> <reference_checkpoint_dir_of_the_engine_rule_demo> <backup_dir_final_transfer>"""
import os, sys, json, time, re
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, db, REF, BACKUP = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
import hashlib
ROOT = os.path.abspath(os.path.join(TOOLS, '..', '..', '..'))
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
NL = "String.fromCharCode(10)"
pageText = lambda: site.jl("document.getElementById('page-cosine').innerText.split(%s).join(' / ')" % NL)
flowText = lambda: site.jl("(document.getElementById('cxFlow')||{innerText:''}).innerText.split(%s).join(' / ')" % NL)
def norm(t): return re.sub(r"COS-\d{8}-\d\d", "COS-ID", re.sub(r"\d\d:\d\d:\d\d( \[[A-Z]+\])?", "TIME", t))
def go(i, wait=0.25):
    assert click(i), i; time.sleep(wait)
def adv(*ids):
    for i in ids: assert click(i), i
    time.sleep(0.05)
def setnum(i, v): J("(()=>{const e=document.getElementById(%s);e.value=%s;e.dispatchEvent(new Event('input',{bubbles:true}));return true})()" % (json.dumps(i), v))
GEOM = """(()=>{const s=document.getElementById('wlDemoStage'),p=s&&s.querySelector('.wl-pp');if(!s||!s.classList.contains('on')||!p)return null;const r=p.getBoundingClientRect(),cs=getComputedStyle(s),vw=innerWidth,vh=innerHeight;
return {dx:Math.round((r.left+r.width/2-vw/2)*10)/10,dy:Math.round((r.top+r.height/2-vh/2)*10)/10,inside:r.left>=-0.5&&r.top>=-0.5&&r.right<=vw+0.5&&r.bottom<=vh+0.5,w:Math.round(r.width),vw,vh,bg:cs.backgroundColor,pe:cs.pointerEvents,prot:s.dataset.protected,
label:(document.getElementById('wlDemoStageLabel')||{}).textContent||'',head:(p.querySelector('h2')||{}).textContent||'',badge:(p.querySelector('.pp-badge')||{}).textContent||'',buttons:[...p.querySelectorAll('button')].map(b=>b.textContent),text:p.innerText.split(String.fromCharCode(10)).join(' / ')}})()"""
def pop(): time.sleep(0.5); return site.jl(GEOM)
def centred(g, tol=2.5): return bool(g) and abs(g["dx"]) <= tol and abs(g["dy"]) <= tol and g["inside"]
def pbtn(label): return site.jl("(()=>{const b=[...document.querySelectorAll('#wlDemoStage .wl-pp button')].find(b=>b.textContent===%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(label))
def stage_on(): return site.jl("(()=>{const s=document.getElementById('wlDemoStage');return !!s&&s.classList.contains('on')})()")
def pstatus(): return site.jl("(document.querySelector('#wlDemoStage .pp-status')||{}).textContent||''")
sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
def reach_gate():
    """start, Netflix, 5:00 of streaming evidence -> the Intention Gate is displayed"""
    assert click("cdStart"); adv("cdStreamA", "cdAdv300"); time.sleep(0.2)
try:
    site.load()
    group = site.jl("[...document.querySelectorAll('.nav-group')].map(g=>g.querySelector('.nav-group-title').textContent)")
    modrows = site.jl("[...[...document.querySelectorAll('.nav-group')][1].querySelectorAll('.nav-row-label')].map(l=>l.textContent)")
    check("A1.sidebar_unchanged", "the approved sidebar is unchanged", group == ["Core", "Modules", "Research", "System"] and modrows == ["SINE — Live MIRL", "MINE", "COSINE", "SECANT Dashboard", "STORE", "FINE", "TANGENT", "COT"], (group, modrows))
    site.goto_page("cosine"); time.sleep(0.4)
    status_ott = site.jl("fetch('/assets/myelin/cosine-ott-model.js').then(r=>r.status)")
    check("A2.ott_model_not_served", "the standalone 23:15 OTT model is not part of the site any more (404) and the page source does not import it", status_ott == 404 and "cosine-ott-model" not in site.jl("fetch('/assets/myelin/cosine-demo.js').then(r=>r.text())"), status_ott)
    check("B1.default_unchanged", "the default COSINE view is the existing browser-session page (banner, journey, VIEW ANALYSIS) with a source switch above it; no demonstration controls", has("cosineModeBar") and has("cxBanner") and has("cxOpen") and not has("cdControls") and site.jl("document.getElementById('cosineModeBrowser').getAttribute('aria-pressed')") == "true")
    ctl_before = site.jl("window.MYELIN.state")
    click("cosineModeDemo"); time.sleep(0.3)
    check("B2.labelled_not_started", "demonstration mode is labelled SIMULATED EVIDENCE — NOT HISTORICAL, NOT FROM A DATABASE FILE; not started; only START is available", "SIMULATED EVIDENCE — NOT HISTORICAL" in site.jl("document.getElementById('cosineModeBar').innerText") and txt("cdState") == "NOT STARTED" and not dis("cdStart") and dis("cdStreamA") and dis("cdAdvNext") and dis("cdIntent") and dis("cdBreak") and dis("cdReset"))
    check("B2b.controls_disabled", "before START every activity, time and response control is disabled and RESET has nothing to reset", dis("cdStreamA") and dis("cdStreamB") and dis("cdAdv300") and dis("cdAdvNext") and dis("cdIntent") and dis("cdBreak") and dis("cdYay") and dis("cdReset"))
    check("B3.empty_page", "before any event the existing COSINE page says there is no active episode", "No active episode" in txt("cxBanner") or "COSINE episode active" not in txt("cxBanner"), txt("cxBanner"))
    gone = site.jl("document.getElementById('page-cosine').innerText")
    check("A3.no_23_15_controls", "the demonstration page has no 10 MORE MIN / FINISH MY SHOW / Welcome Back controls, no 23:15 text and no TRIGGER WELCOME BACK button", all(k not in gone.upper() for k in ("10 MORE MIN", "FINISH MY SHOW", "WELCOME BACK", "23:15")) and not has("cdTriggerWelcome") and not has("cdMore") and not has("cdFinish") and not has("cdViewing") and has("cdTrigger"), gone[:200])
    assert click("cdStart"); time.sleep(0.2)
    check("B4.started", "session ACTIVE on the manual clock 00:00, work task, COSINE inactive, zero episodes", txt("cdState") == "ACTIVE" and txt("cdClock") == "00:00" and "Task" in txt("cdActivityNow") and txt("cdEpisodes") == "0")
    adv("cdAdv300", "cdAdv300"); time.sleep(0.1)
    check("B5.task_time_creates_nothing", "ten minutes on the work task create no COSINE episode (time moves only by the buttons)", txt("cdClock") == "10:00" and txt("cdEpisodes") == "0" and txt("cdDwell") == "00:00 / 05:00", (txt("cdDwell"), txt("cdEpisodes")))
    adv("cdStreamA", "cdAdv60", "cdAdv60", "cdAdv60", "cdAdv30", "cdAdv30", "cdAdv30", "cdAdv10", "cdAdv10", "cdAdv5"); time.sleep(0.1)
    check("B6.just_below_threshold", "4:55 of Netflix: still no episode (dwell 04:55 / 05:00), platform Netflix, no popup", txt("cdDwell") == "04:55 / 05:00" and txt("cdEpisodes") == "0" and "none is displayed" in txt("cdPopupText"), (txt("cdDwell"), txt("cdPopupText")))
    adv("cdAdv5"); time.sleep(0.2)
    check("B7.gate_at_5min", "at exactly 5:00 of streaming evidence the episode starts and the Intention Gate is displayed with both responses; the existing page shows the episode as active", txt("cdEpisodes") == "1" and txt("cdCosineState") == "Intention Gate" and "INTENTION GATE" in txt("cdPopupText") and not dis("cdIntent") and not dis("cdBreak") and "episode active" in txt("cxBanner"), (txt("cdCosineState"), txt("cxBanner")))
    check("B8.nothing_verified", "no return and no break exist yet; the journey shows the gate and no verified return", "verified" not in flowText().lower() or "not " in flowText().lower(), flowText()[:300])
    # ---- unanswered gate
    adv("cdAdv300", "cdAdv300"); time.sleep(0.2)
    check("B9.unanswered_gate", "ten more minutes with the gate unanswered: the engine has no timeout, so the gate stays displayed, the episode stays open and nothing is counted as a break or a return", txt("cdCosineState") == "Intention Gate" and not dis("cdIntent") and txt("cdEpisodes") == "1" and txt("cdBreakLeft") == "—", (txt("cdCosineState"), txt("cdBreakLeft")))
    # ---- return-intent branch
    adv("cdIntent"); time.sleep(0.2)
    check("B10.return_intent_window", "'Sorry, I'll come back' is only an intention: a 5:00 return window starts (Next COSINE step in 05:00), the gate is gone, the state is Return Intent", txt("cdCosineState") == "Return Intent" and "Next COSINE step in 05:00" in txt("cdNextHint") and dis("cdIntent"), (txt("cdCosineState"), txt("cdNextHint")))
    adv("cdStreamB"); time.sleep(0.2)
    check("B11.hopper_transition", "switching from Netflix to Prime Video during the window is a Hopper transition on the same episode (hops 1, episodes 1, platform Prime Video)", txt("cdHops") == "1" and txt("cdEpisodes") == "1" and "Prime" in txt("cdPlatform"), (txt("cdHops"), txt("cdPlatform")))
    adv("cdAdvNext"); time.sleep(0.2)
    check("B12.converted_to_break_request", "streaming through the 5:00 return window converts the intention into a break request: the duration entry (10–200 minutes) is shown", has("cdDurationEntry") and txt("cdCosineState") == "Set Break", (txt("cdCosineState")))
    # ---- duration validation
    setnum("cdBreakMin", 5); click("cdBreakStart"); time.sleep(0.2)
    check("B13.duration_validated", "5 minutes is refused with the engine's message and the entry stays open", "10 to 200" in (txt("cdMsg") or "") and has("cdDurationEntry"), txt("cdMsg"))
    setnum("cdBreakMin", 201); click("cdBreakStart"); time.sleep(0.2)
    check("B14.duration_upper_bound", "201 minutes is refused as well", "10 to 200" in (txt("cdMsg") or "") and has("cdDurationEntry"), txt("cdMsg"))
    setnum("cdBreakMin", 12); click("cdBreakStart"); time.sleep(0.2)
    check("B15.break_ack_shown", "12 minutes is accepted: the break is committed and the acknowledgement (YAY) is displayed", "BREAK SET" in txt("cdPopupText") and not dis("cdYay") and txt("cdCosineState") == "Break Active", (txt("cdPopupText"), txt("cdCosineState")))
    clk = txt("cdClock"); adv("cdYay"); time.sleep(0.2)
    check("B16.yay_does_not_change_break", "YAY dismisses the acknowledgement but does not change the break clock", txt("cdClock") == clk and txt("cdBreakLeft") == "12:00 LEFT" and "none is displayed" in txt("cdPopupText"), (txt("cdBreakLeft"), txt("cdPopupText")))
    check("B17.break_hint", "the next COSINE step counts down from the committed break", "Next COSINE step in 12:00" in txt("cdNextHint"), txt("cdNextHint"))
    adv("cdAdv600"); time.sleep(0.1)
    check("B18.break_running", "ten minutes into the break 02:00 are left and no final callback has appeared", txt("cdBreakLeft") == "02:00 LEFT" and "none is displayed" in txt("cdPopupText"), (txt("cdBreakLeft"), txt("cdPopupText")))
    adv("cdAdvNext"); time.sleep(0.2)
    check("B19.final_callback_no_buttons", "at the break deadline the Final Callback is displayed with no buttons (no response is offered)", "HOPE YOU ENJOYED THE SHOW" in txt("cdPopupText") and dis("cdIntent") and dis("cdBreak") and dis("cdYay"), txt("cdPopupText"))
    # ---- return verification (engine's recovery rule only)
    adv("cdTask"); time.sleep(0.1)
    check("B20.return_check_started", "returning to the work task starts the engine's return check; nothing is verified yet", re.search(r"(?i)verif|confirm", txt("cdCosineState") or "") and "RETURNED" not in (txt("cdCosineState") or ""), txt("cdCosineState"))
    adv("cdAdv5"); time.sleep(0.1)
    st15 = txt("cdCosineState"); adv("cdAdv10"); time.sleep(0.1)
    st45 = txt("cdCosineState"); adv("cdAdv60"); time.sleep(0.2)
    check("B21.recovery_closes", "the engine's verification and closure confirmation run in order and the episode closes (page: no active episode)", re.search(r"(?i)verif", st15 or "") and re.search(r"(?i)confirm", st45 or "") and txt("cdDwell") == "EPISODE CLOSED" and "No active episode" in txt("cxBanner"), (st15, st45, txt("cdDwell"), txt("cxBanner")))
    # ---- existing dashboard reuse
    click("cxOpen"); time.sleep(0.4)
    check("B22.deep_analysis_reused", "VIEW ANALYSIS opens the existing 'COSINE — Deep Analysis' dashboard on the simulated episode", has("cxDash") or site.jl("!!document.querySelector('[id^=cx][id$=Dash], #cxDash, .cx-dash')"), site.jl("[...document.querySelectorAll('[id^=cx]')].map(e=>e.id).join(' ')"))
    dash_txt = site.jl("(document.getElementById('cxDash')||{innerText:''}).innerText")
    check("B22b.dashboard_has_hopper", "the dashboard shows the simulated episode and its Hopper transition", re.search(r"COS-\d{8}-\d\d", dash_txt) is not None and re.search(r"(?i)hopper", dash_txt) is not None, dash_txt[:300])
    J("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true"); time.sleep(0.3)
    check("B23.dashboard_closes", "Escape closes the dashboard", not has("cxDash"))
    # ---- relapse during closure confirmation
    adv("cdStart"); time.sleep(0.1); reach_gate()
    adv("cdBreak"); time.sleep(0.2); setnum("cdBreakMin", 10); adv("cdBreakStart", "cdYay"); adv("cdAdvNext"); time.sleep(0.2)
    adv("cdTask", "cdAdv10", "cdAdv5"); time.sleep(0.1)
    check("B24.confirming_again", "task focus after a second break brings the engine to the closure confirmation", re.search(r"(?i)confirm", txt("cdCosineState") or ""), txt("cdCosineState"))
    adv("cdStreamA"); time.sleep(0.2)
    check("B25.relapse_not_closed", "going back to streaming during the confirmation does not close the episode", txt("cdDwell") != "EPISODE CLOSED" and "No active episode" not in txt("cxBanner"), (txt("cdDwell"), txt("cxBanner")))
    # ================= P: the five-minute flow through the centred popup =================
    adv("cdReset"); time.sleep(0.2)
    check("P0.no_popup_before_start", "before the demonstration is started no popup is displayed", not stage_on() and not has("wlPopup"))
    assert click("cdStart"); adv("cdStreamA", "cdAdv60", "cdAdv60", "cdAdv60", "cdAdv60", "cdAdv30", "cdAdv10", "cdAdv10", "cdAdv5"); time.sleep(0.4)
    check("P1.no_popup_before_5min", "4:55 of Netflix: NO COSINE popup (no stage, no episode)", txt("cdDwell") == "04:55 / 05:00" and not stage_on() and txt("cdEpisodes") == "0", (txt("cdDwell"), stage_on()))
    adv("cdAdv5"); g = pop()
    check("P2.popup_at_exactly_5min", "at exactly 5:00 the Intention Gate popup appears in the centre of the viewport with exactly SORRY, I'LL COME BACK and YEAH, I WANT SOME BREAK, labelled SIMULATION", txt("cdClock") == "05:00" and centred(g) and g["buttons"] == ["SORRY, I'LL COME BACK", "YEAH, I WANT SOME BREAK"] and "INTERESTED TO WATCH THIS SHOW" in g["head"].upper() and g["badge"] == "COSINE" and "COSINE POPUP" in g["label"] and "SIMULATION" in g["label"] and g["pe"] == "none", g)
    check("P3.answer_is_intention_only", "the popup states that an answer is an intention, not proof of return", "NOT PROOF OF RETURN" in g["text"].upper(), g["text"])
    assert pbtn("SORRY, I'LL COME BACK"); time.sleep(0.4)
    check("P4.return_intention_window", "SORRY, I'LL COME BACK starts the existing 5:00 return window and removes the popup (the answer alone verifies nothing)", txt("cdCosineState") == "Return Intent" and "Next COSINE step in 05:00" in txt("cdNextHint") and not stage_on() and txt("cdDwell") == "EPISODE OPEN", (txt("cdCosineState"), txt("cdNextHint"), stage_on()))
    adv("cdAdv60", "cdAdv60", "cdAdv60", "cdAdv60"); time.sleep(0.3)
    check("P5.window_still_open_at_4min", "four minutes into the window: still Return Intent, no break request, no popup", txt("cdCosineState") == "Return Intent" and "Next COSINE step in 01:00" in txt("cdNextHint") and not stage_on() and not has("cdDurationEntry"), (txt("cdCosineState"), txt("cdNextHint")))
    adv("cdAdvNext"); g = pop()
    check("P6.converted_to_break_request", "continued streaming past the window follows the engine into the break request: a centred popup asks for the break length (SET A LIMIT wording, START WATCHING)", centred(g) and "KEEP WATCHING" in g["head"].upper() and g["buttons"] == ["START WATCHING"] and txt("cdCosineState") == "Set Break", g)
    setnum("cdPopBreakMin", 9); assert pbtn("START WATCHING"); time.sleep(0.4)
    check("P7.below_10_refused", "9 minutes is refused with the engine's message; the popup stays and nothing starts", "10 to 200" in (txt("cdMsg") or "") and "NOT ACCEPTED" in pstatus().upper() and stage_on() and txt("cdBreakLeft") == "—", (txt("cdMsg"), pstatus()))
    setnum("cdPopBreakMin", 201); assert pbtn("START WATCHING"); time.sleep(0.4)
    check("P8.above_200_refused", "201 minutes is refused as well", "10 to 200" in (txt("cdMsg") or "") and stage_on() and txt("cdBreakLeft") == "—", txt("cdMsg"))
    setnum("cdPopBreakMin", 10); assert pbtn("START WATCHING"); g = pop()
    check("P9.minimum_10_accepted", "10 minutes (the lower bound) is accepted and the break acknowledgement popup follows, centred, with the minutes and a YAY button", centred(g) and "ENJOY THE SHOW" in g["head"].upper() and "10 MINS" in g["text"] and g["buttons"] == ["YAY"] and txt("cdCosineState") == "Break Active", g)
    clk = txt("cdClock"); assert pbtn("YAY"); time.sleep(0.4)
    check("P10.yay_does_not_change_break", "YAY removes the acknowledgement and does not change the break clock (10:00 left)", not stage_on() and txt("cdClock") == clk and txt("cdBreakLeft") == "10:00 LEFT", (txt("cdBreakLeft"), stage_on()))
    adv("cdAdv300"); time.sleep(0.2)
    check("P11.deadline_not_reached", "five minutes into the break no Final Callback is shown", txt("cdBreakLeft") == "05:00 LEFT" and not stage_on())
    adv("cdAdvNext"); g = pop()
    check("P12.final_callback_centred_no_buttons", "at the deadline the Final Callback appears centred with NO buttons (darker, protected backdrop) and says it is time to focus", centred(g) and "HOPE YOU ENJOYED THE SHOW" in g["head"].upper() and g["buttons"] == [] and g["prot"] == "1" and "TIME TO FOCUS" in g["text"].upper(), g)
    adv("cdStreamB"); time.sleep(0.3)
    check("P13.streaming_is_not_a_return", "staying on streaming (Prime Video, a Hopper move) after the deadline does not verify or close anything", txt("cdDwell") == "EPISODE OPEN" and not re.search(r"(?i)verif|confirm", txt("cdCosineState") or ""), (txt("cdCosineState"), txt("cdDwell")))
    adv("cdTask"); time.sleep(0.2)
    check("P14.focus_starts_verification", "an actual simulated return to the work task starts the engine's focus verification (not a button, not the popup)", re.search(r"(?i)verif", txt("cdCosineState") or "") and txt("cdDwell") == "EPISODE OPEN", txt("cdCosineState"))
    # genuine focus: 5 s of focus, then a relapse to streaming resets the verification
    adv("cdAdv5"); time.sleep(0.1)
    st5 = txt("cdCosineState"); adv("cdStreamA"); adv("cdAdv5"); time.sleep(0.1); adv("cdTask"); time.sleep(0.1)
    check("P15.relapse_during_verification", "5 s of focus, then streaming, then focus again does NOT verify (genuine focus must be continuous): still verifying, episode open", re.search(r"(?i)verif", txt("cdCosineState") or "") and not re.search(r"(?i)confirm", txt("cdCosineState") or "") and txt("cdDwell") == "EPISODE OPEN", (st5, txt("cdCosineState")))
    adv("cdAdv5"); time.sleep(0.1)
    st_9 = txt("cdCosineState"); adv("cdAdv5"); time.sleep(0.1)
    check("P16.ten_second_verification", "after the relapse 5 s of continuous focus are not enough; at 10 s continuous focus the return is verified and the 60 s closure confirmation starts", re.search(r"(?i)verif", st_9 or "") and re.search(r"(?i)confirm", txt("cdCosineState") or "") and txt("cdDwell") == "EPISODE OPEN", (st_9, txt("cdCosineState")))
    adv("cdAdv30"); time.sleep(0.1); adv("cdAdv10", "cdAdv10"); time.sleep(0.1)
    st_50 = txt("cdCosineState"); open_50 = txt("cdDwell")
    adv("cdAdv5"); time.sleep(0.1)
    st_55 = txt("cdCosineState"); open_55 = txt("cdDwell")
    check("P17.closure_needs_60s", "50-55 s into the confirmation the episode is still open (confirming)", re.search(r"(?i)confirm", st_50 or "") and open_50 == "EPISODE OPEN" and re.search(r"(?i)confirm", st_55 or "") and open_55 == "EPISODE OPEN", (st_50, st_55))
    adv("cdAdv5"); adv("cdAdv5"); time.sleep(0.2)
    check("P18.closed_only_after_60s", "once the 60 s closure confirmation is complete (and only then) the episode closes and the page shows no active episode", txt("cdDwell") == "EPISODE CLOSED" and "No active episode" in txt("cxBanner") and not stage_on(), (txt("cdDwell"), txt("cxBanner")))
    # ---- the other branch, entirely through the popup
    adv("cdReset"); time.sleep(0.2); go("cdTrigger"); g = pop()
    check("P19.trigger_button", "TRIGGER COSINE POPUP starts a session, opens a streaming platform and advances only to the engine's 5:00 gate: the same centred Intention Gate at clock 05:00", centred(g) and g["buttons"] == ["SORRY, I'LL COME BACK", "YEAH, I WANT SOME BREAK"] and txt("cdClock") == "05:00" and txt("cdState") == "ACTIVE", (txt("cdClock"), g and g["buttons"]))
    go("cdTrigger"); time.sleep(0.2)
    check("P19b.trigger_twice_refused", "a second trigger while the gate is displayed is refused with a message (nothing advances)", "already displayed" in (txt("cdMsg") or "") and txt("cdClock") == "05:00", txt("cdMsg"))
    assert pbtn("YEAH, I WANT SOME BREAK"); g = pop()
    check("P20.intentional_break_branch", "YEAH, I WANT SOME BREAK asks for the break length in a centred popup (HOW LONG WOULD YOU LIKE YOUR BREAK TO BE? / SET TIME, 10-200 whole minutes)", centred(g) and "HOW LONG" in g["head"].upper() and g["buttons"] == ["SET TIME"] and txt("cdCosineState") == "Set Break", g)
    setnum("cdPopBreakMin", 5); assert pbtn("SET TIME"); time.sleep(0.3)
    check("P21.intentional_break_validation", "5 minutes refused on this branch too", "10 to 200" in (txt("cdMsg") or "") and stage_on(), txt("cdMsg"))
    setnum("cdPopBreakMin", 200); assert pbtn("SET TIME"); g = pop()
    check("P22.maximum_200_accepted", "200 minutes (the upper bound) is accepted: 200 MINS acknowledgement, break clock 200:00", "200 MINS" in g["text"] and txt("cdBreakLeft") == "200:00 LEFT", (g and g["text"], txt("cdBreakLeft")))
    assert pbtn("YAY"); adv("cdAdvNext"); g = pop()
    check("P23.final_callback_second_branch", "the deadline shows the same button-less Final Callback on this branch", g and g["buttons"] == [] and "HOPE YOU ENJOYED" in g["head"].upper(), g)
    adv("cdTask", "cdAdv10", "cdAdv60"); time.sleep(0.2)
    check("P24.second_branch_closes_after_return", "the same real return rules close this episode (10 s focus + 60 s confirmation)", txt("cdDwell") == "EPISODE CLOSED", (txt("cdDwell"), txt("cdCosineState")))
    # ---- Hopper transitions are part of the episode and the dashboard
    adv("cdReset"); time.sleep(0.2); go("cdTrigger"); pop(); assert pbtn("SORRY, I'LL COME BACK"); adv("cdStreamB", "cdStreamA", "cdStreamB"); time.sleep(0.3)
    check("P25.hopper_transitions", "Netflix -> Prime Video -> Netflix -> Prime Video inside one episode are 3 Hopper transitions on the same episode (hops 3, 1 episode)", txt("cdHops") == "3" and txt("cdEpisodes") == "1", (txt("cdHops"), txt("cdEpisodes")))
    click("cxOpen"); time.sleep(0.4)
    dash_txt2 = site.jl("(document.getElementById('cxDash')||{innerText:''}).innerText")
    check("P26.deep_analysis_has_hopper", "the existing COSINE — Deep Analysis dashboard shows the episode and Hopper transitions", re.search(r"COS-\d{8}-\d\d", dash_txt2) and re.search(r"(?i)hopper", dash_txt2), dash_txt2[:200])
    J("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true"); time.sleep(0.3)
    # ---- mobile: still centred, inside the viewport
    adv("cdReset"); time.sleep(0.2)
    site.c.viewport(390, 844); time.sleep(0.8); go("cdTrigger"); g = pop()
    m = site.jl("({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})")
    check("P27.mobile_390_centred", "at 390 px wide the Intention Gate popup is centred and fully inside the viewport, both buttons present, and the page does not scroll sideways", centred(g, 3) and g["vw"] == 390 and len(g["buttons"]) == 2 and m["sw"] <= m["cw"] + 1, (g, m))
    assert pbtn("YEAH, I WANT SOME BREAK"); g = pop()
    check("P28.mobile_duration_popup", "the break-length popup is centred and inside the viewport at 390 px (input and SET TIME reachable)", centred(g, 3) and g["buttons"] == ["SET TIME"], g)
    site.c.viewport(1440, 900); time.sleep(0.6); g = pop()
    check("P29.desktop_again_centred", "back at desktop size the same popup is centred again", centred(g), g)
    click("cosineModeBrowser"); time.sleep(0.4)
    check("P30.popup_removed_on_leaving", "leaving the demonstration (BROWSER SESSION) removes the popup", not stage_on())
    click("cosineModeDemo"); time.sleep(0.3)
    # ---- reset, determinism, isolation
    adv("cdReset"); time.sleep(0.2)
    check("B26.reset", "RESET DEMONSTRATION discards the session: NOT STARTED, no episodes, only START available", txt("cdState") == "NOT STARTED" and txt("cdEpisodes") == "0" and dis("cdReset") and not dis("cdStart"))
    def full_run():
        reach_gate(); adv("cdBreak"); setnum("cdBreakMin", 20); adv("cdBreakStart", "cdYay", "cdAdvNext", "cdTask", "cdAdv10", "cdAdv60", "cdAdv5"); adv("cdAdv5"); time.sleep(0.2)
        return norm(flowText()), [txt(i) for i in ("cdClock", "cdCosineState", "cdEpisodes", "cdDwell")]
    r1 = full_run(); adv("cdReset"); r2 = full_run()
    check("B27.deterministic", "two identical button sequences produce identical journeys (apart from wall-clock stamps) and counters", r1 == r2, (r1, r2))
    click("cosineModeBrowser"); time.sleep(0.3)
    check("B28.browser_session_untouched", "the browser-session view shows none of the demonstration events and the Control Station runtime never started", "episode active" not in txt("cxBanner") and site.jl("window.MYELIN.state") == ctl_before and not has("cdControls"), (site.jl("window.MYELIN.state"), ctl_before, txt("cxBanner")))
    click("cosineModeDemo"); time.sleep(0.3)
    assert site.open_db(db); site.goto_page("cosine"); time.sleep(0.8)
    tag = site.jl("(document.getElementById('dbsTag')||{}).textContent||null")
    check("B29.imported_file_separate", "with a database file open the page is the imported-evidence view: no source switch, no demonstration controls, no simulated values", tag and "IMPORTED" in tag and not has("cosineModeBar") and not has("cdControls") and not has("cdStatus"), tag)
    site.remove_db(); site.goto_page("cosine"); time.sleep(0.5)
    check("B30.demo_back_after_removal", "after removing the file the demonstration (same session) is back, untouched", has("cdControls") and txt("cdState") == "ACTIVE")
    # ---- SINE and MINE demonstrations untouched
    site.goto_page("live-mirl"); time.sleep(0.4)
    a = has("mirlModeBar") and not has("sdControls") and site.jl("document.getElementById('mirlModeBrowser').getAttribute('aria-pressed')") == "true"
    site.goto_page("mine"); time.sleep(0.4)
    b = has("mineModeBar") and not has("mdControls") and site.jl("document.getElementById('mineModeBrowser').getAttribute('aria-pressed')") == "true"
    check("B31.sine_mine_untouched", "the SINE and MINE demonstration switches are still present and in their default (browser-session) mode", a and b, (a, b))
    # ---- protection
    mine_ = os.path.join(ROOT, "templates", "assets", "myelin"); ref = os.path.join(ROOT, "PHASE_NOTES", "CHECKPOINT_final_phase3_sensehub_20261031", "templates", "assets", "myelin")
    ref_engine = os.path.join(REF, "templates", "assets", "myelin")
    same_station = sha(os.path.join(mine_, "cosine-station.js")) == sha(os.path.join(ref_engine, "cosine-station.js"))
    check("Z1.station_is_the_accepted_engine_rule_file", "cosine-station.js is byte-identical to the accepted engine-rule version (the 23:15 event labels were removed from it)", same_station)
    prot = ["runtime.js", "simulator.js", "popups.js", "popup-stage.js", "popups.css", "telemetry-feed.js", "sine-demo.js", "mine-demo.js", "secant-demo.js", "store-model.js", "fine-model.js", "tangent-model.js", "cot-model.js", "store-view.js", "fine-view.js", "tangent-view.js", "cot-view.js", "cosine-data.js",
            "secant-station.js", "secant-import.js", "mine-station.js", "live-mirl.js", "science-ch3.js", "science-ch5.js", "science-ch6.js", "science-certified.js", "science-import.js", "metric-import.js", "organ-import.js", "db-explorer.js", "imported-source.js",
            "sensehub-core.js", "sensehub-lab.js", "sensehub-tools.js", "sensehub-view.js", "sensehub.css"] + ["organs/" + f for f in os.listdir(os.path.join(ref, "organs")) if f.endswith(".js")] + ["db-import/" + f for f in os.listdir(os.path.join(ref, "db-import")) if f.endswith(".js")]
    diff = [f for f in prot if sha(os.path.join(ref, f)) != sha(os.path.join(mine_, f))]
    check("Z2.other_modules_and_engines_unchanged", "the other seven module demonstrations, the shared popup stage and popup family, runtime, organs, Live Telemetry, SenseHub, imported-database readers, Science Lab, Metric Hub and Academy sources are byte-identical to the SenseHub checkpoint (%d files)" % len(prot), not diff, diff)
    import difflib
    a_ = open(os.path.join(ref, "ui.js"), encoding="utf-8").read().split("\n"); b_ = open(os.path.join(mine_, "ui.js"), encoding="utf-8").read().split("\n")
    changed = [l for l in difflib.unified_diff(a_, b_, lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
    check("Z3.ui_js_only_two_lines", "ui.js differs from the SenseHub checkpoint in exactly the two COSINE lines (the demo constructor and cosineLive's runtime argument) = 4 diff lines", len(changed) == 4 and all("cosine" in l.lower() for l in changed), [c[:100] for c in changed])
    own = sorted(set(["templates/index.html", "templates/research.html", "views.py", "templates/anesthesia-control-research.html", "templates/bluepad32-thesis.html"] + [l.split()[-1] for l in open(os.path.join(BACKUP, "TRANSFER_LOG.txt"), encoding="utf-8") if l.startswith("KEPT")]))
    bad_own = [r for r in own if r != "templates/research.html" and sha(os.path.join(ROOT, r)) != sha(os.path.join(BACKUP, r))]
    ckpt_research = sha(os.path.join(ROOT, "PHASE_NOTES", "CHECKPOINT_final_phase3_sensehub_20261031", "templates", "research.html")) == sha(os.path.join(ROOT, "templates", "research.html"))
    check("Z4.owner_files_untouched", "the 13 other owner-protected files are byte-identical to the backup and the newer research.html is exactly as it was at the SenseHub checkpoint (not edited by this correction)", not bad_own and ckpt_research and len(own) == 14, (bad_own, ckpt_research))
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("B32.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
