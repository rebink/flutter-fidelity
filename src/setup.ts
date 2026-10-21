import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { run } from './io.js';
import { checkFigmaBridge, verifyMcp } from './figma-readiness.js';

export type SetupOptions = { manifest?: string; client?: string; open?: boolean };
type SetupEnvironment = {
  cwd?: string;
  platform?: NodeJS.Platform;
  question?: (prompt: string) => Promise<string>;
  log?: (message: string) => void;
  run?: typeof run;
  verifyMcp?: typeof verifyMcp;
  checkBridge?: typeof checkFigmaBridge;
};
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(packageRoot, 'dist/cli.js');
const pluginFiles = ['manifest.json', 'code.js', 'ui.html'];
const clients: Record<string, string> = { '1': 'claude', '2': 'codex', '3': 'pi', '4': 'skip' };

async function readOptional(file: string) {
  try { return await fs.readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
async function noSymlinks(root: string, relative: string) {
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try {
      if ((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Setup will not write through a symlink: ${current}`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  }
}
async function saveJson(file: string, value: unknown, before: string | null, backupRoot = path.dirname(file)) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (text === before) return;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const lockFile = `${file}.flutter-fidelity.lock`;
  let lock;
  try { lock = await fs.open(lockFile, 'wx', 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Another setup may be saving ${file}. If a previous run was interrupted, check private backups in ${backupRoot} and restore any missing original settings first. Remove ${lockFile} only when no setup is running, then retry.`);
    throw error;
  }
  let work = '', previous = '';
  const changed = () => new Error(`Settings changed during setup; kept the newer file. Run setup again: ${file}`);
  try {
    await fs.mkdir(backupRoot, { recursive: true });
    work = await fs.mkdtemp(path.join(backupRoot, 'settings-backup-'));
    await fs.writeFile(path.join(work, '.gitignore'), '*\n', { flag: 'wx', mode: 0o600 });
    await fs.writeFile(path.join(work, 'target.json'), JSON.stringify({ file }), { flag: 'wx', mode: 0o600 });
    const temporary = path.join(work, 'new.json');
    await fs.writeFile(temporary, text, { flag: 'wx', mode: 0o600 });
    if (await readOptional(file) !== before) throw changed();
    if (before !== null) {
      // Check hard-link support before moving an existing file; never fall back to overwriting it.
      try { await fs.link(temporary, path.join(work, 'link-check')); }
      catch { throw new Error(`This filesystem cannot safely replace settings. Existing files were kept; configure MCP manually: ${file}`); }
      await fs.rm(path.join(work, 'link-check'));
      const backup = path.join(work, 'mcp.json');
      await fs.rename(file, backup);
      previous = backup;
      await fs.chmod(previous, 0o600);
      if (await readOptional(previous) !== before) throw changed();
    }
    try { await fs.link(temporary, file); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw changed();
      throw new Error(`Could not safely save settings; existing files were kept. Check filesystem permissions/hard-link support: ${file}`);
    }
    return previous || undefined;
  } catch (error) {
    if (previous) {
      try { await fs.link(previous, file); }
      catch (restore) {
        if ((restore as NodeJS.ErrnoException).code !== 'EEXIST') throw new Error(`Could not restore settings automatically. Your original file is preserved at ${previous}; restore it manually before retrying.`);
      }
      throw new Error(`${error instanceof Error ? error.message : 'Could not save settings.'} Previous settings are preserved at ${previous}.`);
    }
    throw error;
  } finally {
    try {
      if (work) {
        if (previous) await fs.rm(path.join(work, 'new.json'), { force: true });
        else await fs.rm(work, { recursive: true, force: true });
      }
    } finally { await lock.close(); await fs.rm(lockFile, { force: true }); }
  }
}

export async function setup(options: SetupOptions = {}, environment: SetupEnvironment = {}) {
  const project = await fs.realpath(environment.cwd ?? process.cwd());
  const platform = environment.platform ?? process.platform;
  const log = environment.log ?? console.log;
  const executeCommand = environment.run ?? run;
  if (options.client && !['claude', 'codex', 'pi', 'skip'].includes(options.client)) throw new Error('Choose --client claude, codex, pi, or skip.');
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Flutter Fidelity setup needs Node.js 22 or newer.');
  await fs.access(cli);
  const terminal = !environment.question && process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  const abort = new AbortController();
  let settingsProgress: { saved: string[]; remaining: string[] } | undefined;
  const execute: typeof run = (command, args, options) => executeCommand(command, args, { ...options, signal: abort.signal });
  terminal?.on('SIGINT', () => terminal.close());
  terminal?.on('close', () => abort.abort());
  const question = environment.question ?? (async (prompt: string) => {
    if (!process.stdin.isTTY) throw new Error('Run setup in an interactive terminal. For unattended plugin preparation, use setup --manifest <file> --client skip --no-open.');
    return terminal!.question(prompt, { signal: abort.signal });
  });
  const confirm = async (prompt: string) => /^y(es)?$/i.test((await question(`${prompt} [y/N] `)).trim());
  async function open(command: string, args: string[]) {
    try {
      const result = await execute(command, args);
      if (result.code !== 0) throw new Error('Open failed');
    } catch { log('Could not open the application/folder automatically. Use the Figma menu and manifest path printed below.'); }
  }
  try {
    log('Flutter Fidelity setup\n');
    log(`[1/3] Node.js ${process.versions.node}; checking the built MCP engine...`);
    await (environment.verifyMcp ?? verifyMcp)(cli, project, abort.signal);
    log('MCP startup self-check passed: matching engine and Figma tools. The test server was closed; no bridge was started.');
    if (options.open !== false && platform === 'darwin') {
      const found = await execute('/usr/bin/open', ['-Ra', 'Figma']);
      if (found.code !== 0) throw new Error('Figma Desktop was not found. Install it from https://www.figma.com/downloads/, then run setup again. Use --no-open to prepare files without launching Figma.');
      log('Figma Desktop found. No browser permissions or settings changed.');
    } else log('Figma Desktop availability was not checked; it must run on the same computer as your agent.');

    log('\n[2/3] Prepare the Figma bridge plugin');
    const relativeState = path.join('.fidelity', 'figma-plugin', 'setup.json');
    await noSymlinks(project, relativeState);
    const stateFile = path.join(project, relativeState);
    const beforeState = await readOptional(stateFile);
    let id: unknown;
    if (options.manifest) {
      try { id = JSON.parse(await fs.readFile(path.resolve(project, options.manifest), 'utf8'))?.id; }
      catch { throw new Error('Could not read that Figma manifest. Select the manifest.json that Figma saved when creating your development plugin.'); }
    } else if (beforeState !== null) {
      try { id = JSON.parse(beforeState)?.id; }
      catch { throw new Error('Saved setup state is invalid. Run setup --manifest <Figma-generated-manifest.json> to select it again.'); }
    }
    let openedFigma = false;
    if (!options.manifest && beforeState === null) {
      log('Figma must assign the development-plugin ID once. No ID copying is needed.');
      log('In a Figma Design file: Plugins > Development > New plugin > Figma Design > Custom UI. Save the generated files.');
      if (options.open !== false) {
        if (platform === 'darwin') { await open('/usr/bin/open', ['-a', 'Figma']); openedFigma = true; }
        else if (platform === 'win32') { await open('explorer.exe', ['figma://']); openedFigma = true; }
      }
      const browse = platform === 'darwin' && options.open !== false;
      let selected = (await question(browse
        ? 'After saving, return here. Press Enter to choose manifest.json, or paste its path: '
        : 'After saving, paste the path to manifest.json: ')).trim();
      if (!selected && browse) {
        const picker = await execute('/usr/bin/osascript', ['-e', 'activate\nPOSIX path of (choose file with prompt "Choose the manifest.json Figma saved for your plugin" of type {"public.json"})'], { timeoutMs: 300000 }).catch(error => {
          if (abort.signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
          log('The native file picker could not finish. Paste the manifest path instead; Ctrl+C cancels setup.');
          return null;
        });
        if (picker) {
          if (picker.code !== 0 || !picker.stdout.trim()) throw new Error('File selection cancelled or unavailable. Run setup again, or pass --manifest <file>.');
          selected = picker.stdout.trim();
        } else selected = (await question('Paste the path to the manifest.json Figma saved: ')).trim();
      }
      abort.signal.throwIfAborted();
      if (!selected) throw new Error('No manifest selected. Run setup again when Figma has saved your plugin.');
      selected = selected.replace(/^"(.*)"$|^'(.*)'$/, '$1$2');
      try { id = JSON.parse(await fs.readFile(path.resolve(project, selected), 'utf8'))?.id; }
      catch { throw new Error('Could not read that Figma manifest. Choose the manifest.json saved by Figma, or pass --manifest <file>.'); }
    }
    if (typeof id !== 'string' || !/^\d{1,40}$/.test(id)) throw new Error('The manifest must contain the numeric ID assigned by Figma. Do not invent one. Select the original manifest using --manifest <file>.');
    const contents = await Promise.all(pluginFiles.map(file => fs.readFile(path.join(packageRoot, 'figma-plugin', file))));
    contents[0] = Buffer.from(JSON.stringify({ ...JSON.parse(contents[0]!.toString()), id }, null, 2) + '\n');
    const digest = createHash('sha256');
    for (const content of contents) digest.update(content);
    const base = path.join(path.dirname(stateFile), `bridge-${digest.digest('hex').slice(0, 12)}`);
    let manifest = '', reused = false;
    for (let copy = 0; copy < 100; copy++) {
      const out = copy ? `${base}-${copy}` : base;
      await noSymlinks(project, path.relative(project, out));
      try {
        await fs.lstat(out);
        const matches = await Promise.all(pluginFiles.map(async (file, index) => {
          try { return (await fs.readFile(path.join(out, file))).equals(contents[index]!); }
          catch { return false; }
        }));
        if (!matches.every(Boolean)) continue;
        reused = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const prepared = await execute(process.execPath, [path.join(packageRoot, 'scripts/prepare-figma-plugin.mjs'), '--id', id, '--out', out]);
        if (prepared.code !== 0) throw new Error(`Could not prepare the plugin; existing files were kept. ${prepared.stderr.trim()}`);
      }
      manifest = path.join(out, 'manifest.json');
      break;
    }
    if (!manifest) throw new Error('Too many changed plugin copies. Existing files were kept; review .fidelity/figma-plugin before running setup again.');
    abort.signal.throwIfAborted();
    await saveJson(stateFile, { id }, beforeState);
    log(`${reused ? 'Reusing unchanged plugin files' : 'Prepared a new plugin copy'}:\n${manifest}`);
    log('Original Figma files and older bridge copies are kept.');

    log('\n[3/3] Connect your coding agent');
    const selectedClient = options.client ?? (await question('Choose 1 Claude Code, 2 Codex, 3 Pi, or 4 keep existing MCP / configure later: ')).trim();
    const client = clients[selectedClient] ?? selectedClient;
    if (!['claude', 'codex', 'pi', 'skip'].includes(client)) throw new Error('Choose 1, 2, 3 or 4, or use --client claude|codex|pi|skip.');
    let configured = false;
    if (client !== 'skip') {
      log(`MCP engine: ${cli}`);
      if (packageRoot.split(path.sep).includes('_npx')) throw new Error('This engine is in a temporary npx cache. Install Flutter Fidelity in your project first, then rerun setup, or choose --client skip to keep an existing MCP connection. See docs/setup.md.');
      // shortcut: MCP uses this installation's absolute paths, rerun setup after moving it or updating Node.
      const entry = { command: process.execPath, args: [cli, 'mcp'], ...(client === 'pi' ? { timeout: 1200 } : {}) };
      if (client === 'codex') {
        log('Codex uses its own CLI to add or replace the flutter-fidelity entry in its USER configuration. No TOML is edited by this wizard.');
        if (await confirm('Allow Codex to update that user-level MCP entry?')) {
          let command = 'codex', args = ['mcp', 'add', 'flutter-fidelity', '--', entry.command, ...entry.args];
          if (platform === 'win32') {
            const found = await execute('where.exe', ['codex']);
            const launcher = found.code === 0 ? found.stdout.split(/\r?\n/).map(line => line.trim()).find(line => /\.(exe|cmd)$/i.test(line)) : undefined;
            if (!launcher) throw new Error('Codex CLI was not found on PATH. Install/open your existing Codex CLI, then retry, or choose --client skip.');
            if (/\.exe$/i.test(launcher)) command = launcher;
            else {
              const script = path.join(path.dirname(launcher), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
              try { await fs.access(script); }
              catch { throw new Error('Found a Windows Codex shim but not its npm entry point. Use the official npm/native Codex installation, configure MCP manually, or choose --client skip.'); }
              command = process.execPath; args = [script, ...args];
            }
          }
          let result;
          try { result = await execute(command, args, { cwd: project }); }
          catch (error) {
            throw new Error((error as NodeJS.ErrnoException).code === 'ENOENT'
              ? 'Codex CLI was not found. Install/open your existing Codex CLI, then rerun setup, or choose --client skip.'
              : 'Codex CLI could not complete MCP setup. Check its installation/settings, then try again. Your prepared plugin is kept.');
          }
          // Codex diagnostics can contain configuration values; do not echo them into setup output.
          if (result.code !== 0) throw new Error(`Codex could not save the MCP entry (exit ${result.code}). Check its settings, then retry. Your prepared plugin is kept.`);
          configured = true;
        }
      } else {
        // The adapter override works even when Pi's native MCP API is unavailable.
        const targets = client === 'pi' ? [
          { relative: path.join('.pi', 'mcp.json'), entry },
          { relative: path.join('.pi', 'mcp-adapter.json'), entry: { command: entry.command, args: entry.args, requestTimeoutMs: 1200000, lifecycle: 'lazy-keep-alive' } },
        ] : [{ relative: '.mcp.json', entry }];
        const settings = await Promise.all(targets.map(async target => {
          await noSymlinks(project, target.relative);
          const configFile = path.join(project, target.relative);
          const before = await readOptional(configFile);
          let config: unknown;
          try { config = before === null ? {} : JSON.parse(before); }
          catch { throw new Error(`Existing MCP configuration is not valid JSON; kept it unchanged: ${configFile}`); }
          if (!object(config) || (config.mcpServers !== undefined && !object(config.mcpServers))) throw new Error(`Unexpected MCP configuration; kept it unchanged: ${configFile}`);
          return { configFile, before, config, servers: (config.mcpServers ?? {}) as Record<string, unknown>, entry: target.entry };
        }));
        const aliases = client === 'pi' ? new Set(settings.flatMap(setting => Object.keys(setting.servers).filter(key => key.replaceAll('_', '-') === 'flutter-fidelity'))) : new Set<string>();
        if (aliases.size > 1) throw new Error(`Duplicate Pi server names; kept settings unchanged. Keep one consistent flutter-fidelity name across ${settings.map(setting => setting.configFile).join(' and ')}.`);
        const key = [...aliases][0] ?? 'flutter-fidelity';
        const changes = settings.filter(setting => JSON.stringify(setting.servers[key]) !== JSON.stringify(setting.entry));
        if (client === 'pi') log('Pi setup covers native MCP and pi-mcp-adapter. The adapter keeps the engine alive after first use; the bridge still needs an explicit start.');
        if (!changes.length) {
          configured = true;
          log('The project MCP entries already match this engine.');
        } else if (await confirm(`${changes.some(setting => setting.servers[key] !== undefined) ? 'Replace' : 'Add'} only the ${key} entry in ${changes.map(setting => setting.configFile).join(' and ')}? Other settings are kept.`)) {
          settingsProgress = { saved: [], remaining: changes.map(setting => setting.configFile) };
          for (const setting of changes) {
            abort.signal.throwIfAborted();
            const backup = await saveJson(setting.configFile, { ...setting.config, mcpServers: { ...setting.servers, [key]: setting.entry } }, setting.before, path.dirname(stateFile));
            settingsProgress.saved.push(setting.configFile);
            settingsProgress.remaining.shift();
            if (backup) log(`Previous settings backed up privately to ${backup}. The backup is git-ignored and may contain credentials.`);
            log(`Saved project MCP configuration: ${setting.configFile}`);
          }
          configured = true;
        }
      }
    }
    log(configured ? 'MCP entry configured. Restart/reload your agent and approve project trust if asked; its live connection is not yet verified.' : 'MCP settings unchanged. An existing local Flutter Fidelity MCP connection is still required for pairing.');
    if (options.open !== false) {
      if (platform === 'darwin') {
        if (!openedFigma) await open('/usr/bin/open', ['-a', 'Figma']);
        await open('/usr/bin/open', ['-R', manifest]);
      } else if (platform === 'win32') {
        if (!openedFigma) await open('explorer.exe', ['figma://']);
        await open('explorer.exe', [`/select,${manifest}`]);
      } else await open('xdg-open', [path.dirname(manifest)]);
    }
    if (reused) log('If Figma already uses this exact manifest, keep its development entry and run the plugin; no reimport is needed.');
    log('\nFirst import or a new copy: Plugins > Development > Import plugin from manifest. Select the manifest above, then run Flutter Fidelity Bridge.');
    log('If Figma says the ID is already registered, remove the ORIGINAL development entry (keep its files), then import this copy.');
    const readiness = await (environment.checkBridge ?? checkFigmaBridge)('http://localhost:43871', abort.signal);
    if (readiness.state === 'ready') log(`A compatible bridge responded on this computer (engine ${readiness.version}). Pairing and your agent's loaded MCP entry are not yet verified.`);
    else if (readiness.state === 'incompatible') log(`Port 43871 replied, but not with a compatible bridge${readiness.httpStatus ? ` (HTTP ${readiness.httpStatus})` : ''}. Stop an old bridge from its original agent, update/reload the matching engine, and start it again. No process was stopped.`);
    else log('Bridge not responding on localhost:43871. Prepared files are not a running connection; setup deliberately did not start a bridge.');
    log('\nPlugin prepared; pairing is NOT complete. Next:');
    log('1. Restart/reload your coding agent (Pi: /reload), approve project trust, and confirm flutter-fidelity connects without an MCP launch error (Pi: /mcp).');
    log('2. Ask your agent: "Start the Flutter Fidelity Figma bridge and give me a fresh pairing code." Wait for its successful response.');
    log('3. In the plugin, use Check bridge, paste that fresh code, and click Connect. Allow local network access if Figma asks.');
    log('If the agent cannot start MCP, fix that launch error before retrying the plugin. No response can also mean a network permission/block; do not disable browser security or add a proxy.');
    log('Setup did not start a bridge, claim a connection, change browser settings, or publish a plugin.');
    return { manifest, client, configured, reused, readiness };
  } catch (error) {
    const cancelled = abort.signal.aborted || (error instanceof Error && error.name === 'AbortError');
    const message = cancelled ? 'Setup cancelled. Existing plugin files were kept; you can rerun setup.' : error instanceof Error ? error.message : 'Setup failed.';
    if (settingsProgress?.saved.length && settingsProgress.remaining.length) {
      throw new Error(`${message} MCP configuration is partially complete. Saved: ${settingsProgress.saved.join(', ')}. Not completed: ${settingsProgress.remaining.join(', ')}. No automatic rollback was attempted; newer settings and private backups are preserved. Review these files and rerun setup; matching entries are kept without rewriting.`, { cause: error });
    }
    if (cancelled) throw new Error(message);
    throw error;
  } finally { terminal?.close(); }
}
