import { View, Text, StyleSheet, Image, Pressable, ScrollView, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import SearchHeader, { searchHeaderHeight } from '../components/SearchHeader';
import BookRowCard from '../components/BookRowCard';
import SearchResultsSheet from '../components/SearchResults';
import { exampleBook } from '../data/bookPage';
import { bookSearchCatalog, libraryFilterGenres } from '../data/libraryBooks';

const coverImageUri = exampleBook.imageUrl;
const recommendedCovers = [coverImageUri, coverImageUri, coverImageUri];
const popularCovers = [coverImageUri, coverImageUri, coverImageUri];
const trendingCovers = [coverImageUri, coverImageUri, coverImageUri];

const GENRES_PER_COLUMN = 2;

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
  const [resultsSheetDismissed, setResultsSheetDismissed] = useState(false);
  const suppressResultsSheetAutoOpenUntilRef = useRef(0);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return bookSearchCatalog.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.genreFirst && b.genreFirst.toLowerCase().includes(q)) ||
        (b.genreSecond && b.genreSecond.toLowerCase().includes(q)),
    );
  }, [query]);

  useEffect(() => {
    if (!query.trim()) {
      setResultsSheetDismissed(false);
    }
  }, [query]);

  const showResultsSheet = query.trim().length > 0 && !resultsSheetDismissed;

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

  const onPressBook = () => {
    navigation.navigate('book');
  };

  const onPressBookFromResults = useCallback(() => {
    navigation.navigate('book');
  }, [navigation]);

  const onPressGenre = (genreName) => {
    navigation.navigate('genre', { genreName });
  };

  const genreColumns = useMemo(() => {
    const list = Array.isArray(libraryFilterGenres) ? libraryFilterGenres : [];
    const columns = [];
    for (let i = 0; i < list.length; i += GENRES_PER_COLUMN) {
      columns.push(list.slice(i, i + GENRES_PER_COLUMN));
    }
    return columns;
  }, []);

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
          onPressCover={onPressBook}
        />

        <HorizontalCoverSection
          title="Популярные"
          subtitle="Выбор большого числа читателей"
          covers={popularCovers}
          onPressCover={onPressBook}
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
                    coverUri={coverImageUri}
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
          onPressCover={onPressBook}
          style={styles.sectionAltBg}
        />
      </ScrollView>

      <SearchResultsSheet
        visible={showResultsSheet}
        topOffset={searchHeaderHeight}
        onDismiss={dismissResultsSheet}
        emptyMessage="Ничего не найдено"
        data={filteredBooks}
        keyExtractor={(b, idx) => b.searchCatalogKey ?? `${b.title}-${idx}`}
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
