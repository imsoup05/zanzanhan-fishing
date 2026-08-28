function __zzhInit() {
  'use strict';

  // ================= Audio (WebAudio, no assets) =================
  let actx = null;
  function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }
  // sfxVolume (set up in the settings section below) is a 0~1 master
  // multiplier from the volume knob. exponentialRampToValueAtTime throws if
  // it ever ramps from exactly 0, hence the floor -- not audible at that level.
  let sfxVolume = 0.8;
  function blip(freq, dur, type, vol) {
    if (!actx) return;
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
    cast: () => blip(220, 0.18, 'sine', 0.12),
    bite: () => { blip(500, 0.1, 'triangle', 0.15); setTimeout(() => blip(650, 0.12, 'triangle', 0.12), 90); },
    hit: () => blip(700, 0.09, 'sine', 0.14),
    miss: () => blip(120, 0.2, 'square', 0.12),
    success: () => { blip(523, 0.12, 'sine', 0.15); setTimeout(() => blip(659, 0.12, 'sine', 0.15), 110); setTimeout(() => blip(784, 0.18, 'sine', 0.16), 220); },
    fail: () => { blip(300, 0.15, 'sawtooth', 0.12); setTimeout(() => blip(200, 0.25, 'sawtooth', 0.12), 130); },
    splash: () => { blip(90, 0.22, 'sine', 0.2); blip(180, 0.15, 'triangle', 0.1); },
    coin: () => { blip(880, 0.08, 'square', 0.1); setTimeout(() => blip(1180, 0.1, 'square', 0.1), 70); },
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

  // ================= Canvas background =================
  const gameEl = document.getElementById('game');
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

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
    underside: '#2a2624',
    archSky: ['#bfe3f0', '#ffe6ae', '#ffd98a'],
    archGlow: 'rgba(255,244,214,0.65)',
    farBank: 'rgba(35,64,50,0.4)',
    archEdge: 'rgba(255,235,190,0.35)',
    pier: ['#57524c', '#3a3531', '#262320'],
    moss: ['rgba(35,58,32,0)', 'rgba(28,48,26,0.6)'],
    deckCap: '#423d38',
    bridgeShadow: 'rgba(0,0,0,0.4)',
    rayColor: 'rgba(255,238,190,',
    water: ['#bfe9dc', '#6cc0c2', '#2f8f9c', '#0f4b5c'],
    pierReflect: '#0a2a30',
    waveA: '#eaffef', waveB: '#0a3a44',
    sunGlow: 'rgba(255,246,214,0.22)',
    waterline: '#eafffb',
    sparkle: '#fffbe8'
  };

  function drawStoneBridge(t) {
    const theme = THEME;
    const wTop = waterTop();
    const deckH = Math.max(24, H * 0.045);
    const pierW = pierWidth();

    // --- underside of the bridge: solid stone slab ---
    ctx.fillStyle = theme.underside;
    ctx.fillRect(0, deckH, W, wTop - deckH);

    // --- arch opening: sky and warm light beyond ---
    const cx = W * 0.5, cy = wTop;
    const rx = W * 0.5 - pierW, ry = (wTop - deckH) * 1.25;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.42, rx, ry, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.clip();
    const skyGrad = ctx.createLinearGradient(0, deckH, 0, wTop);
    skyGrad.addColorStop(0, theme.archSky[0]);
    skyGrad.addColorStop(0.5, theme.archSky[1]);
    skyGrad.addColorStop(1, theme.archSky[2]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, wTop);
    const glow = ctx.createRadialGradient(cx, cy - ry * 0.15, 5, cx, cy - ry * 0.15, rx);
    glow.addColorStop(0, theme.archGlow);
    glow.addColorStop(1, theme.archGlow.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, wTop);
    // faint far riverbank hinted right at the waterline inside the opening
    ctx.fillStyle = theme.farBank;
    ctx.beginPath();
    ctx.moveTo(cx - rx, wTop);
    for (let x = cx - rx; x <= cx + rx; x += 18) {
      const y = wTop - 3 - Math.abs(Math.sin(x * 0.025 + 2)) * 9;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + rx, wTop);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // keystone/arch-edge highlight tracing the curve
    ctx.save();
    ctx.strokeStyle = theme.archEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.42, rx, ry, 0, Math.PI, 0, false);
    ctx.stroke();
    ctx.restore();

    // --- stone piers left & right, with block coursing + moss base ---
    function drawPier(x0, x1) {
      const pierGrad = ctx.createLinearGradient(0, deckH, 0, wTop);
      pierGrad.addColorStop(0, theme.pier[0]);
      pierGrad.addColorStop(0.75, theme.pier[1]);
      pierGrad.addColorStop(1, theme.pier[2]);
      ctx.fillStyle = pierGrad;
      ctx.fillRect(x0, deckH, x1 - x0, wTop - deckH);

      ctx.strokeStyle = 'rgba(0,0,0,0.32)';
      ctx.lineWidth = 1;
      const rows = 7;
      const rowH = (wTop - deckH) / rows;
      for (let r = 0; r <= rows; r++) {
        const y = deckH + rowH * r;
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      }
      for (let r = 0; r < rows; r++) {
        const y0 = deckH + rowH * r, y1 = y0 + rowH;
        const offset = (r % 2 === 0) ? 0 : (x1 - x0) / 4;
        for (let px = x0 + offset; px < x1; px += (x1 - x0) / 2) {
          ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y1); ctx.stroke();
        }
      }
      // moss / waterline stain
      const mossH = (wTop - deckH) * 0.16;
      const mossGrad = ctx.createLinearGradient(0, wTop - mossH, 0, wTop);
      mossGrad.addColorStop(0, theme.moss[0]);
      mossGrad.addColorStop(1, theme.moss[1]);
      ctx.fillStyle = mossGrad;
      ctx.fillRect(x0, wTop - mossH, x1 - x0, mossH);
    }
    drawPier(0, pierW);
    drawPier(W - pierW, W);

    // --- road deck cap at the very top, with guardrail balusters ---
    ctx.fillStyle = theme.deckCap;
    ctx.fillRect(0, 0, W, deckH);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, deckH - 2, W, 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let x = 6; x < W; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, deckH * 0.4);
      ctx.lineTo(x, deckH - 3);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.moveTo(0, deckH * 0.4); ctx.lineTo(W, deckH * 0.4); ctx.stroke();

    // shadow the bridge casts onto the water
    const edgeGrad = ctx.createLinearGradient(0, wTop - 6, 0, wTop + 44);
    edgeGrad.addColorStop(0, theme.bridgeShadow);
    edgeGrad.addColorStop(1, theme.bridgeShadow.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, wTop - 6, W, 50);
  }

  function drawSunRays(t) {
    const theme = THEME;
    const wTop = waterTop();
    const cx = W * 0.5, topY = wTop * 0.55;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rayCount = 7;
    for (let i = 0; i < rayCount; i++) {
      const angle = -Math.PI / 2 + (i - (rayCount - 1) / 2) * 0.1 + Math.sin(t * 0.15 + i) * 0.015;
      const len = H * 0.8;
      const w = 26 + Math.sin(t * 0.3 + i * 2) * 8;
      ctx.save();
      ctx.translate(cx, topY);
      ctx.rotate(angle + Math.PI / 2);
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, theme.rayColor + '0.08)');
      g.addColorStop(1, theme.rayColor + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.lineTo(w * 2, len); ctx.lineTo(-w * 2, len);
      ctx.closePath(); ctx.fill();
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

    // reflections of the two piers, distorted by the waterline
    if (pierW) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = theme.pierReflect;
      [[0, pierW], [W - pierW, W]].forEach(([x0, x1]) => {
        ctx.beginPath();
        ctx.moveTo(x0, top);
        for (let y = top; y <= top + 70; y += 8) {
          const wob = Math.sin(y * 0.2 + t * 1.5) * 4;
          ctx.lineTo(x0 + wob, y);
        }
        for (let y = top + 70; y >= top; y -= 8) {
          const wob = Math.sin(y * 0.2 + t * 1.5) * 4;
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
    const waterLineY = bodyTopY + bodyH * submergeFrac;
    // ripples are a water-surface phenomenon: anchor them to the resting
    // surface level only, independent of the float's bob/dip/tug motion
    const rippleY = byBase - bodyH * 0.5 + bodyH * submergeFrac;

    // line from the rod (off-screen above) down to the float
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, by); ctx.stroke();

    // ambient ripple ring
    const ringPhase = (t * 0.8) % 1;
    ctx.save();
    ctx.globalAlpha = 1 - ringPhase;
    ctx.strokeStyle = '#eafffb';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(bx, rippleY, 16 + ringPhase * 38, 5 + ringPhase * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // extra burst ripple on a perfect hit
    if (bobberState === 'reeling' && tug >= 0 && tug < 0.5) {
      const p = tug / 0.5;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(bx, rippleY, 12 + p * 52, 4 + p * 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // antenna: dark rod with a bright orange tip and a small bead
    ctx.strokeStyle = '#3a2a20';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(bx, bodyTopY); ctx.lineTo(bx, antennaTopY); ctx.stroke();
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(bx, antennaTopY + antennaLen * 0.5); ctx.lineTo(bx, antennaTopY); ctx.stroke();
    ctx.fillStyle = '#ffcf4d';
    ctx.beginPath(); ctx.arc(bx, antennaTopY, 2.6, 0, Math.PI * 2); ctx.fill();

    // body: torpedo float, orange upper half / cream lower half
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, by, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f4f1e6';
    ctx.fillRect(bx - bodyW, by - bodyH, bodyW * 2, bodyH * 2);
    ctx.fillStyle = '#e6472f';
    ctx.fillRect(bx - bodyW, by - bodyH, bodyW * 2, bodyH * 0.62);

    // submerged portion: tint + soften with the water color so it reads as
    // underwater rather than just sitting on top of the surface
    ctx.fillStyle = 'rgba(28,110,120,0.4)';
    ctx.fillRect(bx - bodyW, waterLineY, bodyW * 2, bodyH);
    ctx.fillStyle = 'rgba(15,75,90,0.28)';
    ctx.fillRect(bx - bodyW, waterLineY + bodyH * 0.25, bodyW * 2, bodyH);
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

    // bright waterline where the float pierces the surface (meniscus)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bx, by, bodyW * 0.5, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - bodyW * 0.6, waterLineY);
    ctx.quadraticCurveTo(bx, waterLineY + 2.5, bx + bodyW * 0.6, waterLineY);
    ctx.stroke();
    ctx.restore();
  }

  const ZOOM = 1.18;
  function renderLoop(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    const anchorX = W * 0.5, anchorY = H * 0.24;
    ctx.translate(anchorX, anchorY);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-anchorX, -anchorY);
    drawWater(t);
    drawStoneBridge(t);
    drawSunRays(t);
    drawSparkles(t);
    maybeSpawnIdleFish(t);
    drawIdleFish(t);
    drawBobber(t);
    ctx.restore();
    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  // ================= Fishing loop (no species/tiers yet -- one test fish
  // just to prove the cast -> bite -> reel -> result loop works end to end) =================
  const TAP_ZONE_TOP_FRAC = 0.38;    // matches .reel-gauge's `top` in style.css
  const TAP_ZONE_BOTTOM_FRAC = 0.82; // matches .reel-gauge's `top + height`

  // Real species/tier data lives in fish-data.js (loaded before this file)
  // as window.FishData -- FishData.DUMMY_TEST_FISH is kept only as an
  // unused reference now that the live loop picks from FishData.pickCatch().
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
  const SAVE_SCHEMA_VERSION = 3;
  function defaultSave() {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      shells: 0, rod: { grade: 'common', level: 1 }, materials: {},
      stats: { strength: 0, luck: 0, precision: 0 },
      caughtFish: [], nextFishUid: 1, catches: {}, hasCastBefore: false,
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
      const raw = localStorage.getItem(SAVE_KEY);
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
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        schemaVersion: SAVE_SCHEMA_VERSION, shells, rod, materials, stats, caughtFish, nextFishUid, catches, hasCastBefore,
        baits, equippedBait, gachaPity
      }));
    } catch (e) { /* ignore */ }
  }

  const initialSave = loadSave();
  let shells = initialSave.shells;
  let rod = initialSave.rod;
  // Rod grade-up materials held -- { [targetGradeKey]: count }, e.g.
  // materials.rare counts toward upgrading a 일반 rod into a 희귀 one.
  let materials = initialSave.materials;
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
  // Set in catchSuccess() when a grade-up material drops, consumed by
  // closeResult() right after the catch result popup closes.
  let pendingMaterial = null;

  const shellsCountEl = document.getElementById('shells-count');
  const statusTextEl = document.getElementById('status-text');
  const tutorialHintEl = document.getElementById('tutorial-hint');
  const reelGaugeEl = document.getElementById('reel-gauge');
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

  const menuSettingsBtn = document.getElementById('menu-settings-btn');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const leftyToggleBtn = document.getElementById('lefty-toggle');
  const skipLowTierToggleBtn = document.getElementById('skip-lowtier-toggle');
  const volumeSliderEl = document.getElementById('volume-slider');
  const resetDataBtn = document.getElementById('reset-data-btn');
  const resetConfirmOverlay = document.getElementById('reset-confirm-overlay');
  const resetConfirmBtn = document.getElementById('reset-confirm-btn');
  const resetCancelBtn = document.getElementById('reset-cancel-btn');

  function updateShellsDisplay() { shellsCountEl.textContent = shells.toLocaleString('ko-KR'); }

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

  // A rod that's outgrown a tier skips ever rolling it again -- 희귀 rod
  // skips 꽝, 특급 rod skips 꽝 AND 일반. Toggleable in 설정 (see skipLowTier
  // below); when off, the pool is never filtered regardless of rod grade.
  const SKIP_TIERS_BY_GRADE = { common: [], rare: ['junk'], epic: ['junk', 'common'] };

  function triggerBite() {
    if (state !== 'waiting') return;
    state = 'bite';
    bobberState = 'bite';
    bobberDipT = performance.now() / 1000;
    // Tier is chosen now but no longer announced up front -- the hit
    // counter's rarity climb is the only reveal during casting/reeling.
    // devForceTier (set only by the gitignored dev-mode.js panel) overrides
    // the random pick for one catch, then clears itself. Rod's low-tier
    // skip and the equipped bait's own floor both just exclude tiers --
    // pickCatch renormalizes over whatever's left, so a union of the two
    // exclusion lists is all that's needed here.
    const rodExclude = skipLowTier ? SKIP_TIERS_BY_GRADE[rod.grade] : [];
    const baitExclude = FishData.baitExcludeTiers(equippedBait);
    const excludeTiers = [...new Set([...rodExclude, ...baitExclude])];
    currentCatch = FishData.pickCatch(devForceTier, excludeTiers, stats.luck);
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
    showStatus('입질이 왔어요!', 'icons/result/bite.svg');
    biteTimer = setTimeout(startReel, 500);
  }

  function startReel() {
    if (state !== 'bite') return;
    hideStatus();
    state = 'reeling';
    bobberState = 'reeling';
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
  // this survives selling (it's never removed, only added to).
  function recordCatch(c) {
    const rec = catches[c.id] || (catches[c.id] = { count: 0, best: 0 });
    rec.count++;
    if (c.size > rec.best) rec.best = c.size;
  }

  // Rolled once per non-junk catch. Drop chance scales with rod LEVEL (see
  // FishData.rodMaterialDropChance) -- which material depends on the rod's
  // CURRENT grade, since that's the one you're climbing out of. Capped at
  // the needed amount so the count never overflows past what grade-up
  // actually consumes.
  function rollRodMaterial() {
    const gradeInfo = FishData.ROD_GRADES[rod.grade];
    if (!gradeInfo.next) return null; // already at the top grade
    const targetKey = gradeInfo.next;
    const needed = FishData.ROD_GRADE_UP[targetKey].needed;
    // Already have enough -- don't even roll, so a lucky RNG streak past
    // the cap never pops the "you got a material!" popup for a drop that
    // silently changes nothing.
    if ((materials[targetKey] || 0) >= needed) return null;
    if (Math.random() >= FishData.rodMaterialDropChance(rod.level)) return null;
    materials[targetKey] = (materials[targetKey] || 0) + 1;
    return { gradeKey: targetKey, count: materials[targetKey], needed };
  }

  function catchSuccess() {
    state = 'result';
    bobberState = 'hidden';
    sfx.splash();
    sfx.success();
    reelGaugeEl.classList.add('hidden');
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
      pendingMaterial = rollRodMaterial();
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
    reelGaugeEl.classList.add('hidden');
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

  // ================= Rod grade-up material popup =================
  // Shown right after the catch result popup closes, only when a material
  // actually dropped this catch (see rollRodMaterial()).
  function showMaterialPopup(mat) {
    const info = FishData.ROD_GRADE_UP[mat.gradeKey];
    materialIcon.src = 'icons/shop/material.svg';
    materialTitle.textContent = info.materialLabel;
    materialDesc.textContent = `낚싯대를 강화하는 재료이다. ${info.needed}개를 모아서 등급을 올리자.`;
    materialCountEl.textContent = `보유: ${mat.count} / ${info.needed}개`;
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

  function setBaitMenuOpen(open) {
    baitMenu.classList.toggle('open', open);
    baitMenuBackdrop.classList.toggle('open', open);
  }
  baitBtn.addEventListener('click', () => setBaitMenuOpen(!baitMenu.classList.contains('open')));
  baitMenuBackdrop.addEventListener('click', () => setBaitMenuOpen(false));
  baitMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      if (item.disabled) return;
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
    updateShellsDisplay();
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

  // ================= Slide-out menu (상점 / 보관함 / 설정) =================
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const sideMenu = document.getElementById('side-menu');
  const menuBackdrop = document.getElementById('menu-backdrop');

  function setMenuOpen(open) {
    sideMenu.classList.toggle('open', open);
    menuBackdrop.classList.toggle('open', open);
  }
  menuToggleBtn.addEventListener('click', () => setMenuOpen(!sideMenu.classList.contains('open')));
  menuBackdrop.addEventListener('click', () => setMenuOpen(false));

  // ================= Shop (구매 / 판매 / 업그레이드) =================
  function openShop() {
    setMenuOpen(false);
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
          <div class="sell-row-meta">${item.desc}</div>
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
    updateShellsDisplay();
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

    // Grade-up material count sits next to the rod whenever there's a next
    // grade to climb toward, whether or not you've hit level 10 yet --
    // no separate explanatory note needed once the count is right there.
    if (gradeInfo.next) {
      const upInfo = FishData.ROD_GRADE_UP[gradeInfo.next];
      const have = materials[gradeInfo.next] || 0;
      rodMaterialIconEl.src = 'icons/shop/material.svg';
      rodMaterialCountEl.textContent = `${have} / ${upInfo.needed}`;
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
      const have = materials[gradeInfo.next] || 0;
      rodUpgradeBtn.textContent = '등급업';
      rodUpgradeBtn.disabled = have < upInfo.needed;
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
      updateShellsDisplay();
      renderUpgradeTab();
      return;
    }
    if (!gradeInfo.next) return;
    const upInfo = FishData.ROD_GRADE_UP[gradeInfo.next];
    if ((materials[gradeInfo.next] || 0) < upInfo.needed) return;
    sfx.coin();
    materials[gradeInfo.next] = 0;
    rod.grade = gradeInfo.next;
    rod.level = 1;
    persist();
    updateShellsDisplay();
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
    updateShellsDisplay();
    renderUpgradeTab();
  });

  // ================= Bucket (보관함 / 도감) =================
  function openBucket() {
    setMenuOpen(false);
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
        row.innerHTML = `
          <div class="sell-row-icon"><img src="${record ? FishData.speciesIconPath(tier, sp.id) : 'icons/fish/fish.svg'}" alt=""></div>
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

  // ================= Settings (왼손 모드 / 볼륨 / 데이터 삭제) =================
  function openSettings() {
    setMenuOpen(false);
    settingsOverlay.classList.remove('hidden');
  }
  function closeSettings() { settingsOverlay.classList.add('hidden'); }
  menuSettingsBtn.addEventListener('click', openSettings);
  settingsCloseBtn.addEventListener('click', closeSettings);
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });

  // ---- Left-hand mode: mirrors the reeling HUD only (menu stays put) ----
  const LEFTY_KEY = 'zanzanhan-lefty-mode-v1';
  let leftyMode = false;
  try { leftyMode = localStorage.getItem(LEFTY_KEY) === '1'; } catch (e) { /* ignore */ }
  function applyLeftyMode() {
    gameEl.classList.toggle('lefty-mode', leftyMode);
    leftyToggleBtn.setAttribute('aria-checked', String(leftyMode));
  }
  leftyToggleBtn.addEventListener('click', () => {
    leftyMode = !leftyMode;
    try { localStorage.setItem(LEFTY_KEY, leftyMode ? '1' : '0'); } catch (e) { /* ignore */ }
    applyLeftyMode();
  });
  applyLeftyMode();

  // ---- Skip low tiers the rod has outgrown (see SKIP_TIERS_BY_GRADE) ----
  const SKIP_LOWTIER_KEY = 'zanzanhan-skip-lowtier-v1';
  let skipLowTier = true;
  try {
    const stored = localStorage.getItem(SKIP_LOWTIER_KEY);
    if (stored !== null) skipLowTier = stored === '1';
  } catch (e) { /* ignore */ }
  function applySkipLowTier() {
    skipLowTierToggleBtn.setAttribute('aria-checked', String(skipLowTier));
  }
  skipLowTierToggleBtn.addEventListener('click', () => {
    skipLowTier = !skipLowTier;
    try { localStorage.setItem(SKIP_LOWTIER_KEY, skipLowTier ? '1' : '0'); } catch (e) { /* ignore */ }
    applySkipLowTier();
  });
  applySkipLowTier();

  // ---- SFX volume slider ----
  const VOLUME_KEY = 'zanzanhan-sfx-volume-v1';
  // sfxVolume itself is declared up in the audio section, right next to
  // blip() (the only other thing that reads it).
  try {
    const storedVol = parseFloat(localStorage.getItem(VOLUME_KEY));
    if (!isNaN(storedVol) && storedVol >= 0 && storedVol <= 1) sfxVolume = storedVol;
  } catch (e) { /* ignore */ }
  volumeSliderEl.value = String(Math.round(sfxVolume * 100));
  volumeSliderEl.addEventListener('input', () => {
    sfxVolume = Math.max(0, Math.min(1, volumeSliderEl.value / 100));
    try { localStorage.setItem(VOLUME_KEY, String(sfxVolume)); } catch (e) { /* ignore */ }
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
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

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
  window.__zzhDevGiveShells = function (amount) {
    try { if (localStorage.getItem(DEV_FLAG_KEY) !== '1') return; } catch (e) { return; }
    shells += amount || 1000;
    persist();
    updateShellsDisplay();
    if (!shopOverlay.classList.contains('hidden')) { renderGachaTab(); renderUpgradeTab(); }
  };

  updateShellsDisplay();
  updateBaitButton();
  if (!hasCastBefore) tutorialHintEl.classList.remove('hidden');
}

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
