import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../src/map/MapView';
import { Sheet } from '../src/components/Sheet';
import { NavButton } from '../src/components/NavButton';
import { useGoBack } from '../src/lib/useGoBack';
import { Button } from '../src/components/Button';
import { RouteCard } from '../src/components/RouteCard';
import { ROUTES } from '../src/data/routes';
import { HAZARDS } from '../src/data/hazards';
import { PLACES } from '../src/data/places';
import { ORIGIN } from '../src/data/locale';
import {
  activeHazardsForRoute,
  countByLevel,
  isStrictlySafest,
  safestRouteId,
} from '../src/lib/scoring';
import { colors, spacing } from '../src/theme/tokens';
import { useScreenTop } from '../src/theme/insets';
import { type } from '../src/theme/type';

export default function Routes() {
  const router = useRouter();
  const goBack = useGoBack();
  const screenTop = useScreenTop();
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const place = PLACES.find((p) => p.id === placeId) ?? PLACES[2];

  const at = useMemo(() => new Date(), []);
  const safest = useMemo(() => safestRouteId(ROUTES, HAZARDS, at), [at]);
  const [selectedId, setSelectedId] = useState(safest);

  const selectedRoute = ROUTES.find((r) => r.id === selectedId) ?? ROUTES[0];
  const shownHazards = useMemo(
    () => activeHazardsForRoute(selectedRoute, HAZARDS, at),
    [selectedRoute, at],
  );

  return (
    <View style={styles.root}>
      <MapView
        center={ORIGIN}
        zoom={13}
        routes={ROUTES}
        activeRouteId={selectedId}
        hazards={shownHazards}
        userLocation={ORIGIN}
        fitTo={selectedRoute.geometry}
        // Keep the route clear of the bottom sheet.
        fitPadding={{ top: 80, bottom: 420, left: 48, right: 48 }}
        onHazardPress={(id) => router.push(`/hazard/${id}`)}
      />

      <View style={[styles.back, { top: screenTop }]} pointerEvents="box-none">
        <NavButton testID="routes-back" kind="back" floating onPress={goBack} />
      </View>

      <Sheet style={styles.sheet}>
        <Text style={[type.displaySm, { color: colors.ink }]}>{place.name}</Text>
        <Text style={[type.bodySm, { color: colors.body, marginBottom: spacing.lg }]}>
          {place.address}
        </Text>

        {/* Sized so the next card is clearly half-showing rather than clipped
            to a sliver, which read as a rendering glitch. */}
        <ScrollView
          style={{ maxHeight: 300 }}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xs }}
          showsVerticalScrollIndicator
        >
          {ROUTES.map((r) => (
            <RouteCard
              key={r.id}
              testID={`route-${r.id}`}
              route={r}
              counts={countByLevel(activeHazardsForRoute(r, HAZARDS, at))}
              selected={r.id === selectedId}
              badge={
                isStrictlySafest(r, ROUTES, HAZARDS, at)
                  ? 'safest'
                  : r.id === safest
                    ? 'recommended'
                    : undefined
              }
              onPress={() => setSelectedId(r.id)}
            />
          ))}
        </ScrollView>

        <Button
          testID="start-btn"
          label="Start ride"
          variant="large"
          style={{ marginTop: spacing.lg }}
          onPress={() => router.push(`/navigate?routeId=${selectedId}`)}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  back: { position: 'absolute', left: spacing.lg },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
