import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import PostCard from '../components/PostCard';
import { mapApiBookGenres } from '../slices/booksSlice';
import {
  useApproveSuggestedPostMutation,
  useGetSuggestedPostsQuery,
  useRejectSuggestedPostMutation,
} from '../slices/postsSlice';

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

const mapSuggestedPost = (post) => {
  const { genreFirst, genreSecond } = mapApiBookGenres(post?.book);
  return {
    id: post?.id,
    postId: post?.id,
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
      imageUrl: post?.book?.coverUrl || DEFAULT_BOOK_COVER_URI,
      title: post?.book?.title || 'Без названия',
      author: post?.book?.author || 'Неизвестный автор',
      genreFirst,
      genreSecond,
    },
  };
};

export default function SuggestedPosts() {
  const navigation = useNavigation();
  const route = useRoute();
  const communityId = Number(route?.params?.communityId);
  const {
    data: suggestedPostsData = [],
    isFetching,
    isLoading,
  } = useGetSuggestedPostsQuery(
    { communityId, page: 1, pageSize: 50 },
    { skip: !Number.isFinite(communityId) || communityId <= 0 },
  );
  const [approveSuggestedPost, { isLoading: isApproving }] = useApproveSuggestedPostMutation();
  const [rejectSuggestedPost, { isLoading: isRejecting }] = useRejectSuggestedPostMutation();

  const posts = useMemo(() => suggestedPostsData.map((post) => mapSuggestedPost(post)), [suggestedPostsData]);
  const hasPosts = posts.length > 0;
  const isMutating = isApproving || isRejecting;

  const onPublish = async (postId) => {
    if (!postId || !communityId) {
      return;
    }
    try {
      await approveSuggestedPost({ postId, communityId }).unwrap();
    } catch (_error) {
      // Keep UI stable; queue will remain unchanged on failed mutation.
    }
  };

  const onDelete = async (postId) => {
    if (!postId || !communityId) {
      return;
    }
    try {
      await rejectSuggestedPost({ postId, communityId }).unwrap();
    } catch (_error) {
      // Keep UI stable; queue will remain unchanged on failed mutation.
    }
  };

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Предложенных постов пока нет</Text>
        <Text style={styles.emptySubtitle}>Новые предложения появятся здесь</Text>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Предложка"
        onPressBack={() => navigation.goBack()}
        showConfirmButton={false}
      />

      {isLoading || isFetching ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#555C40" />
        </View>
      ) : (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {hasPosts
          ? posts.map((post) => (
              <View key={post.id} style={styles.postWrap}>
                <PostCard
                  postId={post.postId}
                  authorUserId={post.authorUserId}
                  avatarUri={post.avatarUri}
                  username={post.username}
                  dateText={post.dateText}
                  text={post.text}
                  imageSource={post.imageSource}
                  book={post.book}
                  initialLikes={post.initialLikes}
                  initialComments={post.initialComments}
                  initiallyLiked={post.initiallyLiked}
                  initiallyBookmarked={post.initiallyBookmarked}
                />

                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionButton, styles.publishButton, isMutating ? styles.actionButtonDisabled : null]}
                    onPress={() => onPublish(post.id)}
                    hitSlop={10}
                    disabled={isMutating}
                  >
                    <Text style={[styles.actionText, styles.publishText]}>Выложить</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton, isMutating ? styles.actionButtonDisabled : null]}
                    onPress={() => onDelete(post.id)}
                    hitSlop={10}
                    disabled={isMutating}
                  >
                    <Text style={[styles.actionText, styles.deleteText]}>Удалить</Text>
                  </Pressable>
                </View>
              </View>
            ))
          : emptyState}
      </ScrollView>
      )}
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
    paddingBottom: 28,
    backgroundColor: '#ECE8DD',
  },
  postWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    paddingBottom: 14,
  },
  actionRow: {
    marginTop: 12,
    paddingHorizontal: 23,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 34,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  publishButton: {
    backgroundColor: '#40462E',
    borderColor: '#40462E',
  },
  deleteButton: {
    backgroundColor: '#784C2F',
    borderColor: '#868058',
  },
  actionText: {
    fontSize: 17,
    fontFamily: 'Playfair',
    lineHeight: 20,
    paddingBottom: 3,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    color: '#ECE8DD',
    fontWeight: '500',
  },
  deleteText: {
    color: '#ECE8DD',
    fontWeight: '500',
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Mak',
    color: '#2D2800',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Playfair',
    color: '#565d3f',
    textAlign: 'center',
  },
});
