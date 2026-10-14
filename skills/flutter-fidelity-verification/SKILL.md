---
name: flutter-fidelity-verification
description: Verify screenshot-derived Flutter UI with reproducible captures, real-font visual reports, native platform checks, interactions and responsive/accessibility scenarios.
metadata:
  version: "0.4.0"
---

Verify the requested mode and scope from [task modes](../../docs/design-clarification.md#task-modes). Use existing requirements and prior decisions; do not invent interactions or require backend completion for a labeled visual prototype.

1. Review changed owners using [architecture evidence](../../docs/flutter-ui-architecture.md#review-and-evidence). Confirm real route/DI/state wiring for integrated features, resource lifecycle, semantic token reuse, capture isolation and supported layout states. Run formatting, analysis and contract-based tests using the pinned SDK.
2. Follow the [capture contract](../../docs/workflow.md#capture-entrypoint). Preserve the production shell/localizations; establish fonts, decoded assets, viewport, insets and deterministic state. Choose finite settling or a prepared frame explicitly. Capture failure retains diagnostics; never reuse an old PNG.
3. Compare with the immutable reference and reviewed spec. Policy v3 retains pixel thresholds from v2 but separates visual and product acceptance and requires text-overflow evidence. Read [acceptance and compatibility](../../docs/workflow.md#comparison-and-repair). Text-content equality is not proof of full visibility; inspect clipping, ellipsis and obscured controls independently.
4. Reconcile required assets against [validated intake](../../docs/design-intake.md), source/variant, format, production declarations and actual renderer. A decoded file or approved substitute is not proof of equality to the original. Keep unresolved fonts/assets incomplete.
5. Exercise confirmed actions and their outcomes through production owners. Check relevant state, content, keyboard, text scale, locale/RTL, focus, semantics, tap targets and composited contrast using applicable [UI patterns](../../docs/flutter-ui-patterns.md). Cover reference and supported breakpoint-adjacent widths; three mobile widths alone do not verify desktop. Report each failed/not-run check. Automated guidelines do not establish full accessibility conformance.
6. Capture Android/iOS separately on named environments when required and available. A widget render is not a native result; overflow checks at another width are not reference fidelity there. Reset fixture state after interaction tests. Record and restore any device density/size overrides.
7. For optimization, use [performance evidence](../../docs/performance.md): representative repeatable scenarios, physical device/profile mode, distributions and missed-frame counts, relevant memory and before/after artifacts. Missing profiler/device evidence remains not-run. Recapture visuals after optimization.

Deliver code and architecture/integration evidence, actual/reference/diff/overlay reports, environment, independent acceptance outcomes and unresolved issues. If producing an APK after integration testing, rebuild with the production entrypoint; a test APK is not the app deliverable. Check dependency paths in portable source bundles. Supplemental previews must be labeled.

Verify the selected report's [source checkpoint](../../docs/workflow.md#source-checkpoint-binding) against the delivered project before fresh recapture. Retain manifest/snapshot; mark legacy source binding unavailable. A visual-best candidate with failed product checks is diagnostic evidence, not the delivery choice.

At handoff offer [temporary screenshot cleanup](../../docs/workflow.md#temporary-screenshot-cleanup) once for eligible generated files, with count/size/paths. Preserve reference and required final/failure evidence; delete only after agreement.
