# Changelog

## 0.12.0 - 2026-10-21

- Recover from a timed-out or unavailable macOS manifest picker with path entry
  in the same setup run, before any settings are saved. Explicit picker
  cancellation and Ctrl+C still stop setup without continuing.
- Fix bridge recovery with protocol 2: use per-launch identities for idempotent
  pairing, release abandoned ownership only without active polls/exports, retry
  temporary transport failures, and offer in-memory Reconnect without exposing
  the code again. Update the engine and prepared plugin together; protocol 1
  copies are incompatible. Expired/failed exports do not disconnect a healthy
  session, and a disconnect during output creation retains failed intake evidence.
- Preserve the browser-intake deadline reason when timeout closes the browser
  during preflight, rather than misreporting an observed-recipe failure.
- Report partial Pi configuration writes, including cancellation, with completed
  and unfinished paths and safe retry instructions. Preserve newer settings and
  backups rather than automatically rolling back independently saved files.
- Configure both native Pi MCP and a project-local pi-mcp-adapter override with
  one consent. Keep the stateful adapter server alive after first use, preserve
  shared plugin templates and unrelated servers, and reject invalid/symlinked
  settings or conflicting aliases before changing either Pi configuration.
- Verify actual local MCP startup, engine version and Figma tools before the
  wizard saves files/settings; bound and cancel the check, close its temporary
  server, redact private startup diagnostics, and never start a second bridge.
  Report loopback readiness separately from plugin preparation and host pairing.
- Add a read-only bridge health/protocol check and an explicit plugin **Check
  bridge** action. Verify compatibility before sending a pairing credential;
  explain old/unrelated listeners and the reload/start/fresh-code recovery path.
  Health reveals no document/session/credential/path data; Host/origin and all
  paired-route authorization checks remain. Browser network errors explicitly
  retain uncertainty between a missing server and blocked access. No automatic
  network probes run merely because the plugin opened.
- Add guided `flutter-fidelity setup`: Node/engine and macOS Figma checks, a
  native macOS manifest picker, remembered Figma-assigned ID, content-addressed
  local plugin copies and app/folder opening without desktop-click automation.
  Offer opt-in project JSON MCP setup for Claude/Pi or Codex's own user-level
  registration command, preserving unrelated settings and private JSON backups.
  Refuse invalid/symlinked settings, serialize setup writers and preserve raced
  files with conflict-safe JSON publication. Cancel detached subprocesses on
  Ctrl+C, redact Codex diagnostics and resolve its Windows npm/native launcher
  without a shell. Retain the explicit preparation CLI; never start a second
  bridge, install global plugins or publish.
- Align the Figma development manifest and plugin UI on `http://localhost:43871`.
  Bind explicitly to IPv4/IPv6 loopback and keep exact Host, origin and pairing
  checks; port conflicts fail without stopping another process.
- Bind UI/sandbox messages to a per-launch random channel instead of requiring
  `event.source === parent`. Use `crypto.getRandomValues()` (not sandbox-missing
  `randomUUID`), retry metadata with a bounded deadline, and show document-read
  errors and connection recovery instructions. Clean up a pending pairing if
  document access fails so the engine session is not orphaned.
- Add `setup-figma-plugin --manifest <Figma-generated-manifest> --out <new-folder>`
  so users do not need to copy IDs. Keep the existing `--id` preparation script,
  refuse overwrites, and document the Figma menu/import/pairing steps.
- Add real sandboxed-browser fixtures with opaque origins, relayed messages,
  missing `randomUUID`, retries, channel rejection and loopback PNG transfers.
  Tests use ephemeral ports and never take over an existing bridge. No browser
  or global plugin is installed; comparison/repair policies are unchanged.
- Verify a clean native macOS/Pi reinstall through the real wizard and Figma
  import, protocol-2 health, first-click pairing and a first-request fresh
  402 x 2521 frame export. Independently check PNG dimensions/hash, context,
  root CSS and preserved backups. Windows and fresh-account setup are not
  qualified by this local integration result.
- Synchronize package, MCP/CLI runtime and agent-plugin/skill versions to 0.12.0.

