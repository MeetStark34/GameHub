'use client';

/**
 * Tiny synthesized sound set (Web Audio, no asset downloads). Sounds only
 * ever play in response to a player action and respect the global toggle.
 */
export type SoundName = 'click' | 'complete' | 'perfect' | 'level-up' | 'achievement' | 'streak' | 'error';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS: Record<SoundName, () => void> = {
  click: () => tone(660, 0, 0.05, 'triangle', 0.03),
  error: () => {
    tone(220, 0, 0.12, 'square', 0.03);
    tone(180, 0.08, 0.14, 'square', 0.025);
  },
  complete: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle')),
  perfect: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.3, 'triangle', 0.09)),
  'level-up': () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 'sawtooth', 0.04)),
  achievement: () => {
    tone(880, 0, 0.18, 'sine', 0.07);
    tone(1319, 0.12, 0.4, 'sine', 0.07);
  },
  streak: () => [440, 554, 659].forEach((f, i) => tone(f, i * 0.06, 0.25, 'triangle', 0.06)),
};

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  try {
    SOUNDS[name]();
  } catch {
    // Audio is best-effort.
  }
}
