import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function StickyTitleBar({ title, subtitle, onPress }) {
  const inner = (
    <>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={styles.bar}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Наверх"
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.bar}>{inner}</View>;
}

const styles = StyleSheet.create({
  bar: {
    height: 103,
    backgroundColor: '#ECE8DD',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    paddingTop: 45,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 20,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#565d3f',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 17,
    textAlign: 'center',
  },
});
