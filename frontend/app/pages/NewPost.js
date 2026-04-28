import { useMemo, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Alert } from 'react-native';
import NewPostEditor from '../components/NewPostEditor';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';
import { mapApiBookToUi, useSearchBooksQuery } from '../slices/booksSlice';
import { useUploadImageMutation } from '../slices/profileSlice';
import { useCreatePostMutation, useSuggestPostMutation } from '../slices/postsSlice';

export default function NewPost() {
  const navigation = useNavigation();
  const route = useRoute();
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [comment, setComment] = useState('');
  const [attachedPhotoUri, setAttachedPhotoUri] = useState(null);
  const [validationDialog, setValidationDialog] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const trimmedQuery = bookSearchQuery.trim();
  const { data: searchBooksData = [] } = useSearchBooksQuery(
    { query: trimmedQuery, page: 1, pageSize: 20 },
    { skip: trimmedQuery.length === 0 },
  );
  const searchBooksCatalog = useMemo(
    () =>
      searchBooksData.map((book) => {
        const mapped = mapApiBookToUi(book);
        return {
          ...mapped,
          imageUrl: mapped?.imageUrl || mapped?.coverUrl || '',
        };
      }),
    [searchBooksData],
  );
  const routeCommunityId = Number(route?.params?.communityId);
  const createMode = route?.params?.mode === 'suggest' ? 'suggest' : 'publish';
  const [uploadImage] = useUploadImageMutation();
  const [createPost, { isLoading: isCreatingPost }] = useCreatePostMutation();
  const [suggestPost, { isLoading: isSuggestingPost }] = useSuggestPostMutation();

  const onPressConfirm = async () => {
    if (isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const communityId = Number.isFinite(routeCommunityId) && routeCommunityId > 0 ? routeCommunityId : null;
    const bookId = Number(selectedBook?.id);
    const content = comment.trim();
    if (!communityId) {
      Alert.alert('Не удалось создать пост', 'Не найдено сообщество для публикации.', [{ text: 'Ок' }]);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (!Number.isFinite(bookId) || bookId <= 0) {
      setValidationDialog({
        visible: true,
        title: 'Выберите книгу',
        message: 'Для публикации нужно выбрать книгу.',
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    if (!content) {
      setValidationDialog({
        visible: true,
        title: 'Добавьте текст',
        message: 'Комментарий к посту не может быть пустым.',
      });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      let photoUrl = null;
      if (attachedPhotoUri) {
        const fileName = String(attachedPhotoUri).split('/').pop() || 'post-photo.jpg';
        const hasPng = /\.png$/i.test(fileName);
        const hasWebp = /\.webp$/i.test(fileName);
        const type = hasPng ? 'image/png' : hasWebp ? 'image/webp' : 'image/jpeg';
        const uploaded = await uploadImage({ uri: attachedPhotoUri, name: fileName, type }).unwrap();
        photoUrl = uploaded?.url || null;
      }

      const payload = { communityId, bookId, content, photoUrl };
      const created =
        createMode === 'suggest'
          ? await suggestPost(payload).unwrap()
          : await createPost(payload).unwrap();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Не удалось создать пост', 'Попробуйте ещё раз.', [{ text: 'Ок' }]);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const onPressAttachPhoto = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setAttachedPhotoUri(uri);
  };

  return (
    <>
      <NewPostEditor
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressConfirm}
        confirmDisabled={isSubmitting || isCreatingPost || isSuggestingPost}
        bookSearchQuery={bookSearchQuery}
        onChangeBookSearchQuery={setBookSearchQuery}
        selectedBook={selectedBook}
        onSelectBook={setSelectedBook}
        searchBooksCatalog={searchBooksCatalog}
        comment={comment}
        onChangeComment={setComment}
        attachedPhotoUri={attachedPhotoUri}
        onPressAttachPhoto={onPressAttachPhoto}
      />
      <DeleteConfirmDialog
        visible={validationDialog.visible}
        onCancel={() => setValidationDialog((prev) => ({ ...prev, visible: false }))}
        onConfirm={() => setValidationDialog((prev) => ({ ...prev, visible: false }))}
        title={validationDialog.title}
        message={validationDialog.message}
        confirmLabel="Ок"
        hideCancel
        cardTone="green"
      />
    </>
  );
}
