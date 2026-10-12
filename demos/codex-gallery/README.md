# Codex UI gallery · simple, complex and advanced

Codex authored three original designs before implementing them in Flutter through
our four repository skills. Each design PNG was independently rendered from SVG
and text-layout sources, imported as a hashed immutable reference, then measured
against real Flutter captures. No third-party UI screenshot or implementation was
used. Designs are CC0; Flutter/generator code is MIT; fonts retain OFL notices.

## Simple · Focus today

Task completion, progress summary, task creation sheet and accessible navigation.

![Codex simple design beside Flutter on Android](artifacts/simple-comparison.png)

## Complex · Wallet overview

Balance card, selectable chart ranges, point inspection, income/expense metrics,
transaction details and a demo payment sheet that updates the balance.

![Codex complex design beside Flutter on Android](artifacts/complex-comparison.png)

## Advanced · Operations

A code-drawn route visualization with roads, route nodes and status overlays;
three telemetry cards; traffic advisory; delivery progress; and a vehicle-follow
sheet. The route is a synthetic diagram, not a geographic map or live service.

![Codex advanced design beside Flutter on Android](artifacts/advanced-comparison.png)

## Run

```sh
cd demos/codex-gallery/app
flutter pub get
flutter run
flutter test test/ui_test.dart
```

Use Focus/Wallet/Control to switch demos. Production code depends only on Flutter;
the capture harness is a dev dependency. Capture tests need the CLI-provided
`FIDELITY_REQUEST`; configs use `flutter` on PATH and can be pointed at a pinned SDK.
The local debug APK, when built, targets `lib/main.dart` and is excluded from Git.

## Measured results

| Level | Android tolerant mismatch | Strict RGBA mismatch | Fidelity gate |
| --- | --- | --- | --- |
| Simple | 2.770% | 6.357% | Failed |
| Complex | 3.517% | 9.049% | Failed |
| Advanced | 2.724% | 5.924% | Failed |

All three fail the default whole-screen1% gate, with required-region checks too.
Remaining text shapes/placement, controls and drawing details are visible in the
reports. Pixel mismatch is not an overall accuracy percentage. These controlled,
Codex-authored examples demonstrate the workflow; they are not an independent
benchmark of arbitrary external designs.

Thirty-one widget tests pass: three interaction flows,27 responsive cases across
widths360/390/430 and scales1/1.5/2, and an accessibility evidence recorder.
Accessibility guideline findings in `artifacts/accessibility.json` retain actual
failures; a passing recorder test does not mean all guidelines passed. Native
Android tests also execute task creation/completion, payment/range/chart changes,
and vehicle-follow/navigation flows after capturing the initial fixture. Their
capture metadata records only the checks actually performed.

Static analysis passes. Android was tested on Pixel_8_API_36, Flutter3.24.0, at
1170×2532 framebuffer/density480, yielding390×844 logical pixels. Output images
use export ratio1 and zero safe insets. Observed device settings were restored.
iOS scaffold is included, but iOS rendering/interaction was not tested.

Two visual candidates were measured per screen. `session.*.json` records each best
report; `checkpoints/` preserves code. A subsequent narrow-viewport metric-height
fix leaves the390-wide fixture unchanged; final native captures use the corrected
code. The reference images and policy were never modified to improve a score.

## Evidence

- `design/`: original SVG graphics, text-layout JSON, frozen PNGs and CC0 license.
- `bundles/`: original/reference hashes, font bytes and measured-region spec.
- `runs/<level>/round-*`: widget captures and pixel/region reports.
- `runs/<level>/android`: final native captures, environment, metadata and reports.
- `artifacts/<level>-report/index.html`: visual overlay, difference maps and metrics.
- `build-comparisons.mjs`: creates the labeled README images without resizing or
  aligning either scoring input. Repository-relative image/report links work on
  GitHub; download and open HTML reports locally for their interactive controls.
