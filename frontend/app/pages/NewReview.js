import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import ReviewEditor from '../components/ReviewEditor';

export default function NewReview({ route }) {
  const navigation = useNavigation();

  const book = route?.params?.book;
  const idx = route?.params?.idx;

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  const onSubmit = () => {
    const safeRating = Math.max(1, Math.min(5, Math.floor(rating)));

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'profile' },
          { name: 'readBooks', params: { reviewUpdate: { idx, rating: safeRating } } },
        ],
      }),
    );
  };

  return (
    <ReviewEditor
      headerTitle="Новый отзыв"
      headerTitleStyle={styles.headerTitleRaise}
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

const styles = StyleSheet.create({
  headerTitleRaise: {
    transform: [{ translateY: -3 }],
  },
});
