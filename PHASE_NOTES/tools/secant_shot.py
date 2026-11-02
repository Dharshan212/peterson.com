import sys, time
SP = r"C:\Users\Dharshan\AppData\Local\Temp\claude\C--Users-Dharshan-Downloads-MYELIN-2-0-MYELIN\8d81323d-bb07-4440-9d6c-c8e58f4e8b06\scratchpad"
sys.path.insert(0, SP)
from cdp import Chrome
EV = r"C:\Users\Dharshan\Downloads\Peterson.com_MYELIN_WORKING\PHASE_NOTES\evidence"
base, prefix = sys.argv[1], sys.argv[2]
world = sys.argv[3] if len(sys.argv) > 3 else "neon"
data = len(sys.argv) > 4 and sys.argv[4] == "data"
c = Chrome(port=9553)

def adv(sec, speed=60):
    c.js(f"__rt.speed={speed}; __rt.advance({sec}); __rt.speed=1; true")

try:
    c.viewport(1460, 960)
    c.goto(base + "/index.html", 0.5)
    for _ in range(80):
        if c.js("typeof window.MYELIN==='object' && !!document.getElementById('csPrev')"): break
        time.sleep(0.25)
    time.sleep(3.5)
    c.js("document.getElementById('acSkipIntro')?.click(); true"); time.sleep(1.0)
    c.js(f"(()=>{{document.getElementById('themesBtn').click();document.querySelector('.theme-option[data-world={world}]').click();return true}})()")
    for _ in range(40):
        if c.js("!!document.querySelector('[data-surface=\"streamA\"]')"): break
        time.sleep(0.25)
    if data:
        c.js("document.getElementById('btnEngineStart').click(); true"); time.sleep(0.4)
        c.js("import('/assets/myelin/runtime.js').then(m=>{const o=m.Runtime.prototype.advance;m.Runtime.prototype.advance=function(...a){window.__rt=this;return o.apply(this,a);};return true;})"); time.sleep(0.6)
        c.js("document.querySelector('[data-surface=\"task\"]').click(); true"); adv(1, 1); time.sleep(0.3)
        c.js("__rt.command('STUDY','prepare',{subject:'Databases',task:'Normalisation notes',studyMinutes:60,breakMinutes:5,resourceId:'study:primary'}); __rt.command('STUDY','start'); true"); time.sleep(0.3)
        c.js("document.querySelector('[data-surface=\"study\"]').click(); true"); adv(1, 1); adv(20, 1); time.sleep(0.3)
        c.js("document.querySelector('[data-surface=\"streamA\"]').click(); true"); adv(5.3); time.sleep(1.8)
        c.js("(()=>{const b=[...document.querySelectorAll('#wlPopup button')].find(b=>/RETURN/i.test(b.textContent));b&&b.click();return !!b})()"); time.sleep(0.4)
        c.js("document.querySelector('[data-surface=\"study\"]').click(); true")
        for _ in range(4):
            adv(1.4); time.sleep(0.5)
        time.sleep(0.8)
        c.js("__rt.command('STUDY','break'); true"); time.sleep(0.4)
        adv(5.3); time.sleep(1.0)
        c.js("document.querySelector('[data-surface=\"study\"]').click(); true"); adv(1,1); adv(4,1); time.sleep(0.6)
    c.js("document.querySelector('.nav-row[data-page=secant]').click(); true"); time.sleep(1.2)
    c.shot(EV + f"\\{prefix}_secant_page_{world}.png", full=True)
    c.js("document.getElementById('sqOpen').click(); true"); time.sleep(0.6)
    routes = [("overview", None), ("episodes", "distraction"), ("distraction_history", "distraction"), ("study_history", "study"), ("evidence", "study"), ("about", "about"), ("cosecant", "cosecant")]
    for route, group in routes:
        if route == "cosecant":
            c.js("document.querySelector('#sqDash .sq-face .sq-tab[data-k=cosecant]').click(); true")
        elif route == "overview":
            c.js("document.querySelector('#sqDash .sq-face .sq-tab[data-k=secant]').click(); true")
        else:
            if group:
                c.js(f"document.querySelector('#sqDash .sq-nav .sq-tab[data-k={group}]').click(); true"); time.sleep(0.25)
            if route not in ("about",):
                c.js(f"document.querySelector('#sqDash .sq-sub .sq-tab[data-k={route}]').click(); true")
        time.sleep(0.5)
        c.shot(EV + f"\\{prefix}_secant_{route}_{world}.png")
    # history routes
    c.js("document.querySelector('#sqDash .sq-nav .sq-tab[data-k=distraction]').click(); true"); time.sleep(0.2)
    c.js("document.getElementById('sqHist_past_secant_episodes').click(); true"); time.sleep(0.4)
    c.shot(EV + f"\\{prefix}_secant_past_secant_{world}.png")
    if data:
        c.js("(()=>{const s=document.getElementById('sqSecDate');s.value=s.options[1].value;s.dispatchEvent(new Event('change'));return true})()"); time.sleep(0.4)
        c.js("document.querySelector('#sqSecList tbody tr').click(); true"); time.sleep(0.3)
        c.js("document.getElementById('sqSecView').click(); true"); time.sleep(0.5)
        c.shot(EV + f"\\{prefix}_secant_past_secant_flow_{world}.png")
    c.js("document.querySelector('#sqDash .sq-nav .sq-tab[data-k=study]').click(); true"); time.sleep(0.2)
    c.js("document.getElementById('sqHist_past_study_sessions').click(); true"); time.sleep(0.4)
    c.shot(EV + f"\\{prefix}_secant_past_study_{world}.png")
    if data:
        c.js("(()=>{const s=document.getElementById('sqStDate');s.value=s.options[1].value;s.dispatchEvent(new Event('change'));return true})()"); time.sleep(0.4)
        c.js("document.querySelector('#sqStList tbody tr').click(); true"); time.sleep(0.3)
        c.js("document.getElementById('sqStView').click(); true"); time.sleep(0.5)
        c.shot(EV + f"\\{prefix}_secant_past_study_map_{world}.png")
    print(c.problems())
finally:
    c.close()
