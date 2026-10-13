# Flutter UI generation architecture

Read this before generating a screen. Use the review section again during repair
and delivery. The goal is accurate rendering in code that fits the target app,
supports its confirmed states and remains easy to change. PNG fidelity and
engineering quality require separate evidence.

For feature-specific implementation, read the applicable [UI patterns](flutter-ui-patterns.md).
The [public-skill survey](flutter-skill-research.md) records the additional sources
and selection decisions; load it only when provenance or future updates matter.

## Comparison with the previous skill pattern

| Area | Previous guidance | Generation standard |
| --- | --- | --- |
| Visual evidence | Detailed regions, font hashes, fresh captures and bounded repair | Retain these controls and the existing policy v2 |
| Architecture | Preserve architecture; separate presentation/business logic | Identify actual owners and dependencies before choosing files/state boundaries |
| Widget structure | Reuse repeated patterns | Extract sections by responsibility, reuse and rebuild scope; explicit inputs/actions |
| Styling | Match each visual property | Own semantic tokens/styles once, with measured local exceptions |
| Adaptive layout | Check three mobile widths and larger text | Derive constraints first, then test content, insets and supported breakpoint transitions |
| Runtime quality | Interaction/accessibility checks | Also review lifecycle, rebuild scope and expensive rendering; profile when warranted |
| Acceptance | Measured design-fidelity report | Add evidenced architecture review; retain separate behavior/accessibility/platform/performance outcomes |

These additions guide the assistant. They do not add an automatic MCP architecture
gate, change comparison thresholds or prove superior model-generation accuracy.

## Inspect and choose the smallest fitting structure

Inspect the target app's instructions, pubspec/lockfile and SDK range, entrypoint,
feature folders, theme, shared widgets, routing, state management, dependency
injection and tests. Name actual components/files to reuse. An existing Riverpod,
Bloc, Provider, ChangeNotifier or other architecture takes precedence over a new
pattern. Do not migrate the app, install a state package or reorganize unrelated
code merely to implement a screen.

Record a brief plan in the existing decision record or a sidecar Markdown file
beside the visual spec: feature entrypoint/conventions; sections mapped to
required region IDs and widget owners; shared versus feature styles/assets;
state owner and approved actions/inputs; fixed/flexible/wrapping/scrollable/overlay
layout rules; supported scenarios and uncertainties. VisualSpec has a strict
schema. Keep this plan outside it; supported layoutNotes/region notes may contain
relevant layout facts.

For an isolated screen, widgets receiving immutable display data and callbacks
can be sufficient. Local selected/focus/animation state can be widget-owned.
Keep a one-off private widget in the feature file when another file adds no
clarity. Do not create empty services, repositories, use cases or model layers.

For a data-driven feature, follow the existing state layer. In a new app without
conventions, views plus a controller/view model and injected data boundary are
a useful starting point. Add repositories/services when real data sources need
them; a domain/use-case layer is appropriate for complex or reused business rules.
The screenshot task does not authorize backend work.

An optional layout for a new feature is:

```text
lib/
  app/                           # shell, routes and composition
  ui/core/                       # genuinely shared theme/components
  features/<feature>/
    <feature>_screen.dart         # sections, inputs and actions
    <feature>_view_model.dart     # only when state/logic needs it
    widgets/                     # independently responsible sections
  data/                          # existing or necessary data boundaries
test/
  features/<feature>/            # contract/state/widget tests and fixtures
```

Names/directories are examples, not required folders. Omit unused entries and
use the repository's organization. Feature-first and layer-first structures can
both express sound dependency boundaries.

## Design tokens and component boundaries

Use the existing ColorScheme, TextTheme and component themes for semantic roles.
For extra repeated roles use the app's token system, a scoped immutable style
object or ThemeExtension compatible with its SDK. Scope a reference-specific
theme when global changes would restyle unrelated screens. Specify reference
colors explicitly when seed-generated defaults differ. Inspect control defaults
such as padding, minimum size, density, tint and elevation before compensating
with outer offsets.

Infer repeated spacing/radius/type roles; do not force values onto a guessed
4/8-pixel grid. Keep optical adjustments and unique artwork geometry as named
local values. Reuse identical roles across screens while retaining intentional
variants. Missing fonts/uncertain measurements remain unresolved after token
extraction.

Compose the shell, major sections and independently rebuilding/interactive
controls as named widget classes, with const constructors where possible. Small
local build helpers are acceptable; reusable/stateful sections should not be
buried in chains of helper methods. Extract by responsibility, not arbitrary
line counts or one file per leaf. Promote shared components only for actual
consumers or established design-system roles.

Expose typed data and action callbacks. Avoid universal cards with unrelated
mode flags or untyped screenshot-coordinate maps. Render approved fixtures and
live state through the same inputs, without production `isScreenshotMode`
branches. Stable domain keys preserve changing list identities; visual region
IDs identify evidence and are not automatically domain identity.

## State, dependencies and lifecycle

Views compose/layout widgets and forward actions. Put business calculations,
range aggregation, validation rules and transformations in the existing
state/domain owner. Repositories coordinate data sources when needed; API and
platform access belongs behind existing service boundaries. Express approved
loading/empty/error/content/selection states in the app's model convention;
do not invent states or duplicate a source of truth in widget and controller.

Use existing injection or constructor inputs for deterministic approved fixtures.
Do not start requests, mutate state, create long-lived controllers or repeatedly
sort/parse large datasets in build. Observe the needed state slice where supported
and keep transient state near the subtree it changes.

