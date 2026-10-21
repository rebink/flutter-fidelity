<!-- Generated from docs/pi.md by npm run skill:sync. -->

# Flutter Fidelity for Pi

Pi uses the same Node-installed engine and `flutter-fidelity` skill as other
agents. The Pi model inspects designs and edits Dart; the tools perform local,
deterministic validation, captures and comparisons.

## Install

Use Pi with native MCP support (tested with `@earendil-works/pi-coding-agent`
1.2.0). Follow Pi's own Node requirement; Flutter Fidelity requires Node 22+
available as `node` on PATH. Flutter is needed for captures, but not for image
inspection or comparison.

Open a normal terminal, not Pi's chat. From your Flutter app's directory:

```sh
npm install --save-dev github:rebink/flutter-fidelity
npx skills add ./node_modules/flutter-fidelity --skill flutter-fidelity
```

Choose Pi in the skill installer, then reload or restart Pi and approve project
trust as required. The skill can use the Node CLI for PNG and REST workflows.
For MCP tools, configure the project connection using the [setup guide](setup.md#optional-mcp-connections),
or choose Pi in the optional bridge wizard below. Check `/mcp` before using it;
a saved configuration is not proof of a working connection. Pi controls tool
exposure and may prefix tool names or require discovery.

The [Pi package installer](#advanced-pi-package-installation) is an advanced
alternative, not a requirement. Keep an existing working Pi-managed installation
instead of installing a second engine.

## Set up the optional Figma bridge

From the app folder where you installed the npm package, run the Node wizard in
a normal terminal, not Pi's chat. Open a new terminal tab if Pi is running there:

```sh
node node_modules/flutter-fidelity/dist/cli.js setup
```

Keep this terminal open while you create the plugin in Figma. Return to its
waiting manifest prompt to press Enter for the macOS picker or paste the file's
full path. Do not paste the manifest contents, send the path to Pi, or run it at
a blank shell prompt. Existing Pi-managed installs use the
[advanced launcher](#advanced-pi-package-installation) instead.

Complete the setup in this order:

1. If asked for a manifest, use an existing Figma-generated `manifest.json` for
   this bridge, or create one: open a Design file in Figma desktop and choose
   **Plugins > Development > New plugin**. In **Create plugin**, enter a name, select
   **Figma design**, then click **Next**. Select **Custom UI**, click **Save as**,
   and save the folder. Return to the terminal and press Enter to open the macOS
   picker, or paste the path. Select that original manifest, not a repository
   template. Later runs with a saved ID skip this question. Do not invent an ID.
2. The wizard prints a prepared manifest path, then asks for your agent. Choose
   **3 (Pi)** and confirm the project MCP changes, or **4** to keep an already
   working connection.
3. In Figma, use **Plugins > Development > Import plugin from manifest** and
   choose the **prepared manifest printed by the wizard**, not the original
   scaffold. If Figma reports an already-registered ID, remove only this plugin's
   original scaffold or older bridge development entry, keep its files, then
   retry. Do not remove another project's bridge. Run the prepared plugin with
   **Plugins > Development > Flutter Fidelity Bridge**. Skip reimporting if the exact copy
   is already registered. See the [full creation steps](figma-plugin.md#initial-setup)
   for the dialogs and menu-label variations.
4. In Pi, run `/reload`, then `/mcp`. Confirm that `flutter-fidelity` connects
   without a launch error.
5. Ask: **"Start the Flutter Fidelity Figma bridge and give me a fresh pairing
   code."** Wait for the agent's successful start; do not run another server.
6. In the plugin, click **Check bridge**, paste the fresh code, and click
   **Connect** once the document name appears. Allow local-network access if
   Figma asks.
7. Select one frame and ask Pi to export its PNG through the connected plugin
   into a new folder. Keep Figma and the plugin open while using it.

If another project owns port `43871`, stop that bridge through its owning agent
first, not by killing an unknown process.
[Full registration and troubleshooting](figma-plugin.md#initial-setup).

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

## Advanced: Pi package installation

This is an alternative to the standard npm/Node installation, not an additional
step. Use one route to avoid duplicate engines and skills. An existing working
Pi-managed installation does not need to migrate. This adapter requires Pi's
`registerMcpServer` API.

From your Flutter project:

```sh
pi install --local git:github.com/rebink/flutter-fidelity
```

Restart Pi and approve project trust. Use `pi list` to check the package and
`/mcp` to check the `flutter-fidelity` connection. The adapter registers the MCP
server and exposes the same skill; Pi controls tool discovery and exposure.

For a local clone, first run `npm ci` in the clone to build `dist`, then run this
from your Flutter project:

```sh
pi install --local /absolute/path/to/flutter-fidelity
```

Pi does not install dependencies for a local path. Git installs do install
dependencies and run the build hook with
`npm install --omit=dev --legacy-peer-deps`. Allow lifecycle scripts. The compiler
and Node type definitions are regular dependencies, so the source build works
without dev dependencies. An npm archive contains built output and needs only
runtime dependencies. Keep the complete package and its dependencies; copying
the extension file alone breaks its relative `../dist/cli.js` lookup.

For a project-local Pi Git installation, launch setup from a normal terminal in
your Flutter app, outside Pi's chat:

```sh
node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js setup
```

The setup command requires Flutter Fidelity 0.12.0 or newer. Pi does not add its
packages to the app's `node_modules`, so the standard Node path and `npx` launcher
do not apply to this route. Continue with the [same Figma steps](#set-up-the-optional-figma-bridge)
after starting the wizard. [Launcher troubleshooting](setup.md#npm-404-or-missing-setup-command).

## Update and troubleshoot

For the standard npm/Node installation, follow the [update guide](updates.md)
and refresh the installed skill when its version changes. Only for the advanced
Pi-managed route, run `pi update git:github.com/rebink/flutter-fidelity`, then
restart Pi. A Git tag or commit stays pinned. Local clones use the source updater
in the same guide.

- **Requires Pi with native MCP support:** update Pi; legacy hosts without
  `registerMcpServer` cannot load this adapter. The existing stdio server remains
  usable with other MCP clients.
- **Package is not built:** run `npm ci` in its source directory, then restart
  Pi. If install scripts were disabled, run `npm run build` explicitly.
- **`tsc: command not found` while installing 0.10.0:** this is a package bug
  fixed in 0.10.1. Retry the Git installation to fetch the fix. If Pi reuses the
  failed clone, run `git pull --ff-only` and
  `npm install --omit=dev --legacy-peer-deps` inside that package directory,
  then rerun `pi install --local git:github.com/rebink/flutter-fidelity` from
  your Flutter project. A global TypeScript installation is unnecessary.
- **Node not found:** make Node available on the PATH used to launch Pi.
- **`ignored settings exposure: direct`:** version 0.10.2 removes the optional
  exposure override that some MCP integrations ignore on registered servers.
  Update the package and run `/reload` or restart Pi. The warning alone does not
  establish a failed connection; check the server's connection state in `/mcp`.
- **Missing Flutter or capture tooling:** use `doctor` and the
  [setup guide](setup.md); the extension does not change your SDK.

## Uninstall

Follow the [full uninstall guide](uninstall.md), including stopping the bridge
and removing its Figma development-plugin registration **before** deleting its
prepared files. For the standard npm/Node install, use that guide's npm and skill
removal steps. Only if you used the advanced Pi package installer, remove its
package from the Flutter project with:

```sh
pi remove --local git:github.com/rebink/flutter-fidelity
```

Use the source and scope shown by `pi list` for tagged, local-path or personal
installs. Pi removes its package declaration, but the wizard's separate
`flutter-fidelity` (or existing `flutter_fidelity`) entries can remain under
`mcpServers` in **both** `.pi/mcp.json` and `.pi/mcp-adapter.json`. Remove only
those entries, keeping other settings intact. Do not delete `.pi` wholesale.
Restart Pi, check `pi list` and `/mcp`, and confirm the removed installation no
longer exposes its tools or skill. Removing the package does not automatically
unregister a development plugin in Figma or delete captured evidence.

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
