import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../../src/map/MapView';
import { useHazard } from '../../src/data/useHazards';
import { KIND_LABEL } from '../../src/data/types';
import { DangerBadge } from '../../src/components/DangerBadge';
import { PhotoCarousel } from '../../src/components/PhotoCarousel';
import { Button } from '../../src/components/Button';
import { NavButton } from '../../src/components/NavButton';
import { useGoBack } from '../../src/lib/useGoBack';
import { formatWindow } from '../../src/lib/time';
import { mightBeFixed } from '../../src/lib/staleness';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

export default function Hazard() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const goBack = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hazard, loading } = useHazard(id);

  // "Not found" is only true once the list has actually arrived. Saying it
  // while the fetch is still in flight told riders a hazard was gone when the
  // app simply had not loaded it yet.
  if (!hazard && loading) {
    return (
      <View testID="hazard-loading" style={[styles.root, styles.center, { paddingTop: screenTop }]}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (!hazard) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: screenTop }]}>
        <Text style={[type.bodyMd, { color: colors.body }]}>That hazard no longer exists.</Text>
        <Button label="Back to the map" variant="subtle" onPress={goBack} />
      </View>
    );
  }

  // A hazard can exist with no reports yet — one seeded from the map, or a pin
  // whose photos have been removed. Everything below has to survive that.
  const latest = hazard.reports.at(-1);
  const reportedDays = latest
    ? Math.round((Date.now() - Date.parse(latest.reportedAt)) / 86_400_000)
    : null;

  // Nobody has been back in longer than this kind of hazard usually lasts.
  const stale = mightBeFixed(hazard);

  return (
    <ScrollView
      style={[styles.root, { paddingTop: screenTop }]}
      contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[type.displayMd, { color: colors.ink }]}>{KIND_LABEL[hazard.kind]}</Text>
          <Text style={[type.bodySm, { color: colors.body }]}>
            {reportedDays === null
              ? hazard.streetName
              : `${hazard.streetName} · last updated ${reportedDays}d ago`}
          </Text>
        </View>
        <NavButton testID="hazard-close" kind="close" onPress={goBack} />
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

      {/* Nobody has been back in longer than this kind of hazard usually
          lasts. A reason to go and look, not a claim that it is gone — so it
          never changes the rating, the routing, or the pin. */}
      {stale && (
        <View testID="stale-note" style={[styles.note, styles.noteAccent]}>
          <Text style={[type.bodyMdStrong, { color: colors.ink }]}>
            {`Nobody has confirmed this in ${stale.daysSince} days`}
          </Text>
          <Text style={[type.bodySm, { color: colors.body }]}>
            {`${KIND_LABEL[hazard.kind]} like this usually clears in about ${stale.clearDays} days, so it may already be fixed. Worth a look if you ride past.`}
          </Text>
        </View>
      )}

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

      {latest && (
        <Text style={[type.bodyMd, { color: colors.ink }]}>{latest.ai.caption}</Text>
      )}

      <View>
        <Text style={[type.bodyMdStrong, { color: colors.ink, marginBottom: spacing.xxs }]}>
          {hazard.reports.length === 0
            ? 'No photos yet'
            : `Reported by ${hazard.reports.length} ${
                hazard.reports.length === 1 ? 'rider' : 'riders'
              }`}
        </Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          {hazard.reports.length === 0
            ? 'Nobody has photographed this one. Add the first photo if you ride past it.'
            : 'Every photo submitted here, newest first. Judge it for yourself.'}
        </Text>
        {hazard.reports.length > 0 && <PhotoCarousel reports={hazard.reports} />}
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
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
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
  note: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 2,
  },
  /* A left rule rather than a colour fill: the danger colours already mean
     severity on this screen, and a coloured panel here would read as one. */
  noteAccent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.ink,
  },
});
