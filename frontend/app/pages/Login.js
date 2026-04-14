import {View, StyleSheet, Alert} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import LoginRegisterHeader from '../components/LoginRegisterHeader';
import InputComponent from '../components/InputComponent';
import GreenRoundedButton from '../components/GreenRoundedButton';
import { useGetCurrentUserQuery, useLoginUserMutation } from '../slices/userSlice';
import { useNavigation } from '@react-navigation/native';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginUser, { isLoading, error: loginError }] = useLoginUserMutation();
  const { data: currentUser } = useGetCurrentUserQuery();
  const navigation = useNavigation();
  const hasNavigatedRef = useRef(false);
  const lastAlertKeyRef = useRef(null);

  useEffect(() => {
    if (!currentUser || hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigation.navigate('main');
  }, [currentUser, navigation]);

  useEffect(() => {
    if (!loginError) return;
    const alertKey = JSON.stringify({
      status: loginError?.status,
      data: loginError?.data,
    });
    if (lastAlertKeyRef.current === alertKey) return;
    lastAlertKeyRef.current = alertKey;
    Alert.alert("Не удалось войти", "Неверный логин или пароль", [{ text: 'Ок' }]);
  }, [loginError]);

  return (
    <View style={styles.container}>
      <LoginRegisterHeader title="Добро пожаловать" />
      <View style={styles.inputContainer}>
        <InputComponent description="Email" onChangeText={(newEmail) => {setEmail(newEmail)}} value={email} />
        <InputComponent description="Пароль" onChangeText={(newPassword) => {setPassword(newPassword)}} value={password} />
      </View>
      <View style={styles.buttonContainer}>
      <GreenRoundedButton text="Войти" onPress={() => {
        (async () => {
          if (!email || !password) {
            Alert.alert("Заполните поля", "Введите email и пароль", [{ text: 'Ок' }]);
            return;
          }
          try {
            await loginUser({ email, password }).unwrap();
          } catch (e) {
          }
        })();
        }} />
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D6C596',
  }, 
  buttonContainer: {
    width: '100%',
    marginTop: '10%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});