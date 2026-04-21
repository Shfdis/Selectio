import { View, StyleSheet, Image, Pressable, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import PageHeader from '../components/PageHeader';
import { mapApiBookGenres, useGetPopularBooksByGenreQuery } from '../slices/booksSlice';

const DEFAULT_COVER_URI = 'https://via.placeholder.com/104x148?text=Book';
const PAGE_SIZE = 20;
const normalizeGenre = (value) => String(value ?? '').trim().toLowerCase();

export default function Genre() {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(1);
  const [books, setBooks] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const loadedPagesRef = useRef(new Set());
  const isLoadingMoreRef = useRef(false);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const genreName = route.params?.genreName ?? 'Жанр';
  const { data: pageData = [], isFetching } = useGetPopularBooksByGenreQuery({
    genre: genreName,
    page,
    pageSize: PAGE_SIZE,
  });

  const pad = 21;
  const gap = 18;
  const cardWidth = (width - pad * 2 - gap * 2) / 3;
  const cardHeight = (148 / 104) * cardWidth;

  useEffect(() => {
    if (isFetching) {
      return;
    }
    const pageKey = `${genreName}-${page}`;
    if (loadedPagesRef.current.has(pageKey)) {
      return;
    }
    const selectedGenre = normalizeGenre(genreName);
    const filteredBySelectedGenre = pageData.filter(
      (item) => {
        const { genreFirst, genreSecond } = mapApiBookGenres(item);
        return normalizeGenre(genreFirst) === selectedGenre || normalizeGenre(genreSecond) === selectedGenre;
      },
    );
    loadedPagesRef.current.add(pageKey);
    setBooks((prev) => {
      const known = new Set(prev.map((item) => item?.id));
      const incoming = filteredBySelectedGenre.filter((item) => !known.has(item?.id));
      return [...prev, ...incoming];
    });
    if (pageData.length < PAGE_SIZE) {
      setHasMore(false);
    }
    isLoadingMoreRef.current = false;
  }, [genreName, page, pageData, isFetching]);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < books.length; i += 3) {
      result.push(books.slice(i, i + 3));
    }
    return result;
  }, [books]);

  const onScroll = useCallback(
    ({ nativeEvent }) => {
      if (!hasMore || isLoadingMoreRef.current || isFetching) {
        return;
      }
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceFromBottom > 120) {
        return;
      }
      isLoadingMoreRef.current = true;
      setPage((prev) => prev + 1);
    },
    [hasMore, isFetching],
  );

  const onPressBook = (bookId) => {
    navigation.navigate('book', { bookId });
  };

  return (
    <View style={styles.screen}>
      <PageHeader
        title={genreName}
        onPressBack={() => navigation.goBack()}
        onPressStrip={scrollToTop}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {rows.map((rowBooks, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              styles.row,
              { marginBottom: rowIndex < rows.length - 1 ? 26 : 0, gap },
            ]}
          >
            {rowBooks.map((book) => (
              <Pressable
                key={book.id}
                style={[
                  styles.card,
                  { width: cardWidth, height: cardHeight, borderRadius: 10 },
                ]}
                onPress={() => onPressBook(book.id)}
              >
                <Image source={{ uri: book.coverUrl || DEFAULT_COVER_URI }} style={styles.cover} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        ))}
        {isFetching && hasMore ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#555C40" />
          </View>
        ) : null}
      </ScrollView>
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
  scrollContent: {
    paddingTop: 15,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: '#CCB985',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  loader: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
