# Flutter Fidelity

The plugin, CLI and four skills share one release version. Check it with
`node dist/cli.js --version`; see [release notes](CHANGELOG.md) for changes.

Turn a design PNG or Figma link into maintainable Flutter UI, then measure the result with
reproducible screenshots, pixel comparisons, and region-level reports.

Screenshot-first Flutter UI development with an existing vision-capable coding
assistant. PNGs are the visual authority; Figma/Sketch metadata is optional.

For Figma links, the assistant tries connected design tools, then available
Playwright/browser automation when details or assets are missing. It collects
scoped originals in a batch, records provenance and validates formats before
implementation. For screen references it prefers selecting the Figma frame and
using **Copy as PNG**, saving verified clipboard image bytes locally, followed
by **Copy as code → CSS** for styling evidence. Snippets retain their node
coverage and inform native Flutter implementation. Connector PNG/export and
inspector properties are fallbacks when copying is unavailable. If browser
automation is unavailable, it explains what to connect and batches the remaining
access or input request.
See [design intake and asset recovery](docs/design-intake.md).

This repository provides a working TypeScript CLI/MCP server, four agent skills,
a Dart development capture harness, an example Flutter screen, twelve screenshot
fixtures, a comparator calibration runner, and interactive HTML reports.

**The assistant generates and repairs Dart.** The CLI performs deterministic
imports, captures and comparisons; it is not a standalone model runner. No
universal 1:1 accuracy is claimed. It reports exact differences and remaining
uncertainty rather than hiding them in an “accuracy” score.

## Quick start

Requires Node 22+; Flutter is required only for capture. Use a pinned SDK. Official
Dart MCP additionally needs a Dart SDK supporting `dart mcp-server`.

```sh
npm ci
npm run build
npm test
node dist/cli.js doctor
node dist/cli.js validate-assets --files ./assets/hero.png ./fonts/Lato-Regular.ttf
node dist/cli.js suggest-viewport --image your-screen.png
node dist/cli.js import-image --image your-screen.png --out .fidelity/reference \
  --width 390 --height 844 --confirmed --fonts ./fonts/Lato-Regular.ttf ./fonts/Lato-Bold.ttf \
  --assets ./assets/hero.png
```

Establish logical dimensions and app-content crop from the supplied profile or
reliable frame/export evidence; ask when they remain unknown. A PNG can be an
export at 2x/3x. `--crop x,y,width,height` uses original PNG pixels. Inputs are
copied and hashed. Existing bundle/run directories are never overwritten.
Missing fonts permit inspection, but the result remains incomplete.

Connect `node /absolute/path/to/dist/cli.js mcp` to your coding assistant as a
stdio MCP server. Load the skills under `skills/`, or use the local plugin
manifests after `npm ci && npm run build`. See [setup](docs/setup.md) and
[workflow](docs/workflow.md) for the full screenshot-to-Flutter loop.

The repository-owned skills are:

- [Screenshot to Flutter](skills/screenshot-to-flutter/SKILL.md): PNG/Figma intake, browser asset recovery, composable UI architecture, adaptive layout and vector chart reconstruction.
- [Typography fidelity](skills/flutter-typography-fidelity/SKILL.md): font bytes, weights, glyphs and measured text.
- [Visual repair](skills/flutter-visual-repair/SKILL.md): bounded corrections, retained candidates and behavioral verification.
- [Fidelity verification](skills/flutter-fidelity-verification/SKILL.md): architecture review, native captures, interactions, accessibility and runnable deliverables.

Generation follows [Flutter UI architecture](docs/flutter-ui-architecture.md):
trace a comparable feature's route, state and data flow, record evidence for
state management and layering, then place UI and confirmed logic in those
existing boundaries. For BLoC/Cubit with clean architecture, this includes
presentation state wiring, domain/data contracts and route/DI integration;
other patterns follow their existing owners. Reuse semantic tokens and derive
adaptive layouts from constraints. The guide compares the previous skill pattern with these
standards and links official Flutter guidance. Architecture and performance
evidence accompany visual reports; the CLI's design-fidelity gates retain their
visual scope, while report acceptance tracks analysis, interactions, accessibility
and responsiveness separately. Required checks that were not run remain incomplete.

