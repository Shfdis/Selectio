import { View, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginRegisterHeader from '../components/LoginRegisterHeader';
import InputComponent from '../components/InputComponent';
import GreenRoundedButton from '../components/GreenRoundedButton';
import KeyboardAvoidingBox from '../components/KeyboardAvoidingBox';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useGetCurrentUserQuery, useLoginUserMutation } from '../slices/userSlice';
import { useNavigation } from '@react-navigation/native';
import { buildAuthErrorAlert } from '../utils/authErrorAlert';
export default function Login() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginUser, { isLoading }] = useLoginUserMutation();
  const { data: currentUser } = useGetCurrentUserQuery();
  const navigation = useNavigation();
  const hasNavigatedRef = useRef(false);
  const [authNotice, setAuthNotice] = useState({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (!currentUser || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigation.navigate('main');
  }, [currentUser, navigation]);

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
            text="Войти"
            onPress={() => {
              (async () => {
                const normalizedEmail = email.trim();
                const normalizedPassword = password.trim();
                if (!normalizedEmail || !normalizedPassword) {
                  setAuthNotice({
                    visible: true,
                    title: 'Заполните поля',
                    message: 'Введите email и пароль.',
                  });
                  return;
                }
                try {
                  await loginUser({ email: normalizedEmail, password: normalizedPassword }).unwrap();
                } catch (e) {
                  const alert = buildAuthErrorAlert(e, 'login');
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