import { View, StyleSheet, Image, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useRef, useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import PageHeader from '../components/PageHeader';
import { exampleBook } from '../data/bookPage';

const coverUri = exampleBook.imageUrl;
const coverCount = 15;

export default function Genre() {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const genreName = route.params?.genreName ?? 'Жанр';

  const pad = 21;
  const gap = 18;
  const cardWidth = (width - pad * 2 - gap * 2) / 3;
  const cardHeight = (148 / 104) * cardWidth;

  const rows = [];
  for (let i = 0; i < coverCount; i += 3) {
    rows.push(Array.from({ length: Math.min(3, coverCount - i) }, (_, j) => i + j));
  }

  const onPressBook = () => {
    navigation.navigate('book');
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
      >
        {rows.map((indices, rowIndex) => (
          <View
            key={rowIndex}
            style={[
              styles.row,
              { marginBottom: rowIndex < rows.length - 1 ? 26 : 0, gap },
            ]}
          >
            {indices.map((index) => (
              <Pressable
                key={index}
                style={[
                  styles.card,
                  { width: cardWidth, height: cardHeight, borderRadius: 10 },
                ]}
                onPress={onPressBook}
              >
                <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        ))}
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
});
