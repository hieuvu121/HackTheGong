import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { NavButton } from '../../src/components/NavButton';
import { useGoBack } from '../../src/lib/useGoBack';
import { takePhoto, pickPhoto, PickedPhoto } from '../../src/lib/photo';
import { colors, radii, spacing } from '../../src/theme/tokens';
import { useScreenTop, useScreenBottom } from '../../src/theme/insets';
import { type } from '../../src/theme/type';

const VIEWFINDER = '#141414';

export default function Capture() {
  const screenTop = useScreenTop();
  const screenBottom = useScreenBottom(spacing.xl);
  const router = useRouter();
  const goBack = useGoBack();
  const { fixHazardId } = useLocalSearchParams<{ fixHazardId?: string }>();

  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grab = async (source: 'camera' | 'library') => {
    setBusy(true);
    setError(null);
    try {
      const picked = source === 'camera' ? await takePhoto() : await pickPhoto();
      if (picked) setPhoto(picked);
      else setError('No photo — check the permission if nothing opened.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const useThisPhoto = () => {
    if (!photo) return;
    router.push({
      pathname: '/report/analysis',
      params: {
        uri: photo.uri,
        mimeType: photo.mimeType,
        ...(fixHazardId ? { fixHazardId } : {}),
      },
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.head, { paddingTop: screenTop }]}>
        <NavButton testID="capture-back" kind="back" floating onPress={goBack} />
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyMdStrong, { color: colors.onDark }]}>
            {fixHazardId ? 'Show us it’s fixed' : 'Photograph the hazard'}
          </Text>
          <Text style={[type.bodySm, styles.hint]}>
            {fixHazardId
              ? 'Same spot, so riders can see the change.'
              : 'Get the whole obstruction in frame.'}
          </Text>
        </View>
      </View>

      <View style={styles.frame}>
        {photo ? (
          <Image
            testID="photo-preview"
            source={{ uri: photo.uri }}
            style={styles.preview}
            resizeMode="cover"
          />
        ) : (
          <>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            {busy ? (
              <ActivityIndicator color={colors.onDark} />
            ) : (
              <Text style={[type.bodySm, styles.hint]}>
                Take a photo, or attach one you already have
              </Text>
            )}
          </>
        )}
      </View>

      {error && (
        <Text testID="capture-error" style={[type.bodySm, styles.error]}>
          {error}
        </Text>
      )}

      <View style={[styles.controls, { paddingBottom: screenBottom }]}>
        {photo ? (
          <>
            <Pressable
              testID="retake"
              accessibilityRole="button"
              onPress={() => setPhoto(null)}
              style={styles.secondary}
            >
              <Text style={[type.buttonMd, { color: colors.onDark }]}>Retake</Text>
            </Pressable>
            <Pressable
              testID="use-photo"
              accessibilityRole="button"
              onPress={useThisPhoto}
              style={styles.primary}
            >
              <Text style={[type.buttonMd, { color: colors.ink }]}>Use this photo</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              testID="pick-photo"
              accessibilityRole="button"
              accessibilityLabel="Attach a photo from your library"
              onPress={() => grab('library')}
              style={styles.secondary}
            >
              <Text style={[type.buttonMd, { color: colors.onDark }]}>Upload</Text>
            </Pressable>

            <Pressable
              testID="shutter"
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              onPress={() => grab('camera')}
              style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
            >
              <View style={styles.shutterCore} />
            </Pressable>

            {/* Balances the shutter in the centre of the row. */}
            <View style={styles.spacer} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: VIEWFINDER },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  hint: { color: '#a8a8a8', textAlign: 'center' },
  error: { color: '#ff8b80', paddingHorizontal: spacing.lg, textAlign: 'center' },
  frame: {
    flex: 1,
    margin: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: colors.onDark },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radii.md },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radii.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radii.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radii.md },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: radii.full,
    borderWidth: 4,
    borderColor: colors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: radii.full,
    backgroundColor: colors.onDark,
  },
  spacer: { width: 96 },
  secondary: {
    minWidth: 96,
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primary: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.onDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});
