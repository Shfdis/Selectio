import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { removeToken } from '../utils/secureStore';
import {
  userApi,
  useGetCurrentUserQuery,
  useGetUserProfileQuery,
  useUpdateProfileMutation,
} from '../slices/userSlice';
import ScreenHeader from '../components/ScreenHeader';

export default function EditProfile() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const { data: profile } = useGetUserProfileQuery(userId, { skip: !userId });
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setUsername(profile?.username ?? currentUser?.username ?? '');
    setDescription(profile?.description ?? currentUser?.description ?? '');
  }, [profile?.username, profile?.description, currentUser?.username, currentUser?.description]);

  const onPressSave = async () => {
    try {
      await updateProfile({
        username,
        description,
        avatarUrl: profile?.avatarUrl ?? '',
      }).unwrap();
      dispatch(userApi.util.invalidateTags(['User']));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Не удалось сохранить', 'Попробуйте ещё раз', [{ text: 'OK' }]);
    }
  };

  const onPressLogout = async () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          dispatch(userApi.util.resetApiState());
          navigation.reset({
            index: 0,
            routes: [{ name: 'home' }],
          });
        },
      },
    ]);
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
        <Image source={require('../assets/icons/profile-avatar.png')} style={styles.avatar} resizeMode="cover" />
        <Pressable style={styles.changeAvatarButton} onPress={() => {}} hitSlop={10}>
          <Text style={styles.changeAvatarText}>Изменить аватарку</Text>
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

        <Pressable style={styles.logoutButton} onPress={onPressLogout}>
          <Text style={styles.logoutText}>Выйти из профиля</Text>
        </Pressable>
      </View>
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
    marginTop: '4%',
  },
  changeAvatarText: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 20,
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
    borderRadius: 20,
    paddingVertical: '4%',
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

