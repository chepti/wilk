/*
 * RECIPE SCENES — placeholders that show the patterns, not content to keep.
 * Replace them with scenes written for the project's script and motif.
 * Every scene: receives {dur}, uses useCurrentFrame() from its own start,
 * and is orientation-aware via useLayout().pick(landscape, vertical).
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C } from '../theme';
import { lerp, easeInOut, easeIn, pop, soft, useLayout } from '../anim';
import { Ribbon, Pop, Spark, Blob, DrawFrame } from '../components/graphics';
import { Kinetic, typed, Tag } from '../components/type';
import { Phone } from '../components/media';
import { ExampleScreen } from '../components/ui';

/** Phone position shared by consecutive scenes, so cuts feel continuous. */
export const usePhone = () => useLayout().pick({ x: 640, y: 560 }, { x: 540, y: 1380 });

/* Recipe 1 — motif draws itself on a dark stage, a short line rises in */
export const OpenRecipe: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { W, H, pick } = useLayout();
  const d = pick('M 1600 880 C 1250 980, 760 840, 700 540 C 650 300, 820 180, 1040 200', 'M 980 1560 C 700 1700, 260 1480, 250 1060 C 240 760, 440 560, 740 580');
  const head = lerp(f, [4, 50], [0, 1], easeInOut);
  const tail = lerp(f, [dur - 30, dur - 4], [0, 1], easeIn);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={W} height={H} style={{ position: 'absolute' }}>
        <Ribbon d={d} head={head} tail={tail} width={64} id="open" />
      </svg>
      <Pop x={pick(1060, 760)} y={pick(180, 560)} at={48} life={50}>
        <Spark size={64} color="#fff" />
      </Pop>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Kinetic text="כותרת *פתיחה*." at={50} out={dur - 20} size={140} color="#fff" weight={900} align="center" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Recipe 2 — live UI demo: phone, typing, an element breaks out of the device */
export const DemoRecipe: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick } = useLayout();
  const ph = usePhone();
  const out = soft(f, fps, 90);
  const tx = pick(1320, 540);
  const ty = pick(600, 700);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Blob x={1650} y={150} size={600} color={C.soft1} rot={f * 0.1} opacity={0.8} />
      <Blob x={250} y={980} size={600} color={C.soft2} shape={1} rot={-f * 0.1} opacity={0.8} />
      <div style={{ position: 'absolute', left: ph.x - 207, top: ph.y - 434 }}>
        <Phone scale={0.95}>
          <ExampleScreen title="מסך לדוגמה" text={typed('כאן מקלידים בזמן אמת מול הצופה.', f, 14, 20)} caret={f < 80} />
        </Phone>
      </div>
      {/* the breakout: a card flies from the phone into the world, big */}
      {f > 90 && (
        <div
          style={{
            position: 'absolute',
            left: interpolate(out, [0, 1], [ph.x, tx]),
            top: interpolate(out, [0, 1], [ph.y + 100, ty]),
            transform: `translate(-50%,-50%) scale(${interpolate(out, [0, 1], [0.2, 1])}) rotate(${interpolate(out, [0, 1], [-14, 3])}deg)`,
          }}
        >
          <Tag style={{ fontSize: 44, padding: '20px 44px' }}>אלמנט שיוצא מהמסך</Tag>
        </div>
      )}
      <div style={{ position: 'absolute', right: pick(130, 70), top: pick(200, 170), width: pick(900, 940) }}>
        <Kinetic text={'כותרת אחת\nלכל *פיצ׳ר*.'} at={10} out={dur - 14} size={96} color={C.ink} weight={900} />
      </div>
    </AbsoluteFill>
  );
};

/* Recipe 3 — end card: motif + name + partner logo + one call to action + credit */
export const OutroRecipe: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pick } = useLayout();
  const fade = lerp(f, [dur - 18, dur], [0, 1], easeInOut);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 30 }}>
        <div style={{ position: 'relative', width: 760, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DrawFrame w={760} h={300} progress={lerp(f, [4, 40], [0, 1], easeInOut)} color={C.primary} />
          <Kinetic text="שם המוצר" at={20} size={pick(150, 130)} color={C.primary} weight={900} mode="pop" stagger={0} align="center" />
        </div>
        <div style={{ transform: `scale(${pop(f, fps, 50)})` }}>
          <Tag bg={C.primary}>קריאה אחת לפעולה</Tag>
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontSize: 22, color: C.muted, direction: 'rtl', opacity: lerp(f, [60, 80], [0, 1]) }}>
        הפקה: חולמים תקשוב · chepti.com
      </div>
      <AbsoluteFill style={{ background: C.ink, opacity: fade }} />
    </AbsoluteFill>
  );
};
