<!-- Generated from docs/design-intake.md by npm run skill:sync. -->

# Figma intake and asset recovery

Read this when a Figma link is supplied or required assets/fonts are missing.
The host assistant owns design interpretation and Dart edits. Flutter Fidelity
provides background REST acquisition plus deterministic validation; connected
remote MCP tools can also supply design evidence. PNG remains the visual authority.

## Background acquisition first

Inspect supplied files and existing assets before fetching anything. Retain the
requested file/node and screen/state scope. An explicit node link identifies the
target; do not export the entire document or navigate every page.

Check route availability in order: connected Figma MCP (local first), Fidelity
REST token, Figma desktop with the Flutter Fidelity Bridge plugin, then Playwright.
The host skill coordinates these checks; one engine tool does not discover or
invoke other MCP servers. Respect an explicit route choice and background-only
constraints. Check existing capabilities before requesting installation or setup.

Before online acquisition, prefer a **validated local reference**: a supplied PNG
with established source and profile. Reuse a prior reference for the same
explicitly pinned design; for a live Figma link, verify its current revision
before assuming it is unchanged. Otherwise try these four routes in order:

1. **Connected Figma MCP (local first):** inspect the host's connected servers and
   actual tool schemas. Prefer the local Figma MCP; an already connected remote
   Figma MCP can serve this same stage if local is unavailable. Do not confuse
   either with Flutter Fidelity's own MCP server. Use the linked node with
   available `get_design_context` and `get_screenshot`/`download_assets`; verify
   the requested file/node rather than assuming the desktop selection matches.
   Save actual image bytes locally and verify them. A preview, metadata or
   temporary URL alone is not an acquired reference. A configured server is not
   proof of access; record unavailable, denied or rate-limited results and move
   to the next route without repeated calls.
2. **Built-in REST intake:** use `acquire_figma` or the CLI below when
   `FIGMA_ACCESS_TOKEN` is available to the server process. Check presence without
   printing its value; if the host cannot inspect the server environment, use the
   tool's missing-credential response as evidence. Missing, invalid, denied or
   rate-limited credentials advance to the desktop/plugin check. It retrieves the
   linked node subtree, saves styling JSON, then exports PNG at the same revision.
   It requires no browser, visible Figma window, clipboard, or copied CSS.
3. **Figma desktop + Flutter Fidelity Bridge plugin:** check whether the desktop
   app is available on the same computer as the engine and call
   `figma_bridge({"action":"status"})` when that tool is available. A running app
   alone does not establish a paired plugin. If paired, verify document/selection
   and use `acquire_figma_plugin` for the requested frame. If installed but not
   running/paired, ask before opening the app/plugin or starting pairing; follow
   [plugin setup](figma-plugin.md). Do not install or register a plugin silently.
   If unavailable, declined, unpaired or acquisition fails, retain the reason
   and continue to Playwright rather than blocking on desktop setup. Never
   substitute another open document for the requested file.