## 0.11.1 - Unreleased

- Check Figma intake availability in order: connected Figma MCP (local first),
  Fidelity REST token, Figma desktop with the Flutter Fidelity Bridge plugin,
  then Playwright with manual-login recovery. Stop at the first validated
  reference, retain failure reasons and ask before desktop setup or pairing.
- Synchronize package, MCP/CLI runtime and agent-plugin/skill versions to 0.11.1.

## 0.11.0 - Unreleased

- Make Playwright the third online skill intake option after remote MCP and REST.
  On 403/sign-in redirects, guide authorized visible manual login, wait for user
  confirmation and resume with private saved authentication. Add explicit
  `headless: false` serial acquisition when authenticated headless access stays
  blocked; background defaults and no-automatic-foreground behavior remain.
  Denial manifests retain HTTP status and recovery guidance. No credential or
  normal Chrome profile copying, repeated login attempts or quota bypass.
- Add `acquire_figma_browser` and `acquire-figma-browser` for background Playwright
  inspection and parallel collection of explicitly scoped node properties.
  Three isolated headless contexts share authentication by default, with a
  six-worker cap, deduplicated jobs, reused pages and bounded deadlines.
- Save observed layer rows, per-panel text/accessibility/form values and optional
  validated root PNG exports. Preserve missing/failed evidence; browser UI never
  claims a complete node tree, revision pinning or visual acceptance.
- Add real headless browser fixture coverage for isolation, concurrent jobs,
  selection identity, downloads, denials and deadline cleanup. Live Figma
  compatibility and speed remain unverified. Comparison/repair policies and Dart
  sources are unchanged; no browser, global plugin or SDK installs run implicitly.

## 0.10.2 - Unreleased

- Remove `exposure: "direct"` from the Pi adapter. Some MCP integrations warn
  that this setting is ignored on extension-registered servers. Tool exposure
  now follows the host's configuration; command, arguments, workspace behavior
  and the capture timeout retain their existing values.
- Tighten the relocated Pi package test to reject ignored registration settings
  before starting the real MCP server and exercising its tools.

## 0.10.1 - Unreleased

- Fix fresh Pi Git installations failing with `tsc: command not found`.
  Pi runs `npm install --omit=dev --legacy-peer-deps`, then npm's prepare hook
  builds the source. TypeScript and Node type definitions are now regular
  package dependencies so that build does not depend on omitted dev packages.
- Add a fresh-source production-dependency build regression and document
  recovery for failed 0.10.0 installs. Existing CLI/MCP, Dart and fidelity
  policy contracts are unchanged.

## 0.10.0 - Unreleased

- Rename the user-facing skill from `flutter-ui` to `flutter-fidelity`. The
  project, skill, CLI and MCP server now share the Flutter Fidelity name.
  Remove obsolete copied skills through your host's normal management and
  reload skill discovery; this package does not modify global installations.
- Support standard project skill installation for Claude Code, Codex and other
  compatible agents. A portable CLI launcher finds a matching project engine or
  an explicitly configured checkout without downloading tools or running a shell.
- Bundle the skill's documentation inside its folder. `npm run skill:sync`
  generates copies from `docs/`; `npm run check` detects stale copies.
- Add Claude Code local plugin files alongside the existing Pi and portable/Codex
  packaging. MCP command paths resolve from the package; the host retains control
  of the workspace directory. Core PNG/REST workflows also work through the CLI.
- Rewrite the README with Humanizer guidance and document project setup,
  version pairing, optional MCP connections and the limits of platform evidence.
- Comparison policy v3, repair policy v2, images and Dart code are unchanged.

## 0.9.0 — 2026-10-15

- First tagged Pi extension release. Includes the Pi adapter, Figma intake and
  widget catalog/planning work recorded in the 0.5.0–0.8.0 preparation entries
  below; those versions were not separately tagged or published to npm.

- One user-facing skill, `flutter-ui`, replaces the four former entry points.
  It routes build/reuse, typography, repair and verification automatically from
  the request and current evidence. Detailed instructions remain bundled as
  internal references, loaded only for the relevant stage.
