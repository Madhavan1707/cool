// WebAudio chimes for canvas bursts. Impure by nature, so it lives with the
// components, not in lib/. The AudioContext is created lazily on the first
// play — which always follows a user gesture, so autoplay policy is satisfied.

export type BurstKind = "tap" | "fling" | "supernova";

let audioContext: AudioContext | null = null;

function ensureAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

const CHIME_GAIN = 0.07; // deliberately soft; this is seasoning, not a soundtrack

/**
 * A short pluck whose base pitch is personal: `pitchSeed` (0-1, from the
 * text hash) spans roughly 220-620 Hz. Supernovas ring an octave lower and
 * longer; flings sit a major third up.
 */
export function playBurstChime(kind: BurstKind, pitchSeed: number) {
  const audio = ensureAudioContext();
  const now = audio.currentTime;

  const base = 220 * Math.pow(2, pitchSeed * 1.5);
  const frequency = kind === "supernova" ? base / 2 : kind === "fling" ? base * 1.25 : base;
  const duration = kind === "supernova" ? 0.9 : 0.45;

  const oscillator = audio.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;

  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(CHIME_GAIN, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}
