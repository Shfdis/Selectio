import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import BookCard from './BookCard';

export default function BookRowCard({
  book,
  onPressBook = () => {},
  onPressMore = () => {},
  isMoreActive = false,
  showAddReview = false,
  onPressAddReview = () => {},
  userRating,
  onPressUserRating = () => {},
  showMoreButton = true,
  showDivider = true,
}) {
  const hasUserRating = typeof userRating === 'number' && !Number.isNaN(userRating);
  const ratingValue = hasUserRating ? Math.max(1, Math.min(5, Math.floor(userRating))) : null;

  const genreAccessory = hasUserRating ? (
    <Pressable style={styles.userRatingBadgeInline} onPress={onPressUserRating} hitSlop={10}>
      <Image
        source={require('../assets/icons/review-star-filled.png')}
        style={styles.userRatingStarInline}
        resizeMode="contain"
      />
      <Text style={styles.userRatingTextInline}>{ratingValue}</Text>
    </Pressable>
  ) : showAddReview ? (
    <Pressable style={styles.addReviewButtonInline} onPress={onPressAddReview} hitSlop={10}>
      <Image source={require('../assets/icons/icon_plus.png')} style={styles.addReviewIconInline} resizeMode="contain" />
    </Pressable>
  ) : null;

  return (
    <View style={styles.rowOuter}>
      <View style={styles.row}>
        <View style={styles.bookWrap}>
          <BookCard
            imageUrl={book?.imageUrl}
            title={book?.title}
            author={book?.author}
            genreFirst={book?.genreFirst}
            genreSecond={book?.genreSecond}
            onClick={onPressBook}
            genreAccessory={genreAccessory}
          />
        </View>

        {showMoreButton ? (
          <Pressable
            style={[styles.moreButton, isMoreActive ? styles.moreButtonActive : null]}
            onPress={onPressMore}
            hitSlop={10}
          >
            <Image
              source={require('../assets/icons/icon-black-more.png')}
              style={styles.moreIcon}
              resizeMode="contain"
            />
          </Pressable>
        ) : null}
      </View>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowOuter: {
    width: '100%',
    backgroundColor: '#ECE8DD',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: '6%',
    paddingVertical: '6%',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#CAC7B9',
    marginHorizontal: '6%',
  },
  bookWrap: {
    flex: 1,
    paddingRight: '4%',
  },
  addReviewButtonInline: {
    marginLeft: 0,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#555C40',
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReviewIconInline: {
    width: 18,
    height: 18,
  },
  userRatingBadgeInline: {
    marginLeft: 0,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  userRatingStarInline: {
    width: 14,
    height: 14,
    right: '20%',
  },
  userRatingTextInline: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 600,
    lineHeight: 16,
    paddingBottom: '2%',
  },
  moreButton: {
    width: 30,
    height: 30,
    borderRadius: 60,
    backgroundColor: '#E4DFD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonActive: {
    backgroundColor: '#CCB985',
  },
  moreIcon: {
    width: 18,
    height: 18,
  },
});

