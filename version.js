// ================= Release version (GAME_VERSION) =================
// Single source of truth for the release number shown in PATCH.md/README
// (x.y.z -- x=대규모 업데이트, y=밸런스 패치, z=오류 수정). Bump this on
// every push per AGENT.md's version rule.
//
// Loaded by BOTH contexts that need it, from this one file, so there's
// nothing to keep in sync by hand:
//   - index.html <script> tag -> exposes window.GAME_VERSION to game.js
//   - sw.js's importScripts() -> exposes GAME_VERSION to the service
//     worker, which folds it into CACHE_NAME so the cache (and therefore
//     the update-detection banner) actually changes on every release.
//
// Unrelated to SAVE_SCHEMA_VERSION in game.js (a plain integer that tracks
// save-DATA-SHAPE compatibility, not the release number -- see AGENT.md).
// Never compare the two against each other.
const GAME_VERSION = '0.2.4';
if (typeof window !== 'undefined') window.GAME_VERSION = GAME_VERSION;
