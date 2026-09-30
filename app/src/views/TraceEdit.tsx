import React, { useEffect, useRef, useState } from 'react';
import { nav } from '../App';
import { loadTeacher, teacherMe, saveStrokes, teacherPreviewSession, loadSession, type StrokeMap } from '../lib/api';
import {
  BOX, COURSE_LETTERS, STROKE_COLORS, drawGlyph, drawGlyphWithExtras, extraRuns, drawGuides, loadStrokes, loadTraceFont, setCachedStrokes,
  type GlyphStrokes, type StrokePt,
} from '../data/strokes';
import { loadCatalog, type UnitMeta } from '../data/units';
import TraceBox, { type TraceBoxHandle } from '../ui/TraceBox';
import Footer from '../ui/Footer';
import { IconArrowRight, IconCheck, IconUndo, IconEraser, IconSave, IconPlay, IconCopy, IconEye } from '../ui/icons';

// עורך מסלולי כתיבה ("ללמד" את המערכת איך כותבים כל אות):
// בוחרים אות, כותבים עליה את המשיכות לפי הסדר והכיוון (כל הרמת אצבע = משיכה חדשה, ממוספרת),
// בודקים בחלון "ככה זה ייראה לילד", ושומרים — נכנס מיד לשקפי הכתיבה בכל התחנות.

const GLYPHS = COURSE_LETTERS.flatMap((l) => [l, l.toLowerCase()]);
const DRAFT_KEY = 'wilk_strokes_draft';
const MIN_STEP = 3 / BOX; // דילול נקודות

function readDraft(): StrokeMap {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}'); } catch { return {}; }
}
function writeDraft(m: StrokeMap) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(m)); } catch { /* */ }
}

