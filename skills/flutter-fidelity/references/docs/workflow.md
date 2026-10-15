<!-- Generated from docs/workflow.md by npm run skill:sync. -->

# Screenshot-to-Flutter workflow

## Reference intake

For a Figma link, follow [design intake and asset recovery](design-intake.md).
Default to browser-only Figma access: prefer a validated supplied PNG or
connected remote MCP, then `acquire_figma` for background REST export and
structured styling. No Figma desktop/plugin setup is required; an existing
plugin is opt-in only when chosen by the user. Use UI/clipboard copying as
a fallback or explicit user choice. CSS is optional; existing node properties
can supply styling without menu retries. Verify saved PNG bytes, node/revision,
logical dimensions and export scale. A repeated live request must check the
revision before reference reuse; every intake/capture/report gets a new directory.
Collect required original assets/fonts separately, recording provenance and
remaining gaps. Batch one residual access/input request when routes are unavailable.

Use `suggest_viewport` only to propose candidates. Establish the intended logical
width/height and app-content crop once. Use a supplied profile or reliable
target-frame/export evidence with its source recorded, or state the
benchmark choice when the developer delegates demo/reference selection; record
unknown source dimensions/export scale as uncertainty. Otherwise ask for missing
profile information. Source screenshot pixels are not device
logical pixels. Include font TTF/OTF files and available originals; inspect and
record missing dependencies. Supply safe insets in MCP import or the TypeScript
import API when the content retains an intentional safe area.

`import_reference` creates `original.png` (unchanged), `reference.png` (confirmed
crop converted to sRGB), `bundle.json`, `visual-spec.json`, and hashed font/asset
copies. No resize is performed. Reference and capture must have the same export
scale/aspect ratio. Cached bundles work offline.

## Confirm implementation intent

Read [design clarification](design-clarification.md) before implementing behavior
or chart/data choices that are not established by the screenshot or prior task
answers. Inspect existing dependencies, components and application contracts
first. Ask focused questions for the remaining gaps, record the developer's
decisions, and wait for required answers before dependent implementation.
Independent visual inspection, asset inventory and confirmed layout work can
continue. The PNG is the authority for appearance; the developer/application
contracts establish behavior. This is an agent workflow, not an automatically
enforced CLI/MCP decision gate.

## Autonomous execution and delivery

Execute the authorized workflow end to end: recover inputs, establish the visual
and feature contract, implement through the app's architecture, integrate, test,
capture, compare and repair within the existing budget. Do not stop at a plan,
asset inventory or isolated preview when the task requests a working feature.
Use existing decisions and delegated engineering choices without asking for
approval at every stage. Batch only unresolved questions that change the outcome;
continue independent work while a required answer or access action is pending.

Track the requested screens/states, required assets, routes/actions and supported
platforms in a short work record. For multiple screens, acquire shared assets
once, reuse common tokens/components, and retain a distinct reference/profile
and verification result per screen/state. Do not label unreferenced states as
visually verified. Discover omitted requirements from existing contracts rather
than inventing business logic to fill out the UI.

Use consistent deliverable formats without imposing a new app architecture:

| Artifact | Contents and ownership |
| --- | --- |
| Intake sidecar | Acquisition attempts, assets/provenance, format validation and remaining gaps; optional assets.json template |
| Reference bundle | Immutable PNG/font/asset evidence in the CLI's existing schema |
| Visual spec | Reviewed regions/layout and uncertainty in the strict VisualSpec schema |
| Decision/work record | Evidence-based architecture, change map, resolved/delegated choices, actions and acceptance scenarios |
| Widget marks/catalog/plan | Host-inferred regions, reusable source snapshots and explicit worker ownership; separate from VisualSpec and acceptance evidence |
| App source | Formatted Dart in existing feature/layer boundaries; production asset/font declarations and route/DI integration |
| Verification | Fresh capture/report folders, actual commands/results, behavior/accessibility/responsive checks and profile traces when available |
| Handoff | Run instructions, app entrypoint, code/report paths, scope completed and precise blockers or failed/not-run checks |

