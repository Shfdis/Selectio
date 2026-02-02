import { View, Text, Pressable, StyleSheet, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native';
export default function LoginRegisterHeader({title}) {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image source={require('../assets/GreenBackArrow.png')} style={styles.backArrow} resizeMode="contain" />
        </Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  title: {
    flex: 1,
    fontSize: 40,
    fontWeight: 300,
    color: '#2D2800',
    fontFamily: 'Mak',
  },
  backButton: {
    borderRadius: 60,
    padding: 12,
    backgroundColor: '#CCB985',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 20,
    height: 25,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10%',
    width: '100%',
    paddingHorizontal: '5%',
  },
});