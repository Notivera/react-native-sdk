import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Notivera } from 'react-native-notivera';
import carouselNotification from './assets/carousel_notification.json';
import kitLaunchNotification from './assets/kit_launch_notification.json';
import startingLineup from './assets/starting_lineup.json';
import videoGoalNotification from './assets/video_goal_notification.json';
import { ensureAndroidNotificationPermission } from './notiveraBootstrap';
import { iosOfflineDemos, scheduleIosOfflineDemo } from './offlineIosDemo';
import { colors } from './theme';

type AndroidDemoItem = {
  title: string;
  payload: unknown;
};

const androidDemos: AndroidDemoItem[] = [
  { title: 'Notification 1', payload: kitLaunchNotification },
  { title: 'Notification 2', payload: videoGoalNotification },
  { title: 'Notification 3', payload: startingLineup },
  { title: 'Carousel', payload: carouselNotification },
];

type Props = {
  onMessage: (message: string) => void;
};

export function HomeScreen({ onMessage }: Props) {
  const ios = Platform.OS === 'ios';

  async function showAndroidDemo(item: AndroidDemoItem) {
    console.log(`[NotiveraDemo] TRIGGER: Android offline demo title=${item.title}`);
    try {
      const allowed = await ensureAndroidNotificationPermission();
      if (!allowed) {
        onMessage('Notification permission is required for offline demos');
        return;
      }

      const root = JSON.stringify(item.payload);
      console.log(
        `[NotiveraDemo] handlePushMessage rootBytes=${root.length} keys=root,PSDKDemoNotification`
      );
      await Notivera.instance.handlePushMessage({
        root,
        PSDKDemoNotification: 'true',
      });
      onMessage(`${item.title} posted — open from the notification shade`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[NotiveraDemo] Android offline demo failed: ${message}`);
      onMessage(`Failed to show ${item.title}: ${message}`);
    }
  }

  async function showIosDemo(title: string, categoryIdentifier: string) {
    console.log(
      `[NotiveraDemo] TRIGGER: iOS offline schedule category=${categoryIdentifier}`
    );
    try {
      await scheduleIosOfflineDemo({ title, categoryIdentifier });
      onMessage(`${title} posted — tap the notification to open`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[NotiveraDemo] iOS offline schedule failed: ${message}`);
      onMessage(`Failed to schedule ${title}: ${message}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headline}>Select an experience</Text>
      <Text style={styles.subtitle}>
        {ios
          ? 'Notifications (4) — tap to schedule; open from the banner'
          : 'Notifications (4) — Android offline SDK demos'}
      </Text>
      {ios
        ? iosOfflineDemos.map((item) => (
            <Pressable
              key={item.categoryIdentifier}
              style={styles.card}
              onPress={() => showIosDemo(item.title, item.categoryIdentifier)}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>
                  Tap to post notification · {item.categoryIdentifier}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        : androidDemos.map((item) => (
            <Pressable
              key={item.title}
              style={styles.card}
              onPress={() => showAndroidDemo(item)}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>Tap to view notification</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  headline: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: 4,
    color: colors.muted,
  },
  chevron: {
    fontSize: 28,
    color: colors.muted,
    marginLeft: 8,
  },
});
