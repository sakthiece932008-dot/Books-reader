import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polyglot.reader',
  appName: 'Polyglot Reader',
  webDir: 'dist',
  server: {
    url: 'https://ais-pre-ogvity25sbbpzix6i7lf2u-560048511170.asia-east1.run.app',
    cleartext: true
  }
};

export default config;
