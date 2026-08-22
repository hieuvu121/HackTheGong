import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}

/** Photos are re-encoded to JPEG at 0.7 — a phone original is ~8MB of upload. */
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
  exif: false,
};

function toPicked(result: ImagePicker.ImagePickerResult): PickedPhoto | null {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    width: asset.width,
    height: asset.height,
  };
}

/** Returns null when the rider backs out or declines the permission. */
export async function takePhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  return toPicked(await ImagePicker.launchCameraAsync(OPTIONS));
}

export async function pickPhoto(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  return toPicked(await ImagePicker.launchImageLibraryAsync(OPTIONS));
}