4. **Playwright browser with manual-login recovery:** when earlier routes are
   unavailable or fail, or browser intake is explicitly requested, use `acquire_figma_browser`
   with isolated headless Playwright workers. Follow [browser intake](figma-browser.md)
   to inspect once, derive observed selectors, and dispatch distinct scoped node
   IDs (three workers by default, maximum six). Preserve panel coverage and export
   failures; browser UI does not establish a complete layer tree. On 403 or a
   sign-in redirect, follow [manual login recovery](figma-browser.md#manual-login-recovery):
   with permission open a dedicated visible browser, ask the user to sign in,
   wait for confirmation, verify file access and resume using private saved
   authentication. Headless remains the default; if it stays blocked, an
   authorized `headless: false` run continues visibly with one worker. Respect
   an explicit browser-route choice before trying APIs. Do not retry repeatedly.

Stop at the first route that yields a usable, validated reference for the scoped
frame. Record the chosen route and skipped/failed reasons without secrets. Keep
successful partial context and immutable failures, use fresh output directories,
and share acquired evidence across workers. Do not reacquire merely to test all
routes. A route change never grants file permissions or bypasses access controls.

**Last-resort interactive export:** only when these routes are unavailable or
requested, use connected browser/native tools for frame export or **Copy as PNG**.
Check clipboard-image capability before opening menus. If the user needs
background-only operation, obtain permission before any visible interaction;
otherwise report missing acquisition access instead of taking over the screen.
Ask once for unresolved access or required files.

```sh
# FIGMA_ACCESS_TOKEN must already be set securely in the launching environment.
node dist/cli.js acquire-figma \
  --url 'https://www.figma.com/design/FILE_KEY/Design?node-id=1-2' \
  --out .fidelity/intake/new-run

# Still uses a new directory; verifies live revision before reusing PNG bytes.
node dist/cli.js acquire-figma \
  --url 'https://www.figma.com/design/FILE_KEY/Design?node-id=1-2' \
  --out .fidelity/intake/next-run --reuse .fidelity/intake/new-run
```

REST intake accepts Design `/design/` or legacy `/file/` node links, not whole
file, FigJam, or Make links. Branch links select the branch key; explicit
`version-id` links pin both metadata and rendering to that revision. The personal access token needs `file_content:read`
and access to the file. Set it through the user's secret/environment mechanism;
never ask for it in chat or put it in tool arguments, source, manifests or logs.
The extension does not create tokens or configure remote MCP authentication.

The output is a fresh `intake.json`, `frames/reference.png` and
`context/node.json`. Read `context/node.json` for subtree properties instead of
requesting child CSS repeatedly. Node IDs, logical dimensions, revision, hashes,
requested and actual scale, request count and elapsed milliseconds are recorded.
A failed operation preserves its manifest and any saved context with
`status: failed`; do not treat partial evidence as a complete reference.
The intake manifest is its own format, separate from the optional asset manifest.

The tool does not acquire original image fills, vectors or font files. Inventory
those separately and use available connected tools for a scoped batch. Missing
originals stay explicit. Metadata success does not establish complete assets.

## Styling without CSS copying

Use existing remote design context or REST node properties for typography,
spacing/auto layout, fills, radii, effects, component references and text runs.
Retain node identity and coverage. A sparse metadata outline is not full styling,
and a frame's properties alone do not cover every child. Fetch only genuinely
missing properties or assets. Structured properties do not imply that a CSS
file was produced; CSS is optional supporting evidence.

Translate properties into the app's Flutter constraints, TextStyle, decoration
and shared components. Resolve discrepancies against the PNG and measured
captures. Design context does not establish runtime behavior or supply font bytes.
Use the CSS mappings below only when CSS was actually provided or requested.
Do not block implementation or keep retrying copy menus for optional CSS.

## Reuse, limits and failure handling

- Keep originals immutable and create a new intake/capture/report directory for
  every new run. Never reuse a failed capture. Reference reuse is separate:
  REST `reuse` checks live file/node revision and scale, verifies PNG hash and
  decoding, and copies unchanged bytes into the new intake. Changed revision,
  different identity/scale, corrupt files or failed records trigger fresh export.
  A failed live check never silently falls back to old bytes.
- REST requests have a 30-second deadline each and a 90-second overall network
  deadline, with at most one retry for network/5xx failures. Access and rate-limit
  denials stop immediately; honor API limits rather than creating a retry loop.
  Other tools: retry a transient failure once after the indicated wait or a
  concrete correction, then record the failure and choose a usable fallback.
- The coordinator acquires each frame/context and shared originals once, then
  gives all widget workers the same validated local paths and revision identity.
  Do not repeat Figma exports or styling requests per subagent. Use local
  [widget marks and catalog lookup](widget-catalog.md) to divide implementation.
- Request only the linked subtree and required originals. Batch independent
  original-asset requests when the tool supports it; do not fetch redundant
  screenshot/context outputs when an existing result already contains them.
- Record elapsed acquisition time and request counts before making speed claims.
  Reduced interactions do not prove faster live Figma service responses.

A supplied link authorizes reading/exporting the requested design for
implementation. It does not authorize changing layers, sharing permissions or
publishing. Do not bypass authentication, export restrictions or an explicit
no-download constraint. Report the observed access blocker once and continue
independent repository/layout work while access is pending.

## PNG validation and interactive fallback

Save PNG bytes unchanged; validate and inspect them before importing. Reconcile
pixel dimensions with logical bounds and actual export scale. REST intake fully
decodes PNGs and marks `profileStatus: needs-review` if dimensions disagree with
the requested scale/bounds. Investigate clipping, effects, rounding and server
size caps. Never resize/align an image to hide geometry errors. Even a consistent
export does not establish the intended app viewport or safe area by itself.

For UI copying, select the frame itself via its title/layer, confirm the node,
and use observed menu labels. Save fresh clipboard image bytes immediately to a
new `frames/` file. Verify clipboard change/source identity, PNG format,
dimensions and hash; reject stale/HTML/text-only data. A completed menu action is
not proof of saved bytes. Record `sourceKind: figma-copy-as-png`, method and
freshness evidence. If unavailable, use another supported route without looping.

Only when explicitly requested or needed for a missing property, use
**Copy/Paste as → Copy as code → CSS**. Confirm fresh CSS declarations, save raw
UTF-8 under `context/`, and retain node identity/coverage and hash. Reject stale
text, editor-page CSS and login responses. Try one correction, then use existing
structured evidence or record the missing property. Do not copy every child.

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
  context/             # structured node/design context and optional raw CSS
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
| Frame reference | Prefer a background node PNG export with verified logical bounds and actual scale; UI copying is a fallback. Keep it immutable; controls and text are implemented as widgets. |
| Vector icons/logos | Keep the original SVG and its viewBox, fills, strokes and transparency; use the app's supported renderer. If incompatible, first seek a compatible source export; use conversion/new dependencies only within existing delegation or an explicit decision. |
| Raster artwork/photos | Keep original bytes and colors. Use a supported format and resolution appropriate to logical display size and device density. Record intentional crops, tint, fit and alignment. |
| Fonts | Acquire exact available TTF/OTF families and weights, including required glyph coverage. A font name, outlined SVG text or browser WOFF file is not a TTF/OTF font bundle. Do not promise that Figma export includes licensed font files. |
| Tokens/context | Prefer structured design context/node properties with coverage; retain optional raw CSS when available. Supplement only missing properties and component states. Reconcile discrepancies with the frame PNG; translate properties into the app's Flutter architecture. |

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

Official references: [remote MCP setup](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/),
[remote tools](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/),
[REST file/node/image endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/),
[Figma exports](https://help.figma.com/hc/en-us/articles/360040028114-Export-static-designs-from-Figma)
and [format settings](https://help.figma.com/hc/en-us/articles/13402894554519-Export-formats-and-settings-for-static-designs),
plus [copying objects as PNG and code](https://help.figma.com/hc/en-us/articles/4409078832791-Copy-and-paste-objects).
Tool capabilities and file permissions must still be checked in the active session.
