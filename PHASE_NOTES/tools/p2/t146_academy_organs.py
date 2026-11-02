"""t146 - MYELIN Academy ORGAN tutorials as conversations (pass 3).
For each organ: the visitor DOES NOTHING (patient driver): the Academy runs the whole tutorial by itself (presses the real controls and popup buttons, shows the dashboard, closes it) and reaches the closing letter.
Plus one "I'll try" (manual) run for MINE: the visitor is told what to press, with the arrow on the button, and a popup the visitor must answer stays visible.
usage: t146_academy_organs.py <base_url> <chrome_port> [organ ...]   (default: all six)"""
import os, sys, json, time
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
from academy_driver import Driver  # noqa: E402
base, cport = sys.argv[1], int(sys.argv[2])
ORGANS = sys.argv[3:] or ["sine", "mine", "cosine", "store", "fine", "tangent"]
PRE = {"sine": "si.", "mine": "mi.", "cosine": "co.", "store": "sto.", "fine": "fi.", "tangent": "tn."}
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:900])
site = Site(base, cport); J = site.J; jl = site.jl
def launch():
    site.load(); J("document.getElementById('acLauncher').click(); true"); time.sleep(0.4); J("document.getElementById('acJourney').click(); true"); time.sleep(1.2)
try:
    for organ in ORGANS:
        launch(); d = Driver(site); d.choices = {"stu.gate": "no", "cos.gate": "no"}; steps = []
        def on_step(sid, st):
            steps.append(sid)
            if sid == "pick.organ": d.patient = True
        try: d.run(organ, on_step); ok = True; err = ""
        except Exception as e: ok = False; err = str(e)
        mine = [s for s in steps if s.startswith(PRE[organ])]
        check(f"OR.{organ}.plays_itself", f"{organ.upper()}: a visitor who does nothing: the Academy asks the automated / manual question, presses every control and popup button itself, opens and closes the dashboard, and reaches the closing letter", ok and len(mine) >= 9 and mine[0].endswith(".mode") and steps[-1] == "let.final", (len(mine), steps[-3:], err))
    # ---- manual (I'll try) for MINE
    if "mine" in ORGANS:
        launch(); dm = Driver(site); dm.choices = {"stu.gate": "no", "cos.gate": "no", "mi.mode": "no"}; seen = {}; stepsM = []
        def on_m(sid, st):
            stepsM.append(sid)
            if sid in ("mi.chat", "mi.m1resp"):
                time.sleep(0.6)
                seen[sid] = jl("({phase:document.getElementById('acRoot').dataset.phase,say:document.getElementById('acSay').textContent,arrow:!!document.querySelector('.acj-arrow:not([hidden])'),pop:(()=>{const p=document.querySelector('#wlDemoStage .wl-pp');return p?getComputedStyle(p).opacity:null})()})")
            if sid == "pick.organ": pass
        try: dm.run("mine", on_m); okm = True; errm = ""
        except Exception as e: okm = False; errm = str(e)
        c, r = seen.get("mi.chat", {}), seen.get("mi.m1resp", {})
        check("OR.mine.manual_chat", "I'LL TRY: the visitor is told to press WHATSAPP and the arrow is on the button (popup hidden)", okm and c.get("phase") == "act" and c.get("say") == "Press WHATSAPP." and c.get("arrow"), (c, errm))
        check("OR.mine.manual_popup_visible", "I'LL TRY: when the visitor must answer a popup (MINE-1) the popup stays visible and the guide asks for it", r.get("phase") == "act" and r.get("pop") not in ("0", None) and "I WILL COME BACK" in r.get("say", ""), r)
        check("OR.mine.manual_reaches_end", "I'LL TRY: the whole MINE tutorial can be completed by the visitor and reaches the closing letter", okm and stepsM[-1] == "let.final", (stepsM[-3:], errm))
finally:
    site.close()
print(f"SUMMARY: {PASS}/{PASS + FAIL} passed")
