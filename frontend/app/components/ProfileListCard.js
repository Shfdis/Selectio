import { View, Text, StyleSheet, Pressable, Image } from 'react-native';

function CountText({ countText }) {
  const m = String(countText ?? '').match(/^(\d+)\s+(.+)$/);
  if (!m) {
    return <Text style={styles.count}>{countText}</Text>;
  }
  const [, num, suffix] = m;
  return (
    <Text style={styles.count}>
      <Text style={styles.countNumber}>{num}</Text>
      <Text style={styles.countSuffix}> {suffix}</Text>
    </Text>
  );
}

export default function ProfileListCard({
  title,
  titleIcon,
  countText = '0 книг',
  leftColor = '#CCB985',
  disabled = false,
  onPress,
  style,
}) {
  const Container = disabled ? View : Pressable;

  return (
    <Container
      style={[styles.card, style]}
      {...(!disabled ? { onPress } : null)}
      {...(!disabled ? null : { accessible: false })}
    >
      <View style={[styles.leftBlock, { backgroundColor: leftColor }]} />
      <View style={styles.textBlock}>
        <View style={styles.titleRow}>
          {titleIcon ? (
            <Image source={titleIcon} style={styles.titleIcon} resizeMode="contain" />
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        <CountText countText={countText} />
      </View>
    </Container>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 24,
    flex: 1,
    minWidth: 0,
  },
  count: {
    marginTop: 8,
    fontSize: 14,
    color: '#2D2800',
    fontWeight: '500',
    lineHeight: 17,
  },
  countNumber: {
    fontFamily: 'CrimsonText',
    fontSize: 14,
    color: '#2D2800',
    fontWeight: '500',
    lineHeight: 17,
  },
  countSuffix: {
    fontFamily: 'Playfair',
    fontSize: 14,
    color: '#2D2800',
    fontWeight: '500',
    lineHeight: 17,
  },
});
