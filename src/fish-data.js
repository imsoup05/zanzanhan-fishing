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
      reel: { period: 1.25, zoneHeight: 34, maxMisses: 3, timeLimit: 4.0, hitsRequired: 2 }
    },
    common: {
      key: 'common', label: '일반', color: '#8fd9a8', weight: 0.52,
      priceMin: 8, priceMax: 45,
      reel: { period: 1.10, zoneHeight: 28, maxMisses: 3, timeLimit: 3.8, hitsRequired: 2 }
    },
    rare: {
      key: 'rare', label: '희귀', color: '#5cc9e8', weight: 0.27,
      priceMin: 60, priceMax: 220,
      reel: { period: 0.95, zoneHeight: 21, maxMisses: 3, timeLimit: 3.4, hitsRequired: 3 }
    },
    epic: {
      key: 'epic', label: '특급', color: '#c98cf0', weight: 0.105,
      priceMin: 400, priceMax: 1300,
      reel: { period: 0.80, zoneHeight: 16, maxMisses: 3, timeLimit: 3.0, hitsRequired: 4 }
    },
    legendary: {
      key: 'legendary', label: '전설', color: '#ffcf4d', weight: 0.005,
      priceMin: 2500, priceMax: 5000, // v1.3: was 8,000~15,000 -- ~4x the 특급 ceiling instead of ~14x
      reel: { period: 0.65, zoneHeight: 12, maxMisses: 2, timeLimit: 2.8, hitsRequired: 4 }
    }
  };
  // reel: tuned (v1.1) as a convex curve on the "effective hit window"
  // ((zoneHeight + tolerance) x period, see game.js hitToleranceForPeriod):
  // 꽝 0.61s, 일반 0.45s, 희귀 0.31s, 특급 0.21s, 전설 0.13s -- each step
  // shrinks more than the last (26% -> 32% -> 33% -> 37%), so the low tiers
  // stay forgiving and 전설 alone is the wall. hitsRequired here mirrors
  // game.js's HITS_BASE_BY_TIER (the floor; +0~1 is rolled per catch).
  // junk(10%) + common(52%) + rare(27%) + epic(10.5%) + legendary(0.5%) = 100%.
  // Legendary is ~104x rarer than common, and rarer than every other pool
  // including junk -- the rarest possible outcome, on purpose.

  // 호수 roster (v1.2 재설계): 물가의 작은 물고기 -> 깊은 곳의 포식자 ->
  // 소문 속 대물 -> 호수의 정령. Freshwater only; nothing from a river
  // rapids or the sea. Kept under the old name because the 호수 도감
  // achievements and the legacy-save rebuild read it as "the lake".
  const FISH_BY_TIER = {
    common: [
      { id: 'pale_chub', name: '피라미', sizeRange: [5, 12], desc: '호수 어디서나 떼로 몰려다니는 흔한 민물고기.' },
      { id: 'crucian_carp', name: '붕어', sizeRange: [10, 32], desc: '호수 낚시의 기본. 어디서나 만날 수 있는 대표 민물고기.' },
      { id: 'medaka', name: '송사리', sizeRange: [3, 6], desc: '손바닥보다 작은, 물가에서 무리 지어 다니는 물고기.' },
      { id: 'loach', name: '미꾸라지', sizeRange: [8, 20], desc: '진흙 바닥을 헤집고 다니는 미끈한 몸.' },
      { id: 'galgyeoni', name: '갈겨니', sizeRange: [6, 16], desc: '옆구리에 검은 띠가 있는 은빛 물고기. 산란기엔 지느러미가 붉어진다.' },
      { id: 'beodeulchi', name: '버들치', sizeRange: [5, 13], desc: '물가 돌 틈 사이에 잘 숨는 작은 토종 물고기.' },
      { id: 'rosy_bitterling', name: '각시붕어', sizeRange: [4, 8], desc: '작지만 화려한 분홍 띠를 두른 물고기.' },
      { id: 'chamboongeo', name: '참붕어', sizeRange: [6, 14], desc: '붕어를 닮은 작은 몸집의 흔한 물고기.' },
      { id: 'amur_goby', name: '밀어', sizeRange: [5, 10], desc: '바닥에 붙어 사는 작은 망둑어류.' },
      { id: 'bluegill', name: '블루길', sizeRange: [10, 22], desc: '아가미 끝의 파란 점이 특징인 외래종. 호수를 점령했다.' }
    ],
    rare: [
      { id: 'mandarin_fish', name: '쏘가리', sizeRange: [20, 45], desc: '바위 사이에 숨어 사는 육식성 물고기. 흔치 않게 낚인다.' },
      { id: 'catfish', name: '메기', sizeRange: [25, 60], desc: '긴 수염이 특징인 야행성 물고기. 밤의 호수를 지배한다.' },
      { id: 'snakehead', name: '가물치', sizeRange: [30, 65], desc: '힘이 세고 성질이 사나운 물고기. 수초 밑에 숨어 있다.' },
      { id: 'largemouth_bass', name: '큰입배스', sizeRange: [25, 55], desc: '큰 입으로 뭐든 삼키는 외래 포식자. 손맛이 강하다.' },
      { id: 'bagrid_catfish', name: '동자개', sizeRange: [15, 30], desc: '건드리면 소리를 낸다는 민물고기.' },
      { id: 'freshwater_eel', name: '뱀장어', sizeRange: [30, 70], desc: '바다와 호수를 오가는 신비로운 물고기.' },
      { id: 'koi', name: '비단잉어', sizeRange: [25, 55], desc: '화려한 색을 두른, 누군가 놓쳤을지도 모를 물고기.' }
    ],
    epic: [
      { id: 'giant_catfish', name: '초대형 메기', sizeRange: [80, 150], desc: '이 호수에 이런 크기가 살 리 없는데... 실존하는 괴어.' },
      { id: 'platinum_koi', name: '백금잉어', sizeRange: [60, 120], desc: '비늘이 백금빛으로 빛나는, 현실에는 존재할 수 없는 잉어.' },
      { id: 'black_dragon_catfish', name: '흑룡메기', sizeRange: [90, 160], desc: '용의 뿔을 닮은 수염을 가진 거대한 메기.' },
      { id: 'glowing_ayu', name: '빛의 은어', sizeRange: [40, 80], desc: '몸 전체가 은은하게 빛나는 은어. 목격담만 존재했다.' }
    ],
    legendary: [
      { id: 'imugi', name: '이무기', sizeRange: [300, 500], desc: '천 년을 물속에서 기다리면 용이 된다는 전설의 존재. 살아있는 신화를 낚았다.' },
      { id: 'millennium_carp', name: '천년 잉어', sizeRange: [200, 350], desc: '등에 이끼가 끼고 작은 소나무까지 자란 잉어. 호수보다 오래 살았다고 한다.' },
      { id: 'crystal_trout', name: '수정 산천어', sizeRange: [80, 150], desc: '속이 훤히 비치는 수정 같은 몸. 새벽빛이 통과하면 무지개를 뿌린다.' }
    ]
  };

  const JUNK_ITEMS = [
    { id: 'old_boot', name: '낡은 장화', desc: '누군가 잃어버린 짝 없는 장화. 물고기는 아니다.' },
    { id: 'crushed_can', name: '찌그러진 깡통', desc: '녹슬고 찌그러진 빈 깡통.' },
    { id: 'waterlogged_wood', name: '물에 불은 나무토막', desc: '물을 잔뜩 먹어 흐물흐물해진 나무토막.' }
  ];

  // ================= 낚시터 (stages) =================
  // Three fishing spots, unlocked in order. A stage decides WHICH species
  // (its own pools per tier, its own 꽝 items) and at what price
  // (priceMult on top of the tier's base range); tier odds and the reel
  // minigame are stage-independent. `unlock` is checked by game.js:
  // dexCount species of dexStage discovered + rodGrade at least + shells
  // paid once. A stage whose pools are still empty (content shipping in a
  // later release) shows as 준비 중 -- see stageReady().
  const STAGE_ORDER = ['lake', 'sea', 'abyss'];
  const STAGES = {
    lake: {
      key: 'lake', name: '호수', tagline: '새벽 안개, 잔잔한 물결',
      desc: '새벽 안개가 깔린 호숫가. 민물고기가 산다.',
      priceMult: 1, unlock: null
    },
    sea: {
      key: 'sea', name: '바다', tagline: '방파제 끝, 탁 트인 수평선',
      desc: '파도가 치는 방파제 끝. 바닷고기는 크고 값이 나간다.',
      priceMult: 1.6, unlock: { dexStage: 'lake', dexCount: 12, shells: 5000 },
      // reel modifiers on top of the tier's base (game.js getEffectiveReel/
      // startReel): the further out, the harder every fight gets.
      reel: { hitBonus: { epic: 1, legendary: 1 }, timeMult: 0.9 }
    },
    abyss: {
      key: 'abyss', name: '심해', tagline: '빛이 닿지 않는 깊은 곳',
      desc: '아무것도 보이지 않는 깊은 바다. 이상한 것들이 올라온다.',
      priceMult: 2.5, unlock: { dexStage: 'sea', dexCount: 12, rodGrade: 'rare', shells: 15000 },
      reel: { hitBonus: { junk: 1, common: 1, rare: 1, epic: 1, legendary: 1 }, missPenalty: { epic: 1, legendary: 1 }, zoneMult: 0.9, timeMult: 0.85 }
    }
  };
  // FISH_BY_TIER / JUNK_ITEMS above ARE the 호수 pools (kept under their old
  // names: the 도감 achievements and legacy-save rebuild read them as the
  // lake's roster on purpose). 바다/심해 pools get filled by later steps.
  // ---- 바다 (방파제) ----
  const SEA_FISH = {
    common: [
      { id: 'jack_mackerel', name: '전갱이', sizeRange: [15, 35], desc: '방파제 주변을 떼로 도는 흔한 바닷고기. 옆줄의 비늘이 까칠하다.' },
      { id: 'chub_mackerel', name: '고등어', sizeRange: [20, 40], desc: '등의 물결무늬가 선명한 등푸른 생선. 힘차게 당긴다.' },
      { id: 'sardine', name: '정어리', sizeRange: [10, 20], desc: '은빛 무리를 이루어 다니는 작은 물고기.' },
      { id: 'yellowfin_goby', name: '문절망둑', sizeRange: [10, 25], desc: '방파제 바닥에 붙어 사는 망둑어. 무엇이든 문다.' },
      { id: 'sillago', name: '보리멸', sizeRange: [12, 25], desc: '모래 바닥을 좋아하는 연한 빛깔의 물고기.' },
      { id: 'halfbeak', name: '학꽁치', sizeRange: [20, 35], desc: '아래턱이 부리처럼 길게 뻗은 날렵한 물고기.' },
      { id: 'filefish', name: '쥐치', sizeRange: [12, 25], desc: '머리 위 가시를 세우는 납작한 물고기. 미끼를 잘 따먹는다.' },
      { id: 'mullet', name: '숭어', sizeRange: [25, 60], desc: '수면을 뛰어오르는 큰 물고기. 방파제의 단골.' },
      { id: 'herring', name: '청어', sizeRange: [20, 35], desc: '푸른 등과 큰 눈을 가진 은빛 물고기.' },
      { id: 'wrasse', name: '놀래기', sizeRange: [12, 25], desc: '알록달록한 띠무늬가 있는 갯바위 물고기.' }
    ],
    rare: [
      { id: 'black_seabream', name: '감성돔', sizeRange: [25, 50], desc: '갯바위 낚시꾼의 로망. 검푸른 몸에 희미한 세로줄.' },
      { id: 'red_seabream', name: '참돔', sizeRange: [30, 70], desc: '붉은 몸에 푸른 점이 박힌 바다의 귀족.' },
      { id: 'sea_bass', name: '농어', sizeRange: [40, 90], desc: '입질이 거칠고 몸집이 큰 은빛 포식자.' },
      { id: 'flounder', name: '넙치', sizeRange: [30, 80], desc: '바닥에 납작 엎드려 있다가 덮치는 물고기. 두 눈이 한쪽에 있다.' },
      { id: 'rockfish', name: '조피볼락', sizeRange: [20, 45], desc: '테트라포드 틈에 숨어 사는 우럭. 입이 크다.' },
      { id: 'yellowtail', name: '방어', sizeRange: [50, 110], desc: '옆구리의 노란 줄이 선명한 회유어. 힘이 어마어마하다.' },
      { id: 'cuttlefish', name: '갑오징어', sizeRange: [15, 30], desc: '줄무늬를 바꾸며 미끼를 껴안는 영리한 두족류.' }
    ],
    epic: [
      { id: 'blue_marlin', name: '청새치', sizeRange: [200, 350], desc: '창처럼 긴 주둥이로 파도를 가르는 바다의 검객. 방파제에서 잡힐 크기가 아니다.' },
      { id: 'golden_seabream', name: '황금 참돔', sizeRange: [60, 110], desc: '비늘이 금빛으로 빛나는 참돔. 어부들 사이에 소문만 무성했다.' },
      { id: 'sunfish', name: '개복치', sizeRange: [150, 300], desc: '지느러미만 달린 거대한 원반. 물 위에 누워 햇볕을 쬔다.' },
      { id: 'great_white', name: '백상아리', sizeRange: [350, 550], desc: '이빨이 톱니 같은 바다의 지배자. 낚싯줄이 버틴 게 기적이다.' }
    ],
    legendary: [
      { id: 'haeryong', name: '해룡', sizeRange: [400, 800], desc: '해초처럼 생긴 지느러미를 나부끼며 수평선을 떠도는 바다의 용.' },
      { id: 'dragon_turtle', name: '용궁 거북', sizeRange: [250, 400], desc: '등딱지에 진주가 박힌 거대한 바다거북. 용궁의 문지기라고 전해진다.' },
      { id: 'storm_orca', name: '폭풍 범고래', sizeRange: [500, 800], desc: '번개 무늬를 두른 검은 범고래. 이 녀석이 뛰어오르면 폭풍이 온다.' }
    ]
  };
  const SEA_JUNK = [
    { id: 'tangled_net', name: '엉킨 그물', desc: '누군가 버린 그물 뭉치. 풀다가 손만 아프다.' },
    { id: 'plastic_bottle', name: '플라스틱 병', desc: '파도에 떠밀려 온 빈 페트병. 바다에 두면 안 된다.' },
    { id: 'seaweed_clump', name: '해초 뭉치', desc: '바늘에 걸린 미역 줄기. 먹을 수는 있다.' }
  ];
  // ---- 심해 ----
  // Dark bodies lit by bioluminescence -- see tools/fish-icons.js.
  const ABYSS_FISH = {
    common: [
      { id: 'lantern_anchovy', name: '발광멸치', sizeRange: [8, 15], desc: '배에 발광 기관이 줄지어 있는 작은 물고기. 어둠 속에서 점처럼 반짝인다.' },
      { id: 'hatchetfish', name: '도끼고기', sizeRange: [5, 10], desc: '납작한 몸이 도끼날처럼 생긴 심해 물고기. 배가 빛난다.' },
      { id: 'lanternfish', name: '샛비늘치', sizeRange: [8, 14], desc: '몸 곳곳에 빛점이 박힌 심해에서 가장 흔한 물고기.' },
      { id: 'deep_smelt', name: '심해빙어', sizeRange: [8, 14], desc: '몸이 반쯤 비치는 차가운 물의 빙어류.' },
      { id: 'glass_squid', name: '유리오징어', sizeRange: [15, 25], desc: '유리처럼 투명한 몸에 빛점만 떠 있는 작은 오징어.' },
      { id: 'spiderfish', name: '거미고기', sizeRange: [10, 18], desc: '가늘고 긴 지느러미로 바닥을 딛고 서 있는 물고기.' },
      { id: 'deep_shrimp', name: '심해새우', sizeRange: [5, 10], desc: '깊은 바다 밑바닥을 기어다니는 붉은 새우.' },
      { id: 'dumbo_octopus', name: '둠보문어', sizeRange: [10, 20], desc: '귀처럼 생긴 지느러미로 헤엄치는 문어. 의외로 귀엽다.' },
      { id: 'tripodfish', name: '삼각대고기', sizeRange: [20, 35], desc: '긴 지느러미 세 개로 바닥에 서서 먹이를 기다리는 물고기.' },
      { id: 'giant_isopod', name: '대왕쥐며느리', sizeRange: [15, 30], desc: '심해 바닥을 기어다니는 거대한 갑각류. 몇 년을 굶어도 산다.' }
    ],
    rare: [
      { id: 'viperfish', name: '독사고기', sizeRange: [25, 40], desc: '길고 날카로운 이빨이 입 밖으로 튀어나온 사냥꾼.' },
      { id: 'pelican_eel', name: '펠리컨장어', sizeRange: [40, 80], desc: '거대한 입으로 자기 몸집만 한 먹이도 삼킨다. 꼬리 끝이 빛난다.' },
      { id: 'vampire_squid', name: '흡혈오징어', sizeRange: [20, 35], desc: '망토 같은 막을 두른 원시적인 두족류. 붉은 눈이 빛난다.' },
      { id: 'fangtooth', name: '송곳니고기', sizeRange: [10, 20], desc: '몸 크기에 비해 이빨이 가장 크다는 심해어.' },
      { id: 'blobfish', name: '블롭피시', sizeRange: [20, 35], desc: '수압이 낮은 곳으로 올라오면 흐물흐물해지는 물고기. 표정이 슬프다.' },
      { id: 'goblin_shark', name: '도깨비상어', sizeRange: [200, 350], desc: '길게 튀어나온 주둥이가 특징인 희귀한 심해 상어.' },
      { id: 'oarfish', name: '산갈치', sizeRange: [300, 600], desc: '지진이 나기 전에 나타난다는 은빛 리본 같은 물고기.' }
    ],
    epic: [
      { id: 'abyssal_angler', name: '심해아귀', sizeRange: [50, 100], desc: '머리의 빛나는 미끼로 먹이를 꾀는 심해의 포식자.' },
      { id: 'giant_squid', name: '대왕오징어', sizeRange: [400, 800], desc: '해구 깊은 곳에서 올라온 거대한 오징어. 눈이 접시만 하다.' },
      { id: 'megamouth', name: '메가마우스상어', sizeRange: [300, 500], desc: '거대한 입으로 플랑크톤을 걸러 먹는 온순한 거인.' },
      { id: 'ghost_shark', name: '유령상어', sizeRange: [200, 400], desc: '몸이 반투명해 보인다는 신비한 상어. 있는 듯 없는 듯 지나간다.' }
    ],
    legendary: [
      { id: 'leviathan', name: '리바이어던', sizeRange: [800, 1500], desc: '가시 갑옷을 두른 태초의 고래. 옛 이야기에도 등장한다.' },
      { id: 'kraken', name: '크라켄', sizeRange: [900, 1500], desc: '배를 통째로 끌고 들어간다는 심해의 지배자.' },
      { id: 'starlight_angler', name: '별빛아귀', sizeRange: [100, 180], desc: '몸에 별자리처럼 반짝이는 빛을 품은 아귀. 심연의 밤하늘이다.' }
    ]
  };
  const ABYSS_JUNK = [
    { id: 'rusty_anchor', name: '녹슨 닻', desc: '오래전 가라앉은 배의 닻. 끌어올리느라 팔이 빠질 뻔했다.' },
    { id: 'abyssal_rock', name: '심해 돌덩이', desc: '발광 이끼가 낀 검은 돌. 물고기는 아니다.' },
    { id: 'glass_float', name: '유리 부표', desc: '그물에 매달려 있던 옛날 유리 부표. 제법 예쁘다.' }
  ];
  const FISH_BY_STAGE = {
    lake: FISH_BY_TIER,
    sea: SEA_FISH,
    abyss: ABYSS_FISH
  };
  const JUNK_BY_STAGE = { lake: JUNK_ITEMS, sea: SEA_JUNK, abyss: ABYSS_JUNK };
  function stageReady(stageKey) {
    const pools = FISH_BY_STAGE[stageKey];
    if (!pools || (STAGES[stageKey] && STAGES[stageKey].comingSoon)) return false;
    return !!pools && ['common', 'rare', 'epic', 'legendary'].every((t) => pools[t] && pools[t].length) && (JUNK_BY_STAGE[stageKey] || []).length > 0;
  }
  // id -> { stage, tier, species }; ids are unique across every stage.
  const SPECIES_INDEX = {};
  STAGE_ORDER.forEach((st) => {
    Object.keys(FISH_BY_STAGE[st]).forEach((tier) => {
      FISH_BY_STAGE[st][tier].forEach((sp) => { SPECIES_INDEX[sp.id] = { stage: st, tier, species: sp }; });
    });
  });
  function speciesById(id) { return SPECIES_INDEX[id] || null; }
  // Sale price range of a tier at a stage (tier base x the stage's multiplier).
  function stagePriceRange(stageKey, tierKey) {
    const mult = (STAGES[stageKey] || STAGES.lake).priceMult;
    const tier = TIERS[tierKey];
    return { min: Math.round(tier.priceMin * mult), max: Math.round(tier.priceMax * mult) };
  }

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
    const mult = (STAGES[entry.stage] || STAGES.lake).priceMult;
    return Math.round((tier.priceMin + (tier.priceMax - tier.priceMin) * frac) * mult);
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
  // stageKey picks the pools (defaults to the lake for anything unknown).
  function pickCatch(forceTierKey, excludeTierKeys, luckLevel, stageKey) {
    const st = STAGES[stageKey] && stageReady(stageKey) ? stageKey : 'lake';
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
    const pool = tierKey === 'junk' ? JUNK_BY_STAGE[st] : FISH_BY_STAGE[st][tierKey];
    const species = pool[Math.floor(Math.random() * pool.length)];
    const entry = { ...species, tier: tierKey, stage: st };
    if (tierKey !== 'junk') entry.size = randSize(species.sizeRange);
    entry.price = priceForCatch(entry);
    return entry;
  }

  // ================= Bait (하단 미끼 버튼 / 상점 뽑기 탭) =================
  // A bait's only effect: fish below its own tier stop appearing at all.
  // 일반(기본) bait excludes nothing (꽝 included, same as no bait). Reuses
  // ALL_TIER_KEYS + pickCatch's existing excludeTierKeys renormalization --
  // no separate probability-rebalancing code needed.
  // 'none' is the bare hook: everything still bites, but no 전설 -- a
  // legendary needs at least a 일반 미끼 on the line. Every bait is a
  // consumable (v1.3; 일반 used to be free and endless).
  const BAITS = {
    none: { key: 'none', label: '미끼 없음', color: '#8a99a0', desc: '빈 바늘. 전설 물고기는 오지 않는다.' },
    common: { key: 'common', label: '일반 미끼', color: TIERS.common.color, desc: '전설 물고기가 올 수 있게 된다.' },
    rare: { key: 'rare', label: '희귀 미끼', color: TIERS.rare.color, desc: '희귀 등급 이상의 물고기만 낚인다.' },
    epic: { key: 'epic', label: '특급 미끼', color: TIERS.epic.color, desc: '특급 등급 이상의 물고기만 낚인다.' },
    legendary: { key: 'legendary', label: '전설 미끼', color: TIERS.legendary.color, desc: '전설 등급만 낚인다 (100% 확정).' }
  };
  // none -> no 전설; common -> excludes nothing; rare/epic/legendary floor
  // at their own key -- everything strictly below that floor is excluded.
  function baitExcludeTiers(baitKey) {
    if (!baitKey || baitKey === 'none') return ['legendary'];
    const floorKey = baitKey === 'common' ? 'junk' : baitKey;
    const floorIdx = ALL_TIER_KEYS.indexOf(floorKey);
    return floorIdx > 0 ? ALL_TIER_KEYS.slice(0, floorIdx) : [];
  }

  // ================= Bait gacha (상점 뽑기 탭) =================
  // legendary fixed at 1%; the rest split the remaining 99% in the same
  // relative proportions as the 일반/희귀/특급 fish-tier weights
  // (52:27:10.5). 일반 미끼 is a consumable again (v1.3) -- it is what lets
  // a 전설 bite at all -- so the bottom slot is a real prize.
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
    let forced = 0; // legendaries handed out by the pity ceiling (도전과제)
    for (let i = 0; i < count; i++) {
      pity++;
      let tier;
      if (pity >= LEGENDARY_PITY) {
        tier = 'legendary';
        forced++;
      } else {
        tier = rollGacha();
      }
      if (tier === 'legendary') pity = 0;
      results.push(tier);
    }
    return { results, pity, forced };
  }
  // 10뽑 전용: 10개 중 특급 이상(특급/전설)이 하나도 없으면 무작위 한 자리를
  // 특급으로 강제 교체 -- "10뽑엔 특급 하나 보장" 요구사항. 천장으로 이미 전설이
  // 강제됐다면(= 이미 특급 이상 포함) 이 보정은 자연히 건너뛴다.
  function pullGachaTen(startPity) {
    const { results, pity, forced } = pullGachaWithPity(10, startPity);
    if (!results.some((k) => k === 'epic' || k === 'legendary')) {
      results[Math.floor(Math.random() * results.length)] = 'epic';
    }
    return { results, pity, forced };
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

  // Grade effects are aimed at the top of the ladder (v1.1): a grade-up
  // is "getting ready for 전설", not a flat buff to every catch.
  //   희귀 낚싯대: +1 life on 특급 and 전설 (plus the 꽝 skip in game.js).
  //   특급 낚싯대: +1 life on 특급, +2 on 전설, and the casting bar sweeps
  //               10% slower while it shows 특급/전설 colour.
  // Keyed by the tier the effect applies to, so lower tiers get nothing.
  const ROD_MISS_BONUS = {
    common: {},
    rare: { epic: 1, legendary: 1 },
    epic: { epic: 1, legendary: 2 }
  };
  function rodMissBonus(gradeKey, tierKey) {
    return (ROD_MISS_BONUS[gradeKey] || {})[tierKey] || 0;
  }
  const ROD_SLOW_BONUS = {
    common: {},
    rare: {},
    epic: { epic: 0.10, legendary: 0.10 }
  };
  // Fractional period increase (slower sweep) for the bar colour `tierKey`.
  function rodSlowBonus(gradeKey, tierKey) {
    return (ROD_SLOW_BONUS[gradeKey] || {})[tierKey] || 0;
  }

  // Cost to go from `level` to `level + 1`, within one grade. Same 1.4x
  // growth for every grade, just a higher base per grade so the total
  // spend to max out a grade only ever goes up (희귀 grade's total must
  // cost more than 일반's, 특급's more than 희귀's) -- rounded to the
  // nearest 100 so every price lands on a clean number. (v1.1: was 1.6x on
  // 150/300/600 = 118,600 to max everything; now 5,000 + 9,900 + 19,700.)
  // v1.3: a curve, not a ratio -- levels 1~5 climb gently, 6~10 steeply, so
  // the early game moves fast and the last levels are the real sink. Same
  // shape for every grade, scaled x1 / x2 / x4 (일반 8,900 · 희귀 17,800 ·
  // 특급 35,600 to max; 62,300 for everything).
  const ROD_LEVEL_COSTS = [100, 100, 200, 200, 300, 600, 1200, 2200, 4000]; // index = level-1 (cost of level -> level+1)
  const ROD_GRADE_COST_MULT = { common: 1, rare: 2, epic: 4 };
  function rodLevelCost(gradeKey, level) {
    return (ROD_LEVEL_COSTS[Math.min(level, ROD_LEVEL_COSTS.length) - 1] || 0) * ROD_GRADE_COST_MULT[gradeKey];
  }

  // Fraction the reel zone widens by, from rod grade + level. v1.3: the
  // bonus is cumulative across grades -- a grade-up keeps what the previous
  // grade earned and stacks its own band on top (일반 0→8%, 희귀 8→18%,
  // 특급 18→30%; each band spread evenly over levels 1→10). Before this,
  // one 0→30% band restarted at every grade, so a fresh 희귀 rod reeled
  // worse than a maxed 일반 one. The 30% ceiling is unchanged.
  const ROD_EASE_BANDS = { common: [0, 0.08], rare: [0.08, 0.18], epic: [0.18, 0.30] };
  const ROD_EASE_MAX = 0.30;
  function rodEase(gradeKey, level) {
    const band = ROD_EASE_BANDS[gradeKey] || ROD_EASE_BANDS.common;
    const t = (Math.min(Math.max(level, 1), ROD_MAX_LEVEL) - 1) / (ROD_MAX_LEVEL - 1);
    return band[0] + (band[1] - band[0]) * t;
  }

  // ---- 보석 (rod grade-up secondary currency) ----
  // A single running balance (game.js's `gems`), not a per-target meter --
  // dropped (at most one per catch) alongside a real fish whenever the rod
  // still has a next grade to climb toward, at a flat chance regardless of
  // rod level. Grade-up just SPENDS `needed` gems once the rod hits max
  // level and the balance covers it; any surplus carries over toward the
  // next grade's (bigger) requirement instead of being capped/wasted.
  const GEM_LABEL = '보석';
  const ROD_GRADE_UP = {
    rare: { needed: 5 },
    epic: { needed: 12 } // v1.3: was 10
  };
  const ROD_GEM_DROP_CHANCE = 0.06; // v1.3: was 0.08

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
  // v1.3: the last two steps are the steep part (300 / 400 / 600 / 1,200 / 2,500).
  const STAT_LEVEL_COSTS = [300, 400, 600, 1200, 2500];
  function statLevelCost(level) {
    return STAT_LEVEL_COSTS[Math.min(level, STAT_LEVEL_COSTS.length - 1)];
  }

  // Only what game.js actually reads; internals (priceForCatch, rollGacha,
  // the weight tables, grade order) stay private to this file.
  window.FishData = {
    TIERS, FISH_BY_TIER, JUNK_ITEMS, pickCatch, randSize, speciesIconPath, junkIconPath,
    STAGE_ORDER, STAGES, FISH_BY_STAGE, JUNK_BY_STAGE, stageReady, speciesById, stagePriceRange,
    ROD_GRADES, ROD_MAX_LEVEL, ROD_GRADE_UP, rodLevelCost, rodEase, rodMissBonus, rodSlowBonus,
    GEM_LABEL, ROD_GEM_DROP_CHANCE,
    PLAYER_STAT_ORDER, PLAYER_STATS, PLAYER_STAT_MAX_LEVEL, statLevelCost,
    BAITS, baitExcludeTiers,
    GACHA_PULL_COST, GACHA_TEN_PULL_COST, LEGENDARY_PITY,
    pullGachaWithPity, pullGachaTen
  };
})();