The [autonomous workflow](docs/workflow.md#autonomous-execution-and-delivery)
carries authorized work through asset intake, implementation, route/state
integration, tests, capture and bounded repair. It reuses prior decisions and
makes routine engineering choices without stage-by-stage approval. Original
assets and authorized derivatives remain traceable in an optional
[asset manifest](docs/asset-manifest.template.json). Runtime optimization uses
[repeatable profile evidence](docs/performance.md);
unmeasured performance remains explicit.

Optional [UI patterns](docs/flutter-ui-patterns.md) cover forms/focus, component
states, media/loading, motion/haptics, navigation/overlays, canvas gestures,
localization and reliable previews/tests. They synthesize a
[public Flutter skill survey](docs/flutter-skill-research.md) with primary sources
and explicit selection limits, while preserving the target app's conventions.

Choose the [task mode](docs/design-clarification.md#task-modes) from the request:
visual prototypes may use labeled display fixtures; integrated features use
production contracts; visual repairs preserve behavior.

Before generating ambiguous integrated interactions or chart behavior, the agent inspects
existing widgets/dependencies and [asks the developer for the missing decisions](docs/design-clarification.md).
This includes chart-library reuse or selection, tappability/actions, data sources,
range semantics, supported states and missing icon/image assets. If an SVG/PNG
cannot be found or rendered, the agent diagnoses loading and attempts automatic
source recovery first, then batches residual questions for originals, existing
components or approved alternatives. Existing contracts and delegated choices
do not require repeated confirmation.
Required answers are recorded before the
dependent implementation; screenshot appearance alone is not treated as proof
of behavior. The CLI/MCP measures rendering and does not enforce these decisions.

The assistant inspects the screenshot, saves a reviewed visual spec, generates
real Flutter widgets and a capture entrypoint, then uses:

```sh
node dist/cli.js inspect --bundle .fidelity/reference --spec visual-spec.json
node dist/cli.js capture --bundle .fidelity/reference --config capture.json --out .fidelity/capture-1
node dist/cli.js compare --bundle .fidelity/reference --actual .fidelity/capture-1/actual.png \
  --capture .fidelity/capture-1/capture.json --out .fidelity/report-1
node dist/cli.js record-iteration --session .fidelity/session.json --report .fidelity/report-1
```

Open `.fidelity/report-1/index.html` for overlay opacity, blink inspection,
difference maps, region metrics, policy, environment and unresolved issues.
Compare exits **0 = passed**, **1 = failed**, **2 = incomplete**. A design-fidelity
pass is separate from interaction, accessibility and responsive acceptance.
Policy v3 adds required text-overflow evidence without changing numeric pixel
thresholds. Reports v2 expose `acceptance.status`; consumers requiring product
acceptance must inspect it as well as the visual exit code. See
[compatibility notes](docs/workflow.md#comparison-and-repair).

Repair policy v2 protects passed product checks and retains separate visual and
product-valid candidates. `bestReport` is the delivery/restoration choice;
`bestVisualReport` can be diagnostic evidence of a broken candidate.
Use `sourceCheckpoint` in capture config to bind each report to a scoped source
snapshot. After restoring owned files, run `verify-source-checkpoint` before fresh
verification. See [source binding](docs/workflow.md#source-checkpoint-binding).
Legacy captures remain readable; legacy repair sessions require their matching
tool release and cannot silently reset their budget.

## Validate and benchmark

For users with a clean source clone, `npm run update:check` reports available
upstream changes and `npm run update` fast-forwards, installs locked dependencies,
builds and tests. Refresh/reload the plugin through your host afterward. This
follows your tracked source branch; use a released Git tag to pin a version.
See [versions and updates](docs/updates.md) for details and older-install bootstrap.

```sh
npm run check
npm run fixtures -- --out .fidelity/fixtures-new
npm run benchmark -- --fixtures .fidelity/fixtures-new --out .fidelity/calibration-new
```

Both commands require fresh output paths and preserve existing references.
Omitting `--fixtures` benchmarks the checked-in corpus. See the
[skill evaluation cases](docs/skill-evaluation.md) for realistic workflow exercises.

The default benchmark is **comparator calibration**, not model generation
accuracy: it checks twelve references against deliberate defects. Identical PNGs
without real capture evidence remain incomplete. To evaluate generated Flutter
from different assistants, use a real capture manifest:

```sh
npm run benchmark -- --manifest your-runs.json --out .fidelity/agent-evaluation
```

See [benchmark protocol](docs/benchmark.md) and [verification results](docs/verification.md). The source fixtures are synthetic
screenshots with separately licensed Lato fonts, not recovered Figma documents.

## Flutter example

```sh
cd flutter/example
flutter pub get
cd ../..
node dist/cli.js import-image --image fixtures/screens/complete-screen.png \
  --out .fidelity/example-reference --width 390 --height 844 --confirmed \
  --fonts fixtures/fonts/Lato-Regular.ttf fixtures/fonts/Lato-Bold.ttf
node dist/cli.js capture --bundle .fidelity/example-reference \
  --config examples/capture.widget.json --out .fidelity/example-capture
```

The example is an independently implemented demonstration of capture, not a
claim that it already matches the fixture. Comparing it exposes differences to
repair. For native Android/iOS, add platform scaffolding with `flutter create
--platforms=android,ios .` in the example, configure a simulator/emulator and use
the integration capture/driver. Native font bytes must match the bundle.

## V1 boundaries

Local assistant workflow, screenshot inputs, and Flutter mobile UI. Runtime code
does not depend on the capture harness. Backend generation, native platform
views and complex animation/shaders are outside v1. Built-in Figma/Sketch API
adapters and an independent model-API runner are not part of this release.
Figma/browser recovery is orchestrated by the host assistant using available
external tools; no browser plugin is installed or bundled by this package.

## Codex-generated UI: simple, complex and advanced

Codex created three original CC0 design references, then implemented the Flutter
UI using our screenshot-to-Flutter, typography, visual-repair and verification
skills. The images below show the **unchanged design PNG on the left** and the
**actual Flutter UI captured on Android on the right**, at390×844 app-content size.
References were created before Dart UI implementation; the app uses real text,
controls and vector drawing, with no screen-sized image asset.

### Simple · Focus today

Task list, completion states, progress summary and task creation.

![Simple Codex design versus Flutter UI](demos/codex-gallery/artifacts/simple-comparison.png)

### Complex · Wallet overview

Balance summary, interactive chart, range selection, transaction rows and demo payments.

![Complex Codex design versus Flutter UI](demos/codex-gallery/artifacts/complex-comparison.png)

### Advanced · Operations

Route visualization, layered vehicle status, telemetry cards, traffic advisory,
delivery progress and vehicle tracking interactions.

![Advanced Codex design versus Flutter UI](demos/codex-gallery/artifacts/advanced-comparison.png)

| Level | Android tolerant pixel mismatch | Fidelity gate |
| --- | --- | --- |
| Simple | 2.770% | Failed |
| Complex | 3.517% | Failed |
| Advanced | 2.724% | Failed |

All31 widget tests, static analysis and three native Android interaction tests
pass. Accessibility findings are recorded separately and retain failures. The
screens still fail our1% whole-screen fidelity gate; this is a measured demo,
not a claim of universal pixel-perfect generation. iOS was not tested.

[Run the gallery and inspect the reports](demos/codex-gallery/README.md).
The earlier [Open Wellness examples](demos/open-wellness/README.md) remain available.
For other multi-screen references, see [verified CC0 UI kit options](docs/free-ui-resources.md).

## Repository layout

The [Fieldnotes feed demo](demos/fieldnotes-feed/README.md) implements a newly
generated ImageGen reference with the updated skills. It includes a runnable
Flutter app, 19 state/widget tests, Android interaction/capture evidence and
preserved repair rounds. Native tolerant mismatch is 6.474%, so it retains a
failing fidelity result and separate accessibility findings.

- `src/`: CLI, MCP server, reference intake, capture and comparison implementation.
- `skills/`: four reusable screenshot-to-Flutter agent skills.
- `flutter/fidelity_harness/`: development-only capture and region measurement.
- `flutter/example/`: minimal Flutter example and verification tests.
- `fixtures/` and `scripts/`: synthetic references and comparator calibration.
- `demos/`: original CC0 UI designs, runnable Flutter implementations and visual reports.
- `docs/`: setup, workflow, architecture, research and benchmark methodology.

After cloning, run `npm ci && npm run check`. To run a demo, change into its
`app/` folder, then run `flutter pub get`, `flutter run`, and
`flutter test test/ui_test.dart`. Its capture tests require a
`FIDELITY_REQUEST` supplied by the CLI. Replace machine-specific Flutter paths
in capture configuration with your installed SDK or `flutter` on PATH.

## Licensing

Project code is covered by the [MIT license](LICENSE). Open Wellness and Codex Gallery design
sources and reference PNGs are dedicated to the public domain under
CC0 ([Wellness](demos/open-wellness/design/LICENSE), [Gallery](demos/codex-gallery/design/LICENSE)), allowing personal and commercial reuse
without attribution. Bundled fonts retain their included OFL licenses, and
dependencies retain their own required notices. The design dedication does not
change those software/font licenses.
