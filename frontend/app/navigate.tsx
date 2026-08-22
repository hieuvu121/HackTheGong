import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../src/map/MapView';
import { ManeuverBanner } from '../src/components/ManeuverBanner';
import { Button } from '../src/components/Button';
import { MapControl } from '../src/components/MapControl';
import { ROUTES } from '../src/data/routes';
import { HAZARDS } from '../src/data/hazards';
import { KIND_LABEL } from '../src/data/types';
import { activeHazardsForRoute } from '../src/lib/scoring';
import { haversineMeters, bearingBetween, bearingDelta } from '../src/lib/geo';
import { colors, radii, spacing, shadows, danger } from '../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../src/theme/insets';
import { type } from '../src/theme/type';

const TICK_MS = 3000;

export default function Navigate() {
  const router = useRouter();
  const screenTop = useScreenTop(spacing.sm);
  const screenBottom = useScreenBottom();
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const route = ROUTES.find((r) => r.id === routeId) ?? ROUTES[0];

  const [idx, setIdx] = useState(0);
  const at = useMemo(() => new Date(), []);

  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => Math.min(i + 1, route.geometry.length - 1)),
      TICK_MS,
    );
    return () => clearInterval(t);
  }, [route.geometry.length]);

  const here = route.geometry[idx];

  // F13: the camera follows the direction of travel. Instructions say "turn
  // left"; a north-locked map makes the rider translate that mid-ride.
  const heading = useMemo(() => {
    const ahead = route.geometry[Math.min(idx + 1, route.geometry.length - 1)];
    const behind = route.geometry[Math.max(idx - 1, 0)];
    return ahead === behind ? 0 : bearingBetween(behind, ahead);
  }, [route.geometry, idx]);

  const nextStep = route.steps.find((s) => s.atIndex > idx) ?? route.steps[route.steps.length - 1];
  const toNextM = Math.round(haversineMeters(here, route.geometry[nextStep.atIndex] ?? here));

  const progress = idx / (route.geometry.length - 1);
  const remainingMin = Math.max(1, Math.round(route.durationMin * (1 - progress)));
  const remainingKm = (route.distanceKm * (1 - progress)).toFixed(1);
  // Riders plan against a clock, not a duration.
  const arrival = new Date(Date.now() + remainingMin * 60_000);
  const arrivalLabel = `${String(arrival.getHours()).padStart(2, '0')}:${String(
    arrival.getMinutes(),
  ).padStart(2, '0')}`;

  const routeHazards = useMemo(
    () => activeHazardsForRoute(route, HAZARDS, at),
    [route, at],
  );

  // Warn about the nearest active hazard still close to us, and say which side
  // of the rider it falls on — "ahead" alone leaves them scanning.
  const hazardAhead = useMemo(() => {
    const nearest = routeHazards
      .map((h) => ({ h, d: Math.round(haversineMeters(here, h.coord)) }))
      .filter((x) => x.d < 900)
      .sort((a, b) => a.d - b.d)[0];
    if (!nearest) return undefined;

    const delta = bearingDelta(heading, bearingBetween(here, nearest.h.coord));
    const side = Math.abs(delta) < 25 ? 'straight ahead' : delta > 0 ? 'on your right' : 'on your left';
    return { ...nearest, side };
  }, [routeHazards, here, heading]);

  return (
    <View style={styles.root}>
      <MapView
        center={here}
        zoom={16}
        routes={[route]}
        activeRouteId={route.id}
        hazards={routeHazards}
        userLocation={here}
        followBearing={heading}
        follow
      />

      <View style={[styles.top, { top: screenTop }]}>
        <ManeuverBanner step={nextStep} distanceM={toNextM} />

        {hazardAhead && (
          <View
            testID="hazard-warning"
            style={[
              styles.warn,
              shadows.level2,
              { borderLeftColor: danger[hazardAhead.h.dangerLevel].color },
            ]}
          >
            <Text style={[type.bodyMdStrong, { color: colors.ink }]}>
              {`${KIND_LABEL[hazardAhead.h.kind]} ahead`}
            </Text>
            <Text style={[type.bodySm, { color: colors.body }]}>
              {`${hazardAhead.d} m ${hazardAhead.side} · ${hazardAhead.h.streetName}`}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.rideControls, { bottom: 140 }]} pointerEvents="box-none">
        <MapControl
          testID="report-while-riding"
          glyph="+"
          label="Report a hazard here"
          onPress={() => router.push('/report/capture')}
        />
      </View>

      <View testID="nav-footer" style={[styles.footer, shadows.level2, { paddingBottom: screenBottom }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.footRow}>
          <View>
            <Text style={[type.displaySm, { color: colors.ink }]}>{`${remainingMin} min`}</Text>
            <Text style={[type.bodySm, { color: colors.body }]}>
              {`${remainingKm} km · arrive ${arrivalLabel}`}
            </Text>
          </View>
          <Button label="End ride" variant="subtle" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  rideControls: { position: 'absolute', right: spacing.lg, alignItems: 'flex-end' },
  top: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.md,
  },
  warn: {
    backgroundColor: colors.canvas,
    borderRadius: radii.lg,
    borderLeftWidth: 5,
    padding: spacing.lg,
    gap: 2,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.canvasSoft,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.ink, borderRadius: radii.pill },
});
