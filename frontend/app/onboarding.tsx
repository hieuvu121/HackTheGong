import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { HazardPin } from '../src/components/HazardPin';
import { markOnboardingSeen } from '../src/lib/firstRun';
import { DangerLevel } from '../src/data/types';
import { PinState } from '../src/lib/pins';
import { colors, radii, spacing } from '../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../src/theme/insets';
import { type } from '../src/theme/type';

const NEEDS = [
  {
    title: 'Your location',
    body: 'To route you from where you are, and to confirm you’re at a hazard when you report one.',
  },
  {
    title: 'Your camera',
    body: 'Reports are photo-first. Riders trust what they can see.',
  },
];

/** The map's whole vocabulary, taught once before it's used. */
const PINS: { level: DangerLevel; state: PinState; text: string }[] = [
  { level: 'dangerous', state: 'active', text: 'Dangerous. Routes work hard to avoid these.' },
  { level: 'moderate', state: 'active', text: 'Moderate. Routed around when there’s a fair alternative.' },
  { level: 'low', state: 'active', text: 'Low risk. Worth knowing, rarely worth a detour.' },
  { level: 'moderate', state: 'unconfirmed', text: 'A rider says it’s fixed — not confirmed yet.' },
];

export default function Onboarding() {
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom();
  const router = useRouter();

  const start = () => {
    markOnboardingSeen();
    // Replace, not push: onboarding must not sit under the map in the stack.
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: screenTop, paddingBottom: screenBottom }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[type.displayXl, { color: colors.ink }]}>Ride the safer way</Text>
        <Text style={[type.bodyLg, { color: colors.body }]}>
          Routes that steer you around what other riders have already found.
        </Text>

        <View style={styles.group}>
          {NEEDS.map((n) => (
            <View key={n.title} style={styles.card}>
              <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{n.title}</Text>
              <Text style={[type.bodySm, { color: colors.body }]}>{n.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.legend} testID="pin-legend">
          <Text style={[type.bodyMdStrong, { color: colors.ink }]}>What the pins mean</Text>
          {PINS.map((p) => (
            <View key={`${p.level}-${p.state}`} style={styles.legendRow}>
              <View style={styles.pinSlot}>
                <HazardPin level={p.level} state={p.state} />
              </View>
              <Text style={[type.bodySm, styles.legendText]}>{p.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Button testID="get-started" label="Get started" variant="large" onPress={start} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  scroll: { gap: spacing.md, paddingBottom: spacing.lg },
  group: { gap: spacing.md, marginTop: spacing.md },
  card: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.xxs,
  },
  legend: {
    borderWidth: 1,
    borderColor: colors.canvasSoft,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  // Fixed slot so the rings never shift the text, whatever the pin size.
  pinSlot: { width: 44, alignItems: 'center' },
  legendText: { color: colors.body, flex: 1 },
});
