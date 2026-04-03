import { View, StyleSheet, ScrollView } from 'react-native';
import { useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import StickyTitleBar from '../components/StickyTitleBar';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import PostCard from '../components/PostCard';
import { exampleBook } from '../data/bookPage';
import { examplePosts } from '../data/communityPage';

const coverImageUri = exampleBook.imageUrl;
const recommendedCovers = [coverImageUri, coverImageUri, coverImageUri, coverImageUri, coverImageUri];

const feedPosts = [...examplePosts, ...examplePosts, ...examplePosts].map((p, i) => ({
  ...p,
  id: `${p.id}-feed-${i}`,
}));

export function RecommendationsMainContent() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);

  const onPressBook = () => {
    navigation.navigate('book');
  };

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  return (
    <View style={styles.screen}>
      <StickyTitleBar title="Рекомендации" onPress={scrollToTop} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.recommendedSection}>
          <HorizontalCoverSection
            title="Рекомендованные книги"
            subtitle="Книги на основе ваших вкусовых предпочтений"
            covers={recommendedCovers}
            onPressCover={onPressBook}
          />
        </View>

        <View style={styles.postsFeed}>
          {feedPosts.map((p) => (
            <PostCard
              key={p.id}
              username={p.username}
              dateText={p.dateText}
              text={p.text}
              imageSource={p.imageSource}
              book={p.book}
              initialLikes={p.initialLikes}
              initialComments={p.initialComments}
              initiallyLiked={p.initiallyLiked}
              initiallyBookmarked={p.initiallyBookmarked}
              onPressComment={() => {}}
            />
          ))}
        </View>
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
    backgroundColor: '#ECE8DD',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: '#ECE8DD',
  },
  recommendedSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
  },
  postsFeed: {
    width: '100%',
    backgroundColor: '#ECE8DD',
  },
});
