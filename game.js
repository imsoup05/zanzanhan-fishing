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
  const BGM_PENTATONIC = [329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // E G A C D E, kept mid/high so it reads as light sparkle, not a low drone
  // Slow I - vi - IV - V-ish progression, calm/major throughout (no minor-key
  // tension), each chord a plain close triad so nothing clashes.
  const BGM_CHORDS = [
    [261.63, 329.63, 392.00], // C major (C4 E4 G4)
    [220.00, 261.63, 329.63], // A minor (A3 C4 E4)
    [174.61, 220.00, 261.63], // F major (F3 A3 C4)
    [196.00, 246.94, 293.66], // G major (G3 B3 D4)
  ];
  const CHORD_HOLD_S = 13;
  const CHORD_FADE_S = 4.5;
  function scheduleSparkle() {
    const delay = 5000 + Math.random() * 7000;
    sparkleTimer = setTimeout(() => {
      if (bgmNodes) {
        const freq = BGM_PENTATONIC[Math.floor(Math.random() * BGM_PENTATONIC.length)];
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.04 * bgmVolume()), actx.currentTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 4.5);
        if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; osc.connect(gain).connect(pan).connect(bgmNodes.master); }
        else { osc.connect(gain).connect(bgmNodes.master); }
        osc.start();
        osc.stop(actx.currentTime + 4.6);
      }
      scheduleSparkle();
    }, delay);
  }
  function playChordVoice(freq, master) {
    const osc = actx.createOscillator();
    osc.type = 'triangle'; // softer/rounder than sine's clinical purity once filtered
    osc.frequency.value = freq;
    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    const gain = actx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(filter).connect(gain).connect(master);
    osc.start();
    const now = actx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.16, now + CHORD_FADE_S);
    gain.gain.setValueAtTime(0.16, now + CHORD_HOLD_S - CHORD_FADE_S);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + CHORD_HOLD_S);
    osc.stop(now + CHORD_HOLD_S + 0.2);
  }
  let chordIndex = 0;
  function scheduleChordCycle() {
    if (bgmNodes) {
      const chord = BGM_CHORDS[chordIndex % BGM_CHORDS.length];
      chordIndex++;
      chord.forEach(freq => playChordVoice(freq, bgmNodes.master));
    }
    // Next chord's fade-in starts while this one is still fading out, so
    // the pad crossfades continuously with no gap and no static hold.
    chordTimer = setTimeout(scheduleChordCycle, (CHORD_HOLD_S - CHORD_FADE_S) * 1000);
  }
  function bgmVolume() { return bgmMasterVolume * 0.3; } // internal balance scale, not the raw slider value
  function startBgm() {
    if (!actx || bgmNodes || !bgmOn) return;
    const master = actx.createGain();
    master.gain.value = bgmVolume();
    master.connect(actx.destination);
    bgmNodes = { master };
    chordIndex = 0;
    scheduleChordCycle();
    scheduleSparkle();
  }
  function stopBgm() {
    clearTimeout(sparkleTimer);
    clearTimeout(chordTimer);
    if (!bgmNodes) return;
    const now = actx.currentTime;
    // Individual chord voices/sparkles are already self-scheduled to stop
    // on their own; dropping the shared master to silence immediately is
    // enough to cut them off cleanly without tracking every live node.
    bgmNodes.master.gain.setTargetAtTime(0.0001, now, 0.15);
    bgmNodes = null;
  }
  // Volume slider changes should retune the currently-playing pad too, not
  // just future sfx blips -- see the slider wiring below.
  function refreshBgmVolume() { if (bgmNodes) bgmNodes.master.gain.setTargetAtTime(bgmVolume(), actx.currentTime, 0.2); }

  // ================= Canvas background =================
  const gameEl = document.getElementById('game');
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  // Offscreen copy of everything static in the scene (deck, vault, piers,
  // arch ring, the shadow they throw on the water) -- painted once per
  // size, blitted each frame. See renderBridgeCache().
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
  function pierWidth() { return W * 0.22; }

  const THEME = {
    beam: '#171412',
    wall: ['#221e1b', '#3a3430', '#4d4640'],
    wallWarm: 'rgba(255,186,110,0.18)',
    sky: ['#a6d6ea', '#ffe8b8', '#ffd27c'],
    sun: 'rgba(255,248,224,0.7)',
    haze: 'rgba(255,236,200,0.5)',
    farBank: 'rgba(110,130,140,0.35)',
    ring: '#332e2a',
    ringRim: 'rgba(255,224,176,0.75)',
    bounce: 'rgba(120,205,215,0.2)',
    moss: ['rgba(35,58,32,0)', 'rgba(28,48,26,0.65)'],
    bridgeShadow: 'rgba(0,0,0,0.45)',
    rayColor: 'rgba(255,238,190,',
    water: ['#bfe9dc', '#6cc0c2', '#2f8f9c', '#0f4b5c'],
    openingReflect: 'rgba(255,232,190,',
    pierReflect: '#0a2a30',
    waveA: '#eaffef', waveB: '#0a3a44',
    sunGlow: 'rgba(255,246,214,0.12)',
    waterline: '#eafffb',
    sparkle: '#fffbe8'
  };

  // Shared layout of the bridge so the static painter, the water's
  // reflection of the opening and the shadow cut-out all agree on where
  // the arch actually is.
  function bridgeGeom() {
    const wTop = waterTop();
    const deckH = Math.max(24, H * 0.045);
    const pierW = pierWidth();
    const span = wTop - deckH;
    const cx = W * 0.5;
    const rx = W * 0.5 - pierW;
    const crownY = deckH + span * 0.22;
    const springY = wTop - span * 0.4;
    return { wTop, deckH, pierW, span, cx, rx, crownY, springY, ry: springY - crownY };
  }

  // Outline of the opening: straight jambs up from the water, elliptical
  // arc over the top. Runs a little below the waterline so the sky always
  // meets its own reflection with no seam. A negative inset grows it.
  // `open` leaves the bottom unclosed -- for strokes, otherwise the closing
  // chord paints a bar straight across the opening at the waterline.
  function archPath(c, g, inset, open) {
    inset = inset || 0;
    c.beginPath();
    c.moveTo(g.cx - g.rx + inset, g.wTop + 4);
    c.lineTo(g.cx - g.rx + inset, g.springY);
    c.ellipse(g.cx, g.springY, g.rx - inset, g.ry - inset, 0, Math.PI, 0, false);
    c.lineTo(g.cx + g.rx - inset, g.wTop + 4);
    if (!open) c.closePath();
  }

  // Cheap deterministic noise so each stone block keeps the same tone
  // across frames and resizes instead of shimmering.
  function hash2(a, b) {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  // Everything here is static, so it paints into `c` (the offscreen cache
  // context) rather than the live canvas. Light comes from beyond the
  // opening: the vault and piers are in shadow, picking up only a warm
  // wash near the arch and a cool bounce off the water at their feet.
  function drawStoneBridge(c) {
    const th = THEME;
    const g = bridgeGeom();
    const { wTop, deckH, span, cx, rx, springY, crownY, ry } = g;

    // --- the whole face is one coursed stone wall with the arch cut out
    // of it; each block gets its own tone plus a top highlight / bottom
    // shadow so the wall has relief instead of reading as a flat slab ---
    const base = c.createLinearGradient(0, deckH, 0, wTop);
    base.addColorStop(0, th.wall[0]);
    base.addColorStop(0.55, th.wall[1]);
    base.addColorStop(1, th.wall[2]);
    c.fillStyle = base;
    c.fillRect(0, deckH, W, span);
    const rows = 9;
    const rowH = span / rows;
    const blockW = W * 0.115;
    for (let r = 0; r < rows; r++) {
      const y0 = deckH + rowH * r;
      const offset = r % 2 ? blockW * 0.5 : 0;
      for (let bx = -blockW + offset; bx < W; bx += blockW) {
        const bx0 = Math.max(0, bx), bx1 = Math.min(W, bx + blockW);
        if (bx1 - bx0 < 2) continue;
        const tone = hash2(Math.round(bx), r);
        c.fillStyle = tone > 0.5
          ? 'rgba(255,255,255,' + ((tone - 0.5) * 0.12).toFixed(3) + ')'
          : 'rgba(0,0,0,' + ((0.5 - tone) * 0.24).toFixed(3) + ')';
        c.fillRect(bx0, y0, bx1 - bx0, rowH);
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.fillRect(bx0, y0, bx1 - bx0, 1);
        c.fillStyle = 'rgba(0,0,0,0.42)';
        c.fillRect(bx0, y0 + rowH - 1.2, bx1 - bx0, 1.2);
        c.fillRect(bx1 - 1, y0, 1, rowH);
      }
    }
    // lighting on the wall: deepest shadow right under the deck, a cool
    // bounce off the water at its feet, a warm halo around the opening
    const top = c.createLinearGradient(0, deckH, 0, deckH + span * 0.45);
    top.addColorStop(0, 'rgba(0,0,0,0.5)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = top;
    c.fillRect(0, deckH, W, span * 0.45);
    const bounce = c.createLinearGradient(0, wTop - span * 0.3, 0, wTop);
    bounce.addColorStop(0, 'rgba(120,205,215,0)');
    bounce.addColorStop(1, th.bounce);
    c.fillStyle = bounce;
    c.fillRect(0, wTop - span * 0.3, W, span * 0.3);
    const warm = c.createRadialGradient(cx, springY, rx * 0.6, cx, springY, rx * 2.1);
    warm.addColorStop(0, th.wallWarm);
    warm.addColorStop(1, 'rgba(255,186,110,0)');
    c.fillStyle = warm;
    c.fillRect(0, deckH, W, span);
    const mossH = span * 0.18;
    const moss = c.createLinearGradient(0, wTop - mossH, 0, wTop);
    moss.addColorStop(0, th.moss[0]);
    moss.addColorStop(1, th.moss[1]);
    c.fillStyle = moss;
    c.fillRect(0, wTop - mossH, W, mossH);

    // --- the opening: sky, low sun, far bank, haze lying on the water ---
    c.save();
    archPath(c, g);
    c.clip();
    const sky = c.createLinearGradient(0, crownY, 0, wTop);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(0.5, th.sky[1]);
    sky.addColorStop(1, th.sky[2]);
    c.fillStyle = sky;
    c.fillRect(0, 0, W, wTop + 4);
    const sun = c.createRadialGradient(cx, crownY + ry * 0.6, 4, cx, crownY + ry * 0.6, rx * 0.8);
    sun.addColorStop(0, th.sun);
    sun.addColorStop(1, 'rgba(255,248,224,0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, W, wTop + 4);
    // far bank: a low, hazy strip that stops at the waterline so the sky
    // meets its own reflection cleanly instead of through a dark band
    c.fillStyle = th.farBank;
    c.beginPath();
    c.moveTo(cx - rx, wTop);
    for (let x = cx - rx; x <= cx + rx; x += 8) {
      const y = wTop - 1 - Math.abs(Math.sin(x * 0.011 + 0.8)) * 13 - Math.abs(Math.sin(x * 0.043 + 2)) * 4;
      c.lineTo(x, y);
    }
    c.lineTo(cx + rx, wTop);
    c.closePath();
    c.fill();
    const haze = c.createLinearGradient(0, wTop - ry * 0.5, 0, wTop);
    haze.addColorStop(0, 'rgba(255,236,200,0)');
    haze.addColorStop(1, th.haze);
    c.fillStyle = haze;
    c.fillRect(0, wTop - ry, W, ry + 4);
    c.restore();

    // --- arch ring: a band of voussoirs framing the opening. Backlit, so
    // the stone reads dark and only its inner edge catches the sky ---
    const ringW = Math.max(14, W * 0.055);
    c.save();
    archPath(c, g, -ringW * 0.5, true);
    c.lineWidth = ringW;
    c.strokeStyle = th.ring;
    c.stroke();
    c.lineWidth = 1.2;
    const joint = (ix, iy, ox, oy) => {
      c.strokeStyle = 'rgba(0,0,0,0.45)';
      c.beginPath(); c.moveTo(ix, iy); c.lineTo(ox, oy); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.beginPath(); c.moveTo(ix + 1.5, iy); c.lineTo(ox + 1.5, oy); c.stroke();
    };
    const arcJoints = 13;
    for (let i = 0; i <= arcJoints; i++) {
      const a = Math.PI + (Math.PI * i) / arcJoints;
      joint(cx + rx * Math.cos(a), springY + ry * Math.sin(a),
        cx + (rx + ringW) * Math.cos(a), springY + (ry + ringW) * Math.sin(a));
    }
    for (let y = springY + ringW * 1.1; y < wTop; y += ringW * 1.1) {
      joint(cx - rx, y, cx - rx - ringW, y);
      joint(cx + rx, y, cx + rx + ringW, y);
    }
    // keystone, a touch lighter than its neighbours
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.beginPath();
    const ka = Math.PI * 1.5, kd = 0.12;
    c.moveTo(cx + rx * Math.cos(ka - kd), springY + ry * Math.sin(ka - kd));
    c.lineTo(cx + rx * Math.cos(ka + kd), springY + ry * Math.sin(ka + kd));
    c.lineTo(cx + (rx + ringW) * Math.cos(ka + kd * 1.3), springY + (ry + ringW) * Math.sin(ka + kd * 1.3));
    c.lineTo(cx + (rx + ringW) * Math.cos(ka - kd * 1.3), springY + (ry + ringW) * Math.sin(ka - kd * 1.3));
    c.closePath();
    c.fill();
    // outer edge sinks into the vault; inner edge glows with the sky
    archPath(c, g, -ringW - 1, true);
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.stroke();
    archPath(c, g, 1, true);
    c.lineWidth = 2.2;
    c.strokeStyle = th.ringRim;
    c.stroke();
    c.restore();

    // --- deck beam along the top (mostly tucked under the status bar) ---
    c.fillStyle = th.beam;
    c.fillRect(0, 0, W, deckH);
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(0, deckH - 2, W, 2);

    // --- shadow the bridge throws on the water, except right under the
    // opening where the light comes straight through ---
    const shadowH = span * 0.5;
    const sh = c.createLinearGradient(0, wTop, 0, wTop + shadowH);
    sh.addColorStop(0, th.bridgeShadow);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.fillRect(0, wTop, W, shadowH);
    c.save();
    c.globalCompositeOperation = 'destination-out';
    const gap = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
    gap.addColorStop(0, 'rgba(0,0,0,0)');
    gap.addColorStop(0.3, 'rgba(0,0,0,1)');
    gap.addColorStop(0.7, 'rgba(0,0,0,1)');
    gap.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gap;
    c.fillRect(cx - rx, wTop, rx * 2, shadowH);
    c.restore();
  }

  function renderBridgeCache() {
    bridgeCache = document.createElement('canvas');
    bridgeCache.width = Math.max(1, Math.round(W * DPR));
    bridgeCache.height = Math.max(1, Math.round(H * DPR));
    const c = bridgeCache.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    applyZoom(c); // baked in, so the blit needs no scaling (stays crisp)
    drawStoneBridge(c);
  }

  function drawSunRays(t) {
    const theme = THEME;
    const wTop = waterTop();
    // Drawn before the bridge layer, so the shafts only ever show in the
    // water: they fan out from just under the arch, apex hidden behind it.
    const cx = W * 0.5, topY = wTop - 10;
    const rx = bridgeGeom().rx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rayCount = 7;
    for (let i = 0; i < rayCount; i++) {
      // Origins spread across the opening and only a slight fan, so they
      // read as parallel shafts of light entering the water rather than a
      // spotlight cone converging on one hot spot.
      const spread = (i - (rayCount - 1) / 2) / ((rayCount - 1) / 2);
      const angle = -Math.PI / 2 + spread * 0.08 + Math.sin(t * 0.15 + i) * 0.015;
      const len = H * 0.8;
      const w = 22 + Math.sin(t * 0.3 + i * 2) * 7;
      ctx.save();
      ctx.translate(cx + spread * rx * 0.75, topY);
      ctx.rotate(angle + Math.PI / 2);
      // Stacked translucent strips of shrinking width: their overlap makes
      // each shaft brightest along its centre and soft at the edges, no
      // canvas blur filter needed (not supported everywhere).
      for (let k = 0; k < 4; k++) {
        const f = 1 - k * 0.22;
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, theme.rayColor + '0.022)');
        g.addColorStop(1, theme.rayColor + '0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-w * f / 2, 0); ctx.lineTo(w * f / 2, 0); ctx.lineTo(w * 1.6 * f, len); ctx.lineTo(-w * 1.6 * f, len);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWater(t) {
    const theme = THEME;
    const top = waterTop();
    const pierW = pierWidth();
    const grad = ctx.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, theme.water[0]);
    grad.addColorStop(0.18, theme.water[1]);
    grad.addColorStop(0.55, theme.water[2]);
    grad.addColorStop(1, theme.water[3]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, W, H - top);

    // mirror of the bright opening: a warm column right under the arch,
    // narrowing with depth, its edges wobbling with the surface
    const g = bridgeGeom();
    const reflH = (H - top) * 0.55;
    const rxr = g.rx * 0.85;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(g.cx - rxr, top);
    for (let y = top; y <= top + reflH; y += 5) {
      const k = (y - top) / reflH;
      ctx.lineTo(g.cx - rxr * (1 - k * 0.35) + Math.sin(y * 0.09 + t * 1.3) * (3 + 7 * k), y);
    }
    for (let y = top + reflH; y >= top; y -= 5) {
      const k = (y - top) / reflH;
      ctx.lineTo(g.cx + rxr * (1 - k * 0.35) + Math.sin(y * 0.1 + t * 1.1 + 2) * (3 + 7 * k), y);
    }
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, top, 0, top + reflH);
    rg.addColorStop(0, theme.openingReflect + '0.24)');
    rg.addColorStop(0.35, theme.openingReflect + '0.1)');
    rg.addColorStop(1, theme.openingReflect + '0)');
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();

    // reflections of the two piers, distorted by the waterline
    if (pierW) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = theme.pierReflect;
      [[0, pierW], [W - pierW, W]].forEach(([x0, x1]) => {
        ctx.beginPath();
        ctx.moveTo(x0, top);
        for (let y = top; y <= top + 90; y += 4) {
          const wob = Math.sin(y * 0.14 + t * 1.5) * 3;
          ctx.lineTo(x0 + wob, y);
        }
        for (let y = top + 90; y >= top; y -= 4) {
          const wob = Math.sin(y * 0.14 + t * 1.5) * 3;
          ctx.lineTo(x1 + wob, y);
        }
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    // wave lines
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let layer = 0; layer < 4; layer++) {
      ctx.beginPath();
      const baseY = top + (H - top) * (0.15 + layer * 0.22);
      const amp = 6 + layer * 2;
      const freq = 0.008 - layer * 0.001;
      const speed = 0.6 + layer * 0.25;
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= W; x += 12) {
        const y = baseY + Math.sin(x * freq + t * speed + layer) * amp;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = layer % 2 === 0 ? theme.waveA : theme.waveB;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.restore();

    // sunlit glow patch on water
    const cx = W * 0.5, cy = top + 10;
    const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, W * 0.28);
    glow.addColorStop(0, theme.sunGlow);
    glow.addColorStop(1, theme.sunGlow.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = glow;
    ctx.fillRect(0, top, W, (H - top) * 0.6);

    // bright waterline where the piers meet the surface
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = theme.waterline;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.lineTo(W, top + 1); ctx.stroke();
    ctx.restore();
  }

  function drawSparkles(t) {
    const theme = THEME;
    ctx.save();
    const top = waterTop();
    sparkles.forEach(s => {
      const px = s.x * W;
      const py = top + s.y * (H - top);
      const distFromCenter = Math.abs(px - W * 0.5) / (W * 0.5);
      const baseAlpha = Math.max(0, 0.9 - distFromCenter * 1.1);
      const flick = (Math.sin(t * s.speed + s.phase) + 1) / 2;
      ctx.globalAlpha = baseAlpha * flick * 0.85;
      ctx.fillStyle = theme.sparkle;
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawIdleFish(t) {
    idleFish.forEach(f => {
      const top = waterTop();
      const px = f.x * W;
      const py = top + f.y * (H - top) + Math.sin(t * 2 + f.bob) * 6;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(f.dir * f.scale, f.scale);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#04262c';
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
    drawWater(t);
    drawSunRays(t);
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
    drawWater(t);
    drawSunRays(t);
    ctx.restore();
    if (!bridgeCache) renderBridgeCache();
    ctx.drawImage(bridgeCache, 0, 0, W, H);
    ctx.save();
    applyZoom(ctx);
    drawSparkles(t);
    maybeSpawnIdleFish(t);
    drawIdleFish(t);
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
  const SAVE_SCHEMA_VERSION = 6;
  function defaultSave() {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      shells: 0, rod: { grade: 'common', level: 1 }, gems: 0,
      stats: { strength: 0, luck: 0, precision: 0 },
      caughtFish: [], nextFishUid: 1, catches: {}, hasCastBefore: false,
      hasReeledBefore: false,
      baits: { rare: 0, epic: 0, legendary: 0 }, equippedBait: 'common',
      gachaPity: 0
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
    }
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
        catches, hasCastBefore, hasReeledBefore, baits, equippedBait, gachaPity
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
  let nextFishUid = initialSave.nextFishUid;
  // Per-species log for 보관함's 도감 tab -- { [speciesId]: { count, best } }.
  // Kept independent of caughtFish, which only holds still-unsold catches
  // and loses the record the moment a fish is sold.
  let catches = initialSave.catches;
  // Held bait counts by tier -- { rare, epic, legendary }. 일반 is the free
  // default and isn't tracked here (never runs out).
  let baits = initialSave.baits;
  // Currently equipped bait tier -- filters the catch pool in triggerBite()
  // and gets consumed by 1 per cast() (see there). Falls back to 'common'
  // automatically once its count hits 0.
  let equippedBait = initialSave.equippedBait;
  // Pulls since the last legendary (natural or pity-forced) -- see
  // FishData.LEGENDARY_PITY / pullGachaWithPity().
  let gachaPity = initialSave.gachaPity;
  // Gates the first-cast onboarding hint (#tutorial-hint) -- flips true and
  // stays true forever once the player's very first cast() actually fires.
  let hasCastBefore = initialSave.hasCastBefore;
  // Same idea, for the first-reel hint (#reel-tutorial-hint) -- flips true
  // the moment startReel() first runs, independent of hasCastBefore since a
  // rod outgrowing 꽝/일반 (see resolveSkippedCatch()) can let several
  // casts go by before the player ever actually reaches reeling.
  let hasReeledBefore = initialSave.hasReeledBefore;
  // Set in catchSuccess() when a grade-up material drops, consumed by
  // closeResult() right after the catch result popup closes.
  let pendingMaterial = null;

  const shellsCountEl = document.getElementById('shells-count');
  const gemsCountTopEl = document.getElementById('gems-count-top');
  const statusTextEl = document.getElementById('status-text');
  const tutorialHintEl = document.getElementById('tutorial-hint');
  const reelTutorialHintEl = document.getElementById('reel-tutorial-hint');
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

  const gachaPull1Btn = document.getElementById('gacha-pull1-btn');
  const gachaPull10Btn = document.getElementById('gacha-pull10-btn');

  const gachaOverlay = document.getElementById('gacha-overlay');
  const gachaRevealPanel = document.getElementById('gacha-reveal-panel');
  const gachaFlashEl = document.getElementById('gacha-flash');
  const gachaCardGridEl = document.getElementById('gacha-card-grid');
  const gachaActionBtn = document.getElementById('gacha-action-btn');

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

  // Rod grade raises maxMisses (more forgiving); rod level only widens the
  // hit zone -- time limit is no longer rod-affected, but 근력 (a separate
  // player stat) still lengthens it. Hit tolerance isn't tier/rod-based at
  // all anymore -- see hitToleranceForPeriod() above, keyed off the reel's
  // actual current speed instead. Everything else here is folded into the
  // tier's base reel params so startReel()/attemptHit() just consume one
  // effective set without knowing about the rod or player stats at all.
  const MAX_MISSES_CAP = 5;
  function getEffectiveReel(tier) {
    const base = FishData.TIERS[tier].reel;
    const ease = FishData.rodEase(rod.level);
    const missBonus = FishData.rodMissBonus(rod.grade);
    const strengthBonus = stats.strength * FishData.PLAYER_STATS.strength.effectPerLevel;
    return {
      hitsRequired: base.hitsRequired,
      zoneHeight: base.zoneHeight * (1 + ease),
      timeLimit: base.timeLimit * (1 + strengthBonus),
      maxMisses: Math.min(MAX_MISSES_CAP, base.maxMisses + missBonus)
    };
  }

  // 정밀함 stat: slows the casting bar's sweep down (a bigger period is a
  // slower, easier-to-time sweep) -- applied on top of whichever tier the
  // rarity climb is currently displaying, same as the tier-color-driven
  // speed itself.
  function effectivePeriod(tierKey) {
    const precisionBonus = stats.precision * FishData.PLAYER_STATS.precision.effectPerLevel;
    return FishData.TIERS[tierKey].reel.period * (1 + precisionBonus);
  }

  function showStatus(text, iconSrc) {
    statusTextEl.innerHTML = iconSrc
      ? `<img class="status-icon" src="${iconSrc}" alt="">${text}`
      : text;
    statusTextEl.classList.remove('hidden');
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
    if (!hasCastBefore) {
      hasCastBefore = true;
      tutorialHintEl.classList.add('hidden');
      persist();
    }
    sfx.cast();
    bobber = { x, y };
    state = 'waiting';
    bobberState = 'waiting';
    showStatus('입질을 기다리는 중...');
    const delay = 1600 + Math.random() * 2600;
    waitingTimer = setTimeout(triggerBite, delay);
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
    const forcedFirstCatch = hasReeledBefore ? null : 'rare';
    const baitExclude = FishData.baitExcludeTiers(equippedBait);
    currentCatch = FishData.pickCatch(devForceTier || forcedFirstCatch, baitExclude, stats.luck);
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
    if (equippedBait !== 'common') {
      baits[equippedBait] = Math.max(0, (baits[equippedBait] || 0) - 1);
      if (baits[equippedBait] <= 0) equippedBait = 'common';
      persist();
    }
    sfx.bite();
    Platform.haptic('basicMedium');
    showStatus('입질이 왔어요!', 'icons/result/bite.svg');
    const shouldSkipReel = skipLowTier && SKIP_TIERS_BY_GRADE[rod.grade].includes(currentCatch.tier);
    biteTimer = setTimeout(shouldSkipReel ? resolveSkippedCatch : startReel, 500);
  }

  // Reeling minigame skipped entirely -- 캐스팅/입질까지는 정상 진행되지만,
  // 이미 졸업한 낮은 등급은 여기서 바로 성공 처리된다. catchSuccess() doesn't
  // touch `reel` at all (only currentCatch), so it's safe to call directly
  // without ever having started the minigame.
  function resolveSkippedCatch() {
    if (state !== 'bite') return;
    hideStatus();
    catchSuccess();
  }

  function hideReelTutorial() {
    reelTutorialHintEl.classList.add('hidden');
    gaugeTrackEl.classList.remove('tutorial-glow');
    gaugeZoneEl.classList.remove('tutorial-glow');
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
      reelTutorialHintEl.classList.remove('hidden');
      gaugeTrackEl.classList.add('tutorial-glow');
      gaugeZoneEl.classList.add('tutorial-glow');
    }
    const f = getEffectiveReel(currentCatch.tier);
    // Hit count is random per catch: HITS_BASE_BY_TIER's floor, plus 0~1.
    const hitsRequired = HITS_BASE_BY_TIER[currentCatch.tier] + Math.floor(Math.random() * 2);
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
      colorSeq
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
    if (state === 'reeling' && reel) {
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
    const now = performance.now() / 1000;
    const elapsed = now - reel.startT;
    return indicatorPercent(elapsed, reel.period, reel.fromBottom);
  }

  function attemptHit() {
    if (state !== 'reeling' || !reel) return;
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
    hideReelTutorial();
    const c = currentCatch;
    const icon = c.tier === 'junk' ? FishData.junkIconPath(c.id) : FishData.speciesIconPath(c.tier, c.id);
    const title = c.tier === 'junk' ? `${c.name}...` : `${c.name}를 낚았어요!`;
    let desc;
    let isNewSpecies = false;
    if (c.tier === 'junk') {
      desc = c.desc;
    } else {
      // Checked before recordCatch() creates/updates the entry.
      isNewSpecies = !catches[c.id];
      // Not sold yet -- it goes to the bucket and gets sold from the
      // shop's 판매 tab, so this price is a preview, not income.
      caughtFish.push({ uid: nextFishUid++, id: c.id, name: c.name, tier: c.tier, size: c.size, price: c.price, desc: c.desc });
      recordCatch(c);
      pendingMaterial = rollGem();
      persist();
      desc = `${c.desc} (${c.size}cm · 판매가 <img class="price-icon" src="icons/ui/shell.svg" alt="">${c.price.toLocaleString('ko-KR')})`;
    }
    showResult(true, title, desc, icon, c.tier, isNewSpecies);
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
    hideReelTutorial();
    showResult(false, '놓쳤어요...', '다음엔 타이밍을 맞춰보세요.', 'icons/result/miss.svg');
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
    if (key !== 'common' && (baits[key] || 0) <= 0) return;
    equippedBait = key;
    persist();
    updateBaitButton();
  }

  function updateBaitButton() {
    baitBtnIcon.src = `icons/ui/bait-${equippedBait}.svg`;
    baitBtn.classList.toggle('legendary-equipped', equippedBait === 'legendary');
    const heldCount = equippedBait === 'common' ? 0 : (baits[equippedBait] || 0);
    baitBtnBadge.textContent = heldCount;
    baitBtnBadge.classList.toggle('hidden', equippedBait === 'common');
    baitMenuItems.forEach(item => {
      const key = item.dataset.bait;
      item.classList.toggle('active', key === equippedBait);
      if (key === 'common') return;
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
    gachaPull1Btn.disabled = shells < FishData.GACHA_PULL_COST;
    gachaPull10Btn.disabled = shells < FishData.GACHA_TEN_PULL_COST;
  }

  // Card grid order is always worst -> best regardless of roll order, so
  // the best pull in the batch sits in the last slot -- the "dopamine"
  // payoff beat lands wherever the player's eye ends up scanning to.
  const GACHA_REVEAL_ORDER = ['common', 'rare', 'epic', 'legendary'];

  function runGacha(kind) {
    const isTen = kind === 'ten';
    const cost = isTen ? FishData.GACHA_TEN_PULL_COST : FishData.GACHA_PULL_COST;
    if (shells < cost) return;
    // Casting is the only other place this fires -- a player who opens the
    // shop and pulls before ever casting a line would otherwise get total
    // silence, since every blip() is a no-op until the AudioContext exists.
    ensureAudio();
    sfx.coin();
    shells -= cost;
    const pulled = isTen
      ? FishData.pullGachaTen(gachaPity)
      : FishData.pullGachaWithPity(1, gachaPity);
    const results = pulled.results;
    gachaPity = pulled.pity;
    // 일반 결과는 이미 무한정 사용 가능한 기본 미끼라 인벤토리에 쌓지 않음 --
    // 카드 연출에서는 그대로 보여주되 보유 개수만 늘지 않는다.
    results.forEach(key => { if (key !== 'common') baits[key] = (baits[key] || 0) + 1; });
    persist();
    updateCurrencyDisplay();
    renderGachaTab();
    updateBaitButton();
    const sorted = results.slice().sort((a, b) => GACHA_REVEAL_ORDER.indexOf(a) - GACHA_REVEAL_ORDER.indexOf(b));
    openGachaReveal(sorted);
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

    function closeReveal() { gachaOverlay.classList.add('hidden'); }

    function updateActionButton() {
      const allRevealed = cards.every((card) => card.classList.contains('revealed'));
      if (!allRevealed) return;
      gachaActionBtn.textContent = '닫기';
      gachaActionBtn.classList.remove('gacha-secondary-btn');
      gachaActionBtn.onclick = closeReveal;
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
      const bait = FishData.BAITS[tier];
      const card = document.createElement('div');
      card.className = 'gacha-card';
      card.innerHTML = `
        <div class="gacha-card-inner">
          <div class="gacha-card-face gacha-card-back">?</div>
          <div class="gacha-card-face gacha-card-front tier-${tier}">
            <img src="icons/ui/bait-${tier}.svg" alt="">
            <span>${bait.label}</span>
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
    switchShopTab('gacha');
    shopOverlay.classList.remove('hidden');
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
    shells += caughtFish[idx].price;
    caughtFish.splice(idx, 1);
    persist();
    updateCurrencyDisplay();
    renderSellList();
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
      row.innerHTML = `
        <div class="upgrade-stat-info">
          <div class="upgrade-stat-name">${def.label}</div>
          <div class="upgrade-stat-desc">${def.desc}</div>
          <div id="${pipsId}" class="pip-row"></div>
        </div>
        <button class="upgrade-btn" data-stat-btn="${key}"></button>
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
  });

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

  function renderLog() {
    logListEl.innerHTML = '';
    LOG_TIER_ORDER.forEach(tier => {
      const species = FishData.FISH_BY_TIER[tier];
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
    const sp = (FishData.FISH_BY_TIER[tier] || []).find(s => s.id === speciesId);
    if (!record || !sp) return;
    const tierInfo = FishData.TIERS[tier];
    speciesDetailIcon.src = FishData.speciesIconPath(tier, speciesId);
    speciesDetailTierBadge.textContent = tierInfo.label;
    speciesDetailTierBadge.className = `tier-badge tier-${tier}`;
    speciesDetailName.textContent = sp.name;
    speciesDetailDesc.textContent = sp.desc;
    speciesDetailStats.innerHTML = `
      <div class="species-detail-row"><span>크기</span><span>${sp.sizeRange[0]}~${sp.sizeRange[1]}cm</span></div>
      <div class="species-detail-row"><span>판매가</span><span><img class="price-icon" src="icons/ui/shell.svg" alt="">${tierInfo.priceMin.toLocaleString('ko-KR')}~${tierInfo.priceMax.toLocaleString('ko-KR')}</span></div>
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
    sfxOnCheck.checked = sfxOn;
    bgmOnCheck.checked = bgmOn;
    sfxOnCheck.parentElement.classList.toggle('muted', !sfxOn);
    bgmOnCheck.parentElement.classList.toggle('muted', !bgmOn);
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
    if (!FishData.BAITS[tierKey] || tierKey === 'common') return;
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
  window.__zzhDevGiveGems = function (amount) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    gems += amount || 10;
    persist();
    updateCurrencyDisplay();
    if (!shopOverlay.classList.contains('hidden')) renderUpgradeTab();
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
  window.__zzhDevUnlockAllSpecies = function () {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    Object.keys(FishData.FISH_BY_TIER).forEach((tierKey) => {
      FishData.FISH_BY_TIER[tierKey].forEach((sp) => {
        if (catches[sp.id]) return;
        const history = [1, 2, 3].map(() => FishData.randSize(sp.sizeRange)).sort((a, b) => a - b);
        catches[sp.id] = { count: history.length, best: history[history.length - 1], history };
      });
    });
    persist();
    if (!bucketOverlay.classList.contains('hidden')) renderLog();
  };

  updateCurrencyDisplay();
  updateBaitButton();
  if (!hasCastBefore) tutorialHintEl.classList.remove('hidden');

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
  const dismissTitle = () => {
    if (!gameEl.classList.contains('title-up')) return;
    gameEl.classList.remove('title-up');
    titleOverlay.classList.add('fading');
    setTimeout(() => titleOverlay.classList.add('hidden'), 600);
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((evt) => {
    document.addEventListener(evt, dismissTitle, { once: true, passive: true });
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
