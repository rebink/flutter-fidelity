# Flutter Fidelity

Build Flutter screens from screenshots or Figma designs with your coding agent.
Your agent writes the Dart and reuses your app's widgets. Flutter Fidelity
captures the result and compares it with the design, so you can see what still
needs work.

You can use it with compatible agents such as Claude Code, Codex and Pi. You need
Node.js 22+ to run the tools and a Flutter SDK to test or capture Flutter screens.

## Install

Run the commands from your Flutter app's directory. Choose one installation
method.

### Claude Code, Codex and other agents

```sh
npm install --save-dev github:rebink/flutter-fidelity
npx skills add ./node_modules/flutter-fidelity --skill flutter-fidelity
```

Choose your agent in the skill installer, then reload its skills. Allow npm's
build scripts to run. If your app has no `package.json`, npm creates one for
these development tools.

The package installs from GitHub, not the npm registry. For a team project, pin
a Git tag or commit so everyone uses the same version.

### Pi

This installs the skill and connects the MCP server together:

```sh
pi install --local git:github.com/rebink/flutter-fidelity
```

Restart Pi, approve project trust, then open `/mcp` and check for
`flutter-fidelity`. If it doesn't appear, see the [Pi setup guide](docs/pi.md).
For other agents, see [agent setup](docs/setup.md).

## Ask your agent

Attach a screenshot or paste a Figma frame link, then ask:

```text
Use Flutter Fidelity to build this screen in my app.
Reuse our widgets and theme, then show the design beside the result.
```

The agent asks whether you want to review its widget plan before it starts.
It then builds the screen, runs checks and compares a capture with the design.
You can also ask for a small change, such as fixing a heading's font or the
spacing between cards.

