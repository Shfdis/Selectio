import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function ProfileListCard({
  title,
  countText = '0 книг',
  leftColor = '#CCB985',
  onPress = () => {},
  style,
}) {
  return (
    <Pressable style={[styles.card, style]} onPress={onPress}>
      <View style={[styles.leftBlock, { backgroundColor: leftColor }]} />
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{countText}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#CAC7B9',
    borderRadius: 10,
    overflow: 'hidden',
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#ECE8DD',
  },
  leftBlock: {
    width: '28%',
    aspectRatio: 1,
  },
  textBlock: {
    flex: 1,
    paddingLeft: '6%',
    paddingRight: '4%',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 24,
  },
  count: {
    marginTop: 8,
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 17,
  },
});
