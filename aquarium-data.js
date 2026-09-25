// ================= 수족관 data =================
// Loaded before game.js, after fish-data.js. Pure data + a few pure helper
// functions -- no DOM access here. Design and price rationale: md/AQUARIUM.md.
//
// A money sink on top of the shipped economy, never a source: nothing in
// here touches sale prices, tier odds or reeling. Tanks hold real caught
// fish moved out of the bucket (never sold, released for nothing), plus
// cosmetic 바닥재 / 배경 / 조명 bought with shells.
(() => {
  'use strict';

  // The 수족관 card in the 낚시터 popup opens once this stage is unlocked.
  const UNLOCK_STAGE = 'sea';

  // One tank per 낚시터; a tank only takes that 낚시터's species. `requires`
  // is the stage that has to be unlocked before the tank can be bought.
  // capMult / decorMult scale the base prices below per tank.
  const TANK_ORDER = ['lake', 'sea', 'abyss'];
  const TANKS = {
    lake: {
      key: 'lake', name: '민물 수조', short: '민물', price: 5000, requires: 'sea', capMult: 1, decorMult: 1,
      desc: '호수에서 낚은 민물고기를 넣는 수조.',
      water: ['#3f7f86', '#2d6770', '#1f4f58', '#143a42']
    },
    sea: {
      key: 'sea', name: '바다 수조', short: '바다', price: 30000, requires: 'sea', capMult: 2, decorMult: 1.5,
      desc: '바다에서 낚은 바닷고기를 넣는 수조.',
      water: ['#3a9ec4', '#2482a8', '#176285', '#0e4462']
    },
    abyss: {
      key: 'abyss', name: '심해 수조', short: '심해', price: 100000, requires: 'abyss', capMult: 4, decorMult: 2,
      desc: '심해에서 낚은 물고기를 넣는 어두운 수조.',
      water: ['#12384a', '#0c2a3b', '#071d2b', '#03101a']
    }
  };

  // 칸 (fish slots) per expansion level, and the base cost of each step
  // (level -> level + 1). 24 = every species of one 낚시터
  // (일반 10 + 희귀 7 + 특급 4 + 전설 3), so a fully expanded tank can
  // hold the whole roster.
  const CAPACITY = [3, 6, 10, 15, 20, 24];
  const CAP_COSTS = [5000, 15000, 40000, 100000, 200000];
  const MAX_CAP_LEVEL = CAPACITY.length - 1;
  function capacity(level) {
    return CAPACITY[Math.min(Math.max(level || 0, 0), MAX_CAP_LEVEL)];
  }
  // null once the tank is fully expanded.
  function expandCost(tankKey, level) {
    if (level >= MAX_CAP_LEVEL) return null;
    return CAP_COSTS[level] * TANKS[tankKey].capMult;
  }

  // ---- 장식 (바닥재 / 배경 / 조명) ----
  // Same shape in every tank: the first item of each category is the free
  // default, then two paid ones. `tier` only drives the price and the
  // badge colour (reusing the fish tier colours); basic = free default.
  const DECOR_CATEGORIES = [
    { key: 'floor', label: '바닥재' },
    { key: 'back', label: '배경' },
    { key: 'light', label: '조명' }
  ];
  const DECOR_TIER_PRICE = { basic: 0, common: 5000, rare: 20000, epic: 60000 };
  const DECOR_TIER_LABEL = { basic: '기본', common: '일반', rare: '희귀', epic: '특급' };

  // `look` is read only by game.js's aquarium painters:
  //   floor: kind 'sand' | 'pebbles', base [top, bottom], dots [colours],
  //          extra 'shells' | 'glow' | 'cracks'
  //   back:  kind (one painter per kind), colours
  //   light: tint (rgba overlay), rays (0~1 strength), vignette (0~1),
  //          particles 'firefly' | 'caustic' | 'glow' | 'star'
  // `swatch` is the two-stop colour chip shown in the 꾸미기 list.
  const DECOR = [
    // ----- 민물 수조 -----
    { id: 'lake_floor_sand', tank: 'lake', cat: 'floor', tier: 'basic', name: '고운 모래', swatch: ['#c9b48a', '#9c8660'],
      look: { kind: 'sand', base: ['#bba67c', '#8c7652'], dots: ['#d8c7a0', '#7d6a4a'] } },
    { id: 'lake_floor_gravel', tank: 'lake', cat: 'floor', tier: 'common', name: '자갈', swatch: ['#a39a8c', '#6d665c'],
      look: { kind: 'pebbles', base: ['#8b8274', '#5f584e'], dots: ['#b3aa9a', '#8d8578', '#6e675d', '#c2b8a6'] } },
    { id: 'lake_floor_black', tank: 'lake', cat: 'floor', tier: 'rare', name: '흑자갈', swatch: ['#4a4d52', '#232528'],
      look: { kind: 'pebbles', base: ['#35383c', '#1c1e21'], dots: ['#4f5358', '#2c2f33', '#62676d', '#3d4045'] } },
    { id: 'lake_back_reeds', tank: 'lake', cat: 'back', tier: 'basic', name: '갈대', swatch: ['#6f9a5a', '#3f6634'],
      look: { kind: 'reeds', colors: ['#4f7a3f', '#3a5f2e', '#6b8f4c'] } },
    { id: 'lake_back_weeds', tank: 'lake', cat: 'back', tier: 'rare', name: '수초 숲', swatch: ['#5cc27a', '#2f7a47'],
      look: { kind: 'weeds', colors: ['#3f9a5c', '#2f7a47', '#62c07e'] } },
    { id: 'lake_back_rocks', tank: 'lake', cat: 'back', tier: 'epic', name: '연못 바위', swatch: ['#8a8f86', '#4f6b4a'],
      look: { kind: 'rocks', colors: ['#6f746c', '#555a52', '#5f8a55'] } },
    { id: 'lake_light_dawn', tank: 'lake', cat: 'light', tier: 'basic', name: '새벽', swatch: ['#f2b8a0', '#6f78b8'],
      look: { tint: 'rgba(240, 170, 150, 0.08)', rays: 0.6, vignette: 0.25 } },
    { id: 'lake_light_noon', tank: 'lake', cat: 'light', tier: 'common', name: '한낮', swatch: ['#fff3c4', '#7fd0d8'],
      look: { tint: 'rgba(255, 245, 200, 0.07)', rays: 1, vignette: 0.1 } },
    { id: 'lake_light_firefly', tank: 'lake', cat: 'light', tier: 'rare', name: '반딧불', swatch: ['#e8f59a', '#1d2a4a'],
      look: { tint: 'rgba(15, 25, 60, 0.38)', rays: 0, vignette: 0.45, particles: 'firefly' } },

    // ----- 바다 수조 -----
    { id: 'sea_floor_sand', tank: 'sea', cat: 'floor', tier: 'basic', name: '흰 모래', swatch: ['#efe4c8', '#c7b893'],
      look: { kind: 'sand', base: ['#e3d6b4', '#b8a883'], dots: ['#f6eed8', '#a89874'] } },
    { id: 'sea_floor_shells', tank: 'sea', cat: 'floor', tier: 'common', name: '조개 모래', swatch: ['#f3dcc8', '#c9a58a'],
      look: { kind: 'sand', base: ['#dccab0', '#b09c80'], dots: ['#f4e8d6', '#9c8a70'], extra: 'shells' } },
    { id: 'sea_floor_coral', tank: 'sea', cat: 'floor', tier: 'rare', name: '산호 자갈', swatch: ['#f2a0a0', '#b8666e'],
      look: { kind: 'pebbles', base: ['#d49890', '#9c6664'], dots: ['#f4b3a8', '#e88a86', '#fbd3c4', '#c86f72'] } },
    { id: 'sea_back_kelp', tank: 'sea', cat: 'back', tier: 'basic', name: '해초', swatch: ['#6fa35a', '#3b6a38'],
      look: { kind: 'kelp', colors: ['#5d8f45', '#446f34', '#7aa85a'] } },
    { id: 'sea_back_coral', tank: 'sea', cat: 'back', tier: 'rare', name: '산호초', swatch: ['#ff8fa3', '#f2b35c'],
      look: { kind: 'coral', colors: ['#ff8fa3', '#f2b35c', '#c98cf0', '#ff6f7d'] } },
    { id: 'sea_back_tetrapod', tank: 'sea', cat: 'back', tier: 'epic', name: '테트라포드', swatch: ['#c9ced1', '#7d868b'],
      look: { kind: 'tetrapod', colors: ['#b3babd', '#8d969b', '#6f787d'] } },
    { id: 'sea_light_noon', tank: 'sea', cat: 'light', tier: 'basic', name: '한낮', swatch: ['#dff6ff', '#3aa3cf'],
      look: { tint: 'rgba(220, 245, 255, 0.05)', rays: 0.9, vignette: 0.12 } },
    { id: 'sea_light_sunset', tank: 'sea', cat: 'light', tier: 'common', name: '노을', swatch: ['#ffb07a', '#8a4f7a'],
      look: { tint: 'rgba(255, 140, 90, 0.16)', rays: 0.7, vignette: 0.25 } },
    { id: 'sea_light_caustic', tank: 'sea', cat: 'light', tier: 'rare', name: '물빛 일렁임', swatch: ['#c8fbff', '#2aa6c8'],
      look: { tint: 'rgba(120, 230, 255, 0.06)', rays: 0.5, vignette: 0.12, particles: 'caustic' } },

    // ----- 심해 수조 -----
    { id: 'abyss_floor_sand', tank: 'abyss', cat: 'floor', tier: 'basic', name: '검은 모래', swatch: ['#3a3f48', '#16191f'],
      look: { kind: 'sand', base: ['#2b3039', '#12151b'], dots: ['#454b56', '#0c0e12'] } },
    { id: 'abyss_floor_moss', tank: 'abyss', cat: 'floor', tier: 'common', name: '발광 이끼', swatch: ['#7ef0c8', '#173a3a'],
      look: { kind: 'sand', base: ['#1f3336', '#0d1a1d'], dots: ['#2c4a4c', '#0a1416'], extra: 'glow' } },
    { id: 'abyss_floor_lava', tank: 'abyss', cat: 'floor', tier: 'rare', name: '화산암', swatch: ['#ff7a4a', '#2a1c1c'],
      look: { kind: 'pebbles', base: ['#2e2424', '#150f0f'], dots: ['#3d3030', '#241b1b', '#4a3a36', '#1c1414'], extra: 'cracks' } },
    { id: 'abyss_back_cliff', tank: 'abyss', cat: 'back', tier: 'basic', name: '암벽', swatch: ['#2f3d4a', '#101820'],
      look: { kind: 'cliff', colors: ['#1d2833', '#141c25', '#27333f'] } },
    { id: 'abyss_back_vent', tank: 'abyss', cat: 'back', tier: 'rare', name: '열수구', swatch: ['#ff9a5c', '#3a2f2c'],
      look: { kind: 'vent', colors: ['#3b3230', '#2a2322', '#ff9a5c'] } },
    { id: 'abyss_back_bones', tank: 'abyss', cat: 'back', tier: 'epic', name: '고래 뼈', swatch: ['#e8e2d0', '#6f6a5e'],
      look: { kind: 'bones', colors: ['#d9d2bd', '#a9a28e', '#7e7866'] } },
    { id: 'abyss_light_dark', tank: 'abyss', cat: 'light', tier: 'basic', name: '어둠', swatch: ['#1a2c3a', '#03080d'],
      look: { tint: 'rgba(0, 0, 0, 0)', rays: 0.25, vignette: 0.55 } },
    { id: 'abyss_light_cyan', tank: 'abyss', cat: 'light', tier: 'common', name: '청록 발광', swatch: ['#7ee0ff', '#0c3b4a'],
      look: { tint: 'rgba(60, 200, 230, 0.07)', rays: 0.35, vignette: 0.4, particles: 'glow' } },
    { id: 'abyss_light_stars', tank: 'abyss', cat: 'light', tier: 'rare', name: '별빛', swatch: ['#fff4c4', '#1b1f45'],
      look: { tint: 'rgba(40, 40, 110, 0.18)', rays: 0.15, vignette: 0.45, particles: 'star' } }
  ];
  const DECOR_BY_ID = {};
  DECOR.forEach((d) => { DECOR_BY_ID[d.id] = d; });

  function decorById(id) { return DECOR_BY_ID[id] || null; }
  function decorFor(tankKey, catKey) { return DECOR.filter((d) => d.tank === tankKey && d.cat === catKey); }
  function defaultDecor(tankKey, catKey) { return DECOR.find((d) => d.tank === tankKey && d.cat === catKey && d.tier === 'basic'); }
  // Rounded to the nearest 100 so ×1.5 prices stay clean numbers.
  function decorPrice(id) {
    const d = DECOR_BY_ID[id];
    if (!d) return 0;
    return Math.round(DECOR_TIER_PRICE[d.tier] * TANKS[d.tank].decorMult / 100) * 100;
  }

  // On-screen length of a fish in the tank, from its caught size: log scale
  // so a 3cm 송사리 and a 1,500cm 리바이어던 both read (28px ~ 110px).
  const FISH_PX_MIN = 28, FISH_PX_MAX = 110, SIZE_CM_MIN = 3, SIZE_CM_MAX = 1500;
  function fishPixelLength(sizeCm) {
    const t = (Math.log(Math.max(sizeCm, SIZE_CM_MIN)) - Math.log(SIZE_CM_MIN)) / (Math.log(SIZE_CM_MAX) - Math.log(SIZE_CM_MIN));
    return FISH_PX_MIN + (FISH_PX_MAX - FISH_PX_MIN) * Math.min(1, Math.max(0, t));
  }

  window.AquariumData = {
    UNLOCK_STAGE, TANK_ORDER, TANKS,
    CAPACITY, MAX_CAP_LEVEL, capacity, expandCost,
    DECOR_CATEGORIES, DECOR_TIER_LABEL, DECOR, decorById, decorFor, defaultDecor, decorPrice,
    fishPixelLength
  };
})();
