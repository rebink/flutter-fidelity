# Figma Journal demo

Flutter recreation of **Journal (before entry)**, Figma file `8eVUqzG8dX3WlsXTuSDdOW`, node `4117:76380`.

## Preview

```sh
cd demos/figma-journal/app
flutter pub get
flutter run -d chrome
```

The screen uses Flutter widgets for layout, text, calendar and cards. Dates are selectable; cards open local demo entry sheets. Answers are scoped to the selected day and live only in memory. The month is fixed to the source design; other screens and backend storage are not implemented. Desktop keeps a centered 402-wide mobile layout; smaller screens scroll.

## Reference and assets

- `design/reference-4x.png`: untouched Figma PNG export, 1608 x 3496 pixels (402 x 874 logical).
- Export obtained through visible Playwright Chrome after manual Figma login. Headless Figma navigation still returned CloudFront 403; Figma MCP was rate-limited.
- Category icon artwork is cropped from that export at logical x=36, width=48, height=48, y=320/420/520/620/720. The decorative island crop is x=140, y=8, width=120, height=40. No flattened screen or card image is used as the UI.
- Lato fonts reuse the existing gallery assets. Exact Figma font identity was not confirmed. Stock navigation/status icons, glass borders and shadows are approximations.
- Login cookies stay in a private profile outside this repository; they are not required for running the demo.

## Validation

```sh
cd demos/figma-journal/app
flutter analyze
flutter test test/ui_test.dart
flutter build web
```

Tests cover the five topics, entry selection, date-scoped answers, and a narrow viewport with 1.5x text. Browser checks use existing Playwright and installed Chrome; no global plugin or browser installation is needed on this machine.

Serve `app/build/web` locally, then from the repository root:

```sh
node demos/figma-journal/capture.mjs http://127.0.0.1:8874
```

The capture script runs mobile (402 x 874 at DPR 4) and desktop (1280 x 1000 at DPR 1) contexts in parallel. Every run gets a fresh timestamped directory. It checks HTTP status and uncaught browser errors; screenshots still need visual inspection.

Successful run: `runs/2026-10-16T05-51-27.057Z/`. Mobile and reference dimensions match without resizing or alignment. Raw mean absolute RGB channel error is 4.4645/255; this is **not a similarity percentage or a fidelity-gate pass**. See `pixel-comparison.json` and `absolute-diff.png`.

Flutter analysis, both widget tests, the web build, and mobile/desktop browser captures completed. The build emitted a missing Cupertino font-family warning; the screen uses Material icons and bundled PNG assets. LSP probes timed out; Flutter analysis is the confirmed static check. Native devices, screen-reader behavior and production persistence are not validated.
