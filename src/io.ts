import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import type { Rect } from './schema.js';
export async function json(file: string): Promise<unknown> { return JSON.parse(await fs.readFile(file, 'utf8')); }
export async function writeJson(file: string, value: unknown) { await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n'); }
export async function hash(file: string) { return createHash('sha256').update(await fs.readFile(file)).digest('hex'); }
export async function inside(root: string, relative: string) {
  const resolved = path.resolve(root, relative);
  const rel = path.relative(path.resolve(root), resolved);
  if (rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel)) throw new Error(`Path escapes bundle: ${relative}`);
  const realRoot = await fs.realpath(root), realFile = await fs.realpath(resolved);
  const realRel = path.relative(realRoot, realFile);
  if (realRel.startsWith('..' + path.sep) || realRel === '..' || path.isAbsolute(realRel)) throw new Error('Symlink escapes bundle');
  return realFile;
}
export async function createOutput(directory: string) {
  const absolute = path.resolve(directory);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.mkdir(absolute); // Fail rather than overwrite an existing reference or run.
  return absolute;
}
export function assertRect(rect: Rect, width: number, height: number, integral = false) {
  if (rect.x + rect.width > width + 1e-6 || rect.y + rect.height > height + 1e-6) throw new Error('Region/crop lies outside image or viewport');
  if (integral && Object.values(rect).some(v => !Number.isInteger(v))) throw new Error('Image crop must use integer pixels');
}
export async function pixels(file: string) {
  const { data, info } = await sharp(file, { limitInputPixels: 64_000_000 }).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}
export type ProcessResult = { code: number; stdout: string; stderr: string };
export async function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {}): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { detached: process.platform !== 'win32', cwd: options.cwd, env: { ...process.env, ...options.env }, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const terminate = (signal: NodeJS.Signals) => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal); else child.kill(signal); } catch { /* Already exited. */ } };
    const timer = setTimeout(() => { timedOut = true; terminate('SIGTERM'); }, options.timeoutMs ?? 30000);
    const hardStop = setTimeout(() => { if (timedOut) terminate('SIGKILL'); }, (options.timeoutMs ?? 30000) + 3000);
    child.stdout.on('data', data => { stdout = (stdout + data).slice(-1_000_000); });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-1_000_000); });
    child.on('error', error => { clearTimeout(timer); clearTimeout(hardStop); reject(error); });
    child.on('close', code => { if (timedOut) terminate('SIGKILL'); clearTimeout(timer); clearTimeout(hardStop); if (timedOut) reject(Object.assign(new Error(`${command} timed out`), { stdout, stderr })); else resolve({ code: code ?? 1, stdout, stderr }); });
  });
}
