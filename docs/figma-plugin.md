# Figma plugin connection

Use this route for automatic acquisition from an open Figma Design file without
browser automation or a Figma REST token. Pi talks to a local bridge; the Figma
plugin exports the requested node through the Plugin API. PNG remains the visual
authority. The file and plugin must stay open during a request. For acquisition
with Figma closed, use the REST route in [design intake](design-intake.md).

## Initial setup

1. Create a development plugin in the Figma desktop app. Figma generates a
   manifest containing your numeric plugin `id`; retain that assigned identity.
   The bundled `figma-plugin/manifest.json` is a source template without an ID,
   not a registered/published Figma plugin.
2. Prepare a new local copy using that ID. Run the helper from this package
   directory (replace `YOUR_FIGMA_PLUGIN_ID` with the assigned numeric ID):

   ```sh
   node scripts/prepare-figma-plugin.mjs \
     --id YOUR_FIGMA_PLUGIN_ID --out /absolute/path/to/new-fidelity-figma-plugin
   ```

   The helper copies `code.js`/`ui.html` and writes an importable manifest. It
   refuses existing output directories. It does not edit the installed package
   or register/publish anything in Figma.
3. Import the generated `manifest.json` through Figma's development plugins and
   run **Flutter Fidelity Bridge** in the intended design file.
4. In Pi, ask to start the Figma bridge. The model calls
   `figma_bridge({"action":"start"})` and shows its pairing code. Paste that code
   into the plugin and click **Connect**. Each bridge restart makes a new code.
   Codes are local session credentials, not Figma account tokens.

The bridge binds only `127.0.0.1:43871`. The plugin's network manifest allows only
that local endpoint. If Figma/OS prompts for local network access, allow it for
this connection. A browser sandbox/CSP failure is an observed connection blocker,
not evidence that acquisition succeeded. No browser settings are changed by the
package. Live Figma connectivity still needs verification in the target setup.

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
