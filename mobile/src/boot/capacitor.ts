import { boot } from 'quasar/wrappers';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export default boot(async () => {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Hide splash screen immediately
  try {
    await SplashScreen.hide();
    console.log('Splash screen hidden');
  } catch (error) {
    console.log('SplashScreen.hide error:', error);
  }

  // Configure status bar with ActoGraph colors
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#1f2937' }); // primary color
  } catch (error) {
    // Status bar not available (web)
    console.log('StatusBar not available:', error);
  }

  // Handle app state changes
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Is active?', isActive);
  });
});

