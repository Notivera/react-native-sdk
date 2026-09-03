import { Platform } from 'react-native';
import {
  Notivera,
  type NotiveraConfig,
  type NotiveraPushEvent,
} from 'react-native-notivera';
import {
  demoApiKey,
  demoApiSecret,
  demoAppVersion,
  demoTenantId,
} from './notiveraDemoSecrets';

const logTag = '[NotiveraDemo]';

export const demoNotiveraConfig: NotiveraConfig = {
  apiKey: demoApiKey,
  apiSecret: demoApiSecret,
  appVersion: demoAppVersion,
  tenantId: demoTenantId,
  enableDebug: true,
  trackLocation: true,
  enableGeofence: true,
  downloadConnectionType: 'wifi',
  inAppOpenDelayMs: 5000,
  pushTheme: {
    smallIcon: 'ic_launcher_foreground',
    largeIcon: 'ic_launcher_round',
    color: 'ic_launcher_background',
  },
};

function log(message: string) {
  console.log(`${logTag} ${message}`);
}

async function forwardDataMessage(
  data: Record<string, string>,
  source: string
) {
  if (Object.keys(data).length === 0) {
    return;
  }
  const isNotivera = await Notivera.instance.isNotiveraMessage(data);
  log(`${source}: isNotiveraMessage=${isNotivera}`);
  if (isNotivera) {
    await Notivera.instance.handlePushMessage(data);
  }
}

/**
 * Android-only FCM wiring. iOS uses APNs via NotiveraBridge / AppDelegate.
 */
async function configureAndroidPush() {
  if (Platform.OS !== 'android') {
    return;
  }

  // Lazy-require so iOS builds do not fail if Firebase native modules are absent.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messaging = require('@react-native-firebase/messaging').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const appModule = require('@react-native-firebase/app');
  void appModule;

  await messaging().requestPermission();
  const token = await messaging().getToken();
  if (token) {
    log(`FCM token (${token.length} chars)`);
    await Notivera.instance.setPushToken(token);
  }

  messaging().onTokenRefresh(async (refreshed: string) => {
    await Notivera.instance.setPushToken(refreshed);
  });

  messaging().onMessage(async (remoteMessage: { data?: Record<string, string> }) => {
    await forwardDataMessage(remoteMessage.data ?? {}, 'onMessage');
  });

  messaging().onNotificationOpenedApp(
    async (remoteMessage: { data?: Record<string, string> }) => {
      await forwardDataMessage(remoteMessage.data ?? {}, 'onNotificationOpenedApp');
    }
  );

  const initial = await messaging().getInitialNotification();
  if (initial?.data) {
    await forwardDataMessage(initial.data, 'getInitialNotification');
  }
}

export function subscribeDemoEvents(
  onEvent: (event: NotiveraPushEvent) => void
) {
  return Notivera.instance.addPushEventListener((event) => {
    log(`event ${event.eventType} id=${event.id} title=${event.title ?? ''}`);
    onEvent(event);
  });
}

export async function initializeNotiveraDemo() {
  log(`initialize started platform=${Platform.OS}`);
  await Notivera.instance.initialize(demoNotiveraConfig);
  log('initialize completed');
  await configureAndroidPush();
  await Notivera.instance.requestAuthorisationPrompts();
  const deviceId = await Notivera.instance.getDeviceId();
  log(`deviceId=${deviceId ?? 'null'}`);
  return deviceId;
}
