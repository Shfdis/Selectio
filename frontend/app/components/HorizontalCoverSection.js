import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';

const cardWidth = 136;
const cardHeight = 193;
const squareSize = 136;
const cardGap = 11;

function CoverTile({ imageUri, imageSource, title, author, onPress, squareCovers, defaultCoverWhenEmpty }) {
  const resolvedFromUri = typeof imageUri === 'string' && imageUri.trim().length > 0 ? { uri: imageUri.trim() } : null;
  const isCommunityWithoutCover = Boolean(defaultCoverWhenEmpty) && !resolvedFromUri && !imageSource;
  const resolvedSource = imageSource ?? resolvedFromUri;
  const hasImage = Boolean(resolvedSource) && !isCommunityWithoutCover;
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageReady(false);
    setImageFailed(false);
  }, [imageUri, imageSource, defaultCoverWhenEmpty]);

  const showImage = hasImage && imageReady && !imageFailed;
  return (
    <Pressable
      style={[styles.coverTile, squareCovers ? styles.coverTileSquare : null]}
      onPress={onPress}
    >
      <View style={styles.coverFallback}>
        <Text style={styles.coverFallbackTitle} numberOfLines={5}>
          {title || 'Без названия'}
        </Text>
        {isCommunityWithoutCover ? null : (
          <Text style={styles.coverFallbackAuthor} numberOfLines={2}>
            {author || 'Неизвестный автор'}
          </Text>
        )}
      </View>
      {hasImage ? (
        <Image
          source={resolvedSource}
          style={[styles.coverImage, showImage ? styles.coverImageVisible : styles.coverImageHidden]}
          resizeMode="cover"
          onLoad={() => setImageReady(true)}
          onError={() => {
            setImageFailed(true);
            setImageReady(false);
          }}
        />
      ) : null}
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
  resetScrollSignal,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (resetScrollSignal == null) {
      return;
    }
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [resetScrollSignal]);

  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, subtitleStyle]}>{subtitle}</Text>
      <ScrollView
        ref={scrollRef}
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
                  imageSource: cover?.imageSource,
                  title: cover?.title,
                  author: cover?.author,
                  defaultCoverWhenEmpty: cover?.defaultCoverWhenEmpty,
                };
          return (
            <CoverTile
              key={index}
              imageUri={coverItem.imageUri}
              imageSource={coverItem.imageSource}
              title={coverItem.title}
              author={coverItem.author}
              defaultCoverWhenEmpty={Boolean(coverItem.defaultCoverWhenEmpty)}
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
    ...StyleSheet.absoluteFillObject,
  },
  coverImageVisible: {
    opacity: 1,
  },
  coverImageHidden: {
    opacity: 0,
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
    fontSize: 18,
    lineHeight: 13,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '600',
  },
  coverFallbackAuthor: {
    fontSize: 12,
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
