import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.cee96301737a4542a6bb93de6bf7e75c',
  appName: 'readreceipt',
  webDir: 'dist',
  server: {
    url: 'https://cee96301-737a-4542-a6bb-93de6bf7e75c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
    },
  },
};

export default config;