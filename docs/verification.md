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
