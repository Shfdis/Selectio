import { StyleSheet, Text, View, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import WhiteRoundedButton from './WhiteRoundedButton';
const screenWidth = Dimensions.get('window').width;
const logoSize = screenWidth * 0.4;
export default function LoginRegisterChoice() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <View style={styles.logoButTextContainer}>
          <Text style={styles.logoText}>Selectio</Text>
          <Image source={require('../assets/logo.png')} style={styles.logoImage} />
          <Text style={styles.infoText}>Находите новые книги по душе, оставляйте отзывы, создавайте и вступайте в сообщества</Text>
        </View>
        <Text style={styles.explanationText}>Зарегистрируйтесь или войдите</Text>
      </View>
      <View style={styles.buttons}>
        <View style={styles.buttonContainer}>
        <WhiteRoundedButton text="Зарегистрироваться" onPress={() => {navigation.navigate('register')}} />
        </View>
        <View style={styles.buttonContainer}>
        <WhiteRoundedButton text="Войти" onPress={() => {navigation.navigate('login')}} />
        </View>
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  logoButTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  infoText: {
    marginTop: '7%',
    fontSize: 17,
    color: '#DBC99B',
    fontFamily: 'Playfair',
    textAlign: 'center',
    width: '80%',
    fontWeight: 400,
  },
  logoImage: {
    marginTop: '7%',
    width: logoSize,
    height: logoSize,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 300,
    color: '#DBC99B',
    fontFamily: 'Mak',
  },
  logo: {
    flex: 2,
    backgroundColor: '#555C40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationText: {
    fontSize: 24,
    color: '#DBC99B',
    fontFamily: 'Mak',
    textAlign: 'center',
    marginBottom: '5%',
    width: '60%',
    fontWeight: 300,
  },
  buttons: {
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