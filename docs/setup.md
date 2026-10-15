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
Allow npm lifecycle scripts and source-build development dependencies. No npm
registry release is required. The package is a development tool; it does not
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
examples. [Tool mappings](../skills/flutter-fidelity/references/tools.md) explain
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
See [updates](updates.md), [release notes](../CHANGELOG.md), and
[verification](verification.md).

Installation conventions follow the [Skills CLI](https://github.com/vercel-labs/skills),
[Claude Code skills](https://code.claude.com/docs/en/skills),
[Claude Code MCP](https://code.claude.com/docs/en/mcp),
[Codex skills](https://learn.chatgpt.com/docs/build-skills), and
[Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) documentation.
