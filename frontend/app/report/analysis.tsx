import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { NavButton } from '../../src/components/NavButton';
import { DangerBadge } from '../../src/components/DangerBadge';
import { ConfidenceMeter } from '../../src/components/ConfidenceMeter';
import { analyzePhoto, submitReport, RemoteVerdict } from '../../src/api/client';
import { useLocation } from '../../src/lib/useLocation';
import { DangerLevel, KIND_LABEL } from '../../src/data/types';
import { colors, radii, spacing, danger } from '../../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

const LEVELS: DangerLevel[] = ['dangerous', 'moderate', 'low'];

export default function Analysis() {
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom();
  const router = useRouter();
  const { uri, mimeType, fixHazardId } = useLocalSearchParams<{
    uri?: string;
    mimeType?: string;
    fixHazardId?: string;
  }>();

  const { coord } = useLocation();
  const [verdict, setVerdict] = useState<RemoteVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<DangerLevel | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uri) return;
    let live = true;

    analyzePhoto(uri, mimeType ?? 'image/jpeg')
      .then((v) => live && setVerdict(v))
      .catch((e: Error) => live && setError(e.message));

    return () => {
      live = false;
    };
  }, [uri, mimeType]);

  if (!uri) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={[type.bodyMd, { color: colors.body }]}>No photo to read.</Text>
        <Button label="Back" variant="subtle" onPress={() => router.back()} />
      </View>
    );
  }

  if (!verdict && !error) {
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

  const shown = level ?? verdict?.dangerLevel ?? 'moderate';
  const overridden = level !== null && level !== verdict?.dangerLevel;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({
        uri,
        mimeType: mimeType ?? 'image/jpeg',
        at: coord ?? { lng: 0, lat: 0 },
        intent: fixHazardId ? 'fix' : 'report',
        hazardId: fixHazardId,
        dangerLevel: shown,
      });
      router.push(`/report/done${fixHazardId ? `?fixHazardId=${fixHazardId}` : ''}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: screenTop, paddingBottom: screenBottom }]}>
      <View style={styles.head}>
        <NavButton testID="analysis-back" kind="back" onPress={() => router.back()} />
        <Text style={[type.displaySm, { color: colors.ink, flex: 1 }]}>Here’s what we found</Text>
      </View>

      <Image testID="verdict" source={{ uri }} style={styles.photo} resizeMode="cover" />

      {verdict ? (
        <>
          <Text style={[type.displaySm, { color: colors.ink }]}>{KIND_LABEL[verdict.kind]}</Text>

          {editing ? (
            <View testID="rating-picker" style={styles.picker}>
              {LEVELS.map((l) => {
                const on = l === shown;
                return (
                  <Pressable
                    key={l}
                    testID={`rate-${l}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setLevel(l);
                      setEditing(false);
                    }}
                    style={[styles.option, on && { borderColor: danger[l].color, borderWidth: 2 }]}
                  >
                    <View style={[styles.dot, { backgroundColor: danger[l].color }]} />
                    <Text style={[type.bodyMdStrong, { color: colors.ink }]}>
                      {danger[l].label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.badgeRow}>
              <DangerBadge level={shown} />
              {overridden && (
                <Text style={[type.caption, { color: colors.body }]}>Changed by you</Text>
              )}
            </View>
          )}

          <ConfidenceMeter
            testID="confidence"
            confidence={verdict.confidence}
            source={verdict.source}
          />

          <Text style={[type.bodyMd, { color: colors.ink }]}>{verdict.caption}</Text>
        </>
      ) : (
        <Text style={[type.bodyMd, { color: colors.ink }]}>
          The photo is saved, but it could not be read. Rate it yourself and submit.
        </Text>
      )}

      {error && (
        <Text testID="analysis-error" style={[type.bodySm, { color: danger.dangerous.color }]}>
          {error}
        </Text>
      )}

      <View style={{ flex: 1 }} />

      <View style={{ gap: spacing.md }}>
        <Button
          testID="submit-report"
          label={submitting ? 'Submitting…' : fixHazardId ? 'Submit fix' : 'Submit report'}
          variant="large"
          disabled={submitting}
          onPress={submit}
        />
        <Button
          testID="change-rating"
          label={editing ? 'Keep this rating' : 'Change the rating'}
          variant="subtle"
          onPress={() => setEditing((v) => !v)}
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
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  photo: {
    height: 180,
    borderRadius: radii.xl,
    backgroundColor: colors.canvasSoft,
    marginVertical: spacing.sm,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  picker: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.canvasSoft,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  dot: { width: 12, height: 12, borderRadius: radii.full },
});
