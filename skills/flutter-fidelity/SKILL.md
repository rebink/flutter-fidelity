---
name: flutter-fidelity
description: Build, reuse, fix and verify Flutter UI from PNGs, Figma links or existing app code. Use for screenshot implementation, widget reuse, typography fixes and measured visual repair with your coding agent.
license: MIT
metadata:
  version: "0.11.1"
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

For design-driven builds, first check for a supplied PNG or Figma URL, then ask
whether the user wants to review the widget plan or proceed without that review.
Follow [reference and widget-plan review](references/docs/design-clarification.md#reference-and-widget-plan-review):
explain the screen composition and list new, reused and adapted widgets before
implementation. In review mode, resolve feedback and wait for approval before
Dart edits or implementation workers; a confirmed skip choice needs no plan approval.
Carry forward an explicit review/skip choice already given for this task.

For Figma links, check four routes in order: connected Figma MCP (local first,
then an already connected remote MCP), Fidelity REST with `FIGMA_ACCESS_TOKEN`,
Figma desktop with the Flutter Fidelity Bridge plugin, then Playwright. Follow
[availability checks](references/docs/design-intake.md): skip unavailable routes,
preserve failure reasons, verify the intended frame and stop once a validated
reference is acquired. Ask before desktop/plugin setup or pairing; never install
it silently. The host skill selects routes, not an automatic cross-MCP tool.
On a browser 403 or sign-in redirect, follow
[manual login recovery](references/docs/figma-browser.md#manual-login-recovery):
with permission open a dedicated visible browser, ask the user to sign in, wait
for confirmation, verify frame access and continue with private saved
authentication. If headless remains blocked, use an authorized visible retry;
never silently take over a background-only session or repeat failed logins.

An existing report or usable reference can start a repair/verification directly.
Keep valid acquisition evidence shared across workers. Do not start a new Figma
export or full implementation merely to enter another stage. A request limited
to review produces findings; it does not authorize source changes by itself.

## Shared decisions and evidence

Use [task modes](references/docs/design-clarification.md#task-modes) to distinguish
a visual prototype, integrated feature and behavior-preserving repair. Reuse
the app's architecture, theme, components and established state/data owners.
Ask only for missing product semantics, access or scope that affects the result,
plus the required review choice. Continue independent work within any pending
widget-review limits. Carry authorized implementation through integration,
relevant checks, capture and bounded repair.

For widget work, search the [catalog](references/docs/widget-catalog.md) before Dart
edits and group repeated instances. Use available authorized host subagents for
independent jobs with explicit file ownership; execute sequentially when unavailable.
The toolkit does not launch models or supply a separate agent runtime.

Keep references immutable and capture/report folders fresh. Never resize or align
inputs to conceal geometry differences, reuse failed captures, or replace runtime
controls/text with reference crops. Preserve failed, incomplete and not-run evidence.
Widget captures alone do not establish native-platform or behavioral acceptance.

Deliver runnable source or the requested review, relevant reference/report paths,
actual checks and unresolved issues. Always present UI results using
[comparable results](references/docs/workflow.md#comparable-results): original
design and generated Flutter capture side by side, a measured visual fidelity
percentage, separate visual/product statuses and remaining differences. Show
the images in the host when supported; do not deliver only report paths. Missing
capture/comparison evidence must show pending/unavailable, never an invented score.
At handoff offer
[temporary screenshot cleanup](references/docs/workflow.md#temporary-screenshot-cleanup)
once only when eligible files exist; preserve originals and retained evidence and
delete only after agreement.
