import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LibraryHeader from '../components/LibraryHeader';
import BookRowCard from '../components/BookRowCard';
import { useEffect, useMemo, useState } from 'react';
import LibrarySortSheet from '../components/LibrarySortSheet';
import LibraryFilterSheet from '../components/LibraryFilterSheet';
import LibraryMoveSheet from '../components/LibraryMoveSheet';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import {
  mapApiBookGenres,
  useMoveBookInLibraryMutation,
  useRemoveBookFromLibraryMutation,
} from '../slices/booksSlice';
import { useGetUserLibraryBooksQuery } from '../slices/profileSlice';

const LIBRARY_STATUS = {
  wantToRead: 0,
  inProgress: 1,
  read: 2,
};
const DEFAULT_BOOK_COVER = 'https://via.placeholder.com/120x120?text=Book';
const normalizeGenre = (value) => String(value ?? '').trim();

export default function ReadBooks({ route }) {
  const navigation = useNavigation();
  const [activeId, setActiveId] = useState(null);
  const [selectedSortId, setSelectedSortId] = useState('title-asc');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const {
    data: libraryData = [],
    isFetching,
    isLoading,
  } = useGetUserLibraryBooksQuery(
    { userId, status: LIBRARY_STATUS.read, page: 1, pageSize: 100 },
    { skip: !userId },
  );
  const [moveBookInLibrary] = useMoveBookInLibraryMutation();
  const [removeBookFromLibrary] = useRemoveBookFromLibraryMutation();

  const books = useMemo(
    () =>
      libraryData.map((book) => ({
        id: book.bookId,
        imageUrl: book.coverUrl || DEFAULT_BOOK_COVER,
        title: book.title || 'Без названия',
        author: book.author || 'Неизвестный автор',
        userRating: typeof book.rating === 'number' ? book.rating : null,
        ...mapApiBookGenres({ genre: book.genre, secondGenre: '' }),
      })),
    [libraryData],
  );

  const availableGenres = useMemo(() => {
    const unique = new Set();
    books.forEach((book) => {
      const genre = normalizeGenre(book.genreFirst);
      if (genre) {
        unique.add(genre);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [books]);

  const visibleBooks = useMemo(() => {
    const selectedGenresNormalized = selectedGenres.map((genre) => normalizeGenre(genre).toLowerCase());
    const filtered = books.filter((book) => {
      if (selectedGenresNormalized.length === 0) {
        return true;
      }
      const genre = normalizeGenre(book.genreFirst).toLowerCase();
      return selectedGenresNormalized.includes(genre);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (selectedSortId) {
        case 'title-desc':
          return String(b.title).localeCompare(String(a.title), 'ru');
        case 'author-asc':
          return Number(b.id || 0) - Number(a.id || 0);
        case 'author-desc':
          return Number(a.id || 0) - Number(b.id || 0);
        case 'title-asc':
        default:
          return String(a.title).localeCompare(String(b.title), 'ru');
      }
    });
    return sorted;
  }, [books, selectedGenres, selectedSortId]);

  const selectedBook = useMemo(
    () => visibleBooks.find((book) => book.id === selectedBookId) ?? null,
    [selectedBookId, visibleBooks],
  );

  const initialRatings = useMemo(
    () =>
      Object.fromEntries(
        books.map((book) => [book.id, typeof book?.userRating === 'number' ? book.userRating : null]),
      ),
    [books],
  );
  const [userRatings, setUserRatings] = useState({});
  const [userReviewTexts, setUserReviewTexts] = useState({});

  useEffect(() => {
    setUserRatings((prev) => ({ ...initialRatings, ...prev }));
    setUserReviewTexts((prev) => ({ ...Object.fromEntries(books.map((book) => [book.id, ''])), ...prev }));
  }, [books, initialRatings]);

  useEffect(() => {
    const update = route?.params?.reviewUpdate;
    if (!update) return;

    const { idx, rating, text } = update;
    const updatedBookId = typeof idx === 'number' ? visibleBooks[idx]?.id : null;
    if (updatedBookId && typeof rating === 'number') {
      setUserRatings((prev) => {
        const next = { ...prev };
        next[updatedBookId] = rating;
        return next;
      });
      if (typeof text === 'string') {
        setUserReviewTexts((prev) => {
          const next = { ...prev };
          next[updatedBookId] = text;
          return next;
        });
      }
    }
    navigation.setParams({ reviewUpdate: undefined });
  }, [navigation, route?.params?.reviewUpdate, visibleBooks]);

  const onPressNewReview = (book, idx) => {
    setActiveId(null);
    navigation.navigate('newReview', { book, idx });
  };

  const onPressUserRating = (book, idx) => {
    setActiveId(null);
    setSelectedBookId(null);
    const rating = userRatings[book?.id];
    if (typeof rating !== 'number' || Number.isNaN(rating)) return;
    navigation.navigate('editReview', {
      review: {
        id: `read-books-${idx}`,
        idx,
        book,
        rating,
        text: userReviewTexts[book?.id] ?? '',
      },
    });
  };

  const closeActionSheets = () => {
    setActiveId(null);
    setSelectedBookId(null);
  };

  const onMoveToShelf = async (targetShelf) => {
    if (!selectedBook?.id || !Object.prototype.hasOwnProperty.call(LIBRARY_STATUS, targetShelf)) {
      return;
    }
    try {
      setIsMutating(true);
      await moveBookInLibrary({ bookId: selectedBook.id, status: LIBRARY_STATUS[targetShelf] }).unwrap();
      setSelectedBookId(null);
    } finally {
      setIsMutating(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!selectedBook?.id) {
      return;
    }
    try {
      setIsMutating(true);
      await removeBookFromLibrary({ bookId: selectedBook.id }).unwrap();
      setIsDeleteConfirmVisible(false);
      setSelectedBookId(null);
    } finally {
      setIsMutating(false);
    }
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
        {(isLoading || isFetching) && books.length === 0 ? (
          <ActivityIndicator style={styles.loader} size="large" color="#555C40" />
        ) : null}
        {!isLoading && !isFetching && visibleBooks.length === 0 ? (
          <Text style={styles.emptyState}>В этом списке пока нет книг</Text>
        ) : null}
        {visibleBooks.map((b, idx) => (
          <BookRowCard
            key={`${b.id}-${b.title}`}
            book={b}
            isMoreActive={selectedBookId === b.id}
            onPressMore={() => {
              setSelectedBookId((prev) => (prev === b.id ? null : b.id));
              setActiveId(null);
            }}
            onPressBook={() => {
              closeActionSheets();
              if (b?.id) {
                navigation.navigate('book', { bookId: b.id });
              }
            }}
            userRating={userRatings[b.id]}
            showAddReview={userRatings[b.id] == null}
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
        genres={availableGenres}
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
        onMoveToShelf={onMoveToShelf}
        onDelete={() => {
          setIsDeleteConfirmVisible(true);
        }}
        onClose={() => setSelectedBookId(null)}
      />
      <DeleteConfirmDialog
        visible={isDeleteConfirmVisible}
        onCancel={() => {
          if (!isMutating) {
            setIsDeleteConfirmVisible(false);
          }
        }}
        onConfirm={onConfirmDelete}
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
  loader: {
    marginTop: 24,
  },
  emptyState: {
    marginTop: 24,
    fontSize: 16,
    color: '#81876D',
    fontFamily: 'Playfair',
    fontWeight: 400,
    textAlign: 'center',
  },
});

