<!-- Generated from docs/flutter-skill-research.md by npm run skill:sync. -->

# Public Flutter UI skill survey

Research date: 12 October 2026. Searched public GitHub skill sources and indexed
skill listings, then retrieved primary entrypoints from 15 accessible repositories:
83 SKILL.md files were catalogued. Detailed review focused on UI entrypoints and
selected references, not every backend/tooling instruction or every linked file.
This is a broad survey, not an exhaustive inventory of every public/private skill.
An additional indexed muheun/claude-code-marketplace source returned 404 and was
not treated as verified guidance.

[The source manifest](flutter-skill-sources.json) records repository, retrieved
revision, content hashes, source links, review depth and retrieval limits.
Twelve repository revisions were separately verified against commit metadata;
three retain their successfully retrieved revision/content hashes because further
metadata requests hit the public API limit. No external skill, script, package,
plugin hook or SDK upgrade was installed. The additions are original synthesis,
not bundled third-party instructions or copied code.

## Selection criteria

Keep guidance that changes implementation or catches a concrete failure. Verify
API-sensitive claims against Flutter documentation and the target SDK. Combine
duplicates with the existing architecture/fidelity rules. Treat dependency,
state-framework, naming, aesthetics and coverage preferences as local conventions,
not universal requirements. Preserve screenshot authority and established behavior.

## Useful findings and where they landed

| Finding | Source families | Integration |
| --- | --- | --- |
| Read a real production screen and house primitives before choosing UI defaults | TheSimpleApp, Chunky Tofu, K9i | Component states/design continuity; architecture inspection retained |
| Theme-backed widgets with typed callbacks, slots and stable public package exports | VGV UI package, Jeffallan, zakariaf | Component API and package-boundary guidance |
| Update all ThemeExtension fields and supported theme registrations together | VGV, TheSimpleApp, zakariaf | copyWith/lerp/variant guidance; existing semantic tokens retained |
| Distinguish pressed/focused/disabled/selected/busy visuals and behavior | TheSimpleApp, K9i, dhruvanbhalara | Applicable component-state contracts and keyboard/semantics checks |
| Form participation, input retention, validation timing, focus and autofill | TheSimpleApp forms, zakariaf forms, dhruvanbhalara Bloc forms | Forms/focus patterns with existing state ownership |
| Keep async checks out of sync validators and prevent stale/duplicate results | zakariaf, dhruvanbhalara | Form cancellation/busy contracts and verification |
| Differentiate load/refresh/empty/error with approved recovery and stable media bounds | AbdulManan references, kamranbekirovyz catalog | Loading/media patterns; no invented backend or placeholder assets |
| Use the simplest fitting animation mechanism with explicit final/interrupted/reduced states | VGV animations, MADTeacher, ajianaz | Motion decision criteria without arbitrary timings or aesthetic presets |
| Gate haptic dispatch by a semantic event, not each frame/gesture sample | zakariaf motion, Mic-360 | Optional event-based haptics and dispatch evidence |
| Preserve branch/selection/input state and test intended back/overlay behavior | Official routing, MADTeacher navigation, VGV navigation | Navigation/sheet/adaptive-shell contracts |
| One drawing coordinate mapping shared by paint, hit testing and tooltips | zakariaf canvas, MADTeacher animations | Canvas geometry and semantic action parity |
| Typed localization placeholders/plurals and actual-script shaping checks | Official localization, VGV/MADTeacher i18n | Localization/typography patterns and fidelity skill |
| Isolated previews must reproduce theme, constraints and required providers | Official preview, Chunky Tofu preview, VGV Widgetbook | Optional previews with SDK fallback and native-evidence limits |
| Explicit pumping, fresh layout cases, preserved errors and geometry assertions | Official widget tests, MADTeacher testing, zakariaf golden/a11y | Test reliability patterns; immutable PNG authority retained |
| Profile actual rebuild/raster work and native interactions | Jeffallan, dhruvanbhalara DevTools, official skills | Existing profiling/renderer rules retained, rather than adding fixed thresholds |
| Bounded visual review and recheck consumers of shared style changes | Chunky Tofu polish, kamranbekirovyz review | Existing five-round/two-stall repair and region regression rules retained |

Implementation lives in [UI patterns](flutter-ui-patterns.md), loaded by topic.
The flutter-fidelity skill routes to applicable internal guidance. [Architecture](flutter-ui-architecture.md)
continues to own structure/state/token/layout rules. These are agent instructions,
not added MCP schemas, automated gates or comparator policy changes.

## Primary skill sources

These links identify the actual primary sources behind the synthesis; the
manifest contains every retrieved entrypoint and its review designation.

