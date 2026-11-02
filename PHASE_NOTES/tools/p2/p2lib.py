"""Shared helpers for the Phase 2A tests: drive the REAL website (release headers, real Settings button, native file chooser) and compare what the SECANT page renders
with the DESKTOP's own output (gold_dump.py -> DashboardIntegration._prepare_model) for the same file, session and time zone."""
import json, os, subprocess, sys, time

TOOLS = os.path.dirname(os.path.abspath(__file__))
SP = r"C:\Users\Dharshan\AppData\Local\Temp\claude\C--Users-Dharshan-Downloads-MYELIN-2-0-MYELIN\8d81323d-bb07-4440-9d6c-c8e58f4e8b06\scratchpad"
sys.path.insert(0, SP)
from cdp import Chrome  # noqa: E402

GOLD = os.path.join(TOOLS, "..", "gold_dump.py")

OPS_SCRIPT = ("(()=>{window.__ops=[];const o=Worker.prototype.postMessage;Worker.prototype.postMessage=function(m,...r){try{window.__ops.push(m&&m.op)}catch(e){};return o.call(this,m,...r)};})();")
JS_HELPERS = r"""
window.__sq = {
  T: e => (e ? e.textContent : null),
  tone: n => ((n.className.match(/t-(\w+)/) || [])[1]),
  landing() {
    const q = s => document.querySelector(s), T = this.T, st = q('#sqStatus');
    if (!st) return null;
    return {status: [T(st.querySelector('.sq-cap')), T(st.querySelector('.sq-msg')), T(st.querySelector('.sq-state')), this.tone(st.querySelector('.sq-msg'))],
      recent: {id: T(q('#sqRecent .sq-rl .sq-mono')), source: T(q('#sqRecent .sq-rs b')), badges: [...document.querySelectorAll('#sqRecent .sq-rs .sq-badge')].map(T), fields: [...document.querySelectorAll('#sqRecent .sq-rf b')].map(T)},
      tiles: [...document.querySelectorAll('#sqTiles .sq-tile')].map(t => [T(t.querySelector('.sq-tl')), T(t.querySelector('.sq-tv')), T(t.querySelector('.sq-tn'))]),
      behaviour: [T(q('#sqBehaviour .sq-path b')), T(q('#sqBehaviour .sq-path .sq-mono')), T(q('#sqBehaviour .sq-bs')), T(q('#sqBehaviour .sq-bo'))],
      events: [...document.querySelectorAll('#sqLatest .sq-evl')].map(r => [T(r.querySelector('.e')), T(r.querySelector('.s')), T(r.querySelector('.t'))]),
      flow: [...document.querySelectorAll('#sqFlow .sq-node')].map(n => [T(n.querySelector('.c')), T(n.querySelector('.n')), T(n.querySelector('.i')), T(n.querySelector('.s')), this.tone(n)]),
      banner: T(q('#sqBanner'))};
  },
  blocks() {
    const out = [], T = this.T, tone = this.tone;
    for (const e of document.querySelectorAll('#sqBody .sq-metrics, #sqBody .sq-panel, #sqBody .sq-strip')) {
      if (e.matches('.sq-metrics')) out.push(['metrics', null, [...e.querySelectorAll('.sq-metric')].map(m => [T(m.querySelector('.sq-ml')), T(m.querySelector('.sq-mv')), T(m.querySelector('.sq-mn'))])]);
      else if (e.matches('.sq-strip')) out.push(['strip', null, [...e.children].map(x => [T(x.querySelector('.k')), T(x.querySelector('b'))])]);
      else if (e.matches('.sq-fp')) out.push(['flow', T(e.querySelector('.sq-pt')), [...e.querySelectorAll('.sq-node')].map(n => [T(n.querySelector('.c')), T(n.querySelector('.n')), T(n.querySelector('.i')), T(n.querySelector('.s')), tone(n)])]);
      else if (e.matches('.sq-tp')) out.push(['table', T(e.querySelector('.sq-pt')), [...e.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.textContent))]);
      else if (e.querySelector('.sq-kv')) { const kv = [...e.querySelector('.sq-kv').children], pairs = []; for (let i = 0; i < kv.length; i += 2) pairs.push([T(kv[i]), T(kv[i + 1])]); out.push(['kv', T(e.querySelector('.sq-pt')), pairs]); }
      else out.push(['panel', T(e.querySelector('.sq-pt')), T(e)]);
    }
    return out;
  },
  bar() {
    const b = document.getElementById('dbSourceBar'); if (!b) return null;
    return {hidden: b.hidden, cls: b.className, tag: (b.querySelector('.dbs-tag') || {}).textContent || null, scope: (document.getElementById('dbsScope') || {}).textContent || null,
      wal: !!document.getElementById('dbsWal'), file: (b.querySelector('.dbs-file') || {}).textContent || null, status: (document.getElementById('dbsStatus') || {}).textContent || null,
      suggest: (document.getElementById('dbsSuggest') || {}).textContent || null, suggestBtn: (document.getElementById('dbsSuggestBtn') || {}).textContent || null,
      options: [...document.querySelectorAll('#dbsSession option')].map(o => [o.value, o.textContent]), selected: (document.getElementById('dbsSession') || {}).value || null, text: b.innerText};
  }
};
true;
"""


