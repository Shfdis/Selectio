import { View, StyleSheet, ScrollView, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import SearchHeader, { defaultCommunitiesSearchPlaceholder, searchHeaderHeight } from '../components/SearchHeader';
import CommunitySearchRowCard from '../components/CommunitySearchRowCard';
import SearchResultsSheet from '../components/SearchResults';
import PostCard from '../components/PostCard';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { mapApiBookGenres } from '../slices/booksSlice';
import {
  useGetCommunitiesCatalogQuery,
  useGetCommunitiesFeedQuery,
  useGetUserCommunitiesQuery,
  useSearchCommunitiesQuery,
} from '../slices/communitiesSlice';

const MY_COMMUNITIES_STRIP_COUNT = 6;
const DEFAULT_BOOK_COVER_URI = 'https://via.placeholder.com/136x193?text=Book';
const toCommunityGenres = (community) => {
  if (Array.isArray(community?.genres)) {
    return community.genres.filter((genre) => typeof genre === 'string' && genre.trim().length > 0);
  }
  if (community?.genre) {
    return [community.genre];
  }
  return [];
};

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

const mapCommunitySearchItem = (community, navigateTo = 'community') => ({
  id: community?.id,
  name: community?.name || 'Сообщество',
  subscribersCount:
    typeof community?.subscriberCount === 'number' ? `${community.subscriberCount}` : '0',
  genres: toCommunityGenres(community),
  description: community?.description || '',
  coverImageUrl: community?.coverUrl ?? '',
  navigateTo,
});

const mapFeedPost = (post) => {
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
      imageUrl: post?.book?.coverUrl || DEFAULT_BOOK_COVER_URI,
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

export function Communities() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [resultsSheetDismissed, setResultsSheetDismissed] = useState(false);
  const suppressResultsSheetAutoOpenUntilRef = useRef(0);
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const trimmedQuery = query.trim();
  const { data: searchResults = [] } = useSearchCommunitiesQuery(
    { query: trimmedQuery, page: 1, pageSize: 25 },
    { skip: trimmedQuery.length === 0 },
  );
  const { data: subscribedCommunities = [] } = useGetUserCommunitiesQuery(
    { userId, page: 1, pageSize: 20 },
    { skip: !userId },
  );
  const { data: communitiesCatalog = [] } = useGetCommunitiesCatalogQuery({ page: 1, pageSize: 100 });
  const { data: communitiesFeed = [] } = useGetCommunitiesFeedQuery({ page: 1, pageSize: 20 });

  const filteredCommunities = useMemo(
    () => searchResults.map((community) => mapCommunitySearchItem(community)),
    [searchResults],
  );
  const mySubscribedCommunityCoversStrip = useMemo(
    () =>
      subscribedCommunities
        .slice(0, MY_COMMUNITIES_STRIP_COUNT)
        .map((community) => ({
          imageUri: community?.coverUrl ?? '',
          title: community?.name || 'Сообщество',
          defaultCoverWhenEmpty: true,
        })),
    [subscribedCommunities],
  );
  const myCreatedCommunities = useMemo(
    () => communitiesCatalog.filter((community) => community?.ownerUserId === userId),
    [communitiesCatalog, userId],
  );
  const myCreatedCommunityCoversStrip = useMemo(
    () =>
      myCreatedCommunities
        .slice(0, MY_COMMUNITIES_STRIP_COUNT)
        .map((community) => ({
          imageUri: community?.coverUrl ?? '',
          title: community?.name || 'Сообщество',
          defaultCoverWhenEmpty: true,
        })),
    [myCreatedCommunities],
  );
  const feedPosts = useMemo(() => communitiesFeed.map((post) => mapFeedPost(post)), [communitiesFeed]);

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

  const onPressCommunityFromResults = useCallback(
    (c) => {
      const route = c.navigateTo ?? 'community';
      navigation.navigate(route, c.id ? { communityId: c.id } : undefined);
    },
    [navigation],
  );

  const onPressCommunityCover = () => {
    navigation.navigate('community');
  };
  const onPressCreatedCommunityCover = () => {
    navigation.navigate('myCommunity');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerLayer}>
        <SearchHeader
          ref={searchInputRef}
          value={query}
          onChangeText={handleSearchChangeText}
          placeholder={defaultCommunitiesSearchPlaceholder}
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
          title="Мои подписки"
          subtitle="Сообщества, на которые вы подписались"
          covers={mySubscribedCommunityCoversStrip}
          onPressCover={(_, index) =>
            navigation.navigate('community', { communityId: subscribedCommunities[index]?.id })
          }
          style={styles.subscribedCommunitiesSection}
          squareCovers
          titleStyle={styles.myCommunitiesTitle}
          subtitleStyle={styles.myCommunitiesSubtitle}
          openAllButton={{
            label: 'Открыть все',
            onPress: () => navigation.navigate('allMySubscriptions'),
          }}
        />
        <HorizontalCoverSection
          title="Созданные сообщества"
          subtitle="Сообщества, которые вы создали"
          covers={myCreatedCommunityCoversStrip}
          onPressCover={(_, index) =>
            navigation.navigate('myCommunity', { communityId: myCreatedCommunities[index]?.id })
          }
          style={styles.myCommunitiesSection}
          squareCovers
          titleStyle={styles.myCommunitiesTitle}
          subtitleStyle={styles.myCommunitiesSubtitle}
          openAllButton={{
            label: 'Открыть все',
            onPress: () => navigation.navigate('allMyCreatedCommunities'),
          }}
          plusButton={{
            onPress: () => navigation.navigate('newCommunity'),
          }}
        />

        <View style={styles.postsFeed}>
          {feedPosts.map((p) => (
            <PostCard
              key={p.id}
              postId={p.postId}
              communityId={p.communityId}
              authorUserId={p.authorUserId}
              avatarUri={p.avatarUri}
              username={p.username}
              dateText={p.dateText}
              text={p.text}
              imageUri={p.imageUri}
              book={p.book}
              initialLikes={p.initialLikes}
              initialComments={p.initialComments}
              initiallyLiked={p.initiallyLiked}
              initiallyBookmarked={p.initiallyBookmarked}
            />
          ))}
        </View>
      </ScrollView>

      <SearchResultsSheet
        visible={showResultsSheet}
        topOffset={searchHeaderHeight}
        onDismiss={dismissResultsSheet}
        emptyMessage="Сообщества не найдены"
        data={filteredCommunities}
        keyExtractor={(c, idx) => `${c.id ?? c.name}-${idx}`}
        renderItem={({ item: c }) => (
          <CommunitySearchRowCard community={c} onPress={() => onPressCommunityFromResults(c)} />
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
    backgroundColor: '#ECE8DD',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
    backgroundColor: '#ECE8DD',
  },
  myCommunitiesSection: {
    backgroundColor: '#E4DFD0',
    paddingBottom: 23,
  },
  subscribedCommunitiesSection: {
    backgroundColor: '#ECE8DD',
    paddingBottom: 23,
  },
  myCommunitiesTitle: {
    marginBottom: 0,
  },
  myCommunitiesSubtitle: {
    marginBottom: 17,
  },
  postsFeed: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#CAC7B9',
    backgroundColor: '#ECE8DD',
  },
});
