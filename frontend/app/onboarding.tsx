import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/Button';
import { colors, radii, spacing } from '../src/theme/tokens';
import { useScreenTop } from '../src/theme/insets';
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

export default function Onboarding() {
  const screenTop = useScreenTop();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Text style={[type.displayXl, { color: colors.ink }]}>Ride the safer way</Text>
      <Text style={[type.bodyLg, { color: colors.body }]}>
        Routes that steer you around what other riders have already found.
      </Text>

      <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
        {NEEDS.map((n) => (
          <View key={n.title} style={styles.card}>
            <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{n.title}</Text>
            <Text style={[type.bodySm, { color: colors.body }]}>{n.body}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Button label="Get started" variant="large" onPress={() => router.push('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.xxs,
  },
});
