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
  // Android-only: adaptive launcher resources under res/mipmap + values.
  pushTheme: {
    smallIcon: 'ic_launcher_foreground',
    largeIcon: 'ic_launcher_round',
    color: 'ic_launcher_background',
  },
};

let pushConfigured = false;

function log(message: string) {
  console.log(`${logTag} ${message}`);
}

/** RN Firebase v22+ modular API helpers (namespaced `messaging()` is not a function). */
function loadFirebaseMessaging() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const messagingMod = require('@react-native-firebase/messaging');
  const messaging = messagingMod.getMessaging();
  return { messaging, messagingMod };
}

function asStringData(
  data: Record<string, unknown> | undefined | null
): Record<string, string> {
  if (!data) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) {
      continue;
    }
    out[key] = typeof value === 'string' ? value : String(value);
  }
  return out;
}

/**
 * Android 13+ system notifications require POST_NOTIFICATIONS.
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
        'Notivera needs notification permission for push and offline demos.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );
  const granted = result === PermissionsAndroid.RESULTS.GRANTED;
  log(`POST_NOTIFICATIONS request result=${result}`);
  return granted;
}

export async function forwardRemoteMessage(
  data: Record<string, unknown> | undefined | null,
  source: string
) {
  const payload = asStringData(data);
  log(`--- incoming push [${source}] ---`);
  log(`data keys=${Object.keys(payload).join(',')}`);
  if (Object.keys(payload).length === 0) {
    log(`Forward skipped: data map is empty`);
    return;
  }
  const isNotivera = await Notivera.instance.isNotiveraMessage(payload);
  log(`${source}: isNotiveraMessage=${isNotivera}`);
  if (isNotivera) {
    await Notivera.instance.handlePushMessage(payload);
    log(`${source}: handlePushMessage completed`);
  } else {
    log(`${source}: not a Notivera message — leaving for host/default handling`);
  }
}

/**
 * Android-only FCM wiring. iOS uses APNs via NotiveraBridge / AppDelegate.
 * Flow: permission → token → setPushToken → listeners.
 */
async function configureAndroidPush() {
  log(`_configurePush() entered (alreadyConfigured=${pushConfigured})`);
  if (pushConfigured || Platform.OS !== 'android') {
    pushConfigured = true;
    log('_configurePush() skipped');
    return;
  }

  const { messaging, messagingMod } = loadFirebaseMessaging();
  const {
    getToken,
    requestPermission,
    onMessage,
    onNotificationOpenedApp,
    onTokenRefresh,
    getInitialNotification,
  } = messagingMod;

  const permitted = await ensureAndroidNotificationPermission();
  log(`notification permission granted=${permitted}`);

  const authStatus = await requestPermission(messaging);
  log(`messaging.requestPermission status=${String(authStatus)}`);

  const token = await getToken(messaging);
  if (token) {
    log(`FCM token received (${token.length} chars)`);
    await Notivera.instance.setPushToken(token);
    log('setPushToken() completed');
  } else {
    log('FCM token is null/empty — setPushToken skipped');
  }

  onTokenRefresh(messaging, async (refreshed: string) => {
    log(`FCM token refreshed (${refreshed.length} chars)`);
    try {
      await Notivera.instance.setPushToken(refreshed);
      log('setPushToken() completed after refresh');
    } catch (error) {
      log(`setPushToken() after refresh failed: ${String(error)}`);
    }
  });

  onMessage(messaging, async (remoteMessage: { data?: Record<string, unknown> }) => {
    log('TRIGGER: onMessage (foreground)');
    await forwardRemoteMessage(remoteMessage.data, 'onMessage');
  });

  onNotificationOpenedApp(
    messaging,
    async (remoteMessage: { data?: Record<string, unknown> }) => {
      log('TRIGGER: onNotificationOpenedApp');
      await forwardRemoteMessage(remoteMessage.data, 'onNotificationOpenedApp');
    }
  );

  const initial = await getInitialNotification(messaging);
  if (initial?.data) {
    log('TRIGGER: getInitialNotification');
    await forwardRemoteMessage(initial.data, 'getInitialNotification');
  } else {
    log('getInitialNotification() returned null');
  }

  pushConfigured = true;
  log('_configurePush() finished');
}

/**
 * Background/quit FCM handler (Android). Must be registered before AppRegistry.
 */
export async function firebaseMessagingBackgroundHandler(remoteMessage: {
  data?: Record<string, unknown>;
}) {
  log('TRIGGER: onBackgroundMessage');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-firebase/app');
    await Notivera.instance.initialize(demoNotiveraConfig);
    await forwardRemoteMessage(remoteMessage.data, 'onBackgroundMessage');
  } catch (error) {
    log(`onBackgroundMessage failed: ${String(error)}`);
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
  log(
    `initializeNotiveraDemo() started platform=${Platform.OS} tenantId=${demoTenantId} appVersion=${demoAppVersion} apiKeyPrefix=${demoApiKey.slice(0, 8)}`
  );

  // Placeholder guard for notiveraDemoSecrets.example.ts; local secrets use a real key literal.
  // @ts-expect-error TS2367 — demoApiKey is a concrete string literal in the local secrets file
  if (!demoApiKey || demoApiKey === 'YOUR_API_KEY') {
    throw new Error(
      'Demo secrets missing. Copy values into example/src/notiveraDemoSecrets.ts from notiveraDemoSecrets.example.ts'
    );
  }

  log('Calling Notivera.initialize');
  await Notivera.instance.initialize(demoNotiveraConfig);
  log('Notivera.initialize completed');

  // Await push wiring so FCM token is registered before UI is "Ready".
  await configureAndroidPush();

  log('Calling requestAuthorisationPrompts()');
  try {
    await Notivera.instance.requestAuthorisationPrompts();
    log('requestAuthorisationPrompts() completed');
  } catch (error) {
    log(`requestAuthorisationPrompts failed: ${String(error)}`);
  }

  const deviceId = await Notivera.instance.getDeviceId();
  log(`Device ID after init: ${deviceId ?? 'null'}`);
  log('initializeNotiveraDemo() finished');
  return deviceId;
}
