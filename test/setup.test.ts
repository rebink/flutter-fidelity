import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { setup } from '../src/setup.js';
import { run } from '../src/io.js';

async function fixture(t: TestContext) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity setup ')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const manifest = path.join(root, 'Figma generated manifest.json');
  const original = JSON.stringify({ id: '1234567890123456789', name: 'Original Figma plugin' });
  await fs.writeFile(manifest, original);
  const answers: string[] = [], logs: string[] = [], prompts: string[] = [];
  const commands: { command: string; args: string[]; options?: Parameters<typeof run>[2] }[] = [];
  const environment = {
    cwd: root, platform: 'darwin' as NodeJS.Platform,
    verifyMcp: async (_entrypoint: string, _cwd: string, _signal?: AbortSignal) => {},
    checkBridge: async () => ({ state: 'unreachable' as const }),
    log: (message: string) => { logs.push(message); },
    question: async (prompt: string) => {
      prompts.push(prompt);
      assert.ok(answers.length, `unexpected prompt: ${prompt}`);
      return answers.shift()!;
    },
    run: async (command: string, args: string[], options?: Parameters<typeof run>[2]) => {
      commands.push({ command, args, options });
      if (args[0]?.endsWith('prepare-figma-plugin.mjs')) return run(command, args, options);
      return { code: 0, stdout: command.endsWith('osascript') ? `${manifest}\n` : '', stderr: '' };
    },
  };
  return { root, manifest, original, answers, logs, prompts, commands, environment };
}
const noOpen = { client: 'skip', open: false };

test('guided macOS setup requests file picker activation, configures Pi by consent, and never starts a bridge', async t => {
  const f = await fixture(t);
  f.answers.push('', '3', 'yes');
  const result = await setup({}, f.environment);
  assert.equal(result.client, 'pi');
  assert.equal(result.configured, true);
  assert.equal(result.reused, false);
  assert.equal(await fs.readFile(f.manifest, 'utf8'), f.original);
  const manifest = JSON.parse(await fs.readFile(result.manifest, 'utf8'));
  assert.equal(manifest.id, '1234567890123456789');
  assert.deepEqual(manifest.networkAccess.allowedDomains, ['none']);
  assert.deepEqual(manifest.networkAccess.devAllowedDomains, ['http://localhost:43871']);
  for (const file of ['code.js', 'ui.html']) assert.deepEqual(await fs.readFile(path.join(path.dirname(result.manifest), file)), await fs.readFile(path.join('figma-plugin', file)));
  const config = JSON.parse(await fs.readFile(path.join(f.root, '.pi/mcp.json'), 'utf8'));
  assert.deepEqual(config.mcpServers['flutter-fidelity'], { command: process.execPath, args: [path.resolve('dist/cli.js'), 'mcp'], timeout: 1200 });
  const adapter = JSON.parse(await fs.readFile(path.join(f.root, '.pi/mcp-adapter.json'), 'utf8'));
  assert.deepEqual(adapter.mcpServers['flutter-fidelity'], { command: process.execPath, args: [path.resolve('dist/cli.js'), 'mcp'], requestTimeoutMs: 1200000, lifecycle: 'lazy-keep-alive' });
  assert.equal(f.prompts.filter(prompt => prompt.includes('[y/N]')).length, 1, 'one consent covers both Pi configuration files');
  const picker = f.commands.find(call => call.command === '/usr/bin/osascript');
  assert.match(picker?.args[1] ?? '', /^activate\nPOSIX path of \(choose file/);
  assert.equal(f.commands.filter(call => call.args[0] === '-a').length, 1);
  assert.ok(f.commands.some(call => call.command === '/usr/bin/open' && call.args[0] === '-R' && call.args[1] === result.manifest));
  assert.ok(f.prompts.some(prompt => prompt.includes('Add only')));
  assert.match(f.logs.join('\n'), /live connection is not yet verified/);
  assert.match(f.logs.join('\n'), /Setup did not start a bridge/);
  assert.equal(f.commands.some(call => call.args[0]?.endsWith('cli.js') && call.args.includes('mcp')), false);
});

test('setup checks real MCP startup before file preparation or consented configuration changes', async t => {
  const f = await fixture(t), file = path.join(f.root, '.mcp.json'), original = '{"keep":"original"}';
  await fs.writeFile(file, original);
  let checked = false;
  f.environment.verifyMcp = async (entrypoint, cwd, signal) => {
    checked = true;
    assert.equal(entrypoint, path.resolve('dist/cli.js'));
    assert.equal(cwd, f.root);
    assert.ok(signal instanceof AbortSignal);
    throw new Error('MCP startup self-check failed.');
  };
  await assert.rejects(setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment), /MCP startup self-check failed/);
  assert.equal(checked, true);
  assert.equal(await fs.readFile(file, 'utf8'), original);
  assert.equal(f.prompts.length, 0);
  assert.equal(f.commands.length, 0);
  await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
});

