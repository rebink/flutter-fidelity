# Flutter UI patterns for generated screens

Read only the sections matching the confirmed feature. These patterns complement
[architecture](flutter-ui-architecture.md); sources and selection decisions are
in [the public-skill survey](flutter-skill-research.md). Preserve the PNG, existing
product contracts and pinned SDK. A static screenshot does not authorize adding
motion, haptics, new themes, packages, navigation or data states.

## Component states and design continuity

Identify a nearby production screen and the house controls, token accessors,
shell, icons and interaction feedback before adding components. Preserve a
custom design system's look and behavior; do not force it toward stock Material
or remove standard platform affordances merely to make it look distinctive.
For screenshot work, match its hierarchy, grouping, alignment and density.
Polish without a matching reference uses the established design tone and the
developer's direction; it does not earn reference-based fidelity acceptance.

For an interactive component, define only applicable states: enabled/disabled,
pressed, focused, hovered, selected and busy. Resolve visuals through existing
component themes/state properties or house controls, using APIs compatible with
the SDK. Keep focus visible, selection distinguishable beyond color, and disabled
behavior consistent across semantics and pointer/keyboard input. Appearance and
actual interactivity must agree. Use typed callbacks and optional widget slots
for composition instead of unrelated flags on one universal component.

In an existing shared UI package, consume its public API instead of importing
private src paths. Expose new reusable components through its established exports
and document their inputs/actions. Do not create a package for a one-off screen.
When adding ThemeExtension fields, update construction, copyWith, lerp and every
supported theme together; interpolate compatible values and explicitly snap
non-interpolable values. Test supported themes, not invented palettes. Include
text-selection, cursor, tooltip and focus styling when relevant to the reference.

## Forms, validation and focus

Reuse the app's form/state/validator conventions. Fields participating in
Form validation/save must use FormField-compatible controls; a plain TextField
does not automatically participate. Own stable form keys, controllers and focus
nodes outside build, disposing only resources owned by that widget. Lazy fields
need input state that survives disposal of off-screen rows.

Keep synchronous validators pure and cheap. Put asynchronous checks in the
existing state layer with cancellation/debouncing when needed; an older result
must not overwrite validation of newer input. Separate local validation errors,
server field errors and whole-submission errors through SDK-supported APIs.
Use the confirmed validation timing rather than showing all required-field
errors on first paint. Derive submit availability from current validity/busy
state; guard duplicate requests at the state owner.

Match keyboard type, capitalization, input actions and autofill hints to actual
field meaning. Connect next/submit actions to the same validated flow as the
button, with deliberate traversal order. Avoid automatic keyboard opening unless
the flow requests it. On validation failure make the first relevant invalid field
reachable and focus it where appropriate. Preserve entered data after failures
and across supported resize/tab transitions. Restore focus after modal dismissal.

Plan room for helper/error text without clipping scaled or translated messages.
Keep the focused field and submit action reachable above the keyboard and sticky
chrome. Use the existing autofill grouping/lifecycle for credential forms; test
autofill completion on the actual platform before claiming it works. Do not add
input filtering, clear input on failure or commit credentials without the
confirmed contract.

## Loading, empty, error and media states

Implement only states established by the application or developer. Distinguish
initial load, refresh of existing content, valid empty data and failure when the
contract distinguishes them. Preserve useful content/input during refresh or
recoverable errors; retain original data semantics and confirmed retry actions.
Never display an accidental Dart null, raw exception or stack trace as user copy.
Use the agreed missing-value representation; do not invent business values.

Reserve appropriate media bounds so image decoding/failure does not shift the
layout. Use original assets and approved loading/failure visuals; load only
relevant images in advance instead of preloading the whole app. For approved
network images, keep capture fixtures local/deterministic through the existing
data boundary. Do not download unrelated images or add a cache package by default.
An SVG needs its renderer's own readiness checks, not raster precaching alone.

Skeletons/progress appear only for real approved waiting states and match the
content's structure. Shimmer and animated fades remain optional, with motion
settings honored. Announce meaningful status changes once where appropriate;
avoid repeated announcements on rebuild or per-frame/per-character updates.
Important recovery actions must remain accessible when transient messages vanish.

## Motion and haptics

For approved motion, record its trigger, affected property, duration/curve or
physics parameters, interruption behavior, final state and reduced-motion
fallback. Reuse house motion tokens; a source screenshot establishes none of
these timings. Prefer implicit widgets for interpolation to a target value;
use explicit controllers for playback, sequencing or physics requiring control.
Keep stable children outside per-frame builders and dispose owned tickers.

Choose transforms/fades when only visual placement/appearance changes; animate
layout when surrounding content must actually reflow. A transform is not a
substitute for correct layout, hit areas or reference geometry. Use distinct
keys when AnimatedSwitcher must distinguish replaced content, and unique Hero
tags within each route when shared-element motion is part of the contract.

Consult platform motion signals through APIs supported by the pinned SDK. Where
exposed separately, account for both disableAnimations and iOS reduceMotion;
do not assume one flag covers every platform. The correct final state and actions
must remain reachable with motion off. Omit nonessential movement or use the
confirmed simplified transition. A MediaQuery override alone does not necessarily
control framework AnimationController behavior; test its binding/platform signal
and the actual controller path as well as custom policy decisions.

