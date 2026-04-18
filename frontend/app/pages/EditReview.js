import { useState } from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import ReviewEditorScreen from '../components/ReviewEditor';

export default function EditReview({ route }) {
  const navigation = useNavigation();

  const review = route?.params?.review;
  const book = review?.book;
  const initialRating = typeof review?.rating === 'number' ? review.rating : 0;
  const initialText = typeof review?.text === 'string' ? review.text : '';

  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);

  const onSubmit = () => {
    const safeRating = Math.max(1, Math.min(5, Math.floor(rating)));
    const textStr = typeof text === 'string' ? text : '';

    if (typeof review?.idx === 'number') {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'main', params: { mainTab: 'profile' } },
            {
              name: 'readBooks',
              params: {
                reviewUpdate: {
                  idx: review.idx,
                  rating: safeRating,
                  text: textStr,
                },
              },
            },
          ],
        }),
      );
    } else {
      navigation.goBack();
    }
  };

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
      confirmDisabled={rating < 1}
    />
  );
}
