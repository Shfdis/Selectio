import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import ReviewEditorScreen from '../components/ReviewEditor';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { useCreateBookCommentMutation } from '../slices/booksSlice';

export default function NewReview({ route }) {
  const navigation = useNavigation();
  const [createBookComment, { isLoading: isCreatingComment }] = useCreateBookCommentMutation();

  const book = route?.params?.book;

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [isRatingNoticeVisible, setIsRatingNoticeVisible] = useState(false);

  const onSubmit = async () => {
    const bookId = Number(book?.id);
    if (!Number.isFinite(bookId) || bookId <= 0) {
      return;
    }
    if (rating < 1) {
      setIsRatingNoticeVisible(true);
      return;
    }
    const safeRating = Math.max(1, Math.min(5, Math.floor(rating)));
    const textStr = typeof text === 'string' ? text : '';
    try {
      await createBookComment({ bookId, rating: safeRating, content: textStr }).unwrap();
    } catch (error) {
      throw error;
    }
    navigation.goBack();
  };

  return (
    <>
      <ReviewEditorScreen
        headerTitle="Новый отзыв"
        book={book}
        rating={rating}
        onChangeRating={setRating}
        text={text}
        onChangeText={setText}
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onSubmit}
        inputsDisabled={isCreatingComment}
        confirmDisabled={isCreatingComment}
      />
      <DeleteConfirmDialog
        visible={isRatingNoticeVisible}
        title="Выберите оценку"
        message="Поставьте оценку отзыву, нажав на звезды."
        confirmLabel="Понятно"
        hideCancel
        cardTone="green"
        onConfirm={() => setIsRatingNoticeVisible(false)}
        onCancel={() => setIsRatingNoticeVisible(false)}
      />
    </>
  );
}
