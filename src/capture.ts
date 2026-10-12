import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CaptureConfigSchema, CaptureSchema } from './schema.js';
import { createOutput, json, run, writeJson } from './io.js';
import { loadReference } from './reference.js';
export async function captureUI(options: { bundle: string; config: unknown; out: string }) {
  const config = CaptureConfigSchema.parse(options.config);
  const { root, bundle } = await loadReference(options.bundle);
  const projectRoot = await fs.realpath(config.projectRoot);
  const target = path.resolve(projectRoot, config.target);
  if (!target.startsWith(projectRoot + path.sep)) throw new Error('Capture target must be inside projectRoot');
  await fs.access(target);
  if (config.driver) {
    const driver = path.resolve(projectRoot, config.driver);
    if (!driver.startsWith(projectRoot + path.sep)) throw new Error('Capture driver must be inside projectRoot');
    await fs.access(driver);
  }
  const version = await run(config.flutter, ['--version', '--machine'], { cwd: projectRoot, timeoutMs: config.timeoutMs });
  if (version.code !== 0) throw new Error(`Flutter version check failed: ${version.stderr}`);
  const start = version.stdout.indexOf('{'), end = version.stdout.lastIndexOf('}');
  const flutterInfo = JSON.parse(version.stdout.slice(start, end + 1)) as { frameworkVersion: string };
  const out = await createOutput(options.out);
  const request = { version: 1, output: out, profile: bundle.profile, referenceSha256: bundle.reference.sha256, fonts: bundle.fonts.map(f => ({ ...f, path: path.join(root, f.path) })), mode: config.mode, flutterVersion: flutterInfo.frameworkVersion };
  const encoded = Buffer.from(JSON.stringify(request)).toString('base64');
  const args = config.mode === 'widget' ? ['test', config.target, `--dart-define=FIDELITY_REQUEST=${encoded}`] : ['drive', `--driver=${config.driver}`, `--target=${config.target}`, `--device-id=${config.deviceId}`, `--dart-define=FIDELITY_REQUEST=${encoded}`];
  await writeJson(path.join(out, 'request.json'), request);
  const analysis = await run(config.flutter, ['analyze', '--no-pub'], { cwd: projectRoot, timeoutMs: config.timeoutMs });
  await fs.writeFile(path.join(out, 'analysis.log'), analysis.stdout + analysis.stderr);
  const result = await run(config.flutter, args, { cwd: projectRoot, env: { FIDELITY_CAPTURE_OUTPUT: out }, timeoutMs: config.timeoutMs }).catch(async error => {
    await fs.writeFile(path.join(out, 'capture.log'), `${error.stdout ?? ''}${error.stderr ?? ''}\n${String(error)}`);
    throw new Error(`Flutter capture failed. Logs preserved at ${out}/capture.log: ${String(error)}`);
  });
  await fs.writeFile(path.join(out, 'capture.log'), result.stdout + result.stderr);
  if (result.code !== 0) throw new Error(`Flutter capture failed (exit ${result.code}). Logs preserved at ${out}/capture.log`);
  const metadata = CaptureSchema.parse(await json(path.join(out, 'capture.json')));
  if (metadata.referenceSha256 !== bundle.reference.sha256 || JSON.stringify(metadata.profile) !== JSON.stringify(bundle.profile)) throw new Error('Harness returned a capture for a different reference/profile');
  if (metadata.mode !== config.mode || metadata.flutterVersion !== flutterInfo.frameworkVersion) throw new Error('Harness environment does not match requested capture');
  const image = await sharp(path.join(out, 'actual.png')).metadata();
  if (image.width !== bundle.image.width || image.height !== bundle.image.height) throw new Error('Harness image dimensions do not match reference');
  metadata.checks.analysis = analysis.code === 0 ? 'passed' : 'failed';
  await writeJson(path.join(out, 'capture.json'), metadata);
  await writeJson(path.join(out, 'environment.json'), flutterInfo);
  return { directory: out, image: path.join(out, 'actual.png'), capture: metadata };
}
