import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { NavButton } from '../src/components/NavButton';
import { useGoBack } from '../src/lib/useGoBack';
import { PLACES } from '../src/data/places';
import { colors, radii, spacing } from '../src/theme/tokens';
import { useScreenTop } from '../src/theme/insets';
import { type } from '../src/theme/type';

export default function Search() {
  const screenTop = useScreenTop();
  const router = useRouter();
  const goBack = useGoBack();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return PLACES.filter((p) => p.recent);
    return PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(term) || p.address.toLowerCase().includes(term),
    );
  }, [q]);

  // Replace rather than push: this screen is a modal, and pushing the whole
  // ride flow on top of it left search sitting under the route list forever.
  const choose = (id: string) => router.replace(`/routes?placeId=${id}`);

  return (
    <View style={[styles.root, { paddingTop: screenTop }]}>
      <View style={styles.head}>
        <Text style={[type.displayMd, { color: colors.ink }]}>Where to?</Text>
        <NavButton testID="search-close" kind="close" onPress={goBack} />
      </View>

      <View style={styles.field}>
        <TextInput
          testID="search-input"
          value={q}
          onChangeText={setQ}
          placeholder="Search a destination"
          placeholderTextColor={colors.mute}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => results[0] && choose(results[0].id)}
          style={[type.bodyMd, styles.input]}
        />
        {q.length > 0 && (
          <Pressable
            testID="search-clear"
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={12}
            onPress={() => setQ('')}
            style={styles.clear}
          >
            <Text style={[type.bodySmStrong, { color: colors.body }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {!q.trim() && <Text style={[type.bodySmStrong, styles.eyebrow]}>Recent</Text>}

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[type.bodyMd, { color: colors.body, paddingVertical: spacing.xl }]}>
            No places match that search.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => choose(item.id)}>
            <View style={styles.pin}>
              <Text style={styles.pinGlyph}>{item.recent ? '↻' : '◎'}</Text>
            </View>
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { justifyContent: 'center' },
  input: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radii.md,
    padding: spacing.lg,
    paddingRight: 48,
    color: colors.ink,
    minHeight: 52,
  },
  clear: { position: 'absolute', right: spacing.lg },
  eyebrow: { color: colors.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.canvasSoft,
  },
  pin: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.canvasSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinGlyph: { color: colors.body, fontSize: 16, lineHeight: 20 },
});
