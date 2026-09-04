import type { CapacitorConfig } from '@capacitor/cli';

// This app has no bundled web assets — webDir just needs to exist for
// Capacitor's tooling, but everything actually loads from server.url
// below. Every deploy to that URL is what the app shows; no native
// rebuild is needed for content/feature changes, only for anything
// that touches the native shell itself (icon, splash, push wiring).
const config: CapacitorConfig = {
  appId: 'com.dxesolutions.app',
  appName: 'DXE Solutions',
  webDir: 'public',
  server: {
    url: 'https://www.dxesolutions.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'never',
  },
};

export default config;
