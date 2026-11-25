import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(rootDir, 'source', 'build.mjs')], { stdio: 'inherit' });
const entryFile = path.join(rootDir, 'src', 'firebase-tracker.ts');
const outFile = path.join(rootDir, 'assets', 'firebase-tracker.js');
const indexFile = path.join(rootDir, 'index.html');

await esbuild.build({
  entryPoints: [entryFile],
  bundle: true,
  format: 'iife',
  outfile: outFile,
  minify: true,
});

const bundleCode = fs
  .readFileSync(outFile, 'utf8')
  .replace(/<\/script/gi, '<\\/script')
  .trim();

const inlineTag = `<!-- FIREBASE_TRACKER_START --><script>${bundleCode}</script><!-- FIREBASE_TRACKER_END -->`;
const html = fs.readFileSync(indexFile, 'utf8');

const markerRe = /<!-- FIREBASE_TRACKER_START -->[\s\S]*?<!-- FIREBASE_TRACKER_END -->/;
const externalTag = '<script src="assets/firebase-tracker.js"></script>';

let nextHtml;
if (markerRe.test(html)) {
  nextHtml = html.replace(markerRe, () => inlineTag);
} else if (html.includes(externalTag)) {
  nextHtml = html.replace(externalTag, () => inlineTag);
} else {
  throw new Error('Could not find Firebase tracker placeholder in index.html');
}

fs.writeFileSync(indexFile, nextHtml, 'utf8');
console.log(`Built ${path.relative(rootDir, outFile)} and inlined into index.html (${bundleCode.length} bytes).`);
execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'build-knowledge.mjs')], { stdio: 'inherit' });
