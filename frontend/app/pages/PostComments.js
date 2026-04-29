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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { useEffect, useMemo, useState } from 'react';
import { useGetCurrentUserQuery } from '../slices/userSlice';
import { useGetUserProfileQuery } from '../slices/profileSlice';
import {
  useCreatePostCommentMutation,
  useDeletePostCommentMutation,
  useGetPostCommentsQuery,
  useLikePostCommentMutation,
  useUpdatePostCommentMutation,
  useUnlikePostCommentMutation,
} from '../slices/postsSlice';

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

function ThreadCommentItem({
  commentId,
  authorUserId,
  username,
  dateText,
  text,
  avatarUri,
  initialLikes = 0,
  initiallyLiked = false,
  isMine = false,
  onPressEdit,
  onPressSaveEdit,
  onPressCancelEdit,
  onPressDelete,
  controlsDisabled = false,
  isEditing = false,
  isLast,
}) {
  const [liked, setLiked] = useState(initiallyLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [editDraft, setEditDraft] = useState(text);
  const normalizedAuthorUserId = Number(authorUserId);
  const { data: authorProfile } = useGetUserProfileQuery(normalizedAuthorUserId, {
    skip: !Number.isFinite(normalizedAuthorUserId) || normalizedAuthorUserId <= 0,
  });
  const resolvedAvatarUri = authorProfile?.avatarUrl || avatarUri;
  const [likePostComment] = useLikePostCommentMutation();
  const [unlikePostComment] = useUnlikePostCommentMutation();

  useEffect(() => {
    setLiked(initiallyLiked);
    setLikes(initialLikes);
  }, [initialLikes, initiallyLiked]);
  useEffect(() => {
    setEditDraft(text);
  }, [text, isEditing]);

  const likeIcon = useMemo(
    () => (liked ? require('../assets/icons/icon-heart-filled.png') : require('../assets/icons/icon-heart.png')),
    [liked],
  );

  const onToggleLike = async () => {
    if (!Number.isFinite(commentId) || commentId <= 0) {
      return;
    }
    const previousLiked = liked;
    const previousLikes = likes;
    const nextLiked = !previousLiked;
    setLiked(nextLiked);
    setLikes((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));
    try {
      if (nextLiked) {
        await likePostComment({ commentId }).unwrap();
      } else {
        await unlikePostComment({ commentId }).unwrap();
      }
    } catch (_error) {
      setLiked(previousLiked);
      setLikes(previousLikes);
    }
  };

  return (
    <View style={styles.commentRow}>
      <View style={styles.commentInner}>
        <View style={styles.commentHeaderRow}>
          <Image source={resolvedAvatarUri ? { uri: resolvedAvatarUri } : defaultAvatar} style={styles.commentAvatar} resizeMode="cover" />
          <View style={styles.commentHeaderText}>
            <Text style={styles.commentUsername} numberOfLines={1}>
              {username}
            </Text>
            <Text style={styles.commentDate} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
          {isMine ? (
            <Pressable style={styles.topRightAction} onPress={onPressEdit} hitSlop={10} disabled={controlsDisabled}>
              <Image source={require('../assets/icons/icon_write.png')} style={styles.topRightActionIcon} resizeMode="contain" />
            </Pressable>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.inlineEditWrap}>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              placeholder="Редактирование комментария"
              placeholderTextColor="#565d3f"
              style={styles.inlineEditInput}
              editable={!controlsDisabled}
              multiline
            />
            <View style={styles.inlineEditActions}>
              <Pressable
                onPress={() => onPressCancelEdit?.()}
                hitSlop={8}
                disabled={controlsDisabled}
              >
                <Text style={[styles.inlineEditActionText, controlsDisabled ? styles.ownerActionTextDisabled : null]}>
                  Отмена
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onPressSaveEdit?.(editDraft)}
                hitSlop={8}
                disabled={controlsDisabled || editDraft.trim().length === 0}
              >
                <Text
                  style={[
                    styles.inlineEditActionText,
                    (controlsDisabled || editDraft.trim().length === 0) ? styles.ownerActionTextDisabled : null,
                  ]}
                >
                  Сохранить
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.commentBodyText}>{text}</Text>
        )}

        <View style={styles.commentLikeRow}>
          <Pressable style={styles.commentLikeHit} onPress={onToggleLike} hitSlop={10}>
            <Image
              source={likeIcon}
              style={[styles.commentLikeIcon, liked ? styles.commentLikeIconFilled : null]}
              resizeMode="contain"
            />
          </Pressable>
          <Text style={styles.commentLikeCount}>{likes}</Text>
          {isMine ? (
            <Pressable style={styles.bottomRightAction} onPress={onPressDelete} hitSlop={10} disabled={controlsDisabled}>
              <Image source={require('../assets/icons/icon_tresh.png')} style={styles.bottomRightActionIcon} resizeMode="contain" />
            </Pressable>
          ) : null}
        </View>
      </View>
      {!isLast ? <View style={styles.commentBottomHairline} /> : null}
    </View>
  );
}

