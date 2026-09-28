// Host adapter for the Apps in Toss WebView. game.js never talks to the Toss
// SDK directly -- everything host-specific goes through window.Platform
// (storage / haptic / lockPortrait / exit / leaderboard / ready), so this
// file is the only place that imports @apps-in-toss/web-framework.
import { Analytics, Device, Game, Migration, SafeArea, Screen, Storage, User } from '@apps-in-toss/web-framework';

// Every key game.js reads through Platform.storage.get(). Toss Storage is
// async but game.js reads synchronously, so these are pulled into `cache`
// before the game starts (Platform.ready). A key missing here would always
// read as null -- add any new *_KEY from game.js to this list.
const SAVE_KEY = 'zanzanhan-fishing-save-v1';
const SETTING_KEYS = [
  'zanzanhan-lefty-mode-v1',
  'zanzanhan-skip-lowtier-v1',
  'zanzanhan-sfx-on-v1',
  'zanzanhan-bgm-on-v1',
  'zanzanhan-sfx-volume-v1',
  'zanzanhan-bgm-volume-v1',
];

// A bridge call that never answers (outside the Toss app, or a stuck
// bridge) must not keep the game on the title screen forever.
const BRIDGE_TIMEOUT_MS = 5000;
function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('bridge timeout')), BRIDGE_TIMEOUT_MS)),
  ]);
}

const cache = new Map();
// Set when Toss Storage couldn't be read at startup. Writing then would
// overwrite a real save we simply failed to load, so writes stay local.
let storageUnreadable = false;

// Fire-and-forget SDK call: an unsupported API may throw right away or
// reject later, and neither should reach the game.
function quietly(fn) {
  try { Promise.resolve(fn()).catch(() => {}); } catch (e) { /* ignore */ }
}

function localGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function localSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
function localRemove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

// SDK 3.x moved mini-apps to a new origin (<appName>.web.tossmini.com), so a
// save kept in the old origin's localStorage is only reachable through
// Migration. Only consulted when Toss Storage has nothing for a key, and
// only until the carry-over has been done once (MIGRATED_KEY) -- otherwise
// 데이터 삭제 would empty Toss Storage and the next launch would pull the old
// origin's save right back in.
const MIGRATED_KEY = 'zanzanhan-origin-migrated-v1';
async function readPreviousOriginLocalStorage() {
  try {
    const dump = await withTimeout(Migration.getOriginStorage());
    return { ok: true, data: (dump && dump.previous && dump.previous.localStorage) || {} };
  } catch (e) {
    return { ok: false, data: {} };
  }
}

function applySafeArea(insets) {
  if (!insets) return;
  const root = document.documentElement.style;
  root.setProperty('--host-safe-top', `${insets.top || 0}px`);
  root.setProperty('--host-safe-bottom', `${insets.bottom || 0}px`);
}

// game.js stamps every save with savedAt (ms). Settings and pre-v2.2 saves
// have none and read as 0.
function savedAt(str) {
  try { return Number(JSON.parse(str).savedAt) || 0; } catch (e) { return 0; }
}

