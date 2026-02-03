import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LibraryHeader from '../components/LibraryHeader';
import BookRowCard from '../components/BookRowCard';
import { useState } from 'react';
import { inProgressBooks } from '../data/libraryBooks';

export default function InProgress() {
  const navigation = useNavigation();
  const [activeId, setActiveId] = useState(null); 

  const books = inProgressBooks;

  return (
    <View style={styles.screen}>
      <LibraryHeader
        title={'В\nпроцессе'}
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

