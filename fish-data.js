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
  const TIERS = {
    junk: {
      key: 'junk', label: '꽝', color: '#8a99a0', weight: 0.10,
      priceMin: 0, priceMax: 0,
      reel: { period: 1.15, zoneHeight: 32, maxMisses: 5, periodShrink: 0.97, minPeriod: 0.72, timeLimit: 3.8, hitsRequired: 2 }
    },
    common: {
      key: 'common', label: '일반', color: '#8fd9a8', weight: 0.52,
      priceMin: 8, priceMax: 45,
      reel: { period: 1.0, zoneHeight: 24, maxMisses: 4, periodShrink: 0.95, minPeriod: 0.62, timeLimit: 3.4, hitsRequired: 3 }
    },
    rare: {
      key: 'rare', label: '희귀', color: '#5cc9e8', weight: 0.27,
      priceMin: 60, priceMax: 220,
      reel: { period: 0.92, zoneHeight: 19, maxMisses: 3, periodShrink: 0.93, minPeriod: 0.55, timeLimit: 3.1, hitsRequired: 4 }
    },
    epic: {
      key: 'epic', label: '특급', color: '#c98cf0', weight: 0.105,
      priceMin: 300, priceMax: 1100,
      reel: { period: 0.82, zoneHeight: 15, maxMisses: 3, periodShrink: 0.91, minPeriod: 0.48, timeLimit: 2.8, hitsRequired: 5 }
    },
    legendary: {
      key: 'legendary', label: '전설', color: '#ffcf4d', weight: 0.005,
      priceMin: 8000, priceMax: 15000,
      reel: { period: 0.72, zoneHeight: 11, maxMisses: 2, periodShrink: 0.88, minPeriod: 0.42, timeLimit: 2.6, hitsRequired: 6 }
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
    name: '테스트 물고기', icon: 'icons/fish.svg',
    period: 1.0, zoneHeight: 22, maxMisses: 3,
    periodShrink: 0.94, minPeriod: 0.6, timeLimit: 3.2,
    hitsRequired: 4,
    sizeRange: [20, 45], unit: 'cm',
    desc: '작동 확인용 테스트 물고기.'
  };

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

  // Weighted tier roll, then a uniform pick within that tier's species list.
  function pickCatch() {
    const roll = Math.random();
    let acc = 0;
    let tierKey = 'common';
    for (const key of ['junk', 'common', 'rare', 'epic', 'legendary']) {
      acc += TIERS[key].weight;
      if (roll < acc) { tierKey = key; break; }
    }
    const pool = tierKey === 'junk' ? JUNK_ITEMS : FISH_BY_TIER[tierKey];
    const species = pool[Math.floor(Math.random() * pool.length)];
    const entry = { ...species, tier: tierKey };
    if (tierKey !== 'junk') entry.size = randSize(species.sizeRange);
    entry.price = priceForCatch(entry);
    return entry;
  }

  window.FishData = { TIERS, FISH_BY_TIER, JUNK_ITEMS, DUMMY_TEST_FISH, pickCatch, priceForCatch, randSize };
})();
