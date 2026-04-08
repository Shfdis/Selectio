import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import CommunityEditor, { CommunityGenrePills } from '../components/CommunityEditor';
import { myCreatedCommunity } from '../data/communityPage';

export default function EditCommunity() {
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    setDisplayName(myCreatedCommunity?.name ?? '');
    setDescription(myCreatedCommunity?.description ?? '');
    setSelectedGenres(myCreatedCommunity?.genres ?? []);
  }, []);

  const onPressGenresPicker = () => {
    Alert.alert('Выбор жанров', 'Позже здесь будет открываться редактирование жанров.', [{ text: 'OK' }]);
  };

  const onPressSave = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        headerTitle="Настройки сообщества"
        onPressBack={() => navigation.goBack()}
        onPressConfirm={onPressSave}
      />

      <CommunityEditor
        coverImageSource={{ uri: myCreatedCommunity.coverImageUrl }}
        displayName={displayName}
        onChangeDisplayName={setDisplayName}
        description={description}
        onChangeDescription={setDescription}
        onPressGenresPicker={onPressGenresPicker}
        genresSection={<CommunityGenrePills genres={selectedGenres} />}
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
