import { View, Text, StyleSheet, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import LoginRegisterHeader from '../components/LoginRegisterHeader';
import InputComponent from '../components/InputComponent';
import GreenRoundedButton from '../components/GreenRoundedButton';
import { useRegisterUserMutation } from '../slices/userSlice';
import { useNavigation } from '@react-navigation/native';
export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [registerUser, { isLoading, error: registerError }] = useRegisterUserMutation();
  const navigation = useNavigation();
  const lastAlertKeyRef = useRef(null);

  useEffect(() => {
    if (!registerError) return;
    const alertKey = JSON.stringify({
      status: registerError?.status,
      data: registerError?.data,
    });
    if (lastAlertKeyRef.current === alertKey) return;
    lastAlertKeyRef.current = alertKey;
    Alert.alert("Не удалось зарегистрироваться", "Проверьте введенные данные", [{ text: 'Ок' }]);
  }, [registerError]);

  return (
    <View style={styles.container}>
      <LoginRegisterHeader title="Добро пожаловать" />
      <View style={styles.inputContainer}>
        <InputComponent description="Отображаемое имя" onChangeText={(newUsername) => {setUsername(newUsername)}} value={username} />
        <InputComponent description="Email" onChangeText={(newEmail) => {setEmail(newEmail)}} value={email} />
        <InputComponent description="Пароль" onChangeText={(newPassword) => {setPassword(newPassword)}} value={password} />
      </View>
      <View style={styles.buttonContainer}>
      <GreenRoundedButton text="Зарегистрироваться" onPress={() => {
        (async () => {
          if (!email || !password || !username) {
            Alert.alert("Заполните поля", "Введите имя, email и пароль", [{ text: 'Ок' }]);
            return;
          }
          try {
            await registerUser({ email, password, username, description: '' }).unwrap();
            navigation.navigate('login');
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