class Site:
    def __init__(self, base, cport, shots=None):
        self.base = base; self.c = Chrome(port=cport); self.J = self.c.js; self.shots = shots
        self.c.call("Page.addScriptToEvaluateOnNewDocument", source=OPS_SCRIPT)
        self.c.call("Page.setInterceptFileChooserDialog", enabled=True)
    def jl(self, expr, t=120): return json.loads(self.J(f"(async()=>JSON.stringify(await ({expr})))()", timeout_s=t))
    def wait(self, cond, secs=60, step=0.2):
        end = time.time() + secs
        while time.time() < end:
            if self.J(cond): return True
            time.sleep(step)
        return False
    def load(self):
        self.c.viewport(1440, 900); self.c.goto(self.base + "/index.html", 0.5)
        self.wait("typeof window.MYELIN==='object' && !document.getElementById('mLoadingOverlay')?.classList.contains('open')", 60)
        time.sleep(1.2); self.J("document.getElementById('acSkipIntro')?.click(); true"); time.sleep(0.3)
        self.J(JS_HELPERS)
    def real_click(self, sel):
        r = json.loads(self.J("(()=>{const b=document.querySelector(%s).getBoundingClientRect();return JSON.stringify([b.x+b.width/2,b.y+b.height/2])})()" % json.dumps(sel)))
        for typ in ("mousePressed", "mouseReleased"): self.c.call("Input.dispatchMouseEvent", type=typ, x=r[0], y=r[1], button="left", clickCount=1)
    def chooser(self):
        for _ in range(60):
            self.J("1")
            for e in self.c.events:
                if e["method"] == "Page.fileChooserOpened": return e["params"]
            time.sleep(0.15)
    def ops(self): return self.jl("window.__ops.slice()")
    def open_db(self, path, settle=True):
        """Settings -> OPEN DB FILE -> native chooser -> wait for the Explorer (or its refusal) -> close the Explorer. Returns True when the file opened."""
        self.c.events.clear()
        if not self.J("!!document.getElementById('wlOpenDbFile')"):
            self.J("document.querySelector('.wl-modal')?.remove()"); self.J("document.getElementById('scGear').click()"); self.wait("!!document.getElementById('wlOpenDbFile')", 10)
        self.real_click("#wlOpenDbFile"); ch = self.chooser()
        self.c.events.clear(); self.c.call("DOM.setFileInputFiles", files=[path], backendNodeId=ch["backendNodeId"])
        self.wait("!!document.querySelector('.dbx .dbx-file') || !!document.querySelector('.dbx .dbx-bad')", 90)
        opened = bool(self.J("!!document.querySelector('.dbx .dbx-file')"))
        self.J("[...document.querySelectorAll('.dbx button')].find(b=>b.textContent==='CLOSE')?.click(); true"); time.sleep(0.2)
        return opened
    def remove_db(self):
        if not self.J("!!document.getElementById('wlRemoveDb')"):
            self.J("document.querySelector('.wl-modal')?.remove()"); self.J("document.getElementById('scGear').click()"); self.wait("!!document.getElementById('wlRemoveDb') || !!document.getElementById('wlOpenDbFile')", 10)
        if self.J("!!document.getElementById('wlRemoveDb')"): self.J("document.getElementById('wlRemoveDb').click(); true")
        self.wait("!document.getElementById('navDbFile') && !document.querySelector('.wl-modal')", 20); time.sleep(0.3)
    def goto_page(self, key):
        self.J(f"document.querySelector('.nav-row[data-page={key}]').click(); true"); self.wait(f"document.getElementById('page-{key}').classList.contains('active')", 10); time.sleep(0.4)
    def secant_state(self):
        return self.jl("({notice:(document.getElementById('sqImportNotice')||{}).textContent||null, banner:(document.getElementById('sqBanner')||{}).textContent||null})")
    def wait_secant(self, banner=None, secs=40):
        """Wait until the SECANT page is rendered from a settled model (banner present and no 'Reading' notice), optionally for a given banner text."""
        end = time.time() + secs; last = None
        while time.time() < end:
            s = self.secant_state()
            if s["banner"] is not None and (banner is None or s["banner"] == banner):
                time.sleep(0.25)
                if self.secant_state() == s: return s
            elif s["notice"] and "Reading" not in s["notice"]: return s
            time.sleep(0.2)
        return self.secant_state()
    def select_session(self, sid):
        self.J(f"(()=>{{const s=document.getElementById('dbsSession');s.value={json.dumps(str(sid))};s.dispatchEvent(new Event('change'));return true}})()"); time.sleep(0.2)
    def set_zone(self, iana):
        self.J("document.querySelector('.wl-modal')?.remove(); document.getElementById('scGear').click(); true"); self.wait("!!document.querySelector('.wl-modal select[aria-label=Timezone]')", 10)
        self.J(f"(()=>{{const z=document.querySelector('.wl-modal select[aria-label=Timezone]');z.value={json.dumps(iana)};return z.value}})()")
        self.J("[...document.querySelectorAll('.wl-modal button')].find(b=>b.textContent==='SAVE PREFERENCES').click(); true"); time.sleep(0.4)
    def close(self): self.c.close()


