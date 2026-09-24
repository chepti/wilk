// בדיקת רינדור של כל השקפים (SSR) + בדיקת קיום קבצי מדיה.
// הרצה: node tools/render-sweep.mjs  (בונה את הקובץ הזה עם esbuild ומריץ)
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { SlideBody } from '../app/src/views/PlayView';
import { PlayCtx, type PlayApi } from '../app/src/engine/play';

// useLayoutEffect לא רץ ב-SSR — אזהרה צפויה, לא רלוונטית לבדיקה
const origError = console.error;
console.error = (...a: unknown[]) => { if (String(a[0]).includes('useLayoutEffect')) return; origError(...a); };

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'app', 'public', 'content');
const MEDIA = path.join(ROOT, 'app', 'public', 'media');

const catalog = JSON.parse(fs.readFileSync(path.join(CONTENT, 'units.json'), 'utf8'));
const media = new Set(fs.readdirSync(MEDIA));
const problems: string[] = [];
let slides = 0;

for (const meta of catalog) {
  const unit = JSON.parse(fs.readFileSync(path.join(CONTENT, `${meta.id}.json`), 'utf8'));
  unit.slides.forEach((s: { kind: string; content: unknown }, i: number) => {
    slides++;
    const api: PlayApi = { active: true, unit, finish() {}, record() {} };
    try {
      const html = renderToString(
        <PlayCtx.Provider value={api}>
          <SlideBody kind={s.kind} c={s.content} />
        </PlayCtx.Provider>,
      );
      if (html.length < 50) problems.push(`${meta.id}/${i + 1} ${s.kind}: empty render (${html.length})`);
      // כל תמונה שמוצגת קיימת על הדיסק
      for (const m of html.matchAll(/media\/([0-9a-f-]{36}(?:\.rw)?\.webp)/g)) {
        if (!media.has(m[1])) problems.push(`${meta.id}/${i + 1}: missing image ${m[1]}`);
      }
    } catch (e) {
      problems.push(`${meta.id}/${i + 1} ${s.kind}: ${(e as Error).message}`);
    }
  });
  // כל ההקלטות שהתוכן מפנה אליהן קיימות
  for (const m of JSON.stringify(unit.slides).matchAll(/"id":"([0-9a-f-]{36})","lib":"\w+"\}/g)) {
    if (!media.has(`${m[1]}.mp3`) && !media.has(`${m[1]}.webp`)) problems.push(`${meta.id}: missing media ${m[1]}`);
  }
}

console.log(`rendered ${slides} slides, problems: ${problems.length}`);
problems.slice(0, 40).forEach((p) => console.log('  ' + p));
process.exit(problems.length ? 1 : 0);
