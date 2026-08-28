// ================= Fish species / tier data =================
// Loaded before game.js. Pure data + a few pure helper functions --
// no DOM access here.
(() => {
  'use strict';

  // Tier price bands are set so a tier's *max* price can never exceed the
  // next tier's *min* price (14등급 최대크기 물고기가 다음 등급 최소크기보다
  // 비싸면 안 됨) -- guaranteed by construction since every fish in a tier
  // is priced within that same [priceMin, priceMax] band regardless of
  // species, only scaled by where its own size falls in its own sizeRange.
  // reel.hitsRequired is a MINIMUM -- game.js adds a random 0~1 on top of
  // it per reel, so the exact hit count varies catch to catch.
  // reel.period is also the per-hit casting speed for that tier's *color* --
  // game.js's rarity-climb sequence picks a tier per hit, and the reel's
  // speed follows whichever tier is currently displayed (see
  // buildClimbSequence()/attemptHit() in game.js), not just the real tier.
  // Spaced 0.15s apart, evenly, tier to tier (1.20 -> 1.05 -> 0.90 -> 0.75
  // -> 0.60) so each grade's speed reads as clearly distinct rather than
  // blurring into its neighbors.
  const TIERS = {
    junk: {
      key: 'junk', label: '꽝', color: '#8a99a0', weight: 0.10,
      priceMin: 0, priceMax: 0,
      reel: { period: 1.20, zoneHeight: 32, maxMisses: 3, timeLimit: 3.8, hitsRequired: 2 }
    },
    common: {
      key: 'common', label: '일반', color: '#8fd9a8', weight: 0.52,
      priceMin: 8, priceMax: 45,
      reel: { period: 1.05, zoneHeight: 24, maxMisses: 3, timeLimit: 3.4, hitsRequired: 3 }
    },
    rare: {
      key: 'rare', label: '희귀', color: '#5cc9e8', weight: 0.27,
      priceMin: 60, priceMax: 220,
      reel: { period: 0.90, zoneHeight: 19, maxMisses: 3, timeLimit: 3.1, hitsRequired: 4 }
    },
    epic: {
      key: 'epic', label: '특급', color: '#c98cf0', weight: 0.105,
      priceMin: 300, priceMax: 1100,
      reel: { period: 0.75, zoneHeight: 15, maxMisses: 2, timeLimit: 2.8, hitsRequired: 5 }
    },
    legendary: {
      key: 'legendary', label: '전설', color: '#ffcf4d', weight: 0.005,
      priceMin: 8000, priceMax: 15000,
      reel: { period: 0.60, zoneHeight: 11, maxMisses: 2, timeLimit: 2.6, hitsRequired: 6 }
    }
  };
  // junk(10%) + common(52%) + rare(27%) + epic(10.5%) + legendary(0.5%) = 100%.
  // Legendary is ~104x rarer than common, and rarer than every other pool
  // including junk -- the rarest possible outcome, on purpose.

  const FISH_BY_TIER = {
    common: [
      { id: 'pale_chub', name: '피라미', sizeRange: [5, 12], desc: '다리 밑 어디서나 떼로 몰려다니는 흔한 민물고기.' },
      { id: 'galgyeoni', name: '갈겨니', sizeRange: [6, 16], desc: '맑은 여울을 좋아하는 은빛 물고기.' },
      { id: 'beodeulchi', name: '버들치', sizeRange: [5, 13], desc: '돌 틈 사이에 잘 숨는 작은 토종 물고기.' },
      { id: 'crucian_carp', name: '붕어', sizeRange: [10, 32], desc: '어디서나 만날 수 있는 대표적인 민물고기.' },
      { id: 'chamboongeo', name: '참붕어', sizeRange: [6, 14], desc: '붕어를 닮은 작은 몸집의 흔한 물고기.' },
      { id: 'medaka', name: '송사리', sizeRange: [3, 6], desc: '손바닥보다 작은, 무리 지어 다니는 물고기.' },
      { id: 'loach', name: '미꾸라지', sizeRange: [8, 20], desc: '진흙 바닥을 헤집고 다니는 미끈한 몸.' },
      { id: 'korean_sleeper', name: '동사리', sizeRange: [8, 18], desc: '돌 밑에 매복해 있다 튀어나오는 물고기.' },
      { id: 'amur_goby', name: '밀어', sizeRange: [5, 10], desc: '바닥에 붙어 사는 작은 망둑어류.' },
      { id: 'nuchi', name: '누치', sizeRange: [15, 35], desc: '길쭉한 몸매로 여울을 가르는 물고기.' },
      { id: 'rosy_bitterling', name: '각시붕어', sizeRange: [4, 8], desc: '작지만 화려한 무늬를 가진 물고기.' },
      { id: 'ayu', name: '은어', sizeRange: [12, 24], desc: '수박 향이 난다는 소문이 있는 은빛 물고기.' },
      { id: 'stone_moroko', name: '돌고기', sizeRange: [8, 16], desc: '돌 많은 여울 바닥에서 자주 보이는 물고기.' },
      { id: 'skygazer_chub', name: '강준치', sizeRange: [18, 38], desc: '수면 가까이서 먹이를 채가는 날렵한 물고기.' }
    ],
    rare: [
      { id: 'mandarin_fish', name: '쏘가리', sizeRange: [20, 45], desc: '바위 사이에 숨어 사는 육식성 물고기. 흔치 않게 낚인다.' },
      { id: 'catfish', name: '메기', sizeRange: [25, 60], desc: '긴 수염이 특징인 야행성 물고기.' },
      { id: 'freshwater_eel', name: '뱀장어', sizeRange: [30, 70], desc: '바다와 강을 오가는 신비로운 물고기.' },
      { id: 'snakehead', name: '가물치', sizeRange: [30, 65], desc: '힘이 세고 성질이 사나운 물고기.' },
      { id: 'bagrid_catfish', name: '동자개', sizeRange: [15, 30], desc: '건드리면 소리를 낸다는 민물고기.' },
      { id: 'masu_salmon', name: '산천어', sizeRange: [15, 35], desc: '차갑고 맑은 상류에서만 보이는 물고기.' },
      { id: 'manchurian_trout', name: '열목어', sizeRange: [25, 50], desc: '멸종위기종으로 알려진 귀한 냉수성 물고기.' },
      { id: 'korean_bream', name: '눈불개', sizeRange: [20, 40], desc: '붉은 눈이 인상적인 보기 드문 물고기.' },
      { id: 'koi', name: '비단잉어', sizeRange: [25, 55], desc: '화려한 색을 두른, 누군가 놓쳤을지도 모를 물고기.' },
      { id: 'daenongaengi', name: '대농갱이', sizeRange: [15, 30], desc: '탁한 물을 좋아하는 좀처럼 안 보이는 물고기.' }
    ],
    epic: [
      { id: 'giant_catfish', name: '초대형 메기', sizeRange: [80, 150], desc: '이 다리 밑에 이런 크기가 살 리 없는데... 실존하는 괴어.' },
      { id: 'platinum_koi', name: '백금잉어', sizeRange: [60, 120], desc: '비늘이 백금빛으로 빛나는, 현실에는 존재할 수 없는 잉어.' },
      { id: 'abyssal_angler', name: '심해아귀', sizeRange: [50, 100], desc: '민물에 나타날 수 없는 심해의 포식자. 어떻게 여기에?' },
      { id: 'glowing_ayu', name: '빛의 은어', sizeRange: [40, 80], desc: '몸 전체가 은은하게 빛나는 은어. 목격담만 존재했다.' },
      { id: 'black_dragon_catfish', name: '흑룡메기', sizeRange: [90, 160], desc: '용의 뿔을 닮은 수염을 가진 거대한 메기.' }
    ],
    legendary: [
      { id: 'imugi', name: '이무기', sizeRange: [300, 500], desc: '천 년을 물속에서 기다리면 용이 된다는 전설의 존재. 살아있는 신화를 낚았다.' }
    ]
  };

  const JUNK_ITEMS = [
    { id: 'old_boot', name: '낡은 장화', desc: '누군가 잃어버린 짝 없는 장화. 물고기는 아니다.' },
    { id: 'crushed_can', name: '찌그러진 깡통', desc: '녹슬고 찌그러진 빈 깡통.' },
    { id: 'waterlogged_wood', name: '물에 불은 나무토막', desc: '물을 잔뜩 먹어 흐물흐물해진 나무토막.' }
  ];

  // ---- Unused dummy reference, kept around per request -- not part of the
  // live pick pool. See old startReel()/catchSuccess() history for how it
  // used to drive the whole loop before species/tiers existed. ----
  const DUMMY_TEST_FISH = {
    name: '테스트 물고기', icon: 'icons/fish/fish.svg',
    period: 1.0, zoneHeight: 22, maxMisses: 3,
    periodShrink: 0.94, minPeriod: 0.6, timeLimit: 3.2,
    hitsRequired: 4,
    sizeRange: [20, 45], unit: 'cm',
    desc: '작동 확인용 테스트 물고기.'
  };

  // Per-species icon path -- icons/fish/<tier>/<speciesId>.svg, one hand
  // -drawn file per species (see icons/ICONS.md).
  function speciesIconPath(tierKey, speciesId) {
    return `icons/fish/${tierKey}/${speciesId}.svg`;
  }
  // Junk items get the same per-item treatment, just flat under result/junk/
  // since 꽝 has no sub-tiers of its own to fold into a folder level.
  function junkIconPath(junkId) {
    return `icons/result/junk/${junkId}.svg`;
  }

  function randSize(range) {
    return +(range[0] + Math.random() * (range[1] - range[0])).toFixed(1);
  }

  function sizeFrac(size, range) {
    if (range[1] === range[0]) return 0;
    return Math.min(1, Math.max(0, (size - range[0]) / (range[1] - range[0])));
  }

  function priceForCatch(entry) {
    if (entry.tier === 'junk') return 0;
    const tier = TIERS[entry.tier];
    const frac = sizeFrac(entry.size, entry.sizeRange);
    return Math.round(tier.priceMin + (tier.priceMax - tier.priceMin) * frac);
  }

  const ALL_TIER_KEYS = ['junk', 'common', 'rare', 'epic', 'legendary'];
  // 행운 pulls weight only from 꽝/일반 (never from 희귀 -- see below) and
  // hands it to 희귀/특급/전설 in FIXED proportions that heavily favor 특급,
  // rather than proportional to their own base share (that barely moves
  // 특급 at all, since 희귀's much bigger base absorbs most of it). 전설
  // still gets a small cut so it isn't completely frozen out, but nowhere
  // near enough to threaten 특급.
  //
  // Every tier in the "받는 쪽" group only ever goes UP as luck rises, from
  // bases that already satisfy 일반 > 희귀 > 특급 > 전설 -- so as long as no
  // single tier's share of the moved weight is large enough to leapfrog
  // the tier above it, that ordering holds at every luck level, not just
  // the endpoints. Checked at all 6 levels (0~5) below.
  const LUCK_LOW_TIERS = ['junk', 'common'];
  const LUCK_HIGH_ALLOC = { rare: 0.27, epic: 0.71, legendary: 0.02 };

  function applyLuck(weights, order, luckLevel) {
    if (!luckLevel) return weights;
    const shiftFrac = luckLevel * PLAYER_STATS.luck.effectPerLevel;
    const lowKeys = order.filter(k => LUCK_LOW_TIERS.includes(k));
    const highKeys = order.filter(k => k in LUCK_HIGH_ALLOC);
    if (!lowKeys.length || !highKeys.length) return weights;
    const lowTotal = lowKeys.reduce((sum, k) => sum + weights[k], 0);
    const moved = lowTotal * shiftFrac;
    // Renormalize over whichever high tiers are actually present, in case
    // a rod's low-tier skip has excluded one (skip only ever drops
    // 꽝/일반 in practice, but this stays correct either way).
    const allocTotal = highKeys.reduce((sum, k) => sum + LUCK_HIGH_ALLOC[k], 0);
    const out = { ...weights };
    lowKeys.forEach(k => { out[k] = weights[k] * (1 - shiftFrac); });
    highKeys.forEach(k => { out[k] = weights[k] + moved * (LUCK_HIGH_ALLOC[k] / allocTotal); });
    return out;
  }

  // Weighted tier roll, then a uniform pick within that tier's species list.
  // forceTierKey skips the roll entirely -- used only by the (gitignored)
  // dev-mode panel to test a specific tier on demand. excludeTierKeys drops
  // those tiers from the roll and renormalizes the rest (see the rod's
  // low-tier skip in game.js); luckLevel (행운 stat, 0~5) shifts weight from
  // 꽝/일반 toward 희귀/특급/전설, weighted heavily toward 특급. Neither
  // applies when forceTierKey is set.
  function pickCatch(forceTierKey, excludeTierKeys, luckLevel) {
    let tierKey = forceTierKey;
    if (!tierKey || !TIERS[tierKey]) {
      const exclude = excludeTierKeys && excludeTierKeys.length ? new Set(excludeTierKeys) : null;
      const order = exclude ? ALL_TIER_KEYS.filter(k => !exclude.has(k)) : ALL_TIER_KEYS.slice();
      const baseWeights = {};
      order.forEach(k => { baseWeights[k] = TIERS[k].weight; });
      const weights = applyLuck(baseWeights, order, luckLevel || 0);
      const totalWeight = order.reduce((sum, k) => sum + weights[k], 0);
      const roll = Math.random() * totalWeight;
      let acc = 0;
      tierKey = order[order.length - 1];
      for (const key of order) {
        acc += weights[key];
        if (roll < acc) { tierKey = key; break; }
      }
    }
    const pool = tierKey === 'junk' ? JUNK_ITEMS : FISH_BY_TIER[tierKey];
    const species = pool[Math.floor(Math.random() * pool.length)];
    const entry = { ...species, tier: tierKey };
    if (tierKey !== 'junk') entry.size = randSize(species.sizeRange);
    entry.price = priceForCatch(entry);
    return entry;
  }

  // ================= Bait (하단 미끼 버튼 / 상점 뽑기 탭) =================
  // A bait's only effect: fish below its own tier stop appearing at all.
  // 일반(기본) bait excludes nothing (꽝 included, same as no bait). Reuses
  // ALL_TIER_KEYS + pickCatch's existing excludeTierKeys renormalization --
  // no separate probability-rebalancing code needed.
  const BAIT_ORDER = ['common', 'rare', 'epic', 'legendary'];
  const BAITS = {
    common: { key: 'common', label: '일반 미끼', color: TIERS.common.color, desc: '효과 없음 (기본 미끼, 무한정 사용 가능).' },
    rare: { key: 'rare', label: '희귀 미끼', color: TIERS.rare.color, desc: '희귀 등급 이상의 물고기만 낚인다.' },
    epic: { key: 'epic', label: '특급 미끼', color: TIERS.epic.color, desc: '특급 등급 이상의 물고기만 낚인다.' },
    legendary: { key: 'legendary', label: '전설 미끼', color: TIERS.legendary.color, desc: '전설 등급만 낚인다 (100% 확정).' }
  };
  // common -> 'junk' floor (excludes nothing); rare/epic/legendary floor at
  // their own key -- everything strictly below that floor gets excluded.
  function baitExcludeTiers(baitKey) {
    const floorKey = baitKey === 'common' ? 'junk' : baitKey;
    const floorIdx = ALL_TIER_KEYS.indexOf(floorKey);
    return floorIdx > 0 ? ALL_TIER_KEYS.slice(0, floorIdx) : [];
  }

  // ================= Bait gacha (상점 뽑기 탭) =================
  // legendary fixed at 1%; 일반/희귀/특급 split the remaining 99% in the
  // same relative proportions as their fish-tier weights (52:27:10.5).
  const GACHA_TABLE = [
    { key: 'common', weight: 57.5 },
    { key: 'rare', weight: 29.9 },
    { key: 'epic', weight: 11.6 },
    { key: 'legendary', weight: 1.0 }
  ];
  const GACHA_PULL_COST = 150;       // 1뽑
  const GACHA_TEN_PULL_COST = 1500;  // 10뽑 -- guarantees an 특급+ among the 10
  // Legendary pity: the 80th pull since the last legendary (natural or
  // pity-forced) is forced legendary and the counter resets. Persisted as
  // `gachaPity` in the save so it survives across separate pull sessions.
  const LEGENDARY_PITY = 80;

  function pickWeighted(table) {
    const total = table.reduce((sum, e) => sum + e.weight, 0);
    const roll = Math.random() * total;
    let acc = 0;
    for (const entry of table) {
      acc += entry.weight;
      if (roll < acc) return entry.key;
    }
    return table[table.length - 1].key;
  }
  function rollGacha() { return pickWeighted(GACHA_TABLE); }

  // Rolls `count` pulls in sequence starting from `startPity` pulls-since-
  // last-legendary, forcing a legendary the moment that counter would hit
  // LEGENDARY_PITY (mid-batch, not just at the batch's end). Returns both
  // the results and the pity value to persist afterward.
  function pullGachaWithPity(count, startPity) {
    const results = [];
    let pity = startPity || 0;
    for (let i = 0; i < count; i++) {
      pity++;
      let tier;
      if (pity >= LEGENDARY_PITY) {
        tier = 'legendary';
      } else {
        tier = rollGacha();
      }
      if (tier === 'legendary') pity = 0;
      results.push(tier);
    }
    return { results, pity };
  }
  // 10뽑 전용: 10개 중 특급 이상(특급/전설)이 하나도 없으면 무작위 한 자리를
  // 특급으로 강제 교체 -- "10뽑엔 특급 하나 보장" 요구사항. 천장으로 이미 전설이
  // 강제됐다면(= 이미 특급 이상 포함) 이 보정은 자연히 건너뛴다.
  function pullGachaTen(startPity) {
    const { results, pity } = pullGachaWithPity(10, startPity);
    if (!results.some((k) => k === 'epic' || k === 'legendary')) {
      results[Math.floor(Math.random() * results.length)] = 'epic';
    }
    return { results, pity };
  }

  // ================= Fishing rod (shop upgrade tab) =================
  // Grade raises maxMisses (more forgiving) and skips the lowest tier(s) of
  // catch entirely once you've outgrown them (rare skips 꽝, epic also
  // skips 일반 -- see game.js's SKIP_TIERS_BY_GRADE). Level only widens the
  // hit zone -- both are read by game.js when it builds a tier's effective
  // reel params.
  const ROD_GRADE_ORDER = ['common', 'rare', 'epic'];
  const ROD_GRADES = {
    common: { key: 'common', label: '일반 낚싯대', color: '#8fd9a8', next: 'rare' },
    rare: { key: 'rare', label: '희귀 낚싯대', color: '#5cc9e8', next: 'epic' },
    epic: { key: 'epic', label: '특급 낚싯대', color: '#c98cf0', next: null }
  };
  const ROD_MAX_LEVEL = 10;

  // +1 life once the rod's grade has reached (or passed) each of these
  // milestones, rather than one fixed lookup per exact grade name -- the
  // grade-up ladder isn't finalized yet, so this stays correct even if
  // more grades get inserted later, as long as 희귀/특급 remain on it
  // somewhere. Currently: common=+0, rare=+1, epic=+2.
  const ROD_MISS_MILESTONES = ['rare', 'epic'];
  function rodMissBonus(gradeKey) {
    const idx = ROD_GRADE_ORDER.indexOf(gradeKey);
    return ROD_MISS_MILESTONES.reduce((sum, m) => sum + (idx >= ROD_GRADE_ORDER.indexOf(m) ? 1 : 0), 0);
  }

  // Cost to go from `level` to `level + 1`, within one grade. Same 1.6x
  // growth for every grade, just a higher base per grade so the total
  // spend to max out a grade only ever goes up (희귀 grade's total must
  // cost more than 일반's, 특급's more than 희귀's) -- rounded to the
  // nearest 100 so every price lands on a clean number.
  const ROD_GRADE_COST_BASE = { common: 150, rare: 300, epic: 600 };
  function rodLevelCost(gradeKey, level) {
    const base = ROD_GRADE_COST_BASE[gradeKey];
    return Math.round((base * Math.pow(1.6, level - 1)) / 100) * 100;
  }

  // Fraction the reel zone widens by, from rod level alone (0 at level 1,
  // 0.20 at level 10 -- 9 even steps of 0.20/9 each).
  function rodEase(level) {
    return (level - 1) * (0.20 / 9);
  }

  // ---- Grade-up materials ----
  // Dropped (at most one per catch) alongside a real fish once the rod has
  // a next grade to climb toward. Which target grade a drop counts toward
  // depends on your CURRENT grade -- a 일반 rod drops toward 희귀, a 희귀
  // rod drops toward 특급. One unified material/name/icon across every
  // grade (no more per-target color-coded material) -- only the needed
  // count differs by target. Keyed by the grade the material upgrades you
  // INTO. rollRodMaterial() in game.js stops rolling once a target's count
  // already meets `needed`, so it never drops past what's actually usable.
  const ROD_GRADE_UP = {
    rare: { materialLabel: '낚싯대 강화재료', needed: 5 },
    epic: { materialLabel: '낚싯대 강화재료', needed: 10 }
  };

  // Flat 2% through level 6, then climbs 2%p per level from level 7 on,
  // reaching 10% at level 10 -- keeps early/mid grinding slow and only
  // meaningfully speeds up the material hunt once you're nearly maxed.
  function rodMaterialDropChance(level) {
    if (level <= 6) return 0.02;
    return 0.02 + (level - 6) * 0.02;
  }

  // ================= Player stats (별도 강화, 상점 업그레이드 탭 하단) =================
  // Independent of the rod's grade/level -- three flat 0~5 stats bought
  // straight with shells. Each level's effect is a flat fraction applied by
  // game.js at the point it already computes the tier's effective reel
  // params, so these compose with the rod/climb-color values already in
  // play rather than replacing them.
  const PLAYER_STAT_ORDER = ['strength', 'luck', 'precision'];
  const PLAYER_STATS = {
    strength: { key: 'strength', label: '근력', desc: '캐스팅의 제한시간이 늘어난다.', effectPerLevel: 0.03 },
    luck: { key: 'luck', label: '행운', desc: '희귀·특급(과 약간의 전설) 물고기 출현확률이 늘어난다.', effectPerLevel: 0.06 },
    precision: { key: 'precision', label: '정밀함', desc: '캐스팅의 속도가 느려진다.', effectPerLevel: 0.04 }
  };
  const PLAYER_STAT_MAX_LEVEL = 5;

  // Cost to go from `level` to `level + 1` (level is 0-based, so the first
  // purchase is statLevelCost(0)). Same shape as the rod's cost curve, just
  // scaled down for a 0~5 stat instead of a 1~10 one.
  function statLevelCost(level) {
    return Math.round((300 * Math.pow(1.7, level)) / 100) * 100;
  }

  window.FishData = {
    TIERS, FISH_BY_TIER, JUNK_ITEMS, DUMMY_TEST_FISH, pickCatch, priceForCatch, randSize, speciesIconPath, junkIconPath,
    ROD_GRADE_ORDER, ROD_GRADES, ROD_MAX_LEVEL, ROD_GRADE_UP, rodLevelCost, rodEase, rodMissBonus,
    rodMaterialDropChance,
    PLAYER_STAT_ORDER, PLAYER_STATS, PLAYER_STAT_MAX_LEVEL, statLevelCost,
    BAIT_ORDER, BAITS, baitExcludeTiers,
    GACHA_TABLE, GACHA_PULL_COST, GACHA_TEN_PULL_COST, LEGENDARY_PITY,
    rollGacha, pullGachaWithPity, pullGachaTen
  };
})();
