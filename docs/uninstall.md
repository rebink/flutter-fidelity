# Uninstall Flutter Fidelity and the Figma bridge

Run terminal commands from the Flutter app where you installed Flutter Fidelity.
Use the same installation method and scope you used to install it. Before
removing anything, check whether other projects share this engine or prepared
plugin. Give those projects their own installation and update their references
first, or keep the shared installation in place.

**Removing the package alone is not a complete uninstall.** The Figma development
plugin, wizard-created MCP entries and already running agent processes are
separate. Follow all steps below. There is no automatic CLI command that removes
a development-plugin registration from your Figma account.

## 1. Stop this project's bridge

Finish or cancel active captures and exports. While the package is still
available, ask the agent that owns this project's connection:

```text
Stop this project's Flutter Fidelity Figma bridge and confirm it is no longer running.
```

The agent calls `figma_bridge` with `{"action":"stop"}` and checks that its
status reports `running: false`. This stops the loopback listener and ends its
pairing session. Stop any other agent sessions using this same installation too.

If that agent cannot call its tools, close its Flutter Fidelity MCP connection or
exit that agent session. Do not terminate an unknown process on port `43871`;
another project may own it. Closing the Figma plugin alone does not stop a
persistent MCP server's bridge listener.

## 2. Remove the Figma development plugin

1. Click **Disconnect** in the bridge plugin if available, then close it.
2. Open Figma's **Plugins > Development** and its development-plugin management.
   Find **Flutter Fidelity Bridge** and remove its development-plugin entry.
3. Check the entry's manifest path before removal. Wizard-prepared copies normally
   live at `.fidelity/figma-plugin/bridge-.../manifest.json` in the app. Remove
   obsolete registrations for this installation, not similarly named plugins
   belonging to another project. If a separate generated scaffold registration
   remains from initial setup, remove that too only if it belongs to this setup
   and is no longer needed.

Development-plugin registrations belong to Figma, not to npm or Pi. Package
removal does not unregister them. A registration or prepared folder may be shared
by projects; arrange another copy for a project that still needs it before removal.
Removing a local development entry does not delete nodes in your design file.

## 3. Remove the package and skill

### Project-local Pi Git installation

Check the configured source, then remove the package from this project:

```sh
pi list
pi remove --local git:github.com/rebink/flutter-fidelity
```

For a tagged or local-path installation, use its actual source shown by `pi list`.
For a personal Pi installation, omit `--local` only if you intend to remove the
personal installation for every project. Do not uninstall Pi itself or remove
other packages. A separately installed skill must also be removed using the
installer that added it.

### npm Git installation with the Skills CLI

Remove the separately installed project skill and the package:

```sh
npx skills remove flutter-fidelity
npm uninstall --save-dev flutter-fidelity
```

Select the agents where you installed this skill. If you intentionally installed
it globally, use `npx skills remove --global flutter-fidelity` for that global
copy. Do not use `--all`, delete other skills, or remove the entire `node_modules`
directory. Keep `package.json` and lockfiles; they may contain other app tooling.

### Local checkouts and plugin loaders

Remove this package's loading reference from your agent, such as its
`--plugin-dir` or Pi `-e` argument. Remove a `FLUTTER_FIDELITY_ROOT` override only
if it points to the installation being removed. Do not delete a checkout still
used by another project. If a clone is no longer needed, review its uncommitted
work before deleting it yourself.

## 4. Remove only Flutter Fidelity's MCP entries

Back up the relevant settings privately before editing; they can contain
credentials. Do not delete entire configuration files or restore a whole old
backup over newer settings.

| Setup route | Cleanup |
| --- | --- |
| Pi wizard | In **both** `.pi/mcp.json` and `.pi/mcp-adapter.json`, remove only `mcpServers.flutter-fidelity`, or the existing `flutter_fidelity` alias pointing to this installation. Preserve every other server and setting. |
| Claude Code wizard | Remove only the `flutter-fidelity` entry under `mcpServers` in the project's `.mcp.json`. |
| Codex wizard | Run `codex mcp remove flutter-fidelity` to remove the **user-level** entry created by its CLI. Reconfigure any other projects using this entry before removing it or the shared engine. |
| Manual Codex setup | Remove only the matching `[mcp_servers.flutter-fidelity]` table from the configuration where you added it, such as `.codex/config.toml`. |
| Other MCP clients or plugin loaders | Remove this installation's server/plugin reference in its actual scope. Keep unrelated servers, packages and credentials. |

Pi package removal stops automatic registration after reload, but does not remove
the wizard's independently saved native and adapter overrides. Leaving either
entry can keep loading an old engine or cause a missing-path error. If the
installation remains visible, check for another personal/project entry or manually
loaded copy. Do not remove a shared entry without deciding which other projects
will lose access.

## 5. Review and remove generated bridge files

After unregistering the matching Figma plugins and cleaning up their settings,
review `.fidelity/figma-plugin` in this project. It can contain:

- `bridge-*` prepared plugin folders, including any local edits.
- `setup.json`, which remembers the Figma-assigned plugin ID and prepared copy.
- Private `settings-backup-*` folders containing previous MCP settings and
  `target.json` destination records. These backups can contain credentials.

For a full reset, remove this **reviewed bridge folder only** once no other
registration/project uses its contents. Keep any needed code or settings backups
privately first. If a setup was interrupted, recover missing settings before
deleting its backups; see [setup recovery](setup.md#guided-figma-bridge-setup).
Manually prepared `setup-figma-plugin --out` folders and Figma's original generated
files may live elsewhere: review and remove only the copies you own and no longer
need.

**Do not delete the entire `.fidelity` directory.** Reference PNGs, intake bundles,
captures, reports, widget catalogs, checkpoints and preserved failure evidence
are separate from the plugin installation. Keep those records unless you
explicitly choose to delete them. No Flutter SDK or app-code cleanup is required.

## 6. Verify removal

Restart the affected agent sessions after removing their entries. In Pi, use
`pi list` and `/mcp` to confirm this installation is no longer configured, and
confirm its skill and tools are no longer loaded. In Figma, confirm the removed
manifest's development-plugin entry is gone and its plugin is closed.

There should be no bridge listener owned by the removed installation. A listener
from another project is not an uninstall failure and must not be killed. If the
package or tools still appear, check the scope and remaining entries before
repeating package removal.

This guide describes removal; it does not automatically click Figma controls or
delete files. Reinstall later using [setup](setup.md) or [Pi installation](pi.md).
