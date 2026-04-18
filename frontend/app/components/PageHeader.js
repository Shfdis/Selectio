import { View, Text, StyleSheet, Image, Pressable } from 'react-native';

const defaultPageHeaderSubtitle = 'Отсортировано по популярности';

export default function PageHeader({
  title,
  subtitle = defaultPageHeaderSubtitle,
  onPressBack,
  onPressStrip,
  headerStyle,
}) {
  const titleBlock = (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );

  return (
    <View style={[styles.header, headerStyle]}>
      {onPressStrip ? (
        <Pressable
          style={styles.stripHit}
          onPress={onPressStrip}
          accessibilityRole="button"
          accessibilityLabel="Наверх"
        />
      ) : null}
      <View
        style={[styles.headerRow, onPressStrip ? styles.headerRowLayer : null]}
        pointerEvents={onPressStrip ? 'box-none' : 'auto'}
      >
        <Pressable style={styles.backButton} onPress={onPressBack} hitSlop={10}>
          <Image
            source={require('../assets/GreenBackArrow.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </Pressable>
        {onPressStrip ? (
          <Pressable style={styles.titleBlock} onPress={onPressStrip}>
            {titleBlock}
          </Pressable>
        ) : (
          <View style={styles.titleBlock} pointerEvents="none">
            {titleBlock}
          </View>
        )}
        {onPressStrip ? (
          <Pressable style={styles.backSpacer} onPress={onPressStrip} />
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 103,
    backgroundColor: '#ECE8DD',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    position: 'relative',
  },
  stripHit: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 45,
  },
  headerRowLayer: {
    zIndex: 1,
  },
  backButton: {
    width: 45,
    height: 45,
    marginLeft: 28,
    borderRadius: 22.5,
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  backSpacer: {
    width: 45,
    height: 45,
    marginRight: 28,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
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
