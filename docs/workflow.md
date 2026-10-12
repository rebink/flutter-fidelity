# Screenshot-to-Flutter workflow

## Reference intake

Use `suggest_viewport` only to propose candidates. Establish the intended logical
width/height and app-content crop once. Use a supplied profile, or state the
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

## Capture entrypoint

Add `fidelity_harness` as a path **dev_dependency**, and register a test entrypoint
similar to `flutter/example/test/fidelity_test.dart`. Wrap inferred boxes with
`FidelityRegion`. It records actual RenderParagraph text and render bounds; it
does not trust reference text supplied as evidence. Use `FidelitySurface` for
isolated screen/widget builders, with the app's ThemeData. For an existing full
app shell, preserve its own navigation/theme and wrap the app-content boundary
and regions directly; still apply the confirmed profile in its builder.

`loadFidelityFonts` hashes loaded bytes against the reference bundle. Default
family is the filename prefix, e.g. Lato-Regular.ttf -> Lato. Pass `families` for
other filenames. Widget tests load local files; wrap loadFidelityFonts and writeFidelityCapture
in tester.runAsync so filesystem operations are not stalled by the fake test clock. Native tests load matching files
from the project's declared `assets/fidelity_fonts/` assets; copy these as part
of generation, not as a runtime network fetch.

For image widgets, explicitly await `precacheImage` inside `tester.runAsync`
before capturing. For widget-test shadow fidelity, set `debugDisableShadows =
false` and restore its previous value in a `finally` block before the test body
exits; framework invariant checks happen before teardown callbacks.

The test must set its viewport, settle fonts/images/painting, and suppress live
fixture data/animations. Capture uses RepaintBoundary.toImage at the reference
export ratio. The native test must run on a configured viewport of the same
logical size; mismatches fail, never stretch. Integration reportData transports
PNG and metadata to the host driver.

Capture config:

```json
{
  "projectRoot": "/absolute/path/to/flutter/app",
  "target": "test/fidelity_test.dart",
  "mode": "widget",
  "flutter": "/absolute/path/to/pinned/flutter/bin/flutter",
  "timeoutMs": 300000
}
```

Native mode is `integration` and additionally requires `driver` and `deviceId`.
The CLI invokes Flutter without a shell and records version, analysis/capture
logs, request and capture metadata. Capture failure preserves logs and cannot
reuse an old image. Use a new output directory every time.

## Comparison and repair

Default policy v2: whole-screen Pixelmatch threshold 0.1, required-region
threshold 0.01 (calibrated to catch pale missing cards), whole-screen ratio <=0.01, per-region
ratio <=0.03, geometry error <=1 logical pixel. Policy v1 used 0.1 everywhere and missed four
pale-card/variant defects in the twelve-case calibration; v2 preserves the
whole-screen setting and makes the region threshold explicit. Exact RGBA mismatch is reported
separately; SSIM cannot independently pass a screen. Pin policy/version, SDK,
renderer and OS/device externally for comparable runs. `environment.json`
records SDK/engine revisions; capture metadata distinguishes widget host and
native platform. Record any additional renderer/device flags in benchmark notes.

Missing font hashes, region measurements, text, settled rendering, reviewed
specification or analyzer evidence keeps a result incomplete. Wrong dimensions,
reference/image identity, pixel differences, text or geometry failures cannot be
normalized away. Optional regions do not gate acceptance; designation should be
reviewed, not weakened during repair. Missing behavioral checks are reported as
not-run, distinct from the report's design-fidelity scope.

Checkpoint your own code before each capture. `record_iteration` stores report
paths and tracks at most five rounds / two stalls. It does not modify source or
restore checkpoints. It refuses changing references/specs mid-session and reports
regressed matched regions. Deliver the best candidate code and its report;
never reset unrelated user changes.

## Behavioral/platform acceptance

Implement tap/input/navigation tests for real behavior. Check semantics, contrast
and tap targets, plus overflow at 360/390/430 logical widths and increased text
scaling. Record only checks actually executed. Capture Android and iOS separately;
widget-test renderer evidence is not native-device evidence. Screenshot fidelity
at another width requires another design reference; overflow checks alone do not
establish its intended layout.
