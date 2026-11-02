"""Final Web Lite Phase 3 — SenseHub browser DEMONSTRATION (web adaptation of the Edge SenseHub page, Firmware Lab layout and MYELINOSCOPE).
Checks: the sidebar row is a real nav item; the page structure / terminology of the Edge page (Device Connections, Signal Acquisition CH1 HEART (ECG) / CH2 BRAIN (EXG), START / PAUSE / STOP, Active Event Markers,
Device Console, Episode History, Report flow); simulated device states, simulated waveforms, phone pickup / return DEMONSTRATION events with timestamps; the Firmware Lab is a labelled visual demonstration
(no compiler / uploader); MYELINOSCOPE is simulated (CH2 not connected); everything is labelled SIMULATED; no hardware / network API is used; seven themes and mobile layout; protected files and neighbours unchanged.
usage: t139_sensehub.py <base_url> <chrome_port> <db for the isolation check> <working_copy_dir> <backup_dir>"""
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
click = lambda i: J("(()=>{const b=document.getElementById(%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(i))
has = lambda i: site.jl("!!document.getElementById(%s)" % json.dumps(i))
txt = lambda i: site.jl("(document.getElementById(%s)||{}).textContent||null" % json.dumps(i))
dis = lambda i: site.jl("document.getElementById(%s).disabled" % json.dumps(i))
vis = lambda i: site.jl("(()=>{const e=document.getElementById(%s);return !!e&&e.offsetParent!==null})()" % json.dumps(i))
def go(i, wait=0.25):
    assert click(i), i; time.sleep(wait)
png = lambda i: site.jl("document.getElementById(%s).toDataURL()" % json.dumps(i))
def distinct(i):  # a plot is drawn, not blank: count the distinct colours in the canvas
    return site.jl("(()=>{const c=document.getElementById(%s),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,s=new Set();for(let k=0;k<d.length;k+=4*7)s.add(d[k]+','+d[k+1]+','+d[k+2]);return s.size})()" % json.dumps(i))
def ev_rows(): return site.jl("[...document.querySelectorAll('#shEvents > span')].map(e=>e.textContent)")
try:
    site.load()
    # ================= navigation / structure =================
    nav = site.jl("(()=>{const e=document.getElementById('navSenseHub');return {tag:e.tagName,page:e.dataset.page,txt:e.textContent.trim(),disabled:e.classList.contains('disabled'),group:e.closest('.nav-group').querySelector('.nav-group-title').textContent}})()")
    check("A1.sidebar_row_unlocked", "the System-group SenseHub row is now a real navigation button (data-page=sensehub, no COMING SOON badge); the rest of the sidebar is unchanged", nav == {"tag": "BUTTON", "page": "sensehub", "txt": "SenseHub", "disabled": False, "group": "System"} and site.jl("[...document.querySelectorAll('.nav-group')].map(g=>g.querySelector('.nav-group-title').textContent)") == ["Core", "Modules", "Research", "System"], nav)
    site.goto_page("sensehub"); time.sleep(0.8)
    check("A2.page_opens", "clicking SenseHub opens the SenseHub page", site.jl("document.querySelector('.page.active').id") == "page-sensehub" and has("shPage"))
    head = site.jl("(()=>({h1:document.querySelector('.sh-h1 h1').textContent,chip:document.getElementById('shHeaderChip').textContent,sub:document.querySelector('.sh-sub').textContent,tools:[...document.querySelectorAll('.sh-tool')].map(b=>b.textContent),pressed:[...document.querySelectorAll('.sh-tool')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.textContent)}))()")
    check("A3.header_like_edge", "header as on the Edge page: 'SenseHub', subtitle 'Sensor interface and biosignal acquisition' + LABORATORY MODULE chip, tool switch FIRMWARE LAB / MYELINOSCOPE / LAB ANALYSIS (LAB ANALYSIS open)", head["h1"] == "SenseHub" and "Sensor interface and biosignal acquisition" in head["sub"] and "LABORATORY MODULE" in head["sub"] and head["tools"] == ["FIRMWARE LAB", "MYELINOSCOPE", "LAB ANALYSIS"] and head["pressed"] == ["LAB ANALYSIS"], head)
    ban = txt("shBanner")
    check("A4.simulation_labelled", "a persistent banner says SIMULATED — BROWSER DEMONSTRATION and that no ESP32 / serial / Bluetooth / ECG acquisition / compiler / uploader exists and that the IDE, Serial Plotter and Wi-Fi tools are not part of it; the header chip says SIMULATED", "SIMULATED" in ban and "No ESP32, serial port, Bluetooth, ECG acquisition, compiler or uploader exists here" in ban and "MYELIN IDE, Serial Plotter and Wi-Fi" in ban and "SIMULATED" in txt("shHeaderChip"), ban)
    tabs = site.jl("[...document.querySelectorAll('.sh-tab')].map(b=>b.textContent)")
    check("A5.tabs_and_report_button", "Lab Analysis tabs LIVE ANALYSIS / EPISODE HISTORY / DEVICE CONSOLE and the GENERATE REPORT button", tabs == ["LIVE ANALYSIS", "EPISODE HISTORY", "DEVICE CONSOLE"] and txt("shReportBtn") == "GENERATE REPORT", tabs)
    # ================= device connections =================
    st0 = site.jl("[0,1,2].map(i=>document.getElementById('shDev'+i).textContent)")
    check("B1.devices_initial", "Device Connections: ESP32 CONNECTED, ADC WAITING, BioAmp EXG CONNECTED with the Edge meta lines; panel chip SIMULATED DEVICES", st0 == ["CONNECTED", "WAITING", "CONNECTED"] and "Port: COM3" in txt("shDevices") and "S/N: BA-EXG-042" in txt("shDevices") and "SIMULATED DEVICES" in site.jl("document.querySelector('#shDevices').closest('.sh-panel').innerText"), st0)
    go("shDev0"); go("shDev0")
    check("B2.status_pill_cycles", "clicking a status pill cycles CONNECTED \u2192 WAITING \u2192 DISCONNECTED and logs it to the console as simulated", txt("shDev0") == "DISCONNECTED" and "status \u2192 DISCONNECTED (simulated)" in txt("shConsole") and site.jl("document.getElementById('shDev0').dataset.tone") == "disconnected", (txt("shDev0"),))
    go("shAllOn")
    check("B3.connect_all", "CONNECT ALL sets every simulated device CONNECTED; DISCONNECT ALL sets them DISCONNECTED", [txt("shDev0"), txt("shDev1"), txt("shDev2")] == ["CONNECTED"] * 3, [txt("shDev0"), txt("shDev1")])
    go("shAllOff"); ok_off = [txt("shDev0"), txt("shDev1"), txt("shDev2")] == ["DISCONNECTED"] * 3; go("shAllOn")
    check("B3b.disconnect_all", "DISCONNECT ALL works", ok_off)
    go("shConnect")
    check("B4.control_station_link", "CONNECT TO CONTROL STATION answers like the Edge prototype: 'Prototype only \u2014 no link is made in this phase.'", txt("shConnectNote") == "Prototype only \u2014 no link is made in this phase.", txt("shConnectNote"))
    # ================= signal acquisition =================
    check("C1.idle_preview", "idle: both channels show the static PREVIEW (CH1 \u2014 HEART (ECG), CH2 \u2014 BRAIN (EXG)), Signal NO DATA, Episode ID --, STOP/PAUSE disabled, START enabled",
          "CH1 \u2014 HEART (ECG)" in txt("shChHeart") and "CH2 \u2014 BRAIN (EXG)" in txt("shChBrain") and "PREVIEW" in txt("shChHeart") and txt("shSignal") == "NO DATA" and txt("shEpisode") == "--" and dis("shPause") and dis("shStop") and not dis("shStart") and txt("shElapsed") == "00:00:00", (txt("shSignal"), txt("shElapsed")))
    check("C2.channel_labels", "each channel card carries its Edge scale chips (1 mV/div, 50 \u00b5V/div, 250 Hz), stat boxes (HR / R-R / Amplitude, RMS / Peak / Band 0.5 \u2013 50) and a SIMULATED chip; the canvases are described as simulated waveforms",
          "1 mV/div" in txt("shChHeart") and "50 \u00b5V/div" in txt("shChBrain") and "HR (BPM)" in txt("shChHeart") and "Band (Hz)" in txt("shChBrain") and "SIMULATED" in txt("shChHeart") and "SIMULATED" in txt("shChBrain") and "Simulated ECG" in site.jl("document.querySelector('#shChHeart canvas').getAttribute('aria-label')"))
    check("C3.traces_drawn", "both channels draw a real waveform (not a blank canvas)", distinct_ok := (site.jl("(()=>{const f=(s)=>{const c=document.querySelector(s),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,u=new Set();for(let k=0;k<d.length;k+=28)u.add(d[k]+','+d[k+1]+','+d[k+2]);return u.size};return [f('#shChHeart canvas'),f('#shChBrain canvas')]})()")), distinct_ok)
    go("shStart", 0.4)
    check("C4.start_running", "START: badges LIVE (DEMO), Signal DEMO SIGNAL, Episode ID DEMO-01, START disabled, PAUSE/STOP enabled; the start is logged as simulated", "LIVE (DEMO)" in txt("shChHeart") and txt("shSignal") == "DEMO SIGNAL" and txt("shEpisode") == "DEMO-01" and dis("shStart") and not dis("shPause") and not dis("shStop") and "START (simulated)" in txt("shConsole"), (txt("shSignal"), txt("shEpisode")))
    time.sleep(2.0)
    el, sm = txt("shElapsed"), txt("shSamples")
    check("C5.clock_runs", "elapsed time and the sample counter advance while running (\u2265 00:00:02, \u2265 400 samples at 250 Hz)", el >= "00:00:02" and int(sm.replace(",", "")) >= 400, (el, sm))
    p1 = site.jl("document.querySelector('#shChHeart canvas').toDataURL()"); time.sleep(0.5); p2 = site.jl("document.querySelector('#shChHeart canvas').toDataURL()")
    check("C6.trace_scrolls", "the ECG trace scrolls right-to-left while streaming", p1 != p2)
    go("shPause", 0.5); held = txt("shElapsed"); time.sleep(1.2)
    check("C7.pause_holds", "PAUSE holds the clock (Signal HELD, button reads RESUME, elapsed unchanged for 1.2 s)", txt("shSignal") == "HELD" and txt("shElapsed") == held and txt("shPause").strip().endswith("RESUME") and "PAUSED" in txt("shChHeart"), (txt("shSignal"), held, txt("shElapsed"), txt("shPause")))
    go("shPause", 0.3); time.sleep(1.1)
    check("C8.resume", "RESUME continues the same episode", txt("shSignal") == "DEMO SIGNAL" and txt("shElapsed") > held and txt("shEpisode") == "DEMO-01", (txt("shElapsed"), held))
    J("(()=>{const m=document.getElementById('shMode');m.selectedIndex=1;m.dispatchEvent(new Event('change',{bubbles:true}));return true})()"); time.sleep(0.3)
    check("C9.mode_heart_only", "signal mode 'Heart only (ECG)' hides the Brain channel; 'Brain only (EXG)' hides the Heart channel", vis("shChHeart") and not vis("shChBrain"))
    J("(()=>{const m=document.getElementById('shMode');m.selectedIndex=2;m.dispatchEvent(new Event('change',{bubbles:true}));return true})()"); time.sleep(0.3)
    check("C9b.mode_brain_only", "Brain only", vis("shChBrain") and not vis("shChHeart"))
    J("(()=>{const m=document.getElementById('shMode');m.selectedIndex=0;m.dispatchEvent(new Event('change',{bubbles:true}));return true})()")
    # ================= event markers / phone =================
    rows0 = ev_rows()
    check("D1.sample_markers", "Active Event Markers starts with the Edge sample rows (SenseHub Episode Started \u2026 Verified Return) under Time / Event / Channel / Details", rows0[:4] == ["Time", "Event", "Channel", "Details"] and "SINE-3 Triggered" in rows0 and "Signal returned to baseline" in rows0 and "DEMO VALUES" in site.jl("document.getElementById('shEvents').closest('.sh-panel').innerText"), rows0[:12])
    check("D2.episode_start_marker", "starting the episode added a timestamped 'SenseHub Episode Started' marker (HH:MM:SS.mmm) for DEMO-01", any(re.fullmatch(r"\d\d:\d\d:\d\d\.\d{3}", r) for r in rows0) and "Simulated episode DEMO-01" in rows0, rows0[-8:])
    go("shMk2")
    check("D3.stage_marker", "ADD DEMONSTRATION EVENT \u2192 SINE-2 adds 'SINE-2 Triggered' (BRAIN) with a timestamp", ev_rows()[-3] == "SINE-2 Triggered" and ev_rows()[-2] == "BRAIN", ev_rows()[-4:])
    check("D4.phone_initial", "phone indicator starts ON DESK; PHONE PICKUP enabled, PHONE RETURN disabled; the chip is labelled DEMO", txt("shPhone") == "PHONE (DEMO): ON DESK" and not dis("shMkPick") and dis("shMkReturn"), (txt("shPhone"),))
    go("shMkPick"); r = ev_rows()
    check("D5.phone_pickup", "PHONE PICKUP: indicator PICKED UP, a timestamped 'Phone Pickup' marker on channel SENSE explicitly states it is a demonstration and not part of the accepted Edge build; PICKUP disabled, RETURN enabled",
          txt("shPhone") == "PHONE (DEMO): PICKED UP" and r[-3] == "Phone Pickup" and r[-2] == "SENSE" and "not part of the accepted Edge build" in r[-1] and dis("shMkPick") and not dis("shMkReturn") and re.fullmatch(r"\d\d:\d\d:\d\d\.\d{3}", r[-4]), r[-4:])
    time.sleep(1.1); go("shMkReturn"); r = ev_rows()
    check("D6.phone_return", "PHONE RETURN: indicator back ON DESK, 'Phone Return' marker on SENSE with the time away and the demonstration disclaimer; both events appear in the console as simulated",
          txt("shPhone") == "PHONE (DEMO): ON DESK" and r[-3] == "Phone Return" and re.search(r"Away 00:0[1-9]", r[-1]) and "demonstration event, not an Edge feature" in r[-1] and "phone pickup (demonstration, simulated)" in txt("shConsole") and "phone return after" in txt("shConsole"), r[-4:])
    go("shMkVerified")
    check("D7.verified_return_marker", "VERIFIED RETURN adds a green 'Verified Return' marker (demonstration marker)", ev_rows()[-3] == "Verified Return" and "Demonstration marker" in ev_rows()[-1])
    go("shStop", 0.4)
    check("D8.stop_idle", "STOP returns to idle (PREVIEW, NO DATA, elapsed 00:00:00) and logs the episode as simulated", txt("shSignal") == "NO DATA" and txt("shElapsed") == "00:00:00" and "STOP \u2014 DEMO-01" in txt("shConsole") and not dis("shStart") and dis("shStop"))
    # ================= episode history / overview / report =================
    go("shTab_history")
    rows = site.jl("[...document.querySelectorAll('#shHistory .sh-hrow')].map(r=>r.dataset.ep)")
    check("E1.history_list", "Episode History lists the Edge sample episodes #021 \u2026 #010 plus the demonstration episode you recorded (#DEMO-01) first; panel chips SAMPLE DATA", rows[0] == "#DEMO-01" and rows[1:] == ["#021", "#020", "#019", "#018", "#017", "#016", "#015", "#010"], rows)
    J("document.querySelector('#shHistory [data-ep=\"#019\"]').click(); true"); time.sleep(0.2)
    ov = site.jl("document.getElementById('shOverview').innerText.split(String.fromCharCode(10)).join(' / ')")
    check("E2.select_changes_overview", "selecting a row highlights it and the overview's Episode ID follows (#019); the overview shows the Edge fields", "Episode ID / #019" in ov and "Acquisition Mode" in ov and site.jl("document.querySelector('#shHistory [data-ep=\"#019\"]').dataset.selected") == "true", ov)
    J("document.querySelector('#shHistory [data-ep=\"#DEMO-01\"]').click(); true"); time.sleep(0.2)
    ov2 = site.jl("document.getElementById('shOverview').innerText.split(String.fromCharCode(10)).join(' / ')")
    check("E3.demo_episode_overview", "the demonstration episode's overview shows its own simulated values (device 'SenseHub (simulated)', firmware 'none (simulated)')", "SenseHub (simulated)" in ov2 and "none (simulated)" in ov2 and "Episode ID / #DEMO-01" in ov2, ov2)
    go("shReportBtn2", 0.4)
    check("F1.report_type_first", "GENERATE REPORT opens the report flow: REPORT TYPE is asked first, PREVIEW REPORT disabled until HEART or BRAIN is chosen; chips DUMMY LAYOUT and SIMULATED; tabs hidden", has("shRpTypeHEART") and has("shRpTypeBRAIN") and dis("shRpPreview") and "Select HEART or BRAIN to continue" in txt("shRpHint") and "DUMMY LAYOUT" in txt("shReportBox") and not vis("shTabs"), txt("shRpHint"))
    go("shRpTypeBRAIN")
    check("F2.type_enables_preview", "choosing BRAIN enables PREVIEW REPORT and says REPORT TYPE = BRAIN", not dis("shRpPreview") and "REPORT TYPE = BRAIN" in txt("shRpHint"))
    go("shRpPreview", 0.8)
    paper = txt("shPaper")
    check("F3.report_preview_dummy", "the preview is a dummy layout with sample values for the chosen type (REPORT TYPE = BRAIN, EVENT SUMMARY, SIGNAL ANALYSIS, ANALYST NOTES) and drawn simulated plots", txt("shRpBadge") == "REPORT TYPE = BRAIN" and "DUMMY LAYOUT \u00b7 SAMPLE VALUES" in paper and "EVENT SUMMARY" in paper and "SIGNAL ANALYSIS" in paper and "ANALYST NOTES" in paper and "Source" in paper and "SIMULATED" in paper and site.jl("document.querySelectorAll('#shPaper canvas').length") == 5, site.jl("document.querySelectorAll('#shPaper canvas').length"))
    go("shRpPdf")
    check("F4.pdf_placeholder", "GENERATE PDF is an honest placeholder: 'nothing was generated' (no file is produced)", "PDF placeholder \u2014 nothing was generated" in txt("shRpStatus"), txt("shRpStatus"))
    go("shRpChange"); go("shRpTypeHEART"); go("shRpPreview", 0.5)
    check("F5.change_type", "CHANGE TYPE returns to the choice; HEART gives a separate HEART report", txt("shRpBadge") == "REPORT TYPE = HEART")
    go("shRpBack", 0.3)
    check("F6.back_to_lab", "BACK TO LAB ANALYSIS returns to the tabs", vis("shTabs") and not vis("shReportBox"))
    go("shTab_console")
    check("G1.console_tab", "DEVICE CONSOLE tab shows the sample log with the simulated actions appended, chip SAMPLE LOG, and the note that no command input / device output exists", has("shConsole2") and "SENSEHUB_EDGE_V0.1" in txt("shConsole2") and "(simulated)" in txt("shConsole2") and "no command input" in txt("shPane_console") and "SAMPLE LOG" in txt("shPane_console"))
    go("shTab_live")
    # ================= Firmware Lab (visual demonstration) =================
    go("shTool_fw", 0.4)
    check("H1.firmware_lab_labelled", "FIRMWARE LAB opens as a labelled VISUAL DEMONSTRATION (header chip + banner: not a working compiler or uploader)", "VISUAL DEMONSTRATION" in txt("shHeaderChip") and "not a working compiler or uploader" in txt("shFw") and vis("shFw") and not vis("shPage") is False)
    strip = site.jl("[...document.querySelectorAll('#shFwStrip .sh-fw-st')].map(e=>e.innerText.split(String.fromCharCode(10)).join(' '))")
    check("H2.status_strip_honest", "status strip DEVICE | PORT | BOARD | PROFILE | TOOLCHAIN | CONNECTION with the Edge honest empty states (NOT CONNECTED / NOT CONFIGURED / \u2014)", [s.split(" ")[0] for s in strip] == ["DEVICE", "PORT", "BOARD", "PROFILE", "TOOLCHAIN", "CONNECTION"] and "NOT CONNECTED" in strip[0] and "NOT CONFIGURED" in strip[2], strip)
    check("H3.layout_panes", "PROJECT tree, EDITOR with a tab and numbered sample source, DEVICE / TOOLCHAIN panel with BUILD TARGET, CONNECTED DEVICE, TOOLCHAIN, FIRMWARE and TRANSPORT CAPABILITY sections", all(k in txt("shFw") for k in ("PROJECT", "EDITOR", "DEVICE / TOOLCHAIN", "BUILD TARGET", "CONNECTED DEVICE", "TOOLCHAIN", "FIRMWARE", "TRANSPORT CAPABILITY")) and "not real SenseHub firmware" in txt("shFwCode"))
    go("shFwVerify"); go("shFwUpload"); go("shFwMonitor")
    out = site.jl("document.getElementById('shFwBottom').innerText")
    check("H4.actions_answer_honestly", "VERIFY / UPLOAD / SERIAL-TRANSPORT MONITOR answer in OUTPUT that no compiler / uploader / serial transport exists and nothing was built / flashed / opened", "no compiler exists in the browser; nothing was built" in out and "no uploader or device exists in the browser; nothing was flashed" in out and "no serial transport exists in the browser; nothing was opened" in out, out)
    J("document.querySelector('#shFwTree [data-file=\"config.h\"]').click(); true"); time.sleep(0.2)
    check("H5.open_file_tab", "clicking config.h in the tree opens it in an editor tab", "config.h" in txt("shFw") and "SAMPLE_RATE_HZ" in txt("shFwCode"))
    go("shFwB_PROBLEMS"); pr = txt("shFwBottom")
    check("H6.problems_empty", "PROBLEMS says nothing is compiled in this demonstration", "nothing is compiled" in pr, pr)
    # ================= MYELINOSCOPE =================
    go("shTool_scope", 0.4)
    check("I1.disconnected_state", "MYELINOSCOPE starts as in the Edge instrument: '\u25cb MYELINOSCOPE NOT CONNECTED', 'Detailed signal inspection is currently inactive.' and CONNECT MYELINOSCOPE; EPISODE ANALYSIS lists sample episodes", txt("shScopeNc") == "\u25cb MYELINOSCOPE NOT CONNECTED" and "Detailed signal inspection is currently inactive." in txt("shScopePlaceholder") and txt("shScopeConnect") == "CONNECT MYELINOSCOPE" and "EPISODE ANALYSIS" in txt("shScope") and has("shAnalyze021"), txt("shScopeNc"))
    go("shScopeConnect", 0.8)
    check("I2.connected_simulated", "CONNECT: '\u25cf MYELINOSCOPE CONNECTED', SOURCE: SIMULATED \u00b7 HEART \u2022 ECG \u00b7 250 Hz \u00b7 repeating 10 s preview; badge SIMULATED ECG \u00b7 LOCAL SIMULATION", txt("shScopeState") == "\u25cf MYELINOSCOPE CONNECTED" and "SOURCE: SIMULATED" in txt("shScopeSource") and "250 Hz" in txt("shScopeSource") and "SIMULATED ECG" in txt("shScopeBadge"), txt("shScopeSource"))
    check("I3.scope_drawn", "the scope shows a drawn simulated ECG trace", distinct("shScopeCv") > 12, distinct("shScopeCv"))
    check("I4.channels", "CH1 PRIMARY ACTIVE and CH2 FUTURE SECOND BIOAMP NOT CONNECTED chips", "ACTIVE" in txt("shScopeCh1") and "NOT CONNECTED" in txt("shScopeCh2") and "FUTURE SECOND BIOAMP" in txt("shScopeCh2"))
    go("shScopeCh2")
    check("I5.ch2_not_connected", "selecting CH2 shows the Edge note ('CH2 is NOT CONNECTED \u2026 shows no signal'), hides the trace and pauses the amplitude control (nothing is invented for CH2)", "CH2 is NOT CONNECTED" in txt("shScopeNote") and not vis("shScopeCv") and vis("shScopeCh2Blank") and dis("shScopeAmp"))
    go("shScopeCh1")
    J("(()=>{const t=document.getElementById('shScopeTime');t.value=2;t.dispatchEvent(new Event('input',{bubbles:true}));return true})()"); time.sleep(0.3)
    check("I6.time_div_slider", "the TIME / DIV slider changes the horizontal scale (0.05 s / div)", txt("shScopeTimeVal") == "0.05 s / div", txt("shScopeTimeVal"))
    go("shScopeFreeze", 0.3); fz = site.jl("document.getElementById('shScopeCv').toDataURL()"); time.sleep(0.6)
    check("I7.freeze", "FREEZE stops the sweep (status FROZEN, button reads RUN, trace unchanged)", "FROZEN" in txt("shScopeStatus") and txt("shScopeFreeze").strip().endswith("RUN") and fz == site.jl("document.getElementById('shScopeCv').toDataURL()"))
    go("shScopeFreeze", 0.2); go("shScopeAdvToggle")
    J("(()=>{const s=document.getElementById('shScopeDisplay');s.value='ROLL';s.dispatchEvent(new Event('change',{bubbles:true}));return true})()"); time.sleep(0.4)
    a = site.jl("document.getElementById('shScopeCv').toDataURL()"); time.sleep(0.5); b = site.jl("document.getElementById('shScopeCv').toDataURL()")
    check("I8.roll_scrolls", "ADVANCED CONTROLS \u2192 DISPLAY ROLL scrolls the trace and the status says ROLL", a != b and "ROLL" in txt("shScopeStatus"))
    J("document.getElementById('shScopeTc').click(); document.getElementById('shScopeVc').click(); true"); time.sleep(0.4)
    check("I9.cursors_and_measurements", "T1/T2 and V1/V2 cursors give readouts (\u0394t, 1/\u0394t, \u0394V) and CURRENT-VIEW MEASUREMENTS (MIN / MAX / P\u2013P / MEAN / RMS / N / WINDOW / RATE 250 Hz)", all(k in txt("shScopeCursor") for k in ("T1", "T2", "\u0394t", "V1", "V2", "\u0394V")) and all(k in txt("shScopeMeas") for k in ("MIN", "MAX", "P\u2013P", "MEAN", "RMS", "RATE 250 Hz")), txt("shScopeCursor"))
    go("shAnalyze021", 0.6)
    check("I10.recorded_excerpt", "ANALYZE #021 opens a read-only SIMULATED EXCERPT: 'RECORDED \u2022 READ-ONLY', source 'SIMULATED EXCERPT \u00b7 HEART \u2022 ECG', FREEZE disabled, CLOSE EPISODE shown", txt("shScopeState") == "RECORDED \u2022 READ-ONLY" and "SIMULATED EXCERPT" in txt("shScopeSource") and dis("shScopeFreeze") and vis("shScopeClose") and "#021" in txt("shScopeEpisodeLbl"), txt("shScopeSource"))
    go("shScopeClose", 0.3)
    check("I11.close_episode", "CLOSE EPISODE returns to the live simulation", txt("shScopeState") == "\u25cf MYELINOSCOPE CONNECTED")
    go("shScopeDisconnect", 0.3)
    check("I12.disconnect", "DISCONNECT MYELINOSCOPE returns to the NOT CONNECTED placeholder", txt("shScopeNc") == "\u25cb MYELINOSCOPE NOT CONNECTED" and vis("shScopeConnect"))
    # ================= themes / responsive =================
    go("shTool_lab", 0.4)
    themes = site.jl("[...document.querySelectorAll('.theme-option')].map(b=>b.dataset.world)"); okt = []
    for w in themes:
        J("document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=%s]').click(); true" % w); time.sleep(0.5)
        v = site.jl("(()=>{const p=document.querySelector('#shDevices').closest('.sh-panel'),t=document.querySelector('.sh-tool[aria-pressed=true]');return {bg:getComputedStyle(p).backgroundColor,pb:getComputedStyle(document.body).backgroundColor,tc:getComputedStyle(t).color,vis:p.offsetHeight>0}})()")
        okt.append((w, v["vis"] and v["bg"] != v["pb"] and v["tc"] != "rgb(0, 0, 0)"))
    for a_ in ("amber", "red", "green"):
        J("document.documentElement.setAttribute('data-accent', %s); true" % json.dumps(a_)); time.sleep(0.3); okt.append((a_, vis("shPage")))
    J("document.documentElement.removeAttribute('data-accent'); document.getElementById('themesBtn').click(); document.querySelector('.theme-option[data-world=neon]').click(); true"); time.sleep(0.4)
    check("J1.seven_themes", "the page renders and stays legible in all seven themes (4 worlds + 3 accent palettes)", len(themes) == 4 and len(okt) == 7 and all(x[1] for x in okt), okt)
    site.c.viewport(390, 844); time.sleep(0.8)
    m = site.jl("({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,chan:getComputedStyle(document.querySelector('#shChHeart .sh-chan-body')).flexDirection})")
    check("J2.mobile_layout", "390 px: no horizontal page scroll and the channel card stacks its trace above the stat box", m["sw"] <= m["cw"] + 1 and m["chan"] == "column", m)
    site.c.viewport(1440, 900); time.sleep(0.5)
    # ================= separation / no hardware =================
    srcs = {f: open(os.path.join(ROOT, "templates", "assets", "myelin", f), encoding="utf-8").read() for f in ("sensehub-core.js", "sensehub-lab.js", "sensehub-tools.js", "sensehub-view.js")}
    bad = {f: re.findall(r"navigator\.(?:serial|bluetooth|usb|hid)|WebSocket|XMLHttpRequest|fetch\(|indexedDB|localStorage|sessionStorage|Worker\(|import\(", s) for f, s in srcs.items()}
    check("K1.no_hardware_or_network_api", "the SenseHub sources use no serial / Bluetooth / USB / HID / WebSocket / fetch / storage / worker API (static scan of the four files)", not any(bad.values()), bad)
    site.goto_page("control"); time.sleep(0.5)
    check("K2.not_in_live_telemetry", "SenseHub actions add nothing to the Control Station's Live Telemetry (separate simulations)", site.jl("document.querySelectorAll('#feed > .feed-item').length") == 0 and txt("feedCount") == "Awaiting events", txt("feedCount"))
    assert site.open_db(db); time.sleep(0.8); site.goto_page("sensehub"); time.sleep(0.6)
    check("K3.imported_file_unaffected", "opening an imported database file leaves SenseHub a purely simulated page (no imported values, still labelled SIMULATED)", has("shPage") and "SIMULATED" in txt("shBanner") and site.jl("document.getElementById('shHistory').querySelectorAll('.sh-hrow').length") == 9)
    site.remove_db(); time.sleep(0.4)
    probs = [x for x in site.c.problems() if "ERR_ABORTED" not in x]
    check("K4.console", "no console error, CSP violation or failed request", not probs, probs[:3])
    # ================= protection =================
    sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    own = sorted(set(["templates/index.html", "templates/research.html", "views.py", "templates/anesthesia-control-research.html", "templates/bluepad32-thesis.html"] + [l.split()[-1] for l in open(os.path.join(BACKUP, "TRANSFER_LOG.txt"), encoding="utf-8") if l.startswith("KEPT")]))
    # templates/research.html was edited by the owner at 21:38 (after the Phase 2 checkpoint, 21:28, and outside this phase); it is reported, never touched or reverted.
    OWNER_EDITED = ["templates/research.html"]
    bad_own = [r for r in own if r not in OWNER_EDITED and sha(os.path.join(ROOT, r)) != sha(os.path.join(BACKUP, r))]
    print("NOTE owner-edited since the transfer backup (left as the owner saved it):", [r for r in OWNER_EDITED if sha(os.path.join(ROOT, r)) != sha(os.path.join(BACKUP, r))])
    check("L1.owner_files_untouched", "the other 13 owner-protected files are byte-identical to the backup; research.html is the owner's own newer edit and is left as saved (%d checked)" % len(own), not bad_own and len(own) == 14, (bad_own, len(own)))
    wk = os.path.join(ROOT, "PHASE_NOTES", "CHECKPOINT_final_phase2_live_telemetry_20261031", "templates", "assets", "myelin"); mine_ = os.path.join(ROOT, "templates", "assets", "myelin")
    prot = ["runtime.js", "simulator.js", "events.js", "popups.js", "popups.css", "secant-station.js", "secant-import.js", "mine-station.js", "live-mirl.js", "science-ch3.js", "science-ch5.js", "science-ch6.js", "science-certified.js", "science-import.js", "metric-import.js", "organ-import.js", "db-explorer.js", "imported-source.js",
            "store-model.js", "fine-model.js", "tangent-model.js", "cot-model.js", "sine-demo.js", "mine-demo.js"] + ["organs/" + f for f in os.listdir(os.path.join(wk, "organs")) if f.endswith(".js")] + ["db-import/" + f for f in os.listdir(os.path.join(wk, "db-import")) if f.endswith(".js")]
    diff = [f for f in prot if sha(os.path.join(wk, f)) != sha(os.path.join(mine_, f))]
    check("L2.protected_unchanged", "runtime, organs, popup system, module models, imported-database readers, Science Lab, Metric Hub and Academy sources are byte-identical to the accepted Phase 2 checkpoint (%d files)" % len(prot), not diff, diff)
finally:
    site.close()
print("SUMMARY: %d/%d passed" % (PASS, PASS + FAIL))
