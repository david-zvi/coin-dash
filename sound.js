(() => {
  let ctx, muted = false;
  // notes: [freq Hz, start s, dur s, wave, endFreq Hz (optional glide), peak gain]
  const play = notes => {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      for (const [f, s, d, type, end, v = 0.15] of notes) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'square';
        o.frequency.setValueAtTime(f, t0 + s);
        if (end) o.frequency.exponentialRampToValueAtTime(end, t0 + s + d);
        g.gain.setValueAtTime(v, t0 + s);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + s + d);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0 + s); o.stop(t0 + s + d);
      }
    } catch (e) { /* audio unavailable: stay silent */ }
  };
  window.Sfx = {
    coin: () => play([[880, 0, 0.08, 'square'], [1320, 0.07, 0.12, 'square']]),
    hit: () => play([[180, 0, 0.3, 'sawtooth', 50, 0.2]]),
    over: () => play([[440, 0, 0.18, 'triangle'], [330, 0.18, 0.18, 'triangle'], [262, 0.36, 0.18, 'triangle'], [196, 0.54, 0.4, 'triangle']]),
    best: () => play([[523, 0, 0.12, 'square'], [659, 0.12, 0.12, 'square'], [784, 0.24, 0.12, 'square'], [1047, 0.36, 0.3, 'square']]),
    tick: () => play([[1000, 0, 0.04, 'sine', 0, 0.08]]),
    toggleMute: () => (muted = !muted),
  };
})();
