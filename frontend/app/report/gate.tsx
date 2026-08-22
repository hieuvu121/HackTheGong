import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView from '../../src/map/MapView';
import { Button } from '../../src/components/Button';
import { NavButton } from '../../src/components/NavButton';
import { useGoBack } from '../../src/lib/useGoBack';
import { checkGate, GATE_RADIUS_M } from '../../src/lib/geo';
import { useLocation } from '../../src/lib/useLocation';
import { useHazard } from '../../src/data/useHazards';
import { colors, radii, spacing, danger } from '../../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

/**
 * Confirms the rider is standing at a hazard they are marking as fixed.
 *
 * Only the fix flow needs this. A brand-new report is filed wherever the rider
 * is, so there is nothing to check against — the photo and the coordinates are
 * the evidence, and they go straight to the camera.
 */
export default function Gate() {
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom();
  const router = useRouter();
  const goBack = useGoBack();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();

  const { status, coord, accuracyM, refresh } = useLocation();
  const { hazard: target } = useHazard(fixHazardId);

  const gate = coord && target ? checkGate(coord, target.coord) : null;
  const withinRange = gate?.withinRange ?? false;

  const proceed = () => {
    if (withinRange) router.push(`/report/capture?fixHazardId=${fixHazardId}`);
  };

  return (
    <View style={[styles.root, { paddingTop: screenTop, paddingBottom: screenBottom }]}>
      <View style={styles.head}>
        <NavButton testID="gate-back" kind="back" onPress={goBack} />
        <Text style={[type.displaySm, { color: colors.ink, flex: 1 }]}>Confirming you’re here</Text>
      </View>

      <Text style={[type.bodyMd, { color: colors.body }]}>
        {`A hazard can only be marked fixed from the spot itself. It keeps the map honest — so your location is checked before the camera opens.`}
      </Text>

      {target && (
        <View style={styles.mapFrame}>
          <MapView
            center={coord ?? target.coord}
            zoom={15}
            hazards={[target]}
            userLocation={coord ?? undefined}
            gateCircle={{ center: target.coord, radiusM: GATE_RADIUS_M }}
            fitTo={coord && !withinRange ? [coord, target.coord] : undefined}
            fitPadding={{ top: 48, bottom: 48, left: 48, right: 48 }}
          />
        </View>
      )}

      {status === 'pending' ? (
        <View testID="gate-locating" style={[styles.status, styles.waiting]}>
          <ActivityIndicator color={colors.ink} />
          <Text style={[type.bodyMdStrong, { color: colors.ink }]}>Finding you…</Text>
        </View>
      ) : (
        <View
          testID={withinRange ? 'gate-allowed' : 'gate-blocked'}
          style={[styles.status, withinRange ? styles.ok : styles.bad]}
        >
          <View
            style={[
              styles.mark,
              { backgroundColor: withinRange ? danger.low.color : danger.dangerous.color },
            ]}
          >
            <Text style={styles.markGlyph}>{withinRange ? '✓' : '!'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.displaySm, { color: colors.ink }]}>
              {withinRange ? 'Location confirmed' : `${gate?.distanceM ?? '—'} m away`}
            </Text>
            <Text style={[type.bodySm, { color: colors.body }]}>
              {withinRange
                ? `Within ${GATE_RADIUS_M} m of the hazard${
                    accuracyM ? `, GPS accurate to ${Math.round(accuracyM)} m` : ''
                  }.`
                : `Move within ${GATE_RADIUS_M} m of the hazard to mark it fixed.`}
            </Text>
          </View>
        </View>
      )}

      {status !== 'pending' && status !== 'granted' && (
        <Text testID="gate-no-location" style={[type.bodySm, { color: colors.body }]}>
          {status === 'denied'
            ? 'Location permission is off, so this cannot be confirmed. Turn it on in Settings, then try again.'
            : status === 'unsupported'
              ? 'This build has no location module compiled in. Rebuild the app with `npx expo run:ios`.'
              : 'Your location is unavailable right now.'}
        </Text>
      )}

      <View style={{ gap: spacing.md }}>
        <Button
          testID="gate-continue"
          label={withinRange ? 'Open the camera' : 'Move closer to continue'}
          variant="large"
          disabled={!withinRange}
          onPress={proceed}
        />
        <Button
          testID="gate-retry"
          label="Check my location again"
          variant="subtle"
          onPress={() => void refresh()}
        />
      </View>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mapFrame: {
    flex: 1,
    minHeight: 180,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.canvasSoft,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 2,
    padding: spacing.xl,
  },
  waiting: { backgroundColor: colors.canvasSoft, borderColor: colors.canvasSoft },
  ok: { backgroundColor: colors.canvasSoft, borderColor: danger.low.color },
  bad: { backgroundColor: colors.canvas, borderColor: danger.dangerous.color },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: { color: colors.onDark, fontSize: 18, lineHeight: 22, fontWeight: '700' },
});
