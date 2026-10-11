import { Composition } from 'remotion';
import { Promo } from './Promo';
import { TOTAL, FPS } from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="PromoVertical" component={Promo} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
  </>
);
