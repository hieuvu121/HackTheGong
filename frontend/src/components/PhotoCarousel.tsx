import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, danger } from '../theme/tokens';
import { type } from '../theme/type';
import { HazardReport } from '../data/types';

interface Props {
  reports: HazardReport[];
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

export function PhotoCarousel({ reports }: Props) {
  const newestFirst = [...reports].reverse();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {newestFirst.map((r, i) => (
        <View key={r.id} style={styles.tile}>
          <View style={styles.photo}>
            <Text testID={`photo-${i}`} style={[type.caption, { color: colors.body }]}>
              {`${r.photo} · ${r.reporterName}`}
            </Text>
            {r.intent === 'fix' && (
              <View style={styles.fixTag}>
                <Text style={[type.caption, { color: colors.onPrimary }]}>Fix</Text>
              </View>
            )}
          </View>
          <Text style={[type.bodySmStrong, { color: colors.ink }]}>{r.reporterName}</Text>
          <Text style={[type.caption, { color: colors.body }]}>{when(r.reportedAt)}</Text>
          <View style={styles.tierRow}>
            <View style={[styles.dot, { backgroundColor: danger[r.ai.dangerLevel].color }]} />
            <Text style={[type.caption, { color: colors.body }]}>
              {`${Math.round(r.ai.confidence * 100)}% confident`}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md, paddingVertical: spacing.sm },
  tile: { width: 160, gap: 2 },
  photo: {
    width: 160,
    height: 120,
    borderRadius: radii.lg,
    backgroundColor: colors.canvasSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  fixTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: radii.full },
});
