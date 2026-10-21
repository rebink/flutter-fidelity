import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { getEventListeners } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import { run } from '../src/io.js';
test('process timeout stops the spawned process group and preserves diagnostic output', async () => {
  // Allow Node startup under the parallel suite before testing timeout cleanup.
  await assert.rejects(run(process.execPath,['-e','console.log("capture-started"); setInterval(() => {}, 1000)'],{timeoutMs:1000}), error => {
    const e=error as Error & {stdout:string};assert.match(e.message,/timed out/);assert.match(e.stdout,/capture-started/);return true;
  });
});

test('process cancellation reaps even a detached child that ignores SIGTERM', { timeout: 20000 }, async t => {
  for (const stubborn of [false, true]) await t.test(stubborn ? 'SIGKILL fallback' : 'normal cancellation', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-cancel-'));
    const marker = path.join(root, 'ready'), controller = new AbortController();
    const script = `${stubborn ? 'process.on("SIGTERM", () => {});' : ''}const fs=require("fs");fs.writeSync(1,"picker-ready "+process.pid+"\\n");fs.writeFileSync(${JSON.stringify(marker)},String(process.pid));setInterval(() => {},1000);`;
    const pending = run(process.execPath, ['-e', script], { timeoutMs: 10000, signal: controller.signal });
    void pending.catch(() => {});
    t.after(async () => { controller.abort(); await pending.catch(() => {}); await fs.rm(root, { recursive: true, force: true }); });
    let ready = false;
    const deadline = Date.now() + 5000;
    while (!ready && Date.now() < deadline) {
      try { ready = /^\d+$/.test(await fs.readFile(marker, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (!ready) await delay(10);
    }
    assert.equal(ready, true, 'child must install its signal handler before cancellation');
    controller.abort();
    await assert.rejects(pending, error => {
      const failure = error as Error & { stdout: string };
      assert.equal(failure.name, 'AbortError');
      assert.match(failure.stdout, /picker-ready/);
      const pid = Number(failure.stdout.match(/picker-ready (\d+)/)![1]);
      assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
      return true;
    });
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
});

test('pre-aborted commands never start and successful commands detach their abort listener', async () => {
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(run('fidelity-command-that-does-not-exist', [], { signal: cancelled.signal }), { name: 'AbortError' });
  const controller = new AbortController();
  assert.equal((await run(process.execPath, ['-e', 'console.log("done")'], { signal: controller.signal })).code, 0);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  controller.abort();
});
