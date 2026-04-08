import { View, Text, StyleSheet, Image, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback } from 'react';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import SearchHeader from '../components/SearchHeader';
import { exampleBook } from '../data/bookPage';

const coverImageUri = exampleBook.imageUrl;
const genres = ['Комедия', 'Детектив', 'Боевик', 'Приключения'];
const recommendedCovers = [coverImageUri, coverImageUri, coverImageUri];
const popularCovers = [coverImageUri, coverImageUri, coverImageUri];
const trendingCovers = [coverImageUri, coverImageUri, coverImageUri];

function GenreCard({ label, coverUri, onPressGenre }) {
  return (
    <Pressable style={styles.genreCard} onPress={() => onPressGenre(label)}>
      <Text style={styles.genreCardLabel}>{label}</Text>
      <View style={styles.genreCoverWrap}>
        <Image source={{ uri: coverUri }} style={styles.genreCover} resizeMode="cover" />
      </View>
    </Pressable>
  );
}

export function Search() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [query, setQuery] = useState('');

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressBook = () => {
    navigation.navigate('book');
  };

  const onPressGenre = (genreName) => {
    navigation.navigate('genre', { genreName });
  };

  return (
    <View style={styles.screen}>
      <SearchHeader value={query} onChangeText={setQuery} onPress={scrollToTop} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <View style={styles.genreColumn}>
              <GenreCard label={genres[0]} coverUri={coverImageUri} onPressGenre={onPressGenre} />
              <GenreCard label={genres[2]} coverUri={coverImageUri} onPressGenre={onPressGenre} />
            </View>
            <View style={styles.genreColumn}>
              <GenreCard label={genres[1]} coverUri={coverImageUri} onPressGenre={onPressGenre} />
              <GenreCard label={genres[3]} coverUri={coverImageUri} onPressGenre={onPressGenre} />
            </View>
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
