(() => {
  'use strict';

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
  const HIT_TOLERANCE = 7.5;

  let state = 'idle'; // idle | waiting | bite | reeling | result
  let waitingTimer = null, biteTimer = null;
  let reel = null; // { period, zoneTop, zoneHeight, hits, misses, hitsRequired, maxMisses, startT, timeLimit, timeStart, fromBottom }
  let currentCatch = null; // chosen in triggerBite(), consumed by startReel()/catchSuccess()
  let shells = 0;
  let rod = { grade: 'common', level: 1 };
  let caughtFish = []; // { uid, name, tier, size, price, desc } -- sold via the shop's 판매 tab
  let nextFishUid = 1;

  const shellsCountEl = document.getElementById('shells-count');
  const statusTextEl = document.getElementById('status-text');
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
  const menuShopBtn = document.getElementById('menu-shop-btn');
  const shopOverlay = document.getElementById('shop-overlay');
  const shopPanel = document.getElementById('shop-panel');
  const shopCloseBtn = document.getElementById('shop-close-btn');
  const shopTabs = document.querySelectorAll('.shop-tab');
  const shopTabPanels = {
    buy: document.getElementById('shop-tab-buy'),
    sell: document.getElementById('shop-tab-sell'),
    upgrade: document.getElementById('shop-tab-upgrade')
  };
  const sellListEl = document.getElementById('sell-list');
  const sellEmptyEl = document.getElementById('sell-empty');
  const rodNameEl = document.getElementById('rod-name');
  const rodLevelEl = document.getElementById('rod-level');
  const upgradeBarFillEl = document.getElementById('upgrade-bar-fill');
  const rodMaxNoteEl = document.getElementById('rod-max-note');
  const rodUpgradeBtn = document.getElementById('rod-upgrade-btn');

  function updateShellsDisplay() { shellsCountEl.textContent = shells.toLocaleString('ko-KR'); }

  // Rod grade raises maxMisses (more forgiving); rod level smoothly widens
  // the hit zone and per-hit time limit. Both are folded into the tier's
  // base reel params here so startReel()/attemptHit() just consume one
  // effective set without knowing about the rod at all.
  function getEffectiveReel(tier) {
    const base = FishData.TIERS[tier].reel;
    const ease = FishData.rodEase(rod.level);
    const missBonus = FishData.ROD_GRADES[rod.grade].missBonus;
    return {
      hitsRequired: base.hitsRequired,
      zoneHeight: base.zoneHeight * (1 + ease),
      timeLimit: base.timeLimit * (1 + ease * 0.6),
      maxMisses: base.maxMisses + missBonus,
      hitTolerance: HIT_TOLERANCE * (1 + ease * 0.5)
    };
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
    bobber = { x, y };
    state = 'waiting';
    bobberState = 'waiting';
    showStatus('입질을 기다리는 중...');
    const delay = 1600 + Math.random() * 2600;
    waitingTimer = setTimeout(triggerBite, delay);
  }

  function triggerBite() {
    if (state !== 'waiting') return;
    state = 'bite';
    bobberState = 'bite';
    bobberDipT = performance.now() / 1000;
    // Tier is chosen now but no longer announced up front -- the hit
    // counter's rarity climb is the only reveal during casting/reeling.
    currentCatch = FishData.pickCatch();
    showStatus('입질이 왔어요!', 'icons/bite.svg');
    biteTimer = setTimeout(startReel, 500);
  }

  function startReel() {
    if (state !== 'bite') return;
    hideStatus();
    state = 'reeling';
    bobberState = 'reeling';
    const f = getEffectiveReel(currentCatch.tier);
    // f.hitsRequired is only the tier's minimum now -- each reel adds 0~1
    // more so the exact count varies catch to catch.
    const hitsRequired = f.hitsRequired + Math.floor(Math.random() * 2);
    const colorSeq = buildClimbSequence(currentCatch.tier, hitsRequired);
    // The very first hit's speed already matches whatever tier colorSeq[0]
    // displays -- see attemptHit() for how it keeps following the climb.
    reel = {
      period: FishData.TIERS[colorSeq[0]].reel.period,
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
    for (let i = 0; i < reel.hitsRequired; i++) {
      hitsCounterEl.insertAdjacentHTML('beforeend', FISH_ICON_SVG);
    }
  }

  // ---- Hit-counter rarity climb ----
  // Every filled fish icon always shows the SAME color: the tier reached by
  // the most recent hit. Landing a hit can bump that shared color up (never
  // down), so earlier fish visibly re-color along with the new one -- a
  // "climbing toward the real tier" tell rather than a static count.
  // junk sits at the bottom (ordinal 0) so even a real fish's early hits
  // can flash "might be nothing" gray before climbing into actual tiers.
  const REEL_TIER_ORDER = ['junk', 'common', 'rare', 'epic', 'legendary'];

  // Random non-decreasing walk over tiers [0..targetOrdinal] (junk itself
  // just has targetOrdinal 0, so its sequence is trivially all-junk). The
  // last up to 3 hits are always locked to the real tier (so it reads as
  // "settled" well before the catch actually lands), and the free hits
  // before that are NOT anchored to common -- a legendary catch can open
  // on junk, common, or rare just as well. Deliberately not a fixed
  // one-tier-per-hit ramp -- e.g. an epic catch might read 희귀,희귀,특급
  // instead of 일반,희귀,특급.
  function buildClimbSequence(tierKey, n) {
    const targetOrdinal = REEL_TIER_ORDER.indexOf(tierKey);
    const forcedFrom = Math.max(0, n - 3);
    const picks = [];
    for (let i = 0; i < forcedFrom; i++) picks.push(Math.floor(Math.random() * (targetOrdinal + 1)));
    picks.sort((a, b) => a - b);
    while (picks.length < n) picks.push(targetOrdinal);
    return picks.map(o => REEL_TIER_ORDER[o]);
  }

  function applyHitColors() {
    const color = FishData.TIERS[reel.colorSeq[reel.hits - 1]].color;
    for (let i = 0; i < reel.hits; i++) {
      const fish = hitsCounterEl.children[i];
      if (fish) fish.style.color = color;
    }
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
    const tolerance = getEffectiveReel(currentCatch.tier).hitTolerance;
    const inZone = pos >= reel.zoneTop - tolerance && pos <= reel.zoneTop + reel.zoneHeight + tolerance;
    if (inZone) {
      reel.hits++;
      bobberTugT = performance.now() / 1000;
      gaugeTrackEl.classList.remove('flash-good'); void gaugeTrackEl.offsetWidth; gaugeTrackEl.classList.add('flash-good');
      const fish = hitsCounterEl.children[reel.hits - 1];
      if (fish) fish.classList.add('filled');
      applyHitColors();
      if (reel.hits >= reel.hitsRequired) {
        catchSuccess();
        return;
      }
      // Speed for the upcoming hit follows whatever tier the climb shows
      // next -- not a flat per-hit shrink, so it jumps in step with color.
      reel.period = FishData.TIERS[reel.colorSeq[reel.hits]].reel.period;
      reel.zoneTop = randomZoneTop(reel.zoneHeight);
      reel.startT = performance.now() / 1000;
      reel.timeStart = performance.now() / 1000;
      reel.fromBottom = !reel.fromBottom;
      positionZone();
    } else {
      reel.misses++;
      gaugeTrackEl.classList.remove('flash-bad'); void gaugeTrackEl.offsetWidth; gaugeTrackEl.classList.add('flash-bad');
      const dot = chanceLightsEl.children[reel.misses - 1];
      if (dot) dot.classList.add('off');
      if (reel.misses >= reel.maxMisses) catchFail();
    }
  }

  function catchSuccess() {
    state = 'result';
    bobberState = 'hidden';
    reelGaugeEl.classList.add('hidden');
    const c = currentCatch;
    const icon = c.tier === 'junk' ? 'icons/junk.svg' : 'icons/fish.svg';
    const title = c.tier === 'junk' ? `${c.name}...` : `${c.name}를 낚았어요!`;
    let desc;
    if (c.tier === 'junk') {
      desc = c.desc;
    } else {
      // Not sold yet -- it goes to the bucket and gets sold from the
      // shop's 판매 tab, so this price is a preview, not income.
      caughtFish.push({ uid: nextFishUid++, name: c.name, tier: c.tier, size: c.size, price: c.price, desc: c.desc });
      desc = `${c.desc} (${c.size}cm · 판매가 ${c.price.toLocaleString('ko-KR')}개)`;
    }
    showResult(true, title, desc, icon, c.tier);
  }

  function catchFail() {
    if (state !== 'reeling') return;
    state = 'result';
    bobberState = 'hidden';
    reelGaugeEl.classList.add('hidden');
    showResult(false, '놓쳤어요...', '다음엔 타이밍을 맞춰보세요.', 'icons/miss.svg');
  }

  function showResult(isCatch, title, desc, icon, tier) {
    resultIcon.innerHTML = `<img src="${icon}" alt="">`;
    if (tier) {
      resultTierBadge.textContent = FishData.TIERS[tier].label;
      resultTierBadge.className = `tier-badge tier-${tier}`;
    } else {
      resultTierBadge.classList.add('hidden');
    }
    resultTitle.textContent = title;
    resultDesc.textContent = desc;
    newBadge.classList.add('hidden'); // no species-discovery tracking yet
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
  }
  resultBtn.addEventListener('click', closeResult);

  // ================= Slide-out menu (상점 / 보관함 / 설정) =================
  // 보관함/설정 have no content behind them yet -- only 상점 opens anything.
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
    switchShopTab('buy');
    shopOverlay.classList.remove('hidden');
  }
  function closeShop() { shopOverlay.classList.add('hidden'); }
  menuShopBtn.addEventListener('click', openShop);
  shopCloseBtn.addEventListener('click', closeShop);
  shopOverlay.addEventListener('click', (e) => { if (e.target === shopOverlay) closeShop(); });

  function switchShopTab(key) {
    shopTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === key));
    Object.entries(shopTabPanels).forEach(([k, el]) => el.classList.toggle('hidden', k !== key));
    if (key === 'sell') renderSellList();
    if (key === 'upgrade') renderUpgradeTab();
  }
  shopTabs.forEach(btn => btn.addEventListener('click', () => switchShopTab(btn.dataset.tab)));

  function renderSellList() {
    sellListEl.innerHTML = '';
    sellEmptyEl.classList.toggle('hidden', caughtFish.length > 0);
    caughtFish.forEach(item => {
      const row = document.createElement('div');
      row.className = 'sell-row';
      row.innerHTML = `
        <div class="sell-row-icon"><img src="icons/fish.svg" alt=""></div>
        <div class="sell-row-info">
          <div class="sell-row-name">
            <span class="tier-badge tier-${item.tier}">${FishData.TIERS[item.tier].label}</span>
            ${item.name} · ${item.size}cm
          </div>
          <div class="sell-row-meta">${item.desc}</div>
        </div>
        <div class="sell-row-price">${item.price.toLocaleString('ko-KR')}개</div>
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
    shells += caughtFish[idx].price;
    caughtFish.splice(idx, 1);
    updateShellsDisplay();
    renderSellList();
  }

  function renderUpgradeTab() {
    const gradeInfo = FishData.ROD_GRADES[rod.grade];
    rodNameEl.textContent = gradeInfo.label;
    rodNameEl.style.color = gradeInfo.color;
    rodLevelEl.textContent = `Lv. ${rod.level} / ${FishData.ROD_MAX_LEVEL}`;
    upgradeBarFillEl.style.width = `${(rod.level / FishData.ROD_MAX_LEVEL) * 100}%`;

    if (rod.level < FishData.ROD_MAX_LEVEL) {
      const cost = FishData.rodLevelCost(rod.level);
      rodMaxNoteEl.classList.add('hidden');
      rodUpgradeBtn.textContent = `${cost.toLocaleString('ko-KR')}개`;
      rodUpgradeBtn.disabled = shells < cost;
    } else if (gradeInfo.next) {
      rodMaxNoteEl.textContent = `최고 레벨이에요. 다음 등급(${FishData.ROD_GRADES[gradeInfo.next].label})으로 올리려면 강화재료가 필요한데, 아직 준비 중이에요.`;
      rodMaxNoteEl.classList.remove('hidden');
      rodUpgradeBtn.textContent = '등급업';
      rodUpgradeBtn.disabled = true;
    } else {
      rodMaxNoteEl.textContent = '이미 가장 높은 등급, 가장 높은 레벨이에요!';
      rodMaxNoteEl.classList.remove('hidden');
      rodUpgradeBtn.textContent = 'MAX';
      rodUpgradeBtn.disabled = true;
    }
  }
  rodUpgradeBtn.addEventListener('click', () => {
    if (rod.level >= FishData.ROD_MAX_LEVEL) return; // grade-up needs materials that don't exist yet
    const cost = FishData.rodLevelCost(rod.level);
    if (shells < cost) return;
    shells -= cost;
    rod.level += 1;
    updateShellsDisplay();
    renderUpgradeTab();
  });

  updateShellsDisplay();
})();