async function hydrate() {
  // The identity and the storage reads don't depend on each other, so a
  // stuck bridge costs one BRIDGE_TIMEOUT_MS on the title screen, not two.
  const fixedKeys = [SAVE_KEY, ...SETTING_KEYS, MIGRATED_KEY];
  const [keyResult, readResult] = await Promise.allSettled([
    withTimeout(User.getAnonymousKey()),
    withTimeout(Promise.all(fixedKeys.map((k) => Storage.getItem(k)))),
  ]);
  const key = keyResult.status === 'fulfilled' ? keyResult.value : null;
  if (key && key.type === 'HASH' && key.hash) Platform.userKey = key.hash;
  let values;
  if (readResult.status === 'fulfilled') {
    values = readResult.value;
  } else {
    storageUnreadable = true;
    values = fixedKeys.map(() => null);
  }
  const migrated = values.pop() != null || localGet(MIGRATED_KEY) != null;

  const keys = [SAVE_KEY, ...SETTING_KEYS];
  // This account's parked save (shared-device case, see game.js loadSave) --
  // its key needs the identity, so it's the one read that has to wait for it.
  if (Platform.userKey) {
    const ownKey = `${SAVE_KEY}:${Platform.userKey}`;
    keys.push(ownKey);
    let own = null;
    if (!storageUnreadable) {
      try { own = await withTimeout(Storage.getItem(ownKey)); } catch (e) { own = null; }
    }
    values.push(own);
  }

  let previousOrigin = null;
  for (let i = 0; i < keys.length; i++) {
    let value = values[i];
    const local = localGet(keys[i]);
    // A session that couldn't read Toss Storage saved only to localStorage;
    // if that copy is newer, it wins (and is copied back below).
    if (value == null || (local != null && savedAt(local) > savedAt(value))) {
      if (local != null) { value = local; values[i] = null; }
    }
    if (value == null && !migrated) {
      if (!previousOrigin) previousOrigin = await readPreviousOriginLocalStorage();
      value = previousOrigin.data[keys[i]] ?? null;
    }
    if (value == null) continue;
    cache.set(keys[i], value);
    // Found only in a fallback location -- copy it into Toss Storage so the
    // next launch reads it from there directly.
    if (values[i] == null && !storageUnreadable) {
      localSet(keys[i], value);
      quietly(() => Storage.setItem(keys[i], value));
    }
  }
  // Mark the carry-over done only when it really ran: Toss Storage was
  // readable (so the copies above went out) and the old origin either
  // answered or wasn't needed. A timed-out Migration call retries next launch.
  if (!migrated && !storageUnreadable && (!previousOrigin || previousOrigin.ok)) {
    localSet(MIGRATED_KEY, '1');
    quietly(() => Storage.setItem(MIGRATED_KEY, '1'));
  }

  try {
    applySafeArea(SafeArea.get());
    SafeArea.subscribe({ onEvent: applySafeArea });
  } catch (e) { /* env(safe-area-inset-*) in style.css still applies */ }
}

const Platform = {
  name: 'apps-in-toss',
  // Toss anonymous key (a per-mini-app hash), filled in by hydrate(). game.js
  // stores it in the save to tell apart accounts sharing one device.
  userKey: null,
  storage: {
    get(key) {
      return cache.has(key) ? cache.get(key) : localGet(key);
    },
    set(key, value) {
      const str = String(value);
      cache.set(key, str);
      localSet(key, str);
      if (!storageUnreadable) quietly(() => Storage.setItem(key, str));
    },
    // Only used by 데이터 삭제, which reloads right after -- so this resolves
    // once Toss Storage has dropped the key (or gave up), and it removes even
    // when startup couldn't read Storage: an explicit delete is exactly the
    // overwrite the storageUnreadable guard otherwise holds back.
    remove(key) {
      cache.delete(key);
      localRemove(key);
      return withTimeout(Promise.resolve().then(() => Storage.removeItem(key))).catch(() => {});
    },
  },
  // game.js already speaks the SDK's haptic vocabulary (tickWeak,
  // basicMedium, success, error, ...), so the type passes straight through.
  haptic(type) {
    quietly(() => Device.triggerHaptic({ type }));
  },
  // The Toss container keeps mini-apps in portrait; nothing to do here.
  lockPortrait() {},
  exit() {
    quietly(() => Screen.close());
  },
  // 게임센터 leaderboard, ranked by 누적 판매 조개.
  hasLeaderboard: true,
  submitScore(score) {
    quietly(() => Game.setLeaderboardScore({ score: String(score) }));
  },
  openLeaderboard() {
    quietly(() => Game.openLeaderboard());
  },
  // Progress milestones for the console's 분석 > 이벤트 view. Callers pass
  // only coarse game state (stage key, rod grade, counts) -- never free text
  // or anything about the player. The SDK attaches the Toss anonymous key
  // on its own.
  track(name, params) {
    quietly(() => Analytics.log({ log_name: name, log_type: 'event', params: params || {} }));
  },
  ready: null,
};

Platform.ready = hydrate().catch(() => {});
window.Platform = Platform;
