import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { removeToken } from '../utils/secureStore';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';
import { userApi, useGetCurrentUserQuery } from '../slices/userSlice';
import { useGetUserProfileQuery, useUpdateProfileMutation } from '../slices/profileSlice';
import ScreenHeader from '../components/ScreenHeader';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

export default function EditProfile() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: profile } = useGetUserProfileQuery(userId, { skip: !userId });
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  useEffect(() => {
    setUsername(profile?.username ?? currentUser?.username ?? '');
    setDescription(profile?.description ?? currentUser?.description ?? '');
    setAvatarUri(profile?.avatarUrl ?? '');
  }, [profile?.username, profile?.description, profile?.avatarUrl, currentUser?.username, currentUser?.description]);

  const onPressChangeAvatar = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setAvatarUri(uri);
  };

  const onPressSave = async () => {
    try {
      await updateProfile({
        username,
        description,
        avatarUrl: avatarUri || profile?.avatarUrl || '',
      }).unwrap();
      dispatch(userApi.util.invalidateTags(['User']));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Не удалось сохранить', 'Попробуйте ещё раз', [{ text: 'Ок' }]);
    }
  };

  const onConfirmLogout = async () => {
    setLogoutDialogVisible(false);
    await removeToken();
    dispatch(userApi.util.resetApiState());
    navigation.reset({
      index: 0,
      routes: [{ name: 'home' }],
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Настройки профиля"
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressSave}
        confirmDisabled={isLoading}
      />

      <View style={styles.avatarSection}>
        <Image
          source={avatarUri ? { uri: avatarUri } : require('../assets/icons/profile-avatar.png')}
          style={styles.avatar}
          resizeMode="cover"
        />
        <Pressable style={styles.changeAvatarButton} onPress={onPressChangeAvatar} hitSlop={10}>
          <Image
            source={require('../assets/icons/icon_photo-add.png')}
            style={styles.changeAvatarIcon}
            resizeMode="contain"
          />
          <Text style={styles.changeAvatarText}>Изменить фото</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Отображаемое имя</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          placeholder=""
          placeholderTextColor="#81876D"
        />

        <Text style={[styles.label, styles.labelSpacing]}>Описание</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
          multiline
          textAlignVertical="top"
          placeholder=""
          placeholderTextColor="#81876D"
        />

        <Pressable style={styles.logoutButton} onPress={() => setLogoutDialogVisible(true)}>
          <Text style={styles.logoutText}>Выйти из профиля</Text>
        </Pressable>
      </View>

      <DeleteConfirmDialog
        visible={logoutDialogVisible}
        title="Выход"
        message="Вы уверены, что хотите выйти из аккаунта?"
        cancelLabel="Отмена"
        confirmLabel="Выйти"
        onCancel={() => setLogoutDialogVisible(false)}
        onConfirm={onConfirmLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  avatarSection: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    alignItems: 'center',
    paddingTop: '6%',
    paddingBottom: '6%',
  },
  avatar: {
    width: '34%',
    aspectRatio: 1,
    borderRadius: 9999,
  },
  changeAvatarButton: {
    marginTop: 16,
    width: 190,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#81876D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  changeAvatarIcon: {
    position: 'absolute',
    left: '7%',
    width: 24,
    height: 24,
  },
  changeAvatarText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '500',
    lineHeight: 20,
    left: '8%',
  },
  form: {
    paddingHorizontal: '6%',
    paddingTop: '6%',
  },
  label: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 20,
    marginBottom: '3%',
  },
  labelSpacing: {
    marginTop: '6%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#81876D',
    borderRadius: 20,
    paddingHorizontal: '5%',
    paddingVertical: '4%',
    backgroundColor: '#ECE8DD',
  },
  textArea: {
    minHeight: 110,
  },
  logoutButton: {
    marginTop: '8%',
    width: '100%',
    backgroundColor: '#784C2F',
    borderWidth: 1,
    borderColor: '#2D2800',
    borderRadius: 40,
    paddingVertical: '3%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 20,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 24,
  },
});

