import { NativeModules, Platform } from 'react-native';

export type OfflineIosDemoItem = {
  title: string;
  categoryIdentifier: string;
};

const OfflineDemo = NativeModules.OfflineDemo as
  | {
      installDelegate?: () => Promise<void>;
      schedule?: (category: string) => Promise<void>;
    }
  | undefined;

export const iosOfflineDemos: OfflineIosDemoItem[] = [
  { title: 'Notification 1', categoryIdentifier: 'VideoWithButtonOne' },
  { title: 'Notification 2', categoryIdentifier: 'VideoWithButtonTwo' },
  { title: 'Notification 3', categoryIdentifier: 'Poll' },
  { title: 'Carousel', categoryIdentifier: 'CategoryExtension' },
];

export async function installIosOfflineDelegate() {
  if (Platform.OS !== 'ios') {
    return;
  }
  await OfflineDemo?.installDelegate?.();
}

export async function scheduleIosOfflineDemo(item: OfflineIosDemoItem) {
  if (!OfflineDemo?.schedule) {
    throw new Error(
      'iOS OfflineDemo native module is not installed in this app yet.'
    );
  }
  await OfflineDemo.schedule(item.categoryIdentifier);
}