def golden(db, tz, sids, tmp):
    out = os.path.join(tmp, f"gold_{abs(hash((db, tz, tuple(sids))))}.json")
    env = dict(os.environ, PYTHONIOENCODING="utf-8")
    r = subprocess.run([sys.executable, "-B", "-X", "utf8", GOLD, db, out, tz] + [str(s) for s in sids], capture_output=True, text=True, env=env)
    if r.returncode: raise RuntimeError(r.stderr[-300:])
    return json.load(open(out, encoding="utf-8"))


# ---- expectations built from the DESKTOP model (independent of the JavaScript mapper) ----
kv = lambda rows: [[str(k).upper(), v] for k, v in rows]
five = lambda nodes: [list(n[:5]) for n in nodes]
def exp_landing(m):
    L, c = m["landing"], m["context"]
    r = L["recent_episode"]
    return {"status": list(L["status"]), "recent": {"id": r[0][1], "source": r[1][1], "badges": list(L["recent_badges"]), "fields": [r[i][1] for i in (2, 3, 4, 5)]},
            "tiles": [list(t) for t in L["metrics"]], "behaviour": list(L["behaviour"]), "events": [[e[2], e[3], e[1]] for e in L["latest_events"]], "flow": five(L["journey"]), "banner": c["source_banner"]}
def exp_routes(m):
    O, E, D, S, V, C = m["overview"], m["episodes"], m["distraction_history"], m["study_history"], m["study_evidence"], m["cosecant"]
    return {
        "overview": [("metrics", O["metrics"]), ("kv", kv(O["recent_episode"])), ("kv", kv(O["study_snapshot"])), ("table", O["latest_events"]), ("kv", kv(O["insights"])), ("flow", five(O["journey"]))],
        "episodes": [("metrics", E["metrics"]), ("table", E["rows"]), ("kv", kv(E["recent_episode"])), ("flow", five(E["flow"]))],
        "distraction_history": [("metrics", D["metrics"]), ("table", D["rows"]), ("kv", kv(D["attributes"])), ("flow", five(D["flow"]))],
        "study_history": [("metrics", S["metrics"]), ("table", S["rows"]), ("flow", five(S["jump_nodes"]))],
        "evidence": [("metrics", V["metrics"]), ("table", V["rows"]), ("kv", kv(V["attributes"])), ("flow", five(V["confirmation_nodes"]))],
        "cosecant": [("strip", [list(x) for x in C["main_summary"]]), ("strip", [list(x) for x in C["recent_break"]]), ("metrics", C["metrics"]), ("kv", kv(C["break_history"])),
                     ("table", C["events"]), ("table", C["return_history"]), ("flow", five(C["flow"]))]}
def first_diff(got, want, path=""):
    if isinstance(want, list) and isinstance(got, list):
        if len(got) != len(want): return f"{path}: length {len(got)} != {len(want)}"
        for i, (g, w) in enumerate(zip(got, want)):
            d = first_diff(g, w, f"{path}[{i}]")
            if d: return d
        return None
    return None if got == want else f"{path}: page {str(got)[:40]!r} != desktop {str(want)[:40]!r}"
def compare_blocks(got, want, private):
    if [b[0] for b in got] != [w[0] for w in want]: return f"block types {[b[0] for b in got]} != {[w[0] for w in want]}"
    for i, (g, w) in enumerate(zip(got, want)):
        d = first_diff(g[2], w[1], f"block{i}({g[0]})")
        if d: return re_private(d, private)
    return None
def re_private(d, private):
    if not private: return d
    return d.split(": page")[0] + ": values differ (not printed: real data)"