Apply [rendering cost guidance](flutter-ui-architecture.md#rendering-cost) during
implementation and the optimization evidence loop before claiming improvements.
Fix relevant analyzer/test failures and exercise the confirmed actions. Capture
only after valid inputs and deterministic state are ready. When a tool fails,
retain diagnostics and use an available equivalent within scope. No repeated
access retries, stale captures or silently reduced acceptance requirements.

Stop visual repair at the existing five-round/two-stall limit and deliver the
best preserved code/report with remaining differences. At other blockers, finish
independent work and state the exact missing input and next resumption step.
“Implemented,” “visually passed,” “behavior verified” and “performance measured”
are separate outcomes. Unavailable fonts, access, native devices or profiling
must remain explicit; autonomy does not turn missing evidence into a pass.

### Temporary screenshot cleanup

After delivering the result, ask once whether the user wants to remove temporary
screenshots generated during this task. Track their paths as they are created;
inventory eligible files and total bytes before asking so the user can see the
folders and approximate space recoverable. Include disposable browser captures,
preview copies and intermediate screenshots no longer needed by retained evidence.

Preserve supplied/reference PNGs, original assets, the delivered final/best
capture and report dependencies, and screenshots needed by retained repair
checkpoints, unresolved failures or incomplete evidence. Check references before
classifying a file as temporary. Do not propose deleting an entire .fidelity
directory or all PNGs by extension, and exclude files from unrelated tasks.

Ask at handoff: “Remove the temporary screenshots generated for this task
(<count> files, approximately <size>, in <folders>)? I'll keep the reference
images and final verification evidence.” Delete only the listed eligible files
after the user agrees, then report the actual files/bytes removed. A declined or
unanswered question leaves them intact; do not repeatedly ask. If no eligible
screenshots were generated, skip the question. Cleanup is optional and must not
delay delivery or change the recorded verification outcome.

## Visual specification

`inspect_reference` returns the reference preview and spec. The assistant uses
vision to infer a layout and transcribe text; server tools do not perform OCR or
AI inference. Use logical pixels relative to the app-content origin. A region's
bounds describe a widget box; do not confuse glyph ink and text layout boxes.

```json
{
  "version": 1,
  "regions": [
    {
      "id": "heading", "kind": "text",
      "bounds": { "x": 24, "y": 64, "width": 342, "height": 34 },
      "confidence": "high", "provenance": "Reviewed layout box in PNG",
      "required": true, "text": "Design, measured.", "widget": "Header"
    }
  ],
  "layoutNotes": ["Normal flow layout; CTA anchored after flexible body"],
  "uncertainties": [], "assets": []
}
```

Supported kinds: text, control, asset, layout, decoration. Required text regions
must include text. IDs are stable and unique. Save with `inspect --spec` or
`inspect_reference.visualSpec`; prior interpretations are retained. Medium/low
confidence and unresolved uncertainties keep acceptance incomplete. Do not
remove uncertainties without supporting evidence.

`crop_asset` takes PNG-pixel bounds, matching a designated asset/decoration region
in the spec. The tool refuses text/control/layout crops. Original assets are
preferred. Crops retain baked pixels; there is no AI background removal.

## Architecture and implementation

Choose [task mode](design-clarification.md#task-modes), then read the relevant
sections of [architecture](flutter-ui-architecture.md) and [UI patterns](flutter-ui-patterns.md).
Trace production contracts before integrated-feature work; prototype fixtures
must be labeled. Record a small change map and region owners outside VisualSpec.
Prefer the existing design system/state/layer conventions and the smallest
structure justified by the feature. Do not introduce speculative layers.

## Widget-first reuse and host delegation

Before Dart edits, follow [the widget catalog workflow](widget-catalog.md).
The host inspects the original PNG, infers region names/kinds and calls
`mark_widgets`. Bounds are integer **original PNG pixels**, unlike VisualSpec's
logical app-content coordinates. The resulting `marked.png` and crops help
review/delegation; controls and text still require Flutter implementations.

Call `find_widgets` against the app-local catalog, conventionally
`<project>/.fidelity/widgets`, and inspect existing app components. Review source,
parameters, variants and changed/missing-source flags before deciding `reuse`,
`adapt` or `create`. Similar images are candidates, not identical widgets or
proof of compatible behavior. Prefer a parameterized variant when the contract
supports the differences; do not create one implementation per repeated region.

Use `plan_widget_work` to cover every marked region, group repeated instances,
validate dependency order and keep file ownership disjoint within each wave.
The coordinator owns shared theme/contracts and final screen integration;
workers own separate files such as `lib/widgets/summary_card.dart` under the
app's existing structure. The default parallel limit is three. The host dispatches
available authorized subagents; if unavailable, execute the plan sequentially.
The CLI/MCP does not independently run models or implement Dart. Acquisition is
shared once, with local PNG/context/assets passed to every worker.

Integrate worker outputs, check actual behavior and run fresh analysis/tests and
screen captures/comparisons. Record reusable implementations with
`register_widget`: immutable entries contain `reference.png` and `widget.json`
with snapshot/source hashes. Use a new unique ID for each variant or revision.
A catalog entry is reusable evidence, not an independent visual/behavioral pass.
Report measured timing only; parallel planning does not establish a speedup.

## Capture entrypoint

Keep `fidelity_harness` in dev_dependencies and capture entrypoints in tests.
For integrated features, place `FidelityCaptureAdapter` **inside the production
app builder**, wrapping the existing navigator child. Keep the app's routes,
localization delegates/supported locales, themes and provider scopes:

```dart
builder: (context, child) => FidelityCaptureAdapter(
  request: request, boundaryKey: boundary, child: child!,
),
```

Compose with any existing builder rather than replacing its behavior. The adapter
copies inherited MediaQuery, preserving keyboard insets and accessibility flags,
then applies the confirmed size, DPR, brightness and safe-area profile. Padding
accounts for keyboard occlusion; viewPadding retains safe insets. Linear text
scaling is a deterministic reference fixture. Use `preservePlatformTextScaler:
true` for separate platform/nonlinear-scaling scenarios, not to claim equality
to the linear reference profile.

For isolated views, `FidelitySurface` accepts the app's theme,
`localizationsDelegates` and `supportedLocales`. It rejects an undeclared locale;
non-English configuration must be supplied, not silently resolved to English.
Locale tags support language, script and region. The capture also checks that
the resolved app locale matches the requested profile.

Wrap reviewed widget boxes with stable `FidelityRegion` IDs. Capture v2 reads
RenderParagraph **and RenderEditable** content. Obscured fields serialize masks,
never the secret value. `textVisibility` distinguishes detected overflow from
no detected overflow; this is not a proof of complete screen-reader visibility.
The detector covers paragraph truncation, editable scrolling, approximate ancestor
clips and the capture bounds. Inspect occlusion, custom paints and transformations
separately. `allowTextOverflow: true` is only for reviewed intentional truncation
in the spec, never a repair escape hatch. A legacy capture without overflow
evidence leaves required text regions incomplete under policy v3.

Load exact fonts with `loadFidelityFonts`, explicit family mappings when needed,
and native font assets under `assets/fidelity_fonts/`. In widget tests use
`tester.runAsync` for font/filesystem work and `precacheImage`; SVGs need the
renderer's own readiness. Set `debugDisableShadows = false` and restore it in a
finally block before test exit. Restore view/DPR overrides too.

Choose readiness explicitly. The default `CaptureReadiness.settle()` waits for
finite work. For animations/spinners or a selected fixture frame, await assets,
pump the intended frames, then call:

```dart
await captureFidelity(tester, request, boundary,
  fontsLoaded: true,
  readiness: const CaptureReadiness.prepared('Assets ready; selected frame at 250ms'),
);
```

Prepared capture does not pump or advance time; the caller must paint first.
Readiness metadata records the strategy and description. The legacy `settled`
flag means the selected frame is ready, not that every animation has stopped. Never claim all images
are decoded merely because scheduled frames stopped. Native captures still need
a correctly configured actual viewport and named device; widget results do not
establish native fidelity. Capture uses RepaintBoundary.toImage at the reference
export scale and native reportData transports PNG/metadata to the host.

Capture config:

```json
{
  "projectRoot": "/absolute/path/to/flutter/app",
  "target": "test/fidelity_test.dart",
  "mode": "widget",
  "flutter": "/absolute/path/to/pinned/flutter/bin/flutter",
  "timeoutMs": 300000,
  "sourceCheckpoint": {
    "id": "round-1",
    "files": ["lib/main.dart", "test/fidelity_test.dart", "pubspec.yaml", "pubspec.lock"]
  }
}
```

Native mode is `integration` and additionally requires `driver` and `deviceId`.
The CLI invokes Flutter without a shell and records version, analysis/capture
logs, request and capture metadata. Capture failure preserves logs and cannot
reuse an old image. Use a new output directory every time.
The CLI retains `capture-incomplete.json` until the entire pipeline succeeds;
comparison refuses a metadata-backed run with that marker, even if PNG/metadata
were written before failure. Keep those files as diagnostics, not valid captures.

### Source checkpoint binding

For new autonomous builds/repairs, declare `sourceCheckpoint` in capture config.
Use a unique candidate ID and explicit project-relative file paths: owned Dart
changes, capture entrypoint, dependency declarations/lockfile, and changed
generated code/assets affecting the screen. Finish code generation first. Use
forward slashes without traversal or symlinks. This is a scoped snapshot, not
a claim that every application/build input was hashed.

Before analysis/capture, the CLI saves unchanged bytes in
`<capture>/source-checkpoint/files/` and a hashed manifest in `checkpoint.json`.
Absent listed paths have `sha256: null`, preserving expected deletions. After
capture, listed source must still match; changes fail the run, preserve diagnostics
and require a new folder. Only successful verification adds capture v3 identity.

Comparison verifies the snapshot against capture metadata and copies it into
the report's `source-checkpoint/` folder. Missing/mismatched snapshots cannot
produce bound reports. Repair verifies that copy and records ID/hashes; each
recorded candidate requires a distinct checkpoint ID. Reference/font/PNG
identity checks remain independent.
Keep the listed paths and binding mode fixed within a repair session; changing
coverage is rejected without consuming a round or rewriting its budget.

Restore only task-owned files from the chosen report's snapshot, including owned
new/deleted states. Never overwrite unrelated changes or automatically restore
shared dependencies merely because they were hashed. Verify current source:

```sh
node dist/cli.js verify-source-checkpoint \
  --checkpoint .fidelity/report-1/source-checkpoint/checkpoint.json \
  --project-root /absolute/path/to/flutter/app
```

The equivalent MCP tool is `verify_source_checkpoint`. It reads without editing;
CLI exit status is 0 for matching source, 1 for mismatch/error. Mismatches list
paths and expected/actual hashes. Resolve them before fresh analysis/tests/capture.
Matching hashes prove scoped source identity, not behavior or native fidelity.
Retain manifests and snapshots alongside final reports/unresolved failure evidence.

Legacy captures remain readable, with `sourceBinding: unavailable` and
`bestSourceCheckpoint: null`. Do not claim verified restored-source identity from
unbound evidence. Omitting binding does not change visual comparison gates.

## Comparison and repair

Default policy v3: whole-screen Pixelmatch threshold 0.1, required-region
threshold 0.01 (calibrated to catch pale missing cards), whole-screen ratio <=0.01, per-region
ratio <=0.03, geometry error <=1 logical pixel. Policy v1 used 0.1 everywhere and missed four
pale-card/variant defects in the twelve-case calibration; v2 preserves the
whole-screen setting and makes the region threshold explicit. Exact RGBA mismatch is reported
separately; SSIM cannot independently pass a screen. Pin policy/version, SDK,
renderer and OS/device externally for comparable runs. `environment.json`
records SDK/engine revisions; capture metadata distinguishes widget host and
native platform. Record any additional renderer/device flags in benchmark notes.

Policy v3 keeps v2 pixel/geometry thresholds. It adds required-text overflow
evidence and separates visual status from product acceptance. Reports are v2;
`status` remains visual status. `acceptance` includes visual, analysis,
interactions, accessibility and responsive results. Overall acceptance is
failed if any check fails, incomplete if anything is not-run/incomplete, and
passed only when all listed checks pass. Performance/native acceptance still
requires its own evidence. `compare` exit codes remain visual (0/1/2); consumers
that require product acceptance must check `acceptance.status` too.

Explicit policy v2 remains readable and preserves the legacy behavior of folding
failed behavioral checks into visual status. Do not compare v2/v3 status without
noting this distinction. Capture v1 remains readable but cannot supply v3 text
visibility evidence. The bundle and VisualSpec remain version 1 with the optional
`allowTextOverflow` field; older strict-schema tools cannot consume that field.
Use the complete matching release rather than mixing versions.

Missing font hashes, region measurements, text, settled rendering, reviewed
specification or analyzer evidence keeps a result incomplete. Wrong dimensions,
reference/image identity, pixel differences, text or geometry failures cannot be
normalized away. Optional regions do not gate acceptance; designation should be
reviewed, not weakened during repair. Missing behavioral checks are reported as
not-run, distinct from the report's design-fidelity scope.

Repair policy v2 uses session schema v2 and retains the five-round/two-stall
budget. `record_iteration` does not edit source or restore checkpoints. It refuses
changed references/specs/comparison policies and duplicate report paths. It
protects passed regions and analysis/interaction/accessibility/responsive checks:
passed to failed or not-run is a regression. Known product failures cannot
displace a candidate without known failures merely by improving pixels. Eligible
candidates prioritize code validity, absence of product failures and passed
checks, then visual status, required-region progress, text/geometry errors and
pixel mismatch.

| Returned field | Meaning |
| --- | --- |
| `bestReport` | Selected candidate with regression protections; may still have failed/incomplete evidence |
| `bestVisualReport` | Separately tracked visual candidate; diagnostic when product checks regress |
| `bestProductValidReport`, `bestValidReport` | Best candidate with analysis, interactions, accessibility and responsive checks all passed and no runtime errors; null if none qualifies. Visual status may still fail |
| `regressedChecks`, `regressedRegions` | Passed evidence lost relative to the selected candidate |
| `bestSourceCheckpoint`, `sourceBinding` | Selected candidate's verified stored snapshot path, or null/unavailable for legacy evidence |

`valid` now means all recorded nonvisual checks passed; `codeValid` describes
analysis/runtime checks alone. A visual pass with known product failures cannot
end repair as success. Visual repair may complete with not-run checks when no
passed evidence regresses, but its reason explicitly retains incomplete product
acceptance. Full acceptance requires `acceptance.status: passed` and separately
required native/performance evidence. Budget exhaustion/stalls retain failures.

Legacy session v1 is rejected without rewriting evidence or resetting its budget.
Finish active legacy sessions with their matching tool release; do not update
tools mid-task or reset the budget for unchanged inputs. Comparison policy remains
v3; repair policy v2 changes selection/stopping gates, not pixel/text/geometry
thresholds. Deliver selected source with its matching report and scoped source
verification; never reset unrelated user changes.

## Behavioral/platform acceptance

Implement tap/input/navigation tests for real behavior. Check semantics, contrast
and tap targets, plus overflow at 360/390/430 logical widths and increased text
scaling. Record only checks actually executed. Capture Android and iOS separately;
widget-test renderer evidence is not native-device evidence. Screenshot fidelity
at another width requires another design reference; overflow checks alone do not
establish its intended layout.
