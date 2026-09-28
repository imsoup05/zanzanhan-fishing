// ================= Release version (GAME_VERSION) =================
// Single source of truth for the release number shown in PATCH.md/README.
// Scheme is vX.Y with an optional .Z: X = big milestone, Y = any regular
// update, Z only for an urgent fix and otherwise left off (so '1.0', not
// '1.0.0'). Bump this on every push per CLAUDE.md's version rule.
//
// Imported by src/main.js before game.js, which reads window.GAME_VERSION.
//
// Unrelated to SAVE_SCHEMA_VERSION in game.js (a plain integer that tracks
// save-DATA-SHAPE compatibility, not the release number -- see CLAUDE.md).
// Never compare the two against each other.
const GAME_VERSION = '2.2';
if (typeof window !== 'undefined') window.GAME_VERSION = GAME_VERSION;