The report shows visual differences separately from behavior checks. A screen
can look right while its buttons don't work or its accessibility checks fail.
Checks that haven't run stay marked incomplete.
[How to read the results](docs/workflow.md#comparable-results).

## Connect the MCP server

MCP lets your agent call the tools directly. The Pi installation handles this
for you. For another local MCP client, add this to its configuration. Replace
the example path with the absolute path to your installed package:

```json
{
  "mcpServers": {
    "flutter-fidelity": {
      "command": "node",
      "args": [
        "/absolute/path/to/your-app/node_modules/flutter-fidelity/dist/cli.js",
        "mcp"
      ]
    }
  }
}
```

Restart the client and check that the tools appear. Your client may use a
different configuration format; the [setup guide](docs/setup.md) covers those
differences. Keep the MCP connection running while you use the Figma bridge.

For PNG and Figma REST tasks, the skill can use the command line instead.
Installing the skill alone does not install the tools it needs.

## Use a Figma design

If you already have a PNG, attach it and skip Figma setup.

For a Figma link, the agent tries these routes in order. It stops as soon as it
gets a usable design reference, so you don't need to set up all four:

1. A local Figma MCP, then an already connected remote Figma MCP.
2. A REST token in the engine's `FIGMA_ACCESS_TOKEN` environment variable. The
   token needs `file_content:read` permission and access to the file. Never paste
   it into chat.
3. The desktop bridge plugin, paired with Flutter Fidelity in an open Figma file.
4. Playwright browser access, with your permission before any visible login.

If Playwright reaches a sign-in page or gets a 403 error, the agent can open a
separate Chrome session for you to log in. It waits for your confirmation before
continuing and leaves your regular Chrome profile alone. Logging in may not fix
the block. See [design access](docs/design-intake.md) for details.

## Set up the Figma bridge plugin

The bridge is optional. It exports the selected frame as a PNG, along with its
styling, without a Figma access token. Figma desktop and Flutter Fidelity's MCP
server must run on the same computer.

If you're upgrading to 0.12.0, update the engine, reload its MCP connection and
rerun setup to prepare and import the matching plugin. This release uses bridge
protocol 2. Old protocol-1 plugins cannot connect, and updating the engine does
not replace the plugin you've already imported into Figma.

### Run the guided setup

Run the command in your terminal, from your Flutter app's directory.

For an npm installation:

```sh
npx --no-install flutter-fidelity setup
```

For a project-local Pi Git installation:

```sh
node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js setup
```

`npx` cannot find Pi-installed packages. An npm 404 here is an installation or
command-path problem, not a Figma error.
[Fix an npm 404 or an older Pi installation](docs/setup.md#npm-404-or-missing-setup-command).

Follow the setup prompts:

1. If asked for a manifest, select a `manifest.json` generated by Figma. If you
   don't have one, open **Plugins > Development > New plugin > Figma Design >
   Custom UI** in Figma. Save the generated files and select that manifest in
   setup. You don't need to copy a plugin ID. On macOS, setup opens a file picker;
   if it can't finish, you can paste the path without restarting.
2. Choose your coding agent and approve the MCP changes, or keep your existing
   connection. Claude Code and Pi use project settings. Codex asks separately
   before changing its user-level MCP entry. Setup keeps unrelated settings.
3. In Figma, choose **Plugins > Development > Import plugin from manifest**.
   Import the new prepared manifest printed by setup, not the original scaffold.
   Run **Flutter Fidelity Bridge** in your design file.

Setup checks Node and launches the MCP engine briefly to check its version and
Figma tools, then closes that test process. It does not start the bridge.
On macOS, it also checks for Figma desktop and opens it. Figma's plugin
registration and permission prompts still need your approval; setup doesn't
install global plugins, publish anything or bypass browser security.

Keep the prepared `.fidelity/figma-plugin` folder while Figma uses it. Later setup
runs remember the plugin ID, reuse unchanged files and leave edited copies alone.

For a built source checkout, run
`node /absolute/path/to/flutter-fidelity/dist/cli.js setup` from your app folder.
Manual or unattended preparation is also available with
`setup-figma-plugin --manifest ... --out ...`.
[Setup options and troubleshooting](docs/figma-plugin.md).

### Pair the bridge

Preparing the plugin doesn't connect it. Reload or restart your agent first.
In Pi, run `/reload`, then `/mcp`, and confirm that `flutter-fidelity` connects
without errors. Then ask:

```text
Start the Flutter Fidelity Figma bridge and give me a fresh pairing code.
```

The agent starts the bridge with `figma_bridge` action `start`. Wait for its
successful response rather than starting a second server.

In the Figma plugin, click **Check bridge**, paste the fresh code, then click
**Connect** once your document name appears. Allow local-network access if Figma
asks. The plugin waits for Figma to load and shows recovery instructions if it
can't read the file.

The **Check bridge** button checks compatibility without sending your code or
pairing. If it gets no reply, the bridge may be stopped or local-network access
may be blocked. The connection uses `http://localhost:43871` and listens only on
loopback addresses (`127.0.0.1` and `::1`), not your network interface. You don't
need a proxy or a Figma access token.

If another project owns port `43871`, ask that project's agent to stop its bridge.
Don't kill an unknown process or take over another project's connection.

Select a frame and ask:

```text
Use the connected Figma plugin to build this selected frame in my Flutter app.
```

The agent checks the paired document with `figma_bridge` status and exports a
fresh reference into a new folder through `acquire_figma_plugin`. Keep Figma and
the plugin open while it works. If the bridge restarts, get a new pairing code;
you don't need to reinstall the plugin.

A local test on macOS with Pi covered a clean reinstall, Figma import, first-click
pairing and a fresh 402 x 2521 PNG on the first export request. The checks included
the PNG's dimensions and hash, frame context, root CSS and saved settings backups.
That test doesn't confirm Windows support or setup with a new Figma account.

If pairing still fails, the agent can try Playwright or use a PNG you provide.
See the [bridge guide](docs/figma-plugin.md) for help.

## Update

For an npm installation, rerun both [install commands](#install) to update the
tools and their matching skill. For Pi, run
`pi update git:github.com/rebink/flutter-fidelity`. Keep any tag or commit pin your
team uses, and restart your agent or MCP process after updating.

For a clean source checkout:

```sh
npm run update:check
npm run update
```

See the [update guide](docs/updates.md) and [release notes](CHANGELOG.md).

## Uninstall

Removing the package leaves its Figma development plugin and any MCP entries
created by setup behind. For a full removal:

1. Finish or cancel active work. Ask the agent that owns this project's bridge
   to stop it and confirm it is no longer running.
2. Click **Disconnect** if available, close the plugin and remove its development
   plugin registration in Figma. Check the manifest path first so you don't remove
   another project's copy.
3. From your app directory, remove the package using the method you installed it
   with. For a project-local Pi Git installation:

   ```sh
   pi remove --local git:github.com/rebink/flutter-fidelity
   ```

   For npm, remove the separate skill with `npx skills remove flutter-fidelity`,
   then run `npm uninstall --save-dev flutter-fidelity`.
4. Remove only Flutter Fidelity's MCP entries, keeping other servers and settings.
   Pi setup can leave entries in both `.pi/mcp.json` and `.pi/mcp-adapter.json`.
   The [uninstall guide](docs/uninstall.md) covers other agents and install scopes.
5. Check whether other projects use the prepared plugin files and review any
   private settings backups before removing `.fidelity/figma-plugin`. Don't delete
   the whole `.fidelity` folder: keep your references, captures and reports.
   Restart your agent and check that this installation is no longer loaded.

You must remove the Figma registration yourself. Package commands don't remove
plugins from your Figma account or delete saved screenshots and reports.

## Examples and development

- [Codex Gallery](demos/codex-gallery/README.md): three Flutter screens with Android captures.
- [Fieldnotes feed](demos/fieldnotes-feed/README.md): tests, captures and recorded repair rounds.
- [Flutter example](flutter/example): the capture test harness used during development.

These examples include measurements, failed checks and untested platforms in
their reports. They aren't claims of a pixel-perfect match.

To work on Flutter Fidelity itself:

```sh
git clone https://github.com/rebink/flutter-fidelity.git
cd flutter-fidelity
npm ci
npm run check
```

After editing `docs/`, run `npm run skill:sync` to update the copies bundled with
the skill. For image or policy changes, follow the [benchmark guide](docs/benchmark.md).
The [workflow](docs/workflow.md), [widget catalog](docs/widget-catalog.md) and
[verification record](docs/verification.md) explain how the tools work.

## License

Project code uses the [MIT license](LICENSE). Open Wellness and Codex Gallery
design sources are CC0 ([Wellness](demos/open-wellness/design/LICENSE),
[Gallery](demos/codex-gallery/design/LICENSE)). Fonts and dependencies keep their
own licenses.
