'use client';

import { useEffect } from 'react';

// No-ops entirely on the regular website — only does anything when this
// page is being loaded inside the iOS app shell. Keeps the native-app
// concerns out of the way of normal web visitors.
export default function CapacitorInit() {
  useEffect(() => {
    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;

      const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import('@capacitor/status-bar'),
        import('@capacitor/splash-screen'),
      ]);

      // The webview runs edge-to-edge (contentInset: 'never'), so the
      // status bar overlays it rather than reserving its own native
      // strip — the site's own fixed navy header shows straight through.
      // White status bar icons/text to read against that navy.
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark });
      await SplashScreen.hide();
    })();
  }, []);

  return null;
}
