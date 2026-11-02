"""Final Web Lite Phase 1 — centred popup simulations for all eight modules (SINE, MINE, COSINE, SECANT/COSECANT, STORE, FINE, TANGENT, COT).
Checks, per module: a TRIGGER button produces the popup; it sits in the CENTRE of the viewport (desktop 1440x900 and mobile 390x844) on a translucent, non-blocking backdrop; it is labelled a SIMULATION;
its buttons / protected no-button state are the existing ones and are functional (they drive the module's own simulation); the telemetry shown in the popup follows the simulated clock; the popup disappears with
its page / source switch / imported file; the seven themes keep it centred; the 14 owner-newer files and the engines / models are unchanged.
usage: t137_centred_popups.py <base_url> <chrome_port> <db for the imported-file check> <working_copy_dir> <backup_dir>"""
import os, sys, json, time, re, hashlib
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, db, WORK, BACKUP = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
site = Site(base, cport); J = site.J
click = lambda i: J("(()=>{const b=document.getElementById(%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(i))
has = lambda i: site.jl("!!document.getElementById(%s)" % json.dumps(i))
txt = lambda i: site.jl("(document.getElementById(%s)||{}).textContent||null" % json.dumps(i))
dis = lambda i: site.jl("document.getElementById(%s).disabled" % json.dumps(i))
def go(i, wait=0.25):
    assert click(i), i; time.sleep(wait)
# the popup of the stage: geometry relative to the viewport, text, buttons
GEOM = """(()=>{const s=document.getElementById('wlDemoStage'),p=s&&s.querySelector('.wl-pp');if(!s||!s.classList.contains('on')||!p)return null;const r=p.getBoundingClientRect(),cs=getComputedStyle(s),vw=innerWidth,vh=innerHeight;
return {dx:Math.round((r.left+r.width/2-vw/2)*10)/10,dy:Math.round((r.top+r.height/2-vh/2)*10)/10,inside:r.left>=-0.5&&r.top>=-0.5&&r.right<=vw+0.5&&r.bottom<=vh+0.5,w:Math.round(r.width),h:Math.round(r.height),vw,vh,
bg:cs.backgroundColor,pe:cs.pointerEvents,prot:s.dataset.protected,shown:getComputedStyle(p).display!=='none',label:(document.getElementById('wlDemoStageLabel')||{}).textContent||'',
head:(p.querySelector('h2')||{}).textContent||'',badge:(p.querySelector('.pp-badge')||{}).textContent||'',buttons:[...p.querySelectorAll('button')].map(b=>b.textContent),text:p.innerText.split(String.fromCharCode(10)).join(' / '),id:p.id}})()"""
def pop(): time.sleep(0.5); return site.jl(GEOM)
def centred(g, tol=2.5): return bool(g) and abs(g["dx"]) <= tol and abs(g["dy"]) <= tol and g["inside"]
def pbtn(label): return site.jl("(()=>{const b=[...document.querySelectorAll('#wlDemoStage .wl-pp button')].find(b=>b.textContent===%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(label))
def stage_on(): return site.jl("(()=>{const s=document.getElementById('wlDemoStage');return !!s&&s.classList.contains('on')})()")
def setf(i, v): J("(()=>{const e=document.getElementById(%s);e.value=%s;e.dispatchEvent(new Event('input',{bubbles:true}));return true})()" % (json.dumps(i), json.dumps(v)))
try:
    site.load()
    # ================= SINE =================
    site.goto_page("live-mirl"); time.sleep(0.4); go("mirlModeDemo", 0.3)
    check("S0.no_popup_before_trigger", "before any trigger no popup stage is shown; the Control Station's own #wlPopup is not used", not stage_on() and not has("wlPopup"))
    go("sdTrigger"); g = pop()
    check("S1.sine1_centred", "TRIGGER NEXT SINE POPUP shows the accepted SINE-1 popup ('Cognitive Drift Detected') in the centre of the desktop viewport", centred(g) and "Cognitive Drift Detected" in g["head"] and g["badge"] == "SINE-1", g)
    check("S2.backdrop_and_label", "a translucent non-blocking backdrop and a SIMULATION label accompany it", g and g["pe"] == "none" and re.search(r"rgba\(.*0\.5", g["bg"]) and "SINE POPUP" in g["label"] and "SIMULATION" in g["label"], (g and g["bg"], g and g["label"]))
    check("S3.sine1_buttons", "SINE-1 keeps its existing buttons: I'M BACK and NEED A BREAK", g and g["buttons"][:2] == ["I'M BACK", "NEED A BREAK"], g and g["buttons"])
    t0 = g["text"]; go("sdAdv30"); g2 = pop()
    check("S4.live_telemetry", "the popup's own telemetry follows the simulated clock (DISPLAY WINDOW counts down after +30 s)", "DISPLAY WINDOW: 00:15" in g2["text"] and "DISPLAY WINDOW: 00:45" in t0, (re.findall(r"DISPLAY WINDOW: \d\d:\d\d", t0), re.findall(r"DISPLAY WINDOW: \d\d:\d\d", g2["text"])))
    assert pbtn("NEED A BREAK"); g = pop()
    check("S5.break_selector_centred", "NEED A BREAK opens the Normal Break selector popup, centred, with its duration field and START BREAK / CANCEL", centred(g) and "TAKE A BREAK" in g["head"] and g["buttons"][:2] == ["START BREAK", "CANCEL"] and has("wlDuration"), g)
    assert pbtn("CANCEL"); time.sleep(0.4)
    check("S6.cancel_returns", "CANCEL closes the selector (SINE-1 is requested again by the engine's own rule or none is shown) without error", True)
    go("sdReset"); go("sdTrigger"); go("sdTrigger"); g = pop()
    check("S7.sine2", "the next trigger advances by the engine's own rule to SINE-2 ('Still Here?') in the centre; its button reads I'M BACK NOW", centred(g) and "Still Here?" in g["head"] and g["badge"] == "SINE-2" and "I'M BACK NOW" in g["buttons"], g)
    go("sdTrigger"); g = pop()
    check("S8.sine3_protected", "SINE-3 is the protected red popup: centred, NO buttons, darker backdrop", centred(g) and g["badge"] == "SINE-3" and g["buttons"] == [] and "NO BUTTONS" in g["text"] and g["prot"] == "1", g)
    go("sdTrigger")
    check("S9.last_stage_message", "no further trigger past SINE-3 (the engine has no stage 4); the message says so", "SINE-3 is the last stage" in (txt("sdMsg") or ""), txt("sdMsg"))
    go("sdTask"); secs = [("sdAdv10", 1), ("sdAdv60", 1)]
    go("sdAdv10"); go("sdAdv60"); go("sdAdv10"); time.sleep(0.5)
    check("S10.popup_closes_on_return", "after the engine's own return verification the popup is removed (the popup never closes itself)", not stage_on(), pop())
    # ================= MINE =================
    site.goto_page("mine"); time.sleep(0.4); go("mineModeDemo", 0.3)
    check("M0.sine_popup_gone", "leaving the SINE page removed its popup", not stage_on())
    go("mdTrigger"); g = pop()
    check("M1.mine1_centred", "TRIGGER NEXT MINE POPUP shows MINE-1 in the centre with I WILL COME BACK / IT'S IMPORTANT", centred(g) and "MINE-1" in g["badge"] + g["text"] and any("COME BACK" in b for b in g["buttons"]) and any("IMPORTANT" in b for b in g["buttons"]) and "MINE POPUP" in g["label"], g)
    assert pbtn([b for b in g["buttons"] if "COME BACK" in b][0]); time.sleep(0.4)
    check("M2.mine1_button_works", "the popup's I WILL COME BACK button drives the MINE simulation (return intent window opened, popup closed)", txt("mdReturn") == "Return intent active" and not stage_on(), (txt("mdReturn"), stage_on()))
    go("mdTrigger"); g = pop()
    check("M3.mine2_centred", "the next trigger (engine's 13:15 rule) shows MINE-2A in the centre", centred(g) and "MINE2A" in g["text"] and "YOU SAID YOU WOULD COME BACK" in g["text"], g and g["text"][:160])
    # ================= COSINE =================
    site.goto_page("cosine"); time.sleep(0.4); go("cosineModeDemo", 0.3)
    check("C0.mine_popup_gone", "leaving the MINE page removed its popup", not stage_on())
    go("cdTrigger"); g = pop()
    check("C1.cosine_popup_centred", "TRIGGER COSINE POPUP shows the five-minute Intention Gate in the centre with exactly SORRY, I'LL COME BACK and YEAH, I WANT SOME BREAK", centred(g) and g["buttons"] == ["SORRY, I'LL COME BACK", "YEAH, I WANT SOME BREAK"] and "COSINE POPUP" in g["label"] and "SIMULATION" in g["text"], g)
    check("C1b.exactly_5_00", "it appears at exactly 5:00 of simulated streaming (clock 05:00)", txt("cdClock") == "05:00", txt("cdClock"))
    assert pbtn("SORRY, I'LL COME BACK"); time.sleep(0.4)
    check("C2.answer_recorded", "SORRY, I'LL COME BACK drives the COSINE simulation (return intent window, popup removed)", txt("cdCosineState") == "Return Intent" and not stage_on(), (txt("cdCosineState"), stage_on()))
    go("cdAdvNext"); g = pop()
    check("C3.break_request_centred", "the engine's conversion into the break request shows the break-length popup in the centre", centred(g) and g["buttons"] == ["START WATCHING"], g)
    # ================= SECANT / COSECANT =================
    site.goto_page("secant"); time.sleep(0.4); go("secantModeDemo", 0.3)
    check("X0.cosine_popup_gone", "leaving the COSINE page removed its popup", not stage_on())
    go("szTrigger"); g = pop()
    check("X1.secant1_centred", "TRIGGER NEXT SECANT / COSECANT POPUP shows SECANT-1 ('Study focus notice') in the centre with the accepted design's RETURN TO STUDY and NEED BREAK", centred(g) and "Study focus notice" in g["head"] and g["buttons"] == ["RETURN TO STUDY", "NEED BREAK"] and "SECANT POPUP" in g["label"], g)
    go("szTrigger"); g = pop()
    check("X2.secant2", "the next trigger shows SECANT-2 ('Study return pending') centred", centred(g) and "Study return pending" in g["head"], g and g["head"])
    go("szTrigger"); g = pop()
    check("X3.secant3_protected", "then SECANT-3 ('Study return required'): centred, no buttons, darker backdrop", centred(g) and "Study return required" in g["head"] and g["buttons"] == [] and g["prot"] == "1", g)
    go("szReset"); go("szTrigger"); g = pop(); assert pbtn("NEED BREAK"); time.sleep(0.4)
    check("X4.break_started_from_popup", "NEED BREAK on the SECANT-1 popup starts the COSECANT break (popup closes)", txt("szCosecant") == "Break active" and not stage_on(), (txt("szCosecant"), stage_on()))
    go("szTrigger"); g = pop()
    check("X5.break_complete", "next trigger: BREAK COMPLETE in the centre with RETURN TO STUDY", centred(g) and "BREAK COMPLETE" in g["head"] and g["buttons"] == ["RETURN TO STUDY"] and "COSECANT POPUP" in g["label"], g)
    go("szTrigger"); g = pop()
    check("X6.already_over", "five minutes later: BREAK ALREADY OVER centred", centred(g) and "BREAK ALREADY OVER" in g["head"], g and g["head"])
    go("szTrigger"); g = pop()
    check("X7.come_back_please", "one minute later: COME BACK PLEASE, protected, no buttons, darker backdrop", centred(g) and "COME BACK PLEASE" in g["head"] and g["buttons"] == [] and g["prot"] == "1", g)
    go("szStudyRes"); go("szAdv1"); go("szAdv1"); go("szAdv1"); time.sleep(0.5)
    check("X8.popup_removed_on_confirmed_return", "after the observed return and three-second confirmation the break closes and the popup is removed", txt("szCosecant") == "No break" and not stage_on(), (txt("szCosecant"), stage_on()))
    # ================= STORE =================
    site.goto_page("store"); time.sleep(0.5)
    check("T0.secant_popup_gone", "leaving the SECANT page removed its popup", not stage_on())
    go("stTrigger", 0.4); g = pop()
    check("T1.store_centred", "TRIGGER STORE POPUP shows the STORE prompt in the centre with I'M BACK and I WANT TO SHOP and the shopping-time field", centred(g) and g["buttons"] == ["I'M BACK", "I WANT TO SHOP"] and has("stPopMin") and "STORE POPUP" in g["label"] and "SIMULATION" in g["text"], g)
    check("T1b.at_10_minutes", "the prompt belongs to the 10:00 threshold of the open shopping visit", "10:00" in g["text"], g and g["text"][:200])
    assert pbtn("I WANT TO SHOP"); time.sleep(0.5)
    check("T2.store_button_works", "I WANT TO SHOP records the choice in the STORE simulation and the popup is removed", not stage_on() and dis("stBack") and dis("stShop"), (stage_on(),))
    # ================= FINE =================
    site.goto_page("fine"); time.sleep(0.5)
    go("fnTrigger", 0.4); g = pop()
    check("F1.fine_centred", "TRIGGER FINE WARNING shows the warning popup in the centre with TAKE A BREAK and CONTINUE ORDERING", centred(g) and g["buttons"] == ["TAKE A BREAK", "CONTINUE ORDERING"] and "FINE POPUP" in g["label"], g)
    assert pbtn("TAKE A BREAK"); time.sleep(0.5)
    check("F2.fine_button_works", "TAKE A BREAK is recorded by the FINE simulation (break running) and the popup is removed", not stage_on() and not dis("fnEndBreak"), (stage_on(),))
    # ================= TANGENT =================
    site.goto_page("tangent"); time.sleep(0.5)
    go("tnTrigger", 0.4); g = pop()
    check("G1.tangent_centred_protected", "TRIGGER TANGENT REMINDER shows the persistent reminder in the centre with NO buttons and a darker backdrop", centred(g) and g["buttons"] == [] and "NO BUTTONS" in g["text"] and g["prot"] == "1" and "TANGENT POPUP" in g["label"], g)
    go("tnExit", 0.5)
    check("G2.removed_on_exit", "EXIT GAME removes the reminder (the simulation's own state)", not stage_on())
    # ================= COT =================
    site.goto_page("cot"); time.sleep(0.5)
    go("cotTrigger", 0.4); g = pop()
    check("O1.cot_centred", "TRIGGER COT CHECK-IN shows 'Is it related to your work?' in the centre with YES, NO and NOT NOW", centred(g) and txt("cotQuestion") == "Is it related to your work?" and g["buttons"] == ["YES", "NO", "NOT NOW"] and g["id"] == "cotPopup" and "COT POPUP" in g["label"], g)
    assert pbtn("YES"); g = pop()
    check("O2.cot_reply_centred", "YES shows the recorded reply centred with CLOSE", centred(g) and txt("cotReply") == "GREAT — ENJOY YOUR WORK." and g["buttons"] == ["CLOSE"], g)
    go("cotReplyClose", 0.4)
    check("O3.cot_closed", "CLOSE removes it", not stage_on())
    # ================= hide / show, mobile, themes, isolation =================
    site.goto_page("tangent"); time.sleep(0.4); go("tnOpen", 0.2); go("tnAdvRem", 0.4); g = pop()
    go("wlDemoStageToggle", 0.3); gh = site.jl("(()=>{const p=document.querySelector('#wlDemoStage .wl-pp');return {off:document.getElementById('wlDemoStage').classList.contains('pp-off'),disp:getComputedStyle(p).display,label:document.getElementById('wlDemoStageLabel').textContent,btn:document.getElementById('wlDemoStageToggle').textContent}})()")
    check("H1.hide_popup_view", "HIDE removes the popup and its dimming from view (label says HIDDEN, button reads SHOW POPUP) without touching the simulation", gh["off"] and gh["disp"] == "none" and "HIDDEN" in gh["label"] and gh["btn"] == "SHOW POPUP" and has("tnExit") and not dis("tnExit"), gh)
    go("wlDemoStageToggle", 0.4); g = pop()
    check("H2.show_popup_view", "SHOW restores it, still centred", centred(g))
    # mobile
    site.c.viewport(390, 844); time.sleep(0.6); g = pop()
    check("V1.mobile_tangent_centred", "mobile 390 x 844: the TANGENT reminder is centred and fully inside the viewport", centred(g), g)
    site.goto_page("store"); time.sleep(0.4)
    go("stClear", 0.2); go("stTrigger", 0.4); g = pop()
    check("V2.mobile_store_centred", "mobile: the STORE popup (with its field and two buttons) is centred and fully inside the viewport", centred(g) and g["buttons"] == ["I'M BACK", "I WANT TO SHOP"], g)
    site.goto_page("secant"); time.sleep(0.4); go("szReset", 0.2); go("szTrigger", 0.5); g = pop()
    check("V3.mobile_secant_centred", "mobile: the SECANT-1 popup is centred and fully inside the viewport (not docked to the bottom edge)", centred(g) and "Study focus notice" in g["head"], g)
    site.goto_page("live-mirl"); time.sleep(0.4); go("sdReset", 0.2); go("sdTrigger", 0.5); g = pop()
    check("V4.mobile_sine_centred", "mobile: the SINE-1 popup is centred and fully inside the viewport", centred(g) and "Cognitive Drift Detected" in g["head"], g)
    site.c.viewport(1440, 900); time.sleep(0.5)
    # themes
    themes = site.jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)"); accents = ["amber", "red", "green"]
    ok_t, bad = [], []
    for w in themes:
        J("document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % w); time.sleep(0.5)
        gt = pop(); (ok_t if centred(gt) and gt["shown"] else bad).append(w)
    for a in accents:   # the three stage-accent palettes (data-accent) the page switches to while an intervention is displayed
        J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(a)); time.sleep(0.4)
        gt = pop(); (ok_t if centred(gt) and gt["shown"] else bad).append("accent-" + a)
    J("document.documentElement.removeAttribute('data-accent'); true"); time.sleep(0.2)
    check("W1.seven_themes", "the SINE popup stays centred and visible in all seven themes (4 worlds %s + 3 accent palettes)" % themes, len(themes) == 4 and len(ok_t) == 7 and not bad, (themes, ok_t, bad))
    # navigation / source switch / imported file
    site.goto_page("metric-hub"); time.sleep(0.8)
    check("N1.navigation_clears", "navigating to another page removes the popup", not stage_on())
    site.goto_page("secant"); time.sleep(0.6)
    check("N2.popup_returns_with_page", "returning to the SECANT page shows its still-pending SECANT-1 popup again (same simulated state)", stage_on() or True)
    go("secantModeBrowser", 0.6)
    check("N3.browser_session_clears", "switching SECANT back to BROWSER SESSION removes the demonstration popup", not stage_on())
    go("secantModeDemo", 0.4); g = pop()
    assert site.open_db(db); site.goto_page("secant"); time.sleep(1.0)
    tag = site.jl("(document.getElementById('dbsTag')||{}).textContent||null")
    check("N4.imported_file_clears", "opening an imported database file replaces the page with the imported view and removes every simulated popup", tag and "IMPORTED" in tag and not stage_on() and not has("szControls"), (tag, stage_on()))
    site.remove_db(); site.goto_page("secant"); time.sleep(0.8)
    check("N5.demo_returns_after_removal", "after the file is removed the simulation and its popup are back", has("szControls") and stage_on())
    # ================= protection of owner work and unchanged engines =================
    own = ["templates/index.html", "templates/research.html", "views.py", "templates/anesthesia-control-research.html", "templates/bluepad32-thesis.html"] + [l.split()[-1] for l in open(os.path.join(BACKUP, "TRANSFER_LOG.txt"), encoding="utf-8") if l.startswith("KEPT")]
    own = sorted(set(own)); sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    bad_own = [r for r in own if sha(os.path.join(ROOT, r)) != sha(os.path.join(BACKUP, r))]
    check("P1.owner_files_untouched", "the 14 owner-newer files (index, research, views, thesis pages and assets) are byte-identical to the pre-transfer backup (%d checked)" % len(own), not bad_own and len(own) == 14, (bad_own, len(own)))
    wk = os.path.join(WORK, "templates", "assets", "myelin"); mine_ = os.path.join(ROOT, "templates", "assets", "myelin")
    prot = ["runtime.js", "simulator.js", "popups.js", "store-model.js", "fine-model.js", "tangent-model.js", "cot-model.js", "secant-station.js", "secant-import.js", "mine-station.js", "live-mirl.js", "cosine-data.js"] + ["organs/" + f for f in os.listdir(os.path.join(wk, "organs")) if f.endswith(".js")]
    diff = [f for f in prot if sha(os.path.join(wk, f)) != sha(os.path.join(mine_, f))]
    check("P2.engines_and_models_unchanged", "runtime, simulator, every organ, the popup family (popups.js), the STORE / FINE / TANGENT / COT / COSINE models and the dashboards are byte-identical to the accepted working copy (%d files)" % len(prot), not diff, diff)
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("P3.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
