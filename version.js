// ================= Release version (GAME_VERSION) =================
// Single source of truth for the release number shown in PATCH.md/README.
// Scheme is vX.Y with an optional .Z: X = big milestone, Y = any regular
// update, Z only for an urgent fix and otherwise left off (so '1.0', not
// '1.0.0'). Bump this on every push per AGENT.md's version rule.
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
const GAME_VERSION = '1.0';
if (typeof window !== 'undefined') window.GAME_VERSION = GAME_VERSION;
