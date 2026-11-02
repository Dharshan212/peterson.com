# Web Lite v1 validation and review

This release upgrades `templates/myelin_web_sample.html` in place. The application is static HTML, CSS and browser ES modules. It has no package dependency, application server, account, telemetry, external API or cloud database.

## Run and publish

From the Peterson.com project root with Node.js 22 or newer:

```sh
node scripts/build-static.mjs
node --test tests/web-lite/organ-contracts.test.mjs
```

Publish **only `dist/`**. Netlify uses the root `netlify.toml` to build that folder and reads `dist/_headers`. No deployment is performed by the build. Serve the folder using HTTP on localhost for review or HTTPS in production; opening `index.html` directly with `file://` does not support the module/storage environment reliably.

Browser acceptance additionally requires Playwright and a compatible browser in the test environment. These are test tools, not application dependencies. Set `NODE_PATH` if using an existing bundled Playwright, `CHROME_PATH` to an existing Chrome/Edge executable if needed, and optionally `WEB_LITE_QA` for the output folder. Then run:

```sh
node tests/web-lite/browser-acceptance.cjs
```

The runner serves `dist/` on localhost port 8765 with the release headers, uses a fresh browser profile, and closes it afterward. It writes screenshots, test PDFs, exported synthetic test data and a JSON result receipt to `tests/web-lite/results/` by default. None are published. `WEB_LITE_ROOT` can override the served directory. Tests use Playwright's injected clock; runtime timing remains the same state-machine policy used at 1×.

## Accepted behavioral authorities

The read-only desktop reference is `MYELIN2.0_ULTIMATE_TRIAL` in the adjacent MYELIN_GENALOGY project:

| Web authority | Desktop reference | Key contract |
|---|---|---|
| SINE | SINE/sine.py | 300 supported social seconds; displayed stages at +600/+795; stage 3 has no buttons |
| MIRL | MIRL/mirl.py | SINE episode identity; 10-second verification and 60-second confirmation; relapse retains identity |
| MINE | MINE/mine.py | 600-second qualification; branch A +795; branch B 5–30 minutes; final 3+10+60; explicit dwell segments |
| COSINE | COSINE/cosine.py | 300-second gate; 300-second return-intention continuation; 10–200-minute break; acknowledgement preserves deadline |
| Study | COSECANT_STUDY_MODE/study.py, study_alignment.py | Prepared exact resource; active-time accounting; normal-world preemption |
| SECANT | SECANT/secant.py | Active Study; 300 supported off-task seconds; factual first display; +600/+795; exact-resource 10+60 |
| COSECANT | COSECANT_STUDY_MODE/cosecant.py | Break expiry; +300 overdue, +60 final lock; fresh exact-resource 3-second confirmation |
| Normal Break | SINE/normal_break.py | Only normal SINE-1; 5–30 minutes; selector is not a committed break; same episode resumes at SINE-2 |

The browser adapter deliberately supplies **SIMULATED** resource observations. Visibility and interruption are **BROWSER_OBSERVED**. External processes, physiological evidence and desktop personalization are unavailable. No time gap or hidden-tab interval can establish successful recovery.

## Acceptance coverage

| Requested scenarios | Coverage |
|---|---|
| 1–3: SINE/MIRL recovery, relapse, Normal Break/resume | Deterministic contracts and browser controls |
| 4–6: MINE A/B and platform switching | Deterministic contracts and browser controls |
| 7–9: COSINE intent, committed break, platform switching | Deterministic contracts and browser controls |
| 10–13: Study lifecycle, SECANT qualification/recovery/relapse | Deterministic contracts and browser controls |
| 14–16: SECANT break, COSECANT overdue/final, exact return | Deterministic contracts and browser controls |
| 17: Unavailable/hidden evidence | Injected availability regression; browser visibility adapter uses the same authority |
| 18–19: Stop and emergency | Deterministic cleanup contracts; browser stop/emergency controls |
| 20: Persistence/reload | Real IndexedDB reload/interruption and two-tab ownership; volatile/quota-failure unit tests |
| 21–23: Science Lab, Metric Hub, reports | Bounded experiments, clipped Study intervals, projection agreement and six printed reports |
| 24: Academy isolation | Isolated runtime/history, SECANT lesson, action predicates, transfer isolation and session restoration |

Additional checks cover stale generations, delivery failure, repeated SINE episodes, duration-selector eligibility, pause accounting, MBI units, escaped user text, notes/planner/export/delete, keyboard focus, themes, GET CHART/JPG, local-only network requests and five viewport sizes.

## Storage and evidence boundaries

One Runtime owns the effective clock and accepted event ledger. Commands are separate from accepted facts. Popup requests require UI display acknowledgement. Reports clone the same projection used by the selected dashboard; Science Lab uses an immutable bounded experiment package. SINE and MIRL share lineage and must not be summed as independent recoveries.

IndexedDB schema 1 stores sessions, events, episode summaries, Study blocks, break outcomes, report projections/snapshots, experiments, notes and planner entries. Preferences and Academy progress use localStorage. Unfinished sessions become interrupted on reload. Web Locks provides exclusive writer ownership; browsers without it disclose read-only operation. A storage failure retains an explicit volatile copy and removes the durable-storage claim. Export before clearing local history or browser storage.

Academy pauses the ordinary runtime, uses a distinct tutorial namespace, then restores the ordinary runtime. Transferred Science Lab selection and UI command bindings reset at this boundary. Tutorial snapshots never enter ordinary persisted history.

## Review limits

- Validated with Windows Chrome at 1920×1080, 1366×768, 1280×720, 820×1180 and 390×844. This is representative responsive QA, not every browser/device or a formal accessibility certification.
- Browser print / Save as PDF is the report delivery path. There is no direct-download PDF library, service worker/offline guarantee, desktop-history importer or intro video.
- Planner is a local dated preparation list. It does not automatically start Study or schedule recurring work.
- Browser storage is origin-specific and can be cleared by the browser/user. No server backup or cloud sync exists.
- Recovery describes the software's supported resource-return contract, not neurological recovery or external application monitoring.

The final release result is recorded in `release-validation.json` beside this file. Test artifacts are excluded by the static build allowlist.
