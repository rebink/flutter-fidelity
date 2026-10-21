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

**Upgrading to 0.12.0?** The bridge uses protocol 2. Update the engine, reload
its MCP connection, and rerun setup to prepare and import the matching plugin.
Old protocol-1 plugin copies cannot connect; updating the engine alone does not
replace an already imported local plugin copy.

### Run the guided setup

After installing Flutter Fidelity, run one command **in your terminal**, from
your Flutter app's directory:

```sh
npx --no-install flutter-fidelity setup
```

The wizard checks Node, actually launches the built MCP engine to verify its
version and Figma tools, then closes that test process without starting a bridge.
It checks Figma Desktop on macOS, opens Figma, and guides its one-time
development-plugin registration. On macOS,
a file picker selects the generated manifest: no ID copying or path arguments.
If the picker cannot finish, paste the manifest path to continue in the same run.
It prepares a safe local bridge copy and opens its location for import.

Choose your coding agent to configure MCP **with confirmation**, or keep your
existing connection. Claude Code and Pi use project-local JSON; Codex uses its
own CLI and asks separately before updating its **user-level** MCP entry.
Existing unrelated settings are kept. Restart/reload the agent after changes.

**Plugin prepared does not mean connected.** Setup reports whether a compatible
bridge responds, but the agent must still start it. In Pi, run `/reload`, check
`/mcp` for launch errors, then ask for a fresh bridge pairing code. The plugin's
**Check bridge** button verifies compatibility without sending your code or
pairing. A missing reply can mean a stopped bridge or blocked local-network
access; setup never disables browser security to work around it.

Figma still requires you to create/import the development plugin and allow any
local-network prompt. Setup does not click through those permissions, start a
second bridge, install global plugins, or publish anything. On later runs it
remembers the assigned ID, reuses unchanged files, and preserves edited copies.
Keep the prepared `.fidelity/figma-plugin` folder while Figma uses it.

From a built source checkout, use `node dist/cli.js setup`. For manual or
unattended preparation, the existing `setup-figma-plugin --manifest ... --out ...`
command remains available. [Options and troubleshooting](docs/figma-plugin.md).

### Pair the bridge

Ask your coding agent:

```text
Start the Flutter Fidelity Figma bridge and give me the pairing code.
```

The agent calls `figma_bridge` with `{"action":"start"}`. Paste its code into
the Figma plugin and click **Connect** once your file name appears. The plugin
waits for Figma automatically and gives recovery instructions if it cannot read
the file. Allow local network access if prompted. No proxy or Figma access token is needed.
The UI uses `http://localhost:43871`; the bridge listens only on IPv4/IPv6
loopback (`127.0.0.1` and `::1`), never your network interface.

Select your frame, then ask:

```text
Use the connected Figma plugin to build this selected frame in my Flutter app.
```

The agent checks the paired document with `figma_bridge` status, then exports
through `acquire_figma_plugin`. Keep Figma and the plugin open during the task.
A bridge restart needs a new pairing code, not a new plugin installation.

**Live-checked on macOS with Pi:** a clean wizard reinstall and native Figma
import passed, followed by first-click pairing and a first-request fresh
402 x 2521 PNG export. PNG dimensions/hash, frame context, root CSS and preserved
backups were independently checked. This is a local integration result, not a
Windows or fresh-account qualification.

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
