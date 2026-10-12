---
name: flutter-fidelity-verification
description: Verify screenshot-derived Flutter UI with reproducible captures, real-font visual reports, native platform checks, interactions and responsive/accessibility scenarios.
---

Read [the workflow](../../docs/workflow.md). Pin Flutter, engine/renderer configuration, simulator/emulator OS, logical viewport, export ratio, locale, font bytes, safe insets and fixture state. Wait for real font loading, decoded images and painting; freeze animations and live data in the fixture. Report capture failure instead of using a stale PNG.

Run static analysis and compare at the confirmed dimensions. The report requires font hashes, actual-image hash, settled capture metadata, reviewed required regions, text and geometry evidence. Exact RGBA equality and tolerant pixel mismatch are separate; SSIM is diagnostic. Default policy v2 gates are 1% whole-screen at color threshold 0.1, 3% per required region at threshold 0.01, and one logical pixel of geometry error. The stricter region threshold was calibrated to catch pale missing cards. Policy changes require explicit versioning and reporting, not silent calibration.

Use the confirmed decisions from [design clarification](../../docs/design-clarification.md) to define behavioral acceptance. Run real interaction tests for confirmed actions, semantics/tap-target/contrast checks, and overflow checks at widths 360, 390 and 430 and increased text scaling. Test expected outcomes against developer-approved data/fixtures and range semantics, not just that a tap causes a repaint or opens an invented sheet. If required behavior is unresolved, retain it as pending and do not claim product acceptance. Mark a check passed only after actually running it. Fidelity report scope is design-fidelity; missing behavioral checks are not evidence of production readiness.

Exercise chart gestures, percentage/amount changes, dialogs and navigation when present. Reset fixture state and wait for transient overlays to disappear before capturing a native screenshot after interactions. Record each accessibility guideline separately; source-faithful colors or dimensions may fail contrast or tap-target checks even when labels pass. Overflow checks at other sizes do not establish screenshot fidelity at those sizes.

Widget tests establish a controlled development rendering result. Android and iOS require their own native captures and named device profiles. Native platform views and complex shaders/animations are outside this v1. If the source screenshot includes OS chrome or device borders, compare the agreed app-content crop and describe excluded chrome.

Record device size/density overrides before changing them and restore the observed settings afterward. When delivering an APK after Flutter drive, rebuild explicitly with the production entrypoint (for example, `flutter build apk --debug --target lib/main.dart`); the integration-test APK is not the runnable demo deliverable. Check a standalone source archive's harness dependency path with dependency resolution and analysis. Supplemental screen previews must be labeled as previews, without implying reference-based acceptance.

Deliver the reference, actual, overlay, strict/tolerant maps, region report, capture environment and unresolved problems. Claim exact matching only when exactPixelEquality is true, and platform verification only for devices actually tested.
