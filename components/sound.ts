// WebAudio sound effects for canvas interactions. Impure by nature, so it
// lives with the components, not in lib/. The AudioContext is created lazily
// on the first play — which always follows a user gesture, so autoplay
// policy is satisfied.

export type BurstKind = "tap" | "fling" | "supernova";

let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ensureAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

/** One second of cached white noise — the raw material for bangs and swishes. */
function getNoiseBuffer(audio: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Percussive gain envelope: quick attack, exponential decay to silence. */
function envelope(audio: AudioContext, peak: number, duration: number): GainNode {
  const gain = audio.createGain();
  const now = audio.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(audio.destination);
  return gain;
}

function pluck(
  audio: AudioContext,
  frequency: number,
  peak: number,
  duration: number,
  glideTo?: number
) {
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, now);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, now + duration);
  oscillator.connect(envelope(audio, peak, duration));
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

/**
 * Filtered noise burst: the filter sweeps down as the sound decays, which is
 * what makes an explosion read as an explosion instead of static.
 */
function noiseBurst(
  audio: AudioContext,
  peak: number,
  duration: number,
  cutoffFrom: number,
  cutoffTo: number
) {
  const now = audio.currentTime;
  const source = audio.createBufferSource();
  source.buffer = getNoiseBuffer(audio);
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoffFrom, now);
  filter.frequency.exponentialRampToValueAtTime(cutoffTo, now + duration);
  source.connect(filter);
  filter.connect(envelope(audio, peak, duration));
  source.start(now);
  source.stop(now + duration + 0.05);
}

/** Two quick rising plucks confirming sound just turned on (and priming the context). */
export function playEnableChime() {
  const audio = ensureAudioContext();
  pluck(audio, 440, 0.12, 0.15);
  setTimeout(() => pluck(audio, 660, 0.12, 0.25), 90);
}

/**
 * Sized to the action: a tap is a small quick pluck, a fling is a rising
 * whoosh, a supernova is a proper bang (noise crack + sub-bass drop). Tap and
 * fling pitch is personal — `pitchSeed` (0-1, from the text hash) spans
 * roughly 220-620 Hz.
 */
export function playBurstChime(kind: BurstKind, pitchSeed: number) {
  const audio = ensureAudioContext();
  const base = 220 * Math.pow(2, pitchSeed * 1.5);

  if (kind === "tap") {
    pluck(audio, base * 1.5, 0.1, 0.16);
  } else if (kind === "fling") {
    pluck(audio, base, 0.16, 0.45, base * 2);
    noiseBurst(audio, 0.08, 0.35, 1200, 4000);
  } else {
    // Supernova: bright crack, then the boom.
    noiseBurst(audio, 0.4, 0.7, 5000, 120);
    const now = audio.currentTime;
    const sub = audio.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(40, now + 0.7);
    sub.connect(envelope(audio, 0.45, 0.9));
    sub.start(now);
    sub.stop(now + 1);
  }
}