test('setup reports readiness separately from installation and never starts another bridge', async t => {
  for (const state of ['unreachable', 'incompatible', 'ready'] as const) await t.test(state, async t => {
    const f = await fixture(t);
    const readiness = state === 'ready' ? { state, version: '0.11.1' } : state === 'incompatible' ? { state, httpStatus: 403 } : { state };
    const result = await setup({ ...noOpen, manifest: f.manifest }, { ...f.environment, checkBridge: async () => readiness });
    assert.deepEqual(result.readiness, readiness);
    const output = f.logs.join('\n');
    assert.match(output, /pairing is NOT complete/);
    assert.match(output, /Pi: \/reload/);
    assert.match(output, /Check bridge/);
    assert.match(output, state === 'ready' ? /compatible bridge responded/ : state === 'incompatible' ? /not with a compatible bridge.*HTTP 403/ : /Bridge not responding/);
    assert.equal(f.commands.some(call => call.args.includes('mcp')), false);
  });
});

test('setup remembers the assigned ID and reuses byte-identical plugin files without rewriting them', async t => {
  const f = await fixture(t);
  const first = await setup({ ...noOpen, manifest: f.manifest }, f.environment);
  const before = await fs.stat(first.manifest);
  const state = await fs.readFile(path.join(f.root, '.fidelity/figma-plugin/setup.json'), 'utf8');
  await fs.rm(f.manifest);
  const second = await setup(noOpen, f.environment);
  assert.equal(second.manifest, first.manifest);
  assert.equal(second.reused, true);
  assert.equal((await fs.stat(first.manifest)).mtimeMs, before.mtimeMs);
  assert.equal(await fs.readFile(path.join(f.root, '.fidelity/figma-plugin/setup.json'), 'utf8'), state);
  assert.equal(f.commands.length, 1, 'only the first preparation invokes a process');
  assert.equal(f.prompts.length, 0);
  assert.match(f.logs.join('\n'), /no reimport is needed/);
});

test('a locally edited plugin is preserved and a fresh copy is reused on the following run', async t => {
  const f = await fixture(t);
  const first = await setup({ ...noOpen, manifest: f.manifest }, f.environment);
  const edited = path.join(path.dirname(first.manifest), 'code.js');
  const changed = await fs.readFile(edited, 'utf8') + '\n// Local workaround.\n';
  await fs.writeFile(edited, changed);
  const second = await setup(noOpen, f.environment);
  assert.notEqual(second.manifest, first.manifest);
  assert.equal(await fs.readFile(edited, 'utf8'), changed);
  assert.equal(second.reused, false);
  assert.equal((await setup(noOpen, f.environment)).manifest, second.manifest);
  assert.equal(f.commands.length, 2);
});

test('invalid explicit manifests fail before registration prompts or configuration changes', async t => {
  for (const [name, text] of [['malformed', '{'], ['missing ID', '{}'], ['numeric ID', '{"id":123}'], ['invented ID', '{"id":"invented"}']]) {
    await t.test(name!, async t => {
      const f = await fixture(t);
      await fs.writeFile(f.manifest, text!);
      await assert.rejects(setup({ ...noOpen, manifest: f.manifest }, f.environment), /Figma manifest|numeric ID/);
      assert.equal(await fs.readFile(f.manifest, 'utf8'), text);
      assert.equal(f.commands.length, 0);
      assert.equal(f.prompts.length, 0);
      await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
      await assert.rejects(fs.access(path.join(f.root, '.pi')));
    });
  }
});

test('native picker timeout or launch failure allows path entry without restarting setup', async t => {
  for (const message of ['/usr/bin/osascript timed out', 'spawn /usr/bin/osascript ENOENT']) await t.test(message, async t => {
    const f = await fixture(t), execute = f.environment.run, question = f.environment.question;
    f.answers.push('', f.manifest, '3', 'yes');
    f.environment.run = async (command, args, options) => {
      if (!command.endsWith('osascript')) return execute(command, args, options);
      assert.equal(options?.timeoutMs, 300000);
      throw new Error(message);
    };
    f.environment.question = async prompt => {
      if (prompt.startsWith('Paste the path')) {
        await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
        await assert.rejects(fs.access(path.join(f.root, '.pi')));
      }
      return question(prompt);
    };
    const result = await setup({}, f.environment);
    assert.equal(result.configured, true);
    assert.equal(result.client, 'pi');
    assert.equal(JSON.parse(await fs.readFile(result.manifest, 'utf8')).id, '1234567890123456789');
    assert.equal(await fs.readFile(f.manifest, 'utf8'), f.original);
    assert.match(f.logs.join('\n'), /file picker could not finish/);
    assert.equal(f.prompts.filter(prompt => prompt.startsWith('Paste the path')).length, 1);
  });
});

