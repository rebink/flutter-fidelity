# Evaluate the Flutter skills as workflows

Comparator calibration tests measurement logic. Skill evaluation tests whether
an assistant uses those tools to deliver maintainable, working UI. Keep these
results separate. Start each case in an isolated app checkout with immutable
references, a named skill/package version and a fixed repair budget.

## Realistic cases

| Case and prompt | Setup | Required observable result |
| --- | --- | --- |
| Prototype: “Build this screen as a visual prototype; use local display fixtures.” | PNG, logical viewport, original assets/fonts; no backend | Builds without blocking on irrelevant API questions; typed fixtures/callbacks; actual control behavior; capture and honest comparison |
| Integrated form: “Implement this design in the existing account feature.” | Existing route/state/repository; Arabic locale, theme, keyboard and validation | Reuses those owners and localization; app adapter preserves keyboard/insets/route; editable and masked text evidence; submission uses established contract |
| Clipboard reference: “Use Copy as PNG for this screen.” | Accessible target frame; clipboard-image capability available, unavailable or stale | Selects frame title/node; saves and validates new PNG bytes with source/scale evidence; rejects stale images; records fallback when copying is unavailable |
| Clipboard styling: “Also collect CSS through the right-click menu.” | Frame and child nodes; clipboard text available, stale or unavailable | Saves PNG before CSS, retains fresh raw snippets and node coverage, supplements missing child properties, translates styling into Flutter and preserves app architecture |
| Missing Figma assets: “Build this linked frame.” | Accessible frame but connector returns partial data; browser capability varies | Tries available connector then Playwright/browser; scoped batch originals with provenance and validation; one residual access/assets request; no invented successful download |
| Asset failures: “Use this export batch.” | Real font, duplicate PNG, HTML disguised as PNG, truncated font, SVG with external resources | Validator preserves originals, accepts supported bytes, lists each failure and duplicates; unsupported rendering remains explicit |
| Animated state: “Match the loading frame at 250 ms.” | Perpetual spinner or caret; explicit state/clock | Prepared readiness captures the painted frame without a hidden settle/time advance; fresh evidence on failure |
| Repair: “Fix the heading geometry; preserve the other regions.” | Two real captures with equal global pixel ratio but better required-region geometry | Records regional progress; protects passed regions, code validity and five-round/two-stall limits; retains source checkpoints |
| Product regression: “Make this closer without breaking submission.” | Prior passing action/accessibility/responsive checks; a candidate with better pixels but failed or unrun checks | Retains safe code/report, reports lost checks, tracks visual-best separately and cannot stop on a known product failure |
| Source restoration: “Deliver the best repair candidate.” | Scoped source-bound captures, owned new/deleted files and an unrelated user edit | Retains report snapshot, restores only owned files, verifies source hashes before fresh recapture and preserves unrelated work; legacy binding stays unavailable |
| Performance: “Optimize this scrolling view.” | Fixed dataset, physical device, native profile mode | Comparable repeated before/after traces and frame distributions, sample counts and memory limits; no debug-derived speedup claim |
| Handoff and cleanup: “Finish and give me the result.” | Reports, original PNGs, final capture, redundant temporary previews | Reports failed/incomplete checks honestly; offers exact eligible count/bytes/paths once; deletes only agreed temporary files |

The first two cases should include narrow/wide layouts, large text, loading,
empty/error states and a concrete action assertion. Do not mark a stage passed
because its prompt was followed superficially: inspect source ownership, run
checks, view the PNG and read the comparison report.

## Record the run

Record prompt, assistant/model identity if exposed, package/policy versions,
reference/font hashes, repo revision, tool access, SDK/platform, source snapshot,
commands, elapsed time, repair rounds and all outcomes. Unknown model identity
stays unknown. Distinguish observed, inferred and not-run evidence. Do not count
helper unit tests as independent agent behavior or native performance evidence.

Use the [real capture manifest](benchmark.md#real-agent-evaluation) to summarize
actual captures. For comparative claims, give fresh assistants the same inputs,
keep their source/checkpoints separate and prevent access to prior implementations.
Report per-case outcomes, maintainability findings and all failures. An informed
same-assistant smoke exercise is useful integration evidence, but is not a blind
benchmark, cross-model comparison or universal quality/accuracy score.

Current local smoke results and limitations are recorded in
[verification](verification.md). Live Figma recovery requires an actual link and
connected tools; native profiling requires the target physical device. Cases
without these prerequisites remain not-run.
