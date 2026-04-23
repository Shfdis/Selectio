import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StickyTitleBar from '../components/StickyTitleBar';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import PostCard from '../components/PostCard';
import { mapApiBookGenres, useGetPopularBooksQuery, useGetRecommendedBooksQuery } from '../slices/booksSlice';
import { useGetCommunitiesFeedQuery } from '../slices/communitiesSlice';

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
  const { genreFirst, genreSecond } = mapApiBookGenres(post?.book);
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
  const [booksPage, setBooksPage] = useState(1);
  const [booksForRecommendations, setBooksForRecommendations] = useState([]);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const appendedPageNumbersRef = useRef(new Set());
  const isLoadingMoreRef = useRef(false);
  const pageSize = 20;
  const {
    data: recommendedBooksPage = [],
    isFetching: isRecommendedPageFetching,
  } = useGetRecommendedBooksQuery({ page: booksPage, pageSize });
  const {
    data: popularBooksPage = [],
    isFetching: isPopularPageFetching,
  } = useGetPopularBooksQuery({ page: booksPage, pageSize });
  const { data: feedPostsData = [] } = useGetCommunitiesFeedQuery({ page: 1, pageSize: 20 });

  useEffect(() => {
    if (isRecommendedPageFetching || isPopularPageFetching) {
      return;
    }
    if (appendedPageNumbersRef.current.has(booksPage)) {
      return;
    }
    appendedPageNumbersRef.current.add(booksPage);
    const pageBooks = recommendedBooksPage.length > 0 ? recommendedBooksPage : popularBooksPage;

    setBooksForRecommendations((prev) => {
      const existingIds = new Set(prev.map((book) => book?.id));
      const incoming = pageBooks.filter((book) => !existingIds.has(book?.id));
      return [...prev, ...incoming];
    });

    const recommendedHasMore = recommendedBooksPage.length >= pageSize;
    const popularHasMore = popularBooksPage.length >= pageSize;
    const noDataOnThisPage = recommendedBooksPage.length === 0 && popularBooksPage.length === 0;
    if ((!recommendedHasMore && !popularHasMore) || noDataOnThisPage) {
      setHasMoreBooks(false);
    }
    isLoadingMoreRef.current = false;
  }, [
    booksPage,
    pageSize,
    recommendedBooksPage,
    popularBooksPage,
    isRecommendedPageFetching,
    isPopularPageFetching,
  ]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressBook = (bookId) => {
    navigation.navigate('book', { bookId });
  };

  const recommendedCovers = useMemo(
    () => booksForRecommendations.map((book) => book.coverUrl || DEFAULT_COVER_URI),
    [booksForRecommendations],
  );

  const loadMoreBooks = useCallback(() => {
    if (!hasMoreBooks || isLoadingMoreRef.current) {
      return;
    }
    if (isRecommendedPageFetching || isPopularPageFetching) {
      return;
    }
    isLoadingMoreRef.current = true;
    setBooksPage((prev) => prev + 1);
  }, [hasMoreBooks, isRecommendedPageFetching, isPopularPageFetching]);

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      if (!hasMoreBooks || isLoadingMoreRef.current) {
        return;
      }
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
      if (distanceFromBottom > 120) {
        return;
      }
      loadMoreBooks();
    },
    [hasMoreBooks, loadMoreBooks],
  );

  const feedPosts = useMemo(() => feedPostsData.map((post) => toPostCardModel(post)), [feedPostsData]);
  const isBooksLoading = isRecommendedPageFetching || isPopularPageFetching;
  const isLoadingMoreBooks = isBooksLoading && booksPage > 1 && hasMoreBooks;
  const isInitialBooksLoading = isBooksLoading && booksForRecommendations.length === 0;

  return (
    <View style={styles.screen}>
      <StickyTitleBar title="Рекомендации" onPress={scrollToTop} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.recommendedSection}>
          <HorizontalCoverSection
            title="Рекомендованные книги"
            subtitle="Книги на основе ваших вкусовых предпочтений"
            covers={recommendedCovers}
            onPressCover={(_, index) => onPressBook(booksForRecommendations[index]?.id)}
            onHorizontalEndReached={loadMoreBooks}
          />
          {isInitialBooksLoading || isLoadingMoreBooks ? (
            <View style={styles.booksLoader}>
              <ActivityIndicator size="small" color="#555C40" />
            </View>
          ) : null}
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
          {isLoadingMoreBooks ? (
            <View style={styles.paginationLoader}>
              <ActivityIndicator size="small" color="#555C40" />
            </View>
          ) : null}
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
  paginationLoader: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  booksLoader: {
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
