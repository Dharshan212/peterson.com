"""SECANT page + glass SECANT Deep Analysis (9 routes + COSECANT face): idle text compared line by line with the desktop dumps, then real local Study/SECANT/COSECANT events fill every route.
usage: t54_secant.py <base_url> [port]"""
import sys, time, json, re, ast
sys.stdout.reconfigure(encoding="utf-8")
SP = r"C:\Users\Dharshan\AppData\Local\Temp\claude\C--Users-Dharshan-Downloads-MYELIN-2-0-MYELIN\8d81323d-bb07-4440-9d6c-c8e58f4e8b06\scratchpad"
sys.path.insert(0, SP)
from cdp import Chrome
EV = r"C:\Users\Dharshan\Downloads\Peterson.com_MYELIN_WORKING\PHASE_NOTES\evidence"
DK = EV + r"\desktop"
base = sys.argv[1]
port = int(sys.argv[2]) if len(sys.argv) > 2 else 9690
R = []


def check(n, ok, d=""):
    R.append(bool(ok))
    print(("PASS " if ok else "FAIL ") + n + (f"  [{d}]" if d else ""))


c = Chrome(port=port)
J = c.js


def load(w=1.0):
    c.goto(base + "/index.html", 0.5)
    for _ in range(80):
        if J("typeof window.MYELIN==='object' && !!document.getElementById('csPrev')"):
            break
        time.sleep(0.25)
    time.sleep(w + 1.5)
    J("document.getElementById('acSkipIntro')?.click(); true")
    time.sleep(0.5)


def open_page():
    J("document.querySelector('.nav-row[data-page=secant]').click(); true"); time.sleep(1.0)


def jl(expr):
    return json.loads(J(f"JSON.stringify({expr})"))


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def click(sel):
    J(f"document.querySelector({json.dumps(sel)}).click(); true"); time.sleep(0.3)


def go(route):
    """Drive the real controls to a route."""
    if route == "overview": click("#sqDash .sq-face .sq-tab[data-k=secant]")
    elif route == "cosecant": click("#sqDash .sq-face .sq-tab[data-k=cosecant]")
    elif route == "about": click("#sqDash .sq-nav .sq-tab[data-k=about]")
    elif route in ("episodes", "distraction_history", "past_secant_episodes"):
        click("#sqDash .sq-nav .sq-tab[data-k=distraction]")
        if route == "distraction_history": click("#sqDash .sq-sub .sq-tab[data-k=distraction_history]")
        if route == "past_secant_episodes": click("#sqHist_past_secant_episodes")
    elif route in ("study_history", "evidence", "past_study_sessions"):
        click("#sqDash .sq-nav .sq-tab[data-k=study]")
        if route == "evidence": click("#sqDash .sq-sub .sq-tab[data-k=evidence]")
        if route == "past_study_sessions": click("#sqHist_past_study_sessions")


def dump(name):
    """Visible strings of a desktop render: labels, buttons, table headers, combo items."""
    out = []
    for line in open(f"{DK}\\{name}_dump.txt", encoding="utf-8").read().splitlines():
        parts = line.split("|")
        if parts[0] == "L":
            m = re.match(r"^L\|[^|]*\|'(.*)'$", line)
            if m: out.append(m.group(1))
        elif parts[0] == "B":
            m = re.match(r"^B\|[^|]*\|'(.*?)'\|checkable", line)
            if m: out.append(m.group(1))
        elif parts[0] == "T":
            out += ast.literal_eval(line.split("|", 3)[2])
        elif parts[0] == "C":
            out += ast.literal_eval(line.split("|", 2)[2])
    return [x for x in out if x not in ("", "\u25cf", "\u00d7")]


SKIP = {"Read-only MYELIN database projection", "Static Python demonstration fixture only"}


def parity(name, root):
    text = norm(J(f"document.querySelector({json.dumps(root)}).innerText"))
    low = text.lower()
    miss = [s for s in dump(name) if s not in SKIP and norm(s).lower() not in low]
    return miss


def adv(x, speed=60):
    J(f"__rt.speed={speed}; __rt.advance({x}); __rt.speed=1; true"); time.sleep(0.6)


def surface(k):
    J(f"document.querySelector('[data-surface=\"{k}\"]').click(); true"); time.sleep(0.2)


def key(k, code):
    c.call("Input.dispatchKeyEvent", type="keyDown", key=k, code=k, windowsVirtualKeyCode=code)
    c.call("Input.dispatchKeyEvent", type="keyUp", key=k, code=k, windowsVirtualKeyCode=code)
    time.sleep(0.3)


def rows(sel):
    return jl(f"[...document.querySelectorAll({json.dumps(sel)} + ' tbody tr')].map(r=>[...r.children].map(x=>x.innerText.replace(/\\n/g,' ')))")


