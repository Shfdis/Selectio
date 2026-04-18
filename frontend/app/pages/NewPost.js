import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import NewPostEditor from '../components/NewPostEditor';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';

export default function NewPost() {
  const navigation = useNavigation();
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [comment, setComment] = useState('');
  const [attachedPhotoUri, setAttachedPhotoUri] = useState(null);

  const onPressConfirm = () => {
    navigation.goBack();
  };

  const onPressAttachPhoto = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setAttachedPhotoUri(uri);
  };

  return (
    <NewPostEditor
      onPressBack={() => navigation.goBack()}
      onPressConfirm={onPressConfirm}
      bookSearchQuery={bookSearchQuery}
      onChangeBookSearchQuery={setBookSearchQuery}
      selectedBook={selectedBook}
      onSelectBook={setSelectedBook}
      comment={comment}
      onChangeComment={setComment}
      attachedPhotoUri={attachedPhotoUri}
      onPressAttachPhoto={onPressAttachPhoto}
    />
  );
}
