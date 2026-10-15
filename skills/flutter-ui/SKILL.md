---
name: flutter-ui
description: Build, reuse, fix and verify Flutter UI from PNGs, Figma links or existing app code. Automatically route design intake, widget catalog lookup, parallel widget work, typography, visual repair and verification through one entry point.
metadata:
  version: "0.9.0"
---

Use this single entry for the requested Flutter UI work. The host assistant owns
visual inference, reuse decisions and Dart edits; Flutter Fidelity CLI/MCP tools
measure and record evidence. PNG remains the visual authority when matching a design.

## Choose the workflow automatically

Infer the task from the request, existing app and prior decisions. Read the
relevant reference below and execute it; users do not need to choose or invoke
another skill. Load additional references only when the work reaches that stage.
For mixed requests, carry the same inputs, contracts and evidence across stages.

| Request or finding | Internal guidance | Continue with |
| --- | --- | --- |
| Build a screen, implement a design, reuse widgets or adapt an existing feature | [Build](references/build.md); includes browser-only Figma intake, widget catalog lookup and host delegation | Verification, then repair if measured differences need correction |
| Wrong font, weight, wrapping, line height or baseline | [Typography](references/typography.md) | Verify affected regions and consumers of shared styles |
| Fix layout/styling or improve an existing comparison result | [Repair](references/repair.md) | Typography when text is a cause; fresh verification of the selected source |
| Review, test, compare or deliver existing UI | [Verification](references/verification.md) | Repair only for issues within the authorized scope |

An existing report or usable reference can start a repair/verification directly.
Keep valid acquisition evidence shared across workers. Do not start a new Figma
export or full implementation merely to enter another stage. A request limited
to review produces findings; it does not authorize source changes by itself.

## Shared decisions and evidence

Use [task modes](../../docs/design-clarification.md#task-modes) to distinguish
a visual prototype, integrated feature and behavior-preserving repair. Reuse
the app's architecture, theme, components and established state/data owners.
Ask only for missing product semantics, access or scope that affects the result;
continue independent work while waiting. Carry authorized implementation through
integration, relevant checks, capture and bounded repair.

For widget work, search the [catalog](../../docs/widget-catalog.md) before Dart
edits and group repeated instances. Use available authorized host subagents for
independent jobs with explicit file ownership; execute sequentially when unavailable.
The toolkit does not launch models or supply a separate agent runtime.

Keep references immutable and capture/report folders fresh. Never resize or align
inputs to conceal geometry differences, reuse failed captures, or replace runtime
controls/text with reference crops. Preserve failed, incomplete and not-run evidence.
Widget captures alone do not establish native-platform or behavioral acceptance.

Deliver runnable source or the requested review, relevant reference/report paths,
actual checks and unresolved issues. At handoff offer
[temporary screenshot cleanup](../../docs/workflow.md#temporary-screenshot-cleanup)
once only when eligible files exist; preserve originals and retained evidence and
delete only after agreement.