- Flutter team: [responsive layout](https://github.com/flutter/agent-plugins/blob/0ef3972f93e2baa4156ba1cbb1e515cd53079c68/skills/flutter-build-responsive-layout/SKILL.md), [layout diagnostics](https://github.com/flutter/agent-plugins/blob/0ef3972f93e2baa4156ba1cbb1e515cd53079c68/skills/flutter-fix-layout-issues/SKILL.md), [previews](https://github.com/flutter/agent-plugins/blob/0ef3972f93e2baa4156ba1cbb1e515cd53079c68/skills/flutter-add-widget-preview/SKILL.md), [widget tests](https://github.com/flutter/agent-plugins/blob/0ef3972f93e2baa4156ba1cbb1e515cd53079c68/skills/flutter-add-widget-test/SKILL.md), routing and localization entrypoints.
- Dart team: [unit-test skill](https://github.com/dart-lang/skills/blob/0d9f1c4a0ae29d6f5180bf6143d7997ec3bacf49/skills/dart-add-unit-test/SKILL.md). Catalogued as complementary testing guidance; no UI-specific package rule was imported from it.
- Very Good Ventures: [UI package](https://github.com/VeryGoodOpenSource/vgv-ai-flutter-plugin/blob/496a3c6d857476b3f75bc7bca292eff9ba18c7d1/skills/ui-package/SKILL.md), [animations](https://github.com/VeryGoodOpenSource/vgv-ai-flutter-plugin/blob/496a3c6d857476b3f75bc7bca292eff9ba18c7d1/skills/animations/SKILL.md), [accessibility](https://github.com/VeryGoodOpenSource/vgv-ai-flutter-plugin/blob/496a3c6d857476b3f75bc7bca292eff9ba18c7d1/skills/accessibility/SKILL.md), theming/testing/navigation/i18n.
- TheSimpleApp: [custom system](https://github.com/TheSimpleApp/flutter-app-skills/blob/90502edc25ec2100ce54d12c8d8538d2928be414/skills/flutter-custom-design-system/SKILL.md), [forms](https://github.com/TheSimpleApp/flutter-app-skills/blob/90502edc25ec2100ce54d12c8d8538d2928be414/skills/flutter-building-forms/SKILL.md), [accessibility](https://github.com/TheSimpleApp/flutter-app-skills/blob/90502edc25ec2100ce54d12c8d8538d2928be414/skills/flutter-improving-accessibility/SKILL.md), native UI.
- Chunky Tofu Studios: [design polish](https://github.com/ChunkyTofuStudios/flutter-skills/blob/5db2b8ca817b0163deac5c5a09adda80dc62652c/skills/design-polish/SKILL.md), [preview wrapper](https://github.com/ChunkyTofuStudios/flutter-skills/blob/5db2b8ca817b0163deac5c5a09adda80dc62652c/skills/preview-widget/SKILL.md).
- zakariaf: [canvas/gestures](https://github.com/zakariaf/Flutter-Skills/blob/e073e5ea10c963d2c52ab1e423bd314c28a56154/skills/custom-canvas-and-gestures/SKILL.md), [motion/haptics](https://github.com/zakariaf/Flutter-Skills/blob/e073e5ea10c963d2c52ab1e423bd314c28a56154/skills/motion-and-haptics/SKILL.md), [test hygiene](https://github.com/zakariaf/Flutter-Skills/blob/e073e5ea10c963d2c52ab1e423bd314c28a56154/skills/widget-golden-and-a11y-testing/SKILL.md), component/form/design-system entrypoints.
- MADTeacher: [adaptive UI](https://github.com/MADTeacher/mad-agents-skills/blob/2fb67e384c6d91f32025bd96400d33b73f21bdc7/flutter-adaptive-ui/SKILL.md), [navigation](https://github.com/MADTeacher/mad-agents-skills/blob/2fb67e384c6d91f32025bd96400d33b73f21bdc7/flutter-navigation/SKILL.md), animation/testing/i18n.
- dhruvanbhalara: [UI](https://github.com/dhruvanbhalara/skills/blob/a74a6fbe04a0d13ce5e10242bb5560cd73ca109e/skills/flutter/flutter-ui/SKILL.md), [forms](https://github.com/dhruvanbhalara/skills/blob/a74a6fbe04a0d13ce5e10242bb5560cd73ca109e/skills/flutter/flutter-bloc-forms/SKILL.md), [DevTools](https://github.com/dhruvanbhalara/skills/blob/a74a6fbe04a0d13ce5e10242bb5560cd73ca109e/skills/flutter/flutter-devtools/SKILL.md), testing.
- Jeffallan: [Flutter expert](https://github.com/Jeffallan/claude-skills/blob/1be15d8064f88fc25216442406d40add8fd23b53/skills/flutter-expert/SKILL.md) and selected widget/performance references.
- K9i: [template design guidance](https://github.com/k9i-0/flutter_autonomous_template/blob/091e72158531333cd38d8869e51d79929000c561/.claude/skills/flutter-ui-design/SKILL.md), [ccpocket UI architecture](https://github.com/k9i-0/ccpocket/blob/d929b44d625b1a0dbc6a0651f5d97850f46f66d3/.claude/skills/flutter-ui-design/SKILL.md).
- ajianaz: [UI/UX](https://github.com/ajianaz/skills-collection/blob/f1d8f59331cdc81888fc730a04366370ece51361/skills/flutter-ui-ux/SKILL.md) and selected widget patterns; enterprise skill catalogued only.
- kamranbekirovyz: [design review](https://github.com/kamranbekirovyz/skills/blob/136d2c480eb5157e6d1c228f36e63cf9ea7e05c9/flutter-improve-design/SKILL.md) and selected entries in its DETAILS catalog.
- AbdulManan: [production entrypoint](https://github.com/AbdulManan-official/flutter-production-skill/blob/bc2f39c341be1b0e02ef28eae997051f6807b0c3/SKILL.md), UI and UX-state references; backend/monetization/store workflows excluded.
- Mic-360: [Material 3 Expressive](https://github.com/Mic-360/material3-expressive-flutter/blob/5e7f45af7a755a0a4dd0a0961ceca5394c0e2582/skills/SKILL.md). Reviewed conditionally for motion/shape intent; expressive styling is not a default.

## Recommendations deliberately filtered

- Prescribed fonts, gradients, rounded pills, 8dp grids, automatic dark palettes
  and animations/haptics on every control conflict with source fidelity or
  established product choices. Use the source's useful decision principle without
  its aesthetic preset.
- Forced Bloc/Riverpod/Freezed/go_router, new UI-package scaffolding, mandatory
  global plugins and SDK/major-package upgrades exceed a screen task. Preserve
  the target architecture and compatible tooling.
- Absolute bans on StatefulWidget, widget creation inside build, helper methods,
  Path.contains, GlobalKey or animated layout are not universal Flutter rules.
  Choose according to ownership, form identity, geometry and measured costs.
- CustomPainter does not guarantee byte-identical output across native renderers.
  Internal geometry transforms do not justify modifying comparison images.
- Fixed 60fps promises, fixed list/JSON-size optimization thresholds, mandatory
  zero-allocation painters and blanket RepaintBoundary wrapping lack project/device
  evidence. Profile relevant work before selecting an optimization.
- Subjective design scores, awards language, 100% coverage mandates and automatically
  regenerated goldens do not establish screenshot or product acceptance. Keep
  meaningful contract tests and our existing numeric gates/repair budget.
- Mandatory changelog/permission/notification/paywall flows, whole-app asset
  preloading, contrast rewrites and forced autofocus introduce unrequested product
  behavior. Apply only confirmed requirements.
- Automatic semantics wrappers and untested global announcements can duplicate
  controls or overwhelm users. Review the actual semantics/input trees.

## API checks used in the synthesis

- [Forms](https://docs.flutter.dev/cookbook/forms/validation) and [focus](https://docs.flutter.dev/ui/interactivity/focus): form participation and resource/traversal ownership.
- [Implicit animation](https://docs.flutter.dev/ui/animations/implicit-animations): choose a mechanism matching the approved property/state transition.
- [disableAnimations](https://api.flutter.dev/flutter/widgets/MediaQueryData/disableAnimations.html) and [reduceMotion](https://api.flutter.dev/flutter/dart-ui/AccessibilityFeatures/reduceMotion.html): platform signals differ; MediaQuery overrides do not necessarily control framework controllers.
- [pumpAndSettle](https://api.flutter.dev/flutter/flutter_test/WidgetTester/pumpAndSettle.html): indefinite animation cannot settle; explicit pumping improves determinism.
- [ThemeExtension](https://api.flutter.dev/flutter/material/ThemeExtension-class.html): custom theme additions require copyWith/lerp implementations.
- [Widget Previewer](https://docs.flutter.dev/tools/widget-previewer): isolated web previews, SDK-dependent support and native limitations.

This research validates guidance selection, not generated app accuracy. The
instruction changes need real generated-screen comparative evaluations before
claiming a measured improvement or best-in-class result.
