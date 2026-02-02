import { StyleSheet, Text, View, Image, Dimensions } from 'react-native';
const screenWidth = Dimensions.get('window').width;
const logoSize = screenWidth * 0.6;

export default function HomeLoading() {  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../assets/logo.png')} style={[styles.logo, { width: logoSize, height: logoSize }]} />
        <Text style={styles.title}>Selectio</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#555C40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 48,
    color: '#DBC99B',
    marginTop: 10,
    fontFamily: 'Mak',
  },
  logo: {
    resizeMode: 'contain',
  },
});