import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Pi owns MCP connections, tool schemas, image results and process cleanup.
 * Keep the adapter independent of Pi's runtime packages so CLI/MCP users do
 * not need to install a second agent. Requires Pi's registerMcpServer API.
 */
export default function flutterFidelity(pi) {
  if (typeof pi.registerMcpServer !== 'function') {
    throw new Error('Flutter Fidelity requires Pi with native MCP extension support (tested with Pi 1.2.0). Update Pi or configure dist/cli.js mcp in your MCP client.');
  }
  const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
  if (!existsSync(cli)) {
    throw new Error('Flutter Fidelity is not built. Run npm ci in the package directory, then reload Pi.');
  }
  pi.registerMcpServer('flutter-fidelity', {
    // Use Node from PATH: process.execPath can be Pi's standalone executable.
    command: 'node',
    args: [cli, 'mcp'],
    // Inherit the Pi workspace, never the installed package's directory.
    exposure: 'direct',
    // Capture runs SDK probing, analysis and Flutter tests (up to 5m each by default).
    timeout: 1200,
    description: 'Flutter Fidelity: background PNG/styling intake, widget snapshots and source-aware reuse catalog, parallel widget work plans, Flutter captures, visual reports and source-bound repair. Use the flutter-fidelity skill; host agents own inference and Dart edits. Missing native or behavioral evidence remains incomplete.',
  });
}