export default function PostComments() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const postId = Number(route?.params?.postId);
  const { data: currentUser } = useGetCurrentUserQuery();
  const currentUserId = Number(currentUser?.id);
  const {
    data: postComments = [],
    isLoading: isLoadingComments,
  } = useGetPostCommentsQuery(
    { postId, page: 1, pageSize: 100 },
    { skip: !Number.isFinite(postId) || postId <= 0 },
  );
  const [createPostComment, { isLoading: isCreatingComment }] = useCreatePostCommentMutation();
  const [updatePostComment, { isLoading: isUpdatingComment }] = useUpdatePostCommentMutation();
  const [deletePostComment, { isLoading: isDeletingComment }] = useDeletePostCommentMutation();
  const [draft, setDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const isBusy = isCreatingComment || isUpdatingComment || isDeletingComment;
  const canSend = draft.trim().length > 0 && !isBusy;

  const threadComments = useMemo(
    () =>
      postComments.map((comment) => ({
        id: String(comment?.id ?? ''),
        commentId: Number(comment?.id),
        authorUserId: Number(comment?.authorUserId),
        username: comment?.authorUsername || `user${comment?.authorUserId ?? ''}`,
        dateText: formatDate(comment?.createdAt),
        text: comment?.content || '',
        avatarUri: comment?.authorAvatarUrl || comment?.avatarUrl || undefined,
        likes: Number(comment?.likeCount ?? 0),
        liked: Boolean(comment?.likedByCurrentUser),
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

  const onPressEditComment = (comment) => {
    setEditingCommentId(comment?.commentId);
  };

  const onPressSaveEditComment = async (comment, nextText) => {
    const trimmed = String(nextText ?? '').trim();
    if (!trimmed) {
      return;
    }
    try {
      await updatePostComment({ postId, commentId: comment?.commentId, content: trimmed }).unwrap();
      setEditingCommentId(null);
    } catch (_error) {
      Alert.alert('Не удалось обновить комментарий', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
    }
  };

  const onPressDeleteComment = async (comment) => {
    if (!Number.isFinite(comment?.commentId) || comment.commentId <= 0) {
      return;
    }
    try {
      await deletePostComment({ postId, commentId: comment.commentId }).unwrap();
      if (editingCommentId === comment.commentId) {
        setEditingCommentId(null);
      }
    } catch (_error) {
      Alert.alert('Не удалось удалить', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
    }
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
        keyboardVerticalOffset={insets.top}
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
              commentId={c.commentId}
              authorUserId={c.authorUserId}
              username={c.username}
              dateText={c.dateText}
              text={c.text}
              avatarUri={c.avatarUri}
              initialLikes={c.likes}
              initiallyLiked={c.liked}
              isMine={Number.isFinite(currentUserId) && c.authorUserId === currentUserId}
              onPressEdit={() => onPressEditComment(c)}
              onPressSaveEdit={(nextText) => onPressSaveEditComment(c, nextText)}
              onPressCancelEdit={() => setEditingCommentId(null)}
              onPressDelete={() => onPressDeleteComment(c)}
              isEditing={editingCommentId === c.commentId}
              controlsDisabled={isBusy}
              isLast={index === threadComments.length - 1}
            />
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 8 + insets.bottom }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ваш комментарий"
            placeholderTextColor="#565d3f"
            textAlign="left"
            textAlignVertical="top"
            style={styles.footerInput}
            editable={!isBusy}
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
  topRightAction: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightActionIcon: {
    width: 24,
    height: 24,
    tintColor: '#2D2800',
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
    width: '100%',
    flexShrink: 1,
  },
  inlineEditWrap: {
    marginTop: 12,
  },
  inlineEditInput: {
    borderWidth: 1,
    borderColor: '#81876D',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#E4DFD0',
    color: '#2D2800',
    fontFamily: 'Playfair',
    fontSize: 14,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  inlineEditActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
  },
  inlineEditActionText: {
    fontSize: 14,
    color: '#555C40',
    fontFamily: 'Playfair',
    fontWeight: '600',
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
  bottomRightAction: {
    marginLeft: 'auto',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRightActionIcon: {
    width: 24,
    height: 24,
    tintColor: '#2D2800',
  },
  ownerActionTextDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: 8,
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