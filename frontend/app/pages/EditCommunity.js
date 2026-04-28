import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import CommunityEditor from '../components/CommunityEditor';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import KeyboardAvoidingBox from '../components/KeyboardAvoidingBox';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';
import {
  useDeleteCommunityMutation,
  useGetCommunitiesCatalogQuery,
  useGetCommunityByIdQuery,
  useUpdateCommunityMutation,
} from '../slices/communitiesSlice';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { useUploadImageMutation } from '../slices/profileSlice';

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
const toCommunityGenres = (community) => {
  if (Array.isArray(community?.genres)) {
    return community.genres.filter((genre) => typeof genre === 'string' && genre.trim().length > 0);
  }
  if (community?.genre) {
    return [community.genre];
  }
  return [];
};

export default function EditCommunity() {
  const navigation = useNavigation();
  const route = useRoute();
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const routeCommunityId = Number(route?.params?.communityId);
  const { data: communitiesCatalog = [] } = useGetCommunitiesCatalogQuery({ page: 1, pageSize: 200 });
  const fallbackOwnedCommunityId = useMemo(
    () => communitiesCatalog.find((community) => community?.ownerUserId === userId)?.id,
    [communitiesCatalog, userId],
  );
  const communityId =
    Number.isFinite(routeCommunityId) && routeCommunityId > 0 ? routeCommunityId : fallbackOwnedCommunityId;
  const { data: communityData } = useGetCommunityByIdQuery(communityId, { skip: !communityId });

  const [coverUri, setCoverUri] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [nameRequiredDialogVisible, setNameRequiredDialogVisible] = useState(false);
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadImageMutation();
  const [updateCommunity, { isLoading: isUpdatingCommunity }] = useUpdateCommunityMutation();
  const [deleteCommunity, { isLoading: isDeletingCommunity }] = useDeleteCommunityMutation();

  useEffect(() => {
    if (!communityData || isFormInitialized) {
      return;
    }
    setCoverUri(communityData?.coverUrl || null);
    setDisplayName(communityData?.name || '');
    setDescription(communityData?.description || '');
    setSelectedGenres(toCommunityGenres(communityData));
    setIsFormInitialized(true);
  }, [communityData, isFormInitialized]);

  const onPressSave = async () => {
    const trimmedName = displayName.trim();
    if (!communityId) {
      Alert.alert('Не удалось сохранить', 'Сообщество не найдено.', [{ text: 'Ок' }]);
      return;
    }
    if (!trimmedName) {
      setNameRequiredDialogVisible(true);
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
      await updateCommunity({
        communityId,
        name: trimmedName,
        description: description.trim(),
        coverUrl: resolvedCoverUrl,
        genres: selectedGenres,
      }).unwrap();
      navigation.goBack();
    } catch (_error) {
      Alert.alert('Не удалось сохранить', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
    }
  };

  const onPressDelete = async () => {
    if (!communityId) {
      return;
    }
    try {
      await deleteCommunity({ communityId }).unwrap();
      navigation.navigate('main', { mainTab: 'groups' });
    } catch (_error) {
      Alert.alert('Не удалось удалить', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
    }
  };

  const isBusy = isUpdatingCommunity || isUploadingImage || isDeletingCommunity;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Настройки сообщества"
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressSave}
        confirmDisabled={isBusy || !isFormInitialized}
      />

      <KeyboardAvoidingBox style={styles.fill} enabled useBottomInset keyboardVerticalOffset={0}>
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
        />

        <View style={styles.deleteWrap}>
          <Pressable
            style={[styles.deleteButton, isBusy ? styles.deleteButtonDisabled : null]}
            onPress={onPressDelete}
            disabled={isBusy || !isFormInitialized}
          >
            <Text style={styles.deleteText}>Удалить сообщество</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingBox>

      <DeleteConfirmDialog
        visible={nameRequiredDialogVisible}
        onCancel={() => setNameRequiredDialogVisible(false)}
        onConfirm={() => setNameRequiredDialogVisible(false)}
        title="Введите название"
        message="Название сообщества не может быть пустым."
        confirmLabel="Ок"
        hideCancel
        cardTone="green"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  fill: {
    flex: 1,
  },
  deleteWrap: {
    paddingHorizontal: '6%',
    paddingBottom: 16,
  },
  deleteButton: {
    width: '100%',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#A03A3A',
    borderWidth: 1,
    borderColor: '#8B7B4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteText: {
    fontSize: 18,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: '600',
    lineHeight: 22,
  },
});
