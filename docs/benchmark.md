# Benchmark protocol

## Comparator calibration

`npm run fixtures` creates twelve PNGs with controlled design regions and Lato
fonts. `npm run benchmark` compares identical PNGs and deliberate missing-region
defects. Identical files without real Flutter metadata must remain incomplete;
defects must fail. This verifies measurement behavior, not generation accuracy.

The fixtures cover typography, nested layout, wrapping, scrolling, images, icons,
gradients, shadows, clipping, repeated components, variants and a complete screen.
References originate from an independent Sharp/SVG/text render pipeline, not
Flutter-generated acceptance baselines. Font license is OFL, included in fonts/.

## Real agent evaluation

For each case, give the same PNG, font/asset bundle and confirmed viewport to:
ordinary prompting, official MCP/skills, this workflow, and FigmaToCode where a
corresponding structured source is available. Do not pretend FigmaToCode accepts
PNG-only input. Use separate copies of the target repo to avoid cross-run edits.

Record real captures and metadata, assistant/model/version, platform/OS/renderer,
rounds, elapsed time, build outcome and maintainability observations. Collect
Android/iOS results separately. A comparison report's passed status concerns
visual fidelity; behavioral check outcomes remain visible in capture metadata.

Run `npm run benchmark -- --manifest runs.json --out new-directory` with:

```json
{
  "runs": [
    {
      "approach": "flutter-fidelity / assistant-model-version / Android-device-OS-renderer",
      "caseId": "typography",
      "bundle": "/absolute/reference-bundle",
      "actual": "/absolute/capture/actual.png",
      "capture": "/absolute/capture/capture.json",
      "rounds": 3, "elapsedMs": 120000, "buildSucceeded": true,
      "maintainabilityNotes": "Reviewed reusable widgets, semantics and production dependencies"
    }
  ]
}
```

Do not invent results for assistants or devices that did not run. Do not convert
pixel mismatch to an unsupported universal “accuracy” percentage. Calibrate
thresholds against deliberate one-pixel shifts, wrong font/weight, changed line
breaks, missing small icons, color changes and clipping. Freeze policy changes
before evaluating a fresh corpus.
