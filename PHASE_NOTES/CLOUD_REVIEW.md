# MYELIN Academy: cloud verification and review (2026-11-02)

Read-only run on a Linux cloud container. No tracked file was edited. `templates/research.html` was not touched. All findings below were reproduced in headless Chrome unless marked "by reading".

## Findings (most serious first)

**1. Custom-video step becomes a dead end after BACK.** `academy-journey.js:115` (stu.name), `academy.js:123, 136`
- Scenario: choose CUSTOM and enter a title, then reach Keywords and press BACK.
- On return the step is already satisfied, so `needsAct` is false. Line 123 swaps NEXT for the text box and ENTER.
- The guide says "press NEXT", but there is no NEXT button. ENTER re-enters the video and never advances.
- Only BACK, MAP or SKIP TOUR leaves.
- Fix: for a prompt step that is already satisfied, render the prompt plus NEXT. Or skip the step on revisit, as `skip` does for the default path.

**2. ESC kills the whole tour when it was meant for something else.** `academy.js:171` (with `ui.js:70`)
- Scenario: open MAP, press ESC to close the map. The modal closes and the tour ends. Same when ESC is pressed inside the video-name box (the typed text is lost).
- Cause: the Academy's document-level handler ignores `defaultPrevented` and open modals.
- Fix: `if(e.defaultPrevented||document.querySelector('.wl-modal')||e.target.closest('.acj-input'))return;`

**3. Exact-match ADVANCE steps get stuck in "I'LL TRY" mode.** `academy-journey.js:151, 153, 156, 173, 175, 177` (same pattern in the organ chapters at 205, 218, 222, 232, 236, 239)
- Scenario: at SECANT-1, press ADVANCE three times. The popup is now "Study return required".
- The step `sec.s2` waits for `stageHead()==='Study return pending'`, which can never be true again. NEXT only shows "not complete yet".
- A double press also makes the narration say SECANT-1 while the screen shows SECANT-2.
- Recovery is only REPLAY LESSON or SKIP TOUR, and the hint does not mention either.
- Fix: compare stage order (at least this stage) instead of equality, or auto-skip when the demo is already past the step.

**4. Live Telemetry has no session guard.** `academy-journey.js:80` (`setup: () => {}`), `:75-77`
- Scenario: press STOP at the Telemetry intro (the dim layer is off, so STOP is clickable).
- `tel.social` then says "I will press it for you" and tries 3 times. No DWELL ever appears, and it waits silently.
- The same happens with PAUSE during `tel.s1`, and with MAP or REPLAY LESSON into Telemetry when no session is ACTIVE (for example after `tel.stop`).
- The hint "the tutorial clock skips ahead" is wrong in that state. Pressing START by hand recovers it.
- Fix: in `telemetry.setup`, start the tutorial session if it is not ACTIVE (resume if PAUSED). Keep `skip()` as is.

**5. BACK does not follow the path actually taken, and flow steps bounce forward again.** `academy.js:121, 163`, `academy-journey.js:295, 303, 307`
- Scenario: answer NO to both gates, then press BACK on the organ chooser.
- It lands on "Closing it. That is Study Mode." (a chapter the visitor skipped), then bounces back to the chooser after about 3.5 s.
- The gate question is unreachable with BACK unless the visitor hovers the guide on every step.
- Fix: keep a visited-index stack and make BACK pop it.

**6. Keyboard focus lands on the wrong answer. (Accessibility)** `academy.js:130` (focusCoach), `:40` (button order)
- `focusCoach` focuses the first `[data-ac]` button. On YES/NO questions that is NO.
- At "Shall we see Live Telemetry?" NO ends the whole Academy. Verified: focus was on NO, so Enter ends the tour.
- Fix: prefer `[data-ac=yes]` (or the `.primary` button) when choosing the focus target.

**7. Modal dialogs without a focus trap. (Accessibility)** `academy-journey.js:291, 308`
- The organ chooser and the letter are `role=dialog aria-modal=true`.
- Verified: Tab from the last button goes to BODY, then the Study nav row and other controls behind the overlay.
- Focus also is not restored to the launcher when the tour closes.
- Fix: trap Tab as `secant-station.js:268` does, or set `inert` on the page siblings while the overlay is up and restore it in `cleanup`.

**8. Auto-advance can only be held with a mouse. (Accessibility)** `academy.js:146`; `myelin_web_sample.html:3547-3548`
- By reading: the hold uses `:hover` only. Keyboard and touch users cannot stop steps that advance after 3.5-15 s.
- Fix: also treat `:focus-within` as a hold.
- `acHint` and `acAsk` are not live regions, so "That action is not complete yet" and the phase prompts are silent for screen readers. Only `acSay` is `aria-live`.

## Checked, no bug found
- **Stop and timers:** after SKIP TOUR mid-automation, the delayed `press()` calls found no controls and did nothing. Not reproduced.
- **Storage:** the Academy code only calls `setSetting` for `myelin.web.academy` and `myelin.web.academySeen`. t144 F4 passes (no other localStorage or sessionStorage keys after a full run). I did not inspect IndexedDB.
- **Real-monitoring claims:** none. The guide text matches the code (SINE 10:00 and 13:15, STORE up to 13:15 and capped at 23:15, TANGENT 23:15). The closing note says the Academy did not measure thoughts or attention.

## What ran, and what could not
**Build:** `python3 PHASE_NOTES/tools/build_equiv.py .` succeeded and approved **105** files. `dist/` is gitignored.

**Tests:** served `dist` on 8802 with `serve_with_headers.py`. Ran from a temporary copy outside the repo, driving headless Chrome.

| Test | Result |
|---|---|
| `t145` | 17/17 |
| `t146` | 9/9 |
| `t144` | 46/46 |

**Adjustments to run the tests (in the copy and shim only):**
- `p2lib.py` imports a `cdp` module that is not in the repository (it lives in the owner's scratchpad, Windows path). I wrote a minimal stand-in outside the repo, using the container's Chrome and `websocket-client`.
- On the first `t144` attempt, two popup-centring checks (SINE and MINE) failed by exactly 4 px. Headless Chrome on Linux draws an 8 px scrollbar and the test measures against `innerWidth`; the popups are centred in the visible area.
- I stopped that attempt and re-ran `t144` with Chrome's `--hide-scrollbars`. All 46 passed.
- The `t145` and `t146` runs used the browser stand-in without that flag.

Nothing was deployed. Findings were reproduced with ad-hoc scripts on the same Chrome. No file in the repository was changed apart from this report.