def kv(scope):
    return jl(f"[...document.querySelectorAll({json.dumps(scope)} + ' .sq-kv')].map(k=>[...k.children].map(x=>x.innerText))")


def tiles():
    return jl("[...document.querySelectorAll('#sqDash .sq-metric')].map(x=>[...x.children].map(y=>y.innerText))")


def nodes(sel):
    return jl(f"[...document.querySelectorAll({json.dumps(sel)} + ' .sq-node')].map(n=>({{tone:n.className.match(/t-(\\w+)/)[1],cat:n.querySelector('.c').textContent,name:n.querySelector('.n').textContent,info:n.querySelector('.i').textContent,stamp:n.querySelector('.s').textContent}}))")


try:
    c.viewport(1460, 960)
    load(1.5)
    open_page()
    # ------------------------------------------------------------ idle landing
    miss = parity("desktop_secant_landing", "#page-secant")
    check("T1 landing text matches the desktop landing render string by string (title, subtitle, REFRESH / OPEN DEEP ANALYSIS, status, recent episode, four tiles, behaviour, latest events, flow, footer)", not miss, miss)
    ids = jl("({page:!!document.querySelector('#page-secant .sq-page'),old:/WEB LOCAL DATA/.test(document.getElementById('page-secant').innerText),btns:[...document.querySelectorAll('.sq-head-a button')].map(b=>b.textContent),tiles:document.querySelectorAll('#sqTiles .sq-tile').length,tone:[...document.querySelectorAll('#sqTiles .sq-tile')].map(x=>x.className.match(/t-(\\w+)/)[1]),status:document.querySelector('#sqStatus .sq-msg').className,banner:document.getElementById('sqBanner').textContent,flow:document.querySelectorAll('#sqFlow .sq-node').length,evl:document.querySelectorAll('#sqLatest .sq-evl').length})")
    check("T2 landing is the new SECANT page (old generic organ page gone), tiles teal / green / purple / blue, status message cyan, no events or flow nodes, banner 'RECORDED EVIDENCE · No data'", ids['page'] and not ids['old'] and ids['btns'] == ['REFRESH', 'OPEN DEEP ANALYSIS'] and ids['tiles'] == 4 and ids['tone'] == ['teal', 'green', 'purple', 'blue'] and 't-cyan' in ids['status'] and ids['flow'] == 0 and ids['evl'] == 0 and ids['banner'] == 'RECORDED EVIDENCE \u00b7 No data', ids)
    c.shot(EV + "\\after_secant_idle_page.png", full=True)
    # ------------------------------------------------------------ idle dialog
    J("document.getElementById('sqOpen').click(); true"); time.sleep(0.6)
    d = jl("({role:document.getElementById('sqDash').getAttribute('role'),modal:document.getElementById('sqDash').getAttribute('aria-modal'),lab:document.getElementById('sqDash').getAttribute('aria-labelledby'),title:document.getElementById('sqTitle').textContent,focus:document.activeElement.className,blur:getComputedStyle(document.querySelector('.sq-shell')).backdropFilter,face:[...document.querySelectorAll('.sq-face .sq-tab')].map(x=>x.textContent+'|'+x.getAttribute('aria-selected')),nav:[...document.querySelectorAll('.sq-nav .sq-tab')].map(x=>x.textContent+'|'+x.getAttribute('aria-selected')),sub:document.querySelector('.sq-sub').hidden,exp:document.getElementById('sqExport').disabled,foot:document.getElementById('sqFootL').textContent})")
    check("T3 OPEN DEEP ANALYSIS opens a modal dialog 'SECANT — DEEP ANALYSIS' (role=dialog, aria-modal, labelled), focus on the close button, real glass", d['role'] == 'dialog' and d['modal'] == 'true' and d['lab'] == 'sqTitle' and d['title'] == 'SECANT \u2014 DEEP ANALYSIS' and 'glass-close' in d['focus'] and 'blur' in d['blur'], d)
    check("T4 faces SECANT (selected) / COSECANT; four nav groups OVERVIEW selected; sub-navigation hidden on Overview; EXPORT PDF enabled; footer 'SECANT · Overview Analysis'", d['face'] == ['SECANT|true', 'COSECANT|false'] and d['nav'] == ['OVERVIEW|true', 'DISTRACTION|false', 'STUDY|false', 'ABOUT|false'] and d['sub'] and not d['exp'] and d['foot'] == 'SECANT \u00b7 Overview Analysis', d)
    ROUTES = ["overview", "episodes", "distraction_history", "study_history", "evidence", "about", "cosecant", "past_secant_episodes", "past_study_sessions"]
    for i, r in enumerate(ROUTES):
        go(r)
        miss = parity(f"desktop_secant_dlg_{r}", "#sqDash")
        check(f"T{5 + i} idle route {r}: every string of the desktop render (headings, subtitles, labels, values, table headers, buttons, footer) is present", not miss, miss)
    c.shot(EV + "\\after_secant_idle_past_study.png")
    # route chrome: sub-navigation hint / visible buttons per route
    chrome = {}
    for r in ROUTES:
        go(r)
        chrome[r] = jl("({nav:[...document.querySelectorAll('.sq-nav .sq-tab.on')].map(x=>x.dataset.k),navHidden:document.querySelector('.sq-nav').hidden,sub:document.querySelector('.sq-sub').hidden,hint:document.querySelector('.sq-hint').textContent,subs:[...document.querySelectorAll('.sq-sub-t .sq-tab:not([hidden])')].map(x=>x.dataset.k+(x.classList.contains('on')?'*':'')),hist:[...document.querySelectorAll('.sq-sub .sq-btn.history:not([hidden])')].map(x=>x.dataset.k+(x.classList.contains('on')?'*':'')),face:document.querySelector('.sq-face .sq-tab.on').dataset.k,foot:document.getElementById('sqFootL').textContent})")
    ok = (chrome['overview']['sub'] and chrome['episodes']['subs'] == ['episodes*', 'distraction_history'] and chrome['episodes']['hint'] == 'DISTRACTION contains:' and chrome['episodes']['hist'] == ['past_secant_episodes']
          and chrome['distraction_history']['subs'] == ['episodes', 'distraction_history*'] and chrome['study_history']['subs'] == ['study_history*', 'evidence'] and chrome['study_history']['hint'] == 'STUDY contains:' and chrome['study_history']['hist'] == ['past_study_sessions']
          and chrome['evidence']['subs'] == ['study_history', 'evidence*'] and chrome['about']['sub'] and chrome['about']['nav'] == ['about'] and chrome['cosecant']['navHidden'] and chrome['cosecant']['sub'] and chrome['cosecant']['face'] == 'cosecant'
          and chrome['past_secant_episodes']['nav'] == ['distraction'] and chrome['past_secant_episodes']['hist'] == ['past_secant_episodes*'] and chrome['past_study_sessions']['nav'] == ['study'] and chrome['past_study_sessions']['hist'] == ['past_study_sessions*'])
    check("T14 route chrome as the desktop: Distraction → Episodes / Distraction History + PAST SECANT EPISODES; Study → Study History / Evidence + PAST STUDY SESSIONS; COSECANT hides both bars; history routes keep their group and mark the history button", ok, chrome)
    check("T15 footers read 'SECANT · <Route> Analysis' / 'COSECANT · Cosecant Analysis'", chrome['past_secant_episodes']['foot'] == 'SECANT \u00b7 Past Secant Episodes Analysis' and chrome['distraction_history']['foot'] == 'SECANT \u00b7 Distraction History Analysis' and chrome['cosecant']['foot'] == 'COSECANT \u00b7 Cosecant Analysis', [v['foot'] for v in chrome.values()])
    # face / keyboard / back / export messages
    go("cosecant"); click("#sqDash .sq-face .sq-tab[data-k=secant]")
    check("T16 SECANT face button returns to Overview", chrome and jl("document.querySelector('.sq-nav .sq-tab.on').dataset.k") == 'overview' and J("document.getElementById('sqFootL').textContent") == 'SECANT \u00b7 Overview Analysis')
    J("document.querySelectorAll('.sq-nav .sq-tab')[3].focus(); true"); key("ArrowRight", 39)
    check("T17 ArrowRight on the last navigation tab wraps to OVERVIEW and focuses it", jl("document.querySelector('.sq-nav .sq-tab.on').dataset.k") == 'overview' and J("document.activeElement.dataset.k") == 'overview')
    go("past_secant_episodes"); click("#sqSecBack")
    check("T18 ← BACK TO CURRENT VIEW returns to the route the history was opened from (Episodes)", jl("document.querySelector('.sq-sub-t .sq-tab.on').dataset.k") == 'episodes')
    go("past_study_sessions"); J("document.getElementById('sqExport').click(); true"); time.sleep(0.3)
    check("T19 EXPORT PDF on Past Study Sessions without a selection says so in the footer and opens no report", J("document.getElementById('sqFootL').textContent") == 'Select a recorded Study block before exporting its parent session.' and not J("!!document.querySelector('.wl-modal')"))
    go("past_secant_episodes"); J("document.getElementById('sqExport').click(); true"); time.sleep(0.3)
    check("T20 EXPORT PDF on Past SECANT Episodes without a selection: 'Select a recorded SECANT episode before exporting its parent session.'", J("document.getElementById('sqFootL').textContent") == 'Select a recorded SECANT episode before exporting its parent session.' and not J("!!document.querySelector('.wl-modal')"))
    go("overview"); J("document.getElementById('sqExport').click(); true"); time.sleep(0.5)
    check("T21 EXPORT PDF on Overview opens the Study Recovery report above the analysis", J("!!document.querySelector('.wl-modal')") and 'Study Recovery' in J("document.querySelector('.wl-modal').innerText") and J("getComputedStyle(document.querySelector('.wl-modal')).zIndex") == "14000")
    J("document.querySelector('.wl-modal .glass-header button')?.click(); true"); time.sleep(0.3)
    key("Escape", 27)
    check("T22 Escape closes the analysis and returns focus to OPEN DEEP ANALYSIS", J("!document.getElementById('sqDash')") and J("document.activeElement.id") == "sqOpen")
    J("document.getElementById('sqOpen').click(); true"); time.sleep(0.4)
    J("document.getElementById('sqDash').dispatchEvent(new MouseEvent('mousedown',{bubbles:true})); true"); time.sleep(0.3)
    check("T23 clicking the backdrop closes the analysis", J("!document.getElementById('sqDash')"))
    # ------------------------------------------------------------ real events
    J("document.getElementById('btnEngineStart').click(); true"); time.sleep(0.4)
    J("import('/assets/myelin/runtime.js').then(m=>{const o=m.Runtime.prototype.advance;m.Runtime.prototype.advance=function(...a){window.__rt=this;return o.apply(this,a);};return true;})"); time.sleep(0.6)
    surface('task'); adv(1, 1)
    J("__rt.command('STUDY','prepare',{subject:'Databases',task:'Normalisation notes',studyMinutes:60,breakMinutes:5,resourceId:'study:primary'}); __rt.command('STUDY','start'); true"); time.sleep(0.3)
    surface('study'); adv(1, 1); adv(20, 1)
    surface('streamA'); adv(5.3); time.sleep(1.8)
    J("(()=>{const b=[...document.querySelectorAll('#wlPopup button')].find(b=>/RETURN/i.test(b.textContent));b&&b.click();return !!b})()"); time.sleep(0.4)
    surface('study')
    for _ in range(4):
        adv(1.4); time.sleep(0.4)
    time.sleep(0.6)
    J("__rt.command('STUDY','break'); true"); time.sleep(0.4)
    adv(5.3); time.sleep(0.8)
    surface('study'); adv(1, 1); adv(4, 1); time.sleep(0.6)
    open_page()
    L = jl("({status:document.getElementById('sqStatus').innerText.replace(/\\n/g,' | '),msg:document.querySelector('#sqStatus .sq-msg').className,recent:document.getElementById('sqRecent').innerText.replace(/\\n/g,' | '),tiles:[...document.querySelectorAll('#sqTiles .sq-tile')].map(x=>x.innerText.replace(/\\n/g,' | ')),beh:document.getElementById('sqBehaviour').innerText.replace(/\\n/g,' | '),evs:[...document.querySelectorAll('#sqLatest .sq-evl')].map(x=>x.innerText.replace(/\\n/g,' | ')),banner:document.getElementById('sqBanner').textContent})")
    check("T24 after one recovered distraction: status '● EPISODE | Recovered | RECORDED' (cyan); recent episode Streaming · Netflix, SEC-DDMMYYYY-01, SECANT-1, Recovered, Recorded At date · time, study resource", 'Recovered' in L['status'] and 'RECORDED' in L['status'] and 't-cyan' in L['msg'] and 'Streaming \u00b7 Netflix' in L['recent'] and re.search(r"SEC-\d{8}-01", L['recent']) and 'SECANT-1' in L['recent'] and re.search(r"\d{2} \w{3} \d{4} \u00b7 \d{2}:\d{2}:\d{2}", L['recent']) and 'Exact Study resource' in L['recent'], L)
    check("T25 landing tiles: 1 / 1 / 0 lifetime finalized (with the lifetime caption) and 1 study resource", [t.split(' | ')[0] for t in L['tiles']] == ['1', '1', '0', '1'] and all('Lifetime finalized validated evidence; 0 recorded episodes excluded' in t for t in L['tiles'][:3]) and 'Selected MYELIN session' in L['tiles'][3], L['tiles'])
    check("T26 behaviour panel: source, platform key 'netflix', SECANT-1, Recovered; latest events newest first (Episode Closed … Return to Study Selected) with source and clock", 'netflix' in L['beh'] and 'SECANT-1' in L['beh'] and len(L['evs']) == 5 and L['evs'][0].startswith('● | Episode Closed') and L['evs'][4].startswith('● | Return to Study Selected') and 'Streaming \u00b7 Netflix' in L['evs'][0], L['evs'])
    fl = nodes("#sqFlow")
    check("T27 flow nodes in recorded order with semantic tones: Episode Founded (purple), SECANT Displayed (blue, stage 1), Return to Study Selected / Return Process Started / Return Verified / Recovery Closed / Episode Closed (green), each carrying its occurred-at basis and a clock",
          [n['name'] for n in fl] == ['Episode Founded', 'SECANT Displayed', 'Return to Study Selected', 'Return Process Started', 'Return Verified', 'Recovery Closed', 'Episode Closed'] and [n['tone'] for n in fl] == ['purple', 'blue', 'green', 'green', 'green', 'green', 'green']
          and all(n['cat'] == 'SECANT' and n['info'].endswith('OCCURRED AT') and re.match(r"\d{2}:\d{2}:\d{2}$", n['stamp']) for n in fl) and fl[2]['info'].startswith('Return to study'), fl)
    check("T28 banner 'RECORDED EVIDENCE · SESSION 1'", L['banner'] == 'RECORDED EVIDENCE \u00b7 SESSION 1', L['banner'])
    c.shot(EV + "\\after_secant_data_page.png", full=True)
    J("document.getElementById('sqOpen').click(); true"); time.sleep(0.5)
    m = tiles()
    check("T29 Overview metrics: 1 / 1 / 0 / 1 resource / 0 direct jumps / a recorded study time (e.g. 11m 44s), finalized-evidence caption", [t[1] for t in m[:5]] == ['1', '1', '0', '1', '0'] and re.match(r"\d+m \d{2}s", m[5][1]) and m[0][2] == 'Finalized validated evidence; 0 recorded episodes excluded' and m[5][2] == 'Recorded Study timer elapsed', m)
    k = kv("#sqDash")
    check("T30 Overview key/value panels: episode id / source / stage / closure / recorded at / study material; study snapshot (Primary resource, Later resource None, 0 uncertain, path, Excluded); insights (Session 1, In progress, Databases, study jump note)",
          k[0][0:2] == ['EPISODE ID', k[0][1]] and re.match(r"SEC-\d{8}-01", k[0][1]) and k[0][3] == 'Streaming \u00b7 Netflix' and k[0][5] == 'SECANT-1' and k[0][7] == 'Recovered' and k[0][11] == 'Exact Study resource'
          and k[1][1] == 'Exact Study resource' and k[1][3] == 'None' and k[1][5] == '0' and k[1][9] == 'Excluded' and k[2][1] == 'Session 1' and k[2][3] == 'In progress' and k[2][5] == 'Databases' and k[2][7] == 'Gaps and interruptions remain distinct.', k)
    ev = rows("#sqOvEvents")
    check("T31 Overview latest events: seven rows numbered 1-7 in occurrence order (Episode Founded … Episode Closed), SOURCE Streaming · Netflix, TYPE 'OCCURRED AT · Recorded'", len(ev) == 7 and [r[0] for r in ev] == [str(i) for i in range(1, 8)] and ev[0][2] == 'Episode Founded' and ev[6][2] == 'Episode Closed' and all(r[3] == 'Streaming \u00b7 Netflix' and r[4] == 'OCCURRED AT \u00b7 Recorded' for r in ev), ev)
    check("T32 Overview journey = the recent episode's seven nodes", len(nodes("#sqOvFlow")) == 7)
    go("episodes")
    el_ = rows("#sqEpList")
    check("T33 Episodes: list row 1 SEC-… · Streaming · Netflix · SECANT-1 · Recovered · date · time; the fourth metric counts one distraction source", len(el_) == 1 and re.match(r"SEC-\d{8}-01", el_[0][1]) and el_[0][2] == 'Streaming \u00b7 Netflix' and el_[0][3] == 'SECANT-1' and el_[0][4] == 'Recovered' and re.search(r"\d{2} \w{3} \d{4} \u00b7 \d{2}:\d{2}:\d{2}", el_[0][5]) and [t[0:2] for t in tiles()][3] == ['DISTRACTION SOURCES', '1'], [el_, tiles()])
    go("distraction_history")
    dh = rows("#sqDhList")
    check("T34 Distraction History: Source / Started / Stage / Return intent 'OCCURRED AT · hh:mm:ss' / Verified 'Confirmed · OCCURRED AT · hh:mm:ss' (green) / Closure Recovered; attributes incl. Outcome scope 'Behavioural only' and Recovery Interruption 'Not recorded'",
          len(dh) == 1 and dh[0][1] == 'Streaming \u00b7 Netflix' and re.match(r"OCCURRED AT \u00b7 \d{2}:\d{2}:\d{2}$", dh[0][4]) and re.match(r"Confirmed \u00b7 OCCURRED AT \u00b7 \d{2}:\d{2}:\d{2}$", dh[0][5]) and dh[0][6] == 'Recovered' and kv("#sqDash")[0][11] == 'Behavioural only' and kv("#sqDash")[0][13] == 'Not recorded', [dh, kv("#sqDash")])
    go("study_history")
    sh = rows("#sqShList")
    jn = nodes("#sqShFlow")
    check("T35 Study History: each supported Study visit is a row (RESOURCE, duration, first/last observed, PRIMARY) and the Study Jump Effect shows the visits with connectors 'Interruption recorded' (the Netflix visit sat between) and 'Evidence gap' (the break); no node claims a direct jump",
          len(sh) >= 2 and all(r[1] == 'Exact Study resource' and r[5] == 'PRIMARY' for r in sh) and len(jn) == len(sh) and 'Interruption recorded' in J("document.getElementById('sqShFlow').innerText") and all(n['tone'] == 'green' and n['info'] == 'Study-aligned' for n in jn) and 'Direct observed change' not in J("document.getElementById('sqShFlow').innerText"), [sh, jn])
    go("evidence")
    ev2 = rows("#sqEvList")
    k2 = kv("#sqDash")[0]
    check("T36 Evidence: rows 'STUDY ALIGNED' with confidence / confirmation 'Not recorded' and qualification; attributes (Resource, Initial Classification … Evidence scope 'Behavioural only'); one OBSERVATION node in the confirmation flow",
          len(ev2) >= 2 and ev2[0][2] == 'STUDY ALIGNED' and ev2[0][3] == 'Not recorded' and ev2[0][4] == 'Not recorded' and ev2[0][5] == 'PRIMARY' and k2[1] == 'Exact Study resource' and k2[3] == 'STUDY ALIGNED' and k2[15] == 'Behavioural only' and [n['cat'] for n in nodes("#sqEvFlow")] == ['OBSERVATION'], [ev2, k2])
    go("cosecant")
    st = jl("[...document.querySelectorAll('#sqDash .sq-strip')].map(s=>[...s.children].map(x=>x.innerText.replace(/\\n/g,' | ')))")
    ct = tiles()
    check("T37 COSECANT: active strip (BREAK ID COSEC-…, LAST RECORDED STATE Confirmed, BREAK TYPE Not recorded, SELECTED ALLOWANCE 5m 00s, RETURN TARGET, OUTCOME Returned); recent strip with Return Confirmation Confirmed and Recorded At; metrics 1 / 1 / 1 / 0",
          re.match(r"BREAK ID \| COSEC-\d{8}-01", st[0][0]) and st[0][1].endswith('Confirmed') and st[0][2].endswith('Not recorded') and st[0][3].endswith('5m 00s') and st[0][4].endswith('Exact Study resource') and st[0][5].endswith('Returned') and st[1][3].endswith('Confirmed') and re.search(r"\d{2} \w{3} \d{4} \u00b7", st[1][5]) and [t[1] for t in ct] == ['1', '1', '1', '0'], [st, ct])
    kk = kv("#sqDash")[0]
    evc = rows("#sqCoEvents")
    rh = rows("#sqCoReturns")
    cf = nodes("#sqCoFlow")
    check("T38 COSECANT break history (Completed allowance, Confirmed, Returned), four latest events (Break started, Break complete, Return confirmation started, Return confirmed — TYPE Recorded), one return-history row, four flow nodes purple / yellow / green / green with the to-state",
          kk[9] == 'Completed' and kk[11] == 'Confirmed' and kk[13] == 'Returned' and [r[0] for r in evc] == ['Break started', 'Break complete', 'Return confirmation started', 'Return confirmed'] and all(r[1] == 'Recorded' for r in evc) and len(rh) == 1 and rh[0][0] == 'Exact Study resource' and rh[0][2] == 'Confirmed'
          and [n['tone'] for n in cf] == ['purple', 'yellow', 'green', 'green'] and [n['info'] for n in cf] == ['Break active', 'Break complete', 'Return confirming', 'Confirmed'] and all(n['cat'] == 'COSECANT' for n in cf), [kk, evc, rh, cf])
    # history routes with data
    go("past_secant_episodes")
    pe = jl("({sel:[...document.querySelectorAll('#sqSecDate option')].map(o=>o.textContent),view:document.getElementById('sqSecView').disabled,prompt:document.querySelector('.sq-body > .sq-panel:last-child').innerText.replace(/\\n/g,' | '),rows:document.querySelectorAll('#sqSecList tbody tr').length})")
    check("T39 Past SECANT Episodes: the date picker lists SELECT DATE plus the recorded date, VIEW FLOW disabled, empty list and the 'SELECT A HISTORICAL EPISODE' prompt before a date is chosen", pe['sel'][0] == 'SELECT DATE' and len(pe['sel']) == 2 and pe['view'] and pe['rows'] == 0 and 'SELECT A HISTORICAL EPISODE' in pe['prompt'], pe)
    J("(()=>{const s=document.getElementById('sqSecDate');s.value=s.options[1].value;s.dispatchEvent(new Event('change'));return true})()"); time.sleep(0.4)
    r1 = rows("#sqSecList")
    check("T40 choosing the date lists the episode: #, EPISODE ID, SOURCE, STARTED (date · time), STAGE, OUTCOME", len(r1) == 1 and r1[0][0] == '1' and re.match(r"SEC-\d{8}-01", r1[0][1]) and r1[0][2] == 'Streaming \u00b7 Netflix' and r1[0][4] == 'SECANT-1' and r1[0][5] == 'Recovered', r1)
    J("document.querySelector('#sqSecList tbody tr').focus(); true"); key("Enter", 13)
    pe2 = jl("({view:document.getElementById('sqSecView').disabled,prompt:document.querySelector('.sq-body > .sq-panel:last-child').innerText.replace(/\\n/g,' | '),sel:document.querySelectorAll('#sqSecList tr.sel').length,focus:document.activeElement.tagName})")
    check("T41 selecting a row with the keyboard (Enter) enables VIEW FLOW, marks the row and shows 'EPISODE SELECTED | … Press VIEW FLOW.'; focus stays on the row", not pe2['view'] and 'EPISODE SELECTED' in pe2['prompt'] and 'Press VIEW FLOW.' in pe2['prompt'] and pe2['sel'] == 1 and pe2['focus'] == 'TR', pe2)
    click("#sqSecView")
    hv = jl("({strip:[...document.querySelectorAll('#sqDash .sq-strip > div')].map(x=>x.innerText.replace(/\\n/g,' | ')),h3:[...document.querySelectorAll('#sqDash .sq-pt')].map(x=>x.textContent)})")
    kh = kv("#sqDash")[0]
    check("T42 VIEW FLOW: strip (EPISODE ID, SOURCE, STAGE REACHED, OUTCOME, EVENTS 7), 'SELECTED HISTORICAL EPISODE' ten rows (Related Study resource, Event count 7), 'FULL EVENT HISTORY' seven rows, 'HISTORICAL SECANT FLOW — SEC-… · date · Streaming · Netflix' with seven nodes",
          len(hv['strip']) == 5 and hv['strip'][4].endswith('7') and len(kh) == 20 and kh[16] == 'RELATED STUDY RESOURCE' and kh[17] == 'Exact Study resource' and kh[19] == '7' and len(rows("#sqSecEvents")) == 7 and any(re.match(r"HISTORICAL SECANT FLOW \u2014 SEC-\d{8}-01 \u00b7 \d{2} \w{3} \d{4} \u00b7 \d{2}:\d{2}:\d{2} \u00b7 Streaming \u00b7 Netflix", x) for x in hv['h3']) and len(nodes("#sqSecHistFlow")) == 7, [hv, kh])
    check("T43 the full event history explains its clock basis honestly for the browser ('OCCURRED AT is the browser-recorded event time')", 'OCCURRED AT is the browser-recorded event time' in J("document.getElementById('sqDash').innerText"))
    J("document.getElementById('sqExport').click(); true"); time.sleep(0.5)
    check("T44 EXPORT PDF with a selected historical episode opens the report for its parent session", J("!!document.querySelector('.wl-modal')") and 'Study Recovery' in J("document.querySelector('.wl-modal').innerText"))
    J("document.querySelector('.wl-modal .glass-header button')?.click(); true"); time.sleep(0.3)
    J("document.getElementById('sqDashRefresh').click(); true"); time.sleep(0.4)
    check("T45 REFRESH keeps the date, the selection and the open flow", J("document.getElementById('sqSecDate').value") != "" and len(nodes("#sqSecHistFlow")) == 7 and jl("document.querySelectorAll('#sqSecList tr.sel').length") == 1)
    go("past_study_sessions")
    J("(()=>{const s=document.getElementById('sqStDate');s.value=s.options[1].value;s.dispatchEvent(new Event('change'));return true})()"); time.sleep(0.4)
    r2 = rows("#sqStList")
    check("T46 Past Study Sessions: date picker, one session row (DATE, 'Databases', duration, resources)", len(r2) == 1 and r2[0][1] == 'Databases' and re.match(r"\d+m \d{2}s", r2[0][2]) and int(r2[0][3]) >= 2, r2)
    click("#sqStList tbody tr")
    check("T47 selecting the row shows 'STUDY SESSION SELECTED | date · Databases · duration. Press VIEW STUDY MAP.'", 'STUDY SESSION SELECTED' in J("document.querySelector('.sq-body > .sq-panel:last-child').innerText") and not J("document.getElementById('sqStView').disabled"))
    click("#sqStView")
    sv = jl("({strip:[...document.querySelectorAll('#sqDash .sq-strip > div')].map(x=>x.innerText.replace(/\\n/g,' | ')),h3:[...document.querySelectorAll('#sqDash .sq-pt')].map(x=>x.textContent)})")
    ks = kv("#sqDash")[0]
    check("T48 VIEW STUDY MAP: strip (PAST STUDY SESSION Databases, DATE, DURATION, RESOURCES, DIRECT STUDY JUMPS 0); SELECTED STUDY SESSION seven rows (Primary resource, Resource entries); FULL STUDY RESOURCE HISTORY, EVIDENCE / QUALIFICATION SUMMARY, SESSION EVENT HISTORY (Plan prepared … Block resumed); HISTORICAL STUDY JUMP EFFECT",
          len(sv['strip']) == 5 and sv['strip'][0].endswith('Databases') and sv['strip'][4].endswith('0') and len(ks) == 14 and ks[11] == 'Exact Study resource' and all(h in sv['h3'] for h in ['FULL STUDY RESOURCE HISTORY', 'EVIDENCE / QUALIFICATION SUMMARY', 'SESSION EVENT HISTORY']) and any(x.startswith('HISTORICAL STUDY JUMP EFFECT \u2014 ') and 'Databases' in x for x in sv['h3'])
          and [r[2] for r in rows("#sqStEvents")][:2] == ['Plan prepared', 'Block started'] and len(nodes("#sqStHistFlow")) >= 2, [sv, ks])
    c.shot(EV + "\\after_secant_data_study_map.png")
    J("document.querySelector('.sq-x').click(); true"); time.sleep(0.3)
    # ------------------------------------------------------------ pending / ended
    surface('streamA'); adv(5.3); time.sleep(1.8)
    open_page()
    P = jl("({recent:document.getElementById('sqRecent').innerText.replace(/\\n/g,' | '),status:document.getElementById('sqStatus').innerText.replace(/\\n/g,' | '),tiles:[...document.querySelectorAll('#sqTiles .sq-tile')].map(x=>x.innerText.replace(/\\n/g,' | ')),nodes:document.querySelectorAll('#sqFlow .sq-node').length,tones:[...document.querySelectorAll('#sqFlow .sq-node')].map(n=>n.className.match(/t-(\\w+)/)[1])})")
    check("T49 an episode still open in a running session is shown Pending, as the desktop does before the final flush: stage 'Pending', outcome 'Pending · PENDING', neutral nodes, lifetime caption '1 recorded episodes excluded' while the count stays 1", 'SEC-' in P['recent'] and '-02' in P['recent'] and 'Pending' in P['recent'] and 'Pending \u00b7 PENDING' in P['status'] and P['tiles'][0].startswith('1 |') and '1 recorded episodes excluded' in P['tiles'][0] and set(P['tones']) == {'neutral'} and P['nodes'] >= 2, P)
    J("document.getElementById('btnEngineStop').click(); true"); time.sleep(1.0)
    open_page()
    E = jl("({recent:document.getElementById('sqRecent').innerText.replace(/\\n/g,' | '),tiles:[...document.querySelectorAll('#sqTiles .sq-tile')].map(x=>x.innerText.replace(/\\n/g,' | ')),banner:document.getElementById('sqBanner').textContent})")
    check("T50 once the session ends the open episode is final: Closure 'Ended', lifetime counts 2 captured / 1 verified, banner SESSION 1", 'Ended' in E['recent'] and E['tiles'][0].startswith('2 |') and E['tiles'][1].startswith('1 |') and '0 recorded episodes excluded' in E['tiles'][0], E)
    c.shot(EV + "\\after_secant_ended_page.png", full=True)
    # ------------------------------------------------------------ viewports / worlds
    for wd, hgt in [(1460, 960), (1366, 768), (1024, 700), (820, 1180), (390, 844)]:
        c.viewport(wd, hgt, mobile=wd < 500); load(1.0); open_page()
        for world in ["neon", "white", "black", "purple"]:
            J(f"(()=>{{document.getElementById('themesBtn').click();document.querySelector('.theme-option[data-world={world}]').click();return true}})()"); time.sleep(0.12)
            g1 = jl("({sw:document.documentElement.scrollWidth,iw:innerWidth,vis:!!document.querySelector('.sq-page')?.getClientRects().length})")
            J("document.getElementById('sqOpen')?.click(); true"); time.sleep(0.7)
            bad = []
            for r in ROUTES:
                go(r)
                g = jl("({sw:document.documentElement.scrollWidth,iw:innerWidth,p:(()=>{const r=document.querySelector('.sq-shell').getBoundingClientRect();return [r.left,r.right,innerWidth]})(),body:(()=>{const b=document.getElementById('sqBody');return b.scrollWidth-b.clientWidth})()})")
                if g['sw'] > g['iw'] or g['p'][0] < -1 or g['p'][1] > g['p'][2] + 1 or g['body'] > 1:
                    bad.append((r, g))
            J("document.querySelector('.sq-x')?.click(); true"); time.sleep(0.1)
            check(f"T51 {wd}x{hgt} {world}: page and all nine analysis routes fit, no horizontal overflow", g1['sw'] <= g1['iw'] and g1['vis'] and not bad, [g1, bad])
            if world == "purple" and wd in (1460, 390):
                c.shot(EV + f"\\after_secant_purple_{wd}.png", full=True)
    check("T52 no console / network / CSP problems", not c.problems(), c.problems())
finally:
    c.close()
print("SUMMARY: %d/%d passed" % (sum(R), len(R)))