Stop repeating motion when off-route/backgrounded where appropriate, and under
the supported reduced-motion policy. Animation completion must not perform a
business commit that disappears when animation is skipped. Keep repeated input
safe and feedback interruptible without trapping the user. If haptics are approved,
fire through the existing event mapping/preferences once per semantic action,
not from a frame listener or every drag sample. Test dispatch counts separately
from actual device sensation; do not add settings screens or haptics to fill a
pattern checklist.

## Navigation, sheets and adaptive shells

Use the confirmed route destination and existing navigation mechanism. Distinguish
push/pop, replacement and tab changes by their intended back-stack behavior;
do not pick a router package from the screenshot. Share one destination model
between compact and expanded navigation so selection cannot diverge. Preserve
branch state/scroll/input as required, without adding global caches by default.

For dialogs/sheets, respect the app's overlay navigator, theme/localization,
keyboard insets, scroll bounds, dismiss/back policy and returned results. Keep
modal focus and semantics inside the overlay and restore focus on return; check
that underlying controls are not announced as actionable while blocked. Avoid
stacking duplicate overlays on repeated taps. Insets for bottom bars/FABs must
leave the final scroll item/action reachable without applying safe-area space
twice. A full-bleed background and inset content can have different boundaries.

Test deep links, browser history, predictive back or process restoration only
when supported by the feature contract. Use the installed router/SDK's documented
APIs; preserve identity needed to reconstruct a supported addressable route.
An in-memory extra object alone does not prove a route can reopen from its URL.

## Custom drawing and gestures

Resolve tokens, data, formatted labels and layout geometry at the owning boundary;
pass explicit drawing inputs into a painter. Separate drawing from domain state
changes. Immutable scene inputs help complex drawings but a trivial decoration
does not require a new scene framework or code-generation dependency.

Use one coordinate mapping for drawing, hit testing, tooltips and selection. Map
local pointer coordinates through its inverse; account for padding, viewport,
scroll and actual canvas transforms. Test boundaries and selected identity after
resize/data changes. This internal drawing transform does not authorize aligning
or resizing reference/capture PNGs during comparison.

Use geometry-appropriate hit testing and profile before imposing spatial indexes,
ID buffers or zero-allocation rules. Reuse expensive paths/text layout when their
inputs are unchanged, invalidating caches on size/font/locale/data changes.
Check shouldRepaint and, when implemented, shouldRebuildSemantics against changed
inputs. Native renderers still require separate capture evidence.

Resolve gesture conflicts with scrolling explicitly. Provide labeled focusable
alternatives for essential drag/swipe/long-press actions where required by the
contract/accessibility target. A semantic action must invoke the same state
command as its pointer equivalent. Mirror directional chrome according to locale;
do not automatically reverse physical map/chart coordinates or time-series data.

## Localization and typography

Use existing generated localization keys and typed placeholders/plurals/selects.
Avoid building translated sentences by concatenation; format amounts, units and
dates through the approved locale/timezone/display contract. Preserve reference
copy in the pinned fixture, and test other supported locales separately.

Check actual fonts for each script and intended weight/style/variable axes.
Record missing glyph/fallback uncertainty instead of hiding it with spacing.
Test joining, bidirectional mixed text, long strings and numeric alignment when
present. Directional icons/labels may mirror; branded artwork and physical data
surfaces mirror only when the design says so. Text scaling should be applied
once: Text already honors it, so manually scaling fontSize can double-scale it.

## Previews and trustworthy tests

Reuse an existing component gallery/Widgetbook/preview wrapper when useful.
Provide explicit component constraints, the real theme/extensions/localizations
and only necessary providers with approved fixture overrides. Use the built-in
previewer only when the pinned SDK supports it; its web environment cannot prove
native plugins, fonts or renderer fidelity. On older SDKs use the existing widget
test/capture harness rather than upgrading. Preview assets may have different
resolution rules: diagnose them in that environment before changing production
paths. Stop owned preview processes after the requested review unless continued
use was requested.

Organize applicable variants in a small matrix: state, theme, width, locale,
text scale, input and expected outcome. Create fresh widget instances/tests for
independent layout cases; reset view sizes, DPR, overrides and mocks afterward.
Use semantic/stable identity finders when useful, and separately assert visible
copy; keys do not prove user-visible correctness.

Advance known animation frames/timers explicitly. Use pumpAndSettle only with
finite, understood work and a bounded timeout; indeterminate spinners cannot
settle. Freeze approved fixture motion at a documented frame and await exact
fonts/assets separately. Preserve unexpected Flutter errors: an overflow or
unhandled async failure must not be consumed merely to keep the test green.
If diagnostic handlers are overridden, forward unexpected errors and restore
the previous handler. Absence of exceptions alone does not prove unclipped text;
also assert relevant geometry/content reachability.

Use behavioral assertions alongside visual snapshots. Goldens are development
regression baselines, separate from supplied design references; do not regenerate
them to bless failures. Review intended changes in the pinned environment, and
never overwrite reference PNGs. Ahem/default-font geometry tests cannot establish
typography fidelity. Run semantics guideline assertions with awaited async
matchers and release handles. For contrast, check actual composited foreground/
background pairs, including gradients/transparency/states where relevant;
automated guidelines alone do not establish full screen-reader or accessibility
conformance. Preserve every failed/not-run outcome.
