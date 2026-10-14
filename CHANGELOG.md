# Changelog

The package, plugin and all four bundled skills share one release version.
Comparison policy and evidence schema versions are independent.

## 0.4.0 — Unreleased

- Repair policy v2 protects passed analysis/interaction/accessibility/responsive
  checks, retains separate visual and product-valid candidates, and cannot stop
  on visual success with known product failures. Not-run checks remain incomplete.
- **Compatibility:** repair sessions are v2; active v1 sessions must finish with
  their matching tool release without resetting the budget. `bestValidReport`
  and run `valid` now require all nonvisual checks passed; `codeValid` preserves
  the narrower analysis/runtime meaning. Comparison policy v3 is unchanged.
- Optional capture config `sourceCheckpoint` saves scoped original source bytes,
  hashes and expected deletions before tools run, rejecting changes during capture.
  Capture v3 binds that identity; report v2 retains the verified snapshot.
  Capture v1/v2 remain readable and explicitly unbound. Strict older readers
  cannot consume capture v3; use the complete matching tool release.
- CLI/MCP `verify_source_checkpoint` verifies restored source without editing it.
  Reports retain snapshots independently of capture folders; source coverage is
  explicit, not a complete-build reproducibility claim.
- CSS-to-Flutter guidance covers line-height ratios, letter-spacing units, font
  faces/axes, intrinsic constraints, effects and export/logical pixel separation.
- Regression tests cover lost/failed product checks, source mutation, tampered
  snapshots, safe paths, scoped restoration and CLI/MCP source verification.

Source preparation for 0.4.0; no release tag, package publication or global installation.

## 0.3.0 — Unreleased

- Prefer Figma Copy as PNG for frame references, with verified clipboard bytes,
  source/scale provenance and connector/export fallback when unavailable.
- Also prefer Copy as code → CSS for styling evidence, retaining fresh snippets
  and node coverage alongside PNGs; supplement missing properties through
  connector/inspector data and translate them into native Flutter components.

- Production capture adapter preserves app routing, theme, localization, keyboard
  insets and MediaQuery flags. Isolated shells require matching locale support.
- CLI/MCP safe-area insets, explicit prepared-frame capture, editable/masked text
  evidence and approximate clipping/overflow detection. Capture schema is v2.
- **Compatibility:** default comparison policy is v3. Numeric pixel/geometry
  thresholds are unchanged; missing required-text visibility is incomplete and
  unintended overflow fails. Explicit policy v2 retains legacy behavior.
- Report v2 separates visual status from analysis/interaction/accessibility/
  responsive acceptance. CLI exit codes still describe visual fidelity; consumers
  needing product acceptance must read `acceptance.status`. Old strict readers
  need updates for new capture/report/spec fields.
- Repair selection rewards required-region, text and geometry progress before
  whole-screen pixel improvement while retaining passed regions and valid code.
- Read-only batch asset validation, hashes/duplicate detection, explicit task
  modes, shorter skills and realistic workflow evaluation cases.
- Native profile collector with raw frame timings, distributions, refresh-aware
  budgets and optional RSS; physical-device performance remains unverified.
- Fixture generation and benchmark output reject existing directories.

Prepared locally; no tag, push, package publication or global installation.

## 0.2.0 — Unreleased

- Figma intake with available design connector and Playwright/browser fallback,
  batch asset recovery, format validation and provenance records.
- Autonomous implementation and integration guidance aligned with the target
  Flutter app's state/layer conventions, plus measured optimization guidance.
- Optional end-of-task temporary screenshot cleanup after user agreement,
  preserving reference images and required verification evidence.
- Skill `metadata.version`, synchronized package/lock/plugin versions and a
  shared runtime version for the CLI and MCP handshake.
- `npm run update:check` and `npm run update` for clean source clones; updates
  fast-forward the configured upstream and run dependency installation/checks.
- Release synchronization and consistency checks to prevent mismatched bundles.

No visual gate, policy v2 threshold, reference format or capture schema changes.
This release is prepared locally; it has not been tagged, pushed or published.

## 0.1.0 — Initial baseline

- Screenshot-first CLI/MCP, four Flutter skills, capture harness, comparison
  reports, bounded repair, fixtures and comparator calibration.
