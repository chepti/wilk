// בונה את render-sweep.tsx ומריץ אותו: node tools/render-sweep.mjs (מתוך WILK/)
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'app', 'package.json'));
const esbuild = require('esbuild');
const out = path.join(os.tmpdir(), `wilk-sweep-${Date.now()}.mjs`);

await esbuild.build({
  entryPoints: [path.join(ROOT, 'tools', 'render-sweep.tsx')],
  bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: out, logLevel: 'warning',
  define: { 'import.meta.env.BASE_URL': '"/wilk/"' },
  nodePaths: [path.join(ROOT, 'app', 'node_modules')],
  loader: { '.css': 'empty' },
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
process.chdir(ROOT);
await import(pathToFileURL(out).href);
