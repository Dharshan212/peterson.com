"""Phase 2 — Live Telemetry correction. The Control Station's Live Telemetry (and Handover Telemetry) now has the structure of the desktop Control Station feed
(CONTROL_STATION/application.py FeedList + FeedTag, CORE_ENGINE/monitor.py row vocabulary, UI_THEMES/theme.py colours): newest-first one-line rows of dot / time / message / tag, an "N events" count, at most 80 rows,
populated ONLY from the simulated runtime's recorded events, labelled SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING. Organs the desktop does not publish to the feed add no rows; what the simulation does not measure reads Not tracked.
usage: t138_live_telemetry.py <base_url> <chrome_port> <db for the imported-file check> <working_copy_dir> <backup_dir>"""
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
txt = lambda i: site.jl("(document.getElementById(%s)||{}).textContent||null" % json.dumps(i))
SIM = "SIMULATED TELEMETRY \u2014 NOT LIVE WINDOWS MONITORING"
ROWS = """(()=>[...document.querySelectorAll('#feed > .feed-item')].map(r=>({t:r.querySelector('.t').textContent,text:r.querySelector('.msg').textContent,tag:(r.querySelector('.tag')||{}).textContent||'',tone:r.dataset.tone,badge:r.dataset.badge})))()"""
HROWS = ROWS.replace("#feed >", "#csHoFeed >")
rows = lambda: site.jl(ROWS)
hrows = lambda: site.jl(HROWS)
def surf(k): J("document.querySelector('[data-surface=\"%s\"]').click(); true" % k); time.sleep(0.45)
def adv(sec, wait=0.9): J("__rt.advance(%s); true" % sec); time.sleep(wait)
def cmd(o, a, v=None): return J("(()=>__rt.command(%s,%s,%s))()" % (json.dumps(o), json.dumps(a), json.dumps(v)))
def tags(): return [r["tag"] for r in rows()]
def popbtn(label): return site.jl("(()=>{const b=[...document.querySelectorAll('#wlPopup button')].find(b=>b.textContent.trim()===%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(label))
try:
    site.load()
    check("A1.cards_and_labels", "Live Telemetry and Handover Telemetry cards exist, 'Awaiting events' / 'Awaiting telemetry' before any session, and BOTH carry the label SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING",
          txt("feedSim") == SIM and txt("hoSim") == SIM and txt("feedCount") == "Awaiting events" and txt("csHoHint") == "Awaiting telemetry" and site.jl("document.querySelector('.feed-card h2').textContent") == "Live Telemetry" and site.jl("document.querySelector('#csHoHint').closest('.card').querySelector('h2').textContent") == "Handover Telemetry", (txt("feedSim"), txt("feedCount")))
    check("A2.empty_before_session", "before a session both feeds are empty and the handover card reads the desktop placeholders", rows() == [] and hrows() == [] and txt("csHoTerritory") == "\u2014" and txt("csHoRel") == "\u2014 \u2192 \u2014" and txt("csHoState") == "\u2014")
    J("import('/assets/myelin/runtime.js').then(m=>{const o=m.Runtime.prototype.advance;m.Runtime.prototype.advance=function(...a){window.__rt=this;return o.apply(this,a);};return true;})"); time.sleep(0.6)
    site.jl("(()=>{document.getElementById('btnEngineStart').click();return true})()"); time.sleep(1.2)
    site.jl("(()=>{const b=[...document.querySelectorAll('button')].find(b=>/^START$/i.test(b.textContent.trim())&&b.closest('[role=dialog],.glass-overlay,.wl-modal'));if(b)b.click();return true})()"); time.sleep(0.8)
    check("A3.no_invented_session_row", "starting a session adds no row by itself (the desktop prints session facts to the console only); the first row is the foreground observation", site.jl("window.__rt&&window.__rt.state") in ("ACTIVE", None) and txt("feedCount") in ("Awaiting events", "1 events"), txt("feedCount"))
    adv(1.0); r0 = rows()
    check("A4.first_activity_row", "the first row is the simulated foreground evidence in force: 'TASK / WORK — task:work', tag FOCUS, tone cyan, count '1 events'", len(r0) == 1 and r0[0]["text"] == "TASK / WORK \u2014 task:work" and r0[0]["tag"] == "FOCUS" and r0[0]["tone"] == "cyan" and txt("feedCount") == "1 events" and re.fullmatch(r"\d\d:\d\d:\d\d", r0[0]["t"]), r0)
    surf("task"); r1 = rows()
    check("A5.no_duplicate_activity", "re-selecting the same surface adds no row (the desktop adds an activity row only when the foreground identity changes)", len(r1) == 1, r1)
    surf("social"); adv(0.5); r = rows()
    check("A6.social_and_dwell", "a social surface adds SOCIAL (amber) and then DWELL (violet) 'SOCIAL FEED — person is dwelling'; newest first", [x["tag"] for x in r][:3] == ["DWELL", "SOCIAL", "FOCUS"] and r[0]["tone"] == "violet" and r[1]["tone"] == "amber" and r[0]["text"] == "SOCIAL FEED \u2014 person is dwelling", r)
    adv(300.0, 1.2); r = rows(); tg = [x["tag"] for x in r]
    check("A7.sine_admission_and_schedule", "at 5:00 the SINE admission appears (TRIGGER, red) and the next stage is scheduled (SINE, amber, 'SINE 2 — stage scheduled for 10:00')", "TRIGGER" in tg and "SINE" in tg and any(x["text"] == "SINE 2 \u2014 stage scheduled for 10:00" and x["tone"] == "amber" for x in r) and any(x["text"] == "SINE admission accepted \u2014 display pending" and x["tone"] == "red" for x in r), tg)
    ok_btn = popbtn("I'M BACK"); time.sleep(0.6); r = rows()
    check("A8.user_pressed_monitor_row", "pressing I'M BACK on the Control Station popup adds MONITOR (cyan) 'USER PRESSED — I'M BACK'", ok_btn and r[0]["text"] == "USER PRESSED \u2014 I'M BACK" and r[0]["tag"] == "MONITOR" and r[0]["tone"] == "cyan", r[:2])
    surf("task"); adv(5.0); adv(5.0); adv(60.0, 1.2); r = rows(); txts = [x["text"] for x in r]
    check("A9.return_rows", "work-task evidence then adds RETURN UNVERIFIED (RETURN INTENT, amber), USER RETURNED (RETURNED, green), RETURN CONFIRMED — CLOSURE INITIATED FOR 01:00 (MIRL, cyan) and EPISODE CLOSED — RETURNED (MIRL, green), in that order",
          all(any(x["text"] == s for x in r) for s in ("RETURN UNVERIFIED \u2014 verification started", "USER RETURNED \u2014 WELCOME BACK TO FOCUS", "RETURN CONFIRMED \u2014 CLOSURE INITIATED FOR 01:00", "EPISODE CLOSED \u2014 RETURNED"))
          and txts.index("EPISODE CLOSED \u2014 RETURNED") < txts.index("RETURN CONFIRMED \u2014 CLOSURE INITIATED FOR 01:00") < txts.index("USER RETURNED \u2014 WELCOME BACK TO FOCUS") < txts.index("RETURN UNVERIFIED \u2014 verification started"), txts)
    surf("streamA"); adv(0.5); surf("chatA"); adv(0.5); r = rows()
    check("A10.ott_and_messaging", "Netflix adds OTT (cyan), WhatsApp adds MESSAGING (cyan): 'NETFLIX — stream:netflix', 'WHATSAPP — message:whatsapp'", r[1]["text"] == "NETFLIX \u2014 stream:netflix" and r[1]["tag"] == "OTT" and r[0]["text"] == "WHATSAPP \u2014 message:whatsapp" and r[0]["tag"] == "MESSAGING" and r[0]["tone"] == "cyan", r[:2])
    adv(300.0); adv(301.0, 1.2); r = rows(); tg = [x["tag"] for x in r]
    check("A11.mine_rows", "ten minutes of messaging adds the MINE transition row ('MINE — MINE1 ACTIVE · WhatsApp · POPUP VISIBLE', tag MINE, red)", any(x["text"] == "MINE \u2014 MINE1 ACTIVE \u00b7 WhatsApp \u00b7 POPUP VISIBLE" and x["tag"] == "MINE" and x["tone"] == "red" for x in r), [x["text"] for x in r if x["tag"] == "MINE"])
    surf("streamB"); surf("streamA"); adv(300.0, 1.2); r = rows()
    check("A12.cosine_rows", "OTT dwell adds COSINE transition rows (tag COSINE, cyan): 'COSINE — INTENT GATE PENDING · Netflix'", any(x["text"] == "COSINE \u2014 INTENT GATE PENDING \u00b7 Netflix" and x["tag"] == "COSINE" and x["tone"] == "cyan" for x in r), [x["text"] for x in r if x["tag"] == "COSINE"])
    # study: tags change with the study state exactly as the desktop's activity semantics do
    n_before = len(rows())
    cmd("STUDY", "prepare", {"studyMinutes": 60, "breakMinutes": 5, "subject": "S", "task": "T", "resourceId": "study:primary"}); cmd("STUDY", "start"); time.sleep(0.6)
    surf("social"); adv(0.5); surf("task"); adv(0.5); surf("study"); adv(0.5); r = rows(); h = hrows()
    check("A13.study_semantics", "while a Study block is active the same surfaces read SOCIAL (red), STUDY FOCUS (violet), STUDY (green) — and the handover feed shows STUDY OWNERSHIP ACTIVE (STUDY, green)",
          r[2]["tag"] == "SOCIAL" and r[2]["tone"] == "red" and r[1]["tag"] == "STUDY FOCUS" and r[1]["tone"] == "violet" and r[0]["tag"] == "STUDY" and r[0]["tone"] == "green" and len(h) == 1 and h[0]["text"] == "STUDY OWNERSHIP ACTIVE" and h[0]["tag"] == "STUDY" and h[0]["tone"] == "green", (r[:3], h))
    surf("chatA"); adv(0.5); surf("streamA"); adv(0.5); r = rows()
    check("A14.study_tones_ott_messaging", "during Study OTT is yellow and messaging orange (study tones): OTT / study-yellow, MESSAGING / study-orange", r[1]["tag"] == "MESSAGING" and r[1]["tone"] == "study-orange" and r[0]["tag"] == "OTT" and r[0]["tone"] == "study-yellow", r[:2])
    n1 = len(rows()); cmd("STUDY", "break"); adv(2.0); adv(305.0, 1.0); n2 = len(rows())
    check("A15.secant_cosecant_add_no_rows", "SECANT and COSECANT events (study break, BREAK COMPLETE) add no feed rows — the desktop does not publish them to Live Telemetry", n2 == n1, (n1, n2))
    # Handover card
    check("A16.handover_not_tracked", "Handover Telemetry: Monitor territory / Relationship / State read 'Not tracked' (the simulation has no Monitor handover), hint 'Simulated evidence', continuity empty, Study authority and Global pause come from the simulation", txt("csHoTerritory") == "Not tracked" and txt("csHoRel") == "Not tracked" and txt("csHoState") == "Not tracked" and txt("csHoHint") == "Simulated evidence" and txt("csHoTime") == "--:-- / --:--" and txt("csHoStudy") in ("PAUSED", "ACTIVE") and txt("csHoPause") == "OFF", (txt("csHoTerritory"), txt("csHoStudy"), txt("csHoPause")))
    J("__rt.pause(); true"); time.sleep(0.9)
    check("A17.global_pause_follows_session", "pausing the simulated session shows Global pause: PAUSED", txt("csHoPause") == "PAUSED", txt("csHoPause"))
    J("__rt.resume(); true"); time.sleep(0.6)
    # vocabulary / legality
    allowed = {"FOCUS", "SOCIAL", "OTT", "MESSAGING", "ACTIVITY", "STUDY", "STUDY FOCUS", "STUDY ACTIVITY", "DWELL", "TRIGGER", "SINE", "MONITOR", "RETURN GATE", "RETURN INTENT", "RETURNED", "MIRL", "COSINE", "MINE", "RETURN", "HANDOVER"}
    badtags = sorted({x["tag"] for x in rows()} - allowed)
    check("A18.only_desktop_vocabulary", "every tag in the feed is one the desktop's Core Engine publishes (no invented badge)", not badtags, badtags)
    bad_text = [x["text"] for x in rows() if re.search(r"(?i)detected|keystroke|cpu|temperature|heart|http|\.exe|chrome|window title", x["text"])]
    check("A19.no_invented_readings", "no row claims a detection, hardware reading, process or window title", not bad_text, bad_text)
    # visual structure and colours (computed style)
    sty = site.jl("""(()=>{const g=(sel,prop)=>{const e=document.querySelector(sel);return e?getComputedStyle(e)[prop]:null};
      return {dot:[g('#feed .feed-dot','width'),g('#feed .feed-dot','height'),g('#feed .feed-dot','borderRadius')],tagFs:g('#feed .tag','fontSize'),tagFw:g('#feed .tag','fontWeight'),tagUp:g('#feed .tag','textTransform'),
      time:g('#feed .t','fontFamily'),pad:g('#feed .feed-item','padding'),bb:g('#feed .feed-item','borderBottomWidth'),msg:g('#feed .msg','fontSize'),
      ott:g('#feed [data-badge=OTT][data-tone=cyan] .tag','color'),cos:g('#feed [data-badge=COSINE] .tag','color'),study:g('#feed [data-badge=STUDY] .tag','color'),mon:g('#feed [data-badge=MONITOR] .tag','color'),hand:g('#csHoFeed [data-badge=STUDY] .tag','color')}})()""")
    check("A20.desktop_metrics_and_colours", "row metrics follow the desktop FeedList (8 px round dot, 11 px mono time, 11 px message, 9 px 600-weight uppercase tag, 9 px 6 px padding, 1 px divider) and the badge colours are the desktop theme constants (OTT #3949AB, COSINE #14B8A6, STUDY #16A34A, MONITOR #2563EB)",
          sty["dot"][0] == "8px" and sty["dot"][1] == "8px" and sty["tagFs"] == "9px" and sty["tagFw"] == "600" and sty["tagUp"] == "uppercase" and "Consolas" in sty["time"] and sty["pad"] == "9px 6px" and sty["bb"] == "1px" and sty["msg"] == "11px"
          and sty["ott"] == "rgb(57, 73, 171)" and sty["cos"] == "rgb(20, 184, 166)" and sty["study"] == "rgb(22, 163, 74)" and sty["mon"] == "rgb(37, 99, 235)" and sty["hand"] == "rgb(22, 163, 74)", sty)
    # cap of 80 rows, count keeps counting like the desktop
    for _ in range(16):
        surf("social"); surf("streamA"); surf("chatA"); surf("task")
    time.sleep(0.8); n = len(rows()); cnt = txt("feedCount")
    check("A21.cap_80_count_total", "at most 80 rows are kept while the count keeps the total ('N events'), newest first", n == 80 and re.fullmatch(r"\d+ events", cnt) and int(cnt.split()[0]) > 80, (n, cnt))
    # seven themes
    J("__rt.end('ENDED'); true"); time.sleep(1.5); J("document.documentElement.removeAttribute('data-accent'); true"); time.sleep(0.3)   # a running stage accent overrides the world colours; end the simulated session first
    themes = site.jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)"); okt = []
    for w in themes:
        J("document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % w); time.sleep(0.5)
        v = site.jl("""(()=>{const t=document.querySelector('#feed [data-badge=FOCUS] .tag'),m=document.querySelector('#feed .msg'),b=document.querySelector('.feed-card');return {focus:t?getComputedStyle(t).color:null,msg:getComputedStyle(m).color,bg:getComputedStyle(b).backgroundColor,vis:document.querySelector('#feed').offsetHeight>0}})()""")
        okt.append((w, v["vis"] and v["msg"] != v["bg"] and (v["focus"] is None or v["focus"] != "rgb(255, 255, 255)" or w != "white"), v))
    for a in ("amber", "red", "green"):
        J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(a)); time.sleep(0.3)
        okt.append((a, site.jl("document.querySelector('#feed').offsetHeight>0")))
    J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=neon]').click(); true"); time.sleep(0.4)
    check("A22.seven_themes", "the feed is visible and legible in all seven themes (4 worlds + 3 accent palettes); the white world's FOCUS tag is not white-on-white", len(themes) == 4 and len(okt) == 7 and all(x[1] for x in okt), okt)
    # unaffected neighbours
    site.goto_page("store"); time.sleep(0.5)
    ok_store = site.jl("!!document.getElementById('stTrigger')")
    site.goto_page("control"); time.sleep(0.4)
    check("A23.popups_and_modules_unaffected", "the module pages and their centred-popup triggers are intact (STORE trigger present) and the page returns to the Control Station without error", ok_store and site.jl("!!document.getElementById('feed')"))
    # imported evidence: the feed only ever shows the browser simulation; opening a file does not put its records into it
    n_before = len(rows()); assert site.open_db(db); time.sleep(1.0); site.goto_page("control"); time.sleep(0.6)
    check("A24.imported_file_not_in_feed", "opening an imported database file adds nothing to Live Telemetry (imported evidence stays in the Database Explorer / readers)", len(rows()) == n_before, (n_before, len(rows())))
    site.remove_db(); time.sleep(0.5)
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("A25.console", "no console error, CSP violation or failed request", not probs, probs[:3])
    # protection
    sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    own = sorted(set(["templates/index.html", "templates/research.html", "views.py", "templates/anesthesia-control-research.html", "templates/bluepad32-thesis.html"] + [l.split()[-1] for l in open(os.path.join(BACKUP, "TRANSFER_LOG.txt"), encoding="utf-8") if l.startswith("KEPT")]))
    bad_own = [r_ for r_ in own if sha(os.path.join(ROOT, r_)) != sha(os.path.join(BACKUP, r_))]
    check("A26.owner_files_untouched", "the 14 owner-protected files are byte-identical to the backup (%d checked)" % len(own), not bad_own and len(own) == 14, (bad_own, len(own)))
    wk = os.path.join(WORK, "templates", "assets", "myelin"); mine_ = os.path.join(ROOT, "templates", "assets", "myelin")
    prot = ["runtime.js", "simulator.js", "events.js", "popups.js", "secant-station.js", "secant-import.js", "mine-station.js", "live-mirl.js", "science-ch3.js", "science-ch5.js", "science-ch6.js", "science-certified.js", "science-import.js", "metric-import.js", "organ-import.js", "db-explorer.js", "imported-source.js", "store-model.js", "fine-model.js", "tangent-model.js", "cot-model.js"] + ["organs/" + f for f in os.listdir(os.path.join(wk, "organs")) if f.endswith(".js")] + ["db-import/" + f for f in os.listdir(os.path.join(wk, "db-import")) if f.endswith(".js")]
    diff = [f for f in prot if sha(os.path.join(wk, f)) != sha(os.path.join(mine_, f))]
    check("A27.engines_models_readers_unchanged", "runtime, event models, organs, popups, imported-database readers, Science Lab and the module models are byte-identical to the accepted working copy (%d files)" % len(prot), not diff, diff)
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
