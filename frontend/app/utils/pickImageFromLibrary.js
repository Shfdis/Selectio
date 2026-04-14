import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function pickImageFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Нет доступа к галерее',
      'Разрешите доступ к фотографиям в настройках устройства, чтобы выбрать изображение.',
      [{ text: 'Ок' }],
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const uri = result.assets[0]?.uri;
  return typeof uri === 'string' && uri.length > 0 ? uri : null;
}
