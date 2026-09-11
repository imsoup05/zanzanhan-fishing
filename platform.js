// Host adapter. Everything that behaves differently per distribution
// target (plain browser / PWA, ONE Store Capacitor shell, Apps in Toss
// WebView) goes through window.Platform so game.js never has to know
// where it's running. This is the plain-browser version and the contract
// the game relies on; the Apps in Toss build swaps this file for a bundle
// that routes the same calls to the Toss SDK (zanzanhan-fishing-ait/src/).
window.Platform = {
  name: 'web',
  // Filled in by hosts that can identify the player (Toss anonymous key);
  // null here, so the save is simply device-local.
  userKey: null,
  storage: {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* ignore */ } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } },
  },
  // Uses the Toss SDK's haptic vocabulary (tickWeak, basicMedium, success,
  // error, ...). Approximated with vibration patterns where the browser
  // exposes navigator.vibrate (Android); silently nothing elsewhere.
  haptic(type) {
    const patterns = {
      tickWeak: 8, tap: 10, tickMedium: 18, softMedium: 18, basicWeak: 12, basicMedium: 25,
      success: [15, 40, 25], error: [50], wiggle: [15, 30, 15, 30, 15], confetti: [10, 20, 10, 20, 30],
    };
    try { if (navigator.vibrate && patterns[type]) navigator.vibrate(patterns[type]); } catch (e) { /* ignore */ }
  },
  lockPortrait() {
    // Only honoured in fullscreen/installed contexts; a plain tab rejects it,
    // which is fine -- manifest.json carries the PWA orientation anyway.
    try { screen.orientation.lock('portrait').catch(() => {}); } catch (e) { /* ignore */ }
  },
  // Game asked to leave (exit-confirm dialog). Inside the Capacitor shell
  // the App plugin can close the app for real; a browser tab has no exit,
  // so step back past the guard entry game.js keeps on the history stack,
  // which lands on whatever page came before the game, if any.
  exit() {
    // This is a plain-script app with no Capacitor JS runtime, so the App
    // plugin isn't on Capacitor.Plugins; call the native method through the
    // injected bridge's own low-level entry point instead (the same call
    // the bridge uses internally for exitApp).
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.nativePromise) {
      cap.nativePromise('App', 'exitApp', {}).catch(() => {});
      return;
    }
    history.go(-2);
  },
  // Resolves once the host is ready for the game to start; immediate here,
  // async on Toss (identity + storage hydration happen first).
  ready: Promise.resolve(),
};
