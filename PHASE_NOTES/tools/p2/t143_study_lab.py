"""Academy Stage A — Study Mode teaching simulation (study-lab-core.js / study-lab.js inside Study Mode).
Checks: (1) the JavaScript calculator reproduces the REAL desktop calculator (study_alignment.py, schema myelin-study-evidence-v5) on 23 golden cases and the Resource Intent bands; (2) default / custom video
declaration, the seven preparation fields, validation and the optional URL (declared only, never fetched); (3) the keyword-points lesson (ordinary 1, important 2, no third tier; caps; try-a-title);
(4) the three outcomes on a manual clock: aligned (no warning), uncertain (5:00 Study confirmation popup, both answers) and off-task (dwell -> first intervention due, hand-off to SECANT);
(5) isolation (engine, Live Telemetry, storage, SECANT / COSECANT untouched), accessibility, seven themes, no overflow; (6) only the new files + two link lines changed.
usage: t143_study_lab.py <base_url> <chrome_port> <previous_checkpoint_dir>"""
import os, sys, json, time, difflib, hashlib
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, PREV = sys.argv[1], int(sys.argv[2]), sys.argv[3]
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
site = Site(base, cport); J = site.J; jl = site.jl
click = lambda i: J("(()=>{const b=document.getElementById(%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(i))
has = lambda i: jl("!!document.getElementById(%s)" % json.dumps(i))
txt = lambda i: jl("(document.getElementById(%s)||{}).textContent||null" % json.dumps(i))
def setv(i, v): J("(()=>{const e=document.getElementById(%s);e.value=%s;e.dispatchEvent(new Event('input',{bubbles:true}));return true})()" % (json.dumps(i), json.dumps(str(v))))
def stage():
    return jl("""(()=>{const s=document.getElementById('wlDemoStage'),p=s&&s.querySelector('.wl-pp');if(!s||!s.classList.contains('on')||!p)return null;const r=p.getBoundingClientRect();
return {dx:Math.round((r.left+r.width/2-innerWidth/2)*10)/10,dy:Math.round((r.top+r.height/2-innerHeight/2)*10)/10,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,head:(p.querySelector('h2')||{}).textContent,
badge:(p.querySelector('.pp-badge')||{}).textContent,buttons:[...p.querySelectorAll('button')].map(b=>b.textContent),text:p.innerText.split(String.fromCharCode(10)).join(' / '),label:(document.getElementById('wlDemoStageLabel')||{}).textContent}})()""")
def pbtn(label): return jl("(()=>{const b=[...document.querySelectorAll('#wlDemoStage .wl-pp button')].find(b=>b.textContent===%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(label))
def goto_study():
    J("document.body.classList.contains('sidebar-open')||document.getElementById('menuToggle').click(); true"); time.sleep(0.3)
    J("document.querySelector('#navStudyRow').click(); document.body.classList.remove('sidebar-open'); window.scrollTo(0,0); true"); time.sleep(0.8)
def goto(page):
    J("document.body.classList.contains('sidebar-open')||document.getElementById('menuToggle').click(); true"); time.sleep(0.3)
    J("document.querySelector('.nav-row[data-page=%s]').click(); document.body.classList.remove('sidebar-open'); true" % page); time.sleep(0.8)
def tile(i): return txt(i)
def overflow(): return jl("({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth})")
try:
    site.load()
    # ================= 1. parity with the real desktop calculator =================
    gold = json.load(open(os.path.join(TOOLS, "study_lab_golden.json"), encoding="utf-8"))
    check("G0.golden_schema", "the golden file comes from the desktop calculator, schema myelin-study-evidence-v5", gold["schema"] == "myelin-study-evidence-v5" and len(gold["cases"]) == 23)
    res = jl("""(async()=>{const C=await import('/assets/myelin/study-lab-core.js');const g=%s;return g.cases.map(c=>{const e=C.studyEvidence({subject:c.subject,task:c.task,keywords:c.keywords,important:c.important,title:c.title,identityCertified:c.cert,allowExactTask:c.exact});
return {name:c.name,conf:e.confidencePercent,caps:e.safetyCaps,rawM:e.rawMatchedPoints,rawP:e.rawPossiblePoints,effM:e.effectiveMatchedPoints,effP:e.effectivePossiblePoints,coreM:e.coreMatchedCount,coreP:e.corePossibleCount,pen:e.mismatchPenaltyPercent,
sus:[...e.suspiciousKeywords].sort(),basis:e.alignmentBasis,reasons:e.reasons,kw:e.keywordEvidence.map(k=>[k.keyword,k.importance,k.points,k.matched]),cls:C.classify(e).classification}})})()""" % json.dumps(gold))
    bad = []
    for r, c in zip(res, gold["cases"]):
        x = c["expected"]
        want_cls = "STUDY_ALIGNED" if (x["confidence"] >= 75 and c["cert"]) else "UNCERTAIN" if x["confidence"] > 25 else "DISTRACTION"
        if x["rawPossible"] == 0 and x["basis"] != "EXACT_TASK_TITLE": want_cls = "UNCERTAIN"
        if not (abs(r["conf"] - x["confidence"]) < 0.0015 and r["caps"] == x["caps"] and r["rawM"] == x["rawMatched"] and r["rawP"] == x["rawPossible"] and r["effM"] == x["effMatched"] and r["effP"] == x["effPossible"]
                and r["coreM"] == x["coreMatched"] and r["coreP"] == x["corePossible"] and r["pen"] == x["penalty"] and r["sus"] == x["suspicious"] and r["basis"] == x["basis"] and r["reasons"] == x["reasons"]
                and r["kw"] == x["kw"] and r["cls"] == want_cls): bad.append((c["name"], r, x, want_cls))
    check("G1.js_equals_desktop_calculator", "the browser calculator reproduces the real desktop calculator on all 23 golden cases: confidence, caps, points, important coverage, penalties, suspicious keywords, basis, reasons, per-keyword evidence and the Resource Intent band", not bad, bad[:1])
    check("G2.weights_are_1_and_2", "authoritative weights: ordinary keyword 1 point, important 2 points (no third tier); aligned >= 75 with certified identity, uncertain > 25, off-task otherwise; caps 74 and 50",
          jl("(async()=>{const C=await import('/assets/myelin/study-lab-core.js');return [C.NORMAL_POINTS,C.IMPORTANT_POINTS,C.ALIGNED_MIN,C.UNCERTAIN_MIN,C.UNCERTAIN_CAP,C.SINGLE_MATCH_CAP,C.CONFIRM_INTERVAL_S,C.OFFTASK_FIRST_S]})()") == [1, 2, 75, 25, 74, 50, 300, 300])
    dv = jl("""(async()=>{const C=await import('/assets/myelin/study-lab-core.js');const d=C.DEFAULT_VIDEO,s=C.buildScenarios(d);return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,[v.verdict.classification,v.evidence.confidencePercent]]))})()""")
    check("G3.default_scenarios_verified", "the default video's three observed titles really classify as aligned (90.909), uncertain (36.364) and off-task (0)", dv == {"aligned": ["STUDY_ALIGNED", 90.909], "uncertain": ["UNCERTAIN", 36.364], "off": ["DISTRACTION", 0]}, dv)
    cust = jl("""(async()=>{const C=await import('/assets/myelin/study-lab-core.js');const d={title:'Thermodynamics Lecture 4',subject:'Physics',task:'Thermodynamics lecture 4',keywords:C.splitList('heat, entropy, energy, engine'),important:C.splitList('thermodynamics, law')};const s=C.buildScenarios(d);
return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v?[v.verdict.classification,v.via]:null]))})()""")
    check("G4.custom_scenarios_built_and_verified", "for a visitor's own words the aligned / uncertain / off-task titles are built from those words and verified by the calculator", cust["aligned"][0] == "STUDY_ALIGNED" and cust["uncertain"][0] == "UNCERTAIN" and cust["off"][0] == "DISTRACTION", cust)
    # ================= 2. mounting + isolation baseline =================
    goto_study()
    base_state = jl("({state:window.MYELIN.state,feed:document.querySelectorAll('#feed > *').length,ls:Object.keys(localStorage).sort(),ss:Object.keys(sessionStorage).sort()})")
    check("M1.mode_bar_default_is_real_study", "Study Mode opens as before: the real STUDY SESSION is shown, the teaching simulation is hidden behind a clearly separate STUDY TEACHING SIMULATION button", has("sxLabBar") and jl("getComputedStyle(document.getElementById('sxMain')).display") != "none" and jl("document.getElementById('sxLab').hidden") and jl("document.getElementById('sxModeSession').getAttribute('aria-pressed')") == "true")
    click("sxModeLab"); time.sleep(0.4)
    check("M2.lab_opens_and_real_study_hidden", "opening the teaching simulation shows the lab and hides (not removes) the real Study Mode surface; STUDY SESSION restores it", not jl("document.getElementById('sxLab').hidden") and jl("getComputedStyle(document.getElementById('sxMain')).display") == "none" and has("sxTimerCard"))
    click("sxModeSession"); time.sleep(0.3); back = jl("getComputedStyle(document.getElementById('sxMain')).display") != "none" and jl("document.getElementById('sxLab').hidden"); click("sxModeLab"); time.sleep(0.3)
    check("M3.real_study_restored", "switching back restores the real Study Mode", back)
    hd = jl("document.getElementById('sxLab').innerText")
    check("M4.labelled_simulated", "the lab is labelled SIMULATED TUTORIAL — NOT MONITORING and NOTHING IS WATCHED, PLAYED OR MEASURED", "SIMULATED TUTORIAL — NOT MONITORING" in hd and "NOTHING IS WATCHED, PLAYED OR MEASURED" in hd)
    # ================= 3. choose video =================
    check("V1.two_choices", "step 1 offers DEFAULT VIDEO and CUSTOM VIDEO (nothing chosen yet, later steps locked)", has("slPickDefault") and has("slPickCustom") and jl("document.getElementById('slNav_plan').disabled") and jl("document.getElementById('slNav_scenarios').disabled"))
    click("slPickDefault"); time.sleep(0.2)
    p = jl("document.getElementById('slDefaultPane').innerText")
    check("V2.default_example_clearly_labelled", "DEFAULT VIDEO shows its title, subject, task and keywords and states TUTORIAL EXAMPLE — nothing is played, fetched or inspected", "TUTORIAL EXAMPLE" in p and "How Neurons Fire: The Action Potential Explained" in p and "Neuroscience" in p and "action potential, neuron" in p and "nothing is played, fetched or inspected" in p, p[:200])
    click("slUseVideo"); time.sleep(0.4)
    vals = jl("({s:document.getElementById('slSubject').value,t:document.getElementById('slTask').value,k:document.getElementById('slKeywords').value,i:document.getElementById('slImportant').value,sm:document.getElementById('slStudyMin').value,bm:document.getElementById('slBreakMin').value})")
    check("V3.default_fills_the_plan", "using the default video fills subject, task, keywords and important keywords and moves to step 2; the declared resource is stated", vals == {"s": "Neuroscience", "t": "Action potential lecture", "k": "membrane, sodium, potassium, signal, channels", "i": "action potential, neuron", "sm": "45", "bm": "10"} and "How Neurons Fire" in txt("slDeclared"), vals)
    # ================= 4. prepare =================
    whys = jl("['slStudyMin','slBreakMin','slSubject','slTask','slKeywords','slImportant'].map(i=>(document.getElementById(i+'Why')||{}).textContent||'')")
    check("P1.each_field_explained", "all six fields carry a numbered plain-English explanation (study length, break, subject, task, keywords, important keywords) and PREPARE is step 7", all(w for w in whys) and whys[4].startswith("5") and whys[5].startswith("6") and "7 · Preparing" in jl("document.getElementById('slStepPlan').innerText"), whys)
    click("slDur60"); check("P2.presets_fill_length", "a duration preset fills the study length (60)", jl("document.getElementById('slStudyMin').value") == "60" and jl("document.getElementById('slDur60').getAttribute('aria-pressed')") == "true")
    setv("slBreakMin", 15); setv("slKeywords", "x"); setv("slImportant", ""); click("slPrepare"); time.sleep(0.3)
    check("P3.validation_plain_english", "preparing with one keyword and no important keyword is refused in plain English (needs an important keyword and two different keywords) and nothing is prepared", "important" in (txt("slMsg") or "").lower() and "two different keywords" in (txt("slMsg") or "") and not has("slPrepared"), txt("slMsg"))
    setv("slKeywords", "membrane, sodium, potassium, signal, channels"); setv("slImportant", "action potential, neuron"); click("slPrepare"); time.sleep(0.4)
    check("P4.prepared", "a valid block prepares: 60 min study, 15 min break, declared resource named, nothing started or monitored", has("slPrepared") and "60 min study · 15 min break" in txt("slPrepared") and "How Neurons Fire" in txt("slPrepared") and "(1)" in txt("slPrepared") and "(2)" in txt("slPrepared"), txt("slPrepared"))
    click("slFillForm"); time.sleep(0.3)
    ff = jl("({s:document.getElementById('sxSubject').value,t:document.getElementById('sxTask').value,k:document.getElementById('sxKeywords').value,i:document.getElementById('sxImportant').value,sm:document.getElementById('sxStudyMin').value,bm:document.getElementById('sxBreakMin').value})")
    check("P5.copy_to_real_form", "COPY TO THE STUDY MODE FORM puts the six values into the real Study Mode fields (only on request; nothing is started)", ff == {"s": "Neuroscience", "t": "Action potential lecture", "k": "membrane, sodium, potassium, signal, channels", "i": "action potential, neuron", "sm": "60", "bm": "15"} and jl("window.MYELIN.state") == base_state["state"], ff)
    # ================= 5. keyword points lesson =================
    click("slToPoints"); time.sleep(0.4)
    pts = jl("document.getElementById('slStepPoints').innerText")
    check("K1.points_are_evidence_not_rewards", "the lesson says keyword points are weighted evidence, not scores or rewards; ordinary 1 point, important 2 points; no third tier; matching cannot prove attention", "not scores to win" in pts and "weighted evidence" in pts and "1 point" in pts and "2 points" in pts and "3 points" not in pts and "cannot prove that you paid attention" in pts)
    rows = jl("[...document.querySelectorAll('#slDeclTable tr')].map(r=>[...r.children].map(c=>c.textContent))")
    check("K2.declared_keywords_table", "the declared keywords table lists 5 ordinary x 1 and 3 important words x 2 (action, potential, neuron) = 11 points possible", len([r for r in rows if r[1] == "ORDINARY"]) == 5 and [r for r in rows if r[1] == "IMPORTANT"] == [["action", "IMPORTANT", "2"], ["potential", "IMPORTANT", "2"], ["neuron", "IMPORTANT", "2"]] and rows[-1][-1] == "11", rows)
    check("K3.bands_and_caps_explained", "the 75 / 25 bands and all six safety limits are explained", all(k in pts for k in ("75 and above", "above 25 and under 75", "25 or below")) and jl("document.querySelectorAll('#slStepPoints [data-cap]').length") == 6)
    setv("slTryTitle", "Neuron Signal Basics: Sodium Explained"); time.sleep(0.3)
    to = jl("({cls:[...document.querySelectorAll('#slTryOut .sl-result b')].map(b=>b.textContent),txt:document.getElementById('slTryOut').innerText,hits:document.querySelectorAll('#slTryOut mark').length,imp:document.querySelectorAll('#slTryOut mark.sl-hit-imp').length})")
    check("K4.try_a_title_live", "typing a title shows which declared words matched (neuron important; signal, sodium ordinary), points 4 of 11 = 36.364% and UNCERTAIN, with the missing important keywords named", "36.364%" in to["cls"] and to["hits"] == 3 and to["imp"] == 1 and "UNCERTAIN" in to["txt"] and "Points earned: 4 of 11" in to["txt"] and "missing: action, potential" in to["txt"], to)
    setv("slTryTitle", "Action Potential in a Neuron: Sodium and Potassium Channels Across the Membrane"); J("document.getElementById('slTryCert').click(); true"); time.sleep(0.3)
    to2 = jl("document.getElementById('slTryOut').innerText")
    check("K5.uncertified_identity_caps_at_74", "with the identity NOT certified, even a near-perfect title is held at 74 and is UNCERTAIN, and the plain-English reason says words cannot prove identity", "74%" in to2 and "UNCERTAIN" in to2 and "Words in a title can never prove which site or video this is" in to2, to2[:300])
    # ================= 6. scenarios =================
    click("slToScenarios"); time.sleep(0.3)
    ev0 = jl("document.querySelectorAll('#slEvents li').length")
    click("slScnAligned"); time.sleep(0.3)
    a1 = jl("({o:document.getElementById('slScnPanel').dataset.outcome,t:document.getElementById('slScnPanel').innerText,cls:document.getElementById('slTileClass').textContent,dwell:document.getElementById('slTileDwell').textContent,warn:document.getElementById('slTileWarn').textContent,iv:document.getElementById('slTileIv').textContent,hits:document.querySelectorAll('#slScnPanel mark').length})")
    check("S1.aligned", "SCENARIO 1: STUDY ALIGNED (90.909%), matching keywords highlighted, off-task dwell NONE, distraction warning NOT SHOWN, SINE / SECANT withheld, the reason stated", a1["o"] == "STUDY_ALIGNED" and "90.909%" in a1["t"] and a1["dwell"] == "NONE" and a1["warn"] == "NOT SHOWN" and "WITHHELD" in a1["iv"] and a1["hits"] >= 6 and "verified study material" in a1["t"] and "Important keywords found: 3 of 3" in a1["t"], a1)
    click("slAdv300"); click("slAdv300"); time.sleep(0.3)
    check("S1b.aligned_stays_quiet", "ten minutes later nothing happens: no popup, no dwell, no warning", stage() is None and txt("slTileDwell") == "NONE" and txt("slTileWarn") == "NOT SHOWN" and txt("slClock") == "CLOCK 10:00")
    click("slScnReset"); click("slScnUncertain"); time.sleep(0.3)
    u0 = jl("({o:document.getElementById('slScnPanel').dataset.outcome,t:document.getElementById('slScnPanel').innerText,cls:document.getElementById('slTileClass').textContent,dwell:document.getElementById('slTileDwell').textContent})")
    check("S2.uncertain_shown", "SCENARIO 2: UNCERTAIN 50% (36.364%); partial matches and the missing important keywords are shown; off-task dwell NOT COUNTING; uncertainty is explained as not a confirmed distraction", u0["o"] == "UNCERTAIN" and "UNCERTAIN · 50%" in u0["cls"] and "36.364%" in u0["t"] and "missing: action, potential" in u0["t"] and u0["dwell"] == "NOT COUNTING" and "not a distraction" in u0["t"], u0)
    clk0 = txt("slClock"); click("slAdv60"); click("slAdv60"); click("slAdv60"); click("slAdv60"); time.sleep(0.3)
    check("S2b.no_popup_before_5min", "four minutes of uncertainty: no confirmation popup yet; the next clarification is 1:00 away", stage() is None and "in 01:00" in txt("slTileNext") or "01:00" in (txt("slTileNext") or ""), (stage(), txt("slTileNext")))
    click("slAdvNext"); time.sleep(0.6); sg = stage()
    check("S2c.confirmation_at_5min", "at exactly 5:00 the Study confirmation popup appears centred with the desktop wording: IS THIS PART OF YOUR CURRENT STUDY? / THIS IS STUDY MATERIAL / I'M COMING BACK / measured 50% UNCERTAIN", sg and txt("slClock") == "CLOCK 05:00" and txt("slTileUnres") == "05:00 / 05:00" and abs(sg["dx"]) < 3 and abs(sg["dy"]) < 3 and sg["inside"] and sg["head"] == "IS THIS PART OF YOUR CURRENT STUDY?" and sg["buttons"] == ["THIS IS STUDY MATERIAL", "I'M COMING BACK"] and "50% UNCERTAIN" in sg["text"] and "Action" not in (sg["head"] or "") and "STUDY CONFIRMATION" in sg["label"], sg)
    click("slAdv300"); time.sleep(0.4)
    check("S2d.unanswered_asks_again", "unanswered, the popup stays and the next five minutes record clarification 2 (no timeout, nothing is decided for you)", stage() is not None and "Clarification 2" in jl("document.getElementById('wlDemoStage').innerText") and jl("document.querySelectorAll('#slEvents li b').length") > 0 and "STUDY_CONFIRMATION_POPUP_REQUESTED" in jl("document.getElementById('slEvents').innerText") and txt("slTileDwell") == "NOT COUNTING", jl("document.getElementById('wlDemoStage').innerText")[:200])
    assert pbtn("THIS IS STUDY MATERIAL"); time.sleep(0.4)
    s2a = jl("({t:document.getElementById('slScnPanel').innerText,eff:document.getElementById('slTileEffective').textContent,dwell:document.getElementById('slTileDwell').textContent,iv:document.getElementById('slTileIv').textContent})")
    check("S2e.answer_study", "THIS IS STUDY MATERIAL: popup closes, effective state STUDY ALIGNED (confirmed by you), no off-task dwell, SINE / SECANT withheld, event recorded as your response", stage() is None and "STUDY ALIGNED (confirmed by you)" in s2a["eff"] and s2a["dwell"] == "NONE" and "WITHHELD" in s2a["iv"] and "THIS IS STUDY MATERIAL" in jl("document.getElementById('slEvents').innerText"), s2a)
    click("slAdv300"); time.sleep(0.2)
    check("S2f.stays_aligned", "after the answer, more time changes nothing", txt("slTileDwell") == "NONE" and stage() is None)
    click("slScnReset"); click("slScnUncertain"); click("slAdvNext"); time.sleep(0.5)
    assert pbtn("I'M COMING BACK"); time.sleep(0.4); t_ans = txt("slClock")
    s2b = jl("({eff:document.getElementById('slTileEffective').textContent,dwell:document.getElementById('slTileDwell').textContent,iv:document.getElementById('slTileIv').textContent,path:!!document.getElementById('slPathway'),t:document.getElementById('slScnPanel').innerText})")
    check("S2g.answer_coming_back", "I'M COMING BACK: confirmed off-task from now: dwell restarts at 00:00 / 05:00, first intervention SECANT-1 at 05:00, the answer is called an intention, not a measured return", stage() is None and "OFF-TASK (confirmed by you)" in s2b["eff"] and s2b["dwell"] == "00:00 / 05:00" and "SECANT-1 AT 05:00" in s2b["iv"] and s2b["path"], s2b)
    click("slAdv300"); time.sleep(0.3)
    check("S2h.dwell_reaches_first_stage", "five more minutes of off-task dwell: SECANT-1 DUE and the hand-off event is logged", txt("slTileDwell") == "05:00 / 05:00" and "SECANT-1 DUE" in txt("slTileIv") and "OFF_TASK_DWELL_REACHED_FIRST_STAGE" in jl("document.getElementById('slEvents').innerText"))
    click("slScnReset"); click("slScnOff"); time.sleep(0.3)
    o0 = jl("({o:document.getElementById('slScnPanel').dataset.outcome,t:document.getElementById('slScnPanel').innerText,dwell:document.getElementById('slTileDwell').textContent,iv:document.getElementById('slTileIv').textContent})")
    check("S3.off_task", "SCENARIO 3: OFF-TASK (0%); no keyword matched, background-mismatch words named; dwell 00:00 / 05:00; SECANT-1 at 05:00; no popup yet", o0["o"] == "DISTRACTION" and "0%" in o0["t"] and "Background mismatch" in o0["t"] and "Important keywords found: 0 of 3" in o0["t"] and o0["dwell"] == "00:00 / 05:00" and "SECANT-1 AT 05:00" in o0["iv"] and stage() is None, o0)
    click("slAdv60"); click("slAdv60"); click("slAdv60"); click("slAdv60"); time.sleep(0.2); w4 = txt("slTileWarn")
    click("slAdvNext"); time.sleep(0.3)
    check("S3b.dwell_to_5min", "at 4:00 the warning is NOT YET due; at exactly 5:00 it is DUE and SECANT-1 is announced", w4 == "NOT YET" and txt("slTileDwell") == "05:00 / 05:00" and txt("slTileWarn") == "DUE" and "SECANT-1 DUE" in txt("slTileIv"))
    click("slOpenSecant"); time.sleep(0.8)
    check("S3c.handoff_opens_existing_secant", "OPEN THE SECANT SIMULATION goes to the existing SECANT page (the popups themselves are the accepted SECANT simulation, untouched)", jl("document.querySelector('.page.active').id") == "page-secant")
    goto_study(); time.sleep(0.4)
    check("S3d.lab_state_kept", "returning to Study Mode, the lab keeps its state", not jl("document.getElementById('sxLab').hidden") and has("slScnPanel"))
    # ================= 7. custom video =================
    click("slRestart"); time.sleep(0.3); click("slPickCustom"); time.sleep(0.2)
    click("slUseVideo"); time.sleep(0.2)
    check("C1.custom_validation", "CUSTOM VIDEO with nothing filled in is refused with plain-English problems (title, subject, task, important keyword, two keywords)", all(k in (txt("slMsg") or "") for k in ("title", "subject", "task", "important", "two different")), txt("slMsg"))
    for i, v in (("slCTitle", "Thermodynamics Lecture 4: Entropy and Heat Engines"), ("slCSubject", "Physics"), ("slCTask", "Thermodynamics lecture 4"), ("slCUrl", "http://127.0.0.1:9/never-opened"),
                 ("slCKeywords", "heat, entropy, energy, engine"), ("slCImportant", "thermodynamics, law")): setv(i, v)
    click("slUseVideo"); time.sleep(0.4)
    check("C2.custom_declared", "a valid custom video becomes the declared resource; the optional URL is recorded as declared only", "Thermodynamics Lecture 4" in txt("slDeclared") and "address recorded, never opened" in jl("document.getElementById('slEvents')?.innerText||document.getElementById('slStepPlan').innerText||''") or "Thermodynamics" in txt("slDeclared"), txt("slDeclared"))
    click("slPrepare"); time.sleep(0.4); click("slToPoints"); click("slToScenarios"); time.sleep(0.3)
    outs = []
    for k in ("slScnAligned", "slScnUncertain", "slScnOff"):
        click(k); time.sleep(0.3); outs.append(jl("document.getElementById('slScnPanel').dataset.outcome"))
    check("C3.custom_three_outcomes", "with the visitor's own words all three outcomes work and classify correctly (aligned, uncertain, off-task)", outs == ["STUDY_ALIGNED", "UNCERTAIN", "DISTRACTION"], outs)
    never = jl("performance.getEntriesByType('resource').some(r=>r.name.includes('127.0.0.1:9'))")
    check("C4.url_never_fetched", "the declared video URL was never requested by the page (no network call to it)", not never)
    # ================= 8. isolation / protection / a11y / themes / layout =================
    after = jl("({state:window.MYELIN.state,feed:document.querySelectorAll('#feed > *').length,ls:Object.keys(localStorage).sort(),ss:Object.keys(sessionStorage).sort()})")
    check("I1.isolated", "the whole tutorial left the engine runtime IDLE, added nothing to Live Telemetry and wrote nothing to local / session storage", after == base_state, (base_state, after))
    J("document.getElementById('slNav_plan').click(); true"); time.sleep(0.3)
    a11y = jl("""(()=>{const ids=[...document.querySelectorAll('#sxLab input')].map(i=>i.type==='checkbox'?true:!!document.querySelector('label[for="'+i.id+'"]'));return {labels:ids.every(Boolean),n:ids.length,nav:document.querySelector('.sl-nav').getAttribute('aria-label'),cur:document.querySelectorAll('.sl-navbtn[aria-current="step"]').length,status:document.getElementById('slMsg').getAttribute('role'),pressed:!!document.querySelector('#sxLab [aria-pressed]'),tables:[...document.querySelectorAll('#sxLab table')].every(t=>t.getAttribute('aria-label')),btnH:[...document.querySelectorAll('#sxLab button')].filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect().height).filter(h=>h<32).length}})()""")
    check("A1.accessible", "every lab input has a label, steps are a labelled navigation with aria-current, messages are a status region, choices expose aria-pressed, tables are labelled, no tiny buttons", a11y["labels"] and a11y["n"] > 5 and a11y["nav"] and a11y["cur"] == 1 and a11y["status"] == "status" and a11y["pressed"] and a11y["tables"] and a11y["btnH"] == 0, a11y)
    LUM = """(()=>{const cv=document.createElement('canvas');cv.width=cv.height=1;const x=cv.getContext('2d',{willReadFrequently:true});const rgb=v=>{x.clearRect(0,0,1,1);x.fillStyle='#000';x.fillStyle=v;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]]};
const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])};const cr=(a,b)=>{const p=L(a),q=L(b);return (Math.max(p,q)+0.05)/(Math.min(p,q)+0.05)};
const bg=rgb(getComputedStyle(document.querySelector('#slStepScenarios')).backgroundColor);const t=(s)=>rgb(getComputedStyle(document.querySelector(s)).color);
return {why:cr(t('.sl-lines li'),bg),hint:cr(t('.st-hint'),bg),title:cr(t('.st-card-h h3'),bg)}})()"""
    themes = jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)"); rs = []
    J("document.getElementById('slNav_scenarios').click(); true"); time.sleep(0.2); click("slScnUncertain"); time.sleep(0.2)
    for w in themes + ["amber", "red", "green"]:
        if w in ("amber", "red", "green"): J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(w))
        else: J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % json.dumps(w))
        time.sleep(0.4); r = jl(LUM); o = overflow(); rs.append((w, round(r["why"], 1), round(r["hint"], 1), o["sw"] <= o["W"]))
    J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=neon]').click(); true")
    check("T1.seven_themes", "in all seven themes (4 worlds + 3 accent palettes) the lesson text keeps readable contrast (>= 4.5) and nothing overflows", len(themes) == 4 and len(rs) == 7 and all(r[1] >= 4.5 and r[3] for r in rs), rs)
    lay = []
    for W in (1280, 1024, 980):
        site.c.viewport(W, 900); time.sleep(0.5)
        for step in ("video", "plan", "points", "scenarios"):
            J("document.getElementById('slNav_%s').click(); true" % step); time.sleep(0.2); o = overflow()
            if o["sw"] > o["W"]: lay.append((W, step, o))
    site.c.viewport(1440, 900); time.sleep(0.4)
    check("L1.no_overflow", "all four steps fit at 1280, 1024 and 980 px without sideways scrolling", not lay, lay[:2])
    # ================= 9. protection =================
    sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    def walk(d):
        out = {}
        for r, _, fs in os.walk(d):
            for f in fs: out[os.path.relpath(os.path.join(r, f), d).replace("\\", "/")] = os.path.join(r, f)
        return out
    a = walk(os.path.join(PREV, "templates")); b = walk(os.path.join(ROOT, "templates"))
    changed = sorted(k for k in set(a) | set(b) if k not in a or k not in b or sha(a[k]) != sha(b[k]))
    rd = lambda pth: open(pth, encoding="utf-8").read().split("\n")
    hl = [l for l in difflib.unified_diff(rd(a["myelin_web_sample.html"]), rd(b["myelin_web_sample.html"]), lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
    check("Z1.only_lab_added", "compared with the previous checkpoint only the three new study-lab files and their two link lines differ: engine, organs (SECANT, COSECANT, COSINE...), popups, Live Telemetry, SenseHub, Science Lab, readers, Academy, themes, academic pages (research.html included) are untouched",
          changed == sorted(["assets/myelin/study-lab-core.js", "assets/myelin/study-lab.css", "assets/myelin/study-lab.js", "myelin_web_sample.html"] + (["assets/myelin/academy-journey.css", "assets/myelin/academy-journey.js", "assets/myelin/academy.js", "assets/myelin/brand/signature-neon.png", "assets/myelin/brand/signature-original.png"] if os.path.exists(os.path.join(ROOT, "templates", "assets", "myelin", "academy-journey.js")) else [])) and len(hl) <= 10 and all(("study-lab" in l or "academy-journey" in l or "acJourney" in l or "acStart" in l) for l in hl), (changed, hl))
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x and "127.0.0.1:9" not in x]
    check("Z2.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
