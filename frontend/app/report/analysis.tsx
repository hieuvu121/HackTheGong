import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { NavButton } from '../../src/components/NavButton';
import { useGoBack } from '../../src/lib/useGoBack';
import { DangerBadge } from '../../src/components/DangerBadge';
import { ConfidenceMeter } from '../../src/components/ConfidenceMeter';
import { analyzePhoto, submitReport, RemoteVerdict } from '../../src/api/client';
import { useLocation } from '../../src/lib/useLocation';
import { DangerLevel, HazardKind, KIND_LABEL } from '../../src/data/types';
import { colors, radii, spacing, danger } from '../../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

const LEVELS: DangerLevel[] = ['dangerous', 'moderate', 'low'];
const KINDS = Object.keys(KIND_LABEL) as HazardKind[];
const CAPTION_LIMIT = 160;

export default function Analysis() {
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom();
  const router = useRouter();
  const goBack = useGoBack();
  const { uri, mimeType, fixHazardId } = useLocalSearchParams<{
    uri?: string;
    mimeType?: string;
    fixHazardId?: string;
  }>();

  const { coord } = useLocation();
  const [verdict, setVerdict] = useState<RemoteVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Each override is null until the rider touches it, so "unchanged" stays
  // distinguishable from "changed back to what the model said".
  const [level, setLevel] = useState<DangerLevel | null>(null);
  const [kind, setKind] = useState<HazardKind | null>(null);
  const [caption, setCaption] = useState<string | null>(null);

  const [editingLevel, setEditingLevel] = useState(false);
  const [editingKind, setEditingKind] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
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
        <Button label="Back" variant="subtle" onPress={goBack} />
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

  const shownLevel = level ?? verdict?.dangerLevel ?? 'moderate';
  const shownKind = kind ?? verdict?.kind ?? 'construction';
  const shownCaption = caption ?? verdict?.caption ?? '';

  const edited =
    (level !== null && level !== verdict?.dangerLevel) ||
    (kind !== null && kind !== verdict?.kind) ||
    (caption !== null && caption.trim() !== verdict?.caption);

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
        kind: shownKind,
        caption: shownCaption.trim(),
        dangerLevel: shownLevel,
        confidence: verdict?.confidence ?? 0,
        // A corrected verdict is the rider's, whatever produced the draft.
        verdictSource: edited ? 'rider' : (verdict?.source ?? 'fallback'),
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
        <NavButton testID="analysis-back" kind="back" onPress={goBack} />
        <Text style={[type.displaySm, { color: colors.ink, flex: 1 }]}>Here’s what we found</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image testID="verdict" source={{ uri }} style={styles.photo} resizeMode="cover" />

        {verdict ? (
          <>
            {editingKind ? (
              <View testID="kind-picker" style={styles.picker}>
                {KINDS.map((k) => (
                  <Pressable
                    key={k}
                    testID={`kind-${k}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: k === shownKind }}
                    onPress={() => {
                      setKind(k);
                      setEditingKind(false);
                    }}
                    style={[
                      styles.option,
                      k === shownKind && { borderColor: colors.ink, borderWidth: 2 },
                    ]}
                  >
                    <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{KIND_LABEL[k]}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable
                testID="change-kind"
                accessibilityRole="button"
                accessibilityLabel="Change the hazard type"
                onPress={() => setEditingKind(true)}
                style={styles.kindRow}
              >
                <Text style={[type.displaySm, { color: colors.ink, flex: 1 }]}>
                  {KIND_LABEL[shownKind]}
                </Text>
                <Text style={[type.bodySmStrong, { color: colors.body }]}>Change</Text>
              </Pressable>
            )}

            {editingLevel ? (
              <View testID="rating-picker" style={styles.picker}>
                {LEVELS.map((l) => {
                  const on = l === shownLevel;
                  return (
                    <Pressable
                      key={l}
                      testID={`rate-${l}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        setLevel(l);
                        setEditingLevel(false);
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
                <DangerBadge level={shownLevel} />
                {edited && <Text style={[type.caption, { color: colors.body }]}>Changed by you</Text>}
              </View>
            )}

            <ConfidenceMeter
              testID="confidence"
              confidence={verdict.confidence}
              source={edited ? 'rider' : verdict.source}
            />

            {/* The rider was there and the model was not. When it misreads the
                photo, the description is the part other riders actually read. */}
            {editingCaption ? (
              <View style={{ gap: spacing.xs }}>
                <TextInput
                  testID="caption-input"
                  accessibilityLabel="Hazard description"
                  value={shownCaption}
                  onChangeText={setCaption}
                  onBlur={() => setEditingCaption(false)}
                  multiline
                  autoFocus
                  maxLength={CAPTION_LIMIT}
                  placeholder="Describe what a rider needs to watch out for."
                  placeholderTextColor={colors.body}
                  style={[type.bodyMd, styles.input]}
                />
                <Text style={[type.caption, { color: colors.body, textAlign: 'right' }]}>
                  {`${shownCaption.length}/${CAPTION_LIMIT}`}
                </Text>
              </View>
            ) : (
              <Pressable
                testID="change-caption"
                accessibilityRole="button"
                accessibilityLabel="Edit the description"
                onPress={() => setEditingCaption(true)}
                style={styles.captionRow}
              >
                <Text style={[type.bodyMd, { color: colors.ink, flex: 1 }]}>
                  {shownCaption || 'Describe what a rider needs to watch out for.'}
                </Text>
                <Text style={[type.bodySmStrong, { color: colors.body }]}>Edit</Text>
              </Pressable>
            )}
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
      </ScrollView>

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
          label={editingLevel ? 'Keep this rating' : 'Change the rating'}
          variant="subtle"
          onPress={() => setEditingLevel((v) => !v)}
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
  scroll: { gap: spacing.md, paddingBottom: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  photo: {
    height: 180,
    borderRadius: radii.xl,
    backgroundColor: colors.canvasSoft,
    marginVertical: spacing.sm,
  },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 44,
  },
  input: {
    color: colors.ink,
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
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
