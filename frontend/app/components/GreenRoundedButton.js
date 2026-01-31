import { StyleSheet, Text, View, Image, Dimensions, Pressable } from 'react-native';
export default function GreenRoundedButton({ text, onPress }) {
    return (
     <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{text}</Text>
     </Pressable>
    )
  }
  const styles = StyleSheet.create({
    button: {
      backgroundColor: '#555C40',
      borderRadius: 40,
      padding: '3%',
      width: '90%',
      borderColor: '#8B7B4E',
      borderWidth: 1,
      alignItems: 'center',
    },
    text: {
      fontSize: 20,
      color: '#ECE8DD',
      fontFamily: 'Playfair',
      fontWeight: 500,
    },
  });