import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';

const cardWidth = 136;
const cardHeight = 193;
const squareSize = 136;
const cardGap = 11;

function CoverTile({ imageUri, onPress, squareCovers }) {
  return (
    <Pressable
      style={[styles.coverTile, squareCovers ? styles.coverTileSquare : null]}
      onPress={onPress}
    >
      <Image source={{ uri: imageUri }} style={styles.coverImage} resizeMode="cover" />
    </Pressable>
  );
}

export default function HorizontalCoverSection({
  title,
  subtitle,
  covers,
  onPressCover,
  style,
  squareCovers = false,
  openAllButton,
  plusButton,
  titleStyle,
  subtitleStyle,
}) {
  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, subtitleStyle]}>{subtitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {covers.map((uri, index) => (
          <CoverTile
            key={index}
            imageUri={uri}
            onPress={onPressCover}
            squareCovers={squareCovers}
          />
        ))}
      </ScrollView>
      {openAllButton || plusButton ? (
        <View style={styles.actionsRow}>
          {openAllButton ? (
            <Pressable
              style={styles.openAllButton}
              onPress={openAllButton.onPress}
              hitSlop={10}
            >
              <Text style={styles.openAllText}>{openAllButton.label}</Text>
            </Pressable>
          ) : null}
          {plusButton ? (
            <Pressable style={styles.plusButton} onPress={plusButton.onPress} hitSlop={10}>
              <Image
                source={require('../assets/icons/icon_plus.png')}
                style={styles.plusIcon}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 23,
    paddingTop: 15,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '300',
    lineHeight: 24,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#565d3f',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 17,
    marginBottom: 18,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: cardGap,
    paddingRight: 23,
  },
  coverTile: {
    width: cardWidth,
    height: cardHeight,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#CCB985',
  },
  coverTileSquare: {
    width: squareSize,
    height: squareSize,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  actionsRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openAllButton: {
    alignSelf: 'flex-start',
    minWidth: 138,
    height: 29,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#565d3f',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  openAllText: {
    fontSize: 14,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: '500',
    lineHeight: 17,
  },
  plusButton: {
    width: 50,
    height: 29,
    borderRadius: 20,
    backgroundColor: '#565d3f',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    width: 18,
    height: 18,
    tintColor: '#ECE8DD',
  },
});
