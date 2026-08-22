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
        <Pressable
          style={[styles.search, shadows.level2]}
          onPress={() => router.push('/search')}
        >
          <Text style={[type.bodyMd, { color: colors.body }]}>Where to?</Text>
        </Pressable>
        <TimeChip testID="time-chip" at={departAt} isNow={isNow} onPress={cycleTime} />
      </View>

      <View style={[styles.controls, { bottom: screenBottom + 96 }]} pointerEvents="box-none">
        <MapControl
          testID="locate"
          glyph="◎"
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
    gap: spacing.md,
  },
  search: {
    backgroundColor: colors.canvas,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
    justifyContent: 'center',
  },
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
