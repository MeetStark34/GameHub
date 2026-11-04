'use client';

/**
 * Tiny synthesized sound set (no asset downloads). Sounds only ever play in
 * response to a player action and respect the global toggle.
 *
 * Each sound is rendered once with an OfflineAudioContext into a short WAV
 * and played through an <audio> element. A realtime AudioContext would be
 * simpler, but creating one blocks the main thread while the browser opens
 * the audio device (measured 67 ms in Chrome and 174 ms in Edge on Windows,
 * 2 s in headless Chromium), right when a result or reward is on screen.
 * Offline rendering and media playback never block it.
 */
export type SoundName = 'click' | 'complete' | 'perfect' | 'level-up' | 'achievement' | 'streak' | 'error';

/** [frequency Hz, start s, duration s, waveform, peak gain] */
type Note = [number, number, number, OscillatorType, number];

const n = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08): Note => [freq, start, dur, type, gain];

const SOUNDS: Record<SoundName, Note[]> = {
  click: [n(660, 0, 0.05, 'triangle', 0.03)],
  error: [n(220, 0, 0.12, 'square', 0.03), n(180, 0.08, 0.14, 'square', 0.025)],
  complete: [523, 659, 784].map((f, i) => n(f, i * 0.08, 0.22, 'triangle')),
  perfect: [523, 659, 784, 1047].map((f, i) => n(f, i * 0.07, 0.3, 'triangle', 0.09)),
  'level-up': [392, 523, 659, 784, 1047].map((f, i) => n(f, i * 0.09, 0.35, 'sawtooth', 0.04)),
  achievement: [n(880, 0, 0.18, 'sine', 0.07), n(1319, 0.12, 0.4, 'sine', 0.07)],
  streak: [440, 554, 659].map((f, i) => n(f, i * 0.06, 0.25, 'triangle', 0.06)),
};

const RATE = 22_050;

/** 16-bit mono PCM WAV. */
function wav(samples: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const ascii = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([buf], { type: 'audio/wav' });
}

async function render(notes: Note[]): Promise<string> {
  const end = Math.max(...notes.map(([, start, dur]) => start + dur)) + 0.05;
  const ac = new OfflineAudioContext(1, Math.ceil(end * RATE), RATE);
  for (const [freq, start, dur, type, gain] of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
  return URL.createObjectURL(wav((await ac.startRendering()).getChannelData(0)));
}

const rendered = new Map<SoundName, Promise<string>>();

export function playSound(name: SoundName, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || typeof OfflineAudioContext === 'undefined') return;
  let url = rendered.get(name);
  if (!url) {
    url = render(SOUNDS[name]);
    rendered.set(name, url);
    url.catch(() => rendered.delete(name));
  }
  url.then((src) => new Audio(src).play()).catch(() => {
    // Audio is best-effort (autoplay policy, no output device, ...).
  });
}
