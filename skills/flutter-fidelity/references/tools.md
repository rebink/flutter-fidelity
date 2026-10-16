# Run the tools on your host

Use an already connected Flutter Fidelity MCP server when available. Otherwise,
run `node <installed-skill-directory>/scripts/fidelity.mjs <command>` from the
Flutter project. Resolve the skill directory from the SKILL.md you actually read;
do not assume a Claude, Codex or Pi installation path. The launcher needs Node
22+ and a matching installed engine. It does not download or install anything.

First run `doctor`. If the engine is missing, follow [setup](docs/setup.md).
`doctor` can exit 2 when Flutter is unavailable while image tools remain usable;
inspect its independent capability fields. Do not change the SDK automatically.
Use `--package-root` on the launcher to locate the bundled development harness
at `flutter/fidelity_harness` and the capture examples at `examples/`.

MCP tool names below are logical operations, not host-specific tool identifiers.
Use the names exposed by your connected server. CLI commands return JSON; inspect
images at the returned local paths with the host's image-reading capability.

| MCP operation | CLI command and arguments |
| --- | --- |
| `doctor` | `doctor [--flutter <executable>]` |
| `acquire_figma` | `acquire-figma --url <frame-link> --out <new-directory> [--reuse <prior-intake>]` |
| `acquire_figma_browser` | `acquire-figma-browser --config <arguments.json>`; see [parallel background intake](docs/figma-browser.md) |
| `validate_assets` | `validate-assets --files <paths...>` |
| `suggest_viewport` | `suggest-viewport --image <png>` |
| `import_reference` | `import-image --image <png> --out <new-directory> --width <logical> --height <logical> --confirmed`; add supplied fonts, assets, crop and insets |
| `inspect_reference` | `inspect --bundle <directory> [--spec <reviewed-spec.json>]` |
| `mark_widgets`, `register_widget`, `find_widgets`, `plan_widget_work` | `mark-widgets`, `register-widget`, `find-widgets`, `plan-widget-work`, each with `--config <arguments.json>` |
| `crop_asset` | `crop-asset --bundle <directory> --region <id> --crop <x,y,width,height>` |
| `capture_ui` | `capture --bundle <directory> --config <capture.json> --out <new-directory>` |
| `compare_ui` | `compare --bundle <directory> --actual <png> --capture <capture.json> --out <new-directory>` |
| `get_report` | `report --directory <report-directory>` |
| `record_iteration` | `record-iteration --session <session.json> --report <report-directory>` |
| `verify_source_checkpoint` | `verify-source-checkpoint --checkpoint <json> --project-root <directory>` |

Use each command's `--help` for additional options. The widget catalog/planner
JSON files use the same argument objects as MCP; the capture JSON is the capture
configuration object itself. Compare exits 0 for passed, 1 for failed and 2 for
incomplete evidence. A failed or incomplete comparison still contains a report.

The optional paired Figma plugin operations `figma_bridge` and
`acquire_figma_plugin` require a persistent MCP connection. Do not start a new
stdio process for each of those calls; the pairing session lives in the server.
PNG and Figma REST workflows work through the CLI.
