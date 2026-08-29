import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polyglot.reader',
  appName: 'Polyglot Reader',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
