// 도전과제 definitions plus the bookkeeping shape they read from. Loaded
// before game.js (same idea as fish-data.js). game.js owns the counters
// (persisted in the save under `achievements`) and calls evaluate() after
// every event that could complete one.
(function () {
  'use strict';
  const TIER_ORDER = ['common', 'rare', 'epic', 'legendary'];

  // Counters that can't be rebuilt from the rest of the save.
  function freshStats() {
    return {
      casts: 0, catchTotal: 0, junkTotal: 0,
      tierTotals: { common: 0, rare: 0, epic: 0, legendary: 0 },
      streak: 0, maxStreak: 0, fails: 0, perfectEpic: 0, clutchCatches: 0,
      junkStreak: 0, maxJunkStreak: 0,
      sells: 0, shellsEarned: 0, maxSalePrice: 0, gemsEarned: 0,
      pulls: 0, tenPulls: 0, legendaryBaitPulls: 0, pityHits: 0, maxEpicInTen: 0,
      baitsUsed: { rare: false, epic: false, legendary: false },
      lastSpeciesId: null, sameSpeciesStreak: 0, maxSameSpeciesStreak: 0,
      maxSize: 0, biggestImugi: 0
    };
  }
  function freshState() { return { unlocked: {}, stats: freshStats() }; }

  // Saves from before 도전과제 existed: rebuild whatever the 도감 already
  // recorded (per-species counts and bests); everything else starts at 0.
  function stateFromLegacySave(save) {
    const st = freshStats();
    const catches = save.catches || {};
    TIER_ORDER.forEach((tier) => {
      FishData.FISH_BY_TIER[tier].forEach((sp) => {
        const rec = catches[sp.id];
        if (!rec) return;
        st.catchTotal += rec.count || 0;
        st.tierTotals[tier] += rec.count || 0;
        if ((rec.best || 0) > st.maxSize) st.maxSize = rec.best;
        if (sp.id === 'imugi' && (rec.best || 0) > st.biggestImugi) st.biggestImugi = rec.best;
      });
    });
    st.casts = st.catchTotal;
    return { unlocked: {}, stats: st };
  }

  // ctx = { s: stats above, catches, shells, gems, rod, playerStats }
  const discovered = (c, tier) => FishData.FISH_BY_TIER[tier].filter((sp) => c.catches[sp.id]).length;
  const discoveredAll = (c) => TIER_ORDER.reduce((n, t) => n + discovered(c, t), 0);
  const speciesTotal = () => TIER_ORDER.reduce((n, t) => n + FishData.FISH_BY_TIER[t].length, 0);
  const maxSpeciesCount = (c) => Object.keys(c.catches).reduce((m, id) => Math.max(m, c.catches[id].count || 0), 0);
  const statLevels = (c) => Object.keys(FishData.PLAYER_STATS).map((k) => c.playerStats[k] || 0);

  // Counting goals get a progress readout; flags just flip.
  const counter = (get, goal) => ({ test: (c) => get(c) >= goal, progress: (c) => [Math.min(get(c), goal), goal] });
  const flag = (test) => ({ test });

  const LIST = [
    // ---- 낚시 ----
    { id: 'first_cast', cat: '낚시', title: '낚싯대를 처음 던졌다!', desc: '물 위를 탭해서 첫 캐스팅', ...counter((c) => c.s.casts, 1) },
    { id: 'casts_100', cat: '낚시', title: '캐스팅 100회', desc: '낚싯대를 100번 던졌다', ...counter((c) => c.s.casts, 100) },
    { id: 'first_fish', cat: '낚시', title: '첫 물고기를 낚았다!', desc: '꽝이 아닌 진짜 물고기를 처음 낚았다', ...counter((c) => c.s.catchTotal, 1) },
    { id: 'fish_10', cat: '낚시', title: '물고기 10마리', desc: '물고기를 10마리 낚았다', ...counter((c) => c.s.catchTotal, 10) },
    { id: 'fish_50', cat: '낚시', title: '물고기 50마리', desc: '물고기를 50마리 낚았다', ...counter((c) => c.s.catchTotal, 50) },
    { id: 'fish_100', cat: '낚시', title: '물고기 100마리', desc: '물고기를 100마리 낚았다', ...counter((c) => c.s.catchTotal, 100) },
    { id: 'fish_500', cat: '낚시', title: '물고기 500마리', desc: '물고기를 500마리 낚았다', ...counter((c) => c.s.catchTotal, 500) },
    { id: 'fish_1000', cat: '낚시', title: '물고기 1,000마리', desc: '물고기를 1,000마리 낚았다. 다리 밑의 터줏대감', ...counter((c) => c.s.catchTotal, 1000) },
    { id: 'first_junk', cat: '낚시', title: '꽝을 낚았다...', desc: '물고기가 아니어도 뭔가는 낚았다', ...counter((c) => c.s.junkTotal, 1) },
    { id: 'junk_30', cat: '낚시', title: '낚시터 청소부', desc: '꽝 아이템을 30개 건져 올렸다', ...counter((c) => c.s.junkTotal, 30) },
    { id: 'first_rare', cat: '낚시', title: '첫 희귀 물고기!', desc: '희귀 등급 물고기를 처음 낚았다', ...counter((c) => c.s.tierTotals.rare, 1) },
    { id: 'first_epic', cat: '낚시', title: '첫 특급 물고기!', desc: '특급 등급 물고기를 처음 낚았다', ...counter((c) => c.s.tierTotals.epic, 1) },
    { id: 'epic_10', cat: '낚시', title: '특급 물고기 10마리', desc: '특급 등급 물고기를 10마리 낚았다', ...counter((c) => c.s.tierTotals.epic, 10) },
    { id: 'legendary_5', cat: '낚시', title: '이무기를 5번 낚았다!', desc: '전설 등급 물고기를 5마리 낚았다', ...counter((c) => c.s.tierTotals.legendary, 5) },
    { id: 'streak_5', cat: '낚시', title: '5연속 낚기 성공!', desc: '놓치지 않고 5마리를 연속으로 낚았다', ...counter((c) => c.s.maxStreak, 5) },
    { id: 'streak_15', cat: '낚시', title: '15연속 낚기 성공!', desc: '놓치지 않고 15마리를 연속으로 낚았다', ...counter((c) => c.s.maxStreak, 15) },
    { id: 'perfect_epic', cat: '낚시', title: '완벽한 릴링', desc: '미스 없이 특급 이상 물고기를 낚았다', ...counter((c) => c.s.perfectEpic, 1) },
    { id: 'first_fail', cat: '낚시', title: '놓쳤다...', desc: '다음엔 타이밍을 맞춰보자', ...counter((c) => c.s.fails, 1) },
    { id: 'clutch', cat: '낚시', title: '마지막 기회에 낚았다!', desc: '미스 허용치를 다 쓰기 직전에 낚아 올렸다', ...counter((c) => c.s.clutchCatches, 1) },
    { id: 'junk_streak_3', cat: '낚시', title: '오늘은 날이 아닌가...', desc: '꽝만 3번 연속 낚았다', ...counter((c) => c.s.maxJunkStreak, 3) },
    { id: 'big_100', cat: '낚시', title: '대물!', desc: '100cm가 넘는 물고기를 낚았다', ...flag((c) => c.s.maxSize >= 100) },
    { id: 'same_species_3', cat: '낚시', title: '단골 손님', desc: '같은 물고기를 3번 연속 낚았다', ...counter((c) => c.s.maxSameSpeciesStreak, 3) },
    // ---- 도감 ----
    { id: 'dex_5', cat: '도감', title: '도감 5종', desc: '서로 다른 물고기 5종을 낚았다', ...counter(discoveredAll, 5) },
    { id: 'dex_10', cat: '도감', title: '도감 10종', desc: '서로 다른 물고기 10종을 낚았다', ...counter(discoveredAll, 10) },
    { id: 'dex_20', cat: '도감', title: '도감 20종', desc: '서로 다른 물고기 20종을 낚았다', ...counter(discoveredAll, 20) },
    { id: 'dex_common_all', cat: '도감', title: '일반 물고기 완성', desc: '일반 등급 물고기를 전부 낚았다', ...counter((c) => discovered(c, 'common'), FishData.FISH_BY_TIER.common.length) },
    { id: 'dex_rare_all', cat: '도감', title: '희귀 물고기 완성', desc: '희귀 등급 물고기를 전부 낚았다', ...counter((c) => discovered(c, 'rare'), FishData.FISH_BY_TIER.rare.length) },
    { id: 'dex_epic_all', cat: '도감', title: '특급 물고기 완성', desc: '특급 등급 물고기를 전부 낚았다', ...counter((c) => discovered(c, 'epic'), FishData.FISH_BY_TIER.epic.length) },
    { id: 'dex_all', cat: '도감', title: '모든 물고기를 낚았다!', desc: '도감의 모든 종을 낚았다', ...counter(discoveredAll, speciesTotal()) },
    { id: 'species_10', cat: '도감', title: '단골', desc: '한 종의 물고기를 10번 낚았다', ...counter(maxSpeciesCount, 10) },
    { id: 'species_50', cat: '도감', title: '전문가', desc: '한 종의 물고기를 50번 낚았다', ...counter(maxSpeciesCount, 50) },
    // ---- 상점 ----
    { id: 'first_sell', cat: '상점', title: '첫 판매!', desc: '보관함의 물고기를 처음 팔았다', ...counter((c) => c.s.sells, 1) },
    { id: 'shells_1000', cat: '상점', title: '첫 목돈', desc: '조개 1,000개를 모았다', ...counter((c) => c.shells, 1000) },
    { id: 'shells_10000', cat: '상점', title: '조개 부자', desc: '조개 10,000개를 모았다', ...counter((c) => c.shells, 10000) },
    { id: 'shells_100000', cat: '상점', title: '조개 재벌', desc: '조개 100,000개를 모았다', ...counter((c) => c.shells, 100000) },
    { id: 'earned_50000', cat: '상점', title: '누적 판매 50,000', desc: '판매로 조개 50,000개를 벌었다', ...counter((c) => c.s.shellsEarned, 50000) },
    { id: 'sale_5000', cat: '상점', title: '한 마리에 5,000', desc: '물고기 한 마리를 조개 5,000개 이상에 팔았다', ...flag((c) => c.s.maxSalePrice >= 5000) },
    { id: 'first_gem', cat: '상점', title: '첫 보석!', desc: '물고기를 낚다가 보석을 처음 얻었다', ...counter((c) => c.s.gemsEarned, 1) },
    // ---- 뽑기 ----
    { id: 'first_pull', cat: '뽑기', title: '첫 미끼 뽑기!', desc: '상점에서 미끼를 처음 뽑았다', ...counter((c) => c.s.pulls, 1) },
    { id: 'first_ten', cat: '뽑기', title: '첫 10뽑!', desc: '10뽑을 처음 돌렸다', ...counter((c) => c.s.tenPulls, 1) },
    { id: 'pulls_100', cat: '뽑기', title: '미끼 뽑기 100회', desc: '미끼를 100번 뽑았다', ...counter((c) => c.s.pulls, 100) },
    { id: 'legendary_bait', cat: '뽑기', title: '미끼뽑기에서 전설미끼를 뽑았다!', desc: '전설 미끼가 나왔다', ...counter((c) => c.s.legendaryBaitPulls, 1) },
    { id: 'pity', cat: '뽑기', title: '천장까지 갔다', desc: '80번째 뽑기의 확정 전설 미끼를 받았다', ...counter((c) => c.s.pityHits, 1) },
    { id: 'bait_all_used', cat: '뽑기', title: '미끼 3종 사용', desc: '희귀·특급·전설 미끼로 각각 낚시해 봤다', test: (c) => c.s.baitsUsed.rare && c.s.baitsUsed.epic && c.s.baitsUsed.legendary, progress: (c) => [['rare', 'epic', 'legendary'].filter((k) => c.s.baitsUsed[k]).length, 3] },
    // ---- 강화 ----
    { id: 'rod_lv2', cat: '강화', title: '낚싯대 첫 강화!', desc: '낚싯대를 처음 강화했다', ...flag((c) => c.rod.level >= 2 || c.rod.grade !== 'common') },
    { id: 'rod_rare', cat: '강화', title: '희귀 낚싯대', desc: '낚싯대를 희귀 등급으로 올렸다', ...flag((c) => c.rod.grade === 'rare' || c.rod.grade === 'epic') },
    { id: 'rod_epic', cat: '강화', title: '특급 낚싯대', desc: '낚싯대를 특급 등급으로 올렸다', ...flag((c) => c.rod.grade === 'epic') },
    { id: 'rod_max', cat: '강화', title: '낚싯대 완성', desc: '특급 낚싯대 Lv.10 달성', ...flag((c) => c.rod.grade === 'epic' && c.rod.level >= FishData.ROD_MAX_LEVEL) },
    { id: 'stat_max_one', cat: '강화', title: '스탯 하나 만렙', desc: '근력·행운·정밀함 중 하나를 최대까지 올렸다', ...flag((c) => statLevels(c).some((v) => v >= FishData.PLAYER_STAT_MAX_LEVEL)) },
    { id: 'stat_max_all', cat: '강화', title: '모든 스탯 만렙', desc: '근력·행운·정밀함을 전부 최대까지 올렸다', ...counter((c) => statLevels(c).reduce((a, b) => a + b, 0), FishData.PLAYER_STAT_MAX_LEVEL * Object.keys(FishData.PLAYER_STATS).length) },
    // ---- 히든: shown as ??? until cleared ----
    { id: 'hidden_first_legendary', cat: '히든', hidden: true, title: '전설급 물고기를 처음으로 낚았다!', desc: '이무기를 처음 낚았다', ...flag((c) => c.s.tierTotals.legendary >= 1) },
    { id: 'hidden_biggest_imugi', cat: '히든', hidden: true, title: '크기가 가장 큰 이무기를 낚았다!', desc: '495cm가 넘는 이무기를 낚았다', ...flag((c) => c.s.biggestImugi >= 495) },
    { id: 'hidden_pulls_300', cat: '히든', hidden: true, title: '미끼 뽑기를 300회 진행했다!', desc: '미끼를 300번 뽑았다', ...flag((c) => c.s.pulls >= 300) },
    { id: 'hidden_ten_epics', cat: '히든', hidden: true, title: '한 번의 10뽑에서 특급 이상 5장!', desc: '10뽑 한 번에 특급 이상 미끼가 5장 이상 나왔다', ...flag((c) => c.s.maxEpicInTen >= 5) },
    { id: 'hidden_same_species_5', cat: '히든', hidden: true, title: '같은 물고기를 5번 연속 낚았다!', desc: '한 종만 5번 연달아 낚았다', ...flag((c) => c.s.maxSameSpeciesStreak >= 5) }
  ];
  const BY_ID = {};
  LIST.forEach((a) => { BY_ID[a.id] = a; });

  // Ids of everything not yet unlocked whose condition now holds.
  function evaluate(ctx, unlocked) {
    return LIST.filter((a) => !unlocked[a.id] && a.test(ctx)).map((a) => a.id);
  }

  window.Achievements = { LIST, byId: (id) => BY_ID[id], freshState, freshStats, stateFromLegacySave, evaluate };
})();