test('cancelling manual entry after a picker failure saves no settings or plugin files', async t => {
  const f = await fixture(t), execute = f.environment.run, question = f.environment.question;
  f.answers.push('');
  f.environment.run = async (command, args, options) => {
    if (!command.endsWith('osascript')) return execute(command, args, options);
    throw new Error('/usr/bin/osascript timed out');
  };
  f.environment.question = async prompt => {
    if (prompt.startsWith('Paste the path')) throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
    return question(prompt);
  };
  await assert.rejects(setup({}, f.environment), /Setup cancelled/);
  await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
  await assert.rejects(fs.access(path.join(f.root, '.pi')));
});

test('file picker cancellation and Ctrl+C-style cancellation leave existing files alone', async t => {
  await t.test('native picker cancel', async t => {
    const f = await fixture(t);
    f.answers.push('');
    const execute = f.environment.run;
    f.environment.run = async (command, args, options) => command.endsWith('osascript')
      ? { code: 1, stdout: '', stderr: 'User canceled. (-128)' } : execute(command, args, options);
    await assert.rejects(setup({}, f.environment), /File selection cancelled/);
    assert.equal(f.prompts.length, 1, 'explicit picker cancellation must not prompt for a path');
    await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
    assert.equal(await fs.readFile(f.manifest, 'utf8'), f.original);
  });
  await t.test('terminal cancellation', async t => {
    const f = await fixture(t);
    f.environment.question = async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); };
    await assert.rejects(setup({ open: false }, f.environment), /Setup cancelled/);
    assert.equal(f.commands.length, 0);
    await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
  });
});

test('the native picker receives cancellation and reports it without saving configuration', async t => {
  const f = await fixture(t), execute = f.environment.run;
  f.answers.push('');
  f.environment.run = async (command, args, options) => {
    if (!command.endsWith('osascript')) return execute(command, args, options);
    assert.ok(options?.signal instanceof AbortSignal);
    throw Object.assign(new Error('picker cancelled'), { name: 'AbortError' });
  };
  await assert.rejects(setup({}, f.environment), /Setup cancelled/);
  assert.equal(f.prompts.length, 1, 'picker AbortError must not prompt for a path');
  await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
});

test('Claude JSON merge preserves other settings, saves a private backup, and never logs credentials', async t => {
  const f = await fixture(t), configFile = path.join(f.root, '.mcp.json');
  const original = JSON.stringify({ keep: true, mcpServers: { other: { command: 'other', env: { TOKEN: 'private-test-secret' } }, 'flutter-fidelity': { command: 'old-node', args: ['old-cli', 'mcp'] } } });
  await fs.writeFile(configFile, original);
  f.answers.push('y');
  const result = await setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment);
  const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
  assert.equal(result.configured, true);
  assert.equal(config.keep, true);
  assert.deepEqual(config.mcpServers.other, JSON.parse(original).mcpServers.other);
  assert.equal(config.mcpServers['flutter-fidelity'].command, process.execPath);
  const stateDirectory = path.join(f.root, '.fidelity/figma-plugin');
  const backups = (await fs.readdir(stateDirectory)).filter(file => file.startsWith('settings-backup-'));
  assert.equal(backups.length, 1);
  const backupDirectory = path.join(stateDirectory, backups[0]!), backup = path.join(backupDirectory, 'mcp.json');
  assert.equal(await fs.readFile(backup, 'utf8'), original);
  assert.equal(JSON.parse(await fs.readFile(path.join(backupDirectory, 'target.json'), 'utf8')).file, configFile);
  assert.equal(await fs.readFile(path.join(backupDirectory, '.gitignore'), 'utf8'), '*\n');
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(backup)).mode & 0o777, 0o600);
    assert.equal((await fs.stat(backupDirectory)).mode & 0o777, 0o700);
  }
  const gitEnvironment = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull, GIT_TEMPLATE_DIR: '' };
  execFileSync('git', ['-C', f.root, 'init', '--quiet'], { env: gitEnvironment, stdio: 'pipe' });
  const relativeBackup = path.relative(f.root, backup);
  assert.equal(execFileSync('git', ['-C', f.root, 'check-ignore', relativeBackup], { env: gitEnvironment, encoding: 'utf8' }).trim(), relativeBackup);
  assert.ok(!f.logs.join('\n').includes('private-test-secret'));
  f.answers.length = 0;
  assert.equal((await setup({ client: 'claude', open: false }, f.environment)).configured, true);
  assert.equal(f.prompts.length, 1, 'identical MCP entries do not ask to replace themselves');
});

