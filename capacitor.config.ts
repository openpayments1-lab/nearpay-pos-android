import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.cashmgmtnp.pos',
  appName: 'NearPay POS',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    NearPay: {
      androidClassName: 'app.cashmgmtnp.pos.NearPayPlugin'
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  }
};

export default config;
