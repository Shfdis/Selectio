import { View, Text, StyleSheet } from 'react-native'
import { useState } from 'react';
import LoginRegisterHeader from '../components/LoginRegisterHeader';
import InputComponent from '../components/InputComponent';
import GreenRoundedButton from '../components/GreenRoundedButton';
import { useRegisterUserMutation } from '../slices/userSlice';
import { useNavigation } from '@react-navigation/native';
export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [registerUser, { isLoading, error }] = useRegisterUserMutation();
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
        registerUser({ email, password, username, description: '' });
        navigation.navigate('home', { attemptedAuth: false });
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