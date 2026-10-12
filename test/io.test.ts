import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/io.js';
test('process timeout stops the spawned process group and preserves diagnostic output', async () => {
  await assert.rejects(run(process.execPath,['-e','console.log("capture-started"); setInterval(() => {}, 1000)'],{timeoutMs:150}), error => {
    const e=error as Error & {stdout:string};assert.match(e.message,/timed out/);assert.match(e.stdout,/capture-started/);return true;
  });
});
