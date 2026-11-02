"""Mobile COMPACT-density correction (S24 FE screenshot): Control Station + Study Mode at 360 / 390 / 412 / 430 px.
Checks: viewport meta keeps pinch-zoom, no CSS zoom / fixed widths; compact header + clock + timers; equal-width aligned tiles and buttons; every real Study field / action kept; no horizontal overflow
(idle and running); 44 px tap targets for essential controls; telemetry folded with its SIMULATED warning visible; seven themes; desktop (1440) and tablet (768) geometry identical to the previous checkpoint
build served on a second port; only mobile-layout.css changed.
usage: t141_mobile_compact.py <base_url_new> <chrome_port> <base_url_previous_checkpoint_build> <chrome_port2> <previous_checkpoint_dir>"""
import os, sys, json, time, hashlib
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, base2, cport2, PREV = sys.argv[1], int(sys.argv[2]), sys.argv[3], int(sys.argv[4]), sys.argv[5]
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
site = Site(base, cport); J = site.J
click = lambda i: J("(()=>{const b=document.getElementById(%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(i))
txt = lambda i: site.jl("(document.getElementById(%s)||{}).textContent||null" % json.dumps(i))
def rect(sel): return site.jl("(()=>{const e=document.querySelector(%s);if(!e||(!e.offsetParent&&getComputedStyle(e).position!=='fixed'))return null;const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()" % json.dumps(sel))
def rects(sel): return site.jl("[...document.querySelectorAll(%s)].filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})" % json.dumps(sel))
def page(key):
    J("document.body.classList.contains('sidebar-open')||document.getElementById('menuToggle').click(); true"); time.sleep(0.35)
    J("document.querySelector(%s).click(); document.body.classList.remove('sidebar-open'); window.scrollTo(0,0); true" % json.dumps("#navStudyRow" if key == "study" else ".nav-row[data-page=%s]" % key)); time.sleep(0.9)
def overflow():
    return site.jl("""(()=>{const W=document.documentElement.clientWidth,bad=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>W+1&&e.offsetParent&&getComputedStyle(e).position!=='fixed'){let p=e.parentElement,clip=false;while(p&&p!==document.body){if(/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowX)){clip=true;break}p=p.parentElement}if(!clip)bad.push(e.tagName+'#'+e.id)}});return {sw:document.documentElement.scrollWidth,W,bad:bad.slice(0,4)}})()""")
def equal(r, tol=1.5): return len(r) > 1 and max(x[2] for x in r) - min(x[2] for x in r) <= tol
def same_row(r, tol=1.5): return len(r) > 1 and max(x[1] for x in r) - min(x[1] for x in r) <= tol
try:
    site.load()
    meta = site.jl("document.querySelector('meta[name=viewport]').content")
    zoom = site.jl("({html:getComputedStyle(document.documentElement).zoom,body:getComputedStyle(document.body).zoom,tf:getComputedStyle(document.body).transform,minw:getComputedStyle(document.body).minWidth,mainw:getComputedStyle(document.querySelector('.main')).minWidth})")
    check("Z1.pinch_zoom_preserved", "the viewport meta only says width=device-width, initial-scale=1.0 (no maximum-scale, minimum-scale or user-scalable restriction) and no CSS zoom / transform / min-width is applied to html, body or .main", meta == "width=device-width, initial-scale=1.0" and zoom["html"] == "1" and zoom["body"] == "1" and zoom["tf"] == "none" and zoom["minw"] in ("0px", "auto"), (meta, zoom))
    for W in (360, 390, 412, 430):
        site.c.viewport(W, 915); time.sleep(0.7)
        # ---------------- Control Station ----------------
        page("control")
        o = overflow(); topbar = rect(".topbar"); clock = rect("#hudClock"); hero = rect(".hero-card"); ring = rect("#engineRing")
        check(f"C{W}.1.no_overflow_compact_header", f"{W}px Control: no horizontal overflow; header block <= 135 px and the system clock <= 72 px tall (was 183 / 111)", o["sw"] <= o["W"] and not o["bad"] and topbar[3] <= 135 and clock[3] <= 72, (o, topbar, clock))
        ts = site.jl("parseFloat(getComputedStyle(document.getElementById('hudTime')).fontSize)")
        check(f"C{W}.2.clock_smaller_readable", "the clock digits are smaller than before (22 px) yet >= 18 px, with LOCAL zone and DAY / Date still shown and not overlapped by the expand control", 18 <= ts <= 22 and "LOCAL" in txt("scTz") and txt("scDay") and txt("scDateVal"), ts)
        sx = site.jl("(()=>{const a=document.getElementById('scTz').getBoundingClientRect(),b=document.querySelector('.ml-clock-expand').getBoundingClientRect();return a.top<b.bottom&&a.bottom>b.top&&a.left<b.right&&a.right>b.left})()")
        check(f"C{W}.3.clock_controls_not_overlapping", "the clock expand control does not overlap the zone / date text", not sx)
        check(f"C{W}.4.engine_ring_compact", "Engine Core ring 140-170 px (was 190), hero card <= 395 px (was 429), ring time still >= 26 px", 140 <= ring[2] <= 170 and abs(ring[2] - ring[3]) < 1 and hero[3] <= 395 and site.jl("parseFloat(getComputedStyle(document.getElementById('engineRingTime')).fontSize)") >= 26, (ring, hero))
        ctl = rects(".engine-controls .btn"); emg = rect("#btnEngineEmergency")
        check(f"C{W}.5.start_pause_stop_row", "START / PAUSE / STOP are three equal-width buttons on one row, each >= 44 px tall", len(ctl) == 3 and equal(ctl) and same_row(ctl) and all(c[3] >= 44 for c in ctl), ctl)
        check(f"C{W}.6.emergency_visible", "EMERGENCY is full width, >= 44 px tall, directly under the row and on screen", emg and emg[3] >= 44 and emg[1] > ctl[0][1] and emg[0] >= 0 and emg[0] + emg[2] <= W and abs(emg[2] - (ctl[2][0] + ctl[2][2] - ctl[0][0])) < 2, (emg, ctl))
        st = rects("#mlSessionHealth .stat")
        check(f"C{W}.7.health_grid", "Local Session Health: three equal-width tiles on one row, each <= 60 px tall", len(st) == 3 and equal(st) and same_row(st) and all(s[3] <= 60 for s in st), st)
        tele = site.jl("(()=>{const c=document.getElementById('mlLiveTelemetry'),w=c.querySelector('.feed-sim'),r=w.getBoundingClientRect();return {folded:c.classList.contains('ml-folded'),warn:w.innerText,vis:r.height>0&&getComputedStyle(w).display!=='none',h:c.getBoundingClientRect().height,feedHidden:getComputedStyle(document.getElementById('feed')).display==='none'}})()")
        check(f"C{W}.8.telemetry_collapsed_warning_visible", "Live Telemetry is collapsed by default (<= 120 px) and its SIMULATED TELEMETRY — NOT LIVE WINDOWS MONITORING warning stays visible", tele["folded"] and tele["vis"] and "SIMULATED TELEMETRY" in tele["warn"].upper() and "NOT LIVE WINDOWS MONITORING" in tele["warn"].upper() and tele["h"] <= 120 and tele["feedHidden"], tele)
        site.J("document.querySelector('#mlLiveTelemetry .ml-fold-toggle').click(); true"); time.sleep(0.3)
        t2 = site.jl("(()=>{const c=document.getElementById('mlLiveTelemetry');return {folded:c.classList.contains('ml-folded'),feed:getComputedStyle(document.getElementById('feed')).display,warn:c.querySelector('.feed-sim').getBoundingClientRect().height>0}})()")
        check(f"C{W}.9.telemetry_expands", "the fold control expands the telemetry feed (warning still visible) and collapses it again", (not t2["folded"]) and t2["feed"] != "none" and t2["warn"], t2)
        site.J("document.querySelector('#mlLiveTelemetry .ml-fold-toggle').click(); true")
        acad = rect(".ac-launcher")
        check(f"C{W}.10.academy_small", "the floating Academy launcher is 40 px (was 48) with a 44 px hit area", acad and 38 <= acad[2] <= 42 and site.jl("(()=>{const s=getComputedStyle(document.querySelector('.ac-launcher'),'::before');return s.content!=='none'&&s.inset!==''})()"), acad)
        check(f"C{W}.11.axon_decoration_off", "the decorative axon canvas is not drawn on phones", site.jl("getComputedStyle(document.getElementById('axonCanvas')).display") == "none")
        small = site.jl("[...document.querySelectorAll('#page-control button, #page-control .btn')].filter(e=>e.offsetParent&&!e.closest('.ml-folded')&&!e.closest('[hidden]')&&e.id!=='').map(e=>{const r=e.getBoundingClientRect();return [e.id,Math.round(r.width),Math.round(r.height)]}).filter(a=>a[2]<40)")
        check(f"C{W}.12.tap_targets", "every identified Control Station button is >= 40 px tall (the SINE carousel arrows were 24 px)", not small, small)
        # run a session on the phone layout
        assert click("btnEngineStart"); time.sleep(1.2)
        check(f"C{W}.13.running_works", "START works on the compact layout (ENGINE ACTIVE, PAUSE enabled) with no overflow and the ring unchanged in size", site.jl("window.MYELIN.state") == "ACTIVE" and overflow()["sw"] <= W and abs(rect("#engineRing")[2] - ring[2]) < 1)
        click("btnEnginePause"); time.sleep(0.4); paused = site.jl("window.MYELIN.state"); click("btnEnginePause"); time.sleep(0.3); resumed = site.jl("window.MYELIN.state"); click("btnEngineStop"); time.sleep(0.6)
        check(f"C{W}.14.pause_resume_stop", "PAUSE, RESUME and STOP work", paused == "PAUSED" and resumed == "ACTIVE" and site.jl("window.MYELIN.state") == "ENDED", (paused, resumed))
        # ---------------- Study Mode ----------------
        page("study")
        o = overflow(); tc = rect("#sxTimerCard"); sr = rect("#sxTimerCard .sm-ring-wrap")
        check(f"S{W}.1.no_overflow_compact_timer", f"{W}px Study: no horizontal overflow; the timer ring is 150-170 px (was 190) and the whole timer card <= 430 px (was 504)", o["sw"] <= o["W"] and not o["bad"] and 150 <= sr[2] <= 170 and tc[3] <= 430, (o, sr, tc))
        meta_r = rects("#sxTimerCard .sm-timer-meta > div")
        check(f"S{W}.2.timer_values_together", "CURRENT TASK, the ring, PLANNED / ELAPSED / ENDS AT sit together in one card; the three values are equal-width on one row", len(meta_r) == 3 and equal(meta_r) and same_row(meta_r) and all(tc[1] <= m[1] <= tc[1] + tc[3] for m in meta_r) and "CURRENT TASK" in site.jl("document.getElementById('sxTimerCard').innerText").upper())
        acts = rects("#smTimerActions .btn")
        w3 = [a for a in acts if abs(a[3] - acts[0][3]) < 1]
        row1 = [a for a in acts if abs(a[1] - acts[0][1]) < 2]; row2 = [a for a in acts if abs(a[1] - acts[0][1]) >= 2]
        check(f"S{W}.3.five_actions_aligned", "all five real actions (START, PAUSE, RESUME / COMPLETE, START BREAK) are present: row 1 three equal buttons, row 2 two equal half-width buttons, all >= 44 px tall, none overlapping", len(acts) == 5 and len(row1) == 3 and equal(row1) and len(row2) == 2 and equal(row2) and all(a[3] >= 44 for a in acts) and abs((row2[0][2] + row2[1][2] + 6) - (row1[0][2] * 3 + 12)) < 3, acts)
        pr = rects("#sxPresets button")
        check(f"S{W}.4.presets_four_equal", "25 / 45 / 60 / 90 MIN are four equal-width columns on one row, >= 44 px tall", len(pr) == 4 and equal(pr) and same_row(pr) and all(p[3] >= 44 for p in pr) and [b.strip() for b in site.jl("[...document.querySelectorAll('#sxPresets button')].map(b=>b.textContent)")] == ["25 MIN", "45 MIN", "60 MIN", "90 MIN"], pr)
        ids = ["sxStudyMin", "sxBreakMin", "sxSubject", "sxTask", "sxKeywords", "sxImportant", "sxPrepare"]
        have = site.jl("%s.map(i=>!!document.getElementById(i)&&document.getElementById(i).offsetParent!==null)" % json.dumps(ids))
        inp = rects(".sx-fields input")
        check(f"S{W}.5.every_real_field_kept", "all six setup fields and PREPARE are present and visible; inputs >= 44 px tall with 16 px text (no zoom-on-focus); STUDY / BREAK LENGTH share a row, the other four are full width", all(have) and len(inp) == 6 and all(i[3] >= 44 for i in inp) and site.jl("parseFloat(getComputedStyle(document.getElementById('sxSubject')).fontSize)") == 16 and abs(inp[0][1] - inp[1][1]) < 2 and inp[0][2] < inp[2][2] * 0.6 and equal(inp[2:], 1.5), (have, inp))
        gaps = [inp[i + 1][1] - (inp[i][1] + inp[i][3]) for i in range(2, 5)]
        check(f"S{W}.6.field_gaps_reduced", "vertical gaps between the stacked fields (label included) are <= 32 px (were ~38)", all(g <= 32 for g in gaps), gaps)
        prep = rect("#sxPrepare")
        check(f"S{W}.7.prepare_full_width", "PREPARE stays full width (48 px) and the setup card is within the viewport", prep[3] >= 48 and prep[2] >= W - 2 * 10 - 2 * 12 - 4 and prep[0] >= 0 and prep[0] + prep[2] <= W)
        fold = site.jl("[...document.querySelectorAll('#sxTele, #sxRi')].map(c=>{const t=c.querySelector('.ml-fold-toggle'),r=c.getBoundingClientRect();return [c.classList.contains('ml-folded'),!!t,Math.round(r.height)]})")
        check(f"S{W}.8.study_telemetry_resource_intent_cards", "Study Telemetry and Resource Intent are compact folded cards (<= 70 px each) with an expand control", all(f[0] and f[1] and f[2] <= 70 for f in fold) and len(fold) == 2, fold)
        site.J("document.querySelector('#sxTele .ml-fold-toggle').click(); true"); time.sleep(0.3)
        check(f"S{W}.9.study_card_expands", "Study Telemetry expands to its rows (and has real content)", site.jl("getComputedStyle(document.getElementById('sxTeleRows')).display") != "none" and len(site.jl("document.getElementById('sxTeleRows').innerText")) > 10)
        site.J("document.querySelector('#sxTele .ml-fold-toggle').click(); true")
        # prepare + start a study block on the compact layout
        page("control"); assert click("btnEngineStart"); time.sleep(0.8); page("study")
        J("(()=>{for(const [i,v] of [['sxSubject','Mobile check'],['sxTask','Compact layout']]){const s=document.getElementById(i);s.value=v;s.dispatchEvent(new Event('input',{bubbles:true}))}return true})()"); click("sxPrepare"); time.sleep(0.6)
        started = J("(()=>{const b=document.querySelector('[data-study-action=start]');if(!b||b.disabled)return false;b.click();return true})()")
        time.sleep(1.0)
        o2 = overflow(); tc2 = rect("#sxTimerCard")
        check(f"S{W}.10.study_runs_compact", "PREPARE then START works; the timer card stays <= 440 px and nothing overflows while running", started and o2["sw"] <= W and tc2[3] <= 440 and site.jl("document.getElementById('smSubject').textContent") == "Mobile check", (started, o2, tc2))
        J("(()=>{const b=document.querySelector('[data-study-action=complete]');if(b&&!b.disabled)b.click();return true})()"); time.sleep(0.5)
        page("control"); click("btnEngineStop"); time.sleep(0.6)
    # ---------------- themes (412) ----------------
    site.c.viewport(412, 915); time.sleep(0.5); page("control")
    themes = site.jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)") or []
    okt = []
    for w in themes + ["amber", "red", "green"]:
        if w in ("amber", "red", "green"):
            J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(w))
        else:
            J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % w)
        time.sleep(0.4)
        v = site.jl("(()=>{const t=getComputedStyle(document.getElementById('hudTime')),b=getComputedStyle(document.body);return {c:t.color,bg:b.backgroundColor,sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}})()")
        okt.append((w, v["c"] != v["bg"] and v["sw"] <= v["W"]))
    J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=neon]').click(); true")
    check("T1.seven_themes", "all seven themes (4 worlds + 3 accent palettes) keep the compact Control Station legible with no overflow", len(themes) == 4 and len(okt) == 7 and all(x[1] for x in okt), okt)
    # ---------------- topbar collision 701-1180 px + zoom lens ----------------
    TB = """(()=>{const r=s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const b=e.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]};const ov=(a,b)=>!!a&&!!b&&a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const clock=r('#hudClock'),brand=r('.brand-title'),menu=r('#menuToggle'),right=r('.topbar-right'),tb=r('.topbar');return {off:(brand[0]+brand[2])/2-document.documentElement.clientWidth/2,cw:Math.round(clock[2]-clock[0]),ch:Math.round(clock[3]-clock[1]),clockBrand:ov(clock,brand),menuBrand:ov(menu,brand),clockMenu:ov(clock,menu),clockRight:ov(clock,right),brandRight:ov(brand,right),menuRight:ov(menu,right),h:tb[3]-tb[1],sticky:getComputedStyle(document.querySelector('.topbar')).position,sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}})()"""
    bad = []
    for W in (701, 760, 840, 915, 960, 980, 1024, 1100, 1126, 1180, 1181, 1200, 1240):
        site.c.viewport(W, 460); time.sleep(0.5)
        for key in ("control", "study", "metric-hub", "science-lab", "cosine", "sensehub"):
            page(key); t = site.jl(TB)
            if t["clockBrand"] or t["menuBrand"] or t["clockMenu"] or t["clockRight"] or t["brandRight"] or t["menuRight"] or t["cw"] != 260 or abs(t["ch"] - 120) > 3 or t["sticky"] != "relative" or t["h"] > 215 or abs(t["off"]) > 2 or t["sw"] > t["W"]: bad.append((W, key, t))
    check("H1.clock_never_over_the_name", "from 701 to 1240 px (tablet, narrow window, phone in Desktop site / landscape) on Control, Study, Metric Hub, Science Lab, COSINE and SenseHub the System Clock no longer overlaps the MYELIN name, MENU or the right-hand buttons; the clock card keeps its normal 260 x 120 size and look; row 1 is MENU | brand EXACTLY centred on the page (within 2 px; circuit traces kept at 1181-1240 px as on the desktop) | buttons, with the clock card on its own row beneath; on a short (landscape) screen the header scrolls away instead of covering a short screen; no sideways overflow", not bad, bad[:2])
    gridbad = []
    for W in (700, 760, 860, 861, 980, 1100, 1180):
        site.c.viewport(W, 800); time.sleep(0.5)
        page("control")
        g = site.jl("""(()=>{const r=s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]};return {hero:r('.hero-card'),feed:r('#mlLiveTelemetry'),handover:r('.col-telemetry > .card:not(.feed-card)'),health:r('#mlSessionHealth'),W:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth}})()""")
        two = W >= 861 and W != 700
        if W == 700: continue
        if two:
            ok = g["feed"] and g["handover"] and g["hero"] and g["feed"][0] > g["hero"][0] + g["hero"][2] - 2 and abs(g["handover"][0] - g["feed"][0]) < 2 and g["handover"][1] > g["feed"][1] and g["health"][0] == g["hero"][0] and g["health"][1] > g["hero"][1] and g["sw"] <= g["W"]
        else:
            ok = g["feed"] and g["hero"] and g["feed"][0] == g["hero"][0] and g["sw"] <= g["W"]
        if not ok: gridbad.append((W, g))
    check("H3.control_two_columns_like_desktop", "from 861 px the Control Station is two columns as on the desktop: Engine Core + Local Session Health left, Live Telemetry with Handover Telemetry beneath it on the RIGHT; below 861 px one column; no sideways overflow", not gridbad, gridbad[:2])
    sxbad = []
    for W in (760, 980, 1100):
        site.c.viewport(W, 800); time.sleep(0.5); page("study")
        g = site.jl("(()=>{const r=s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]};const cols=[...document.querySelectorAll('#page-study-mode .sx-grid > .col')].map(e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]});return {timer:cols[0]||null,tele:cols[1]||null,W:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth}})()")
        if not (g["timer"] and g["tele"] and g["sw"] <= g["W"] and ((W == 760 and g["tele"][0] == g["timer"][0]) or (W > 760 and g["tele"][0] > g["timer"][0] + g["timer"][2] - 2))): sxbad.append((W, g))
    check("H4.study_two_columns_like_desktop", "Study Mode is two columns from 861 px (timer / setup left, telemetry right) and one column below, with no overflow", not sxbad, sxbad[:2])
    site.c.viewport(1241, 800); time.sleep(0.5); page("control"); t = site.jl(TB)
    check("H2.wide_header_unchanged", "at 1241 px and wider the header is unchanged (clock beside the brand, sticky)", not t["clockBrand"] and t["sticky"] == "sticky" and t["h"] == 154, t)
    site.c.viewport(980, 460); time.sleep(0.5); page("control")
    hidden_pc = site.jl("document.getElementById('mlLens').hidden")
    site.J("Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5,configurable:true}); Object.defineProperty(screen,'width',{get:()=>412,configurable:true}); Object.defineProperty(screen,'height',{get:()=>915,configurable:true}); window.dispatchEvent(new Event('resize')); true"); time.sleep(0.5)
    shown = not site.jl("document.getElementById('mlLens').hidden"); btn = rect(".ml-lens-btn")
    check("L1.lens_only_on_phones_with_wide_layout", "the zoom lens is hidden on a normal PC (no touch), appears on a small touchscreen showing a wide layout (Desktop site / landscape) as a 44 px button bottom-left", hidden_pc and shown and btn and btn[2] >= 44 and btn[3] >= 44 and btn[0] < 20, (hidden_pc, shown, btn))
    check("L2.pinch_zoom_still_free", "the lens does not touch the viewport meta (still width=device-width, initial-scale=1.0)", site.jl("document.querySelector('meta[name=viewport]').content") == meta)
    click_js = lambda sel: site.J("document.querySelector(%s).click(); true" % json.dumps(sel))
    click_js(".ml-lens-btn"); time.sleep(0.2)
    check("L3.panel_opens_default_60", "tapping the lens opens - / level / + / 100% (aria-expanded true); a fresh visit starts at the 60 % default (content zoomed out, desktop header via the effective width)", site.jl("document.querySelector('.ml-lens-btn').getAttribute('aria-expanded')") == "true" and site.jl("!document.getElementById('mlLensPanel').hidden") and site.jl("document.querySelector('.ml-lens-read').textContent") == "60%" and site.jl("document.querySelector('.main').style.zoom") == "0.6" and site.jl("document.body.hasAttribute('data-eff-wide')"))
    click_js(".ml-lens-reset"); time.sleep(0.3)
    check("L3b.hundred_percent_remembered", "choosing 100% is remembered for the tab (a reload does not force 60% back)", site.jl("sessionStorage.getItem('myelin.lens')") == "1")
    acad100 = rect(".ac-launcher")
    levels = []
    for _ in range(9):
        click_js(".ml-lens-step[aria-label='Zoom out']"); time.sleep(0.25)
        levels.append((site.jl("document.querySelector('.ml-lens-read').textContent"), site.jl("document.querySelector('.main').style.zoom"), site.jl("document.documentElement.scrollWidth <= document.documentElement.clientWidth")))
    check("L4.zoom_out_steps_to_40", "- steps 90 / 80 / 70 / 60 / 50 / 40 / 33 / 25 / 20 % (min 20, the button then disables); the page content shrinks like a PC zoom-out with no sideways overflow at any step", [l[0] for l in levels] == ["90%", "80%", "70%", "60%", "50%", "40%", "33%", "25%", "20%"] and all(l[2] for l in levels) and site.jl("document.querySelector('.ml-lens-step[aria-label=\"Zoom out\"]').disabled") and site.jl("document.querySelector('.main').style.zoom") == "0.2", levels)
    acad40 = rect(".ac-launcher"); lens40 = rect(".ml-lens-btn")
    check("L5.overlays_not_scaled", "the lens and the Academy launcher keep their size at 20 % (only the page content is scaled)", abs(acad40[2] - acad100[2]) < 1 and lens40[2] >= 44, (acad100, acad40, lens40))
    assert click("btnEngineStart"); time.sleep(1.0); st_run = site.jl("window.MYELIN.state"); click("btnEngineStop"); time.sleep(0.5)
    check("L6.controls_work_zoomed_out", "at 20 % START and STOP still work (taps land on the right controls)", st_run == "ACTIVE" and site.jl("window.MYELIN.state") == "ENDED", st_run)
    check("L7.level_remembered_for_this_tab", "the level is kept for the tab (sessionStorage)", site.jl("sessionStorage.getItem('myelin.lens')") == "0.2")
    click_js(".ml-lens-step[aria-label='Zoom in']"); time.sleep(0.2); inn = site.jl("document.querySelector('.ml-lens-read').textContent")
    click_js(".ml-lens-reset"); time.sleep(0.3)
    check("L8.zoom_in_and_reset", "+ steps back up (25 %) and the 100% button restores the normal layout (no zoom style left)", inn == "25%" and site.jl("document.querySelector('.ml-lens-read').textContent") == "100%" and site.jl("document.querySelector('.main').style.zoom") == "" and not site.jl("document.body.hasAttribute('data-lens-zoom')"), inn)
    click_js(".ml-lens-step[aria-label='Zoom out']"); click_js(".ml-lens-step[aria-label='Zoom out']"); time.sleep(0.2)
    site.c.viewport(412, 915); time.sleep(0.7)
    check("L9.phone_layout_unaffected", "in the compact phone layout (412 px) the lens is hidden and no zoom is applied, whatever level was chosen before", site.jl("document.getElementById('mlLens').hidden") and site.jl("document.querySelector('.main').style.zoom") == "")
    site.c.viewport(980, 460); time.sleep(0.6)
    check("L10.level_returns_with_wide_layout", "returning to a wide layout restores the chosen level (80 %)", site.jl("document.querySelector('.ml-lens-read').textContent") == "80%" and site.jl("document.querySelector('.main').style.zoom") == "0.8")
    click_js(".ml-lens-reset")
    page("cosine"); click("cosineModeDemo"); time.sleep(0.3)
    for _ in range(3): click_js(".ml-lens-step[aria-label='Zoom out']")
    time.sleep(0.3); click("cdTrigger"); time.sleep(0.6)
    pg = site.jl("(()=>{const p=document.querySelector('#wlDemoStage .wl-pp');if(!p)return null;const r=p.getBoundingClientRect();return {dx:r.left+r.width/2-innerWidth/2,dy:r.top+r.height/2-innerHeight/2,inside:r.left>=-0.5&&r.right<=innerWidth+0.5&&r.top>=-0.5&&r.bottom<=innerHeight+0.5}})()")
    check("L11.centred_popup_still_centred", "with the lens at 70 % the COSINE popup is still centred in the viewport and fully inside it", pg and abs(pg["dx"]) < 3 and abs(pg["dy"]) < 3 and pg["inside"], pg)
    click_js(".ml-lens-reset")
    # lens zoomed out far enough that the content is as wide as the desktop: the desktop header and columns return
    site.c.viewport(985, 500); time.sleep(0.6); page("control")
    HEAD = """(()=>{const r=s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const b=e.getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]};const ov=(a,b)=>!!a&&!!b&&a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const m=r('#menuToggle'),c=r('#hudClock'),b=r('.brand-title'),rt=r('.topbar-right'),f=r('#mlLiveTelemetry'),h=r('.hero-card'),tr=[...document.querySelectorAll('.circuit-trace')].map(e=>!!e.offsetParent);
return {wide:document.body.hasAttribute('data-eff-wide'),menuLeftOfClock:m[2]<=c[0]+1,clockBelowBrand:c[1]>=b[3],clockLeftOfBrand:c[2]<b[0],noOverlap:!ov(c,b)&&!ov(b,rt)&&!ov(m,c),traces:tr,twoCols:f[0]>h[2]-2,sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}})()"""
    effs = {}
    for lvl in (1, 2, 3, 4):   # 90 80 70 60 %
        if lvl == 1: click_js(".ml-lens-reset")
        click_js(".ml-lens-step[aria-label='Zoom out']"); time.sleep(0.3)
        effs[site.jl("document.querySelector('.ml-lens-read').textContent")] = site.jl(HEAD)
    ok_wide = all(effs[k]["wide"] and effs[k]["menuLeftOfClock"] and (not effs[k]["clockBelowBrand"]) and effs[k]["clockLeftOfBrand"] and effs[k]["noOverlap"] and effs[k]["traces"] == [True, True] and effs[k]["twoCols"] and effs[k]["sw"] <= effs[k]["W"] for k in ("70%", "60%"))
    ok_narrow = all((not effs[k]["wide"]) and effs[k]["clockBelowBrand"] for k in ("90%", "80%"))
    check("E1.lens_restores_desktop_header", "with the lens at 70 % or 60 % on a 985 px viewport (content effectively 1400 px+ wide) the header is the desktop one: MENU, then the clock beside it on the same row, circuit traces drawn on both sides of the brand, no overlap, Live Telemetry + Handover in the right column; at 90 / 80 % (content under 1241 px) the centred-brand layout with the clock row beneath is kept", ok_wide and ok_narrow, effs)
    click_js(".ml-lens-reset"); time.sleep(0.3)
    check("E2.attribute_cleared_at_100", "back at 100 % the effective-width flag is removed", not site.jl("document.body.hasAttribute('data-eff-wide')"))
    # ---------------- other phone pages unchanged ----------------
    for key in ("cosine", "sensehub", "metric-hub"):
        page(key); h = site.jl("document.getElementById('page-%s').scrollHeight" % key); o = overflow()
        check(f"O.{key}", f"the {key} page is untouched by the compact rules (no overflow at 412 px)", o["sw"] <= o["W"], (h, o))
    # ---------------- desktop / tablet geometry identical to the previous checkpoint build ----------------
    GEO = """(()=>{const g=s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};return ['.topbar','#hudClock','.hero-card','#engineRing','.engine-controls','#btnEngineEmergency','#mlLiveTelemetry','#mlSessionHealth','#sxTimerCard','#sxTimerCard .sm-ring-wrap','#sxPresets','.sx-fields','#sxPrepare','.ac-launcher'].map(g)})()"""
    site2 = Site(base2, cport2)
    try:
        site.load(); site2.load()   # both fresh: the geometry must not depend on the sessions run above
        for W, H in ((1440, 900), (1280, 800), (1241, 800)):
            res = []
            for s in (site, site2):
                s.c.viewport(W, H); time.sleep(0.7); r2 = []
                for key in ("control", "study"):
                    s.J("document.body.classList.contains('sidebar-open')||document.getElementById('menuToggle')?.click(); true"); time.sleep(0.3)
                    s.J("document.querySelector(%s).click(); document.body.classList.remove('sidebar-open'); window.scrollTo(0,0); true" % json.dumps("#navStudyRow" if key == "study" else ".nav-row[data-page=control]")); time.sleep(0.9)
                    g = s.jl(GEO)
                    if key == 'study': g = [e and [e[0], e[2], e[3]] for e in g]   # the Study page gained the teaching-simulation mode bar above it (Academy Stage A): compare x, width and height
                    r2.append(g)
                res.append(r2)
            check(f"D{W}.geometry_identical", f"at {W} px wide the Control Station and Study Mode geometry (header, clock, hero, ring, controls, telemetry, health, timer card, presets, fields, PREPARE, Academy launcher) is identical to the previous build (the topbar fix applies only at 701-1240 px)", res[0] == res[1], [(a, b) for a, b in zip(res[0], res[1]) if a != b][:1])
    finally:
        site2.close()
    # ---------------- only the mobile stylesheet changed ----------------
    sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    def walk(d):
        out = {}
        for r, _, fs in os.walk(d):
            for f in fs: out[os.path.relpath(os.path.join(r, f), d).replace("\\", "/")] = os.path.join(r, f)
        return out
    a = walk(os.path.join(PREV, "templates")); b = walk(os.path.join(ROOT, "templates"))
    changed = sorted(k for k in set(a) | set(b) if k not in a or k not in b or sha(a[k]) != sha(b[k]))
    known = sorted(["assets/myelin/mobile-layout.css", "assets/myelin/mobile-layout.js", "myelin_web_sample.html"] + (["assets/myelin/viewing-mode.css", "assets/myelin/viewing-mode.js"] if os.path.exists(os.path.join(ROOT, "templates", "assets", "myelin", "viewing-mode.js")) else []) + (["assets/myelin/study-lab-core.js", "assets/myelin/study-lab.css", "assets/myelin/study-lab.js"] if os.path.exists(os.path.join(ROOT, "templates", "assets", "myelin", "study-lab.js")) else []))   # + the later viewing-mode screen, which has its own test (t142)   # the earlier owner mobile task (added after the COSINE checkpoint); html = its two asset links
    old_js = open(os.path.join(ROOT, "PHASE_NOTES", "backup_before_mobile_compact", "mobile-layout.js"), encoding="utf-8").read()
    js_same = open(os.path.join(ROOT, "templates", "assets", "myelin", "mobile-layout.js"), encoding="utf-8").read().startswith(old_js)   # the zoom lens is appended; nothing above it changed
    import difflib
    rd = lambda pth: open(pth, encoding="utf-8").read().split("\n")
    html_lines = [l for l in difflib.unified_diff(rd(a["myelin_web_sample.html"]), rd(b["myelin_web_sample.html"]), lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
    check("P1.only_mobile_css_changed_by_this_task", "against the COSINE checkpoint the only differences are the earlier mobile task's entry points (mobile-layout.css / .js and its asset links in myelin_web_sample.html); this task changed only mobile-layout.css (mobile-layout.js only gained the appended zoom-lens block); engines, organs, simulation rules, readers, SenseHub, COSINE, popups, Academy and academic / thesis pages (incl. research.html) are untouched", changed == known and js_same and all(("mobile-layout" in l or "viewing-mode" in l or "study-lab" in l) for l in html_lines) and len(html_lines) <= 8, (changed, js_same, html_lines))
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("P2.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
