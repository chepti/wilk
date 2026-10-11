import { Easing, interpolate, spring, useVideoConfig } from 'remotion';

/** Orientation-aware layout: pick(landscape, vertical) */
export const useLayout = () => {
  const { width: W, height: H } = useVideoConfig();
  const V = H > W;
  return { V, W, H, pick: <T,>(a: T, b: T): T => (V ? b : a) };
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

export const lerp = (
  f: number,
  input: [number, number],
  output: [number, number],
  easing: (t: number) => number = easeOut,
) => interpolate(f, input, output, { ...clamp, easing });

export const pop = (f: number, fps: number, delay = 0, damping = 12, stiffness = 170, mass = 0.7) =>
  spring({ frame: f - delay, fps, config: { damping, stiffness, mass } });

export const soft = (f: number, fps: number, delay = 0) =>
  spring({ frame: f - delay, fps, config: { damping: 200, stiffness: 90 } });

// deterministic pseudo-random
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// smooth wobble for camera drift
export const drift = (f: number, amp = 6, speed = 0.02, seed = 1) =>
  Math.sin(f * speed + seed) * amp + Math.sin(f * speed * 2.3 + seed * 3) * amp * 0.35;
