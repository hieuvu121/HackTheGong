import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import MapView from '../src/map/MapView';
import { TimeChip } from '../src/components/TimeChip';
import { ReportFab } from '../src/components/ReportFab';
import { MapControl } from '../src/components/MapControl';
import { useHazards } from '../src/data/useHazards';
import { ORIGIN, DEFAULT_ZOOM } from '../src/data/locale';
import { isHazardActiveAt } from '../src/lib/time';
import { hasSeenOnboarding } from '../src/lib/firstRun';
import { colors, radii, spacing, shadows } from '../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../src/theme/insets';
import { type } from '../src/theme/type';

export default function Home() {
  const router = useRouter();
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom(spacing.xxxl * 2);
  const [departAt, setDepartAt] = useState(new Date());
  const [isNow, setIsNow] = useState(true);
  // Bumped by the locate button; the map only re-centres when asked, so a
  // rider's own panning is never yanked back.
  const [recenter, setRecenter] = useState(0);

  const { hazards } = useHazards();
  const active = useMemo(
    () => hazards.filter((h) => isHazardActiveAt(h, departAt)),
    [hazards, departAt],
  );

  // Toggle between now and 21:00 so the unlit hazard can be demoed.
  const cycleTime = () => {
    if (isNow) {
      const night = new Date(departAt);
      night.setHours(21, 0, 0, 0);
      setDepartAt(night);
      setIsNow(false);
    } else {
      setDepartAt(new Date());
      setIsNow(true);
    }
  };

  // First launch explains the permissions and the pin language before dropping
  // the rider onto a map of pulsing markers.
  if (!hasSeenOnboarding()) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.root}>
      <MapView
        center={ORIGIN}
        zoom={DEFAULT_ZOOM}
        hazards={active}
        userLocation={ORIGIN}
        recenterNonce={recenter}
        onHazardPress={(id) => router.push(`/hazard/${id}`)}
      />

      <View style={[styles.top, { top: screenTop }]}>
        <View style={[styles.tripCard, shadows.level2]}>
          <Pressable
            style={({ pressed }) => [styles.search, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Search for a destination"
            onPress={() => router.push('/search')}
          >
            <View style={styles.searchIcon} pointerEvents="none">
              <View style={styles.searchLens} />
              <View style={styles.searchHandle} />
            </View>
            <View style={styles.searchCopy}>
              <Text style={[type.caption, { color: colors.body }]}>Destination</Text>
              <Text style={[type.bodyMdStrong, { color: colors.ink }]}>Where to?</Text>
            </View>
            <Text style={styles.searchArrow}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <TimeChip testID="time-chip" at={departAt} isNow={isNow} onPress={cycleTime} />
        </View>
      </View>

      <View style={[styles.controls, { bottom: screenBottom + 124 }]} pointerEvents="box-none">
        <MapControl
          testID="locate"
          kind="locate"
          label="Centre the map on my location"
          onPress={() => setRecenter((n) => n + 1)}
        />
      </View>

      <View style={[styles.fabSlot, { bottom: screenBottom }]} pointerEvents="box-none">
        {/* Straight to the camera: a new report is filed where the rider is
            standing, so there is no prior location to check it against. The
            photo and the coordinates that go with it are the evidence. */}
        <ReportFab testID="report-fab" onPress={() => router.push('/report/capture')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  top: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  tripCard: {
    backgroundColor: colors.canvas,
    borderRadius: radii.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  search: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  divider: { width: 1, backgroundColor: colors.canvasSoft, marginVertical: spacing.md },
  searchIcon: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  searchLens: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  searchHandle: {
    position: 'absolute',
    width: 7,
    height: 2,
    backgroundColor: colors.ink,
    transform: [{ rotate: '45deg' }],
    right: 2,
    bottom: 4,
    borderRadius: radii.pill,
  },
  searchCopy: { flex: 1 },
  searchArrow: { color: colors.body, fontSize: 28, lineHeight: 28 },
  controls: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  fabSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
