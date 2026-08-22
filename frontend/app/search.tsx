import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PLACES } from '../src/data/places';
import { colors, radii, spacing } from '../src/theme/tokens';
import { useScreenTop } from '../src/theme/insets';
import { type } from '../src/theme/type';

export default function Search() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PLACES.filter((p) => p.recent);
    return PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(term) || p.address.toLowerCase().includes(term),
    );
  }, [q]);

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <Text style={[type.displayMd, { color: colors.ink }]}>Where to?</Text>

      <TextInput
        testID="search-input"
        value={q}
        onChangeText={setQ}
        placeholder="Search a destination"
        placeholderTextColor={colors.mute}
        style={[type.bodyMd, styles.input]}
      />

      {!q.trim() && <Text style={[type.bodySmStrong, styles.eyebrow]}>Recent</Text>}

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Text style={[type.bodyMd, { color: colors.body, paddingVertical: spacing.xl }]}>
            No places match that search.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/routes?placeId=${item.id}`)}>
            <View style={styles.pin} />
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyMdStrong, { color: colors.ink }]}>{item.name}</Text>
              <Text style={[type.bodySm, { color: colors.body }]}>{item.address}</Text>
            </View>
          </Pressable>
        )}
      />
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
  input: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.md,
    padding: spacing.lg,
    color: colors.ink,
    minHeight: 52,
  },
  eyebrow: { color: colors.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.canvasSoft,
  },
  pin: { width: 36, height: 36, borderRadius: radii.full, backgroundColor: colors.canvasSoft },
});
