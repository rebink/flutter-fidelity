<!-- Generated from docs/setup.md by npm run skill:sync. -->

# Set up Flutter Fidelity

Flutter Fidelity has one skill, `flutter-fidelity`, and a shared CLI/MCP engine.
Use an agent that can inspect images, edit files, and run terminal commands or
connect to a local MCP server. Node.js 22+ is required. Use your existing Flutter
SDK for analysis, tests, and captures; image tools work without it.

## Install in a Flutter project

From your app's directory:

```sh
npm install --save-dev github:rebink/flutter-fidelity
npx skills add ./node_modules/flutter-fidelity --skill flutter-fidelity
```

Select your agents in the installer, or specify them:

```sh
npx skills add ./node_modules/flutter-fidelity --skill flutter-fidelity --agent claude-code --agent codex
```

The tools and skill come from the same package version. The npm Git dependency
uses the source branch; use an existing Git tag or commit for a pinned install.
Allow npm lifecycle scripts. The compiler and Node type definitions are regular
package dependencies, so a source installation also works with `--omit=dev`.
No npm registry release is required. The package is a development tool; it does not
change the Flutter SDK or add a production Dart dependency. If needed, npm
creates a package.json alongside the Flutter project's pubspec.yaml.

Reload the host's skills, then use `/flutter-fidelity` in Claude Code,
`$flutter-fidelity` in Codex CLI/IDE, or `/skill:flutter-fidelity` in Pi. The host
may also select the skill from a matching natural-language request.

