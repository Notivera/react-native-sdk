import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { HomeScreen } from './HomeScreen';
import { OfflineScreen } from './OfflineScreen';
import {
  initializeNotiveraDemo,
  subscribeDemoEvents,
} from './notiveraBootstrap';
import { installIosOfflineDelegate } from './offlineIosDemo';
import { colors } from './theme';

export default function App() {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('Initializing…');
  const [snack, setSnack] = useState<string | null>(null);

  function showMessage(message: string) {
    setSnack(message);
    setTimeout(() => {
      setSnack((current) => (current === message ? null : current));
    }, 2800);
  }

  useEffect(() => {
    const unsubscribe = subscribeDemoEvents((event) => {
      const label = `${event.eventType ?? 'event'} ${event.title ?? event.id}`;
      showMessage(label);
    });

    initializeNotiveraDemo()
      .then(async () => {
        await installIosOfflineDelegate();
        setStatus('Ready');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`Initialize failed: ${message}`);
      });

    return unsubscribe;
  }, []);

  const ready = status === 'Ready';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Notivera React</Text>
      </View>
      {status !== 'Ready' ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{status}</Text>
        </View>
      ) : null}
      <View style={styles.body}>
        {index === 0 ? (
          <HomeScreen onMessage={showMessage} />
        ) : (
          <OfflineScreen ready={ready} onMessage={showMessage} />
        )}
      </View>
      {snack ? (
        <View style={styles.snack}>
          <Text style={styles.snackText}>{snack}</Text>
        </View>
      ) : null}
      <View style={styles.nav}>
        <Pressable style={styles.navItem} onPress={() => setIndex(0)}>
          <Text style={[styles.navLabel, index === 0 && styles.navLabelActive]}>
            Home
          </Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => setIndex(1)}>
          <Text style={[styles.navLabel, index === 1 && styles.navLabelActive]}>
            Offline
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appBarTitle: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: colors.banner,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: {
    color: colors.bannerText,
  },
  body: {
    flex: 1,
  },
  snack: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 80,
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  snackText: {
    color: colors.onPrimary,
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
  },
  navItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  navLabel: {
    color: colors.muted,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.primary,
  },
});
