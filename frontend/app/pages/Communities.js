import { View, StyleSheet, ScrollView, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import SearchHeader, { defaultCommunitiesSearchPlaceholder, searchHeaderHeight } from '../components/SearchHeader';
import CommunitySearchRowCard from '../components/CommunitySearchRowCard';
import SearchResultsSheet from '../components/SearchResults';
import PostCard from '../components/PostCard';
import { communitySearchCatalog, examplePosts, myCreatedCommunityCovers, myCommunitiesStripCount, mySubscribedCommunityCovers } from '../data/communityPage';

const mySubscribedCommunityCoversStrip = mySubscribedCommunityCovers.slice(0, myCommunitiesStripCount);
const myCreatedCommunityCoversStrip = myCreatedCommunityCovers.slice(0, myCommunitiesStripCount);

const feedPosts = [...(examplePosts ?? []), ...(examplePosts ?? [])].map((p, i) => ({
  ...p,
  id: `${p.id}-dup-${i}`,
  threadPostId: p.id,
}));

export function Communities() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [resultsSheetDismissed, setResultsSheetDismissed] = useState(false);
  const suppressResultsSheetAutoOpenUntilRef = useRef(0);

  const filteredCommunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const catalog = Array.isArray(communitySearchCatalog) ? communitySearchCatalog : [];
    return catalog.filter((c) => {
      if (!c || typeof c !== 'object') return false;
      const nameMatch = typeof c.name === 'string' && c.name.toLowerCase().includes(q);
      const genreMatch =
        Array.isArray(c.genres) &&
        c.genres.some((g) => typeof g === 'string' && g.toLowerCase().includes(q));
      const descMatch =
        typeof c.description === 'string' && c.description.toLowerCase().includes(q);
      const keywords = Array.isArray(c.searchKeywords) ? c.searchKeywords : [];
      const keywordMatch = keywords.some((k) => {
        const t = String(k).toLowerCase();
        return t.includes(q) || q.includes(t);
      });
      return nameMatch || genreMatch || descMatch || keywordMatch;
    });
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

  const onPressCommunityFromResults = useCallback(
    (c) => {
      const route = c.navigateTo ?? 'community';
      navigation.navigate(route);
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
          onPressCover={onPressCommunityCover}
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
          onPressCover={onPressCreatedCommunityCover}
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
              postId={p.threadPostId}
              username={p.username}
              dateText={p.dateText}
              text={p.text}
              imageSource={p.imageSource}
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
        keyExtractor={(c, idx) => c.searchCatalogKey ?? `${c.name}-${idx}`}
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
