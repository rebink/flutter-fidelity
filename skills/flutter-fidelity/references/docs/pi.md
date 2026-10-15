<!-- Generated from docs/pi.md by npm run skill:sync. -->

# Flutter Fidelity for Pi

Flutter Fidelity is a Pi extension package with eighteen MCP tools and one
user-facing skill, `flutter-fidelity`. The Pi model inspects designs and edits Dart; the tools perform local,
deterministic validation, captures and comparisons.

## Install

Use Pi with native `registerMcpServer` support (tested with
`@earendil-works/pi-coding-agent` 1.2.0). Follow Pi's own Node requirement;
Flutter Fidelity requires Node 22+ available as `node` on PATH. Flutter is
needed for captures, but not for image inspection or comparison.

From the Flutter project where you want to use the tools:

```sh
pi install --local git:github.com/rebink/flutter-fidelity
```

Restart Pi after installation. Project packages load after Pi's project trust
step. Use `pi list` to check the installation and `/mcp` to check the
`flutter-fidelity` server. The extension uses direct tool exposure. Pi may
prefix tool names with the server namespace.

For a local clone, first run `npm ci` in the clone; its prepare hook builds
`dist`. Then, from your Flutter project:

```sh
pi install --local /absolute/path/to/flutter-fidelity
```

Pi does not install dependencies for a local path. Git installs do install
dependencies and run the build hook; allow lifecycle scripts and development
dependencies for a source build. An npm archive contains built output and
needs only runtime dependencies. Do not copy the extension file alone: it
locates `../dist/cli.js`. The skill keeps its guides inside its own folder;
the measurement engine still needs the complete package and its dependencies.

## Use

Start with:

```text
/skill:flutter-fidelity Implement this PNG in my Flutter app, then capture and verify it.
```

`flutter-fidelity` is the only entry point. Describe the task in the same command,
for example “Fix the heading typography” or “Verify the existing checkout UI”.
The host reads the appropriate internal build, typography, repair or verification
guide and continues automatically. No additional skill commands are needed.

Default to browser-only Figma access with remote MCP or REST; no Figma desktop
application or local plugin setup is required. An existing plugin connection is
opt-in only if the user chooses it.

For background REST Figma intake, make `FIGMA_ACCESS_TOKEN` available securely in the
environment that launches Pi, then restart Pi so its MCP subprocess inherits it.
Use a Figma personal access token with `file_content:read` and access to the file.
Do not paste credentials into chat or tool arguments. No Figma window is needed.

```text
/skill:flutter-fidelity Implement https://www.figma.com/design/FILE_KEY/Design?node-id=1-2 using background acquisition.
```

The model can call `acquire_figma` with the link and a new output directory.
It saves a PNG plus scoped styling JSON; CSS copying is optional. To avoid
re-rendering an unchanged frame, pass a prior successful intake directory as
`reuse`; a live revision check and PNG hash/decode validation still run. Read
`profileStatus` before importing: dimension mismatches require review.
The tool does not recover original artwork or font files.

An already connected Figma remote MCP can be used instead. Its authentication
and client eligibility are separate; Pi support is not assumed. Without either
route, the skill reports missing access and may use a validated local PNG or an
interactive fallback. It supplies neither a browser nor a design-service login.

| Tools | Purpose |
| --- | --- |
| `figma_bridge`, `acquire_figma_plugin` | Existing opt-in local plugin capability; not required for the default intake workflow |
| `acquire_figma` | Background Figma frame PNG, structured node context and revision-checked reuse |
| `doctor`, `validate_assets`, `suggest_viewport` | Environment, image/font bytes and candidate viewport sizes |
| `import_reference`, `inspect_reference`, `crop_asset` | Immutable reference bundles, PNG vision input and scoped decorative assets |
| `mark_widgets`, `find_widgets` | Host-named PNG regions/crops and project-local reusable widget candidates with source freshness checks |
| `register_widget`, `plan_widget_work` | Immutable reference/source catalog entries and validated region coverage, dependencies and file ownership |
| `capture_ui`, `compare_ui`, `get_report` | Flutter captures, visual evidence and HTML/JSON reports |
| `record_iteration`, `verify_source_checkpoint` | Bounded repair and verification of restored owned source |

Tool paths resolve in the Pi workspace. Use absolute paths when working across
projects. The adapter allows 1,200 seconds per MCP request to accommodate the
capture pipeline's sequential steps. If your capture configuration needs more,
configure the same server name in Pi's `mcp.json` with a larger `timeout`
(seconds). That configuration overrides extension
registration. Check `/mcp` for overrides when diagnosing an unexpected CLI.

PNG references are never overwritten. Each capture/report needs a new output
directory. Equal pixels without capture evidence remain incomplete. Widget
captures do not establish native, behavioral, accessibility or responsive
acceptance. See the full [workflow](workflow.md).

## Reuse widgets and delegate through Pi

Follow [widget catalog and work planning](widget-catalog.md) before writing Dart.
The host names regions with vision, marks original-pixel bounds, searches the
catalog and reviews source before choosing reuse, a parameterized variant or a
new widget. Keep the catalog in `<project>/.fidelity/widgets` by convention and
Dart in the app's existing structure (often `lib/widgets/`); no global install is
needed. Catalog matches are candidates, and changed/missing source needs review.

`plan_widget_work` groups repeated regions into one task and validates complete
coverage, a dependency DAG and disjoint files per wave (default `maxParallel: 3`).
The coordinator owns shared theme/contracts and integration. Each worker gets
separate widget files and the same local reference/context/assets, acquired once.
Use available authorized host subagents; if Pi has no delegation capability,
execute sequentially. The extension does not supply an independent model runner.

After integration, run fresh tests/capture/comparison. Registration stores source
snapshots/hashes and a reference crop, not a behavioral or visual pass. Never use
the crop as the runtime UI. Record separate native/behavioral evidence and actual
timing before making acceptance or speedup claims.

## Update and troubleshoot

Use `pi update --extensions` for managed packages, then restart Pi. A Git tag
or commit stays pinned. Local clones use the [source updater](updates.md).

- **Requires Pi with native MCP support:** update Pi; legacy hosts without
  `registerMcpServer` cannot load this adapter. The existing stdio server remains
  usable with other MCP clients.
- **Package is not built:** run `npm ci` in its source directory, then restart
  Pi. If install scripts were disabled, run `npm run build` explicitly.
- **Node not found:** make Node available on the PATH used to launch Pi.
- **Missing Flutter or capture tooling:** use `doctor` and the
  [setup guide](setup.md); the extension does not change your SDK.

## Distribute

Git installation is supported directly; no Pi-specific upload service is
needed. For npm distribution, the manifest includes the `pi-package` keyword,
which makes a published package eligible for Pi's package catalog.

Maintainers should synchronize a new release version, run `npm run check`,
inspect `npm pack --dry-run`, and publish only with an authorized npm account
that owns the chosen package name. Once `flutter-fidelity` is published to npm:

```sh
pi install --local npm:flutter-fidelity
```

This command depends on an actual npm publication; a prepared archive or Git
push alone does not make it available on npm or in the catalog. Packaging and
tests never publish, install into global Pi settings, or modify the Flutter SDK.

References: [Pi packages](https://pi.dev/docs/latest/packages) and
[Pi extension MCP registration](https://pi.dev/docs/latest/extensions#mcp-servers).
