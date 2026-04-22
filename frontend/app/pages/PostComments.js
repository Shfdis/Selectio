import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { useEffect, useMemo, useState } from 'react';
import { useCreatePostCommentMutation, useGetPostCommentsQuery } from '../slices/postsSlice';

const defaultAvatar = require('../assets/icons/profile-avatar.png');

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

function ThreadCommentItem({ username, dateText, text, initialLikes = 0, initiallyLiked = false, isLast }) {
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
    <View style={styles.commentRow}>
      <View style={styles.commentInner}>
        <View style={styles.commentHeaderRow}>
          <Image source={defaultAvatar} style={styles.commentAvatar} resizeMode="cover" />
          <View style={styles.commentHeaderText}>
            <Text style={styles.commentUsername} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.commentDate} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
        </View>

        <Text style={styles.commentBodyText}>{text}</Text>

        <View style={styles.commentLikeRow}>
          <Pressable style={styles.commentLikeHit} onPress={onToggleLike} hitSlop={10}>
            <Image
              source={likeIcon}
              style={[styles.commentLikeIcon, liked ? styles.commentLikeIconFilled : null]}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.commentLikeCount}>{likes}</Text>
        </View>
      </View>
      {!isLast ? <View style={styles.commentBottomHairline} /> : null}
    </View>
  );
}

export default function PostComments() {
  const navigation = useNavigation();
  const route = useRoute();
  const postId = Number(route?.params?.postId);
  const {
    data: postComments = [],
    isLoading: isLoadingComments,
  } = useGetPostCommentsQuery(
    { postId, page: 1, pageSize: 100 },
    { skip: !Number.isFinite(postId) || postId <= 0 },
  );
  const [createPostComment, { isLoading: isCreatingComment }] = useCreatePostCommentMutation();
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !isCreatingComment;

  const threadComments = useMemo(
    () =>
      postComments.map((comment) => ({
        id: String(comment?.id ?? ''),
        username: comment?.authorUsername || `user${comment?.authorUserId ?? ''}`,
        dateText: formatDate(comment?.createdAt),
        text: comment?.content || '',
        likes: 0,
        liked: false,
      })),
    [postComments],
  );

  const onPressSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (!Number.isFinite(postId) || postId <= 0) {
      Alert.alert('Не удалось отправить', 'Некорректный идентификатор поста.', [{ text: 'Ок' }]);
      return;
    }
    try {
      await createPostComment({ postId, content: trimmed }).unwrap();
    } catch (_error) {
      Alert.alert('Не удалось отправить', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
      return;
    }
    setDraft('');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Комментарии"
        onPressBack={() => navigation.goBack()}
        showConfirmButton={false}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isLoadingComments ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#555C40" />
            </View>
          ) : null}
          {!isLoadingComments && threadComments.length === 0 ? (
            <Text style={styles.emptyText}>Комментариев пока нет</Text>
          ) : null}
          {threadComments.map((c, index) => (
            <ThreadCommentItem
              key={c.id}
              username={c.username}
              dateText={c.dateText}
              text={c.text}
              initialLikes={c.likes}
              initiallyLiked={c.liked}
              isLast={index === threadComments.length - 1}
            />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ваш комментарий"
            placeholderTextColor="#565d3f"
            textAlign="left"
            textAlignVertical="top"
            style={styles.footerInput}
          />
          <Pressable
            style={[styles.sendButton, !canSend ? styles.sendButtonDisabled : null]}
            onPress={onPressSend}
            hitSlop={10}
            disabled={!canSend}
          >
            <Image source={require('../assets/icons/icon_send.png')} style={styles.sendIcon} resizeMode="contain" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  loaderWrap: {
    paddingTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontSize: 16,
  },
  commentRow: {
    paddingHorizontal: 23,
    paddingBottom: 4,
  },
  commentInner: {
    paddingTop: 9,
  },
  commentBottomHairline: {
    marginTop: '5%',
    height: 1,
    backgroundColor: '#CAC7B9',
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 49,
    height: 49,
    borderRadius: 9999,
  },
  commentHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  commentUsername: {
    fontSize: 16,
    color: '#2D2800',
    fontFamily: 'Mak',
    fontWeight: '300',
    lineHeight: 19,
  },
  commentDate: {
    marginTop: 2,
    fontSize: 12,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: '400',
    lineHeight: 14,
  },
  commentBodyText: {
    marginTop: 14,
    fontSize: 14,
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontWeight: '400',
    lineHeight: 17,
    alignSelf: 'flex-start',
  },
  commentLikeRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeHit: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentLikeIcon: {
    width: 24,
    height: 24,
    tintColor: '#2D2800',
  },
  commentLikeIconFilled: {
    tintColor: '#B23A2D',
  },
  commentLikeCount: {
    marginLeft: 10,
    fontSize: 17,
    color: '#2D2800',
    fontFamily: 'CrimsonText',
    fontWeight: '400',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 24,
    minHeight: 73,
    backgroundColor: '#ECE8DD',
    borderTopWidth: 1,
    borderTopColor: '#C4C4C4',
    gap: 4,
  },
  footerInput: {
    flex: 1,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#81876D',
    backgroundColor: '#E4DFD0',
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 3,
    paddingBottom: 0,
    fontSize: 16,
    fontFamily: 'Playfair',
    fontWeight: '500',
    color: '#2D2800',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    paddingLeft: 2,
    backgroundColor: '#E4DFD0',
    borderWidth: 1,
    borderColor: '#81876D',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    width: 26,
    height: 26,
  },
});