test('Pi preserves its existing underscore alias rather than creating a duplicate server', async t => {
  const f = await fixture(t), configFile = path.join(f.root, '.pi/mcp.json');
  await fs.mkdir(path.dirname(configFile));
  await fs.writeFile(configFile, JSON.stringify({ mcpServers: { flutter_fidelity: { command: 'old' }, other: { command: 'keep' } } }));
  f.answers.push('yes');
  await setup({ manifest: f.manifest, client: 'pi', open: false }, f.environment);
  const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
  assert.deepEqual(Object.keys(config.mcpServers).sort(), ['flutter_fidelity', 'other']);
  assert.equal(config.mcpServers.flutter_fidelity.timeout, 1200);
  const adapterFile = path.join(f.root, '.pi/mcp-adapter.json');
  const adapter = JSON.parse(await fs.readFile(adapterFile, 'utf8'));
  assert.deepEqual(Object.keys(adapter.mcpServers), ['flutter_fidelity']);
  assert.equal(adapter.mcpServers.flutter_fidelity.lifecycle, 'lazy-keep-alive');
  const before = await fs.readFile(configFile, 'utf8');
  const duplicate = { ...config, mcpServers: { ...config.mcpServers, 'flutter-fidelity': { command: 'duplicate' } } };
  await fs.writeFile(configFile, JSON.stringify(duplicate));
  await assert.rejects(setup({ client: 'pi', open: false }, f.environment), /Duplicate Pi server names/);
  assert.equal(await fs.readFile(configFile, 'utf8'), JSON.stringify(duplicate));
  assert.ok(before.includes('other'));
});

test('Pi adapter setup preserves shared plugin templates and unrelated adapter settings', async t => {
  const f = await fixture(t), sharedFile = path.join(f.root, '.mcp.json'), adapterFile = path.join(f.root, '.pi/mcp-adapter.json');
  const shared = '{"mcpServers":{"flutter-fidelity":{"command":"node","args":["${CLAUDE_PLUGIN_ROOT}/dist/cli.js","mcp"]}}}';
  const existing = { settings: { idleTimeout: 7 }, mcpServers: { other: { command: 'keep', env: { TOKEN: 'private-adapter-secret' } } } };
  await fs.mkdir(path.dirname(adapterFile));
  await fs.writeFile(sharedFile, shared);
  await fs.writeFile(adapterFile, JSON.stringify(existing));
  f.answers.push('yes');
  assert.equal((await setup({ manifest: f.manifest, client: 'pi', open: false }, f.environment)).configured, true);
  assert.equal(await fs.readFile(sharedFile, 'utf8'), shared);
  const adapter = JSON.parse(await fs.readFile(adapterFile, 'utf8'));
  assert.deepEqual(adapter.settings, existing.settings);
  assert.deepEqual(adapter.mcpServers.other, existing.mcpServers.other);
  assert.equal(adapter.mcpServers['flutter-fidelity'].args[0], path.resolve('dist/cli.js'));
  assert.equal(adapter.mcpServers['flutter-fidelity'].lifecycle, 'lazy-keep-alive');
  assert.ok(!f.logs.join('\n').includes('private-adapter-secret'));
  const before = await fs.stat(adapterFile);
  await setup({ client: 'pi', open: false }, f.environment);
  assert.equal((await fs.stat(adapterFile)).mtimeMs, before.mtimeMs);
  assert.equal(f.prompts.length, 1, 'matching native and adapter entries need no additional consent');
});

test('Pi preflights both configuration files before changing either one', async t => {
  for (const kind of ['invalid JSON', 'conflicting aliases', 'symlink']) await t.test(kind, async t => {
    const f = await fixture(t), nativeFile = path.join(f.root, '.pi/mcp.json'), adapterFile = path.join(f.root, '.pi/mcp-adapter.json');
    const original = '{"mcpServers":{"flutter_fidelity":{"command":"keep-original"}}}';
    await fs.mkdir(path.dirname(nativeFile));
    await fs.writeFile(nativeFile, original);
    if (kind === 'symlink') {
      const target = path.join(f.root, 'other-settings.json');
      await fs.writeFile(target, '{}');
      await fs.symlink(target, adapterFile);
    } else await fs.writeFile(adapterFile, kind === 'invalid JSON' ? '{' : '{"mcpServers":{"flutter-fidelity":{"command":"other"}}}');
    const before = await fs.readFile(adapterFile, 'utf8');
    await assert.rejects(setup({ manifest: f.manifest, client: 'pi', open: false }, f.environment), /kept it unchanged|Duplicate Pi server names|symlink/);
    assert.equal(await fs.readFile(nativeFile, 'utf8'), original);
    assert.equal(await fs.readFile(adapterFile, 'utf8'), before);
    assert.equal(f.prompts.length, 0);
  });
});

