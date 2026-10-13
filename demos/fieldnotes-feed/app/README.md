# Fieldnotes Flutter feed

A local interactive community-feed demo, generated from the original image in `../design/reference.png`.

Run with the project's pinned Flutter 3.24.0 SDK:

```sh
flutter pub get
flutter run
flutter test test/controller_test.dart test/ui_test.dart
```

Capture tests require a `FIDELITY_REQUEST` supplied by the Flutter Fidelity CLI. Production code does not import the capture harness. See the parent README for measured comparisons and limitations.
