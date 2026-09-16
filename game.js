function __zzhInit() {
  'use strict';

  // ================= Audio (WebAudio, no assets) =================
  let actx = null;
  function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }
  // sfxVolume (set up in the settings section below) is a 0~1 master
  // multiplier from the volume knob. exponentialRampToValueAtTime throws if
  // it ever ramps from exactly 0, hence the floor -- not audible at that level.
  let sfxVolume = 0.8;
  // Independent from sfxVolume -- BGM gets its own dial in 설정 rather than
  // riding along on the SFX slider. bgmVolume() (further down, next to the
  // rest of the BGM code) is what actually reads this.
  let bgmMasterVolume = 0.6;
  // Per-channel mute checkboxes in 설정 -- an explicit off for each, separate
  // from dragging its dial to zero. sfxOn gates every blip, bgmOn the pad.
  let sfxOn = true;
  let bgmOn = true;
  function blip(freq, dur, type, vol) {
    if (!actx || !sfxOn) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(Math.max(0.0001, (vol || 0.15) * sfxVolume), actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    osc.connect(gain).connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + dur);
  }
  const sfx = {
    // Generic UI tap -- deliberately short/quiet since it fires on nearly
    // every button in the app; anything louder or longer than this got
    // fatiguing fast when tried at higher volume/duration.
    tap: () => blip(600, 0.045, 'sine', 0.07),
    cast: () => blip(220, 0.18, 'sine', 0.12),
    bite: () => { blip(500, 0.1, 'triangle', 0.15); setTimeout(() => blip(650, 0.12, 'triangle', 0.12), 90); },
    hit: () => blip(700, 0.09, 'sine', 0.14),
    miss: () => blip(120, 0.2, 'square', 0.12),
    success: () => { blip(523, 0.12, 'sine', 0.15); setTimeout(() => blip(659, 0.12, 'sine', 0.15), 110); setTimeout(() => blip(784, 0.18, 'sine', 0.16), 220); },
    fail: () => { blip(300, 0.15, 'sawtooth', 0.12); setTimeout(() => blip(200, 0.25, 'sawtooth', 0.12), 130); },
    splash: () => { blip(90, 0.22, 'sine', 0.2); blip(180, 0.15, 'triangle', 0.1); },
    coin: () => { blip(880, 0.08, 'square', 0.1); setTimeout(() => blip(1180, 0.1, 'square', 0.1), 70); },
    // Distinct from coin() -- 보석 drops are a rare (5%) bonus, not a routine
    // currency tick, so this is a brighter 3-note sparkle rather than the
    // flat double-blip used for every ordinary shell gain.
    gem: () => {
      blip(784, 0.09, 'sine', 0.15);
      setTimeout(() => blip(1046, 0.09, 'sine', 0.15), 70);
      setTimeout(() => blip(1568, 0.16, 'sine', 0.17), 140);
    },
    // One flip-reveal blip per gacha tier, escalating in richness/length so
    // a legendary pull is unmistakably the biggest moment in the sequence.
    gachaReveal: (tier) => {
      if (tier === 'rare') { blip(523, 0.09, 'triangle', 0.13); setTimeout(() => blip(659, 0.1, 'triangle', 0.12), 80); }
      else if (tier === 'epic') { blip(587, 0.1, 'triangle', 0.15); setTimeout(() => blip(740, 0.1, 'triangle', 0.14), 90); setTimeout(() => blip(880, 0.12, 'triangle', 0.13), 180); }
      else if (tier === 'legendary') {
        blip(523, 0.1, 'sine', 0.17); setTimeout(() => blip(659, 0.1, 'sine', 0.17), 100);
        setTimeout(() => blip(784, 0.12, 'sine', 0.18), 200); setTimeout(() => blip(1046, 0.22, 'sine', 0.19), 320);
      } else { blip(392, 0.08, 'sine', 0.1); }
    },
    // Plays when the reeling hit-counter's LAST window opens -- i.e. every
    // fish icon is now filled, one more landed hit completes the catch.
    finalStretch: () => { setTimeout(() => { blip(880, 0.07, 'triangle', 0.13); setTimeout(() => blip(1174, 0.1, 'triangle', 0.14), 70); }, 60); }
  };

  // ================= Ambient background music (procedural, no assets) =================
  // Same zero-asset philosophy as the SFX blips above -- built entirely out
  // of oscillators instead of a licensed/composed audio file. First attempt
  // here was a single held two-note drone + filtered noise bed; in real
  // playtesting that read as "stuck on one note" (technically true -- it
  // never changed pitch at all) and generally ominous rather than calm (a
  // static low drone + filtered rumbling noise is a classic tension/horror
  // cue, not a cozy one). Replaced with a slow-cycling chord pad -- the
  // pitch set actually changes over time, and dropped the noise bed
  // entirely. Shares the single existing volume slider with SFX (sfxVolume)
  // rather than adding a second slider nobody asked for.
  let bgmNodes = null; // non-null while playing, so start/stop are idempotent
  let sparkleTimer = null;
  let chordTimer = null;
  let arpTimer = null;
  let droneNodes = [];
  let currentChord = null;
  let bgmThemeKey = null; // which 낚시터's theme is playing (null while silent)
  // Note frequencies (Hz) used below, named for readability.
  const N = { C2: 65.41, G2: 98.00, C3: 130.81, Eb3: 155.56, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, G5: 783.99, Bb5: 932.33, C6: 1046.50, Eb6: 1244.51, G6: 1567.98 };
  // One theme per 낚시터 -- all still oscillators, no audio files. Each is a
  // slow chord pad (hold/fade) plus optional layers:
  //   sparkle: random single notes from a scale, sparse
  //   arp:     a steady arpeggio over the current chord (tempo = 바다's drive)
  //   drone:   a continuous low pedal under everything (바다 = grandeur,
  //            심해 = quiet depth)
  const BGM_THEMES = {
    // 호수: the original calm pad -- I vi IV V in C, mid/high pentatonic sparkle.
    lake: {
      chords: [[N.C4, N.E4, N.G4], [N.A3, N.C4, N.E4], [N.F3, N.A3, N.C4], [N.G3, N.B3, N.D4]],
      hold: 13, fade: 4.5, voice: 'triangle', filter: 1100, gain: 0.16,
      sparkle: { notes: [N.E4, N.G4, N.A4, N.C5, N.D5, N.E5], min: 5000, range: 7000, wave: 'sine', gain: 0.04, decay: 4.5 }
    },
    // 바다: brighter, moving. Wide voicings, a quicker chord cycle, a
    // steady triangle arpeggio riding the chord, and a low C-G pedal that
    // makes the whole thing feel bigger than a pond.
    sea: {
      chords: [[N.C3, N.G3, N.E4, N.C5], [N.G3, N.D4, N.B3, N.G4], [N.A3, N.E4, N.C5, N.A4], [N.F3, N.C4, N.A4, N.F4]],
      hold: 8, fade: 2.6, voice: 'sawtooth', filter: 900, gain: 0.07,
      sparkle: { notes: [N.G4, N.C5, N.D5, N.E5, N.G5, N.C6], min: 3000, range: 4000, wave: 'sine', gain: 0.035, decay: 2.5 },
      arp: { step: 0.26, wave: 'triangle', gain: 0.045, octave: 2, attack: 0.02, decay: 0.32 },
      drone: { freqs: [N.C2, N.G2], wave: 'sine', gain: 0.09 }
    },
    // 심해: minor, slow and low, but not oppressive. The first pass used a
    // deliberately detuned drone pair (a constant ~0.4Hz beat) plus a 49Hz
    // sub under it, which reads as dread but sits uncomfortably in earbuds
    // and phone speakers. Now: a clean C-G fifth held quietly, a warmer
    // minor-9th pad (i VI iv v7 in C minor, triangle through a low filter),
    // a slow sine "music box" walking the chord tones, and low bell notes.
    abyss: {
      chords: [[N.C3, N.Eb3, N.G3, N.D4], [N.Ab3, N.C4, N.Eb4, N.G4], [N.F3, N.Ab3, N.C4, N.Eb4], [N.G3, N.Bb3, N.D4, N.F4]],
      hold: 16, fade: 6, voice: 'triangle', filter: 640, gain: 0.11,
      sparkle: { notes: [N.G4, N.Bb4, N.C5, N.D5, N.Eb5, N.G5], min: 3500, range: 5000, wave: 'sine', gain: 0.03, decay: 5 },
      arp: { step: 1.7, wave: 'sine', gain: 0.03, octave: 2, attack: 0.06, decay: 1.5 },
      drone: { freqs: [N.C2, N.G2], wave: 'sine', gain: 0.06 }
    }
  };
  function bgmTheme() { return BGM_THEMES[bgmThemeKey] || BGM_THEMES.lake; }
  function scheduleSparkle() {
    const th = bgmTheme().sparkle;
    if (!th) return;
    const delay = th.min + Math.random() * th.range;
    sparkleTimer = setTimeout(() => {
      if (bgmNodes) {
        const freq = th.notes[Math.floor(Math.random() * th.notes.length)];
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
        osc.type = th.wave;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, th.gain * bgmVolume()), actx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + th.decay);
        if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; osc.connect(gain).connect(pan).connect(bgmNodes.master); }
        else { osc.connect(gain).connect(bgmNodes.master); }
        osc.start();
        osc.stop(actx.currentTime + th.decay + 0.1);
      }
      scheduleSparkle();
    }, delay);
  }
  function playChordVoice(freq, master, th) {
    const osc = actx.createOscillator();
    osc.type = th.voice;
    osc.frequency.value = freq;
    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = th.filter;
    const gain = actx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(filter).connect(gain).connect(master);
    osc.start();
    const now = actx.currentTime;
    gain.gain.exponentialRampToValueAtTime(th.gain, now + th.fade);
    gain.gain.setValueAtTime(th.gain, now + th.hold - th.fade);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + th.hold);
    osc.stop(now + th.hold + 0.2);
  }
  let chordIndex = 0;
  function scheduleChordCycle() {
    const th = bgmTheme();
    if (bgmNodes) {
      currentChord = th.chords[chordIndex % th.chords.length];
      chordIndex++;
      currentChord.forEach(freq => playChordVoice(freq, bgmNodes.master, th));
    }
    // Next chord's fade-in starts while this one is still fading out, so
    // the pad crossfades continuously with no gap and no static hold.
    chordTimer = setTimeout(scheduleChordCycle, (th.hold - th.fade) * 1000);
  }
  // 바다's arpeggio: walks the current chord's notes (plus the root an
  // octave up) on a fixed step, each a short plucked triangle.
  let arpIndex = 0;
  function scheduleArp() {
    const th = bgmTheme().arp;
    if (!th) return;
    arpTimer = setTimeout(() => {
      if (bgmNodes && currentChord) {
        const notes = currentChord.concat([currentChord[0] * 2]);
        const freq = notes[arpIndex % notes.length] * (th.octave || 1);
        arpIndex++;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = th.wave;
        osc.frequency.value = freq;
        const now = actx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, th.gain), now + th.attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + th.attack + th.decay);
        osc.connect(gain).connect(bgmNodes.master);
        osc.start();
        osc.stop(now + th.attack + th.decay + 0.05);
      }
      scheduleArp();
    }, th.step * 1000);
  }
  function startDrone(master) {
    const th = bgmTheme().drone;
    if (!th) return;
    th.freqs.forEach((freq) => {
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.type = th.wave;
      osc.frequency.value = freq;
      gain.gain.value = 0.0001;
      osc.connect(gain).connect(master);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(th.gain / th.freqs.length, actx.currentTime + 3);
      droneNodes.push({ osc, gain });
    });
  }
  function bgmVolume() { return bgmMasterVolume * 0.3; } // internal balance scale, not the raw slider value
  function startBgm() {
    if (!actx || bgmNodes || !bgmOn) return;
    bgmThemeKey = (typeof stage === 'string' && BGM_THEMES[stage]) ? stage : 'lake';
    const master = actx.createGain();
    master.gain.value = bgmVolume();
    master.connect(actx.destination);
    bgmNodes = { master };
    chordIndex = 0;
    arpIndex = 0;
    currentChord = null;
    scheduleChordCycle();
    scheduleSparkle();
    scheduleArp();
    startDrone(master);
  }
  function stopBgm(fadeSeconds) {
    clearTimeout(sparkleTimer);
    clearTimeout(chordTimer);
    clearTimeout(arpTimer);
    if (!bgmNodes) return;
    const now = actx.currentTime;
    const tc = fadeSeconds ? fadeSeconds / 3 : 0.15;
    // Individual chord voices/sparkles are already self-scheduled to stop
    // on their own; dropping the shared master to silence is enough to cut
    // them off cleanly without tracking every live node. Drones are held
    // oscillators, so those get stopped explicitly after the fade.
    bgmNodes.master.gain.setTargetAtTime(0.0001, now, tc);
    const drones = droneNodes;
    droneNodes = [];
    drones.forEach(({ osc }) => { try { osc.stop(now + (fadeSeconds || 0.5) + 0.3); } catch (e) { /* already stopped */ } });
    bgmNodes = null;
    bgmThemeKey = null;
  }
  // 낚시터 changed: crossfade to that stage's theme (a no-op while silent --
  // the next startBgm() picks the right theme on its own).
  function switchBgmForStage() {
    if (!bgmNodes) return;
    if (bgmThemeKey === stage) return;
    stopBgm(1.5);
    setTimeout(() => { if (bgmOn && !bgmNodes) startBgm(); }, 900);
  }
  // Volume slider changes should retune the currently-playing pad too, not
  // just future sfx blips -- see the slider wiring below.
  function refreshBgmVolume() { if (bgmNodes) bgmNodes.master.gain.setTargetAtTime(bgmVolume(), actx.currentTime, 0.2); }

  // ================= Canvas background =================
  const gameEl = document.getElementById('game');
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  // Offscreen copy of everything static in the current scene (sky, ridges,
  // shore, foreground plants) -- painted once per size/stage, blitted each
  // frame. See renderBridgeCache() and SCENES.
  let bridgeCache = null;

  // #game's CSS size is driven by --vw-px/--vh-px rather than raw vw/vh --
  // window.visualViewport reports the *actual* visible area, which mobile
  // Safari's own vh/dvh units can still disagree with in some toolbar
  // states, leaving a dead gap on the side or bottom. Must run before
  // resize() below measures #game's layout.
  function setViewportVars() {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vw-px', w + 'px');
    document.documentElement.style.setProperty('--vh-px', h + 'px');
  }
  setViewportVars();
  window.addEventListener('resize', setViewportVars);
  window.addEventListener('orientationchange', setViewportVars);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportVars);
  }

  function resize() {
    const rect = gameEl.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bridgeCache = null;
  }
  window.addEventListener('resize', resize);
  resize();

  const sparkles = [];
  function initSparkles() {
    sparkles.length = 0;
    for (let i = 0; i < 60; i++) {
      sparkles.push({
        x: Math.random(), y: 0.28 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 1.2,
        size: 1 + Math.random() * 2.2
      });
    }
  }
  initSparkles();

  let idleFish = []; // decorative silhouettes
  function maybeSpawnIdleFish(t) {
    if (idleFish.length < 2 && Math.random() < 0.006) {
      idleFish.push({
        y: 0.45 + Math.random() * 0.4,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 0.03 + Math.random() * 0.03,
        x: Math.random() < 0.5 ? -0.1 : 1.1,
        bob: Math.random() * Math.PI * 2,
        scale: 0.7 + Math.random() * 0.6
      });
    }
    idleFish.forEach(f => { f.x += f.dir * f.speed * 0.016; });
    idleFish = idleFish.filter(f => f.x > -0.15 && f.x < 1.15);
  }

  const WATER_TOP_FRAC = 0.3;
  function waterTop() { return H * WATER_TOP_FRAC; }
  // ================= Scene helpers (shared by every 낚시터) =================
  // Deterministic ridge line (sum of sines) so mountains never shimmer
  // between frames or resizes. Returns the ridge's top y at x.
  function ridgeTop(x, baseY, amp, freq, seed) {
    const n = Math.sin(x * freq + seed) * 0.5 + Math.sin(x * freq * 2.3 + seed * 2.1) * 0.3 + Math.sin(x * freq * 5.1 + seed * 0.7) * 0.12;
    return baseY - amp * (0.55 + n * 0.5);
  }
  // Fills the band between a ridge and its base line. mirror > 0 flips it
  // below the base (a reflection, squashed by that factor and wobbling
  // with t) instead.
  function fillRidge(c, o) {
    c.beginPath();
    c.moveTo(0, o.baseY);
    for (let x = 0; x <= W; x += 6) {
      let y = ridgeTop(x, o.baseY, o.amp, o.freq, o.seed);
      if (o.mirror) y = o.baseY + (o.baseY - y) * o.mirror + Math.sin(x * 0.05 + (o.t || 0) * 1.4) * 2;
      c.lineTo(x, y);
    }
    c.lineTo(W, o.baseY);
    c.closePath();
    c.fillStyle = o.color;
    c.fill();
  }
  function conifer(c, x, baseY, h, w, color) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, baseY - h);
    c.lineTo(x - w * 0.5, baseY - h * 0.62); c.lineTo(x - w * 0.22, baseY - h * 0.62);
    c.lineTo(x - w * 0.72, baseY - h * 0.3); c.lineTo(x - w * 0.34, baseY - h * 0.3);
    c.lineTo(x - w * 0.95, baseY); c.lineTo(x + w * 0.95, baseY);
    c.lineTo(x + w * 0.34, baseY - h * 0.3); c.lineTo(x + w * 0.72, baseY - h * 0.3);
    c.lineTo(x + w * 0.22, baseY - h * 0.62); c.lineTo(x + w * 0.5, baseY - h * 0.62);
    c.closePath();
    c.fill();
  }
  function roundTree(c, x, baseY, h, w, color) {
    c.fillStyle = color;
    c.fillRect(x - w * 0.06, baseY - h * 0.45, w * 0.12, h * 0.45);
    [[0, 0.62, 0.5], [-0.3, 0.5, 0.36], [0.32, 0.48, 0.34], [-0.1, 0.8, 0.3], [0.15, 0.78, 0.28]].forEach(([dx, dy, r]) => {
      c.beginPath(); c.arc(x + dx * w, baseY - h * dy, w * r, 0, Math.PI * 2); c.fill();
    });
  }
  // A reed stem (optionally with a cattail head) or a thin leaf blade.
  function reed(c, x, baseY, h, lean, color, head) {
    c.strokeStyle = color;
    c.lineWidth = head ? 2.4 : 1.6;
    c.beginPath();
    c.moveTo(x, baseY);
    c.quadraticCurveTo(x + lean * 0.35, baseY - h * 0.55, x + lean, baseY - h);
    c.stroke();
    if (head) {
      c.fillStyle = '#3a2418';
      c.beginPath();
      c.ellipse(x + lean, baseY - h + 8, 3.2, 12, Math.atan2(lean, h) * -1, 0, Math.PI * 2);
      c.fill();
    }
  }
  function lilyPad(c, cx, cy, rx, ry, rot, fill, rim) {
    c.save();
    c.translate(cx, cy);
    c.rotate(rot);
    c.beginPath();
    c.moveTo(0, 0);
    c.ellipse(0, 0, rx, ry, 0, 0.32, Math.PI * 2 - 0.32);
    c.closePath();
    c.fillStyle = fill; c.fill();
    c.strokeStyle = rim; c.lineWidth = 1; c.stroke();
    c.restore();
  }
  // Depth gradient for any body of water: colors[] from surface to bottom.
  function fillWaterGradient(colors, top) {
    const grad = ctx.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.18, colors[1]);
    grad.addColorStop(0.55, colors[2]);
    grad.addColorStop(1, colors[3]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, W, H - top);
  }
  // Four drifting wave lines, alternating light/dark.
  function drawWaveLines(t, top, light, dark) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let layer = 0; layer < 4; layer++) {
      ctx.beginPath();
      const baseY = top + (H - top) * (0.15 + layer * 0.22);
      const amp = 6 + layer * 2;
      const freq = 0.008 - layer * 0.001;
      const speed = 0.6 + layer * 0.25;
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, baseY + Math.sin(x * freq + t * speed + layer) * amp);
      ctx.strokeStyle = layer % 2 === 0 ? light : dark;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();
  }
  // Soft shafts of light entering the water below (cx, topY), fanning out
  // slightly. Stacked translucent strips instead of a blur filter.
  function drawLightShafts(t, cx, topY, spreadW, rayColor, count) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i - (count - 1) / 2) / ((count - 1) / 2);
      const angle = -Math.PI / 2 + spread * 0.08 + Math.sin(t * 0.15 + i) * 0.015;
      const len = H * 0.8;
      const w = 22 + Math.sin(t * 0.3 + i * 2) * 7;
      ctx.save();
      ctx.translate(cx + spread * spreadW, topY);
      ctx.rotate(angle + Math.PI / 2);
      for (let k = 0; k < 4; k++) {
        const f = 1 - k * 0.22;
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, rayColor + '0.022)');
        g.addColorStop(1, rayColor + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-w * f / 2, 0); ctx.lineTo(w * f / 2, 0); ctx.lineTo(w * 1.6 * f, len); ctx.lineTo(-w * 1.6 * f, len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function drawSparkles(t, color) {
    ctx.save();
    const top = waterTop();
    sparkles.forEach(s => {
      const px = s.x * W;
      const py = top + s.y * (H - top);
      const distFromCenter = Math.abs(px - W * 0.5) / (W * 0.5);
      const baseAlpha = Math.max(0, 0.9 - distFromCenter * 1.1);
      const flick = (Math.sin(t * s.speed + s.phase) + 1) / 2;
      ctx.globalAlpha = baseAlpha * flick * 0.85;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // ================= 호수 scene =================
  // Dawn on a lake: sun low over three misty ridges, conifers and a round
  // tree framing the far shore, reeds and lily pads in the foreground
  // corners. The water mirrors the sky's warm band and the nearest ridge.
  const LAKE = {
    sky: ['#22305f', '#5f74ac', '#c7a6b6', '#ffd9a2'],
    sunGlow: 'rgba(255,214,150,',
    sunDisc: '#fff1cf',
    ridges: ['#5a6a99', '#3f5382', '#2d4266'],
    mist: 'rgba(232,226,240,',
    trees: '#14282c',
    treesLight: '#1c3a3a',
    reeds: '#0e2624',
    reedLeaf: '#173a34',
    lily: '#1f5a48', lilyRim: '#2f7a5c',
    water: ['#cfe2ea', '#7fb6c5', '#2f7d8e', '#0d3d4a'],
    waveA: '#ecf7f9', waveB: '#0a3a44',
    sparkle: '#fff6e0',
    ray: 'rgba(255,236,200,',
    reflect: 'rgba(255,214,160,',
    waterline: '#eafffb'
  };
  const LAKE_SUN_X = 0.64; // fraction of W

  function drawLakeStatic(c) {
    const wTop = waterTop();
    const th = LAKE;
    // sky
    const sky = c.createLinearGradient(0, 0, 0, wTop);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(0.45, th.sky[1]);
    sky.addColorStop(0.78, th.sky[2]);
    sky.addColorStop(1, th.sky[3]);
    c.fillStyle = sky;
    c.fillRect(0, 0, W, wTop + 4);
    // low sun: wide glow plus a soft disc, partly hidden by the ridges
    const sx = W * LAKE_SUN_X, sy = wTop - H * 0.075;
    const glow = c.createRadialGradient(sx, sy, 2, sx, sy, W * 0.55);
    glow.addColorStop(0, th.sunGlow + '0.55)');
    glow.addColorStop(0.35, th.sunGlow + '0.18)');
    glow.addColorStop(1, th.sunGlow + '0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, wTop + 4);
    const disc = c.createRadialGradient(sx, sy, 0, sx, sy, W * 0.06);
    disc.addColorStop(0, th.sunDisc);
    disc.addColorStop(0.7, th.sunDisc);
    disc.addColorStop(1, th.sunGlow + '0)');
    c.fillStyle = disc;
    c.beginPath(); c.arc(sx, sy, W * 0.06, 0, Math.PI * 2); c.fill();
    // three ridges, far to near, each with mist lying at its feet
    [
      { amp: H * 0.105, freq: 0.011, seed: 1.3, color: th.ridges[0], mist: 0.5 },
      { amp: H * 0.075, freq: 0.017, seed: 4.1, color: th.ridges[1], mist: 0.42 },
      { amp: H * 0.05, freq: 0.026, seed: 7.7, color: th.ridges[2], mist: 0.3 }
    ].forEach((r) => {
      fillRidge(c, { baseY: wTop + 2, amp: r.amp, freq: r.freq, seed: r.seed, color: r.color });
      const mistH = r.amp * 0.7;
      const mist = c.createLinearGradient(0, wTop - mistH, 0, wTop + 2);
      mist.addColorStop(0, th.mist + '0)');
      mist.addColorStop(1, th.mist + r.mist + ')');
      c.fillStyle = mist;
      c.fillRect(0, wTop - mistH, W, mistH + 2);
    });
    // birds
    c.strokeStyle = 'rgba(20,30,50,0.55)';
    c.lineWidth = 1.2;
    [[0.22, 0.42, 5], [0.27, 0.39, 4], [0.31, 0.44, 3.5]].forEach(([fx, fy, s]) => {
      const bx = W * fx, by = wTop * fy;
      c.beginPath(); c.moveTo(bx - s, by); c.quadraticCurveTo(bx - s * 0.5, by - s * 0.9, bx, by - s * 0.2); c.quadraticCurveTo(bx + s * 0.5, by - s * 0.9, bx + s, by); c.stroke();
    });
    // near shore: conifers on the left, a round tree and low brush on the right
    const shoreY = wTop + 3;
    c.fillStyle = th.treesLight;
    c.fillRect(0, shoreY - 4, W * 0.3, 4);
    conifer(c, W * 0.06, shoreY, H * 0.17, W * 0.055, th.trees);
    conifer(c, W * 0.14, shoreY, H * 0.22, W * 0.07, th.trees);
    conifer(c, W * 0.225, shoreY, H * 0.15, W * 0.05, th.trees);
    conifer(c, W * 0.29, shoreY, H * 0.11, W * 0.04, th.treesLight);
    roundTree(c, W * 0.9, shoreY, H * 0.19, W * 0.11, th.trees);
    conifer(c, W * 0.79, shoreY, H * 0.09, W * 0.035, th.treesLight);
    // dawn mist lying on the water just off the far shore
    const wm = c.createLinearGradient(0, wTop, 0, wTop + H * 0.1);
    wm.addColorStop(0, th.mist + '0.32)');
    wm.addColorStop(1, th.mist + '0)');
    c.fillStyle = wm;
    c.fillRect(0, wTop, W, H * 0.1);
    // foreground: reeds growing up from below the frame in both corners,
    // lily pads floating near them
    const reedBase = H + 12;
    [[0.04, 0.34, -6, true], [0.075, 0.42, 4, true], [0.11, 0.3, -3, false], [0.03, 0.26, 8, false], [0.13, 0.36, 7, true], [0.06, 0.2, -10, false]]
      .forEach(([fx, fh, lean, head]) => reed(c, W * fx, reedBase, H * fh, lean, head ? th.reeds : th.reedLeaf, head));
    [[0.96, 0.3, 5, true], [0.925, 0.38, -4, true], [0.98, 0.22, -7, false], [0.9, 0.27, 6, false], [0.945, 0.18, 3, false]]
      .forEach(([fx, fh, lean, head]) => reed(c, W * fx, reedBase, H * fh, lean, head ? th.reeds : th.reedLeaf, head));
    lilyPad(c, W * 0.2, H * 0.81, W * 0.07, W * 0.03, 0.2, th.lily, th.lilyRim);
    lilyPad(c, W * 0.1, H * 0.76, W * 0.05, W * 0.022, -0.5, th.lily, th.lilyRim);
    lilyPad(c, W * 0.85, H * 0.79, W * 0.06, W * 0.026, 2.4, th.lily, th.lilyRim);
    lilyPad(c, W * 0.94, H * 0.73, W * 0.042, W * 0.018, 1.1, th.lily, th.lilyRim);
  }

  function drawLakeWater(t) {
    const th = LAKE;
    const top = waterTop();
    fillWaterGradient(th.water, top);
    // the sky's warm band and the sun, mirrored: a wobbling column under the sun
    const sx = W * LAKE_SUN_X;
    const reflH = (H - top) * 0.5;
    const halfW = W * 0.085;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx - halfW, top);
    for (let y = top; y <= top + reflH; y += 5) {
      const k = (y - top) / reflH;
      ctx.lineTo(sx - halfW * (1 - k * 0.4) + Math.sin(y * 0.09 + t * 1.3) * (3 + 7 * k), y);
    }
    for (let y = top + reflH; y >= top; y -= 5) {
      const k = (y - top) / reflH;
      ctx.lineTo(sx + halfW * (1 - k * 0.4) + Math.sin(y * 0.1 + t * 1.1 + 2) * (3 + 7 * k), y);
    }
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, top, 0, top + reflH);
    rg.addColorStop(0, th.reflect + '0.32)');
    rg.addColorStop(0.35, th.reflect + '0.12)');
    rg.addColorStop(1, th.reflect + '0)');
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();
    // warm sky band mirrored right at the waterline
    const band = ctx.createLinearGradient(0, top, 0, top + H * 0.14);
    band.addColorStop(0, th.reflect + '0.22)');
    band.addColorStop(1, th.reflect + '0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, top, W, H * 0.14);
    // nearest ridge and the shore trees, reflected and wobbling
    ctx.save();
    ctx.globalAlpha = 0.11;
    fillRidge(ctx, { baseY: top, amp: H * 0.05, freq: 0.026, seed: 7.7, color: '#08202a', mirror: 0.45, t });
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#08202a';
    [[0.14, 0.22, 0.06], [0.06, 0.17, 0.045], [0.225, 0.15, 0.04], [0.9, 0.19, 0.09]].forEach(([fx, fh, fw]) => {
      const x = W * fx, h = H * fh * 0.3, w = W * fw;
      ctx.beginPath();
      ctx.moveTo(x - w, top);
      for (let y = top; y <= top + h; y += 4) ctx.lineTo(x - w * (1 - (y - top) / h) + Math.sin(y * 0.14 + t * 1.5) * 3, y);
      for (let y = top + h; y >= top; y -= 4) ctx.lineTo(x + w * (1 - (y - top) / h) + Math.sin(y * 0.14 + t * 1.5) * 3, y);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
    drawWaveLines(t, top, th.waveA, th.waveB);
    // waterline
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = th.waterline;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.lineTo(W, top + 1); ctx.stroke();
    ctx.restore();
  }

  // ================= 바다 scene =================
  // Noon at the end of a breakwater: high sun, cumulus clouds, a distant
  // island with a lighthouse, gulls; tetrapods piled in the foreground
  // corners. Deep blue water with a glitter path and drifting whitecaps.
  const SEA = {
    sky: ['#2f6fb8', '#79bde6', '#c8e6f4', '#e6f2f8'],
    sunGlow: 'rgba(255,250,225,',
    cloud: 'rgba(255,255,255,',
    island: '#7d9fb8', islandFar: '#a6c0d3',
    lighthouse: '#f2f0ea', lighthouseBand: '#d9483b', lighthouseRoof: '#3a3f47',
    tetra: '#8b949c', tetraDark: '#5f6870', tetraLight: '#aab2b9',
    foam: 'rgba(255,255,255,',
    water: ['#bfe4ef', '#4aaccb', '#1a7695', '#083a52'],
    waveA: '#f2fbfd', waveB: '#0a3b50',
    sparkle: '#ffffff',
    ray: 'rgba(230,246,255,',
    glitter: 'rgba(255,255,255,',
    waterline: '#f4fdff'
  };
  const SEA_SUN_X = 0.32;

  function tetrapod(c, x, y, s, th) {
    // three legs of a tetrapod seen from the side: a Y with a stub
    const leg = (a, len, w, color) => {
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = color;
      c.beginPath(); c.moveTo(-w, 0); c.lineTo(w, 0); c.lineTo(w * 0.7, -len); c.lineTo(-w * 0.7, -len); c.closePath(); c.fill();
      c.restore();
    };
    leg(-0.5, s, s * 0.28, th.tetraDark);
    leg(2.2, s * 0.9, s * 0.28, th.tetraDark);
    leg(0.9, s * 0.95, s * 0.28, th.tetra);
    leg(-2.6, s * 0.7, s * 0.26, th.tetraLight);
    c.fillStyle = th.tetra;
    c.beginPath(); c.arc(x, y, s * 0.34, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath(); c.arc(x - s * 0.1, y - s * 0.1, s * 0.16, 0, Math.PI * 2); c.fill();
  }
  function cloud(c, x, y, s, color) {
    c.fillStyle = color;
    [[0, 0, 1], [-0.9, 0.15, 0.7], [0.95, 0.2, 0.75], [-0.4, -0.35, 0.8], [0.45, -0.3, 0.85], [1.6, 0.35, 0.5], [-1.5, 0.4, 0.45]].forEach(([dx, dy, r]) => {
      c.beginPath(); c.arc(x + dx * s, y + dy * s, s * r, 0, Math.PI * 2); c.fill();
    });
    [[-1.2, 0.45, 0.45], [0.2, 0.5, 0.5], [1.2, 0.5, 0.42]].forEach(([dx, dy, r]) => {
      c.beginPath(); c.arc(x + dx * s, y + dy * s, s * r, 0, Math.PI * 2); c.fill();
    });
  }

  function drawSeaStatic(c) {
    const wTop = waterTop();
    const th = SEA;
    // sky
    const sky = c.createLinearGradient(0, 0, 0, wTop);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(0.5, th.sky[1]);
    sky.addColorStop(0.85, th.sky[2]);
    sky.addColorStop(1, th.sky[3]);
    c.fillStyle = sky;
    c.fillRect(0, 0, W, wTop + 4);
    // high sun: a bright glare rather than a disc (it sits under the status bar)
    const sx = W * SEA_SUN_X, sy = wTop * 0.18;
    const glow = c.createRadialGradient(sx, sy, 2, sx, sy, W * 0.5);
    glow.addColorStop(0, th.sunGlow + '0.85)');
    glow.addColorStop(0.25, th.sunGlow + '0.3)');
    glow.addColorStop(1, th.sunGlow + '0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, wTop + 4);
    // clouds
    cloud(c, W * 0.62, wTop * 0.4, W * 0.06, th.cloud + '0.92)');
    cloud(c, W * 0.2, wTop * 0.56, W * 0.045, th.cloud + '0.85)');
    cloud(c, W * 0.86, wTop * 0.62, W * 0.035, th.cloud + '0.8)');
    // distant island with a lighthouse (right), hazy headland (left)
    c.fillStyle = th.islandFar;
    c.beginPath(); c.moveTo(-10, wTop + 2); c.quadraticCurveTo(W * 0.08, wTop - H * 0.03, W * 0.2, wTop + 2); c.closePath(); c.fill();
    c.fillStyle = th.island;
    c.beginPath(); c.moveTo(W * 0.68, wTop + 2); c.quadraticCurveTo(W * 0.8, wTop - H * 0.045, W * 0.9, wTop - H * 0.02); c.quadraticCurveTo(W * 0.97, wTop - H * 0.01, W + 10, wTop + 2); c.closePath(); c.fill();
    const lx = W * 0.84, lh = H * 0.075, lw = W * 0.022;
    c.fillStyle = th.lighthouse;
    c.beginPath(); c.moveTo(lx - lw, wTop - H * 0.018); c.lineTo(lx + lw, wTop - H * 0.018); c.lineTo(lx + lw * 0.7, wTop - H * 0.018 - lh); c.lineTo(lx - lw * 0.7, wTop - H * 0.018 - lh); c.closePath(); c.fill();
    c.fillStyle = th.lighthouseBand;
    c.fillRect(lx - lw * 0.85, wTop - H * 0.018 - lh * 0.55, lw * 1.7, lh * 0.18);
    c.fillStyle = th.lighthouseRoof;
    c.fillRect(lx - lw * 0.8, wTop - H * 0.018 - lh - lh * 0.16, lw * 1.6, lh * 0.16);
    c.fillStyle = '#fff3b0';
    c.fillRect(lx - lw * 0.5, wTop - H * 0.018 - lh - lh * 0.02, lw, lh * 0.1);
    // gulls
    c.strokeStyle = 'rgba(40,50,70,0.6)';
    c.lineWidth = 1.2;
    [[0.5, 0.3, 6], [0.56, 0.26, 5], [0.44, 0.35, 4]].forEach(([fx, fy, s]) => {
      const bx = W * fx, by = wTop * fy;
      c.beginPath(); c.moveTo(bx - s, by); c.quadraticCurveTo(bx - s * 0.5, by - s * 0.9, bx, by - s * 0.2); c.quadraticCurveTo(bx + s * 0.5, by - s * 0.9, bx + s, by); c.stroke();
    });
    // horizon haze lying on the water
    const hz = c.createLinearGradient(0, wTop, 0, wTop + H * 0.06);
    hz.addColorStop(0, 'rgba(230,242,248,0.45)');
    hz.addColorStop(1, 'rgba(230,242,248,0)');
    c.fillStyle = hz;
    c.fillRect(0, wTop, W, H * 0.06);
    // foreground tetrapods in both bottom corners, with foam at their feet
    // (the bottom ~10% of the frame sits under the tab bar, so the pile
    // peaks around 0.8H and only its feet are hidden)
    const tS = W * 0.07;
    tetrapod(c, W * 0.05, H * 0.8, tS, th);
    tetrapod(c, W * 0.15, H * 0.86, tS * 1.1, th);
    tetrapod(c, W * 0.0, H * 0.9, tS * 0.9, th);
    tetrapod(c, W * 0.95, H * 0.82, tS, th);
    tetrapod(c, W * 0.86, H * 0.88, tS * 1.05, th);
    c.strokeStyle = th.foam + '0.55)';
    c.lineWidth = 2;
    [[0.02, 0.77, 0.12], [0.1, 0.74, 0.08], [0.88, 0.79, 0.1], [0.94, 0.76, 0.06]].forEach(([fx, fy, fw]) => {
      c.beginPath(); c.moveTo(W * fx, H * fy); c.quadraticCurveTo(W * (fx + fw * 0.5), H * fy - 5, W * (fx + fw), H * fy); c.stroke();
    });
  }

  function drawSeaWater(t) {
    const th = SEA;
    const top = waterTop();
    fillWaterGradient(th.water, top);
    // glitter path under the sun: a wobbling column of light
    const sx = W * SEA_SUN_X;
    const reflH = (H - top) * 0.45;
    const halfW = W * 0.1;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx - halfW, top);
    for (let y = top; y <= top + reflH; y += 5) {
      const k = (y - top) / reflH;
      ctx.lineTo(sx - halfW * (1 - k * 0.5) + Math.sin(y * 0.11 + t * 1.6) * (3 + 8 * k), y);
    }
    for (let y = top + reflH; y >= top; y -= 5) {
      const k = (y - top) / reflH;
      ctx.lineTo(sx + halfW * (1 - k * 0.5) + Math.sin(y * 0.1 + t * 1.3 + 2) * (3 + 8 * k), y);
    }
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, top, 0, top + reflH);
    rg.addColorStop(0, th.glitter + '0.35)');
    rg.addColorStop(0.4, th.glitter + '0.12)');
    rg.addColorStop(1, th.glitter + '0)');
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();
    // bright band right at the horizon
    const band = ctx.createLinearGradient(0, top, 0, top + H * 0.1);
    band.addColorStop(0, 'rgba(255,255,255,0.28)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, top, W, H * 0.1);
    drawWaveLines(t, top, th.waveA, th.waveB);
    // drifting whitecaps: short foam strokes sliding left, each on its own lane
    ctx.save();
    ctx.strokeStyle = th.foam + '0.55)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const lane = 0.06 + (i * 0.37) % 1 * 0.6;
      const speed = 0.012 + (i % 3) * 0.006;
      const x = ((i * 0.23 + 1 - (t * speed) % 1) % 1) * W;
      const y = top + (H - top) * lane + Math.sin(t * 1.2 + i) * 2;
      const len = 14 + (i % 4) * 8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len * 0.5, y - 3, x + len, y); ctx.stroke();
    }
    ctx.restore();
    // waterline
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = th.waterline;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.lineTo(W, top + 1); ctx.stroke();
    ctx.restore();
  }

  // ================= 심해 scene =================
  // No sky at all: the same dark column continues above the "waterline",
  // lit only by a lamp somewhere far above, marine snow drifting down,
  // bioluminescent motes drifting up, jellyfish, and a seafloor with
  // hydrothermal vents and tube worms in the corners.
  const ABYSS = {
    water: ['#0d2140', '#081a33', '#050f22', '#02060f'],
    upper: ['#123252', '#0d2140'],
    beam: 'rgba(150,210,235,',
    snow: 'rgba(200,220,235,',
    mote: '#7fe0c8', moteAlt: '#5fb8ff',
    floorFar: '#0a1a2c', floor: '#06101c',
    rock: '#0c1a2a', rockLight: '#16304a',
    vent: 'rgba(255,120,60,', ventCore: '#ffb070',
    jelly: 'rgba(140,200,255,',
    ray: 'rgba(120,180,220,',
    swellA: '#1f3f66', swellB: '#02060f',
    idleFish: 'rgba(150,215,235,1)'
  };

  function drawAbyssStatic(c) {
    const wTop = waterTop();
    const th = ABYSS;
    // the column above the (invisible) waterline -- just deeper water
    const up = c.createLinearGradient(0, 0, 0, wTop + 4);
    up.addColorStop(0, th.upper[0]);
    up.addColorStop(1, th.upper[1]);
    c.fillStyle = up;
    c.fillRect(0, 0, W, wTop + 4);
    // lamp light from far above, brightest near the top
    const beam = c.createRadialGradient(W * 0.5, -H * 0.1, 10, W * 0.5, -H * 0.1, H * 0.62);
    beam.addColorStop(0, th.beam + '0.4)');
    beam.addColorStop(0.5, th.beam + '0.1)');
    beam.addColorStop(1, th.beam + '0)');
    c.fillStyle = beam;
    c.fillRect(0, 0, W, wTop + 4);
    // marine snow in that upper column (deterministic scatter)
    for (let i = 0; i < 45; i++) {
      const x = (i * 137.5) % W, y = (i * 71.3) % wTop;
      c.fillStyle = th.snow + (0.12 + (i % 4) * 0.07) + ')';
      c.beginPath(); c.arc(x, y, 0.8 + (i % 3) * 0.5, 0, Math.PI * 2); c.fill();
    }
    // seafloor: two dark ridge bands rising from the bottom edge
    fillRidge(c, { baseY: H + 2, amp: H * 0.13, freq: 0.02, seed: 2.2, color: th.floorFar });
    fillRidge(c, { baseY: H + 2, amp: H * 0.085, freq: 0.035, seed: 5.1, color: th.floor });
    // hydrothermal vents left of centre: chimneys with a warm glow at the mouth
    const vx = W * 0.3;
    const glow = c.createRadialGradient(vx, H * 0.86, 2, vx, H * 0.86, W * 0.17);
    glow.addColorStop(0, th.vent + '0.5)');
    glow.addColorStop(1, th.vent + '0)');
    c.fillStyle = glow;
    c.fillRect(vx - W * 0.2, H * 0.86 - W * 0.2, W * 0.4, W * 0.3);
    [[vx - W * 0.05, 0.11, 0.028], [vx + W * 0.01, 0.16, 0.034], [vx + W * 0.07, 0.09, 0.024]].forEach(([x, fh, fw]) => {
      const h = H * fh, w = W * fw;
      c.fillStyle = th.rock;
      c.beginPath(); c.moveTo(x - w, H); c.lineTo(x - w * 0.4, H - h); c.lineTo(x + w * 0.4, H - h); c.lineTo(x + w, H); c.closePath(); c.fill();
      c.fillStyle = th.ventCore;
      c.beginPath(); c.ellipse(x, H - h, w * 0.4, 2, 0, 0, Math.PI * 2); c.fill();
    });
    // rock outcrops in both bottom corners
    c.fillStyle = th.rock;
    c.beginPath(); c.moveTo(-5, H); c.quadraticCurveTo(W * 0.05, H * 0.78, W * 0.2, H * 0.86); c.quadraticCurveTo(W * 0.26, H * 0.95, W * 0.3, H + 5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(W + 5, H); c.quadraticCurveTo(W * 0.95, H * 0.8, W * 0.82, H * 0.88); c.quadraticCurveTo(W * 0.75, H * 0.95, W * 0.7, H + 5); c.closePath(); c.fill();
    c.fillStyle = th.rockLight;
    c.beginPath(); c.moveTo(W * 0.02, H * 0.86); c.quadraticCurveTo(W * 0.08, H * 0.8, W * 0.16, H * 0.87); c.quadraticCurveTo(W * 0.1, H * 0.86, W * 0.02, H * 0.86); c.closePath(); c.fill();
    // tube worms on the right outcrop: pale stalks with red plumes
    [[0.87, 0.865, 0.03], [0.905, 0.875, 0.038], [0.94, 0.86, 0.026]].forEach(([fx, fy, fh]) => {
      const x = W * fx, y = H * fy, h = H * fh;
      c.strokeStyle = '#d9d0c8'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2, y - h * 0.5, x + 1, y - h); c.stroke();
      c.fillStyle = '#e0524a';
      c.beginPath(); c.arc(x + 1, y - h, 2.6, 0, Math.PI * 2); c.fill();
    });
  }

  function drawAbyssWater(t) {
    const th = ABYSS;
    const top = waterTop();
    fillWaterGradient(th.water, top);
    // the lamp beam continues below the (invisible) waterline -- same gradient
    // as the static upper column, so the two halves meet without a seam
    const beam = ctx.createRadialGradient(W * 0.5, -H * 0.1, 10, W * 0.5, -H * 0.1, H * 0.62);
    beam.addColorStop(0, th.beam + '0.4)');
    beam.addColorStop(0.5, th.beam + '0.1)');
    beam.addColorStop(1, th.beam + '0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, top, W, H - top);
    drawWaveLines(t, top, th.swellA, th.swellB);
    // marine snow sinking, bioluminescent motes drifting up and pulsing
    ctx.save();
    sparkles.forEach((s, i) => {
      const glowing = i % 3 === 0;
      const drift = glowing ? -t * 0.006 * s.speed : t * 0.004 * s.speed;
      const fy = (((s.y - 0.28 + drift) % 0.6) + 0.6) % 0.6 + 0.28;
      const px = s.x * W + Math.sin(t * 0.3 + s.phase) * 8;
      const py = top + fy * (H - top);
      ctx.globalAlpha = glowing ? 0.45 + 0.4 * Math.sin(t * s.speed + s.phase) : 0.22;
      ctx.fillStyle = glowing ? (i % 2 ? th.mote : th.moteAlt) : '#c8d8e6';
      ctx.beginPath(); ctx.arc(px, py, glowing ? s.size * 0.9 : s.size * 0.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    // two jellyfish drifting through, lit from within
    [[0.2, 0.55, 0.8], [0.78, 0.42, 1.3]].forEach(([fx, fy, sp], i) => {
      const x = W * (fx + Math.sin(t * 0.08 * sp + i) * 0.08);
      const y = top + (H - top) * (fy + Math.sin(t * 0.12 * sp + i * 2) * 0.05);
      const r = W * 0.045;
      ctx.save();
      const g = ctx.createRadialGradient(x, y, 1, x, y, r * 1.8);
      g.addColorStop(0, th.jelly + '0.5)');
      g.addColorStop(1, th.jelly + '0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.jelly + '0.45)';
      ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.quadraticCurveTo(x, y + r * 0.5, x - r, y); ctx.fill();
      ctx.strokeStyle = th.jelly + '0.4)';
      ctx.lineWidth = 1;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * r * 0.35, y + r * 0.2);
        ctx.quadraticCurveTo(x + k * r * 0.5 + Math.sin(t * 1.5 + k) * 4, y + r * 1.4, x + k * r * 0.4, y + r * 2.4);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  // ---- Scenes: one per 낚시터 (FishData.STAGES). Each supplies the static
  // backdrop (painted once into the cache), the animated water layers
  // (drawn under the backdrop each frame, and re-used by the float's
  // water mask), and whatever lives above the backdrop. ----
  const SCENES = {
    lake: {
      paintStatic: (c) => drawLakeStatic(c),
      paintWater: (t) => { drawLakeWater(t); drawLightShafts(t, W * LAKE_SUN_X, waterTop() - 10, W * 0.22, LAKE.ray, 5); },
      paintAbove: (t) => { drawSparkles(t, LAKE.sparkle); maybeSpawnIdleFish(t); drawIdleFish(t); }
    },
    sea: {
      paintStatic: (c) => drawSeaStatic(c),
      paintWater: (t) => { drawSeaWater(t); drawLightShafts(t, W * SEA_SUN_X, waterTop() - 10, W * 0.26, SEA.ray, 6); },
      paintAbove: (t) => { drawSparkles(t, SEA.sparkle); maybeSpawnIdleFish(t); drawIdleFish(t); }
    },
    abyss: {
      paintStatic: (c) => drawAbyssStatic(c),
      paintWater: (t) => { drawAbyssWater(t); drawLightShafts(t, W * 0.5, -20, W * 0.14, ABYSS.ray, 3); },
      paintAbove: (t) => { maybeSpawnIdleFish(t); drawIdleFish(t, ABYSS.idleFish); }
    }
  };
  function scene() { return SCENES[stage] || SCENES.lake; }

  function renderBridgeCache() {
    bridgeCache = document.createElement('canvas');
    bridgeCache.width = Math.max(1, Math.round(W * DPR));
    bridgeCache.height = Math.max(1, Math.round(H * DPR));
    const c = bridgeCache.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    applyZoom(c); // baked in, so the blit needs no scaling (stays crisp)
    scene().paintStatic(c);
  }

  function drawIdleFish(t, color) {
    idleFish.forEach(f => {
      const top = waterTop();
      const px = f.x * W;
      const py = top + f.y * (H - top) + Math.sin(t * 2 + f.bob) * 6;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(f.dir * f.scale, f.scale);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color || '#04262c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 6, 0, 0, Math.PI * 2);
      ctx.moveTo(-14, 0);
      ctx.lineTo(-24, -7);
      ctx.lineTo(-24, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  // ================= Bobber (fishing float) =================
  // Unlike the old version's fixed center position, the float appears
  // wherever the player tapped to cast -- see cast() below.
  let bobber = null; // { x, y } in the same pre-zoom logical space as W/H
  let bobberState = 'hidden'; // hidden | waiting | bite | reeling
  let bobberDipT = 0;
  let bobberTugT = -10; // set on each perfect hit while reeling

  function drawBobber(t) {
    if (bobberState === 'hidden' || !bobber) return;
    const bx = bobber.x, byBase = bobber.y;
    let by = byBase + Math.sin(t * 2.2) * 4;
    if (bobberState === 'bite') {
      const dip = Math.max(0, Math.sin((t - bobberDipT) * 6));
      by += dip * 20;
    }
    const tug = t - bobberTugT;
    const tugging = bobberState === 'reeling' && tug >= 0 && tug < 0.35;
    if (tugging) {
      const decay = 1 - tug / 0.35;
      by -= Math.sin(tug * 45) * 10 * decay + 5 * decay;
    }

    // enlarged classic float: dark rod, bright tip antenna, torpedo body
    const bodyW = 22, bodyH = 36, antennaLen = 34;
    const bodyTopY = by - bodyH * 0.5;
    const antennaTopY = bodyTopY - antennaLen;
    // only the upper ~35% of the body sits above the surface -- the rest is submerged
    const submergeFrac = 0.35;
    // Waterline (and the ripple/plane drawn at it) now tracks the float's
    // OWN current bob/dip/tug position, not the fixed resting byBase --
    // previously the ring sat at a fixed height while the body's own
    // submerged-tint boundary moved with the bob, so the two drifted out of
    // sync as it bobbed (the ring stopped lining up with where the body
    // actually met the water). Locking both to the same `by` keeps the
    // surface visually glued to the float at all times.
    const waterLineY = bodyTopY + bodyH * submergeFrac;

    // line from the rod (off-screen above) down to the float
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by); ctx.stroke();

    // antenna: dark rod with a bright orange tip and a small bead
    ctx.strokeStyle = '#3a2a20';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(bx, bodyTopY); ctx.lineTo(bx, antennaTopY); ctx.stroke();
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(bx, antennaTopY + antennaLen * 0.5); ctx.lineTo(bx, antennaTopY); ctx.stroke();
    ctx.fillStyle = '#ffcf4d';
    ctx.beginPath(); ctx.arc(bx, antennaTopY, 2.6, 0, Math.PI * 2); ctx.fill();

    // body: torpedo float, drawn in full (plain white/red) -- the water
    // mask painted over it below is what actually sells "submerged", so
    // this doesn't need its own underwater tint baked in anymore.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, by, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f4f1e6';
    ctx.fillRect(bx - bodyW, by - bodyH, bodyW * 2, bodyH * 2);
    ctx.fillStyle = '#e6472f';
    ctx.fillRect(bx - bodyW, by - bodyH, bodyW * 2, bodyH * 0.62);
    ctx.restore();

    // dark separator band + rim highlight for a rounded, glossy look
    ctx.strokeStyle = 'rgba(30,20,15,0.5)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - bodyW * 0.5, bodyTopY + bodyH * 0.6);
    ctx.lineTo(bx + bodyW * 0.5, bodyTopY + bodyH * 0.6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(bx - bodyW * 0.18, by - bodyH * 0.18, bodyW * 0.16, bodyH * 0.28, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(bx, by, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ---- Water mask: instead of trying to fake "submerged" behind the
    // float with a ring/tint that has to stay perfectly synced to its bob
    // (fragile, and an encircling ring reads as a halo/UFO ring rather than
    // water), just paint the actual water OVER the lower portion, same as
    // if the real water surface were sitting in front of it. A wavy top
    // edge (instead of a hard flat line) is what actually sells "water
    // surface" rather than "a rectangle was pasted on". ----
    // Everything below is clipped to the float's own ellipse silhouette --
    // first pass had the mask as a separate wider rectangle-ish shape with
    // hard vertical sides, which stuck out past the body's rounded/tapered
    // outline and read as a blocky curtain hanging off it rather than water
    // hugging a round object. Clipping to the same ellipse the body itself
    // uses guarantees the mask's sides always follow the body's curve.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, by, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();
    const maskBottom = by + bodyH * 0.5;
    const halfW = bodyW * 0.5;
    const waveSteps = 10;
    ctx.beginPath();
    ctx.moveTo(bx - halfW, maskBottom);
    ctx.lineTo(bx - halfW, waterLineY);
    for (let i = 0; i <= waveSteps; i++) {
      const x = bx - halfW + (halfW * 2) * (i / waveSteps);
      const wave = Math.sin(i * 0.9 + t * 3) * 2;
      ctx.lineTo(x, waterLineY + wave);
    }
    ctx.lineTo(bx + halfW, maskBottom);
    ctx.closePath();
    ctx.clip();
    // Not a fixed water colour (that only ever matched one spot of one
    // version of the background): repaint the real water layers -- depth
    // gradient, the opening's reflection, the light shafts -- clipped to
    // the submerged part, so it's covered by exactly what surrounds it.
    // Slightly translucent so the body still reads through the surface.
    ctx.globalAlpha = 0.86;
    scene().paintWater(t);
    ctx.globalAlpha = 1;
    // a couple of short, subtle ripple accents sitting on the mask itself
    // (not encircling the float) for a touch of surface texture
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    [0.35, 0.62].forEach((frac, i) => {
      const wob = Math.sin(t * 2.4 + i * 3) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - halfW + wob, waterLineY + (maskBottom - waterLineY) * frac);
      ctx.lineTo(bx + halfW + wob, waterLineY + (maskBottom - waterLineY) * frac);
      ctx.stroke();
    });
    // bright meniscus highlight right where the float pierces the surface,
    // clipped along with everything else so it can't poke past the body
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - halfW, waterLineY);
    for (let i = 0; i <= waveSteps; i++) {
      const x = bx - halfW + (halfW * 2) * (i / waveSteps);
      const wave = Math.sin(i * 0.9 + t * 3) * 2;
      ctx.lineTo(x, waterLineY + wave);
    }
    ctx.stroke();
    ctx.restore();
  }

  const ZOOM = 1.18;
  function applyZoom(c) {
    const anchorX = W * 0.5, anchorY = H * 0.24;
    c.translate(anchorX, anchorY);
    c.scale(ZOOM, ZOOM);
    c.translate(-anchorX, -anchorY);
  }
  function renderLoop(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    applyZoom(ctx);
    scene().paintWater(t);
    ctx.restore();
    if (!bridgeCache) renderBridgeCache();
    ctx.drawImage(bridgeCache, 0, 0, W, H);
    ctx.save();
    applyZoom(ctx);
    scene().paintAbove(t);
    drawBobber(t);
    ctx.restore();
    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  // ================= Fishing loop (cast -> bite -> reel -> result) =================
  const TAP_ZONE_TOP_FRAC = 0.38;    // matches .reel-gauge's `top` in style.css
  const TAP_ZONE_BOTTOM_FRAC = 0.82; // matches .reel-gauge's `top + height`

  // Species/tier data lives in fish-data.js (loaded before this file) as
  // window.FishData; the live loop picks from FishData.pickCatch().
  //
  // Hit tolerance scales with the casting bar's actual current speed
  // (reel.period) rather than being fixed -- a slow sweep is more
  // forgiving, a fast one demands real precision. 8% combined at the
  // fastest period anywhere in the game (전설's), widening to 15% combined
  // at the slowest (꽝's); clamped outside that range, so 정밀함 stretching
  // a period even slower than 꽝's base just stays capped at 15%, not
  // higher. Applied on both sides of the zone (see attemptHit()'s inZone
  // check), so each side gets half the combined total.
  const PERIOD_RANGE = (() => {
    const periods = Object.values(FishData.TIERS).map(t => t.reel.period);
    return { fastest: Math.min(...periods), slowest: Math.max(...periods) };
  })();
  const TOLERANCE_TOTAL_AT_FASTEST = 8;
  const TOLERANCE_TOTAL_AT_SLOWEST = 15;
  function hitToleranceForPeriod(period) {
    const { fastest, slowest } = PERIOD_RANGE;
    const t = slowest === fastest ? 0 : Math.min(1, Math.max(0, (period - fastest) / (slowest - fastest)));
    const total = TOLERANCE_TOTAL_AT_FASTEST + t * (TOLERANCE_TOTAL_AT_SLOWEST - TOLERANCE_TOTAL_AT_FASTEST);
    return total / 2;
  }

  let state = 'idle'; // idle | waiting | bite | reeling | result
  let waitingTimer = null, biteTimer = null;
  let reel = null; // { period, zoneTop, zoneHeight, hits, misses, hitsRequired, maxMisses, startT, timeLimit, timeStart, fromBottom }
  let currentCatch = null; // chosen in triggerBite(), consumed by startReel()/catchSuccess()
  let devForceTier = null; // set only by the gitignored dev-mode.js panel; see __zzhDevCast below

  // ================= Persistence (localStorage, no account needed) =================
  // Everything the player would be upset to lose -- shells, rod, unsold
  // catches -- lives in one localStorage blob and is rewritten right after
  // every mutation (not on page-unload, which mobile browsers can skip).
  const SAVE_KEY = 'zanzanhan-fishing-save-v1';
  // Save-DATA-SHAPE compatibility marker -- unrelated to GAME_VERSION
  // (version.js), which is the human-facing release number. This one is a
  // plain integer on purpose, not a semver string like GAME_VERSION, so
  // the two are never visually or logically confusable with each other.
  // Bump it whenever the save shape changes in a way old saves can't just
  // merge cleanly into (new required fields, changed meaning of an
  // existing one, etc.) -- most releases (balance tuning, new features
  // that only ADD fields) don't need to touch this at all.
  //
  // A mismatched save is NOT just thrown away anymore -- migrateSave()
  // below tries to upgrade it field-by-field first, so a player only ever
  // loses progress when a field's actual MEANING changed in a way nothing
  // can safely reinterpret, not just because the version marker moved.
  const SAVE_SCHEMA_VERSION = 12;
  function defaultSave() {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      shells: 0, rod: { grade: 'common', level: 1 }, gems: 0,
      stats: { strength: 0, luck: 0, precision: 0 },
      caughtFish: [], nextFishUid: 1, catches: {}, tutorialDone: false, introDone: false,
      hasReeledBefore: false,
      baits: { common: 0, rare: 0, epic: 0, legendary: 0 }, equippedBait: 'none',
      gachaPity: 0,
      achievements: Achievements.freshState(),
      stage: 'lake', stagesUnlocked: ['lake']
    };
  }
  // Each step upgrades a save from exactly one schema to the next, so a
  // save several versions behind just runs through all of them in order.
  // Add a new entry here whenever SAVE_SCHEMA_VERSION bumps -- write it to
  // touch ONLY the field(s) that actually changed shape/meaning and pass
  // everything else through untouched, so most bumps keep 조개/낚싯대/
  // 보관함 등 intact instead of wiping the whole save over one field.
  const SAVE_MIGRATIONS = [
    // (no schemaVersion field, had `version` string instead) -> schema 1:
    // that older marker was a plain rename to schemaVersion -- none of the
    // actual game-data fields changed, so just swap the field itself.
    (save) => {
      const { version, ...rest } = save;
      return { ...rest, schemaVersion: 1 };
    },
    // schema 1 -> 2: added the bait system. Nothing existing changed shape --
    // just fill in the two new fields if this save predates them.
    (save) => ({
      ...save,
      baits: save.baits || { rare: 0, epic: 0, legendary: 0 },
      equippedBait: save.equippedBait || 'common',
      schemaVersion: 2
    }),
    // schema 2 -> 3: added the legendary gacha pity counter.
    (save) => ({
      ...save,
      gachaPity: typeof save.gachaPity === 'number' ? save.gachaPity : 0,
      schemaVersion: 3
    }),
    // schema 3 -> 4: rod grade-up materials (per-target {rare,epic} object,
    // each capped at its own `needed`) became 보석 (gems) -- one uncapped
    // running number, no longer keyed by target grade. Sum whatever was
    // banked under the old shape into the new single balance so upgrade
    // progress isn't lost, then drop the old field entirely.
    (save) => {
      const { materials, ...rest } = save;
      const carried = materials && typeof materials === 'object'
        ? (materials.rare || 0) + (materials.epic || 0)
        : 0;
      return { ...rest, gems: typeof save.gems === 'number' ? save.gems : carried, schemaVersion: 4 };
    },
    // schema 4 -> 5: 도감 detail popup added a per-species catch-size
    // history. Existing catches records only had {count, best} -- give
    // each one an empty history array rather than inventing past sizes
    // that were never recorded (see recordCatch()'s CATCH_HISTORY_MAX cap).
    (save) => {
      const catches = { ...(save.catches || {}) };
      Object.keys(catches).forEach((id) => {
        if (!Array.isArray(catches[id].history)) catches[id] = { ...catches[id], history: [] };
      });
      return { ...save, catches, schemaVersion: 5 };
    },
    // schema 5 -> 6: per-species fish icons (icons/fish/<tier>/<id>.svg)
    // were added after this field already existed, so caughtFish entries
    // still sitting unsold from before that point never got an `id` --
    // rendering them now (speciesIconPath needs it) shows a broken image.
    // Back-fill it by matching each entry's (tier, name) against the fixed
    // species list -- FishData is loaded before game.js, so it's available
    // here. Leaves an entry alone if it somehow already has an id, or if
    // no species matches (shouldn't happen with the current fixed roster).
    (save) => {
      const caughtFish = (save.caughtFish || []).map((item) => {
        if (item.id) return item;
        const pool = (window.FishData && window.FishData.FISH_BY_TIER[item.tier]) || [];
        const match = pool.find((sp) => sp.name === item.name);
        return match ? { ...item, id: match.id } : item;
      });
      return { ...save, caughtFish, schemaVersion: 6 };
    },
    // schema 6 -> 7: 도전과제. Unlocks + counters live under `achievements`;
    // for an existing save, rebuild the counters the 도감 already implies
    // (species counts/bests) so old progress still counts toward them.
    (save) => ({
      ...save,
      achievements: save.achievements || Achievements.stateFromLegacySave(save),
      schemaVersion: 7
    }),
    // schema 7 -> 8: the one-shot cast/reel hints became the guided
    // tutorial, gated by `tutorialDone`. Anyone who had already cast or
    // reeled under the old hints has seen the game -- don't walk them
    // through it now. hasCastBefore had no other reader, so it's dropped.
    (save) => {
      const { hasCastBefore, ...rest } = save;
      return { ...rest, tutorialDone: !!(hasCastBefore || save.hasReeledBefore), schemaVersion: 8 };
    },
    // schema 8 -> 9: the tutorial split into the replayable 낚시 방법 part
    // (tutorialDone) and the once-only 시스템 소개 (shop / free 10뽑 /
    // upgrades, introDone). Whoever had finished or skipped the old
    // all-in-one tutorial has had their one intro.
    (save) => ({ ...save, introDone: !!save.tutorialDone, schemaVersion: 9 }),
    // schema 9 -> 10: 도전과제 rewards. `achievements.claimed` records which
    // unlocks have been collected; it starts EMPTY on purpose so everything
    // an existing save already cleared is waiting to be claimed, rather
    // than silently forfeited. Nothing else moves.
    (save) => ({
      ...save,
      achievements: { ...(save.achievements || Achievements.freshState()), claimed: (save.achievements && save.achievements.claimed) || {} },
      schemaVersion: 10
    }),
    // schema 10 -> 11: 낚시터. Everyone so far has only ever fished the
    // lake, so that's where they are and all they have unlocked.
    (save) => ({ ...save, stage: save.stage || 'lake', stagesUnlocked: Array.isArray(save.stagesUnlocked) ? save.stagesUnlocked : ['lake'], schemaVersion: 11 }),
    // schema 11 -> 12: 일반 미끼 is a consumable and the bare hook ('none')
    // is the default. Nobody owns any 일반 미끼 yet, so an equipped 'common'
    // (the old endless default) becomes 'none'; real baits carry over.
    (save) => ({
      ...save,
      baits: { common: 0, ...(save.baits || {}) },
      equippedBait: save.equippedBait === 'common' || !save.equippedBait ? 'none' : save.equippedBait,
      schemaVersion: 12
    })
  ];
  function migrateSave(save) {
    let from = typeof save.schemaVersion === 'number' ? save.schemaVersion : 0;
    while (from < SAVE_SCHEMA_VERSION) {
      const step = SAVE_MIGRATIONS[from];
      if (!step) return null; // no known path forward -- too old/foreign to trust
      save = step(save);
      from++;
    }
    return save;
  }
  function loadSave() {
    try {
      let raw = Platform.storage.get(SAVE_KEY);
      const me = Platform.userKey;
      if (raw && me) {
        // Shared-device case (a different Toss account than the one whose
        // progress sits in the main slot): park theirs under their own key
        // and pull this account's own save back out, if it has one. A save
        // with no owner yet (made before identity existed) is simply adopted.
        const owner = JSON.parse(raw).userKey;
        if (owner && owner !== me) {
          Platform.storage.set(SAVE_KEY + ':' + owner, raw);
          raw = Platform.storage.get(SAVE_KEY + ':' + me);
        }
      }
      if (raw) {
        const migrated = migrateSave(JSON.parse(raw));
        if (migrated && migrated.schemaVersion === SAVE_SCHEMA_VERSION) return { ...defaultSave(), ...migrated };
        // Still doesn't match after attempting every known migration --
        // genuinely unrecognizable, fall through to a fresh save instead
        // of risking undefined-shaped data.
      }
    } catch (e) { /* ignore -- corrupt save, fall back to default */ }
    return defaultSave();
  }
  function persist() {
    try {
      Platform.storage.set(SAVE_KEY, JSON.stringify({
        schemaVersion: SAVE_SCHEMA_VERSION, userKey: Platform.userKey, shells, rod, gems, stats, caughtFish, nextFishUid,
        catches, tutorialDone, introDone, hasReeledBefore, baits, equippedBait, gachaPity, achievements,
        stage, stagesUnlocked
      }));
    } catch (e) { /* ignore */ }
  }

  const initialSave = loadSave();
  let shells = initialSave.shells;
  let rod = initialSave.rod;
  // 보석 (rod grade-up secondary currency) -- one running balance, spent
  // `needed` at a time on whichever grade-up the rod is climbing toward
  // next (see FishData.ROD_GRADE_UP). Shown in the topbar next to shells.
  let gems = initialSave.gems;
  // Player stats (근력/행운/정밀함), 0~5 each -- separate from the rod's own
  // grade/level, bought straight with shells in the same 업그레이드 tab.
  let stats = initialSave.stats;
  let caughtFish = initialSave.caughtFish; // { uid, name, tier, size, price, desc } -- sold via the shop's 판매 tab
  // 도전과제 progress: unlocked ids + the counters achievements-data.js
  // reads. Merged over fresh defaults so a save from an older build never
  // lacks a counter that was added later.
  const achievements = initialSave.achievements;
  const freshStats = Achievements.freshStats();
  achievements.stats = { ...freshStats, ...achievements.stats };
  achievements.stats.tierTotals = { ...freshStats.tierTotals, ...achievements.stats.tierTotals };
  achievements.stats.baitsUsed = { ...freshStats.baitsUsed, ...achievements.stats.baitsUsed };
  let nextFishUid = initialSave.nextFishUid;
  // Per-species log for 보관함's 도감 tab -- { [speciesId]: { count, best } }.
  // Kept independent of caughtFish, which only holds still-unsold catches
  // and loses the record the moment a fish is sold.
  let catches = initialSave.catches;
  // Held bait counts by tier -- { rare, epic, legendary }. 일반 is the free
  let baits = initialSave.baits;
  if (typeof baits.common !== 'number') baits.common = 0;
  // Currently equipped bait tier ('none' = bare hook) -- filters the catch
  // pool in triggerBite() and gets consumed by 1 per cast() (see there).
  // Falls back to 'none' automatically once its count hits 0.
  let equippedBait = FishData.BAITS[initialSave.equippedBait] ? initialSave.equippedBait : 'none';
  if (equippedBait !== 'none' && (baits[equippedBait] || 0) <= 0) equippedBait = 'none';
  // Pulls since the last legendary (natural or pity-forced) -- see
  // FishData.LEGENDARY_PITY / pullGachaWithPity().
  let gachaPity = initialSave.gachaPity;
  // 낚시터: which one the player is at, and which they have paid to open.
  let stage = FishData.STAGES[initialSave.stage] ? initialSave.stage : 'lake';
  let stagesUnlocked = Array.isArray(initialSave.stagesUnlocked) ? initialSave.stagesUnlocked.filter((k) => FishData.STAGES[k]) : [];
  if (!stagesUnlocked.includes('lake')) stagesUnlocked.unshift('lake');
  if (!stagesUnlocked.includes(stage) || !FishData.stageReady(stage)) stage = 'lake';
  // Guided tutorial (see the "Tutorial" section) has run to the end or been
  // skipped. false = owed: it starts as soon as the launch title clears.
  let tutorialDone = initialSave.tutorialDone;
  // The once-only 시스템 소개 (shop, free 10뽑, upgrades) that follows the
  // first tutorial catch. Never replayed -- 설정's 다시 보기 covers only the
  // 낚시 방법 part, so the free pull can't be farmed.
  let introDone = initialSave.introDone;
  // Flips true the moment startReel() first runs -- the first-ever bite is
  // forced to 희귀 (see triggerBite()) so the first fight is a real one.
  let hasReeledBefore = initialSave.hasReeledBefore;
  // Set in catchSuccess() when a grade-up material drops, consumed by
  // closeResult() right after the catch result popup closes.
  let pendingMaterial = null;

  const shellsCountEl = document.getElementById('shells-count');
  const gemsCountTopEl = document.getElementById('gems-count-top');
  const statusTextEl = document.getElementById('status-text');
  const reelGaugeEl = document.getElementById('reel-gauge');
  const reelTapCatcherEl = document.getElementById('reel-tap-catcher');
  const gaugeTrackEl = document.getElementById('gauge-track-v');
  const gaugeZoneEl = document.getElementById('gauge-zone-v');
  const gaugeIndicatorEl = document.getElementById('gauge-indicator-v');
  const timeFillEl = document.getElementById('time-fill-v');
  const hitsCounterEl = document.getElementById('hits-counter-v');
  const chanceLightsEl = document.getElementById('chance-lights');
  const resultOverlay = document.getElementById('result-overlay');
  const resultCard = document.getElementById('result-card');
  const splashFlash = document.getElementById('splash-flash');
  const newBadge = document.getElementById('new-badge');
  const resultIcon = document.getElementById('result-icon');
  const resultTierBadge = document.getElementById('result-tier-badge');
  const resultTitle = document.getElementById('result-title');
  const resultDesc = document.getElementById('result-desc');
  const resultBtn = document.getElementById('result-btn');
  const materialOverlay = document.getElementById('material-overlay');
  const materialIcon = document.getElementById('material-icon');
  const materialTitle = document.getElementById('material-title');
  const materialDesc = document.getElementById('material-desc');
  const materialCountEl = document.getElementById('material-count');
  const materialBtn = document.getElementById('material-btn');
  const menuShopBtn = document.getElementById('menu-shop-btn');
  const shopOverlay = document.getElementById('shop-overlay');
  const shopPanel = document.getElementById('shop-panel');
  const shopCloseBtn = document.getElementById('shop-close-btn');
  // shop-overlay is a full-screen overlay sitting ABOVE the topbar (higher
  // z-index) -- these two exist purely so shells/gems are still checkable
  // while it's open, since the topbar's own display is hidden behind it.
  const shopShellsEl = document.getElementById('shop-shells-count');
  const shopGemsEl = document.getElementById('shop-gems-count');
  // Scoped to shopPanel -- .shop-tab is a shared visual style, also reused
  // by the bucket overlay's own tabs (which wire up separately below).
  const shopTabs = shopPanel.querySelectorAll('.shop-tab');
  const shopTabPanels = {
    gacha: document.getElementById('shop-tab-gacha'),
    sell: document.getElementById('shop-tab-sell'),
    upgrade: document.getElementById('shop-tab-upgrade')
  };
  const sellListEl = document.getElementById('sell-list');
  const sellEmptyEl = document.getElementById('sell-empty');
  const rodNameEl = document.getElementById('rod-name');
  const rodLevelEl = document.getElementById('rod-level');
  const rodPipsEl = document.getElementById('rod-pips');
  const rodMaterialEl = document.getElementById('rod-material');
  const rodMaterialIconEl = document.getElementById('rod-material-icon');
  const rodMaterialCountEl = document.getElementById('rod-material-count');
  const rodUpgradeBtn = document.getElementById('rod-upgrade-btn');
  const statsListEl = document.getElementById('stats-list');
  const rodEffectEl = document.getElementById('rod-effect');
  const upgradeRodCard = document.querySelector('.upgrade-rod');
  const upgradeSummaryChipsEl = document.getElementById('upgrade-summary-chips');
  // 강화 tab art per stat (icons/shop/stat-*.svg) and the "+N%" wording
  // for each level -- effectPerLevel lives in FishData.PLAYER_STATS.
  const STAT_ART = {
    strength: { icon: 'icons/shop/stat-strength.svg', effect: '제한시간', sign: '+' },
    luck: { icon: 'icons/shop/stat-luck.svg', effect: '희귀·특급', sign: '+' },
    precision: { icon: 'icons/shop/stat-precision.svg', effect: '속도', sign: '-' }
  };
  const pct = (v) => Math.round(v * 100) + '%';
  // One decimal for the rod: its per-level step (0.9~1.3%p) would print the
  // same whole number twice in a row.
  const pct1 = (v) => (Math.round(v * 1000) / 10) + '%';
  function statEffectText(key, level) {
    const def = FishData.PLAYER_STATS[key];
    const art = STAT_ART[key];
    const now = art.sign + pct(def.effectPerLevel * level);
    if (level >= FishData.PLAYER_STAT_MAX_LEVEL) return `${art.effect} ${now} (최대)`;
    return `${art.effect} ${now} → ${art.sign}${pct(def.effectPerLevel * (level + 1))}`;
  }
  function renderUpgradeSummary() {
    const chips = [
      { icon: 'icons/shop/rod.svg', text: '성공 구간 +' + pct1(FishData.rodEase(rod.grade, rod.level)) },
      { icon: STAT_ART.strength.icon, text: '제한시간 +' + pct(FishData.PLAYER_STATS.strength.effectPerLevel * (stats.strength || 0)) },
      { icon: STAT_ART.luck.icon, text: '희귀·특급 +' + pct(FishData.PLAYER_STATS.luck.effectPerLevel * (stats.luck || 0)) },
      { icon: STAT_ART.precision.icon, text: '속도 -' + pct(FishData.PLAYER_STATS.precision.effectPerLevel * (stats.precision || 0)) }
    ];
    upgradeSummaryChipsEl.innerHTML = '';
    chips.forEach((c) => {
      const el = document.createElement('span');
      el.className = 'upgrade-summary-chip';
      el.innerHTML = '<img alt="">';
      el.querySelector('img').src = c.icon;
      el.appendChild(document.createTextNode(c.text));
      upgradeSummaryChipsEl.appendChild(el);
    });
  }

  const gachaPull1Btn = document.getElementById('gacha-pull1-btn');
  const gachaPull10Btn = document.getElementById('gacha-pull10-btn');
  const gachaPull10CostEl = gachaPull10Btn.querySelector('.gacha-pull-cost');
  const gachaPityLeftEl = document.getElementById('gacha-pity-left');
  const gachaPityFillEl = document.getElementById('gacha-pity-fill');

  const gachaOverlay = document.getElementById('gacha-overlay');
  const gachaRevealPanel = document.getElementById('gacha-reveal-panel');
  const gachaFlashEl = document.getElementById('gacha-flash');
  const gachaCardGridEl = document.getElementById('gacha-card-grid');
  const gachaActionBtn = document.getElementById('gacha-action-btn');
  const gachaRevealHintEl = document.getElementById('gacha-reveal-hint');
  const gachaSpotlightEl = document.getElementById('gacha-spotlight');
  const gachaSpotCardEl = document.getElementById('gacha-spot-card');
  const GACHA_TIER_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

  const baitBtn = document.getElementById('bait-btn');
  const baitBtnIcon = document.getElementById('bait-btn-icon');
  const baitBtnBadge = document.getElementById('bait-btn-badge');
  const baitMenu = document.getElementById('bait-menu');
  const baitMenuBackdrop = document.getElementById('bait-menu-backdrop');
  const baitMenuItems = baitMenu.querySelectorAll('.bait-menu-item');

  const menuBucketBtn = document.getElementById('menu-bucket-btn');
  const bucketOverlay = document.getElementById('bucket-overlay');
  const bucketPanel = document.getElementById('bucket-panel');
  const bucketCloseBtn = document.getElementById('bucket-close-btn');
  const bucketTabs = bucketPanel.querySelectorAll('.shop-tab');
  const bucketTabPanels = {
    inventory: document.getElementById('bucket-tab-inventory'),
    log: document.getElementById('bucket-tab-log')
  };
  const bucketListEl = document.getElementById('bucket-list');
  const bucketEmptyEl = document.getElementById('bucket-empty');
  const logListEl = document.getElementById('log-list');
  const speciesDetailOverlay = document.getElementById('species-detail-overlay');
  const speciesDetailIcon = document.getElementById('species-detail-icon');
  const speciesDetailTierBadge = document.getElementById('species-detail-tier-badge');
  const speciesDetailName = document.getElementById('species-detail-name');
  const speciesDetailDesc = document.getElementById('species-detail-desc');
  const speciesDetailStats = document.getElementById('species-detail-stats');
  const speciesDetailHistory = document.getElementById('species-detail-history');
  const speciesDetailCloseBtn = document.getElementById('species-detail-close-btn');

  // Currency info popup -- one overlay reused for both 조개껍질/보석, tapped
  // from the topbar pills so new players can tell what each is actually for.
  const shellsInfoBtn = document.getElementById('shells-info-btn');
  const gemsInfoBtn = document.getElementById('gems-info-btn');
  const currencyInfoOverlay = document.getElementById('currency-info-overlay');
  const currencyInfoIcon = document.getElementById('currency-info-icon');
  const currencyInfoName = document.getElementById('currency-info-name');
  const currencyInfoDesc = document.getElementById('currency-info-desc');
  const currencyInfoCloseBtn = document.getElementById('currency-info-close-btn');
  const CURRENCY_INFO = {
    shells: {
      icon: 'icons/ui/shell.svg', name: '조개껍질',
      desc: '낚싯대 레벨업, 근력·행운·정밀함 강화, 미끼 뽑기에 사용하는 기본 재화예요. 물고기를 낚거나 팔면 얻을 수 있어요.'
    },
    gems: {
      icon: 'icons/shop/gem.svg', name: '보석',
      desc: '낚싯대 등급을 올릴 때만 쓰이는 특별한 재화예요. 조개껍질과는 별도로 모아야 해요.'
    }
  };
  function openCurrencyInfo(key) {
    const info = CURRENCY_INFO[key];
    currencyInfoIcon.src = info.icon;
    currencyInfoName.textContent = info.name;
    currencyInfoDesc.textContent = info.desc;
    currencyInfoOverlay.classList.remove('hidden');
  }
  function closeCurrencyInfo() { currencyInfoOverlay.classList.add('hidden'); }
  shellsInfoBtn.addEventListener('click', () => openCurrencyInfo('shells'));
  gemsInfoBtn.addEventListener('click', () => openCurrencyInfo('gems'));
  currencyInfoCloseBtn.addEventListener('click', closeCurrencyInfo);
  currencyInfoOverlay.addEventListener('click', (e) => { if (e.target === currencyInfoOverlay) closeCurrencyInfo(); });

  // ================= 낚시터 (stage) menu =================
  // The status bar's location label opens it: one card per stage with its
  // unlock conditions (live progress), a 해금 button once they're all met,
  // and 이동 for anything already open. Moving is idle-only so a cast in
  // flight never lands in a different pool than it was rolled from.
  const stageBtn = document.getElementById('stage-btn');
  const stageNameEl = document.getElementById('stage-name');
  const stageOverlay = document.getElementById('stage-overlay');
  const stageListEl = document.getElementById('stage-list');
  const stageCloseBtn = document.getElementById('stage-close-btn');
  function stageUnlocked(key) { return stagesUnlocked.includes(key); }
  function stageSpeciesTotal(key) {
    const pools = FishData.FISH_BY_STAGE[key] || {};
    return Object.keys(pools).reduce((n, tier) => n + pools[tier].length, 0);
  }
  // Species of that stage caught at least once (도감 discoveries).
  function stageDexCount(key) {
    const pools = FishData.FISH_BY_STAGE[key] || {};
    return Object.keys(pools).reduce((n, tier) => n + pools[tier].filter((sp) => catches[sp.id]).length, 0);
  }
  // Position in the grade ladder (common 0, rare 1, epic 2) via the
  // `next` links, so this stays right if grades get inserted later.
  function rodGradeRank(gradeKey) {
    let k = 'common', i = 0;
    while (k && k !== gradeKey) { k = FishData.ROD_GRADES[k].next; i++; }
    return k ? i : -1;
  }
  // -> [{ text, met, cost? }] for a locked stage, [] for the lake.
  function stageConditions(key) {
    const u = FishData.STAGES[key].unlock;
    if (!u) return [];
    const out = [];
    if (u.dexStage) {
      const have = stageDexCount(u.dexStage);
      out.push({ text: `${FishData.STAGES[u.dexStage].name} 도감 ${u.dexCount}종 발견 (${Math.min(have, u.dexCount)} / ${u.dexCount})`, met: have >= u.dexCount });
    }
    if (u.rodGrade) out.push({ text: `${FishData.ROD_GRADES[u.rodGrade].label} 이상`, met: rodGradeRank(rod.grade) >= rodGradeRank(u.rodGrade) });
    if (u.shells) out.push({ text: `조개 ${u.shells.toLocaleString('ko-KR')} 지불 (보유 ${shells.toLocaleString('ko-KR')})`, met: shells >= u.shells, cost: true });
    return out;
  }
  function applyStageToUi() {
    stageNameEl.textContent = FishData.STAGES[stage].name;
  }
  // 낚시터 popup, two levels: a list of banner cards (name, tagline,
  // 도감/unlock progress) and, over it, a detail sheet for the tapped stage
  // with the description, unlock conditions and the 이동/해금 button.
  const stageDetailEl = document.getElementById('stage-detail');
  const stageDetailBannerEl = document.getElementById('stage-detail-banner');
  const stageDetailIconEl = document.getElementById('stage-detail-icon');
  const stageDetailNameEl = document.getElementById('stage-detail-name');
  const stageDetailBadgeEl = document.getElementById('stage-detail-badge');
  const stageDetailTaglineEl = document.getElementById('stage-detail-tagline');
  const stageDetailDescEl = document.getElementById('stage-detail-desc');
  const stageDetailMetaEl = document.getElementById('stage-detail-meta');
  const stageDetailCondsEl = document.getElementById('stage-detail-conds');
  const stageDetailBtn = document.getElementById('stage-detail-btn');
  const stageDetailNoteEl = document.getElementById('stage-detail-note');
  const stageDetailBackBtn = document.getElementById('stage-detail-back');
  let stageDetailKey = null;
  function renderStageMenu() {
    stageListEl.innerHTML = '';
    FishData.STAGE_ORDER.forEach((key) => {
      const info = FishData.STAGES[key];
      const ready = FishData.stageReady(key);
      const unlocked = stageUnlocked(key);
      const current = key === stage;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'stage-card stage-' + key + (current ? ' current' : '') + (unlocked ? '' : ' locked') + (ready ? '' : ' soon');
      card.dataset.stage = key;
      card.innerHTML = `
        <span class="stage-card-art"><img class="stage-card-icon" src="icons/ui/stage-${key}.svg" alt=""></span>
        <span class="stage-card-body">
          <span class="stage-card-head"><span class="stage-card-name"></span><span class="stage-card-badge hidden"></span></span>
          <span class="stage-card-tagline"></span>
          <span class="stage-card-meta"></span>
          <span class="stage-card-bar"><i></i></span>
        </span>
        <span class="stage-card-chevron"></span>`;
      card.querySelector('.stage-card-name').textContent = info.name;
      card.querySelector('.stage-card-tagline').textContent = info.tagline;
      const badge = card.querySelector('.stage-card-badge');
      if (current) { badge.textContent = '현재'; badge.classList.remove('hidden'); }
      else if (!ready) { badge.textContent = '준비 중'; badge.classList.add('soon'); badge.classList.remove('hidden'); }
      else if (!unlocked) { badge.textContent = '잠김'; badge.classList.add('soon'); badge.classList.remove('hidden'); }
      // Progress line + bar: 도감 for open stages, unlock conditions met
      // for locked ones, nothing for stages that aren't in the game yet.
      const meta = card.querySelector('.stage-card-meta');
      const bar = card.querySelector('.stage-card-bar i');
      if (!ready) {
        meta.textContent = `판매가 x${info.priceMult} · 다음 업데이트`;
        bar.style.width = '0%';
      } else if (unlocked) {
        const n = stageDexCount(key), total = stageSpeciesTotal(key);
        meta.textContent = `도감 ${n} / ${total}종 · 판매가 x${info.priceMult}`;
        bar.style.width = `${total ? (n / total) * 100 : 0}%`;
      } else {
        const conds = stageConditions(key);
        const met = conds.filter((c) => c.met).length;
        meta.textContent = `판매가 x${info.priceMult} · 해금 조건 ${met} / ${conds.length}`;
        bar.style.width = `${conds.length ? (met / conds.length) * 100 : 0}%`;
      }
      card.addEventListener('click', () => openStageDetail(key));
      stageListEl.appendChild(card);
    });
    const hint = document.createElement('p');
    hint.className = 'stage-list-hint';
    hint.textContent = '낚시터를 누르면 자세히 볼 수 있어요';
    stageListEl.appendChild(hint);
    if (stageDetailKey) fillStageDetail(stageDetailKey);
  }
  function fillStageDetail(key) {
    const info = FishData.STAGES[key];
    const ready = FishData.stageReady(key);
    const unlocked = stageUnlocked(key);
    const current = key === stage;
    const idle = state === 'idle';
    stageDetailBannerEl.className = 'stage-detail-banner stage-' + key;
    stageDetailIconEl.src = `icons/ui/stage-${key}.svg`;
    stageDetailNameEl.textContent = info.name;
    stageDetailTaglineEl.textContent = info.tagline;
    stageDetailDescEl.textContent = info.desc;
    stageDetailMetaEl.textContent = ready
      ? `도감 ${stageDexCount(key)} / ${stageSpeciesTotal(key)}종 · 판매가 x${info.priceMult}`
      : `판매가 x${info.priceMult}`;
    const conds = stageConditions(key);
    stageDetailCondsEl.innerHTML = '';
    if (!unlocked) {
      conds.forEach((c) => {
        const li = document.createElement('li');
        li.className = c.met ? 'met' : '';
        li.textContent = c.text;
        stageDetailCondsEl.appendChild(li);
      });
    }
    stageDetailBadgeEl.className = 'stage-card-badge hidden';
    stageDetailBadgeEl.textContent = '';
    stageDetailBtn.classList.add('hidden');
    stageDetailBtn.disabled = false;
    stageDetailNoteEl.classList.add('hidden');
    if (current) {
      stageDetailBadgeEl.textContent = '현재 낚시터'; stageDetailBadgeEl.classList.remove('hidden');
    } else if (!ready) {
      stageDetailBadgeEl.textContent = '준비 중'; stageDetailBadgeEl.classList.add('soon'); stageDetailBadgeEl.classList.remove('hidden');
      stageDetailNoteEl.textContent = '다음 업데이트에서 열려요'; stageDetailNoteEl.classList.remove('hidden');
    } else if (unlocked) {
      stageDetailBtn.textContent = '이동'; stageDetailBtn.classList.remove('hidden');
      stageDetailBtn.disabled = !idle;
      if (!idle) { stageDetailNoteEl.textContent = '낚시 중에는 이동할 수 없어요'; stageDetailNoteEl.classList.remove('hidden'); }
    } else {
      const cost = info.unlock && info.unlock.shells ? info.unlock.shells : 0;
      stageDetailBtn.innerHTML = `해금 <img class="price-icon" src="icons/ui/shell.svg" alt="">${cost.toLocaleString('ko-KR')}`;
      stageDetailBtn.classList.remove('hidden');
      stageDetailBtn.disabled = !conds.every((c) => c.met);
    }
  }
  function openStageDetail(key) {
    stageDetailKey = key;
    fillStageDetail(key);
    stageDetailEl.classList.remove('hidden');
    requestAnimationFrame(() => stageDetailEl.classList.add('open'));
  }
  function closeStageDetail() {
    stageDetailKey = null;
    stageDetailEl.classList.remove('open');
    stageDetailEl.classList.add('hidden');
  }
  stageDetailBackBtn.addEventListener('click', closeStageDetail);
  stageDetailBtn.addEventListener('click', () => {
    const key = stageDetailKey;
    if (!key) return;
    if (stageUnlocked(key)) setStage(key); else unlockStage(key);
  });
  function openStageMenu() { closeStageDetail(); renderStageMenu(); stageOverlay.classList.remove('hidden'); }
  function closeStageMenu() { stageOverlay.classList.add('hidden'); closeStageDetail(); }
  function setStage(key) {
    if (!FishData.STAGES[key] || !stageUnlocked(key) || !FishData.stageReady(key)) return false;
    if (state !== 'idle') return false;
    if (key !== stage) {
      stage = key;
      switchBgmForStage();
      bridgeCache = null; // repaint the backdrop for the new scene
      initSparkles();
      idleFish = [];
      logStage = null;
      applyStageToUi();
      persist();
      showStatus(`${FishData.STAGES[key].name}에 도착했어요`, null, 2200);
      checkAchievements();
    }
    closeStageMenu();
    return true;
  }
  function unlockStage(key) {
    if (stageUnlocked(key) || !FishData.stageReady(key)) return false;
    const conds = stageConditions(key);
    if (!conds.every((c) => c.met)) return false;
    const cost = FishData.STAGES[key].unlock.shells || 0;
    if (shells < cost) return false;
    shells -= cost;
    stagesUnlocked.push(key);
    ensureAudio();
    sfx.coin();
    updateCurrencyDisplay();
    persist();
    checkAchievements();
    if (!setStage(key)) renderStageMenu(); // mid-cast: stays open as 이동 for later
    return true;
  }
  stageBtn.addEventListener('click', openStageMenu);
  stageCloseBtn.addEventListener('click', closeStageMenu);
  stageOverlay.addEventListener('click', (e) => { if (e.target === stageOverlay) closeStageMenu(); });
  applyStageToUi();

  const menuSettingsBtn = document.getElementById('menu-settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const leftyToggleBtn = document.getElementById('lefty-toggle');
  const skipLowTierToggleBtn = document.getElementById('skip-lowtier-toggle');
  const volumeSliderEl = document.getElementById('volume-slider');
  const bgmVolumeSliderEl = document.getElementById('bgm-volume-slider');
  const resetDataBtn = document.getElementById('reset-data-btn');
  const resetConfirmOverlay = document.getElementById('reset-confirm-overlay');
  const resetConfirmBtn = document.getElementById('reset-confirm-btn');
  const resetCancelBtn = document.getElementById('reset-cancel-btn');

  // Keeps every place either currency is shown in sync in one call --
  // topbar (always visible) and the shop-panel header (needed because the
  // shop overlay sits above and hides the topbar while it's open).
  function updateCurrencyDisplay() {
    shellsCountEl.textContent = shells.toLocaleString('ko-KR');
    gemsCountTopEl.textContent = gems.toLocaleString('ko-KR');
    shopShellsEl.textContent = shells.toLocaleString('ko-KR');
    shopGemsEl.textContent = gems.toLocaleString('ko-KR');
  }

  // Rod grade raises maxMisses on 특급/전설 only (FishData.rodMissBonus);
  // rod level only widens the hit zone -- time limit is no longer
  // rod-affected, but 근력 (a separate player stat) still lengthens it.
  // Hit tolerance isn't tier/rod-based at all anymore -- see
  // hitToleranceForPeriod() above, keyed off the reel's actual current
  // speed instead. Everything else here is folded into the
  // tier's base reel params so startReel()/attemptHit() just consume one
  // effective set without knowing about the rod or player stats at all.
  const MAX_MISSES_CAP = 5;
  // The current 낚시터's reel modifiers (FishData.STAGES[..].reel), {} for the lake.
  function stageReelMods() { return (FishData.STAGES[stage] && FishData.STAGES[stage].reel) || {}; }
  function getEffectiveReel(tier) {
    const base = FishData.TIERS[tier].reel;
    const ease = FishData.rodEase(rod.grade, rod.level);
    const missBonus = FishData.rodMissBonus(rod.grade, tier);
    const strengthBonus = stats.strength * FishData.PLAYER_STATS.strength.effectPerLevel;
    const sm = stageReelMods();
    const missPenalty = (sm.missPenalty && sm.missPenalty[tier]) || 0;
    return {
      hitsRequired: base.hitsRequired,
      zoneHeight: base.zoneHeight * (1 + ease) * (sm.zoneMult || 1),
      timeLimit: base.timeLimit * (1 + strengthBonus) * (sm.timeMult || 1),
      maxMisses: Math.max(1, Math.min(MAX_MISSES_CAP, base.maxMisses + missBonus - missPenalty))
    };
  }

  // 정밀함 stat: slows the casting bar's sweep down (a bigger period is a
  // slower, easier-to-time sweep) -- applied on top of whichever tier the
  // rarity climb is currently displaying, same as the tier-color-driven
  // speed itself. The 특급 rod's 특급/전설 slowdown (FishData.rodSlowBonus)
  // stacks additively with it, keyed by the same displayed colour.
  function effectivePeriod(tierKey) {
    const precisionBonus = stats.precision * FishData.PLAYER_STATS.precision.effectPerLevel;
    const rodBonus = FishData.rodSlowBonus(rod.grade, tierKey);
    return FishData.TIERS[tierKey].reel.period * (1 + precisionBonus + rodBonus);
  }

  let statusHideTimer = null;
  function showStatus(text, iconSrc, hideAfterMs) {
    clearTimeout(statusHideTimer);
    statusTextEl.innerHTML = iconSrc
      ? `<img class="status-icon" src="${iconSrc}" alt="">${text}`
      : text;
    statusTextEl.classList.remove('hidden');
    if (hideAfterMs) statusHideTimer = setTimeout(hideStatus, hideAfterMs);
  }
  function hideStatus() { statusTextEl.classList.add('hidden'); }

  // Reverses the render loop's anchor/zoom transform so a tap lands on the
  // same spot it visually looks like it landed on.
  function canvasPointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const visualX = e.clientX - rect.left;
    const visualY = e.clientY - rect.top;
    const anchorX = W * 0.5, anchorY = H * 0.24;
    return {
      x: anchorX + (visualX - anchorX) / ZOOM,
      y: anchorY + (visualY - anchorY) / ZOOM
    };
  }

  canvas.addEventListener('click', (e) => {
    ensureAudio();
    const p = canvasPointFromEvent(e);
    if (state === 'idle') {
      const topBound = H * TAP_ZONE_TOP_FRAC;
      const bottomBound = H * TAP_ZONE_BOTTOM_FRAC;
      if (p.y < topBound || p.y > bottomBound) return; // reserved menu band, not fishable
      cast(p.x, p.y);
    } else if (state === 'reeling') {
      attemptHit();
    }
  });

  // Mirrors the canvas's reeling branch above -- see .reel-tap-catcher in
  // style.css and its show/hide in startReel()/catchSuccess()/catchFail().
  reelTapCatcherEl.addEventListener('click', () => {
    ensureAudio();
    attemptHit();
  });

  function cast(x, y) {
    sfx.cast();
    bobber = { x, y };
    state = 'waiting';
    bobberState = 'waiting';
    showStatus('입질을 기다리는 중...');
    const delay = 1600 + Math.random() * 2600;
    waitingTimer = setTimeout(triggerBite, delay);
    if (!tutorial.practice) {
      achievements.stats.casts++;
      if (equippedBait === 'rare' || equippedBait === 'epic' || equippedBait === 'legendary') achievements.stats.baitsUsed[equippedBait] = true;
      checkAchievements();
    }
    if (tutorial.step === 'cast') tutorialGo('wait');
  }

  // Ordinal ladder for the hit-counter's rarity climb (junk sits at the
  // bottom so even a real fish's early hits can flash "might be nothing"
  // gray before climbing into actual tiers).
  const REEL_TIER_ORDER = ['junk', 'common', 'rare', 'epic', 'legendary'];

  // How many hits a catch demands: base + random(0~1). Grouped in pairs
  // rather than one-per-tier -- 꽝/일반 share the easy end, 특급/전설 share
  // the hard end, 희귀 sits alone in the middle.
  const HITS_BASE_BY_TIER = { junk: 2, common: 2, rare: 3, epic: 4, legendary: 4 };

  // A rod that's outgrown a tier auto-catches it instead of making the
  // player reel it in -- 희귀 rod auto-catches 꽝, 특급 rod auto-catches 꽝
  // AND 일반. Toggleable in 설정 (see skipLowTier below); when off, every
  // tier always goes through the normal reeling minigame regardless of rod
  // grade. NOTE: this used to instead EXCLUDE these tiers from ever being
  // rolled at all -- changed because "스킵" was meant as "skip the reeling
  // minigame for a trivial catch", not "never encounter it again".
  const SKIP_TIERS_BY_GRADE = { common: [], rare: ['junk'], epic: ['junk', 'common'] };

  function triggerBite() {
    if (state !== 'waiting') return;
    state = 'bite';
    bobberState = 'bite';
    bobberDipT = performance.now() / 1000;
    // Tier is chosen now but no longer announced up front -- the hit
    // counter's rarity climb is the only reveal during casting/reeling.
    // devForceTier (set only by the gitignored dev-mode.js panel) overrides
    // the random pick for one catch, then clears itself. The equipped
    // bait's floor is the only thing that still excludes tiers from the
    // roll -- the rod-grade low-tier skip (below) no longer touches the
    // roll itself, only whether reeling gets skipped afterward.
    //
    // The player's very first-ever bite is forced to 희귀 instead of
    // whatever the roll would've given -- a real fish (not 꽝) with an
    // actual multi-hit fight (unlike 꽝/일반's trivial 2 hits) makes their
    // first-ever reel, and the new #reel-tutorial-hint shown during it,
    // land on a representative catch instead of a coin-flip between
    // "nothing" and "the easiest possible fish". Gated on hasReeledBefore
    // (flips true in startReel(), right after this) so it only ever fires
    // once, the same moment the reel hint itself only ever shows once.
    // Tutorial: a 일반 fish -- real and sellable, but the easiest fight.
    // Outside it, the first-ever reel is still forced to 희귀 (see above).
    const forcedFirstCatch = tutorial.active ? 'common' : (!hasReeledBefore ? 'rare' : null);
    const baitExclude = FishData.baitExcludeTiers(equippedBait);
    currentCatch = FishData.pickCatch(devForceTier || forcedFirstCatch, baitExclude, stats.luck, stage);
    // 설정 > 다시 보기 run: the fish is practice only -- it never reaches the
    // bucket, the 도감 or the 도전과제 counters (see catchSuccess/catchFail).
    // Tagged on the catch itself so it holds even if the guide is skipped
    // mid-reel and the fight finishes as a normal one.
    currentCatch.practice = !!tutorial.practice;
    devForceTier = null;
    // Bait is spent here, once the fish has actually taken it -- NOT back
    // in cast(). Consuming it at the tap meant the auto-revert-to-common
    // (on the last unit) could land before this async pick ever ran, so
    // the very last cast on a tier silently rolled against the unfiltered
    // 일반 pool instead of the tier the player thought they'd just used.
    // The bottom-bar button itself deliberately does NOT refresh here --
    // it keeps showing whatever bait was equipped for this cast all the
    // way through bite+reeling, and only catches up to the (possibly now
    // auto-reverted) equippedBait once the result is shown (showResult()),
    // so the player can see what they were fishing with for the whole cast.
    if (equippedBait !== 'none' && !currentCatch.practice) {
      baits[equippedBait] = Math.max(0, (baits[equippedBait] || 0) - 1);
      if (baits[equippedBait] <= 0) equippedBait = 'none';
      persist();
    }
    sfx.bite();
    Platform.haptic('basicMedium');
    showStatus('입질이 왔어요!', 'icons/result/bite.svg');
    const shouldSkipReel = !tutorial.active && skipLowTier && SKIP_TIERS_BY_GRADE[rod.grade].includes(currentCatch.tier);
    biteTimer = setTimeout(shouldSkipReel ? resolveSkippedCatch : startReel, 500);
  }

  // Reeling minigame skipped entirely -- 캐스팅/입질까지는 정상 진행되지만,
  // 이미 졸업한 낮은 등급은 여기서 바로 성공 처리된다. catchSuccess() doesn't
  // touch `reel` at all (only currentCatch), so it's safe to call directly
  // without ever having started the minigame.
  function resolveSkippedCatch() {
    if (state !== 'bite') return;
    hideStatus();
    reel = null; // no reeling happened -- keep a stale reel out of the 도전과제 checks
    catchSuccess();
  }

  function startReel() {
    if (state !== 'bite') return;
    hideStatus();
    state = 'reeling';
    bobberState = 'reeling';
    // A bite can land while the player still has the 미끼 picker open from
    // the waiting period -- close it so the full-screen tap catcher below
    // isn't fighting an open popup for the reeling taps.
    setBaitMenuOpen(false);
    gameEl.classList.add('reeling'); // slides the tab bar away (style.css)
    reelTapCatcherEl.classList.remove('hidden');
    if (!hasReeledBefore) {
      hasReeledBefore = true;
      persist();
    }
    const f = getEffectiveReel(currentCatch.tier);
    // Hit count is random per catch: HITS_BASE_BY_TIER's floor, plus 0~1.
    const stageHits = (stageReelMods().hitBonus && stageReelMods().hitBonus[currentCatch.tier]) || 0;
    const hitsRequired = HITS_BASE_BY_TIER[currentCatch.tier] + Math.floor(Math.random() * 2) + stageHits;
    const colorSeq = buildClimbSequence(currentCatch.tier, hitsRequired);
    // The very first hit's speed already matches whatever tier colorSeq[0]
    // displays -- see attemptHit() for how it keeps following the climb.
    reel = {
      period: effectivePeriod(colorSeq[0]),
      zoneHeight: f.zoneHeight,
      zoneTop: randomZoneTop(f.zoneHeight),
      hits: 0,
      misses: 0,
      hitsRequired,
      maxMisses: f.maxMisses,
      startT: performance.now() / 1000,
      timeLimit: f.timeLimit,
      timeStart: performance.now() / 1000,
      fromBottom: Math.random() < 0.5,
      colorSeq,
      // Tutorial reel: no clock, and the thumb parks itself inside the zone
      // and waits for the tap (see reelTick()/attemptHit()).
      tutorial: tutorial.active,
      frozen: tutorial.active, // thumb holds still through the HUD walkthrough
      paused: false,
      pausedPos: 0
    };
    renderHitsCounter();
    renderChanceLights();
    // Reveal window 0's tier immediately -- before the player has clicked
    // even once -- see revealCurrentWindow() for why.
    revealCurrentWindow();
    positionZone();
    timeFillEl.style.transition = 'none';
    timeFillEl.style.height = '100%';
    timeFillEl.classList.remove('warn', 'danger');
    void timeFillEl.offsetHeight;
    timeFillEl.style.transition = '';
    reelGaugeEl.classList.remove('hidden');
    if (tutorial.step === 'wait') tutorialGo('reelGauge');
  }

  function randomZoneTop(height) {
    const margin = 2;
    return margin + Math.random() * (100 - height - margin * 2);
  }

  // One fish icon per hit still needed, gray until landed. Column is
  // flex-direction:column-reverse (see style.css) so index 0 renders at the
  // bottom -- filling low-to-high index reads as reeling bottom-to-top.
  const FISH_ICON_SVG = '<svg class="fish" viewBox="0 0 32 20" width="20" height="13">'
    + '<path fill="currentColor" d="M2 10c4-7 20-7 24 0-4 7-20 7-24 0z"/>'
    + '<path fill="currentColor" d="M24 10l7-6v12l-7-6z"/>'
    + '<circle cx="8" cy="8" r="1.6" fill="#0a1a1e"/></svg>';
  function renderHitsCounter() {
    hitsCounterEl.innerHTML = '';
    hitsCounterEl.classList.remove('legendary-glow');
    for (let i = 0; i < reel.hitsRequired; i++) {
      hitsCounterEl.insertAdjacentHTML('beforeend', FISH_ICON_SVG);
    }
  }

  // ---- Hit-counter rarity climb ----
  // Every filled fish icon always shows the SAME color: the tier of the
  // hit-window currently open. Landing a hit opens the next window (never
  // goes back), so earlier fish visibly re-color along with the new one --
  // a "climbing toward the real tier" tell rather than a static count.
  //
  // Each window's tier is revealed the instant that window OPENS -- window
  // 0 right when reeling starts, window i+1 right after window i's hit
  // lands -- not after the player resolves it. That's a real-time preview
  // of "what could I land right now," and it also means the final window's
  // (real) tier has already been sitting on screen for that whole window's
  // duration by the time the qualifying hit actually completes the catch,
  // instead of being painted and hidden in the same tick.

  // Stepwise climb: each hit can rise by at most MAX_STEP tiers over the
  // previous hit (never more), so it reads as a staircase building
  // anticipation -- not one single jump straight from junk to epic. The
  // starting tier is otherwise unrestricted (can be anywhere from junk up
  // to the real tier); it's only clamped low enough that there's still
  // room to reach the real tier in the hits remaining. E.g. for an epic
  // catch this can read 꽝,일반,일반,특급 -- three flat/small steps then a
  // final +2 jump onto the real tier, never a +3 jump like 꽝,특급 would be.
  function buildClimbSequence(tierKey, n) {
    const target = REEL_TIER_ORDER.indexOf(tierKey);
    const MAX_STEP = 2;
    const seq = [];
    const minStart = Math.max(0, target - MAX_STEP * (n - 1));
    let prev = minStart + Math.floor(Math.random() * (target - minStart + 1));
    seq.push(prev);
    for (let i = 1; i < n; i++) {
      const remainingAfter = n - 1 - i;
      const low = Math.max(prev, target - MAX_STEP * remainingAfter);
      const high = Math.min(target, prev + MAX_STEP);
      prev = low + Math.floor(Math.random() * (high - low + 1));
      seq.push(prev);
    }
    return seq.map(o => REEL_TIER_ORDER[o]);
  }

  // reel.hits doubles as "index of the window currently open" (0 before
  // anything lands, hitsRequired-1 once only the final window remains).
  function revealCurrentWindow() {
    const idx = reel.hits;
    const shownTier = reel.colorSeq[idx];
    const color = FishData.TIERS[shownTier].color;
    const litCount = idx + 1; // every window up through the open one
    for (let i = 0; i < litCount; i++) {
      const fish = hitsCounterEl.children[i];
      if (fish) { fish.classList.add('filled'); fish.style.color = color; }
    }
    // The climb only ever goes up, so once it touches legendary it stays
    // legendary for the rest of this reel -- true regardless of whether the
    // real catch actually is legendary, which is the point: it's a tease.
    if (shownTier === 'legendary') hitsCounterEl.classList.add('legendary-glow');
    // Every fish icon is lit the instant the LAST window opens (idx is the
    // final index) -- that's the "land just one more hit" moment.
    if (idx === reel.hitsRequired - 1) sfx.finalStretch();
  }

  // 신호등 모양만 빌려온 것 -- 실제로는 그냥 파란 불 N개(N = maxMisses),
  // 실패할 때마다 하나씩 꺼짐. maxMisses가 항상 3은 아니게 될 예정이라
  // 개수는 매번 새로 그린다.
  function renderChanceLights() {
    chanceLightsEl.innerHTML = '';
    for (let i = 0; i < reel.maxMisses; i++) {
      const dot = document.createElement('span');
      dot.className = 'chance-dot';
      chanceLightsEl.appendChild(dot);
    }
  }

  function positionZone() {
    gaugeZoneEl.style.top = reel.zoneTop + '%';
    gaugeZoneEl.style.height = reel.zoneHeight + '%';
  }

  function trianglePercent(elapsed, period) {
    const phase = (elapsed % period) / period;
    return phase < 0.5 ? phase * 2 * 100 : (1 - phase) * 2 * 100;
  }
  // fromBottom flips the sweep direction each hit, same as the old
  // horizontal gauge's fromRight -- just along the vertical axis now.
  function indicatorPercent(elapsed, period, fromBottom) {
    const p = trianglePercent(elapsed, period);
    return fromBottom ? 100 - p : p;
  }

  function reelTick() {
    if (state === 'reeling' && reel && reel.tutorial) {
      if (reel.frozen) {
        gaugeIndicatorEl.style.top = (reel.fromBottom ? 100 : 0) + '%';
      } else if (!reel.paused) {
        const pos = currentIndicatorPos();
        gaugeIndicatorEl.style.top = pos + '%';
        const center = reel.zoneTop + reel.zoneHeight / 2;
        // First window: let the thumb sweep for a second before it parks,
        // so the instruction callout is actually readable before "지금!".
        const armed = reel.hits > 0 || performance.now() / 1000 - reel.startT >= 1.0;
        if (armed && Math.abs(pos - center) <= Math.max(2, reel.zoneHeight * 0.2)) {
          reel.paused = true;
          reel.pausedPos = pos;
          tutorialReelPrompt();
        }
      }
      timeFillEl.style.height = '100%';
    } else if (state === 'reeling' && reel) {
      const now = performance.now() / 1000;
      const elapsed = now - reel.startT;
      const pos = indicatorPercent(elapsed, reel.period, reel.fromBottom);
      gaugeIndicatorEl.style.top = pos + '%';

      const remaining = reel.timeLimit - (now - reel.timeStart);
      if (remaining <= 0) {
        timeFillEl.style.height = '0%';
        catchFail();
      } else {
        const frac = remaining / reel.timeLimit;
        timeFillEl.style.height = (frac * 100) + '%';
        timeFillEl.classList.toggle('danger', frac < 0.3);
        timeFillEl.classList.toggle('warn', frac >= 0.3 && frac < 0.6);
      }
    }
    requestAnimationFrame(reelTick);
  }
  requestAnimationFrame(reelTick);

  function currentIndicatorPos() {
    if (reel.paused) return reel.pausedPos;
    const now = performance.now() / 1000;
    const elapsed = now - reel.startT;
    return indicatorPercent(elapsed, reel.period, reel.fromBottom);
  }

  function attemptHit() {
    if (state !== 'reeling' || !reel) return;
    // Tutorial: taps only count while the thumb is parked in the zone, so
    // an early/late tap is simply nothing rather than a miss.
    if (reel.tutorial && (reel.frozen || !reel.paused)) return;
    const pos = currentIndicatorPos();
    const tolerance = hitToleranceForPeriod(reel.period);
    const inZone = pos >= reel.zoneTop - tolerance && pos <= reel.zoneTop + reel.zoneHeight + tolerance;
    if (inZone) {
      reel.hits++;
      sfx.hit();
      bobberTugT = performance.now() / 1000;
      gaugeTrackEl.classList.remove('flash-good'); void gaugeTrackEl.offsetWidth; gaugeTrackEl.classList.add('flash-good');
      if (reel.hits >= reel.hitsRequired) {
        // The final window's tier was already revealed when IT opened
        // (right after the previous hit), so there's nothing left to
        // paint here -- catchSuccess() can hide the gauge immediately.
        catchSuccess();
        return;
      }
      // A new window just opened -- reveal its tier now, before the player
      // has attempted it even once.
      revealCurrentWindow();
      // Speed for the upcoming window follows whatever tier it just
      // revealed -- not a flat per-hit shrink, so it jumps in step with color.
      reel.period = effectivePeriod(reel.colorSeq[reel.hits]);
      reel.zoneTop = randomZoneTop(reel.zoneHeight);
      reel.startT = performance.now() / 1000;
      reel.timeStart = performance.now() / 1000;
      reel.fromBottom = !reel.fromBottom;
      positionZone();
      if (reel.tutorial) { reel.paused = false; tutorialReelPrompt(); }
    } else {
      reel.misses++;
      sfx.miss();
      gaugeTrackEl.classList.remove('flash-bad'); void gaugeTrackEl.offsetWidth; gaugeTrackEl.classList.add('flash-bad');
      const dot = chanceLightsEl.children[reel.misses - 1];
      if (dot) dot.classList.add('off');
      if (reel.misses >= reel.maxMisses) catchFail();
    }
  }

  // Persistent per-species stats for 보관함's 도감 tab -- unlike caughtFish,
  // this survives selling (it's never removed, only added to). `history`
  // keeps the most recent catch sizes for the 도감 detail popup, capped so
  // a heavily-farmed common species doesn't grow the save without bound.
  const CATCH_HISTORY_MAX = 20;
  function recordCatch(c) {
    const rec = catches[c.id] || (catches[c.id] = { count: 0, best: 0, history: [] });
    rec.count++;
    if (c.size > rec.best) rec.best = c.size;
    if (!rec.history) rec.history = [];
    rec.history.push(c.size);
    if (rec.history.length > CATCH_HISTORY_MAX) rec.history.shift();
  }

  // Rolled once per non-junk catch, at a flat chance independent of rod
  // level, as long as the rod still has a next grade to climb toward.
  // Adds straight to the single running 보석 balance -- no per-target cap,
  // since any surplus past the current target's `needed` just carries
  // forward toward the next (bigger) grade-up instead of being wasted.
  function rollGem() {
    const gradeInfo = FishData.ROD_GRADES[rod.grade];
    if (!gradeInfo.next) return null; // already at the top grade
    if (Math.random() >= FishData.ROD_GEM_DROP_CHANCE) return null;
    gems += 1;
    achievements.stats.gemsEarned++;
    const needed = FishData.ROD_GRADE_UP[gradeInfo.next].needed;
    return { count: gems, needed };
  }

  function catchSuccess() {
    state = 'result';
    bobberState = 'hidden';
    sfx.splash();
    sfx.success();
    Platform.haptic('success');
    reelGaugeEl.classList.add('hidden');
    reelTapCatcherEl.classList.add('hidden');
    gameEl.classList.remove('reeling');
    tutorialReelEnd();
    const c = currentCatch;
    const icon = c.tier === 'junk' ? FishData.junkIconPath(c.id) : FishData.speciesIconPath(c.tier, c.id);
    const title = c.tier === 'junk' ? `${c.name}...` : `${c.name}를 낚았어요!`;
    if (c.practice) {
      // Practice catch: shown, then gone. Nothing recorded, nothing persisted.
      showResult(true, title, `${c.desc} (연습 낚시라 보관함에 담기지 않아요)`, icon, c.tier, false);
      return;
    }
    noteCatchForAchievements(c);
    let desc;
    let isNewSpecies = false;
    if (c.tier === 'junk') {
      desc = c.desc;
      persist();
    } else {
      // Checked before recordCatch() creates/updates the entry.
      isNewSpecies = !catches[c.id];
      // Not sold yet -- it goes to the bucket and gets sold from the
      // shop's 판매 tab, so this price is a preview, not income.
      caughtFish.push({ uid: nextFishUid++, id: c.id, name: c.name, tier: c.tier, size: c.size, price: c.price, desc: c.desc, stage: c.stage });
      recordCatch(c);
      pendingMaterial = rollGem();
      persist();
      desc = `${c.desc} (${c.size}cm · 판매가 <img class="price-icon" src="icons/ui/shell.svg" alt="">${c.price.toLocaleString('ko-KR')})`;
    }
    showResult(true, title, desc, icon, c.tier, isNewSpecies);
    checkAchievements();
  }

  function catchFail() {
    if (state !== 'reeling') return;
    state = 'result';
    bobberState = 'hidden';
    sfx.fail();
    Platform.haptic('error');
    reelGaugeEl.classList.add('hidden');
    reelTapCatcherEl.classList.add('hidden');
    gameEl.classList.remove('reeling');
    tutorialReelEnd();
    if (currentCatch && currentCatch.practice) {
      showResult(false, '놓쳤어요...', '연습 낚시라 기록에는 남지 않아요.', 'icons/result/miss.svg');
      return;
    }
    const s = achievements.stats;
    s.fails++;
    s.streak = 0;
    s.sameSpeciesStreak = 0;
    s.lastSpeciesId = null;
    persist();
    showResult(false, '놓쳤어요...', '다음엔 타이밍을 맞춰보세요.', 'icons/result/miss.svg');
    checkAchievements();
  }

  function showResult(isCatch, title, desc, icon, tier, isNewSpecies) {
    // See triggerBite()'s bait-consumption comment -- this is the "casting
    // has ended" moment the bottom bait button waits for before it refreshes.
    updateBaitButton();
    resultIcon.innerHTML = `<img src="${icon}" alt="">`;
    if (tier) {
      resultTierBadge.textContent = FishData.TIERS[tier].label;
      resultTierBadge.className = `tier-badge tier-${tier}`;
    } else {
      resultTierBadge.classList.add('hidden');
    }
    resultTitle.textContent = title;
    resultDesc.innerHTML = desc;
    newBadge.classList.toggle('hidden', !isNewSpecies);
    resultOverlay.classList.remove('hidden');
    resultCard.classList.remove('catch-reveal');
    splashFlash.classList.remove('active');
    if (isCatch) {
      void resultCard.offsetWidth;
      resultCard.classList.add('catch-reveal');
      splashFlash.classList.add('active');
    }
  }

  function closeResult() {
    resultOverlay.classList.add('hidden');
    state = 'idle';
    bobber = null;
    reel = null;
    currentCatch = null;
    hideStatus();
    // Tutorial: straight on to the shop step; a gem popup (if one dropped)
    // waits until the tutorial is over (see tutorialFinish()).
    if (tutorial.step === 'reel') { tutorialGo(introDone ? 'finish' : 'shopTab'); return; }
    if (pendingMaterial) {
      showMaterialPopup(pendingMaterial);
      pendingMaterial = null;
    }
  }
  resultBtn.addEventListener('click', closeResult);

  // ================= 보석 (rod grade-up currency) popup =================
  // Shown right after the catch result popup closes, only when a gem
  // actually dropped this catch (see rollGem()).
  function showMaterialPopup(mat) {
    sfx.gem();
    materialIcon.src = 'icons/shop/gem.svg';
    materialTitle.textContent = `${FishData.GEM_LABEL} 획득!`;
    materialDesc.textContent = `낚싯대 등급업에 쓰는 보조 화폐이다. ${mat.needed}개를 모으면 등급을 올릴 수 있다.`;
    materialCountEl.textContent = `보유: ${mat.count} / ${mat.needed}개`;
    materialOverlay.classList.remove('hidden');
  }
  function closeMaterialPopup() { materialOverlay.classList.add('hidden'); }
  materialBtn.addEventListener('click', closeMaterialPopup);

  // ================= Bait (하단바 버튼 + 선택 팝업) =================
  // Called from the bottom-bar picker's menu items. Refuses to equip a
  // non-일반 bait with zero left -- callers only ever reach here from UI
  // that's already hidden/disabled that option.
  function equipBait(key) {
    if (key !== 'none' && (baits[key] || 0) <= 0) return;
    equippedBait = key;
    persist();
    updateBaitButton();
  }

  function updateBaitButton() {
    baitBtnIcon.src = `icons/ui/bait-${equippedBait}.svg`;
    baitBtn.classList.toggle('legendary-equipped', equippedBait === 'legendary');
    const heldCount = equippedBait === 'none' ? 0 : (baits[equippedBait] || 0);
    baitBtnBadge.textContent = heldCount;
    baitBtnBadge.classList.toggle('hidden', equippedBait === 'none');
    baitMenuItems.forEach(item => {
      const key = item.dataset.bait;
      item.classList.toggle('active', key === equippedBait);
      if (key === 'none') return;
      const count = baits[key] || 0;
      item.disabled = count <= 0;
      const countEl = item.querySelector('[data-bait-count]');
      if (countEl) countEl.textContent = count;
    });
  }

  // Left/right padding has to exactly equal half the container's own
  // rendered width minus half an item's width, so the FIRST and LAST chips
  // can physically scroll all the way to dead-center -- computed here from
  // the container's actual clientWidth rather than a fixed CSS value, so it
  // stays correct however wide the container ends up (min(280px, 80vw)
  // means that varies across phone widths).
  const BAIT_ITEM_WIDTH = 52; // must match .bait-menu-item/.bait-menu-circle width in style.css
  function updateBaitMenuPadding() {
    const pad = Math.max(8, baitMenu.clientWidth / 2 - BAIT_ITEM_WIDTH / 2);
    baitMenu.style.paddingLeft = pad + 'px';
    baitMenu.style.paddingRight = pad + 'px';
  }

  // Wheel-picker style: scrolling brings a tier to the row's horizontal
  // center (tracked here, not CSS -- scroll position isn't something CSS
  // alone can query), and tapping THAT centered chip is what actually
  // equips it. Tapping an off-center chip instead just scrolls it into the
  // middle, so a stray tap while swiping never accidentally equips the
  // wrong tier.
  function updateCenteredBaitItem() {
    const containerRect = baitMenu.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    let closest = null;
    let closestDist = Infinity;
    baitMenuItems.forEach(item => {
      const r = item.getBoundingClientRect();
      const dist = Math.abs((r.left + r.width / 2) - centerX);
      if (dist < closestDist) { closestDist = dist; closest = item; }
    });
    baitMenuItems.forEach(item => item.classList.toggle('centered', item === closest));
  }
  let baitMenuScrollRaf = null;
  baitMenu.addEventListener('scroll', () => {
    if (baitMenuScrollRaf) return;
    baitMenuScrollRaf = requestAnimationFrame(() => { updateCenteredBaitItem(); baitMenuScrollRaf = null; });
  });

  function setBaitMenuOpen(open) {
    baitMenu.classList.toggle('open', open);
    baitMenuBackdrop.classList.toggle('open', open);
    // The picker's translucent panel sits right on top of the tab labels,
    // which otherwise ghost through it -- blank the tabs while it's open.
    document.getElementById('tab-bar').classList.toggle('picker-open', open);
    if (open) {
      updateBaitMenuPadding();
      // Land on whatever's currently equipped rather than always opening
      // scrolled to 전설 (the first/leftmost chip) -- no animation here
      // since this is the opening state, not a user-driven scroll.
      const equippedItem = baitMenu.querySelector(`[data-bait="${equippedBait}"]`);
      if (equippedItem) equippedItem.scrollIntoView({ inline: 'center', block: 'nearest' });
      updateCenteredBaitItem();
    }
  }
  // Re-derive the padding (and recenter) if the viewport changes while the
  // picker happens to be open -- e.g. a rotation mid-selection.
  window.addEventListener('resize', () => {
    if (!baitMenu.classList.contains('open')) return;
    updateBaitMenuPadding();
    updateCenteredBaitItem();
  });
  baitBtn.addEventListener('click', () => setBaitMenuOpen(!baitMenu.classList.contains('open')));
  baitMenuBackdrop.addEventListener('click', () => setBaitMenuOpen(false));
  baitMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.disabled) return;
      if (!item.classList.contains('centered')) {
        item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        return;
      }
      equipBait(item.dataset.bait);
      setBaitMenuOpen(false);
    });
  });

  // ================= Bait gacha (상점 뽑기 탭) =================
  // Equipping happens from the bottom-bar bait picker (#bait-menu), not
  // here -- this just keeps the two pull buttons' disabled state in sync
  // with the current shell count.
  function renderGachaTab() {
    const freeTen = tutorial.step === 'gacha'; // tutorial's one free 10뽑
    gachaPull1Btn.disabled = shells < FishData.GACHA_PULL_COST;
    gachaPull10Btn.disabled = !freeTen && shells < FishData.GACHA_TEN_PULL_COST;
    gachaPull10CostEl.innerHTML = freeTen
      ? '무료'
      : `<img class="price-icon" src="icons/ui/shell.svg" alt="">${FishData.GACHA_TEN_PULL_COST.toLocaleString('ko-KR')}`;
    const left = Math.max(0, FishData.LEGENDARY_PITY - gachaPity);
    gachaPityLeftEl.textContent = `${left}뽑`;
    gachaPityFillEl.style.width = `${Math.min(100, (gachaPity / FishData.LEGENDARY_PITY) * 100)}%`;
  }

  // Cards sit in roll order (v1.3). They used to be sorted worst -> best so
  // the payoff landed in the last slot; now the 전설 spotlight after the
  // full reveal is that beat, and roll order keeps each flip a surprise.

  function runGacha(kind) {
    const isTen = kind === 'ten';
    const free = isTen && tutorial.step === 'gacha';
    const cost = free ? 0 : (isTen ? FishData.GACHA_TEN_PULL_COST : FishData.GACHA_PULL_COST);
    if (shells < cost) return;
    // Casting is the only other place this fires -- a player who opens the
    // shop and pulls before ever casting a line would otherwise get total
    // silence, since every blip() is a no-op until the AudioContext exists.
    ensureAudio();
    sfx.coin();
    shells -= cost;
    const pulled = free
      ? tutorialTenPull()
      : (isTen ? FishData.pullGachaTen(gachaPity) : FishData.pullGachaWithPity(1, gachaPity));
    const results = pulled.results;
    gachaPity = pulled.pity;
    const s = achievements.stats;
    s.pulls += results.length;
    s.legendaryBaitPulls += results.filter((k) => k === 'legendary').length;
    s.pityHits += pulled.forced || 0;
    if (isTen) {
      s.tenPulls++;
      const epics = results.filter((k) => k === 'epic' || k === 'legendary').length;
      if (epics > s.maxEpicInTen) s.maxEpicInTen = epics;
    }
    // Every card is a bait now (일반 included -- it's what lets 전설 bite).
    results.forEach(key => { baits[key] = (baits[key] || 0) + 1; });
    persist();
    updateCurrencyDisplay();
    if (free) tutorialGo('gachaReveal'); // before the re-render so the 무료 label goes back to the price
    renderGachaTab();
    updateBaitButton();
    openGachaReveal(results.slice());
    checkAchievements();
  }
  // The tutorial's free 10뽑: one 특급 guaranteed, nothing above it, and the
  // other nine split 희귀/조개 환급 at their normal relative odds (the
  // refund cards pay out for real, same as a paid pull). Leaves the
  // legendary pity counter alone -- it isn't a real paid pull.
  function tutorialTenPull() {
    const results = [];
    for (let i = 0; i < 9; i++) results.push(Math.random() < 0.34 ? 'rare' : 'common');
    results.splice(Math.floor(Math.random() * 10), 0, 'epic');
    return { results, pity: gachaPity, forced: 0 };
  }
  gachaPull1Btn.addEventListener('click', () => runGacha('single'));
  gachaPull10Btn.addEventListener('click', () => runGacha('ten'));

  // Player-paced reveal: every card starts face-down in the same grid (the
  // "한 화면에 다 보이는" result screen), and stays on screen once flipped --
  // tapping a card reveals just that one. The single action button starts
  // as "전체 공개"; once every card is revealed (via that button or by
  // tapping through them all by hand), it turns into "닫기" -- so the
  // overlay can never be dismissed without the results having been seen.
  function openGachaReveal(results) {
    gachaCardGridEl.innerHTML = '';
    gachaFlashEl.classList.remove('active');
    gachaRevealPanel.classList.remove('shake');
    gachaActionBtn.textContent = '전체 공개';
    gachaActionBtn.classList.add('gacha-secondary-btn');
    gachaRevealHintEl.textContent = '카드를 눌러서 하나씩 확인하세요';
    gachaSpotlightEl.className = 'gacha-spotlight hidden';
    gachaCardGridEl.classList.toggle('single', results.length === 1);
    let spotlightTimer = null;

    // Only a 전설 gets the stage (the first one if there are several; the
    // rest keep glowing in the grid). Anything else just gets a one-line
    // summary of the batch's best tier.
    function showSpotlight() {
      let bestIdx = 0;
      results.forEach((tier, i) => { if (GACHA_TIER_RANK[tier] > GACHA_TIER_RANK[results[bestIdx]]) bestIdx = i; });
      const best = results[bestIdx];
      if (best !== 'legendary') {
        gachaRevealHintEl.textContent = best === 'common'
          ? (results.length === 1 ? '이번엔 일반 미끼예요' : '이번엔 일반 미끼만 나왔어요')
          : `이번 뽑기 최고 등급: ${FishData.BAITS[best].label}`;
        return;
      }
      cards[bestIdx].classList.add('lifted');
      gachaSpotCardEl.querySelector('img').src = `icons/ui/bait-${best}.svg`;
      gachaSpotCardEl.querySelector('span').textContent = FishData.BAITS[best].label;
      gachaSpotCardEl.className = 'gacha-spot-card tier-' + best;
      gachaSpotlightEl.className = 'gacha-spotlight tier-' + best;
      requestAnimationFrame(() => gachaSpotlightEl.classList.add('in'));
      gachaRevealHintEl.textContent = '전설 미끼가 나왔어요!';
      setTimeout(() => sfx.success(), 180);
    }

    function closeReveal() {
      clearTimeout(spotlightTimer);
      gachaOverlay.classList.add('hidden');
      if (tutorial.step === 'gachaReveal') tutorialGo('baitInfo');
    }

    function updateActionButton() {
      const allRevealed = cards.every((card) => card.classList.contains('revealed'));
      if (!allRevealed) return;
      gachaActionBtn.textContent = '닫기';
      gachaActionBtn.classList.remove('gacha-secondary-btn');
      gachaActionBtn.onclick = closeReveal;
      // Let the last flip finish before the best card lifts off.
      clearTimeout(spotlightTimer);
      spotlightTimer = setTimeout(showSpotlight, 380);
    }

    function revealCard(card, tier) {
      if (card.classList.contains('revealed')) return;
      card.classList.add('revealed', 'pop');
      sfx.gachaReveal(tier);
      if (tier === 'legendary') {
        gachaFlashEl.classList.remove('active');
        void gachaFlashEl.offsetWidth;
        gachaFlashEl.classList.add('active');
        gachaRevealPanel.classList.remove('shake');
        void gachaRevealPanel.offsetWidth;
        gachaRevealPanel.classList.add('shake');
      }
      updateActionButton();
    }

    const cards = results.map((tier) => {
      const icon = `icons/ui/bait-${tier}.svg`;
      const label = FishData.BAITS[tier].label;
      const card = document.createElement('div');
      card.className = 'gacha-card';
      card.innerHTML = `
        <div class="gacha-card-inner">
          <div class="gacha-card-face gacha-card-back">?</div>
          <div class="gacha-card-face gacha-card-front tier-${tier}">
            <img src="${icon}" alt="">
            <span>${label}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => revealCard(card, tier));
      gachaCardGridEl.appendChild(card);
      return card;
    });
    gachaOverlay.classList.remove('hidden');

    gachaActionBtn.onclick = () => cards.forEach((card, i) => revealCard(card, results[i]));
  }

  // ================= Shop (구매 / 판매 / 업그레이드) =================
  function openShop() {
    switchShopTab(tutorial.step === 'shopTab' ? 'sell' : 'gacha');
    shopOverlay.classList.remove('hidden');
    if (tutorial.step === 'shopTab') tutorialGo('sell');
  }
  function closeShop() { shopOverlay.classList.add('hidden'); }
  menuShopBtn.addEventListener('click', openShop);
  shopCloseBtn.addEventListener('click', closeShop);
  shopOverlay.addEventListener('click', (e) => { if (e.target === shopOverlay) closeShop(); });

  function switchShopTab(key) {
    shopTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === key));
    Object.entries(shopTabPanels).forEach(([k, el]) => el.classList.toggle('hidden', k !== key));
    if (key === 'gacha') renderGachaTab();
    if (key === 'sell') renderSellList();
    if (key === 'upgrade') renderUpgradeTab();
    if (tutorial.step === 'gachaTab' && key === 'gacha') tutorialGo('gacha');
    if (tutorial.step === 'upgradeTab' && key === 'upgrade') tutorialGo('upRod');
  }
  shopTabs.forEach(btn => btn.addEventListener('click', () => switchShopTab(btn.dataset.tab)));

  function renderSellList() {
    sellListEl.innerHTML = '';
    sellListEl.classList.toggle('hidden', caughtFish.length === 0);
    sellEmptyEl.classList.toggle('hidden', caughtFish.length > 0);
    caughtFish.forEach(item => {
      const row = document.createElement('div');
      row.className = 'sell-row';
      row.innerHTML = `
        <div class="sell-row-icon"><img src="${FishData.speciesIconPath(item.tier, item.id)}" alt=""></div>
        <div class="sell-row-info">
          <div class="sell-row-name">
            <span class="tier-badge tier-${item.tier}">${FishData.TIERS[item.tier].label}</span>
            ${item.name} · ${item.size}cm
          </div>
        </div>
        <div class="sell-row-price"><img class="price-icon" src="icons/ui/shell.svg" alt="">${item.price.toLocaleString('ko-KR')}</div>
        <button class="sell-btn" data-uid="${item.uid}">판매</button>
      `;
      sellListEl.appendChild(row);
    });
  }
  sellListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.sell-btn');
    if (!btn) return;
    sellFish(Number(btn.dataset.uid));
  });

  function sellFish(uid) {
    const idx = caughtFish.findIndex(f => f.uid === uid);
    if (idx === -1) return;
    sfx.coin();
    const price = caughtFish[idx].price;
    shells += price;
    caughtFish.splice(idx, 1);
    const s = achievements.stats;
    s.sells++;
    s.shellsEarned += price;
    if (price > s.maxSalePrice) s.maxSalePrice = price;
    persist();
    updateCurrencyDisplay();
    renderSellList();
    checkAchievements();
    submitLeaderboardScore();
    if (tutorial.step === 'sell') tutorialGo('shells');
  }

  // Discrete level pips, reused for the rod (10 boxes) and every player
  // stat (5 boxes) -- just a gray box per level, lit up to the current one.
  function renderPips(container, level, maxLevel) {
    container.innerHTML = '';
    for (let i = 0; i < maxLevel; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip' + (i < level ? ' filled' : '');
      container.appendChild(pip);
    }
  }

  function renderUpgradeTab() {
    const gradeInfo = FishData.ROD_GRADES[rod.grade];
    rodNameEl.textContent = gradeInfo.label;
    rodNameEl.style.color = gradeInfo.color;
    rodLevelEl.textContent = `Lv. ${rod.level} / ${FishData.ROD_MAX_LEVEL}`;
    renderPips(rodPipsEl, rod.level, FishData.ROD_MAX_LEVEL);
    upgradeRodCard.className = 'upgrade-rod grade-' + rod.grade;
    const easeNow = pct1(FishData.rodEase(rod.grade, rod.level));
    if (rod.level < FishData.ROD_MAX_LEVEL) {
      rodEffectEl.textContent = `성공 구간(노란 부분) +${easeNow} → +${pct1(FishData.rodEase(rod.grade, rod.level + 1))}`;
    } else if (gradeInfo.next) {
      // Bonus carries over: the next grade starts where this one ends.
      rodEffectEl.textContent = `성공 구간(노란 부분) +${easeNow} · 등급업해도 유지, ${FishData.ROD_GRADES[gradeInfo.next].label}는 +${pct1(FishData.rodEase(gradeInfo.next, FishData.ROD_MAX_LEVEL))}까지`;
    } else {
      rodEffectEl.textContent = `성공 구간(노란 부분) +${easeNow} (최대)`;
    }

    // 보석 balance sits next to the rod whenever there's a next grade to
    // climb toward, whether or not you've hit level 10 yet -- no separate
    // explanatory note needed once the count is right there.
    if (gradeInfo.next) {
      const upInfo = FishData.ROD_GRADE_UP[gradeInfo.next];
      rodMaterialIconEl.src = 'icons/shop/gem.svg';
      rodMaterialCountEl.textContent = `${gems} / ${upInfo.needed}`;
      rodMaterialEl.classList.remove('hidden');
    } else {
      rodMaterialEl.classList.add('hidden');
    }

    if (rod.level < FishData.ROD_MAX_LEVEL) {
      const cost = FishData.rodLevelCost(rod.grade, rod.level);
      rodUpgradeBtn.innerHTML = `<img class="price-icon" src="icons/ui/shell.svg" alt="">${cost.toLocaleString('ko-KR')}`;
      rodUpgradeBtn.disabled = shells < cost;
    } else if (gradeInfo.next) {
      const upInfo = FishData.ROD_GRADE_UP[gradeInfo.next];
      rodUpgradeBtn.textContent = '등급업';
      rodUpgradeBtn.disabled = gems < upInfo.needed;
    } else {
      rodUpgradeBtn.textContent = 'MAX';
      rodUpgradeBtn.disabled = true;
    }

    renderStatsList();
    renderUpgradeSummary();
  }
  rodUpgradeBtn.addEventListener('click', () => {
    const gradeInfo = FishData.ROD_GRADES[rod.grade];
    if (rod.level < FishData.ROD_MAX_LEVEL) {
      const cost = FishData.rodLevelCost(rod.grade, rod.level);
      if (shells < cost) return;
      sfx.coin();
      shells -= cost;
      rod.level += 1;
      persist();
      updateCurrencyDisplay();
      renderUpgradeTab();
      checkAchievements();
      return;
    }
    if (!gradeInfo.next) return;
    const upInfo = FishData.ROD_GRADE_UP[gradeInfo.next];
    if (gems < upInfo.needed) return;
    sfx.coin();
    gems -= upInfo.needed; // surplus past `needed` carries over, not reset to 0
    rod.grade = gradeInfo.next;
    rod.level = 1;
    persist();
    updateCurrencyDisplay();
    renderUpgradeTab();
    checkAchievements();
  });

  // ---- 근력 / 행운 / 정밀함: flat 0~5 stats, independent of the rod ----
  function renderStatsList() {
    statsListEl.innerHTML = '';
    FishData.PLAYER_STAT_ORDER.forEach(key => {
      const def = FishData.PLAYER_STATS[key];
      const level = stats[key] || 0;
      const maxed = level >= FishData.PLAYER_STAT_MAX_LEVEL;
      const row = document.createElement('div');
      row.className = 'upgrade-stat';
      const pipsId = `stat-pips-${key}`;
      row.className += ' stat-' + key;
      row.innerHTML = `
        <div class="upgrade-stat-icon"><img src="${STAT_ART[key].icon}" alt=""></div>
        <div class="upgrade-stat-info">
          <div class="upgrade-stat-name">${def.label}<span class="upgrade-stat-lv">Lv. ${level}</span></div>
          <div class="upgrade-stat-desc">${def.desc}</div>
          <div id="${pipsId}" class="pip-row"></div>
        </div>
        <button class="upgrade-btn" data-stat-btn="${key}"></button>
        <div class="upgrade-effect">${statEffectText(key, level)}</div>
      `;
      statsListEl.appendChild(row);
      renderPips(row.querySelector(`#${pipsId}`), level, FishData.PLAYER_STAT_MAX_LEVEL);
      const btn = row.querySelector('[data-stat-btn]');
      if (maxed) {
        btn.textContent = 'MAX';
        btn.disabled = true;
      } else {
        const cost = FishData.statLevelCost(level);
        btn.innerHTML = `<img class="price-icon" src="icons/ui/shell.svg" alt="">${cost.toLocaleString('ko-KR')}`;
        btn.disabled = shells < cost;
      }
    });
  }
  statsListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-stat-btn]');
    if (!btn) return;
    const key = btn.dataset.statBtn;
    const level = stats[key] || 0;
    if (level >= FishData.PLAYER_STAT_MAX_LEVEL) return;
    const cost = FishData.statLevelCost(level);
    if (shells < cost) return;
    sfx.coin();
    shells -= cost;
    stats[key] = level + 1;
    persist();
    updateCurrencyDisplay();
    renderUpgradeTab();
    checkAchievements();
  });

  // ================= 도전과제 =================
  const achievementsOverlay = document.getElementById('achievements-overlay');
  const achievementsListEl = document.getElementById('achievements-list');
  const achievementsSummaryEl = document.getElementById('achievements-summary');
  const achievementsCloseBtn = document.getElementById('achievements-close-btn');
  const achievementsClaimAllBtn = document.getElementById('achievements-claim-all-btn');
  const menuAchievementsBtn = document.getElementById('menu-achievements-btn');
  const achievementsBtnBadge = document.getElementById('achievements-btn-badge');
  const achievementToastsEl = document.getElementById('achievement-toasts');
  if (!achievements.claimed) achievements.claimed = {}; // belt-and-braces past the migration

  // ---- 보상 수령 ----
  // An unlock is only ever a promise: the reward lands when the player taps
  // 받기 on the row (or 모두 받기 in the header). Reward shells are NOT sales
  // income, so they stay out of shellsEarned / the leaderboard score.
  function unclaimedAchievementIds() {
    return Achievements.LIST.filter((a) => achievements.unlocked[a.id] && !achievements.claimed[a.id]).map((a) => a.id);
  }
  function updateAchievementBadge() {
    const n = unclaimedAchievementIds().length;
    achievementsBtnBadge.textContent = n;
    achievementsBtnBadge.classList.toggle('hidden', n === 0);
  }
  function grantReward(reward) {
    if (reward.shells) shells += reward.shells;
    if (reward.gems) gems += reward.gems;
    if (reward.bait) Object.keys(reward.bait).forEach((tier) => { baits[tier] = (baits[tier] || 0) + reward.bait[tier]; });
  }
  function claimAchievements(ids) {
    const claimable = ids.filter((id) => achievements.unlocked[id] && !achievements.claimed[id]);
    if (!claimable.length) return;
    const now = Date.now();
    claimable.forEach((id) => { grantReward(Achievements.byId(id).reward); achievements.claimed[id] = now; });
    persist();
    ensureAudio();
    sfx.coin();
    updateCurrencyDisplay();
    updateBaitButton();
    if (!shopOverlay.classList.contains('hidden')) { renderGachaTab(); renderUpgradeTab(); }
    renderAchievements();
    updateAchievementBadge();
    checkAchievements(); // a shell reward can itself complete 조개 N개 goals
  }
  achievementsClaimAllBtn.addEventListener('click', () => claimAchievements(unclaimedAchievementIds()));

  function achievementCtx() {
    return { s: achievements.stats, catches, shells, gems, rod, playerStats: stats, stagesUnlocked };
  }

  // Counters only a live catch can supply (streaks, size, time of day);
  // the per-species records themselves come from recordCatch().
  function noteCatchForAchievements(c) {
    const s = achievements.stats;
    if (c.tier === 'junk') {
      s.junkTotal++;
      s.junkStreak++;
      if (s.junkStreak > s.maxJunkStreak) s.maxJunkStreak = s.junkStreak;
      return;
    }
    s.junkStreak = 0;
    s.catchTotal++;
    s.tierTotals[c.tier] = (s.tierTotals[c.tier] || 0) + 1;
    s.streak++;
    if (s.streak > s.maxStreak) s.maxStreak = s.streak;
    s.sameSpeciesStreak = s.lastSpeciesId === c.id ? s.sameSpeciesStreak + 1 : 1;
    s.lastSpeciesId = c.id;
    if (s.sameSpeciesStreak > s.maxSameSpeciesStreak) s.maxSameSpeciesStreak = s.sameSpeciesStreak;
    if (c.size > s.maxSize) s.maxSize = c.size;
    if (c.id === 'imugi' && c.size > s.biggestImugi) s.biggestImugi = c.size;
    // `reel` is null for auto-caught (skipped) tiers, so these only ever
    // read a reel that actually just happened.
    if (reel && reel.misses === 0 && (c.tier === 'epic' || c.tier === 'legendary')) s.perfectEpic++;
    if (reel && reel.maxMisses > 1 && reel.misses === reel.maxMisses - 1) s.clutchCatches++;
  }

  // One toast at a time, top-right, each sliding in for ~3s.
  const toastQueue = [];
  let toastShowing = false;
  function pumpToasts() {
    if (toastShowing || !toastQueue.length) return;
    toastShowing = true;
    const a = toastQueue.shift();
    const el = document.createElement('div');
    el.className = 'achievement-toast trophy-' + Achievements.trophyTier(a).key;
    el.innerHTML = '<img class="achievement-toast-icon" src="' + Achievements.trophyTier(a).icon + '" alt="">'
      + '<div><div class="achievement-toast-label">도전과제 달성</div><div class="achievement-toast-title"></div><div class="achievement-toast-reward"></div></div>';
    el.querySelector('.achievement-toast-title').textContent = a.title;
    el.querySelector('.achievement-toast-reward').textContent = `보상 ${Achievements.rewardLabel(a.reward)} · 도전과제에서 받기`;
    achievementToastsEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => {
      el.classList.remove('in');
      setTimeout(() => { el.remove(); toastShowing = false; pumpToasts(); }, 400);
    }, 2800);
  }

  // Run after anything that could complete one. `silent` (startup, save
  // migration) records the unlock without the toast/sound, so an old save
  // doesn't get a burst of pop-ups for things it did long ago.
  function checkAchievements(opts) {
    const fresh = Achievements.evaluate(achievementCtx(), achievements.unlocked);
    if (!fresh.length) return;
    const now = Date.now();
    fresh.forEach((id) => { achievements.unlocked[id] = now; });
    persist();
    updateAchievementBadge();
    if (!achievementsOverlay.classList.contains('hidden')) renderAchievements();
    if (opts && opts.silent) return;
    sfx.gem();
    fresh.forEach((id) => toastQueue.push(Achievements.byId(id)));
    pumpToasts();
  }

  const ACHIEVEMENT_CATEGORIES = ['낚시', '도감', '상점', '뽑기', '강화', '낚시터'];
  function renderAchievements() {
    const ctx = achievementCtx();
    const total = Achievements.LIST.length;
    const done = Achievements.LIST.filter((a) => achievements.unlocked[a.id]).length;
    achievementsSummaryEl.textContent = `${done} / ${total}`;
    // 모두 받기 only earns its place once there's more than one thing to collect.
    achievementsClaimAllBtn.classList.toggle('hidden', unclaimedAchievementIds().length < 2);
    achievementsListEl.innerHTML = '';
    ACHIEVEMENT_CATEGORIES.forEach((cat) => {
      // Hidden ones don't exist here until cleared -- then they surface in
      // their own category with a badge, never as a "???" placeholder.
      const rows = Achievements.LIST.filter((a) => a.cat === cat && (!a.hidden || achievements.unlocked[a.id]));
      if (!rows.length) return;
      const head = document.createElement('div');
      head.className = 'achievement-section';
      head.textContent = cat;
      achievementsListEl.appendChild(head);
      rows.forEach((a) => {
        const unlockedAt = achievements.unlocked[a.id];
        const claimedAt = achievements.claimed[a.id];
        const row = document.createElement('div');
        const trophy = Achievements.trophyTier(a);
        row.className = 'sell-row achievement-row trophy-' + trophy.key + ' ' + (unlockedAt ? (claimedAt ? 'cleared' : 'cleared claimable') : 'locked');
        row.innerHTML = '<div class="sell-row-icon" title="' + trophy.label + ' 트로피"><img src="' + trophy.icon + '" alt=""></div>'
          + '<div class="sell-row-info"><div class="sell-row-name"></div><div class="sell-row-meta"></div><div class="achievement-reward"></div></div>'
          + '<div class="achievement-state"></div>';
        // Reward line under the description on every row -- locked ones show
        // what's waiting, claimed ones what was collected.
        const rewardEl = row.querySelector('.achievement-reward');
        Achievements.rewardParts(a.reward).forEach((p) => {
          const chip = document.createElement('span');
          chip.className = 'achievement-reward-part';
          chip.innerHTML = '<img alt="">';
          chip.querySelector('img').src = p.icon;
          chip.appendChild(document.createTextNode(p.text));
          rewardEl.appendChild(chip);
        });
        const nameEl = row.querySelector('.sell-row-name');
        nameEl.textContent = a.title;
        if (a.hidden) {
          const badge = document.createElement('span');
          badge.className = 'achievement-hidden-badge';
          badge.textContent = '히든';
          nameEl.appendChild(badge);
        }
        let meta = a.desc;
        if (!unlockedAt && a.progress) {
          const [cur, max] = a.progress(ctx);
          meta += ` · ${cur.toLocaleString('ko-KR')} / ${max.toLocaleString('ko-KR')}`;
        }
        row.querySelector('.sell-row-meta').textContent = meta;
        if (unlockedAt && !claimedAt) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'sell-btn achievement-claim-btn';
          btn.textContent = '받기';
          btn.addEventListener('click', () => claimAchievements([a.id]));
          row.querySelector('.achievement-state').appendChild(btn);
        } else if (unlockedAt) {
          const d = new Date(unlockedAt);
          row.querySelector('.achievement-state').innerHTML = '달성<small></small>';
          row.querySelector('small').textContent = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
        }
        achievementsListEl.appendChild(row);
      });
    });
    // The only trace of unfound hidden ones: how many are left.
    const secretsLeft = Achievements.LIST.filter((a) => a.hidden && !achievements.unlocked[a.id]).length;
    if (secretsLeft) {
      const note = document.createElement('p');
      note.className = 'achievement-footnote';
      note.textContent = `숨겨진 도전과제 ${secretsLeft}개 남음`;
      achievementsListEl.appendChild(note);
    }
  }
  function openAchievements() {
    renderAchievements();
    achievementsOverlay.classList.remove('hidden');
  }
  function closeAchievements() { achievementsOverlay.classList.add('hidden'); }
  menuAchievementsBtn.addEventListener('click', openAchievements);
  achievementsCloseBtn.addEventListener('click', closeAchievements);
  achievementsOverlay.addEventListener('click', (e) => { if (e.target === achievementsOverlay) closeAchievements(); });

  // ---- 랭킹 (host leaderboard, Apps in Toss only) ----
  // Score = 누적 판매 조개, the same counter 도전과제 keeps. Sent after every
  // sale and once at startup (covers a submission the last session lost).
  // Three entry points to the same board -- launch title, bottom tab bar,
  // and the 도전과제 header -- so it's never more than one tap away; all
  // hidden together on hosts without one (the tab bar is then five tabs).
  const leaderboardBtns = ['title-leaderboard-btn', 'menu-leaderboard-btn', 'leaderboard-btn']
    .map((id) => document.getElementById(id));
  leaderboardBtns.forEach((btn) => {
    btn.classList.toggle('hidden', !Platform.hasLeaderboard);
    btn.addEventListener('click', () => Platform.openLeaderboard());
  });
  function submitLeaderboardScore() {
    if (!Platform.hasLeaderboard || achievements.stats.shellsEarned <= 0) return;
    Platform.submitScore(achievements.stats.shellsEarned);
  }

  // ================= Bucket (보관함 / 도감) =================
  function openBucket() {
    switchBucketTab('inventory');
    bucketOverlay.classList.remove('hidden');
  }
  function closeBucket() { bucketOverlay.classList.add('hidden'); }
  menuBucketBtn.addEventListener('click', openBucket);
  bucketCloseBtn.addEventListener('click', closeBucket);
  bucketOverlay.addEventListener('click', (e) => { if (e.target === bucketOverlay) closeBucket(); });

  function switchBucketTab(key) {
    bucketTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.btab === key));
    Object.entries(bucketTabPanels).forEach(([k, el]) => el.classList.toggle('hidden', k !== key));
    if (key === 'inventory') renderBucketInventory();
    if (key === 'log') renderLog();
  }
  bucketTabs.forEach(btn => btn.addEventListener('click', () => switchBucketTab(btn.dataset.btab)));

  // Same row markup as the shop's sell list, minus the price/판매 button --
  // 보관함 is just a look at what's held, selling still happens in 상점.
  function renderBucketInventory() {
    bucketListEl.innerHTML = '';
    bucketListEl.classList.toggle('hidden', caughtFish.length === 0);
    bucketEmptyEl.classList.toggle('hidden', caughtFish.length > 0);
    caughtFish.forEach(item => {
      const row = document.createElement('div');
      row.className = 'sell-row';
      row.innerHTML = `
        <div class="sell-row-icon"><img src="${FishData.speciesIconPath(item.tier, item.id)}" alt=""></div>
        <div class="sell-row-info">
          <div class="sell-row-name">
            <span class="tier-badge tier-${item.tier}">${FishData.TIERS[item.tier].label}</span>
            ${item.name} · ${item.size}cm
          </div>
          <div class="sell-row-meta">${item.desc}</div>
        </div>
      `;
      bucketListEl.appendChild(row);
    });
  }

  // Highest tier first, junk excluded -- 도감 is a fish species log, and
  // junk drops (FishData.JUNK_ITEMS) aren't species.
  const LOG_TIER_ORDER = ['legendary', 'epic', 'rare', 'common'];

  // Which 낚시터 the 도감 tab shows. Follows the current one until the
  // player picks another tab (setStage() resets it).
  let logStage = null;
  const logStageTabsEl = document.getElementById('log-stage-tabs');
  function renderLog() {
    if (!logStage || !FishData.STAGES[logStage] || !stageUnlocked(logStage)) logStage = stage;
    logStageTabsEl.innerHTML = '';
    FishData.STAGE_ORDER.forEach((key) => {
      const locked = !stageUnlocked(key);
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'log-stage-tab' + (key === logStage ? ' active' : '') + (locked ? ' locked' : '');
      tab.textContent = FishData.STAGES[key].name + (locked ? ' · 잠김' : '');
      tab.disabled = locked;
      tab.addEventListener('click', () => { logStage = key; renderLog(); });
      logStageTabsEl.appendChild(tab);
    });
    logListEl.innerHTML = '';
    if (!FishData.stageReady(logStage)) {
      const p = document.createElement('p');
      p.className = 'log-summary';
      p.textContent = '준비 중인 낚시터예요.';
      logListEl.appendChild(p);
      return;
    }
    const summary = document.createElement('p');
    summary.className = 'log-summary';
    summary.textContent = `${stageDexCount(logStage)} / ${stageSpeciesTotal(logStage)}종 발견`;
    logListEl.appendChild(summary);
    const pools = FishData.FISH_BY_STAGE[logStage];
    LOG_TIER_ORDER.forEach(tier => {
      const species = pools[tier];
      if (!species || !species.length) return;
      const header = document.createElement('div');
      header.className = 'log-section-title';
      header.textContent = FishData.TIERS[tier].label;
      logListEl.appendChild(header);

      species.forEach(sp => {
        const record = catches[sp.id];
        const row = document.createElement('div');
        row.className = 'sell-row log-row' + (record ? '' : ' undiscovered');
        row.dataset.tier = tier;
        row.dataset.speciesId = sp.id;
        row.innerHTML = `
          <div class="sell-row-icon"><img src="${record ? FishData.speciesIconPath(tier, sp.id) : 'icons/fish/unknown.svg'}" alt=""></div>
          <div class="sell-row-info">
            <div class="sell-row-name">
              <span class="tier-badge tier-${tier}">${FishData.TIERS[tier].label}</span>
              ${record ? sp.name : '???'}
            </div>
            <div class="sell-row-meta">${record ? `${record.count}회 낚음 · 최고 ${record.best}cm` : '아직 낚지 못했어요'}</div>
          </div>
        `;
        logListEl.appendChild(row);
      });
    });
  }

  // Tapping a discovered 도감 row opens a bigger detail popup (icon, full
  // desc, size/price range, catch record). Undiscovered ("???") rows do
  // nothing -- there's nothing to show without spoiling the mystery.
  logListEl.addEventListener('click', (e) => {
    const row = e.target.closest('.log-row');
    if (!row || row.classList.contains('undiscovered')) return;
    openSpeciesDetail(row.dataset.tier, row.dataset.speciesId);
  });

  function openSpeciesDetail(tier, speciesId) {
    const record = catches[speciesId];
    const found = FishData.speciesById(speciesId);
    if (!record || !found) return;
    const sp = found.species;
    tier = found.tier;
    const tierInfo = FishData.TIERS[tier];
    const priceRange = FishData.stagePriceRange(found.stage, tier);
    speciesDetailIcon.src = FishData.speciesIconPath(tier, speciesId);
    speciesDetailTierBadge.textContent = tierInfo.label;
    speciesDetailTierBadge.className = `tier-badge tier-${tier}`;
    speciesDetailName.textContent = sp.name;
    speciesDetailDesc.textContent = sp.desc;
    speciesDetailStats.innerHTML = `
      <div class="species-detail-row"><span>크기</span><span>${sp.sizeRange[0]}~${sp.sizeRange[1]}cm</span></div>
      <div class="species-detail-row"><span>낚시터</span><span>${FishData.STAGES[found.stage].name}</span></div>
      <div class="species-detail-row"><span>판매가</span><span><img class="price-icon" src="icons/ui/shell.svg" alt="">${priceRange.min.toLocaleString('ko-KR')}~${priceRange.max.toLocaleString('ko-KR')}</span></div>
      <div class="species-detail-row"><span>낚은 기록</span><span>${record.count}회 · 최고 ${record.best}cm</span></div>
    `;
    const history = record.history || [];
    speciesDetailHistory.innerHTML = history.length
      // Chronological, oldest (1.) first -- history is already stored in
      // catch order (see recordCatch()'s push()).
      ? history.map((size, i) => `<div class="species-detail-history-item"><span class="species-detail-history-index">${i + 1}.</span><span>${size}cm</span></div>`).join('')
      // count is always >=1 once a record exists (see recordCatch()), so an
      // empty history here only ever means these catches predate this
      // feature -- there was never a chance to record their sizes.
      : `<p class="species-detail-history-empty">이 기능이 생기기 전 기록이라 크기가 남아있지 않아요.</p>`;
    speciesDetailOverlay.classList.remove('hidden');
  }
  function closeSpeciesDetail() { speciesDetailOverlay.classList.add('hidden'); }
  speciesDetailCloseBtn.addEventListener('click', closeSpeciesDetail);
  speciesDetailOverlay.addEventListener('click', (e) => { if (e.target === speciesDetailOverlay) closeSpeciesDetail(); });

  // ================= Tutorial (guided first play) =================
  // Tap steps each own one tap: cast -> wait -> reel -> shopTab -> sell ->
  // gachaTab -> gacha (one free 10뽑) -> gachaReveal -> upgradeTab; the
  // game's normal handlers advance them (cast(), startReel(), closeResult(),
  // openShop(), sellFish(), switchShopTab(), runGacha(), closeReveal()) so
  // the tutorial never fakes any game logic. Info stops (TUTORIAL_INFO) just
  // spotlight something and wait for the callout's own 다음. The layer
  // (index.html #tutorial-layer) dims everything except the cut-out.
  // Two parts: 낚시 방법 (cast .. reel, replayable from 설정, `tutorialDone`)
  // and the 시스템 소개 that follows the first catch (shopTab .. upStats,
  // shown once ever, `introDone`). Finishing or skipping marks both.
  const tutorial = { active: false, step: null, hole: null, practice: false };
  const tutorialLayer = document.getElementById('tutorial-layer');
  const tutorialMask = document.getElementById('tutorial-mask');
  const tutorialRing = document.getElementById('tutorial-ring');
  const tutorialHand = document.getElementById('tutorial-hand');
  const tutorialCallout = document.getElementById('tutorial-callout');
  const tutorialCalloutText = document.getElementById('tutorial-callout-text');
  const tutorialNextBtn = document.getElementById('tutorial-next-btn');
  const tutorialCard = document.getElementById('tutorial-card');
  const tutorialSkipBtn = document.getElementById('tutorial-skip-btn');
  const tutorialFinishBtn = document.getElementById('tutorial-finish-btn');
  const tutorialReplayBtn = document.getElementById('tutorial-replay-btn');
  const CLIP_PATH_OK = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('clip-path', 'path("M0 0h1v1z")');
  const TUTORIAL_INFO = {
    reelGauge: { hud: true, el: () => gaugeTrackEl, next: 'reelHits',
      text: '낚시가 시작됐어요. 하얀 막대가 노란 구간에 왔을 때 화면을 누르면 성공이에요' },
    reelHits: { hud: true, el: () => hitsCounterEl, next: 'reelLives',
      text: '물고기 표시는 성공해야 하는 횟수예요. 다 채우면 물고기를 낚아요' },
    reelLives: { hud: true, el: () => chanceLightsEl, next: 'reel', nextLabel: '계속하기',
      text: '파란 불은 목숨이에요. 타이밍을 놓치면 하나씩 꺼지고, 다 꺼지면 물고기가 도망가요. 안내 중에는 줄지 않아요' },
    shells: { el: () => document.querySelector('.shop-balances'), next: 'gachaTab',
      text: '받은 조개껍질이에요. 조개껍질로는 미끼 뽑기와 낚싯대·능력치 강화를 할 수 있어요' },
    baitInfo: { el: () => baitBtn, next: 'upgradeTab',
      text: '뽑은 미끼는 아래 미끼 탭에서 장착해요. 좋은 미끼일수록 귀한 물고기가 와요' },
    upRod: { scroll: true, el: () => document.querySelector('.upgrade-rod-info'), next: 'upGem',
      text: '낚싯대예요. 칸이 레벨(1~10)이고, 조개껍질로 레벨을 올리면 노란 구간이 넓어져 낚시가 쉬워져요' },
    upGem: { scroll: true, el: () => rodMaterialEl, next: 'upStats',
      text: '보석이에요. 물고기를 낚을 때 가끔 나와요. 레벨 10을 찍은 뒤 보석을 모으면 낚싯대 등급이 올라요. 특급 낚싯대는 목숨이 하나 늘어요' },
    upStats: { scroll: true, el: () => statsListEl, next: 'finish',
      text: '근력·행운·정밀함 같은 능력치 강화도 있어요. 조개껍질이 모이면 살펴보세요' }
  };
  // Where the float is drawn -- callouts keep clear of it (see placeCallout).
  const floatRect = () => (bobber ? { x: bobber.x - 34, y: bobber.y - 50, w: 68, h: 90 } : null);

  function gameRectOf(el) {
    const g = gameEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - g.left, y: r.top - g.top, w: r.width, h: r.height };
  }
  function padRect(r, p) { return { x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2 }; }
  function roundedRectPath(r, rad) {
    const k = Math.min(rad, r.w / 2, r.h / 2);
    return `M${r.x + k} ${r.y}H${r.x + r.w - k}A${k} ${k} 0 0 1 ${r.x + r.w} ${r.y + k}V${r.y + r.h - k}`
      + `A${k} ${k} 0 0 1 ${r.x + r.w - k} ${r.y + r.h}H${r.x + k}A${k} ${k} 0 0 1 ${r.x} ${r.y + r.h - k}`
      + `V${r.y + k}A${k} ${k} 0 0 1 ${r.x + k} ${r.y}Z`;
  }
  // Cuts the hole out of the mask. Even-odd fill makes the inner rect a
  // hole, and clip-path also clips hit-testing, so the hole is tap-through.
  function setMaskHole(r) {
    tutorial.hole = r;
    if (!r) { tutorialMask.style.clipPath = 'none'; tutorialRing.classList.add('hidden'); return; }
    if (CLIP_PATH_OK) {
      tutorialMask.style.clipPath = `path(evenodd, "M0 0H${W}V${H}H0Z ${roundedRectPath(r, 16)}")`;
    } else {
      tutorialMask.style.clipPath = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, `
        + `${r.x}px ${r.y}px, ${r.x}px ${r.y + r.h}px, ${r.x + r.w}px ${r.y + r.h}px, ${r.x + r.w}px ${r.y}px, ${r.x}px ${r.y}px)`;
    }
    tutorialRing.classList.remove('hidden');
    tutorialRing.style.left = r.x + 'px'; tutorialRing.style.top = r.y + 'px';
    tutorialRing.style.width = r.w + 'px'; tutorialRing.style.height = r.h + 'px';
  }
  // Callout goes above the anchor when there's room, else below it; `side`
  // docks it beside the anchor instead (reel HUD). Either way the bubble is
  // centred on the anchor (clamped to the screen) and the arrow is moved to
  // the anchor's own x/y, so it always points at the thing. `avoid` is a
  // rect to stay off (the float): the bubble flips to the other side of the
  // anchor, or slides past the rect, rather than covering it.
  function placeCallout(text, anchor, opts = {}) {
    tutorialCalloutText.textContent = text;
    tutorialCallout.className = 'tutorial-callout' + (opts.now ? ' now' : '') + (opts.withNext ? ' with-next' : '');
    tutorialCallout.style.left = '0px'; tutorialCallout.style.top = '0px';
    const w = tutorialCallout.offsetWidth;
    const h = tutorialCallout.offsetHeight;
    const cx = anchor.x + anchor.w / 2;
    const cy = anchor.y + anchor.h / 2;
    const clampX = (v) => Math.max(8, Math.min(W - w - 8, v));
    const clampY = (v) => Math.max(8, Math.min(H - h - 8, v));
    const a = opts.avoid;
    const hits = (l, t) => !!a && l < a.x + a.w && l + w > a.x && t < a.y + a.h && t + h > a.y;
    let left, top;
    if (opts.side) {
      left = clampX(opts.side === 'left' ? anchor.x - w - 14 : anchor.x + anchor.w + 14);
      top = clampY(cy - h / 2);
      if (hits(left, top)) {
        const under = a.y + a.h + 10;
        top = clampY(under + h <= H - 8 ? under : a.y - h - 10);
      }
      tutorialCallout.classList.add(opts.side === 'left' ? 'side-left' : 'side-right');
      tutorialCallout.style.setProperty('--arrow-y', Math.max(14, Math.min(h - 14, cy - top)) + 'px');
    } else {
      left = clampX(cx - w / 2);
      const aboveTop = anchor.y - h - 16;
      const belowTop = anchor.y + anchor.h + 16;
      let below = opts.below || aboveTop < 8 + 44;
      top = below ? belowTop : aboveTop;
      if (hits(left, top)) {
        const alt = below ? aboveTop : belowTop;
        if (alt >= 8 && alt + h <= H - 8 && !hits(left, alt)) {
          top = alt;
        } else {
          // Both sides land on the float: slide just past it instead.
          const under = a.y + a.h + 10;
          top = clampY(under + h <= H - 8 ? under : a.y - h - 10);
        }
        below = top > cy; // arrow direction follows where the bubble ended up
      }
      tutorialCallout.classList.add(below ? 'below' : 'above');
      tutorialCallout.style.setProperty('--arrow-x', Math.max(14, Math.min(w - 14, cx - left)) + 'px');
    }
    tutorialCallout.style.left = left + 'px';
    tutorialCallout.style.top = top + 'px';
  }
  function tutorialLayout() {
    if (!tutorial.active) return;
    tutorialMask.classList.remove('clear');
    tutorialRing.classList.remove('blocking');
    tutorialHand.classList.add('hidden');
    tutorialCallout.classList.add('hidden');
    tutorialNextBtn.classList.add('hidden');
    tutorialCard.classList.add('hidden');
    tutorialSkipBtn.classList.remove('hidden');
    const step = tutorial.step;
    const info = TUTORIAL_INFO[step];
    if (info) {
      const el = info.el();
      if (!el) { tutorialGo(info.next); return; }
      // Only the upgrade list scrolls; 'nearest' keeps the page itself put
      // (a 'center' scroll shifted the whole game for the reel HUD stops).
      if (info.scroll) el.scrollIntoView({ block: 'nearest' });
      setMaskHole(padRect(gameRectOf(el), 8));
      tutorialRing.classList.add('blocking');
      tutorialNextBtn.textContent = info.nextLabel || '다음';
      tutorialNextBtn.classList.remove('hidden');
      tutorialCallout.classList.remove('hidden');
      shopOverlay.classList.toggle('tutorial-peek', step === 'baitInfo');
      // HUD stops pass the float's rect so the bubble lands above or below
      // the element without sitting on the float in mid-screen.
      placeCallout(info.text, tutorial.hole, { withNext: true, avoid: info.hud ? floatRect() : null });
      return;
    }
    shopOverlay.classList.remove('tutorial-peek');
    if (step === 'cast') {
      const hole = { x: W * 0.18, y: H * 0.44, w: W * 0.64, h: H * 0.26 };
      setMaskHole(hole);
      tutorialCallout.classList.remove('hidden');
      placeCallout('밝은 곳을 눌러 낚싯대를 던져요', hole);
      tutorialHand.classList.remove('hidden');
      tutorialHand.style.left = (hole.x + hole.w / 2) + 'px';
      tutorialHand.style.top = (hole.y + hole.h / 2) + 'px';
    } else if (step === 'wait') {
      setMaskHole(null);
      const b = bobber || { x: W / 2, y: H * 0.55 };
      tutorialCallout.classList.remove('hidden');
      placeCallout('찌가 흔들릴 때까지 잠깐 기다려요', { x: b.x, y: b.y - 20, w: 0, h: 40 }, { below: true, avoid: floatRect() });
    } else if (step === 'reel') {
      setMaskHole(null);
      tutorialMask.classList.add('clear'); // the whole screen is the reel's tap target
      const ring = padRect(gameRectOf(gaugeTrackEl), 8);
      tutorialRing.classList.remove('hidden');
      tutorialRing.style.left = ring.x + 'px'; tutorialRing.style.top = ring.y + 'px';
      tutorialRing.style.width = ring.w + 'px'; tutorialRing.style.height = ring.h + 'px';
      tutorialCallout.classList.remove('hidden');
      tutorialReelPrompt();
    } else if (step === 'shopTab') {
      setMaskHole(padRect(gameRectOf(menuShopBtn), 6));
      tutorialCallout.classList.remove('hidden');
      placeCallout('물고기를 팔면 조개껍질을 받을 수 있어요. 상점을 눌러 보세요', tutorial.hole);
    } else if (step === 'sell') {
      const btn = sellListEl.querySelector('.sell-btn');
      if (!btn) { tutorialGo('finish'); return; } // nothing to sell (shouldn't happen) -- wrap up
      setMaskHole(padRect(gameRectOf(btn), 8));
      tutorialCallout.classList.remove('hidden');
      placeCallout('이 버튼을 눌러 팔아요', tutorial.hole);
    } else if (step === 'gachaTab' || step === 'upgradeTab') {
      const tab = shopPanel.querySelector(`.shop-tab[data-tab="${step === 'gachaTab' ? 'gacha' : 'upgrade'}"]`);
      setMaskHole(padRect(gameRectOf(tab), 4));
      tutorialCallout.classList.remove('hidden');
      placeCallout(step === 'gachaTab' ? '먼저 뽑기예요. 뽑기 탭을 눌러요' : '이번엔 강화예요. 강화 탭을 눌러요', tutorial.hole);
    } else if (step === 'gacha') {
      renderGachaTab(); // enables 10뽑 and labels it 무료 for this one pull
      setMaskHole(padRect(gameRectOf(gachaPull10Btn), 6));
      tutorialCallout.classList.remove('hidden');
      placeCallout('첫 10뽑은 무료예요!', tutorial.hole);
    } else if (step === 'gachaReveal') {
      setMaskHole(null);
      tutorialMask.classList.add('clear'); // the reveal overlay wants the taps
      tutorialCallout.classList.remove('hidden');
      placeCallout('카드를 눌러 무엇이 나왔는지 확인해요', gameRectOf(gachaCardGridEl));
    } else if (step === 'finish') {
      setMaskHole(null);
      tutorialSkipBtn.classList.add('hidden');
      tutorialCard.classList.remove('hidden');
    }
  }
  // Reel step's callout follows the thumb: instruction while it sweeps,
  // "지금!" while it's parked in the zone waiting for the tap.
  function tutorialReelPrompt() {
    if (tutorial.step !== 'reel' || !reel) return;
    const track = gameRectOf(reelGaugeEl); // whole cluster, so the callout clears the fish/chance column
    const side = leftyMode ? 'left' : 'right';
    const avoid = floatRect();
    if (reel.paused) {
      placeCallout('지금 눌러요!', track, { side, now: true, avoid });
    } else if (reel.hits === 0) {
      placeCallout('하얀 막대가 노란 구간에 오면 멈춰요. 그때 화면을 눌러요', track, { side, avoid });
    } else {
      placeCallout(`잘했어요! ${reel.hitsRequired - reel.hits}번 더`, track, { side, avoid });
    }
  }
  function tutorialReelEnd() {
    gaugeTrackEl.classList.remove('tutorial-glow');
    gaugeZoneEl.classList.remove('tutorial-glow');
    if (tutorial.step === 'reel') { tutorialRing.classList.add('hidden'); tutorialCallout.classList.add('hidden'); }
  }
  function tutorialGo(step) {
    tutorial.active = true;
    tutorial.step = step;
    tutorialLayer.classList.remove('hidden');
    if (step === 'reel') {
      gaugeTrackEl.classList.add('tutorial-glow');
      gaugeZoneEl.classList.add('tutorial-glow');
      if (reel && reel.frozen) {
        reel.frozen = false;
        reel.startT = performance.now() / 1000;
        reel.timeStart = reel.startT;
      }
    }
    // Shop/sell rects need the overlay laid out first.
    requestAnimationFrame(tutorialLayout);
  }
  function tutorialFinish() {
    if (reel && reel.tutorial) {
      // Skipped mid-reel: hand the fight back to the normal clock from now.
      reel.tutorial = false;
      reel.frozen = false;
      reel.paused = false;
      reel.startT = performance.now() / 1000;
      reel.timeStart = performance.now() / 1000;
    }
    tutorialReelEnd();
    tutorial.active = false;
    tutorial.step = null;
    tutorial.practice = false;
    tutorialLayer.classList.add('hidden');
    shopOverlay.classList.remove('tutorial-peek');
    gameEl.classList.remove('tutorial-pending');
    tutorialDone = true;
    introDone = true;
    persist();
    renderGachaTab(); // drops the 무료 label if the tutorial was skipped on that step
    if (state === 'idle' && pendingMaterial) {
      showMaterialPopup(pendingMaterial);
      pendingMaterial = null;
    }
  }
  tutorialSkipBtn.addEventListener('click', tutorialFinish);
  tutorialNextBtn.addEventListener('click', () => { const info = TUTORIAL_INFO[tutorial.step]; if (info) tutorialGo(info.next); });
  tutorialFinishBtn.addEventListener('click', () => { closeShop(); tutorialFinish(); });
  tutorialReplayBtn.addEventListener('click', () => {
    closeSettings();
    tutorialDone = false;
    tutorial.practice = true; // replay = practice: nothing it catches counts
    tutorialGo(state === 'idle' ? 'cast' : 'wait');
  });
  window.addEventListener('resize', () => requestAnimationFrame(tutorialLayout));

  // ================= Settings (왼손 모드 / 볼륨 / 데이터 삭제) =================
  function openSettings() {
    settingsOverlay.classList.remove('hidden');
  }
  function closeSettings() { settingsOverlay.classList.add('hidden'); }
  menuSettingsBtn.addEventListener('click', openSettings);
  settingsCloseBtn.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });

  // ---- Left-hand mode: mirrors the reeling HUD only (menu stays put) ----
  const LEFTY_KEY = 'zanzanhan-lefty-mode-v1';
  let leftyMode = Platform.storage.get(LEFTY_KEY) === '1';
  function applyLeftyMode() {
    gameEl.classList.toggle('lefty-mode', leftyMode);
    leftyToggleBtn.setAttribute('aria-checked', String(leftyMode));
  }
  leftyToggleBtn.addEventListener('click', () => {
    leftyMode = !leftyMode;
    Platform.storage.set(LEFTY_KEY, leftyMode ? '1' : '0');
    applyLeftyMode();
  });
  applyLeftyMode();

  // ---- Skip low tiers the rod has outgrown (see SKIP_TIERS_BY_GRADE) ----
  const SKIP_LOWTIER_KEY = 'zanzanhan-skip-lowtier-v1';
  let skipLowTier = true;
  const storedSkip = Platform.storage.get(SKIP_LOWTIER_KEY);
  if (storedSkip !== null) skipLowTier = storedSkip === '1';
  function applySkipLowTier() {
    skipLowTierToggleBtn.setAttribute('aria-checked', String(skipLowTier));
  }
  skipLowTierToggleBtn.addEventListener('click', () => {
    skipLowTier = !skipLowTier;
    Platform.storage.set(SKIP_LOWTIER_KEY, skipLowTier ? '1' : '0');
    applySkipLowTier();
  });
  applySkipLowTier();

  // ---- Mute checkboxes, one per channel (left of each volume dial) ----
  const SFX_ON_KEY = 'zanzanhan-sfx-on-v1';
  const BGM_ON_KEY = 'zanzanhan-bgm-on-v1';
  const sfxOnCheck = document.getElementById('sfx-on-check');
  const bgmOnCheck = document.getElementById('bgm-on-check');
  sfxOn = Platform.storage.get(SFX_ON_KEY) !== '0';
  bgmOn = Platform.storage.get(BGM_ON_KEY) !== '0';
  function applyChannelChecks() {
    [[sfxOnCheck, sfxOn], [bgmOnCheck, bgmOn]].forEach(([box, on]) => {
      box.checked = on;
      box.closest('.volume-control').classList.toggle('muted', !on);
      box.nextElementSibling.textContent = on ? '켜짐' : '음소거';
    });
  }
  sfxOnCheck.addEventListener('change', () => {
    sfxOn = sfxOnCheck.checked;
    Platform.storage.set(SFX_ON_KEY, sfxOn ? '1' : '0');
    applyChannelChecks();
    // Checkboxes aren't buttons, so the delegated tap sound doesn't fire --
    // play one by hand as audible confirmation that the channel is back.
    if (sfxOn) { ensureAudio(); sfx.tap(); }
  });
  bgmOnCheck.addEventListener('change', () => {
    bgmOn = bgmOnCheck.checked;
    Platform.storage.set(BGM_ON_KEY, bgmOn ? '1' : '0');
    applyChannelChecks();
    // The click is itself a user gesture, so the pad can start right here
    // instead of waiting for the next tap somewhere else.
    if (bgmOn) { ensureAudio(); startBgm(); } else stopBgm();
  });
  applyChannelChecks();

  // ---- SFX volume slider ----
  const VOLUME_KEY = 'zanzanhan-sfx-volume-v1';
  // sfxVolume itself is declared up in the audio section, right next to
  // blip() (the only other thing that reads it).
  const storedVol = parseFloat(Platform.storage.get(VOLUME_KEY));
  if (!isNaN(storedVol) && storedVol >= 0 && storedVol <= 1) sfxVolume = storedVol;
  volumeSliderEl.value = String(Math.round(sfxVolume * 100));
  volumeSliderEl.addEventListener('input', () => {
    sfxVolume = Math.max(0, Math.min(1, volumeSliderEl.value / 100));
    Platform.storage.set(VOLUME_KEY, String(sfxVolume));
  });

  // ---- BGM volume slider (independent of SFX) ----
  const BGM_VOLUME_KEY = 'zanzanhan-bgm-volume-v1';
  const storedBgmVol = parseFloat(Platform.storage.get(BGM_VOLUME_KEY));
  if (!isNaN(storedBgmVol) && storedBgmVol >= 0 && storedBgmVol <= 1) bgmMasterVolume = storedBgmVol;
  bgmVolumeSliderEl.value = String(Math.round(bgmMasterVolume * 100));
  bgmVolumeSliderEl.addEventListener('input', () => {
    bgmMasterVolume = Math.max(0, Math.min(1, bgmVolumeSliderEl.value / 100));
    Platform.storage.set(BGM_VOLUME_KEY, String(bgmMasterVolume));
    refreshBgmVolume();
  });

  // ---- Reset all progress -- in-game confirm (not window.confirm), with
  // the delete button disabled for 3s so it can't be reflex-clicked. ----
  let resetCountdownTimer = null;
  function openResetConfirm() {
    let remaining = 3;
    resetConfirmBtn.disabled = true;
    resetConfirmBtn.textContent = `삭제합니다 (${remaining})`;
    resetConfirmOverlay.classList.remove('hidden');
    clearInterval(resetCountdownTimer);
    resetCountdownTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(resetCountdownTimer);
        resetConfirmBtn.disabled = false;
        resetConfirmBtn.textContent = '삭제합니다';
      } else {
        resetConfirmBtn.textContent = `삭제합니다 (${remaining})`;
      }
    }, 1000);
  }
  function closeResetConfirm() {
    resetConfirmOverlay.classList.add('hidden');
    clearInterval(resetCountdownTimer);
  }
  resetDataBtn.addEventListener('click', openResetConfirm);
  resetCancelBtn.addEventListener('click', closeResetConfirm);
  resetConfirmOverlay.addEventListener('click', (e) => { if (e.target === resetConfirmOverlay) closeResetConfirm(); });
  resetConfirmBtn.addEventListener('click', () => {
    if (resetConfirmBtn.disabled) return;
    Platform.storage.remove(SAVE_KEY);
    location.reload();
  });

  // ================= Host back button -> exit confirm =================
  // The game has no pages of its own, so a system back press (Android
  // button, the Toss shell's back gesture) would otherwise leave outright.
  // One guard entry sits on top of the history stack: going back pops it,
  // popstate fires here, the guard is pushed straight back, and the player
  // gets asked first. Leaving for real is the host's job (Platform.exit).
  const exitConfirmOverlay = document.getElementById('exit-confirm-overlay');
  const exitCancelBtn = document.getElementById('exit-cancel-btn');
  const exitConfirmBtn = document.getElementById('exit-confirm-btn');
  const GUARD_STATE = { zzh: 'exit-guard' };
  history.replaceState({ zzh: 'root' }, '');
  history.pushState(GUARD_STATE, '');
  window.addEventListener('popstate', () => {
    history.pushState(GUARD_STATE, '');
    exitConfirmOverlay.classList.remove('hidden');
  });
  function closeExitConfirm() { exitConfirmOverlay.classList.add('hidden'); }
  exitCancelBtn.addEventListener('click', closeExitConfirm);
  exitConfirmOverlay.addEventListener('click', (e) => { if (e.target === exitConfirmOverlay) closeExitConfirm(); });
  exitConfirmBtn.addEventListener('click', () => {
    closeExitConfirm();
    Platform.exit();
  });

  Platform.lockPortrait();
  // Apps in Toss overlays its own close button on the page's top-right
  // corner -- the status bar reserves that space only there (style.css).
  gameEl.classList.toggle('host-toss', Platform.name === 'apps-in-toss');
  // Anything an older save already qualifies for (or that a migration
  // rebuilt) is granted quietly at startup, not announced.
  checkAchievements({ silent: true });
  updateAchievementBadge();
  submitLeaderboardScore();

  // ================= Dev hook (inert without dev-mode.js) =================
  // dev-mode.js is gitignored -- it never leaves this machine on push. This
  // hook does nothing unless that file has already set the flag below, so
  // shipping it costs nothing even though the code itself is public.
  const DEV_FLAG_KEY = 'zanzanhan-dev-mode';
  window.__zzhDevCast = function (tierKey) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    if (!FishData.TIERS[tierKey]) return;
    if (state !== 'idle') return;
    devForceTier = tierKey;
    const top = waterTop();
    cast(W * 0.5, top + (H - top) * 0.42);
    clearTimeout(waitingTimer);
    triggerBite();
  };
  window.__zzhDevGiveBait = function (tierKey, amount) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    if (!FishData.BAITS[tierKey] || tierKey === 'none') return;
    baits[tierKey] = (baits[tierKey] || 0) + (amount || 1);
    persist();
    updateBaitButton();
    if (!shopOverlay.classList.contains('hidden')) renderGachaTab();
  };
  window.__zzhDevSetGachaPity = function (value) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    gachaPity = Math.max(0, value || 0);
    persist();
  };
  window.__zzhDevUnlockStage = function (key) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    if (!FishData.STAGES[key] || stagesUnlocked.includes(key)) return;
    stagesUnlocked.push(key);
    persist();
  };
  window.__zzhDevBgmInfo = function () {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return null; } catch (e) { return null; }
    return { theme: bgmThemeKey, playing: !!bgmNodes, drones: droneNodes.length, chord: currentChord ? currentChord.length : 0 };
  };
  window.__zzhDevSetStage = function (key) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return false; } catch (e) { return false; }
    return setStage(key);
  };
  window.__zzhDevGiveGems = function (amount) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    gems += amount || 10;
    persist();
    updateCurrencyDisplay();
    if (!shopOverlay.classList.contains('hidden')) renderUpgradeTab();
  };
  // Read-only: where the float is (dev tests check callouts keep clear of it).
  window.__zzhDevFloat = function () {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return null; } catch (e) { return null; }
    return bobber ? { x: bobber.x, y: bobber.y } : null;
  };
  window.__zzhDevGiveShells = function (amount) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    shells += amount || 1000;
    persist();
    updateCurrencyDisplay();
    if (!shopOverlay.classList.contains('hidden')) { renderGachaTab(); renderUpgradeTab(); }
  };
  // Fills in every species' 도감 entry that isn't already discovered, with
  // a plausible (not just zeroed) count/best/history so the log previews
  // realistically instead of showing a pile of freshly-reset-looking rows.
  // stageKey limits it to one 낚시터 (lake/sea/abyss); omitted = every stage.
  window.__zzhDevUnlockAllSpecies = function (stageKey) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    const stages = stageKey ? [stageKey] : FishData.STAGE_ORDER;
    stages.forEach((st) => Object.keys(FishData.FISH_BY_STAGE[st] || {}).forEach((tierKey) => {
      FishData.FISH_BY_STAGE[st][tierKey].forEach((sp) => {
        if (catches[sp.id]) return;
        const history = [1, 2, 3].map(() => FishData.randSize(sp.sizeRange)).sort((a, b) => a - b);
        catches[sp.id] = { count: history.length, best: history[history.length - 1], history };
      });
    }));
    persist();
    if (!bucketOverlay.classList.contains('hidden')) renderLog();
    checkAchievements({ silent: true });
  };

  updateCurrencyDisplay();
  updateBaitButton();
  // Tutorial owed: the title swallows its own tap (style.css) so the first
  // cast happens inside step 1, not underneath the fading wordmark.
  if (!tutorialDone) gameEl.classList.add('tutorial-pending');

  // Browsers refuse to start any audio (WebAudio included) before the page
  // has seen a real user gesture -- no way around that, so this is as
  // close to "sound as soon as the game starts" as possible: unlock on the
  // very FIRST tap/click/key anywhere on the page, not specifically a cast
  // or a gacha pull like before. Self-removing, and ensureAudio() itself is
  // a no-op once actx already exists, so firing more than once is harmless.
  const unlockAudioOnFirstGesture = () => { ensureAudio(); startBgm(); };
  ['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
    document.addEventListener(evt, unlockAudioOnFirstGesture, { once: true, passive: true });
  });

  // The launch title (index.html, shown from the first paint) goes on the
  // same first gesture: it never swallows the tap, so a tap on the water
  // is already the first cast while the wordmark fades out over it.
  const titleOverlay = document.getElementById('title-overlay');
  // Not { once }: a tap the handler ignores (below) must not use it up.
  const titleEvents = ['pointerdown', 'touchstart', 'keydown'];
  const dismissTitle = (e) => {
    if (!gameEl.classList.contains('title-up')) return;
    // A tap on one of the title's own buttons (랭킹) is not "start playing":
    // leave the title up, the button handles itself.
    if (e && e.target && e.target.closest && e.target.closest('.title-actions')) return;
    gameEl.classList.remove('title-up');
    titleOverlay.classList.add('fading');
    setTimeout(() => {
      titleOverlay.classList.add('hidden');
      if (!tutorialDone && !tutorial.active) tutorialGo('cast');
    }, 600);
    titleEvents.forEach((evt) => document.removeEventListener(evt, dismissTitle));
  };
  titleEvents.forEach((evt) => {
    document.addEventListener(evt, dismissTitle, { passive: true });
  });

  // BGM is a continuous loop (unlike the one-shot SFX blips), so unlike
  // those it actually needs to stop when the tab/app goes to the
  // background and pick back up on return -- required by the Apps in
  // Toss launch checklist ("백그라운드 전환 시 사운드 즉시 종료, 재진입 시
  // 정상 재생") and just generally correct regardless of platform.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopBgm();
    else if (actx) startBgm();
  });

  // Generic UI tap sound, delegated once here rather than threaded into
  // every individual button's own click handler -- so any button (present
  // or future) gets feedback for free. A short exemption list covers the
  // handful of buttons that already play their own more specific sound
  // (coin pickup, etc.); without it those would double up into a jarring
  // back-to-back blip.
  const NO_TAP_SELECTOR = '#rod-upgrade-btn, [data-stat-btn], #gacha-pull1-btn, #gacha-pull10-btn, .sell-btn';
  document.getElementById('game').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.matches(NO_TAP_SELECTOR)) return;
    sfx.tap();
  });
}

// Platform.ready is immediate in a browser; on Apps in Toss it first pulls
// the player's identity and save data over the bridge (platform.js there is
// the Toss build), which is why the whole game waits on it.
Platform.ready.then(() => {
  try {
    __zzhInit();
  } catch (err) {
    // A silent failure here means NOTHING works -- no cast, no buttons -- with
    // no clue why, since the canvas still renders (it's on its own rAF loop
    // started before whatever threw). Surface it visibly instead of just
    // logging, so whoever hits this can screenshot the actual error.
    console.error('[잔잔한 낚시터] 초기화 실패:', err);
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#1a0f0f;color:#ffb3b3;'
      + 'font:13px/1.5 monospace;padding:18px;overflow:auto;white-space:pre-wrap;';
    banner.textContent = '게임 초기화 중 오류가 발생했습니다. 이 화면을 스크린샷해서 알려주세요:\n\n'
      + (err && (err.stack || err.message) || String(err));
    document.body.appendChild(banner);
  }
});
