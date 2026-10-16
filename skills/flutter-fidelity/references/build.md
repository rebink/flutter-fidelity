# Build and reuse widgets

## Check the reference and choose review mode

Follow [reference and widget-plan review](docs/design-clarification.md#reference-and-widget-plan-review)
first: check for the intended PNG or Figma URL; request it if missing. After
confirming presence, ask whether to review the UI approach/widget list or proceed
without widget review, unless the task already includes an explicit choice.
Input acquisition, validation and repository inspection may proceed while the
choice is pending; app edits and implementation workers must wait.

## Acquire Figma inputs

Prefer a supplied validated reference when available. Otherwise check connected
Figma MCP (local first, then an already connected remote MCP), Fidelity REST token,
Figma desktop with the Flutter Fidelity Bridge plugin, then Playwright, in that
order. Follow the [availability checks](docs/design-intake.md); stop at the first
usable validated reference and retain skipped/failed reasons. For REST, use
`acquire_figma` with `url`, a fresh `out` directory and optional `reuse` pointing
to a prior successful intake. REST reads `FIGMA_ACCESS_TOKEN` from the server
environment. Read saved `context/node.json` for styling and `intake.json` for
logical dimensions, revision, PNG hash/scale and profile warnings. An existing
local Figma plugin is checked through `figma_bridge` status after REST is
unavailable or fails. Verify the paired document before `acquire_figma_plugin`.
Ask before opening the app/plugin or setting up pairing; if unavailable or
declined, continue to Playwright without making plugin installation a prerequisite.

Acquire each scoped frame/context and shared asset batch once for all workers.
Pass local evidence paths to workers; do not repeat exports per subagent.

For an explicit browser request or after MCP, REST and desktop/plugin routes
are unavailable or fail, follow
[parallel background browser intake](docs/figma-browser.md). Inspect once, derive
selectors from observed UI, and run `acquire_figma_browser` with distinct scoped
node IDs in isolated headless workers (default three, maximum six). Preserve
partial coverage; do not claim that UI snapshots contain every layer/property.
Keep the user's desktop available by default. On 403 or a sign-in redirect,
follow [manual login recovery](docs/figma-browser.md#manual-login-recovery): with
permission open a dedicated visible Playwright browser, ask the user to log in,
wait for confirmation and verify the intended frame. Resume with private saved
authentication in a fresh run. If headless access stays blocked, request permission
for `headless: false` (serial visible intake). Do not repeatedly retry or ask for
passwords/cookies; preserve failed evidence and the existing widget-review choice.

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
actually present. Continue implementation once sufficient inputs are available
and the selected review mode permits it; missing optional styling metadata does
not block the task.

## Execute the build

1. Run `doctor`. Establish logical viewport, export scale, crop and safe insets from supplied or reliable source evidence; pixels alone do not establish logical size. Retrieve scoped originals in a batch. Run `validate_assets` on saved PNGs/assets; resolve invalid files before import. Keep originals unchanged and uncertainty explicit.
2. Import the PNG/fonts/assets. Inspect the original-resolution image and save a reviewed `VisualSpec` through `inspect_reference.visualSpec`. Use stable region IDs and widget-box bounds; distinguish these from glyph ink. Keep architecture and decision records outside this strict schema. Do not upgrade guesses to make gates pass.
3. Trace a comparable production feature: route/composition → action → state owner → operation/data → state/effect. Record evidence paths and a small change map. Reuse the app's theme, controls, state management and layer boundaries. For a new prototype, choose the smallest structure that supports the view; do not manufacture clean-architecture layers or install a state package.
4. Before Dart edits, use host vision to name reusable widget regions and `mark_widgets` to record integer bounds in original PNG pixels. Read [widget catalog](docs/widget-catalog.md) for the four tool contracts and examples. Call `find_widgets` against the project catalog (convention: `.fidelity/widgets`), including existing app components in the review. Inspect candidate source and changed/missing-source flags; similarity is not proof of interchangeability. Choose `reuse`, `adapt` as a parameterized variant, or `create`, and group repeated regions into one task. Keep mark coordinates separate from logical-pixel VisualSpec bounds.
5. Present the basic screen-composition approach and a widget list with `create`, `reuse` and `adapt` decisions, existing symbols/source paths and reasons. In review mode, resolve feedback, revise the plan and wait for user approval before app edits or implementation delegation. In skip mode, share this as an informational update and continue. Call `plan_widget_work` with complete region coverage, dependencies and explicit owned files, keeping it aligned with the reviewed or delegated decisions. The coordinator owns shared theme/contracts and screen integration. Workers own separate widget files, conventionally `lib/widgets/*.dart`, adapted to the app's structure. Once the review choice permits implementation, dispatch available authorized host subagents in validated waves (default maximum three); work sequentially when delegation is unavailable. The toolkit plans and measures; it does not run models. Supply evidence paths, typed contracts, scope and acceptance checks in each brief.
6. Compose named widgets with typed data/callbacks. Keep I/O and business rules in their established owners and dispose owned resources. Use constraints/flow for normal layout, genuine overlays for overlap, flexible text-bearing surfaces and lazy collections when needed. Preserve text scaling, semantics, keyboard access and safe areas. Implement controls/text/charts as widgets or appropriate drawing, never as screen crops. Preserve exact source assets and formats unless a conversion/substitute is authorized.
7. Integrate confirmed routes, DI and actions for an integrated feature; a detached mock screen is insufficient. For a prototype, label fixture data and leave unconfirmed backend behavior outside the deliverable. Test actual outcomes of implemented interactions.
8. Use the development-only capture harness through the production app adapter where possible. Supply production localization configuration for isolated shells. Follow the [capture contract](docs/workflow.md#capture-entrypoint) for fonts/images, readiness, editable/masked text and clipping evidence. Run scoped formatting, analysis and relevant tests, then capture and compare the integrated screen in fresh run folders. Register reusable implementations with `register_widget`, including a reference crop, source files and descriptive contract; use a new catalog ID for every variant/revision. Catalog snapshots/hashes do not establish visual or behavioral success.
9. Apply bounded repair with [source-bound captures](docs/workflow.md#source-checkpoint-binding), retaining the selected code/report pair and verifying restored source before fresh recapture. Protect previously passing product checks; a better visual score cannot justify lost behavior. Validate responsive, accessibility and confirmed behavior separately from visual status. Use the [performance protocol](docs/performance.md) when runtime optimization is requested or warranted; never infer a speedup from source review alone.

Deliver runnable source, integration/run instructions, reference and report paths, and explicit failed/incomplete/not-run outcomes. Keep implementation pending while required review is outstanding; after approval or an explicit skip choice, do not stop at a plan when implementation is authorized. Do not claim native fidelity from a widget capture or product acceptance from visual status alone.

Always show [comparable results](docs/workflow.md#comparable-results) at delivery:
original design beside the generated capture, measured visual fidelity percentage,
visual/product statuses and remaining differences. Skipping widget review does
not skip this result presentation; unavailable evidence stays explicit.

After handoff, offer [temporary screenshot cleanup](docs/workflow.md#temporary-screenshot-cleanup) once with eligible files/count/size. Preserve originals and required final/failure evidence; delete only after the user agrees. Skip the question when there are no eligible files.
