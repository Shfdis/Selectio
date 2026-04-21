import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import ReviewEditorScreen from '../components/ReviewEditor';
import { useCreateBookCommentMutation } from '../slices/booksSlice';

export default function NewReview({ route }) {
  const navigation = useNavigation();
  const [createBookComment, { isLoading: isCreatingComment }] = useCreateBookCommentMutation();

  const book = route?.params?.book;

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  const onSubmit = async () => {
    const bookId = Number(book?.id);
    if (!Number.isFinite(bookId) || bookId <= 0) {
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
      confirmDisabled={rating < 1 || isCreatingComment}
    />
  );
}
