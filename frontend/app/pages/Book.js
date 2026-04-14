import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useRef, useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import GreenHeader from '../components/GreenHeader';
import BookInfoBlock from '../components/BookInfoBlock';
import ReviewCard from '../components/ReviewCard';
import BookAddToLibrary from '../components/BookAddToLibrary';
import LibraryMoveSheet, { LIBRARY_SHELF_ICONS, LIBRARY_SHELF_LABELS } from '../components/LibraryMoveSheet';
import { exampleBook, exampleReviews } from '../data/bookPage';

export default function Book() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const book = exampleBook;

  const [libraryShelf, setLibraryShelf] = useState(null);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [moveSheetVisible, setMoveSheetVisible] = useState(false);

  const onPressBack = () => {
    navigation.goBack();
  };

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressLibraryButton = () => {
    if (libraryShelf == null) {
      setAddSheetVisible(true);
    } else {
      setMoveSheetVisible(true);
    }
  };

  const onSelectShelfFromAddSheet = (shelf) => {
    setLibraryShelf(shelf);
    setAddSheetVisible(false);
  };

  const onRemoveFromLibrary = () => {
    setLibraryShelf(null);
    setMoveSheetVisible(false);
  };

  return (
    <View style={styles.screen}>
      <GreenHeader onPressBack={onPressBack} onPressStrip={scrollToTop} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerGreenBlock}>
          <View style={styles.coverWrap}>
            <Image source={{ uri: book.imageUrl }} style={styles.cover} resizeMode="cover" />
          </View>
          <View style={styles.ratingOval}>
            <Image
              source={require('../assets/icons/review-star-filled.png')}
              style={styles.ratingStar}
              resizeMode="contain"
            />
            <Text style={styles.ratingText}>{book.averageRating}</Text>
          </View>
        </View>

        <View style={styles.scrollContentInner}>
          <View style={styles.infoSection}>
            <BookInfoBlock
              title={book.title}
              author={book.author}
              genreFirst={book.genreFirst}
              genreSecond={book.genreSecond}
            />

            <Pressable
              style={
                !libraryShelf
                  ? styles.addButton
                  : moveSheetVisible
                    ? styles.moveLibraryButtonActive
                    : styles.moveLibraryButton
              }
              onPress={onPressLibraryButton}
              hitSlop={10}
            >
              {libraryShelf ? (
                <>
                  <Image
                    source={require('../assets/icons/icon_move-down.png')}
                    style={styles.moveLibraryIcon}
                    resizeMode="contain"
                  />
                  <Image
                    source={LIBRARY_SHELF_ICONS[libraryShelf]}
                    style={styles.shelfBadgeIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.moveLibraryButtonText}>
                    {moveSheetVisible ? LIBRARY_SHELF_LABELS[libraryShelf] : 'Переместить'}
                  </Text>
                </>
              ) : (
                <>
                  <Image
                    source={require('../assets/icons/icon_plus.png')}
                    style={styles.addIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.addButtonText}>Добавить в библиотеку</Text>
                </>
              )}
            </Pressable>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Описание:</Text>
            <Text style={styles.descriptionText}>{book.description}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.reviewsSection}>
            {exampleReviews.map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Image source={r.avatarSource} style={styles.reviewAvatar} resizeMode="cover" />
                  <View style={styles.reviewHeaderText}>
                    <Text style={styles.reviewUserName} numberOfLines={1}>
                      {r.userName}
                    </Text>
                    <Text style={styles.reviewDate} numberOfLines={1}>
                      {r.dateText}
                    </Text>
                  </View>
                </View>
                <ReviewCard
                  title={r.title}
                  author={r.author}
                  rating={r.rating}
                  text={r.text}
                  showEdit={r.showEdit}
                  disabled={!r.onPressEdit}
                  onPressEdit={r.onPressEdit}
                  style={styles.reviewCard}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <BookAddToLibrary
        visible={addSheetVisible}
        bookTitle={book.title}
        onSelectShelf={onSelectShelfFromAddSheet}
        onClose={() => setAddSheetVisible(false)}
      />
      <LibraryMoveSheet
        visible={moveSheetVisible && libraryShelf != null}
        bookTitle={book.title}
        list={libraryShelf}
        onMoveToShelf={(target) => {
          setLibraryShelf(target);
          setMoveSheetVisible(false);
        }}
        onDelete={onRemoveFromLibrary}
        onClose={() => setMoveSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  rowDivider: {
    height: 1,
    marginTop: '9%',
    backgroundColor: '#CAC7B9',
  },
  headerGreenBlock: {
    width: '100%',
    backgroundColor: '#555C40',
    paddingBottom: '5%',
    alignItems: 'center',
  },
  scrollContentInner: {
    paddingHorizontal: '6%',
  },
  coverWrap: {
    width: '40%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E4DFD0',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  ratingOval: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '3%',
    paddingVertical: 1,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    gap: 6,
  },
  ratingStar: {
    width: 18,
    height: 18,
  },
  ratingText: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'CrimsonText-SemiBold',
    fontWeight: 600,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: '10%',
    backgroundColor: '#ECE8DD',
  },
  infoSection: {
    width: '100%',
    alignItems: 'flex-start',
    paddingTop: '5%',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: '8%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    backgroundColor: '#555C40',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    gap: 8,
    width: '100%',
  },
  addIcon: {
    width: 20,
    height: 20,
  },
  addButtonText: {
    fontSize: 20,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
  moveLibraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: '8%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    gap: 8,
    width: '100%',
  },
  moveLibraryIcon: {
    width: 22,
    height: 22,
  },
  shelfBadgeIcon: {
    width: 22,
    height: 22,
  },
  moveLibraryButtonText: {
    fontSize: 20,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 22,
  },
  moveLibraryButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: '8%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    backgroundColor: '#CCB985',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    gap: 8,
    width: '100%',
  },
  descriptionSection: {
    width: '100%',
    marginTop: '7%',
  },
  descriptionLabel: {
    fontSize: 20,
    color: '#868058',
    fontFamily: 'Mak',
    fontWeight: 600,
    lineHeight: 20,
    marginBottom: '4%',
  },
  descriptionText: {
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 17,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#CAC7B9',
    marginTop: '7%',
  },
  reviewsSection: {
    width: '100%',
    marginTop: '7%',
  },
  reviewItem: {
    width: '100%',
    marginBottom: '9%',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '3%',
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 9999,
  },
  reviewHeaderText: {
    marginLeft: '4%',
    flex: 1,
  },
  reviewUserName: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 19,
  },
  reviewDate: {
    marginTop: 2,
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: 400,
    lineHeight: 14,
    opacity: 0.9,
  },
  reviewCard: {
    marginLeft: 0,
  },
});
