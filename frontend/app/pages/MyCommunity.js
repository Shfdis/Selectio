import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMemo } from 'react';
import CommunityScreenLayout from '../components/CommunityScreen';
import { mapApiBookGenres } from '../slices/booksSlice';
import {
  useGetCommunitiesCatalogQuery,
  useGetCommunityByIdQuery,
  useGetCommunityPostsQuery,
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
  name: community?.name || 'Моё сообщество',
  genres: community?.genre ? [community.genre] : [],
  description: community?.description || '',
});

const mapCommunityPosts = (posts) =>
  posts.map((post) => {
    const { genreFirst, genreSecond } = mapApiBookGenres(post?.book);
    return {
      id: post?.id,
      username: post?.authorUsername || 'Пользователь',
      dateText: formatDate(post?.createdAt),
      text: post?.content || '',
      imageSource: post?.photoUrl ? { uri: post.photoUrl } : undefined,
      initialLikes: post?.likeCount ?? 0,
      initialComments: post?.commentCount ?? 0,
      initiallyLiked: Boolean(post?.likedByCurrentUser),
      initiallyBookmarked: Boolean(post?.favoritedByCurrentUser),
      book: {
        imageUrl: post?.book?.coverUrl || DEFAULT_BOOK_COVER_URI,
        title: post?.book?.title || 'Без названия',
        author: post?.book?.author || 'Неизвестный автор',
        genreFirst,
        genreSecond,
      },
    };
  });

export default function MyCommunity() {
  const navigation = useNavigation();
  const route = useRoute();
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  const routeCommunityId = Number(route?.params?.communityId);
  const { data: communitiesCatalog = [] } = useGetCommunitiesCatalogQuery({ page: 1, pageSize: 200 });
  const fallbackOwnedCommunityId = useMemo(
    () => communitiesCatalog.find((community) => community?.ownerUserId === userId)?.id,
    [communitiesCatalog, userId],
  );
  const communityId =
    Number.isFinite(routeCommunityId) && routeCommunityId > 0 ? routeCommunityId : fallbackOwnedCommunityId;
  const { data: communityData, isFetching: isFetchingCommunity } = useGetCommunityByIdQuery(communityId, {
    skip: !communityId,
  });
  const { data: postsData = [] } = useGetCommunityPostsQuery(
    { communityId, page: 1, pageSize: 20 },
    { skip: !communityId },
  );
  const community = useMemo(() => mapCommunityModel(communityData), [communityData]);
  const posts = useMemo(() => mapCommunityPosts(postsData), [postsData]);

  const onPressBack = () => {
    navigation.goBack();
  };
  const onPressSettings = () => {
    navigation.navigate('editCommunity', { communityId });
  };
  const onPressCreatePost = () => {
    navigation.navigate('newPost', { communityId, mode: 'publish' });
  };
  const onPressSuggestedPosts = () => {
    navigation.navigate('suggestedPosts');
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
      onPressSettings={onPressSettings}
      renderActionArea={() => (
        <View style={styles.actionButtonsRow}>
          <Pressable style={styles.actionButton} onPress={onPressCreatePost} hitSlop={10}>
            <Image
              source={require('../assets/icons/icon_write.png')}
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Создать пост
            </Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onPressSuggestedPosts} hitSlop={10}>
            <Image
              source={require('../assets/icons/icon_list.png')}
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Посмотреть предложку
            </Text>
          </Pressable>
        </View>
      )}
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
  actionButtonsRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: '3%',
    marginBottom: '1%',
    width: '100%',
  },
  actionButton: {
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
  actionIcon: {
    width: 22,
    height: 22,
    position: 'absolute',
    left: 24,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 500,
    lineHeight: 20,
  },
});
