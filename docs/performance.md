# Repeatable Flutter performance evidence

Use this when optimization is requested or a feature has demanding scrolling,
charts, images or effects. Source review can identify likely costs; runtime claims
require a native profile-mode measurement. Use the target app's existing budgets
and profiling infrastructure first. Do not claim physical-device performance
from a simulator, emulator, widget test or debug build.

## Define the experiment

Record revision, Flutter/engine version, renderer, physical device and OS,
refresh rate, viewport, thermal/power state, scenario, data/asset sizes and
cold/warm conditions. A device label alone is insufficient: verify it against
the connected target. State the budget before optimization; do not tune it to
the observed result. Build and raster work each have a refresh-dependent budget
of 1000 / refreshHz milliseconds; totalSpan is reported separately rather than
adding build+raster and calling that missed-frame time.

Choose an action with an observable completion condition, such as scrolling a
fixed populated list through a fixed distance or selecting the same chart points.
Keep fixtures, locale, image-cache conditions and interaction pace identical.
Use a separately recorded warmup for warm runs. Cold startup requires a fresh
process/native startup trace; an in-app collector cannot measure process launch.

## Collect and retain samples

The development-only `fidelity_performance.dart` helper provides
`collectFidelityPerformance`. It refuses non-profile mode and returns raw
FrameTiming samples, p50/p90/p99/max/mean build/raster/total-span milliseconds,
missed build/raster budgets and over-budget frame counts. Empty samples are
incomplete. It optionally records process RSS before/after; this is not Dart
heap size, peak allocation or decoded image-cache size.

```dart
import 'package:fidelity_harness/fidelity_performance.dart';

final evidence = await collectFidelityPerformance(
  action: () async { /* execute and await the agreed scenario */ },
  scenario: 'Scroll 100 product rows from first to last',
  device: verifiedDeviceName, refreshHz: verifiedRefreshHz,
  revision: revision, flutterVersion: sdkVersion, renderer: renderer,
  dataset: '100 rows; asset manifest SHA recorded alongside this artifact',
  thermalAndPowerState: observedPowerState, cold: false,
  includeProcessRss: true,
);
```

Persist the returned JSON through the integration driver's reportData callback
or your existing artifact writer. Use a fresh output path. Attach a DevTools or
integration timeline trace when diagnosing CPU/GPU work; FrameTiming is a
distribution record, not a full profiler trace. Collect relevant heap/image-cache
snapshots separately when memory is the optimization target. Keep raw artifacts
so the summary can be recomputed.

Run the same scenario at least three times before and after on the same device.
Keep all runs, sample counts and conditions; report per-run variability rather
than selecting only the fastest run. If fewer runs or different conditions are
unavoidable, identify the result as preliminary/non-comparable. Set the action
duration long enough to produce useful samples; a p99 from a few frames is weak
evidence, even though it is mathematically calculable.

## Fix, then verify

Fix the measured cause in its existing owner: rebuild scope, repeated transforms,
eager lists, oversized decodes or paint effects. Avoid speculative caches,
isolates, new packages or blanket RepaintBoundary wrappers. Preserve original
artwork; store authorized derivatives with original/output hashes, dimensions,
format, bytes and consumers. Do not shrink reference/capture PNGs.

Repeat the experiment and report before/after distributions, missed-budget counts
and relevant memory alongside visual and interaction rechecks. Missing device or
trace access remains not-run, not a speedup. Unresolved regressions stay visible.
Performance work does not reset the visual repair budget.

Primary guidance: [Flutter integration profiling](https://docs.flutter.dev/cookbook/testing/integration/profiling)
and [performance best practices](https://docs.flutter.dev/perf/best-practices).
