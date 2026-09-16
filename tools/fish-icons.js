// Parametric fish icon generator -> icons/fish/<tier>/<id>.svg (48x32, fish faces left).
// Run: node tools/fish-icons.js  -- regenerates every fish + 꽝 icon for all three
// 낚시터 and prunes SVGs of species that are no longer in the roster.
// Each species picks a body silhouette, tail, dorsal fin, pattern, extras and a
// two-tone palette so they read as different animals at 24-34px. 특급 add
// halo/sheen/teeth/lure/horns/sparkles; most 전설 are drawn by hand below so
// the nine of them read as clearly different creatures.
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..'); // repo root
const f = (n) => +n.toFixed(2);

// ---- body silhouettes: return { d, nx, tx, mx, th, bh, tbh, cy, nh } ----
function body(shape, s) {
  const cy = 16.5;
  const P = {
    slender: { nx: 7, tx: 33, mx: 19, th: 5.2, bh: 4.6, tbh: 2.2, nh: 0 },
    deep:    { nx: 8, tx: 32, mx: 19, th: 8.2, bh: 7.4, tbh: 2.6, nh: 0 },
    eel:     { nx: 4, tx: 38, mx: 16, th: 3.4, bh: 3.2, tbh: 1.8, nh: 0 },
    goby:    { nx: 6, tx: 34, mx: 14, th: 6.2, bh: 5.4, tbh: 1.9, nh: 1.6 },
    flat:    { nx: 5, tx: 34, mx: 15, th: 5.6, bh: 5.2, tbh: 2.2, nh: 3.2 },
    torpedo: { nx: 6, tx: 34, mx: 20, th: 6.4, bh: 5.6, tbh: 2.4, nh: 0 },
    round:   { nx: 9, tx: 31, mx: 19, th: 9, bh: 8.4, tbh: 2.4, nh: 0 },
    blob:    { nx: 7, tx: 30, mx: 16, th: 9.5, bh: 8.8, tbh: 2.2, nh: 4.5 }
  }[shape];
  const k = (s || 1) * 1.12; // global presence bump: fills the 48x32 box
  const cx = 22;
  const nx = cx + (P.nx - cx) * k, tx = cx + (P.tx - cx) * k, mx = cx + (P.mx - cx) * k;
  const th = P.th * k, bh = P.bh * k, tbh = P.tbh * k, nh = P.nh * k;
  const d = nh
    ? `M${f(nx)},${f(cy - nh)} C${f(nx + (mx - nx) * 0.35)},${f(cy - th * 1.05)} ${f(mx - (mx - nx) * 0.25)},${f(cy - th)} ${f(mx)},${f(cy - th)} C${f(mx + (tx - mx) * 0.45)},${f(cy - th)} ${f(tx - (tx - mx) * 0.2)},${f(cy - tbh)} ${f(tx)},${f(cy - tbh)} L${f(tx)},${f(cy + tbh)} C${f(tx - (tx - mx) * 0.2)},${f(cy + tbh)} ${f(mx + (tx - mx) * 0.45)},${f(cy + bh)} ${f(mx)},${f(cy + bh)} C${f(mx - (mx - nx) * 0.25)},${f(cy + bh)} ${f(nx + (mx - nx) * 0.35)},${f(cy + bh * 1.05)} ${f(nx)},${f(cy + nh)} Q${f(nx - 1.5)},${f(cy)} ${f(nx)},${f(cy - nh)} Z`
    : `M${f(nx)},${f(cy)} C${f(nx + (mx - nx) * 0.3)},${f(cy - th * 1.1)} ${f(mx - (mx - nx) * 0.3)},${f(cy - th)} ${f(mx)},${f(cy - th)} C${f(mx + (tx - mx) * 0.45)},${f(cy - th)} ${f(tx - (tx - mx) * 0.2)},${f(cy - tbh)} ${f(tx)},${f(cy - tbh)} L${f(tx)},${f(cy + tbh)} C${f(tx - (tx - mx) * 0.2)},${f(cy + tbh)} ${f(mx + (tx - mx) * 0.45)},${f(cy + bh)} ${f(mx)},${f(cy + bh)} C${f(mx - (mx - nx) * 0.3)},${f(cy + bh)} ${f(nx + (mx - nx) * 0.3)},${f(cy + bh * 1.1)} ${f(nx)},${f(cy)} Z`;
  return { d, nx, tx, mx, th, bh, tbh, cy, nh };
}
function tail(type, b, len) {
  const { tx, tbh, cy } = b; const tl = len || 8;
  switch (type) {
    case 'fork': return `M${f(tx - 0.5)},${f(cy - tbh)} L${f(tx + tl)},${f(cy - tbh * 2.4)} L${f(tx + tl * 0.5)},${f(cy)} L${f(tx + tl)},${f(cy + tbh * 2.4)} L${f(tx - 0.5)},${f(cy + tbh)} Z`;
    case 'round': return `M${f(tx - 0.5)},${f(cy - tbh)} Q${f(tx + tl * 1.15)},${f(cy - tbh * 1.9)} ${f(tx + tl)},${f(cy)} Q${f(tx + tl * 1.15)},${f(cy + tbh * 1.9)} ${f(tx - 0.5)},${f(cy + tbh)} Z`;
    case 'truncate': return `M${f(tx - 0.5)},${f(cy - tbh)} L${f(tx + tl)},${f(cy - tbh * 2)} L${f(tx + tl * 0.9)},${f(cy)} L${f(tx + tl)},${f(cy + tbh * 2)} L${f(tx - 0.5)},${f(cy + tbh)} Z`;
    case 'pointed': return `M${f(tx - 0.5)},${f(cy - tbh)} Q${f(tx + tl * 0.7)},${f(cy - tbh * 0.9)} ${f(tx + tl)},${f(cy)} Q${f(tx + tl * 0.7)},${f(cy + tbh * 0.9)} ${f(tx - 0.5)},${f(cy + tbh)} Z`;
    case 'fan': return `M${f(tx - 0.5)},${f(cy - tbh)} Q${f(tx + tl * 0.9)},${f(cy - tbh * 3)} ${f(tx + tl)},${f(cy - tbh * 0.4)} Q${f(tx + tl * 0.6)},${f(cy)} ${f(tx + tl)},${f(cy + tbh * 0.4)} Q${f(tx + tl * 0.9)},${f(cy + tbh * 3)} ${f(tx - 0.5)},${f(cy + tbh)} Z`;
    case 'veil': return `M${f(tx - 0.5)},${f(cy - tbh)} C${f(tx + tl * 0.6)},${f(cy - tbh * 4)} ${f(tx + tl * 1.3)},${f(cy - tbh * 2.6)} ${f(tx + tl * 1.15)},${f(cy - tbh * 0.3)} C${f(tx + tl * 1.3)},${f(cy + tbh * 2.6)} ${f(tx + tl * 0.6)},${f(cy + tbh * 4)} ${f(tx - 0.5)},${f(cy + tbh)} Z`;
    case 'none': return '';
  }
  return '';
}
function dorsal(type, b) {
  const { mx, th, cy, nx, tx } = b; const y = cy - th + 0.8;
  switch (type) {
    case 'short': return `M${f(mx - 4)},${f(y + 0.6)} L${f(mx - 1)},${f(y - 4.6)} L${f(mx + 6)},${f(y + 0.2)} Z`;
    case 'tall': return `M${f(mx - 5)},${f(y + 0.8)} L${f(mx - 3)},${f(y - 6.5)} L${f(mx + 7)},${f(y + 0.4)} Z`;
    case 'long': { const x0 = nx + (mx - nx) * 0.7, x1 = tx - 3; return `M${f(x0)},${f(y + 1)} Q${f((x0 + x1) / 2)},${f(y - 4.2)} ${f(x1)},${f(y + 0.4)} Z`; }
    case 'spiny': { let d = `M${f(mx - 6)},${f(y + 1)}`; for (let i = 0; i < 5; i++) { const x = mx - 6 + i * 2.6; d += ` L${f(x + 1.3)},${f(y - 4.4 + i * 0.4)} L${f(x + 2.6)},${f(y + 0.2)}`; } return d + ' Z'; }
    case 'back': return `M${f(mx + 2)},${f(y + 0.6)} L${f(mx + 5)},${f(y - 3.4)} L${f(mx + 10)},${f(y + 0.4)} Z`;
    case 'sail': { const x0 = mx - 6, x1 = tx - 2; return `M${f(x0)},${f(y + 1)} C${f(x0 + 2)},${f(y - 8)} ${f(mx + 4)},${f(y - 7)} ${f(x1)},${f(y + 0.4)} Z`; }
  }
  return '';
}
function pattern(type, b, color, extra) {
  const { nx, tx, mx, th, bh, cy } = b; const out = [];
  switch (type) {
    case 'bars': for (let i = 0; i < 5; i++) { const x = mx - 5 + i * ((tx - 2 - (mx - 5)) / 4); out.push(`<rect x="${f(x)}" y="${f(cy - th)}" width="2.2" height="${f(th + bh)}" fill="${color}" opacity="${extra && extra.a || 0.32}"/>`); } break;
    case 'parr': for (let i = 0; i < 6; i++) { const x = nx + 9 + i * ((tx - 3 - nx - 9) / 5); out.push(`<ellipse cx="${f(x)}" cy="${f(cy + 0.3)}" rx="1.3" ry="${f(th * 0.55)}" fill="${color}" opacity="0.38"/>`); } break;
    case 'spots': [[0.32, -0.45], [0.5, 0.35], [0.62, -0.3], [0.78, 0.2], [0.42, 0.7], [0.7, -0.65], [0.88, -0.2], [0.24, 0.3]].forEach(([fx, fy]) => { out.push(`<circle cx="${f(nx + (tx - nx) * fx)}" cy="${f(cy + fy * th * 0.8)}" r="${extra && extra.spotR || 1.3}" fill="${color}" opacity="${extra && extra.spotA || 0.55}"/>`); }); break;
    case 'lateral': out.push(`<path d="M${f(nx + 7)},${f(cy + 0.4)} Q${f(mx)},${f(cy - 0.6)} ${f(tx)},${f(cy + 0.2)}" stroke="${color}" stroke-width="${extra && extra.w || 1.3}" fill="none" opacity="0.6" stroke-linecap="round"/>`); break;
    case 'band': out.push(`<path d="M${f(nx + 5)},${f(cy + 0.5)} Q${f(mx)},${f(cy - 1.2)} ${f(tx)},${f(cy)}" stroke="${color}" stroke-width="${f(th * 0.7)}" fill="none" opacity="0.4" stroke-linecap="round"/>`); break;
    case 'blotches': [[0.35, -0.3, 3, 2], [0.55, 0.4, 3.4, 2.2], [0.74, -0.35, 2.8, 1.9], [0.2, 0.45, 2.2, 1.6], [0.88, 0.25, 2, 1.5]].forEach(([fx, fy, rx, ry]) => { out.push(`<ellipse cx="${f(nx + (tx - nx) * fx)}" cy="${f(cy + fy * th)}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${extra && extra.a || 0.42}"/>`); }); break;
    case 'saddles': [[0.3, 5], [0.52, 6], [0.74, 5], [0.92, 3.5]].forEach(([fx, w]) => { const x = nx + (tx - nx) * fx; out.push(`<path d="M${f(x - w / 2)},${f(cy - th - 1)} Q${f(x)},${f(cy + th * 0.1)} ${f(x + w / 2)},${f(cy - th - 1)} Z" fill="${color}" opacity="0.45"/>`); }); break;
    case 'koi': out.push(`<ellipse cx="${f(nx + (tx - nx) * 0.3)}" cy="${f(cy - th * 0.35)}" rx="5" ry="4" fill="${color}"/>`, `<ellipse cx="${f(nx + (tx - nx) * 0.68)}" cy="${f(cy + th * 0.2)}" rx="6" ry="4.4" fill="${color}"/>`, `<ellipse cx="${f(nx + (tx - nx) * 0.52)}" cy="${f(cy + th * 0.7)}" rx="2.4" ry="1.8" fill="#2b2b2b" opacity="0.7"/>`); break;
    case 'shoulder': out.push(`<ellipse cx="${f(nx + 9)}" cy="${f(cy - 1)}" rx="2.4" ry="2.4" fill="${color}" opacity="0.85"/>`); break;
    case 'stripe-pink': out.push(`<path d="M${f(mx)},${f(cy + 0.5)} L${f(tx)},${f(cy - 0.5)}" stroke="${color}" stroke-width="1.8" opacity="0.8" stroke-linecap="round"/>`); break;
    case 'scales': { for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const x = nx + 10 + i * 3.6 + (r % 2) * 1.8, y = cy - th * 0.55 + r * (th * 0.55); if (x < tx - 2) out.push(`<path d="M${f(x)},${f(y)} q1.8,2.2 3.6,0" stroke="${color}" stroke-width="0.7" fill="none" opacity="0.45"/>`); } break; }
    case 'glowdots': [[0.28, -0.2], [0.42, 0.3], [0.56, -0.35], [0.7, 0.25], [0.84, -0.1], [0.35, 0.65], [0.62, 0.7]].forEach(([fx, fy]) => { out.push(`<circle cx="${f(nx + (tx - nx) * fx)}" cy="${f(cy + fy * th * 0.8)}" r="${extra && extra.r || 1}" fill="${color}" opacity="0.95"/>`); }); break;
    case 'bellyglow': for (let i = 0; i < 7; i++) { const x = nx + 8 + i * ((tx - 4 - nx - 8) / 6); out.push(`<circle cx="${f(x)}" cy="${f(cy + bh * 0.62)}" r="0.9" fill="${color}" opacity="0.95"/>`); } break;
    case 'facets': out.push(`<path d="M${f(nx + 8)},${f(cy - th * 0.6)} L${f(mx - 2)},${f(cy + bh * 0.5)} L${f(mx + 5)},${f(cy - th * 0.7)} L${f(tx - 4)},${f(cy + bh * 0.4)} M${f(nx + 12)},${f(cy + bh * 0.7)} L${f(mx + 1)},${f(cy - th * 0.2)} L${f(tx - 7)},${f(cy + bh * 0.8)}" stroke="${color}" stroke-width="0.8" fill="none" opacity="0.7"/>`); break;
    case 'segments': for (let i = 0; i < 6; i++) { const x = nx + 6 + i * ((tx - nx - 6) / 6); out.push(`<path d="M${f(x)},${f(cy - th * 0.95)} Q${f(x + 1.5)},${f(cy)} ${f(x)},${f(cy + bh * 0.95)}" stroke="${color}" stroke-width="0.9" fill="none" opacity="0.5"/>`); } break;
  }
  return out.join('');
}
function barbels(b, color, n, opt) {
  const { nx, cy, nh } = b; const y = cy + (nh || 1.5); const out = [];
  const L = (opt && opt.len) || 1;
  const arr = n === 3 ? [[-4, 5, 0], [-2, 7, 1.5], [0.5, 6, 3]] : [[-3.5, 5.5, 0.5], [-1, 6.5, 2.2]];
  arr.forEach(([dx, dy, ox]) => out.push(`<path d="M${f(nx + 1.5 + ox)},${f(y)} q${f(dx * L)},${f(dy * 0.4 * L)} ${f(dx * 1.6 * L)},${f(dy * L)}" stroke="${color}" stroke-width="${(opt && opt.w) || 1}" fill="none" stroke-linecap="round"/>`));
  return out.join('');
}
function sparkles(list, color) {
  return list.map(([x, y, s]) => `<path d="M${x},${y - s} L${x + s * 0.3},${y - s * 0.3} L${x + s},${y} L${x + s * 0.3},${y + s * 0.3} L${x},${y + s} L${x - s * 0.3},${y + s * 0.3} L${x - s},${y} L${x - s * 0.3},${y - s * 0.3} Z" fill="${color}"/>`).join('');
}
function fish(sp) {
  const b = body(sp.shape, sp.scale);
  const { nx, mx, th, bh, cy, tx } = b;
  const base = sp.base, belly = sp.belly, fin = sp.fin || sp.base, dark = sp.dark || '#1a2a2e', outline = sp.outline || dark;
  const eyeX = nx + (sp.shape === 'eel' ? 4 : 6) * (sp.scale || 1) + (b.nh ? 1.5 : 0) + (sp.eyeDx || 0), eyeY = cy - (b.nh ? 1.2 : 2) * (sp.scale || 1) + (sp.eyeDy || 0);
  const eyeR = sp.bigEye ? 2.6 : (sp.eyeR || 2);
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">`);
  const defs = [`<clipPath id="b"><path d="${b.d}"/></clipPath>`];
  if (sp.halo) defs.push(`<radialGradient id="halo"><stop offset="0" stop-color="${sp.halo}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${sp.halo}" stop-opacity="0.18"/><stop offset="1" stop-color="${sp.halo}" stop-opacity="0"/></radialGradient>`);
  if (sp.sheen) defs.push(`<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.05"/><stop offset="0.7" stop-color="${sp.sheen}" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.4"/></linearGradient>`);
  parts.push(`<defs>${defs.join('')}</defs>`);
  // Halo stays inside the 48x32 box (it fades to 0 at its rim), otherwise the
  // viewBox clips it into a visible rectangle wherever the icon is shown large.
  if (sp.halo) parts.push(`<ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>`);
  if (sp.aura) parts.push(`<path d="${b.d}" fill="none" stroke="${sp.aura}" stroke-width="3" opacity="0.35"/>`);
  if (sp.under) parts.push(sp.under); // raw SVG drawn behind the body
  if (sp.bodyOpacity) parts.push(`<g opacity="${sp.bodyOpacity}">`);
  // tail + fins behind the body
  if (sp.tail !== 'none') parts.push(`<path d="${tail(sp.tail, b, sp.tailLen)}" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round" opacity="${sp.finA || 0.95}"/>`);
  if (sp.dorsal && sp.dorsal !== 'none') parts.push(`<path d="${dorsal(sp.dorsal, b)}" fill="${sp.dorsalColor || fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round" opacity="${sp.finA || 1}"/>`);
  if (sp.anal) parts.push(`<path d="M${f(mx + 1)},${f(cy + bh - 0.6)} L${f(mx + 4)},${f(cy + bh + 3.2)} L${f(tx - 3)},${f(cy + b.tbh + 0.2)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.analTall) parts.push(`<path d="M${f(mx - 5)},${f(cy + bh - 0.8)} L${f(mx - 3)},${f(cy + bh + 7)} L${f(mx + 7)},${f(cy + bh - 0.4)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.analLong) parts.push(`<path d="M${f(mx - 2)},${f(cy + bh - 0.8)} Q${f((mx + tx) / 2)},${f(cy + bh + 3.6)} ${f(tx - 1)},${f(cy + b.tbh)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.pelvic !== false) parts.push(`<path d="M${f(nx + 11)},${f(cy + bh - 1.2)} L${f(nx + 13)},${f(cy + bh + 2)} L${f(nx + 16)},${f(cy + bh - 1)} Z" fill="${fin}" opacity="0.9"/>`);
  if (sp.horns) parts.push(`<path d="M${f(nx + 9)},${f(cy - th + 1)} C${f(nx + 6)},${f(cy - th - 5)} ${f(nx + 10)},${f(cy - th - 8)} ${f(nx + 13)},${f(cy - th - 6)} C${f(nx + 11)},${f(cy - th - 4)} ${f(nx + 11)},${f(cy - th - 1)} ${f(nx + 12)},${f(cy - th + 1)} Z M${f(nx + 15)},${f(cy - th + 0.5)} C${f(nx + 13)},${f(cy - th - 4)} ${f(nx + 16)},${f(cy - th - 7)} ${f(nx + 19)},${f(cy - th - 5)} C${f(nx + 17)},${f(cy - th - 3)} ${f(nx + 17)},${f(cy - th - 1)} ${f(nx + 18)},${f(cy - th + 0.5)} Z" fill="${sp.horns}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.stilts) parts.push(`<path d="M${f(nx + 12)},${f(cy + bh - 1)} L${f(nx + 9)},${f(cy + bh + 9)} M${f(tx - 6)},${f(cy + b.tbh)} L${f(tx - 3)},${f(cy + bh + 9)}" stroke="${outline}" stroke-width="1" stroke-linecap="round"/>`);
  // body: belly colour, then base colour over the upper part (clipped)
  parts.push(`<path d="${b.d}" fill="${belly}"/>`);
  parts.push(`<g clip-path="url(#b)"><rect x="0" y="0" width="48" height="${f(cy + bh * 0.28)}" fill="${base}"/>`);
  parts.push(`<rect x="0" y="0" width="48" height="${f(cy - th * 0.45)}" fill="${sp.back || dark}" opacity="${sp.backA == null ? 0.22 : sp.backA}"/>`);
  if (sp.pattern) parts.push(pattern(sp.pattern, b, sp.patternColor || dark, sp.patternExtra));
  if (sp.pattern2) parts.push(pattern(sp.pattern2, b, sp.pattern2Color || dark, sp.pattern2Extra));
  if (sp.sheen) parts.push(`<rect x="0" y="0" width="48" height="32" fill="url(#sheen)"/>`);
  parts.push(`</g>`);
  parts.push(`<path d="${b.d}" fill="none" stroke="${outline}" stroke-width="0.8" opacity="0.55"/>`);
  if (sp.gill !== false) parts.push(`<path d="M${f(nx + 9)},${f(cy - th * 0.6)} Q${f(nx + 7.5)},${f(cy)} ${f(nx + 9.5)},${f(cy + bh * 0.6)}" stroke="${outline}" stroke-width="0.8" fill="none" opacity="0.45"/>`);
  if (sp.pectoral !== false) parts.push(`<path d="M${f(nx + 10)},${f(cy + 0.5)} Q${f(nx + 15.5)},${f(cy + 1.5)} ${f(nx + 14)},${f(cy + 4.5)} Q${f(nx + 11)},${f(cy + 4)} ${f(nx + 10)},${f(cy + 0.5)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" opacity="0.95"/>`);
  if (sp.bodyOpacity) parts.push(`</g>`);
  parts.push(`<circle cx="${f(eyeX)}" cy="${f(eyeY)}" r="${eyeR}" fill="${sp.sclera || '#f6f4ea'}"/><circle cx="${f(eyeX + 0.3)}" cy="${f(eyeY)}" r="${f(eyeR * 0.55)}" fill="${sp.eye || '#0d161a'}"/><circle cx="${f(eyeX - 0.5)}" cy="${f(eyeY - 0.7)}" r="0.5" fill="#fff"/>`);
  if (sp.mouth === 'big') {
    const my = cy + (b.nh || 2) * 0.2;
    parts.push(`<path d="M${f(nx + 0.5)},${f(my - 1)} Q${f(nx + 6)},${f(my + 1.5)} ${f(nx + 12)},${f(my + 0.5)}" stroke="${outline}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`);
    for (let i = 0; i < 5; i++) { const x = nx + 1.5 + i * 2.3; parts.push(`<path d="M${f(x)},${f(my - 0.4 + i * 0.35)} l0.8,2.6 l0.8,-2.6 Z" fill="#fbf7ff"/>`); }
  } else if (sp.mouth !== 'none') parts.push(`<path d="M${f(nx + 0.6)},${f(cy + (b.nh ? b.nh * 0.3 : 0.8))} l${sp.mouth === 'up' ? '2.4,-1.6' : '2.6,0.9'}" stroke="${outline}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`);
  if (sp.barbels) parts.push(barbels(b, sp.barbelColor || outline, sp.barbels, sp.barbelOpt));
  if (sp.lure) parts.push(`<path d="M${f(nx + 9)},${f(cy - th + 1)} C${f(nx + 8)},${f(cy - th - 6)} ${f(nx + 2)},${f(cy - th - 7)} ${f(nx - 1)},${f(cy - th - 3)}" stroke="${outline}" stroke-width="1" fill="none" stroke-linecap="round"/><circle cx="${f(nx - 1)}" cy="${f(cy - th - 2.5)}" r="4" fill="${sp.lure}" opacity="0.35"/><circle cx="${f(nx - 1)}" cy="${f(cy - th - 2.5)}" r="2" fill="${sp.lure}"/><circle cx="${f(nx - 1.6)}" cy="${f(cy - th - 3.1)}" r="0.7" fill="#ffffff"/>`);
  if (sp.bill) parts.push(`<path d="M${f(nx + 1)},${f(cy - 1)} L${f(nx - 7)},${f(cy - 3.2)}" stroke="${outline}" stroke-width="1.6" stroke-linecap="round"/>`);
  if (sp.beak) parts.push(`<path d="M${f(nx + 1)},${f(cy + 1.2)} L${f(nx - 6)},${f(cy + 2.6)}" stroke="${sp.beak}" stroke-width="1.4" stroke-linecap="round"/>`);
  if (sp.tentacles) parts.push([[-1, 4], [-3, 6.5], [-4, 2], [-2.5, 8.5], [0.5, 7.5]].map(([dx, dy], i) => `<path d="M${f(nx + 2)},${f(cy + 1 + i * 0.6)} q${f(dx * 1.4)},${f(dy * 0.5)} ${f(dx * 2.2)},${f(dy)}" stroke="${sp.tentacles}" stroke-width="${sp.tentacleW || 1.5}" fill="none" stroke-linecap="round"/>`).join(''));
  if (sp.gillSlits) parts.push([0, 2, 4, 6].map((d) => `<path d="M${f(nx + 11 + d)},${f(cy - th * 0.35)} q-0.8,${f(th * 0.5)} 0,${f(th * 0.95)}" stroke="${outline}" stroke-width="0.9" fill="none" opacity="0.7"/>`).join(''));
  if (sp.overlay) parts.push(sp.overlay); // raw SVG drawn on top
  if (sp.sparkles) parts.push(sparkles(sp.sparkles, sp.sparkleColor || '#ffffff'));
  parts.push(`</svg>\n`);
  return parts.join('\n');
}

// ================= 호수 =================
const LAKE_COMMON = [
  { id: 'pale_chub', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'lateral', base: '#7fcf98', belly: '#f3e4ea', dark: '#245a3a', fin: '#bfe3cf' },
  { id: 'crucian_carp', shape: 'deep', tail: 'fork', dorsal: 'long', base: '#a7c46d', belly: '#ede6b6', dark: '#4d5e2a', back: '#5f7a33', backA: 0.35 },
  { id: 'medaka', shape: 'slender', tail: 'round', dorsal: 'back', base: '#b8e0a6', belly: '#f2f8e8', dark: '#4a6a3a', bigEye: true, scale: 0.72, mouth: 'up' },
  { id: 'loach', shape: 'eel', tail: 'round', dorsal: 'back', pattern: 'blotches', base: '#8a9c58', belly: '#e0d6a0', dark: '#4a4d24', barbels: 3, pelvic: false },
  { id: 'galgyeoni', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'band', base: '#74c48e', belly: '#dcf2e2', dark: '#1f4d33', patternColor: '#163a26', fin: '#d9784f', anal: true },
  { id: 'beodeulchi', shape: 'slender', tail: 'round', dorsal: 'short', pattern: 'spots', base: '#8ccc92', belly: '#e8f5e4', dark: '#3a5e34', patternExtra: { spotR: 1.1, spotA: 0.5 }, scale: 0.92 },
  { id: 'rosy_bitterling', shape: 'deep', tail: 'fork', dorsal: 'tall', pattern: 'stripe-pink', base: '#8fd9a8', belly: '#f6dfe9', dark: '#3d5a4a', patternColor: '#e0507f', fin: '#e79ab8', scale: 0.82 },
  { id: 'chamboongeo', shape: 'slender', tail: 'truncate', dorsal: 'short', pattern: 'lateral', pattern2: 'saddles', base: '#92cf8a', belly: '#e6f4dd', dark: '#2f5a2f', patternExtra: { w: 2 }, scale: 0.9 },
  { id: 'amur_goby', shape: 'goby', tail: 'round', dorsal: 'short', pattern: 'spots', base: '#8db98f', belly: '#e2ecd0', dark: '#3d5a3a', scale: 0.8, patternExtra: { spotR: 1.2, spotA: 0.45 } },
  { id: 'bluegill', shape: 'deep', tail: 'fork', dorsal: 'spiny', pattern: 'bars', pattern2: 'shoulder', base: '#7fb59a', belly: '#e8dfae', dark: '#2f4a3a', pattern2Color: '#1a2a24', scale: 0.88 }
];
const LAKE_RARE = [
  { id: 'mandarin_fish', shape: 'torpedo', tail: 'round', dorsal: 'spiny', pattern: 'blotches', base: '#79bdd8', belly: '#dcecf3', dark: '#1e4a63', patternColor: '#173d52' },
  { id: 'catfish', shape: 'flat', tail: 'round', dorsal: 'back', base: '#5a8ba6', belly: '#c3dae5', dark: '#1c3a4c', barbels: 3, analLong: true, pelvic: false },
  { id: 'snakehead', shape: 'eel', tail: 'round', dorsal: 'long', pattern: 'saddles', base: '#5d97b0', belly: '#c9dde6', dark: '#1a3b4c', analLong: true, scale: 1.05 },
  { id: 'largemouth_bass', shape: 'torpedo', tail: 'fork', dorsal: 'spiny', pattern: 'band', base: '#6fa9c4', belly: '#e6f1f5', dark: '#1f4a5a', patternColor: '#173a48', mouth: 'up', scale: 1.1, tailLen: 9 },
  { id: 'bagrid_catfish', shape: 'flat', tail: 'fork', dorsal: 'short', pattern: 'blotches', base: '#74b7d1', belly: '#d5e8ef', dark: '#1f4b60', barbels: 2, scale: 0.88 },
  { id: 'freshwater_eel', shape: 'eel', tail: 'pointed', dorsal: 'long', base: '#4a7c99', belly: '#b6d2e0', dark: '#16324a', pelvic: false, analLong: true, mouth: 'none' },
  { id: 'koi', shape: 'deep', tail: 'fan', dorsal: 'long', pattern: 'koi', base: '#e9f2f6', belly: '#fbfdfd', dark: '#5f7f8c', patternColor: '#ef8a48', barbels: 2, back: '#cfe1e8', backA: 0.5, tailLen: 9 }
];
const LAKE_EPIC = [
  { id: 'giant_catfish', shape: 'flat', tail: 'round', dorsal: 'back', pattern: 'blotches', base: '#7b52b0', belly: '#d9c8ef', dark: '#2f1a4e', patternColor: '#3a1f63', patternExtra: { a: 0.35 }, barbels: 3, barbelOpt: { len: 1.5, w: 1.3 }, analLong: true, pelvic: false, scale: 1.12, tailLen: 9, halo: '#c98cf0', eye: '#f5c542' },
  { id: 'platinum_koi', shape: 'deep', tail: 'veil', dorsal: 'sail', pattern: 'scales', base: '#eae8f4', belly: '#ffffff', dark: '#6f6a8f', patternColor: '#8f89b8', barbels: 2, back: '#d6d2ea', backA: 0.6, sheen: '#c9b8ff', tailLen: 10, scale: 1.02, halo: '#e6dcff', fin: '#f1eefb', finA: 0.85, sparkles: [[9, 6, 1.6], [41, 8, 1.2], [37, 27, 1.4]], sparkleColor: '#ffffff' },
  { id: 'black_dragon_catfish', shape: 'flat', tail: 'pointed', dorsal: 'spiny', base: '#2c1f44', belly: '#4b3a6b', dark: '#0d0718', back: '#1a1030', backA: 0.5, barbels: 2, barbelColor: '#d9b04c', barbelOpt: { len: 1.6, w: 1.5 }, horns: '#d9b04c', eye: '#ff3d3d', sclera: '#ffb3b3', analLong: true, pelvic: false, scale: 1.12, tailLen: 10, halo: '#6b3fa0', aura: '#8a5cc7' },
  { id: 'glowing_ayu', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'shoulder', base: '#e2c7f7', belly: '#fff6ff', dark: '#8a5fb5', patternColor: '#ffe27a', back: '#c9a7ec', backA: 0.5, fin: '#f3e4ff', finA: 0.8, anal: true, halo: '#e6b8ff', aura: '#f4dcff', sparkles: [[8, 8, 1.5], [40, 9, 1.3], [12, 26, 1.1], [42, 24, 1.5]], sparkleColor: '#fff3c4', scale: 1.05, tailLen: 9 }
];
// 천년 잉어 / 수정 산천어 come out of the generator with an overlay; 이무기 is hand-drawn.
const LAKE_LEGENDARY = [
  { id: 'millennium_carp', shape: 'deep', tail: 'fan', dorsal: 'long', pattern: 'scales', base: '#8a9a62', belly: '#e6dcb0', dark: '#3a4a22', patternColor: '#4a5a2a', barbels: 2, barbelColor: '#c9a86a', barbelOpt: { len: 1.8, w: 1.2 }, scale: 1.18, tailLen: 9, halo: '#ffd76a', eye: '#7a4a1a',
    overlay: `<path d="M17 8c2-2 6-2 9 0-2 1-4 1-5 2-1-1-3-1-4-2z" fill="#4f7a3a" opacity="0.9"/><path d="M20 6.5c1-2 2-3 3-2v4z" fill="#2f5a2a"/><path d="M25 8.5c0-3 1.5-5 3.5-5.5-0.5 2 0 3.5 1 5z" fill="#2f5a2a"/><path d="M23 7v-2.5" stroke="#5a3a1a" stroke-width="1"/><path d="M14 10c3 0 6 1 9 0M27 9c3 0 5 1 8 0" stroke="#6f9a4a" stroke-width="1.4" stroke-linecap="round" opacity="0.8"/>`,
    sparkles: [[7, 5, 1.4], [42, 6, 1.2], [43, 27, 1.4]], sparkleColor: '#fff3c4' },
  { id: 'crystal_trout', shape: 'torpedo', tail: 'fork', dorsal: 'short', pattern: 'facets', base: '#cfe8ff', belly: '#ffffff', dark: '#5a8ab0', patternColor: '#7fb6e0', fin: '#e8f5ff', finA: 0.7, bodyOpacity: 0.82, anal: true, scale: 1.08, tailLen: 9, halo: '#bfe8ff', aura: '#e6f6ff',
    overlay: `<path d="M12 12l3-4M20 10l2-3M30 11l3-4" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.9"/><path d="M15 21l2 3M26 21l1.5 3" stroke="#a9d6ff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>`,
    sparkles: [[8, 6, 1.6], [41, 7, 1.3], [12, 27, 1.2], [42, 26, 1.5]], sparkleColor: '#ffffff' }
];
const IMUGI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <defs>
    <radialGradient id="halo"><stop offset="0" stop-color="#ffd76a" stop-opacity="0.6"/><stop offset="0.6" stop-color="#ffd76a" stop-opacity="0.2"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>
    <linearGradient id="bodyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e5a68"/><stop offset="0.55" stop-color="#3b8f98"/><stop offset="1" stop-color="#c9e6dc"/></linearGradient>
    <radialGradient id="irisg" cx="0.42" cy="0.4" r="0.7"><stop offset="0" stop-color="#fff1a8"/><stop offset="0.55" stop-color="#f4c542"/><stop offset="1" stop-color="#c9822a"/></radialGradient>
  </defs>
  <ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>
  <path d="M10 18c4-7 9 6 15 2s7-9 12-3 5 8 8 7" stroke="#123f4a" stroke-width="8.4" fill="none" stroke-linecap="round"/>
  <path d="M10 18c4-7 9 6 15 2s7-9 12-3 5 8 8 7" stroke="url(#bodyg)" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M11 19.5c4-6 8.5 5 14.5 1s7-8 11.5-2.5 5 7.5 8 6.5" stroke="#e2f3ee" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.75"/>
  <path d="M13 15.5q1.5 2 3 0M16 20q1.5 2 3 0M21 21.5q1.5 2 3 0M25 20q1.5 2 3 0M29 16.5q1.5 2 3 0M33 14.5q1.5 2 3 0M37 17.5q1.5 2 3 0M41 21q1.5 2 3 0" stroke="#123f4a" stroke-width="0.7" fill="none" opacity="0.65"/>
  <path d="M17 13.5q1.2 1.6 2.4 0M23 15.5q1.2 1.6 2.4 0M31 12.5q1.2 1.6 2.4 0M36 14q1.2 1.6 2.4 0" stroke="#0d2f38" stroke-width="0.6" fill="none" opacity="0.5"/>
  <path d="M44 23c2 0 3 1 4 2-1 1-3 1-5 0z" fill="#2f7f88" stroke="#123f4a" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M2.5 18.5c0-3 2.5-5.5 6.5-5.5 4 0 7 2.5 7 5.5S12.5 24 9 24c-4 0-6.5-2-6.5-5.5z" fill="#2f7f88" stroke="#123f4a" stroke-width="0.8"/>
  <path d="M3 20c2 2 5 3 9 2" stroke="#e2f3ee" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.75"/>
  <path d="M11 14.5c2 0 3 0.5 4 1.5" stroke="#0d2f38" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/>
  <ellipse cx="7.3" cy="17.6" rx="2.75" ry="1.85" fill="#0d2f38" transform="rotate(-9 7.3 17.6)"/>
  <ellipse cx="7.35" cy="17.65" rx="2.1" ry="1.4" fill="url(#irisg)" transform="rotate(-9 7.35 17.65)"/>
  <circle cx="7.6" cy="17.75" r="0.95" fill="#0d2f38"/>
  <circle cx="7.0" cy="17.1" r="0.45" fill="#fff"/><circle cx="8.15" cy="18.35" r="0.24" fill="#fff" opacity="0.85"/>
  <path d="M4.6 15.9c1.3-1.1 3.6-1.3 5.5-0.5" stroke="#0d2f38" stroke-width="0.95" fill="none" stroke-linecap="round"/>
  <circle cx="3.5" cy="18.4" r="0.42" fill="#0d2f38"/>
  <path d="M2.8 19.8l5 0.8" stroke="#0d2f38" stroke-width="0.8" fill="none" stroke-linecap="round"/>
  <path d="M2.6 19.9l-2.2 0.5M0.4 20.4l0.9 0.9M0.4 20.4l0.4-1" stroke="#e0524a" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <path d="M14 27q3-1.5 6 0M30 28q3-1.5 6 0" stroke="#9fd6dc" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/>
  <path d="M42 5l0.5 1.5 1.5 0.5-1.5 0.5-0.5 1.5-0.5-1.5-1.5-0.5 1.5-0.5zM7 6l0.4 1.2 1.2 0.4-1.2 0.4-0.4 1.2-0.4-1.2-1.2-0.4 1.2-0.4z" fill="#fff3c4"/>
</svg>
`;

// ================= 바다 =================
const SEA_COMMON = [
  { id: 'jack_mackerel', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'lateral', base: '#86c9a6', belly: '#eef8f2', dark: '#2b5a48', back: '#4f8f7a', backA: 0.4, patternExtra: { w: 1.6 }, tailLen: 9 },
  { id: 'chub_mackerel', shape: 'torpedo', tail: 'fork', dorsal: 'short', pattern: 'bars', base: '#6fc2a4', belly: '#f1faf5', dark: '#1f4d3f', back: '#2f7a63', backA: 0.55, scale: 1.05, tailLen: 9 },
  { id: 'sardine', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'spots', base: '#a9d9c5', belly: '#f6fbf8', dark: '#3a6a5a', back: '#5f9f8a', backA: 0.45, patternExtra: { spotR: 0.9, spotA: 0.5 }, scale: 0.85 },
  { id: 'yellowfin_goby', shape: 'goby', tail: 'round', dorsal: 'spiny', pattern: 'saddles', base: '#9dbf8a', belly: '#e9eed6', dark: '#3d5a34', fin: '#d9c46a' },
  { id: 'sillago', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'band', base: '#c9dcb0', belly: '#f7f7ea', dark: '#5a6a44', patternColor: '#a9b98a', scale: 0.9 },
  { id: 'halfbeak', shape: 'slender', tail: 'fork', dorsal: 'back', pattern: 'lateral', base: '#b5dccb', belly: '#f5fbf8', dark: '#2a5a4a', back: '#3f8f7a', backA: 0.5, beak: '#d9483b', scale: 1.08, patternExtra: { w: 1.5 } },
  { id: 'filefish', shape: 'round', tail: 'truncate', dorsal: 'tall', pattern: 'blotches', base: '#8fbf9b', belly: '#e0ead8', dark: '#3a5a3a', patternExtra: { a: 0.25 }, scale: 0.9, tailLen: 5, eyeR: 1.6 },
  { id: 'mullet', shape: 'torpedo', tail: 'fork', dorsal: 'back', pattern: 'lateral', base: '#a8cfbf', belly: '#f5f9f6', dark: '#2f5a4c', back: '#4a7c6c', backA: 0.45, scale: 1.05, tailLen: 9 },
  { id: 'herring', shape: 'slender', tail: 'fork', dorsal: 'short', base: '#b7dcd0', belly: '#f9fdfb', dark: '#2f5a5a', back: '#3f7f9a', backA: 0.5, bigEye: true },
  { id: 'wrasse', shape: 'torpedo', tail: 'round', dorsal: 'long', pattern: 'bars', base: '#79c39c', belly: '#efe9d3', dark: '#2f5a44', patternColor: '#d97b5a', scale: 0.9 }
];
const SEA_RARE = [
  { id: 'black_seabream', shape: 'deep', tail: 'fork', dorsal: 'spiny', pattern: 'bars', base: '#5f8fa8', belly: '#d8e6ec', dark: '#1a3a4c', patternColor: '#173040' },
  { id: 'red_seabream', shape: 'deep', tail: 'fork', dorsal: 'spiny', pattern: 'spots', base: '#cc8fa0', belly: '#f6e6ea', dark: '#5a2f44', patternColor: '#5cc9e8', patternExtra: { spotR: 1, spotA: 0.9 } },
  { id: 'sea_bass', shape: 'torpedo', tail: 'fork', dorsal: 'spiny', pattern: 'lateral', base: '#8fb9cf', belly: '#eef4f7', dark: '#1f4a63', back: '#3b6f8c', backA: 0.5, scale: 1.1, tailLen: 9 },
  { id: 'flounder', shape: 'round', tail: 'round', dorsal: 'long', pattern: 'spots', base: '#7e9fb3', belly: '#d9e3ea', dark: '#26404f', analLong: true, pelvic: false, eyeR: 1.5, eyeDy: -2.5, eyeDx: 1, scale: 1.05, tailLen: 6 },
  { id: 'rockfish', shape: 'torpedo', tail: 'round', dorsal: 'spiny', pattern: 'blotches', base: '#5b7f96', belly: '#c9d6de', dark: '#1d3442', mouth: 'up' },
  { id: 'yellowtail', shape: 'torpedo', tail: 'fork', dorsal: 'short', pattern: 'lateral', base: '#6aa8c9', belly: '#f2f7fa', dark: '#1f4a63', back: '#2f6f90', backA: 0.5, patternColor: '#e8c25a', patternExtra: { w: 1.9 }, scale: 1.15, tailLen: 10 },
  { id: 'cuttlefish', shape: 'blob', tail: 'round', dorsal: 'long', pattern: 'bars', base: '#8fb1cf', belly: '#e4ecf3', dark: '#2a4a63', tentacles: '#6f93b3', mouth: 'none', gill: false, pelvic: false, bigEye: true, eyeDx: 2, scale: 0.9, tailLen: 4 }
];
const SEA_EPIC = [
  { id: 'blue_marlin', shape: 'torpedo', tail: 'fork', dorsal: 'sail', pattern: 'bars', base: '#6f6fd6', belly: '#e8e6fb', dark: '#2a2a80', back: '#3a3aa0', backA: 0.5, patternColor: '#b8b8ff', bill: true, scale: 1.1, tailLen: 10, halo: '#9b8cf0' },
  { id: 'golden_seabream', shape: 'deep', tail: 'fork', dorsal: 'spiny', pattern: 'scales', base: '#f0d27a', belly: '#fff6dc', dark: '#8a6a1a', patternColor: '#b8922e', sheen: '#ffe9a8', halo: '#ffd9a0', sparkles: [[8, 6, 1.4], [42, 9, 1.2], [39, 26, 1.3]], sparkleColor: '#fff8d0' },
  { id: 'sunfish', shape: 'round', tail: 'truncate', dorsal: 'tall', analTall: true, pattern: 'spots', base: '#a48ed6', belly: '#e6ddf5', dark: '#4a3a7a', patternColor: '#d8ccf0', patternExtra: { spotR: 1.2, spotA: 0.8 }, pelvic: false, eyeR: 1.6, scale: 1.05, tailLen: 3, halo: '#c9b8ff' },
  { id: 'great_white', shape: 'torpedo', tail: 'fork', dorsal: 'tall', base: '#7c7ca8', belly: '#f4f2fa', dark: '#2a2a4a', back: '#4d4d7a', backA: 0.5, gillSlits: true, mouth: 'big', eyeR: 1.4, eye: '#0a0a14', scale: 1.18, tailLen: 11, halo: '#b3a4ea', pelvic: false }
];
const HALO_GOLD = `<radialGradient id="halo"><stop offset="0" stop-color="#ffd76a" stop-opacity="0.6"/><stop offset="0.6" stop-color="#ffd76a" stop-opacity="0.2"/><stop offset="1" stop-color="#ffd76a" stop-opacity="0"/></radialGradient>`;
const SPARK3 = `<path d="M42 5l0.5 1.5 1.5 0.5-1.5 0.5-0.5 1.5-0.5-1.5-1.5-0.5 1.5-0.5zM7 5l0.4 1.2 1.2 0.4-1.2 0.4-0.4 1.2-0.4-1.2-1.2-0.4 1.2-0.4zM44 27l0.4 1.2 1.2 0.4-1.2 0.4-0.4 1.2-0.4-1.2-1.2-0.4 1.2-0.4z" fill="#fff3c4"/>`;
// 해룡: a leafy sea dragon -- tube snout, leaf-shaped appendages, no serpent coil.
const HAERYONG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <defs>${HALO_GOLD}</defs>
  <ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>
  <g fill="#8fd9a8" stroke="#2f7a5a" stroke-width="0.6" stroke-linejoin="round">
    <path d="M14 11c-2-5 0-8 3-9-1 4 0 6 1 8z"/><path d="M21 10c-1-5 2-8 5-8-2 3-2 6-1 8z"/><path d="M29 11c0-5 3-7 6-6-3 2-3 5-3 7z"/>
    <path d="M18 22c-3 4-3 7-1 9 0-3 1-5 3-7z"/><path d="M26 23c-2 5 0 8 3 8-1-3-1-6 0-8z"/><path d="M34 21c0 5 3 7 5 6-2-2-3-4-3-7z"/>
    <path d="M40 15c4-2 7 0 7 3-3-1-5 0-6 2z"/>
  </g>
  <path d="M10 15c5-3 10-2 15 1s10 3 16 0" stroke="#1f6a72" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M10 15c5-3 10-2 15 1s10 3 16 0" stroke="#3aa0a8" stroke-width="5.4" fill="none" stroke-linecap="round"/>
  <path d="M11 16.5c5-2.5 9.5-1.5 14 1.5s10 2.5 15 0" stroke="#dff7f4" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M15 14.5q1.5 2 3 0M20 15.5q1.5 2 3 0M25 17q1.5 2 3 0M30 17.5q1.5 2 3 0M35 16.5q1.5 2 3 0" stroke="#1f6a72" stroke-width="0.7" fill="none" opacity="0.6"/>
  <path d="M9 12c-3 0-5 2-6 4.5 2 0 4 0.5 5.5 2z" fill="#3aa0a8" stroke="#1f6a72" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M4 16.5c-2 0.3-3 1-3.5 2" stroke="#3aa0a8" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <circle cx="10" cy="15.5" r="4" fill="#3aa0a8" stroke="#1f6a72" stroke-width="0.7"/>
  <path d="M9 11c-1-3 1-5 3-5-0.5 2 0 3.5 0.5 5z" fill="#8fd9a8" stroke="#2f7a5a" stroke-width="0.6" stroke-linejoin="round"/>
  <circle cx="9" cy="15" r="1.8" fill="#fff6d6"/><circle cx="9.3" cy="15" r="1" fill="#1a3a4a"/><circle cx="8.6" cy="14.5" r="0.45" fill="#fff"/>
  ${SPARK3}
</svg>
`;
// 용궁 거북: a sea turtle with a pearl set in its shell.
const DRAGON_TURTLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <defs>${HALO_GOLD}</defs>
  <ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>
  <path d="M12 20l-6 5c2 0 4-1 6-2zM36 20l7 5c-3 0-5-1-7-2z" fill="#4a9a78" stroke="#1f5a44" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M10 21c2-5 6-8 14-8s12 3 14 8c-2 2-6 3-14 3s-12-1-14-3z" fill="#2f7a5c" stroke="#1f5a44" stroke-width="0.8"/>
  <path d="M10 21c2-11 26-11 28 0" fill="#3f9a6f" stroke="#1f5a44" stroke-width="0.8"/>
  <path d="M15 20l3-5 6-1 6 1 3 5M18 15l-2-4M30 15l2-4M24 14v-4" stroke="#8fd4a0" stroke-width="0.8" fill="none" opacity="0.8"/>
  <path d="M10 21h28q0 3-4 3H14q-4 0-4-3z" fill="#c9dfa0" stroke="#1f5a44" stroke-width="0.6"/>
  <circle cx="24" cy="12.5" r="3.4" fill="#fff6e8" stroke="#b8a070" stroke-width="0.5"/><circle cx="23.2" cy="11.6" r="1" fill="#ffffff"/><circle cx="24" cy="12.5" r="5" fill="#fff3c4" opacity="0.35"/>
  <path d="M5 17.5c-1-3 1-5 4-5 3 0 4 2 4 4.5l-1 3c-2 1-5 0-7-2.5z" fill="#4a9a78" stroke="#1f5a44" stroke-width="0.7"/>
  <circle cx="6.5" cy="15.5" r="1.4" fill="#fff6d6"/><circle cx="6.7" cy="15.5" r="0.8" fill="#1a3a2a"/>
  <path d="M4.2 17.6l2 0.6" stroke="#1f5a44" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M40 19c2-1 4 0 5 2-2 0-3 0-4 1z" fill="#4a9a78" stroke="#1f5a44" stroke-width="0.6"/>
  ${SPARK3}
</svg>
`;
// 폭풍 범고래: an orca with lightning marks.
const STORM_ORCA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <defs>${HALO_GOLD}</defs>
  <ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>
  <path d="M40 14l6-6-2 8 3 7-7-4z" fill="#141c2a" stroke="#0a0f18" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M22 10l4-9 4 9z" fill="#141c2a" stroke="#0a0f18" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M4 17c6-9 24-11 37-4-4 5-10 9-20 10-8 1-14-2-17-6z" fill="#141c2a" stroke="#0a0f18" stroke-width="0.8"/>
  <path d="M6 18c8 4 20 4 32-3-9 8-24 8-32 3z" fill="#f4f6f8"/>
  <ellipse cx="11" cy="13" rx="3.4" ry="1.7" fill="#f4f6f8" transform="rotate(-15 11 13)"/>
  <path d="M24 16c3 0 6 1 9 3-4 0-7 0-9-1z" fill="#f4f6f8" opacity="0.9"/>
  <path d="M15 19l-3 7 7-4z" fill="#141c2a" stroke="#0a0f18" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M30 10l2.5-4-1 3.5 2.5-1-3 4.5 0.8-3z" fill="#ffe66b"/>
  <path d="M35 14l2-3-0.8 2.6 2-0.8-2.4 3.6 0.6-2.4z" fill="#ffe66b"/>
  <circle cx="7.5" cy="15.5" r="1.3" fill="#fff6d6"/><circle cx="7.7" cy="15.5" r="0.75" fill="#0a0f18"/>
  <path d="M4.5 17.5l3 0.8" stroke="#0a0f18" stroke-width="0.8" stroke-linecap="round"/>
  ${SPARK3}
</svg>
`;
const SEA_LEGENDARY_SVG = { haeryong: HAERYONG, dragon_turtle: DRAGON_TURTLE, storm_orca: STORM_ORCA };

// ================= 심해 =================
// Dark bodies lit by bioluminescence in the tier's colour: 일반 green,
// 희귀 blue, 특급 purple, 전설 gold.
const ABYSS_COMMON = [
  { id: 'lantern_anchovy', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'bellyglow', base: '#3a5a5c', belly: '#5f7f7f', dark: '#0f1e22', patternColor: '#9ff5b0', bigEye: true, scale: 0.85 },
  { id: 'hatchetfish', shape: 'deep', tail: 'truncate', dorsal: 'back', pattern: 'bellyglow', base: '#5a6a72', belly: '#b8c4c8', dark: '#1a242a', patternColor: '#9ff5b0', bigEye: true, scale: 0.8, tailLen: 4 },
  { id: 'lanternfish', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'glowdots', base: '#35505a', belly: '#6f8a90', dark: '#0f1e22', patternColor: '#9ff5b0', bigEye: true, scale: 0.9 },
  { id: 'deep_smelt', shape: 'slender', tail: 'fork', dorsal: 'short', base: '#7d9aa8', belly: '#c9d8dd', dark: '#2a3f4a', bodyOpacity: 0.85, scale: 0.9, bigEye: true },
  { id: 'glass_squid', shape: 'blob', tail: 'round', dorsal: 'none', base: '#9fd3d3', belly: '#dff5f5', dark: '#3a6a6a', bodyOpacity: 0.8, tentacles: '#7fb8b8', mouth: 'none', gill: false, pelvic: false, pectoral: false, bigEye: true, eyeDx: 2, scale: 0.75, tailLen: 3, pattern: 'glowdots', patternColor: '#9ff5b0', patternExtra: { r: 0.8 } },
  { id: 'spiderfish', shape: 'slender', tail: 'pointed', dorsal: 'long', base: '#5a6a5a', belly: '#9aaa9a', dark: '#1f2a1f', stilts: true, analLong: true, scale: 0.95, tailLen: 9 },
  { id: 'deep_shrimp', shape: 'eel', tail: 'fan', dorsal: 'none', pattern: 'segments', base: '#b86a6a', belly: '#e0a8a8', dark: '#4a2020', tentacles: '#b86a6a', tentacleW: 1, mouth: 'none', gill: false, pelvic: false, pectoral: false, scale: 0.75, tailLen: 5, eyeR: 1.4 },
  { id: 'dumbo_octopus', shape: 'blob', tail: 'none', dorsal: 'none', base: '#c090b0', belly: '#e6c8dc', dark: '#5a2f4a', tentacles: '#b07aa0', mouth: 'none', gill: false, pelvic: false, pectoral: false, bigEye: true, eyeDx: 2, scale: 0.85,
    overlay: `<path d="M17 8c-3-4-6-3-7 0 2-1 4 0 5 2zM27 8c3-4 6-3 7 0-2-1-4 0-5 2z" fill="#c090b0" stroke="#5a2f4a" stroke-width="0.6" stroke-linejoin="round"/>` },
  { id: 'tripodfish', shape: 'slender', tail: 'pointed', dorsal: 'short', base: '#6a5a6a', belly: '#a89aa8', dark: '#2a1f2a', stilts: true, pelvic: false, scale: 0.9, tailLen: 9 },
  { id: 'giant_isopod', shape: 'round', tail: 'truncate', dorsal: 'none', pattern: 'segments', base: '#8a8a7a', belly: '#b8b8a8', dark: '#3a3a30', tentacles: '#6a6a5a', tentacleW: 1, mouth: 'none', gill: false, pelvic: false, pectoral: false, eyeR: 1.3, scale: 0.9, tailLen: 3 }
];
const ABYSS_RARE = [
  { id: 'viperfish', shape: 'eel', tail: 'fork', dorsal: 'back', pattern: 'glowdots', base: '#2a2a3a', belly: '#4a4a5a', dark: '#0a0a12', patternColor: '#7fd0ff', mouth: 'big', eyeR: 1.6, scale: 1.05, pelvic: false },
  { id: 'pelican_eel', shape: 'eel', tail: 'pointed', dorsal: 'none', base: '#1c1c24', belly: '#34343e', dark: '#000000', mouth: 'big', eyeR: 1.2, scale: 1.1, pelvic: false, pectoral: false, overlay: `<circle cx="45" cy="16" r="1.6" fill="#7fd0ff"/><circle cx="45" cy="16" r="3" fill="#7fd0ff" opacity="0.3"/>` },
  { id: 'vampire_squid', shape: 'blob', tail: 'none', dorsal: 'none', base: '#4a2a5a', belly: '#7a4a7a', dark: '#1a0a22', tentacles: '#6a3a7a', tentacleW: 2, mouth: 'none', gill: false, pelvic: false, pectoral: false, bigEye: true, eye: '#d63a3a', sclera: '#ffd0d0', eyeDx: 2, scale: 0.9, pattern: 'glowdots', patternColor: '#7fd0ff', patternExtra: { r: 0.8 } },
  { id: 'fangtooth', shape: 'goby', tail: 'round', dorsal: 'short', base: '#2a2a2a', belly: '#4a4a4a', dark: '#050505', mouth: 'big', eyeR: 1.2, scale: 0.8 },
  { id: 'blobfish', shape: 'round', tail: 'round', dorsal: 'none', base: '#d0a0a0', belly: '#f0d0d0', dark: '#6a4040', eyeR: 1.5, scale: 0.9, tailLen: 4, pelvic: false, overlay: `<path d="M8 20c2 1 4 1 6 0" stroke="#6a4040" stroke-width="1" fill="none" stroke-linecap="round"/><ellipse cx="10" cy="17.5" rx="2" ry="1.4" fill="#e6b8b8"/>` },
  { id: 'goblin_shark', shape: 'torpedo', tail: 'pointed', dorsal: 'short', base: '#c08090', belly: '#f0d8dc', dark: '#5a2a3a', bill: true, gillSlits: true, mouth: 'big', eyeR: 1.3, scale: 1.1, tailLen: 10, pelvic: false },
  { id: 'oarfish', shape: 'eel', tail: 'pointed', dorsal: 'long', dorsalColor: '#e04a4a', base: '#b0c0d0', belly: '#e8f0f5', dark: '#3a4a5a', pattern: 'spots', patternExtra: { spotR: 1, spotA: 0.4 }, scale: 1.15, tailLen: 8, pelvic: false, overlay: `<path d="M9 12c-2-4-1-7 1-9M11 11c-1-4 1-7 3-8" stroke="#e04a4a" stroke-width="1.2" fill="none" stroke-linecap="round"/>` }
];
const ABYSS_EPIC = [
  { id: 'abyssal_angler', shape: 'blob', tail: 'round', dorsal: 'back', base: '#4a2a6e', belly: '#7b58a3', dark: '#1a0b2e', pattern: 'glowdots', patternColor: '#c9a3ff', mouth: 'big', lure: '#d8b4ff', eyeR: 1.5, sclera: '#e6d4ff', eye: '#2a123f', eyeDx: 3, eyeDy: -1.5, gill: false, pelvic: false, scale: 0.98, halo: '#9b6bff', tailLen: 6 },
  { id: 'giant_squid', shape: 'blob', tail: 'none', dorsal: 'none', base: '#6b3fa0', belly: '#a58cd0', dark: '#2a1040', tentacles: '#5a3090', tentacleW: 2.2, mouth: 'none', gill: false, pelvic: false, pectoral: false, bigEye: true, eyeDx: 2, scale: 1.12, halo: '#b48cf0', overlay: `<path d="M18 7c-3-5-7-4-9 0 2-1 5-1 7 1zM26 7c3-5 7-4 9 0-2-1-5-1-7 1z" fill="#6b3fa0" stroke="#2a1040" stroke-width="0.6" stroke-linejoin="round"/>` },
  { id: 'megamouth', shape: 'torpedo', tail: 'fork', dorsal: 'short', base: '#4a4a7a', belly: '#c8c8e8', dark: '#1a1a3a', mouth: 'big', gillSlits: true, eyeR: 1.3, scale: 1.18, tailLen: 10, halo: '#a690e6', pelvic: false, overlay: `<path d="M6 19c3 1 6 1 9 0" stroke="#e6e0ff" stroke-width="1.2" fill="none" opacity="0.8"/>` },
  { id: 'ghost_shark', shape: 'torpedo', tail: 'pointed', dorsal: 'tall', base: '#d8d0f0', belly: '#f6f2ff', dark: '#7a70a0', bodyOpacity: 0.78, gillSlits: true, eyeR: 1.4, eye: '#4a3a7a', scale: 1.05, tailLen: 11, halo: '#e6dcff', sparkles: [[8, 6, 1.4], [41, 9, 1.2], [40, 27, 1.3]], pelvic: false }
];
const ABYSS_LEGENDARY = [
  { id: 'starlight_angler', shape: 'blob', tail: 'round', dorsal: 'back', base: '#1a1030', belly: '#3a2a5a', dark: '#05030a', pattern: 'glowdots', patternColor: '#ffd76a', patternExtra: { r: 1.2 }, mouth: 'big', lure: '#ffe27a', eyeR: 1.5, sclera: '#fff3c4', eye: '#2a123f', eyeDx: 3, eyeDy: -1.5, gill: false, pelvic: false, scale: 1.02, halo: '#ffd76a', tailLen: 6,
    overlay: `<path d="M20 11l5-2 4 3-3 3-5-1z" stroke="#ffd76a" stroke-width="0.6" fill="none" opacity="0.7"/>`, sparkles: [[6, 26, 1.3], [43, 6, 1.5], [44, 26, 1.2]], sparkleColor: '#fff3c4' }
];
// 리바이어던: an armoured whale, all plates and spines.
const LEVIATHAN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <defs>${HALO_GOLD}</defs>
  <ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>
  <path d="M41 15l6-6-1 8 2 7-7-4z" fill="#2a4666" stroke="#0f2238" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M12 11l2-6 2 6zM19 9l2-6 2 6zM26 9l2-6 2 6zM33 10l2-6 2 6z" fill="#ffcf4d" stroke="#8a5a10" stroke-width="0.5" stroke-linejoin="round"/>
  <path d="M4 17c6-9 26-11 38-3-5 7-13 11-24 11-7 0-11-3-14-8z" fill="#2f4a6a" stroke="#0f2238" stroke-width="0.8"/>
  <path d="M10 12c4-2 9-3 14-3M13 9.5c5-1 10-1 15 0" stroke="#4f6f92" stroke-width="1" fill="none" opacity="0.7"/>
  <path d="M14 16c3 3 5 3 8 0M22 17c3 3 5 3 8 0M30 16c3 3 5 3 8 0M18 21c3 3 5 3 8 0M26 22c3 3 5 3 8 0" stroke="#0f2238" stroke-width="0.8" fill="none" opacity="0.7"/>
  <path d="M6 20c6 3 14 4 22 3" stroke="#a9c4dd" stroke-width="1" fill="none" opacity="0.5"/>
  <path d="M4.5 18.5c3 1 6 1.5 10 1.5" stroke="#0f2238" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M6 19l0.6 1.6 0.6-1.6zM8.5 19.4l0.6 1.6 0.6-1.6zM11 19.6l0.6 1.6 0.6-1.6z" fill="#fbf7ff"/>
  <circle cx="9" cy="15" r="1.7" fill="#ffe27a"/><circle cx="9.2" cy="15" r="0.9" fill="#3a2a10"/><circle cx="9" cy="15" r="3" fill="#ffe27a" opacity="0.3"/>
  ${SPARK3}
</svg>
`;
// 크라켄: a giant squid's mantle and reaching tentacles.
const KRAKEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <defs>${HALO_GOLD}</defs>
  <ellipse cx="24" cy="16" rx="23.5" ry="15.5" fill="url(#halo)"/>
  <g stroke="#5a3a8a" stroke-width="2.6" fill="none" stroke-linecap="round">
    <path d="M13 19q-8 3-10 10"/><path d="M16 21q-6 5-3 10"/><path d="M20 22q0 6-3 9"/><path d="M25 22q2 6 6 9"/><path d="M29 21q6 4 8 9"/><path d="M32 19q9 1 13 7"/>
  </g>
  <g fill="#c9a3ff" opacity="0.9"><circle cx="6" cy="24" r="0.7"/><circle cx="4.5" cy="27" r="0.6"/><circle cx="15" cy="26" r="0.7"/><circle cx="18.5" cy="28" r="0.6"/><circle cx="28" cy="27" r="0.7"/><circle cx="34" cy="26" r="0.7"/><circle cx="40" cy="23" r="0.7"/></g>
  <path d="M17 6l-4-5 1 6zM28 6l4-5-1 6z" fill="#3a1f5a" stroke="#1a0a2a" stroke-width="0.6" stroke-linejoin="round"/>
  <path d="M16 7c-6 2-8 10-4 14h21c4-4 3-12-3-14z" fill="#3a1f5a" stroke="#1a0a2a" stroke-width="0.8"/>
  <path d="M15 9c-3 3-3 8-1 11" stroke="#6a4a9a" stroke-width="1.2" fill="none" opacity="0.7"/>
  <circle cx="14.5" cy="15.5" r="3.4" fill="#ffe27a"/><circle cx="15" cy="15.5" r="1.9" fill="#1a0a2a"/><circle cx="13.6" cy="14.4" r="0.7" fill="#fff"/><circle cx="14.5" cy="15.5" r="5" fill="#ffe27a" opacity="0.25"/>
  ${SPARK3}
</svg>
`;
const ABYSS_LEGENDARY_SVG = { leviathan: LEVIATHAN, kraken: KRAKEN };

// ================= 꽝 =================
const JUNK = {
  old_boot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M15 4h11v13l9 5c2 1 3 3 2 5H12c-1-3 0-6 2-8V4z" fill="#6b6f74"/>
  <path d="M14 4h12v3H14z" fill="#8a8f95"/>
  <path d="M12 26h25c0 2-1 3-3 3H13c-1 0-1-1-1-3z" fill="#3f4347"/>
  <path d="M17 8h3v8h-3zM21 8h3v6h-3z" fill="#585c61"/>
  <path d="M18 9l2 0M18 12l2 0M18 15l2 0" stroke="#3a3d41" stroke-width="1" stroke-linecap="round"/>
  <path d="M25 18l7 4" stroke="#9aa0a6" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
  <path d="M13 22c2-1 4 0 5 1" stroke="#2d3033" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/>
  <circle cx="9" cy="10" r="1.2" fill="#8fd9e2" opacity="0.7"/><circle cx="38" cy="15" r="0.9" fill="#8fd9e2" opacity="0.6"/>
</svg>
`,
  crushed_can: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M16 6h16l-2 6 3 5-4 6 2 5H15l3-6-3-5 3-5z" fill="#9aa3ab"/>
  <path d="M16 6h16c0 1.5-3.5 2.5-8 2.5S16 7.5 16 6z" fill="#c4ccd2"/>
  <path d="M15 28h16c0-1.5-3.5-2.5-8-2.5S15 26.5 15 28z" fill="#6c757c"/>
  <path d="M19 9l-2 5 3 5-3 6 2 3" stroke="#e1e6ea" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M28 9l1 4-3 5 3 6-1 3" stroke="#4f585f" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M21 13h6M22 18h5" stroke="#c94a3a" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>
  <path d="M25 6.5c1.5-1 3-1 4-0.5" stroke="#7b848b" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M30 22c1 1 2 1 3 2" stroke="#8a4a30" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>
</svg>
`,
  waterlogged_wood: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M6 14c0-3 3-4 6-4l26 2c3 0 4 2 4 4s-1 4-4 4l-26 2c-3 0-6-1-6-4z" fill="#7a5a3c"/>
  <path d="M12 10l26 2c3 0 4 2 4 4H12c-2 0-3-1-3-2s1-4 3-4z" fill="#95704b"/>
  <ellipse cx="9" cy="15" rx="3.5" ry="4.5" fill="#5a3f28"/>
  <ellipse cx="9" cy="15" rx="2" ry="2.8" fill="#3e2a18"/>
  <path d="M14 13c6 0 12 1 18 0M15 17c7 1 13 1 20 0" stroke="#5a3f28" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M20 12l3-3M28 12l2-3" stroke="#3e2a18" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
  <path d="M18 22q2 3 4 0M30 23q2 3 4 0" stroke="#7fd0dc" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <circle cx="26" cy="20" r="1.1" fill="#7fd0dc" opacity="0.8"/>
  <path d="M8 21c6-1 12-1 18 0" stroke="#4a5e3a" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.6"/>
</svg>
`,
  tangled_net: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M10 10c6-5 14-6 22-3 6 2 8 8 5 14-3 5-10 7-17 5-8-2-13-9-10-16z" fill="#6d8a79" opacity="0.9"/>
  <path d="M12 12l24 8M10 18l26-4M14 8l16 18M22 7l6 20M30 8l-10 18M16 24l20-14" stroke="#e8f1e6" stroke-width="0.9" opacity="0.8"/>
  <path d="M12 12l24 8M10 18l26-4M14 8l16 18M22 7l6 20M30 8l-10 18M16 24l20-14" stroke="#2f4a3e" stroke-width="0.5" opacity="0.6"/>
  <circle cx="34" cy="9" r="2.4" fill="#f0a24a"/><circle cx="34" cy="9" r="1.1" fill="#fff0c8"/>
  <path d="M8 22c2-1 4 0 5 1" stroke="#2f4a3e" stroke-width="1.2" fill="none" stroke-linecap="round"/>
</svg>
`,
  plastic_bottle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M8 13l7-4c1-1 3-1 4 0l3 2h14c3 0 5 2 5 5s-2 5-5 5H22l-3 2c-1 1-3 1-4 0l-7-4c-1-1-1-5 0-6z" fill="#bfe6f2" opacity="0.85"/>
  <path d="M22 11h14c3 0 5 2 5 5H22z" fill="#e0f4fa" opacity="0.7"/>
  <rect x="36" y="9" width="6" height="14" rx="2" fill="#4a9ad6"/>
  <path d="M25 13h8v6h-8z" fill="#f2f6f8" opacity="0.8"/>
  <path d="M27 15h4M27 17h3" stroke="#7fa6b8" stroke-width="0.9" stroke-linecap="round"/>
  <path d="M10 14l3-1M10 19l3 1" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>
  <circle cx="6" cy="9" r="1" fill="#bfe6f2" opacity="0.7"/><circle cx="44" cy="27" r="0.8" fill="#bfe6f2" opacity="0.6"/>
</svg>
`,
  seaweed_clump: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M14 27c-2-6 0-12 4-16 2 4 1 9-1 14 3-5 8-8 13-8-3 3-5 7-5 11 2-4 6-6 10-6-3 2-4 5-4 8H14z" fill="#3f7a4f"/>
  <path d="M18 11c1 4 0 8-1 12M30 17c-2 3-3 6-3 9M40 22c-2 1-3 3-3 5" stroke="#8fd4a0" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.8"/>
  <path d="M10 27c3-3 5-8 4-13 3 3 3 8 2 13z" fill="#2f5e3d"/>
  <ellipse cx="22" cy="28" rx="12" ry="1.6" fill="#1f3f2b" opacity="0.6"/>
  <path d="M26 8q2 3 4 0M34 12q2 3 4 0" stroke="#7fd0dc" stroke-width="1.3" fill="none" stroke-linecap="round"/>
</svg>
`,
  rusty_anchor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <circle cx="24" cy="6" r="3" fill="none" stroke="#8a5a3a" stroke-width="2"/>
  <path d="M24 9v17" stroke="#8a5a3a" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M15 13h18" stroke="#8a5a3a" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M10 20c2 6 8 8 14 8s12-2 14-8l-4 1c-2 3-6 4-10 4s-8-1-10-4z" fill="#8a5a3a"/>
  <path d="M8 19l4 3-1-5zM40 19l-4 3 1-5z" fill="#8a5a3a"/>
  <path d="M20 12c1 3 1 7 0 11M26 27c2-1 5-2 7-5" stroke="#c98a5a" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M28 14c2 0 4 1 5 3" stroke="#5a3a2a" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>
  <circle cx="14" cy="8" r="1" fill="#7fd0dc" opacity="0.6"/><circle cx="37" cy="10" r="0.8" fill="#7fd0dc" opacity="0.5"/>
</svg>
`,
  abyssal_rock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <path d="M10 22c-2-6 2-13 9-15 6-2 14 0 17 5 3 4 2 10-2 13-6 3-14 3-19 1-3-1-4-2-5-4z" fill="#4a4a5a"/>
  <path d="M14 12c4-4 12-5 18-2-4 1-8 3-10 6-3 0-6-1-8-4z" fill="#6a6a7a"/>
  <path d="M12 21c5 3 13 3 20 0" stroke="#2a2a3a" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.8"/>
  <circle cx="30" cy="17" r="1.4" fill="#9ff5b0" opacity="0.9"/><circle cx="19" cy="19" r="1" fill="#9ff5b0" opacity="0.7"/><circle cx="25" cy="10" r="0.8" fill="#9ff5b0" opacity="0.7"/>
  <circle cx="30" cy="17" r="3" fill="#9ff5b0" opacity="0.25"/>
</svg>
`,
  glass_float: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">
  <circle cx="24" cy="17" r="11" fill="#7fc8b8" opacity="0.8"/>
  <circle cx="24" cy="17" r="11" fill="none" stroke="#2f6a5a" stroke-width="0.8"/>
  <path d="M13 17h22M24 6v22M16 10c5 4 11 4 16 0M16 24c5-4 11-4 16 0" stroke="#5a3a2a" stroke-width="1" fill="none" opacity="0.8"/>
  <ellipse cx="19" cy="12" rx="3" ry="2" fill="#ffffff" opacity="0.6" transform="rotate(-30 19 12)"/>
  <path d="M22 5c1-2 3-2 4 0" stroke="#5a3a2a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
</svg>
`
};

// ================= write everything, prune what left the roster =================
const ROSTER = [
  ['common', LAKE_COMMON], ['rare', LAKE_RARE], ['epic', LAKE_EPIC], ['legendary', LAKE_LEGENDARY],
  ['common', SEA_COMMON], ['rare', SEA_RARE], ['epic', SEA_EPIC],
  ['common', ABYSS_COMMON], ['rare', ABYSS_RARE], ['epic', ABYSS_EPIC], ['legendary', ABYSS_LEGENDARY]
];
const keep = { common: new Set(), rare: new Set(), epic: new Set(), legendary: new Set() };
let n = 0;
for (const [tier, list] of ROSTER) {
  const dir = path.join(ROOT, 'icons/fish', tier);
  for (const sp of list) { fs.writeFileSync(path.join(dir, sp.id + '.svg'), fish(sp)); keep[tier].add(sp.id); n++; }
}
for (const [id, svg] of Object.entries({ imugi: IMUGI, ...SEA_LEGENDARY_SVG, ...ABYSS_LEGENDARY_SVG })) {
  fs.writeFileSync(path.join(ROOT, 'icons/fish/legendary', id + '.svg'), svg); keep.legendary.add(id); n++;
}
for (const [id, svg] of Object.entries(JUNK)) { fs.writeFileSync(path.join(ROOT, 'icons/result/junk', id + '.svg'), svg); n++; }
let pruned = 0;
for (const tier of Object.keys(keep)) {
  const dir = path.join(ROOT, 'icons/fish', tier);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.svg') || keep[tier].has(file.replace('.svg', ''))) continue;
    fs.unlinkSync(path.join(dir, file)); pruned++; console.log('pruned', tier + '/' + file);
  }
}
const junkDir = path.join(ROOT, 'icons/result/junk');
for (const file of fs.readdirSync(junkDir)) { if (file.endsWith('.svg') && !JUNK[file.replace('.svg', '')]) { fs.unlinkSync(path.join(junkDir, file)); pruned++; console.log('pruned junk/' + file); } }
console.log('wrote', n, 'icons, pruned', pruned);