test('partial Pi setup names saved and unfinished settings, preserves newer edits, and retries safely', async t => {
  const f = await fixture(t), nativeFile = path.join(f.root, '.pi/mcp.json'), adapterFile = path.join(f.root, '.pi/mcp-adapter.json');
  await fs.mkdir(path.dirname(nativeFile));
  await fs.writeFile(adapterFile, '{}');
  const newer = JSON.stringify({ newer: true, mcpServers: { other: { command: 'keep', env: { TOKEN: 'private-newer-secret' } } } });
  f.environment.question = async () => { await fs.writeFile(adapterFile, newer); return 'yes'; };
  await assert.rejects(setup({ manifest: f.manifest, client: 'pi', open: false }, f.environment), error => {
    const message = (error as Error).message;
    assert.match(message, /Settings changed during setup.*partially complete/);
    assert.ok(message.includes(`Saved: ${nativeFile}`));
    assert.ok(message.includes(`Not completed: ${adapterFile}`));
    assert.match(message, /No automatic rollback.*rerun setup/);
    assert.ok(!message.includes('private-newer-secret'));
    return true;
  });
  assert.equal(await fs.readFile(adapterFile, 'utf8'), newer);
  const native = await fs.readFile(nativeFile, 'utf8'), before = await fs.stat(nativeFile);
  assert.equal(JSON.parse(native).mcpServers['flutter-fidelity'].command, process.execPath);
  const prompts: string[] = [];
  f.environment.question = async prompt => { prompts.push(prompt); return 'yes'; };
  assert.equal((await setup({ client: 'pi', open: false }, f.environment)).configured, true);
  assert.equal(await fs.readFile(nativeFile, 'utf8'), native);
  assert.equal((await fs.stat(nativeFile)).mtimeMs, before.mtimeMs);
  assert.equal(prompts.length, 1);
  assert.ok(prompts[0]!.includes(adapterFile) && !prompts[0]!.includes(nativeFile));
  const adapter = JSON.parse(await fs.readFile(adapterFile, 'utf8'));
  assert.deepEqual(adapter.mcpServers.other, JSON.parse(newer).mcpServers.other);
  assert.equal(adapter.newer, true);
  assert.equal(adapter.mcpServers['flutter-fidelity'].lifecycle, 'lazy-keep-alive');
  assert.ok(!f.logs.join('\n').includes('private-newer-secret'));
});

test('cancellation after the first Pi write still reports partial configuration', async t => {
  const f = await fixture(t), nativeFile = path.join(f.root, '.pi/mcp.json'), adapterFile = path.join(f.root, '.pi/mcp-adapter.json');
  const controller = new AbortController(), log = f.environment.log;
  t.mock.method(globalThis, 'AbortController', function () { return controller; });
  f.environment.log = message => {
    log(message);
    if (message === `Saved project MCP configuration: ${nativeFile}`) controller.abort();
  };
  f.answers.push('yes');
  await assert.rejects(setup({ manifest: f.manifest, client: 'pi', open: false }, f.environment), error => {
    const message = (error as Error).message;
    assert.match(message, /Setup cancelled.*partially complete/);
    assert.ok(message.includes(`Saved: ${nativeFile}`));
    assert.ok(message.includes(`Not completed: ${adapterFile}`));
    return true;
  });
  assert.equal(JSON.parse(await fs.readFile(nativeFile, 'utf8')).mcpServers['flutter-fidelity'].command, process.execPath);
  await assert.rejects(fs.access(adapterFile));
});

test('declining Pi configuration creates neither native nor adapter settings', async t => {
  const f = await fixture(t);
  f.answers.push('');
  assert.equal((await setup({ manifest: f.manifest, client: 'pi', open: false }, f.environment)).configured, false);
  await assert.rejects(fs.access(path.join(f.root, '.pi/mcp.json')));
  await assert.rejects(fs.access(path.join(f.root, '.pi/mcp-adapter.json')));
});

