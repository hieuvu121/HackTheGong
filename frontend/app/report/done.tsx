import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { type } from '../../src/theme/type';

export default function Done() {
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();

  /**
   * Unwind the report flow rather than pushing another map on top of it.
   * Pushing left the whole flow underneath, so Android back from the "new" map
   * re-showed this confirmation, and each report added five stack entries.
   */
  const backToMap = () => {
    if (router.canDismiss?.()) router.dismissAll();
    else router.replace('/');
  };

  return (
    <View style={[styles.root, styles.center]}>
      <View style={styles.mark}>
        <Text style={styles.tick}>✓</Text>
      </View>

      <Text style={[type.displayMd, { color: colors.ink, textAlign: 'center' }]}>
        {fixHazardId ? 'Marked as fixed' : 'Report submitted'}
      </Text>
      <Text style={[type.bodyMd, { color: colors.body, textAlign: 'center' }]}>
        {fixHazardId
          ? 'This hazard is off the map. Thanks for closing the loop.'
          : 'Riders routing through here will see it from now on.'}
      </Text>

      <Button
        testID="back-to-map"
        label="Back to map"
        variant="large"
        style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
        onPress={backToMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas, padding: spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  mark: {
    width: 88,
    height: 88,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  tick: { color: colors.onPrimary, fontSize: 40, lineHeight: 46 },
});
