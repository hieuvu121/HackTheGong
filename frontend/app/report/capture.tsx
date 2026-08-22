import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

export default function Capture() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();
  const qs = fixHazardId ? `?fixHazardId=${fixHazardId}` : '';

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Text style={[type.displayMd, { color: colors.ink }]}>
        {fixHazardId ? 'Show us it’s fixed' : 'Photograph the hazard'}
      </Text>
      <Text style={[type.bodyMd, { color: colors.body }]}>
        {fixHazardId
          ? 'Take a clear photo of the same spot so other riders can see the change.'
          : 'Get the whole obstruction in frame. Other riders will see this photo.'}
      </Text>

      <View style={styles.viewfinder}>
        <View style={styles.reticle} />
        <Text style={[type.bodySm, { color: colors.body }]}>Camera preview</Text>
      </View>

      <Button
        testID="shutter"
        label="Take photo"
        variant="large"
        onPress={() => router.push(`/report/gate${qs}`)}
      />
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
  viewfinder: {
    flex: 1,
    borderRadius: radii.xl,
    backgroundColor: colors.canvasSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.lg,
  },
  reticle: {
    width: 140,
    height: 140,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.mute,
  },
});
