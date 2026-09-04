import { PermissionsAndroid, Platform } from 'react-native';
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

/**
 * Android 13+ offline demos post system notifications via NotificationManager.
 * Without POST_NOTIFICATIONS they appear to do nothing.
 */
export async function ensureAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (typeof Platform.Version === 'number' && Platform.Version < 33) {
    return true;
  }

  const already = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  if (already) {
    log('POST_NOTIFICATIONS already granted');
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: 'Allow notifications',
      message:
        'Notivera offline demos show as system notifications. Please allow notifications.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );
  const granted = result === PermissionsAndroid.RESULTS.GRANTED;
  log(`POST_NOTIFICATIONS request result=${result}`);
  return granted;
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

  await ensureAndroidNotificationPermission();
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

  // Push permission dialogs must not block the demo UI.
  configureAndroidPush().catch((error: unknown) => {
    log(`Android push setup failed: ${String(error)}`);
  });
  Notivera.instance.requestAuthorisationPrompts().catch((error: unknown) => {
    log(`requestAuthorisationPrompts failed: ${String(error)}`);
  });

  const deviceId = await Notivera.instance.getDeviceId();
  log(`deviceId=${deviceId ?? 'null'}`);
  return deviceId;
}
