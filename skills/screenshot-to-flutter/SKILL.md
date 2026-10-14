---
name: screenshot-to-flutter
description: Build and verify maintainable Flutter UI from PNGs or Figma links. Collect Figma screen PNGs and CSS through copy-menu actions using available browser/app tools, recover original assets, follow the app's architecture, and measure visual fidelity and performance.
metadata:
  version: "0.4.0"
---

Build Flutter UI through the requested task mode, using PNG as the visual authority. The host assistant owns inference and Dart edits; the CLI/MCP measures results.

## Route the task

Infer the mode from the request and repository using [task modes](../../docs/design-clarification.md#task-modes). A visual prototype permits labeled display fixtures. An integrated feature uses established production contracts. Visual repair preserves existing behavior. Carry prior decisions forward; ask only about missing product semantics, access or scope that changes the result. Complete independent work while waiting.

Load only the guidance needed for the current stage:

| Stage | Read/use |
| --- | --- |
| Figma link or missing originals | [Design intake](../../docs/design-intake.md); paired PNG/CSS copying, scoped originals and capability fallbacks |
| New reference/capture | [Workflow](../../docs/workflow.md); immutable bundles, reviewed profile/spec, fresh runs |
| Implementation | [Architecture](../../docs/flutter-ui-architecture.md#inspect-and-choose-the-smallest-fitting-structure); inspect the target feature, then only its relevant state/layer sections |
| Feature-specific work | Applicable sections of [UI patterns](../../docs/flutter-ui-patterns.md): forms, media, motion, navigation, drawing or localization |
| Text mismatch | `flutter-typography-fidelity` |
| Measured correction | `flutter-visual-repair` |
| Delivery | `flutter-fidelity-verification` and the cleanup rule below |

## Acquire Figma inputs

When a Figma link is supplied, collect the inputs automatically through available
Playwright/browser or native-app tools. For each requested screen:

1. Select its frame via the screen title or layer entry and confirm its node.
2. Use **Copy/Paste as → Copy as PNG**; save and validate the fresh clipboard
   image in the new intake `frames/` directory before another copy action.
3. Use **Copy/Paste as → Copy as code → CSS** for that selection; save fresh
   clipboard text under `context/`, with node identity and coverage. Copy scoped
   child styles or use connector/inspector data for properties the snippet omits.
4. Collect required original images, vectors and available font files as a batch.
   Record hashes, dimensions, actual PNG scale and remaining gaps in the manifest.

Follow the [intake contract](../../docs/design-intake.md) for clipboard freshness,
format validation and fallbacks. Missing copy capabilities use available
connector/inspector evidence; ask only for unresolved access or required inputs.
Users need not separately provide CSS and PNG when tools can retrieve them.
Use the [CSS translation mappings](../../docs/design-intake.md#translate-css-into-flutter) for units, typography and effects. Translate acquired styling into the app's Flutter layout and components, using
the PNG to resolve visual discrepancies. Continue implementation once sufficient
inputs are available; optional missing CSS alone does not block the task.

## Execute

1. Run `doctor`. Establish logical viewport, export scale, crop and safe insets from supplied or reliable source evidence; pixels alone do not establish logical size. Retrieve scoped originals in a batch. Run `validate_assets` on saved PNGs/assets; resolve invalid files before import. Keep originals unchanged and uncertainty explicit.
2. Import the PNG/fonts/assets. Inspect the original-resolution image and save a reviewed `VisualSpec` through `inspect_reference.visualSpec`. Use stable region IDs and widget-box bounds; distinguish these from glyph ink. Keep architecture and decision records outside this strict schema. Do not upgrade guesses to make gates pass.
3. Trace a comparable production feature: route/composition → action → state owner → operation/data → state/effect. Record evidence paths and a small change map. Reuse the app's theme, controls, state management and layer boundaries. For a new prototype, choose the smallest structure that supports the view; do not manufacture clean-architecture layers or install a state package.
4. Compose named widgets with typed data/callbacks. Keep I/O and business rules in their established owners and dispose owned resources. Use constraints/flow for normal layout, genuine overlays for overlap, flexible text-bearing surfaces and lazy collections when needed. Preserve text scaling, semantics, keyboard access and safe areas. Implement controls/text/charts as widgets or appropriate drawing, never as screen crops. Preserve exact source assets and formats unless a conversion/substitute is authorized.
5. Integrate confirmed routes, DI and actions for an integrated feature; a detached mock screen is insufficient. For a prototype, label fixture data and leave unconfirmed backend behavior outside the deliverable. Test actual outcomes of implemented interactions.
6. Use the development-only capture harness through the production app adapter where possible. Supply production localization configuration for isolated shells. Follow the [capture contract](../../docs/workflow.md#capture-entrypoint) for fonts/images, readiness, editable/masked text and clipping evidence. Run scoped formatting, analysis and relevant tests, then capture and compare.
7. Apply bounded repair with [source-bound captures](../../docs/workflow.md#source-checkpoint-binding), retaining the selected code/report pair and verifying restored source before fresh recapture. Protect previously passing product checks; a better visual score cannot justify lost behavior. Validate responsive, accessibility and confirmed behavior separately from visual status. Use the [performance protocol](../../docs/performance.md) when runtime optimization is requested or warranted; never infer a speedup from source review alone.

Deliver runnable source, integration/run instructions, reference and report paths, and explicit failed/incomplete/not-run outcomes. Do not stop at a plan when implementation is authorized. Do not claim native fidelity from a widget capture or product acceptance from visual status alone.

After handoff, offer [temporary screenshot cleanup](../../docs/workflow.md#temporary-screenshot-cleanup) once with eligible files/count/size. Preserve originals and required final/failure evidence; delete only after the user agrees. Skip the question when there are no eligible files.
