# Flutter Fidelity

Build Flutter screens from screenshots or Figma designs with your coding agent.
Your agent writes the Dart and reuses your app's widgets. Flutter Fidelity
captures the result and compares it with the design, so you can see what still
needs work.

You can use it with compatible agents such as Claude Code, Codex and Pi. You need
Node.js 22+ to run the tools and a Flutter SDK to test or capture Flutter screens.

## Install

Use the same npm/Node installation for Claude Code, Codex, Pi and other
compatible agents. Open a normal terminal, not your agent's chat, and run these
commands from your Flutter app's directory:

```sh
npm install --save-dev github:rebink/flutter-fidelity
npx skills add ./node_modules/flutter-fidelity --skill flutter-fidelity
```

Choose your agent in the skill installer, then reload its skills. Allow npm's
build scripts to run. If your app has no `package.json`, npm creates one for
these development tools.

The package installs from GitHub, not the npm registry. For a team project, pin
a Git tag or commit so everyone uses the same version.

Already using a Pi-managed installation? Keep it and use the
[advanced Pi guide](docs/pi.md#advanced-pi-package-installation); no reinstall
is needed. For connection settings, see [agent setup](docs/setup.md).

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

MCP lets your agent call the Node engine's tools directly. If your agent already
connects, skip this section. Otherwise, add this to a compatible local MCP
client's configuration. Replace the example path with the absolute path to your
installed package. The optional bridge wizard can also save these settings with
your approval:

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

Open a normal terminal, such as macOS Terminal or VS Code's integrated terminal.
If Pi is running in that terminal, open a new terminal tab for setup. From the
same Flutter app folder where you installed the package, run:

```sh
node node_modules/flutter-fidelity/dist/cli.js setup
```

Keep this terminal open while you create the plugin in Figma. The Node wizard
waits for your answer; it does not run inside Pi or another agent's chat.

On the first run, setup pauses at `[2/3] Prepare the Figma bridge plugin` while
you create a plugin in Figma. These are separate dialog screens, not one menu path:

1. In Figma desktop, open a Design file. Choose **Plugins > Development >
   New plugin**. On macOS, **Plugins** is in the app's menu bar.
2. In **Create plugin**, enter a name such as `Flutter Fidelity setup`, select
   **Figma design**, then click **Next**.
3. Select **Custom UI**, click **Save as**, and choose where to save the generated
   plugin folder. This creates the original `manifest.json` that setup needs.
4. Return to the **same terminal still running the Node setup wizard**, at its
   **After saving, return here** prompt. On macOS, press Enter to open the file
   picker and select the original `manifest.json` from step 3, or paste its full
   path at that prompt. Other systems ask for the path. Do not paste the file's
   contents, type the path as a new shell command, or send it to Pi's chat. If the
   picker cannot finish, setup offers path entry without restarting.
5. Setup prints a different, prepared manifest under `.fidelity/figma-plugin`.
   Keep that path for the import. At `[3/3] Connect your coding agent`, choose
   your agent and approve any MCP changes, or choose **4** to keep an existing
   connection. For Pi, choose **3** if you need setup to configure it.
6. Back in Figma, choose **Plugins > Development > Import plugin from manifest**
   and select the prepared manifest from step 5, not the original from step 3.
   If Figma says the ID is already registered, remove only this plugin's original
   scaffold or older bridge development entry, keep its files, then retry. Don't
   remove another project's bridge. Some Figma versions call this action
   **Import new plugin from manifest**.
7. In your Design file, choose **Plugins > Development > Flutter Fidelity Bridge**
   to run the imported plugin. Continue with [pairing](#pair-the-bridge).

If you already have a Figma-generated manifest for this bridge, use it in step 4
instead of creating another plugin. If you closed setup after saving the plugin,
run it again from your app folder with the original manifest's path:

```sh
node node_modules/flutter-fidelity/dist/cli.js setup \
  --manifest "/absolute/path/to/your-plugin/manifest.json"
```

On later runs, setup remembers the ID and skips the manifest question. If it
reuses the exact copy already imported into Figma, you don't need to import it
again.

Claude Code and Pi use project MCP settings. Codex asks separately before changing
its user-level MCP entry. Setup keeps unrelated settings.

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
