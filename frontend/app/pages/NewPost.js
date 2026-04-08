import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import NewPostEditor, { defaultAttachPhotoHandler } from '../components/NewPostEditor';

export default function NewPost() {
  const navigation = useNavigation();
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [comment, setComment] = useState('');

  const onPressConfirm = () => {
    navigation.goBack();
  };

  return (
    <NewPostEditor
      onPressBack={() => navigation.goBack()}
      onPressConfirm={onPressConfirm}
      bookSearchQuery={bookSearchQuery}
      onChangeBookSearchQuery={setBookSearchQuery}
      comment={comment}
      onChangeComment={setComment}
      onPressAttachPhoto={defaultAttachPhotoHandler}
    />
  );
}