The skill's `scripts/fidelity.mjs` launcher searches for the project's installed
engine from the working directory upward, so nested app folders work. It runs
the CLI without a shell, inherits the app's working directory, and rejects a
skill/engine version mismatch. It performs no downloads or automatic updates.
The launcher's `--package-root` option locates the bundled capture harness and
examples. [Tool mappings](https://github.com/rebink/flutter-fidelity/blob/main/skills/flutter-fidelity/references/tools.md) explain
CLI equivalents for the MCP operations.

Check the engine from the project root:

```sh
node node_modules/flutter-fidelity/dist/cli.js --version
node node_modules/flutter-fidelity/dist/cli.js doctor
```

`doctor` reports image tools, Flutter, and official Dart MCP independently.
Exit 2 can mean Flutter is unavailable while image tools remain usable.

## Use an existing checkout or connected engine

Build a checkout with `npm ci`. If lifecycle scripts were disabled, run
`npm run build`. Install the complete skill folder from that checkout:

```sh
npx skills add /absolute/path/to/flutter-fidelity --skill flutter-fidelity
```

When using the CLI launcher outside that checkout, set `FLUTTER_FIDELITY_ROOT`
to the built checkout's absolute path in the environment that launches your
agent. This is the engine location, not the Flutter SDK location. When the skill
runs inside its complete package, the launcher can locate the bundled engine
without that variable.

You can also install just the skill from GitHub if your matching engine or MCP
server is already configured:

```sh
npx skills add rebink/flutter-fidelity --skill flutter-fidelity
```

The standard installer copies the skill's launcher, guides, and supporting
reference files. It does not install the engine or configure MCP. A manual
installation must copy the complete skill folder, not just SKILL.md. Claude
Code discovers project skills under `.claude/skills`; Codex discovers them under
`.agents/skills`. Other agents use their documented discovery paths.

## Guided Figma bridge setup

From your Flutter project, use the launcher for your installation method.
For an engine installed with npm from GitHub:

```sh
npx --no-install flutter-fidelity setup
```

For a project-local Pi Git installation:

```sh
node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js setup
```

Pi does not add its packages to the app's `node_modules` or npm command search.
For a built source checkout elsewhere, use its absolute CLI path while staying
in your Flutter project: `node /absolute/path/to/flutter-fidelity/dist/cli.js setup`.
Before saving files or
MCP settings, the wizard initializes the actual local MCP engine and verifies its
version and Figma tools, with a bounded deadline and cancellation. This temporary
stdio test process is always closed; it never starts a bridge. Startup failures
stop setup with repair instructions, without echoing private diagnostics.
The wizard also checks Node, checks Figma Desktop on macOS, guides one-time
Figma registration, and prepares the plugin without copying IDs or files.
macOS uses a native manifest picker; other systems ask for the saved path.
If the macOS picker times out or cannot launch, the wizard offers path entry
without restarting or saving settings first. Cancelling the picker or pressing
Ctrl+C still stops setup without proceeding. You can also paste the path at the
initial prompt. `--no-open` disables app, picker and file-manager launches.

MCP configuration is optional and always asks for confirmation:

- **Claude Code:** merge only the `flutter-fidelity` entry into `.mcp.json`.
- **Pi:** one confirmation covers `.pi/mcp.json` (native MCP, 1,200-second
  timeout) and `.pi/mcp-adapter.json` (adapter compatibility, same timeout).
  Both point to the engine just checked. The adapter override also uses
  `lazy-keep-alive` so an idle timeout does not stop a paired bridge. It works
  when the adapter cannot load native Pi MCP settings and takes precedence over
  shared plugin-template launchers. Other servers and shared `.mcp.json` plugin
  templates stay intact. Existing Pi aliases must agree across both files.
  Project trust/approval and agent reload are still required. Keep existing MCP
  instead if the installed Pi package already works.
- **Codex:** invoke `codex mcp add` after separate consent to update its
  **user-level** entry. The wizard does not parse or rewrite TOML. Codex's
  longer capture timeout remains a separate host setting, as documented below.
  Windows launches the official npm entry point with Node, or a native `.exe`,
  without a command shell; nonstandard shims need manual MCP configuration.
- **Keep existing / later:** prepare the plugin without changing MCP settings.

JSON merges retain other servers/settings. Changed existing JSON is backed up
in a private, git-ignored `settings-backup-*` folder under `.fidelity/figma-plugin`;
it can contain credentials, so keep it private. Invalid JSON,
symlinked destinations are refused. An exclusive setup lock serializes writers;
existing files move into recoverable backups before conflict-safe publication,
so a competing replacement is never silently overwritten. This requires local
hard-link support; unsupported filesystems fail without replacing old settings.
After a force-kill, inspect backups before removing a stale lock: each private
folder's `target.json` names the original destination of its `mcp.json`. Restore
any missing original settings first, and remove the reported
`.flutter-fidelity.lock` only when no setup is running. Ctrl+C cancels setup's
subprocesses, including the native picker, before returning.
Pi's two files are saved independently, not as a cross-file transaction. If a
later write fails or is cancelled, setup names the completed and unfinished
paths and keeps newer edits/backups without automatic rollback. Review the
reported files and rerun setup: already matching entries are not rewritten.
The saved command uses the current Node executable and absolute engine path.
Keep that installation in place; rerun setup after moving it or updating Node.
An engine launched from a temporary `npx` cache cannot be persisted as MCP:
install the project engine first, or keep an existing connection.

Prepared copies live under `.fidelity/figma-plugin`. Repeating setup reuses
identical files; changed copies remain intact and get a fresh sibling. Figma's
create/import/run and local-network confirmations remain manual. Restart your
agent after config changes; writing an entry is not proof of a live connection.

Setup separately probes the loopback bridge without pairing credentials. It
reports a compatible listener, an incompatible HTTP/protocol reply, or no complete
response. None of these proves that the selected host loaded its new MCP entry,
that Figma has network permission, or that pairing succeeded. In Pi, `/reload`
then `/mcp` must show a working `flutter-fidelity` connection before asking it to
start the bridge. Only then use the plugin's **Check bridge** action and the fresh
pairing code. Do not start a second standalone bridge to hide an MCP launch error.
See [Figma plugin setup](figma-plugin.md) for the remaining steps.

### npm 404 or missing setup command

A GitHub release does not publish a package to the npm registry. If `npx`
reports `E404`, it did not find an npm-installed engine in the current project.
`--no-install` does not make a Pi-installed package visible to npm. Do not fix
this by changing registry settings or installing a global plugin.

For a project-local Pi Git installation, update only Flutter Fidelity if its
version is older than 0.12.0, then launch its own engine from the app directory:

```sh
pi update git:github.com/rebink/flutter-fidelity
node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js --version
node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js setup
```

Use `pi update <source>` for the package, not bare `pi update`, which updates Pi
itself. A tag/commit-pinned install stays pinned; select a release with guided
setup through Pi's normal package management. Reload Pi after updating.

For an npm-based installation, first run the GitHub engine install in
[Install in a Flutter project](#install-in-a-flutter-project), then use `npx`.
Installing only a skill or configuring MCP does not install an npm command.
GitHub installs require access to the repository.

## Optional MCP connections

MCP provides structured tools and image results. The CLI covers PNG and Figma
REST workflows without it. The optional paired Figma plugin needs a persistent
MCP server because its pairing session lives in that process.

Configure the following command in any compatible local stdio client:

```json
{
  "mcpServers": {
    "flutter-fidelity": {
      "command": "node",
      "args": ["/absolute/path/to/flutter-fidelity/dist/cli.js", "mcp"]
    }
  }
}
```

Use the actual engine path, either in a checkout or the app's
`node_modules/flutter-fidelity`. Keep the working directory as the Flutter
project when the host permits it. Use absolute project, bundle, and output
paths when the host starts in another directory.

For Claude Code, this adds a project-scoped connection from the app root:

```sh
claude mcp add --transport stdio --scope project flutter-fidelity -- node "$PWD/node_modules/flutter-fidelity/dist/cli.js" mcp
```

For Codex, merge this table into the project's `.codex/config.toml`, retaining
any existing settings and using the real absolute engine path:

```toml
[mcp_servers.flutter-fidelity]
command = "node"
args = ["/absolute/path/to/flutter-fidelity/dist/cli.js", "mcp"]
tool_timeout_sec = 1200
```

The long timeout accommodates Flutter analysis and capture tests. Project
configuration may require the host's trust step. In other clients, configure a
suitable tool timeout rather than assuming that native captures finish quickly.

Optional official Dart MCP uses `dart mcp-server` with a supporting SDK. It is
separate from Flutter Fidelity; no SDK upgrade is required for the image tools
or custom capture engine. See [Flutter's AI tooling guide](https://docs.flutter.dev/ai/get-started).

## Native plugin packages

Pi can load the whole package with
`pi install --local git:github.com/rebink/flutter-fidelity`. The adapter registers
the MCP server and exposes the same skill. See [Pi setup](pi.md).

For a built local checkout, Claude Code can load the included plugin files:

```sh
claude --plugin-dir /absolute/path/to/flutter-fidelity
```

That plugin exposes `/flutter-fidelity:flutter-fidelity` and reads `.mcp.json`.
The standalone skill uses `/flutter-fidelity`. Choose one installation route
to avoid duplicate skill entries. The package also retains root `plugin.json`,
`mcp.json`, and `.codex-plugin/plugin.json` for compatible local plugin clients.
Build dependencies and `dist` must be present before a host loads a local plugin.

Plugin variable conventions differ: Claude's configuration uses
`${CLAUDE_PLUGIN_ROOT}`, while the portable manifest uses `${PLUGIN_ROOT}`.
Both locate the installed engine and leave the working directory to the host.
Package and stdio tests verify the configured commands; live plugin discovery
in every host/version remains unverified. This setup does not publish or upload
a plugin to an account or directory.

## Uninstall the tool and bridge

Use the [uninstall guide](uninstall.md) for package removal, Figma development-plugin
removal, MCP cleanup and verification. Package removal alone does not stop every
running host, remove wizard-created MCP entries or unregister the Figma plugin.
Keep unrelated settings, app code and saved reference/capture evidence intact.

## Troubleshooting

- If the skill is missing, check its installation path and reload the host's skills.
- If the engine is missing, install the Git package in the Flutter project or set
  `FLUTTER_FIDELITY_ROOT` to a built checkout.
- If versions differ, reinstall the skill from the engine's package. Updating
  one side alone is not a verified update.
- If `dist/cli.js` is missing, run `npm ci` in a source checkout, or
  `npm run build` when lifecycle scripts were disabled.
- If Node or Flutter is not found, check the PATH used to launch the agent.
- If a capture times out, inspect its saved failure diagnostics and the host's
  tool timeout. Start a fresh capture after resolving the failure.

Cloud/browser environments need access to the app files and a suitable execution
environment. Native Android captures need Android tooling and an emulator/device;
iOS captures need Xcode and an available simulator/device. Record each tested
platform separately. These tools do not install SDKs or establish native and
behavioral acceptance through widget captures alone.

## Update

Upgrade the project Git dependency, reinstall the skill from that package, and
reload the host. Keep pinned skill and engine revisions together for team use.
Source checkouts can use `npm run update:check` and `npm run update`.
See [updates](updates.md), [release notes](https://github.com/rebink/flutter-fidelity/blob/main/CHANGELOG.md), and
[verification](verification.md).

Installation conventions follow the [Skills CLI](https://github.com/vercel-labs/skills),
[Claude Code skills](https://code.claude.com/docs/en/skills),
[Claude Code MCP](https://code.claude.com/docs/en/mcp),
[Codex skills](https://learn.chatgpt.com/docs/build-skills), and
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) documentation.
