# Verification record - 16 October 2026 (0.11.0)

## Live browser test: Food Delivery frame 256:4022

The user supplied [this community frame](https://www.figma.com/design/KjLElYOJzYB7145cycnflA/Food-Delivery-App--Community-?node-id=256-4022).
The standalone headless CLI was denied before the editor loaded. A single
correction to the exact original URL also returned CloudFront HTTP 403; no layer
workers started. The hidden connected in-app browser could render the canvas.
Three background tabs then checked layer navigation, inspector access and export
controls concurrently, without desktop input or making the browser visible.

The signed-out viewer exposed 14 document-level layer labels, but displayed
“Sign up to comment, edit, inspect and more.” Main-menu access opened a sign-up
dialog; no sign-in or account creation occurred. No original PNG, exact styling,
complete frame subtree, font bytes or original artwork was acquired. Visible
layer rows had ARIA levels/row positions, without the numeric node/parent ID
attributes expected by the current CLI recipe. This live test therefore does
**not** establish successful structured intake or a speedup. It exposed both an
access blocker and a live-selector compatibility gap. No paid-plan prompt was
observed; authenticated operation remains untested.

Evidence: `.fidelity/food-delivery-live-1792121444880/` contains the failed CLI
manifest, exact-link HTTP/error-page diagnostic and connected-browser observations.
No Dart, comparator or policy changes were made for this live exercise.

## Local implementation checks

Parallel background browser acquisition through `acquire_figma_browser` and the
matching CLI command. The host derives selectors from editor inspection; the
engine executes bounded acquisition jobs in independent headless contexts.

| Check | Result |
| --- | --- |
| `npm run check` | 143 passed, no skipped tests; TypeScript build, portable documentation/version consistency, core/MCP, production-only preparation and relocated Pi package coverage |
| Skill validator | Passed with the skill-creator validator using PyYAML in a disposable Python environment |
| Real headless browser fixture | Passed using installed Chrome with all Figma requests fulfilled by a local fixture; concurrent isolated sessions, reused pages, selected-node checks, labeled input values, root PNG bytes and diagnostic-only screenshots |
| Scoped discovery | Passed: duplicate explicit/discovered nodes run once, parent chains stay inside the requested frame, job caps retain omitted node IDs |
| Failure/cleanup | Passed: access/rate-limit denials do not fan out/retry, wrong selection blocks collection, absent panels and invalid exports stay failed, overall deadlines close browsers and retain unfinished nodes |
| Fresh fixtures/comparator calibration | 12/12 passed; comparator calibration does not measure model generation or Figma acquisition speed |
| Live Figma/browser speed | Not-run: no current frame link or dedicated authenticated browser state supplied for this change; compatibility with Figma's actual selectors and complete layer/property extraction is not established |
| Flutter/native/product checks | Not-run; no Dart edits, native acceptance or behavior claims |

Local test evidence:
`.fidelity/parallel-browser-0.11.0-1792121093377238000/check.log` and `result.json`.
Fresh image evidence: `.fidelity/fixtures-1792120975076/screens` and
`.fidelity/benchmark-1792120975582`.

Browser intake always preserves `structureStatus: incomplete`. A UI observation
is not a REST/plugin node export; it has no pinned design revision. No browser,
global plugin, Flutter SDK or account resource was installed/changed by testing.
The tests launched the existing Chrome executable headlessly with disposable
contexts. Comparison policy v3 and repair policy v2 are unchanged.

Earlier records below are historical.

---

# Verification record - 15 October 2026 (0.10.2)

Pi adapter compatibility for the reported `ignored settings exposure: direct`
warning. The optional exposure override is omitted; the host controls discovery
and exposure through its MCP integration.

| Check | Result |
| --- | --- |
| `npm run check` | 133 passed, including TypeScript, production-only source preparation and relocated package/MCP coverage |
| Registration compatibility | The Pi package test models a consumer that rejects unsupported registration keys; the adapter supplies only command, arguments, description and timeout |
| MCP behavior | The resulting command connects, discovers eighteen tools, imports and inspects a reference, exercises the widget catalog/planner, and retains incomplete/error evidence |
| Capture timeout and workspace | The 1200-second request timeout remains; the adapter still inherits the app workspace |
| User's live Pi integration and native Flutter checks | Not-run locally; the reported warning identifies the ignored option, and tests verify registration without it |

The current [Pi MCP documentation](https://pi.dev/docs/latest/mcp#control-tool-exposure)
supports exposure configuration, but the reported host ignores the option on this
extension registration. No particular Pi version or replacement MCP integration
is inferred from that warning. Omitting it lets the host use its own settings.
Check `/mcp` after reloading to confirm the actual connection and exposed tools.

Local evidence: `.fidelity/pi-exposure-0.10.2-20261015-1/check.log`.
No image, Dart or fidelity policy changes were made.

Earlier records below are historical.

---

# Verification record - 15 October 2026 (0.10.1)

Fix for Pi source installation with omitted development dependencies.

| Check | Result |
| --- | --- |
| `npm run check` | 133 passed, including the fresh-source production-dependency regression |
| Actual npm installation | A disposable source directory started without `dist` or `node_modules`; `npm install --omit=dev --legacy-peer-deps --no-audit --no-fund` completed its prepare/build hook successfully |
| Production dependency contents | TypeScript and Node types installed; the development-only `tsx` package remained absent; the new CLI returned 0.10.1 |
| Regression test | Copies only installed production packages selected by the lockfile into an unbuilt source tree, runs the real prepare hook, then starts MCP, discovers eighteen tools and executes a viewport request from another working directory |
| Global compiler dependency | Build explicitly invokes the package-local compiler with Node; no global TypeScript installation is used |
| Live Pi host UI, another Mac, Flutter/native checks | Not-run locally; the npm flags from the reported failure were exercised in a fresh source directory |

The earlier 0.10.0 installation test used an already-built archive and did not
cover Pi's source prepare hook with development dependencies omitted. This patch
moves TypeScript and Node types into regular package dependencies and adds that
missing build coverage. No image, Dart, comparison policy or repair policy
changes were made.

Local evidence: `.fidelity/pi-0.10.1-fidelity-pi-source-s6wacdf5/` contains the
installation log, CLI version, result JSON and full check output. The npm source
directory was disposable; no global plugin or SDK was installed or changed.

Earlier records below are historical.

---

# Verification record - 15 October 2026 (0.10.0)

Portable Flutter Fidelity skill, project setup and README rewrite.

| Check | Result |
| --- | --- |
| `npm run check` | 132 passed, including TypeScript build, version synchronization, portable documentation consistency, core/MCP and relocated Pi package integration |
| Standalone skill | Copied in isolation; every local Markdown dependency resolves inside the skill folder |
| CLI launcher | Real engine invoked from copied skills and nested project folders; missing engine, version mismatch, unbuilt checkout and explicit engine root covered |
| Evidence/working directory | Real PNG import and comparison use relative project paths; identical PNG without capture evidence retains incomplete status and exit 2 through the launcher |
| Standard Skills CLI | Installed the packed engine in a disposable project, then installed the skill for Claude Code and Codex using `--copy`; both installed launchers returned 0.10.0 |
| Plugin packaging | Claude, portable and Codex manifests included in the tarball; Claude and portable command paths resolve after relocation; Pi tool discovery and image/error transport pass |
| Skill validator | Passed using the skill-creator validator and PyYAML in a disposable Python environment |
| README and documentation | Humanizer rewrite; local Markdown link targets and whitespace checked; original demo results and failed/incomplete evidence retained |
| New Flutter, native, behavior or calibration checks | Not-run; no Dart, reference image or fidelity policy changes |
| Live Claude Code/Codex/Pi invocation and other host operating systems | Not-run; project installation and transport tests do not establish live host discovery or equal generation quality |

The user-facing identifier is now `flutter-fidelity`. No global skill/plugin
installation, SDK change, npm publication or plugin account upload was performed.
Comparison policy v3 and repair policy v2 retain their existing contracts.

The first full check exposed a macOS `/var` versus `/private/var` alias in a
launcher test expectation. The assertion now compares resolved filesystem paths;
the subsequent full check passed all 132 tests. The older bundled skill validator
does not accept the standard's optional `compatibility` field, so environment
requirements are documented in the body for compatibility with that validator.

Local evidence:

- `.fidelity/portable-0.10.0-flutter-fidelity-install-4xmslmbk/check.log`
- `.fidelity/portable-0.10.0-flutter-fidelity-install-4xmslmbk/result.json`
- `.fidelity/portable-0.10.0-flutter-fidelity-install-4xmslmbk/install-skills.log`

Earlier records below are historical.

---

# Verification record — 14 October 2026 (0.9.0)

One discoverable skill, flutter-ui, with internal workflow references.

| Check | Result |
| --- | --- |
| npm run check | 128 passed, including version consistency, build and relocated Pi package integration |
| Packaged discovery | Exactly one recursive SKILL.md: skills/flutter-ui/SKILL.md; Pi explicitly loads that directory |
| Internal guidance | Build/reuse, typography, repair and verification guides packaged as ordinary reference Markdown |
| Skill validator | Passed for flutter-ui |
| Local Markdown links | 71 targets resolved across the skill and docs; whitespace check passed |
| Image/policy/Dart changes | None; no new calibration or Flutter/native checks required or claimed |

The single entry routes by task and loads further guidance as needed. Existing
MCP tools, catalog formats and comparison/repair gates retain their contracts.
Package discovery and reference availability are tested; autonomous model routing
across all real-world requests is not established by these package tests.
No global installation, upload or publication was performed.

Evidence: .fidelity/0.9.0-check.log.

Earlier records below are historical.

---

# Verification record — 14 October 2026 (0.8.0)

Widget catalog, host subagent work planning and browser-only acquisition defaults.

| Check | Result |
| --- | --- |
| `npm run check` | 128 passed, including TypeScript/version checks, 24 catalog tests, 20 planner tests and relocated Pi stdio integration |
| Marked reference evidence | Original PNG unchanged; native-size crops, separate labelled overview; invalid bounds, corruption and incomplete evidence rejected |
| Catalog reuse | Exact decoded pixels across PNG encodings; equal-size pixel/lexical ranking; current/stored source hashes, missing source, different projects and immutable entries checked |
| Parallel work plans | Complete region coverage; grouped repeated instances; dependency barriers; shared/case-alias/ancestor paths serialized; incomplete output preserved |
| Pi package transport | All eighteen tools discoverable; marking, registration, lookup and planning exercised in a relocated package/workspace |
| Skill validator / whitespace | Passed |
| Fresh fixtures / comparator calibration | 12/12 passed; existing references preserved; calibration is not model generation accuracy |
| Existing Fieldnotes demonstration | Nine marked regions, five catalog entries; one StoryTile group covers five instances; exact Maya and similar Noor crops retrieve StoryTile |
| New Flutter/native/product checks | Not-run: no Dart implementation changed; catalog entries explicitly retain verification not-run |
| Live Figma timing / autonomous Pi widget generation | Not-run; no end-to-end acquisition or generation speedup established |

The host assistant supplies visual identification and reviews behavior/API compatibility.
The planner does not launch models: the host uses available authorized subagents,
or executes sequentially. Three subagents assisted with this toolkit implementation,
documentation and tests; this does not prove future Pi hosts have delegation enabled.
Reference snapshots describe the design, not a validated rendering of current code.
Source hashes cover only declared paths. Screenshot comparison policy v3 and repair
policy v2 remain unchanged. Desktop plugin setup is no longer the default workflow.

Evidence:

- `.fidelity/0.8.0-check.log`
- `.fidelity/0.8.0-widget-fixtures-20261014/manifest.json`
- `.fidelity/0.8.0-widget-calibration-20261014/results.json`
- `.fidelity/widget-catalog-demo-1792000394060/marks/marked.png`
- `.fidelity/widget-catalog-demo-1792000394060/widgets/`
- `.fidelity/widget-catalog-demo-1792000394060/lookup.json`
- `.fidelity/widget-catalog-demo-1792000394060/plan/plan.json`

Earlier records below are historical.

---

# Verification record — 14 October 2026 (0.7.0)

Local Figma plugin connection and Pi package preparation.

| Check | Result |
| --- | --- |
| `npm run check` | 84 passed, including build/version checks, new bridge tests, MCP lifecycle and relocated Pi package |
| Loopback HTTP bridge | Passed: pairing/origin/host checks, one document/session, immediate selection metadata, unchanged PNG bytes, scoped context and optional root CSS |
| Failure evidence | Passed: wrong node/request IDs, invalid PNG, late results, timeouts, disconnects, changed document sessions and dimension review; failed outputs never become acquired |
| Bundled plugin sandbox/UI | Passed with VM Figma/DOM test doubles against actual loopback HTTP; includes PNG bytes and CSS transfer, changed-subtree rejection and export denial |
| Plugin preparation helper | Passed with a fixture Figma ID; creates fresh importable copies, rejects invalid IDs/existing output, preserves bundled source |
| Screenshot skill validator and local links | Passed; 102 local documentation targets and whitespace check |
| Fresh fixtures/comparator calibration | 12/12 passed; no existing reference PNGs overwritten |
| Live supplied Figma frame | Frame `223:4667` opens anonymously in browser; session is signed out and desktop app shows a blank window. No plugin registration/export/transfer or live timing established |
| New Flutter/native/product checks | Not-run; no Dart changes, no native or product acceptance inferred from comparator tests |

The source template intentionally has no Figma plugin ID. Registration must
use a real Figma-assigned ID; the preparation helper does not create/publish a
Figma resource. The plugin connection requires the file/plugin to remain open.
Figma network permissions and behavior while another app is foreground remain
unverified until the live paired test can run. Local test timings are not a
Figma speed benchmark. Comparison policy v3 and repair policy v2 are unchanged.

Evidence:

- `.fidelity/0.7.0-plugin-fixtures-20261014/manifest.json`
- `.fidelity/0.7.0-plugin-calibration-20261014/results.json`
- `.fidelity/0.7.0-live-attempt-20261014/attempt.json`

Earlier records below are historical.

---

# Verification record — 14 October 2026 (0.6.0)

Background Figma intake and Pi package preparation.

| Check | Result |
| --- | --- |
| `npm run check` | 70 passed, including TypeScript build, version consistency, core/MCP/release and relocated Pi package tests |
| Simulated Figma REST/MCP acquisition | Passed: scoped PNG/context without CSS or UI, revision-pinned rendering, branch/version links, immutable outputs, credentials isolated from CDN and records |
| Reference reuse | Passed: unchanged revision uses one API request; fresh export uses three; changed revision/scale, corrupted bytes and failed records trigger fresh acquisition |
| Failure handling | Passed: null render, missing node/revision, invalid PNG, access/rate-limit denial and repeated server failures preserve explicit failed/partial evidence |
| Dimension mismatch | Passed: preserves export bytes and flags profile review; no normalization |
| Screenshot skill validator | Passed in disposable Python/PyYAML environment |
| Fresh fixtures and comparator calibration | 12/12 passed; output below, existing reference PNGs unchanged |
| Package | Version 0.6.0 includes twelve MCP tools, Pi adapter, four skills and background intake documentation |
| Live Figma acquisition/timing | Not-run: no frame link or configured Figma authentication available |
| New Flutter/native/behavior checks | Not-run: no Dart changes; comparator calibration does not establish native/product acceptance |

The request counts above come from simulated API tests, not live Figma service
measurements or a before/after speed benchmark. Remote MCP workflow selection is
documented but has not been tested against a connected Figma server here.
The REST tool records elapsed time and request count in each live intake.

Fresh calibration evidence:

- `.fidelity/0.6.0-background-fixtures-20261014/manifest.json`
- `.fidelity/0.6.0-background-calibration-20261014/results.json`

Comparison policy v3 and repair policy v2 are unchanged. Existing 0.5.0 Pi
integration work is retained. Earlier records below are historical.

---

# Verification record — 14 October 2026 (0.4.0)

Local review fixes; no tag, publication, global installation or SDK change.

| Check | Current result |
| --- | --- |
| `npm run check`: version consistency, TypeScript build, core/MCP/release tests | 55 passed |
| Pre-commit Flutter checks | Flutter 3.24.0 analysis passed for harness/example; 17 UI/harness/performance unit and widget tests passed |
| Repair regressions | Passed: interaction/accessibility/responsive passed-to-failed and passed-to-not-run transitions retain selected code; visual-best tracked independently |
| Repair completion | Known product failures cannot stop as visual success; not-run product checks remain incomplete; fully recorded passing checks can complete |
| Source checkpoint binding | Scoped source/deletion snapshots, stable coverage, duplicate candidate IDs, snapshot/hash tampering, capture-time source changes and failed-capture reuse tested |
| Restoration verification | CLI and MCP verified matching/mismatched scoped files without editing unrelated source; report snapshot survives removal of capture folder |
| Four skills via official validator | Passed using a disposable Python environment with PyYAML; no global Python changes |
| Local documentation targets and whitespace | 91 targets checked; `git diff --check` passed |
| Fresh fixtures and comparator calibration | 12/12 passed; generated corpus in a new folder, existing references unchanged |
| Package dry run | Version 0.4.0 includes checkpoint tools, four skills and supporting docs |
| New real Flutter/native/Figma end-to-end exercises | Not-run in this change; no Dart edits were made during these fixes |

Capture pipeline tests use an explicitly labeled process double to exercise host
snapshot timing, source changes and failure markers. They do not establish native
Flutter rendering or product accessibility. Source identity covers only the
declared files, not every input in an application build. Comparator calibration
measures defect detection, not model-generated UI accuracy.

Current calibration evidence:

- `.fidelity/review-0.4.0-fixtures-1791964860144/manifest.json`
- `.fidelity/review-0.4.0-calibration-1791964860144/results.json`

Repair policy/session v2 changes selection and stopping gates. Comparison policy
v3 and its pixel/text/geometry thresholds remain unchanged. Capture v3 adds
source binding; legacy v1/v2 captures remain readable and explicitly unbound.
Active legacy repair sessions require the matching previous tool release and
must not have their budget reset during an update. Earlier verification below
is historical and was not rerun or upgraded into current native evidence.

---

# Verification record — 14 October 2026 (0.3.0)

Local release preparation; no tag, publish, SDK upgrade or global installation.
The earlier 12 October native results below are historical and were not rerun
for this release.

| Check | Current result |
| --- | --- |
| TypeScript build, core/MCP/release/asset/immutability tests | 37 passed |
| Official skill validator and local documentation links | Four skills valid; 81 links checked |
| Flutter harness and example analysis | Passed on Flutter 3.24.0 / Dart 3.5.0 |
| Production adapter, locales, editable/masked text, clipping, prepared animation, performance summaries and existing UI tests | 17 passed |
| Fresh fixture generation and policy-v3 comparator calibration | 12/12 passed; existing references unchanged |
| Newly implemented icons prototype | Builds; nine actual-font width/text-scale action tests passed |
| Real widget capture and comparison of that prototype | Capture v2 succeeded; visual failed at 1.131% tolerant mismatch; geometry matched all four regions |
| Product acceptance of that capture | Failed due to visual mismatch; accessibility not-run. Responsive checks passed separately but are not asserted in capture metadata |
| Package dry run | Includes new tools, docs, four versioned skills and Dart performance/capture helpers |
| Live Figma/Playwright asset recovery | Not-run: no design link supplied for this review |
| Physical-device profile, current native capture, independent/cross-assistant evaluation | Not-run; no performance improvement or generation accuracy claim |

The informed single-case prototype exercise inspected the original PNG and its
controlled fixture specification. It is not a blind benchmark. A missing-font
setup error in its responsive test was corrected by loading original Lato bytes;
all nine scenarios then passed. The visual failure is retained, including source
snapshot, capture identity, diff images and manifest. No input was resized or
reference modified to hide differences.

Local evidence:

- `.fidelity/review-v3-calibration-20261014/results.json`
- `.fidelity/skill-evaluation-1791953277/benchmark/run-0/index.html`
- `.fidelity/skill-evaluation-1791953277/runs.json`
- `.fidelity/skill-evaluation-1791953277/source-round-1/`

Policy v3 retains pixel/geometry thresholds, adds required-text overflow evidence,
and separates product checks in report v2. Approximate overflow detection does not
prove absence of occlusion or accessibility defects. Frame timing summaries were
tested with controlled data; the native profile collector itself remains unverified
on physical devices. See [evaluation cases](skill-evaluation.md) and
[performance protocol](performance.md) for the remaining live exercises.

---

# Verification record — 12 October 2026

Implemented and tested in the local workspace. No deployment, plugin account
upload, global plugin installation or global Flutter upgrade was performed.

| Check | Result |
| --- | --- |
| TypeScript compilation | Passed |
| Core/reference/comparison/repair/MCP tests | 22 passed |
| Actual MCP stdio startup, discovery and read call | Passed |
| Four agent skills via official quick validator | Passed |
| Flutter example and capture-harness analysis | Passed on Flutter 3.24.0 / Dart 3.5.0 |
| CTA callback, labeled targets, Android/iOS target sizes and contrast | Passed |
| Responsive overflow: widths 360/390/430; scales 1/1.5/2 | Nine scenarios passed |
| Real-font widget capture with measured regions | Passed |
| Native iOS capture/host transport | Passed, iPhone 16e simulator on iOS 26 |
| Native Android capture/host transport | Passed, Pixel 8 emulator on API 36, temporarily configured for 390×844 logical viewport |
| Twelve-fixture comparator calibration | 12 passed with policy v2 |
| HTML report | Inspected in browser, all six image elements loaded |
| npm package contents | Build output, skills, docs, manifests and Dart harness included; caches/build folders excluded |

Native capture here means the test compiled, launched, rendered, measured and
returned a correctly sized PNG and matching font/image/reference identity to
the host. It does **not** mean the sample Flutter UI matches the supplied fixture.
The independently implemented sample intentionally remains a visible failing
comparison: its layout, artwork and styling differ. Its reports establish that
the tools expose real errors rather than manufacturing a pass.

Report files under `.fidelity/` are local generated artifacts. The widget report
is `.fidelity/example-report/index.html`; platform reports are
`.fidelity/example-ios-report/index.html` and
`.fidelity/example-android-report/index.html`. Original PNGs remain unchanged.

Policy v1's shared Pixelmatch color threshold of 0.1 missed four pale-card/variant
removal defects. Version 2 retains 0.1 for whole-screen comparison and adds 0.01
for required-region comparisons. All twelve removal cases now fail as intended;
identical images without real capture evidence remain incomplete.

No cross-assistant generation benchmark or universal 1:1 accuracy claim has been
established. The runner accepts real agent captures for that evaluation; results
must identify the assistant/model and device environment. FigmaToCode requires
structured design input and is not a PNG-only baseline.

The available Dart 3.5.0 lacks `dart mcp-server`. The custom MCP works and was
verified; enabling the optional official Dart MCP needs a newer supporting SDK.

The Android emulator's temporary resolution/density overrides were reset after
testing. Both test devices were shut down. Local package-manager/build caches
remain, as normal development artifacts.
