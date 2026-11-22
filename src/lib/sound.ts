let audioCtxInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioCtxInstance) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxInstance = new AudioCtx();
      }
    }
    if (audioCtxInstance && audioCtxInstance.state === 'suspended') {
      audioCtxInstance.resume();
    }
    return audioCtxInstance;
  } catch (err) {
    console.warn('AudioContext initialization note:', err);
    return null;
  }
}

/**
 * Prime audio context on any user tap/click so mobile browsers allow background chimes
 */
export function primeAudio() {
  getAudioContext();
}

/**
 * Loud, unmistakable Web Audio kitchen chime for new orders.
 * Designed to cut through busy kitchen noise.
 */
export function playKitchenChime() {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playTone = (freq: number, startOffset: number, duration: number, peakGain: number = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Richer harmonics than pure sine, punchier for kitchen
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };

    // First ascending alert chord: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    playTone(523.25, 0.0, 0.35, 0.6);
    playTone(659.25, 0.12, 0.35, 0.6);
    playTone(783.99, 0.24, 0.45, 0.7);
    playTone(1046.50, 0.36, 0.65, 0.8);

    // Second repeat chime after 500ms for attention
    playTone(783.99, 0.65, 0.3, 0.6);
    playTone(1046.50, 0.77, 0.6, 0.8);

    // Vibration on supported mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 300]);
      } catch {
        // Ignore vibration error
      }
    }
  } catch (err) {
    console.warn('Kitchen chime playback note:', err);
  }
}