export default function TraceEdit() {
  const teacher = loadTeacher();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<StrokeMap>({});
  const [glyph, setGlyph] = useState('C');
  const [strokes, setStrokes] = useState<GlyphStrokes>([]);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<UnitMeta[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const cur = useRef<StrokePt[]>([]);
  const tryBox = useRef<TraceBoxHandle>(null);
  const [tryDone, setTryDone] = useState(false);

  useEffect(() => {
    Promise.all([loadTraceFont(), loadStrokes(true)]).then(([, m]) => { setSaved(m); setReady(true); });
    loadCatalog().then(setCatalog);
    if (teacher) teacherMe(teacher).then((r) => setAdmin(r.strokeAdmin)).catch(() => setAdmin(false));
    else setAdmin(false);
  }, []);

  // בחירת אות: טיוטה מקומית (אם יש) → השמור בשרת → ריק
  useEffect(() => {
    if (!ready) return;
    const d = readDraft()[glyph] ?? saved[glyph] ?? [];
    setStrokes(d.map((s) => s.map((p) => [...p] as StrokePt)));
    setMsg(null);
    setTryDone(false);
  }, [glyph, ready]);

  const redraw = () => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, BOX, BOX);
    drawGuides(ctx);
    // האות + מה שהמסלול מוסיף מעבר לגופן (צ'ופציקים וכו') — בגוון מעט כהה יותר כדי שייראה
    drawGlyphWithExtras(ctx, glyph, extraRuns(glyph, strokes), '#cdd7f7');
    drawGlyph(ctx, glyph, '#dfe6fb');
    const all = [...strokes, cur.current].filter((s) => s.length > 1);
    all.forEach((st, si) => {
      const col = STROKE_COLORS[si % STROKE_COLORS.length];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = col;
      ctx.beginPath();
      st.forEach(([x, y], i) => (i ? ctx.lineTo(x * BOX, y * BOX) : ctx.moveTo(x * BOX, y * BOX)));
      ctx.stroke();
      // ראש חץ בסוף המשיכה — הכיוון
      const a = st[Math.max(0, st.length - 4)], b = st[st.length - 1];
      const ang = Math.atan2((b[1] - a[1]), (b[0] - a[0]));
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(b[0] * BOX + Math.cos(ang) * 16, b[1] * BOX + Math.sin(ang) * 16);
      ctx.lineTo(b[0] * BOX + Math.cos(ang + 2.4) * 16, b[1] * BOX + Math.sin(ang + 2.4) * 16);
      ctx.lineTo(b[0] * BOX + Math.cos(ang - 2.4) * 16, b[1] * BOX + Math.sin(ang - 2.4) * 16);
      ctx.fill();
      // מספר המשיכה בנקודת ההתחלה
      const [sx, sy] = st[0];
      ctx.beginPath(); ctx.arc(sx * BOX, sy * BOX, 14, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(si + 1), sx * BOX, sy * BOX + 1);
    });
  };
  useEffect(redraw, [strokes, glyph, ready]);

  const toNorm = (e: { clientX: number; clientY: number }): StrokePt => {
    const r = canvas.current!.getBoundingClientRect();
    const k = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000;
    return [k((e.clientX - r.left) / r.width), k((e.clientY - r.top) / r.height)];
  };

  const setAndDraft = (next: GlyphStrokes) => {
    setStrokes(next);
    const d = readDraft();
    d[glyph] = next;
    writeDraft(d);
    setTryDone(false);
  };

  const save = async () => {
    if (!teacher || !admin) return;
    setBusy(true);
    try {
      await saveStrokes(teacher, glyph, strokes);
      const m = { ...saved };
      if (strokes.length) m[glyph] = strokes; else delete m[glyph];
      setSaved(m);
      setCachedStrokes(m);
      const d = readDraft(); delete d[glyph]; writeDraft(d);
      setMsg({ t: `נשמר! ${glyph} פעיל עכשיו בשקף הכתיבה.` });
      const i = GLYPHS.indexOf(glyph);
      if (i >= 0 && i + 1 < GLYPHS.length) setTimeout(() => setGlyph(GLYPHS[i + 1]), 600);
    } catch (e) {
      setMsg({ t: (e as Error).message || 'השמירה נכשלה', err: true });
    } finally { setBusy(false); }
  };

  const copyJson = async () => {
    const all = { ...saved, ...readDraft() };
    try { await navigator.clipboard.writeText(JSON.stringify(all)); setMsg({ t: 'כל המסלולים הועתקו (JSON) — אפשר להדביק לי בצ׳אט.' }); }
    catch { setMsg({ t: 'ההעתקה נחסמה בדפדפן', err: true }); }
  };

  // קישור לשקף הכתיבה של האות בתחנה
  const home = catalog.find((u) => u.traces?.some((t) => t.letter === glyph.toUpperCase()));
  const slideIdx = home?.traces?.find((t) => t.letter === glyph.toUpperCase())?.idx;
  const openSlide = () => {
    if (!home || slideIdx === undefined) return;
    if (!loadSession()) teacherPreviewSession();
    nav(`/unit/${home.id}/${slideIdx + 1}`);
  };

  const dirty = JSON.stringify(strokes) !== JSON.stringify(saved[glyph] ?? []);
  const doneCount = GLYPHS.filter((g) => saved[g]?.length).length;

  return (
    <div className="page" dir="rtl">
      <div className="te-wrap" style={{ flex: 1 }}>
        <button className="pill" onClick={() => nav('/teacher')}><IconArrowRight size={16} /> לאזור המורים</button>
        <h1 style={{ textAlign: 'center', margin: '10px 0 4px' }}>מלמדים איך כותבים</h1>
        <p className="te-help" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          בוחרים אות, וכותבים עליה בדיוק כמו שמלמדים ילד: כל משיכה מההתחלה לסוף, לפי הסדר. כל הרמה של האצבע או העכבר מתחילה משיכה חדשה (ממוספרת, עם חץ לכיוון).
          בחלון "ככה זה ייראה לילד" רואים את ההדגמה ואפשר לנסות. שמירה מעבירה אוטומטית לאות הבאה.
          <br /><b>{doneCount} מתוך {GLYPHS.length}</b> אותיות כבר מוקלטות.
        </p>

        {admin === false && (
          <p className="te-msg err" style={{ textAlign: 'center' }}>
            {teacher ? 'השמירה בשרת פתוחה רק למנהלת התוכן. אפשר לצייר ולהעתיק JSON.' : 'כדי לשמור צריך להתחבר באזור המורים (החשבון של מנהלת התוכן).'}
          </p>
        )}

        <div className="te-letters" dir="ltr">
          {GLYPHS.map((g) => (
            <button key={g} className={`te-glyph${g === glyph ? ' cur' : ''}`} onClick={() => setGlyph(g)} title={saved[g]?.length ? 'מוקלט' : 'עוד לא מוקלט'}>
              {g}
              {!!saved[g]?.length && <span className="te-ok"><IconCheck size={11} strokeWidth={3.5} /></span>}
            </button>
          ))}
        </div>

        <div className="te-main" dir="ltr">
          <div>
            <canvas
              ref={canvas} width={BOX} height={BOX} className="te-canvas"
              onPointerDown={(e) => {
                e.preventDefault();
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* */ }
                drawing.current = true;
                cur.current = [toNorm(e)];
              }}
              onPointerMove={(e) => {
                if (!drawing.current) return;
                const ev = e.nativeEvent;
                const list = typeof ev.getCoalescedEvents === 'function' && ev.getCoalescedEvents().length ? ev.getCoalescedEvents() : [ev];
                for (const c of list) {
                  const p = toNorm(c);
                  const l = cur.current[cur.current.length - 1];
                  if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) >= MIN_STEP) cur.current.push(p);
                }
                redraw();
              }}
              onPointerUp={() => {
                if (!drawing.current) return;
                drawing.current = false;
                const s = cur.current;
                cur.current = [];
                if (s.length > 1) setAndDraft([...strokes, s]); else redraw();
              }}
            />
            <p className="te-help" style={{ textAlign: 'center', margin: '6px 0 0' }} dir="rtl">
              {strokes.length} משיכות · <b dir="ltr">{glyph}</b>{dirty && ' · לא נשמר עדיין'}
            </p>
          </div>

          <div className="te-side" dir="rtl">
            <button className="pill" onClick={() => setAndDraft(strokes.slice(0, -1))} disabled={!strokes.length}><IconUndo size={16} /> ביטול משיכה אחרונה</button>
            <button className="pill" onClick={() => setAndDraft([])} disabled={!strokes.length}><IconEraser size={16} /> מחיקת הכול</button>
            <button className="btn star" onClick={save} disabled={!admin || busy || !dirty}><IconSave size={17} /> שמירה ומעבר לאות הבאה</button>
            <button className="pill" onClick={openSlide} disabled={!home || !saved[glyph]?.length}><IconEye size={16} /> לראות בשקף בתחנה {home?.n ?? ''}</button>
            <button className="pill" onClick={copyJson}><IconCopy size={16} /> העתקת JSON (גיבוי)</button>
            {msg && <div className={`te-msg${msg.err ? ' err' : ''}`}>{msg.t}</div>}

            <h3 style={{ margin: '14px 0 2px' }}>ככה זה ייראה לילד</h3>
            <div className="te-try" dir="ltr">
              {ready && (
                <TraceBox
                  key={glyph + strokes.length}
                  ref={tryBox}
                  glyph={glyph}
                  strokes={strokes.length ? strokes : null}
                  enabled={!tryDone}
                  done={tryDone}
                  onDone={() => setTryDone(true)}
                  onHint={(h) => h && setMsg({ t: h })}
                />
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="pill" onClick={() => tryBox.current?.demo()} disabled={!strokes.length}><IconPlay size={15} /> הדגמה</button>
              <button className="pill" onClick={() => { setTryDone(false); tryBox.current?.clear(); }}><IconEraser size={15} /> לנסות שוב</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
