import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import CommunityEditor from '../components/CommunityEditor';
import { pickImageFromLibrary } from '../utils/pickImageFromLibrary';

export default function NewCommunity() {
  const navigation = useNavigation();
  const [coverUri, setCoverUri] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);

  const onPressSave = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Создание сообщества"
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressSave}
      />

      <CommunityEditor
        coverImageSource={
          coverUri ? { uri: coverUri } : require('../assets/icons/profile-avatar.png')
        }
        onPressChangeAvatar={async () => {
          const uri = await pickImageFromLibrary();
          if (uri) setCoverUri(uri);
        }}
        displayName={displayName}
        onChangeDisplayName={setDisplayName}
        description={description}
        onChangeDescription={setDescription}
        selectedGenres={selectedGenres}
        onSelectedGenresChange={setSelectedGenres}
        addGenresWhenEmpty
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ECE8DD',
  },
});
