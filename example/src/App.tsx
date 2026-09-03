import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Notivera, type NotiveraPushEvent } from 'react-native-notivera';
import {
  initializeNotiveraDemo,
  subscribeDemoEvents,
} from './notiveraBootstrap';

export default function App() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [tag, setTag] = useState('news');
  const [inAppId, setInAppId] = useState('');
  const [status, setStatus] = useState('Starting…');
  const [events, setEvents] = useState<NotiveraPushEvent[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeDemoEvents((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 20));
    });

    initializeNotiveraDemo()
      .then((id) => {
        setDeviceId(id);
        setReady(true);
        setStatus('SDK ready');
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`Init failed: ${message}`);
      });

    return unsubscribe;
  }, []);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(true);
    try {
      const result = await action();
      setStatus(`${label}: ${String(result ?? 'ok')}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`${label} failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notivera RN Demo</Text>
      <Text style={styles.meta}>platform={Platform.OS}</Text>
      <Text style={styles.meta}>deviceId={deviceId ?? '—'}</Text>
      <Text style={styles.status}>{status}</Text>
      {!ready ? <ActivityIndicator style={styles.spinner} /> : null}

      <TextInput
        style={styles.input}
        value={tag}
        onChangeText={setTag}
        placeholder="Tag"
        autoCapitalize="none"
      />
      <View style={styles.row}>
        <Button
          title="Subscribe tag"
          disabled={!ready || busy}
          onPress={() =>
            run('subscribeTag', () => Notivera.instance.subscribeTag(tag))
          }
        />
        <Button
          title="Unsubscribe"
          disabled={!ready || busy}
          onPress={() =>
            run('unsubscribeTag', () => Notivera.instance.unsubscribeTag(tag))
          }
        />
      </View>

      <TextInput
        style={styles.input}
        value={inAppId}
        onChangeText={setInAppId}
        placeholder="In-app custom identifier"
        autoCapitalize="none"
      />
      <Button
        title="Show in-app"
        disabled={!ready || busy || !inAppId}
        onPress={() =>
          run('showInApp', () =>
            Notivera.instance.showInAppNotification(inAppId)
          )
        }
      />
      <Button
        title="Close notification view"
        disabled={!ready || busy}
        onPress={() =>
          run('closeNotificationView', () =>
            Notivera.instance.closeNotificationView()
          )
        }
      />
      <Button
        title="Request auth prompts"
        disabled={!ready || busy}
        onPress={() =>
          run('requestAuthorisationPrompts', () =>
            Notivera.instance.requestAuthorisationPrompts()
          )
        }
      />

      <Text style={styles.section}>Recent events</Text>
      {events.length === 0 ? (
        <Text style={styles.meta}>No events yet</Text>
      ) : (
        events.map((event) => (
          <Text key={`${event.id}-${event.eventType}`} style={styles.event}>
            {event.eventType}: {event.title ?? event.id}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 56,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  meta: {
    color: '#555',
  },
  status: {
    marginVertical: 8,
  },
  spinner: {
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  event: {
    color: '#222',
  },
});
