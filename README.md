# Flutter Fidelity

Turn a screenshot or Figma design into Flutter UI with your coding agent.
The agent writes the Dart and reuses your app's widgets. Flutter Fidelity
captures the result, compares it with the design, and reports what still differs.

Works with compatible agents such as Claude Code, Codex and Pi. You need
**Node.js 22+** and a **Flutter SDK** for Flutter tests and captures.

## Install

Run these commands from your Flutter app's directory:

```sh
npm install --save-dev github:rebink/flutter-fidelity
npx skills add ./node_modules/flutter-fidelity --skill flutter-fidelity
```

Choose your agent in the installer, then reload its skills. Allow npm's build
scripts to run. This installs from GitHub; pin a commit or tag for team projects.
If your app has no `package.json`, npm creates one for these development tools.

**Using Pi?** Install the skill and MCP connection together instead:

```sh
pi install --local git:github.com/rebink/flutter-fidelity
```

Restart Pi, approve project trust, and check `/mcp` for `flutter-fidelity`.
See [agent setup](docs/setup.md) or [Pi setup](docs/pi.md) if it doesn't appear.

## Ask your agent

Attach a screenshot or paste a Figma frame link:

```text
Use Flutter Fidelity to build this screen in my app.
Reuse our widgets and theme, then show the design beside the result.
```

The agent asks whether you want to review the widget plan first. It then builds,
tests and compares the screen. You can also ask for a smaller fix, such as
matching a heading's font or correcting spacing.

The final report separates **visual fidelity** from **working behavior**.
A matching screenshot doesn't prove that buttons work or accessibility passes.
Missing checks stay marked incomplete. [How results work](docs/workflow.md#comparable-results).

## Connect the MCP server

MCP lets your agent call Flutter Fidelity's tools. Pi's package sets this up for
you. For another local MCP client, add this to its MCP configuration and replace
the path with your installed package's absolute path:

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

Restart the client and check that the tools appear. Keep this connection running
when using the Figma bridge. Your client may use a different configuration format;
see [setup](docs/setup.md).

For PNG and Figma REST tasks, the skill can use the CLI instead of MCP.
Installing only the skill does not install the engine.

## Use a Figma design

You don't need every connection. The skill checks these in order and stops when
it gets a usable reference:

1. **Figma MCP:** local first, then an already connected remote Figma MCP.
2. **REST token:** `FIGMA_ACCESS_TOKEN` in the engine's environment, with
   `file_content:read` and access to the file. Never paste the token into chat.
3. **Desktop bridge plugin:** an open Figma file paired with Flutter Fidelity.
4. **Playwright:** browser access, with your permission for any visible login.

If Playwright gets a 403 or sign-in page, the agent can open a separate Chrome
session and ask you to log in. It waits for confirmation before continuing.
Your regular Chrome profile stays untouched. Login may not resolve the block.

Already have a PNG? Attach it and skip Figma setup entirely.
[More about design access](docs/design-intake.md).

## Set up the Figma bridge plugin

This is optional. It exports the selected frame's PNG and styling without a
Figma access token. You need **Figma desktop and Flutter Fidelity's MCP server
on the same computer**.

### 1. Get a plugin ID

In Figma desktop, create a development plugin. Open the generated `manifest.json`
and copy its numeric `id`. Figma assigns this ID; don't invent one.

### 2. Generate the plugin files

From your Flutter app's directory, run:

```sh
node node_modules/flutter-fidelity/scripts/prepare-figma-plugin.mjs \
  --id YOUR_FIGMA_PLUGIN_ID \
  --out ./fidelity-figma-plugin
```

Replace `YOUR_FIGMA_PLUGIN_ID` with the ID from step 1. The output folder must be
new. This prepares local files; it does **not** install or publish the plugin.

In Figma's development plugins, import the generated
`fidelity-figma-plugin/manifest.json`. Open your design and run
**Flutter Fidelity Bridge**.

### 3. Pair the bridge

Ask your coding agent:

```text
Start the Flutter Fidelity Figma bridge and give me the pairing code.
```

The agent calls `figma_bridge` with `{"action":"start"}`. Paste its code into
the Figma plugin and click **Connect**. Allow local network access if prompted.
The bridge listens only on `127.0.0.1:43871`.

Select your frame, then ask:

```text
Use the connected Figma plugin to build this selected frame in my Flutter app.
```

The agent checks the paired document with `figma_bridge` status, then exports
through `acquire_figma_plugin`. Keep Figma and the plugin open during the task.
A bridge restart needs a new pairing code, not a new plugin installation.

If pairing fails, the agent can move on to Playwright or use a PNG you provide.
[Full bridge setup and troubleshooting](docs/figma-plugin.md).

## Update

For a project installation, rerun both install commands so the tools and skill
stay on the same version. Then restart your agent or MCP process.

For a clean source checkout:

```sh
npm run update:check
npm run update
```

See [update instructions](docs/updates.md) and [release notes](CHANGELOG.md).

## Examples and development

- [Codex Gallery](demos/codex-gallery/README.md): three Flutter screens with Android captures.
- [Fieldnotes feed](demos/fieldnotes-feed/README.md): tests, captures and recorded repair rounds.
- [Flutter example](flutter/example): development capture harness.

These are measured examples, not pixel-perfect claims. Their reports retain
failed checks and untested platforms.

To work on the tools:

```sh
git clone https://github.com/rebink/flutter-fidelity.git
cd flutter-fidelity
npm ci
npm run check
```

After editing `docs/`, run `npm run skill:sync` to refresh the bundled skill docs.
For image or policy changes, follow the [benchmark guide](docs/benchmark.md).
See the [workflow](docs/workflow.md), [widget catalog](docs/widget-catalog.md) and
[verification record](docs/verification.md) for technical details.

## License

Project code is [MIT](LICENSE). Open Wellness and Codex Gallery design sources
are CC0 ([Wellness](demos/open-wellness/design/LICENSE),
[Gallery](demos/codex-gallery/design/LICENSE)). Fonts and dependencies retain
their own licenses.
