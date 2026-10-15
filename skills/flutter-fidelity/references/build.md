# Build and reuse widgets

## Acquire Figma inputs

Default to browser-only Figma access through connected remote MCP or REST; no
Figma desktop application or local plugin is required. Prefer a supplied
validated reference when available. Otherwise use connected remote MCP or
`acquire_figma` with `url`, a fresh `out` directory and optional `reuse` pointing
to a prior successful intake. REST reads `FIGMA_ACCESS_TOKEN` from the server
environment. Read saved `context/node.json` for styling and `intake.json` for
logical dimensions, revision, PNG hash/scale and profile warnings. An existing
local Figma plugin is opt-in only when the user chooses it; do not recommend or
set it up as part of this workflow.

Acquire each scoped frame/context and shared asset batch once for all workers.
Pass local evidence paths to workers; do not repeat exports per subagent.

Follow [design intake](docs/design-intake.md) for access, validation and
fallbacks. Save/validate actual PNG bytes; tool previews and metadata alone are
insufficient. Use structured typography, layout, fills and effects directly;
**CSS copying is optional**. Do not open copy menus or repeatedly fetch child CSS
when existing design context is sufficient. Use browser/native copying only as
an available fallback or an explicit user choice; background-only requests must
remain background-only. Stop repeated access failures and batch the remaining
access/assets request once. Collect original artwork/fonts separately.

Reuse references only with matching source/revision and verified bytes; use a new
run directory and never reuse failed captures. Apply the
[CSS mappings](docs/design-intake.md#translate-css-into-flutter) when CSS is
actually present. Continue implementation once sufficient inputs are available;
missing optional styling metadata does not block the task.

## Execute the build

1. Run `doctor`. Establish logical viewport, export scale, crop and safe insets from supplied or reliable source evidence; pixels alone do not establish logical size. Retrieve scoped originals in a batch. Run `validate_assets` on saved PNGs/assets; resolve invalid files before import. Keep originals unchanged and uncertainty explicit.
2. Import the PNG/fonts/assets. Inspect the original-resolution image and save a reviewed `VisualSpec` through `inspect_reference.visualSpec`. Use stable region IDs and widget-box bounds; distinguish these from glyph ink. Keep architecture and decision records outside this strict schema. Do not upgrade guesses to make gates pass.
3. Trace a comparable production feature: route/composition → action → state owner → operation/data → state/effect. Record evidence paths and a small change map. Reuse the app's theme, controls, state management and layer boundaries. For a new prototype, choose the smallest structure that supports the view; do not manufacture clean-architecture layers or install a state package.
4. Before Dart edits, use host vision to name reusable widget regions and `mark_widgets` to record integer bounds in original PNG pixels. Read [widget catalog](docs/widget-catalog.md) for the four tool contracts and examples. Call `find_widgets` against the project catalog (convention: `.fidelity/widgets`), including existing app components in the review. Inspect candidate source and changed/missing-source flags; similarity is not proof of interchangeability. Choose `reuse`, `adapt` as a parameterized variant, or `create`, and group repeated regions into one task. Keep mark coordinates separate from logical-pixel VisualSpec bounds.
5. Call `plan_widget_work` with complete region coverage, dependencies and explicit owned files. The coordinator owns shared theme/contracts and screen integration. Workers own separate widget files, conventionally `lib/widgets/*.dart`, adapted to the app's structure. Dispatch available authorized host subagents in validated waves (default maximum three); work sequentially when delegation is unavailable. The toolkit plans and measures; it does not run models. Supply evidence paths, typed contracts, scope and acceptance checks in each brief.
6. Compose named widgets with typed data/callbacks. Keep I/O and business rules in their established owners and dispose owned resources. Use constraints/flow for normal layout, genuine overlays for overlap, flexible text-bearing surfaces and lazy collections when needed. Preserve text scaling, semantics, keyboard access and safe areas. Implement controls/text/charts as widgets or appropriate drawing, never as screen crops. Preserve exact source assets and formats unless a conversion/substitute is authorized.
7. Integrate confirmed routes, DI and actions for an integrated feature; a detached mock screen is insufficient. For a prototype, label fixture data and leave unconfirmed backend behavior outside the deliverable. Test actual outcomes of implemented interactions.
8. Use the development-only capture harness through the production app adapter where possible. Supply production localization configuration for isolated shells. Follow the [capture contract](docs/workflow.md#capture-entrypoint) for fonts/images, readiness, editable/masked text and clipping evidence. Run scoped formatting, analysis and relevant tests, then capture and compare the integrated screen in fresh run folders. Register reusable implementations with `register_widget`, including a reference crop, source files and descriptive contract; use a new catalog ID for every variant/revision. Catalog snapshots/hashes do not establish visual or behavioral success.
9. Apply bounded repair with [source-bound captures](docs/workflow.md#source-checkpoint-binding), retaining the selected code/report pair and verifying restored source before fresh recapture. Protect previously passing product checks; a better visual score cannot justify lost behavior. Validate responsive, accessibility and confirmed behavior separately from visual status. Use the [performance protocol](docs/performance.md) when runtime optimization is requested or warranted; never infer a speedup from source review alone.

Deliver runnable source, integration/run instructions, reference and report paths, and explicit failed/incomplete/not-run outcomes. Do not stop at a plan when implementation is authorized. Do not claim native fidelity from a widget capture or product acceptance from visual status alone.

After handoff, offer [temporary screenshot cleanup](docs/workflow.md#temporary-screenshot-cleanup) once with eligible files/count/size. Preserve originals and required final/failure evidence; delete only after the user agrees. Skip the question when there are no eligible files.
