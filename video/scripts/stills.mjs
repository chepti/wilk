// Render a set of still frames for review: node scripts/stills.mjs 100 200 300
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || 'Promo' });
fs.mkdirSync('out/stills', { recursive: true });
for (const frame of frames) {
  const output = `out/stills/${process.env.COMP || 'Promo'}-f${String(frame).padStart(4, '0')}.jpg`;
  await renderStill({ composition, serveUrl, frame, output, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.5 });
  console.log('ok', output);
}

