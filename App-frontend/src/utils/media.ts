import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

export const pickPhotos = async (limit = 5): Promise<PickedPhoto[]> => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Photo library access is required to attach photos.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    quality: 0.7,
    selectionLimit: limit,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg',
    type: asset.mimeType ?? 'image/jpeg',
  }));
};