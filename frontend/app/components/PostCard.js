import { View, Text, StyleSheet, Image, Pressable, Animated, Easing } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import BookCard from './BookCard';
import { useGetUserProfileQuery } from '../slices/profileSlice';
import { useGetCommunityByIdQuery } from '../slices/communitiesSlice';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import {
  useFavoritePostMutation,
  useLikePostMutation,
  useUnfavoritePostMutation,
  useUnlikePostMutation,
} from '../slices/postsSlice';
import { mapApiBookGenres, useGetBookByIdQuery } from '../slices/booksSlice';
import { getCommunityCoverImageSource } from '../utils/communityCover';

export default function PostCard({
  avatarSource = require('../assets/icons/profile-avatar.png'),
  avatarUri,
  communityId,
  communityName,
  communityAvatarUri,
  authorUserId,
  postId,
  username,
  dateText,
  text,
  imageSource,
  imageUri,
  book,
  initialLikes = 0,
  initialComments = 0,
  initiallyLiked = false,
  initiallyBookmarked = true,
  onPressComment,
  canDelete = false,
  onPressDelete,
  deleteDisabled = false,
  style,
}) {
  const navigation = useNavigation();
  const [liked, setLiked] = useState(initiallyLiked);
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [likes, setLikes] = useState(initialLikes);
  const lastTapAtRef = useRef(0);
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(0.75)).current;
  const { data: currentUser } = useGetCurrentUserQuery();
  const normalizedCommunityId = Number(communityId);
  const { data: communityData } = useGetCommunityByIdQuery(normalizedCommunityId, {
    skip: !Number.isFinite(normalizedCommunityId) || normalizedCommunityId <= 0,
  });
  const normalizedAuthorUserId = Number(authorUserId);
  const { data: authorProfile } = useGetUserProfileQuery(normalizedAuthorUserId, {
    skip: !Number.isFinite(normalizedAuthorUserId) || normalizedAuthorUserId <= 0,
  });
  const resolvedCommunityName = communityData?.name || communityName;
  const headerAvatarSource = useMemo(() => {
    const fromApi = communityData?.coverUrl;
    if (typeof fromApi === 'string' && fromApi.trim().length > 0) {
      return { uri: fromApi.trim() };
    }
    const fromPost = communityAvatarUri;
    if (typeof fromPost === 'string' && fromPost.trim().length > 0) {
      return { uri: fromPost.trim() };
    }
    if (Number.isFinite(normalizedCommunityId) && normalizedCommunityId > 0) {
      return getCommunityCoverImageSource('');
    }
    if (authorProfile?.avatarUrl) {
      return { uri: authorProfile.avatarUrl };
    }
    if (typeof avatarUri === 'string' && avatarUri.trim().length > 0) {
      return { uri: avatarUri.trim() };
    }
    return avatarSource;
  }, [
    communityData?.coverUrl,
    communityAvatarUri,
    normalizedCommunityId,
    authorProfile?.avatarUrl,
    avatarUri,
    avatarSource,
  ]);
  const resolvedTitle = resolvedCommunityName || username || 'Сообщество';
  const normalizedBookId = Number(book?.id);
  const { data: fullBook } = useGetBookByIdQuery(normalizedBookId, {
    skip: !Number.isFinite(normalizedBookId) || normalizedBookId <= 0,
  });
  const fullBookGenres = useMemo(() => mapApiBookGenres(fullBook), [fullBook]);
  const resolvedBook = useMemo(
    () => ({
      ...book,
      genreFirst: fullBookGenres.genreFirst || book?.genreFirst,
      genreSecond: fullBookGenres.genreSecond || book?.genreSecond,
    }),
    [book, fullBookGenres.genreFirst, fullBookGenres.genreSecond],
  );
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [favoritePost] = useFavoritePostMutation();
  const [unfavoritePost] = useUnfavoritePostMutation();

  useEffect(() => {
    setLiked(initiallyLiked);
  }, [initiallyLiked, postId]);

  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes, postId]);

  useEffect(() => {
    setBookmarked(initiallyBookmarked);
  }, [initiallyBookmarked, postId]);

  const onToggleLike = async () => {
    if (postId == null || postId === '') {
      return;
    }
    const previousLiked = liked;
    const previousLikes = likes;
    const nextLiked = !previousLiked;

    setLiked(nextLiked);
    setLikes((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

    try {
      if (nextLiked) {
        await likePost({ postId, communityId: normalizedCommunityId }).unwrap();
      } else {
        await unlikePost({ postId, communityId: normalizedCommunityId }).unwrap();
      }
    } catch (_error) {
      setLiked(previousLiked);
      setLikes(previousLikes);
    }
  };

  const playDoubleTapHeart = () => {
    heartOpacity.setValue(0);
    heartScale.setValue(0.75);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 190,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(220),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPostSurfaceTap = async () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapAtRef.current < 260;
    lastTapAtRef.current = now;
    if (!isDoubleTap) {
      return;
    }
    playDoubleTapHeart();
    if (liked || postId == null || postId === '') {
      return;
    }
    setLiked(true);
    setLikes((c) => c + 1);
    try {
      await likePost({ postId, communityId: normalizedCommunityId }).unwrap();
    } catch (_error) {
      setLiked(false);
      setLikes((c) => Math.max(0, c - 1));
    }
  };

  const likeIcon = useMemo(
    () => (liked ? require('../assets/icons/icon-heart-filled.png') : require('../assets/icons/icon-heart.png')),
    [liked],
  );

  const onCommentPress = () => {
    if (typeof onPressComment === 'function') {
      onPressComment();
      return;
    }
    if (postId != null && postId !== '') {
      navigation.navigate('postComments', { postId: String(postId) });
    }
  };

  const onPressCommunity = () => {
    const normalizedCommunityId = Number(communityId);
    if (Number.isFinite(normalizedCommunityId) && normalizedCommunityId > 0) {
      const ownerUserId = Number(communityData?.ownerUserId);
      const currentUserId = Number(currentUser?.id);
      const targetRoute =
        Number.isFinite(ownerUserId) &&
        Number.isFinite(currentUserId) &&
        ownerUserId === currentUserId
          ? 'myCommunity'
          : 'community';
      navigation.navigate(targetRoute, { communityId: normalizedCommunityId });
    }
  };

  const onPressBook = () => {
    if (Number.isFinite(normalizedBookId) && normalizedBookId > 0) {
      navigation.navigate('book', { bookId: normalizedBookId });
    }
  };

  const bookmarkIcon = useMemo(
    () =>
      bookmarked
        ? require('../assets/icons/icon_bookmark_filled.png')
        : require('../assets/icons/icon_bookmark.png'),
    [bookmarked],
  );

  const onToggleBookmark = async () => {
    if (postId == null || postId === '') {
      return;
    }
    const previousBookmarked = bookmarked;
    const nextBookmarked = !previousBookmarked;
    setBookmarked(nextBookmarked);
    try {
      if (nextBookmarked) {
        await favoritePost({ postId }).unwrap();
      } else {
        await unfavoritePost({ postId }).unwrap();
      }
    } catch (_error) {
      setBookmarked(previousBookmarked);
    }
  };

  return (
    <View style={[styles.wrapper, style]}>
      <Pressable style={styles.inner} onPress={onPostSurfaceTap}>
        <Pressable style={styles.headerRow} onPress={onPressCommunity} hitSlop={10}>
          <Image
            source={headerAvatarSource}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.headerText}>
            <Text style={styles.username} numberOfLines={1}>
              {resolvedTitle}
            </Text>
            <Text style={styles.date} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
          {canDelete ? (
            <Pressable
              style={[styles.deletePostAction, deleteDisabled ? styles.deletePostActionDisabled : null]}
              onPress={onPressDelete}
              hitSlop={10}
              disabled={deleteDisabled}
            >
              <Image
                source={require('../assets/icons/icon_tresh.png')}
                style={styles.deletePostIcon}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}
        </Pressable>

        <Text style={styles.postText}>{text}</Text>

        {imageSource || imageUri ? (
          <View style={styles.imageFrame}>
            <Image source={imageSource ?? { uri: imageUri }} style={styles.postImage} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.bookFrame}>
          <BookCard
            imageUrl={resolvedBook?.imageUrl}
            title={resolvedBook?.title}
            author={resolvedBook?.author}
            genreFirst={resolvedBook?.genreFirst}
            genreSecond={resolvedBook?.genreSecond}
            onClick={onPressBook}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.doubleTapHeartWrap,
            {
              opacity: heartOpacity,
              transform: [{ scale: heartScale }],
            },
          ]}
        >
          <Image
            source={require('../assets/icons/icon-heart-filled.png')}
            style={styles.doubleTapHeartIcon}
            resizeMode="contain"
          />
        </Animated.View>
      </Pressable>

      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <Pressable style={styles.action} onPress={onToggleLike} hitSlop={10}>
            <Image
              source={likeIcon}
              style={[styles.icon, liked ? styles.iconLiked : null]}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.count}>{likes}</Text>

          <Pressable style={[styles.action, styles.actionSpacer]} onPress={onCommentPress} hitSlop={10}>
            <Image source={require('../assets/icons/icon_chat.png')} style={styles.icon} resizeMode="contain" />
          </Pressable>
          <Text style={styles.count}>{initialComments}</Text>
        </View>

        <Pressable style={styles.action} onPress={onToggleBookmark} hitSlop={10}>
          <Image
            source={bookmarkIcon}
            style={[styles.icon, bookmarked ? styles.iconBookmarked : null]}
            resizeMode="contain"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 4,
    paddingBottom: 4,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CAC7B9',
    backgroundColor: '#ECE8DD',
  },
  inner: {
    paddingHorizontal: '6%',
    paddingTop: '3%',
    paddingBottom: '4%',
    position: 'relative',
  },
  doubleTapHeartWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleTapHeartIcon: {
    width: 84,
    height: 84,
    tintColor: '#B23A2D',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: '14%',
    aspectRatio: 1,
    borderRadius: 9999,
  },
  headerText: {
    marginLeft: '4%',
    flex: 1,
  },
  username: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: 300,
    lineHeight: 19,
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: 400,
    lineHeight: 14,
    opacity: 0.9,
  },
  deletePostAction: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePostActionDisabled: {
    opacity: 0.5,
  },
  deletePostIcon: {
    width: 22,
    height: 22,
    tintColor: '#2D2800',
  },
  postText: {
    marginTop: '4%',
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: 400,
    lineHeight: 17,
  },
  imageFrame: {
    marginTop: '4%',
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#555C40',
    aspectRatio: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  bookFrame: {
    marginTop: '5%',
    width: '100%',
    overflow: 'hidden',
  },
  actionsRow: {
    paddingHorizontal: '6%',
    paddingVertical: '3%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSpacer: {
    marginLeft: 24,
  },
  icon: {
    width: '100%',
    height: '100%',
    tintColor: '#2D2800',
  },
  iconLiked: {
    tintColor: '#B23A2D',
  },
  iconBookmarked: {
    tintColor: '#C9B26F',
  },
  count: {
    marginLeft: 10,
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: 400,
    lineHeight: 20,
  },
});
