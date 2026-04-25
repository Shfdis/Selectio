import { View, Text, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import LoginRegisterHeader from '../components/LoginRegisterHeader';
import InputComponent from '../components/InputComponent';
import GreenRoundedButton from '../components/GreenRoundedButton';
import { useRegisterUserMutation } from '../slices/userSlice';
import { useNavigation } from '@react-navigation/native';
import { buildAuthErrorAlert } from '../utils/authErrorAlert';
export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [registerUser, { isLoading }] = useRegisterUserMutation();
  const navigation = useNavigation();

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
          const normalizedEmail = email.trim();
          const normalizedPassword = password.trim();
          const normalizedUsername = username.trim();
          if (!normalizedEmail || !normalizedPassword || !normalizedUsername) {
            Alert.alert("Заполните поля", "Введите имя, email и пароль", [{ text: 'Ок' }]);
            return;
          }
          try {
            await registerUser({
              email: normalizedEmail,
              password: normalizedPassword,
              username: normalizedUsername,
              description: '',
            }).unwrap();
            navigation.navigate('login');
          } catch (e) {
            const alert = buildAuthErrorAlert(e, 'register');
            Alert.alert(alert.title, alert.message, [{ text: 'Ок' }]);
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