test('declining JSON changes keeps original bytes and creates no configuration backup', async t => {
  const f = await fixture(t), configFile = path.join(f.root, '.mcp.json');
  const before = '{"mcpServers":{"flutter-fidelity":{"command":"keep-this"}}}';
  await fs.writeFile(configFile, before);
  f.answers.push('');
  const result = await setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment);
  assert.equal(result.configured, false);
  assert.equal(await fs.readFile(configFile, 'utf8'), before);
  assert.equal((await fs.readdir(path.join(f.root, '.fidelity/figma-plugin'))).filter(file => file.startsWith('settings-backup-')).length, 0);
  assert.match(f.logs.join('\n'), /MCP settings unchanged/);
});

test('invalid MCP JSON is never replaced', async t => {
  for (const before of ['{', '[]', '{"mcpServers":[]}', '{"mcpServers":null}']) {
    await t.test(before, async t => {
      const f = await fixture(t), file = path.join(f.root, '.mcp.json');
      await fs.writeFile(file, before);
      await assert.rejects(setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment), /kept it unchanged/);
      assert.equal(await fs.readFile(file, 'utf8'), before);
      assert.equal(f.prompts.length, 0);
    });
  }
});

test('setup refuses symlinked output directories and MCP config files', async t => {
  await t.test('output directory', async t => {
    const f = await fixture(t), target = path.join(f.root, 'kept-directory');
    await fs.mkdir(target);
    await fs.symlink(target, path.join(f.root, '.fidelity'), 'junction');
    await assert.rejects(setup({ ...noOpen, manifest: f.manifest }, f.environment), /will not write through a symlink/);
    assert.deepEqual(await fs.readdir(target), []);
  });
  await t.test('configuration file', async t => {
    const f = await fixture(t), target = path.join(f.root, 'kept-config.json');
    const before = '{"keep":true}';
    await fs.writeFile(target, before);
    await fs.symlink(target, path.join(f.root, '.mcp.json'));
    await assert.rejects(setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment), /will not write through a symlink/);
    assert.equal(await fs.readFile(target, 'utf8'), before);
  });
});

test('an edit between final validation and replacement is recovered without losing its bytes', async t => {
  const f = await fixture(t), file = path.join(f.root, '.mcp.json'), rename = fs.rename;
  await fs.writeFile(file, '{}');
  const newer = '{"edited":"at replacement"}';
  let injected = false;
  t.mock.method(fs, 'rename', async (source: Parameters<typeof fs.rename>[0], destination: Parameters<typeof fs.rename>[1]) => {
    if (source === file && !injected) { injected = true; await fs.writeFile(file, newer); }
    return rename(source, destination);
  });
  f.answers.push('y');
  await assert.rejects(setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment), /Settings changed during setup/);
  assert.equal(injected, true);
  assert.equal(await fs.readFile(file, 'utf8'), newer);
  await assert.rejects(fs.access(`${file}.flutter-fidelity.lock`));
});

test('a competing replacement is never overwritten and original settings remain recoverable', async t => {
  const f = await fixture(t), file = path.join(f.root, '.mcp.json'), link = fs.link;
  const before = '{"keep":"original"}', newer = '{"keep":"concurrent"}';
  await fs.writeFile(file, before);
  let injected = false;
  t.mock.method(fs, 'link', async (source: Parameters<typeof fs.link>[0], destination: Parameters<typeof fs.link>[1]) => {
    if (destination === file && path.basename(String(source)) === 'new.json' && !injected) {
      injected = true; await fs.writeFile(file, newer);
    }
    return link(source, destination);
  });
  f.answers.push('y');
  await assert.rejects(setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment), /Previous settings are preserved/);
  assert.equal(injected, true);
  assert.equal(await fs.readFile(file, 'utf8'), newer);
  const directory = path.join(f.root, '.fidelity/figma-plugin');
  const backups = (await fs.readdir(directory)).filter(name => name.startsWith('settings-backup-'));
  assert.equal(backups.length, 1);
  assert.equal(await fs.readFile(path.join(directory, backups[0]!, 'mcp.json'), 'utf8'), before);
});

