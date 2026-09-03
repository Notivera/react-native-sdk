/** Network constraint when the Android SDK downloads campaign content. Ignored on iOS. */
export type ConnectionType =
  | 'all'
  | 'wifi'
  | 'mobile'
  | 'mobileRoaming'
  | 'mobileNoRoaming';

/** Native SDK event delivered after initialize. */
export type EventType =
  | 'notificationTapped'
  | 'videoClosed'
  | 'inAppClosed'
  | 'inAppCtaTapped';

/**
 * Android-only notification icons/color for NotiveraConfig.pushTheme.
 * Pass Android resource **names** from the host app res/ (drawable, mipmap, or color).
 * Ignored on iOS.
 */
export type NotiveraPushTheme = {
  smallIcon?: string | null;
  largeIcon?: string | null;
  color?: string | null;
};

/** Credentials and options forwarded to the native Notivera SDKs. */
export type NotiveraConfig = {
  apiKey: string;
  apiSecret: string;
  appVersion: string;
  tenantId: string;
  customerId?: string | null;
  inAppOpenDelayMs?: number | null;
  /** Android-only. Enables native SDK debug logs. */
  enableDebug?: boolean | null;
  /** Android-only. Enables location tracking. */
  trackLocation?: boolean | null;
  /** Android-only. Enables geofence campaigns. */
  enableGeofence?: boolean | null;
  /** Android-only. Restricts content downloads to a connection type. */
  downloadConnectionType?: ConnectionType | null;
  /** Android-only. Notification small/large icons and accent color. */
  pushTheme?: NotiveraPushTheme | null;
};

/** A personalisation schema name/value pair. */
export type PersonalisationEntry = {
  name: string;
  value?: string | null;
};

/** An event emitted by the native SDK. */
export type NotiveraPushEvent = {
  id: string;
  eventType?: EventType | null;
  title?: string | null;
  description?: string | null;
  replacements?: string | null;
  message?: string | null;
  clientMetadata?: string | null;
  type?: string | null;
  targetUrl?: string | null;
};
