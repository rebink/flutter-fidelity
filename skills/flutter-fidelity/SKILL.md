---
name: flutter-fidelity
description: Build, reuse, fix and verify Flutter UI from PNGs, Figma links or existing app code. Use for screenshot implementation, widget reuse, typography fixes and measured visual repair with your coding agent.
license: MIT
metadata:
  version: "0.10.2"
---

Use Flutter Fidelity for the requested Flutter UI work. The host assistant owns
visual inference, reuse decisions and Dart edits; Flutter Fidelity CLI/MCP tools
measure and record evidence. PNG remains the visual authority when matching a design.

## Connect to the engine

Read [host and tool setup](references/tools.md) before the first tool call.
The host needs image inspection, file editing and terminal or local MCP access.
CLI tools require Node 22+; analysis, tests and captures need a Flutter SDK.
Use connected MCP tools or the bundled CLI launcher from the Flutter project.
The skill works across compatible agents; host-specific slash commands, tool
prefixes and delegation APIs are optional. An engine installation is separate
from installing the skill. Never claim a measurement ran when only guidance was
available. The launcher checks that the engine and skill versions match.

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

Use [task modes](references/docs/design-clarification.md#task-modes) to distinguish
a visual prototype, integrated feature and behavior-preserving repair. Reuse
the app's architecture, theme, components and established state/data owners.
Ask only for missing product semantics, access or scope that affects the result;
continue independent work while waiting. Carry authorized implementation through
integration, relevant checks, capture and bounded repair.

For widget work, search the [catalog](references/docs/widget-catalog.md) before Dart
edits and group repeated instances. Use available authorized host subagents for
independent jobs with explicit file ownership; execute sequentially when unavailable.
The toolkit does not launch models or supply a separate agent runtime.

Keep references immutable and capture/report folders fresh. Never resize or align
inputs to conceal geometry differences, reuse failed captures, or replace runtime
controls/text with reference crops. Preserve failed, incomplete and not-run evidence.
Widget captures alone do not establish native-platform or behavioral acceptance.

Deliver runnable source or the requested review, relevant reference/report paths,
actual checks and unresolved issues. At handoff offer
[temporary screenshot cleanup](references/docs/workflow.md#temporary-screenshot-cleanup)
once only when eligible files exist; preserve originals and retained evidence and
delete only after agreement.
