import { AppRegistry, Platform } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Register after AppRegistry. Use RN Firebase modular API (v22+).
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingMod = require('@react-native-firebase/messaging');
    const messaging = messagingMod.getMessaging();
    messagingMod.setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { firebaseMessagingBackgroundHandler } = require('./src/notiveraBootstrap');
      await firebaseMessagingBackgroundHandler(remoteMessage);
    });
  } catch (error) {
    console.warn('[NotiveraDemo] background handler registration failed', error);
  }
}

if (typeof document !== 'undefined') {
  AppRegistry.runApplication(appName, {
    rootTag: document.getElementById('root'),
  });
}
