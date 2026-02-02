import { View, Text, StyleSheet, TextInput } from 'react-native'

export default function InputComponent({ description, onChangeText, value }) {
  return (
    <View style={styles.container}>
        <Text style={styles.description}>{description}</Text>
        <TextInput onChangeText={onChangeText} value={value} style={styles.input} />
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: '5%',
    marginTop: '5%',
  },
  description: {
    fontSize: 17,
    fontWeight: 400,
    color: '#2D2800',
    fontFamily: 'Playfair',
    marginBottom: '2%',
  },
  input: {
    borderRadius: 20,
    padding: '5%',
    width: '100%',
    borderColor: '#8B7B4E',
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
  },
});