import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function npmCommand(directory, args) {
  // npm supplies its CLI path on every platform, avoiding a shell or npm.cmd quoting.
  if (!process.env.npm_execpath) throw new Error('Run this updater through npm run update.');
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd: directory, stdio: 'inherit', timeout: 600_000 });
}

export function updateCheckout(directory, { check = false, runNpm = npmCommand, log = console.log } = {}) {
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 }).trim();
  if (realpathSync(git('rev-parse', '--show-toplevel')) !== realpathSync(directory)) throw new Error('Run the updater in a full Flutter Fidelity Git clone, not a copied package or host cache.');
  if (git('status', '--porcelain', '--untracked-files=all')) throw new Error('Local changes or untracked files found. Commit or move your changes before updating; nothing was overwritten.');
  let branch;
  try { branch = git('symbolic-ref', '--quiet', '--short', 'HEAD'); }
  catch { throw new Error('A pinned/detached checkout is not updated automatically. Switch to your tracking branch first.'); }
  if (!branch) throw new Error('A pinned/detached checkout is not updated automatically. Switch to your tracking branch first.');
  let remote, upstreamBranch;
  try {
    remote = git('config', '--get', `branch.${branch}.remote`);
    upstreamBranch = git('config', '--get', `branch.${branch}.merge`);
  } catch { throw new Error('No upstream configured. Configure a trusted remote tracking branch before updating.'); }
  if (!remote || remote === '.' || remote.startsWith('-') || !upstreamBranch.startsWith('refs/heads/')) throw new Error('Expected a remote tracking branch; no update performed.');
  const before = git('rev-parse', 'HEAD');
  const currentVersion = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')).version;
  log(`Checking ${remote}/${upstreamBranch.slice('refs/heads/'.length)} from ${currentVersion} (${before.slice(0, 12)})…`);
  git('fetch', '--no-tags', remote, upstreamBranch);
  const target = git('rev-parse', '--verify', 'FETCH_HEAD^{commit}');
  try { git('merge-base', '--is-ancestor', before, target); }
  catch { throw new Error('Local commits or diverged history prevent a fast-forward. Resolve the branch manually; no reset, stash or rebase was performed.'); }
  const nextPackage = JSON.parse(git('show', `${target}:package.json`));
  if (nextPackage.name !== 'flutter-fidelity') throw new Error('Upstream is not a Flutter Fidelity package.');
  log(`${before === target ? 'Current' : 'Available'}: ${nextPackage.version} (${target.slice(0, 12)})`);
  if (check) return { before, target, version: nextPackage.version, updated: false };
  // Recheck immediately before mutation in case files changed during the fetch.
  if (git('rev-parse', 'HEAD') !== before || git('symbolic-ref', '--quiet', '--short', 'HEAD') !== branch || git('status', '--porcelain', '--untracked-files=all')) throw new Error('Checkout changed during the update check; retry after resolving local work.');
  git('merge', '--ff-only', '--no-autostash', '--no-overwrite-ignore', target);
  try {
    runNpm(directory, ['ci']);
    runNpm(directory, ['run', 'check']);
  } catch (error) {
    throw new Error(`Checkout is at ${target.slice(0, 12)}, but dependency installation or validation failed. Previous revision: ${before}. Fix the reported error and rerun npm run update; this is not a verified update. No automatic reset was performed.`, { cause: error });
  }
  log(`Validated Flutter Fidelity ${nextPackage.version}. Restart the MCP process and refresh/reload the plugin through your host; host-managed cached copies are not modified by this command.`);
  return { before, target, version: nextPackage.version, updated: before !== target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Usage: npm run update [-- --check]');
    updateCheckout(root, { check: args[0] === '--check' });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
