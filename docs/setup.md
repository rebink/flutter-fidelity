# Local setup

For the Pi coding agent, follow [Pi extension setup](pi.md). Its package loads
the flutter-ui skill and registers the MCP server automatically.

1. Install Node 22+ and run `npm ci && npm run build` in this repository.
2. Pin a Flutter SDK and run `node dist/cli.js doctor --flutter /path/to/flutter`.
3. Configure the custom MCP server in your assistant:

```json
{
  "mcpServers": {
    "flutter-fidelity": {
      "command": "node",
      "args": ["/absolute/path/to/flutter-fidelity/dist/cli.js", "mcp"]
    },
    "dart": { "command": "/path/to/flutter/bin/dart", "args": ["mcp-server"] }
  }
}
```

The Dart entry is optional for image tools and requires a compatible newer SDK.
The custom server works with the older local Flutter SDK for capture. CLI
subcommands accept paths relative to their invocation directory; portable plugin
configuration uses the plugin root. Use absolute bundle/project paths when
working across repositories.

Load `skills/flutter-ui/SKILL.md` through your assistant's skill discovery. The
root `plugin.json`, `mcp.json` and synchronized `.codex-plugin/plugin.json` are
included for local plugin clients. Dependencies and dist must exist before
starting the plugin. This repository does not install into your global assistant
configuration or publish/upload anything automatically.

## Updating

From a clean source clone, run `npm run update:check` to inspect the tracked
upstream, or `npm run update` to fast-forward, install locked dependencies and
run checks. Then restart the MCP process and refresh/reload any cached plugin
through the host. This follows the source branch; tagged installations remain
pinned. See [versions and updates](updates.md) for bootstrap, release pinning,
rollback and maintainer instructions, and [release notes](../CHANGELOG.md).

## Optional tooling

The bundled `flutter-ui` entry routes its own implementation, typography,
repair and verification guides. Additional skill installation is not required.
When official Dart MCP or other compatible development tools are already
connected, the host can use them from the same workflow. Pin tool/SDK revisions
in the team setup; this package does not install external skills automatically.

Official source: https://docs.flutter.dev/ai/get-started

Native example setup requires Android tooling/emulator or Xcode/iOS simulator.
Generate scaffolding in `flutter/example`, select the device ID, and ensure its
logical app viewport matches the confirmed reference. Store platform/OS/renderer
configuration alongside benchmark manifests; use the same profile for repeats.
