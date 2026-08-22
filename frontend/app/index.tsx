import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MapView from '../src/map/MapView';
import { TimeChip } from '../src/components/TimeChip';
import { ReportFab } from '../src/components/ReportFab';
import { HAZARDS } from '../src/data/hazards';
import { ORIGIN, DEFAULT_ZOOM } from '../src/data/locale';
import { isHazardActiveAt } from '../src/lib/time';
import { colors, radii, spacing, shadows } from '../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../src/theme/insets';
import { type } from '../src/theme/type';

export default function Home() {
  const router = useRouter();
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom(spacing.xxxl * 2);
  const [departAt, setDepartAt] = useState(new Date());
  const [isNow, setIsNow] = useState(true);

  const active = useMemo(() => HAZARDS.filter((h) => isHazardActiveAt(h, departAt)), [departAt]);

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

  return (
    <View style={styles.root}>
      <MapView
        center={ORIGIN}
        zoom={DEFAULT_ZOOM}
        hazards={active}
        userLocation={ORIGIN}
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

      <View style={[styles.fabSlot, { bottom: screenBottom }]} pointerEvents="box-none">
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
  fabSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
