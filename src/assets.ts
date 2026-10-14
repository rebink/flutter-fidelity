import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

function fontMetadata(bytes: Buffer) {
  if (bytes.length < 12) throw new Error('Truncated font header');
  const count = bytes.readUInt16BE(4);
  if (!count || count > 4096 || 12 + count * 16 > bytes.length) throw new Error('Invalid font table directory');
  const tables = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const entry = 12 + i * 16, offset = bytes.readUInt32BE(entry + 8), length = bytes.readUInt32BE(entry + 12);
    if (offset + length > bytes.length) throw new Error('Font table exceeds file bounds');
    tables.set(bytes.toString('ascii', entry, entry + 4), bytes.subarray(offset, offset + length));
  }
  for (const table of ['head', 'maxp', 'name', 'cmap']) if (!tables.has(table)) throw new Error(`Missing font table: ${table}`);
  const head = tables.get('head')!;
  if (head.length < 54 || head.readUInt32BE(12) !== 0x5f0f3cf5) throw new Error('Invalid font head table');
  const name = tables.get('name')!;
  if (name.length < 6) throw new Error('Invalid font name table');
  const records = name.readUInt16BE(2), storage = name.readUInt16BE(4);
  if (6 + records * 12 > name.length) throw new Error('Truncated font names');
  const names: Record<number, string> = {};
  for (let i = 0; i < records; i++) {
    const offset = 6 + i * 12, platform = name.readUInt16BE(offset), id = name.readUInt16BE(offset + 6);
    const length = name.readUInt16BE(offset + 8), start = storage + name.readUInt16BE(offset + 10);
    if (start + length > name.length) throw new Error('Font name exceeds table bounds');
    if (![0, 3].includes(platform) || length % 2) continue;
    const value = Buffer.from(name.subarray(start, start + length)).swap16().toString('utf16le');
    if (value && !names[id]) names[id] = value;
  }
  const family = names[16] ?? names[1], style = names[17] ?? names[2];
  if (!family) throw new Error('No supported Unicode family name');
  const os2 = tables.get('OS/2');
  return { family, style, weight: os2 && os2.length >= 6 ? os2.readUInt16BE(4) : null,
    variable: tables.has('fvar'), scope: 'sfnt structure and names; glyph coverage and Flutter rendering require separate checks' };
}

/** Read-only validation. Never downloads, converts or overwrites source files. */
export async function validateAssets(files: string[]) {
  if (!files.length) throw new Error('Supply at least one asset file');
  const results = [];
  for (const file of files) {
    const absolute = path.resolve(file);
    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile() || stat.size < 4 || stat.size > 64 * 1024 * 1024) throw new Error('Expected a regular asset file of 4 bytes to 64 MiB');
      const bytes = await fs.readFile(absolute), sha256 = createHash('sha256').update(bytes).digest('hex');
      const signature = bytes.toString('ascii', 0, 4), extension = path.extname(file).toLowerCase();
      if (signature === 'OTTO' || bytes.readUInt32BE(0) === 0x00010000 || signature === 'true') {
        const format = signature === 'OTTO' ? 'otf' : 'ttf';
        if (extension !== `.${format}`) throw new Error(`Font bytes are ${format}, extension is ${extension}`);
        results.push({ path: absolute, status: 'validated', sha256, bytes: stat.size, format, font: fontMetadata(bytes) });
        continue;
      }
      if (['wOFF', 'wOF2', 'ttcf'].includes(signature)) throw new Error('Unsupported font container; obtain original TTF/OTF files');
      const prefix = bytes.subarray(0, 512).toString('utf8');
      if (/<!doctype\s+html|<html[\s>]/i.test(prefix)) throw new Error('HTML/login response is not an asset');
      if (extension === '.svg') {
        const xml = bytes.toString('utf8');
        if (/<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|<\?xml-stylesheet\b|@import|\\|\bon\w+\s*=/i.test(xml)) throw new Error('SVG contains unsupported active content or entities');
        const links = [...xml.matchAll(/(?:href\s*=\s*["']([^"']*)["']|url\(\s*["']?([^)'"\s]+))/gi)];
        if (links.some(match => !(match[1] ?? match[2] ?? '').startsWith('#'))) throw new Error('SVG external/embedded resources require a self-contained source export');
      }
      const meta = await sharp(bytes, { limitInputPixels: 64_000_000 }).metadata();
      const extensions: Record<string, string[]> = { png: ['.png'], jpeg: ['.jpg', '.jpeg'], webp: ['.webp'], gif: ['.gif'], svg: ['.svg'] };
      if (!extensions[meta.format ?? '']?.includes(extension)) throw new Error('Unsupported format or extension does not match decoded format');
      await sharp(bytes, { limitInputPixels: 64_000_000 }).raw().toBuffer();
      results.push({ path: absolute, status: 'validated', sha256, bytes: stat.size, format: meta.format,
        width: meta.width, height: meta.height, alpha: meta.hasAlpha, pages: meta.pages ?? 1,
        scope: 'decoded with local image library; target Flutter renderer and all animation frames remain unverified' });
    } catch (error) { results.push({ path: absolute, status: 'invalid', error: error instanceof Error ? error.message : String(error) }); }
  }
  const groups = new Map<string, string[]>();
  for (const item of results) if (item.sha256) groups.set(item.sha256, [...(groups.get(item.sha256) ?? []), item.path]);
  return { version: 1, status: results.every(r => r.status === 'validated') ? 'validated' : 'incomplete', files: results,
    duplicates: [...groups].filter(([, paths]) => paths.length > 1).map(([sha256, paths]) => ({ sha256, paths })) };
}
