import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';
import CommunityScreenLayout from '../components/CommunityScreen';
import { mapApiBookGenres } from '../slices/booksSlice';
import {
  useGetCommunityByIdQuery,
  useGetCommunityPostsQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
  useGetUserCommunitiesQuery,
  useGetCommunitiesCatalogQuery,
} from '../slices/communitiesSlice';
import { useGetCurrentUserQuery } from '../slices/userSlice';

const DEFAULT_COVER_URI = 'https://via.placeholder.com/156x156?text=Community';
const DEFAULT_BOOK_COVER_URI = 'https://via.placeholder.com/136x193?text=Book';

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

const mapCommunityModel = (community) => ({
  coverImageUrl: community?.coverUrl || DEFAULT_COVER_URI,
  subscribersCount: `${community?.subscriberCount ?? 0}`,
  name: community?.name || 'Сообщество',
  genres: community?.genre ? [community.genre] : [],
  description: community?.description || '',
});

const mapCommunityPosts = (posts) =>
  posts.map((post) => {
    const { genreFirst, genreSecond } = mapApiBookGenres(post?.book);
    return {
      id: post?.id,
      postId: post?.id,
      communityId: Number(post?.communityId),
      authorUserId: Number(post?.authorUserId),
      username: post?.authorUsername || 'Пользователь',
      dateText: formatDate(post?.createdAt),
      text: post?.content || '',
      imageSource: post?.photoUrl ? { uri: post.photoUrl } : undefined,
      avatarUri: post?.authorAvatarUrl || post?.avatarUrl || undefined,
      initialLikes: post?.likeCount ?? 0,
      initialComments: post?.commentCount ?? 0,
      initiallyLiked: Boolean(post?.likedByCurrentUser),
      initiallyBookmarked: Boolean(post?.favoritedByCurrentUser),
      book: {
        id: Number(post?.book?.id ?? post?.bookId),
        imageUrl: post?.book?.coverUrl || DEFAULT_BOOK_COVER_URI,
        title: post?.book?.title || 'Без названия',
        author: post?.book?.author || 'Неизвестный автор',
        genreFirst,
        genreSecond,
      },
    };
  });

export default function Community() {
  const navigation = useNavigation();
  const route = useRoute();
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const routeCommunityId = Number(route?.params?.communityId);
  const { data: communitiesCatalog = [] } = useGetCommunitiesCatalogQuery({ page: 1, pageSize: 1 });
  const fallbackCommunityId = communitiesCatalog[0]?.id;
  const communityId = Number.isFinite(routeCommunityId) && routeCommunityId > 0 ? routeCommunityId : fallbackCommunityId;
  const { data: communityData, isFetching: isFetchingCommunity } = useGetCommunityByIdQuery(communityId, {
    skip: !communityId,
  });
  const { data: postsData = [], isFetching: isFetchingPosts } = useGetCommunityPostsQuery(
    { communityId, page: 1, pageSize: 20 },
    { skip: !communityId },
  );
  const { data: myCommunities = [] } = useGetUserCommunitiesQuery(
    { userId, page: 1, pageSize: 200 },
    { skip: !userId || !communityId },
  );
  const [joinCommunity, { isLoading: isJoining }] = useJoinCommunityMutation();
  const [leaveCommunity, { isLoading: isLeaving }] = useLeaveCommunityMutation();

  const community = useMemo(() => mapCommunityModel(communityData), [communityData]);
  const posts = useMemo(() => mapCommunityPosts(postsData), [postsData]);
  const isSubscribed = useMemo(
    () => myCommunities.some((item) => Number(item?.id) === Number(communityId)),
    [myCommunities, communityId],
  );
  const isBusy = isJoining || isLeaving;

  useEffect(() => {
    const ownerUserId = Number(communityData?.ownerUserId);
    if (!communityId || !userId) {
      return;
    }
    if (Number.isFinite(ownerUserId) && ownerUserId === Number(userId)) {
      navigation.replace('myCommunity', { communityId });
    }
  }, [communityData?.ownerUserId, communityId, navigation, userId]);

  const onPressBack = () => {
    navigation.goBack();
  };

  const onPressSubscribe = async () => {
    if (!communityId || isBusy) {
      return;
    }
    await joinCommunity({ communityId }).unwrap();
  };

  const onPressUnsubscribe = async () => {
    if (!communityId || isBusy) {
      return;
    }
    await leaveCommunity({ communityId }).unwrap();
  };

  if (!communityId || isFetchingCommunity) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color="#555C40" />
      </View>
    );
  }

  return (
    <CommunityScreenLayout
      community={community}
      posts={posts}
      onPressBack={onPressBack}
      renderActionArea={() =>
        !isSubscribed ? (
          <Pressable
            style={[styles.subscribeButton, isBusy ? styles.disabledButton : null]}
            onPress={onPressSubscribe}
            hitSlop={10}
            disabled={isBusy}
          >
            <Image
              source={require('../assets/icons/icon_plus.png')}
              style={styles.subscribeIcon}
              resizeMode="contain"
            />
            <Text style={styles.subscribeButtonText}>{isJoining ? 'Подписка...' : 'Подписаться'}</Text>
          </Pressable>
        ) : (
          <View style={styles.subscribedButtonsRow}>
            <Pressable
              style={[styles.subscribedButton, isBusy ? styles.disabledButton : null]}
              onPress={onPressUnsubscribe}
              hitSlop={10}
              disabled={isBusy}
            >
              <Image
                source={require('../assets/icons/icon_x.png')}
                style={styles.subscribedIcon}
                resizeMode="contain"
              />
              <Text style={styles.subscribedButtonText} numberOfLines={1}>
                {isLeaving ? 'Отписка...' : 'Отписаться'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.subscribedButton,
                styles.subscribedButtonOffer,
                isBusy ? styles.disabledButton : null,
              ]}
              onPress={() => {
                navigation.navigate('newPost', { communityId, mode: 'suggest' });
              }}
              hitSlop={10}
              disabled={isBusy}
            >
              <Image
                source={require('../assets/icons/icon_offer.png')}
                style={[styles.subscribedIcon, styles.subscribedIconOffer]}
                resizeMode="contain"
              />
              <Text
                style={[styles.subscribedButtonText, styles.subscribedButtonTextOffer]}
                numberOfLines={1}
              >
                Предложить пост
              </Text>
            </Pressable>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  loaderScreen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  subscribeButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '3%',
    marginBottom: '1%',
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderRadius: 40,
    backgroundColor: '#40462E',
    borderWidth: 1,
    borderColor: '#ECE8DD',
    width: 328,
    alignSelf: 'center',
  },
  subscribeIcon: {
    width: 22,
    height: 22,
    position: 'absolute',
    left: 24,
  },
  subscribeButtonText: {
    fontSize: 16,
    color: '#ECE8DD',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
  subscribedButtonsRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: '3%',
    marginBottom: '1%',
    width: '100%',
  },
  subscribedButton: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderRadius: 40,
    backgroundColor: '#ECE8DD',
    borderWidth: 1,
    borderColor: '#868058',
    width: 328,
  },
  subscribedButtonOffer: {
    backgroundColor: '#ECE8DD',
    borderColor: '#868058',
  },
  subscribedIcon: {
    width: 15,
    height: 15,
    position: 'absolute',
    left: 24,
  },
  subscribedIconOffer: {
    width: 22,
    height: 22,
  },
  subscribedButtonText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
  subscribedButtonTextOffer: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
});
