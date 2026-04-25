import { useState } from 'react';
import { Alert } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import CommunityEditor from '../components/CommunityEditor';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';
import { useUploadImageMutation } from '../slices/profileSlice';
import { useCreateCommunityMutation } from '../slices/communitiesSlice';

const isLocalAssetUri = (uri) => typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('content://'));

const buildUploadMeta = (uri) => {
  const normalized = String(uri ?? '');
  const fallback = { name: 'community-cover.jpg', type: 'image/jpeg' };
  if (!normalized) {
    return fallback;
  }
  const fileName = normalized.split('/').pop() || fallback.name;
  const hasJpeg = /\.(jpe?g)$/i.test(fileName);
  const hasPng = /\.png$/i.test(fileName);
  const hasWebp = /\.webp$/i.test(fileName);
  const mimeType = hasPng ? 'image/png' : hasWebp ? 'image/webp' : 'image/jpeg';
  if (hasJpeg || hasPng || hasWebp) {
    return { name: fileName, type: mimeType };
  }
  return fallback;
};

export default function NewCommunity() {
  const navigation = useNavigation();
  const [coverUri, setCoverUri] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadImageMutation();
  const [createCommunity, { isLoading: isCreatingCommunity }] = useCreateCommunityMutation();

  const onPressSave = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert('Введите название', 'Название сообщества не может быть пустым.', [{ text: 'Ок' }]);
      return;
    }
    try {
      let resolvedCoverUrl = coverUri || '';
      if (isLocalAssetUri(resolvedCoverUrl)) {
        const { name, type } = buildUploadMeta(resolvedCoverUrl);
        const uploadResponse = await uploadImage({
          uri: resolvedCoverUrl,
          name,
          type,
        }).unwrap();
        resolvedCoverUrl = uploadResponse?.url || '';
      }
      const created = await createCommunity({
        name: trimmedName,
        description: description.trim(),
        coverUrl: resolvedCoverUrl,
        genres: selectedGenres,
      }).unwrap();
      navigation.navigate('myCommunity', { communityId: created?.id });
    } catch (_error) {
      Alert.alert('Не удалось создать сообщество', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Создание сообщества"
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressSave}
        confirmDisabled={isCreatingCommunity || isUploadingImage}
      />

      <CommunityEditor
        coverImageSource={
          coverUri ? { uri: coverUri } : require('../assets/icons/profile-avatar.png')
        }
        onPressChangeAvatar={async () => {
          const uri = await pickImageFromLibrary();
          if (uri) setCoverUri(uri);
        }}
        displayName={displayName}
        onChangeDisplayName={setDisplayName}
        description={description}
        onChangeDescription={setDescription}
        selectedGenres={selectedGenres}
        onSelectedGenresChange={setSelectedGenres}
        addGenresWhenEmpty
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
});
