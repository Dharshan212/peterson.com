"""t145 - MYELIN Academy FLOW structure (owner's order): Engine Core -> Live Telemetry -> Study Mode (parts, keywords, time, START) -> SECANT 1/2/3 -> COSECANT break -> choose an organ (six, no COT).
The Academy plays SECANT / COSECANT by itself: it pressed the real controls and popup buttons while a PATIENT visitor did nothing; the visitor can still act first (override) and take over (I'LL DO IT).
usage: t145_academy_flow.py <base_url> <chrome_port>"""
import os, sys, json, time
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
from academy_driver import Driver  # noqa: E402
base, cport = sys.argv[1], int(sys.argv[2])
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
site = Site(base, cport); J = site.J; jl = site.jl
class Stop(Exception): pass
def launch():
    site.load(); J("document.getElementById('acLauncher').click(); true"); time.sleep(0.4); J("document.getElementById('acJourney').click(); true"); time.sleep(1.2)
try:
    # ================= patient visitor: the Academy plays the whole SECANT + COSECANT flow =================
    launch(); drv = Driver(site); drv.patient = True
    steps = []; heads = []; carry = {}; organs = {}
    def on_step(sid, st):
        steps.append(sid)
        h = jl("(()=>{const p=document.querySelector('#wlDemoStage.on .wl-pp');return p?((p.querySelector('h2')||{}).textContent||'').trim():null})()")
        if h and h not in heads: heads.append(h)
        if sid == "sec.drift": carry.update(jl("({sub:document.getElementById('szSubject').value,task:document.getElementById('szTaskText').value,min:document.getElementById('szStudyMin').value,brk:document.getElementById('szBreakMin').value,state:document.getElementById('szStudyState').textContent,plan:window.myelinStudyLab.state.plan})"))
        if sid == "pick.organ":
            organs["cards"] = jl("[...document.querySelectorAll('#acOrgans .acj-card')].map(b=>b.dataset.organ)"); organs["text"] = jl("document.getElementById('acOrgans').innerText")
            drv.patient = False
    try:
        drv.run("tangent", on_step); done = True; err = ""
    except Exception as e:  # noqa: BLE001
        done = False; err = str(e)
    check("FL1.academy_plays_secant_cosecant", "a visitor who does nothing: the Academy itself presses the controls and popup buttons through SECANT and COSECANT and moves on by itself (no stall, no click)", done, err)
    idx = lambda p: min([i for i, s in enumerate(steps) if s.startswith(p)] or [10 ** 6])
    check("FL2.owner_order", "the order is Engine Core -> Live Telemetry -> Study Mode -> SECANT -> COSECANT -> choose organ -> letter", idx("ctl.") < idx("tel.") < idx("stu.") < idx("sec.") < idx("cos.") < idx("pick.") < idx("let."), steps)
    check("FL3.study_before_secant", "Study Mode shows its parts (video choice, keywords, important words, time, prepare), tests keyword points and the three outcomes BEFORE SECANT, and ends with the hand-off", all(k in steps for k in ("stu.choose", "stu.pickdef", "stu.words", "stu.imp", "stu.time", "stu.prep", "stu.aligned", "stu.uncertain", "stu.off", "stu.gate")) and steps.index("stu.gate") < steps.index("sec.mode"), steps)
    check("FL4.start_carries_study_test", "START: the subject, task, study and break minutes you set in Study Mode are carried into the session the Academy starts (session ACTIVE)", carry.get("state") == "ACTIVE" and carry.get("sub") == carry["plan"]["subject"] and carry.get("task") == carry["plan"]["task"] and carry.get("min") == str(carry["plan"]["studyMin"]) and carry.get("brk") == str(carry["plan"]["breakMin"]), carry)
    check("FL5.secant_three_popups", "SECANT-1 (Study focus notice), SECANT-2 (Study return pending) and SECANT-3 (Study return required) were all shown", all(h in heads for h in ("Study focus notice", "Study return pending", "Study return required")), heads)
    check("FL6.cosecant_three_popups", "the COSECANT break showed BREAK COMPLETE, BREAK ALREADY OVER and COME BACK PLEASE", all(h in heads for h in ("BREAK COMPLETE", "BREAK ALREADY OVER", "COME BACK PLEASE")), heads)
    check("FL7.six_organs_no_cot", "the organ choice offers exactly SINE, MINE, COSINE, STORE, FINE, TANGENT: no COT, no SECANT, no COSECANT", organs.get("cards") == ["sine", "mine", "cosine", "store", "fine", "tangent"] and "COT" not in organs.get("text", "").replace("COSECANT", "") and "Check-in On Task" not in organs.get("text", ""), organs)
    # ================= the visitor can still communicate: act first, take over =================
    launch(); drv2 = Driver(site); res = {}
    def on_override(sid, st):
        if sid == "sec.drift":
            J("document.querySelector('#acActions [data-ac=try]').click(); true"); time.sleep(5.0)
            res["takeover_wait"] = jl("({phase:document.getElementById('acRoot').dataset.phase,step:document.getElementById('acRoot').dataset.step,act:document.getElementById('szActivityNow').textContent})")
            drv2.click("szOfftask"); res["takeover_done"] = drv2.wait("document.getElementById('acRoot').dataset.phase==='done'", 6)
        if sid == "sec.s1":
            time.sleep(0.4); drv2.click("szAdvNext"); res["early_done"] = drv2.wait("document.getElementById('acRoot').dataset.phase==='done'", 2.5)
            res["stage"] = jl("(document.querySelector('#wlDemoStage.on .wl-pp h2')||{}).textContent||''"); raise Stop()
    try: drv2.run("tangent", on_override)
    except Stop: pass
    tw = res.get("takeover_wait", {})
    check("FL8.take_over", "I'LL DO IT: the Academy stays hands-off (guide waits in 'act', the activity is not changed) until the visitor presses the control; the step is then detected", tw.get("phase") == "act" and tw.get("step") == "sec.drift" and "off-task" not in tw.get("act", "").lower() and res.get("takeover_done"), res)
    check("FL9.visitor_can_press_first", "the visitor pressed ADVANCE before the Academy did: it is detected at once (within 2.5 s, before the Academy reading pause) and SECANT-1 shows", res.get("early_done") and res.get("stage") == "Study focus notice", res)
    # ================= hover holds the guide =================
    launch(); drv3 = Driver(site); hold = {}
    def on_hold(sid, st):
        if sid == "stu.hi":
            J("document.getElementById('acCoach').dispatchEvent(new MouseEvent('mouseover',{bubbles:true})); true")
            hold["hover_supported"] = True; raise Stop()
    try: drv3.run("tangent", on_hold)
    except Stop: pass
    check("FL10.flow_step_marks_itself", "a flow step tells the visitor it will continue by itself and that hovering holds it", "continue by myself" in jl("document.getElementById('acAsk').textContent") and "hover" in jl("document.getElementById('acAsk').textContent").lower(), jl("document.getElementById('acAsk').textContent"))
    # ================= gates: custom video typed in the guide box; NO skips SECANT, then NO skips COSECANT =================
    launch(); drvA = Driver(site); drvA.choices = {"stu.choose": "no", "stu.gate": "no", "cos.gate": "no"}; drvA.video_name = "Thermodynamics Entropy Energy Lecture"; stepsA = []; ga = {}
    def on_a(sid, st):
        stepsA.append(sid)
        if sid == "stu.words": ga.update(jl("({decl:window.myelinStudyLab.state.decl.title,plan:window.myelinStudyLab.state.plan})"))
    try: drvA.run("tangent", on_a); okA = True; eA = ""
    except Exception as e: okA = False; eA = str(e)
    check("FL11.custom_video_in_guide_box", "CUSTOM: the visitor types the video name in the guide's own box; the guide enters it and suggests subject and keywords from its words (important = longest words)", "stu.name" in stepsA and "stu.pickdef" not in stepsA and ga.get("decl") == "Thermodynamics Entropy Energy Lecture" and "thermodynamics" in ga.get("plan", {}).get("important", "") and ga.get("plan", {}).get("subject") == "Thermodynamics", (stepsA[-4:], ga, eA))
    check("FL12.no_skips_secant", "NO at 'what if we try to distract while studying?' skips the whole SECANT section and lands on the COSECANT question", okA and not any(s.startswith("sec.") for s in stepsA) and stepsA[stepsA.index("stu.gate") + 1] == "cos.gate", stepsA)
    check("FL13.no_skips_cosecant", "NO at the COSECANT question skips the break section and goes straight to the organ choice", okA and not any(s.startswith("cos.") and s != "cos.gate" for s in stepsA) and stepsA[stepsA.index("cos.gate") + 1] == "pick.organ", stepsA)
    # ================= manual mode: step-by-step but semi-automatic =================
    launch(); drvM = Driver(site); drvM.choices = {"sec.mode": "no"}; stepsM = []; mm = {}
    def on_m(sid, st):
        stepsM.append(sid)
        if sid == "sec.pick":
            time.sleep(0.6)
            mm["pick"] = jl("(()=>{const b=document.getElementById('szStudyRes').getBoundingClientRect(),p=document.querySelector('#wlDemoStage .wl-pp'),top=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return {pop:p?getComputedStyle(p).opacity:null,vis:b.width>0&&b.top>0&&b.bottom<innerHeight,on:!!top&&(top.id==='szStudyRes'||top.closest('#szStudyRes')!==null),phase:document.getElementById('acRoot').dataset.phase,say:document.getElementById('acSay').textContent}})()")
        if sid in ("sec.carry", "sec.drift", "sec.s1"): mm[sid] = jl("({phase:document.getElementById('acRoot').dataset.phase,say:document.getElementById('acSay').textContent,arrow:!!document.querySelector('.acj-arrow:not([hidden])')})")
        if sid == "pick.organ": raise Stop()
    try: drvM.run("tangent", on_m)
    except Stop: pass
    except Exception as e: mm["err"] = str(e)
    time.sleep(0.5)
    check("FL14.manual_is_semi_automatic", "I'LL TRY: the setup is still done by the Academy (sec.carry stays automatic) but the visitor is asked to press OFF-TASK RESOURCE and ADVANCE with the arrow on the button", "err" not in mm and mm.get("sec.carry", {}).get("phase") == "read" and mm.get("sec.drift", {}).get("phase") == "act" and mm["sec.drift"]["say"].startswith("Now get distracted yourself") and mm["sec.drift"]["arrow"] and mm.get("sec.s1", {}).get("phase") == "act" and mm["sec.s1"]["arrow"], mm)
    check("FL17.popup_hidden_to_choose_study_feed", "SECANT-3 (red popup, no buttons) is hidden while the visitor chooses the study feed: the EXACT STUDY RESOURCE button is on screen, reachable and not covered, and the guide asks the visitor to press it", mm.get("pick", {}).get("pop") == "0" and mm["pick"].get("vis") and mm["pick"].get("on") and mm["pick"].get("phase") == "act" and "Press EXACT STUDY RESOURCE" in mm["pick"].get("say", ""), mm.get("pick"))
    check("FL15.mode_asked_once", "the automated / manual choice is asked once: the COSECANT section reuses it (no second question)", "sec.mode" in stepsM and "cos.mode" not in stepsM and "cos.gate" in stepsM, stepsM)
    # ================= NO at the telemetry question ends the tour =================
    launch(); drvN = Driver(site); drvN.choices = {"ctl.summary": "no"}
    try: drvN.run("tangent", None)
    except Exception: pass
    check("FL16.no_ends_tour", "NO at 'Shall we see Live Telemetry?' ends the tour and leaves the normal interface usable", jl("document.getElementById('acRoot').hidden") and jl("document.querySelector('.topbar').offsetParent!==null"))
finally:
    site.close()
print(f"SUMMARY: {PASS}/{PASS + FAIL} passed")
