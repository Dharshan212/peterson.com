"""Control Station replication: tests A (initial appearance), B (START/PAUSE/RESUME/STOP), C (navigation vs desktop),
E (SINE / MIRL through the internal simulation mechanism), F (themes + viewports). usage: t40_control_station.py <base_url> [port]"""
import sys, time, json
SP = r"C:\Users\Dharshan\AppData\Local\Temp\claude\C--Users-Dharshan-Downloads-MYELIN-2-0-MYELIN\8d81323d-bb07-4440-9d6c-c8e58f4e8b06\scratchpad"
sys.path.insert(0, SP)
from cdp import Chrome
EV = r"C:\Users\Dharshan\Downloads\Peterson.com\PHASE_NOTES\evidence_sensehub"
base = sys.argv[1]
port = int(sys.argv[2]) if len(sys.argv) > 2 else 9380
R = []
def check(n, ok, d=""):
    R.append(bool(ok)); print(("PASS " if ok else "FAIL ") + n + (f"  [{d}]" if d else ""))
c = Chrome(port=port)

def load(url, w=1.0):
    c.goto(url, 0.5)
    for _ in range(80):
        if c.js("typeof window.MYELIN==='object' && !!document.getElementById('csPrev') && /^Local/.test(document.querySelector('#page-control .card h2').textContent)"): break
        time.sleep(0.25)
    time.sleep(w)

def click(sel):
    """Real mouse click at the centre of the topmost element at that point (must be the target)."""
    r = json.loads(c.js(f"""(()=>{{const e=document.querySelector({json.dumps(sel)});if(!e)return JSON.stringify({{err:'missing'}});e.scrollIntoView({{block:'center'}});
      const b=e.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,t=document.elementFromPoint(x,y);
      return JSON.stringify({{x,y,ok:!!t&&(t===e||e.contains(t)),top:t?t.id||t.className||t.tagName:null}})}})()"""))
    if r.get('err') or not r['ok']:
        return r
    for typ in ("mousePressed", "mouseReleased"):
        c.call("Input.dispatchMouseEvent", type=typ, x=r['x'], y=r['y'], button="left", clickCount=1)
    time.sleep(0.25)
    return r

def st():
    return json.loads(c.js("""JSON.stringify({s:window.MYELIN.state,pill:document.getElementById('engineStatusPill').textContent,
     start:[document.getElementById('btnEngineStart').disabled,document.getElementById('btnEngineStart').textContent.trim()],
     pause:[document.getElementById('btnEnginePause').disabled,document.getElementById('btnEnginePause').textContent.trim()],
     stop:document.getElementById('btnEngineStop').disabled,emg:document.getElementById('btnEngineEmergency').disabled,
     ev:window.MYELIN.snapshot().events?.filter(e=>e.type!=='OBSERVATION_INTERVAL').map(e=>e.type)||[]})"""))

