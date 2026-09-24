// Print a compact sample body per module kind: node peek.mjs [Kind]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'archive', 'json');
const want = process.argv[2];
const seen = new Set();

function trim(v, depth = 0) {
  if (Array.isArray(v)) {
    const head = v.slice(0, 2).map((x) => trim(x, depth + 1));
    return v.length > 2 ? [...head, `…+${v.length - 2}`] : head;
  }
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === 'transform') { o[k] = `t${JSON.stringify(x.translation.map((n) => +n.toFixed(3)))} s${JSON.stringify(x.scale.map((n) => +n.toFixed(3)))}`; continue; }
      if (k === 'editor_state') continue;
      o[k] = trim(x, depth + 1);
    }
    return o;
  }
  if (typeof v === 'string' && v.length > 160) return v.slice(0, 160) + '…';
  return v;
}

for (const f of fs.readdirSync(dir).filter((f) => f.includes('_'))) {
  const body = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).module.body;
  const kind = Object.keys(body)[0];
  if (want ? kind !== want : seen.has(kind)) continue;
  seen.add(kind);
  console.log(`\n===== ${kind}  (${f})`);
  console.log(JSON.stringify(trim(body[kind]), null, 1));
  if (want) break;
}
