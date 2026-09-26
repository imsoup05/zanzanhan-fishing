// ================= 의뢰 게시판 (requests) data =================
// Loaded after fish-data.js, before game.js. Pure data + helpers -- no DOM,
// no save access. game.js owns the board state and calls these to make,
// match and describe requests. Design notes: md/REQUESTS.md.
(() => {
  'use strict';

  const SLOT_COUNT = 3;
  const TIER_RANK = { junk: 0, common: 1, rare: 2, epic: 3, legendary: 4 };

  // Reward table. No 조개 on purpose: requests are a reason to come back,
  // not a new income line (the 수족관 already soaks up shells, and shell
  // rewards would offset it). No 전설 미끼 either -- that stays behind the
  // gacha's 80-pull pity.
  const REWARDS = {
    speciesCommon: { bait: { common: 3 } },   // 일반 어종 3마리
    speciesRare: { bait: { rare: 1 } },       // 희귀 어종 1마리
    sizeCommon: { bait: { rare: 1 } },        // 일반 어종 큰 개체 1마리
    sizeRare: { bait: { rare: 2 } },          // 희귀 어종 큰 개체 1마리
    tierRare: { bait: { rare: 2 } },          // 희귀 이상 3마리
    tierEpic: { gems: 1, bait: { epic: 1 } }  // 특급 이상 1마리
  };
  // A "big one" is the top 30% of the species' own size range.
  const SIZE_QUANTILE = 0.7;

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  // Identity used to keep the board from showing the same ask twice. Tier
  // asks read alike whatever the stage ("희귀 이상 3마리"), so at most one.
  function keyOf(req) {
    if (req.kind === 'tier') return 'tier';
    return [req.kind, req.stage, req.speciesId].join(':');
  }

  function build(stage) {
    const pools = FishData.FISH_BY_STAGE[stage];
    const roll = Math.random();
    if (roll < 0.45) {
      const tier = Math.random() < 0.7 ? 'common' : 'rare';
      const sp = pick(pools[tier]);
      return {
        kind: 'species', stage, speciesId: sp.id, tier,
        count: tier === 'common' ? 3 : 1,
        reward: tier === 'common' ? REWARDS.speciesCommon : REWARDS.speciesRare
      };
    }
    if (roll < 0.75) {
      const tier = Math.random() < 0.7 ? 'common' : 'rare';
      const sp = pick(pools[tier]);
      const [lo, hi] = sp.sizeRange;
      return {
        kind: 'size', stage, speciesId: sp.id, tier,
        minSize: Math.round(lo + (hi - lo) * SIZE_QUANTILE),
        count: 1,
        reward: tier === 'common' ? REWARDS.sizeCommon : REWARDS.sizeRare
      };
    }
    const epic = Math.random() < 0.4;
    return {
      kind: 'tier', stage, tier: epic ? 'epic' : 'rare',
      count: epic ? 1 : 3,
      reward: epic ? REWARDS.tierEpic : REWARDS.tierRare
    };
  }

  // A fresh request for one of the unlocked stages that isn't already on
  // the board (`taken` = keyOf() of the others). Gives up on uniqueness
  // after a few tries rather than looping -- a duplicate is harmless.
  function make(stagesUnlocked, taken) {
    const stages = FishData.STAGE_ORDER.filter((s) => stagesUnlocked.includes(s));
    let req = build(pick(stages));
    for (let i = 0; i < 8 && taken.includes(keyOf(req)); i++) req = build(pick(stages));
    return { ...req, progress: 0 };
  }

  // Does this (non-practice) catch count toward the request?
  function matches(req, c) {
    if (!req || c.tier === 'junk' || c.stage !== req.stage) return false;
    if (req.kind === 'species') return c.id === req.speciesId;
    if (req.kind === 'size') return c.id === req.speciesId && c.size >= req.minSize;
    if (req.kind === 'tier') return TIER_RANK[c.tier] >= TIER_RANK[req.tier];
    return false;
  }

  function isDone(req) { return !!req && req.progress >= req.count; }

  function title(req) {
    if (req.kind === 'tier') return `${FishData.TIERS[req.tier].label} 이상 ${req.count}마리 낚기`;
    const sp = FishData.speciesById(req.speciesId);
    const name = sp ? sp.species.name : req.speciesId;
    if (req.kind === 'size') return `${req.minSize}cm 넘는 ${name} 낚기`;
    return `${name} ${req.count}마리 낚기`;
  }

  function iconPath(req) {
    if (req.kind === 'tier') return `icons/ui/bait-${req.tier}.svg`;
    return FishData.speciesIconPath(req.tier, req.speciesId);
  }

  // Drops requests that no longer make sense for this build (a species
  // removed from the roster, a stage renamed) and pads to SLOT_COUNT.
  function normalizeList(list) {
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const r = Array.isArray(list) ? list[i] : null;
      const ok = r && FishData.STAGES[r.stage] && (r.kind === 'tier' ? TIER_RANK[r.tier] : FishData.speciesById(r.speciesId));
      out.push(ok ? r : null);
    }
    return out;
  }

  window.RequestsData = { SLOT_COUNT, REWARDS, keyOf, make, matches, isDone, title, iconPath, normalizeList };
})();
