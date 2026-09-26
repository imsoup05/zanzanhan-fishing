import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // Must match the console's appName (intoss://zanzanhan-fishing).
  appName: 'zanzanhan-fishing',
  brand: {
    primaryColor: '#0f4b5c',
  },
  permissions: [],
  // Game: the Toss bar floats over the scene with only its more/close
  // buttons, top-right -- the one corner the status bar leaves empty
  // (style.css #game.host-toss). The 낚시터 pill owns the top-left.
  navigationBar: {
    withBackButton: false,
    withHomeButton: false,
    withTitle: false,
    transparentBackground: true,
    theme: 'dark',
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
  },
  webBundleDir: 'dist',
});
