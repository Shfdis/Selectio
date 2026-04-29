import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { useRef, useCallback } from 'react';
import GreenHeaderStrip from './GreenHeader';
import PostCard from './PostCard';
import { getCommunityCoverImageSource } from '../utils/communityCover';

function GenrePill({ label }) {
  return (
    <View style={styles.genrePill}>
      <Text style={styles.genrePillText}>{label}</Text>
    </View>
  );
}

export default function CommunityScreenLayout({
  community,
  posts,
  onPressBack,
  onPressSettings,
  renderActionArea,
  canDeletePosts = false,
  onPressDeletePost,
  deletingPostId = null,
}) {
  const scrollRef = useRef(null);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const headerGenres = Array.isArray(community.genres) ? community.genres.slice(0, 6) : [];
  const hasDescription =
    typeof community.description === 'string' && community.description.trim().length > 0;

  return (
    <View style={styles.screen}>
      <GreenHeaderStrip
        onPressBack={onPressBack}
        onPressStrip={scrollToTop}
        onPressSettings={onPressSettings}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerGreenBlock}>
          <View style={styles.coverWrap}>
            <Image
              source={getCommunityCoverImageSource(community.coverImageUrl)}
              style={styles.cover}
              resizeMode="cover"
            />
          </View>

          <View style={styles.subscribersOval}>
            <Image
              source={require('../assets/icons/icon_community.png')}
              style={styles.subscribersIcon}
              resizeMode="contain"
            />
            <Text style={styles.subscribersText}>{community.subscribersCount}</Text>
          </View>

          <Text style={styles.communityName} numberOfLines={1}>
            {community.name}
          </Text>

          <View style={styles.genreRows}>
            <View style={styles.genreRow}>
              {headerGenres.map((g, i) => (
                <GenrePill key={`${g}-${i}`} label={g} />
              ))}
            </View>
          </View>

          {renderActionArea ? renderActionArea() : null}
        </View>

        {hasDescription ? (
          <View style={styles.scrollContentInner}>
            <Text style={styles.descriptionLabel}>Описание:</Text>
            <Text style={styles.descriptionText}>{community.description}</Text>
          </View>
        ) : null}

        {hasDescription ? <View style={styles.divider} /> : null}

        <View style={[styles.postsSection, hasDescription ? null : styles.postsSectionNoDescription]}>
          {posts.map((p) => (
            <PostCard
              key={p.id}
              postId={p.id}
              communityId={p.communityId}
              authorUserId={p.authorUserId}
              avatarUri={p.avatarUri}
              username={p.username}
              dateText={p.dateText}
              text={p.text}
              imageSource={p.imageSource}
              book={p.book}
              initialLikes={p.initialLikes}
              initialComments={p.initialComments}
              initiallyLiked={p.initiallyLiked}
              initiallyBookmarked={p.initiallyBookmarked}
              canDelete={canDeletePosts}
              onPressDelete={() => onPressDeletePost?.(p)}
              deleteDisabled={deletingPostId != null && Number(deletingPostId) === Number(p.id)}
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
  headerGreenBlock: {
    width: '100%',
    backgroundColor: '#555C40',
    paddingBottom: '5%',
    alignItems: 'center',
  },
  coverWrap: {
    width: 156,
    height: 156,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#535D3E',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  subscribersOval: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '3%',
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#868058',
    gap: 6,
  },
  subscribersIcon: {
    width: 18,
    height: 18,
  },
  subscribersText: {
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: 400,
    lineHeight: 20,
  },
  communityName: {
    marginTop: '5%',
    fontSize: 24,
    color: '#ECE8DD',
    fontFamily: 'Mak',
    fontWeight: 600,
    lineHeight: 29,
    textAlign: 'center',
    maxWidth: '90%',
  },
  genreRows: {
    marginTop: '4%',
    width: '100%',
    paddingHorizontal: '6%',
    alignItems: 'center',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  genrePill: {
    borderRadius: 20,
    backgroundColor: '#CCB985',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CAC7B9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genrePillText: {
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 15,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: '15%',
    backgroundColor: '#ECE8DD',
  },
  scrollContentInner: {
    paddingHorizontal: '6%',
    paddingTop: '5%',
  },
  descriptionLabel: {
    fontSize: 20,
    color: '#868058',
    fontFamily: 'Mak',
    fontWeight: 600,
    lineHeight: 20,
    marginBottom: '4%',
  },
  descriptionText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 19,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#CAC7B9',
    marginTop: '7%',
  },
  postsSection: {
    width: '100%',
  },
  postsSectionNoDescription: {
    marginTop: '5%',
  },
});
