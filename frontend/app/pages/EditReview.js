import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import ReviewEditorScreen from '../components/ReviewEditor';
import {
  useCreateBookCommentMutation,
  useDeleteBookCommentMutation,
  useUpdateBookCommentMutation,
} from '../slices/booksSlice';

export default function EditReview({ route }) {
  const navigation = useNavigation();
  const [createBookComment, { isLoading: isCreatingComment }] = useCreateBookCommentMutation();
  const [updateBookComment, { isLoading: isUpdatingComment }] = useUpdateBookCommentMutation();
  const [deleteBookComment, { isLoading: isDeletingComment }] = useDeleteBookCommentMutation();

  const review = route?.params?.review;
  const book = review?.book;
  const commentId = review?.id;
  const bookId = Number(review?.bookId ?? book?.id);
  const initialRating = typeof review?.rating === 'number' ? review.rating : 0;
  const initialText = typeof review?.text === 'string' ? review.text : '';

  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);

  const onSubmit = async () => {
    if (!Number.isFinite(bookId) || bookId <= 0) {
      navigation.goBack();
      return;
    }
    const safeRating = Math.max(1, Math.min(5, Math.floor(rating)));
    const textStr = typeof text === 'string' ? text : '';

    try {
      if (typeof commentId === 'number') {
        await updateBookComment({ commentId, content: textStr, rating: safeRating }).unwrap();
      } else {
        await createBookComment({ bookId, rating: safeRating, content: textStr }).unwrap();
      }
    } catch (error) {
      throw error;
    }
    navigation.goBack();
  };

  const onDelete = async () => {
    if (typeof commentId !== 'number') {
      navigation.goBack();
      return;
    }
    await deleteBookComment({ commentId }).unwrap();
    navigation.goBack();
  };

  const isBusy = isCreatingComment || isUpdatingComment || isDeletingComment;

  return (
    <ReviewEditorScreen
      headerTitle="Редактирование отзыва"
      book={book}
      rating={rating}
      onChangeRating={setRating}
      text={text}
      onChangeText={setText}
      onPressBack={() => navigation.goBack()}
      onPressConfirm={onSubmit}
      inputsDisabled={isBusy}
      confirmDisabled={rating < 1 || isBusy}
      showDelete={typeof commentId === 'number'}
      onPressDelete={onDelete}
      deleteDisabled={isBusy}
    />
  );
}
