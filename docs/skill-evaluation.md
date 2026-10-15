# Evaluate the Flutter UI skill as a workflow

Comparator calibration tests measurement logic. Skill evaluation tests whether
an assistant uses those tools to deliver maintainable, working UI. Keep these
results separate. Start each case in an isolated app checkout with immutable
references, a named skill/package version and a fixed repair budget.

Use `flutter-fidelity` for every case below. The assistant selects the relevant
internal guide and carries evidence between stages. A typography-only request
should load typography/verification guidance; a review-only request should
report findings without starting a build. A mixed build/repair request should
continue through the needed stages without asking the user to switch skills.

## Realistic cases

For design-driven builds, exercise the reference check and review choice before
implementation. Set an explicit review/skip answer in fixtures for cases focused
on later stages. The cases below describe expected behavior, not completed runs.

| Case and prompt | Setup | Required observable result |
| --- | --- | --- |
| Missing reference: “Build the new screen.” | No PNG, Figma URL or prior reference; unrelated images in the repo | Requests the intended PNG/path or Figma URL before asking about widget review; does not invent a reference or edit app code |
| Review choice: “Implement this design.” | Supplied PNG or Figma URL; no review preference; unanswered/preselected option | After confirming reference presence, offers review or skip; inspection may proceed, but no app edits or implementation workers until a submitted choice |
| Widget plan feedback: “Let me review the widgets first.” | Valid reference, existing app/catalog; user requests a change without approving | Explains composition; lists create/reuse/adapt decisions with actual symbols/paths and reasons; revises for feedback; keeps app source and implementation workers pending until current plan is approved |
| Skip widget review: “Use this PNG and proceed without widget review.” | Valid PNG and known app contracts; explicit skip choice | Does not ask the choice again; shares a brief approach/widget list, then implements and verifies without plan approval; required input/behavior gaps still stay pending |
| Reference unavailable: “Build this Figma frame; skip review.” | Present URL but denied access or invalid exported PNG | Distinguishes URL presence from validated evidence; reports access/input gap without invented widget matches, stale references or design-dependent implementation |
| Review resolved: “Approved, implement that plan.” | Current plan and feedback resolved in prior turns | Carries decisions forward without repeating intake or review selection, then builds and verifies; explicit switch from review to skip also releases the plan pause |
| Prototype: “Build this screen as a visual prototype; use local display fixtures.” | PNG, logical viewport, original assets/fonts; no backend | Builds without blocking on irrelevant API questions; typed fixtures/callbacks; actual control behavior; capture and honest comparison |
| Integrated form: “Implement this design in the existing account feature.” | Existing route/state/repository; Arabic locale, theme, keyboard and validation | Reuses those owners and localization; app adapter preserves keyboard/insets/route; editable and masked text evidence; submission uses established contract |
| Widget reuse: “Build these repeated cards using our existing widgets.” | One reference PNG, reviewed marks, catalog with exact/similar candidates and changed/missing source variants | Searches before Dart edits; checks current APIs and source hashes; groups repeated instances; reuses/adapts compatible code rather than copying reference crops into UI |
| Parallel widgets: “Use subagents to build the independent widgets.” | Reviewed widget contracts and file ownership; dependency and shared-file conflicts | Generates valid waves, delegates only independent work, shares acquired evidence once, integrates screen and validates freshly; hosts without subagents explicitly execute sequentially |
| Paired Figma plugin: “Use this selected frame.” | Local Pi bridge and user-paired Figma plugin, one selection | Checks session/document identity; saves fresh PNG/context through `acquire_figma_plugin` without UI navigation; root CSS optional, disconnects/edits/expired results stay explicit |
| Background remote MCP: “Build this linked frame while Figma is closed.” | Connected eligible remote MCP, node link; no visible Figma window | Saves verified node PNG and scoped design context without UI copying or redundant CSS requests |
| Background REST: “Build this linked frame.” | No remote MCP; REST token with file access | Uses `acquire_figma`; saves PNG and subtree styling at the same revision; no browser dependency |
| Missing CSS: “Implement this PNG.” | Valid PNG/profile and structured styling, no CSS menu access | Continues implementation with existing properties; optional CSS does not trigger retries or block |
| Reference reuse: “Use this frame again.” | Prior intake, unchanged/changed revision, corrupt PNG or failed live access | Reuses only verified unchanged bytes into a new directory; changes invalidate reuse; access failure never substitutes stale data |
| No background access: “Build in background.” | Neither MCP nor token; access/rate-limit denial variants | One actionable access/input request; no screen takeover, repeated denial loop or invented success |
| Clipboard reference: “Use Copy as PNG for this screen.” | Accessible target frame; clipboard-image capability available, unavailable or stale | Selects frame title/node; saves and validates new PNG bytes with source/scale evidence; rejects stale images; records fallback when copying is unavailable |
| Clipboard styling: “Also collect CSS through the right-click menu.” | Frame and child nodes; clipboard text available, stale or unavailable | Saves PNG before CSS, retains fresh raw snippets and node coverage, supplements missing child properties, translates styling into Flutter and preserves app architecture |
| Missing Figma assets: “Build this linked frame.” | Accessible frame but connector returns partial data; browser capability varies | Uses available background routes before interactive fallback; scoped batch originals with provenance and validation; one residual access/assets request; no invented successful download |
| Asset failures: “Use this export batch.” | Real font, duplicate PNG, HTML disguised as PNG, truncated font, SVG with external resources | Validator preserves originals, accepts supported bytes, lists each failure and duplicates; unsupported rendering remains explicit |
| Animated state: “Match the loading frame at 250 ms.” | Perpetual spinner or caret; explicit state/clock | Prepared readiness captures the painted frame without a hidden settle/time advance; fresh evidence on failure |
| Repair: “Fix the heading geometry; preserve the other regions.” | Two real captures with equal global pixel ratio but better required-region geometry | Records regional progress; protects passed regions, code validity and five-round/two-stall limits; retains source checkpoints |
| Product regression: “Make this closer without breaking submission.” | Prior passing action/accessibility/responsive checks; a candidate with better pixels but failed or unrun checks | Retains safe code/report, reports lost checks, tracks visual-best separately and cannot stop on a known product failure |
| Source restoration: “Deliver the best repair candidate.” | Scoped source-bound captures, owned new/deleted files and an unrelated user edit | Retains report snapshot, restores only owned files, verifies source hashes before fresh recapture and preserves unrelated work; legacy binding stays unavailable |
| Performance: “Optimize this scrolling view.” | Fixed dataset, physical device, native profile mode | Comparable repeated before/after traces and frame distributions, sample counts and memory limits; no debug-derived speedup claim |
| Comparable result: “Finish and show me the result.” | Original PNG, fresh source-bound capture and selected report with `metric.tolerantRatio: 0.01234`; image-capable host | Shows labeled original/generated images together at equal display scale, reports 98.766% visual fidelity, separate visual/product statuses, remaining differences and matching image/HTML/JSON links; works after skip-review too |
| High agreement with failure: “How close is it?” | High pixel agreement but a failed required region or product check; a rejected higher-scoring candidate | Uses the delivered source/report pair; preserves failures next to the percentage and does not substitute the rejected candidate or call the result accepted |
| Missing comparison evidence: “Show the result and fidelity.” | Capture failure, incompatible dimensions, pending widget approval or unavailable image display; separate measured-but-incomplete variant | Shows available genuine image and labels missing panel pending/unavailable; score N/A with reason when unmeasured, diagnostic when pixels exist but verification is incomplete; no stale/simulated capture or fabricated score; image-display limitation has labeled links/report fallback |
| Handoff and cleanup: “Finish and give me the result.” | Reports, original PNGs, final capture, redundant temporary previews | Includes original/generated comparison and measured percentage or explicit N/A; reports failed/incomplete checks honestly; offers exact eligible count/bytes/paths once; deletes only agreed temporary files |

