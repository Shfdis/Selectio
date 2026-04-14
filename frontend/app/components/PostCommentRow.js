import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

export default function PostCommentRow({
  avatarSource = require('../assets/icons/profile-avatar.png'),
  username,
  dateText,
  text,
  initialLikes = 0,
  initiallyLiked = false,
  isLast = false,
}) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [likes, setLikes] = useState(initialLikes);

  useEffect(() => {
    setLiked(initiallyLiked);
    setLikes(initialLikes);
  }, [initialLikes, initiallyLiked]);

  const likeIcon = useMemo(
    () => (liked ? require('../assets/icons/icon-heart-filled.png') : require('../assets/icons/icon-heart.png')),
    [liked],
  );

  const onToggleLike = () => {
    setLiked((v) => {
      const next = !v;
      setLikes((c) => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
  };

  return (
    <View style={styles.row}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
          <View style={styles.headerText}>
            <Text style={styles.username} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.date} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
        </View>

        <Text style={styles.bodyText}>{text}</Text>

        <View style={styles.likeRow}>
          <Pressable style={styles.likeHit} onPress={onToggleLike} hitSlop={10}>
            <Image
              source={likeIcon}
              style={[styles.likeIcon, liked ? styles.likeIconFilled : null]}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.likeCount}>{likes}</Text>
        </View>
      </View>
      {!isLast ? <View style={styles.bottomHairline} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 23,
    paddingBottom: 4,
  },
  inner: {
    paddingTop: 9,
  },
  bottomHairline: {
    marginTop: '5%',
    height: 1,
    backgroundColor: '#CAC7B9',
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 49,
    height: 49,
    borderRadius: 9999,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '300',
    lineHeight: 19,
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: '400',
    lineHeight: 14,
  },
  bodyText: {
    marginTop: 14,
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 17,
    alignSelf: 'flex-start',
  },
  likeRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeHit: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeIcon: {
    width: 24,
    height: 24,
    tintColor: '#2D2800',
  },
  likeIconFilled: {
    tintColor: '#B23A2D',
  },
  likeCount: {
    marginLeft: 10,
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: '400',
    lineHeight: 20,
  },
});
