// ================= 수족관 소품 painters (v2.2) =================
// Loaded after aquarium-data.js, before game.js. Canvas-only, no DOM and no
// image files (the "파일 0개" rule in md/AQUARIUM.md): every 소품 is drawn
// from a few paths and the colours in its DECOR entry's `look`.
//
// AquariumProps.paint(g, look, x, y, s, t, alpha)
//   g      2D context (the tank canvas, or a list row's preview canvas)
//   x, y   bottom-centre of the prop -- where it sits on the floor
//   s      nominal height in px (the slot's size × look.h, set by game.js)
//   t      seconds, for the few that move (sway, glow pulse, spin)
//   alpha  overall opacity (back-row spots draw slightly faded)
// Each painter works in its own units: (0, 0) is the bottom-centre and s is
// the height, so shapes read the same at any slot size.
(() => {
  'use strict';

  function ellipse(g, x, y, rx, ry, fill) {
    g.fillStyle = fill;
    g.beginPath();
    g.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, 0, Math.PI * 2);
    g.fill();
  }
  function roundRect(g, x, y, w, h, r, fill) {
    g.fillStyle = fill;
    g.beginPath();
    r = Math.min(r, w / 2, h / 2);
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
  }
  function poly(g, pts, fill) {
    g.fillStyle = fill;
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
    g.fill();
  }
  function line(g, x0, y0, x1, y1, w, stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  }
  // Soft contact shadow under every prop so it sits on the floor.
  function shadow(g, w, s) { ellipse(g, 0, 0, w, s * 0.06, 'rgba(0, 0, 0, 0.28)'); }
  // Pulsing halo for the glowing ones (전설 / 발광).
  function halo(g, cx, cy, r, color, t, strength) {
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.2);
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, hexA(color, 0.45 * pulse * (strength || 1)));
    grad.addColorStop(1, hexA(color, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  function mixHex(a, b, k) {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((x >> sh) & 255) * (1 - k) + ((y >> sh) & 255) * k);
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  const P = {
    // ----- 민물 -----
    driftwood(g, s, t, c) {
      shadow(g, s * 0.9, s);
      g.lineCap = 'round';
      g.strokeStyle = c[1];
      g.lineWidth = s * 0.22;
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.12);
      g.quadraticCurveTo(-s * 0.2, -s * 0.5, s * 0.7, -s * 0.2);
      g.stroke();
      g.strokeStyle = c[0];
      g.lineWidth = s * 0.14;
      g.stroke();
      line(g, -s * 0.25, -s * 0.34, -s * 0.45, -s * 0.9, s * 0.08, c[1]);
      line(g, s * 0.25, -s * 0.3, s * 0.45, -s * 0.72, s * 0.07, c[2]);
      line(g, -s * 0.6, -s * 0.2, -s * 0.5, -s * 0.28, s * 0.05, c[2]);
    },
    cairn(g, s, t, c) {
      shadow(g, s * 0.45, s);
      const stones = [[0.42, 0.2], [0.34, 0.18], [0.27, 0.17], [0.2, 0.15], [0.13, 0.13]];
      let y = 0;
      stones.forEach(([rw, rh], i) => {
        const h = s * rh;
        ellipse(g, (i % 2 ? 1 : -1) * s * 0.03, y - h / 2, s * rw, h / 2, c[i % 3]);
        ellipse(g, (i % 2 ? 1 : -1) * s * 0.03 - s * rw * 0.3, y - h * 0.7, s * rw * 0.35, h * 0.15, 'rgba(255,255,255,0.18)');
        y -= h * 0.92;
      });
    },
    lotus(g, s, t, c) {
      const sway = Math.sin(t * 0.8) * s * 0.05;
      line(g, 0, 0, sway, -s * 0.7, s * 0.04, c[3]);
      line(g, -s * 0.1, 0, -s * 0.35 + sway * 0.5, -s * 0.42, s * 0.03, c[3]);
      ellipse(g, -s * 0.38 + sway * 0.5, -s * 0.43, s * 0.2, s * 0.05, c[2]);
      const cx = sway, cy = -s * 0.78;
      for (let i = -2; i <= 2; i++) {
        g.save();
        g.translate(cx, cy);
        g.rotate(i * 0.38);
        ellipse(g, 0, -s * 0.12, s * 0.07, s * 0.15, i % 2 ? c[1] : c[0]);
        g.restore();
      }
      ellipse(g, cx, cy, s * 0.07, s * 0.04, '#ffd24a');
    },
    jar(g, s, t, c) {
      shadow(g, s * 0.4, s);
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(-s * 0.2, 0);
      g.bezierCurveTo(-s * 0.55, -s * 0.2, -s * 0.5, -s * 0.72, -s * 0.18, -s * 0.8);
      g.lineTo(s * 0.18, -s * 0.8);
      g.bezierCurveTo(s * 0.5, -s * 0.72, s * 0.55, -s * 0.2, s * 0.2, 0);
      g.closePath();
      g.fill();
      roundRect(g, -s * 0.22, -s * 0.94, s * 0.44, s * 0.16, s * 0.04, c[1]);
      ellipse(g, 0, -s * 0.94, s * 0.18, s * 0.04, c[2]);
      line(g, -s * 0.38, -s * 0.45, s * 0.38, -s * 0.45, s * 0.03, c[2]);
      line(g, -s * 0.34, -s * 0.33, s * 0.34, -s * 0.33, s * 0.02, c[1]);
      ellipse(g, -s * 0.22, -s * 0.58, s * 0.05, s * 0.12, 'rgba(255,255,255,0.15)');
    },
    bridge(g, s, t, c) {
      shadow(g, s * 1.1, s);
      g.strokeStyle = c[1];
      g.lineWidth = s * 0.14;
      g.beginPath();
      g.moveTo(-s * 1.0, 0);
      g.quadraticCurveTo(0, -s * 1.0, s * 1.0, 0);
      g.stroke();
      g.strokeStyle = c[2];
      g.lineWidth = s * 0.07;
      g.beginPath();
      g.moveTo(-s * 0.95, -s * 0.03);
      g.quadraticCurveTo(0, -s * 0.9, s * 0.95, -s * 0.03);
      g.stroke();
      [-0.6, -0.2, 0.2, 0.6].forEach((fx) => {
        const yTop = -s * (1 - fx * fx) * 0.5;
        line(g, fx * s, yTop, fx * s, yTop - s * 0.32, s * 0.05, c[0]);
      });
      g.strokeStyle = c[0];
      g.lineWidth = s * 0.05;
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.36);
      g.quadraticCurveTo(0, -s * 1.3, s * 0.85, -s * 0.36);
      g.stroke();
    },
    waterwheel(g, s, t, c) {
      shadow(g, s * 0.5, s);
      const r = s * 0.4, cy = -s * 0.5;
      roundRect(g, -s * 0.06, cy, s * 0.12, s * 0.5, s * 0.02, c[2]);
      g.save();
      g.translate(0, cy);
      g.rotate(t * 0.6);
      g.strokeStyle = c[1];
      g.lineWidth = s * 0.05;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        line(g, 0, 0, Math.cos(a) * r, Math.sin(a) * r, s * 0.03, c[1]);
        g.save();
        g.rotate(a);
        roundRect(g, r - s * 0.02, -s * 0.06, s * 0.1, s * 0.12, s * 0.02, c[0]);
        g.restore();
      }
      ellipse(g, 0, 0, s * 0.06, s * 0.06, c[2]);
      g.restore();
    },
    bell(g, s, t, c) {
      shadow(g, s * 0.5, s);
      // Wooden frame.
      line(g, -s * 0.42, 0, -s * 0.42, -s * 0.95, s * 0.07, c[3]);
      line(g, s * 0.42, 0, s * 0.42, -s * 0.95, s * 0.07, c[3]);
      line(g, -s * 0.5, -s * 0.95, s * 0.5, -s * 0.95, s * 0.08, c[3]);
      // Bronze bell with verdigris.
      const sw = Math.sin(t * 0.9) * 0.05;
      g.save();
      g.translate(0, -s * 0.9);
      g.rotate(sw);
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(-s * 0.14, s * 0.06);
      g.bezierCurveTo(-s * 0.2, s * 0.25, -s * 0.3, s * 0.55, -s * 0.32, s * 0.7);
      g.lineTo(s * 0.32, s * 0.7);
      g.bezierCurveTo(s * 0.3, s * 0.55, s * 0.2, s * 0.25, s * 0.14, s * 0.06);
      g.closePath();
      g.fill();
      roundRect(g, -s * 0.34, s * 0.64, s * 0.68, s * 0.08, s * 0.03, c[1]);
      [0.3, 0.45].forEach((fy) => line(g, -s * 0.24, s * fy, s * 0.24, s * fy, s * 0.02, c[2]));
      for (let i = 0; i < 3; i++) ellipse(g, (i - 1) * s * 0.1, s * 0.2, s * 0.025, s * 0.025, c[2]);
      g.restore();
    },
    orb(g, s, t, c, look) {
      const bob = Math.sin(t * 1.3) * s * 0.05;
      halo(g, 0, -s * 0.55 + bob, s * 0.75, look.glow, t);
      // Cloud-shaped stand.
      ellipse(g, 0, -s * 0.08, s * 0.38, s * 0.1, '#6b8f9a');
      ellipse(g, -s * 0.18, -s * 0.15, s * 0.16, s * 0.1, '#8fb3bd');
      ellipse(g, s * 0.18, -s * 0.15, s * 0.16, s * 0.1, '#8fb3bd');
      const cy = -s * 0.55 + bob;
      const grad = g.createRadialGradient(-s * 0.1, cy - s * 0.12, s * 0.03, 0, cy, s * 0.3);
      grad.addColorStop(0, c[0]);
      grad.addColorStop(0.6, c[1]);
      grad.addColorStop(1, c[2]);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, cy, s * 0.3, 0, Math.PI * 2);
      g.fill();
      ellipse(g, -s * 0.1, cy - s * 0.12, s * 0.08, s * 0.05, 'rgba(255,255,255,0.7)');
    },

    // ----- 바다 -----
    starfish(g, s, t, c) {
      shadow(g, s * 0.9, s);
      g.save();
      g.translate(0, -s * 0.35);
      g.scale(1, 0.55);
      g.fillStyle = c[0];
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? s * 0.32 : s * 0.9;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        for (let k = 1; k <= 3; k++) ellipse(g, Math.cos(a) * s * 0.2 * k, Math.sin(a) * s * 0.2 * k, s * 0.04, s * 0.04, c[2]);
      }
      ellipse(g, 0, 0, s * 0.1, s * 0.1, c[1]);
      g.restore();
    },
    conch(g, s, t, c) {
      shadow(g, s * 0.8, s);
      g.fillStyle = c[1];
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.2);
      g.bezierCurveTo(-s * 0.5, -s * 1.05, s * 0.55, -s * 1.1, s * 0.85, -s * 0.35);
      g.bezierCurveTo(s * 0.6, -s * 0.05, -s * 0.3, 0, -s * 0.85, -s * 0.2);
      g.fill();
      ellipse(g, s * 0.2, -s * 0.35, s * 0.36, s * 0.24, c[3]);
      ellipse(g, s * 0.22, -s * 0.36, s * 0.2, s * 0.12, c[0]);
      for (let i = 0; i < 4; i++) {
        g.strokeStyle = c[2];
        g.lineWidth = s * 0.04;
        g.beginPath();
        g.arc(-s * 0.45 + i * s * 0.18, -s * 0.5, s * (0.28 - i * 0.04), Math.PI * 1.1, Math.PI * 1.7);
        g.stroke();
      }
      poly(g, [[-s * 0.85, -s * 0.2], [-s * 1.0, -s * 0.28], [-s * 0.8, -s * 0.34]], c[2]);
    },
    anemone(g, s, t, c) {
      shadow(g, s * 0.45, s);
      roundRect(g, -s * 0.22, -s * 0.4, s * 0.44, s * 0.4, s * 0.12, c[2]);
      for (let i = 0; i < 11; i++) {
        const fx = (i / 10 - 0.5) * 2;
        const sway = Math.sin(t * 1.6 + i * 0.7) * s * 0.08;
        g.strokeStyle = i % 2 ? c[1] : c[0];
        g.lineWidth = s * 0.07;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(fx * s * 0.18, -s * 0.38);
        g.quadraticCurveTo(fx * s * 0.4 + sway, -s * 0.7, fx * s * 0.5 + sway * 1.6, -s * (0.9 + 0.1 * Math.cos(i)));
        g.stroke();
      }
    },
    anchor(g, s, t, c) {
      shadow(g, s * 0.5, s);
      g.save();
      g.translate(0, -s * 0.05);
      g.rotate(-0.18);
      line(g, 0, -s * 0.05, 0, -s * 0.85, s * 0.09, c[0]);
      line(g, -s * 0.22, -s * 0.72, s * 0.22, -s * 0.72, s * 0.08, c[0]);
      g.strokeStyle = c[0];
      g.lineWidth = s * 0.09;
      g.beginPath();
      g.arc(0, -s * 0.94, s * 0.08, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(0, -s * 0.3, s * 0.34, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
      poly(g, [[s * 0.3, -s * 0.2], [s * 0.44, -s * 0.28], [s * 0.36, -s * 0.08]], c[1]);
      poly(g, [[-s * 0.3, -s * 0.2], [-s * 0.44, -s * 0.28], [-s * 0.36, -s * 0.08]], c[1]);
      g.restore();
      // A loop of rope trailing off.
      g.strokeStyle = c[2];
      g.lineWidth = s * 0.035;
      g.beginPath();
      g.moveTo(-s * 0.16, -s * 0.92);
      g.bezierCurveTo(-s * 0.5, -s * 0.9, -s * 0.6, -s * 0.2, -s * 0.35, -s * 0.03);
      g.stroke();
    },
    chest(g, s, t, c) {
      shadow(g, s * 0.8, s);
      const w = s * 1.3, h = s * 0.6;
      // Gold glint spilling from the open lid.
      halo(g, 0, -h, s * 0.6, c[2], t, 0.6);
      roundRect(g, -w / 2, -h, w, h, s * 0.06, c[0]);
      [-0.3, 0.3].forEach((f) => roundRect(g, f * w - s * 0.04, -h, s * 0.08, h, 0, c[1]));
      roundRect(g, -w / 2, -h, w, s * 0.08, 0, c[1]);
      for (let i = 0; i < 6; i++) ellipse(g, (i - 2.5) * s * 0.17, -h - s * 0.02, s * 0.1, s * 0.07, c[2]);
      g.fillStyle = c[1];
      g.beginPath();
      g.moveTo(-w / 2, -h);
      g.lineTo(-w / 2 + s * 0.05, -h - s * 0.5);
      g.quadraticCurveTo(0, -h - s * 0.72, w / 2 - s * 0.05, -h - s * 0.5);
      g.lineTo(w / 2, -h);
      g.lineTo(w / 2 - s * 0.1, -h - s * 0.08);
      g.quadraticCurveTo(0, -h - s * 0.55, -w / 2 + s * 0.1, -h - s * 0.08);
      g.closePath();
      g.fill();
      roundRect(g, -s * 0.07, -h * 0.72, s * 0.14, s * 0.16, s * 0.03, c[2]);
    },
    lighthouse(g, s, t, c) {
      shadow(g, s * 0.35, s);
      poly(g, [[-s * 0.3, 0], [-s * 0.18, -s * 0.72], [s * 0.18, -s * 0.72], [s * 0.3, 0]], c[0]);
      [0.12, 0.36, 0.58].forEach((fy) => {
        const y0 = -s * fy, y1 = -s * (fy + 0.1);
        const w0 = 0.3 - fy * 0.16, w1 = 0.3 - (fy + 0.1) * 0.16;
        poly(g, [[-s * w0, y0], [-s * w1, y1], [s * w1, y1], [s * w0, y0]], c[1]);
      });
      roundRect(g, -s * 0.24, -s * 0.78, s * 0.48, s * 0.07, s * 0.02, c[2]);
      const beam = 0.6 + 0.4 * Math.sin(t * 3);
      roundRect(g, -s * 0.13, -s * 0.94, s * 0.26, s * 0.16, s * 0.03, hexA(c[3], 0.6 + 0.4 * beam));
      halo(g, 0, -s * 0.86, s * 0.35, c[3], t * 1.4, 0.8);
      poly(g, [[-s * 0.18, -s * 0.94], [0, -s * 1.08], [s * 0.18, -s * 0.94]], c[1]);
    },
    wreck(g, s, t, c) {
      shadow(g, s * 0.9, s);
      // Bow of a broken hull, tilted into the sand.
      g.fillStyle = c[1];
      g.beginPath();
      g.moveTo(-s * 0.9, 0);
      g.lineTo(-s * 0.75, -s * 0.55);
      g.quadraticCurveTo(s * 0.1, -s * 0.62, s * 0.75, -s * 0.95);
      g.quadraticCurveTo(s * 0.55, -s * 0.35, s * 0.35, 0);
      g.closePath();
      g.fill();
      for (let i = 1; i <= 3; i++) {
        const fy = i * 0.14;
        line(g, -s * 0.82 + i * s * 0.04, -s * fy, s * 0.55 - i * s * 0.05, -s * (fy + 0.18 + i * 0.05), s * 0.025, c[2]);
      }
      // Jagged broken edge + a porthole.
      poly(g, [[-s * 0.9, 0], [-s * 0.78, -s * 0.2], [-s * 0.88, -s * 0.33], [-s * 0.76, -s * 0.5], [-s * 0.75, -s * 0.55], [-s * 0.95, -s * 0.3]], c[2]);
      ellipse(g, -s * 0.2, -s * 0.36, s * 0.08, s * 0.08, c[3]);
      ellipse(g, -s * 0.2, -s * 0.36, s * 0.05, s * 0.05, '#1f3f55');
      // Bowsprit and a torn flag.
      line(g, s * 0.72, -s * 0.93, s * 1.05, -s * 1.1, s * 0.04, c[0]);
      const fl = Math.sin(t * 1.5) * s * 0.03;
      poly(g, [[s * 0.2, -s * 0.62], [s * 0.2, -s * 1.05], [s * 0.45 + fl, -s * 0.95], [s * 0.3, -s * 0.9], [s * 0.42 + fl, -s * 0.82]], hexA(c[3], 0.75));
      line(g, s * 0.2, -s * 0.6, s * 0.2, -s * 1.08, s * 0.03, c[0]);
    },
    palaceGate(g, s, t, c, look) {
      halo(g, 0, -s * 0.5, s * 0.85, look.glow, t, 0.7);
      shadow(g, s * 0.7, s);
      // Two red pillars under a sweeping tiled roof (용궁 문).
      roundRect(g, -s * 0.5, -s * 0.72, s * 0.12, s * 0.72, s * 0.02, c[0]);
      roundRect(g, s * 0.38, -s * 0.72, s * 0.12, s * 0.72, s * 0.02, c[0]);
      roundRect(g, -s * 0.52, -s * 0.12, s * 0.16, s * 0.12, s * 0.02, c[1]);
      roundRect(g, s * 0.36, -s * 0.12, s * 0.16, s * 0.12, s * 0.02, c[1]);
      roundRect(g, -s * 0.5, -s * 0.78, s * 1.0, s * 0.08, s * 0.02, c[2]);
      roundRect(g, -s * 0.2, -s * 0.72, s * 0.4, s * 0.1, s * 0.02, c[2]);
      g.fillStyle = c[3];
      g.beginPath();
      g.moveTo(-s * 0.78, -s * 0.8);
      g.quadraticCurveTo(-s * 0.4, -s * 0.86, -s * 0.3, -s * 0.98);
      g.lineTo(s * 0.3, -s * 0.98);
      g.quadraticCurveTo(s * 0.4, -s * 0.86, s * 0.78, -s * 0.8);
      g.lineTo(s * 0.6, -s * 0.9);
      g.lineTo(-s * 0.6, -s * 0.9);
      g.closePath();
      g.fill();
      ellipse(g, 0, -s * 1.03, s * 0.07, s * 0.07, c[2]);
      // The doorway glows faintly.
      roundRect(g, -s * 0.36, -s * 0.62, s * 0.72, s * 0.62, s * 0.3, hexA(look.glow, 0.12 + 0.06 * Math.sin(t * 2)));
    },

    // ----- 심해 -----
    glassFloat(g, s, t, c) {
      shadow(g, s * 0.5, s);
      const cy = -s * 0.5;
      g.save();
      g.globalAlpha *= 0.85;
      const grad = g.createRadialGradient(-s * 0.15, cy - s * 0.15, s * 0.05, 0, cy, s * 0.45);
      grad.addColorStop(0, '#e8fbff');
      grad.addColorStop(0.5, c[0]);
      grad.addColorStop(1, c[1]);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, cy, s * 0.45, 0, Math.PI * 2);
      g.fill();
      g.restore();
      // Rope net over the glass.
      g.strokeStyle = c[2];
      g.lineWidth = s * 0.03;
      [-0.25, 0, 0.25].forEach((f) => {
        g.beginPath();
        g.ellipse(0, cy, Math.abs(f) * s * 1.6 + s * 0.02, s * 0.45, 0, 0, Math.PI * 2);
        g.stroke();
      });
      g.beginPath();
      g.ellipse(0, cy, s * 0.45, s * 0.12, 0, 0, Math.PI * 2);
      g.stroke();
      ellipse(g, -s * 0.16, cy - s * 0.2, s * 0.08, s * 0.05, 'rgba(255,255,255,0.6)');
    },
    glowMushroom(g, s, t, c, look) {
      halo(g, 0, -s * 0.55, s * 0.7, look.glow, t);
      [[-0.25, 0.55, 0.22], [0.2, 0.8, 0.28], [0.42, 0.4, 0.15]].forEach(([fx, fh, fr], i) => {
        const x = fx * s, top = -fh * s;
        roundRect(g, x - s * 0.04, top, s * 0.08, fh * s, s * 0.03, c[2]);
        const pulse = 0.7 + 0.3 * Math.sin(t * 2 + i * 1.3);
        g.fillStyle = hexA(c[0], 0.6 + 0.4 * pulse);
        g.beginPath();
        g.ellipse(x, top, fr * s, fr * s * 0.6, 0, Math.PI, 0);
        g.fill();
        ellipse(g, x, top, fr * s, fr * s * 0.12, c[1]);
        for (let k = 0; k < 3; k++) ellipse(g, x + (k - 1) * fr * s * 0.45, top - fr * s * 0.3, s * 0.025, s * 0.025, '#ffffff');
      });
    },
    tubeworm(g, s, t, c) {
      shadow(g, s * 0.45, s);
      [[-0.22, 0.75], [-0.05, 1.0], [0.14, 0.85], [0.3, 0.6]].forEach(([fx, fh], i) => {
        const x = fx * s, top = -fh * s;
        roundRect(g, x - s * 0.05, top, s * 0.1, fh * s, s * 0.04, i % 2 ? c[0] : c[1]);
        for (let k = 1; k < 5; k++) line(g, x - s * 0.05, top + (fh * s * k) / 5, x + s * 0.05, top + (fh * s * k) / 5, s * 0.012, c[1]);
        // Red plume that pulls in and out.
        const open = 0.7 + 0.3 * Math.sin(t * 1.7 + i * 1.9);
        for (let k = -2; k <= 2; k++) {
          g.save();
          g.translate(x, top);
          g.rotate(k * 0.4 * open);
          ellipse(g, 0, -s * 0.09 * open, s * 0.025, s * 0.1 * open, c[2]);
          g.restore();
        }
      });
    },
    glowJelly(g, s, t, c, look) {
      const bob = Math.sin(t * 1.1) * s * 0.08;
      const cy = -s * 0.7 + bob;
      halo(g, 0, cy, s * 0.6, look.glow, t);
      // Tentacles first, then the bell over them.
      for (let i = 0; i < 6; i++) {
        const x = (i / 5 - 0.5) * s * 0.44;
        g.strokeStyle = hexA(c[0], 0.7);
        g.lineWidth = s * 0.025;
        g.beginPath();
        g.moveTo(x, cy);
        for (let k = 1; k <= 6; k++) g.lineTo(x + Math.sin(t * 2 + i + k) * s * 0.05, cy + k * s * 0.09);
        g.stroke();
      }
      const squish = 1 + Math.sin(t * 2.2) * 0.06;
      g.fillStyle = hexA(c[1], 0.8);
      g.beginPath();
      g.ellipse(0, cy, s * 0.3 * squish, s * 0.24 / squish, 0, Math.PI, 0);
      g.fill();
      ellipse(g, 0, cy, s * 0.3 * squish, s * 0.05, hexA(c[0], 0.9));
      ellipse(g, -s * 0.08, cy - s * 0.13, s * 0.08, s * 0.04, hexA(c[2], 0.8));
    },
    sunkenBell(g, s, t, c) {
      shadow(g, s * 0.55, s);
      g.save();
      g.translate(0, -s * 0.05);
      g.rotate(0.35);
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(-s * 0.16, -s * 0.9);
      g.bezierCurveTo(-s * 0.24, -s * 0.6, -s * 0.36, -s * 0.2, -s * 0.4, 0);
      g.lineTo(s * 0.4, 0);
      g.bezierCurveTo(s * 0.36, -s * 0.2, s * 0.24, -s * 0.6, s * 0.16, -s * 0.9);
      g.closePath();
      g.fill();
      roundRect(g, -s * 0.42, -s * 0.07, s * 0.84, s * 0.09, s * 0.03, c[1]);
      roundRect(g, -s * 0.08, -s * 1.0, s * 0.16, s * 0.12, s * 0.03, c[1]);
      [0.35, 0.55].forEach((fy) => line(g, -s * 0.28, -s * fy, s * 0.28, -s * fy, s * 0.025, c[2]));
      // Verdigris / barnacle patches.
      ellipse(g, -s * 0.18, -s * 0.2, s * 0.08, s * 0.05, c[3]);
      ellipse(g, s * 0.15, -s * 0.62, s * 0.06, s * 0.04, c[3]);
      g.restore();
    },
    submarine(g, s, t, c) {
      const bob = Math.sin(t * 0.9) * s * 0.03;
      shadow(g, s * 0.8, s);
      g.save();
      g.translate(0, bob);
      roundRect(g, -s * 0.85, -s * 0.72, s * 1.5, s * 0.52, s * 0.26, c[0]);
      roundRect(g, -s * 0.25, -s * 0.95, s * 0.45, s * 0.28, s * 0.08, c[1]);
      line(g, s * 0.05, -s * 0.95, s * 0.05, -s * 1.12, s * 0.035, c[2]);
      line(g, s * 0.05, -s * 1.12, s * 0.17, -s * 1.12, s * 0.035, c[2]);
      [-0.45, -0.1, 0.25].forEach((fx) => {
        ellipse(g, fx * s, -s * 0.46, s * 0.1, s * 0.1, c[2]);
        ellipse(g, fx * s, -s * 0.46, s * 0.07, s * 0.07, c[3]);
      });
      // Tail fins + spinning prop.
      poly(g, [[-s * 0.8, -s * 0.46], [-s * 1.0, -s * 0.72], [-s * 1.0, -s * 0.2]], c[1]);
      const spin = Math.abs(Math.sin(t * 8));
      ellipse(g, -s * 1.05, -s * 0.46, s * 0.03, s * 0.16 * spin + s * 0.02, c[2]);
      // Headlight.
      halo(g, s * 0.66, -s * 0.46, s * 0.3, c[3], t, 0.8);
      g.restore();
      // Skids.
      line(g, -s * 0.5, -s * 0.2 + bob, -s * 0.55, -s * 0.03, s * 0.04, c[2]);
      line(g, s * 0.3, -s * 0.2 + bob, s * 0.35, -s * 0.03, s * 0.04, c[2]);
      line(g, -s * 0.7, -s * 0.03, s * 0.5, -s * 0.03, s * 0.04, c[2]);
    },
    statue(g, s, t, c) {
      shadow(g, s * 0.45, s);
      roundRect(g, -s * 0.34, -s * 0.16, s * 0.68, s * 0.16, s * 0.02, c[2]);
      // A tall, weathered head (석상) with a crack.
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(-s * 0.26, -s * 0.16);
      g.lineTo(-s * 0.3, -s * 0.75);
      g.quadraticCurveTo(-s * 0.28, -s * 1.0, 0, -s * 1.0);
      g.quadraticCurveTo(s * 0.28, -s * 1.0, s * 0.3, -s * 0.75);
      g.lineTo(s * 0.26, -s * 0.16);
      g.closePath();
      g.fill();
      roundRect(g, -s * 0.3, -s * 0.66, s * 0.6, s * 0.07, s * 0.02, c[1]);
      // Eyes glow faintly (the only "alive" part).
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
      [-0.1, 0.1].forEach((fx) => {
        ellipse(g, fx * s, -s * 0.56, s * 0.05, s * 0.025, c[2]);
        ellipse(g, fx * s, -s * 0.56, s * 0.03, s * 0.015, hexA(c[3], 0.4 + 0.6 * pulse));
      });
      roundRect(g, -s * 0.04, -s * 0.52, s * 0.08, s * 0.16, s * 0.02, c[1]);
      roundRect(g, -s * 0.12, -s * 0.3, s * 0.24, s * 0.04, s * 0.02, c[2]);
      line(g, s * 0.12, -s * 0.95, s * 0.2, -s * 0.8, s * 0.015, c[2]);
      line(g, s * 0.2, -s * 0.8, s * 0.15, -s * 0.7, s * 0.015, c[2]);
      ellipse(g, -s * 0.18, -s * 0.88, s * 0.08, s * 0.05, 'rgba(70, 140, 110, 0.5)');
    },
    // A cluster of pointed crystal columns on a dark rock, each slowly
    // shifting between teal and violet, with a glint that climbs one of them.
    crystalCluster(g, s, t, c, look) {
      halo(g, 0, -s * 0.5, s * 0.75, look.glow, t * 0.6, 0.55);
      shadow(g, s * 0.6, s);
      // [x, height, width, lean] -- tallest in the middle, smaller ones leaning out.
      const cols = [[-0.36, 0.42, 0.13, -0.32], [0.38, 0.5, 0.14, 0.34], [-0.16, 0.72, 0.16, -0.12], [0.16, 0.62, 0.15, 0.16], [0, 0.98, 0.19, 0.02]];
      cols.forEach(([fx, fh, fw, lean], i) => {
        const mix = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.3);
        const col = mixHex(c[2], c[3], mix);
        g.save();
        g.translate(fx * s, -s * 0.12);
        g.rotate(lean);
        const hw = fw * s / 2, h = fh * s, tip = fw * s * 0.9;
        // Two faces (lit left, shaded right) and a pointed tip.
        poly(g, [[-hw, 0], [-hw, -h + tip], [0, -h], [0, 0]], hexA(col, 0.92));
        poly(g, [[0, 0], [0, -h], [hw, -h + tip], [hw, 0]], hexA(mixHex(col, c[1], 0.35), 0.92));
        line(g, -hw * 0.45, -h * 0.15, -hw * 0.45, -h + tip * 1.2, s * 0.012, hexA(c[4], 0.55));
        g.restore();
      });
      // Dark rock the crystals grow out of.
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(-s * 0.55, 0);
      g.quadraticCurveTo(-s * 0.5, -s * 0.2, -s * 0.2, -s * 0.18);
      g.quadraticCurveTo(0, -s * 0.26, s * 0.22, -s * 0.17);
      g.quadraticCurveTo(s * 0.5, -s * 0.2, s * 0.55, 0);
      g.closePath();
      g.fill();
      ellipse(g, -s * 0.25, -s * 0.1, s * 0.12, s * 0.035, hexA(c[4], 0.08));
      // A glint travelling up the tall crystal every few seconds.
      const ph = (t * 0.25) % 1;
      if (ph < 0.5) {
        const k = ph / 0.5;
        const gy = -s * 0.12 - k * s * 0.85;
        const r = s * 0.06 * Math.sin(k * Math.PI);
        g.fillStyle = hexA(c[4], 0.9);
        g.beginPath();
        g.moveTo(-s * 0.02, gy - r); g.lineTo(-s * 0.02 + r * 0.25, gy); g.lineTo(-s * 0.02, gy + r); g.lineTo(-s * 0.02 - r * 0.25, gy);
        g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(-s * 0.02 - r, gy); g.lineTo(-s * 0.02, gy + r * 0.25); g.lineTo(-s * 0.02 + r, gy); g.lineTo(-s * 0.02, gy - r * 0.25);
        g.closePath(); g.fill();
      }
    },

    // ----- 한정 소품 (도전과제 보상) -----
    anglerDoll(g, s, t, c) {
      shadow(g, s * 0.35, s);
      // A little fisher on a stool, rod over the shoulder, line bobbing.
      roundRect(g, -s * 0.2, -s * 0.22, s * 0.4, s * 0.22, s * 0.03, c[3]);
      roundRect(g, -s * 0.2, -s * 0.62, s * 0.4, s * 0.42, s * 0.1, c[1]);
      ellipse(g, 0, -s * 0.74, s * 0.15, s * 0.15, c[2]);
      g.fillStyle = c[0];
      g.beginPath();
      g.ellipse(0, -s * 0.82, s * 0.26, s * 0.06, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(0, -s * 0.86, s * 0.15, s * 0.1, 0, Math.PI, 0);
      g.fill();
      ellipse(g, -s * 0.05, -s * 0.74, s * 0.02, s * 0.02, '#3a2a1a');
      ellipse(g, s * 0.06, -s * 0.74, s * 0.02, s * 0.02, '#3a2a1a');
      line(g, s * 0.12, -s * 0.45, s * 0.7, -s * 1.0, s * 0.03, c[3]);
      const bob = Math.sin(t * 1.8) * s * 0.04;
      g.strokeStyle = 'rgba(255,255,255,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(s * 0.7, -s * 1.0);
      g.lineTo(s * 0.72, -s * 0.35 + bob);
      g.stroke();
      ellipse(g, s * 0.72, -s * 0.33 + bob, s * 0.04, s * 0.05, '#ff5a4a');
    },
    bottle(g, s, t, c) {
      shadow(g, s * 0.8, s);
      g.save();
      g.translate(0, -s * 0.3);
      g.rotate(-0.25);
      g.globalAlpha *= 0.85;
      roundRect(g, -s * 0.6, -s * 0.28, s * 0.9, s * 0.56, s * 0.24, c[0]);
      roundRect(g, s * 0.26, -s * 0.13, s * 0.3, s * 0.26, s * 0.06, c[1]);
      g.globalAlpha /= 0.85;
      roundRect(g, s * 0.52, -s * 0.1, s * 0.12, s * 0.2, s * 0.03, c[3]);
      // The rolled letter inside.
      g.save();
      g.rotate(0.15);
      roundRect(g, -s * 0.4, -s * 0.11, s * 0.55, s * 0.2, s * 0.08, c[2]);
      line(g, -s * 0.3, 0, s * 0.05, 0, s * 0.015, 'rgba(160, 60, 50, 0.7)');
      g.restore();
      ellipse(g, -s * 0.3, -s * 0.16, s * 0.15, s * 0.04, 'rgba(255,255,255,0.4)');
      g.restore();
    },
    fishingBoat(g, s, t, c) {
      shadow(g, s * 0.9, s);
      const rock = Math.sin(t * 1.2) * 0.04;
      g.save();
      g.rotate(rock);
      g.fillStyle = c[1];
      g.beginPath();
      g.moveTo(-s * 0.95, -s * 0.45);
      g.lineTo(s * 0.95, -s * 0.45);
      g.quadraticCurveTo(s * 0.7, 0, 0, -s * 0.02);
      g.quadraticCurveTo(-s * 0.7, 0, -s * 0.95, -s * 0.45);
      g.fill();
      roundRect(g, -s * 0.95, -s * 0.5, s * 1.9, s * 0.08, s * 0.03, c[0]);
      line(g, -s * 0.8, -s * 0.28, s * 0.8, -s * 0.28, s * 0.04, c[2]);
      roundRect(g, -s * 0.15, -s * 0.85, s * 0.5, s * 0.37, s * 0.05, c[0]);
      roundRect(g, -s * 0.05, -s * 0.76, s * 0.14, s * 0.12, s * 0.02, '#8fd0e8');
      roundRect(g, s * 0.15, -s * 0.76, s * 0.14, s * 0.12, s * 0.02, '#8fd0e8');
      line(g, -s * 0.55, -s * 0.5, -s * 0.55, -s * 1.1, s * 0.035, c[3]);
      poly(g, [[-s * 0.55, -s * 1.1], [-s * 0.3, -s * 1.02], [-s * 0.55, -s * 0.95]], c[2]);
      g.restore();
    },
    goldTrophy(g, s, t, c, look) {
      halo(g, 0, -s * 0.6, s * 0.6, look.glow, t, 0.8);
      shadow(g, s * 0.35, s);
      roundRect(g, -s * 0.28, -s * 0.12, s * 0.56, s * 0.12, s * 0.02, '#5a3a1a');
      roundRect(g, -s * 0.2, -s * 0.2, s * 0.4, s * 0.09, s * 0.02, c[2]);
      roundRect(g, -s * 0.05, -s * 0.42, s * 0.1, s * 0.24, s * 0.02, c[1]);
      g.fillStyle = c[0];
      g.beginPath();
      g.moveTo(-s * 0.32, -s * 0.95);
      g.lineTo(s * 0.32, -s * 0.95);
      g.quadraticCurveTo(s * 0.3, -s * 0.45, 0, -s * 0.42);
      g.quadraticCurveTo(-s * 0.3, -s * 0.45, -s * 0.32, -s * 0.95);
      g.fill();
      g.strokeStyle = c[1];
      g.lineWidth = s * 0.05;
      [-1, 1].forEach((side) => {
        g.beginPath();
        g.arc(side * s * 0.32, -s * 0.78, s * 0.12, side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : Math.PI * 1.5);
        g.stroke();
      });
      ellipse(g, -s * 0.12, -s * 0.8, s * 0.05, s * 0.12, 'rgba(255,255,255,0.45)');
      // A fish emblem.
      ellipse(g, s * 0.02, -s * 0.72, s * 0.1, s * 0.05, c[2]);
      poly(g, [[s * 0.1, -s * 0.72], [s * 0.18, -s * 0.78], [s * 0.18, -s * 0.66]], c[2]);
    },
    rainbowShell(g, s, t, c, look) {
      halo(g, 0, -s * 0.45, s * 0.7, look.glow, t, 0.35);
      shadow(g, s * 0.75, s);
      // A scallop whose ribs each take a colour, shimmering in turn.
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
        const col = c[(i + Math.floor(t * 1.5)) % c.length];
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, -s * 0.1);
        g.arc(0, -s * 0.1, s * 0.8, a0, a1);
        g.closePath();
        g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = s * 0.02;
      for (let i = 1; i < n; i++) {
        const a = Math.PI + (i / n) * Math.PI;
        g.beginPath();
        g.moveTo(0, -s * 0.1);
        g.lineTo(Math.cos(a) * s * 0.8, -s * 0.1 + Math.sin(a) * s * 0.8);
        g.stroke();
      }
      roundRect(g, -s * 0.2, -s * 0.14, s * 0.4, s * 0.14, s * 0.05, c[4]);
      ellipse(g, 0, -s * 0.2, s * 0.08, s * 0.06, '#ffffff');
    },
    imugiStatue(g, s, t, c, look) {
      halo(g, 0, -s * 0.55, s * 0.9, look.glow, t);
      shadow(g, s * 0.55, s);
      roundRect(g, -s * 0.45, -s * 0.14, s * 0.9, s * 0.14, s * 0.03, c[2]);
      // A golden serpent coiled up a pillar, head raised with a pearl.
      roundRect(g, -s * 0.07, -s * 0.8, s * 0.14, s * 0.66, s * 0.04, c[1]);
      g.strokeStyle = c[0];
      g.lineWidth = s * 0.13;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-s * 0.36, -s * 0.2);
      g.bezierCurveTo(s * 0.4, -s * 0.28, s * 0.35, -s * 0.5, -s * 0.2, -s * 0.5);
      g.bezierCurveTo(-s * 0.45, -s * 0.52, -s * 0.3, -s * 0.78, s * 0.1, -s * 0.8);
      g.bezierCurveTo(s * 0.35, -s * 0.82, s * 0.3, -s * 1.0, s * 0.12, -s * 1.05);
      g.stroke();
      g.strokeStyle = c[1];
      g.lineWidth = s * 0.03;
      g.stroke();
      ellipse(g, s * 0.1, -s * 1.08, s * 0.13, s * 0.09, c[0]);
      ellipse(g, s * 0.14, -s * 1.1, s * 0.02, s * 0.02, c[3]);
      line(g, s * 0.02, -s * 1.12, -s * 0.1, -s * 1.22, s * 0.025, c[1]);
      line(g, s * 0.08, -s * 1.15, s * 0.0, -s * 1.28, s * 0.025, c[1]);
      const pulse = 0.8 + 0.2 * Math.sin(t * 2.5);
      ellipse(g, s * 0.28, -s * 1.0, s * 0.07 * pulse, s * 0.07 * pulse, '#fff6d0');
    }
  };

  function paint(g, look, x, y, s, t, alpha) {
    const fn = look && P[look.kind];
    if (!fn || s <= 0) return;
    g.save();
    g.translate(x, y);
    g.globalAlpha *= alpha == null ? 1 : alpha;
    fn(g, s, t || 0, look.colors || [], look);
    g.restore();
  }

  window.AquariumProps = { paint, KINDS: Object.keys(P) };
})();
