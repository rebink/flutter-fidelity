---
name: flutter-visual-repair
description: Iteratively repair generated Flutter UI using screenshot pixel, region, geometry and typography reports, with bounded rounds and preserved best code.
---

Read [the workflow](../../docs/workflow.md). Fix measured errors in order: major layout and constraints, typography, original/cropped assets, colors, clipping and effects. Use overlay/blink inspection and local region metrics; a whole-screen number can hide a missing small control.

Preserve the component and state boundaries in [Flutter UI architecture](../../docs/flutter-ui-architecture.md). Diagnose the owning constraint, style/token, asset or painter before patching individual coordinates. Fix shared causes at their owner and check every affected required region; keep a local exception local when it is intentional. Do not flatten sections into one build method, move business logic into widgets, add per-device coordinate tables, disable text scaling or introduce whole-screen transforms to improve the score. Recheck adaptive layout and confirmed behavior after structural/token changes. Keep necessary architecture refactoring scoped to the generated feature and within the existing repair budget.

Use the relevant [UI patterns](../../docs/flutter-ui-patterns.md) when repairing state-dependent controls, forms, overlays or drawings. Preserve the fixture's state/animation frame. Recheck focus/error-text growth after field styling, supported state variants after token changes, and painter/hit-test/tooltip coordinate consistency after geometry changes. A component preview can help diagnosis but cannot replace the required fresh screen capture. Do not redesign the app's visual tone or update golden baselines merely to conceal a mismatch.

Preserve confirmed behavior and component/library choices during visual repair. Ask before resolving new ambiguity or replacing a chart component in a way that changes capabilities or dependencies; reuse prior answers. Pixel differences do not authorize new interactions, synthetic series or invented state transitions. Keep unresolved functional decisions separate from measured visual differences.

When an icon/image mismatch exposes a missing asset, resolve its source/format or approved replacement with the developer. A repair score is not authorization to silently replace the asset, change SVG/PNG format, introduce an icon pack or redraw branded artwork. Preserve approved asset decisions through subsequent rounds.

For each candidate, checkpoint only the files you are editing into a separate run folder (or a scoped Git patch plus new-file copies); do not reset unrelated user work. Capture with the unchanged reference profile, compare into a NEW run directory, and call record_iteration. The tool preserves the best report and stops at five captures or two non-improving rounds. You must preserve the corresponding code yourself; it does not modify or restore Dart files.

A lower global mismatch does not justify regressing already matched regions. Inspect regressedRegions and retain the best valid code checkpoint. Analyzer/build failures are not visual success. If a reference/spec changes legitimately, start a new session and explain the change; never alter reference images, loosen policy or relabel uncertainty to manufacture a pass.

After changing chart traces or other data-dependent painters, exercise selection and boundary gestures before delivery. A visually improved default state may still have stale indexing or broken interactions. Behavioral fixes after the repair limit require fresh verification; compare the default-image hash to the retained candidate. A matching hash establishes unchanged rendering for that fixture only. If a fix changes the default pixels, report the new artifact's measured result and its relationship to the retained candidate; do not count additional visual repairs as verification to bypass the session limit.

On stop, restore only your best candidate's owned files, rerun analysis/capture if restoration changes the current artifact, and deliver its report plus unresolved differences. Never automatically align, resize, or stretch comparison images. Failing/incomplete results remain visible.
