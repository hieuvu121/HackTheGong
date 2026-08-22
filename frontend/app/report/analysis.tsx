import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { DangerBadge } from '../../src/components/DangerBadge';
import { analyzeReportPhoto, analyzeFixPhoto } from '../../src/lib/fakeAI';
import { HAZARDS } from '../../src/data/hazards';
import { AIVerdict, KIND_LABEL } from '../../src/data/types';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

export default function Analysis() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);

  useEffect(() => {
    let live = true;
    const hazard = HAZARDS.find((h) => h.id === fixHazardId);
    const p = hazard ? analyzeFixPhoto(hazard.kind) : analyzeReportPhoto(0);
    p.then((v) => {
      if (live) setVerdict(v);
    });
    return () => {
      live = false;
    };
  }, [fixHazardId]);

  if (!verdict) {
    return (
      <View testID="analysing" style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.ink} />
        <Text style={[type.displaySm, { color: colors.ink }]}>Reading your photo</Text>
        <Text style={[type.bodySm, { color: colors.body, textAlign: 'center' }]}>
          Classifying the hazard and estimating how risky it is for riders.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Text style={[type.displayMd, { color: colors.ink }]}>Here’s what we found</Text>

      <View testID="verdict" style={styles.photo}>
        <Text style={[type.bodySm, { color: colors.body }]}>Your photo</Text>
      </View>

      <Text style={[type.displaySm, { color: colors.ink }]}>{KIND_LABEL[verdict.kind]}</Text>
      <DangerBadge level={verdict.dangerLevel} />
      <Text style={[type.bodyMd, { color: colors.ink }]}>{verdict.caption}</Text>

      <Text style={[type.caption, { color: colors.body }]}>
        Check the photo against this rating. If it looks wrong, change it before submitting.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={{ gap: spacing.md }}>
        <Button
          label={fixHazardId ? 'Submit fix' : 'Submit report'}
          variant="large"
          onPress={() =>
            router.push(`/report/done${fixHazardId ? `?fixHazardId=${fixHazardId}` : ''}`)
          }
        />
        <Button label="Change the rating" variant="subtle" onPress={() => {}} />
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
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  photo: {
    height: 160,
    borderRadius: radii.xl,
    backgroundColor: colors.canvasSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
});
