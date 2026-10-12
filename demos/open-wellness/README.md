# Open Wellness · original CC0 mobile designs

Three editable design references and independently implemented Flutter screens:
Daily pulse, Weekly insights, and the advanced Training lab. The design PNGs,
SVG graphics and text-layout JSON are dedicated to the public domain under
[CC0](design/LICENSE). No third-party UI screenshots, logos, photographs or
illustrations are used. Lato font binaries retain their included OFL notices;
Flutter code and tooling use the repository's MIT license.

## Run

```sh
cd demos/open-wellness/app
flutter pub get
flutter run
flutter test test/ui_test.dart
```

Select Insights to see recovery analytics. Scroll below the goal card and select
**View training lab** to open the advanced dashboard. Tap or drag charts to inspect
a point; the training filters select visible series. Steps can be updated through
the step card, and the evening routine opens a completion sheet. Data is local
sample data, not medical guidance or a connected service.

## Design and capture provenance

`design/` contains editable SVG artwork, text-layout JSON and independent PNG
references. Generators use SVG/Sharp text rendering and do not run Flutter.
References were frozen before measurement. `bundles/` stores image/font hashes and
controlled region rectangles. Text was reconstructed in Flutter and is not
rasterized. The comparison uses 390×844 logical pixels, output ratio1 and zero
safe insets; OS chrome is excluded.

`runs/android-*` contains native PNGs, environment/capture metadata and comparison
reports. The retained capture logs are local generated files excluded from Git;
metadata and reports are checked in. `artifacts/` provides convenient Android
previews and report copies. Early captures with failed analyzer evidence are
retained as failures; they are not used for the results below.

## Results

| Screen | Native tolerant mismatch | Exact RGBA mismatch | Report |
| --- | --- | --- | --- |
| Daily pulse | 5.203% | See report | [Android report](artifacts/today-report/index.html) |
| Weekly insights | 4.232% | See report | [Android report](artifacts/insights-report/index.html) |
| Training lab | 2.841% | See report | [Android report](artifacts/training-report/index.html) |

All three fail the default1% whole-screen gate; required-region gates apply too.
The PNGs show remaining text placement, chart geometry, progress drawing and
styling differences. Results are controlled demo measurements, not universal
image-to-Flutter performance. Native Android rendering was verified on
Pixel_8_API_36 with Flutter3.24.0 using a temporary1170×2532 framebuffer at
density480. Original emulator settings were restored. These native captures do
not establish iOS fidelity or native interaction correctness.

Static analysis passed. The30 widget tests cover routine/step updates, navigation,
chart endpoint selection, training filters, and widths360/390/430 at text
scales1/1.5/2 across all three screens. Accessibility findings are recorded in
`artifacts/accessibility.json`: labels and Android targets pass for the two
wellness screens; contrast fails. Training accessibility was not independently
assessed. A passing test that records guideline findings does not mean those
guidelines passed.

Production code does not depend on the capture harness; it is a dev dependency.
Capture tests require the CLI-provided `FIDELITY_REQUEST`. Config files use
`flutter` on PATH; substitute a pinned local SDK when needed.
