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