Create controllers/subscriptions once at their owner, update subscriptions when
inputs change and dispose owned resources. Do not dispose injected objects owned
elsewhere. After asynchronous gaps, honor cancellation/lifecycle and check
mounted/context validity before UI work with APIs supported by the pinned SDK.
Guard stale results/duplicate submissions where confirmed behavior requires it.
Keep navigation consistent with the existing router and route contracts.

Keep the harness in development dependencies/test entrypoints. An injected
neutral region-wrapper callback is acceptable when already used by the app;
production widgets must not import capture or filesystem tooling.

## Constraints, adaptation and input

Treat reference bounds as measurements to reproduce through layout rules.
Use flow, padding and alignment; Stack/Positioned belong to true overlaps.
Fixed sizes suit icons, artwork and bounded chart viewports. Text-bearing
content usually needs flexible width/height, wrapping and scrolling fallback.

Use LayoutBuilder for local constraints and narrowly scoped MediaQuery queries
for window/insets/text settings where supported. Choose breakpoints when content
needs different composition, following app conventions. Do not scale every
dimension by width/referenceWidth, shrink a fixed screen with FittedBox, add
per-device coordinate tables or lock orientation to pass a capture. Another
viewport needs its own reference for a fidelity claim.

Expanded/Spacer require bounded main axes; vertical scrollables provide no
finite height for a flex child. Use content-sized columns for short bodies and
lazy ListView/GridView/slivers for large/dynamic collections. Avoid nested
scrolling with shrinkWrap as a default fix. Constrain content width on wide
windows and preserve selection/scroll state across supported layout changes.

Coordinate SafeArea, shell and agreed app-content crop to apply insets once.
Respect keyboard viewInsets for forms. Keep platform text scaling enabled;
do not approximate nonlinear TextScaler with a global multiplier or hide
essential content at larger scales. Allow wrapping and height growth. Use
directional alignment/padding for directional content, retaining deliberate
physical artwork geometry. Use existing localization/formatting; reference
text is a fixture, not proof of supported locales.

Prefer existing Material/Cupertino or app controls with configured visuals and
built-in input behavior. Custom controls need actual labels, role, selected/
disabled state, focus/keyboard activation and hit targets. Avoid duplicate
wrapper/child announcements. A small icon can have a larger non-overlapping hit
area. When faithful contrast/targets conflict with accessibility, record the
discrepancy and follow the confirmed design decision; never hide the failure.
Custom drawings do not replace accessible labels or real controls.

## Rendering cost

Localize rebuilds, retain stable const children and use lazy collections.
Avoid intrinsic layout passes in large repeated layouts without a concrete need.
Choose image decode/cache sizes for actual rendering while preserving quality
at the reference profile. Asset optimization must not convert formats or degrade
originals without existing authorization.

For CustomPainter, compare visual inputs in shouldRepaint and use a repaint
listenable when appropriate for animations. Blanket false can freeze changes;
blanket true can repaint unnecessarily. Provide semantics when drawing conveys
information and test confirmed gestures separately. Avoid unnecessary saveLayer,
repeated blur/opacity/clipping or gratuitous RepaintBoundary wrappers. Profile
to decide where extra boundaries help; retain required capture boundaries.

For demanding interactions, profile on a named supported device when available.
Report build/raster/frame findings against its refresh rate and tested scenario.
Widget tests, debug timings and source inspection do not establish native
smoothness.

## Review and evidence

Before capture review structure; during repair review affected owners; at
delivery tie findings to actual files, tests or traces:

| Review | Evidence to record |
| --- | --- |
| Components/styles | Named section owners, reused components/tokens and justified local variants |
| State/data flow | Source of truth, approved actions/fixtures, dependencies and lifecycle ownership |
| Layout | Bounded flow/overlays, content growth, safe/keyboard insets and breakpoint behavior |
| Code validation | Formatting, analyzer output and relevant existing/contract-based tests |
| Behavior/accessibility | Expected action outcomes, semantics/input/targets/contrast; individual failures |
| Adaptive states | Executed viewport, content, text scale, locale and resize scenarios within scope |
| Performance/platform | Named profile trace/native capture, or explicit not-run result |

Fix structural defects in the generated feature before reporting it ready. Test
substantial transformations/state transitions independently; widget tests should
assert confirmed user-visible outcomes. Avoid tests of file names, extraction or
generated wording. In this repository follow AGENTS.md: npm run check; Dart
edits require analysis and flutter/example's test/ui_test.dart; image/policy
edits also require fixtures/benchmark. Target apps retain their required checks.

Keep this review alongside the report, outside unsupported CLI fields.
Distinguish source-reviewed, executed-passed, executed-failed and not-run evidence.
Refactoring cannot reuse stale captures or bypass the five-round/two-stall limit.
Architecture review does not change policy v2 or turn comparator calibration
into a generation benchmark. Best-in-class claims require comparative runs of
generated apps, not instructions alone.

## Official guidance

Consulted 12 October 2026; use APIs compatible with the target app's pinned SDK.
The choices above apply this guidance to screenshot generation:

- [Architecture recommendations](https://docs.flutter.dev/app-architecture/recommendations): separation of concerns and testable data/state boundaries.
- [Architecture guide](https://docs.flutter.dev/app-architecture/guide): view/state/data responsibilities and optional domain layers.
- [Adaptive best practices](https://docs.flutter.dev/ui/adaptive-responsive/best-practices) and [general approach](https://docs.flutter.dev/ui/adaptive-responsive/general): available-space layouts and component composition.
- [Performance best practices](https://docs.flutter.dev/perf/best-practices): build cost, lazy layout and expensive rendering.
- [Accessibility](https://docs.flutter.dev/ui/accessibility): semantics and independently checked usability.
- [CustomPainter API](https://api.flutter.dev/flutter/rendering/CustomPainter-class.html): repaint and semantics contracts.
