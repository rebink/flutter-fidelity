---
name: flutter-typography-fidelity
description: Resolve Flutter typography differences against a screenshot using supplied font files, rendered measurements, wrapping and baselines.
---

Read the original reference at native resolution and the report's text regions. Verify supplied TTF/OTF family and weight files before adjusting geometry. Do not replace an unavailable font silently. Register exact bytes through loadFidelityFonts; specify filename-to-family mappings when the default filename prefix is wrong. Native tests must bundle the same bytes under assets/fidelity_fonts/.

An inferred font remains an uncertainty even when its bytes are successfully hashed. Compare regular and bold samples in both widget and native renders; if registering weights under separate families, keep the capture mappings, production font declarations and TextStyle families consistent. Check icon-font loading separately from text fonts: missing glyphs in a widget test can be a capture setup defect rather than missing production UI. Use code-drawn icons when appropriate, and avoid unrelated character substitutions to hide missing glyphs.

If exact typography depends on an unavailable font or asset, ask whether the developer can identify/supply it or explicitly accepts a named substitute. Record the answer; a substitute does not establish exact matching to the original font. Do not repeatedly ask about a substitution already approved in the task.

Use TextPainter/RenderParagraph measurements and rendered samples to compare candidate font size, weight, letter spacing, line height, baselines and line breaks. Choose a small candidate set based on visible evidence; record unresolved candidates instead of inventing exact values.

Distinguish the text widget's layout rectangle from glyph ink. The reference region and measured region must describe the same box. Avoid padding fixes that compensate for the wrong font. TextStyle.height is a font-size multiplier, not a literal pixel line height; StrutStyle and TextHeightBehavior affect the resulting bounds. Check fallback glyphs, mixed text runs, explicit line breaks and locale.

Use actual RenderParagraph content from the harness to verify text, rather than echoing the reference transcription. Validate normal scale at the reference viewport, then increased text scaling and narrow widths separately. Preserve selectable/accessible text rather than rasterizing it to eliminate differences.
