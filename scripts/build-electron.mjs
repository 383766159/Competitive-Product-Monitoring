import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const external = ['electron', 'playwright', 'exceljs'];

await esbuild.build({
  entryPoints: [path.join(root, 'electron', 'main.ts')],
  bundle: true,
  platform: 'node',
  outfile: path.join(root, 'dist-electron', 'main.js'),
  external,
  format: 'cjs',
  sourcemap: true,
  target: 'node18',
});

await esbuild.build({
  entryPoints: [path.join(root, 'electron', 'preload.ts')],
  bundle: true,
  platform: 'node',
  outfile: path.join(root, 'dist-electron', 'preload.js'),
  external: ['electron'],
  format: 'cjs',
  sourcemap: true,
  target: 'node18',
});

console.log('electron bundle ok');
