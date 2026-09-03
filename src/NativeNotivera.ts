import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
// Codegen requires this module path; types resolve via types_generated for tsc.
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

/**
 * Codegen Spec for the Notivera Turbo Module.
 * Nested config/event payloads are passed as plain Objects (ReadableMap / NSDictionary).
 */
export interface Spec extends TurboModule {
  initialize(config: Object): Promise<void>;
  getDeviceId(): Promise<string | null>;
  getCustomerId(): Promise<string | null>;
  setCustomerId(customerId: string): Promise<void>;
  getSdkVersion(): Promise<string | null>;
  subscribeTag(tag: string): Promise<string>;
  unsubscribeTag(tag: string): Promise<string>;
  updatePersonalisationVariables(entries: Object[]): Promise<string>;
  getAllPersonalisations(): Promise<Object[]>;
  showInAppNotification(customIdentifier: string): Promise<string>;
  closeNotificationView(): Promise<void>;
  requestAuthorisationPrompts(): Promise<void>;
  setPushToken(token: string): Promise<void>;
  isNotiveraMessage(data: Object): Promise<boolean>;
  handlePushMessage(data: Object): Promise<void>;
  readonly onPushEvent: EventEmitter<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Notivera');
