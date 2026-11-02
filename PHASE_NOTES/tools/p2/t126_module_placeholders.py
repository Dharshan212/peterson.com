"""STORE / FINE / TANGENT / COT reserved pages: four left-menu entries (group "Modules"), each opening an empty reserved page; nothing else changes.
With a database file open these pages carry no data-source claim; the existing dashboards still do. usage: t126_module_placeholders.py <base_url> <chrome_port> <db>"""
import os, sys, time
TOOLS = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, TOOLS)
from p2lib import Site  # noqa: E402
base, cport, db = sys.argv[1], int(sys.argv[2]), sys.argv[3]
PASS = FAIL = 0
def check(cid, name, ok, detail=""):
    global PASS, FAIL
    if ok: PASS += 1; print("PASS", cid, name)
    else: FAIL += 1; print("FAIL", cid, name, str(detail)[:400])
MODS = [("store", "STORE"), ("fine", "FINE"), ("tangent", "TANGENT"), ("cot", "COT")]
RESERVED = [m for m in MODS if m[0] not in ("store", "fine", "tangent", "cot")]   # all four modules have their own pages now (t127-t130): no reserved page remains
site = Site(base, cport); J = site.J
try:
    site.load()
    groups = site.jl("[...document.querySelectorAll('.nav-group')].map(g=>[g.querySelector('.nav-group-title').textContent,[...g.querySelectorAll('.nav-row')].map(r=>r.querySelector('.nav-row-label').textContent)])")
    check("M1.menu", "left menu has a Modules group with STORE, FINE, TANGENT, COT above Research and System, after the four organ pages", [g[0] for g in groups] == ["Core", "Modules", "Research", "System"] and groups[1][1][4:] == [t for _, t in MODS], groups)
    check("M2.existing_menu_unchanged", "Core / Research / System entries are unchanged", groups[0][1] == ["Control", "Study Mode", "Metric Hub"] and groups[1][1][:4] == ["SINE — Live MIRL", "MINE", "COSINE", "SECANT Dashboard"] and groups[2][1] == ["Science Lab"] and groups[3][1][0] == "SenseHub", groups)
    for k, t in RESERVED:
        site.goto_page(k); time.sleep(0.3)
        st = site.jl("({active:[...document.querySelectorAll('.main > .page.active')].map(e=>e.id),h:(document.querySelector('#page-%s h1')||{}).textContent,cur:document.querySelector('.nav-row[data-page=\"%s\"]').getAttribute('aria-current'),text:document.getElementById('page-%s').innerText})" % (k, k, k))
        check(f"M3.{k}", f"{t}: only its own page is active, titled {t}, menu row current, reserved text only", st["active"] == [f"page-{k}"] and st["h"] == t and st["cur"] == "page" and "reserved" in st["text"] and len(st["text"]) < 120, st)
    assert site.open_db(db), "fixture did not open"
    for k, t in RESERVED:
        site.goto_page(k); time.sleep(0.3)
        bar = site.jl("(()=>{const b=document.getElementById('dbSourceBar');return !b||b.hidden})()")
        check(f"M4.{k}_no_source_claim", f"{t} with a database file open: no data-source bar and no data shown", bar)
    site.goto_page("mine"); time.sleep(0.8)
    check("M5.connected_dashboard_still_labelled", "a connected dashboard (MINE) still carries the imported-file bar", site.jl("(document.getElementById('dbsTag')||{}).textContent") == "IMPORTED DB FILE SNAPSHOT")
    site.goto_page("control"); time.sleep(0.3)
    check("M6.unconnected_still_labelled", "an unconnected dashboard (Control) still says SIMULATION — NOT FROM IMPORTED DB", "SIMULATION" in (site.jl("(document.getElementById('dbsTag')||{}).textContent") or ""))
    site.remove_db()
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("M7.console", "no console error, CSP violation or failed request", not probs, probs[:3])
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
