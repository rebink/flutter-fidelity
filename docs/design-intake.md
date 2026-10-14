# Figma intake and asset recovery

Read this when a Figma link is supplied or required assets/fonts are missing.
The host assistant orchestrates connected design and browser tools; Flutter
Fidelity does not implement a Figma client, browser, or autonomous model runner.
Use only tools actually exposed by the current host and follow their operating
instructions. Structured design data helps acquisition; the resulting PNG is
still the visual authority.

## Recover automatically before asking for files

1. Inspect supplied files, prior decisions and the target app's assets first.
   Retain the requested file/page/node URL and screen/state scope. An explicit
   node link identifies the initial target; do not export the entire workspace.
2. Discover an available Figma/design connector for logical frame dimensions,
   design context and original assets. Save usable results immediately. For the
   screen reference and styling evidence, prefer **Copy as PNG** and
   **Copy as code → CSS** through the available Figma UI as described below;
   do not request an export/download first. Metadata success
   does not imply every image/font is available.
3. Discover available Playwright plugin/MCP browser tools for the Figma UI. If
   Playwright is unavailable, use another available browser or native-app tool
   supporting the required selection and clipboard image/text handling. Follow that
   tool's instructions; do not assume API names or install a global plugin.
4. Open the supplied link in the user's designated browser/session when given.
   Select the target frame by its screen title or layer entry, then use the
   actual context menu's **Copy/Paste as → Copy as PNG** action. Save and validate
   the new clipboard image, then use **Copy/Paste as → Copy as code → CSS**
   and save the new clipboard text for that selection. Reuse design
   context already acquired and collect missing original assets in the same
   session without per-asset questions.
5. If UI copying or clipboard-image access is unavailable, record the blocker
   and use a connector-provided frame PNG or normal frame export as the fallback.
   Do not bypass file-copy restrictions. If no automated route works, explain
   the missing browser/app or clipboard capability and batch one residual request:
   connect a supported tool/session, or copy the listed frames as PNG and paste
   them into the chat, together with any still-missing originals/fonts. Do not
   imply that recovery happened or that a plugin guarantees file access.

A supplied design link authorizes reading and copying/exporting the requested
design for implementation; do not ask permission again for each frame. It does
not authorize changing the shared design, sharing permissions, or publishing.
Avoid editing source layers/export presets merely to make a download easier.
For login, unavailable file permissions or disabled export, report the observed
blocker and request only the access/user action needed to resume. Never ask for
passwords/session tokens or bypass access restrictions. Continue independent
repository, architecture and layout work while access is pending.

Bound recovery: retry a transient failure once after the indicated wait or a
concrete correction, then switch to the fallback. Do not repeatedly retry the
same authentication/export denial. Retry after new access or a changed input,
not merely after elapsed time. Record the method, outcome and missing items;
partial success stays partial.

## Preferred frame reference: Copy as PNG

This preference applies to the screen reference. Figma's Copy as PNG produces
an image of the selected design; it is not a screenshot of the browser canvas.
It does not supply layout metadata, original vector/image assets or font files.
Use the connector or UI inspector for those inputs and batch originals separately.

- Confirm the selected node, screen/state and logical bounds before copying.
  Select the frame itself via its title or layer entry, not the title text layer,
  a child, or several screens. Use observed menu labels instead of guessed
  coordinates or keyboard shortcuts.
- Check whether the active tool can retrieve clipboard image bytes or paste them
  into a supported local image-saving surface. Browser interaction alone does
  not guarantee clipboard access. Never claim a reference was acquired merely
  because the menu action completed.
- Wait for the copy action to finish, then read only the image representation
  from that operation. Use a clipboard change indicator when supported and
  visually verify the result against the selected frame. Reject stale clipboard
  data, text/HTML-only content and ambiguous source identity; retry once after
  a concrete correction, then use the documented fallback. Do not dump unrelated
  clipboard contents into logs.
- Save the returned PNG bytes unchanged to a uniquely named file under the fresh
  intake `frames/` directory. If a tool only exposes another image encoding,
  record that limitation rather than silently labelling it PNG. Never resize,
  flatten transparency or capture a paste preview to manufacture the reference.
- Run `validate_assets`, inspect the saved PNG, and reconcile pixel dimensions
  with the frame's logical bounds. Record the actual scale; do not assume Copy
  as PNG is 1x or tied to canvas zoom. Investigate effects, clipping or dimension
  discrepancies before import instead of normalizing them away.
- Record `sourceKind: figma-copy-as-png`, node/URL, acquisition time, clipboard
  method/freshness evidence, dimensions and SHA-256 in the manifest. Save each
  frame before copying the next, since the clipboard can be replaced.

If the user explicitly prohibits downloads, keep that constraint during fallback
and request only the missing clipboard access or pasted PNG. Otherwise use the
fallback automatically when copying is unavailable, explaining the reason in the
intake record. Do not repeatedly ask users to copy frames when tools can do it.

## Preferred styling evidence: Copy as code → CSS

