import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';

const cardWidth = 136;
const cardHeight = 193;
const squareSize = 136;
const cardGap = 11;

function CoverTile({ imageUri, title, author, onPress, squareCovers }) {
  const hasImage = typeof imageUri === 'string' && imageUri.trim().length > 0;
  return (
    <Pressable
      style={[styles.coverTile, squareCovers ? styles.coverTileSquare : null]}
      onPress={onPress}
    >
      {hasImage ? (
        <Image source={{ uri: imageUri }} style={styles.coverImage} resizeMode="cover" />
      ) : (
        <View style={styles.coverFallback}>
          <Text style={styles.coverFallbackTitle} numberOfLines={3}>
            {title || 'Без названия'}
          </Text>
          <Text style={styles.coverFallbackAuthor} numberOfLines={2}>
            {author || 'Неизвестный автор'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HorizontalCoverSection({
  title,
  subtitle,
  covers,
  onPressCover,
  onHorizontalEndReached,
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
        onScroll={
          onHorizontalEndReached
            ? ({ nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                const distanceFromRight = contentSize.width - (layoutMeasurement.width + contentOffset.x);
                if (distanceFromRight <= 60) {
                  onHorizontalEndReached();
                }
              }
            : undefined
        }
        scrollEventThrottle={16}
      >
        {covers.map((cover, index) => {
          const coverItem =
            typeof cover === 'string'
              ? { imageUri: cover }
              : {
                  imageUri: cover?.imageUri,
                  title: cover?.title,
                  author: cover?.author,
                };
          return (
            <CoverTile
              key={index}
              imageUri={coverItem.imageUri}
              title={coverItem.title}
              author={coverItem.author}
              onPress={() => onPressCover?.(coverItem.imageUri, index)}
              squareCovers={squareCovers}
            />
          );
        })}
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
  coverFallback: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: 'space-between',
    backgroundColor: '#CCB985',
  },
  coverFallbackTitle: {
    fontSize: 11,
    lineHeight: 13,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '600',
  },
  coverFallbackAuthor: {
    fontSize: 10,
    lineHeight: 12,
    color: '#565d3f',
    fontFamily: 'Mak',
    fontWeight: '400',
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
