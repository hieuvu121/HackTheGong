import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { checkGate, GATE_RADIUS_M } from '../../src/lib/geo';
import { ORIGIN } from '../../src/data/locale';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

// Demo positions: standing at the hazard, and ~780m away.
const AT_HAZARD = ORIGIN;
const FAR_AWAY = { lng: 150.9012, lat: -34.4265 };

export default function Gate() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();
  const qs = fixHazardId ? `?fixHazardId=${fixHazardId}` : '';

  const [atHazard, setAtHazard] = useState(true);
  const { withinRange, distanceM } = checkGate(atHazard ? AT_HAZARD : FAR_AWAY, ORIGIN);

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Text style={[type.displayMd, { color: colors.ink }]}>Confirming you’re here</Text>
      <Text style={[type.bodyMd, { color: colors.body }]}>
        Reports can only be submitted from the hazard itself. It keeps the map honest.
      </Text>

      <View style={[styles.status, withinRange ? styles.ok : styles.bad]}>
        <Text style={[type.displayLg, { color: colors.ink }]}>
          {withinRange ? 'Location confirmed' : `${distanceM} m away`}
        </Text>
        <Text style={[type.bodySm, { color: colors.body }]}>
          {withinRange
            ? `Within ${GATE_RADIUS_M} m of the hazard.`
            : `Move within ${GATE_RADIUS_M} m to submit this report.`}
        </Text>
      </View>

      {withinRange ? <View testID="gate-allowed" /> : <View testID="gate-blocked" />}

      <View style={{ flex: 1 }} />

      <View style={{ gap: spacing.md }}>
        <Button
          testID="gate-continue"
          label="Continue"
          variant="large"
          disabled={!withinRange}
          onPress={() => {
            if (withinRange) router.push(`/report/analysis${qs}`);
          }}
        />
        <Button
          testID={atHazard ? 'simulate-far' : 'simulate-near'}
          label={atHazard ? 'Simulate being far away' : 'Simulate being at the hazard'}
          variant="subtle"
          onPress={() => setAtHazard((v) => !v)}
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
    gap: spacing.lg,
  },
  status: {
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  ok: { backgroundColor: colors.canvasSoft },
  bad: { backgroundColor: colors.canvasSoft, borderWidth: 2, borderColor: colors.ink },
});
