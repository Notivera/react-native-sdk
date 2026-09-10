import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Notivera } from 'notivera-react-native';
import { colors } from './theme';

type Props = {
  ready: boolean;
  onMessage: (message: string) => void;
};

export function OfflineScreen({ ready, onMessage }: Props) {
  const [tag, setTag] = useState('');
  const [deviceId, setDeviceId] = useState('Loading…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) {
      setDeviceId('unavailable');
      return;
    }
    Notivera.instance
      .getDeviceId()
      .then((id) => setDeviceId(id ?? 'unknown'))
      .catch(() => setDeviceId('unavailable'));
  }, [ready]);

  const deviceOs =
    Platform.OS === 'ios'
      ? `iOS ${String(Platform.Version)}`
      : Platform.OS === 'android'
        ? `Android ${String(Platform.Version)}`
        : Platform.OS;

  async function submitTag() {
    const value = tag.trim();
    console.log(`[NotiveraDemo] TRIGGER: subscribeTag tag="${value}"`);
    if (!value) {
      onMessage('Please enter a tag name!');
      return;
    }
    setBusy(true);
    try {
      const result = await Notivera.instance.subscribeTag(value);
      console.log(
        `[NotiveraDemo] subscribeTag success result="${result}" tag="${value}"`
      );
      setTag('');
      onMessage('Tag created successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[NotiveraDemo] subscribeTag failed tag="${value}" error=${message}`);
      onMessage('Failed to create tag, please try again!');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <TextInput
          style={styles.input}
          value={tag}
          onChangeText={setTag}
          editable={!busy && ready}
          placeholder="Enter Tag here"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.submit, (!ready || busy) && styles.submitDisabled]}
          disabled={!ready || busy}
          onPress={submitTag}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitLabel}>SUBMIT</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowTitle}>Device ID</Text>
        <Text selectable style={styles.rowSubtitle}>
          {deviceId}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowTitle}>Device OS</Text>
        <Text style={styles.rowSubtitle}>{deviceOs}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    color: colors.text,
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitLabel: {
    color: colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    marginTop: 6,
    color: colors.muted,
  },
});
