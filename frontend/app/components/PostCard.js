import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import BookCard from './BookCard';

export default function PostCard({
  avatarSource = require('../assets/icons/profile-avatar.png'),
  avatarUri,
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
  style,
}) {
  const navigation = useNavigation();
  const [liked, setLiked] = useState(initiallyLiked);
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [likes, setLikes] = useState(initialLikes);

  const onToggleLike = () => {
    setLiked((v) => {
      const next = !v;
      setLikes((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
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

  const bookmarkIcon = useMemo(
    () =>
      bookmarked
        ? require('../assets/icons/icon_bookmark_filled.png')
        : require('../assets/icons/icon_bookmark.png'),
    [bookmarked],
  );

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Image
            source={avatarUri ? { uri: avatarUri } : avatarSource}
            style={styles.avatar}
            resizeMode="cover"
          />
          <View style={styles.headerText}>
            <Text style={styles.username} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.date} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
        </View>

        <Text style={styles.postText}>{text}</Text>

        {imageSource || imageUri ? (
          <View style={styles.imageFrame}>
            <Image source={imageSource ?? { uri: imageUri }} style={styles.postImage} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.bookFrame}>
          <BookCard
            imageUrl={book?.imageUrl}
            title={book?.title}
            author={book?.author}
            genreFirst={book?.genreFirst}
            genreSecond={book?.genreSecond}
            onClick={() => {}}
          />
        </View>
      </View>

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

        <Pressable style={styles.action} onPress={() => setBookmarked((v) => !v)} hitSlop={10}>
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
