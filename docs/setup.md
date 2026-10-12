# Local setup

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

Load the four skills in `skills/` through your assistant's skill discovery. The
root `plugin.json`, `mcp.json` and synchronized `.codex-plugin/plugin.json` are
included for local plugin clients. Dependencies and dist must exist before
starting the plugin. This repository does not install into your global assistant
configuration or publish/upload anything automatically.

Optional official skills, as documented by the Flutter team:

```sh
npx skills add flutter/agent-plugins --skill '*' --agent universal --yes
npx skills add dart-lang/skills --skill '*' --agent universal --yes
```

Review and pin installed skill revisions in your team setup. The custom package
does not download changing upstream skills silently. Relevant skills are
flutter-build-responsive-layout, flutter-fix-layout-issues,
flutter-add-widget-test, flutter-add-integration-test, flutter-add-widget-preview,
dart-run-static-analysis and dart-fix-runtime-errors.

Official source: https://docs.flutter.dev/ai/get-started

Native example setup requires Android tooling/emulator or Xcode/iOS simulator.
Generate scaffolding in `flutter/example`, select the device ID, and ensure its
logical app viewport matches the confirmed reference. Store platform/OS/renderer
configuration alongside benchmark manifests; use the same profile for repeats.
