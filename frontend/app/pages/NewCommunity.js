import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import CommunityEditor, { CommunityAddGenresButton } from '../components/CommunityEditor';

export default function NewCommunity() {
  const navigation = useNavigation();
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  const onPressGenresPicker = () => {
    Alert.alert('Выбор жанров', 'Здесь будет открываться выбор жанров.', [{ text: 'OK' }]);
  };

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
        coverImageSource={require('../assets/icons/profile-avatar.png')}
        displayName={displayName}
        onChangeDisplayName={setDisplayName}
        description={description}
        onChangeDescription={setDescription}
        onPressGenresPicker={onPressGenresPicker}
        genresSection={<CommunityAddGenresButton onPress={onPressGenresPicker} />}
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
