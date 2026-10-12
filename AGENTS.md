# Flutter Fidelity development

This is an agent companion, not an independent model runner. Vision/layout
inference and Dart edits belong to the host assistant; deterministic measurements
belong to the CLI/MCP. PNG is the visual authority. Keep structured Figma/Sketch
information optional.

Use `npm run check` for TypeScript build and meaningful core/MCP tests. Run
`npm run fixtures && npm run benchmark` after image/policy changes. Calibration
results are not model-generation accuracy. Update policy version and docs when
changing gates. For Dart changes, run Flutter analysis and
`flutter test test/ui_test.dart` in `flutter/example`; capture-specific tests need
the CLI's FIDELITY_REQUEST.

Never overwrite reference PNGs or reuse an old capture after failure. New run
folders are required. Never resize/align input images to hide geometry errors.
Preserve explicit incomplete evidence; do not mark native platforms or behavioral
checks passed merely because widget captures pass.

Do not install global plugins, change the user's Flutter SDK, upload, publish,
or edit unrelated app code as a side effect of packaging or testing.
