/** Tiny synthesized sip / charge / goal tones. No audio files. */
(function (global) {
  let ctx = null;

  function audio() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  function resume() {
    const a = audio();
    if (a && a.state === 'suspended') a.resume().catch(() => {});
    return a;
  }

  function tone(a, { freq, dur = 0.12, type = 'sine', gain = 0.06, at = 0, slide = 0 }) {
    const t0 = a.currentTime + at;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(kind) {
    const a = resume();
    if (!a) return;
    if (kind === 'sip') {
      tone(a, { freq: 620, dur: 0.09, gain: 0.045 });
      tone(a, { freq: 880, dur: 0.11, gain: 0.03, at: 0.05 });
    } else if (kind === 'ely') {
      tone(a, { freq: 420, dur: 0.08, type: 'square', gain: 0.03 });
      tone(a, { freq: 740, dur: 0.1, type: 'square', gain: 0.025, at: 0.07 });
      tone(a, { freq: 1180, dur: 0.14, gain: 0.035, at: 0.14 });
    } else if (kind === 'goal') {
      tone(a, { freq: 523, dur: 0.14, gain: 0.05 });
      tone(a, { freq: 659, dur: 0.16, gain: 0.045, at: 0.12 });
      tone(a, { freq: 784, dur: 0.22, gain: 0.05, at: 0.26 });
    } else if (kind === 'undo') {
      tone(a, { freq: 300, dur: 0.1, gain: 0.035, slide: -80 });
    }
  }

  global.WaterSound = { play, resume };
})(typeof window !== 'undefined' ? window : globalThis);
