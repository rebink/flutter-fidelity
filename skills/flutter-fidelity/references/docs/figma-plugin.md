<!-- Generated from docs/figma-plugin.md by npm run skill:sync. -->

# Figma plugin connection

Use this route for automatic acquisition from an open Figma Design file without
browser automation or a Figma REST token. Pi talks to a local bridge; the Figma
plugin exports the requested node through the Plugin API. PNG remains the visual
authority. The file and plugin must stay open during a request. For acquisition
with Figma closed, use the REST route in [design intake](design-intake.md).

## Initial setup

You need Figma desktop and Flutter Fidelity's MCP server on the **same
computer**. This is a one-time local development-plugin setup, not a Community
plugin installation. No Figma access token, proxy or browser configuration is
needed.

From your Flutter project, run **in your terminal** using the launcher for your
installation. For an engine installed with npm from GitHub:

```sh
npx --no-install flutter-fidelity setup
```

For `pi install --local git:github.com/rebink/flutter-fidelity`:

```sh
node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js setup
```

Pi packages are not visible to `npx`. For npm `E404` or an older Pi engine without
`setup`, follow [launcher troubleshooting](setup.md#npm-404-or-missing-setup-command).
For a built source checkout elsewhere, use its absolute CLI path from the app
folder. In the remaining examples, Pi users replace `npx --no-install
flutter-fidelity` with `node .pi/git/github.com/rebink/flutter-fidelity/dist/cli.js`.
Follow the wizard:

1. If this is the first run, Figma must assign the development-plugin ID once.
   The wizard opens Figma on macOS/Windows and explains **Plugins > Development >
   New plugin > Figma Design > Custom UI**. Save Figma's generated files. Return
   to the terminal; macOS opens a native file picker, while other systems ask for
   the manifest path. No copying or inventing IDs.
2. The wizard prepares a local copy in `.fidelity/figma-plugin`, remembers the
   assigned ID, and opens the prepared manifest's location. Repeated runs reuse
   identical files; edited/older copies and Figma's original files are kept.
3. Choose Claude Code, Codex, Pi, or keep your existing MCP connection. Every
   setting change needs confirmation. Claude/Pi configuration is project-local;
   **Codex uses its own CLI and asks before updating its user-level entry**.
   Reload/restart the host after changing configuration. A saved entry is not a
   verified host connection. [Configuration details](setup.md#guided-figma-bridge-setup).
4. In Figma, use **Plugins > Development > Import plugin from manifest** and
   select the **prepared manifest printed by setup**, not the original scaffold.
   Run **Flutter Fidelity Bridge** in your design. Figma registration/import and
   local-network permission remain explicit user actions, not desktop automation.
5. Reload your agent and confirm its MCP server connects without a launch error
   (Pi: `/reload`, then `/mcp`). Ask: **"Start the Figma bridge and give me a fresh
   pairing code."** It calls `figma_bridge({"action":"start"})`. After it succeeds,
   use **Check bridge**, paste the complete code, and click **Connect** once your
   file name appears. The plugin retries
   while Figma opens the document; you do not need to keep clicking Connect.
6. Select one frame and ask your agent to use it. Keep the file and plugin open.
   Each bridge restart needs a new code, not a new plugin installation. Pairing
   codes are local session credentials; do not commit or share them.

Setup initializes the real built MCP engine, verifies its version and Figma
tools, and closes the temporary test process before preparing files or settings.
Failures stop setup without exposing stderr/configuration values. It checks Node
and Figma availability on macOS. It does not change the
Flutter SDK, configure browser permissions, start another bridge, install global
plugins or publish. Keep the prepared folder and engine installation in place.
An engine in a temporary npx cache must be installed in the project before it can
be saved as MCP; keep existing MCP if your agent already has a working engine.

### Prepared, reachable and paired are different states

The wizard checks whether the local bridge responds, but does not start one.
A compatible response is not proof that your agent loaded its configuration or
that Figma has permission to reach it. Complete the final reload/start/pair steps;
a successful file copy or MCP self-check is not a live connection.

The plugin's **Check bridge** action sends no pairing code or document metadata.
It checks a bounded, read-only `GET /health` response for the bridge service and
protocol. This endpoint retains exact loopback Host/Figma origin restrictions and
returns only service, protocol and engine version. All document/session/export
routes still require pairing authorization. Opening the plugin alone does not
probe network permissions; checking or connecting is an explicit user action.

Connect checks compatibility before sending the pairing credential. HTTP errors
or a different protocol produce update/reload instructions. No response is
ambiguous: a stopped bridge, a failed MCP launch, browser policy or local-network
permission can all cause it. The plugin does not claim which one happened or
silently disable security, restart a process, or reuse a code after restart.

### Connection recovery

The current bridge uses protocol **2**. Update/reload the engine and prepare and
import the matching plugin together; protocol 1 copies must be replaced. The
health check rejects a mismatched protocol before sending the pairing code.

The plugin retries temporary transport/server failures up to three attempts.
A brief polling failure does not disconnect the paired document. After retries
are exhausted, **Reconnect** can reuse the code held only in this open plugin's
memory; it is not put back into the input, saved to disk or sent to another host.
A restarted engine needs its new pairing code. Explicit disconnect, document
access failure and invalid authentication clear the remembered code.

Pairing retries use a random per-launch client identity, so a lost connection
reply can be retried without stranding that launch. Another plugin cannot take
over an active session. After closing a plugin, its abandoned ownership can
expire after 30 seconds without activity, provided no poll or export is active.
If an export was interrupted, wait for its failure/timeout before pairing again.

An expired export result or a failed export does not disconnect a healthy
session. Failure records remain explicit, including a disconnect during output
folder creation. Retry a failed export into a **new output folder**; transport
retries do not automatically rerun rendering or reuse an old reference.

### Existing manifests and unattended preparation

Skip app/file-picker launches and leave MCP untouched:

```sh
npx --no-install flutter-fidelity setup \
  --manifest "/absolute/path/to/Figma plugin/manifest.json" --client skip --no-open
```

Use `--client claude|codex|pi|skip` to preselect an agent; setting changes still
ask for consent in a terminal. On later runs, the saved ID removes the manifest
prompt. `--no-open` suppresses Figma, file-picker and file-manager launches.

The original explicit preparation command remains available:

```sh
npx --no-install flutter-fidelity setup-figma-plugin \
  --manifest "/absolute/path/to/Figma plugin/manifest.json" \
  --out "./fidelity-figma-plugin"
```

Its output folder must be new; no files are overwritten. The original script's
`--id` option remains supported. Neither setup route installs or publishes a
Community plugin; no Community installation flow is claimed.

The UI and development manifest use `http://localhost:43871`. The engine binds
explicitly to `127.0.0.1` and `::1` on that port, never a wildcard/network
interface. IPv4 remains available on systems without IPv6 loopback. Host checks
accept only these loopback names with the bridge's exact port; pairing and Figma
origin checks still apply. The manifest uses `allowedDomains: ["none"]` and
`devAllowedDomains: ["http://localhost:43871"]`, so run the imported development
plugin, not a published copy. If Figma/OS prompts for local network access,
allow it for this connection.

## Remove the bridge

Finish or cancel active exports, then ask the owning agent to stop this project's
bridge with `figma_bridge` action `stop` and confirm it is no longer running.
Click **Disconnect** if available, close the plugin, and remove the matching
Flutter Fidelity Bridge registration from Figma's development-plugin management.
Check the manifest path: removing a shared registration can affect other projects.
Closing the plugin alone does not stop the local listener.

Only after unregistering the matching copies should you remove their prepared
files. The [uninstall guide](uninstall.md) covers the generated
`.fidelity/figma-plugin` folder, private settings backups, Pi's two MCP files and
other agent/package installations. Do not delete the entire `.fidelity` directory
or overwrite current settings with an old backup.

## Troubleshooting

- **Setup says another writer is saving settings:** wait for that setup to
  finish. After a force-kill, check private `settings-backup-*` folders under
  `.fidelity/figma-plugin`: `target.json` names each original destination for
  `mcp.json`. Restore any missing settings first, then remove the reported
  `.flutter-fidelity.lock` only when no setup is running. Never overwrite
  another writer's file while recovering.
- **Filesystem cannot safely replace settings:** the wizard needs hard-link
  support for atomic, no-overwrite JSON publication. Keep your existing MCP or
  configure it manually on unsupported/network filesystems.
- **Windows Codex shim is unsupported:** use the official npm/native Codex
  installation, configure MCP manually, or choose keep existing MCP. Setup
  never feeds paths into `cmd.exe` or PowerShell.
- **Figma rejects the network URL:** prepare a fresh plugin folder with this
  version and reimport its manifest. Do not add an IP address, wildcard domain,
  proxy or broad network permission to work around validation.
- **Figma says the plugin ID is already registered:** remove the original
  development-plugin entry (keep its files), then import the prepared manifest.
- **Waiting for Figma / document unavailable:** the plugin retries metadata
  twenty times over about ten seconds and reports document-read errors. Open a
  Figma Design file you can access, then close and rerun the plugin if needed.
- **MCP startup self-check failed:** reinstall the matching package, or rebuild a
  source checkout, then rerun setup. No MCP settings are saved after this failure.
  Repair an agent's own launch error before retrying Figma; do not create a second
  standalone bridge to work around a broken host connection.
- **Pi still launches the wrong engine after reload:** rerun setup and choose
  Pi to create its project-local `.pi/mcp-adapter.json` compatibility override
  as well as `.pi/mcp.json`. Adapters without native Pi MCP support otherwise
  may fall back to a shared plugin template whose root variable is not expanded
  outside its original host. The override preserves that template and keeps
  this stateful server alive after first use. Reload and approve the updated
  project server, then start the bridge; no Figma reimport is needed when the
  prepared plugin files are unchanged.
- **No response / cannot reach the bridge:** installation does not start the
  listener. Reload the agent (Pi: `/reload`), verify its MCP connection (Pi:
  `/mcp`), and ask it to start the bridge for a fresh pairing code. Use **Check
  bridge**. If the agent reports success but Figma still cannot reach it, check
  local-network permission. Browser errors cannot reliably distinguish a stopped
  server from a network block. Keep the MCP process running on this computer;
  a remote agent's localhost is not your laptop.
- **Listener replied but is incompatible:** update/reload the engine and prepare
  and import the updated plugin together. An old bridge or unrelated server may
  occupy the port. Stop it from its owning agent; do not kill an unknown process.
  The health check neither authenticates nor takes over another server.
- **Invalid pairing code:** ask the agent for the current code, especially after
  a restart. Paste the entire value beginning with `43871.`; not a Figma token.
- **Port already in use:** stop the other bridge from its original agent, then
  start again. Flutter Fidelity never kills or takes over another process.
- **Updating an older copy:** prepare another new folder, remove the old Figma
  development entry and import the new manifest. Relaunch the plugin and pair
  again so the UI and sandbox both use the updated messaging protocol.

Messages are bound to a random per-launch channel, generated with
`crypto.getRandomValues()` in the UI and echoed by the sandbox. Replies may be
relayed by Figma rather than arriving directly from the parent window. Browser
regressions exercise opaque-origin `sandbox="allow-scripts"` iframes, relayed
messages, retries and missing `crypto.randomUUID`; the Plugin API is a fixture,
not live Figma. The isolated test browser grants local-network permission and
its host delegates that permission to the iframe; a real Figma host must permit
this access too. A sandbox/CSP failure remains a connection blocker, not evidence
of acquisition. No browser settings are changed; live Figma/macOS connectivity
still needs verification in the target setup.

## Automatic use after pairing

Select one frame, then ask Pi:

```text
Use the connected Figma plugin to implement this selected frame in my Flutter app.
```

The skill calls `figma_bridge({"action":"status"})` to check the paired document,
selection and session ID. It then calls:

```json
{
  "sessionId": "the-current-session-uuid",
  "out": ".fidelity/intake/new-plugin-run",
  "scale": 1,
  "css": false
}
```

with `acquire_figma_plugin`. An explicit `nodeId` can replace selection within
the paired document. Requests support frames, groups, components, component
sets, instances and sections, not full documents/pages. The plugin does not
select layers, move the viewport, change source nodes or load every page.
Subtree properties are compared before/after rendering; observed edits fail
the request instead of accepting mixed evidence.

Output is a new `intake.json`, original `frames/reference.png`, and scoped
`context/node.json`. Optional `css: true` uses `getCSSAsync()` on the requested
root and saves its property map as `context/css.json`; it does not collect every
child's CSS. CSS failure is recorded and does not block valid PNG/context intake.
Use subtree properties for child typography, layout and appearance. Original
artwork and font bytes remain separate inputs.

Read `profileStatus` before import. Pixel/logical dimension disagreements need
review, never resizing. The manifest records the paired session, document name,
node, hashes, scale, export time and elapsed acquisition time. Ordinary plugins
cannot rely on `figma.fileKey`, which is private-plugin restricted; a session is
an explicit user-paired document identity, not proof of a particular file URL.
The snapshot has no REST revision and is not a cache key for REST reuse.

## Connection lifetime and limits

- One paired file and one export at a time per bridge. Session IDs prevent
  accidental results from a different pairing. Select another node in the same
  file without reconnecting; selection metadata updates automatically.
- Export requests time out after 60 seconds, with no automatic retry. A late
  result cannot overwrite a completed/failed intake. Every new request requires
  a fresh directory; no previous PNG or failed capture is silently reused.
- The plugin transfers PNGs up to 32 MiB; the bridge bounds total messages and
  fully decodes images before accepting them. Use a smaller target/lower scale
  for oversized exports, recording the new scale rather than resizing saved PNGs.
- Use `figma_bridge({"action":"stop"})` to close the listener and cancel pending
  exports. MCP shutdown closes it too. If the plugin closed unexpectedly, stop/
  start the bridge and pair again. Port conflicts fail without taking over the
  other process.
- Pi and Figma must run on the same computer for this loopback route. A remote
  Pi session cannot reach your laptop through its own `127.0.0.1`.

This removes UI/clipboard steps. Actual speed and background-app behavior must
be measured in Figma; local protocol tests do not establish live rendering speed.

Official references: [plugin runtime/lifetime](https://developers.figma.com/docs/plugins/how-plugins-run/),
[direct export](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/),
[node CSS properties](https://developers.figma.com/docs/plugins/api/node-properties/#getcssasync),
[network manifest](https://developers.figma.com/docs/plugins/manifest/),
and [file key restrictions](https://developers.figma.com/docs/plugins/api/figma/#filekey).
