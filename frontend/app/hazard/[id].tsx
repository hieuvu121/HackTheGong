import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HAZARDS } from '../../src/data/hazards';
import { KIND_LABEL } from '../../src/data/types';
import { DangerBadge } from '../../src/components/DangerBadge';
import { PhotoCarousel } from '../../src/components/PhotoCarousel';
import { Button } from '../../src/components/Button';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

export default function Hazard() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const hazard = HAZARDS.find((h) => h.id === id);

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
      <View>
        <Text style={[type.displayMd, { color: colors.ink }]}>{KIND_LABEL[hazard.kind]}</Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          {`${hazard.streetName} · last updated ${reportedDays}d ago`}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        <DangerBadge level={hazard.dangerLevel} />
        {hazard.status === 'fixed' && (
          <View style={styles.fixedTag}>
            <Text style={[type.bodySmStrong, { color: colors.onPrimary }]}>Fixed</Text>
          </View>
        )}
      </View>

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
        variant="primary"
        onPress={() => router.push(`/report/capture?fixHazardId=${hazard.id}`)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: spacing.lg,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fixedTag: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