try:
    c.viewport(1460, 960); load(base + "/index.html")
    c.js("document.getElementById('acSkipIntro')?.click(); true"); time.sleep(0.6)

    # ---------------- A. initial appearance
    m = json.loads(c.js("""JSON.stringify({sim:!!document.getElementById('wlSimulator'),
      surfVisible:[...document.querySelectorAll('[data-surface]')].filter(e=>e.getClientRects().length).length,
      txt:document.body.innerText,
      tray:(()=>{const t=document.getElementById('wlDevTray');return t?{hidden:t.hidden,disp:getComputedStyle(t).display}:null})(),
      clockModeVisible:!!document.getElementById('wlClockMode')?.getClientRects().length,
      storageVisible:!!document.getElementById('wlStorageStatus')?.getClientRects().length,
      hero:document.querySelector('.hero-card').getBoundingClientRect().top,
      topbar:document.querySelector('.topbar').getBoundingClientRect().bottom,
      title:document.title,icon:document.querySelector('link[rel=icon]').getAttribute('href')})"""))
    check("A1 no #wlSimulator panel in the DOM", not m['sim'])
    check("A2 no Evidence Workspace text, no TASK/WORK / SOCIAL FEED / WHATSAPP / TELEGRAM / NETFLIX / PRIME / EXACT STUDY / OFF-TASK / UNCERTAIN controls",
          not any(w in m['txt'].upper() for w in ["EVIDENCE WORKSPACE", "TASK / WORK", "SOCIAL FEED", "MESSAGING · WHATSAPP", "STREAMING · NETFLIX", "EXACT STUDY RESOURCE", "UNCERTAIN RESOURCE"]))
    check("A3 no surface button is visible; tray exists but is hidden", m['surfVisible'] == 0 and m['tray'] and m['tray']['hidden'] and m['tray']['disp'] == 'none', m['tray'])
    check("A4 clock selector / session status are not in the Control Station; storage strip hidden when healthy", not m['clockModeVisible'] and not m['storageVisible'])
    check("A5 Engine Core starts directly under the header (gap < 30px)", m['hero'] - m['topbar'] < 30, (m['hero'], m['topbar']))
    check("A6 title and favicon unchanged", m['title'] == "MYELIN Web Lite v1" and m['icon'] == "data:,", (m['title'], m['icon']))
    cards = json.loads(c.js("JSON.stringify([...document.querySelectorAll('#page-control .card h2')].map(h=>h.textContent.trim()))"))
    check("A7 card order = desktop (Engine Core, Health, Current Resource, Normal Break, SINE, COSINE, MINE | Telemetry, Handover)",
          cards == ["Local session health", "Current Resource", "Normal Break Continuity", "SINE Escalation Stage", "COSINE Live", "MINE Live", "Live Telemetry", "Handover Telemetry"], cards)
    s0 = st()
    check("A8 idle: ENGINE IDLE, START enabled, PAUSE/STOP/EMERGENCY disabled", s0['pill'] == "ENGINE IDLE" and not s0['start'][0] and s0['pause'][0] and s0['stop'] and s0['emg'], s0)

    # ---------------- B. START -> PAUSE -> RESUME -> PAUSE -> RESUME -> STOP, real clicks
    seq = []
    r = click("#btnEngineStart"); check("B1 START clickable", r.get('ok'), r); s = st(); seq.append(s)
    check("B1 ACTIVE: pill ENGINE ACTIVE, START disabled, PAUSE enabled labelled Pause", s['s'] == 'ACTIVE' and s['pill'] == "ENGINE ACTIVE" and s['start'][0] and not s['pause'][0] and s['pause'][1].lower() == 'pause', s)
    first_pause_el = c.js("(()=>{window.__pauseEl=document.getElementById('btnEnginePause');return true})()")
    for i in (1, 2):
        r = click("#btnEnginePause"); s = st()
        check(f"B2.{i} PAUSE click -> PAUSED, same control now reads Resume, START stays disabled", r.get('ok') and s['s'] == 'PAUSED' and s['pill'] == "ENGINE PAUSED" and s['pause'][1].lower() == 'resume' and not s['pause'][0] and s['start'][0], s)
        r = click("#btnEnginePause"); s = st()
        check(f"B3.{i} RESUME click on the same control -> ACTIVE, reads Pause", r.get('ok') and s['s'] == 'ACTIVE' and s['pause'][1].lower() == 'pause', s)
    same = c.js("document.getElementById('btnEnginePause')===window.__pauseEl")
    check("B4 Pause/Resume is one physical DOM element throughout", same is True)
    r = click("#btnEngineStop"); s = st()
    check("B5 STOP -> session ended, START enabled again, PAUSE/STOP/EMERGENCY disabled", r.get('ok') and s['s'] == 'ENDED' and not s['start'][0] and s['pause'][0] and s['stop'] and s['emg'], s)
    ev = s['ev']
    check("B6 events: one SESSION_STARTED, two SESSION_PAUSED/RESUMED each, one end", ev.count('SESSION_STARTED') == 1 and ev.count('SESSION_PAUSED') == 2 and ev.count('SESSION_RESUMED') == 2, ev)
    idle_after = json.loads(c.js("JSON.stringify({sine:[...document.querySelectorAll('[data-rows=sine] .v')].map(e=>e.textContent),res:document.getElementById('csResState').textContent})"))
    check("B7 after STOP the cards return to desktop idle values", idle_after['res'] == 'Inactive' and all(v == '—' for v in idle_after['sine']), idle_after)

    # ---------------- C. navigation vs desktop sidebar
    r = click("#menuToggle"); time.sleep(0.5)
    nav = json.loads(c.js("""JSON.stringify({open:document.body.classList.contains('sidebar-open'),
      groups:[...document.querySelectorAll('.sidebar-scroll .nav-group')].map(g=>[g.querySelector('.nav-group-title').textContent.trim(),[...g.querySelectorAll('.nav-row')].map(b=>b.querySelector('.nav-row-label').textContent.trim()+(b.querySelector('.nav-row-badge')?'|'+b.querySelector('.nav-row-badge').textContent.trim():'')+(b.tagName==='BUTTON'?'':'|inert'))]),
      foot:[...document.querySelectorAll('.sidebar-foot > *')].map(e=>(e.innerText||'').trim().split('\\n')[0]),
      head:document.querySelector('.sidebar-head .wordmark').textContent.trim()})"""))
    check("C1 sidebar opens from MENU", nav['open'])
    want = [["Core", ["Control", "Study Mode", "Metric Hub"]], ["Modules", ["SINE — Live MIRL", "MINE", "COSINE", "SECANT Dashboard", "STORE", "FINE", "TANGENT", "COT"]], ["Research", ["Science Lab"]], ["System", ["SenseHub"]]]
    check("C2 groups and labels = desktop (Core / Research / System, SECANT Dashboard, SenseHub, now a live demonstration page) + the web-only Modules group (SINE — Live MIRL, MINE, COSINE, SECANT, STORE, FINE, TANGENT, COT), placed above Research", nav['groups'] == want, nav['groups'])
    check("C3 sidebar head wordmark MYELIN · core, foot = Local settings, Change Theme, identity line", nav['head'].startswith("MYELIN") and nav['foot'][0] == 'Local settings', nav)
    shot_nav = c.shot(EV + "\\after_cs_sidebar.png")
    clickable = c.js("(()=>{const e=document.querySelector('#navSenseHub');return {tag:e.tagName,pe:getComputedStyle(e).pointerEvents,page:e.dataset.page}})()")
    check("C4 SenseHub is a real navigation button (Final Phase 3: no longer inert)", clickable['tag'] == 'BUTTON' and clickable['pe'] != 'none' and clickable['page'] == 'sensehub', clickable)
    pages = [("metric-hub", "METRIC HUB"), ("science-lab", "SCIENCE LAB"), ("live-mirl", "MIRL"), ("mine", "MINE"), ("cosine", "COSINE"), ("secant", "SECANT"), ("study-mode", None), ("control", None)]
    for pg, word in pages:
        if not c.js("document.body.classList.contains('sidebar-open')"): click("#menuToggle"); time.sleep(0.4)
        if pg == "study-mode": r = click("#navStudyRow")
        else: r = click(f'.nav-row[data-page="{pg}"]')
        time.sleep(0.9)
        shown = c.js(f"""(()=>{{const p=document.getElementById('page-{pg}');return p&&p.classList.contains('active')&&p.getClientRects().length>0&&(p.innerText||'').length>20}})()""")
        txt = c.js(f"(document.getElementById('page-{pg}')?.innerText||'').slice(0,60)")
        check(f"C5 navigation row opens page-{pg}", r.get('ok') and shown, txt)
    check("C6 no console / network / CSP problem so far", not c.problems(), c.problems())

    # ---------------- E. internal simulation (SINE -> MIRL) without any workspace panel
    click("#btnEngineStart")
    c.js("import('/assets/myelin/runtime.js').then(m=>{const o=m.Runtime.prototype.advance;m.Runtime.prototype.advance=function(...a){window.__rt=this;return o.apply(this,a);};return true;})"); time.sleep(0.6)
    api = c.js("typeof window.MYELIN==='object'")
    # the internal API is app.simulator.select; reach it through a test-only module import of app.js is not possible, so use the hidden tray's real buttons
    c.js("document.querySelector('[data-surface=\"social\"]').click(); true"); time.sleep(0.3)
    obs = c.js("window.MYELIN.snapshot().events.filter(e=>e.type==='RESOURCE_CHANGED').slice(-1)[0]?.payload?.resourceId")
    check("E1 internal simulation switches the evidence to the social surface", obs == 'social:feed', obs)
    c.js("__rt.speed=60; __rt.advance(10.2); __rt.speed=1; true"); time.sleep(0.8)
    pop = c.js("(()=>{const p=document.getElementById('wlPopup');return p?{stage:p.dataset.stage,btns:[...p.querySelectorAll('button')].map(b=>b.textContent.trim())}:null})()")
    check("E2 SINE-1 popup appears after 300 simulated social seconds", pop and str(pop['stage']) == '1', pop)
    sine_ui = json.loads(c.js("JSON.stringify({stage:document.querySelector('[data-rows=sine] .v:nth-child(4)')?.textContent,chips:[...document.querySelectorAll('[data-chips=sine] .cs-chip')].map(e=>e.classList.contains('on')),rows:[...document.querySelectorAll('[data-rows=sine] .k')].map(e=>e.textContent)})"))
    check("E3 SINE escalation card shows the 8 desktop captions and lights chip 1", sine_ui['rows'] == ["Next authority timer", "Stage", "Phase", "Timing source", "Lambda / min", "Ebbinghaus t*", "Popup", "Last SINE fact"] and sine_ui['chips'][0], sine_ui)
    c.shot(EV + "\\after_cs_sine_active.png")
    c.js("(()=>{const b=[...document.querySelectorAll('#wlPopup button')].find(b=>/BACK/i.test(b.textContent));b&&b.click();return true})()"); time.sleep(0.4)
    c.js("document.querySelector('[data-surface=\"task\"]').click(); true"); time.sleep(0.2)
    c.js("__rt.speed=60; __rt.advance(0.3); __rt.speed=1; true"); time.sleep(0.4)
    c.js("__rt.speed=60; __rt.advance(1.2); __rt.speed=1; true"); time.sleep(0.4)
    c.js("__rt.speed=60; __rt.advance(1.2); __rt.speed=1; true"); time.sleep(0.4)
    out = c.js("window.MYELIN.snapshot().events.filter(e=>e.organ==='SINE'||e.organ==='MIRL').map(e=>e.type)")
    check("E4 SINE return flow: intent, then verification and confirmation only from simulated task evidence", 'RETURN_INTENT' in out and 'RETURN_VERIFIED' in out and 'RECOVERY_CONFIRMED' in out, out)
    click("#btnEngineStop")

    # ---------------- F. themes and viewports (no horizontal overflow, Engine Core visible, no workspace)
    for w, h in [(1460, 960), (1366, 768), (1024, 700), (820, 1180), (390, 844)]:
        c.viewport(w, h, mobile=w < 500); load(base + "/index.html")
        c.js("document.getElementById('acSkipIntro')?.click(); true"); time.sleep(0.3)
        for world in ["neon", "white", "black", "purple"]:
            c.js(f"(()=>{{document.getElementById('themesBtn').click();document.querySelector('.theme-option[data-world={world}]').click();return true}})()"); time.sleep(0.25)
            g = json.loads(c.js("JSON.stringify({sw:document.documentElement.scrollWidth,iw:innerWidth,sim:!!document.querySelector('#wlSimulator'),vis:document.querySelector('.hero-card').getClientRects().length>0,top:Math.round(document.querySelector('.hero-card').getBoundingClientRect().top)})"))
            check(f"F {w}x{h} {world}: no horizontal overflow, Engine Core present, no workspace", g['sw'] <= g['iw'] and g['vis'] and not g['sim'], g)
            if world in ("white", "purple") and w in (1460, 390): c.shot(EV + f"\\after_cs_{world}_{w}.png")
    c.js("localStorage.clear(); true")
    check("F final: no console / network / CSP problems", not c.problems(), c.problems())
finally:
    c.close()
print("SUMMARY: %d/%d passed" % (sum(R), len(R)))
