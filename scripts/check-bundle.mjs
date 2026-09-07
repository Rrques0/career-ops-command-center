import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const budget = 200 * 1024;
const files = (await readdir('dist', { withFileTypes: true })).filter(file => file.isFile() && /\.(js|css)$/.test(file.name));
let total = 0;
for (const file of files) total += gzipSync(await readFile(join('dist', file.name))).byteLength;
console.log(`Compressed JS + CSS: ${(total / 1024).toFixed(1)} KB / 200 KB`);
if (total > budget) { console.error('Bundle budget exceeded.'); process.exit(1); }
