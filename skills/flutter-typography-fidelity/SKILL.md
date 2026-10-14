---
name: flutter-typography-fidelity
description: Resolve Flutter typography differences against a screenshot using supplied font files, rendered measurements, wrapping and baselines.
metadata:
  version: "0.4.0"
---

Use original-resolution references, exact font bytes and rendered evidence before adjusting text geometry. Missing fonts/icons follow [intake recovery](../../docs/design-intake.md); batch remaining questions and retain uncertainty for inferred or substituted families.

For copied CSS, use the [translation mappings](../../docs/design-intake.md#translate-css-into-flutter): pixel line-height becomes a font-size ratio, em letter spacing becomes logical pixels, and export scale must not alter text styles. Verify font metrics/baselines and keep text scaling enabled.

Verify TTF/OTF family, weight/style and required glyph coverage. `loadFidelityFonts` hashes the loaded bytes; supply explicit family mappings when filenames are ambiguous. Keep capture mappings and production declarations aligned, including icon fonts. Native tests load the same bytes from declared test assets. A hash proves identity, not that a font was correctly inferred from the design.

Compare a small evidence-based set of sizes/weights, letter spacing, height and baselines using TextPainter/RenderParagraph measurements. Distinguish widget bounds, glyph ink and line boxes. Check StrutStyle/TextHeightBehavior, wrapping, fallback and variable axes. Do not compensate for a wrong font with padding or image-based text.

Follow the [capture text contract](../../docs/workflow.md#capture-entrypoint): editable text is measured too, obscured values are masked, and content equality is distinct from clipping/ellipsis evidence. Inspect intended truncation explicitly. Preserve accessible/selectable text and independent semantics checks.

Apply fixes at the existing semantic style/component owner, preserving intentional local variants. Retest affected regions and supported larger text/narrow widths. Do not double-scale fontSize, clamp system scaling, force source line breaks at every width or hide essential content. Use only applicable [localization guidance](../../docs/flutter-ui-patterns.md#localization-and-typography): generated strings/plurals, locale/timezone formatting, joining/bidirectional text and script fallback. A reference fixture does not establish support for additional locales.
