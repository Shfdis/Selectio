import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StickyTitleBar from '../components/StickyTitleBar';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import PostCard from '../components/PostCard';
import BookRowCard from '../components/BookRowCard';
import { useGetPopularBooksQuery, useGetRecommendedBooksQuery } from '../slices/booksSlice';
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

const toBookCardModel = (book) => {
  const genre = (book?.genre || '').trim();
  const [genreFirst = '', ...restGenres] = genre.split(/\s+/);
  return {
    id: book?.id,
    imageUrl: book?.coverUrl || DEFAULT_COVER_URI,
    title: book?.title || 'Без названия',
    author: book?.author || 'Неизвестный автор',
    genreFirst,
    genreSecond: restGenres.join(' '),
  };
};

const toPostCardModel = (post) => {
  const genre = (post?.book?.genre || '').trim();
  const [genreFirst = '', ...restGenres] = genre.split(/\s+/);
  return {
    id: post?.id,
    postId: post?.id,
    username: post?.authorUsername || 'Пользователь',
    dateText: formatDate(post?.createdAt),
    text: post?.content || '',
    imageUri: post?.photoUrl || undefined,
    book: {
      imageUrl: post?.book?.coverUrl || DEFAULT_COVER_URI,
      title: post?.book?.title || 'Без названия',
      author: post?.book?.author || 'Неизвестный автор',
      genreFirst,
      genreSecond: restGenres.join(' '),
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
  const [booksSource, setBooksSource] = useState(null);
  const [booksForRecommendations, setBooksForRecommendations] = useState([]);
  const [hasMoreBooks, setHasMoreBooks] = useState(true);
  const appendedPagesRef = useRef(new Set());
  const isLoadingMoreRef = useRef(false);
  const {
    data: recommendedBooksPage = [],
    isSuccess: isRecommendedPageSuccess,
    isFetching: isRecommendedPageFetching,
  } = useGetRecommendedBooksQuery(
    { page: booksPage, pageSize: 20 },
    { skip: booksSource === 'popular' },
  );
  const {
    data: popularBooksPage = [],
    isSuccess: isPopularPageSuccess,
    isFetching: isPopularPageFetching,
  } = useGetPopularBooksQuery(
    { page: booksPage, pageSize: 20 },
    { skip: booksSource === 'recommended' },
  );
  const { data: recommendedPosts = [] } = useGetRecommendedPostsQuery({ page: 1, pageSize: 20 });

  useEffect(() => {
    if (booksSource) {
      return;
    }
    if (recommendedBooksPage.length > 0) {
      setBooksSource('recommended');
      return;
    }
    if (isRecommendedPageSuccess && popularBooksPage.length > 0) {
      setBooksSource('popular');
      return;
    }
    if (isRecommendedPageSuccess && isPopularPageSuccess) {
      setBooksSource('popular');
    }
  }, [
    booksSource,
    recommendedBooksPage,
    popularBooksPage,
    isRecommendedPageSuccess,
    isPopularPageSuccess,
  ]);

  const activeBooksPage =
    booksSource === 'popular'
      ? popularBooksPage
      : booksSource === 'recommended'
        ? recommendedBooksPage
        : recommendedBooksPage.length > 0
          ? recommendedBooksPage
          : popularBooksPage;

  useEffect(() => {
    if (!booksSource || activeBooksPage.length === 0) {
      if (!booksSource && isRecommendedPageSuccess && isPopularPageSuccess && activeBooksPage.length === 0) {
        setHasMoreBooks(false);
      }
      return;
    }
    const pageKey = `${booksSource}-${booksPage}`;
    if (appendedPagesRef.current.has(pageKey)) {
      return;
    }
    appendedPagesRef.current.add(pageKey);
    setBooksForRecommendations((prev) => {
      const existingIds = new Set(prev.map((book) => book?.id));
      const incoming = activeBooksPage.filter((book) => !existingIds.has(book?.id));
      return [...prev, ...incoming];
    });
    if (activeBooksPage.length < 20) {
      setHasMoreBooks(false);
    }
    isLoadingMoreRef.current = false;
  }, [
    booksSource,
    booksPage,
    activeBooksPage,
    isRecommendedPageSuccess,
    isPopularPageSuccess,
  ]);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressBook = (bookId) => {
    navigation.navigate('book', { bookId });
  };

  const recommendedCovers = useMemo(
    () => booksForRecommendations.slice(0, 8).map((book) => book.coverUrl || DEFAULT_COVER_URI),
    [booksForRecommendations],
  );

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
      if (isRecommendedPageFetching || isPopularPageFetching) {
        return;
      }
      isLoadingMoreRef.current = true;
      setBooksPage((prev) => prev + 1);
    },
    [hasMoreBooks, isRecommendedPageFetching, isPopularPageFetching],
  );

  const mixedFeedItems = useMemo(() => {
    const books = booksForRecommendations.map((book) => ({ type: 'book', value: toBookCardModel(book) }));
    const posts = recommendedPosts.map((post) => ({ type: 'post', value: toPostCardModel(post) }));
    const result = [];
    let b = 0;
    let p = 0;

    while (b < books.length || p < posts.length) {
      if (b >= books.length) {
        result.push(posts[p++]);
        continue;
      }
      if (p >= posts.length) {
        result.push(books[b++]);
        continue;
      }

      // 50/50 choice between a book recommendation and a feed post.
      if (Math.random() < 0.5) {
        result.push(books[b++]);
      } else {
        result.push(posts[p++]);
      }
    }

    return result;
  }, [booksForRecommendations, recommendedPosts]);

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
          />
        </View>

        <View style={styles.postsFeed}>
          {mixedFeedItems.map((item) =>
            item.type === 'post' ? (
              <PostCard
                key={`post-${item.value.id}`}
                postId={item.value.postId}
                username={item.value.username}
                dateText={item.value.dateText}
                text={item.value.text}
                imageUri={item.value.imageUri}
                book={item.value.book}
                initialLikes={item.value.initialLikes}
                initialComments={item.value.initialComments}
                initiallyLiked={item.value.initiallyLiked}
                initiallyBookmarked={item.value.initiallyBookmarked}
              />
            ) : (
              <View key={`book-${item.value.id}`} style={styles.bookRowWrap}>
                <BookRowCard
                  book={item.value}
                  showMoreButton={false}
                  showDivider={false}
                  onPressBook={() => onPressBook(item.value.id)}
                />
              </View>
            ),
          )}
          {(isRecommendedPageFetching || isPopularPageFetching) && hasMoreBooks ? (
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
  bookRowWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
  },
  paginationLoader: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
