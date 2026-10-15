# Visual repair

Read the existing report, decision record and [comparison/repair contract](docs/workflow.md#comparison-and-repair). Preserve the requested task mode, behavior, reference/profile and production architecture.

Fix causes in this order: major constraints/layout, typography, source assets, then colors/effects. Diagnose the owning widget/style/painter rather than adding coordinate patches. Reuse [architecture review](docs/flutter-ui-architecture.md#review-and-evidence) and only applicable [UI patterns](docs/flutter-ui-patterns.md). Do not flatten widgets, move business state into build, disable text scaling, add whole-screen transforms or replace real controls with images to improve a score.

For missing assets, run [intake recovery](docs/design-intake.md) before asking residual questions. Preserve approved formats and substitutions. A legitimate new reference dependency requires a fresh bundle/session with the change explained; this must not become a way to reset the repair budget for unchanged inputs.

For each candidate:

1. Declare a unique `sourceCheckpoint` ID and relevant files in capture config using the [source binding contract](docs/workflow.md#source-checkpoint-binding). Include owned new/deleted files; never reset unrelated user work.
2. Run relevant analysis/tests, then capture and compare into fresh folders.
3. Call `record_iteration`. Repair policy v2 protects passed regions and product checks, and tracks `bestReport`, `bestVisualReport` and `bestProductValidReport` separately. Visually improved candidates with failed or lost checks cannot replace the selected candidate. Use `bestReport` for restoration; visual-best is diagnostic. Null product-valid/source fields remain incomplete evidence.
4. Recheck changed interactions, state/selection, constraints and accessibility. Use the same fixture and animation frame. Do not silently switch components, APIs or test baselines.

Stop after five captures or two stalls, restore only the selected owned candidate, and run `verify_source_checkpoint` on `bestSourceCheckpoint` before fresh analysis/tests/recapture. Legacy evidence without a snapshot cannot prove source identity. Deliver matching source/report and remaining differences. Known product failures cannot count as success; unrun checks stay incomplete. Behavioral fixes after the repair budget still require fresh verification; identify how their pixels differ from the retained candidate, without treating extra visual tuning as verification.

At handoff use [temporary screenshot cleanup](docs/workflow.md#temporary-screenshot-cleanup) once, with inventoried disposable files and size. Delete only after agreement and preserve retained evidence.
