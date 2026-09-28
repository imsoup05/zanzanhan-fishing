import fs from 'node:fs';
import { defineConfig } from 'vite';
import aitDevtools from '@apps-in-toss/devtools/unplugin';

// Local-only dev panel (scenario saves, forced casts, currency). dev-mode.js
// is gitignored, so this only does anything on a machine that has it, and
// only under `npm run dev` -- `npm run build` never sees it.
function devModePanel() {
  return {
    name: 'zzh-dev-mode-panel',
    apply: 'serve',
    transformIndexHtml(html) {
      if (!fs.existsSync('dev-mode.js')) return html;
      return html.replace('</body>', '  <script type="module" src="/dev-mode.js"></script>\n</body>');
    },
  };
}

// aitDevtools swaps the Toss SDK for a mock (plus a floating panel) during
// `npm run dev` so the game runs in a plain browser; it is inactive in
// `npm run build`, which bundles the real SDK.
export default defineConfig({
  plugins: [aitDevtools.vite(), devModePanel()],
});