test('cooperating setup writers are serialized by an exclusive lock', async t => {
  const f = await fixture(t), file = path.join(f.root, '.mcp.json'), link = fs.link;
  await setup({ ...noOpen, manifest: f.manifest }, f.environment);
  await fs.writeFile(file, '{"keep":true}');
  let ready!: () => void, release!: () => void, paused = false;
  const atReplacement = new Promise<void>(resolve => { ready = resolve; });
  const proceed = new Promise<void>(resolve => { release = resolve; });
  t.after(() => release());
  t.mock.method(fs, 'link', async (source: Parameters<typeof fs.link>[0], destination: Parameters<typeof fs.link>[1]) => {
    if (destination === file && path.basename(String(source)) === 'new.json' && !paused) { paused = true; ready(); await proceed; }
    return link(source, destination);
  });
  const environment = { ...f.environment, question: async () => 'yes' };
  const first = setup({ client: 'claude', open: false }, environment);
  try {
    await Promise.race([atReplacement, first.then(() => { throw new Error('Writer did not reach replacement'); })]);
    await assert.rejects(setup({ client: 'claude', open: false }, environment), /Another setup may be saving/);
  } finally { release(); }
  await first;
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).keep, true);
  await assert.rejects(fs.access(`${file}.flutter-fidelity.lock`));
});

test('unsupported hard links do not move or overwrite existing settings', async t => {
  const f = await fixture(t), file = path.join(f.root, '.mcp.json'), link = fs.link;
  await setup({ ...noOpen, manifest: f.manifest }, f.environment);
  const before = '{"keep":"original"}';
  await fs.writeFile(file, before);
  t.mock.method(fs, 'link', async (source: Parameters<typeof fs.link>[0], destination: Parameters<typeof fs.link>[1]) => {
    if (path.basename(String(destination)) === 'link-check') throw Object.assign(new Error('not supported'), { code: 'ENOTSUP' });
    return link(source, destination);
  });
  f.answers.push('y');
  await assert.rejects(setup({ client: 'claude', open: false }, f.environment), /filesystem cannot safely replace settings/);
  assert.equal(await fs.readFile(file, 'utf8'), before);
  await assert.rejects(fs.access(`${file}.flutter-fidelity.lock`));
});

test('settings changed while awaiting consent are preserved instead of being overwritten', async t => {
  const f = await fixture(t), file = path.join(f.root, '.mcp.json');
  await fs.writeFile(file, '{}');
  const newer = '{"newer":"settings"}';
  f.environment.question = async () => { await fs.writeFile(file, newer); return 'yes'; };
  await assert.rejects(setup({ manifest: f.manifest, client: 'claude', open: false }, f.environment), /Settings changed during setup/);
  assert.equal(await fs.readFile(file, 'utf8'), newer);
  assert.equal((await fs.readdir(f.root)).some(file => file.endsWith('.tmp')), false);
});

test('Codex uses its own CLI only after explicit user-level configuration consent', async t => {
  const f = await fixture(t);
  f.answers.push('y');
  const result = await setup({ manifest: f.manifest, client: 'codex', open: false }, f.environment);
  assert.equal(result.configured, true);
  const codex = f.commands.find(call => call.command === 'codex');
  assert.deepEqual(codex?.args, ['mcp', 'add', 'flutter-fidelity', '--', process.execPath, path.resolve('dist/cli.js'), 'mcp']);
  assert.equal(codex?.options?.cwd, f.root);
  assert.match(f.prompts[0]!, /user-level/);
  await assert.rejects(fs.access(path.join(f.root, '.codex')));
  const declined = await fixture(t);
  declined.answers.push('n');
  assert.equal((await setup({ manifest: declined.manifest, client: 'codex', open: false }, declined.environment)).configured, false);
  assert.equal(declined.commands.some(call => call.command === 'codex'), false);
});

test('Windows Codex uses npm entry points or native executables without invoking a shell', async t => {
  for (const native of [false, true]) await t.test(native ? 'native exe' : 'npm cmd shim', async t => {
    const f = await fixture(t), execute = f.environment.run;
    f.environment.platform = 'win32'; f.answers.push('y');
    const directory = path.join(f.root, "npm bin & don't-run");
    const script = path.join(directory, 'node_modules/@openai/codex/bin/codex.js');
    await fs.mkdir(path.dirname(script), { recursive: true });
    await fs.writeFile(script, '// fixture, never executed\n');
    const launcher = path.join(directory, native ? 'codex.exe' : 'codex.cmd');
    f.environment.run = async (command, args, options) => command === 'where.exe'
      ? { code: 0, stdout: `${launcher}\r\n`, stderr: '' } : execute(command, args, options);
    assert.equal((await setup({ manifest: f.manifest, client: 'codex', open: false }, f.environment)).configured, true);
    const saved = f.commands.find(call => call.args.includes('add'));
    assert.equal(saved?.command, native ? launcher : process.execPath);
    assert.deepEqual(saved?.args, [...(native ? [] : [script]), 'mcp', 'add', 'flutter-fidelity', '--', process.execPath, path.resolve('dist/cli.js'), 'mcp']);
    assert.equal(f.commands.some(call => /cmd\.exe|powershell|codex\.cmd/i.test(call.command)), false);
    await assert.rejects(fs.access(path.join(f.root, '.codex')));
  });
});

