import { Image, Pressable, StyleSheet, View } from 'react-native';
import BookCard from './BookCard';

export default function BookRowCard({
  book,
  onPressBook = () => {},
  onPressMore = () => {},
  isMoreActive = false,
}) {
  return (
    <View style={styles.row}>
      <View style={styles.bookWrap}>
        <BookCard
          imageUrl={book?.imageUrl}
          title={book?.title}
          author={book?.author}
          genreFirst={book?.genreFirst}
          genreSecond={book?.genreSecond}
          onClick={onPressBook}
        />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: '6%',
    paddingVertical: '6%',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    backgroundColor: '#ECE8DD',
  },
  bookWrap: {
    flex: 1,
    paddingRight: '4%',
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

