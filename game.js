(() => {
  'use strict';

  // ================= Fish species config =================
  // timeLimit is a per-hit window: it refills to full every time a perfect
  // hit lands, so it stays tense without punishing the whole encounter.
  // Difficulty (period/zoneWidth/maxMisses/periodShrink/minPeriod/timeLimit)
  // and base rarity weight are shared per tier -- with 100 species across 6
  // tiers, per-fish tuning would just be noise. Individual species only carry
  // their own identity (name/icon/color/size/desc). hitsRequired isn't part
  // of a species at all -- see TIER_HITS_RANGE, rolled fresh on every bite.
  const TIER_DIFFICULTY = {
    common:    { weight: 6, period: 1.30, zoneWidth: 19,   maxMisses: 3, periodShrink: 0.950, minPeriod: 0.80,  timeLimit: 3.60 },
    uncommon:  { weight: 4, period: 0.98, zoneWidth: 13,   maxMisses: 3, periodShrink: 0.935, minPeriod: 0.665, timeLimit: 3.05 },
    rare:      { weight: 2, period: 0.78, zoneWidth: 9.5,  maxMisses: 2, periodShrink: 0.925, minPeriod: 0.58,  timeLimit: 2.60 },
    epic:      { weight: 1, period: 0.71, zoneWidth: 8.3,  maxMisses: 2, periodShrink: 0.915, minPeriod: 0.545, timeLimit: 2.42 },
    legendary: { weight: 1, period: 0.65, zoneWidth: 7.5,  maxMisses: 2, periodShrink: 0.905, minPeriod: 0.51,  timeLimit: 2.25 },
    junk:      { weight: 2, period: 1.92, zoneWidth: 29.6, maxMisses: 6, periodShrink: 0.970, minPeriod: 1.31,  timeLimit: 5.04 }
  };

  // Perfect-zone clears needed to land the fish: rolled once per bite from
  // this tier's [min, max] range, then further eased by rod power.
  const TIER_HITS_RANGE = {
    common: [2, 3], uncommon: [3, 4], rare: [4, 5], epic: [5, 6], legendary: [6, 8], junk: [1, 2]
  };
  function randomHitsRequired(tier) {
    const [min, max] = TIER_HITS_RANGE[tier];
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // [key, name, icon, color, sizeMin, sizeMax, desc] -- unit is always 'cm' for real fish.
  const SPECIES_IDENTITY = {
    common: [
      ['mackerel', '고등어', '🐟', '#5aa9c9', 22, 38, '등이 푸르고 은빛으로 반짝이는 흔한 물고기.'],
      ['flatfish', '넙치', '🐡', '#c9a86a', 25, 45, '모래 바닥에 몸을 숨기는 납작한 물고기. 손맛이 묵직하다.'],
      ['crucian', '붕어', '🐠', '#c2a15c', 15, 30, '다리 밑 물웅덩이에 흔히 사는 붕어. 입질이 얌전하다.'],
      ['palechub', '피라미', '🐟', '#a9c4d8', 8, 15, '무리 지어 다니는 작은 민물고기. 잡기는 쉽다.'],
      ['jackmackerel', '전갱이', '🐟', '#7fa8c9', 15, 30, '떼로 몰려다니는 은빛 물고기.'],
      ['rockfish', '볼락', '🐠', '#8b7bb0', 12, 25, '어두운 그늘을 좋아하는 통통한 물고기.'],
      ['carp', '잉어', '🎏', '#c97b5a', 30, 60, '묵직한 손맛을 주는 덩치 큰 잉어.'],
      ['ayu', '은어', '🐟', '#bfe0da', 15, 25, '수박 향이 난다는 맑은 물의 물고기.'],
      ['anchovy', '멸치', '🐟', '#cfd8dc', 5, 12, '떼 지어 몰려다니는 아주 작은 물고기.'],
      ['sardine', '정어리', '🐟', '#9fb8c9', 12, 20, '은빛 비늘이 촘촘한 흔한 바닷물고기.'],
      ['goby', '망둥어', '🐠', '#a99a6b', 10, 20, '갯벌 근처에서 흔히 낚이는 물고기.'],
      ['loach', '미꾸라지', '🐟', '#6b5a3a', 10, 18, '진흙 바닥을 좋아하는 미끌미끌한 물고기.'],
      ['medaka', '송사리', '🐟', '#d8cf9a', 3, 5, '실개천에 떼 지어 사는 아주 작은 물고기.'],
      ['bullhead', '동자개', '🐡', '#b58a5a', 15, 25, '노란 배가 특징인 민물 메기류. 별명은 빠가사리.'],
      ['korchub', '갈겨니', '🐟', '#7c9ab0', 12, 20, '맑은 계곡물에서 흔히 보이는 은빛 물고기.'],
      ['barbel', '누치', '🐠', '#a8a878', 20, 35, '긴 수염이 달린 강 하류의 물고기.'],
      ['predator', '끄리', '🐟', '#6a8ca0', 25, 40, '작은 물고기를 사냥하는 날렵한 강 포식자.'],
      ['sandgoby', '모래무지', '🐠', '#cbb98a', 12, 22, '모래 속에 몸을 파묻고 숨는 물고기.'],
      ['miyuki', '미유기', '🐡', '#5a4a3a', 15, 25, '바위틈에 숨어 사는 작은 메기류.'],
      ['jagasari', '자가사리', '🐡', '#8a6a4a', 8, 14, '계곡 상류의 돌 틈에 사는 작은 메기류.'],
      ['gangjunchi', '강준치', '🐟', '#b0c4cc', 30, 55, '수면 위를 뛰어오르며 사냥하는 날렵한 물고기.'],
      ['nunbulgae', '눈불개', '🐟', '#c96a4a', 25, 45, '눈가가 붉게 물든 잉어과 물고기.'],
      ['chambungeo', '참붕어', '🐠', '#cabb7a', 6, 10, '논이나 웅덩이에 흔한 아주 작은 붕어.'],
      ['tteokbungeo', '떡붕어', '🐠', '#b89a5a', 25, 40, '몸통이 둥글고 두툼한 대형 붕어.'],
      ['hyangeo', '향어', '🎏', '#c9985a', 35, 55, '잉어를 개량해 기른 몸통이 매끈한 물고기.'],
      ['grasscarp', '초어', '🎏', '#9fb45a', 40, 70, '수초를 뜯어먹고 자라는 커다란 잉어과 물고기.'],
      ['silvercarp', '백련어', '🎏', '#c8ccd0', 35, 60, '은백색 비늘이 화려한 대형 잉어과 물고기.'],
      ['mullet', '숭어', '🐟', '#9fb0b8', 25, 45, '강과 바다를 오가며 사는 은빛 물고기.'],
      ['halfbeak', '학공치', '🐟', '#d8e0dc', 18, 30, '부리처럼 뾰족한 아래턱이 특징인 물고기.'],
      ['atka', '임연수어', '🐟', '#6a8c6a', 25, 40, '기름진 살이 특징인 등 푸른 바닷물고기.']
    ],
    uncommon: [
      ['flyingfish', '날치', '🐠', '#9fdfe0', 18, 30, '수면 위로 날듯이 튀어 오르는 날쌘 물고기. 까다롭다.'],
      ['seabream', '참돔', '🐡', '#e39aa3', 25, 50, '붉은빛 도는 귀한 몸으로 손맛이 좋은 물고기.'],
      ['mandarinfish', '쏘가리', '🐟', '#d9c25a', 20, 40, '표범무늬를 닮은 점박이 물고기. 성질이 사납다.'],
      ['catfish', '메기', '🐡', '#6b6255', 30, 60, '수염이 긴 강 바닥의 사냥꾼.'],
      ['seabass', '농어', '🐟', '#8fa9b0', 30, 55, '밤낚시로 유명한 은빛 사냥꾼.'],
      ['hairtail', '갈치', '🐠', '#dfe6ea', 40, 90, '칼처럼 길고 은빛으로 빛나는 물고기.'],
      ['blackporgy', '감성돔', '🐡', '#6a7a7c', 25, 45, '검은빛 도는 몸에 손맛이 강한 귀한 도미류.'],
      ['sculpin', '삼세기', '🐡', '#8a7c6a', 15, 30, '울퉁불퉁한 생김새의 못생긴 바닷물고기.'],
      ['filefish', '쥐치', '🐡', '#c9b880', 15, 25, '질긴 가죽 같은 껍질을 가진 물고기.'],
      ['greenling', '노래미', '🐟', '#7a8a5a', 20, 35, '바위 틈을 좋아하는 얼룩무늬 물고기.'],
      ['goldeye', '열기', '🐠', '#d8a35a', 15, 28, '황금빛 눈이 인상적인 볼락류.'],
      ['gizzardshad', '전어', '🐟', '#b8c0c4', 15, 25, '가을에 유독 고소하다고 소문난 물고기.'],
      ['herring', '준치', '🐟', '#a8c0cc', 25, 40, '가시가 많지만 맛이 좋다는 물고기.'],
      ['pomfret', '병어', '🐡', '#cfd4d8', 20, 35, '둥글넓적한 은백색 몸을 가진 물고기.'],
      ['croaker', '민어', '🐟', '#b0a888', 40, 70, '울음소리를 낸다는 전설이 있는 귀한 물고기.'],
      ['yellowcroaker', '조기', '🐟', '#d8b850', 20, 35, '노란 몸빛이 특징인 귀한 밥상 물고기.'],
      ['eel', '뱀장어', '🐟', '#4a4438', 40, 70, '긴 몸을 꿈틀대며 헤엄치는 미끈한 물고기.'],
      ['manchuriantrout', '열목어', '🐠', '#7a9ab0', 25, 45, '차가운 계곡물에서만 사는 예민한 물고기.'],
      ['masutrout', '산천어', '🐠', '#8ab0a0', 20, 35, '옆구리에 파마크 무늬가 있는 냉수성 물고기.'],
      ['cohosalmon', '은연어', '🐠', '#a8b8c8', 30, 55, '은빛 몸이 매끈한 회유성 물고기.'],
      ['cod', '대구', '🐟', '#b8b0a0', 40, 70, '겨울철 손맛으로 유명한 큼직한 물고기.'],
      ['flounder', '가자미', '🐡', '#c0a878', 20, 35, '바다 밑바닥에 납작 엎드려 사는 물고기.'],
      ['rockcod', '우럭', '🐡', '#5a6a5a', 25, 45, '매운탕으로 인기 많은 힘 좋은 바닷물고기.'],
      ['oliveflounder', '광어', '🐡', '#a8b0a0', 30, 55, '양쪽 눈이 한쪽에 몰린 납작한 물고기.']
    ],
    rare: [
      ['yellowtail', '방어', '🐟', '#f0c05a', 40, 80, '겨울철 손맛의 왕. 힘이 아주 세다.'],
      ['spanishmackerel', '삼치', '🐟', '#7fb8c9', 40, 70, '날카로운 이빨을 가진 빠른 회유어.'],
      ['rainbowtrout', '무지개송어', '🐠', '#e08fc0', 25, 45, '무지갯빛 옆줄이 아름다운 냉수성 물고기.'],
      ['sturgeon', '철갑상어', '🦈', '#5a6b6e', 60, 120, '갑옷 같은 골판을 두른 살아있는 화석.'],
      ['tuna', '참치', '🐟', '#3a5a78', 80, 150, '거대한 몸집으로 바다를 가르는 회유어.'],
      ['bluefintuna', '다랑어', '🐟', '#2a4a68', 100, 180, '참치 중에서도 특히 크고 힘이 센 대형종.'],
      ['marlin', '청새치', '🐟', '#2a6a8a', 120, 220, '긴 창 같은 주둥이를 가진 빠른 사냥꾼.'],
      ['sailfish', '돛새치', '🐟', '#3a7aa0', 130, 240, '돛처럼 커다란 등지느러미를 펼치는 물고기.'],
      ['amberjack', '부시리', '🐟', '#d8b040', 50, 90, '방어와 닮았지만 더 날렵하고 힘이 센 물고기.'],
      ['longtoothgrouper', '능성어', '🐡', '#4a6a4a', 45, 80, '바위 틈에 숨어 사냥하는 대형 능성어류.'],
      ['dakgumbari', '다금바리', '🐡', '#3a5a4a', 50, 90, '제주 앞바다의 전설로 불리는 귀한 다금바리.'],
      ['giantoctopus', '대왕문어', '🐙', '#8a4a6a', 60, 150, '먹물을 뿜으며 달아나는 거대한 문어.'],
      ['redgrouper', '붉바리', '🐡', '#c05a4a', 40, 70, '붉은 반점이 촘촘한 귀한 바리류.'],
      ['jabari', '자바리', '🐡', '#8a7a3a', 55, 100, '다금바리와 함께 최고급으로 치는 바리류.'],
      ['sablefish', '은대구', '🐟', '#6a7a88', 45, 80, '부드러운 흰 살이 일품인 심해 물고기.'],
      ['toothfish', '이빨고기', '🐟', '#4a5a68', 60, 110, '남극해 심해에서 올라온 날카로운 이빨의 물고기.'],
      ['giantsnakehead', '대왕가물치', '🐟', '#5a6a3a', 80, 140, '늪지에 산다는 거대한 가물치. 힘이 장사다.'],
      ['bigeyerockfish', '왕눈볼락', '🐠', '#7a5a8a', 30, 55, '커다란 눈이 인상적인 대형 볼락류.']
    ],
    epic: [
      ['greatwhite', '백상아리', '🦈', '#7a8a92', 250, 450, '바다의 최상위 포식자로 불리는 거대한 상어.'],
      ['mako', '청상아리', '🦈', '#4a7a9a', 200, 380, '물살을 가르는 속도가 상어 중 가장 빠르다.'],
      ['giantsquid', '대왕오징어', '🦑', '#8a4a78', 300, 600, '심해에서 올라온 거대한 오징어. 촉수가 엄청나게 길다.'],
      ['redkingcrab', '붉은대게', '🦀', '#c8503a', 20, 40, '심해에서 잡히는 귀한 대게. 다리가 길고 튼튼하다.'],
      ['thousandyearcarp', '천년잉어', '🎏', '#d4af37', 80, 130, '천 년을 살았다는 전설이 따라붙는 신비한 잉어.'],
      ['anglerfish', '심해아귀', '🐡', '#2a2a3a', 40, 70, '심해의 어둠 속에서 빛을 밝혀 먹이를 유인한다.'],
      ['arcticchar', '빙하곤들매기', '🐠', '#a0d0e0', 35, 60, '빙하가 녹은 차디찬 물에서만 사는 희귀한 물고기.'],
      ['glasseel', '유리비늘장어', '🐟', '#cfe8f0', 50, 90, '비늘이 유리처럼 투명하게 빛나는 신비한 장어.'],
      ['goldensoftshell', '황금자라', '🐢', '#e0b84a', 30, 55, '등딱지가 황금빛으로 빛나는 상서로운 자라.'],
      ['blackpearlseabass', '흑진주농어', '🐟', '#2a2a40', 60, 100, '흑진주처럼 검고 매끄러운 비늘을 가진 농어.'],
      ['galaxyparrotfish', '은하비늘돔', '🐠', '#6a4a9a', 45, 80, '비늘이 은하수처럼 반짝이는 신비로운 비늘돔.'],
      ['tenthousandyearcatfish', '만년메기', '🐡', '#4a3a2a', 90, 160, '만 년을 살았다는 전설의 거대한 메기.']
    ],
    legendary: [
      ['goldencarp', '황금잉어', '🎏', '#ffcf4d', 40, 70, '온몸이 금빛으로 빛나는 전설의 잉어. 행운을 가져온다고 한다.'],
      ['imugi', '이무기', '🐉', '#4a7c5c', 150, 300, '용이 되지 못하고 물속에 숨어 산다는 전설의 이무기. 소문으로만 전해지던 존재.'],
      ['mermaid', '인어', '🧜', '#4ac8c8', 140, 180, '노랫소리로 뱃사람을 홀린다는 전설 속의 존재.'],
      ['bluedragon', '청룡', '🐉', '#3a6ad0', 300, 500, '동쪽 바다를 지킨다는 푸른 비늘의 용.'],
      ['whitedragon', '백룡', '🐉', '#e8ecf0', 300, 500, '구름을 몰고 다닌다는 새하얀 전설의 용.'],
      ['coelacanth', '실러캔스', '🐟', '#4a5a48', 150, 200, '수억 년 전 모습 그대로 살아남은 살아있는 화석.']
    ]
  };

  // [key, name, icon, color, desc]
  const JUNK_IDENTITY = [
    ['boots', '장화', '👢', '#8a8a8a', '꽝! 누군가 잃어버린 낡은 장화가 걸려 나왔다.'],
    ['can', '빈 깡통', '🥫', '#9a9a9a', '꽝! 찌그러진 빈 깡통이 걸려 나왔다.'],
    ['tire', '헌 타이어', '🛞', '#3a3a3a', '꽝! 낡아빠진 폐타이어가 걸려 나왔다.'],
    ['seaweed', '해초 뭉치', '🌿', '#4a7c4a', '꽝! 미끌미끌한 해초 뭉치가 걸려 나왔다.'],
    ['umbrella', '부러진 우산', '☂️', '#5a5a7a', '꽝! 살이 부러진 우산이 걸려 나왔다.'],
    ['shoe', '낡은 신발 한짝', '👞', '#6a5a4a', '꽝! 짝 잃은 낡은 신발 한 짝이 걸려 나왔다.'],
    ['bikeframe', '녹슨 자전거 프레임', '🚲', '#7a5a3a', '꽝! 녹슬어 못 쓰게 된 자전거 프레임이 걸려 나왔다.'],
    ['bottle', '플라스틱 병', '🧴', '#8ac0c8', '꽝! 찌그러진 플라스틱 병이 걸려 나왔다.'],
    ['brokenrod', '부서진 낚싯대', '🎣', '#6a6a6a', '꽝! 누군가 부러뜨리고 간 낚싯대가 걸려 나왔다.'],
    ['newspaper', '물에 젖은 신문지', '📰', '#c8c0a8', '꽝! 흐물흐물 젖어버린 신문지가 걸려 나왔다.']
  ];

  function buildSpecies() {
    const species = {};
    Object.keys(SPECIES_IDENTITY).forEach(tier => {
      const t = TIER_DIFFICULTY[tier];
      SPECIES_IDENTITY[tier].forEach(([key, name, icon, color, sizeMin, sizeMax, desc]) => {
        species[key] = {
          key, name, icon, color, tier,
          weight: t.weight, period: t.period, zoneWidth: t.zoneWidth,
          maxMisses: t.maxMisses, periodShrink: t.periodShrink, minPeriod: t.minPeriod,
          timeLimit: t.timeLimit, sizeRange: [sizeMin, sizeMax], unit: 'cm', desc
        };
      });
    });
    const jt = TIER_DIFFICULTY.junk;
    JUNK_IDENTITY.forEach(([key, name, icon, color, desc]) => {
      species[key] = {
        key, name, icon, color, tier: 'junk',
        weight: jt.weight, period: jt.period, zoneWidth: jt.zoneWidth,
        maxMisses: jt.maxMisses, periodShrink: jt.periodShrink, minPeriod: jt.minPeriod,
        timeLimit: jt.timeLimit, sizeRange: [1, 1], unit: '개', desc, isJunk: true
      };
    });
    return species;
  }
  const SPECIES = buildSpecies();
  const SPECIES_ORDER = Object.keys(SPECIES);

  // Forgiveness margin (percentage points) added to each side of the hit
  // zone -- absorbs input/render latency, and is deliberately generous
  // (15 points combined) since this is meant to be a relaxed healing game,
  // not a hardcore rhythm check.
  const HIT_TOLERANCE = 7.5;

  // ================= Economy / progression config =================
  const FISH_TIER_ORDINAL = { junk: 0, common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  const TIER_LABEL = { common: '일반', uncommon: '고급', rare: '희귀', epic: '특급', legendary: '전설', junk: '꽝?' };
  const TIER_COLOR = { common: '#b8c4c8', uncommon: '#6fcf7a', rare: '#5aa9e6', epic: '#a35ee8', legendary: '#ffcf4d', junk: '#8a8a8a' };
  // Tier price is the payout at a "typical" (mid-range) size for that species;
  // fishSellPrice() scales it up or down from there based on the actual catch size.
  // fishSellPrice() swings each sale +/-40% by catch size, so a tier's actual
  // price band is [base*0.6, base*1.4] -- consecutive tiers only stay
  // cleanly separated (no overlap) when a tier's base is > ~2.33x the one
  // below it. rare(400)->epic and epic->legendary used to fall short of that
  // (a big rare could out-sell a small epic, etc.); bumped both up so every
  // tier's floor now clears the tier below it's ceiling with room to spare.
  const SELL_PRICE = { junk: 10, common: 60, uncommon: 150, rare: 400, epic: 1000, legendary: 2400 };
  function fishSellPrice(species, size) {
    const base = SELL_PRICE[species.tier] || 1;
    const [minS, maxS] = species.sizeRange;
    const ratio = maxS > minS ? (size - minS) / (maxS - minS) : 0.5;
    const mult = 0.6 + Math.max(0, Math.min(1, ratio)) * 0.8; // 0.6x at min size, up to 1.4x at max size
    return Math.max(1, Math.round(base * mult));
  }

  const CONTAINER_TIERS = [
    { name: '대야', icon: '🪣', capacity: 5, cost: 0 },
    { name: '양동이', icon: '🧺', capacity: 10, cost: 100 },
    { name: '어항', icon: '🫙', capacity: 20, cost: 400 }
  ];

  const ROD_GRADE_ORDER = ['basic', 'rare', 'special'];
  const ROD_GRADE_LABEL = { basic: '일반', rare: '희귀', special: '특급' };
  const ROD_GRADE_BASE = { basic: 0, rare: 0.5, special: 1.1 };
  const ROD_GRADE_STEP = { basic: 0.05, rare: 0.06, special: 0.07 };
  const ROD_LEVEL_MAX = 10;
  // Level resets to 1 on a grade-up, but the cost shouldn't reset back to the
  // cheap early-game price with it -- a higher-grade rod's levels cost more.
  const ROD_GRADE_COST_MULT = { basic: 1, rare: 4, special: 10 };
  // Base cost was tuned back when a common fish sold for 8 shells; fish
  // prices have since gone up roughly 7-8x (see SELL_PRICE), so the old base
  // (20 + (lvl-1)*15) barely registered anymore. Scaled 3x here -- enough to
  // track the new economy without matching that inflation 1:1.
  const ROD_LEVEL_UP_COST = (level, grade) => Math.round((60 + (level - 1) * 45) * (ROD_GRADE_COST_MULT[grade] || 1));
  const ROD_GRADE_UP_COST = { rare: 900, special: 2400 }; // cost to upgrade INTO this grade (also scaled 3x, same reasoning)
  const ROD_GRADE_UP_MATERIAL_COUNT = 3;
  const MATERIAL_DROP_CHANCE = 0.12;
  // fish whose tier ordinal is below this (for the current rod grade) can be auto-skipped
  const ROD_SKIP_THRESHOLD = { basic: 0, rare: 2, special: 3 };

  // No bait beyond 기본(basic, free/default) is directly purchasable --
  // mid/high/super/legend are all 룰렛(roulette) prizes only. Their
  // bait-selector button stays hidden until the player actually owns one,
  // so the selector doesn't advertise baits nobody has yet.
  const BAIT_WEIGHT_MULT = {
    basic: { junk: 1, common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1 },
    mid: { junk: 0.5, common: 1, uncommon: 1.4, rare: 1.6, epic: 1.7, legendary: 1.8 },
    high: { junk: 0.2, common: 0.8, uncommon: 1.6, rare: 2.2, epic: 2.5, legendary: 2.8 },
    super: { junk: 0, common: 0, uncommon: 0, rare: 0, epic: 1, legendary: 1.1 },
    legend: { junk: 0, common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 1 }
  };
  // Each guaranteed bait's floor is bumped one tier up from its own name --
  // 중급(mid) guarantees at least 고급(uncommon), 고급(high) guarantees at
  // least 희귀(rare), 특급(super) guarantees at least 특급(epic). 기본(basic)
  // stays floor-less so 꽝 is still reachable somewhere in the game.
  // 'legend' guarantees 전설(legendary) -- the top tier, so its weight row
  // above is moot (nothing lower ever survives the floor filter) but is
  // spelled out for consistency with the other baits.
  const BAIT_MIN_TIER = { basic: null, mid: 'uncommon', high: 'rare', super: 'epic', legend: 'legendary' };

  // ================= Bait roulette (gacha) =================
  // The main gold sink: 300 shells per pull. Weighted so the expected value
  // of a pull sits well below its cost (a real sink, not another free-profit
  // loop like the old bait pricing) while still leaving real upside --
  // occasionally nothing, usually a cheap consolation, sometimes a real prize.
  const ROULETTE_PULL_COST = 300;
  const ROULETTE_BULK_PULLS = 10;
  const ROULETTE_BULK_BONUS = 1; // "10+1"
  const ROULETTE_PRIZES = [
    { key: null,     label: '꽝 (다음 기회에)', chance: 35 },
    { key: 'mid',    label: '중급 미끼',        chance: 42 },
    { key: 'high',   label: '고급 미끼',        chance: 16 },
    { key: 'super',  label: '특급 미끼',        chance: 6.99 },
    { key: 'legend', label: '전설 미끼',        chance: 0.01 }
  ];
  function rollRoulettePrize() {
    const total = ROULETTE_PRIZES.reduce((s, p) => s + p.chance, 0);
    let r = Math.random() * total;
    for (const p of ROULETTE_PRIZES) {
      r -= p.chance;
      if (r <= 0) return p;
    }
    return ROULETTE_PRIZES[ROULETTE_PRIZES.length - 1];
  }
  // pulls=1 for a single spin, or ROULETTE_BULK_PULLS for the discounted
  // bulk spin (which always grants ROULETTE_BULK_BONUS free pulls on top).
  function spinRoulette(pulls) {
    const cost = ROULETTE_PULL_COST * pulls;
    if (save.shells < cost) return null;
    save.shells -= cost;
    const totalPulls = pulls + (pulls >= ROULETTE_BULK_PULLS ? ROULETTE_BULK_BONUS : 0);
    const results = [];
    for (let i = 0; i < totalPulls; i++) {
      const prize = rollRoulettePrize();
      if (prize.key) save.baitStock[prize.key] = (save.baitStock[prize.key] || 0) + 1;
      results.push(prize);
    }
    persist();
    return results;
  }

  // ================= Persistence =================
  const SAVE_KEY = 'quiet-fishing-save-v1';
  function defaultSave() {
    return {
      catches: {}, casts: 0, bucket: [], newSpecies: [],
      shells: 0,
      rod: { grade: 'basic', level: 1 },
      materials: { rare: 0, special: 0 },
      containerTier: 0,
      baitStock: { mid: 0, high: 0, super: 0, legend: 0 },
      selectedBait: 'basic',
      skipEnabled: false
    };
  }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return defaultSave();
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  const save = loadSave();
  // fill in anything missing from an older save
  const DEFAULTS = defaultSave();
  if (!save.bucket) save.bucket = [];
  if (!save.newSpecies) save.newSpecies = [];
  if (typeof save.shells !== 'number') save.shells = DEFAULTS.shells;
  if (!save.rod) save.rod = DEFAULTS.rod;
  if (!save.materials) save.materials = DEFAULTS.materials;
  // Older saves may have accumulated more than the grade-up requirement from
  // before drops were capped -- clamp them down now.
  ROD_GRADE_ORDER.forEach(g => {
    if (save.materials[g] > ROD_GRADE_UP_MATERIAL_COUNT) save.materials[g] = ROD_GRADE_UP_MATERIAL_COUNT;
  });
  if (typeof save.containerTier !== 'number') save.containerTier = DEFAULTS.containerTier;
  if (!save.baitStock) save.baitStock = DEFAULTS.baitStock;
  if (typeof save.baitStock.super !== 'number') save.baitStock.super = 0;
  if (typeof save.baitStock.legend !== 'number') save.baitStock.legend = 0;
  if (!save.selectedBait) save.selectedBait = DEFAULTS.selectedBait;
  if (typeof save.skipEnabled !== 'boolean') save.skipEnabled = DEFAULTS.skipEnabled;

  function bucketCapacity() { return CONTAINER_TIERS[save.containerTier].capacity; }

  function addToBucket(species, size) {
    if (save.bucket.length >= bucketCapacity()) return false;
    save.bucket.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      key: species.key,
      size
    });
    persist();
    return true;
  }
  function releaseFish(id) {
    const idx = save.bucket.findIndex(f => f.id === id);
    if (idx === -1) return;
    save.bucket.splice(idx, 1);
    persist();
    renderBucket();
  }
  function sellFish(id) {
    const idx = save.bucket.findIndex(f => f.id === id);
    if (idx === -1) return;
    const item = save.bucket[idx];
    const species = SPECIES[item.key];
    const price = fishSellPrice(species, item.size);
    save.bucket.splice(idx, 1);
    save.shells += price;
    persist();
    updateShellsDisplay();
    renderShopPanel();
  }

  // ================= Rod power / difficulty =================
  function rodPower() {
    const g = save.rod.grade;
    return ROD_GRADE_BASE[g] + (save.rod.level - 1) * ROD_GRADE_STEP[g];
  }
  function applyRodDifficulty(species, hitsRequired) {
    const power = rodPower();
    return {
      period: species.period * (1 + power * 0.5),
      zoneWidth: Math.min(45, species.zoneWidth * (1 + power)),
      hitsRequired: Math.max(2, Math.round(hitsRequired / (1 + power * 0.4))),
      maxMisses: species.maxMisses + Math.round(power * 2),
      timeLimit: species.timeLimit * (1 + power * 0.4)
    };
  }
  function levelUpRod() {
    const level = save.rod.level;
    if (level >= ROD_LEVEL_MAX) return;
    const cost = ROD_LEVEL_UP_COST(level, save.rod.grade);
    if (save.shells < cost) return;
    save.shells -= cost;
    save.rod.level++;
    persist();
    updateShellsDisplay();
    renderRodPanel();
  }
  function gradeUpRod() {
    const idx = ROD_GRADE_ORDER.indexOf(save.rod.grade);
    const nextGrade = ROD_GRADE_ORDER[idx + 1];
    if (!nextGrade) return;
    if (save.rod.level < ROD_LEVEL_MAX) return;
    const have = save.materials[nextGrade] || 0;
    if (have < ROD_GRADE_UP_MATERIAL_COUNT) return;
    const cost = ROD_GRADE_UP_COST[nextGrade];
    if (save.shells < cost) return;
    save.materials[nextGrade] -= ROD_GRADE_UP_MATERIAL_COUNT;
    save.shells -= cost;
    save.rod.grade = nextGrade;
    save.rod.level = 1;
    persist();
    updateShellsDisplay();
    renderRodPanel();
  }
  function buyContainerUpgrade() {
    const nextTier = CONTAINER_TIERS[save.containerTier + 1];
    if (!nextTier) return;
    if (save.shells < nextTier.cost) return;
    save.shells -= nextTier.cost;
    save.containerTier++;
    persist();
    updateShellsDisplay();
    renderShopPanel();
  }
  function selectBait(key) {
    if (key !== 'basic' && save.baitStock[key] <= 0) return;
    save.selectedBait = key;
    persist();
    renderBaitSelector();
    setBaitSelectorExpanded(false); // pick one and the list folds back away
  }

  // ================= Audio (WebAudio, no assets) =================
  let actx = null;
  function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }
  function blip(freq, dur, type, vol) {
    if (!actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.15, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    osc.connect(gain).connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + dur);
  }
  const sfx = {
    cast: () => blip(220, 0.18, 'sine', 0.12),
    bite: () => { blip(500, 0.1, 'triangle', 0.15); setTimeout(() => blip(650, 0.12, 'triangle', 0.12), 90); },
    hookMiss: () => blip(150, 0.3, 'sawtooth', 0.1),
    hit: () => blip(700, 0.09, 'sine', 0.14),
    miss: () => blip(120, 0.2, 'square', 0.12),
    success: () => { blip(523, 0.12, 'sine', 0.15); setTimeout(() => blip(659, 0.12, 'sine', 0.15), 110); setTimeout(() => blip(784, 0.18, 'sine', 0.16), 220); },
    fail: () => { blip(300, 0.15, 'sawtooth', 0.12); setTimeout(() => blip(200, 0.25, 'sawtooth', 0.12), 130); },
    splash: () => { blip(90, 0.22, 'sine', 0.2); blip(180, 0.15, 'triangle', 0.1); },
    coin: () => { blip(880, 0.08, 'square', 0.1); setTimeout(() => blip(1180, 0.1, 'square', 0.1), 70); },
    material: () => { blip(660, 0.1, 'triangle', 0.17); setTimeout(() => blip(880, 0.1, 'triangle', 0.17), 90); setTimeout(() => blip(1180, 0.16, 'triangle', 0.16), 180); }
  };

  // ================= Background music (generative ambient, no assets) =================
  // A slow four-chord pad loop (long overlapping fades so chords crossfade
  // into each other) plus occasional soft plucked notes from the same scale
  // -- calm, lyric-less, meant to just sit under the fishing loop.
  const BGM_MUTE_KEY = 'quiet-fishing-bgm-muted-v1';
  let bgmMuted = false;
  try { bgmMuted = localStorage.getItem(BGM_MUTE_KEY) === '1'; } catch (e) { /* ignore */ }

  const BGM_VOLUME_KEY = 'quiet-fishing-bgm-volume-v1';
  let bgmVolume = 0.8;
  try {
    const storedVol = parseFloat(localStorage.getItem(BGM_VOLUME_KEY));
    if (!isNaN(storedVol) && storedVol >= 0 && storedVol <= 1) bgmVolume = storedVol;
  } catch (e) { /* ignore */ }

  // C major key. Just root+third (no fifth, no bass octave) -- a full sustained
  // triad down in the 87-165Hz range was reading as a lush, sweeping orchestral
  // pad. One octave higher and thinner sits back as a light indie-lo-fi wash
  // instead of a grand one.
  const BGM_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33]; // C D E G A C D major pentatonic
  const BGM_CHORDS = [
    [261.63, 329.63],  // C4 E4   -- C major (I)
    [196.00, 246.94],  // G3 B3   -- G major (V)
    [220.00, 261.63],  // A3 C4   -- A minor (vi)
    [174.61, 220.00]   // F3 A3   -- F major (IV)
  ];
  const BGM_CHORD_DUR = 6.5; // seconds each chord's own envelope lasts
  const BGM_CHORD_ADVANCE = BGM_CHORD_DUR * 0.8 * 1000; // next chord starts before this one fades out -> crossfade

  let bgmPlaying = false;
  let bgmMasterGain = null;
  let bgmChordTimer = null;
  let bgmPluckTimer = null;

  function playBgmChord(idx) {
    if (!bgmPlaying) return;
    const chord = BGM_CHORDS[idx % BGM_CHORDS.length];
    chord.forEach((freq) => {
      const osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.linearRampToValueAtTime(0.07 / chord.length, actx.currentTime + 1.8);
      g.gain.linearRampToValueAtTime(0.0001, actx.currentTime + BGM_CHORD_DUR);
      osc.connect(g).connect(bgmMasterGain);
      osc.start();
      osc.stop(actx.currentTime + BGM_CHORD_DUR + 0.1);
    });
    bgmChordTimer = setTimeout(() => playBgmChord(idx + 1), BGM_CHORD_ADVANCE);
  }

  function playBgmPluck() {
    if (!bgmPlaying) return;
    const freq = BGM_SCALE[Math.floor(Math.random() * BGM_SCALE.length)] * (Math.random() < 0.35 ? 2 : 1);
    const osc = actx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, actx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 2.4);
    osc.connect(g).connect(bgmMasterGain);
    osc.start();
    osc.stop(actx.currentTime + 2.5);
    scheduleBgmPluck();
  }

  function scheduleBgmPluck() {
    if (!bgmPlaying) return;
    bgmPluckTimer = setTimeout(playBgmPluck, 2500 + Math.random() * 4000);
  }

  function startBgm() {
    if (bgmPlaying || bgmMuted || !actx) return;
    bgmPlaying = true;
    bgmMasterGain = actx.createGain();
    bgmMasterGain.gain.value = bgmVolume; // per-note envelopes set relative loudness; this is the overall fader
    bgmMasterGain.connect(actx.destination);
    playBgmChord(0);
    scheduleBgmPluck();
  }

  function setBgmVolume(v) {
    bgmVolume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(BGM_VOLUME_KEY, String(bgmVolume)); } catch (e) { /* ignore */ }
    if (bgmMasterGain) {
      try { bgmMasterGain.gain.setValueAtTime(bgmVolume, actx.currentTime); } catch (e) { /* ignore */ }
    }
  }

  function stopBgm() {
    bgmPlaying = false;
    clearTimeout(bgmChordTimer);
    clearTimeout(bgmPluckTimer);
    if (bgmMasterGain) {
      const g = bgmMasterGain;
      try {
        g.gain.cancelScheduledValues(actx.currentTime);
        g.gain.setValueAtTime(g.gain.value, actx.currentTime);
        g.gain.linearRampToValueAtTime(0, actx.currentTime + 0.8);
      } catch (e) { /* ignore */ }
      setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 900);
      bgmMasterGain = null;
    }
  }

  function setBgmMuted(muted) {
    bgmMuted = muted;
    try { localStorage.setItem(BGM_MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (muted) stopBgm(); else startBgm();
    updateBgmButton();
  }

  // Autoplay policies require a user gesture before any audio can play --
  // start on the very first click/tap/keypress anywhere, same as ensureAudio().
  function primeBgmOnFirstInteraction() {
    const handler = () => {
      ensureAudio();
      startBgm();
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
  }
  primeBgmOnFirstInteraction();

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

  let bobberState = 'hidden'; // hidden | waiting | bite | reeling
  let bobberDipT = 0;
  let bobberTugT = -10; // set on each perfect hit while reeling
  function drawBobber(t) {
    if (bobberState === 'hidden') return;
    const top = waterTop();
    const bx = W * 0.5, byBase = top + (H - top) * 0.42;
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

  // ================= Game state machine =================
  const panels = {
    idle: document.getElementById('idle-panel'),
    waiting: document.getElementById('waiting-panel'),
    bite: document.getElementById('bite-panel'),
    reel: document.getElementById('reel-panel')
  };
  function showPanel(name) {
    Object.keys(panels).forEach(k => panels[k].classList.toggle('hidden', k !== name));
  }

  const castBtn = document.getElementById('cast-btn');
  const resultOverlay = document.getElementById('result-overlay');
  const resultCard = document.getElementById('result-card');
  const splashFlash = document.getElementById('splash-flash');
  const newBadge = document.getElementById('new-badge');
  const materialBadge = document.getElementById('material-badge');
  const resultIcon = document.getElementById('result-icon');
  const resultTierBadge = document.getElementById('result-tier-badge');
  const resultTitle = document.getElementById('result-title');
  const resultDesc = document.getElementById('result-desc');
  const resultBtn = document.getElementById('result-btn');
  // 도감 now lives inside the 보관함 overlay as a second sub-tab rather than
  // its own top-level button/overlay.
  const logNewDot = document.getElementById('log-new-dot');
  function updateLogDot() { logNewDot.classList.toggle('hidden', save.newSpecies.length === 0); }
  const logList = document.getElementById('log-list');
  const logTotal = document.getElementById('log-total');

  const bucketOverlay = document.getElementById('bucket-overlay');
  const bucketBtn = document.getElementById('bucket-btn');
  const bucketClose = document.getElementById('bucket-close');
  const bucketList = document.getElementById('bucket-list');
  const bucketTierNameEl = document.getElementById('bucket-tier-name');
  const bucketCapacityEl = document.getElementById('bucket-capacity');
  const bucketSubtabInventory = document.getElementById('bucket-subtab-inventory');
  const bucketSubtabLog = document.getElementById('bucket-subtab-log');
  const bucketViewEl = document.getElementById('bucket-view');
  const logViewEl = document.getElementById('log-view');
  function showBucketSubtab(tab) {
    const showLog = tab === 'log';
    bucketSubtabInventory.classList.toggle('active', !showLog);
    bucketSubtabLog.classList.toggle('active', showLog);
    bucketViewEl.classList.toggle('hidden', showLog);
    logViewEl.classList.toggle('hidden', !showLog);
    if (showLog) {
      renderLog();
      if (save.newSpecies.length) { save.newSpecies = []; persist(); updateLogDot(); }
    } else {
      renderBucket();
    }
  }

  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(text, ms) {
    toastEl.textContent = text;
    clearTimeout(toastTimer);
    toastEl.classList.remove('toast-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('toast-show');
    toastTimer = setTimeout(() => toastEl.classList.remove('toast-show'), ms || 1600);
  }

  // Non-blocking flourish shown when a fish is auto-skipped straight into the
  // bucket (no reeling minigame) -- a plain toast read as too flat for a catch.
  const autoCatchPopup = document.getElementById('auto-catch-popup');
  const autoCatchIcon = document.getElementById('auto-catch-icon');
  const autoCatchName = document.getElementById('auto-catch-name');
  const autoCatchTierEl = document.getElementById('auto-catch-tier');
  const autoCatchMeta = document.getElementById('auto-catch-meta');
  const autoCatchMaterialEl = document.getElementById('auto-catch-material');
  let autoCatchTimer = null;
  function showAutoCatchFlourish(species, size, isNewSpecies, materialDropped) {
    autoCatchIcon.textContent = species.icon;
    autoCatchName.textContent = species.isJunk ? `꽝! ${species.name}` : species.name;
    autoCatchTierEl.textContent = TIER_LABEL[species.tier];
    autoCatchTierEl.className = 'tier-badge tier-' + species.tier;
    const sizeText = species.isJunk ? '' : ` · ${size}${species.unit}`;
    const newText = isNewSpecies ? ' · 🆕NEW' : '';
    autoCatchMeta.textContent = `자동 낚시${sizeText}${newText}`;
    autoCatchMaterialEl.classList.toggle('hidden', !materialDropped);
    if (materialDropped) autoCatchMaterialEl.textContent = `🎁 ${ROD_GRADE_LABEL[materialDropped]} 재료 획득!`;
    autoCatchPopup.className = 'auto-catch-popup tier-' + species.tier;
    clearTimeout(autoCatchTimer);
    autoCatchPopup.classList.remove('show');
    void autoCatchPopup.offsetWidth;
    autoCatchPopup.classList.add('show');
    splashFlash.classList.remove('active');
    void splashFlash.offsetWidth;
    splashFlash.classList.add('active');
    if (materialDropped) sfx.material();
    // linger longer when there's an extra line worth actually reading
    autoCatchTimer = setTimeout(() => autoCatchPopup.classList.remove('show'), materialDropped ? 2000 : 1300);
  }

  const shellsCountEl = document.getElementById('shells-count');
  function updateShellsDisplay() { shellsCountEl.textContent = save.shells; }

  // Music controls live in the ⚙️ 설정 overlay now, not a standalone topbar button.
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsClose = document.getElementById('settings-close');
  const settingsBgmToggle = document.getElementById('settings-bgm-toggle');
  const settingsBgmVolume = document.getElementById('settings-bgm-volume');
  function updateBgmButton() {
    settingsBgmToggle.textContent = bgmMuted ? '🔇 꺼짐 (켜기)' : '🎵 켜짐 (끄기)';
  }
  settingsBgmToggle.addEventListener('click', () => { ensureAudio(); setBgmMuted(!bgmMuted); });
  settingsBgmVolume.value = Math.round(bgmVolume * 100);
  settingsBgmVolume.addEventListener('input', () => {
    setBgmVolume(settingsBgmVolume.value / 100);
  });
  settingsBtn.addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
  settingsClose.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
  settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden'); });

  const baitButtons = {
    basic: document.querySelector('.bait-btn[data-bait="basic"]'),
    mid: document.querySelector('.bait-btn[data-bait="mid"]'),
    high: document.querySelector('.bait-btn[data-bait="high"]'),
    super: document.querySelector('.bait-btn[data-bait="super"]'),
    legend: document.querySelector('.bait-btn[data-bait="legend"]')
  };
  const BAIT_DISPLAY_NAME = { basic: '기본', mid: '중급', high: '고급', super: '특급', legend: '전설' };

  const baitToggleBtn = document.getElementById('bait-toggle-btn');
  const baitToggleLabel = document.getElementById('bait-toggle-label');
  const baitSelectorEl = document.getElementById('bait-selector');
  function setBaitSelectorExpanded(expanded) {
    baitSelectorEl.classList.toggle('collapsed', !expanded);
    baitToggleBtn.classList.toggle('expanded', expanded);
    castBtn.classList.toggle('hidden', expanded);
  }
  baitToggleBtn.addEventListener('click', () => {
    setBaitSelectorExpanded(baitSelectorEl.classList.contains('collapsed'));
  });

  // 'super'/'legend' are 룰렛 (roulette) prizes only -- their button stays
  // hidden entirely until the player actually owns at least one, so the
  // selector doesn't advertise baits nobody can buy.
  function renderBaitSelector() {
    ['basic', 'mid', 'high', 'super', 'legend'].forEach(key => {
      const btn = baitButtons[key];
      const owned = key === 'basic' ? true : save.baitStock[key] > 0;
      if (key !== 'basic') btn.classList.toggle('hidden', !owned);
      btn.disabled = !owned;
      btn.classList.toggle('selected', save.selectedBait === key);
      const countEl = btn.querySelector('.bait-count');
      countEl.textContent = key === 'basic' ? '' : `x${save.baitStock[key] || 0}`;
    });
    baitToggleLabel.textContent = `🪱 ${BAIT_DISPLAY_NAME[save.selectedBait]} 미끼`;
  }

  // 낚싯대 업그레이드 panel now lives inside the shop overlay, not its own
  // button/overlay -- rendered via renderRodPanel() whenever the shop opens.
  const rodGradeLabelEl = document.getElementById('rod-grade-label');
  const rodLevelLabelEl = document.getElementById('rod-level-label');
  const rodPowerLabelEl = document.getElementById('rod-power-label');
  const rodLevelUpBtn = document.getElementById('rod-levelup-btn');
  const rodGradeUpBtn = document.getElementById('rod-gradeup-btn');
  const rodGradeUpInfoEl = document.getElementById('rod-gradeup-info');
  const skipToggle = document.getElementById('skip-toggle');
  const skipInfoEl = document.getElementById('skip-info');

  function renderRodPanel() {
    const grade = save.rod.grade;
    const level = save.rod.level;
    const power = rodPower();
    rodGradeLabelEl.textContent = `${ROD_GRADE_LABEL[grade]} 낚싯대`;
    rodLevelLabelEl.textContent = `Lv. ${level} / ${ROD_LEVEL_MAX}`;
    rodPowerLabelEl.textContent = `현재 난이도 완화: 약 ${Math.round(power * 100)}%`;

    if (level < ROD_LEVEL_MAX) {
      const cost = ROD_LEVEL_UP_COST(level, grade);
      rodLevelUpBtn.textContent = `레벨업 (🐚${cost})`;
      rodLevelUpBtn.disabled = save.shells < cost;
    } else {
      rodLevelUpBtn.textContent = '레벨 최대';
      rodLevelUpBtn.disabled = true;
    }

    const nextGrade = ROD_GRADE_ORDER[ROD_GRADE_ORDER.indexOf(grade) + 1];
    if (nextGrade) {
      const need = ROD_GRADE_UP_MATERIAL_COUNT;
      const have = save.materials[nextGrade] || 0;
      const cost = ROD_GRADE_UP_COST[nextGrade];
      rodGradeUpBtn.textContent = `${ROD_GRADE_LABEL[nextGrade]} 등급업 (🐚${cost})`;
      rodGradeUpInfoEl.textContent = `조건: 레벨 ${ROD_LEVEL_MAX} · 재료 ${have}/${need}개 (낚시로 확률 획득)`;
      rodGradeUpBtn.disabled = !(level >= ROD_LEVEL_MAX && have >= need && save.shells >= cost);
      rodGradeUpBtn.classList.remove('hidden');
    } else {
      rodGradeUpBtn.classList.add('hidden');
      rodGradeUpInfoEl.textContent = '이미 최고 등급 낚싯대예요!';
    }

    skipToggle.checked = save.skipEnabled;
    const skippable = Object.keys(FISH_TIER_ORDINAL).filter(k => FISH_TIER_ORDINAL[k] < ROD_SKIP_THRESHOLD[grade]);
    skipInfoEl.textContent = skippable.length
      ? `${skippable.map(k => TIER_LABEL[k]).join(', ')} 등급 물고기는 릴링 없이 자동으로 즉시 낚입니다.`
      : '지금 낚싯대로는 스킵 가능한 등급이 없어요.';
  }

  const shopOverlay = document.getElementById('shop-overlay');
  const shopBtn = document.getElementById('shop-btn');
  const shopClose = document.getElementById('shop-close');
  const shopShellsEl = document.getElementById('shop-shells');
  const shopSellList = document.getElementById('shop-sell-list');
  const shopContainerInfoEl = document.getElementById('shop-container-info');
  const shopContainerBtn = document.getElementById('shop-container-btn');
  const rouletteOddsEl = document.getElementById('roulette-odds');
  const roulettePull1Btn = document.getElementById('roulette-pull1-btn');
  const roulettePull11Btn = document.getElementById('roulette-pull11-btn');
  const rouletteResultEl = document.getElementById('roulette-result');
  const shopSubtabSell = document.getElementById('shop-subtab-sell');
  const shopSubtabUpgrade = document.getElementById('shop-subtab-upgrade');
  const shopSubtabGacha = document.getElementById('shop-subtab-gacha');
  const shopViewSell = document.getElementById('shop-view-sell');
  const shopViewUpgrade = document.getElementById('shop-view-upgrade');
  const shopViewGacha = document.getElementById('shop-view-gacha');

  function showShopSubtab(tab) {
    shopSubtabSell.classList.toggle('active', tab === 'sell');
    shopSubtabUpgrade.classList.toggle('active', tab === 'upgrade');
    shopSubtabGacha.classList.toggle('active', tab === 'gacha');
    shopViewSell.classList.toggle('hidden', tab !== 'sell');
    shopViewUpgrade.classList.toggle('hidden', tab !== 'upgrade');
    shopViewGacha.classList.toggle('hidden', tab !== 'gacha');
  }

  function renderRouletteOdds() {
    rouletteOddsEl.innerHTML = '';
    ROULETTE_PRIZES.forEach(p => {
      const chip = document.createElement('span');
      chip.className = 'odds-chip';
      chip.textContent = `${p.label} ${p.chance}%`;
      rouletteOddsEl.appendChild(chip);
    });
  }

  function renderRouletteResult(results) {
    rouletteResultEl.innerHTML = '';
    rouletteResultEl.classList.remove('hidden');
    results.forEach(prize => {
      const chip = document.createElement('span');
      chip.className = 'prize-chip' + (prize.key === 'super' ? ' won-super' : prize.key === 'legend' ? ' won-legend' : '');
      chip.textContent = prize.key ? prize.label : '꽝';
      rouletteResultEl.appendChild(chip);
    });
  }

  function pullRoulette(pulls) {
    const results = spinRoulette(pulls);
    if (!results) return;
    sfx.coin();
    renderRouletteResult(results);
    updateShellsDisplay();
    renderShopPanel();
    renderBaitSelector();
  }

  function renderShopPanel() {
    shopShellsEl.textContent = save.shells;

    shopSellList.innerHTML = '';
    if (save.bucket.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'bucket-empty';
      empty.textContent = '판매할 물고기가 없어요.';
      shopSellList.appendChild(empty);
    }
    save.bucket.forEach(item => {
      const species = SPECIES[item.key];
      if (!species) return;
      const price = fishSellPrice(species, item.size);
      const row = document.createElement('div');
      row.className = 'log-row';
      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = species.icon;
      const info = document.createElement('div');
      info.className = 'info';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = species.name;
      const tierBadge = document.createElement('span');
      tierBadge.className = 'tier-badge tier-' + species.tier;
      tierBadge.textContent = TIER_LABEL[species.tier];
      name.appendChild(tierBadge);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = (species.isJunk ? '잡동사니' : `${item.size}${species.unit}`) + ` · 🐚${price}`;
      info.appendChild(name); info.appendChild(meta);
      const sellBtn = document.createElement('button');
      sellBtn.className = 'release-btn';
      sellBtn.textContent = '판매';
      sellBtn.addEventListener('click', () => { sfx.coin(); sellFish(item.id); });
      row.appendChild(icon); row.appendChild(info); row.appendChild(sellBtn);
      shopSellList.appendChild(row);
    });

    const tier = CONTAINER_TIERS[save.containerTier];
    const nextTier = CONTAINER_TIERS[save.containerTier + 1];
    shopContainerInfoEl.textContent = `현재: ${tier.icon} ${tier.name} (${tier.capacity}칸)`;
    if (nextTier) {
      shopContainerBtn.textContent = `${nextTier.icon} ${nextTier.name}로 교체 (${nextTier.capacity}칸, 🐚${nextTier.cost})`;
      shopContainerBtn.disabled = save.shells < nextTier.cost;
      shopContainerBtn.classList.remove('hidden');
    } else {
      shopContainerBtn.classList.add('hidden');
    }

    const bulkCost = ROULETTE_PULL_COST * ROULETTE_BULK_PULLS;
    roulettePull1Btn.textContent = `1회 뽑기 (🐚${ROULETTE_PULL_COST})`;
    roulettePull1Btn.disabled = save.shells < ROULETTE_PULL_COST;
    roulettePull11Btn.textContent = `${ROULETTE_BULK_PULLS}+${ROULETTE_BULK_BONUS}회 뽑기 (🐚${bulkCost})`;
    roulettePull11Btn.disabled = save.shells < bulkCost;
  }

  const fishNameEl = document.getElementById('fish-name');
  const fishTierBadgeEl = document.getElementById('fish-tier-badge');
  const missHeartsEl = document.getElementById('miss-hearts');
  const hitDotsEl = document.getElementById('hit-dots');
  const gaugeTrack = document.getElementById('gauge-track');
  const gaugeZone = document.getElementById('gauge-zone');
  const gaugeIndicator = document.getElementById('gauge-indicator');
  const timeFill = document.getElementById('time-fill');

  let state = 'idle';
  let biteTimer = null;
  let waitingTimer = null;

  let currentSpecies = null;
  let currentCastBait = 'basic';
  let reel = null; // { period, zoneWidth, zoneLeft, hits, misses, hitsRequired, maxMisses, startT, timeLimit, timeStart, fromRight }

  function weightedPickSpecies(bait) {
    const mult = BAIT_WEIGHT_MULT[bait] || BAIT_WEIGHT_MULT.basic;
    const minTier = BAIT_MIN_TIER[bait];
    const minOrdinal = minTier ? FISH_TIER_ORDINAL[minTier] : 0;
    const pool = SPECIES_ORDER.filter(k => FISH_TIER_ORDINAL[SPECIES[k].tier] >= minOrdinal);
    const weights = pool.map(k => SPECIES[k].weight * (mult[SPECIES[k].tier] || 1));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return SPECIES[pool[i]];
    }
    return SPECIES[pool[pool.length - 1]];
  }

  function randomZoneLeft(width) {
    const margin = 2;
    return margin + Math.random() * (100 - width - margin * 2);
  }

  // ---------- idle -> cast ----------
  function cast() {
    if (state !== 'idle') return;
    ensureAudio();
    sfx.cast();
    save.casts++;

    currentCastBait = save.selectedBait;
    if (currentCastBait !== 'basic') {
      if (save.baitStock[currentCastBait] > 0) {
        save.baitStock[currentCastBait]--;
        if (save.baitStock[currentCastBait] <= 0) save.selectedBait = 'basic';
      } else {
        currentCastBait = 'basic';
        save.selectedBait = 'basic';
      }
    }
    persist();
    renderBaitSelector();

    state = 'waiting';
    bobberState = 'waiting';
    showPanel('waiting');
    const delay = 1600 + Math.random() * 2600;
    waitingTimer = setTimeout(triggerBite, delay);
  }

  function triggerBite() {
    if (state !== 'waiting') return;
    state = 'bite';
    bobberState = 'bite';
    bobberDipT = performance.now() / 1000;
    showPanel('bite');
    sfx.bite();
    // brief bite flourish, then reeling starts automatically -- no extra tap needed
    biteTimer = setTimeout(hookFish, 500);
  }

  function hookFish() {
    if (state !== 'bite') return;
    clearTimeout(biteTimer);
    ensureAudio();
    currentSpecies = weightedPickSpecies(currentCastBait);
    // A species caught for the first time always gets the full reeling +
    // result-card moment -- auto-skip would fly right past a new discovery.
    const isUndiscovered = !save.catches[currentSpecies.key];
    if (save.skipEnabled && !isUndiscovered && FISH_TIER_ORDINAL[currentSpecies.tier] < ROD_SKIP_THRESHOLD[save.rod.grade]) {
      instantCatch(currentSpecies);
      return;
    }
    startReel(currentSpecies);
  }

  function startReel(species) {
    state = 'reeling';
    bobberState = 'reeling';
    showPanel('reel');
    fishNameEl.textContent = '무언가 걸렸다...';
    // Keep the tier a surprise for a species never caught before -- no
    // spoiling "어? 전설이잖아" before the reveal on a first-time catch.
    // Show a NEW badge in its place instead of leaving the slot blank.
    const isUndiscovered = !save.catches[species.key];
    if (isUndiscovered) {
      fishTierBadgeEl.textContent = 'NEW';
      fishTierBadgeEl.className = 'tier-badge tier-new';
    } else {
      fishTierBadgeEl.textContent = TIER_LABEL[species.tier];
      fishTierBadgeEl.className = 'tier-badge tier-' + species.tier;
    }

    const baseHits = randomHitsRequired(species.tier);
    const diff = applyRodDifficulty(species, baseHits);
    reel = {
      period: diff.period,
      zoneWidth: diff.zoneWidth,
      zoneLeft: randomZoneLeft(diff.zoneWidth),
      hits: 0,
      misses: 0,
      hitsRequired: diff.hitsRequired,
      maxMisses: diff.maxMisses,
      startT: performance.now() / 1000,
      timeLimit: diff.timeLimit,
      timeStart: performance.now() / 1000,
      fromRight: Math.random() < 0.5
    };
    renderReelStatics(reel.hitsRequired, reel.maxMisses);
    positionZone();
    timeFill.style.transition = 'none';
    timeFill.style.width = '100%';
    timeFill.classList.remove('warn', 'danger');
    void timeFill.offsetWidth;
    timeFill.style.transition = '';
  }

  function renderReelStatics(hitsRequired, maxMisses) {
    missHeartsEl.innerHTML = '';
    for (let i = 0; i < maxMisses; i++) {
      const s = document.createElement('span');
      s.className = 'heart';
      s.textContent = '💙';
      missHeartsEl.appendChild(s);
    }
    hitDotsEl.innerHTML = '';
    for (let i = 0; i < hitsRequired; i++) {
      const d = document.createElement('span');
      d.className = 'dot';
      hitDotsEl.appendChild(d);
    }
  }

  function positionZone() {
    gaugeZone.style.left = reel.zoneLeft + '%';
    gaugeZone.style.width = reel.zoneWidth + '%';
  }

  function trianglePercent(elapsed, period) {
    const phase = (elapsed % period) / period;
    return phase < 0.5 ? phase * 2 * 100 : (1 - phase) * 2 * 100;
  }

  // fromRight flips the sweep so it starts from the right edge instead of
  // always the left -- alternated each hit so the direction feels varied.
  function indicatorPercent(elapsed, period, fromRight) {
    const p = trianglePercent(elapsed, period);
    return fromRight ? 100 - p : p;
  }

  function reelTick() {
    if (state === 'reeling' && reel) {
      const now = performance.now() / 1000;
      const elapsed = now - reel.startT;
      const pos = indicatorPercent(elapsed, reel.period, reel.fromRight);
      gaugeIndicator.style.left = pos + '%';

      const remaining = reel.timeLimit - (now - reel.timeStart);
      if (remaining <= 0) {
        timeFill.style.width = '0%';
        catchFail(currentSpecies, 'timeout');
      } else {
        const frac = remaining / reel.timeLimit;
        timeFill.style.width = (frac * 100) + '%';
        timeFill.classList.toggle('danger', frac < 0.3);
        timeFill.classList.toggle('warn', frac >= 0.3 && frac < 0.6);
      }
    }
    requestAnimationFrame(reelTick);
  }
  requestAnimationFrame(reelTick);

  function currentIndicatorPos() {
    const now = performance.now() / 1000;
    const elapsed = now - reel.startT;
    return indicatorPercent(elapsed, reel.period, reel.fromRight);
  }

  function attemptHit() {
    if (state !== 'reeling' || !reel) return;
    const pos = currentIndicatorPos();
    const inZone = pos >= reel.zoneLeft - HIT_TOLERANCE && pos <= reel.zoneLeft + reel.zoneWidth + HIT_TOLERANCE;
    const species = currentSpecies;
    if (inZone) {
      reel.hits++;
      sfx.hit();
      bobberTugT = performance.now() / 1000;
      gaugeTrack.classList.remove('flash-good'); void gaugeTrack.offsetWidth; gaugeTrack.classList.add('flash-good');
      const dots = hitDotsEl.children;
      if (dots[reel.hits - 1]) dots[reel.hits - 1].classList.add('filled');
      if (reel.hits >= reel.hitsRequired) {
        catchSuccess(species);
        return;
      }
      // ramp difficulty + reposition, refill the per-hit timer, and
      // alternate which edge the sweep starts from next
      reel.period = Math.max(species.minPeriod, reel.period * species.periodShrink);
      reel.zoneLeft = randomZoneLeft(reel.zoneWidth);
      reel.startT = performance.now() / 1000;
      reel.timeStart = performance.now() / 1000;
      reel.fromRight = !reel.fromRight;
      positionZone();
    } else {
      reel.misses++;
      sfx.miss();
      gaugeTrack.classList.remove('flash-bad'); void gaugeTrack.offsetWidth; gaugeTrack.classList.add('flash-bad');
      const hearts = missHeartsEl.children;
      if (hearts[reel.misses - 1]) hearts[reel.misses - 1].classList.add('lost');
      if (reel.misses >= reel.maxMisses) {
        catchFail(species);
      }
    }
  }

  function randSize(species) {
    const [a, b] = species.sizeRange;
    return (a + Math.random() * (b - a)).toFixed(1);
  }

  // shared reward logic for both a manually-played catch and an auto-skip catch
  function maybeDropMaterial() {
    const idx = ROD_GRADE_ORDER.indexOf(save.rod.grade);
    const nextGrade = ROD_GRADE_ORDER[idx + 1];
    if (!nextGrade) return null;
    // Capped at the grade-up requirement -- extra copies past that point are
    // useless clutter, so stop rolling for more once you already have enough.
    if ((save.materials[nextGrade] || 0) >= ROD_GRADE_UP_MATERIAL_COUNT) return null;
    if (Math.random() >= MATERIAL_DROP_CHANCE) return null;
    save.materials[nextGrade] = (save.materials[nextGrade] || 0) + 1;
    return nextGrade;
  }

  function grantCatch(species) {
    const size = randSize(species);
    const isNewSpecies = !save.catches[species.key];
    if (isNewSpecies) save.catches[species.key] = { count: 0, best: 0 };
    save.catches[species.key].count++;
    if (parseFloat(size) > save.catches[species.key].best) save.catches[species.key].best = parseFloat(size);
    if (isNewSpecies && !save.newSpecies.includes(species.key)) save.newSpecies.push(species.key);
    const bucketed = addToBucket(species, parseFloat(size));
    const materialDropped = maybeDropMaterial();
    persist();
    updateLogDot();
    return { size, isNewSpecies, bucketed, materialDropped };
  }

  function catchSuccess(species) {
    state = 'result';
    bobberState = 'hidden';
    sfx.splash();
    sfx.success();
    const r = grantCatch(species);
    const bucketNote = r.bucketed ? '' : ` (${CONTAINER_TIERS[save.containerTier].name}이(가) 가득 차서 담지 못했어요!)`;
    if (r.materialDropped) sfx.material();

    if (species.isJunk) {
      showResult(true, species, `꽝! ${species.name}(을)를 건졌어요`, species.desc + bucketNote, species.icon, true, r.isNewSpecies, r.materialDropped);
    } else {
      showResult(true, species, `${species.name}를 낚았어요!`, `${species.desc} (${r.size}${species.unit})${bucketNote}`, species.icon, true, r.isNewSpecies, r.materialDropped);
    }
  }

  function instantCatch(species) {
    sfx.splash();
    sfx.coin();
    const r = grantCatch(species);
    showAutoCatchFlourish(species, r.size, r.isNewSpecies, r.materialDropped);
    state = 'idle';
    bobberState = 'hidden';
    currentSpecies = null;
    showPanel('idle');
  }

  function catchFail(species, reason) {
    if (state !== 'reeling') return;
    state = 'result';
    bobberState = 'hidden';
    sfx.fail();
    const desc = reason === 'timeout'
      ? '시간이 다 되어 줄이 끊어졌어요. 다음엔 더 빠르게 맞춰보세요.'
      : '무언가 미끼만 먹고 도망갔어요. 다음엔 타이밍을 맞춰보세요.';
    showResult(false, species, '놓쳤어요...', desc, '💨');
  }

  function showResult(success, species, title, desc, icon, isCatch, isNewSpecies, materialGrade) {
    showPanel(null);
    resultIcon.textContent = icon;
    resultTierBadge.textContent = TIER_LABEL[species.tier];
    resultTierBadge.className = 'tier-badge tier-' + species.tier;
    resultTitle.textContent = title;
    resultDesc.textContent = desc;
    resultOverlay.classList.remove('hidden');
    newBadge.classList.toggle('hidden', !isNewSpecies);
    materialBadge.classList.toggle('hidden', !materialGrade);
    if (materialGrade) materialBadge.textContent = `🎁 ${ROD_GRADE_LABEL[materialGrade]} 재료!`;

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
    bobberState = 'hidden';
    currentSpecies = null;
    reel = null;
    showPanel('idle');
  }

  // ================= Collection log =================
  // Highest tier first (legendary down to junk), grouped under a header per tier.
  const LOG_TIER_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common', 'junk'];

  function renderLog() {
    logList.innerHTML = '';

    let totalCaught = 0;
    LOG_TIER_ORDER.forEach(tier => {
      const keysInTier = SPECIES_ORDER.filter(k => SPECIES[k].tier === tier);
      if (!keysInTier.length) return;
      const header = document.createElement('h3');
      header.className = 'shop-section-title';
      header.textContent = TIER_LABEL[tier];
      logList.appendChild(header);

      keysInTier.forEach(key => {
        const species = SPECIES[key];
        const record = save.catches[key];
        const row = document.createElement('div');
        row.className = 'log-row' + (record ? '' : ' undiscovered');
        const icon = document.createElement('div');
        icon.className = 'icon';
        icon.textContent = record ? species.icon : '❔';
        const info = document.createElement('div');
        info.className = 'info';
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = record ? species.name : '???';
        const tierBadge = document.createElement('span');
        tierBadge.className = 'tier-badge tier-' + tier;
        tierBadge.textContent = TIER_LABEL[tier];
        name.appendChild(tierBadge);
        if (record && save.newSpecies.includes(key)) {
          const tag = document.createElement('span');
          tag.className = 'dex-new-tag';
          tag.textContent = 'NEW';
          name.appendChild(tag);
        }
        const meta = document.createElement('div');
        meta.className = 'meta';
        if (record) {
          totalCaught += record.count;
          meta.textContent = species.isJunk
            ? `${record.count}회 획득`
            : `${record.count}회 낚음 · 최고 ${record.best}${species.unit}`;
        } else {
          meta.textContent = '아직 낚지 못했어요';
        }
        info.appendChild(name); info.appendChild(meta);
        row.appendChild(icon); row.appendChild(info);
        logList.appendChild(row);
      });
    });
    logTotal.textContent = `총 캐스팅 ${save.casts}회 (전체) · 이 지역 어획 ${totalCaught}마리`;
  }

  // ================= Container (보관함: 대야/양동이/어항) =================
  function renderBucket() {
    bucketList.innerHTML = '';
    const tier = CONTAINER_TIERS[save.containerTier];
    if (save.bucket.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'bucket-empty';
      empty.textContent = `아직 ${tier.name}이(가) 비어있어요. 낚시를 시작해보세요!`;
      bucketList.appendChild(empty);
    }
    save.bucket.forEach(item => {
      const species = SPECIES[item.key];
      if (!species) return;
      const row = document.createElement('div');
      row.className = 'log-row';
      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = species.icon;
      const info = document.createElement('div');
      info.className = 'info';
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = species.name;
      const tierBadge = document.createElement('span');
      tierBadge.className = 'tier-badge tier-' + species.tier;
      tierBadge.textContent = TIER_LABEL[species.tier];
      name.appendChild(tierBadge);
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = species.isJunk ? '잡동사니' : `${item.size}${species.unit}`;
      info.appendChild(name); info.appendChild(meta);
      const releaseBtn = document.createElement('button');
      releaseBtn.className = 'release-btn';
      releaseBtn.textContent = '방생';
      releaseBtn.addEventListener('click', () => releaseFish(item.id));
      row.appendChild(icon); row.appendChild(info); row.appendChild(releaseBtn);
      bucketList.appendChild(row);
    });
    bucketTierNameEl.textContent = `${tier.icon} ${tier.name}`;
    bucketCapacityEl.textContent = `${save.bucket.length} / ${tier.capacity}`;
  }

  // ================= Input handling =================
  function anyOverlayOpen() {
    return !bucketOverlay.classList.contains('hidden')
      || !shopOverlay.classList.contains('hidden')
      || !settingsOverlay.classList.contains('hidden');
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (e.repeat) return;
    if (anyOverlayOpen()) return;
    if (!resultOverlay.classList.contains('hidden')) { closeResult(); return; }
    if (state === 'idle') cast();
    else if (state === 'bite') hookFish();
    else if (state === 'reeling') attemptHit();
  });

  castBtn.addEventListener('click', cast);
  resultBtn.addEventListener('click', closeResult);
  gaugeTrack.addEventListener('click', attemptHit);

  bucketBtn.addEventListener('click', () => {
    bucketOverlay.classList.remove('hidden');
    showBucketSubtab('inventory');
  });
  bucketClose.addEventListener('click', () => bucketOverlay.classList.add('hidden'));
  bucketOverlay.addEventListener('click', (e) => { if (e.target === bucketOverlay) bucketOverlay.classList.add('hidden'); });
  bucketSubtabInventory.addEventListener('click', () => showBucketSubtab('inventory'));
  bucketSubtabLog.addEventListener('click', () => showBucketSubtab('log'));

  rodLevelUpBtn.addEventListener('click', levelUpRod);
  rodGradeUpBtn.addEventListener('click', gradeUpRod);
  skipToggle.addEventListener('change', () => {
    save.skipEnabled = skipToggle.checked;
    persist();
    renderRodPanel();
  });

  shopBtn.addEventListener('click', () => {
    renderShopPanel();
    renderRodPanel();
    rouletteResultEl.classList.add('hidden');
    showShopSubtab('sell');
    shopOverlay.classList.remove('hidden');
  });
  shopClose.addEventListener('click', () => shopOverlay.classList.add('hidden'));
  shopOverlay.addEventListener('click', (e) => { if (e.target === shopOverlay) shopOverlay.classList.add('hidden'); });
  shopSubtabSell.addEventListener('click', () => showShopSubtab('sell'));
  shopSubtabUpgrade.addEventListener('click', () => showShopSubtab('upgrade'));
  shopSubtabGacha.addEventListener('click', () => showShopSubtab('gacha'));
  shopContainerBtn.addEventListener('click', buyContainerUpgrade);
  roulettePull1Btn.addEventListener('click', () => pullRoulette(1));
  roulettePull11Btn.addEventListener('click', () => pullRoulette(ROULETTE_BULK_PULLS));

  Object.keys(baitButtons).forEach(key => {
    baitButtons[key].addEventListener('click', () => selectBait(key));
  });

  updateLogDot();
  updateShellsDisplay();
  updateBgmButton();
  renderBaitSelector();
  renderRouletteOdds();
  showPanel('idle');
})();
