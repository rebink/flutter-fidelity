# Widget catalog and work planning

Use this workflow before writing Dart from a PNG. The host assistant identifies
regions, reviews reusable source, makes implementation decisions and dispatches
available authorized subagents. The CLI/MCP records evidence and validates work
plans; it is not an independent model runner. Execute the same plan sequentially
when delegation is unavailable.

For design-driven builds, apply [reference and widget-plan review](design-clarification.md#reference-and-widget-plan-review)
first. Component inspection and catalog lookup can inform the proposal while
review is pending. Show the screen approach and new/reused/adapted widget list;
app edits and implementation workers start only after plan approval or an
explicit choice to proceed without widget review. Planner validation alone
does not establish user approval.

Keep the catalog in `<project>/.fidelity/widgets` by convention. Pass its path
explicitly; this is not a global installation or an implied tool default. Keep
runtime Dart in the app's existing structure, often `lib/widgets/`. The catalog
stores reference evidence and source snapshots, not the app's runtime imports.

## Identify, search, decide

1. Acquire and validate the requested PNG/context and shared assets once. For
   Figma, default to remote MCP or REST with browser-only access; see
   [design intake](design-intake.md). Pass local paths to all workers instead of
   repeating exports. PNG remains the visual authority; structured context is
   optional evidence.
2. Inspect the original-resolution PNG with host vision. Infer meaningful region
   names and kinds, then call `mark_widgets` with stable IDs and integer bounds
   in the original PNG's pixel coordinate system. Do not resize or align inputs.
   Marks are separate from VisualSpec, whose bounds use logical app-content
   coordinates. Account explicitly for export scale and any confirmed content
   crop when translating between them.
3. Call `find_widgets` before Dart edits. With no search criteria, list the
   catalog; for a particular region, use its crop plus a descriptive query/tags.
   Inspect existing app components too: absence from the catalog is not proof
   that a component needs to be created.
4. Review candidate source, API, parameters, variants, dependencies and freshness
   flags. Choose `reuse` for a suitable existing contract, `adapt` for a
   parameterized variant, or `create` when there is no suitable implementation.
   Group repeated regions into one task with multiple `regionIds`. Similar is
   not identical: imagery cannot establish behavior, semantics or responsive
   compatibility, and even exact reference pixels do not prove current rendering.

`marked.png` is a review overlay. Region crops are reference-only evidence for
lookup and worker briefs, never raster substitutes for runtime controls, text
or whole widget layouts. Original artwork uses the separate asset workflow.

## Tool contracts

These are argument shapes, not literal JSON. A `?` marks an optional field.
The CLI commands use the same arguments in a JSON file via `--config`.

### `mark_widgets` / `mark-widgets`

```text
{image, out, regions: [{id, name, kind, tags?, bounds: {x, y, width, height}}]}
```

The host supplies names/kinds and all bounds; the tool does not perform vision
or infer widget names. Bounds are integers in original PNG pixels. Use a fresh
output directory and regions within the image. Outputs are `regions.json`,
unchanged `original.png`, annotated `marked.png`, and `crops/<id>.png`.
Preserve the original and pass the containing directory as `marks` below;
the tools load its `regions.json`. Supported kinds are `control`, `layout`,
`text`, `asset` and `decoration`.

### `find_widgets` / `find-widgets`

```text
{catalog, projectRoot, image?, query?, tags?, limit?}
```

No query/image/tags lists the catalog. `image` is an optional crop PNG. Search
ranks candidates using exact pixels, equal-size image similarity and lexical
token overlap, not semantic embeddings. Do not resize a crop to force a similarity result. Results flag changed
or missing source relative to recorded hashes. Read those files before reuse;
resolve missing source or choose another candidate, and review changed source
against the current contract. A ranking is not an automatic reuse guarantee,
an acceptance gate or evidence that a candidate has passed current tests.

### `register_widget` / `register-widget`

```text
{catalog, projectRoot, marks, regionId, id, name, symbol, sourceFiles,
 description, tags?, parameters?, variants?, testFiles?}
```

`regionId` selects the marked reference; `id` identifies the catalog entry.
Record the Dart `symbol`, its project source files and a useful description of
the contract. Optional `parameters` and `variants` are arrays of descriptive strings;
`testFiles` lists project-relative test paths for subsequent review. Source paths
are project-relative too. Include dependencies such as theme source, asset files
and `pubspec.yaml` in `sourceFiles` when they affect the widget. Hashes prove only
the identity of listed source files, not unlisted transitive dependencies or
behavior. Registration saves an immutable unique entry with `reference.png` and
`widget.json`, including a snapshot and source hashes. Choose a new ID for every
variant or revision; do not overwrite an earlier entry. The catalog reference
is design evidence, not a render of the implementation. Registration does not
run or independently pass visual, behavioral or native-platform checks; linked
test files alone do not prove execution.

### `plan_widget_work` / `plan-widget-work`

```text
{out, marks, catalog, maxParallel?, widgets: [
  {id, regionIds, decision: 'reuse' | 'adapt' | 'create',
   existingWidgetId?, files, dependsOn?, brief}
]}
```

The default `maxParallel` is `3`. Reuse/adapt decisions require the selected
catalog candidate in `existingWidgetId`. Reuse tasks are coordinator reviews,
not implementation subagents, and may have an empty `files` list; adapt/create
tasks require owned files. `dependsOn` identifies prerequisite
task IDs; `files` assigns explicit write ownership. The planner validates
complete marked-region coverage, an acyclic dependency graph (DAG) and disjoint
files within each wave. The output contains `plan.json` and `briefs/<id>.md`.
Plan validation does not dispatch workers, write Dart,
establish semantic compatibility or prove that the implementation is correct.

## Coordinator and worker boundaries

The coordinator reviews the plan, owns shared theme/tokens, contracts and final
screen composition, and prepares shared changes before dependent workers start.
Workers own separate widget files and any explicitly assigned tests, following
the app's structure. Do not let multiple workers edit a shared barrel, screen,
theme or contract concurrently. A worker needing a shared change reports it to
the coordinator; revise the plan before changing ownership or dependencies.

Give each worker local evidence paths, grouped region IDs, the chosen catalog
entry, typed inputs/callbacks, owned files, dependencies and relevant acceptance
checks. For example:

> Adapt `BalanceCard` for the available-balance and savings regions using one
> parameterized widget. Read `marks/regions.json`, both region crops and the
> reviewed catalog entry `balance-card-v1`. Own only
> `lib/widgets/balance_card.dart` and `test/widgets/balance_card_test.dart`.
> Accept `String label`, `String formattedAmount` and `VoidCallback? onTap`;
> the coordinator supplies formatting and the existing theme tokens. Preserve
> normal text scaling and semantics. Do not fetch Figma again or edit the theme,
> routes or screen. Check long labels and callback behavior. Return changed
> paths, actual checks/results and unresolved differences; screen integration
> and final visual comparison belong to the coordinator.

Integrate all outputs into the actual screen and production contracts. Run
analysis, relevant interaction/accessibility/responsive tests and a fresh
capture/comparison under the established profile. Use new run folders; never
reuse a failed capture. Register reusable implementations with new entry IDs
and retain separate report paths and precise failed/incomplete/not-run outcomes.
A widget capture cannot establish native-platform or behavioral acceptance.
Measure elapsed time before promising any speedup from reuse or parallel work.

## Small command example

This example assumes the built toolkit is at `/work/flutter-fidelity`, the app
is `/work/wallet`, and a validated reference already exists at the path below.
Run from the app root. Use a new `catalog-demo-01` run name on each attempt.
The sample bounds describe an illustrative 390-by-844 PNG at 1x; inspect your own
PNG and replace the regions/bounds and brief. Every widget region in this small
example is covered; a larger screen requires its own complete inventory.

Save `.fidelity/config/mark-widgets.json`:

```json
{
  "image": "/work/wallet/.fidelity/intake/screen-01/frames/reference.png",
  "out": "/work/wallet/.fidelity/runs/catalog-demo-01/marks",
  "regions": [
    {"id": "balance", "name": "Available balance", "kind": "layout", "tags": ["card", "balance"], "bounds": {"x": 24, "y": 96, "width": 342, "height": 120}},
    {"id": "savings", "name": "Savings balance", "kind": "layout", "tags": ["card", "balance"], "bounds": {"x": 24, "y": 232, "width": 342, "height": 120}}
  ]
}
```

Save `.fidelity/config/find-widgets.json`:

```json
{
  "catalog": "/work/wallet/.fidelity/widgets",
  "projectRoot": "/work/wallet",
  "image": "/work/wallet/.fidelity/runs/catalog-demo-01/marks/crops/balance.png",
  "query": "balance card amount label",
  "tags": ["card"],
  "limit": 5
}
```

```sh
node /work/flutter-fidelity/dist/cli.js mark-widgets --config .fidelity/config/mark-widgets.json
node /work/flutter-fidelity/dist/cli.js find-widgets --config .fidelity/config/find-widgets.json
```

Inspect returned candidates and current app source. The following plan assumes
that review found no suitable implementation; change the decision and supply
`existingWidgetId` for reuse/adaptation. Save `.fidelity/config/plan-widget-work.json`:

```json
{
  "out": "/work/wallet/.fidelity/runs/catalog-demo-01/plan",
  "marks": "/work/wallet/.fidelity/runs/catalog-demo-01/marks",
  "catalog": "/work/wallet/.fidelity/widgets",
  "maxParallel": 3,
  "widgets": [{
    "id": "balance-card",
    "regionIds": ["balance", "savings"],
    "decision": "create",
    "files": ["lib/widgets/balance_card.dart", "test/widgets/balance_card_test.dart"],
    "brief": "Implement one BalanceCard for both marked regions using String label, String formattedAmount and VoidCallback? onTap. Read the shared local marks/crops and existing theme. Own only the assigned files. Preserve text scaling and semantics; test long labels and callback behavior. Report results and unresolved differences to the coordinator."
  }]
}
```

```sh
node /work/flutter-fidelity/dist/cli.js plan-widget-work --config .fidelity/config/plan-widget-work.json
```

Now the host implements or delegates the validated plan, integrates the screen
and runs the [verification workflow](workflow.md#capture-entrypoint). These
commands alone do not implement or verify anything. Once the source exists,
save `.fidelity/config/register-widget.json`:

```json
{
  "catalog": "/work/wallet/.fidelity/widgets",
  "projectRoot": "/work/wallet",
  "marks": "/work/wallet/.fidelity/runs/catalog-demo-01/marks",
  "regionId": "balance",
  "id": "balance-card-v1",
  "name": "Balance card",
  "symbol": "BalanceCard",
  "sourceFiles": ["lib/widgets/balance_card.dart"],
  "description": "Displays a supplied label and formatted amount; optional onTap. Uses the app theme; formatting and navigation stay with callers.",
  "tags": ["card", "balance"],
  "testFiles": ["test/widgets/balance_card_test.dart"]
}
```

```sh
node /work/flutter-fidelity/dist/cli.js register-widget --config .fidelity/config/register-widget.json
node /work/flutter-fidelity/dist/cli.js find-widgets --config .fidelity/config/find-widgets.json
```

Review the actual outputs and preserve verification results separately. No
successful implementation, test or visual outcome is implied by this example.
