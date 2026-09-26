import { defineConfig } from 'vite';
import aitDevtools from '@apps-in-toss/devtools/unplugin';

// aitDevtools swaps the Toss SDK for a mock (plus a floating panel) during
// `npm run dev` so the game runs in a plain browser; it is inactive in
// `npm run build`, which bundles the real SDK.
export default defineConfig({
  plugins: [aitDevtools.vite()],
});
