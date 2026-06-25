// audio.js
// Synthesized recorder tones using the Web Audio API.
// No audio files — every sound is generated at runtime.

const AudioEngine = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── ENVELOPE ─────────────────────────────────────────────────────────────
  function applyEnvelope(gainNode, t0, attack, decay, sustainLevel, releaseStart, release, peak = 0.85) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.0001), t0 + attack + decay);
    g.setValueAtTime(Math.max(sustainLevel, 0.0001), releaseStart);
    g.exponentialRampToValueAtTime(0.0001, releaseStart + release);
  }

  // ── RECORDER VOICE ──────────────────────────────────────────────────────
  // Richer tone: multiple harmonics, subtle pitch wobble, register-adapted timbre.
  function playRecorder(freq, duration = 1.1) {
    const c = getCtx();
    const t0 = c.currentTime + 0.025;
    const out = c.createGain();
    out.connect(c.destination);

    // Pitch wobble (subtle vibrato)
    const vibrato = c.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5.5;
    const vibratoGain = c.createGain();
    vibratoGain.gain.value = 0.4;
    vibrato.connect(vibratoGain);

    // Fundamental with vibrato
    const osc1 = c.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    vibratoGain.connect(osc1.frequency);

    // Harmonics with register-adapted mix
    const isLow = freq < 400;
    const partials = [
      { mult: 2, type: 'triangle', gain: isLow ? 0.18 : 0.10 },
      { mult: 3, type: 'sine',     gain: isLow ? 0.06 : 0.04 },
      { mult: 4, type: 'triangle', gain: isLow ? 0.04 : 0.02 },
    ];
    const harmNodes = partials.map(p => {
      const o = c.createOscillator();
      o.type = p.type;
      o.frequency.value = freq * p.mult;
      const g = c.createGain();
      g.gain.value = p.gain;
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + duration + 0.12);
      return o;
    });

    // Breath noise — bandpassed around the fundamental
    const noiseLen = Math.min(c.sampleRate * duration * 0.7, c.sampleRate * 0.8);
    const noiseBuf = c.createBuffer(1, Math.max(noiseLen, 128), c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const noise = c.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseBP = c.createBiquadFilter();
    noiseBP.type = 'bandpass';
    noiseBP.frequency.value = freq * (isLow ? 1.8 : 1.3);
    noiseBP.Q.value = 0.8;
    const noiseGain = c.createGain();
    noiseGain.gain.value = isLow ? 0.025 : 0.03;
    noise.connect(noiseBP).connect(noiseGain).connect(out);

    // Apply master envelope
    applyEnvelope(out, t0, 0.05, 0.10, 0.60, t0 + duration - 0.20, 0.20, 0.80);

    osc1.start(t0);
    osc1.stop(t0 + duration + 0.12);

    vibrato.start(t0);
    vibrato.stop(t0 + duration + 0.12);
    noise.start(t0);
    noise.stop(t0 + duration + 0.12);
  }

  // ── METRONOME CLICK ──────────────────────────────────────────────────────
  function playClick(accent = false, when = 0) {
    const c = getCtx();
    const t0 = c.currentTime + when + 0.01;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1800 : 1200;
    const g = c.createGain();
    g.gain.setValueAtTime(accent ? 0.25 : 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  // ── SHORT NOTE (for sight-reading / rapid playback) ─────────────────────
  function playShortNote(freq) {
    playRecorder(freq, 0.45);
  }

  // ── PUBLIC ──────────────────────────────────────────────────────────────
  function playInstrumentNote(freq, fingeringType, duration = 1.1) {
    getCtx();
    playRecorder(freq, duration);
  }

  function playInstrumentChord(freqs, fingeringType, duration = 1.1) {
    getCtx();
    freqs.forEach(function(f) { playRecorder(f, duration); });
  }

  function unlock() { getCtx(); }

  return { playInstrumentNote, playInstrumentChord, playClick, playShortNote, unlock };
})();