After saving the frame PNG, keep the intended node selected and use the observed
context-menu path **Copy/Paste as → Copy as code → CSS**. Retrieve the new
clipboard text through an available supported tool and save it unchanged as a
uniquely named UTF-8 `.css` file under `context/` in the same intake directory.
Save each result before the next copy operation replaces the clipboard.

Check freshness and source identity as for PNG copying. Confirm that the result
contains CSS declarations for the selection; empty text, unrelated clipboard
content, editor-page CSS and HTML/login responses are not acquired design code.
Keep node ID, source URL, acquisition time, SHA-256, clipboard evidence and
selection coverage in `designContext` records. CSS is supporting text evidence;
the image/font `validate_assets` tool does not validate CSS files.

Inspect which nodes the copied snippet actually describes. A frame snippet does
not establish that every child's styles were collected. If required typography,
effects or component properties are missing, copy CSS for those scoped child
nodes in the same session, or use already available connector/inspector data.
Record unresolved properties explicitly. If code copying or clipboard-text
access is unavailable, recover properties from that connector/inspector without
requiring users to paste CSS when equivalent evidence is already sufficient.

Use dimensions, spacing, font properties, fills, radii and effects to inform
Flutter constraints, TextStyle and decoration. Interpret units, line-height,
coordinate origins, gradients and shadows against the selected node and PNG;
do not treat PNG export pixels as CSS logical units. Preserve the app's layout
and component architecture, and reconcile discrepancies through capture and
comparison. Copied CSS does not establish interaction/API behavior or provide
original font/image bytes.

### Translate CSS into Flutter

Translate only properties covered by the selected node's snippet. Record font,
logical bounds and export scale; retain raw CSS. Apply repeated styles through
the app's existing token/component owners and the pinned SDK's available APIs.

| CSS evidence | Flutter starting point and verification |
| --- | --- |
| `font-size: 16px; line-height: 24px` | `TextStyle(fontSize: 16, height: 24 / 16)`. Height is a multiplier, so passing `24` would be wrong. Verify first/last baselines and multiline wrapping with the original font. |
| Unitless `line-height: 1.5` or `normal` | Start with `height: 1.5` for the explicit ratio. For `normal`, leave height unset and inspect font metrics; `height: 1` is not equivalent to the default. |
| `letter-spacing: 0.02em` at 16px | Start with `letterSpacing: 0.32`, in logical pixels. Pixel spacing maps directly; resolve `em` against font size. Confirm what a Figma percentage denotes before converting it. |
| Font family, weight, style, variable axes | Match font bytes and production declarations. Use supported `fontVariations` for required variable axes. A weight number alone does not prove the expected face is available. |
| Fixed dimensions, `auto`, content sizing, flex and gaps | Use fixed sizes for fixed artwork; constraints/flow/padding for content. A frame bound does not require fixed-height text. Check border/padding accounting and component minimum sizes before adding offsets. Flex requires bounded axes. |
| `box-shadow: 0 4px 12px 0 rgba(0,0,0,0.15)` | Seed `BoxShadow` with `offset: Offset(0, 4)`, `spreadRadius: 0` and matching alpha. Calibrate blur against the PNG; numeric CSS and Flutter blur values do not establish identical rendering. Preserve multiple effects and order; inset shadows need a suitable supported renderer. |
| Fills, opacity, gradients, radii and borders | Preserve alpha and node coordinate origins. Convert CSS RGBA/hex ordering to Flutter ARGB deliberately. Verify gradient directions/stops and asymmetric corners. Material elevation is not proof of equality to a copied shadow. |
| CSS pixels versus PNG pixels | A 390px frame copied at 2x yields 780 image pixels but retains 390 logical units. Establish that scale from source evidence; apply it to capture pixels, not widget padding or typography. |

For example, acquired CSS `font-size: 16px; line-height: 24px;
letter-spacing: 0.02em` maps initially to:

```dart
const TextStyle(
  fontSize: 16,
  height: 24 / 16,
  letterSpacing: 16 * 0.02,
)
```

Keep normal text scaling enabled; do not multiply these values by capture text
scale as well. Investigate paragraph leading through `TextHeightBehavior` or
justified `StrutStyle` settings rather than shifting every label. Compare widget
bounds, line boxes and glyph ink separately, then recheck wrapping at supported
widths and larger text settings. CSS cannot prove identical baselines/effects
across rendering engines.

