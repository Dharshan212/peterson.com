"""Viewing-mode policy: MYELIN Web Lite is best on a desktop-style layout. On a PHONE in a conventional narrow mobile layout a MYELIN-themed screen (BEST VIEWED IN DESKTOP MODE) explains how to switch
to Desktop site + landscape, with an accessible CONTINUE ANYWAY. Never on ordinary desktops or tablets; never when the phone shows the desktop-style layout (Desktop site sends a desktop user agent).
No browser API reports the Desktop-site checkbox, so the scenarios below EMULATE what Chrome reports in each mode (touch, screen size, viewport, user agent, UA client hints) - they are not a
substitute for opening the real S24 FE (the page offers ?viewdiag to print what a device reports).
usage: t142_viewing_mode.py <base_url_secure_loopback> <chrome_port> <base_url_insecure_lan_or_same> <previous_checkpoint_dir>"""
import os, sys, json, time, hashlib, difflib
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, base_lan, PREV = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
ROOT = os.path.abspath(os.path.join(TOOLS, "..", "..", ".."))
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
UA_MOBILE = "Mozilla/5.0 (Linux; Android 14; SM-S721B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"
UA_DESKTOP = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
META_MOBILE = {"platform": "Android", "platformVersion": "14", "architecture": "", "model": "SM-S721B", "mobile": True}
META_DESKTOP = {"platform": "Linux", "platformVersion": "6.1", "architecture": "x86", "model": "", "mobile": False}
SCN = {   # name: (viewport w, h, screen w, h, mobile viewport?, touch, UA, UA metadata, dpr)
    "phone_portrait":        (412, 915, 412, 915, True, True, UA_MOBILE, META_MOBILE, 2.625),
    "phone_landscape":       (915, 412, 915, 412, True, True, UA_MOBILE, META_MOBILE, 2.625),
    "desktop_site_landscape": (985, 460, 915, 412, False, True, UA_DESKTOP, META_DESKTOP, 1.0),
    "desktop_pc":            (1440, 900, 1440, 900, False, False, UA_DESKTOP, META_DESKTOP, 1.0),
    "narrow_pc_window":      (600, 800, 1440, 900, False, False, UA_DESKTOP, META_DESKTOP, 1.0),
    "tablet_portrait":       (800, 1280, 800, 1280, True, True, UA_MOBILE, META_MOBILE, 2.0),
}
site = Site(base, cport); c = site.c; J = site.J
def open_as(name, url=None, keep_storage=False):
    w, h, sw, sh, mob, touch, ua, meta, dpr = SCN[name]
    c.call("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mob, screenWidth=sw, screenHeight=sh)
    c.call("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5) if touch else c.call("Emulation.setTouchEmulationEnabled", enabled=False)
    c.call("Emulation.setUserAgentOverride", userAgent=ua, userAgentMetadata=meta)
    u = (url or base) + "/index.html"
    c.goto(u, 0.5)
    for _ in range(120):
        if J("typeof window.MYELIN==='object' && !!document.getElementById('csPrev')"): break
        time.sleep(0.25)
    if not keep_storage:
        J("sessionStorage.clear(); true"); c.goto(u, 0.5)
        for _ in range(120):
            if J("typeof window.MYELIN==='object' && !!document.getElementById('csPrev')"): break
            time.sleep(0.25)
    time.sleep(1.0); J("document.getElementById('acSkipIntro')?.click(); true"); time.sleep(0.4)
jl = site.jl
def gate():
    return jl("""(()=>{const g=document.getElementById('vmGate');if(!g)return {exists:false};const r=g.getBoundingClientRect(),k=g.querySelector('.vm-card').getBoundingClientRect(),cs=getComputedStyle(g);
return {exists:true,shown:!g.hidden&&cs.display!=='none',title:(g.querySelector('.vm-title')||{}).textContent,msg:(g.querySelector('.vm-msg')||{}).textContent,steps:[...g.querySelectorAll('.vm-step')].map(e=>e.textContent),foot:(g.querySelector('.vm-foot')||{}).textContent,btn:(g.querySelector('.vm-continue')||{}).textContent,
btnH:g.querySelector('.vm-continue').getBoundingClientRect().height,role:g.getAttribute('role'),modal:g.getAttribute('aria-modal'),labelled:document.getElementById(g.getAttribute('aria-labelledby'))?document.getElementById(g.getAttribute('aria-labelledby')).textContent:null,
focus:document.activeElement&&document.activeElement.id,cardIn:k.left>=0&&k.right<=innerWidth+0.5&&k.top>=-0.5,fits:g.scrollHeight<=g.clientHeight+1,sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,
fonts:[...g.querySelectorAll('.vm-msg,.vm-step,.vm-foot,.vm-continue')].map(e=>parseFloat(getComputedStyle(e).fontSize)),mainInert:!!document.querySelector('.main').closest('[inert]'),pos:cs.position,z:cs.zIndex,
cx:(k.left+k.right)/2-innerWidth/2,cy:(k.top+k.bottom)/2-innerHeight/2,vw:innerWidth,vh:innerHeight}})()""")
def app_ok():
    return jl("(()=>{const t=document.querySelector('.topbar');return !!t&&t.offsetParent!==null&&!!!document.querySelector('.main').closest('[inert]')&&!document.documentElement.classList.contains('vm-open')})()")
EXACT = {"title": "BEST VIEWED IN DESKTOP MODE", "msg": "MYELIN Web Lite is designed for a desktop-style research experience.",
         "steps": ["Open your browser's three-dot menu.", "Enable \"Desktop site\".", "Rotate your phone to landscape."], "foot": "For the best experience, use a PC or a mobile browser in Desktop site mode.", "btn": "CONTINUE ANYWAY"}
try:
    # ---------- the four required viewing modes + extras ----------
    for name, label, should in (("phone_portrait", "S24 FE normal mobile PORTRAIT", True), ("phone_landscape", "S24 FE normal mobile LANDSCAPE", True),
                                ("desktop_site_landscape", "S24 FE DESKTOP SITE landscape", False), ("desktop_pc", "standard desktop browser", False),
                                ("narrow_pc_window", "narrow desktop window (no touchscreen)", False), ("tablet_portrait", "tablet (screen > 700 px)", False)):
        open_as(name)
        g = gate(); ok_app = app_ok()
        if should:
            wording = g["shown"] and g["title"] == EXACT["title"] and g["msg"] == EXACT["msg"] and g["steps"] == EXACT["steps"] and g["foot"] == EXACT["foot"] and g["btn"] == EXACT["btn"]
            check(f"V.{name}.gate", f"{label}: the instruction screen is shown with the exact wording (headline, message, three steps, footer, CONTINUE ANYWAY)", wording, g)
            check(f"V.{name}.layout", f"{label}: readable and inside the screen: card within the viewport, no sideways scroll, text >= 14 px, CONTINUE ANYWAY >= 44 px tall, whole screen visible without scrolling, card centred", g["cardIn"] and g["sw"] <= g["W"] and min(g["fonts"]) >= 14 and g["btnH"] >= 44 and g["fits"] and abs(g["cx"]) < 3, g)
            check(f"V.{name}.a11y", f"{label}: modal dialog semantics (role=dialog, aria-modal, labelled by the headline), focus on CONTINUE ANYWAY, the app behind is inert, page scroll locked", g["role"] == "dialog" and g["modal"] == "true" and g["labelled"] == EXACT["title"] and g["focus"] == "vmContinue" and g["mainInert"] and jl("document.documentElement.classList.contains('vm-open')") and g["z"] == "30000" and g["pos"] == "fixed", g)
            c.shot(os.path.join(ROOT, "PHASE_NOTES", "evidence_viewing_mode", f"{name}.png"), full=False) if os.path.isdir(os.path.join(ROOT, "PHASE_NOTES", "evidence_viewing_mode")) else None
        else:
            check(f"V.{name}.no_gate", f"{label}: NO instruction screen; the normal MYELIN interface is usable (topbar visible, nothing inert)", (not g.get("shown")) and ok_app, g)
    # ---------- insecure page (user-agent fallback: UA client hints are hidden on plain http) ----------
    for name, should in (("phone_portrait", True), ("phone_landscape", True), ("desktop_site_landscape", False)):
        open_as(name, base_lan)
        g = gate(); hints = jl("typeof navigator.userAgentData")
        check(f"I.{name}", f"plain-http page (UA client hints {hints}): {name} -> instruction screen {'shown' if should else 'NOT shown'} using the user-agent string fallback", bool(g.get("shown")) == should, (hints, g))
    # ---------- dismissal ----------
    open_as("phone_portrait")
    c.call("Emulation.setDeviceMetricsOverride", width=412, height=915, deviceScaleFactor=2.625, mobile=True, screenWidth=412, screenHeight=915)
    J("document.getElementById('vmContinue').click(); true"); time.sleep(0.4)
    g = gate()
    check("D1.continue_anyway", "CONTINUE ANYWAY closes the screen, restores the app (nothing inert, scroll unlocked) and moves focus to MENU", (not g["shown"]) and app_ok() and jl("document.activeElement.id") == "menuToggle", g)
    check("D2.remembered_for_tab", "the choice is remembered for this tab (a reload does not show the screen again)", jl("sessionStorage.getItem('myelin.viewing.continue')") == "1")
    open_as("phone_portrait", keep_storage=True)
    check("D3.reload_stays_dismissed", "after a reload in the same tab the normal interface opens", not gate().get("shown") and app_ok())
    open_as("phone_portrait")
    c.call("Input.dispatchKeyEvent", type="keyDown", key="Escape", code="Escape", windowsVirtualKeyCode=27); c.call("Input.dispatchKeyEvent", type="keyUp", key="Escape", code="Escape", windowsVirtualKeyCode=27); time.sleep(0.3)
    check("D4.escape_dismisses", "Escape (keyboard) also continues", not gate().get("shown") and app_ok())
    open_as("phone_portrait")
    c.call("Input.dispatchKeyEvent", type="keyDown", key="Tab", code="Tab", windowsVirtualKeyCode=9); c.call("Input.dispatchKeyEvent", type="keyUp", key="Tab", code="Tab", windowsVirtualKeyCode=9); time.sleep(0.2)
    check("D5.focus_stays_in_dialog", "Tab cannot leave the dialog (the page behind is inert): focus stays on CONTINUE ANYWAY", jl("document.activeElement.id") == "vmContinue")
    # rotating a phone that already continued, and rotating one that has not
    open_as("phone_portrait")
    c.call("Emulation.setDeviceMetricsOverride", width=915, height=412, deviceScaleFactor=2.625, mobile=True, screenWidth=915, screenHeight=412); time.sleep(0.6)
    g = gate()
    check("D6.rotation_keeps_screen_readable", "rotating from portrait to landscape while the screen is open keeps it shown, inside the screen and unscrolled", g["shown"] and g["cardIn"] and g["fits"] and g["sw"] <= g["W"], g)
    # ---------- ?viewdiag ----------
    open_as("phone_portrait", base + "?viewdiag" if False else None)
    c.goto(base + "/index.html?viewdiag", 0.8); time.sleep(1.0)
    dg = jl("(document.getElementById('vmDiag')||{}).textContent||null")
    check("X1.viewdiag_reports_what_the_device_says", "?viewdiag prints the gate decision plus touch, screen, viewport and user-agent facts (so the real S24 FE can be checked)", dg and "SHOWN" in dg and "touch" in dg and "mobileUa" in dg and "inner" in dg, dg)
    # ---------- seven themes ----------
    open_as("phone_portrait")
    LUM = """(()=>{const cv=document.createElement('canvas');cv.width=cv.height=1;const x=cv.getContext('2d',{willReadFrequently:true});const rgb=v=>{x.clearRect(0,0,1,1);x.fillStyle='#000';x.fillStyle=v;x.fillRect(0,0,1,1);const d=x.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]]};
const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])};const cr=(a,b)=>{const p=L(a),q=L(b);return (Math.max(p,q)+0.05)/(Math.min(p,q)+0.05)};
const card=getComputedStyle(document.querySelector('.vm-card')).backgroundColor,bg=rgb(card);const t=(s)=>rgb(getComputedStyle(document.querySelector(s)).color);
return {title:cr(t('.vm-title'),bg),msg:cr(t('.vm-msg'),bg),foot:cr(t('.vm-foot'),bg),btn:cr(t('.vm-continue'),bg),step:cr(t('.vm-step'),rgb(getComputedStyle(document.querySelector('.vm-step')).backgroundColor))}})()"""
    themes = jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)"); res = []
    for w in themes + ["amber", "red", "green"]:
        if w in ("amber", "red", "green"): J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(w))
        else: J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % json.dumps(w))
        time.sleep(0.4); r = jl(LUM)
        res.append((w, round(r["title"], 1), round(r["msg"], 1), round(r["foot"], 1), round(r["btn"], 1), round(r["step"], 1)))
    J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=neon]').click(); true")
    check("T1.seven_themes_contrast", "in all seven themes (4 worlds + 3 accent palettes) the headline, message, steps, footer and button keep readable contrast (headline >= 3, text >= 4.5)", len(themes) == 4 and len(res) == 7 and all(r[1] >= 3 and r[2] >= 4.5 and r[3] >= 4.5 and r[4] >= 3 and r[5] >= 4.5 for r in res), res)
    # ---------- desktop regression + protection ----------
    open_as("desktop_pc")
    check("R1.desktop_unchanged", "ordinary desktop: no instruction element is even built, header and Control Station unchanged (clock, brand, engine controls present)", not gate().get("exists") and jl("!!document.getElementById('hudClock')&&!!document.getElementById('btnEngineStart')&&!document.getElementById('btnEngineStart').disabled"))
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
    check("P1.only_the_viewing_screen_added", "compared with the previous mobile checkpoint the only differences are the two new files (viewing-mode.js / .css) and their two link lines in myelin_web_sample.html: no organ, popup, telemetry, SenseHub, Study, Science Lab, readers, theme or academic file changed (research.html included)", changed == sorted(["assets/myelin/viewing-mode.css", "assets/myelin/viewing-mode.js", "myelin_web_sample.html"] + (["assets/myelin/study-lab-core.js", "assets/myelin/study-lab.css", "assets/myelin/study-lab.js"] if os.path.exists(os.path.join(ROOT, "templates", "assets", "myelin", "study-lab.js")) else []) + (["assets/myelin/academy-journey.css", "assets/myelin/academy-journey.js", "assets/myelin/academy.js", "assets/myelin/brand/signature-neon.png", "assets/myelin/brand/signature-original.png"] if os.path.exists(os.path.join(ROOT, "templates", "assets", "myelin", "academy-journey.js")) else [])) and len(hl) <= 12 and all(("viewing-mode" in l or "study-lab" in l or "academy-journey" in l or "acJourney" in l or "acStart" in l) for l in hl), (changed, hl))   # + the later Academy Stage A study lab (own test: t143)
    probs = [x for x in c.problems() if "ERR_ABORTED" not in x]
    check("P2.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    try:
        c.call("Emulation.clearDeviceMetricsOverride"); c.call("Emulation.setTouchEmulationEnabled", enabled=False)
    except Exception: pass
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
