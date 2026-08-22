import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../../src/map/MapView';
import { useHazards } from '../../src/data/useHazards';
import { KIND_LABEL } from '../../src/data/types';
import { DangerBadge } from '../../src/components/DangerBadge';
import { PhotoCarousel } from '../../src/components/PhotoCarousel';
import { Button } from '../../src/components/Button';
import { NavButton } from '../../src/components/NavButton';
import { formatWindow } from '../../src/lib/time';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

export default function Hazard() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hazards } = useHazards();
  const hazard = hazards.find((h) => h.id === id);

  if (!hazard) {
    return (
      <View style={[styles.root, { paddingTop: screenTop }]}>
        <Text style={[type.bodyMd, { color: colors.body }]}>That hazard no longer exists.</Text>
      </View>
    );
  }

  const latest = hazard.reports[hazard.reports.length - 1];
  const reportedDays = Math.round((Date.now() - Date.parse(latest.reportedAt)) / 86_400_000);

  return (
    <ScrollView
      style={[styles.root, { paddingTop: screenTop }]}
      contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[type.displayMd, { color: colors.ink }]}>{KIND_LABEL[hazard.kind]}</Text>
          <Text style={[type.bodySm, { color: colors.body }]}>
            {`${hazard.streetName} · last updated ${reportedDays}d ago`}
          </Text>
        </View>
        <NavButton testID="hazard-close" kind="close" onPress={() => router.back()} />
      </View>

      {/* You tapped this off a map; losing the map loses the point. */}
      <View style={styles.locator}>
        <MapView
          center={hazard.coord}
          zoom={15}
          hazards={[hazard]}
          style={{ borderRadius: radii.xl }}
        />
      </View>

      <View style={styles.badgeRow}>
        <DangerBadge level={hazard.dangerLevel} />
        {hazard.status === 'fixed' && (
          <View style={styles.fixedTag}>
            <Text style={[type.bodySmStrong, { color: colors.onPrimary }]}>Fixed</Text>
          </View>
        )}
      </View>

      {/* The routing engine only counts this hazard inside its window, so the
          rider needs to see the window too. */}
      {hazard.activeWindow && (
        <View testID="active-window" style={styles.window}>
          <Text style={[type.bodyMdStrong, { color: colors.ink }]}>
            {`Only a hazard ${formatWindow(hazard.activeWindow)}`}
          </Text>
          <Text style={[type.bodySm, { color: colors.body }]}>
            Routes leaving outside those hours are not sent around it.
          </Text>
        </View>
      )}

      <Text style={[type.bodyMd, { color: colors.ink }]}>{latest.ai.caption}</Text>

      <View>
        <Text style={[type.bodyMdStrong, { color: colors.ink, marginBottom: spacing.xxs }]}>
          {`Reported by ${hazard.reports.length} ${hazard.reports.length === 1 ? 'rider' : 'riders'}`}
        </Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          Every photo submitted here, newest first. Judge it for yourself.
        </Text>
        <PhotoCarousel reports={hazard.reports} />
      </View>

      <Button
        label="Report as fixed"
        variant="large"
        onPress={() => router.push(`/report/gate?fixHazardId=${hazard.id}`)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  locator: {
    height: 150,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.canvasSoft,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fixedTag: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  window: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 2,
  },
});
