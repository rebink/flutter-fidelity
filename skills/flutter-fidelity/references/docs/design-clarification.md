<!-- Generated from docs/design-clarification.md by npm run skill:sync. -->

# Design clarification before implementation

A screenshot specifies appearance. It usually does not specify whether a card
is tappable, what a chart range means, which data feeds it, or which library the
application uses. Resolve those decisions with repository evidence and the
developer before implementing the affected part.

## Task modes

Infer and record the mode from the user's request; do not force a mode-selection
question when intent is clear. Carry the chosen mode through verification.

| Mode | Typical request | Autonomous scope | Still requires a real decision |
| --- | --- | --- | --- |
| Visual prototype | Recreate this screenshot, make a visual demo, explore this design | Use labeled display fixtures or a reference-derived chart trace; build reusable widgets and simple local demonstration interactions requested by the user | Unknown intended appearance, unavailable originals, or actions that would imply real backend behavior |
| Integrated feature | Add this screen to the app, connect the existing flow/API | Reuse observed routes, state owners, contracts and tests; implement known states | Unknown API/business semantics or conflicting production contracts |
| Visual repair | Fix these visual mismatches | Change rendering within existing component/behavior contracts and repair budget | New behavior, source substitutions or scope expansion |

An existing app defaults to integrated-feature mode when production integration
is requested; its mere presence does not turn an explicitly requested prototype
into backend work. If scope is genuinely ambiguous, implement independent pure
view components and ask one focused question before committing to unknown logic.
Fixtures and traces in prototype mode must be named as such in source and delivery;
they never count as recovered original data or verified production behavior.
For integrated mode, fixtures belong at existing test injection boundaries.

## Inspect first, then ask

Read the target app's instructions, pubspec and lockfile. Look for existing chart
widgets, theme tokens, reusable controls, navigation, models and API/state
contracts. Carry forward answers already given in the task. Summarize findings
with actual file/component names so the developer chooses concrete options.

Existing contracts, supplied design details and prior delegation resolve choices
without another question. Select routine file organization, widget boundaries,
asset naming and implementation techniques autonomously within those constraints.
If the developer delegates component/library or fixture choices, make and record
the concrete choice; the examples below are for unresolved decisions, not a
mandatory approval checklist. Do not ask for a pattern already established by
the app. A general request for autonomy does not define unknown API behavior or
authorize substituting unavailable branded assets.

Reuse established components when they satisfy confirmed requirements. If the
choice is still open, present options such as:

- Reuse the detected chart component/library, naming it and any capability gap.
- Use a developer-selected chart library, with package/version/license constraints.
- Use custom drawing when it is the smallest fitting implementation within the
  authorized task mode, or when selected by the developer.

Recommend reuse only when a compatible implementation was actually found.
Do not install a new dependency, substitute a renderer or create mock data to
resolve a choice outside existing authorization or delegation.

## A focused clarification batch

Ask only questions relevant to the visible screen and unresolved requirements.
Use a structured question tool when available; keep each batch small. Explain
which implementation decision the answer resolves. For a chart screen, a useful
batch for an integrated chart with unresolved contracts is:

1. **Chart implementation:** “I found `<existing component and package>` in this
   app. Should this screen reuse it, use a chart library you specify, or use
   custom drawing?” If nothing was found, say so and omit the reuse option.
2. **Interaction:** “Is this chart display-only, or should it support tap/drag
   inspection? Which tooltip, selection, zoom or pan behavior is required?”
3. **Data and ranges:** “Which model/API or approved fixture supplies the series?
   What do 1W/1M/1Y mean: rolling/calendar periods, aggregation, and timezone?”

Follow up only on gaps that affect implementation. For example, confirm units,
axes, multiple series, interpolation or empty/loading/error states when those
are not established by the design, application contract or initial answers.
Selecting a library does not resolve the data or interaction questions.

For other ambiguous widgets, ask whether the element is tappable and the exact
action: navigation destination, modal content, state update or API call. A
chevron, colored card or icon alone is not proof of an action. Confirm responsive
behavior and typography/assets when required information is missing.

## Missing icons and image assets

Search the repository's asset folders, pubspec declarations, existing icon
components/packs, SVG renderers and supplied design exports before asking.
When a design link is available, follow [design intake and asset recovery](design-intake.md):
try the design connector and then available Playwright/browser tools for missing
items. Collect scoped originals and available fonts as one batch, validating the
downloads and recording provenance. If browser tooling is absent, explain how
connecting it and opening the design enables automatic collection; offer one
export folder/ZIP as the fallback. Ask only for residual gaps after recovery.
If a found asset fails to render, first check path/case, asset declaration,
supported format, font loading, decoding and capture precaching. A loading
failure is not evidence that the asset must be replaced.

If required assets are still unavailable, identify their regions/names and explain
what was checked, including any access or export blocker. Batch the remaining
items rather than asking separately for each one. Ask a concrete question such as:

“The vehicle-status icon is visible in the reference, but I couldn't find its
source in the app assets. Should I use an original SVG/PNG you provide, reuse a
specific existing icon/component, or use a replacement you approve?”

Offer reuse only when a suitable named candidate was actually found. Ask for
the file path/source or a file attachment through a channel that supports files.
Do not assume a text-only question panel accepts file uploads. Follow up on
format and rendering details only where needed:

- SVG/vector versus PNG/raster, including PNG export scale and intended logical size.
- Original colors versus tintable artwork; transparent versus baked background.
- Existing rendering component/package; whether an SVG renderer or PNG conversion
  is explicitly acceptable when the project does not support the supplied format.
- Alternate light/dark/selected variants and reuse rights when not established.

Record the supplied source or approved alternative and its limits in the decision
record. Continue independent layout work while this asset is pending. Use a
placeholder only if explicitly allowed, and keep it identified as a placeholder
in verification. Never present a substitute as the exact original, or create a
hand-drawn/library/downloaded replacement just to avoid asking the developer.

## Record decisions and keep dependent work pending

Record confirmed answers, their source, and open questions alongside the visual
spec. [The decision template](design-decisions.template.json) provides one
optional format; an existing issue/spec can serve the same purpose. This is an
agent-maintained record, not a new CLI/MCP schema or automatically enforced gate.

Wait for required answers before implementing dependent behavior/data/package
choices, including unresolved required assets. Continue work that does not depend on them, such as visual measurement,
asset inventory and confirmed layout. Elapsed time and an unsubmitted default
option are not answers. If the developer explicitly delegates a choice, record
that delegation and the concrete choice; otherwise retain it as unresolved.

Do not invent production callbacks, data sources or chart semantics to make
a prototype appear integrated. Labeled mock data or a visual-only trace is acceptable in visual-prototype
mode; integrated mode requires an established test fixture or explicit delegation. Label its scope; traced raster coordinates are not the original series.
Existing demonstration fixtures do not establish the next app's requirements.

## Verify the agreed behavior

Derive tests from the confirmed decisions. For chart ranges, assert that approved
inputs produce the agreed periods and aggregations, including boundaries—not
merely that a button repaints a curve. Assert selected point/value, tooltip and
navigation/state results where specified. Test loading/empty/error cases when
they are part of the contract. Keep functional acceptance, visual fidelity and
accessibility evidence separate; retain unresolved decisions as pending.

During visual repair, keep the agreed component, data and behavior. A different
library or changed interaction requires a new decision if prior authorization
does not cover it. Do not ask the developer the same question on every iteration.
