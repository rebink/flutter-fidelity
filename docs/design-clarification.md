# Design clarification before implementation

A screenshot specifies appearance. It usually does not specify whether a card
is tappable, what a chart range means, which data feeds it, or which library the
application uses. Resolve those decisions with repository evidence and the
developer before implementing the affected part.

## Inspect first, then ask

Read the target app's instructions, pubspec and lockfile. Look for existing chart
widgets, theme tokens, reusable controls, navigation, models and API/state
contracts. Carry forward answers already given in the task. Summarize findings
with actual file/component names so the developer chooses concrete options.

Reuse established components when they satisfy confirmed requirements. If the
choice is still open, present options such as:

- Reuse the detected chart component/library, naming it and any capability gap.
- Use a developer-selected chart library, with package/version/license constraints.
- Use custom drawing, if explicitly chosen for the required capabilities.

Recommend reuse only when a compatible implementation was actually found.
Do not install a new dependency, substitute a renderer or create mock data to
resolve an unanswered choice.

## A focused clarification batch

Ask only questions relevant to the visible screen and unresolved requirements.
Use a structured question tool when available; keep each batch small. Explain
which implementation decision the answer resolves. For a chart screen, a useful
first batch is:

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
If a found asset fails to render, first check path/case, asset declaration,
supported format, font loading, decoding and capture precaching. A loading
failure is not evidence that the asset must be replaced.

If the required asset is still unavailable, identify its region/name and explain
what was checked. Ask a concrete question such as:

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

Do not infer a callback, data source or chart calculation to make the demo appear
functional. Mock data or a visual-only trace is acceptable only when explicitly
chosen. Label its scope; traced raster coordinates are not the original series.
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
