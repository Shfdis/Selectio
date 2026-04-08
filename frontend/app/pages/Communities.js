import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useState, useRef, useCallback } from 'react';
import HorizontalCoverSection from '../components/HorizontalCoverSection';
import SearchHeader, {
  defaultCommunitiesSearchPlaceholder,
} from '../components/SearchHeader';
import PostCard from '../components/PostCard';
import {
  examplePosts,
  myCreatedCommunityCovers,
  myCommunitiesStripCount,
  mySubscribedCommunityCovers,
} from '../data/communityPage';

const mySubscribedCommunityCoversStrip = mySubscribedCommunityCovers.slice(0, myCommunitiesStripCount);
const myCreatedCommunityCoversStrip = myCreatedCommunityCovers.slice(0, myCommunitiesStripCount);

const feedPosts = [...examplePosts, ...examplePosts].map((p, i) => ({
  ...p,
  id: `${p.id}-dup-${i}`,
  threadPostId: p.id,
}));

export function Communities() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [query, setQuery] = useState('');

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const onPressCommunityCover = () => {
    navigation.navigate('community');
  };
  const onPressCreatedCommunityCover = () => {
    navigation.navigate('myCommunity');
  };

  return (
    <View style={styles.screen}>
      <SearchHeader
        value={query}
        onChangeText={setQuery}
        placeholder={defaultCommunitiesSearchPlaceholder}
        onPress={scrollToTop}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
