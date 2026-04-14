import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LibraryHeader from '../components/LibraryHeader';
import BookRowCard from '../components/BookRowCard';
import { useEffect, useMemo, useState } from 'react';
import { libraryFilterGenres, readBooks } from '../data/libraryBooks';
import LibrarySortSheet from '../components/LibrarySortSheet';
import LibraryFilterSheet from '../components/LibraryFilterSheet';
import LibraryMoveSheet from '../components/LibraryMoveSheet';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

export default function ReadBooks({ route }) {
  const navigation = useNavigation();
  const [activeId, setActiveId] = useState(null);
  const [selectedSortId, setSelectedSortId] = useState('title-asc');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [books, setBooks] = useState(readBooks);
  const [selectedBookIndex, setSelectedBookIndex] = useState(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const selectedBook =
    typeof selectedBookIndex === 'number' ? books[selectedBookIndex] : null;

  const initialRatings = useMemo(
    () => books.map((b) => (typeof b?.userRating === 'number' ? b.userRating : null)),
    [books],
  );
  const [userRatings, setUserRatings] = useState(initialRatings);
  const [userReviewTexts, setUserReviewTexts] = useState(() => books.map(() => ''));

  useEffect(() => {
    const update = route?.params?.reviewUpdate;
    if (!update) return;

    const { idx, rating, text } = update;
    if (typeof idx === 'number' && typeof rating === 'number') {
      setUserRatings((prev) => {
        const next = [...prev];
        next[idx] = rating;
        return next;
      });
      if (typeof text === 'string') {
        setUserReviewTexts((prev) => {
          const next = [...prev];
          next[idx] = text;
          return next;
        });
      }
    }
    navigation.setParams({ reviewUpdate: undefined });
  }, [navigation, route?.params?.reviewUpdate]);

  const onPressNewReview = (book, idx) => {
    setActiveId(null);
    navigation.navigate('newReview', { book, idx });
  };

  const onPressUserRating = (book, idx) => {
    setActiveId(null);
    setSelectedBookIndex(null);
    const rating = userRatings[idx];
    if (typeof rating !== 'number' || Number.isNaN(rating)) return;
    navigation.navigate('editReview', {
      review: {
        id: `read-books-${idx}`,
        idx,
        book,
        rating,
        text: userReviewTexts[idx] ?? '',
      },
    });
  };

  return (
    <View style={styles.screen}>
      <LibraryHeader
        title="Прочитанное"
        titleIcon={require('../assets/icons/icon_close_book.png')}
        onPressBack={() => navigation.goBack()}
        onPressAdd={() => navigation.navigate('main', { mainTab: 'search' })}
        activeId={activeId}
        onToggleActive={(id) => setActiveId((prev) => (prev === id ? null : id))}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {books.map((b, idx) => (
          <BookRowCard
            key={`${b.title}-${idx}`}
            book={b}
            isMoreActive={selectedBookIndex === idx}
            onPressMore={() => {
              setSelectedBookIndex((prev) => (prev === idx ? null : idx));
              setActiveId(null);
            }}
            onPressBook={() => {
              setActiveId(null);
              setSelectedBookIndex(null);
            }}
            userRating={userRatings[idx]}
            showAddReview={userRatings[idx] == null}
            onPressAddReview={() => onPressNewReview(b, idx)}
            onPressUserRating={() => onPressUserRating(b, idx)}
          />
        ))}
      </ScrollView>
      <LibrarySortSheet
        visible={activeId === 'sort'}
        selectedId={selectedSortId}
        onSelect={(sortId) => setSelectedSortId(sortId)}
        onClose={() => setActiveId(null)}
      />
      <LibraryFilterSheet
        visible={activeId === 'filter'}
        layout="rows"
        rowsPreset="community"
        title="Жанры"
        genres={libraryFilterGenres}
        selectedGenres={selectedGenres}
        onToggleGenre={(genre) =>
          setSelectedGenres((prev) =>
            prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre],
          )
        }
        onApply={() => setActiveId(null)}
        onClose={() => setActiveId(null)}
      />
      <LibraryMoveSheet
        visible={selectedBook != null}
        list="read"
        bookTitle={selectedBook?.title || ''}
        onMoveToShelf={() => {
          if (typeof selectedBookIndex === 'number') {
            setBooks((prev) => prev.filter((_, idx) => idx !== selectedBookIndex));
            setUserRatings((prev) => prev.filter((_, idx) => idx !== selectedBookIndex));
            setUserReviewTexts((prev) => prev.filter((_, idx) => idx !== selectedBookIndex));
          }
          setSelectedBookIndex(null);
        }}
        onDelete={() => {
          setIsDeleteConfirmVisible(true);
        }}
        onClose={() => setSelectedBookIndex(null)}
      />
      <DeleteConfirmDialog
        visible={isDeleteConfirmVisible}
        onCancel={() => setIsDeleteConfirmVisible(false)}
        onConfirm={() => {
          if (typeof selectedBookIndex === 'number') {
            setBooks((prev) => prev.filter((_, idx) => idx !== selectedBookIndex));
            setUserRatings((prev) => prev.filter((_, idx) => idx !== selectedBookIndex));
            setUserReviewTexts((prev) => prev.filter((_, idx) => idx !== selectedBookIndex));
          }
          setIsDeleteConfirmVisible(false);
          setSelectedBookIndex(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: '10%',
  },
});

