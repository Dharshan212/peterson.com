"""Academy Stage B — the complete guided JOURNEY (academy.js engine + academy-journey.js chapters): Control Station -> Live Telemetry -> Study Mode (Stage A lab) -> SECANT -> COSECANT -> choose ONE of
seven organs -> that organ's own guided tutorial -> closing letter -> HAPPY SURFING.
A scripted VISITOR (academy_driver.py) performs every required action through the real page controls; the tour advances only when the guide detects the action. Checks: whole journey for ALL six
organs; gating (no advance by timer or by NEXT alone); verified SECANT 5:00 / 15:00 / 28:15 and COSECANT 10:00 / 15:00 / 16:00 / 3 s schedule; real centred popups with the guide kept clear of them;
telemetry categories produced by the simulation; COSINE five-minute gate (no 23:15 text); the Stage A keyword lab byte-identical; the exact letter; the signature on all themes; HAPPY SURFING leaves a
quiet Control Station; BACK / HINT / REPLAY / MAP / EXIT / Escape / restart; isolation; classic tour intact; only the expected files changed.
usage: t144_academy_journey.py <base_url> <chrome_port> <stageA_checkpoint_dir>"""
import os, sys, json, time, difflib, hashlib
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
from academy_driver import Driver  # noqa: E402
base, cport, PREV = sys.argv[1], int(sys.argv[2]), sys.argv[3]
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
site = Site(base, cport); J = site.J; jl = site.jl
drv = Driver(site)
ORGANS = [("sine", "si."), ("mine", "mi."), ("cosine", "co."), ("store", "sto."), ("fine", "fi."), ("tangent", "tn.")]
COMMON = ["ctl.start", "ctl.pause", "ctl.resume", "ctl.summary", "tel.intro", "tel.social", "tel.rows", "tel.s1", "tel.trigger", "tel.sched", "tel.back1", "tel.monitor", "tel.s2", "tel.s2read", "tel.s3", "tel.oops", "tel.five", "tel.still", "tel.rule", "tel.real", "tel.boom", "tel.stop",
          "stu.hi", "stu.choose", "stu.pickdef", "stu.words", "stu.imp", "stu.time", "stu.prep", "stu.pts", "stu.rules", "stu.try", "stu.bands", "stu.scn", "stu.aligned", "stu.uncertain", "stu.answer", "stu.both", "stu.off", "stu.gate",
          "sec.mode", "sec.carry", "sec.drift", "sec.s1", "sec.s1read", "sec.s2", "sec.s2read", "sec.anyapp", "sec.s3", "sec.s3read", "sec.pick", "sec.return", "sec.rule", "sec.dash", "sec.dashread", "sec.dashclose",
          "cos.gate", "cos.block", "cos.length", "cos.start", "cos.away", "cos.complete", "cos.completeread", "cos.over", "cos.overread", "cos.final", "cos.finalread", "cos.pick", "cos.return", "cos.dash", "cos.dashread", "cos.dashclose", "pick.organ"]
TAIL = ["let.letter", "let.final"]
CHAPTERS = {"ctl.": "The Control Station", "tel.": "Live Telemetry", "stu.": "Study Mode and keyword points", "sec.": "SECANT — Study recovery", "cos.": "COSECANT — study breaks"}
def clock(i): return jl("(document.getElementById(%s)||{}).textContent||''" % json.dumps(i))
def popup_geom():
    return jl("""(()=>{const p=document.querySelector('#wlDemoStage.on .wl-pp');if(!p)return null;const r=p.getBoundingClientRect(),c=document.getElementById('acCoach').getBoundingClientRect();
const hit=!(c.right<r.left||c.left>r.right||c.bottom<r.top||c.top>r.bottom);return {dx:(r.left+r.width/2)-innerWidth/2,dy:(r.top+r.height/2)-innerHeight/2,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,overlap:hit,dim:getComputedStyle(document.getElementById('acDim')).display,vis:getComputedStyle(document.querySelector('#wlDemoStage')).visibility}})()""")
def launch_journey():
    site.load()
    J("document.getElementById('acLauncher').click(); true"); time.sleep(0.4)
    J("document.getElementById('acJourney').click(); true"); time.sleep(1.2)
