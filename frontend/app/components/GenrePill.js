import { StyleSheet, Text, View } from 'react-native';

export default function GenrePill({ label, style, textStyle }) {
  return (
    <View style={[styles.pill, style]}>
      <Text style={[styles.text, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    backgroundColor: '#CCB985',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    minWidth: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 15,
  },
});