test('an unsupported Windows Codex shim asks for a supported installation without running it', async t => {
  const f = await fixture(t), execute = f.environment.run;
  f.environment.platform = 'win32'; f.answers.push('y');
  f.environment.run = async (command, args, options) => command === 'where.exe'
    ? { code: 0, stdout: `${path.join(f.root, 'other-bin/codex.cmd')}\r\n`, stderr: '' } : execute(command, args, options);
  await assert.rejects(setup({ manifest: f.manifest, client: 'codex', open: false }, f.environment), /Windows Codex shim but not its npm entry point/);
  assert.equal(f.commands.some(call => call.args.includes('add')), false);
});

test('Codex failures retain the prepared plugin, distinguish missing CLI, and do not echo private diagnostics', async t => {
  for (const code of ['ENOENT', 'ETIMEDOUT', 'exit']) await t.test(code, async t => {
    const f = await fixture(t), execute = f.environment.run;
    f.answers.push('yes');
    f.environment.run = async (command, args, options) => {
      if (command !== 'codex') return execute(command, args, options);
      if (code !== 'exit') throw Object.assign(new Error('private-codex-configuration'), { code });
      return { code: 1, stdout: '', stderr: 'private-codex-configuration' };
    };
    await assert.rejects(setup({ manifest: f.manifest, client: 'codex', open: false }, f.environment), error => {
      const message = (error as Error).message;
      assert.match(message, code === 'ENOENT' ? /CLI was not found/ : /could not (complete|save)/);
      assert.ok(!(message + f.logs.join('\n')).includes('private-codex-configuration'));
      return true;
    });
    await fs.access(path.join(f.root, '.fidelity/figma-plugin/setup.json'));
    await assert.rejects(fs.access(path.join(f.root, '.codex')));
  });
});

test('missing Figma and failed launches give actionable results without claiming a connection', async t => {
  await t.test('Figma missing', async t => {
    const f = await fixture(t);
    f.environment.run = async () => ({ code: 1, stdout: '', stderr: '' });
    await assert.rejects(setup({ manifest: f.manifest, client: 'skip' }, f.environment), /Figma Desktop was not found/);
    await assert.rejects(fs.access(path.join(f.root, '.fidelity')));
  });
  await t.test('file manager launch failed', async t => {
    const f = await fixture(t), execute = f.environment.run;
    f.environment.run = async (command, args, options) => args[0] === '-R' ? { code: 1, stdout: '', stderr: '' } : execute(command, args, options);
    const result = await setup({ manifest: f.manifest, client: 'skip' }, f.environment);
    await fs.access(result.manifest);
    assert.match(f.logs.join('\n'), /Could not open/);
    assert.equal(result.configured, false);
  });
});

test('no-open never launches a file picker, while Windows receives literal paths without a shell', async t => {
  const f = await fixture(t);
  f.answers.push('');
  await assert.rejects(setup({ open: false }, f.environment), /No manifest selected/);
  assert.equal(f.commands.length, 0);
  const windows = await fixture(t);
  windows.environment.platform = 'win32';
  const result = await setup({ manifest: windows.manifest, client: 'skip' }, windows.environment);
  const explorer = windows.commands.filter(call => call.command === 'explorer.exe');
  assert.deepEqual(explorer.map(call => call.args), [['figma://'], [`/select,${result.manifest}`]]);
});

test('built setup command prepares and reuses a plugin from another cwd without GUI or global changes', async t => {
  const f = await fixture(t), cli = path.resolve('dist/cli.js');
  const invoke = (args: string[]) => execFileSync(process.execPath, [cli, 'setup', ...args], { cwd: f.root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  const output = invoke(['--manifest', f.manifest, '--client', 'skip', '--no-open']);
  assert.match(output, /Prepared a new plugin copy/);
  assert.match(invoke(['--client', 'skip', '--no-open']), /Reusing unchanged plugin files/);
  assert.equal(await fs.readFile(f.manifest, 'utf8'), f.original);
  assert.match(execFileSync(process.execPath, [cli, 'setup', '--help'], { encoding: 'utf8' }), /--no-open/);
  const empty = await fixture(t);
  assert.throws(() => execFileSync(process.execPath, [cli, 'setup', '--no-open'], { cwd: empty.root, stdio: ['pipe', 'pipe', 'pipe'] }), error => {
    assert.match((error as { stderr: Buffer }).stderr.toString(), /interactive terminal/);
    return true;
  });
  await assert.rejects(fs.access(path.join(empty.root, '.fidelity')));
});