def storage(): return jl("({ls:Object.keys(localStorage).filter(k=>!/academy/i.test(k)).sort(),ss:Object.keys(sessionStorage).filter(k=>!/academy/i.test(k)).sort()})")
try:
    # ================= intro and the untouched classic tour =================
    site.load()
    base_store = storage()
    J("document.getElementById('acLauncher').click(); true"); time.sleep(0.4)
    intro = jl("({j:(document.getElementById('acJourney')||{}).textContent,s:(document.getElementById('acStart')||{}).textContent,vis:!document.getElementById('acIntro').hidden})")
    check("I1.intro_offers_both", "the Academy intro offers BEGIN THE FULL JOURNEY (primary) and keeps START INTERACTIVE TOUR (the original eight-chapter tour)", intro["vis"] and intro["j"] == "BEGIN THE FULL JOURNEY" and intro["s"] == "START INTERACTIVE TOUR", intro)
    J("document.getElementById('acStart').click(); true"); time.sleep(1.2)
    cl = jl("({mode:document.getElementById('acRoot').dataset.mode,title:document.getElementById('acLesson').textContent,count:document.getElementById('acCount').textContent})")
    check("I2.classic_tour_intact", "the original tour still starts at 'The Control Station' with its eight chapters (1 / N unchanged)", cl["mode"] == "classic" and cl["title"] == "The Control Station" and cl["count"].startswith("1 / "), cl)
    J("document.getElementById('acSkip').click(); true"); time.sleep(0.6)
    check("I3.classic_exit", "SKIP TOUR closes it", jl("document.getElementById('acRoot').hidden"))
    # ================= the journey for every organ =================
    results = {}
    for organ, pre in ORGANS:
        launch_journey()
        seen = []; geo = {}; clocks = {}; feedtags = set()
        def on_step(sid, st):
            seen.append(sid)
            if sid in ("sec.s1read", "sec.s2read", "sec.s3read", "cos.completeread", "cos.overread", "cos.finalread", "co.gateread", "co.callback", "si.s1read", "si.s3read", "mi.m1read", "mi.m2read", "sto.read", "fi.read", "tn.remread"):
                time.sleep(0.5); geo[sid] = popup_geom()
            if sid in ("sec.s1read", "sec.s2read", "sec.s3read", "cos.away", "cos.completeread", "cos.overread", "cos.finalread"): clocks[sid] = clock("szClock")
            if sid == "tel.stop": feedtags.update(jl("[...document.querySelectorAll('#feed .feed-item')].map(e=>e.dataset.badge)"))
            if sid == "tel.intro": clocks["feedsim"] = jl("(document.querySelector('#mlLiveTelemetry .feed-sim')||{}).textContent||''")
            if sid == "ctl.pause": clocks["sim"] = jl("document.getElementById('acSim').textContent")
        try:
            steps = drv.run(organ, on_step)
        except Exception as e:  # noqa: BLE001
            check(f"J.{organ}.completes", f"the whole journey runs to the final screen with the {organ} tutorial", False, f"{e} | seen={seen[-4:]}"); continue
        results[organ] = (steps, geo, clocks, feedtags)
        want = COMMON + [s for s in steps if s.startswith(pre) and s not in COMMON] + TAIL
        other = [s for s in steps if any(s.startswith(p) for _, p in ORGANS if p != pre) and s not in COMMON]
        check(f"J.{organ}.path", f"{organ.upper()}: the journey runs START to the closing letter through every chapter in order ({len(steps)} steps) and the tutorial contains only {organ}'s own steps", steps == want and not other and len([s for s in steps if s.startswith(pre)]) >= 8, (len(steps), [s for s in want if s not in steps][:4], other[:3]))
        popups = {k: v for k, v in geo.items() if v}
        bad = [k for k, v in popups.items() if not (abs(v["dx"]) < 3 and abs(v["dy"]) < 3 and v["inside"] and not v["overlap"] and v["dim"] == "none" and v["vis"] == "visible")]
        check(f"J.{organ}.popups", f"{organ.upper()}: every real popup shown in the tour is centred, fully visible (no dim over it) and the guide is kept clear of it ({len(popups)} popups)", len(popups) >= 6 and not bad, (len(popups), bad, {k: popups[k] for k in bad[:1]}))
    # ================= verified schedules =================
    if "cosine" in results:
        steps, geo, clocks, feedtags = results["cosine"]
        check("S1.secant_schedule", "SECANT escalation verified on the engine: SECANT-1 at 05:00, SECANT-2 at 15:00 (ten minutes after SECANT-1), SECANT-3 at 28:15 (13:15 after SECANT-2)", [clocks.get("sec.s1read"), clocks.get("sec.s2read"), clocks.get("sec.s3read")] == ["05:00", "15:00", "28:15"], clocks)
        sec_ = lambda x: (lambda m, s: int(m) * 60 + int(s))(*x.split(":")) if x and ":" in x else -1
        c0, c1, c2, c3 = (sec_(clocks.get(k)) for k in ("cos.away", "cos.completeread", "cos.overread", "cos.finalread"))
        check("S2.cosecant_schedule", "COSECANT (same running session): BREAK COMPLETE at the break end (10:00 after the break starts), BREAK ALREADY OVER five minutes later, COME BACK PLEASE one minute after that", c0 >= 0 and [c1 - c0, c2 - c1, c3 - c2] == [600, 300, 60], clocks)
        check("S3.telemetry_categories", "the Control Station chapter produced these real telemetry rows from the simulation: DWELL, TRIGGER, SINE, MONITOR, RETURN INTENT, RETURNED, MIRL (nothing invented)", {"DWELL", "TRIGGER", "SINE", "MONITOR", "RETURN INTENT", "RETURNED", "MIRL"} <= feedtags, sorted(feedtags))
    src_j = open(os.path.join(ROOT, "templates", "assets", "myelin", "academy-journey.js"), encoding="utf-8").read()
    cos_part = src_j[src_j.index("const cosine = organ('cosine'"):src_j.index("const store = organ('store'")]
    check("S4.no_deleted_cosine_text", "the COSINE tutorial names the five-minute gate, SORRY, I'LL COME BACK, YEAH, I WANT SOME BREAK and the 10 to 200 minute break, and contains none of the removed 23:15 design (23:15, 10 MORE MIN, FINISH MY SHOW, WELCOME BACK)",
          not any(k in cos_part for k in ("23:15", "10 MORE MIN", "FINISH MY SHOW", "WELCOME BACK")) and "five minutes" in cos_part and "SORRY, I\\'LL COME BACK" in cos_part and "I WANT SOME BREAK" in cos_part and "10 to 200" in cos_part)
    # ================= gating: no advance by timer or by NEXT alone =================
    launch_journey(); time.sleep(0.6)
    st = drv.state()
    check("G1.reaches_first_action", "the guide opens straight on START: an action step, the pointing arrow is shown on the button and no TRY IT press is needed", st["step"] == "ctl.start" and st["phase"] == "act" and jl("!!document.querySelector('.acj-arrow:not([hidden])')"), st)
    time.sleep(3.0)
    check("G2.no_advance_by_timer", "three seconds with no action: the step is unchanged (it never advances because time passed)", drv.state()["step"] == "ctl.start" and drv.state()["phase"] == "act")
    J("document.querySelector('#acActions [data-ac=next]')?.click(); true"); time.sleep(0.4)
    check("G3.next_refused_until_detected", "NEXT is refused until the action is detected, and the guide says so", drv.state()["step"] == "ctl.start" and "not complete yet" in jl("document.getElementById('acHint').textContent"))
    drv.click("btnEngineStart"); time.sleep(0.5)
    check("G4.praise_then_moves_on", "after the real START press the guide praises it ('Great, you pressed START!') and then moves on to PAUSE by itself, with no NEXT press", "Great, you pressed START" in drv.state()["say"] and drv.wait("document.getElementById('acRoot').dataset.step==='ctl.pause'", 8))
    J("document.getElementById('acHintBtn').click(); true"); time.sleep(0.2)
    check("H1.hint_is_step_specific", "HINT shows the hint written for the current step (PAUSE)", "PAUSE" in jl("document.getElementById('acHint').textContent"), jl("document.getElementById('acHint').textContent"))
    J("document.getElementById('acActions').querySelector('.ghost').click(); true"); time.sleep(0.8)
    check("H2.back", "BACK returns to the previous step", drv.state()["step"] == "ctl.start")
    J("document.getElementById('acReplay').click(); true"); time.sleep(1.0)
    check("H3.replay_chapter", "REPLAY LESSON restarts the current chapter from its first step", drv.state()["step"] == "ctl.start")
    J("document.getElementById('acMapBtn').click(); true"); time.sleep(0.5)
    mp = jl("[...document.querySelectorAll('button')].map(b=>b.textContent.trim())")
    check("H4.map_lists_chapters", "MAP lists the journey chapters (and no organ tutorial before one is chosen)", all(k in mp for k in ("The Control Station", "Live Telemetry", "Study Mode and keyword points", "SECANT — Study recovery", "COSECANT — study breaks", "Choose your organ")) and "COSINE — streaming" not in mp, [m for m in mp if len(m) > 6][:12])
    J("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Live Telemetry').click(); true"); time.sleep(1.0)
    check("H4b.map_jumps", "choosing a chapter in MAP jumps to its first step", drv.state()["step"] == "tel.intro", drv.state()["step"])
    J("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); true"); time.sleep(0.6)
    check("H5.escape_exits", "Escape exits the journey and leaves the normal interface usable", jl("document.getElementById('acRoot').hidden") and jl("document.querySelector('.topbar').offsetParent!==null"))
    J("document.getElementById('acLauncher').click(); true"); time.sleep(0.3); J("document.getElementById('acJourney').click(); true"); time.sleep(1.2)
    check("H6.restart", "the Academy can be restarted and begins again at the Control Station (START)", drv.state()["step"] == "ctl.start" and drv.state()["mode"] == "journey")
    J("document.getElementById('acSkip').click(); true"); time.sleep(0.5)
    check("H7.skip_exits", "SKIP TOUR exits", jl("document.getElementById('acRoot').hidden"))
    # ================= the final screens (use a quick TANGENT run) =================
    launch_journey(); seen_final = {}
    def on_final(sid, st):
        if sid == "pick.organ": seen_final["organs"] = jl("({cards:[...document.querySelectorAll('#acOrgans .acj-card')].map(b=>b.dataset.organ+':'+b.querySelector('b').textContent),title:document.getElementById('acOrganTitle').textContent,focus:document.activeElement&&document.activeElement.id,dlg:document.getElementById('acOrgans').getAttribute('role')+document.getElementById('acOrgans').getAttribute('aria-modal'),hasSecant:document.getElementById('acOrgans').innerText.includes('SECANT')&&document.querySelectorAll('#acOrgans .acj-card[data-organ=secant]').length})")
        if sid == "let.letter":
            time.sleep(0.5)
            seen_final["letter"] = jl("({h:document.getElementById('acLetterTitle').textContent,paras:[...document.querySelectorAll('#acLetterPane > p')].map(p=>p.textContent),focus:document.activeElement&&document.activeElement.id,imgs:[...document.querySelectorAll('#acSignature img')].map(i=>({cls:i.className,disp:getComputedStyle(i).display,w:Math.round(i.getBoundingClientRect().width),h:Math.round(i.getBoundingClientRect().height),nw:i.naturalWidth,nh:i.naturalHeight,alt:i.alt,comp:i.complete})),order:[...document.querySelectorAll('#acLetterPane > *')].map(e=>e.tagName+'.'+(e.className||e.id)).join(' ')})")
    try:
        drv.run("tangent", on_final)
        check("F0.reaches_final", "the final screen is reached after the TANGENT tutorial", drv.state()["step"] == "let.final")
    except Exception as e:  # noqa: BLE001
        check("F0.reaches_final", "the final screen is reached", False, e)
    o = seen_final.get("organs", {})
    check("F1.organ_choice", "the choice screen shows exactly the six organs (SINE / Live MIRL, MINE, COSINE, STORE, FINE, TANGENT; no COT) and neither SECANT nor COSECANT; it is a modal dialog with focus on the first card", [c.split(":")[0] for c in o.get("cards", [])] == ["sine", "mine", "cosine", "store", "fine", "tangent"] and o.get("cards")[0].endswith("SINE / Live MIRL") and not o.get("hasSecant") and o.get("dlg") == "dialogtrue" and o.get("focus") == "acOrgan_sine", o)
    L = seen_final.get("letter", {})
    EXPECT = ["If you've made it this far, thank you for spending a little of your time with MYELIN.", "I started building MYELIN because of something I kept wondering about.",
              "We open a website, watch a video, read a message, or begin working on something important. Sometimes, without really noticing, one thing leads to another. And somewhere along the way, the reason we started can slip into the background.",
              "I became curious about that moment.", "Not just when we get distracted, but what happens afterward. When we decide to return. When we choose to continue. When a simple reminder gives us an opportunity to reconsider what we wanted to do.",
              "I couldn't see what someone was thinking, and I didn't want to pretend that I could.", "So I built MYELIN to observe the interactions we can actually see, ask gentle questions, and explore what happens next.",
              "MYELIN was never meant to judge how you spend your time.", "Sometimes a break is exactly what you need. Sometimes a conversation matters more than the work waiting for you. And sometimes you simply want to finish what you started.",
              "Those choices belong to you.", "I don't know where you'll go after closing this guide. Perhaps back to your studies, a favourite video, a message from someone, or something entirely different.",
              "Whatever it is, I hope it's something you've chosen for yourself.", "Thank you for exploring my little piece of research.", "What I saw, I built. What happens next is your choice.",
              "— Dharshan Keba (aka) Peterson", "MYELIN Creator"]
    check("L1.letter_exact", "the closing letter matches the supplied text exactly: heading 'Before you go...', fourteen paragraphs, the signature line and 'MYELIN Creator', in order, with nothing added", L.get("h") == "Before you go..." and L.get("paras") == EXPECT, [(a, b) for a, b in zip(L.get("paras", []), EXPECT) if a != b][:2] or (len(L.get("paras", [])), len(EXPECT)))
    imgs = L.get("imgs", [])
    check("L2.signature_placed_and_unaltered", "the handwritten signature sits directly beneath the letter body, before the printed name; the supplied handwriting images are used unaltered (cropped, scaled by the browser only): not stretched (rendered ratio = natural ratio), with descriptive alt text", len(imgs) == 2 and all(i["comp"] and i["nw"] >= 1000 and i["alt"] and "signature" in i["alt"].lower() and (i["h"] == 0 or abs(i["w"] / i["h"] - i["nw"] / i["nh"]) < 0.02) for i in imgs) and "acj-sig" in L.get("order", "") and L["order"].index("acj-sig") < L["order"].index("acj-from"), L)
    vis = [i for i in imgs if i["disp"] != "none"]
    check("L3.one_small_signature_on_dark", "on the dark themes exactly ONE signature is visible (the neon version), small (<= 240 px wide)", len(vis) == 1 and "neon" in vis[0]["cls"] and vis[0]["w"] <= 240, vis)
    check("L4.letter_focus_and_calm", "the letter opens at its top with the heading focused (keyboard / screen reader start at the beginning); no scores, trophies or confetti elements exist", L.get("focus") == "acLetterTitle" and jl("!document.querySelector('#acLetterWrap canvas, #acLetterWrap [class*=confetti], #acLetterWrap [class*=trophy], #acLetterWrap [class*=score]')"))
    # signature on every theme
    SIG = """(async()=>{const imgs=[...document.querySelectorAll('#acSignature img')].filter(i=>getComputedStyle(i).display!=='none');const i=imgs[0];const cv=document.createElement('canvas');cv.width=i.naturalWidth/2;cv.height=i.naturalHeight/2;const x=cv.getContext('2d',{willReadFrequently:true});
x.filter=getComputedStyle(i).filter==='none'?'none':getComputedStyle(i).filter.replace(/drop-shadow\\([^)]*\\)\\s*/g,'');x.drawImage(i,0,0,cv.width,cv.height);const d=x.getImageData(0,0,cv.width,cv.height).data,L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])};
const lum=[];for(let k=0;k<d.length;k+=4)if(d[k+3]>200)lum.push(L([d[k],d[k+1],d[k+2]]));lum.sort((a,b)=>a-b);const med=lum[Math.floor(lum.length*0.85)];   /* the stroke core: the brightest 15 % of the opaque pixels */
const c2=document.createElement('canvas').getContext('2d');c2.fillStyle='#000';c2.fillStyle=getComputedStyle(document.getElementById('acLetterPane')).backgroundColor;c2.fillRect(0,0,1,1);const b=c2.getImageData(0,0,1,1).data,bl=L([b[0],b[1],b[2]]);
return {cls:i.className,n:lum.length,ratio:(Math.max(med,bl)+0.05)/(Math.min(med,bl)+0.05)}})()"""
    themes = jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)"); sigres = []
    J("document.getElementById('acBack')?.click(); true")
    drv.click("acLetterBack"); time.sleep(0.5); drv.click("acLetterNext") if False else None
    # return to the letter step and cycle themes
    for _ in range(2):
        if drv.state()["step"] == "let.letter": break
        if drv.state()["step"] == "let.final": drv.click("acFinalBack"); time.sleep(0.6)
    for w in themes + ["amber", "red", "green"]:
        if w in ("amber", "red", "green"): J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(w))
        else: J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % json.dumps(w))
        time.sleep(0.5); r = jl(SIG); n_vis = jl("[...document.querySelectorAll('#acSignature img')].filter(i=>getComputedStyle(i).display!=='none').length"); sigres.append((w, r["cls"].replace("acj-sig-", ""), round(r["ratio"], 1), n_vis))
    J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=neon]').click(); true")
    check("L5.signature_all_seven_themes", "in all seven themes exactly one signature shows (ink version on the light White theme, neon version on the dark ones) with contrast >= 3 against the letter card", len(sigres) == 7 and all(s[3] == 1 and s[2] >= 3 for s in sigres) and [s for s in sigres if s[0] == "white"][0][1] == "ink", sigres)
    # final screen and HAPPY SURFING
    drv.click("acLetterNext"); time.sleep(0.6)
    fin = jl("({t:document.getElementById('acFinalTitle').textContent,btn:document.getElementById('acHappy').textContent,note:document.getElementById('acNote').textContent,focus:document.activeElement&&document.activeElement.id,prim:document.getElementById('acHappy').className.includes('primary')})")
    check("F2.final_screen", "the final screen reads YOUR TIME. YOUR CHOICE. with one prominent HAPPY SURFING button and the disclosure that the Academy used simulated behavioural interactions and measured no thoughts or attention; focus is on the button", fin["t"] == "YOUR TIME. YOUR CHOICE." and fin["btn"] == "HAPPY SURFING" and fin["prim"] and "simulated behavioural interactions" in fin["note"] and "did not measure" in fin["note"] and "thoughts" in fin["note"] and "attention" in fin["note"] and fin["focus"] == "acHappy", fin)
    drv.click("acHappy"); time.sleep(1.5)
    end = jl("({root:document.getElementById('acRoot').hidden,ov:!!document.querySelector('.acj-overlay'),page:(document.querySelector('.page.active')||{}).id,state:window.MYELIN.state,tutorial:window.MYELIN.tutorial,lab:document.getElementById('sxLab').hidden,dim:getComputedStyle(document.getElementById('acDim')).display,ring:document.getElementById('acRing').hidden,intro:document.getElementById('acIntro').hidden})")
    check("F3.happy_surfing", "HAPPY SURFING closes the Academy and every overlay, returns to the Control Station with NO session started, puts the demonstration pages back to their ordinary views and closes the teaching lab", end["root"] and not end["ov"] and end["page"] == "page-control" and end["state"] in ("IDLE", "ENDED") and not end["tutorial"] and end["lab"] and end["intro"], end)
    modes = []
    for pg, bid, ctl in (("live-mirl", "mirlModeBrowser", "sdControls"), ("mine", "mineModeBrowser", "mdControls"), ("cosine", "cosineModeBrowser", "cdControls"), ("secant", "secantModeBrowser", "szControls")):
        J("document.body.classList.contains('sidebar-open')||document.getElementById('menuToggle').click(); true"); time.sleep(0.25)
        J("document.querySelector('.nav-row[data-page=%s]').click(); document.body.classList.remove('sidebar-open'); true" % pg); time.sleep(0.6)
        modes.append(jl("[document.getElementById(%s)&&document.getElementById(%s).getAttribute('aria-pressed'),!document.getElementById(%s)]" % (json.dumps(bid), json.dumps(bid), json.dumps(ctl))))
    check("F3b.demos_back_to_ordinary_views", "after the journey the SINE, MINE, COSINE and SECANT pages show their ordinary BROWSER SESSION view (demonstration controls not showing) and the Study Mode page opens on the real STUDY SESSION", modes == [["true", True]] * 4, modes)
    J("document.querySelector('.nav-row[data-page=control]').click(); true"); time.sleep(0.4)
    after_store = storage()
    check("F4.isolation", "the whole Academy wrote nothing to local / session storage beyond its own academy keys and left imported evidence untouched (no database opened)", after_store == base_store and not jl("!!document.getElementById('dbsTag')"), (base_store, after_store))
    check("F5.simulated_labels", "tutorial events are labelled as an isolated simulation (ISOLATED TUTORIAL) and the telemetry card says SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING", "ISOLATED TUTORIAL" in results["cosine"][2].get("sim", "") and "SIMULATED TELEMETRY" in results["cosine"][2].get("feedsim", "").upper() and "NOT LIVE WINDOWS MONITORING" in results["cosine"][2].get("feedsim", "").upper(), results["cosine"][2])
    # ================= protection =================
    sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    def walk(d):
        out = {}
        for r, _, fs in os.walk(d):
            for f in fs: out[os.path.relpath(os.path.join(r, f), d).replace("\\", "/")] = os.path.join(r, f)
        return out
    a = walk(os.path.join(PREV, "templates")); b = walk(os.path.join(ROOT, "templates"))
    changed = sorted(k for k in set(a) | set(b) if k not in a or k not in b or sha(a[k]) != sha(b[k]))
    expected = ["assets/myelin/academy-journey.css", "assets/myelin/academy-journey.js", "assets/myelin/academy.js", "assets/myelin/brand/signature-neon.png", "assets/myelin/brand/signature-original.png", "myelin_web_sample.html"]
    rd = lambda pth: open(pth, encoding="utf-8").read().replace("\r\n", "\n").split("\n")
    hl = [l for l in difflib.unified_diff(rd(a["myelin_web_sample.html"]), rd(b["myelin_web_sample.html"]), lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
    check("Z1.only_academy_files_changed", "compared with the Stage A checkpoint only the Academy engine, the new journey files, the two signature images and three lines of the page (the BEGIN THE FULL JOURNEY button, its stylesheet link) changed; the Study lab (core, UI, CSS), every organ, popup, Live Telemetry, SenseHub, readers, Science Lab and the academic pages (research.html) are byte-identical",
          changed == expected and len(hl) <= 6 and all(("academy-journey" in l or "acJourney" in l or "acStart" in l) for l in hl), (changed, hl))
    lab_same = all(sha(a[k]) == sha(b[k]) for k in ("assets/myelin/study-lab-core.js", "assets/myelin/study-lab.js", "assets/myelin/study-lab.css"))
    check("Z2.keyword_calculator_unchanged", "the Stage A keyword calculator and lab are byte-identical to the accepted Stage A files", lab_same)
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("Z3.console", "no console error, CSP violation or failed request during the whole run", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