The prototype and integrated-form cases should include narrow/wide layouts, large text, loading,
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

## Background intake validation scope

`test/figma.test.ts` exercises simulated REST responses, immutable output,
revision-pinned rendering, request counts, reuse invalidation, missing CSS,
credential isolation, partial evidence and access failures. Package tests verify
Pi tool discovery after relocation. These are implementation tests, not live
Figma timings or independent assistant workflow evaluations. Live recovery and
before/after speed measurements remain not-run without a frame link and
configured authentication. `intake.json.elapsedMs` records actual tool duration
when a live run is available; do not present mock timing as a service speedup.

`test/figma-bridge.test.ts` exercises actual loopback HTTP pairing, binary PNG
transfer, document/session binding, root CSS, wrong/expired messages, disconnects,
profile review and shutdown. It also runs the bundled sandbox and UI scripts in
VM environments with Figma/DOM test doubles. This checks protocol integration,
not real Figma's sandbox, network permission prompts, app lifetime or speed.
Those live checks remain not-run until a registered plugin and file are available.

## Widget catalog validation scope

`test/widget-catalog.test.ts` checks immutable PNG/crop provenance, exact and
equal-size similarity retrieval, source freshness, cross-project flags, corrupt
snapshots, incomplete records and independent registration. `test/widget-plan.test.ts`
checks coverage, dependency barriers, ownership conflicts and worker evidence.
The relocated Pi package test exercises all four tools over stdio MCP.

These tests validate the toolkit, not host vision accuracy or autonomous Dart
generation. Lexical overlap and pixel distance rank candidates; host review
handles semantic recognition, parameters, responsive states and behavior.
The Fieldnotes catalog demonstration uses existing design/source only. Its
entries retain `verification: not-run`; no fresh Flutter/native check or
end-to-end speedup is established by catalog registration.
