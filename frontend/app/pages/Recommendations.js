import { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import StickyTitleBar from '../components/StickyTitleBar';
import RecommendedBooksSection from '../components/RecommendedBooksSection';
import PostCard from '../components/PostCard';
import { mapApiBookGenres } from '../slices/booksSlice';
import { useGetRecommendedPostsQuery } from '../slices/postsSlice';

const DEFAULT_COVER_URI = 'https://via.placeholder.com/136x193?text=Book';

const formatDate = (isoString) => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
};

const toPostCardModel = (post) => {
  const { genreFirst, genreSecond } = mapApiBookGenres(post);
  return {
    id: post?.id,
    postId: post?.id,
    communityId: Number(post?.communityId),
    authorUserId: Number(post?.authorUserId),
    username: post?.authorUsername || 'Пользователь',
    dateText: formatDate(post?.createdAt),
    text: post?.content || '',
    imageUri: post?.photoUrl || undefined,
    avatarUri: post?.authorAvatarUrl || post?.avatarUrl || undefined,
    book: {
      id: Number(post?.book?.id ?? post?.bookId),
      imageUrl: post?.book?.coverUrl || DEFAULT_COVER_URI,
      title: post?.book?.title || 'Без названия',
      author: post?.book?.author || 'Неизвестный автор',
      genreFirst,
      genreSecond,
    },
    initialLikes: post?.likeCount ?? 0,
    initialComments: post?.commentCount ?? 0,
    initiallyLiked: Boolean(post?.likedByCurrentUser),
    initiallyBookmarked: Boolean(post?.favoritedByCurrentUser),
  };
};

export function RecommendationsMainContent() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const { data: feedPostsData = [] } = useGetRecommendedPostsQuery({ page: 1, pageSize: 20 });

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressBook = useCallback(
    (book) => {
      const bookId = Number(book?.id);
      if (Number.isFinite(bookId) && bookId > 0) {
        navigation.navigate('book', { bookId });
      }
    },
    [navigation],
  );

  const feedPosts = useMemo(() => feedPostsData.map((post) => toPostCardModel(post)), [feedPostsData]);

  return (
    <View style={styles.screen}>
      <StickyTitleBar title="Рекомендации" onPress={scrollToTop} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.recommendedSection}>
          <RecommendedBooksSection onPressBook={onPressBook} />
        </View>

        <View style={styles.postsFeed}>
          {feedPosts.map((post) => (
            <PostCard
              key={`post-${post.id}`}
              postId={post.postId}
              communityId={post.communityId}
              authorUserId={post.authorUserId}
              avatarUri={post.avatarUri}
              username={post.username}
              dateText={post.dateText}
              text={post.text}
              imageUri={post.imageUri}
              book={post.book}
              initialLikes={post.initialLikes}
              initialComments={post.initialComments}
              initiallyLiked={post.initiallyLiked}
              initiallyBookmarked={post.initiallyBookmarked}
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
