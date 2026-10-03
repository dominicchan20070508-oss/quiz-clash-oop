// audio.js — Web Audio synthesized SFX + light chiptune BGM. No audio files; works offline.
(function (root) {
  const AudioEngine = function () {
    let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
    let muted = false, musicTimer = null, musicStep = 0, nextNoteTime = 0;
    try { muted = localStorage.getItem('qc_muted') === '1'; } catch (e) {}

    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
      const len = ctx.sampleRate * 1;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function resume() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); return c; }

    function tone(freq, t0, dur, type, vol, dest, glideTo) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(dest || sfxBus);
      o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function noise(t0, dur, vol, filterFreq, glideTo) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(filterFreq || 1200, t0);
      if (glideTo) f.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(sfxBus);
      src.start(t0); src.stop(t0 + dur + 0.03);
    }

    const sfx = {
      click(c) { tone(620, c, 0.06, 'square', 0.12); },
      tick(c) { tone(1050, c, 0.05, 'square', 0.08); },
      correct(c) { tone(659.25, c, 0.12, 'triangle', 0.22); tone(880, c + 0.1, 0.16, 'triangle', 0.22); tone(1046.5, c + 0.2, 0.22, 'triangle', 0.2); },
      wrong(c) { tone(220, c, 0.28, 'sawtooth', 0.16, sfxBus, 110); noise(c, 0.18, 0.08, 700, 200); },
      hit(c, kind) {
        const base = { fire: 150, lightning: 260, ice: 200, shadow: 120, rock: 90 }[kind] || 140;
        tone(base, c, 0.22, 'sawtooth', 0.2, sfxBus, base * 0.5);
        noise(c, 0.25, 0.22, 1800, 200);
      },
      skill(c) { tone(300, c, 0.4, 'sawtooth', 0.16, sfxBus, 1200); tone(600, c + 0.05, 0.4, 'square', 0.08, sfxBus, 2400); },
      item(c) { tone(784, c, 0.1, 'triangle', 0.2); tone(1175, c + 0.09, 0.16, 'triangle', 0.18); },
      heal(c) { tone(523, c, 0.14, 'sine', 0.18); tone(659, c + 0.12, 0.14, 'sine', 0.18); tone(784, c + 0.24, 0.2, 'sine', 0.16); },
      shield(c) { tone(420, c, 0.12, 'square', 0.12, sfxBus, 700); noise(c, 0.1, 0.06, 3000); },
      victory(c) { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, c + i * 0.13, 0.22, 'triangle', 0.2)); },
      defeat(c) { [392, 330, 262, 196].forEach((f, i) => tone(f, c + i * 0.2, 0.3, 'sawtooth', 0.14)); }
    };
    function play(name, kind) {
      const c = resume(); if (!c || muted) return;
      const t = c.currentTime + 0.01;
      (sfx[name] || sfx.click)(t, kind);
    }

    // ---- BGM: simple looping chiptune (Am F C G), bass + arpeggio ----
    const bpm = 112, spb = 60 / bpm;
    const chords = [
      [220.0, 261.63, 329.63], [174.61, 220.0, 261.63],
      [261.63, 329.63, 392.0], [196.0, 246.94, 293.66]
    ];
    function scheduleStep(when, step) {
      const bar = Math.floor(step / 16) % chords.length, inBar = step % 16;
      const ch = chords[bar];
      if (inBar % 4 === 0) tone(ch[0] / 2, when, spb * 0.9, 'triangle', 0.5, musicBus); // bass
      const arp = ch[inBar % 3];
      tone(arp * 2, when, spb * 0.45, 'square', 0.12, musicBus);
      if (inBar === 14) tone(ch[2] * 2, when, spb * 1.2, 'sine', 0.1, musicBus);
    }
    function musicTick() {
      const c = ctx;
      while (nextNoteTime < c.currentTime + 0.18) {
        scheduleStep(nextNoteTime, musicStep);
        nextNoteTime += spb / 2; musicStep++;
      }
    }
    function startMusic() {
      const c = resume(); if (!c || musicTimer) return;
      nextNoteTime = c.currentTime + 0.06; musicStep = 0;
      musicTimer = setInterval(musicTick, 60);
    }
    function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

    function setMuted(m) {
      muted = m;
      try { localStorage.setItem('qc_muted', muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 1;
    }
    function isMuted() { return muted; }

    return { resume, play, startMusic, stopMusic, setMuted, isMuted };
  };
  root.QC_Audio = new AudioEngine();
})(window);
