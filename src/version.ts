import { readFileSync } from 'node:fs';

/** One release identity for the CLI, MCP and bundled skills. */
export const VERSION: string = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
