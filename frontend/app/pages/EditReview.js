import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import ReviewEditor from '../components/ReviewEditor';

export default function EditReview({ route }) {
  const navigation = useNavigation();

  const review = route?.params?.review;
  const book = review?.book;
  const initialRating = typeof review?.rating === 'number' ? review.rating : 0;
  const initialText = typeof review?.text === 'string' ? review.text : '';

  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);

  const onSubmit = () => {
    navigation.goBack();
  };

  return (
    <ReviewEditor
      headerTitle="Редактирование отзыва"
      book={book}
      rating={rating}
      onChangeRating={setRating}
      text={text}
      onChangeText={setText}
      onPressBack={() => navigation.goBack()}
      onPressConfirm={onSubmit}
      confirmDisabled={rating < 1}
    />
  );
}