- Pi explicitly discovers only `skills/flutter-ui`; recursive package inspection
  verifies a single `SKILL.md` and all four internal guides. Use
  `/skill:flutter-ui` after updating/reloading the package.
- Documentation and plugin prompts use the same entry. CLI/MCP tool names,
  catalog formats and comparison/repair gates retain their existing contracts.

## 0.8.0 — Unreleased

- Widget-first intake: `mark_widgets` saves labelled overviews and native-size
  reference crops from host-identified regions without changing the source PNG.
- `register_widget` and `find_widgets` retain immutable project catalog entries,
  Dart symbols/API notes, variants and hashed source/test snapshots. Retrieval
  ranks exact pixels, equal-size pixel distance and lexical metadata overlap;
  changed/missing source and incomplete/corrupt records remain explicit.
- `plan_widget_work` groups repeated instances into reuse/adapt/create jobs,
  checks dependencies and schedules disjoint file ownership per parallel wave.
  The host executes available subagents, with sequential fallback. No separate
  model runner, model credentials or global plugin installation is added.
- Pi exposes eighteen tools. Browser-only REST/remote MCP acquisition is the
  default; the optional desktop plugin route is no longer the suggested setup.
- Catalog matches are candidates, not visual/behavioral acceptance. Existing
  comparison policy v3 and repair policy v2 remain unchanged.

## 0.7.0 — Unreleased

- Paired local Figma plugin connection: `figma_bridge` controls the listener and
  `acquire_figma_plugin` requests fresh node PNG/context, with optional direct
  root CSS properties. Pi now exposes fourteen MCP tools.
- Read-only Plugin API exports avoid browser/copy-menu automation and REST
  tokens. Figma and the plugin must remain open on the same computer as Pi.
  Initial registration uses a Figma-assigned ID via the included preparation helper.
- Loopback pairing, scoped requests, single-file sessions, bounded timeouts,
  strict message/image validation and fresh output directories preserve evidence.
  Subtree property changes during export fail explicitly; no plugin cache is used.
- Real local HTTP, bundled-script VM and relocated package tests cover the new
  connection. Live Figma sandbox connectivity and speed remain unverified.
  Comparison policy v3 and repair policy v2 are unchanged.

## 0.6.0 — Unreleased

- Background Figma `acquire_figma` MCP tool and `acquire-figma` CLI save a linked
  frame PNG plus scoped node styling JSON without a visible app or clipboard.
  REST authentication uses `FIGMA_ACCESS_TOKEN` from the launching environment.
- Rendering is pinned to the context revision. Optional reuse checks the live
  revision, identity, scale and PNG hash/decoding before copying unchanged bytes
  into a new intake. Changed/corrupt/failed references require fresh acquisition.
- Skills prefer connected remote MCP or REST intake; CSS copying is optional
  and interactive automation is a fallback. Requests/retries are bounded;
  access denials and incomplete evidence stay explicit.
- Pi now exposes twelve tools. Original artwork/fonts remain separate inputs.
  Comparison policy v3 and repair policy v2 are unchanged. Live Figma acquisition
  timing remains unverified without authenticated frame access.

The package, plugin and bundled skill share one release version.
Comparison policy and evidence schema versions are independent.

## 0.5.0 — Unreleased

- Pi package manifest and extension register the existing MCP server with all
  eleven tools and bundle the four Flutter skills and their documentation.
- Git/local dependency installation builds the CLI automatically; npm packages
  include built output. The adapter resolves its CLI relative to its own file
  and leaves tool paths relative to the user's Pi workspace.
- Pi owns MCP startup, tool/image results, errors and shutdown. Unsupported Pi
  hosts and unbuilt packages receive actionable errors. No extra agent runtime
  or global installation is added to Flutter Fidelity's dependencies.
- Package smoke coverage exercises the relocated tarball, skill files, tool
  discovery, relative workspace paths, image results, immutable references and
  incomplete evidence. Comparison policy v3 and repair policy v2 are unchanged.

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
