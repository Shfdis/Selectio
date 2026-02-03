import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LibraryHeader from '../components/LibraryHeader';
import BookRowCard from '../components/BookRowCard';
import { useEffect, useMemo, useState } from 'react';
import { readBooks } from '../data/libraryBooks';

export default function ReadBooks({ route }) {
  const navigation = useNavigation();
  const [activeId, setActiveId] = useState(null);

  const books = readBooks;

  const initialRatings = useMemo(
    () => books.map((b) => (typeof b?.userRating === 'number' ? b.userRating : null)),
    [books],
  );
  const [userRatings, setUserRatings] = useState(initialRatings);

  useEffect(() => {
    const update = route?.params?.reviewUpdate;
    if (!update) return;

    const { idx, rating } = update;
    if (typeof idx === 'number' && typeof rating === 'number') {
      setUserRatings((prev) => {
        const next = [...prev];
        next[idx] = rating;
        return next;
      });
    }

    // prevent re-applying on next focus/render
    navigation.setParams({ reviewUpdate: undefined });
  }, [navigation, route?.params?.reviewUpdate]);

  const onPressNewReview = (book, idx) => {
    setActiveId(null);
    navigation.navigate('newReview', { book, idx });
  };

  return (
    <View style={styles.screen}>
      <LibraryHeader
        title={'\nПрочитанное'}
        onPressBack={() => navigation.goBack()}
        onPressAdd={() => {}}
        activeId={activeId}
        onToggleActive={(id) => setActiveId((prev) => (prev === id ? null : id))}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {books.map((b, idx) => (
          <BookRowCard
            key={`${b.title}-${idx}`}
            book={b}
            isMoreActive={activeId === `more-${idx}`}
            onPressMore={() => setActiveId((prev) => (prev === `more-${idx}` ? null : `more-${idx}`))}
            onPressBook={() => setActiveId(null)}
            userRating={userRatings[idx]}
            showAddReview={userRatings[idx] == null}
            onPressAddReview={() => onPressNewReview(b, idx)}
          />
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
  content: {
    paddingBottom: '10%',
  },
});

