// Parametric fish icon generator -> icons/fish/<tier>/<id>.svg (48x32, fish faces left).
// Run: node tools/fish-icons.js  -- regenerates the 호수 일반/희귀 fish + 꽝 icons (특급/전설 are hand-drawn).
// Each species picks a body silhouette, tail, dorsal fin, pattern, extras and a
// two-tone palette so they read as different animals at 24-34px.
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..'); // repo root
const f = (n) => +n.toFixed(2);

// ---- body silhouettes: return { d, nx, tx, mx, th, bh, tbh, cy, nh } ----
function body(shape, s) {
  // s = overall scale (1 = fills the box)
  const cy = 16.5;
  const P = {
    slender: { nx: 7, tx: 33, mx: 19, th: 5.2, bh: 4.6, tbh: 2.2, nh: 0 },
    deep:    { nx: 8, tx: 32, mx: 19, th: 8.2, bh: 7.4, tbh: 2.6, nh: 0 },
    eel:     { nx: 4, tx: 38, mx: 16, th: 3.4, bh: 3.2, tbh: 1.8, nh: 0 },
    goby:    { nx: 6, tx: 34, mx: 14, th: 6.2, bh: 5.4, tbh: 1.9, nh: 1.6 },
    flat:    { nx: 5, tx: 34, mx: 15, th: 5.6, bh: 5.2, tbh: 2.2, nh: 3.2 },
    torpedo: { nx: 6, tx: 34, mx: 20, th: 6.4, bh: 5.6, tbh: 2.4, nh: 0 },
    round:   { nx: 9, tx: 31, mx: 19, th: 9, bh: 8.4, tbh: 2.4, nh: 0 }
  }[shape];
  const k = (s || 1) * 1.12; // global presence bump: fills the 48x32 box like the 특급 icons do
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
  }
  return '';
}
function pattern(type, b, color, extra) {
  const { nx, tx, mx, th, bh, cy } = b; const out = [];
  switch (type) {
    case 'bars': for (let i = 0; i < 5; i++) { const x = mx - 5 + i * ((tx - 2 - (mx - 5)) / 4); out.push(`<rect x="${f(x)}" y="${f(cy - th)}" width="2.2" height="${f(th + bh)}" fill="${color}" opacity="0.32"/>`); } break;
    case 'parr': for (let i = 0; i < 6; i++) { const x = nx + 9 + i * ((tx - 3 - nx - 9) / 5); out.push(`<ellipse cx="${f(x)}" cy="${f(cy + 0.3)}" rx="1.3" ry="${f(th * 0.55)}" fill="${color}" opacity="0.38"/>`); } break;
    case 'spots': [[0.32, -0.45], [0.5, 0.35], [0.62, -0.3], [0.78, 0.2], [0.42, 0.7], [0.7, -0.65], [0.88, -0.2], [0.24, 0.3]].forEach(([fx, fy]) => { out.push(`<circle cx="${f(nx + (tx - nx) * fx)}" cy="${f(cy + fy * th * 0.8)}" r="${extra && extra.spotR || 1.3}" fill="${color}" opacity="${extra && extra.spotA || 0.55}"/>`); }); break;
    case 'lateral': out.push(`<path d="M${f(nx + 7)},${f(cy + 0.4)} Q${f(mx)},${f(cy - 0.6)} ${f(tx)},${f(cy + 0.2)}" stroke="${color}" stroke-width="${extra && extra.w || 1.3}" fill="none" opacity="0.6" stroke-linecap="round"/>`); break;
    case 'band': out.push(`<path d="M${f(nx + 5)},${f(cy + 0.5)} Q${f(mx)},${f(cy - 1.2)} ${f(tx)},${f(cy)}" stroke="${color}" stroke-width="${f(th * 0.7)}" fill="none" opacity="0.4" stroke-linecap="round"/>`); break;
    case 'blotches': [[0.35, -0.3, 3, 2], [0.55, 0.4, 3.4, 2.2], [0.74, -0.35, 2.8, 1.9], [0.2, 0.45, 2.2, 1.6], [0.88, 0.25, 2, 1.5]].forEach(([fx, fy, rx, ry]) => { out.push(`<ellipse cx="${f(nx + (tx - nx) * fx)}" cy="${f(cy + fy * th)}" rx="${rx}" ry="${ry}" fill="${color}" opacity="0.42"/>`); }); break;
    case 'saddles': [[0.3, 5], [0.52, 6], [0.74, 5], [0.92, 3.5]].forEach(([fx, w]) => { const x = nx + (tx - nx) * fx; out.push(`<path d="M${f(x - w / 2)},${f(cy - th - 1)} Q${f(x)},${f(cy + th * 0.1)} ${f(x + w / 2)},${f(cy - th - 1)} Z" fill="${color}" opacity="0.45"/>`); }); break;
    case 'koi': out.push(`<ellipse cx="${f(nx + (tx - nx) * 0.3)}" cy="${f(cy - th * 0.35)}" rx="5" ry="4" fill="${color}"/>`, `<ellipse cx="${f(nx + (tx - nx) * 0.68)}" cy="${f(cy + th * 0.2)}" rx="6" ry="4.4" fill="${color}"/>`, `<ellipse cx="${f(nx + (tx - nx) * 0.52)}" cy="${f(cy + th * 0.7)}" rx="2.4" ry="1.8" fill="#2b2b2b" opacity="0.7"/>`); break;
    case 'shoulder': out.push(`<ellipse cx="${f(nx + 9)}" cy="${f(cy - 1)}" rx="2.4" ry="2.4" fill="${color}" opacity="0.85"/>`); break;
    case 'stripe-pink': out.push(`<path d="M${f(mx)},${f(cy + 0.5)} L${f(tx)},${f(cy - 0.5)}" stroke="${color}" stroke-width="1.8" opacity="0.8" stroke-linecap="round"/>`); break;
  }
  return out.join('');
}
function barbels(b, color, n) {
  const { nx, cy, nh } = b; const y = cy + (nh || 1.5); const out = [];
  const arr = n === 3 ? [[-4, 5, 0], [-2, 7, 1.5], [0.5, 6, 3]] : [[-3.5, 5.5, 0.5], [-1, 6.5, 2.2]];
  arr.forEach(([dx, dy, ox]) => out.push(`<path d="M${f(nx + 1.5 + ox)},${f(y)} q${f(dx)},${f(dy * 0.4)} ${f(dx * 1.6)},${f(dy)}" stroke="${color}" stroke-width="1" fill="none" stroke-linecap="round"/>`));
  return out.join('');
}
function fish(sp) {
  const b = body(sp.shape, sp.scale);
  const { nx, mx, th, bh, cy, tx } = b;
  const base = sp.base, belly = sp.belly, fin = sp.fin || sp.base, dark = sp.dark || '#1a2a2e', outline = sp.outline || dark;
  const eyeX = nx + (sp.shape === 'eel' ? 4 : 6) * (sp.scale || 1) + (b.nh ? 1.5 : 0), eyeY = cy - (b.nh ? 1.2 : 2) * (sp.scale || 1);
  const eyeR = sp.bigEye ? 2.6 : 2;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32">`);
  parts.push(`<defs><clipPath id="b"><path d="${b.d}"/></clipPath></defs>`);
  // tail + fins behind the body
  parts.push(`<path d="${tail(sp.tail, b, sp.tailLen)}" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round" opacity="0.95"/>`);
  if (sp.dorsal && sp.dorsal !== 'none') parts.push(`<path d="${dorsal(sp.dorsal, b)}" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.anal) parts.push(`<path d="M${f(mx + 1)},${f(cy + bh - 0.6)} L${f(mx + 4)},${f(cy + bh + 3.2)} L${f(tx - 3)},${f(cy + b.tbh + 0.2)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.analLong) parts.push(`<path d="M${f(mx - 2)},${f(cy + bh - 0.8)} Q${f((mx + tx) / 2)},${f(cy + bh + 3.6)} ${f(tx - 1)},${f(cy + b.tbh)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" stroke-linejoin="round"/>`);
  if (sp.pelvic !== false) parts.push(`<path d="M${f(nx + 11)},${f(cy + bh - 1.2)} L${f(nx + 13)},${f(cy + bh + 2)} L${f(nx + 16)},${f(cy + bh - 1)} Z" fill="${fin}" opacity="0.9"/>`);
  // body: belly colour, then base colour over the upper part (clipped)
  parts.push(`<path d="${b.d}" fill="${belly}"/>`);
  parts.push(`<g clip-path="url(#b)"><rect x="0" y="0" width="48" height="${f(cy + bh * 0.28)}" fill="${base}"/>`);
  parts.push(`<rect x="0" y="0" width="48" height="${f(cy - th * 0.45)}" fill="${sp.back || dark}" opacity="${sp.backA == null ? 0.22 : sp.backA}"/>`);
  if (sp.pattern) parts.push(pattern(sp.pattern, b, sp.patternColor || dark, sp.patternExtra));
  if (sp.pattern2) parts.push(pattern(sp.pattern2, b, sp.pattern2Color || dark, sp.pattern2Extra));
  parts.push(`</g>`);
  parts.push(`<path d="${b.d}" fill="none" stroke="${outline}" stroke-width="0.8" opacity="0.55"/>`);
  // gill line
  parts.push(`<path d="M${f(nx + 9)},${f(cy - th * 0.6)} Q${f(nx + 7.5)},${f(cy)} ${f(nx + 9.5)},${f(cy + bh * 0.6)}" stroke="${outline}" stroke-width="0.8" fill="none" opacity="0.45"/>`);
  // pectoral fin
  parts.push(`<path d="M${f(nx + 10)},${f(cy + 0.5)} Q${f(nx + 15.5)},${f(cy + 1.5)} ${f(nx + 14)},${f(cy + 4.5)} Q${f(nx + 11)},${f(cy + 4)} ${f(nx + 10)},${f(cy + 0.5)} Z" fill="${fin}" stroke="${outline}" stroke-width="0.6" opacity="0.95"/>`);
  // eye + mouth
  parts.push(`<circle cx="${f(eyeX)}" cy="${f(eyeY)}" r="${eyeR}" fill="#f6f4ea"/><circle cx="${f(eyeX + 0.3)}" cy="${f(eyeY)}" r="${f(eyeR * 0.55)}" fill="${sp.eye || '#0d161a'}"/><circle cx="${f(eyeX - 0.5)}" cy="${f(eyeY - 0.7)}" r="0.5" fill="#fff"/>`);
  if (sp.mouth !== 'none') parts.push(`<path d="M${f(nx + 0.6)},${f(cy + (b.nh ? b.nh * 0.3 : 0.8))} l${sp.mouth === 'up' ? '2.4,-1.6' : '2.6,0.9'}" stroke="${outline}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`);
  if (sp.barbels) parts.push(barbels(b, outline, sp.barbels));
  if (sp.glow) parts.push(`<circle cx="${f(nx + (tx - nx) * 0.5)}" cy="${f(cy)}" r="14" fill="${sp.glow}" opacity="0.18"/>`);
  parts.push(`</svg>\n`);
  return parts.join('\n');
}

// ---- 호수 species ----
const COMMON = [
  { id: 'pale_chub', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'lateral', base: '#7fcf98', belly: '#f3e4ea', dark: '#245a3a', fin: '#bfe3cf' },
  { id: 'galgyeoni', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'band', base: '#74c48e', belly: '#dcf2e2', dark: '#1f4d33', patternColor: '#163a26', fin: '#d9784f', anal: true },
  { id: 'beodeulchi', shape: 'slender', tail: 'round', dorsal: 'short', pattern: 'spots', base: '#8ccc92', belly: '#e8f5e4', dark: '#3a5e34', patternExtra: { spotR: 1.1, spotA: 0.5 }, scale: 0.92 },
  { id: 'crucian_carp', shape: 'deep', tail: 'fork', dorsal: 'long', base: '#a7c46d', belly: '#ede6b6', dark: '#4d5e2a', back: '#5f7a33', backA: 0.35 },
  { id: 'chamboongeo', shape: 'slender', tail: 'truncate', dorsal: 'short', pattern: 'lateral', pattern2: 'saddles', base: '#92cf8a', belly: '#e6f4dd', dark: '#2f5a2f', patternExtra: { w: 2 }, scale: 0.9 },
  { id: 'medaka', shape: 'slender', tail: 'round', dorsal: 'back', base: '#b8e0a6', belly: '#f2f8e8', dark: '#4a6a3a', bigEye: true, scale: 0.72, mouth: 'up' },
  { id: 'loach', shape: 'eel', tail: 'round', dorsal: 'back', pattern: 'blotches', base: '#8a9c58', belly: '#e0d6a0', dark: '#4a4d24', barbels: 3, pelvic: false },
  { id: 'korean_sleeper', shape: 'goby', tail: 'round', dorsal: 'spiny', pattern: 'saddles', base: '#6a9a5e', belly: '#d9dfb0', dark: '#2a4224', mouth: 'up' },
  { id: 'amur_goby', shape: 'goby', tail: 'round', dorsal: 'short', pattern: 'spots', base: '#8db98f', belly: '#e2ecd0', dark: '#3d5a3a', scale: 0.8, patternExtra: { spotR: 1.2, spotA: 0.45 } },
  { id: 'nuchi', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'lateral', base: '#a9cdb6', belly: '#f2f8f3', dark: '#3d5c4c', tailLen: 9, scale: 1.08, back: '#5c8a70', backA: 0.4 },
  { id: 'rosy_bitterling', shape: 'deep', tail: 'fork', dorsal: 'tall', pattern: 'stripe-pink', base: '#8fd9a8', belly: '#f6dfe9', dark: '#3d5a4a', patternColor: '#e0507f', fin: '#e79ab8', scale: 0.82 },
  { id: 'ayu', shape: 'slender', tail: 'fork', dorsal: 'short', pattern: 'shoulder', base: '#c4e3cc', belly: '#f7fbf5', dark: '#3f6a55', patternColor: '#f2c94c', back: '#6b9a7e', backA: 0.4, anal: true },
  { id: 'stone_moroko', shape: 'slender', tail: 'truncate', dorsal: 'short', pattern: 'lateral', base: '#8fbd84', belly: '#e9f0d4', dark: '#23401f', patternColor: '#10200f', patternExtra: { w: 2.8 }, scale: 0.9 },
  { id: 'skygazer_chub', shape: 'torpedo', tail: 'fork', dorsal: 'back', pattern: 'lateral', base: '#a9dac6', belly: '#f3faf6', dark: '#2e5a52', mouth: 'up', tailLen: 10, scale: 1.1, back: '#4f8f86', backA: 0.35 }
];
const RARE = [
  { id: 'mandarin_fish', shape: 'torpedo', tail: 'round', dorsal: 'spiny', pattern: 'blotches', base: '#79bdd8', belly: '#dcecf3', dark: '#1e4a63', patternColor: '#173d52' },
  { id: 'catfish', shape: 'flat', tail: 'round', dorsal: 'back', base: '#5a8ba6', belly: '#c3dae5', dark: '#1c3a4c', barbels: 3, analLong: true, pelvic: false },
  { id: 'freshwater_eel', shape: 'eel', tail: 'pointed', dorsal: 'long', base: '#4a7c99', belly: '#b6d2e0', dark: '#16324a', pelvic: false, analLong: true, mouth: 'none' },
  { id: 'snakehead', shape: 'eel', tail: 'round', dorsal: 'long', pattern: 'saddles', base: '#5d97b0', belly: '#c9dde6', dark: '#1a3b4c', analLong: true, scale: 1.05 },
  { id: 'bagrid_catfish', shape: 'flat', tail: 'fork', dorsal: 'short', pattern: 'blotches', base: '#74b7d1', belly: '#d5e8ef', dark: '#1f4b60', barbels: 2, scale: 0.88 },
  { id: 'masu_salmon', shape: 'torpedo', tail: 'fork', dorsal: 'short', pattern: 'parr', pattern2: 'spots', base: '#86c9e2', belly: '#eaf4f8', dark: '#244f66', pattern2Color: '#f08a5a', pattern2Extra: { spotR: 1, spotA: 0.9 }, anal: true },
  { id: 'manchurian_trout', shape: 'torpedo', tail: 'fork', dorsal: 'short', pattern: 'spots', base: '#8fd0e6', belly: '#edf6f9', dark: '#27566d', patternColor: '#e0524a', patternExtra: { spotR: 1.1, spotA: 0.9 }, anal: true, tailLen: 9 },
  { id: 'korean_bream', shape: 'deep', tail: 'fork', dorsal: 'long', pattern: 'lateral', base: '#74bcd6', belly: '#e2f0f5', dark: '#1f4c60', eye: '#d63a3a' },
  { id: 'koi', shape: 'deep', tail: 'fan', dorsal: 'long', pattern: 'koi', base: '#e9f2f6', belly: '#fbfdfd', dark: '#5f7f8c', patternColor: '#ef8a48', barbels: 2, back: '#cfe1e8', backA: 0.5, tailLen: 9 },
  { id: 'daenongaengi', shape: 'flat', tail: 'fork', dorsal: 'short', pattern: 'band', base: '#4f88a3', belly: '#bdd6e2', dark: '#132f40', patternColor: '#0f2836', barbels: 3, analLong: true, pelvic: false, scale: 0.95 }
];
let n = 0;
for (const [tier, list] of [['common', COMMON], ['rare', RARE]]) {
  const dir = path.join(ROOT, 'icons/fish', tier);
  for (const sp of list) { fs.writeFileSync(path.join(dir, sp.id + '.svg'), fish(sp)); n++; }
}
// ---- 꽝 items: hand-drawn, two-tone with highlights ----
const junk = {
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
`
};
for (const [id, svg] of Object.entries(junk)) { fs.writeFileSync(path.join(ROOT, 'icons/result/junk', id + '.svg'), svg); n++; }
console.log('wrote', n, 'icons');
