import NativeNotivera from './NativeNotivera';
import type {
  EventType,
  NotiveraConfig,
  NotiveraPushEvent,
  PersonalisationEntry,
} from './types';

export type {
  ConnectionType,
  EventType,
  NotiveraConfig,
  NotiveraPushEvent,
  NotiveraPushTheme,
  PersonalisationEntry,
} from './types';

type Unsubscribe = () => void;

function mapEventType(value: unknown): EventType | null {
  switch (value) {
    case 'notificationTapped':
    case 'videoClosed':
    case 'inAppClosed':
    case 'inAppCtaTapped':
      return value;
    default:
      return null;
  }
}

function mapPushEvent(raw: Object): NotiveraPushEvent {
  const event = raw as Record<string, unknown>;
  return {
    id: String(event.id ?? ''),
    eventType: mapEventType(event.eventType),
    title: (event.title as string | null | undefined) ?? null,
    description: (event.description as string | null | undefined) ?? null,
    replacements: (event.replacements as string | null | undefined) ?? null,
    message: (event.message as string | null | undefined) ?? null,
    clientMetadata: (event.clientMetadata as string | null | undefined) ?? null,
    type: (event.type as string | null | undefined) ?? null,
    targetUrl: (event.targetUrl as string | null | undefined) ?? null,
  };
}

/**
 * JS facade for the native Notivera Android and iOS SDKs.
 * Mirrors the Flutter `Notivera` API surface.
 */
export class Notivera {
  private static _instance: Notivera | null = null;

  static get instance(): Notivera {
    if (!Notivera._instance) {
      Notivera._instance = new Notivera();
    }
    return Notivera._instance;
  }

  /**
   * Initializes the native SDK.
   * `pushTheme` is Android-only (resource names). Ignored on iOS.
   */
  initialize(config: NotiveraConfig): Promise<void> {
    return NativeNotivera.initialize(config);
  }

  getDeviceId(): Promise<string | null> {
    return NativeNotivera.getDeviceId();
  }

  getCustomerId(): Promise<string | null> {
    return NativeNotivera.getCustomerId();
  }

  setCustomerId(customerId: string): Promise<void> {
    return NativeNotivera.setCustomerId(customerId);
  }

  getSdkVersion(): Promise<string | null> {
    return NativeNotivera.getSdkVersion();
  }

  subscribeTag(tag: string): Promise<string> {
    return NativeNotivera.subscribeTag(tag);
  }

  unsubscribeTag(tag: string): Promise<string> {
    return NativeNotivera.unsubscribeTag(tag);
  }

  updatePersonalisationVariables(
    entries: PersonalisationEntry[]
  ): Promise<string> {
    return NativeNotivera.updatePersonalisationVariables(entries);
  }

  async getAllPersonalisations(): Promise<PersonalisationEntry[]> {
    const rows = await NativeNotivera.getAllPersonalisations();
    return rows.map((row) => {
      const entry = row as Record<string, unknown>;
      return {
        name: String(entry.name ?? ''),
        value: (entry.value as string | null | undefined) ?? null,
      };
    });
  }

  showInAppNotification(customIdentifier: string): Promise<string> {
    return NativeNotivera.showInAppNotification(customIdentifier);
  }

  closeNotificationView(): Promise<void> {
    return NativeNotivera.closeNotificationView();
  }

  requestAuthorisationPrompts(): Promise<void> {
    return NativeNotivera.requestAuthorisationPrompts();
  }

  /**
   * Forwards an FCM token to the Android SDK. No-op on iOS (APNs is handled
   * by the native module application lifecycle hooks).
   */
  setPushToken(token: string): Promise<void> {
    return NativeNotivera.setPushToken(token);
  }

  isNotiveraMessage(data: Record<string, string>): Promise<boolean> {
    return NativeNotivera.isNotiveraMessage(data);
  }

  handlePushMessage(data: Record<string, string>): Promise<void> {
    return NativeNotivera.handlePushMessage(data);
  }

  /** Subscribe to native SDK push / in-app events. Returns an unsubscribe fn. */
  addPushEventListener(
    listener: (event: NotiveraPushEvent) => void
  ): Unsubscribe {
    const subscription = NativeNotivera.onPushEvent((raw: Object) => {
      listener(mapPushEvent(raw));
    });
    return () => {
      subscription.remove();
    };
  }
}

export const notivera = Notivera.instance;