Primary API references: [TextStyle.height](https://api.flutter.dev/flutter/painting/TextStyle/height.html),
[letterSpacing](https://api.flutter.dev/flutter/painting/TextStyle/letterSpacing.html),
[fontVariations](https://api.flutter.dev/flutter/painting/TextStyle/fontVariations.html)
and [BoxShadow](https://api.flutter.dev/flutter/painting/BoxShadow-class.html).

## Collect a scoped asset batch

Inventory required frames, visible images/icons, component variants and font
families/weights before acquisition. Use shared assets once across the requested
screens. Prefer multi-selection/batch export when available; otherwise process
the inventory in the same browser session without per-asset user questions.
Do not scrape unrelated pages, download every document asset, or mistake browser
UI logos/font files for design assets. A canvas/DOM screenshot does not expose
the underlying vector artwork or original font bytes.

Use a new acquisition directory, for example:

```text
.fidelity/intake/<unique-run>/
  sources/             # unchanged original asset files
  frames/              # unchanged copied/exported frame PNGs
  context/             # unchanged copied CSS and other design context
  prepared/            # separately named app-ready derivatives, if authorized
  assets.json          # provenance, region mapping, gaps and validation
```

Use [the asset manifest template](asset-manifest.template.json) as an optional
sidecar. It is an agent record, not a CLI input or a VisualSpec extension.
Record each file's source node/URL, local path, SHA-256, actual format, dimensions,
logical size/export scale when known, intended regions, variants, transparency,
font metadata, reuse/attribution information when supplied, and validation
status. Keep credential-bearing or signed download URLs out of committed records;
use the stable design URL and node identity as provenance.

Run `validate_assets` (MCP) or `node dist/cli.js validate-assets --files <paths...>`
after saving clipboard images or downloading assets. The read-only helper returns decoded formats/dimensions,
hashes, duplicate groups, basic font names/weights and per-file failures. It
rejects HTML responses, invalid images, unsafe/non-self-contained SVG exports
and unsupported font containers. It does not establish licensing, complete glyph
coverage, every animation frame or Flutter-renderer fidelity. Preserve the JSON
result alongside the provenance manifest and resolve failures before importing.

Check saved bytes, not only the extension or a successful copy/download message:
reject empty files, login/error HTML and invalid images. Inspect image dimensions
and previews, SVG viewBox/external dependencies, and font family/weight files.
Inspect archives before extracting; reject absolute/traversal paths and escaping
symlinks, extract only into the new intake directory. Preserve filenames inside
sources; give prepared copies stable snake_case names with node/variant suffixes
to avoid collisions. Deduplicate identical bytes while retaining all region and
variant mappings. Distinct files with the same basename need distinct names
before import: the importer rejects duplicate basenames within fonts or assets.

Reconcile the inventory after the batch. Mark an item acquired only when valid
bytes exist locally; a URL or preview alone is insufficient. Distinguish
validated, missing, access-blocked, unsupported and approved-substitute items.
Batch the residual questions once, naming the affected regions and exact missing
originals or font weights; carry prior answers forward. Never silently substitute
branded artwork, unrelated imagery or a lookalike font.

## Formats and rendering contract

| Input | Acquisition and Flutter use |
| --- | --- |
| Frame reference | Prefer Copy as PNG, saved from the clipboard with verified logical bounds and actual image scale; connector PNG/export is the fallback. Keep it immutable; controls and text are implemented as widgets. |
| Vector icons/logos | Keep the original SVG and its viewBox, fills, strokes and transparency; use the app's supported renderer. If incompatible, first seek a compatible source export; use conversion/new dependencies only within existing delegation or an explicit decision. |
| Raster artwork/photos | Keep original bytes and colors. Use a supported format and resolution appropriate to logical display size and device density. Record intentional crops, tint, fit and alignment. |
| Fonts | Acquire exact available TTF/OTF families and weights, including required glyph coverage. A font name, outlined SVG text or browser WOFF file is not a TTF/OTF font bundle. Do not promise that Figma export includes licensed font files. |
| Tokens/context | Prefer Copy as code → CSS for available styling evidence; retain raw snippets and their node coverage. Supplement with connector/inspector properties and component states. Reconcile discrepancies with the frame PNG; translate properties into the app's Flutter architecture. |

A verified Copy as PNG result or design export is preferable to a browser screenshot. If only a browser capture is
available, identify it as such and exclude editor chrome, selection overlays and
device borders using the agreed crop. Require reliable logical dimensions and
scale evidence before import. Canvas zoom and browser device scale can differ;
never infer logical pixels from the screenshot alone or resize it into a match.
If the profile cannot be established, keep measurement/import blocked and
continue work that does not depend on it. A valid frame PNG with incomplete
metadata can proceed; absent metadata alone is not a blocker.

Import validated local PNG/fonts/assets through the existing import tool. Record
the imported copies' paths in region mappings and add production declarations
using the target app's asset conventions. The CLI hashes/copies files but does
not download URLs or consume assets.json. Do not put sidecar fields into its
strict schemas. If required assets arrive later, preserve the prior bundle,
import a fresh complete bundle and start a new comparison session. Do not patch
hashed originals or continue comparing under the old bundle identity.

## Intake completion

Proceed automatically to implementation when the frame/profile and necessary
inputs are available. Missing nonessential metadata does not warrant a pause.
When required assets remain unresolved, implement independent parts and record
exact blockers; do not mark the screen complete or silently use placeholders.
See [design clarification](design-clarification.md) for the residual decisions
and [the workflow](workflow.md#autonomous-execution-and-delivery) for delivery.

Official references: [Figma exports](https://help.figma.com/hc/en-us/articles/360040028114-Export-static-designs-from-Figma)
and [format settings](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings-for-static-designs),
plus [copying objects as PNG and code](https://help.figma.com/hc/en-us/articles/4409078832791-Copy-and-paste-objects).
Tool capabilities and file permissions must still be checked in the active session.
