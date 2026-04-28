import { View, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginRegisterHeader from '../components/LoginRegisterHeader';
import InputComponent from '../components/InputComponent';
import GreenRoundedButton from '../components/GreenRoundedButton';
import KeyboardAvoidingBox from '../components/KeyboardAvoidingBox';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useRegisterUserMutation } from '../slices/userSlice';
import { useNavigation } from '@react-navigation/native';
import { buildAuthErrorAlert } from '../utils/authErrorAlert';

export default function Register() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isEmailConfirmNoticeVisible, setIsEmailConfirmNoticeVisible] = useState(false);
  const [authNotice, setAuthNotice] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [registerUser, { isLoading }] = useRegisterUserMutation();
  const navigation = useNavigation();

  return (
    <KeyboardAvoidingBox style={styles.container} enabled useBottomInset keyboardVerticalOffset={insets.top}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LoginRegisterHeader title="Добро пожаловать" />
        <View style={styles.inputContainer}>
          <InputComponent
            description="Отображаемое имя"
            onChangeText={(newUsername) => {
              setUsername(newUsername);
            }}
            value={username}
          />
          <InputComponent
            description="Email"
            onChangeText={(newEmail) => {
              setEmail(newEmail);
            }}
            value={email}
          />
          <InputComponent
            description="Пароль"
            onChangeText={(newPassword) => {
              setPassword(newPassword);
            }}
            value={password}
          />
        </View>
        <View style={styles.buttonContainer}>
          <GreenRoundedButton
            text="Зарегистрироваться"
            onPress={() => {
              (async () => {
                const normalizedEmail = email.trim();
                const normalizedPassword = password.trim();
                const normalizedUsername = username.trim();
                if (!normalizedEmail || !normalizedPassword || !normalizedUsername) {
                  setAuthNotice({
                    visible: true,
                    title: 'Заполните поля',
                    message: 'Введите имя, email и пароль.',
                  });
                  return;
                }
                try {
                  await registerUser({
                    email: normalizedEmail,
                    password: normalizedPassword,
                    username: normalizedUsername,
                    description: '',
                  }).unwrap();
                  setIsEmailConfirmNoticeVisible(true);
                } catch (e) {
                  const alert = buildAuthErrorAlert(e, 'register');
                  setAuthNotice({
                    visible: true,
                    title: alert.title,
                    message: alert.message,
                  });
                }
              })();
            }}
          />
        </View>
      </ScrollView>
      <DeleteConfirmDialog
        visible={isEmailConfirmNoticeVisible}
        title="Подтвердите почту"
        message="Мы отправили письмо на ваш email. Перейдите по ссылке в письме, чтобы завершить регистрацию."
        confirmLabel="Понятно"
        hideCancel
        cardTone="green"
        onConfirm={() => {
          setIsEmailConfirmNoticeVisible(false);
          navigation.navigate('login');
        }}
        onCancel={() => setIsEmailConfirmNoticeVisible(false)}
      />
      <DeleteConfirmDialog
        visible={authNotice.visible}
        title={authNotice.title}
        message={authNotice.message}
        confirmLabel="Ок"
        hideCancel
        cardTone="green"
        onConfirm={() => setAuthNotice((prev) => ({ ...prev, visible: false }))}
        onCancel={() => setAuthNotice((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingBox>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D6C596',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginTop: '4%',
  },
  buttonContainer: {
    width: '100%',
    marginTop: '10%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
