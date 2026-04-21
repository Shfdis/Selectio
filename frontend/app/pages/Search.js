import { View, Text, StyleSheet, Image, Pressable, ScrollView, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import SearchHeader, { searchHeaderHeight } from '../components/SearchHeader';
import BookRowCard from '../components/BookRowCard';
import SearchResultsSheet from '../components/SearchResults';
import {
  mapApiBookGenres,
  useGetPopularBooksQuery,
  useGetRecommendedBooksQuery,
  useLazyGetPopularBooksByGenreQuery,
  useSearchBooksQuery,
} from '../slices/booksSlice';

const GENRES_PER_COLUMN = 2;
const DEFAULT_COVER_URI = 'https://via.placeholder.com/136x193?text=Book';
const FIXED_GENRES = [
  'детское',
  'графический роман',
  'фэнтези',
  'проза',
  'исторический роман',
  'детектив',
  'нон-фикшн',
  'поэзия',
  'романтика',
  'подростковое',
];

function toBookCardModel(book) {
  const { genreFirst, genreSecond } = mapApiBookGenres(book);
  return {
    id: book?.id,
    imageUrl: book?.coverUrl || DEFAULT_COVER_URI,
    title: book?.title || 'Без названия',
    author: book?.author || 'Неизвестный автор',
    genreFirst,
    genreSecond,
  };
}

const normalizeGenre = (value) => String(value ?? '').trim().toLowerCase();

function splitGenreTitleForCard(label) {
  const trimmed = String(label).trim();
  const space = trimmed.search(/\s/);
  if (space <= 0) {
    return { firstLine: trimmed, secondLine: null };
  }
  return {
    firstLine: trimmed.slice(0, space),
    secondLine: trimmed.slice(space + 1).trim() || null,
  };
}

function GenreCard({ label, coverUri, onPressGenre }) {
  const { firstLine, secondLine } = splitGenreTitleForCard(label);
  return (
    <Pressable style={styles.genreCard} onPress={() => onPressGenre(label)}>
      <Text style={styles.genreCardLabel}>
        {firstLine}
        {secondLine != null ? `\n${secondLine}` : ''}
      </Text>
      <View style={styles.genreCoverWrap}>
        <Image source={{ uri: coverUri }} style={styles.genreCover} resizeMode="cover" />
      </View>
    </Pressable>
  );
}

export function Search() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();
  const [resultsSheetDismissed, setResultsSheetDismissed] = useState(false);
  const suppressResultsSheetAutoOpenUntilRef = useRef(0);
  const { data: recommendedBooks = [] } = useGetRecommendedBooksQuery({ page: 1, pageSize: 10 });
  const { data: popularBooks = [] } = useGetPopularBooksQuery({ page: 1, pageSize: 12 });
  const [triggerPopularByGenre] = useLazyGetPopularBooksByGenreQuery();
  const { data: searchBooks = [] } = useSearchBooksQuery(
    { query: trimmedQuery, page: 1, pageSize: 20 },
    { skip: trimmedQuery.length === 0 },
  );
  const [genreCoverMap, setGenreCoverMap] = useState(() => {
    const initial = new Map();
    FIXED_GENRES.forEach((genre) => initial.set(normalizeGenre(genre), DEFAULT_COVER_URI));
    return initial;
  });

  const recommendedCovers = useMemo(
    () => recommendedBooks.slice(0, 8).map((book) => book.coverUrl || DEFAULT_COVER_URI),
    [recommendedBooks],
  );
  const popularCovers = useMemo(
    () => popularBooks.slice(0, 8).map((book) => book.coverUrl || DEFAULT_COVER_URI),
    [popularBooks],
  );
  const trendingCovers = useMemo(
    () => popularBooks.slice(4, 12).map((book) => book.coverUrl || DEFAULT_COVER_URI),
    [popularBooks],
  );

  useEffect(() => {
    if (!query.trim()) {
      setResultsSheetDismissed(false);
    }
  }, [query]);

  const showResultsSheet = trimmedQuery.length > 0 && !resultsSheetDismissed;

  const dismissResultsSheet = useCallback(() => {
    suppressResultsSheetAutoOpenUntilRef.current = Date.now() + 1100;
    setResultsSheetDismissed(true);
    Keyboard.dismiss();
    searchInputRef.current?.blur();
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleSearchChangeText = useCallback((t) => {
    setQuery(t);
    if (t.trim().length > 0) {
      setResultsSheetDismissed(false);
    }
  }, []);

  const onPressBook = (book) => {
    navigation.navigate('book', { bookId: book?.id });
  };

  const onPressBookFromResults = useCallback((book) => {
    navigation.navigate('book', { bookId: book?.id });
  }, [navigation]);

  const onPressGenre = (genreName) => {
    navigation.navigate('genre', { genreName });
  };

  useEffect(() => {
    let isMounted = true;
    const loadGenreCovers = async () => {
      const entries = await Promise.all(
        FIXED_GENRES.map(async (genre) => {
          const normalized = normalizeGenre(genre);
          try {
            const data = await triggerPopularByGenre({ genre, page: 1, pageSize: 1 }, true).unwrap();
            const coverUri = data?.[0]?.coverUrl || DEFAULT_COVER_URI;
            return [normalized, coverUri];
          } catch {
            return [normalized, DEFAULT_COVER_URI];
          }
        }),
      );

      if (!isMounted) {
        return;
      }
      setGenreCoverMap(new Map(entries));
    };

    loadGenreCovers();
    return () => {
      isMounted = false;
    };
  }, [triggerPopularByGenre]);

  const genreColumns = useMemo(() => {
    const list = FIXED_GENRES;
    const columns = [];
    for (let i = 0; i < list.length; i += GENRES_PER_COLUMN) {
      columns.push(list.slice(i, i + GENRES_PER_COLUMN));
    }
    return columns;
  }, [genreCoverMap]);

  const searchItems = useMemo(() => searchBooks.map(toBookCardModel), [searchBooks]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerLayer}>
        <SearchHeader
          ref={searchInputRef}
          value={query}
          onChangeText={handleSearchChangeText}
          onPress={scrollToTop}
          onFocus={() => {
            if (Date.now() < suppressResultsSheetAutoOpenUntilRef.current) return;
            if (query.trim().length > 0) {
              setResultsSheetDismissed(false);
            }
          }}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HorizontalCoverSection
          title="Рекомендованные"
          subtitle="Книги на основе ваших вкусовых предпочтений"
          covers={recommendedCovers}
          onPressCover={(_, index) => onPressBook(recommendedBooks[index])}
        />

        <HorizontalCoverSection
          title="Популярные"
          subtitle="Выбор большого числа читателей"
          covers={popularCovers}
          onPressCover={(_, index) => onPressBook(popularBooks[index])}
          style={styles.sectionAltBg}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Популярное по жанрам</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreList}
          >
            {genreColumns.map((columnGenres, colIdx) => (
              <View key={`genre-col-${colIdx}`} style={styles.genreColumn}>
                {columnGenres.map((label, rowIdx) => (
                  <GenreCard
                    key={`${colIdx}-${rowIdx}-${label}`}
                    label={label}
                    coverUri={genreCoverMap.get(normalizeGenre(label)) || DEFAULT_COVER_URI}
                    onPressGenre={onPressGenre}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>

        <HorizontalCoverSection
          title="В тренде"
          subtitle="Выбор большого числа читателей"
          covers={trendingCovers}
          onPressCover={(_, index) => onPressBook(popularBooks[index + 4] || popularBooks[index])}
          style={styles.sectionAltBg}
        />
      </ScrollView>

      <SearchResultsSheet
        visible={showResultsSheet}
        topOffset={searchHeaderHeight}
        onDismiss={dismissResultsSheet}
        emptyMessage="Ничего не найдено"
        data={searchItems}
        keyExtractor={(b, idx) => `${b.id ?? b.title}-${idx}`}
        renderItem={({ item: b }) => (
          <BookRowCard book={b} showMoreButton={false} onPressBook={() => onPressBookFromResults(b)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  headerLayer: {
    zIndex: 120,
    elevation: 120,
  },
  scroll: {
    flex: 1,
    zIndex: 0,
  },
  scrollContent: {
  },
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
    marginBottom: 14,
  },
  sectionAltBg: {
    backgroundColor: '#E4DFD0',
  },
  genreList: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 23,
  },
  genreColumn: {
    width: 206,
    gap: 8,
  },
  genreCard: {
    width: 206,
    height: 116,
    borderRadius: 10,
    backgroundColor: '#535d3e',
    paddingLeft: 10,
    paddingTop: 10,
  },
  genreCardLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Playfair',
    fontWeight: '500',
    lineHeight: 17,
    maxWidth: 112,
  },
  genreCoverWrap: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 77,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#CCB985',
  },
  genreCover: {
    width: '100%',
    height: '100%',
  },
});
