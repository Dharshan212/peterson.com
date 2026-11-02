"""A scripted VISITOR for the MYELIN Academy journey (test tool). It does exactly what a person would: reads the coach, presses TRY IT, performs the real control actions on the page (clicks,
typing, popup buttons) and presses NEXT only when the guide says the action was detected. Nothing here calls the journey's internals: it drives the DOM, so a step that cannot be completed by the
visible controls fails here. Used by t144_academy_journey.py."""
import json, time

ORGAN_ACTIONS = {}


class Driver:
    patient = False
    choices = {}
    video_name = 'Neuron Signal Basics: Sodium Explained'
    def __init__(self, site):
        self.s = site; self.J = site.J; self.jl = site.jl; self.visited = []; self.log = []
    # ------------- primitives
    def click(self, i): return self.J("(()=>{const b=document.getElementById(%s);if(!b||b.disabled)return false;b.click();return true})()" % json.dumps(i))
    def pbtn(self, label, contains=False):
        cmp = "b.textContent.includes(%s)" if contains else "b.textContent===%s"
        return self.J("(()=>{const b=[...document.querySelectorAll('#wlDemoStage .wl-pp button, #wlPopup button')].find(b=>" + cmp % json.dumps(label) + ");if(!b||b.disabled)return false;b.click();return true})()")
    def setv(self, i, v): self.J("(()=>{const e=document.getElementById(%s);e.value=%s;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()" % (json.dumps(i), json.dumps(str(v))))
    def esc(self): self.s.c.call("Input.dispatchKeyEvent", type="keyDown", key="Escape", code="Escape", windowsVirtualKeyCode=27); self.s.c.call("Input.dispatchKeyEvent", type="keyUp", key="Escape", code="Escape", windowsVirtualKeyCode=27)
    def picker(self, word): return self.J("(()=>{const b=[...document.querySelectorAll('#acScenario button')].find(b=>b.textContent.toLowerCase().includes(%s));if(!b)return false;b.click();return true})()" % json.dumps(word.lower()))
    def wait(self, js, secs=8.0, step=0.15):
        t = time.time()
        while time.time() - t < secs:
            if self.jl(js): return True
            time.sleep(step)
        return False
    def state(self): return self.jl("({step:document.getElementById('acRoot').dataset.step||'',phase:document.getElementById('acRoot').dataset.phase||'',mode:document.getElementById('acRoot').dataset.mode||'',overlay:document.getElementById('acRoot').dataset.overlay||'',say:(document.getElementById('acSay')||{}).textContent||'',title:(document.getElementById('acLesson')||{}).textContent||'',count:(document.getElementById('acCount')||{}).textContent||''})")
    # ------------- the visitor's action for each step
    def act(self, sid, organ):
        c, p, e = self.click, self.pbtn, self.esc
        seq = {
            'ctl.start': lambda: c('btnEngineStart'), 'ctl.ring': lambda: time.sleep(2.0), 'ctl.pause': lambda: c('btnEnginePause'), 'ctl.resume': lambda: c('btnEnginePause'),
            'tel.social': lambda: self.picker('social'), 'tel.intent': lambda: self.wait("!!document.querySelector('#wlPopup')", 20) and p("BACK", True), 'tel.return': lambda: self.picker('task'), 'tel.stop': lambda: c('btnEngineStop'),
            'stu.video': lambda: (c('slPickDefault'), time.sleep(0.15), c('slUseVideo')), 'stu.prepare': lambda: c('slPrepare'), 'stu.points': lambda: c('slToPoints'),
            'stu.try': lambda: self.setv('slTryTitle', 'Neuron Signal Basics: Sodium Explained'), 'stu.scenarios': lambda: c('slToScenarios'), 'stu.aligned': lambda: c('slScnAligned'),
            'stu.uncertain': lambda: (c('slScnUncertain'), time.sleep(0.15), c('slAdvNext')), 'stu.answer': lambda: p('THIS IS STUDY MATERIAL'),
            'stu.both': lambda: (c('slScnReset'), time.sleep(0.15), c('slScnUncertain'), time.sleep(0.15), c('slAdvNext'), time.sleep(0.4), p("I'M COMING BACK")),
            'stu.off': lambda: (c('slScnOff'), time.sleep(0.15), c('slAdvNext')),
            'sec.start': lambda: c('szStart'), 'sec.prepare': lambda: (c('szPrepare'), time.sleep(0.15), c('szBlockStart')), 'sec.drift': lambda: c('szOfftask'), 'sec.s1': lambda: c('szAdvNext'), 'sec.anyapp': lambda: c('szChatA'), 'sec.pick': lambda: c('szStudyRes'), 'cos.pick': lambda: c('szStudyRes'),
            'sec.s1resp': lambda: p('RETURN TO STUDY'), 'sec.s2': lambda: c('szAdvNext'), 'sec.s2resp': lambda: p('RETURN TO STUDY'), 'sec.s3': lambda: c('szAdvNext'),
            'sec.return': lambda: (c('szStudyRes'), time.sleep(0.15), c('szAdv10'), time.sleep(0.15), c('szAdv60')), 'sec.dash': lambda: c('sqOpen'), 'sec.dashclose': lambda: e(),
            'cos.block': lambda: (c('szStart'), time.sleep(0.15), c('szPrepare'), time.sleep(0.15), c('szBlockStart')), 'cos.start': lambda: c('szBreakStart'), 'cos.complete': lambda: c('szAdvNext'),
            'cos.over': lambda: c('szAdvNext'), 'cos.final': lambda: c('szAdvNext'), 'cos.return': lambda: (c('szStudyRes'), time.sleep(0.15), [(c('szAdv1'), time.sleep(0.1)) for _ in range(4)]),
            'cos.dash': lambda: c('sqOpen'), 'cos.dashclose': lambda: e(),
            # organs
            'si.start': lambda: c('sdStart'), 'si.social': lambda: c('sdSocial'), 'si.s1': lambda: c('sdAdvNext'), 'si.intent': lambda: p("I'M BACK"),
            'si.return': lambda: (c('sdTask'), time.sleep(0.15), c('sdAdv10'), time.sleep(0.15), c('sdAdv60')), 'si.stages': lambda: [(c('sdTrigger'), time.sleep(0.3)) for _ in range(3)], 'si.dash': lambda: c('mirlOpenDash'), 'si.dashclose': lambda: e(),
            'mi.start': lambda: c('mdStart'), 'mi.chat': lambda: c('mdChatA'), 'mi.m1': lambda: c('mdAdvNext'), 'mi.m1resp': lambda: p('I WILL COME BACK'), 'mi.hop': lambda: c('mdChatB'), 'mi.m2': lambda: c('mdAdvNext'),
            'mi.return': lambda: (c('mdTask'), time.sleep(0.15), c('mdAdv10'), time.sleep(0.15), c('mdAdv60')), 'mi.dash': lambda: c('mnView'), 'mi.dashclose': lambda: e(),
            'co.start': lambda: c('cdStart'), 'co.stream': lambda: c('cdStreamA'), 'co.gate': lambda: c('cdAdvNext'), 'co.intent': lambda: p("SORRY, I'LL COME BACK"), 'co.hop': lambda: c('cdStreamB'), 'co.convert': lambda: c('cdAdvNext'),
            'co.duration': lambda: p('START WATCHING'), 'co.yay': lambda: p('YAY'), 'co.deadline': lambda: c('cdAdvNext'), 'co.return': lambda: (c('cdTask'), time.sleep(0.15), c('cdAdv10'), time.sleep(0.15), c('cdAdv60')),
            'co.dash': lambda: c('cxOpen'), 'co.dashclose': lambda: e(), 'co.other': lambda: (c('cdReset'), time.sleep(0.2), c('cdTrigger'), time.sleep(0.5), p('YEAH, I WANT SOME BREAK')),
            'sto.trigger': lambda: c('stTrigger'), 'sto.resp': lambda: p('I WANT TO SHOP'), 'sto.end': lambda: c('stAdvEnd'), 'sto.exit': lambda: c('stExit'), 'sto.ret': lambda: c('stReturn'), 'sto.dash': lambda: c('stOpenDash'), 'sto.dashclose': lambda: e(),
            'fi.trigger': lambda: c('fnTrigger'), 'fi.break': lambda: p('TAKE A BREAK'), 'fi.endbreak': lambda: c('fnEndBreak'), 'fi.exit': lambda: c('fnExit'), 'fi.ret': lambda: c('fnReturn'), 'fi.outcome': lambda: c('fnNoOrder'),
            'fi.dash': lambda: c('fnOpenDash'), 'fi.dashclose': lambda: e(),
            'tn.open': lambda: c('tnOpen'), 'tn.rem': lambda: c('tnAdvRem'), 'tn.exit': lambda: c('tnExit'), 'tn.ret': lambda: c('tnReturn'), 'tn.dash': lambda: c('tnOpenDash'), 'tn.dashclose': lambda: e(),
            'ct.trigger': lambda: c('cotTrigger'), 'ct.resp': lambda: p('YES'),
            'ct.pause': lambda: (self.J("(()=>{const s=document.getElementById('cotActivity');const o=[...s.options].find(o=>/instagram/i.test(o.textContent));s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return true})()"), time.sleep(0.15), c('cotEnter')),
            'ct.focus': lambda: (self.J("(()=>{const s=document.getElementById('cotFocusSel');s.value=s.options[s.options.length-1].value;s.dispatchEvent(new Event('change',{bubbles:true}));return true})()"), time.sleep(0.15), c('cotFocusSet')),
        }
        fn = seq.get(sid)
        if fn is None: raise KeyError(f"no visitor action scripted for step {sid}")
        fn()

    def run(self, organ, on_step=None, limit=140):
        """Walks the journey from the intro to HAPPY SURFING choosing `organ`. Returns the list of step ids visited (raises on a stuck step)."""
        steps = []
        for _ in range(limit):
            st = self.state()
            sid = st["step"]
            if not sid: time.sleep(0.2); continue
            if on_step: on_step(sid, st)
            steps.append(sid)
            if sid == 'pick.organ':
                self.click('acOrgan_' + organ); time.sleep(0.8); continue
            if sid == 'let.letter': self.click('acLetterNext'); time.sleep(0.5); continue
            if sid == 'let.final': return steps
            # YES / NO gate
            if self.jl("!!document.querySelector('#acActions [data-ac=yes]')"):
                which = 'no' if self.choices.get(sid) == 'no' else 'yes'
                self.J("document.querySelector('#acActions [data-ac=%s]').click(); true" % which); time.sleep(0.9); continue
            # text prompt inside the guide (custom video name)
            if self.jl("!!document.querySelector('#acActions .acj-input')"):
                self.J("(()=>{const i=document.querySelector('#acActions .acj-input');i.value=%s;i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#acActions [data-ac=submit]').click();return true})()" % json.dumps(self.video_name))
                if not self.wait("document.getElementById('acRoot').dataset.phase==='done'", 12): raise RuntimeError(f"step {sid}: the video name was not accepted")
                if self.patient: self.wait("document.getElementById('acRoot').dataset.step!==%s" % json.dumps(sid), 20, 0.25)
                else: self.next_(sid)
                continue
            # DIRECT steps (the guide asks for the action straight away, no TRY IT) with a praise line afterwards
            if st["phase"] == "act":
                self.act(sid, organ)
                if not self.wait("document.getElementById('acRoot').dataset.phase==='done'", 12): raise RuntimeError(f"step {sid}: the guide did not detect the action. say={self.state()['say'][:160]!r}")
                if self.patient:
                    if not self.wait("document.getElementById('acRoot').dataset.step!==%s" % json.dumps(sid), 20, 0.25): raise RuntimeError(f"praise step {sid}: the Academy did not move on by itself")
                else: self.next_(sid)
                continue
            # FLOW steps (the Academy presses the control itself / moves on by itself)
            auto = self.jl("!!document.querySelector('#acActions [data-ac=auto]')")
            flowread = self.jl("document.getElementById('acAsk').textContent.includes('continue by myself')")
            if auto or flowread:
                if self.patient:
                    if not self.wait("document.getElementById('acRoot').dataset.step!==%s" % json.dumps(sid), 45, 0.25): raise RuntimeError(f"flow step {sid}: the Academy did not move on by itself")
                    continue
                if auto:
                    self.click('acAuto') if False else self.J("document.querySelector('#acActions [data-ac=auto]').click(); true")
                    if not self.wait("document.getElementById('acRoot').dataset.phase==='done'", 12): raise RuntimeError(f"step {sid}: the guide did not detect the action. say={self.state()['say'][:160]!r}")
                self.next_(sid); continue
            # read phase with an action required?
            needs = self.jl("!!document.querySelector('#acActions [data-ac=try]')")
            if needs:
                time.sleep(0.3)
                if self.state()["phase"] == "act": continue   # a DIRECT step settled into its act phase
            if needs:
                self.click_try(); time.sleep(0.25)
                self.act(sid, organ)
                if not self.wait("document.getElementById('acRoot').dataset.phase==='done'", 12):
                    raise RuntimeError(f"step {sid}: the guide did not detect the action. say={self.state()['say'][:160]!r}")
            self.next_(sid)
        raise RuntimeError("journey did not finish: " + steps[-3:].__repr__())

    def click_try(self): self.J("document.querySelector('#acActions [data-ac=try]').click(); true")
    def next_(self, sid):
        before = self.state()["step"]
        self.J("document.querySelector('#acActions [data-ac=next]').click(); true")
        t = time.time()
        while time.time() - t < 6:
            time.sleep(0.15)
            if self.state()["step"] != before: return
        raise RuntimeError(f"step {sid}: NEXT did not advance")
