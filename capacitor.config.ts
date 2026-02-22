import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pyu.novelaigallery',
  appName: 'NovelAI Gallery',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#3880ff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true
    },
    NearbyConnections: {
      endpointName: 'NovelAI Gallery',
      serviceID: 'com.pyu.novelaigallery',
      strategy: 'star',
      connectionType: 'disruptive',
      lowPower: false,
      autoConnect: false
    }
  }
};

export default config;