// ערכות עיצוב של Jigzi (ui/themes.json — רק הערכות שבשימוש, נבנה ע"י tools/fetch-ui.mjs)

import { BASE } from '../lib/mediaPaths';

interface TextStyle { fontFamily: number; fontSize: number; fontColor: number }
export interface ThemeCfg {
  assetId: string;
  fontFamilies: string[];
  colors: string[];
  textEditor: { h1: TextStyle; h2: TextStyle; p1: TextStyle; p2: TextStyle };
  cards: { fontColor: number; fillColor: number; borderColor: number; fontFamily: number; fontFamilyLetteringLeft: number; fontFamilyLetteringRight: number };
}

let themes: Record<string, ThemeCfg> = {};
let loading: Promise<void> | null = null;

export function loadThemes(): Promise<void> {
  loading ??= fetch(`${BASE}ui/themes.json`).then((r) => r.json()).then((t) => { themes = t; });
  return loading;
}

export function theme(id: string): ThemeCfg | undefined {
  return themes[id] ?? themes.Blank;
}

export function themeBg(id: string): string | null {
  const t = theme(id);
  return t ? `${BASE}ui/theme/${t.assetId}/bg.jpg` : null;
}

export function cardBack(id: string): string | null {
  const t = theme(id);
  return t ? `${BASE}ui/theme/${t.assetId}/card-back.png` : null;
}

/** משתני CSS לטקסט (ברירות מחדל לפי H1/H2/P1/P2) ולקלפים */
export function themeVars(id: string): React.CSSProperties {
  const t = theme(id);
  if (!t) return {};
  const v: Record<string, string> = {};
  for (const el of ['h1', 'h2', 'p1', 'p2'] as const) {
    const s = t.textEditor[el];
    v[`--${el}-font`] = t.fontFamilies[s.fontFamily] ?? 'inherit';
    v[`--${el}-size`] = `${s.fontSize}px`;
    v[`--${el}-color`] = t.colors[s.fontColor] ?? '#272727';
  }
  const c = t.cards;
  v['--card-color'] = t.colors[c.fontColor] ?? '#272727';
  v['--card-fill'] = t.colors[c.fillColor] ?? '#fff';
  v['--card-border'] = t.colors[c.borderColor] ?? '#387AF4';
  v['--card-font'] = t.fontFamilies[c.fontFamily] ?? 'inherit';
  v['--card-font-left'] = t.fontFamilies[c.fontFamilyLetteringLeft] ?? v['--card-font'];
  v['--card-font-right'] = t.fontFamilies[c.fontFamilyLetteringRight] ?? v['--card-font'];
  return v as React.CSSProperties;
}
